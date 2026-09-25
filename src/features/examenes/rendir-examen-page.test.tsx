import { screen, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  TEXTO_AUTOGUARDADO_FALLIDO,
  TEXTO_GUARDADO,
  TEXTO_GUARDANDO,
  TEXTO_VENTANA_CERRADA,
} from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import {
  D8_EXAMEN_NO_DISPONIBLE,
  D9_ALUMNO_NO_HABILITADO,
  D10_EXAMEN_ENTREGADO,
  D11_VENTANA_CERRADA,
} from '@/mocks/sigeda/cuestionarios-teoria'
import { alternativasDePregunta, cuestionarioDe } from '@/mocks/sigeda/datos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'
import type { UserEvent } from '@testing-library/user-event'

const RUTA = '/examenes/3'

function idCorrecta(idPregunta: number): string {
  return String(alternativasDePregunta(idPregunta).find((alternativa) => alternativa.correcto)?.id)
}

async function abrirExamen(usuario?: UserEvent) {
  await iniciarComo('alumno.lopez')
  const resultado = renderApp(RUTA, usuario)
  await screen.findByRole('group', { name: 'Pregunta 1' })
  return resultado
}

function contarGuardados() {
  let guardados = 0
  const oyente = ({ request }: { request: Request }) => {
    if (request.method === 'PUT' && request.url.includes('/respuestas')) guardados += 1
  }
  server.events.on('request:start', oyente)
  return { total: () => guardados, detener: () => server.events.removeListener('request:start', oyente) }
}

describe('Rendir examen', () => {
  it('CA-EXA-03 inicia el examen y no expone la correcta, la esperada ni la explicación', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await abrirExamen()
    expect(screen.getAllByRole('group', { name: /^Pregunta / })).toHaveLength(5)
    expect(screen.getByRole('heading', { level: 2, name: 'Pregunta 1 · 4 puntos' })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Regular')
    expect(document.body.textContent).not.toContain('El PDI EA-510 es el plan de instrucción vigente')
  })

  it('CA-EXA-04 cada tipo se responde con su control', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await abrirExamen()
    const primera = within(screen.getByRole('group', { name: 'Pregunta 1' }))
    expect(primera.getAllByRole('radio')).toHaveLength(4)
    expect(primera.getByRole('radio', { name: 'El PDI EA-510' })).toHaveAttribute('aria-checked', 'true')
    const tercera = within(screen.getByRole('group', { name: 'Pregunta 3' }))
    expect(tercera.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Verdadero',
      'Falso',
    ])
    expect(screen.getByLabelText('Respuesta de la pregunta 4')).toHaveValue('')
  })

  it('CA-EXA-08 recargar retoma el mismo examen con el mismo orden y sus respuestas', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    const primera = await abrirExamen()
    const ordenes = screen.getAllByRole('group', { name: /^Pregunta / }).map((grupo) => grupo.getAttribute('aria-label'))
    primera.unmount()
    await abrirExamen()
    expect(screen.getAllByRole('group', { name: /^Pregunta / }).map((grupo) => grupo.getAttribute('aria-label'))).toEqual(
      ordenes,
    )
    expect(
      within(screen.getByRole('group', { name: 'Pregunta 1' })).getByRole('radio', { name: 'El PDI EA-510' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('CA-EXA-05 guarda dos segundos después del último cambio con E27 y E28', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    server.use(
      http.put(`${API}/api/cuestionarios/:id/respuestas`, async () => {
        await delay(500)
        return HttpResponse.json({ mensaje: 'Respuestas guardadas.', respuestasGuardadas: 1 })
      }),
    )
    const conteo = contarGuardados()
    await abrirExamen(usuario)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[1]!)
    await avanzar(1_000)
    expect(conteo.total()).toBe(0)
    await avanzar(1_200)
    expect(await screen.findByText(TEXTO_GUARDANDO)).toBeInTheDocument()
    await avanzar(600)
    expect(await screen.findByText(TEXTO_GUARDADO)).toBeInTheDocument()
    expect(conteo.total()).toBe(1)
    conteo.detener()
  })

  it('CA-EXA-05 con cambios seguidos guarda a los diez segundos como máximo', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    const conteo = contarGuardados()
    await abrirExamen(usuario)
    const campo = screen.getByLabelText('Respuesta de la pregunta 4')
    for (let vuelta = 0; vuelta < 7; vuelta += 1) {
      await usuario.type(campo, 'a')
      await avanzar(1_500)
    }
    expect(conteo.total()).toBe(1)
    conteo.detener()
  })

  it('contrato §4.3 una respuesta lenta nunca pisa una más nueva: el servidor termina con ambas', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    let llamada = 0
    server.use(
      http.put(`${API}/api/cuestionarios/:id/respuestas`, async ({ request }) => {
        llamada += 1
        if (llamada === 1) await delay(5_000)
        const cuerpo = (await request.json()) as { respuestas?: { idPregunta?: unknown; respuesta?: unknown }[] }
        const cuestionario = cuestionarioDe(3, '111111')
        if (cuestionario) {
          cuestionario.respuestas = {}
          for (const fila of cuerpo.respuestas ?? []) {
            const valor = typeof fila.respuesta === 'string' ? fila.respuesta : ''
            if (valor !== '') cuestionario.respuestas[Number(fila.idPregunta)] = valor
          }
        }
        return HttpResponse.json({
          mensaje: 'Respuestas guardadas.',
          respuestasGuardadas: cuerpo.respuestas?.length ?? 0,
        })
      }),
    )
    const conteo = contarGuardados()
    await abrirExamen(usuario)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[0]!)
    await avanzar(2_100)
    expect(await screen.findByText(TEXTO_GUARDANDO)).toBeInTheDocument()
    expect(conteo.total()).toBe(1)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'cola')
    await avanzar(2_100)
    expect(conteo.total()).toBe(1)
    await avanzar(3_000)
    expect(await screen.findByText(TEXTO_GUARDADO)).toBeInTheDocument()
    expect(conteo.total()).toBe(2)
    expect(Object.keys(cuestionarioDe(3, '111111')?.respuestas ?? {}).sort()).toEqual(['1', '2', '3', '4'])
    expect(cuestionarioDe(3, '111111')?.respuestas[4]).toBe('cola')
    conteo.detener()
  })

  it('CA-EXA-05 un fallo muestra E14 con Reintentar sin perder lo respondido', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    server.use(http.put(`${API}/api/cuestionarios/:id/respuestas`, () => HttpResponse.error()))
    await abrirExamen(usuario)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'rotor de cola')
    await avanzar(2_100)
    expect(await screen.findByText(TEXTO_AUTOGUARDADO_FALLIDO)).toBeInTheDocument()
    expect(screen.getByLabelText('Respuesta de la pregunta 4')).toHaveValue('rotor de cola')
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(TEXTO_GUARDADO)).toBeInTheDocument()
    expect(cuestionarioDe(3, '111111')?.respuestas[4]).toBe('rotor de cola')
  })

  it('CA-EXA-10 un 409 D11 del autoguardado muestra E16 y pasa al resultado, no E14', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    server.use(
      http.put(`${API}/api/cuestionarios/:id/respuestas`, () =>
        HttpResponse.text(D11_VENTANA_CERRADA, { status: 409 }),
      ),
    )
    const vista = await abrirExamen(usuario)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'rotor de cola')
    await avanzar(2_100)
    expect(await screen.findByText(TEXTO_VENTANA_CERRADA)).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_AUTOGUARDADO_FALLIDO)).not.toBeInTheDocument()
    expect(vista.router.state.location.pathname).toBe('/examenes/3/resultado')
  })

  it('CA-EXA-05 el autoguardado reemplaza el conjunto completo', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    await abrirExamen(usuario)
    expect(Object.keys(cuestionarioDe(3, '111111')?.respuestas ?? {})).toEqual(['1', '3'])
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[0]!)
    await avanzar(2_100)
    await screen.findByText(TEXTO_GUARDADO)
    expect(Object.keys(cuestionarioDe(3, '111111')?.respuestas ?? {}).sort()).toEqual(['1', '2', '3'])
    expect(cuestionarioDe(3, '111111')?.respuestas[1]).toBe(idCorrecta(1))
  })

  it('CA-EXA-11 un examen ya entregado muestra D10 con el acceso al resultado', async () => {
    server.use(
      http.post(`${API}/api/turnos-teoricos/:id/iniciar`, () =>
        HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 }),
      ),
    )
    await iniciarComo('alumno.lopez')
    renderApp(RUTA)
    expect(await screen.findByText(D10_EXAMEN_ENTREGADO)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el resultado' })).toHaveAttribute('href', '/examenes/3/resultado')
    expect(screen.queryByRole('group', { name: 'Pregunta 1' })).not.toBeInTheDocument()
  })

  it('contrato §4.2 D8 la ventana no disponible no ofrece Reintentar ni el examen', async () => {
    server.use(
      http.post(`${API}/api/turnos-teoricos/:id/iniciar`, () =>
        HttpResponse.text(D8_EXAMEN_NO_DISPONIBLE, { status: 409 }),
      ),
    )
    await iniciarComo('alumno.lopez')
    renderApp(RUTA)
    expect(await screen.findByText(D8_EXAMEN_NO_DISPONIBLE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Pregunta 1' })).not.toBeInTheDocument()
  })

  it('CA-EXA-12 un alumno no habilitado ve D9 y no el examen', async () => {
    server.use(
      http.post(`${API}/api/turnos-teoricos/:id/iniciar`, () =>
        HttpResponse.text(D9_ALUMNO_NO_HABILITADO, { status: 403 }),
      ),
    )
    await iniciarComo('alumno.lopez')
    renderApp(RUTA)
    expect(await screen.findByText(D9_ALUMNO_NO_HABILITADO)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Pregunta 1' })).not.toBeInTheDocument()
  })

  it('CA-EXA-13 un fallo en la primera carga del examen ofrece Reintentar', async () => {
    server.use(http.post(`${API}/api/turnos-teoricos/:id/iniciar`, () => HttpResponse.error()))
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp(RUTA)
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument()
  })

  it('CA-RES-09 un turno en el que el alumno no tiene examen no se puede abrir', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/examenes/1')
    expect(await screen.findByText(/no encontr/i)).toBeInTheDocument()
  })
})

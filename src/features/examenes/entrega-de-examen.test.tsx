import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  TEXTO_AUTOGUARDADO_FALLIDO,
  TEXTO_CONFIRMAR_ENTREGA,
  TEXTO_QUEDAN_CINCO_MINUTOS,
  TEXTO_VENTANA_CERRADA,
  textoRespondidas,
  textoSinResponder,
} from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { D10_EXAMEN_ENTREGADO, D11_VENTANA_CERRADA } from '@/mocks/sigeda/cuestionarios-teoria'
import { cuestionarioDe } from '@/mocks/sigeda/datos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'
import type { UserEvent } from '@testing-library/user-event'

async function abrirExamen(usuario: UserEvent) {
  await iniciarComo('alumno.lopez')
  const resultado = renderApp('/examenes/3', usuario)
  await screen.findByRole('group', { name: 'Pregunta 1' })
  return resultado
}

async function esperarRuta(router: { state: { location: { pathname: string } } }, ruta: string) {
  await waitFor(() => expect(router.state.location.pathname).toBe(ruta))
}

function segundosRestantes(): number {
  const texto = screen.getByText(/^Tiempo restante:/).textContent ?? ''
  const [minutos, segundos] = (texto.split(': ')[1] ?? '0:0').split(':').map(Number)
  return minutos * 60 + segundos
}

const CUESTIONARIO_RESUELTO_ESTABLE = {
  id: 3,
  turnoTeorico: { id: 3, nombre: 'Turno de prueba', estado: 'FINALIZADO' },
  materia: { id: 1, nombre: 'Materia', notaMinima: 14 },
  tipoExamen: 'TEST',
  notaMinimaAplicada: 14,
  codAlumno: '111111',
  alumno: 'Alumno de prueba',
  estado: 'ENTREGADO',
  fechaExamen: '2026-01-01',
  horaInicio: '09:00',
  horaFin: '10:00',
  fechaEntrega: '2026-01-01',
  horaEntrega: '09:30',
  puntajeTotal: 20,
  nota: 15,
  aprobado: true,
  calificaciones: [],
}

describe('Entrega del examen', () => {
  it('CA-EXA-06 el encabezado cuenta el tiempo restante y las respondidas con E29', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 25 })
    await abrirExamen(usuario)
    expect(segundosRestantes()).toBeGreaterThan(24 * 60)
    expect(segundosRestantes()).toBeLessThanOrEqual(25 * 60)
    expect(screen.getByText(textoRespondidas(2, 5))).toBeInTheDocument()
    await avanzar(60_000)
    expect(segundosRestantes()).toBeGreaterThan(23 * 60)
    expect(segundosRestantes()).toBeLessThanOrEqual(24 * 60)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[0]!)
    expect(await screen.findByText(textoRespondidas(3, 5))).toBeInTheDocument()
  })

  it('CA-EXA-06 E15 aparece a los cinco minutos y no antes', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 7 })
    await abrirExamen(usuario)
    const inicial = segundosRestantes()
    await avanzar((inicial - 301) * 1_000)
    await waitFor(() => expect(segundosRestantes()).toBe(301))
    expect(screen.queryByText(TEXTO_QUEDAN_CINCO_MINUTOS)).not.toBeInTheDocument()
    await avanzar(1_000)
    await waitFor(() => expect(segundosRestantes()).toBe(300))
    expect(screen.queryByText(TEXTO_QUEDAN_CINCO_MINUTOS)).not.toBeInTheDocument()
    await avanzar(1_000)
    await waitFor(() => expect(segundosRestantes()).toBe(299))
    expect(screen.getByText(TEXTO_QUEDAN_CINCO_MINUTOS)).toBeInTheDocument()
  })

  it('CA-EXA-07 Entregar confirma con E17 y con E18 cuando quedan preguntas sin responder', async () => {
    const { usuario } = relojFalso()
    abrirVentanaDeExamen()
    await abrirExamen(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText(`${TEXTO_CONFIRMAR_ENTREGA} ${textoSinResponder(3)}`)).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument()
  })

  it('CA-EXA-07 con todo respondido la confirmación solo muestra E17 y entrega', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    const { router } = await abrirExamen(usuario)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[0]!)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 5' })).getAllByRole('radio')[0]!)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'Regular')
    await avanzar(2_100)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText(TEXTO_CONFIRMAR_ENTREGA)).toBeInTheDocument()
    expect(aviso.queryByText(/sin responder/)).not.toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Entregar' }))
    expect(await screen.findByText('Examen entregado con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/examenes/3/resultado')
    expect(cuestionarioDe(3, '111111')?.estado).toBe('ENTREGADO')
  })

  it('CA-EXA-09 una respuesta escrita justo antes del cierre se guarda dentro de la ventana', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 1 })
    const { router } = await abrirExamen(usuario)
    await avanzar(59_000)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'Regular')
    await avanzar(2_000)
    await esperarRuta(router, '/examenes/3/resultado')
    expect(cuestionarioDe(3, '111111')?.respuestas[4]).toBe('Regular')
    expect(
      cuestionarioDe(3, '111111')?.calificaciones.some((fila) => fila.idPregunta === 4 && fila.correcto),
    ).toBe(true)
  })

  it('CA-EXA-09 al llegar a cero bloquea los campos, entrega una sola vez y muestra E16', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 10 })
    let entregas = 0
    const oyente = ({ request }: { request: Request }) => {
      if (request.method === 'POST' && request.url.includes('/entregar')) entregas += 1
    }
    server.events.on('request:start', oyente)
    const { router } = await abrirExamen(usuario)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'Regular')
    await avanzar(10 * 60_000)
    await esperarRuta(router, '/examenes/3/resultado')
    await avanzar(100)
    expect(await screen.findByText(TEXTO_VENTANA_CERRADA, undefined, { timeout: 3_000 })).toBeInTheDocument()
    expect(entregas).toBe(1)
    expect(cuestionarioDe(3, '111111')?.estado).toBe('ENTREGADO')
    expect(cuestionarioDe(3, '111111')?.calificaciones.some((fila) => fila.idPregunta === 4 && fila.correcto)).toBe(true)
    server.events.removeListener('request:start', oyente)
  })

  it('CA-EXA-09 si el guardado final falla igual entrega pero avisa que no se guardó', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 1 })
    server.use(http.put(`${API}/api/cuestionarios/:id/respuestas`, () => HttpResponse.error()))
    const { router } = await abrirExamen(usuario)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'Regular')
    await avanzar(60_000)
    await esperarRuta(router, '/examenes/3/resultado')
    await avanzar(100)
    expect(await screen.findByText(TEXTO_AUTOGUARDADO_FALLIDO, undefined, { timeout: 3_000 })).toBeInTheDocument()
    expect(await screen.findByText(TEXTO_VENTANA_CERRADA, undefined, { timeout: 3_000 })).toBeInTheDocument()
  })

  it('CA-EXA-10 un 409 D11 al entregar se muestra como E16 y pasa al resultado', async () => {
    server.use(
      http.post(`${API}/api/cuestionarios/:id/entregar`, () =>
        HttpResponse.text(D11_VENTANA_CERRADA, { status: 409 }),
      ),
    )
    const { usuario } = relojFalso()
    abrirVentanaDeExamen()
    const { router } = await abrirExamen(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Entregar' }))
    await esperarRuta(router, '/examenes/3/resultado')
    expect(await screen.findByText(TEXTO_VENTANA_CERRADA, undefined, { timeout: 3_000 })).toBeInTheDocument()
  })

  it('CA-EXA-07 un 409 D10 al entregar muestra su propio mensaje, no E16', async () => {
    server.use(
      http.post(`${API}/api/cuestionarios/:id/entregar`, () =>
        HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 }),
      ),
    )
    const { usuario } = relojFalso()
    abrirVentanaDeExamen()
    const { router } = await abrirExamen(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Entregar' }))
    await esperarRuta(router, '/examenes/3/resultado')
    expect(await screen.findByText(D10_EXAMEN_ENTREGADO, undefined, { timeout: 3_000 })).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_VENTANA_CERRADA)).not.toBeInTheDocument()
  })

  it('CA-EXA-07 un error que no es del cierre deja el examen abierto con su mensaje', async () => {
    server.use(http.post(`${API}/api/cuestionarios/:id/entregar`, () => HttpResponse.error()))
    const { usuario } = relojFalso()
    abrirVentanaDeExamen()
    const { router } = await abrirExamen(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Entregar' }))
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/examenes/3')
    expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument()
  })

  it('CA-EXA-07 una entrega a tiempo cuya respuesta llega después del cierre muestra éxito, no E16', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 1 })
    server.use(
      http.post(`${API}/api/cuestionarios/:id/entregar`, async () => {
        await delay(55_000)
        return HttpResponse.json({
          mensaje: 'Examen entregado con éxito.',
          cuestionario: CUESTIONARIO_RESUELTO_ESTABLE,
        })
      }),
    )
    const { router } = await abrirExamen(usuario)
    await avanzar(10_000)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Entregar' }))
    await avanzar(56_000)
    await esperarRuta(router, '/examenes/3/resultado')
    expect(await screen.findByText('Examen entregado con éxito.')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_VENTANA_CERRADA)).not.toBeInTheDocument()
  })
})

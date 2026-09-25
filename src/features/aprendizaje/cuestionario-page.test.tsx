import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { config } from '@/lib/config'
import {
  TEXTO_CUESTIONARIO_REINICIADO,
  TEXTO_GENERACION_DEMORADA,
  TEXTO_GENERACION_RECHAZADA,
  TEXTO_GENERANDO_CUESTIONARIO,
  TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO,
} from '@/lib/dominio/aprendizaje'
import { C5_DOCUMENTOS_AJENOS as C5_DEL_MOCK, ID_CUESTIONARIO } from '@/mocks/ia/cuestionarios'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { LIMITE_DE_GENERACION } from './components/formulario-generacion'
import { C5_DOCUMENTOS_AJENOS, C8_CUESTIONARIO_NO_ENCONTRADO } from './mensajes'

const RUTA_DOCUMENTOS = `${config.iaApiUrl}/documents`
const RUTA_GENERAR = `${config.iaApiUrl}/quizzes/generate`
const RUTA_CUESTIONARIO = `${config.iaApiUrl}/quizzes/${ID_CUESTIONARIO}`

const PRINCIPAL = 'PDI EA-510 Título III.pdf'

async function abrirFormulario(usuario?: ReturnType<typeof relojFalso>['usuario']) {
  await iniciarComo('alumno.lopez')
  const vista = renderApp('/aprendizaje/cuestionario', usuario)
  await screen.findByRole('group', { name: 'Documentos del cuestionario' })
  return vista
}

async function elegirYGenerar(usuario: ReturnType<typeof relojFalso>['usuario'], cantidad: string) {
  await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
  await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
  await usuario.type(screen.getByLabelText('Cantidad de preguntas'), cantidad)
  await usuario.click(screen.getByRole('button', { name: 'Generar cuestionario' }))
}

describe('Generar el cuestionario de práctica', () => {
  it('CA-CUE-02 solo ofrece los documentos en estado Listo', async () => {
    await abrirFormulario()
    const grupo = within(screen.getByRole('group', { name: 'Documentos del cuestionario' }))
    expect(grupo.getAllByRole('checkbox').map((casilla) => casilla.getAttribute('id'))).toHaveLength(2)
    expect(grupo.getByRole('checkbox', { name: PRINCIPAL })).toBeInTheDocument()
    expect(grupo.getByRole('checkbox', { name: 'Procedimientos de emergencia.docx' })).toBeInTheDocument()
    expect(grupo.queryByRole('checkbox', { name: 'Reglamento de operaciones.pdf' })).not.toBeInTheDocument()
    expect(grupo.queryByRole('checkbox', { name: 'Manual de vuelo escaneado.pdf' })).not.toBeInTheDocument()
  })

  it('CA-CUE-02 sin documentos listos muestra A15 con un enlace a Documentos', async () => {
    server.use(http.get(RUTA_DOCUMENTOS, () => HttpResponse.json([])))
    await iniciarComo('alumno.lopez')
    renderApp('/aprendizaje/cuestionario')
    expect(await screen.findByText(TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Documentos' })).toHaveAttribute('href', '/aprendizaje')
  })

  it('CA-CUE-01 exige un documento, un tipo de pregunta y una cantidad de 2 a 20', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.click(screen.getByRole('checkbox', { name: 'Opción múltiple' }))
    await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
    await usuario.type(screen.getByLabelText('Cantidad de preguntas'), '25')
    await usuario.click(screen.getByRole('button', { name: 'Generar cuestionario' }))
    expect(await screen.findByText('Elija al menos un documento.')).toBeInTheDocument()
    expect(screen.getByText('Elija al menos un tipo de pregunta.')).toBeInTheDocument()
    expect(screen.getByText('La cantidad debe ser un número entero entre 2 y 20.')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_GENERANDO_CUESTIONARIO)).not.toBeInTheDocument()
  })

  it('CA-CUE-03 al generar deshabilita el formulario, muestra A3 y no envía dos veces', async () => {
    let generaciones = 0
    const contar = ({ request }: { request: Request }) => {
      if (request.method === 'POST' && request.url === RUTA_GENERAR) generaciones += 1
    }
    server.events.on('request:start', contar)
    try {
      const { usuario, avanzar } = relojFalso()
      await abrirFormulario(usuario)
      await elegirYGenerar(usuario, '20')
      expect(await screen.findByText(TEXTO_GENERANDO_CUESTIONARIO)).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: PRINCIPAL })).toBeDisabled()
      expect(screen.getByLabelText('Cantidad de preguntas')).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled()
      await avanzar(3000)
      await waitFor(() => expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument())
      expect(generaciones).toBe(1)
    } finally {
      server.events.removeListener('request:start', contar)
    }
  })

  it('CA-CUE-04 un documento ajeno muestra C5 y el formulario queda listo para reintentar', async () => {
    server.use(
      http.post(RUTA_GENERAR, () =>
        HttpResponse.json({ statusCode: 404, message: C5_DOCUMENTOS_AJENOS, error: 'Not Found' }, { status: 404 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await elegirYGenerar(usuario, '5')
    expect(await screen.findByText(C5_DOCUMENTOS_AJENOS)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: PRINCIPAL })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Generar cuestionario' })).toBeEnabled()
  })

  it('contrato §5 el C5 definido en el mock llega a la pantalla tal cual', async () => {
    server.use(
      http.get(RUTA_DOCUMENTOS, () =>
        HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-0000000000ff',
            filename: PRINCIPAL,
            mimeType: 'application/pdf',
            sizeBytes: 2_411_008,
            status: 'ready',
            errorMessage: null,
            tags: [],
            createdAt: '2026-09-18T14:02:11.000Z',
            processedAt: '2026-09-18T14:02:58.000Z',
          },
        ]),
      ),
    )
    const { usuario } = await abrirFormulario()
    await elegirYGenerar(usuario, '5')
    expect(await screen.findByText(C5_DEL_MOCK)).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_GENERACION_RECHAZADA)).not.toBeInTheDocument()
  })

  it('CA-CUE-04 un documento que no está listo muestra C6 con sus nombres', async () => {
    server.use(
      http.post(RUTA_GENERAR, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Los siguientes documentos aún no están listos: Reglamento de operaciones.pdf',
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirFormulario()
    await elegirYGenerar(usuario, '5')
    expect(
      await screen.findByText('Los siguientes documentos aún no están listos: Reglamento de operaciones.pdf'),
    ).toBeInTheDocument()
  })

  it('CA-CUE-05 una generación rechazada muestra A5 sin el detalle técnico', async () => {
    const { usuario } = await abrirFormulario()
    await elegirYGenerar(usuario, '7')
    expect(await screen.findByText(TEXTO_GENERACION_RECHAZADA)).toBeInTheDocument()
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument()
    expect(screen.queryByText(/tras 3 intentos/)).not.toBeInTheDocument()
  })

  it('CA-CUE-06 a los 120 segundos sin respuesta se cancela y ofrece Reintentar', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirFormulario(usuario)
    await elegirYGenerar(usuario, '13')
    expect(await screen.findByText(TEXTO_GENERANDO_CUESTIONARIO)).toBeInTheDocument()
    await avanzar(LIMITE_DE_GENERACION - 1000)
    expect(screen.queryByText(TEXTO_GENERACION_DEMORADA)).not.toBeInTheDocument()
    await avanzar(1000)
    expect(await screen.findByText(TEXTO_GENERACION_DEMORADA)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  })

  it('CA-CUE-11 el cuestionario queda en la URL y al recargar se abre con A2', async () => {
    const { usuario, avanzar } = relojFalso()
    const { router, unmount } = await abrirFormulario(usuario)
    await elegirYGenerar(usuario, '20')
    await avanzar(3000)
    await waitFor(() => expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument())
    expect(router.state.location.search).toEqual({ cuestionario: ID_CUESTIONARIO })
    expect(screen.queryByText(TEXTO_CUESTIONARIO_REINICIADO)).not.toBeInTheDocument()
    unmount()

    await iniciarComo('alumno.lopez')
    renderApp(`/aprendizaje/cuestionario?cuestionario=${ID_CUESTIONARIO}`)
    expect(await screen.findByText(TEXTO_CUESTIONARIO_REINICIADO)).toBeInTheDocument()
  })

  it('M3-3 el cuestionario recién generado no se vuelve a pedir al servidor', async () => {
    let lecturas = 0
    const contar = ({ request }: { request: Request }) => {
      if (request.method === 'GET' && request.url === RUTA_CUESTIONARIO) lecturas += 1
    }
    server.events.on('request:start', contar)
    try {
      const { usuario, avanzar } = relojFalso()
      const { router } = await abrirFormulario(usuario)
      await elegirYGenerar(usuario, '20')
      await avanzar(3000)
      await waitFor(() => expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument())
      expect(router.state.location.search).toEqual({ cuestionario: ID_CUESTIONARIO })
      expect(lecturas).toBe(0)
    } finally {
      server.events.removeListener('request:start', contar)
    }
  })

  it('CA-CUE-12 una primera carga fallida ofrece Reintentar y se recupera al segundo intento', async () => {
    let lecturas = 0
    server.use(
      http.get(`${config.iaApiUrl}/quizzes/:id`, () => {
        lecturas += 1
        if (lecturas > 1) return
        return HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 })
      }),
    )
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp(`/aprendizaje/cuestionario?cuestionario=${ID_CUESTIONARIO}`)
    expect(await screen.findByText(MENSAJE_GENERICO)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument()
    expect(screen.queryByText(MENSAJE_GENERICO)).not.toBeInTheDocument()
    expect(lecturas).toBe(2)
  })

  it('CA-CUE-12 un cuestionario inexistente muestra C8 con la acción de volver al formulario', async () => {
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp('/aprendizaje/cuestionario?cuestionario=c0e50000-0000-4000-8000-00000000aaaa')
    expect(await screen.findByText(C8_CUESTIONARIO_NO_ENCONTRADO)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Volver al formulario' }))
    expect(await screen.findByRole('group', { name: 'Documentos del cuestionario' })).toBeInTheDocument()
  })
})

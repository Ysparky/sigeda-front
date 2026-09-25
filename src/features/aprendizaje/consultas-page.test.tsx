import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { TEXTO_RESPUESTA_SIN_FUENTES, TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS } from '@/lib/dominio/aprendizaje'
import { ID_SESION_CREADA } from '@/mocks/ia/consultas'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { C10_SIN_RESPUESTA, C5_DOCUMENTOS_AJENOS } from './mensajes'

const IA = config.iaApiUrl
const PRINCIPAL = 'PDI EA-510 Título III.pdf'

async function abrirConsultas(usuario?: ReturnType<typeof relojFalso>['usuario']) {
  await iniciarComo('alumno.lopez')
  const vista = renderApp('/aprendizaje/consultas', usuario)
  await screen.findByRole('group', { name: 'Documentos para consultar' })
  return vista
}

async function preguntar(usuario: ReturnType<typeof renderApp>['usuario'], texto: string) {
  await usuario.type(screen.getByLabelText('Pregunta'), texto)
  await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
}

function conversacion() {
  return within(screen.getByRole('region', { name: 'Conversación' }))
}

function contarPeticiones(metodo: string, url: string) {
  let total = 0
  const escuchar = ({ request }: { request: Request }) => {
    if (request.method === metodo && request.url === url) total += 1
  }
  server.events.on('request:start', escuchar)
  return { total: () => total, dejar: () => server.events.removeListener('request:start', escuchar) }
}

describe('Consultar los documentos con IA', () => {
  it('CA-CON-01 pide elegir documentos en estado Listo', async () => {
    await abrirConsultas()
    const grupo = within(screen.getByRole('group', { name: 'Documentos para consultar' }))
    expect(grupo.getAllByRole('checkbox')).toHaveLength(2)
    expect(grupo.getByRole('checkbox', { name: PRINCIPAL })).toBeInTheDocument()
    expect(grupo.queryByRole('checkbox', { name: 'Reglamento de operaciones.pdf' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('CA-CON-01 sin documentos listos muestra A16 con un enlace a Documentos', async () => {
    server.use(http.get(`${IA}/documents`, () => HttpResponse.json([])))
    await iniciarComo('alumno.lopez')
    renderApp('/aprendizaje/consultas')
    expect(await screen.findByText(TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Documentos' })).toHaveAttribute('href', '/aprendizaje')
  })

  it('CA-CON-02 la primera pregunta crea la conversación, deja el id en la URL y muestra sus documentos', async () => {
    const { usuario, router } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué es la autorrotación?')
    await waitFor(() => expect(router.state.location.search).toEqual({ sesion: ID_SESION_CREADA }))
    expect(conversacion().getByText('¿Qué es la autorrotación?')).toBeInTheDocument()
    const panel = within(screen.getByRole('region', { name: 'Documentos de la consulta' }))
    expect(panel.getByText(PRINCIPAL)).toBeInTheDocument()
  })

  it('CA-CON-03 un C5 al crear la conversación conserva la selección', async () => {
    server.use(
      http.post(`${IA}/chat/sessions`, () =>
        HttpResponse.json({ statusCode: 404, message: C5_DOCUMENTOS_AJENOS, error: 'Not Found' }, { status: 404 }),
      ),
    )
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué es la autorrotación?')
    expect(await screen.findByText(C5_DOCUMENTOS_AJENOS)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: PRINCIPAL })).toBeChecked()
    expect(screen.getByLabelText('Pregunta')).toHaveValue('¿Qué es la autorrotación?')
  })

  it('CA-CON-04 mientras espera muestra la pregunta y deshabilita el cuadro de texto', async () => {
    server.use(
      http.post(`${IA}/chat/messages`, async () => {
        await delay(3000)
        return HttpResponse.json(
          {
            message: {
              id: '3e550000-0000-4000-8000-100000000002',
              sessionId: ID_SESION_CREADA,
              role: 'assistant',
              content: 'Permite descender sin potencia [1].',
              citedChunkIds: [],
              createdAt: '2026-09-19T10:31:12.000Z',
            },
            sources: [
              {
                referenceNumber: 1,
                documentId: 'd0c00000-0000-4000-8000-000000000001',
                documentFilename: PRINCIPAL,
                excerpt: 'La autorrotación es la condición de vuelo…',
                similarity: 0.812,
              },
            ],
          },
          { status: 201 },
        )
      }),
    )
    const { usuario, avanzar } = relojFalso()
    await abrirConsultas(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué es la autorrotación?')
    expect(await screen.findByText('Esperando respuesta…')).toBeInTheDocument()
    expect(conversacion().getByText('¿Qué es la autorrotación?')).toBeInTheDocument()
    expect(screen.getByLabelText('Pregunta')).toBeDisabled()
    await avanzar(3000)
    await waitFor(() => expect(screen.queryByText('Esperando respuesta…')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Pregunta')).toBeEnabled()
  })

  it('CA-CON-05 cada cita abre su fuente con el documento, el fragmento y el porcentaje', async () => {
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué es la autorrotación?')
    const respuesta = within(await screen.findByRole('group', { name: 'Respuesta' }))
    await usuario.click(respuesta.getAllByRole('button', { name: '[1]' })[0]!)
    const fuente = within(await screen.findByRole('dialog'))
    expect(fuente.getByText(PRINCIPAL)).toBeInTheDocument()
    expect(fuente.getByText('Similitud 81 %')).toBeInTheDocument()
    expect(fuente.getByText(/el rotor principal gira por el flujo de aire ascendente/)).toBeInTheDocument()
  })

  it('CA-CON-05 un marcador fuera de rango queda como texto', async () => {
    server.use(
      http.post(`${IA}/chat/messages`, () =>
        HttpResponse.json(
          {
            message: {
              id: '3e550000-0000-4000-8000-100000000002',
              sessionId: ID_SESION_CREADA,
              role: 'assistant',
              content: 'Según el manual [7] no aplica [1].',
              citedChunkIds: [],
              createdAt: '2026-09-19T10:31:12.000Z',
            },
            sources: [
              {
                referenceNumber: 1,
                documentId: 'd0c00000-0000-4000-8000-000000000001',
                documentFilename: PRINCIPAL,
                excerpt: 'Fragmento',
                similarity: null,
              },
            ],
          },
          { status: 201 },
        ),
      ),
    )
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué dice el manual?')
    const respuesta = within(await screen.findByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getByText(/Según el manual \[7\] no aplica/)).toBeInTheDocument()
    expect(respuesta.getAllByRole('button', { name: '[1]' })).toHaveLength(1)
    expect(respuesta.queryByRole('button', { name: '[7]' })).not.toBeInTheDocument()
    await usuario.click(respuesta.getByRole('button', { name: '[1]' }))
    const fuente = within(await screen.findByRole('dialog'))
    expect(fuente.queryByText(/Similitud/)).not.toBeInTheDocument()
  })

  it('CA-CON-06 una respuesta sin fuentes añade A9', async () => {
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Cómo influye el clima?')
    const respuesta = within(await screen.findByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getByText(TEXTO_RESPUESTA_SIN_FUENTES)).toBeInTheDocument()
  })

  it('CA-CON-07 C10 se muestra como una respuesta normal sin fuentes', async () => {
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, 'provoca un error')
    const respuesta = within(await screen.findByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getByText(C10_SIN_RESPUESTA)).toBeInTheDocument()
    expect(respuesta.queryByText(TEXTO_RESPUESTA_SIN_FUENTES)).not.toBeInTheDocument()
  })

  it('CA-CON-08 un envío fallido deja la pregunta en el cuadro con Reintentar y sin turno a medias', async () => {
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, 'esto falla')
    expect(await screen.findByText(MENSAJE_GENERICO)).toBeInTheDocument()
    expect(screen.getByLabelText('Pregunta')).toHaveValue('esto falla')
    expect(conversacion().queryByRole('group', { name: 'Su pregunta' })).not.toBeInTheDocument()
    expect(conversacion().queryByRole('group', { name: 'Respuesta' })).not.toBeInTheDocument()
    const envios = contarPeticiones('POST', `${IA}/chat/messages`)
    try {
      await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
      await waitFor(() => expect(envios.total()).toBe(1))
    } finally {
      envios.dejar()
    }
    expect(await screen.findByText(MENSAJE_GENERICO)).toBeInTheDocument()
  })

  it('M3-8 volver atrás vacía la conversación y la siguiente pregunta crea una sola conversación', async () => {
    const creaciones = contarPeticiones('POST', `${IA}/chat/sessions`)
    const lecturas = contarPeticiones('GET', `${IA}/chat/sessions/${ID_SESION_CREADA}`)
    try {
      const { usuario, router } = await abrirConsultas()
      await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
      await preguntar(usuario, '¿Qué es la autorrotación?')
      expect(await screen.findByRole('group', { name: 'Respuesta' })).toBeInTheDocument()
      expect(router.state.location.search).toEqual({ sesion: ID_SESION_CREADA })
      router.history.back()
      await waitFor(() => expect(router.state.location.search).toEqual({}))
      expect(await screen.findByRole('group', { name: 'Documentos para consultar' })).toBeInTheDocument()
      expect(conversacion().queryByRole('group', { name: 'Su pregunta' })).not.toBeInTheDocument()
      expect(conversacion().queryByRole('group', { name: 'Respuesta' })).not.toBeInTheDocument()
      expect(creaciones.total()).toBe(1)
      await preguntar(usuario, '¿Y el régimen de rotor?')
      expect(await screen.findByRole('group', { name: 'Respuesta' })).toBeInTheDocument()
      expect(conversacion().getAllByRole('group', { name: 'Su pregunta' })).toHaveLength(1)
      expect(conversacion().getByText('¿Y el régimen de rotor?')).toBeInTheDocument()
      expect(creaciones.total()).toBe(2)
      expect(lecturas.total()).toBe(0)
    } finally {
      creaciones.dejar()
      lecturas.dejar()
    }
  })

  it('M3-8 si el envío falla tras crear la conversación, Reintentar no crea otra', async () => {
    let creaciones = 0
    server.use(
      http.post(`${IA}/chat/sessions`, () => {
        creaciones += 1
        return HttpResponse.json(
          {
            id: ID_SESION_CREADA,
            title: `Consulta sobre ${PRINCIPAL}`,
            createdAt: '2026-09-19T10:30:00.000Z',
            documents: [],
          },
          { status: 201 },
        )
      }),
      http.post(`${IA}/chat/messages`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 }),
      ),
    )
    const envios = contarPeticiones('POST', `${IA}/chat/messages`)
    try {
      const { usuario } = await abrirConsultas()
      await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
      await preguntar(usuario, '¿Qué es la autorrotación?')
      expect(await screen.findByText(MENSAJE_GENERICO)).toBeInTheDocument()
      expect(creaciones).toBe(1)
      await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
      await waitFor(() => expect(envios.total()).toBe(2))
      expect(creaciones).toBe(1)
    } finally {
      envios.dejar()
    }
  })
})

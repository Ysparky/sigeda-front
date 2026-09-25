import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_CONVERSACION_ILEGIBLE, TEXTO_FUENTES_NO_DISPONIBLES } from '@/lib/dominio/aprendizaje'
import { http, HttpResponse } from 'msw'
import {
  ID_SESION_CON_FUENTES,
  ID_SESION_ILEGIBLE,
  ID_SESION_SIN_FUENTES,
} from '@/mocks/ia/consultas'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { C9_SESION_NO_ENCONTRADA } from './mensajes'

const PRINCIPAL = 'PDI EA-510 Título III.pdf'

async function abrirConversacion(id: string) {
  await iniciarComo('alumno.lopez')
  return renderApp(`/aprendizaje/consultas?sesion=${id}`)
}

function conversacion() {
  return within(screen.getByRole('region', { name: 'Conversación' }))
}

describe('Recuperar una conversación', () => {
  it('CA-CON-09 con fuentes abre las citas anteriores sin porcentaje y no muestra A8', async () => {
    const { usuario } = await abrirConversacion(ID_SESION_CON_FUENTES)
    expect(await screen.findByRole('group', { name: 'Su pregunta' })).toBeInTheDocument()
    expect(conversacion().getByText('¿Qué es la autorrotación?')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_FUENTES_NO_DISPONIBLES)).not.toBeInTheDocument()
    const respuesta = within(screen.getByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getAllByRole('button', { name: /^\[\d]$/ })).toHaveLength(3)
    await usuario.click(respuesta.getAllByRole('button', { name: '[2]' })[0]!)
    const fuente = within(await screen.findByRole('dialog'))
    expect(fuente.getByText(PRINCIPAL)).toBeInTheDocument()
    expect(fuente.getByText(/El régimen de rotor debe mantenerse/)).toBeInTheDocument()
    expect(fuente.queryByText(/Similitud/)).not.toBeInTheDocument()
  })

  it('CA-CON-09 los documentos de la conversación se muestran junto a ella', async () => {
    await abrirConversacion(ID_SESION_CON_FUENTES)
    const panel = within(await screen.findByRole('region', { name: 'Documentos de la consulta' }))
    expect(panel.getByText(PRINCIPAL)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Documentos para consultar' })).not.toBeInTheDocument()
  })

  it('CA-CON-09 sin fuentes deja los marcadores como texto y muestra A8', async () => {
    await abrirConversacion(ID_SESION_SIN_FUENTES)
    expect(await screen.findByText(TEXTO_FUENTES_NO_DISPONIBLES)).toBeInTheDocument()
    const respuesta = within(screen.getByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getByText(/El régimen de rotor se mantiene con el flujo ascendente \[1]\[2]\./)).toBeInTheDocument()
    expect(respuesta.queryByRole('button', { name: '[1]' })).not.toBeInTheDocument()
  })

  it('CA-CON-10 un error del servidor muestra A7 con Nueva consulta dentro de la pantalla', async () => {
    const { usuario } = await abrirConversacion(ID_SESION_ILEGIBLE)
    expect(await screen.findByText(TEXTO_CONVERSACION_ILEGIBLE)).toBeInTheDocument()
    expect(screen.queryByText('Página no encontrada')).not.toBeInTheDocument()
    expect(screen.queryByText('Ocurrió un error inesperado. Intente nuevamente.')).not.toBeInTheDocument()
    await usuario.click(screen.getAllByRole('button', { name: 'Nueva consulta' })[0]!)
    expect(await screen.findByRole('group', { name: 'Documentos para consultar' })).toBeInTheDocument()
  })

  it('CA-CON-10 la consulta de la sesión no se reintenta', async () => {
    let intentos = 0
    server.use(
      http.get(`${config.iaApiUrl}/chat/sessions/:id`, () => {
        intentos += 1
        return HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 })
      }),
    )
    await abrirConversacion(ID_SESION_ILEGIBLE)
    expect(await screen.findByText(TEXTO_CONVERSACION_ILEGIBLE)).toBeInTheDocument()
    await waitFor(() => expect(intentos).toBe(1))
  })

  it('CA-CON-11 una conversación inexistente muestra C9', async () => {
    await abrirConversacion('5e550000-0000-4000-8000-00000000aaaa')
    expect(await screen.findByText(C9_SESION_NO_ENCONTRADA)).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_CONVERSACION_ILEGIBLE)).not.toBeInTheDocument()
  })

  it('CA-CON-12 Nueva consulta limpia el identificador de la URL y vuelve a elegir documentos', async () => {
    const { usuario, router } = await abrirConversacion(ID_SESION_CON_FUENTES)
    expect(await screen.findByRole('group', { name: 'Respuesta' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Nueva consulta' }))
    await waitFor(() => expect(router.state.location.search).toEqual({}))
    expect(await screen.findByRole('group', { name: 'Documentos para consultar' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Respuesta' })).not.toBeInTheDocument()
  })

  it('CA-CON-13 la conversación nunca muestra el texto extraído ni la ruta de almacenamiento', async () => {
    server.use(
      http.get(`${config.iaApiUrl}/chat/sessions/:id`, () =>
        HttpResponse.json({
          id: ID_SESION_CON_FUENTES,
          title: 'Consulta sobre PDI EA-510 Título III.pdf',
          createdAt: '2026-09-19T10:30:00.000Z',
          documents: [
            {
              id: 'd0c00000-0000-4000-8000-000000000001',
              filename: PRINCIPAL,
              mimeType: 'application/pdf',
              sizeBytes: 2_411_008,
              status: 'ready',
              errorMessage: null,
              tags: [],
              createdAt: '2026-09-18T14:02:11.000Z',
              processedAt: '2026-09-18T14:02:58.000Z',
              extractedText: 'TITULO III DE LA INSTRUCCION EN VUELO',
              storageKey: 'documentos/564984ee/pdi-titulo-iii.pdf',
            },
          ],
          messages: [],
        }),
      ),
    )
    await abrirConversacion(ID_SESION_CON_FUENTES)
    const panel = within(await screen.findByRole('region', { name: 'Documentos de la consulta' }))
    expect(panel.getByText(PRINCIPAL)).toBeInTheDocument()
    expect(screen.queryByText(/TITULO III DE LA INSTRUCCION/)).not.toBeInTheDocument()
    expect(screen.queryByText(/documentos\/564984ee/)).not.toBeInTheDocument()
  })
})

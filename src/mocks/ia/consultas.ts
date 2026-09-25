import { http, HttpResponse } from 'msw'
import { documentoPublico, errorInterno, IA, noEncontrado } from './comun'
import { revisarDocumentos } from './cuestionarios'
import { buscarDocumento, datosIa, type SesionMock } from './datos'

export const ID_SESION_CON_FUENTES = '5e550000-0000-4000-8000-000000000001'
export const ID_SESION_SIN_FUENTES = '5e550000-0000-4000-8000-000000000002'
export const ID_SESION_CREADA = '5e550000-0000-4000-8000-000000000003'
export const ID_SESION_ILEGIBLE = '5e550000-0000-4000-8000-000000000009'

export const C9_SESION_NO_ENCONTRADA = 'Sesión de chat no encontrada.'
export const C10_SIN_RESPUESTA = 'No se pudo generar una respuesta. Intenta reformular tu pregunta.'

const ID_DOCUMENTO_PRINCIPAL = 'd0c00000-0000-4000-8000-000000000001'
const FRAGMENTOS = ['cc000000-0000-4000-8000-000000000001', 'cc000000-0000-4000-8000-000000000002']

const CONTENIDO_USUARIO = '¿Qué es la autorrotación?'
const CONTENIDO_ASISTENTE =
  'La autorrotación permite un descenso controlado sin potencia [1]. El régimen de rotor se mantiene con el flujo ascendente [1][2].'

const EXCERPTS = [
  'La autorrotación es la condición de vuelo en la que el rotor principal gira por el flujo de aire ascendente.',
  'El régimen de rotor debe mantenerse dentro del arco verde durante todo el descenso.',
]

type CuerpoSesion = { documentIds?: unknown }
type CuerpoMensaje = { sessionId?: unknown; message?: unknown }

function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((elemento): elemento is string => typeof elemento === 'string') : []
}

function fuentesResueltas(similitudes: readonly (number | null)[]) {
  const documento = buscarDocumento(ID_DOCUMENTO_PRINCIPAL)
  return similitudes.map((similarity, indice) => ({
    referenceNumber: indice + 1,
    documentId: documento ? documento.id : null,
    documentFilename: documento ? documento.filename : null,
    excerpt: EXCERPTS[indice] ?? null,
    similarity,
  }))
}

function sesionFija(id: string, conFuentes: boolean): SesionMock {
  const sufijo = conFuentes ? '000' : '001'
  return {
    id,
    title: 'Consulta sobre PDI EA-510 Título III.pdf',
    createdAt: '2026-09-19T10:30:00.000Z',
    documentIds: [ID_DOCUMENTO_PRINCIPAL],
    conFuentes,
    mensajes: [
      {
        id: `3e550000-0000-4000-8000-0000000${sufijo}1`,
        sessionId: id,
        role: 'user',
        content: CONTENIDO_USUARIO,
        createdAt: '2026-09-19T10:31:00.000Z',
        citedChunkIds: [],
      },
      {
        id: `3e550000-0000-4000-8000-0000000${sufijo}2`,
        sessionId: id,
        role: 'assistant',
        content: CONTENIDO_ASISTENTE,
        createdAt: '2026-09-19T10:31:12.000Z',
        citedChunkIds: FRAGMENTOS,
      },
    ],
  }
}

function documentosDeSesion(ids: readonly string[]) {
  return ids.flatMap((id) => {
    const documento = buscarDocumento(id)
    return documento ? [documentoPublico(documento)] : []
  })
}

function sesionPublica(sesion: SesionMock) {
  return {
    id: sesion.id,
    title: sesion.title,
    createdAt: sesion.createdAt,
    documents: documentosDeSesion(sesion.documentIds),
    messages: sesion.mensajes.map((mensaje) => {
      const base = {
        id: mensaje.id,
        sessionId: mensaje.sessionId,
        role: mensaje.role,
        content: mensaje.content,
        createdAt: mensaje.createdAt,
      }
      if (!sesion.conFuentes) return base
      return { ...base, sources: fuentesResueltas(mensaje.citedChunkIds.map(() => null)) }
    }),
  }
}

function buscarSesion(id: string): SesionMock | undefined {
  if (id === ID_SESION_CON_FUENTES) return sesionFija(id, true)
  if (id === ID_SESION_SIN_FUENTES) return sesionFija(id, false)
  return datosIa().sesiones.find((sesion) => sesion.id === id)
}

export const handlersConsultas = [
  http.post(`${IA}/chat/sessions`, async ({ request }) => {
    const cuerpo = (await request.json()) as CuerpoSesion
    const ids = textos(cuerpo.documentIds)
    const problema = revisarDocumentos(ids)
    if (problema) return problema
    const nombres = documentosDeSesion(ids).map((documento) => documento.filename)
    const sesion: SesionMock = {
      id: ID_SESION_CREADA,
      title: `Consulta sobre ${nombres.join(', ')}`,
      createdAt: new Date().toISOString(),
      documentIds: [...ids],
      conFuentes: true,
      mensajes: [],
    }
    datosIa().sesiones = [...datosIa().sesiones.filter((previa) => previa.id !== sesion.id), sesion]
    return HttpResponse.json(sesionPublica(sesion), { status: 201 })
  }),
  http.post(`${IA}/chat/messages`, async ({ request }) => {
    const cuerpo = (await request.json()) as CuerpoMensaje
    const id = typeof cuerpo.sessionId === 'string' ? cuerpo.sessionId : ''
    const pregunta = typeof cuerpo.message === 'string' ? cuerpo.message : ''
    const sesion = datosIa().sesiones.find((candidata) => candidata.id === id)
    if (!sesion) return noEncontrado(C9_SESION_NO_ENCONTRADA)
    if (pregunta.toLowerCase().includes('falla')) return errorInterno()
    const sinFuentes = pregunta.toLowerCase().includes('clima')
    const fallaDelModelo = pregunta.toLowerCase().includes('error')
    const orden = sesion.mensajes.length + 1
    sesion.mensajes.push({
      id: `3e550000-0000-4000-8000-1000000000${String(orden).padStart(2, '0')}`,
      sessionId: sesion.id,
      role: 'user',
      content: pregunta,
      createdAt: new Date().toISOString(),
      citedChunkIds: [],
    })
    const fuentes = sinFuentes || fallaDelModelo ? [] : fuentesResueltas([0.812, 0.774])
    const respuesta = {
      id: `3e550000-0000-4000-8000-1000000000${String(orden + 1).padStart(2, '0')}`,
      sessionId: sesion.id,
      role: 'assistant' as const,
      content: fallaDelModelo ? C10_SIN_RESPUESTA : sinFuentes ? 'No encontré nada sobre eso en los documentos.' : CONTENIDO_ASISTENTE,
      createdAt: new Date().toISOString(),
      citedChunkIds: fuentes.length > 0 ? FRAGMENTOS : [],
    }
    sesion.mensajes.push(respuesta)
    return HttpResponse.json({ message: respuesta, sources: fuentes }, { status: 201 })
  }),
  http.get(`${IA}/chat/sessions/:id`, ({ params }) => {
    const id = String(params.id)
    if (id === ID_SESION_ILEGIBLE) return errorInterno()
    const sesion = buscarSesion(id)
    if (!sesion) return noEncontrado(C9_SESION_NO_ENCONTRADA)
    return HttpResponse.json(sesionPublica(sesion))
  }),
]

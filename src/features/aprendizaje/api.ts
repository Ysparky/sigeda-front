import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { ia } from '@/lib/api/ia'

export type EstadoDocumento = 'processing' | 'ready' | 'error'

export type Documento = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  status: EstadoDocumento
  errorMessage: string | null
  tags: string[]
  createdAt: string
  processedAt: string | null
}

export type TipoPregunta = 'multiple_choice' | 'true_false' | 'fill_blank'

export type OpcionPregunta = { id: string; text: string }

export type Pregunta = {
  id: string
  type: TipoPregunta
  position: number
  prompt: string
  options: OpcionPregunta[] | null
  correctAnswer: string
  explanation: string | null
  sourceExcerpt: string | null
}

export type Cuestionario = {
  id: string
  title: string
  requestedCount: number
  createdAt: string
  preguntas: Pregunta[]
}

export type CuerpoGeneracion = { documentIds: string[]; questionTypes: TipoPregunta[]; questionCount: number }

export type Fuente = {
  referenceNumber: number
  documentId: string | null
  documentFilename: string | null
  excerpt: string | null
  similarity: number | null
}

export type MensajeChat = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  fuentes: Fuente[] | null
}

export type SesionDeConsulta = {
  id: string
  title: string
  createdAt: string
  documentos: Documento[]
  mensajes: MensajeChat[]
}

const esquemaDocumento = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  status: z.string(),
  errorMessage: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  createdAt: z.string(),
  processedAt: z.string().nullish(),
})

const esquemaFuente = z.object({
  referenceNumber: z.number(),
  documentId: z.string().nullish(),
  documentFilename: z.string().nullish(),
  excerpt: z.string().nullish(),
  similarity: z.number().nullish(),
})

const esquemaPregunta = z.object({
  id: z.string(),
  type: z.enum(['multiple_choice', 'true_false', 'fill_blank']),
  position: z.number(),
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).nullish(),
  correctAnswer: z.string(),
  explanation: z.string().nullish(),
  sourceExcerpt: z.string().nullish(),
})

const esquemaCuestionario = z.object({
  id: z.string(),
  title: z.string(),
  requestedCount: z.number(),
  createdAt: z.string(),
  questions: z.array(esquemaPregunta),
})

const esquemaMensaje = z.object({
  id: z.string(),
  role: z.string(),
  content: z.string(),
  createdAt: z.string(),
  sources: z.array(esquemaFuente).optional(),
})

const esquemaSesion = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  documents: z.array(esquemaDocumento),
  messages: z.array(esquemaMensaje).optional(),
})

const esquemaRespuestaDeChat = z.object({ message: esquemaMensaje, sources: z.array(esquemaFuente) })

function estadoDeDocumento(valor: string): EstadoDocumento {
  return valor === 'ready' || valor === 'error' ? valor : 'processing'
}

function aDocumento(crudo: unknown): Documento {
  const documento = esquemaDocumento.parse(crudo)
  return {
    id: documento.id,
    filename: documento.filename,
    mimeType: documento.mimeType,
    sizeBytes: documento.sizeBytes,
    status: estadoDeDocumento(documento.status),
    errorMessage: documento.errorMessage ?? null,
    tags: documento.tags ?? [],
    createdAt: documento.createdAt,
    processedAt: documento.processedAt ?? null,
  }
}

function aFuente(crudo: z.output<typeof esquemaFuente>): Fuente {
  return {
    referenceNumber: crudo.referenceNumber,
    documentId: crudo.documentId ?? null,
    documentFilename: crudo.documentFilename ?? null,
    excerpt: crudo.excerpt ?? null,
    similarity: crudo.similarity ?? null,
  }
}

function aMensaje(crudo: z.output<typeof esquemaMensaje>, fuentes?: Fuente[]): MensajeChat {
  return {
    id: crudo.id,
    role: crudo.role === 'user' ? 'user' : 'assistant',
    content: crudo.content,
    createdAt: crudo.createdAt,
    fuentes: fuentes ?? (crudo.sources === undefined ? null : crudo.sources.map(aFuente)),
  }
}

function aPregunta(crudo: z.output<typeof esquemaPregunta>): Pregunta {
  return {
    id: crudo.id,
    type: crudo.type,
    position: crudo.position,
    prompt: crudo.prompt,
    options: crudo.options ?? null,
    correctAnswer: crudo.correctAnswer,
    explanation: crudo.explanation ?? null,
    sourceExcerpt: crudo.sourceExcerpt ?? null,
  }
}

function aCuestionario(crudo: unknown): Cuestionario {
  const cuestionario = esquemaCuestionario.parse(crudo)
  return {
    id: cuestionario.id,
    title: cuestionario.title,
    requestedCount: cuestionario.requestedCount,
    createdAt: cuestionario.createdAt,
    preguntas: [...cuestionario.questions].sort((a, b) => a.position - b.position).map(aPregunta),
  }
}

function aSesion(crudo: unknown): SesionDeConsulta {
  const sesion = esquemaSesion.parse(crudo)
  return {
    id: sesion.id,
    title: sesion.title,
    createdAt: sesion.createdAt,
    documentos: sesion.documents.map(aDocumento),
    mensajes: (sesion.messages ?? []).map((mensaje) => aMensaje(mensaje)),
  }
}

export const clavesAprendizaje = {
  todo: ['aprendizaje'] as const,
  documentos: () => [...clavesAprendizaje.todo, 'documentos'] as const,
  cuestionario: (id: string) => [...clavesAprendizaje.todo, 'cuestionario', id] as const,
  sesion: (id: string) => [...clavesAprendizaje.todo, 'sesion', id] as const,
}

export async function listarDocumentos(): Promise<Documento[]> {
  const documentos = await ia.get<unknown[]>('/documents')
  return (documentos ?? []).map(aDocumento)
}

export async function subirDocumento(archivo: File): Promise<Documento> {
  return aDocumento(await ia.subirArchivo<unknown>('/documents/upload', archivo))
}

export async function eliminarDocumento(id: string): Promise<void> {
  await ia.eliminar<unknown>(`/documents/${encodeURIComponent(id)}`)
}

export async function generarCuestionario(cuerpo: CuerpoGeneracion, senal: AbortSignal): Promise<Cuestionario> {
  return aCuestionario(await ia.post<unknown>('/quizzes/generate', cuerpo, senal))
}

export async function obtenerCuestionario(id: string): Promise<Cuestionario> {
  return aCuestionario(await ia.get<unknown>(`/quizzes/${encodeURIComponent(id)}`))
}

export async function crearSesion(documentIds: string[]): Promise<SesionDeConsulta> {
  return aSesion(await ia.post<unknown>('/chat/sessions', { documentIds }))
}

export async function obtenerSesion(id: string): Promise<SesionDeConsulta> {
  return aSesion(await ia.get<unknown>(`/chat/sessions/${encodeURIComponent(id)}`))
}

export async function enviarMensaje(sessionId: string, message: string): Promise<MensajeChat> {
  const respuesta = esquemaRespuestaDeChat.parse(await ia.post<unknown>('/chat/messages', { sessionId, message }))
  return aMensaje(respuesta.message, respuesta.sources.map(aFuente))
}

export const consultasAprendizaje = {
  documentos: () => queryOptions({ queryKey: clavesAprendizaje.documentos(), queryFn: listarDocumentos }),
  cuestionario: (id: string) =>
    queryOptions({ queryKey: clavesAprendizaje.cuestionario(id), queryFn: () => obtenerCuestionario(id), retry: false }),
  sesion: (id: string) =>
    queryOptions({ queryKey: clavesAprendizaje.sesion(id), queryFn: () => obtenerSesion(id), retry: false }),
}

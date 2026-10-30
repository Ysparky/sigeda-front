import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type CursoCatalogo = {
  id: number
  nombre: string
  descripcion: string
  duracion: number
  requisitos: string
}

export type HorarioItem = { id: number; nombre: string; detalle: string }

export type CursoDetalle = CursoCatalogo & { horarios: HorarioItem[] }

const esquemaCurso = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string(),
  duracion: z.number(),
  requisitos: z.string(),
})

const esquemaDetalle = esquemaCurso.extend({
  horarios: z.array(z.object({ id: z.number(), nombre: z.string(), detalle: z.string() })),
})

export const clavesInscripcion = {
  todo: ['inscripcion'] as const,
  catalogo: () => [...clavesInscripcion.todo, 'catalogo'] as const,
  curso: (id: number) => [...clavesInscripcion.todo, 'curso', id] as const,
}

export async function listarCatalogo(): Promise<CursoCatalogo[]> {
  const cursos = await sigeda.lista<unknown>('/api/public/cursos')
  return cursos.map((curso) => esquemaCurso.parse(curso))
}

export async function obtenerCurso(id: number): Promise<CursoDetalle> {
  const curso = await sigeda.get<unknown>(`/api/public/cursos/${id}`)
  return esquemaDetalle.parse(curso)
}

export const catalogoQuery = () => queryOptions({ queryKey: clavesInscripcion.catalogo(), queryFn: listarCatalogo })

export const cursoQuery = (id: number) =>
  queryOptions({ queryKey: clavesInscripcion.curso(id), queryFn: () => obtenerCurso(id) })

// --- Convocatorias (catálogo público) ---

export type ConvocatoriaPublica = {
  id: number
  idCurso: number | null
  nombre: string
  descripcion: string | null
  fechaInicio: string
  fechaFin: string
  vacantes: number
  documentosRequeridos: string | null
}

const esquemaConvocatoriaPublica = z.object({
  id: z.number(),
  idCurso: z.number().nullish().transform((v) => v ?? null),
  nombre: z.string(),
  descripcion: z.string().nullish().transform((v) => v ?? null),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  vacantes: z.number(),
  documentosRequeridos: z.string().nullish().transform((v) => v ?? null),
})

export async function listarConvocatoriasPublicas(): Promise<ConvocatoriaPublica[]> {
  const datos = await sigeda.lista<unknown>('/api/public/convocatorias')
  return datos.map((c) => esquemaConvocatoriaPublica.parse(c))
}

export async function obtenerConvocatoriaPublica(id: number): Promise<ConvocatoriaPublica> {
  return esquemaConvocatoriaPublica.parse(await sigeda.get<unknown>(`/api/public/convocatorias/${id}`))
}

export const convocatoriasPublicasQuery = () =>
  queryOptions({ queryKey: [...clavesInscripcion.todo, 'convocatorias'], queryFn: listarConvocatoriasPublicas })

export const convocatoriaPublicaQuery = (id: number) =>
  queryOptions({ queryKey: [...clavesInscripcion.todo, 'convocatoria', id], queryFn: () => obtenerConvocatoriaPublica(id) })

// --- Matrícula ---

export type EstadoMatricula = 'PENDIENTE' | 'OBSERVADA' | 'VALIDADA' | 'RECHAZADA' | 'NO_ADMITIDO'

export type DatosMatricula = {
  idConvocatoria: number
  dni: string
  nombres: string
  aPaterno: string
  aMaterno: string
  correo: string
  contacto: string
  idHorario: number | null
  password: string
}

export type MiMatricula = {
  id: number
  idCurso: number | null
  dni: string
  nombres: string
  aPaterno: string
  aMaterno: string
  correo: string
  contacto: string | null
  idHorario: number | null
  estado: EstadoMatricula
  motivoRechazo: string | null
  observaciones: string | null
  resultado: 'ADMITIDO' | 'NO_ADMITIDO' | null
}

const esquemaMia = z.object({
  id: z.number(),
  idCurso: z.number().nullable(),
  dni: z.string(),
  nombres: z.string(),
  aPaterno: z.string(),
  aMaterno: z.string(),
  correo: z.string(),
  contacto: z.string().nullable(),
  idHorario: z.number().nullable(),
  estado: z.enum(['PENDIENTE', 'OBSERVADA', 'VALIDADA', 'RECHAZADA', 'NO_ADMITIDO']),
  motivoRechazo: z.string().nullable(),
  observaciones: z.string().nullish().transform((v) => v ?? null),
  resultado: z.enum(['ADMITIDO', 'NO_ADMITIDO']).nullish().transform((v) => v ?? null),
})

export const clavesMia = { mia: () => [...clavesInscripcion.todo, 'mia'] as const }

export async function crearMatricula(datos: DatosMatricula, comprobante: File): Promise<{ matriculaId: number }> {
  const formulario = new FormData()
  formulario.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
  formulario.append('comprobante', comprobante, comprobante.name)
  return sigeda.multipart('POST', '/api/public/matriculas', formulario)
}

export async function obtenerMiMatricula(): Promise<MiMatricula> {
  return esquemaMia.parse(await sigeda.get<unknown>('/api/matriculas/mia'))
}

export async function reenviarComprobante(comprobante: File): Promise<{ mensaje: string }> {
  const formulario = new FormData()
  formulario.append('comprobante', comprobante, comprobante.name)
  return sigeda.multipart('PUT', '/api/matriculas/mia', formulario)
}

export const miMatriculaQuery = () =>
  queryOptions({ queryKey: clavesMia.mia(), queryFn: obtenerMiMatricula, retry: false })

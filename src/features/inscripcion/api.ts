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

// --- Matrícula ---

export type EstadoMatricula = 'PENDIENTE' | 'VALIDADA' | 'RECHAZADA'

export type DatosMatricula = {
  idCurso: number
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
  estado: z.enum(['PENDIENTE', 'VALIDADA', 'RECHAZADA']),
  motivoRechazo: z.string().nullable(),
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

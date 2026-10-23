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

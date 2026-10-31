import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type EstadoConvocatoria = 'BORRADOR' | 'PUBLICADA' | 'CERRADA' | 'FINALIZADA'

export type Convocatoria = {
  id: number
  idCurso: number | null
  nombre: string
  descripcion: string | null
  fechaInicio: string
  fechaFin: string
  vacantes: number
  documentosRequeridos: string | null
  estado: EstadoConvocatoria
  idGrupo: number | null
  grupoNombre: string | null
  grupoEstado: string | null
}

export type CuerpoConvocatoria = {
  idCurso: number
  nombre: string
  descripcion: string
  fechaInicio: string
  fechaFin: string
  vacantes: number
  documentosRequeridos: string
}

const esquemaConvocatoria = z.object({
  id: z.number(),
  idCurso: z.number().nullish().transform((v) => v ?? null),
  nombre: z.string(),
  descripcion: z.string().nullish().transform((v) => v ?? null),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  vacantes: z.number(),
  documentosRequeridos: z.string().nullish().transform((v) => v ?? null),
  estado: z.enum(['BORRADOR', 'PUBLICADA', 'CERRADA', 'FINALIZADA']),
  idGrupo: z.number().nullish().transform((v) => v ?? null),
  grupoNombre: z.string().nullish().transform((v) => v ?? null),
  grupoEstado: z.string().nullish().transform((v) => v ?? null),
})

export const clavesConvocatorias = {
  todo: ['convocatorias'] as const,
  lista: () => [...clavesConvocatorias.todo, 'lista'] as const,
  detalle: (id: number) => [...clavesConvocatorias.todo, 'detalle', id] as const,
}

export async function listarConvocatorias(): Promise<Convocatoria[]> {
  const datos = await sigeda.lista<unknown>('/api/convocatorias')
  return datos.map((c) => esquemaConvocatoria.parse(c))
}

export async function obtenerConvocatoria(id: number): Promise<Convocatoria> {
  return esquemaConvocatoria.parse(await sigeda.get<unknown>(`/api/convocatorias/${id}`))
}

export async function crearConvocatoria(cuerpo: CuerpoConvocatoria): Promise<Convocatoria> {
  return esquemaConvocatoria.parse(await sigeda.post<unknown>('/api/convocatorias', cuerpo))
}

export async function modificarConvocatoria(id: number, cuerpo: CuerpoConvocatoria): Promise<Convocatoria> {
  return esquemaConvocatoria.parse(await sigeda.put<unknown>(`/api/convocatorias/${id}`, cuerpo))
}

export async function cambiarEstadoConvocatoria(id: number, estado: EstadoConvocatoria): Promise<Convocatoria> {
  return esquemaConvocatoria.parse(await sigeda.put<unknown>(`/api/convocatorias/${id}/estado`, { estado }))
}

export const convocatoriasQuery = () =>
  queryOptions({ queryKey: clavesConvocatorias.lista(), queryFn: listarConvocatorias })

export const convocatoriaQuery = (id: number) =>
  queryOptions({ queryKey: clavesConvocatorias.detalle(id), queryFn: () => obtenerConvocatoria(id) })

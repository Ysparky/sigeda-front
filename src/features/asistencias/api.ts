import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA'

export type AsistenciaAlumno = {
  codAlumno: string
  nombres: string | null
  aPaterno: string | null
  aMaterno: string | null
  estado: EstadoAsistencia | null
}

export type MarcaAsistencia = { codAlumno: string; estado: EstadoAsistencia }

export type ReporteAsistencia = {
  codAlumno: string
  nombre: string
  sesiones: number
  faltas: number
  porcentajeInasistencia: number
  condicion: string
}

const esquemaEstado = z.enum(['PRESENTE', 'AUSENTE', 'JUSTIFICADA'])

const esquemaRoster = z.object({
  codAlumno: z.string(),
  nombres: z.string().nullable(),
  aPaterno: z.string().nullable(),
  aMaterno: z.string().nullable(),
  estado: esquemaEstado.nullable(),
})

const esquemaReporte = z.object({
  codAlumno: z.string(),
  nombre: z.string(),
  sesiones: z.number(),
  faltas: z.number(),
  porcentajeInasistencia: z.number(),
  condicion: z.string(),
})

export const clavesAsistencia = {
  todo: ['asistencias'] as const,
  roster: (idTurno: number) => [...clavesAsistencia.todo, 'roster', idTurno] as const,
  reporte: (grupo: number) => [...clavesAsistencia.todo, 'reporte', grupo] as const,
}

export async function listarRoster(idTurno: number): Promise<AsistenciaAlumno[]> {
  const filas = await sigeda.lista<unknown>(`/api/turnos/${idTurno}/asistencia`)
  return filas.map((fila) => esquemaRoster.parse(fila))
}

export function guardarAsistencia(idTurno: number, marcas: MarcaAsistencia[]): Promise<{ mensaje: string }> {
  return sigeda.put<{ mensaje: string }>(`/api/turnos/${idTurno}/asistencia`, marcas)
}

export async function listarReporte(grupo: number): Promise<ReporteAsistencia[]> {
  const filas = await sigeda.lista<unknown>('/api/asistencia/reporte', { grupo })
  return filas.map((fila) => esquemaReporte.parse(fila))
}

export const rosterQuery = (idTurno: number) =>
  queryOptions({ queryKey: clavesAsistencia.roster(idTurno), queryFn: () => listarRoster(idTurno) })

export const reporteQuery = (grupo: number) =>
  queryOptions({ queryKey: clavesAsistencia.reporte(grupo), queryFn: () => listarReporte(grupo) })

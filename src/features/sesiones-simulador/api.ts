import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type EstadoSesion = 'PLANIFICADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'
export type ResumenSesion = 'COMPETENTE' | 'NO_COMPETENTE'

export type SesionIndex = {
  id: number
  idSimulador: number | null
  simuladorNombre: string | null
  idEscenario: number | null
  escenarioNombre: string | null
  codAlumno: string
  fechaPlanificada: string
  estado: EstadoSesion
}

export type ResultadoDetalle = {
  idIndicador: number
  indicadorNombre: string | null
  competencia: string | null
  calificacion: number
  comentario: string | null
}

export type SesionDetalle = {
  id: number
  idSimulador: number | null
  simuladorNombre: string | null
  idEscenario: number | null
  escenarioNombre: string | null
  codAlumno: string
  codInstructor: string
  fechaPlanificada: string
  fechaEjecucion: string | null
  estado: EstadoSesion
  notasBriefing: string | null
  notasDebrief: string | null
  autoevaluacionAlumno: string | null
  resultados: ResultadoDetalle[]
  resumen: ResumenSesion | null
}

export type CuerpoSesion = {
  idSimulador: number
  idEscenario: number
  codAlumno: string
  codInstructor: string
  fechaPlanificada: string
}

export type CuerpoResultado = { idIndicador: number; calificacion: number; comentario: string }

export type CuerpoCalificacion = {
  notasBriefing: string
  notasDebrief: string
  autoevaluacionAlumno: string
  resultados: CuerpoResultado[]
}

const texto = z
  .string()
  .nullish()
  .transform((v) => v ?? null)
const numeroNulable = z
  .number()
  .nullish()
  .transform((v) => v ?? null)
const estado = z.enum(['PLANIFICADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'])

const esquemaIndex = z.object({
  id: z.number(),
  idSimulador: numeroNulable,
  simuladorNombre: texto,
  idEscenario: numeroNulable,
  escenarioNombre: texto,
  codAlumno: z.string(),
  fechaPlanificada: z.string(),
  estado,
})

const esquemaResultado = z.object({
  idIndicador: z.number(),
  indicadorNombre: texto,
  competencia: texto,
  calificacion: z.number(),
  comentario: texto,
})

const esquemaDetalle = z.object({
  id: z.number(),
  idSimulador: numeroNulable,
  simuladorNombre: texto,
  idEscenario: numeroNulable,
  escenarioNombre: texto,
  codAlumno: z.string(),
  codInstructor: z.string(),
  fechaPlanificada: z.string(),
  fechaEjecucion: texto,
  estado,
  notasBriefing: texto,
  notasDebrief: texto,
  autoevaluacionAlumno: texto,
  resultados: z.array(esquemaResultado).default([]),
  resumen: z
    .enum(['COMPETENTE', 'NO_COMPETENTE'])
    .nullish()
    .transform((v) => v ?? null),
})

export const clavesSesiones = {
  todo: ['sesiones-simulador'] as const,
  lista: (estadoFiltro?: EstadoSesion) => [...clavesSesiones.todo, 'lista', estadoFiltro ?? 'TODAS'] as const,
  mias: () => [...clavesSesiones.todo, 'mias'] as const,
  detalle: (id: number) => [...clavesSesiones.todo, 'detalle', id] as const,
}

export async function listarSesiones(estadoFiltro?: EstadoSesion): Promise<SesionIndex[]> {
  const filas = await sigeda.lista<unknown>('/api/sesiones-simulador', estadoFiltro ? { estado: estadoFiltro } : undefined)
  return filas.map((fila) => esquemaIndex.parse(fila))
}

export async function misSesiones(): Promise<SesionIndex[]> {
  const filas = await sigeda.lista<unknown>('/api/sesiones-simulador/mias')
  return filas.map((fila) => esquemaIndex.parse(fila))
}

export async function obtenerSesion(id: number): Promise<SesionDetalle> {
  return esquemaDetalle.parse(await sigeda.get<unknown>(`/api/sesiones-simulador/${id}`))
}

export async function planificarSesion(cuerpo: CuerpoSesion): Promise<{ sesion: { id: number } }> {
  return sigeda.post<{ sesion: { id: number } }>('/api/sesiones-simulador', cuerpo)
}

export function cambiarEstadoSesion(id: number, estadoNuevo: EstadoSesion): Promise<{ mensaje: string }> {
  return sigeda.put<{ mensaje: string }>(`/api/sesiones-simulador/${id}/estado`, { estado: estadoNuevo })
}

export function calificarSesion(id: number, cuerpo: CuerpoCalificacion): Promise<{ mensaje: string }> {
  return sigeda.post<{ mensaje: string }>(`/api/sesiones-simulador/${id}/calificacion`, cuerpo)
}

export const sesionesQuery = (estadoFiltro?: EstadoSesion) =>
  queryOptions({ queryKey: clavesSesiones.lista(estadoFiltro), queryFn: () => listarSesiones(estadoFiltro) })

export const misSesionesQuery = () => queryOptions({ queryKey: clavesSesiones.mias(), queryFn: misSesiones })

export type Muestra = { t: number; altitud: number; velocidad: number; rpmRotor: number; velocidadVertical: number }
export type EventoCabina = { t: number; tipo: 'FALLA' | 'RESPUESTA' | 'DECLARA_EMERGENCIA' | 'CHECKLIST' | 'FINAL'; detalle: string; valor?: number | null }
export type TelemetriaCabina = { muestras: Muestra[]; eventos: EventoCabina[] }
export type PropuestaIndicador = { idIndicador: number; calificacion: number; motivo: string }
export type TelemetriaVista = TelemetriaCabina & { propuesta: PropuestaIndicador[] }

const esquemaTelemetria = z.object({
  muestras: z.array(
    z.object({
      t: z.number(),
      altitud: z.number().nullish().transform((v) => v ?? 0),
      velocidad: z.number().nullish().transform((v) => v ?? 0),
      rpmRotor: z.number().nullish().transform((v) => v ?? 0),
      velocidadVertical: z.number().nullish().transform((v) => v ?? 0),
    }),
  ),
  eventos: z.array(
    z.object({
      t: z.number(),
      tipo: z.enum(['FALLA', 'RESPUESTA', 'DECLARA_EMERGENCIA', 'CHECKLIST', 'FINAL']),
      detalle: z.string(),
      valor: z.number().nullish(),
    }),
  ),
  propuesta: z.array(z.object({ idIndicador: z.number(), calificacion: z.number(), motivo: z.string() })),
})

export async function obtenerTelemetria(id: number): Promise<TelemetriaVista> {
  return esquemaTelemetria.parse(await sigeda.get<unknown>(`/api/sesiones-simulador/${id}/telemetria`))
}

export async function enviarTelemetria(id: number, datos: TelemetriaCabina): Promise<TelemetriaVista> {
  return esquemaTelemetria.parse(await sigeda.post<unknown>(`/api/sesiones-simulador/${id}/telemetria`, datos))
}

export const telemetriaQuery = (id: number) =>
  queryOptions({ queryKey: [...clavesSesiones.detalle(id), 'telemetria'] as const, queryFn: () => obtenerTelemetria(id) })

export const sesionQuery = (id: number) =>
  queryOptions({ queryKey: clavesSesiones.detalle(id), queryFn: () => obtenerSesion(id) })

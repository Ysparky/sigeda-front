import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { ia } from '@/lib/api/ia'

// La proyección vive en el backend de IA y se pide por el UUID del alumno en ese servicio, no por el
// código de SIGEDA: el backend ya mapea los dos con `User.sigedaPersonaCode`. La lista
// (`GET /prediction/students`) devuelve esos UUID junto al nombre y el resumen de riesgo, así que la
// pantalla no necesita resolver el mapeo.

export type NivelRiesgo = 'bajo' | 'medio' | 'alto'
export type Tendencia = 'up' | 'down' | 'flat'
export type Banda = 'optimo' | 'regular' | 'deficiente'

export type ResumenAlumno = {
  studentId: string
  fullName: string
  instructorName: string | null
  evaluationCount: number
  latestScore: number | null
  riskLevel: NivelRiesgo
  trendDirection: Tendencia
}

export type PuntoDeTendencia = {
  sequence: number
  label: string
  value: number | null
  kind: 'real' | 'predicted'
  evaluationName?: string | null
  phase?: string | null
  date?: string | null
  sigedaClassification?: string | null
  lowerBound?: number
  upperBound?: number
}

export type DesgloseManiobra = {
  maneuverId: number
  maneuver: string | null
  below: number
  atStandard: number
  above: number
  severe: number
}

export type Recomendacion = {
  title: string
  priority: 'alta' | 'media' | 'baja'
  description: string
}

export type UltimaEvaluacion = {
  name: string | null
  phase: string | null
  date: string | null
  sigedaClassification: string | null
}

export type ProyeccionAlumno = {
  studentId: string
  fullName: string
  instructorName: string | null
  latestScore: number | null
  latestEvaluation: UltimaEvaluacion | null
  predictedScore: number | null
  predictedBand: Banda | null
  bandThresholds: { optimo: number; regular: number }
  scale: { floor: number; ceiling: number }
  riskLevel: NivelRiesgo
  riskScore: number
  trendDirection: Tendencia
  trendSeries: PuntoDeTendencia[]
  maneuverBreakdown: DesgloseManiobra[]
  recommendations: Recomendacion[]
  evaluationCount: number
  discardedCount: number
  maneuverDetailFailures: number
  modelVersion: string
  computedAt: string
  insufficientData: boolean
}

const nivelRiesgo = z.enum(['bajo', 'medio', 'alto'])
const tendencia = z.enum(['up', 'down', 'flat'])
const banda = z.enum(['optimo', 'regular', 'deficiente'])

const resumenApi = z.object({
  studentId: z.string(),
  fullName: z.string(),
  instructorName: z.string().nullable().default(null),
  evaluationCount: z.number(),
  latestScore: z.number().nullable().default(null),
  riskLevel: nivelRiesgo,
  trendDirection: tendencia,
})

const paginaApi = z.object({
  items: z.array(resumenApi),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

const puntoApi = z.object({
  sequence: z.number(),
  label: z.string(),
  value: z.number().nullable(),
  kind: z.enum(['real', 'predicted']),
  evaluationName: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  sigedaClassification: z.string().nullable().optional(),
  lowerBound: z.number().optional(),
  upperBound: z.number().optional(),
})

const desgloseApi = z.object({
  maneuverId: z.number(),
  maneuver: z.string().nullable(),
  below: z.number(),
  atStandard: z.number(),
  above: z.number(),
  severe: z.number(),
})

const recomendacionApi = z.object({
  title: z.string(),
  priority: z.enum(['alta', 'media', 'baja']),
  description: z.string(),
})

const proyeccionApi = z.object({
  studentId: z.string(),
  fullName: z.string(),
  instructorName: z.string().nullable().default(null),
  latestScore: z.number().nullable().default(null),
  latestEvaluation: z
    .object({
      name: z.string().nullable(),
      phase: z.string().nullable(),
      date: z.string().nullable(),
      sigedaClassification: z.string().nullable(),
    })
    .nullable()
    .default(null),
  predictedScore: z.number().nullable().default(null),
  predictedBand: banda.nullable().default(null),
  bandThresholds: z.object({ optimo: z.number(), regular: z.number() }),
  scale: z.object({ floor: z.number(), ceiling: z.number() }),
  riskLevel: nivelRiesgo,
  riskScore: z.number(),
  trendDirection: tendencia,
  trendSeries: z.array(puntoApi),
  maneuverBreakdown: z.array(desgloseApi),
  recommendations: z.array(recomendacionApi),
  evaluationCount: z.number(),
  discardedCount: z.number(),
  maneuverDetailFailures: z.number(),
  modelVersion: z.string(),
  computedAt: z.string(),
  insufficientData: z.boolean().default(false),
})

const ORDEN_RIESGO: Record<NivelRiesgo, number> = { alto: 0, medio: 1, bajo: 2 }

export async function listarProyecciones(): Promise<ResumenAlumno[]> {
  const pagina = paginaApi.parse(await ia.get<unknown>('/prediction/students', { pageSize: 100 }))
  // El backend ya los ordena por riesgo; se reafirma acá para no depender del orden de la página.
  return pagina.items.slice().sort((a, b) => ORDEN_RIESGO[a.riskLevel] - ORDEN_RIESGO[b.riskLevel])
}

export async function obtenerProyeccion(studentId: string): Promise<ProyeccionAlumno> {
  return proyeccionApi.parse(await ia.get<unknown>(`/prediction/students/${encodeURIComponent(studentId)}`))
}

const claves = {
  todo: ['proyeccion'] as const,
  lista: () => [...claves.todo, 'lista'] as const,
  alumno: (studentId: string) => [...claves.todo, 'alumno', studentId] as const,
}

export const consultasProyeccion = {
  lista: () =>
    queryOptions({
      queryKey: claves.lista(),
      queryFn: () => listarProyecciones(),
      staleTime: 300_000,
    }),
  alumno: (studentId: string) =>
    queryOptions({
      queryKey: claves.alumno(studentId),
      queryFn: () => obtenerProyeccion(studentId),
      staleTime: 300_000,
    }),
}

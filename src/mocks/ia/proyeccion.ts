import { http, HttpResponse } from 'msw'
import { IA, noEncontrado } from './comun'

// Proyecciones de ejemplo para el modo mock y las pruebas. El backend las pide por el UUID del alumno
// en el módulo de IA; acá se fijan dos: uno con historial suficiente y uno sin datos para proyectar.

export const ID_PROY_GARCIA = 'a1000000-0000-4000-8000-000000000001'
export const ID_PROY_LOPEZ = 'a1000000-0000-4000-8000-000000000002'

const ESCALA = { floor: 12, ceiling: 20 }
const CORTES = { optimo: 16, regular: 14 }

const garcia = {
  studentId: ID_PROY_GARCIA,
  fullName: 'Pedro Rodriguez Garcia',
  instructorName: 'Juan Perez',
  latestScore: 17,
  latestEvaluation: {
    name: 'Evaluacion Emergencias IFR y Recuperación 1',
    phase: 'Vuelo por Instrumentos',
    date: '2024-07-05',
    sigedaClassification: 'Bueno',
  },
  predictedScore: 17.4,
  predictedBand: 'optimo' as const,
  bandThresholds: CORTES,
  scale: ESCALA,
  riskLevel: 'bajo' as const,
  riskScore: 0.18,
  trendDirection: 'up' as const,
  trendSeries: [
    { sequence: 1, label: 'E1', value: 13, kind: 'real' as const, evaluationName: 'Control Básico 1', phase: 'Adaptación', date: '2024-03-01', sigedaClassification: 'Regular' },
    { sequence: 2, label: 'E2', value: 12, kind: 'real' as const, evaluationName: 'Circuitos y Maniobras 1', phase: 'Adaptación', date: '2024-05-03', sigedaClassification: 'Malo' },
    { sequence: 3, label: 'E3', value: 16, kind: 'real' as const, evaluationName: 'Autorrotación 1', phase: 'Emergencias y Maniobras Avanzadas', date: '2024-05-24', sigedaClassification: 'Bueno' },
    { sequence: 4, label: 'E4', value: 16, kind: 'real' as const, evaluationName: 'Adaptación y Navegación 1', phase: 'Vuelo Nocturno', date: '2024-06-14', sigedaClassification: 'Bueno' },
    { sequence: 5, label: 'E5', value: 17, kind: 'real' as const, evaluationName: 'Emergencias IFR 1', phase: 'Vuelo por Instrumentos', date: '2024-07-05', sigedaClassification: 'Bueno' },
    { sequence: 6, label: 'P1', value: 17.4, kind: 'predicted' as const, lowerBound: 15.6, upperBound: 19.2 },
  ],
  maneuverBreakdown: [
    { maneuverId: 10, maneuver: 'Virajes a nivel', below: 1, atStandard: 2, above: 1, severe: 0 },
    { maneuverId: 25, maneuver: 'Entrada en autorrotación', below: 0, atStandard: 1, above: 2, severe: 0 },
    { maneuverId: 41, maneuver: 'Aproximación IFR', below: 1, atStandard: 1, above: 0, severe: 1 },
  ],
  recommendations: [
    {
      title: 'Reforzar circuitos y maniobras',
      priority: 'media' as const,
      description: 'Dos evaluaciones por debajo del estándar en la fase de adaptación; conviene una misión de refuerzo.',
    },
  ],
  evaluationCount: 5,
  discardedCount: 1,
  maneuverDetailFailures: 0,
  modelVersion: 'regresion-lineal-v1',
  computedAt: '2026-10-08T12:00:00.000Z',
  insufficientData: false,
}

const lopez = {
  studentId: ID_PROY_LOPEZ,
  fullName: 'Oscar Lopez Chaparro',
  instructorName: null,
  latestScore: null,
  latestEvaluation: null,
  predictedScore: null,
  predictedBand: null,
  bandThresholds: CORTES,
  scale: ESCALA,
  riskLevel: 'bajo' as const,
  riskScore: 0,
  trendDirection: 'flat' as const,
  trendSeries: [],
  maneuverBreakdown: [],
  recommendations: [],
  evaluationCount: 0,
  discardedCount: 0,
  maneuverDetailFailures: 0,
  modelVersion: 'regresion-lineal-v1',
  computedAt: '2026-10-08T12:00:00.000Z',
  insufficientData: true,
}

const PROYECCIONES = { [ID_PROY_GARCIA]: garcia, [ID_PROY_LOPEZ]: lopez }

function resumen(proyeccion: typeof garcia | typeof lopez) {
  return {
    studentId: proyeccion.studentId,
    fullName: proyeccion.fullName,
    instructorName: proyeccion.instructorName,
    evaluationCount: proyeccion.evaluationCount,
    latestScore: proyeccion.latestScore,
    riskLevel: proyeccion.riskLevel,
    trendDirection: proyeccion.trendDirection,
  }
}

export const handlersProyeccion = [
  http.get(`${IA}/prediction/students`, () => {
    const items = [garcia, lopez].map(resumen)
    return HttpResponse.json({ items, page: 1, pageSize: items.length, total: items.length })
  }),
  http.get(`${IA}/prediction/students/:studentId`, ({ params }) => {
    const proyeccion = PROYECCIONES[String(params.studentId)]
    if (!proyeccion) return noEncontrado('Alumno no encontrado.')
    return HttpResponse.json(proyeccion)
  }),
]

import { delay, http, HttpResponse } from 'msw'
import { IA, malaPeticion, noEncontrado, textos } from './comun'
import { buscarDocumento } from './datos'

export const ID_CUESTIONARIO = 'c0e50000-0000-4000-8000-000000000001'

export const C5_DOCUMENTOS_AJENOS = 'Uno o más documentos no existen o no te pertenecen.'
export const C7_GENERACION_FALLIDA =
  'No se pudo generar el cuestionario tras 3 intentos: Unexpected token } in JSON at position 512'
export const C8_CUESTIONARIO_NO_ENCONTRADO = 'Cuestionario no encontrado.'

const CREADO = '2026-09-19T09:15:00.000Z'

type CuerpoGeneracion = { documentIds?: unknown; questionTypes?: unknown; questionCount?: unknown }

function preguntas() {
  return [
    {
      id: '9e500000-0000-4000-8000-000000000001',
      quizId: ID_CUESTIONARIO,
      type: 'multiple_choice',
      position: 0,
      prompt: '¿Qué permite la autorrotación?',
      options: [
        { id: 'a', text: 'Un descenso controlado sin potencia del motor' },
        { id: 'b', text: 'Aumentar la velocidad de ascenso' },
        { id: 'c', text: 'Mantener el vuelo estacionario indefinidamente' },
        { id: 'd', text: 'Reducir el consumo de combustible en crucero' },
      ],
      correctAnswer: 'a',
      explanation: 'El rotor gira por el flujo de aire ascendente.',
      sourceDocumentId: null,
      sourceExcerpt: 'La autorrotación es la condición de vuelo en la que el rotor gira por el flujo de aire ascendente.',
      createdAt: CREADO,
    },
    {
      id: '9e500000-0000-4000-8000-000000000002',
      quizId: ID_CUESTIONARIO,
      type: 'true_false',
      position: 1,
      prompt: 'La última misión de cada subfase es un chequeo.',
      options: null,
      correctAnswer: 'true',
      explanation: 'El PDI EA-510 exige un chequeo al cerrar cada subfase.',
      sourceDocumentId: null,
      sourceExcerpt: null,
      createdAt: CREADO,
    },
    {
      id: '9e500000-0000-4000-8000-000000000003',
      quizId: ID_CUESTIONARIO,
      type: 'fill_blank',
      position: 2,
      prompt: 'La maniobra que permite descender sin potencia se llama _____.',
      options: null,
      correctAnswer: 'autorrotación',
      explanation: 'Es la autorrotación.',
      sourceDocumentId: null,
      sourceExcerpt: 'La autorrotación permite un descenso controlado.',
      createdAt: CREADO,
    },
  ]
}

function cuestionario(requestedCount: number, questionTypes: string[]) {
  return {
    id: ID_CUESTIONARIO,
    ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
    title: 'Cuestionario sin título',
    questionTypes,
    requestedCount,
    modelName: 'claude-opus-5',
    generationPromptVersion: 'v1',
    createdAt: CREADO,
    questions: preguntas(),
  }
}

export function revisarDocumentos(ids: readonly string[]): Response | null {
  const documentos = ids.map((id) => buscarDocumento(id))
  if (documentos.some((documento) => documento === undefined)) return noEncontrado(C5_DOCUMENTOS_AJENOS)
  const noListos = documentos.filter((documento) => documento?.status !== 'ready')
  if (noListos.length > 0) {
    return malaPeticion(
      `Los siguientes documentos aún no están listos: ${noListos.map((documento) => documento?.filename).join(', ')}`,
    )
  }
  return null
}

export const handlersCuestionarios = [
  http.post(`${IA}/quizzes/generate`, async ({ request }) => {
    const cuerpo = (await request.json()) as CuerpoGeneracion
    const ids = textos(cuerpo.documentIds)
    const tipos = textos(cuerpo.questionTypes)
    const cantidad = Number(cuerpo.questionCount)
    const problema = revisarDocumentos(ids)
    if (problema) return problema
    if (cantidad === 7) return malaPeticion(C7_GENERACION_FALLIDA)
    if (cantidad === 13) {
      await delay('infinite')
      return
    }
    if (cantidad === 20) await delay(3000)
    return HttpResponse.json(cuestionario(cantidad, tipos), { status: 201 })
  }),
  http.get(`${IA}/quizzes/:id`, ({ params }) => {
    if (String(params.id) !== ID_CUESTIONARIO) return noEncontrado(C8_CUESTIONARIO_NO_ENCONTRADO)
    return HttpResponse.json(cuestionario(3, ['multiple_choice', 'true_false', 'fill_blank']))
  }),
]

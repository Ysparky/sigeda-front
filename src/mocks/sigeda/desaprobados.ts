import { http, HttpResponse } from 'msw'
import { criterioDeFase, ramasDeCriterio } from '@/lib/dominio/seguimiento'
import { API, autorizar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, type EvaluacionMock } from './datos'

export const D3_SIN_DESAPROBADOS = 'No existen desaprobados disponibles.'
export const D4_DESAPROBADO_NO_EXISTE = 'Desaprobado especificada no existe.'
export const D5_DESAPROBADO_ELIMINADO = 'Desaprobado eliminado con éxito.'

export type DesaprobadoMock = {
  codigo: string
  clasificacion: string
  subfase: string
  fecha: string
  programa: string
  idSubfase: number
  codPersona: string
}

export type ChequeoDerivado = {
  codigo: string
  fecha: string
  tipo: 'OPERACIONES' | 'COMANDO' | 'SUBFASE'
  resultado: 'Aprobado' | 'Desaprobado'
  contadores: { chequeo: number; evaluaciones: number; malos: number; regulares: number }
  codEvaluacion: string
  idSubfase: number
  subfase: string
  codPersona: string
}

type EstadoReplay = { estado: string; chequeo: number; malos: number; regulares: number }

export function esRegularAlternado(regulares: number): boolean {
  return regulares === 0 || regulares % 2 === 0
}

export function criterioCumplido(criterio: 1 | 2, malos: number, regulares: number): boolean {
  if (criterio === 2) return malos === 2 || (malos === 1 && regulares === 2) || regulares === 4
  return malos === 3 || (malos === 2 && regulares === 2) || (malos === 1 && regulares === 4) || regulares === 6
}

export function ramaCumplida(criterio: 1 | 2, malos: number, regulares: number): string | null {
  const ramas = ramasDeCriterio(criterio)
  if (criterio === 2) {
    if (malos === 2) return ramas[0]
    if (malos === 1 && regulares === 2) return ramas[1]
    if (regulares === 4) return ramas[2]
    return null
  }
  if (malos === 3) return ramas[0]
  if (malos === 2 && regulares === 2) return ramas[1]
  if (malos === 1 && regulares === 4) return ramas[2]
  if (regulares === 6) return ramas[3]
  return null
}

function fila(evaluacion: EvaluacionMock): DesaprobadoMock {
  return {
    codigo: evaluacion.codigo,
    clasificacion: evaluacion.clasificacion ?? '',
    subfase: evaluacion.subFase,
    fecha: evaluacion.fecha,
    programa: evaluacion.programa,
    idSubfase: evaluacion.idSubFase,
    codPersona: evaluacion.codPersona,
  }
}

export function replayDeResultados(): { desaprobados: DesaprobadoMock[]; chequeos: ChequeoDerivado[] } {
  const porAlumno = new Map<string, EstadoReplay>()
  const desaprobados: DesaprobadoMock[] = []
  const chequeos: ChequeoDerivado[] = []
  const ordenadas = [...datos().evaluaciones].sort(
    (izquierda, derecha) =>
      izquierda.fecha.localeCompare(derecha.fecha) || izquierda.codigo.localeCompare(derecha.codigo),
  )
  for (const evaluacion of ordenadas) {
    const actual = porAlumno.get(evaluacion.codPersona) ?? { estado: 'Apto', chequeo: 0, malos: 0, regulares: 0 }
    porAlumno.set(evaluacion.codPersona, actual)
    if (evaluacion.categoria === 'Ponderada' && actual.estado === 'Apto') {
      if (evaluacion.clasificacion === 'Malo') {
        actual.malos += 1
        desaprobados.push(fila(evaluacion))
      } else if (evaluacion.clasificacion === 'Regular' && esRegularAlternado(actual.regulares)) {
        actual.regulares += 1
        desaprobados.push(fila(evaluacion))
      }
      if (criterioCumplido(criterioDeFase(evaluacion.fase), actual.malos, actual.regulares)) actual.estado = 'En Chequeo'
    }
    if (evaluacion.categoria === 'Chequeo') actual.chequeo += 1
    if (evaluacion.categoria === 'Chequeo Sub Fase') {
      chequeos.push({
        codigo: evaluacion.codigo,
        fecha: evaluacion.fecha,
        tipo: 'SUBFASE',
        resultado: 'Aprobado',
        contadores: {
          chequeo: actual.chequeo,
          evaluaciones: buscarPersona(evaluacion.codPersona)?.contEval ?? 0,
          malos: actual.malos,
          regulares: actual.regulares,
        },
        codEvaluacion: evaluacion.codigo,
        idSubfase: evaluacion.idSubFase,
        subfase: evaluacion.subFase,
        codPersona: evaluacion.codPersona,
      })
      actual.estado = 'Apto'
      actual.chequeo = 0
      actual.malos = 0
      actual.regulares = 0
    }
  }
  return { desaprobados, chequeos }
}

function publico(desaprobado: DesaprobadoMock) {
  const { codigo, clasificacion, subfase, fecha, programa, idSubfase } = desaprobado
  return { codigo, clasificacion, subfase, fecha, programa, idSubfase }
}

function deLaPersona(codPersona: string): DesaprobadoMock[] {
  return replayDeResultados().desaprobados.filter((desaprobado) => desaprobado.codPersona === codPersona)
}

export const handlersDesaprobados = [
  http.get(`${API}/api/desaprobados/persona/:codPersona`, ({ request, params }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    const filas = deLaPersona(String(params.codPersona))
    if (filas.length === 0) return textoNoEncontrado(D3_SIN_DESAPROBADOS)
    return HttpResponse.json(filas.map(publico))
  }),
  http.get(`${API}/api/desaprobados/regular/alumno/:cod/subfase/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    const fila = deLaPersona(String(params.cod))
      .filter((candidato) => candidato.idSubfase === Number(params.id) && candidato.clasificacion === 'Regular')
      .at(-1)
    return fila ? HttpResponse.json(publico(fila)) : textoNoEncontrado(D4_DESAPROBADO_NO_EXISTE)
  }),
  http.get(`${API}/api/desaprobados/alumno/:cod/subfase/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    const fila = deLaPersona(String(params.cod))
      .filter((candidato) => candidato.idSubfase === Number(params.id))
      .at(-1)
    return fila ? HttpResponse.json(publico(fila)) : textoNoEncontrado(D4_DESAPROBADO_NO_EXISTE)
  }),
  http.get(`${API}/api/desaprobados/exist/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json(
      replayDeResultados().desaprobados.some((desaprobado) => desaprobado.codigo === String(params.cod)),
    )
  }),
]

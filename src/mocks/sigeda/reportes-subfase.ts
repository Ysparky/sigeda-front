import { http, HttpResponse } from 'msw'
import { API, autorizar, textoNoEncontrado } from './comun'
import { buscarPersona, buscarSubfase, datos, maniobrasDeSubfase, nombreCompleto, type EvaluacionMock } from './datos'

export const D6_REPORTE_SIN_EVALUACIONES = 'evaluaciones especificada no existe.'

const CATEGORIAS_PONDERADAS = new Set(['Ponderada', 'Chequeo Sub Fase'])

function deLaSubfase(idSubfase: number, codPersona: string): EvaluacionMock[] {
  return datos().evaluaciones.filter(
    (evaluacion) => evaluacion.codPersona === codPersona && evaluacion.idSubFase === idSubfase,
  )
}

export const handlersReportesSubfase = [
  http.get(`${API}/api/evaluaciones/promedio/subfase/:id/persona/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json(
      deLaSubfase(Number(params.id), String(params.cod))
        .filter((evaluacion) => CATEGORIAS_PONDERADAS.has(evaluacion.categoria))
        .map((evaluacion) => ({ codigo: evaluacion.codigo, promedio: evaluacion.promedio })),
    )
  }),
  http.get(`${API}/api/evaluaciones/subfase/:id/persona/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const idSubfase = Number(params.id)
    const evaluaciones = deLaSubfase(idSubfase, String(params.cod))
    const persona = buscarPersona(String(params.cod))
    if (evaluaciones.length === 0 || !persona) return textoNoEncontrado(D6_REPORTE_SIN_EVALUACIONES)
    return HttpResponse.json({
      cabecera: {
        fase: evaluaciones[0].fase,
        subFase: buscarSubfase(idSubfase)?.nombre ?? '',
        programa: evaluaciones[0].programa,
        alumno: nombreCompleto(persona),
      },
      maniobras: maniobrasDeSubfase(idSubfase).map((maniobra) => ({ id: maniobra.id, nombre: maniobra.nombre })),
      notas: evaluaciones.map((evaluacion) => ({
        codigo: evaluacion.codigo,
        categoria: evaluacion.categoria,
        clasificacion: evaluacion.clasificacion,
        promedio: evaluacion.promedio,
        recomendacion: evaluacion.recomendacion,
        calificaciones: evaluacion.calificaciones.map((calificacion) => ({
          notaMin: calificacion.notaMin,
          nota: calificacion.nota,
        })),
      })),
    })
  }),
]

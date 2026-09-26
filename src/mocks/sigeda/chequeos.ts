import { http, HttpResponse } from 'msw'
import { API, autorizar, textoNoEncontrado } from './comun'
import { D2_PERSONA_NO_EXISTE } from './alumnos'
import { buscarPersona } from './datos'
import { replayDeResultados } from './desaprobados'

export const D13_SIN_CHEQUEOS = 'No existen chequeos disponibles.'

export const handlersChequeos = [
  http.get(`${API}/api/personas/:cod/chequeos`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    if (!buscarPersona(cod)) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    const filas = replayDeResultados()
      .chequeos.filter((chequeo) => chequeo.codPersona === cod)
      .toSorted((izquierda, derecha) => izquierda.fecha.localeCompare(derecha.fecha))
    if (filas.length === 0) return textoNoEncontrado(D13_SIN_CHEQUEOS)
    return HttpResponse.json(
      filas.map((fila) => ({
        codigo: fila.codigo,
        fecha: fila.fecha,
        tipo: fila.tipo,
        resultado: fila.resultado,
        contadores: fila.contadores,
        codEvaluacion: fila.codEvaluacion,
        idSubfase: fila.idSubfase,
        subfase: fila.subfase,
      })),
    )
  }),
]

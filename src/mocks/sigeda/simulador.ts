import { http, HttpResponse } from 'msw'
import { API, autorizar, conflicto } from './comun'
import { datos } from './datos'

/**
 * Mock del flujo de simulador. SIGEDA real corre contra el backend; estos handlers existen para que
 * las pruebas y el modo mock no queden sin respuesta. Dan defaults seguros (parámetros vacíos,
 * propuesta vacía) que cada prueba que afirma comportamiento concreto sobrescribe con server.use; lo
 * único con estado real es el 409 de ingesta sobre un turno que no es de simulador.
 */
export const handlersSimulador = [
  http.get(`${API}/api/maniobras/:id/parametros`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json([])
  }),
  http.put(`${API}/api/maniobras/:id/parametros`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Standards')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json({ mensaje: 'Tolerancias guardadas.' })
  }),
  http.post(`${API}/api/turnos/:id/sesiones-simulador`, ({ request, params }) => {
    const permitido = autorizar(request, 'Write')
    if (permitido instanceof Response) return permitido
    const turno = datos().turnos.find((candidato) => candidato.id === Number(params.id))
    if (turno && turno.medio !== 'SIMULADOR') return conflicto('El turno no es de simulador.')
    return HttpResponse.json({ mensaje: 'Sesión de simulador ingerida.', id: 1 }, { status: 201 })
  }),
  http.get(`${API}/api/turnos/:id/persona/:cod/propuesta-simulador`, ({ request }) => {
    const permitido = autorizar(request, 'Write')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json({ calificaciones: [] })
  }),
]

import { http, HttpResponse } from 'msw'
import { usuarioAutenticado } from './auth'
import { API, errorResponse } from './comun'

type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA'

type FilaRoster = {
  codAlumno: string
  nombres: string
  aPaterno: string
  aMaterno: string
  estado: EstadoAsistencia | null
}

const ROSTER_INICIAL: FilaRoster[] = [
  { codAlumno: 'A00001', nombres: 'Ana', aPaterno: 'Alfa', aMaterno: 'Uno', estado: 'PRESENTE' },
  { codAlumno: 'A00002', nombres: 'Beto', aPaterno: 'Beta', aMaterno: 'Dos', estado: null },
  { codAlumno: 'A00003', nombres: 'Cora', aPaterno: 'Gama', aMaterno: 'Tres', estado: null },
]

let roster: FilaRoster[] = ROSTER_INICIAL.map((fila) => ({ ...fila }))

const REPORTE = [
  { codAlumno: 'R00001', nombre: 'Riesgo Uno, Rita', sesiones: 10, faltas: 4, porcentajeInasistencia: 40, condicion: 'EN_RIESGO' },
  { codAlumno: 'R00002', nombre: 'Regular Dos, Rodo', sesiones: 10, faltas: 2, porcentajeInasistencia: 20, condicion: 'REGULAR' },
  { codAlumno: 'R00003', nombre: 'Nuevo Tres, Rene', sesiones: 0, faltas: 0, porcentajeInasistencia: 0, condicion: 'REGULAR' },
]

export function reiniciarAsistencias() {
  roster = ROSTER_INICIAL.map((fila) => ({ ...fila }))
}

export const handlersAsistencias = [
  http.get(`${API}/api/turnos/:id/asistencia`, ({ request }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    return HttpResponse.json(roster)
  }),

  http.put(`${API}/api/turnos/:id/asistencia`, async ({ request }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const marcas = (await request.json()) as Array<{ codAlumno: string; estado: EstadoAsistencia }>
    for (const marca of marcas) {
      const fila = roster.find((f) => f.codAlumno === marca.codAlumno)
      if (fila) fila.estado = marca.estado
    }
    return HttpResponse.json({ mensaje: 'Asistencia registrada con éxito.' })
  }),

  http.get(`${API}/api/asistencia/reporte`, ({ request }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    return HttpResponse.json(REPORTE)
  }),
]

import { http, HttpResponse } from 'msw'
import { API, textoNoEncontrado } from './comun'

type CursoMock = {
  id: number
  nombre: string
  descripcion: string
  duracion: number
  requisitos: string
  activo: boolean
}

type HorarioMock = { id: number; idCurso: number; nombre: string; detalle: string; activo: boolean }

const CURSOS: CursoMock[] = [
  {
    id: 1,
    nombre: 'Piloto de Helicóptero',
    descripcion: 'Instrucción de vuelo en helicóptero bajo el programa PDI EA-510: cinco fases.',
    duracion: 220,
    requisitos: 'Ser mayor de edad, estudios secundarios completos y certificado médico aeronáutico vigente.',
    activo: true,
  },
]

const HORARIOS: HorarioMock[] = [
  { id: 1, idCurso: 1, nombre: 'Turno mañana', detalle: 'Lunes, miércoles y viernes de 08:00 a 12:00', activo: true },
  { id: 2, idCurso: 1, nombre: 'Turno tarde', detalle: 'Martes y jueves de 14:00 a 18:00', activo: true },
]

function sinActivo(curso: CursoMock) {
  const { activo: _activo, ...resto } = curso
  return resto
}

export const handlersInscripcion = [
  http.get(`${API}/api/public/cursos`, () => {
    const activos = CURSOS.filter((curso) => curso.activo).map(sinActivo)
    if (activos.length === 0) return textoNoEncontrado('No existen cursos disponibles.')
    return HttpResponse.json(activos)
  }),

  http.get(`${API}/api/public/cursos/:id`, ({ params }) => {
    const curso = CURSOS.find((c) => String(c.id) === params.id && c.activo)
    if (!curso) return textoNoEncontrado('Curso especificada no existe.')
    const horarios = HORARIOS.filter((h) => h.idCurso === curso.id && h.activo).map(({ id, nombre, detalle }) => ({
      id,
      nombre,
      detalle,
    }))
    return HttpResponse.json({ ...sinActivo(curso), horarios })
  }),
]

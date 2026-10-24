import { http, HttpResponse } from 'msw'
import { API, errorResponse, textoNoEncontrado } from './comun'
import { usuarioAutenticado } from './auth'

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

type MatriculaMock = {
  id: number
  idCurso: number | null
  dni: string
  nombres: string
  aPaterno: string
  aMaterno: string
  correo: string
  contacto: string | null
  idHorario: number | null
  fecha: string
  estado: 'PENDIENTE' | 'VALIDADA' | 'RECHAZADA'
  comprobanteTipo: string
  motivoRechazo: string | null
  codPersona: string | null
}

let secuenciaMatricula = 100
const matriculasMock: MatriculaMock[] = []

export function reiniciarInscripcion() {
  matriculasMock.length = 0
  secuenciaMatricula = 100
}

/** Siembra una matrícula vinculada a una cuenta, para las pruebas de "mi matrícula". */
export function sembrarMatriculaMock(matricula: Partial<MatriculaMock> & { codPersona: string }) {
  const fila: MatriculaMock = {
    id: (secuenciaMatricula += 1),
    idCurso: 1,
    dni: '71111111',
    nombres: 'Rosa',
    aPaterno: 'Quispe',
    aMaterno: 'Huaman',
    correo: 'rosa@correo.com',
    contacto: '999111222',
    idHorario: 1,
    fecha: '2026-10-20',
    estado: 'PENDIENTE',
    comprobanteTipo: 'application/pdf',
    motivoRechazo: null,
    ...matricula,
  }
  matriculasMock.push(fila)
  return fila
}

export const handlersInscripcion = [
  http.post(`${API}/api/public/matriculas`, async ({ request }) => {
    const formulario = await request.formData()
    const comprobante = formulario.get('comprobante')
    if (!(comprobante instanceof File) || comprobante.size === 0)
      return HttpResponse.text('El comprobante de pago es obligatorio.', { status: 400 })
    const datos = JSON.parse(await (formulario.get('datos') as Blob).text())
    if (matriculasMock.some((m) => m.dni === datos.dni && m.idCurso === datos.idCurso && m.estado !== 'RECHAZADA'))
      return HttpResponse.text('Ya existe una matrícula para este DNI en el curso.', { status: 409 })
    const fila = sembrarMatriculaMock({ ...datos, codPersona: `P${secuenciaMatricula + 1}` })
    return HttpResponse.json({ mensaje: 'Matrícula registrada con éxito.', matriculaId: fila.id }, { status: 201 })
  }),

  http.get(`${API}/api/matriculas/mia`, ({ request }) => {
    const usuario = usuarioAutenticado(request)
    if (!usuario) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => m.codPersona === usuario.codPersona)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    return HttpResponse.json(fila)
  }),

  http.put(`${API}/api/matriculas/mia`, async ({ request }) => {
    const usuario = usuarioAutenticado(request)
    if (!usuario) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => m.codPersona === usuario.codPersona)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado === 'VALIDADA')
      return HttpResponse.text('Una matrícula validada no se puede modificar.', { status: 409 })
    fila.estado = 'PENDIENTE'
    fila.motivoRechazo = null
    return HttpResponse.json({ mensaje: 'Comprobante reenviado; tu matrícula volvió a estar pendiente.' })
  }),

  http.get(`${API}/api/matriculas`, ({ request }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const estado = new URL(request.url).searchParams.get('estado')
    const filas = matriculasMock
      .filter((m) => !estado || m.estado === estado)
      .map(({ id, idCurso, dni, nombres, aPaterno, aMaterno, correo, fecha, estado: e }) => ({
        id,
        idCurso,
        dni,
        nombres,
        aPaterno,
        aMaterno,
        correo,
        fecha,
        estado: e,
      }))
    return HttpResponse.json(filas)
  }),

  http.get(`${API}/api/matriculas/:id/comprobante`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return new HttpResponse(null, { status: 404 })
    return HttpResponse.arrayBuffer(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer, {
      headers: { 'Content-Type': fila.comprobanteTipo },
    })
  }),

  http.get(`${API}/api/matriculas/:id`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    return HttpResponse.json(fila)
  }),

  http.put(`${API}/api/matriculas/:id/validar`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado !== 'PENDIENTE') return HttpResponse.text('La matrícula ya fue procesada.', { status: 409 })
    fila.estado = 'VALIDADA'
    fila.motivoRechazo = null
    return HttpResponse.json({ mensaje: 'Matrícula validada con éxito.' })
  }),

  http.put(`${API}/api/matriculas/:id/rechazar`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado !== 'PENDIENTE') return HttpResponse.text('La matrícula ya fue procesada.', { status: 409 })
    const { motivo } = (await request.json()) as { motivo?: string }
    fila.estado = 'RECHAZADA'
    fila.motivoRechazo = motivo ?? null
    return HttpResponse.json({ mensaje: 'Matrícula rechazada.' })
  }),

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

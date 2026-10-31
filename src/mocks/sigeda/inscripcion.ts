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

type EstadoConvocatoriaMock = 'BORRADOR' | 'PUBLICADA' | 'CERRADA' | 'FINALIZADA'

type ConvocatoriaMock = {
  id: number
  idCurso: number | null
  nombre: string
  descripcion: string | null
  fechaInicio: string
  fechaFin: string
  vacantes: number
  documentosRequeridos: string | null
  estado: EstadoConvocatoriaMock
}

const CONVOCATORIA_SEMILLA: ConvocatoriaMock[] = [
  {
    id: 1,
    idCurso: 1,
    nombre: 'Admisión 2026-I',
    descripcion: 'Proceso de admisión al programa PDI EA-510.',
    fechaInicio: '2026-01-08',
    fechaFin: '2026-12-31',
    vacantes: 20,
    documentosRequeridos: 'DNI vigente, certificado médico aeronáutico y comprobante de pago.',
    estado: 'PUBLICADA',
  },
]

let convocatoriasMock: ConvocatoriaMock[] = CONVOCATORIA_SEMILLA.map((c) => ({ ...c }))
let secuenciaConvocatoria = 50

type EstadoMatriculaMock = 'PENDIENTE' | 'OBSERVADA' | 'VALIDADA' | 'RECHAZADA' | 'NO_ADMITIDO'

type MatriculaMock = {
  id: number
  idCurso: number | null
  idConvocatoria: number | null
  dni: string
  nombres: string
  aPaterno: string
  aMaterno: string
  correo: string
  contacto: string | null
  idHorario: number | null
  fecha: string
  estado: EstadoMatriculaMock
  comprobanteTipo: string
  motivoRechazo: string | null
  observaciones: string | null
  resultado: 'ADMITIDO' | 'NO_ADMITIDO' | null
  codPersona: string | null
}

const VIVAS: EstadoMatriculaMock[] = ['PENDIENTE', 'OBSERVADA', 'VALIDADA']

let secuenciaMatricula = 100
const matriculasMock: MatriculaMock[] = []

export function reiniciarInscripcion() {
  matriculasMock.length = 0
  secuenciaMatricula = 100
  convocatoriasMock = CONVOCATORIA_SEMILLA.map((c) => ({ ...c }))
  secuenciaConvocatoria = 50
}

/** Siembra una convocatoria para las pruebas de admisión. */
export function sembrarConvocatoriaMock(convocatoria: Partial<ConvocatoriaMock> = {}) {
  const fila: ConvocatoriaMock = {
    id: (secuenciaConvocatoria += 1),
    idCurso: 1,
    nombre: 'Convocatoria de prueba',
    descripcion: null,
    fechaInicio: '2026-01-08',
    fechaFin: '2026-12-31',
    vacantes: 20,
    documentosRequeridos: null,
    estado: 'PUBLICADA',
    ...convocatoria,
  }
  convocatoriasMock.push(fila)
  return fila
}

/** Siembra una matrícula vinculada a una cuenta, para las pruebas de "mi matrícula". */
export function sembrarMatriculaMock(matricula: Partial<MatriculaMock> & { codPersona: string }) {
  const fila: MatriculaMock = {
    id: (secuenciaMatricula += 1),
    idCurso: 1,
    idConvocatoria: 1,
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
    observaciones: null,
    resultado: null,
    ...matricula,
  }
  matriculasMock.push(fila)
  return fila
}

function convocatoriaPublica(c: ConvocatoriaMock) {
  const { estado: _estado, ...resto } = c
  return resto
}

export const handlersInscripcion = [
  http.post(`${API}/api/public/matriculas`, async ({ request }) => {
    const formulario = await request.formData()
    const comprobante = formulario.get('comprobante')
    if (!(comprobante instanceof File) || comprobante.size === 0)
      return HttpResponse.text('El comprobante de pago es obligatorio.', { status: 400 })
    const datos = JSON.parse(await (formulario.get('datos') as Blob).text())
    const convocatoria = convocatoriasMock.find((c) => c.id === datos.idConvocatoria)
    if (!convocatoria || convocatoria.estado !== 'PUBLICADA')
      return HttpResponse.text('La convocatoria no está abierta.', { status: 409 })
    if (matriculasMock.some((m) => m.dni === datos.dni && m.idConvocatoria === datos.idConvocatoria && VIVAS.includes(m.estado)))
      return HttpResponse.text('Ya existe una postulación para este DNI en la convocatoria.', { status: 409 })
    const fila = sembrarMatriculaMock({
      ...datos,
      idCurso: convocatoria.idCurso,
      codPersona: `P${secuenciaMatricula + 1}`,
    })
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
    if (fila.estado === 'VALIDADA' || fila.estado === 'NO_ADMITIDO')
      return HttpResponse.text('Esta postulación ya no se puede modificar.', { status: 409 })
    fila.estado = 'PENDIENTE'
    fila.motivoRechazo = null
    fila.observaciones = null
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
    if (fila.estado !== 'PENDIENTE' && fila.estado !== 'OBSERVADA')
      return HttpResponse.text('La matrícula ya fue procesada.', { status: 409 })
    fila.estado = 'VALIDADA'
    fila.motivoRechazo = null
    fila.observaciones = null
    return HttpResponse.json({ mensaje: 'Documentación validada con éxito.' })
  }),

  http.put(`${API}/api/matriculas/:id/observar`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado !== 'PENDIENTE')
      return HttpResponse.text('Solo una matrícula en revisión se puede observar.', { status: 409 })
    const { observaciones } = (await request.json()) as { observaciones?: string }
    fila.estado = 'OBSERVADA'
    fila.observaciones = observaciones ?? null
    return HttpResponse.json({ mensaje: 'Postulación observada.' })
  }),

  http.post(`${API}/api/matriculas/:id/resultado`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado !== 'VALIDADA')
      return HttpResponse.text('Solo una postulación validada puede recibir resultado.', { status: 409 })
    const { resultado, observaciones } = (await request.json()) as {
      resultado?: 'ADMITIDO' | 'NO_ADMITIDO'
      observaciones?: string
    }
    if (resultado === 'ADMITIDO') {
      const convocatoria = convocatoriasMock.find((c) => c.id === fila.idConvocatoria)
      const admitidos = matriculasMock.filter((m) => m.idConvocatoria === fila.idConvocatoria && m.resultado === 'ADMITIDO').length
      if (convocatoria && admitidos >= convocatoria.vacantes)
        return HttpResponse.text('No quedan vacantes en la convocatoria.', { status: 409 })
      fila.resultado = 'ADMITIDO'
      fila.observaciones = observaciones ?? null
      return HttpResponse.json({ mensaje: 'Postulante admitido; ahora es alumno.' })
    }
    fila.resultado = 'NO_ADMITIDO'
    fila.estado = 'NO_ADMITIDO'
    fila.observaciones = observaciones ?? null
    return HttpResponse.json({ mensaje: 'Resultado registrado: no admitido.' })
  }),

  http.put(`${API}/api/matriculas/:id/rechazar`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado !== 'PENDIENTE' && fila.estado !== 'OBSERVADA')
      return HttpResponse.text('La matrícula ya fue procesada.', { status: 409 })
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

  http.get(`${API}/api/public/convocatorias`, () => {
    return HttpResponse.json(convocatoriasMock.filter((c) => c.estado === 'PUBLICADA').map(convocatoriaPublica))
  }),

  http.get(`${API}/api/public/convocatorias/:id`, ({ params }) => {
    const fila = convocatoriasMock.find((c) => String(c.id) === params.id && c.estado === 'PUBLICADA')
    if (!fila) return textoNoEncontrado('Convocatoria especificada no existe.')
    return HttpResponse.json(convocatoriaPublica(fila))
  }),

  http.get(`${API}/api/convocatorias`, ({ request }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    return HttpResponse.json(convocatoriasMock)
  }),

  http.post(`${API}/api/convocatorias`, async ({ request }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const cuerpo = (await request.json()) as Partial<ConvocatoriaMock>
    const fila = sembrarConvocatoriaMock({ ...cuerpo, estado: 'BORRADOR' })
    return HttpResponse.json(fila, { status: 201 })
  }),

  http.get(`${API}/api/convocatorias/:id`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = convocatoriasMock.find((c) => String(c.id) === params.id)
    if (!fila) return textoNoEncontrado('Convocatoria especificada no existe.')
    return HttpResponse.json(fila)
  }),

  http.put(`${API}/api/convocatorias/:id`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = convocatoriasMock.find((c) => String(c.id) === params.id)
    if (!fila) return textoNoEncontrado('Convocatoria especificada no existe.')
    const cuerpo = (await request.json()) as Partial<ConvocatoriaMock>
    Object.assign(fila, cuerpo)
    return HttpResponse.json(fila)
  }),

  http.put(`${API}/api/convocatorias/:id/estado`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = convocatoriasMock.find((c) => String(c.id) === params.id)
    if (!fila) return textoNoEncontrado('Convocatoria especificada no existe.')
    const { estado } = (await request.json()) as { estado: EstadoConvocatoriaMock }
    fila.estado = estado
    return HttpResponse.json(fila)
  }),
]

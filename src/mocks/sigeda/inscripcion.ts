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
  estado: EstadoConvocatoriaMock
  idGrupo?: number | null
  grupoNombre?: string | null
  grupoEstado?: string | null
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
    estado: 'PUBLICADA',
    idGrupo: 7,
    grupoNombre: 'Promoción 2026-I',
    grupoEstado: 'EN_INSCRIPCION',
  },
]

let convocatoriasMock: ConvocatoriaMock[] = CONVOCATORIA_SEMILLA.map((c) => ({ ...c }))
let secuenciaConvocatoria = 50

type EstadoMatriculaMock = 'PENDIENTE' | 'OBSERVADA' | 'VALIDADA' | 'CITADA' | 'ADMITIDA' | 'NO_ADMITIDO' | 'RECHAZADA'
type EstadoDocumentoMock = 'PENDIENTE' | 'OBSERVADO' | 'ACEPTADO'
type Aptitud = 'APTO' | 'NO_APTO'

/** La lista fija del backend (TipoDocumentoPostulacion), en el mismo orden. */
const DOCUMENTOS = [
  { tipo: 'DOCUMENTO_IDENTIDAD', nombre: 'Documento de identidad', obligatorio: true, momento: 'POSTULACION', soloImagen: false },
  { tipo: 'CERTIFICADO_SECUNDARIA', nombre: 'Certificado de estudios secundarios', obligatorio: true, momento: 'POSTULACION', soloImagen: false },
  { tipo: 'FOTOGRAFIA', nombre: 'Fotografía', obligatorio: true, momento: 'POSTULACION', soloImagen: true },
  { tipo: 'ANTECEDENTES_POLICIALES', nombre: 'Certificado de antecedentes policiales', obligatorio: true, momento: 'POSTULACION', soloImagen: false },
  { tipo: 'DECLARACION_JURADA', nombre: 'Declaración jurada firmada', obligatorio: true, momento: 'POSTULACION', soloImagen: false },
  { tipo: 'ESTUDIOS_SUPERIORES', nombre: 'Constancia de estudios superiores', obligatorio: false, momento: 'POSTULACION', soloImagen: false },
  { tipo: 'CERTIFICADO_MEDICO', nombre: 'Certificado médico aeronáutico clase 2', obligatorio: true, momento: 'ANTES_DEL_RESULTADO', soloImagen: false },
] as const

type TipoDocumentoMock = (typeof DOCUMENTOS)[number]['tipo']

type MatriculaMock = {
  id: number
  idCurso: number | null
  idConvocatoria: number | null
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  aPaterno: string
  aMaterno: string
  fechaNacimiento: string
  sexo: string
  nacionalidad: string
  direccion: string
  correo: string
  contacto: string
  fecha: string
  estado: EstadoMatriculaMock
  codigo: string
  motivoRechazo: string | null
  observaciones: string | null
  codPersona: string | null
  cuentaActiva: boolean
  documentos: Partial<Record<TipoDocumentoMock, { estado: EstadoDocumentoMock; observacion: string | null; tipoArchivo: string }>>
  citacion: { fecha: string; hora: string; lugar: string } | null
  evaluacion: {
    resultado: 'ADMITIDO' | 'NO_ADMITIDO'
    notaConocimientos: number
    entrevista: Aptitud
    evaluacionPsicologica: Aptitud
    observaciones: string | null
  } | null
  pago: { fecha: string; monto: number; medio: string; numeroOperacion: string } | null
}

const VIVAS: EstadoMatriculaMock[] = ['PENDIENTE', 'OBSERVADA', 'VALIDADA', 'CITADA', 'ADMITIDA']
const RECIBE_DOCUMENTOS: EstadoMatriculaMock[] = ['PENDIENTE', 'OBSERVADA', 'VALIDADA', 'CITADA']
const NOTA_MINIMA = 14

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
    estado: 'PUBLICADA',
    ...convocatoria,
  }
  convocatoriasMock.push(fila)
  return fila
}

/** Siembra una postulación para las pruebas. Por defecto: PENDIENTE con los cinco obligatorios cargados. */
export function sembrarMatriculaMock(matricula: Partial<MatriculaMock> = {}) {
  const fila: MatriculaMock = {
    id: (secuenciaMatricula += 1),
    idCurso: 1,
    idConvocatoria: 1,
    tipoDocumento: 'DNI',
    numeroDocumento: '71111111',
    nombres: 'Rosa',
    aPaterno: 'Quispe',
    aMaterno: 'Huaman',
    fechaNacimiento: '2000-05-10',
    sexo: 'FEMENINO',
    nacionalidad: 'Peruana',
    direccion: 'Jr. Los Pinos 123',
    correo: 'rosa@correo.com',
    contacto: '999111222',
    fecha: '2026-10-20',
    estado: 'PENDIENTE',
    codigo: `COD${String(secuenciaMatricula).padStart(5, '0')}`,
    motivoRechazo: null,
    observaciones: null,
    codPersona: null,
    cuentaActiva: false,
    documentos: {
      DOCUMENTO_IDENTIDAD: { estado: 'PENDIENTE', observacion: null, tipoArchivo: 'application/pdf' },
      CERTIFICADO_SECUNDARIA: { estado: 'PENDIENTE', observacion: null, tipoArchivo: 'application/pdf' },
      FOTOGRAFIA: { estado: 'PENDIENTE', observacion: null, tipoArchivo: 'image/png' },
      ANTECEDENTES_POLICIALES: { estado: 'PENDIENTE', observacion: null, tipoArchivo: 'application/pdf' },
      DECLARACION_JURADA: { estado: 'PENDIENTE', observacion: null, tipoArchivo: 'application/pdf' },
    },
    citacion: null,
    evaluacion: null,
    pago: null,
    ...matricula,
  }
  matriculasMock.push(fila)
  return fila
}

function vistas(fila: MatriculaMock) {
  return DOCUMENTOS.map((doc) => {
    const cargado = fila.documentos[doc.tipo]
    return { ...doc, estado: cargado?.estado ?? 'FALTANTE', observacion: cargado?.observacion ?? null }
  })
}

function detalle(fila: MatriculaMock) {
  const { codigo: _codigo, cuentaActiva: _cuenta, documentos: _docs, ...resto } = fila
  return { ...resto, documentos: vistas(fila) }
}

function porCredencial(numeroDocumento: unknown, codigo: unknown) {
  return matriculasMock.find(
    (m) => m.numeroDocumento === String(numeroDocumento ?? '').trim().toUpperCase() && m.codigo === String(codigo ?? '').trim().toUpperCase(),
  )
}

function edad(nacimiento: string, hoy = new Date().toISOString().slice(0, 10)) {
  const [a, m, d] = nacimiento.split('-').map(Number)
  const [ah, mh, dh] = hoy.split('-').map(Number)
  return ah - a - (mh < m || (mh === m && dh < d) ? 1 : 0)
}

const conflicto = (mensaje: string) => HttpResponse.text(mensaje, { status: 409 })

function convocatoriaPublica(c: ConvocatoriaMock) {
  const { estado: _estado, ...resto } = c
  return resto
}

export const handlersInscripcion = [
  http.get(`${API}/api/public/postulaciones/requisitos`, () =>
    HttpResponse.json({ edadMinima: 18, notaMinimaAdmision: NOTA_MINIMA, documentos: DOCUMENTOS.map((d) => ({ ...d, estado: 'FALTANTE', observacion: null })) }),
  ),

  http.post(`${API}/api/public/matriculas`, async ({ request }) => {
    const formulario = await request.formData()
    const datos = JSON.parse(await (formulario.get('datos') as Blob).text())
    const errores: string[] = []
    if (datos.tipoDocumento === 'DNI' && !/^\d{8}$/.test(datos.numeroDocumento ?? ''))
      errores.push("'numeroDocumento': El DNI debe tener 8 dígitos.")
    if (!datos.fechaNacimiento || edad(datos.fechaNacimiento) < 18) errores.push("'fechaNacimiento': Debe ser mayor de edad para postular.")
    if (datos.aceptaTratamientoDatos !== true)
      errores.push("'aceptaTratamientoDatos': Debe autorizar el tratamiento de sus datos personales.")
    const documentos: MatriculaMock['documentos'] = {}
    for (const doc of DOCUMENTOS) {
      const archivo = formulario.get(doc.tipo)
      if (!(archivo instanceof File) || archivo.size === 0) {
        if (doc.obligatorio && doc.momento === 'POSTULACION') errores.push(`'${doc.tipo}': Falta el documento «${doc.nombre}».`)
        continue
      }
      if (doc.soloImagen && !['image/jpeg', 'image/png'].includes(archivo.type)) {
        errores.push(`'${doc.tipo}': La fotografía debe ser JPG o PNG.`)
        continue
      }
      documentos[doc.tipo] = { estado: 'PENDIENTE', observacion: null, tipoArchivo: archivo.type }
    }
    if (errores.length > 0) return HttpResponse.json(errores, { status: 400 })
    const convocatoria = convocatoriasMock.find((c) => c.id === datos.idConvocatoria)
    if (!convocatoria || convocatoria.estado !== 'PUBLICADA')
      return HttpResponse.text('La convocatoria no está disponible para postular.', { status: 400 })
    if (matriculasMock.some((m) => m.numeroDocumento === datos.numeroDocumento && m.idConvocatoria === datos.idConvocatoria && VIVAS.includes(m.estado)))
      return conflicto('Ya existe una postulación para este documento en la convocatoria.')
    const fila = sembrarMatriculaMock({ ...datos, idCurso: convocatoria.idCurso, documentos })
    return HttpResponse.json({ mensaje: 'Postulación registrada. Guarde su código para consultar el avance.', codigo: fila.codigo }, { status: 201 })
  }),

  http.post(`${API}/api/public/postulaciones/consulta`, async ({ request }) => {
    const { numeroDocumento, codigo } = (await request.json()) as Record<string, string>
    const fila = porCredencial(numeroDocumento, codigo)
    if (!fila) return textoNoEncontrado('No encontramos una postulación con esos datos.')
    const convocatoria = convocatoriasMock.find((c) => c.id === fila.idConvocatoria)
    return HttpResponse.json({
      convocatoria: convocatoria?.nombre ?? null,
      nombres: fila.nombres,
      aPaterno: fila.aPaterno,
      fecha: fila.fecha,
      estado: fila.estado,
      observaciones: fila.observaciones,
      motivoRechazo: fila.motivoRechazo,
      documentos: vistas(fila),
      citacion: fila.citacion,
      evaluacion: fila.evaluacion,
      cuentaActiva: fila.cuentaActiva,
    })
  }),

  http.post(`${API}/api/public/postulaciones/documentos`, async ({ request }) => {
    const formulario = await request.formData()
    const datos = JSON.parse(await (formulario.get('datos') as Blob).text())
    const fila = porCredencial(datos.numeroDocumento, datos.codigo)
    if (!fila) return textoNoEncontrado('No encontramos una postulación con esos datos.')
    const archivo = formulario.get('archivo')
    if (!(archivo instanceof File)) return HttpResponse.json(["'archivo': Adjunte el archivo."], { status: 400 })
    if (!RECIBE_DOCUMENTOS.includes(fila.estado)) return conflicto('Esta postulación ya no recibe documentos.')
    const tipo = datos.tipo as TipoDocumentoMock
    if (fila.documentos[tipo]?.estado === 'ACEPTADO') return conflicto('Ese documento ya fue aceptado.')
    fila.documentos[tipo] = { estado: 'PENDIENTE', observacion: null, tipoArchivo: archivo.type }
    if (fila.estado === 'OBSERVADA' && !Object.values(fila.documentos).some((d) => d?.estado === 'OBSERVADO')) fila.estado = 'PENDIENTE'
    return HttpResponse.json({ mensaje: 'Documento recibido.' })
  }),

  http.post(`${API}/api/public/postulaciones/activacion`, async ({ request }) => {
    const { numeroDocumento, codigo } = (await request.json()) as Record<string, string>
    const fila = porCredencial(numeroDocumento, codigo)
    if (!fila) return textoNoEncontrado('No encontramos una postulación con esos datos.')
    if (fila.estado !== 'ADMITIDA') return conflicto('Solo un postulante admitido puede activar su cuenta.')
    if (fila.cuentaActiva) return conflicto('La cuenta ya fue activada.')
    fila.cuentaActiva = true
    return HttpResponse.json({ mensaje: 'Cuenta activada. Ingrese con su correo y la contraseña elegida.', usuario: fila.correo }, { status: 201 })
  }),

  http.get(`${API}/api/matriculas`, ({ request }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const estado = new URL(request.url).searchParams.get('estado')
    const filas = matriculasMock
      .filter((m) => !estado || m.estado === estado)
      .map(({ id, idConvocatoria, tipoDocumento, numeroDocumento, nombres, aPaterno, aMaterno, correo, fecha, estado: e }) => ({
        id,
        idConvocatoria,
        tipoDocumento,
        numeroDocumento,
        nombres,
        aPaterno,
        aMaterno,
        correo,
        fecha,
        estado: e,
      }))
    return HttpResponse.json(filas)
  }),

  http.get(`${API}/api/matriculas/:id/documentos/:tipo`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const doc = matriculasMock.find((m) => String(m.id) === params.id)?.documentos[params.tipo as TipoDocumentoMock]
    if (!doc) return new HttpResponse(null, { status: 404 })
    return HttpResponse.arrayBuffer(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer, { headers: { 'Content-Type': doc.tipoArchivo } })
  }),

  http.get(`${API}/api/matriculas/:id`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    return HttpResponse.json(detalle(fila))
  }),

  http.put(`${API}/api/matriculas/:id/documentos/:tipo/:accion`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (!RECIBE_DOCUMENTOS.includes(fila.estado)) return conflicto('Los documentos de esta postulación ya no se revisan.')
    const doc = fila.documentos[params.tipo as TipoDocumentoMock]
    if (!doc) return conflicto('El postulante no cargó ese documento.')
    if (params.accion === 'aceptar') {
      doc.estado = 'ACEPTADO'
      doc.observacion = null
      return HttpResponse.json({ mensaje: 'Documento aceptado.' })
    }
    const { observaciones } = (await request.json()) as { observaciones?: string }
    doc.estado = 'OBSERVADO'
    doc.observacion = observaciones ?? null
    if (fila.estado === 'PENDIENTE') fila.estado = 'OBSERVADA'
    return HttpResponse.json({ mensaje: 'Documento observado; el postulante debe subsanarlo.' })
  }),

  http.put(`${API}/api/matriculas/:id/validar`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado !== 'PENDIENTE' && fila.estado !== 'OBSERVADA') return conflicto('La postulación ya fue procesada.')
    const faltan = DOCUMENTOS.filter((d) => d.obligatorio && d.momento === 'POSTULACION' && !fila.documentos[d.tipo]).map((d) => d.nombre)
    if (faltan.length > 0) return conflicto(`Faltan documentos obligatorios: ${faltan.join(', ')}.`)
    if (Object.values(fila.documentos).some((d) => d?.estado === 'OBSERVADO')) return conflicto('Hay documentos observados sin subsanar.')
    for (const doc of DOCUMENTOS) {
      const cargado = fila.documentos[doc.tipo]
      if (cargado && doc.momento === 'POSTULACION') cargado.estado = 'ACEPTADO'
    }
    fila.estado = 'VALIDADA'
    return HttpResponse.json({ mensaje: 'Documentación validada.' })
  }),

  http.put(`${API}/api/matriculas/:id/observar`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado !== 'PENDIENTE') return conflicto('Solo una postulación en revisión se puede observar.')
    const { observaciones } = (await request.json()) as { observaciones?: string }
    fila.estado = 'OBSERVADA'
    fila.observaciones = observaciones ?? null
    return HttpResponse.json({ mensaje: 'Postulación observada; el postulante debe subsanar.' })
  }),

  http.put(`${API}/api/matriculas/:id/citacion`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    const cuerpo = (await request.json()) as { fecha: string; hora: string; lugar: string }
    if (cuerpo.fecha < new Date().toISOString().slice(0, 10))
      return HttpResponse.json(["'fecha': La fecha de la evaluación no puede ser pasada."], { status: 400 })
    if (fila.estado !== 'VALIDADA' && fila.estado !== 'CITADA') return conflicto('Solo una postulación validada se cita a evaluación.')
    fila.citacion = cuerpo
    fila.estado = 'CITADA'
    return HttpResponse.json({ mensaje: 'Postulante citado a la evaluación de admisión.' })
  }),

  http.post(`${API}/api/matriculas/:id/resultado`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    const e = (await request.json()) as {
      notaConocimientos: number
      entrevista: Aptitud
      evaluacionPsicologica: Aptitud
      observaciones?: string
    }
    if (!(e.notaConocimientos >= 0 && e.notaConocimientos <= 20))
      return HttpResponse.json(["'notaConocimientos': La nota debe estar entre 0 y 20."], { status: 400 })
    if (fila.estado !== 'CITADA') return conflicto('Solo una postulación citada tiene evaluación de admisión.')
    if (fila.documentos.CERTIFICADO_MEDICO?.estado !== 'ACEPTADO') return conflicto('Falta aceptar el certificado médico aeronáutico.')
    const admitido = e.notaConocimientos >= NOTA_MINIMA && e.entrevista === 'APTO' && e.evaluacionPsicologica === 'APTO'
    if (admitido) {
      const convocatoria = convocatoriasMock.find((c) => c.id === fila.idConvocatoria)
      const admitidos = matriculasMock.filter((m) => m.idConvocatoria === fila.idConvocatoria && m.evaluacion?.resultado === 'ADMITIDO').length
      if (convocatoria && admitidos >= convocatoria.vacantes) return conflicto('No quedan vacantes en la convocatoria.')
      fila.codPersona = `P${fila.id}`
    }
    const resultado = admitido ? 'ADMITIDO' : 'NO_ADMITIDO'
    fila.evaluacion = { ...e, observaciones: e.observaciones ?? null, resultado }
    fila.estado = admitido ? 'ADMITIDA' : 'NO_ADMITIDO'
    return HttpResponse.json({ mensaje: 'Evaluación de admisión registrada.', resultado })
  }),

  http.put(`${API}/api/matriculas/:id/pago`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    const pago = (await request.json()) as MatriculaMock['pago'] & object
    if (!(pago.monto > 0)) return HttpResponse.json(["'monto': El monto debe ser mayor que cero."], { status: 400 })
    if (fila.estado !== 'ADMITIDA') return conflicto('El pago de matrícula se registra sobre un postulante admitido.')
    fila.pago = pago
    return HttpResponse.json({ mensaje: 'Pago de matrícula registrado.' })
  }),

  http.put(`${API}/api/matriculas/:id/rechazar`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return errorResponse(401, 'Unauthorized', 'Token is not valid')
    const fila = matriculasMock.find((m) => String(m.id) === params.id)
    if (!fila) return textoNoEncontrado('Matrícula especificada no existe.')
    if (fila.estado !== 'PENDIENTE' && fila.estado !== 'OBSERVADA') return conflicto('La postulación ya fue procesada.')
    const { motivo } = (await request.json()) as { motivo?: string }
    fila.estado = 'RECHAZADA'
    fila.motivoRechazo = motivo ?? null
    return HttpResponse.json({ mensaje: 'Postulación rechazada.' })
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

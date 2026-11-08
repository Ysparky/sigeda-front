import { http, HttpResponse } from 'msw'
import { API, autorizar, erroresDeCampo, guardado, paginar, texto, textoEliminado, textoNoEncontrado } from './comun'
import { nfpiDe } from './indices'
import { cerrarConvocatoriasDeCohorte, tienePagoPendiente } from './inscripcion'
import { buscarPersona, datos, siguienteId, type GrupoMock, type PersonaMock, type ProgramaMock } from './datos'

type PersonaDeGrupo = { codigo?: unknown; checked?: unknown }

type CuerpoGrupo = {
  nombre?: unknown
  descripcion?: unknown
  programa?: unknown
  codInstructor?: unknown
  personas?: PersonaDeGrupo[] | null
}

const TOPE_ALUMNOS = 20
const PLAN_BASE_DIAS_HABILES = 81

function iso(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function sumarDiasHabiles(desde: Date, dias: number): Date {
  const fecha = new Date(desde)
  let restantes = dias
  while (restantes > 0) {
    fecha.setDate(fecha.getDate() + 1)
    if (fecha.getDay() !== 0 && fecha.getDay() !== 6) restantes--
  }
  return fecha
}

function alumnosDe(grupo: GrupoMock) {
  return datos().personas.filter((persona) => persona.idGrupo === grupo.id && persona.tipo === 'Alumno')
}

function motivosParaIniciar(grupo: GrupoMock): string[] {
  const faltan: string[] = []
  if (!grupo.codInstructor) faltan.push('La cohorte no tiene instructor responsable.')
  const alumnos = alumnosDe(grupo)
  if (alumnos.length === 0) faltan.push('La cohorte no tiene alumnos.')
  const sinPago = alumnos.filter((alumno) => tienePagoPendiente(alumno.codigo)).map((a) => `${a.nombre} ${a.aPaterno}`)
  if (sinPago.length > 0) faltan.push(`Falta confirmar el pago de matrícula de: ${sinPago.join(', ')}.`)
  return faltan
}

function entidadPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    rango: persona.rango,
    dni: persona.dni,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    estado: persona.estado,
    tipo: persona.tipo,
    codEvalRealizada: persona.codEvalRealizada,
    codEvalDesaprobada: null,
    contChequeo: persona.contChequeo,
    contEval: persona.contEval,
    contMalo: persona.contMalo,
    contRegular: persona.contRegular,
    checked: false,
    idGrupo: persona.idGrupo,
    desaprobados: null,
  }
}

function detalleGrupo(grupo: GrupoMock) {
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    descripcion: grupo.descripcion,
    programa: grupo.programa,
    estado: grupo.estado,
    codInstructor: grupo.codInstructor ?? null,
    fechaInicio: grupo.fechaInicio ?? null,
    fechaFin: grupo.fechaFin ?? null,
    personas: datos()
      .personas.filter((persona) => persona.idGrupo === grupo.id)
      .map(entidadPersona),
  }
}

function erroresDeGrupo(cuerpo: CuerpoGrupo, conPrograma: boolean): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': El nombre es obligatorio")
  else if (nombre.length < 3 || nombre.length > 35) {
    errores.push("'nombre': El nombre debe tener entre 3 y 35 caracteres.")
  }
  if (texto(cuerpo.descripcion).length > 255) {
    errores.push("'descripcion': La descripción no puede superar los 255 caracteres.")
  }
  if (conPrograma && cuerpo.programa !== 'PDI' && cuerpo.programa !== 'PDE') {
    errores.push("'programa': Ingresar programa válido.")
  }
  return errores
}

function personasDelCuerpo(cuerpo: CuerpoGrupo): PersonaDeGrupo[] {
  return cuerpo.personas ?? []
}

function faltaAlguna(personas: PersonaDeGrupo[]): boolean {
  return personas.some((persona) => !buscarPersona(texto(persona.codigo)))
}

function codInstructorDe(cuerpo: CuerpoGrupo): string | null {
  return typeof cuerpo.codInstructor === 'string' && cuerpo.codInstructor !== '' ? cuerpo.codInstructor : null
}

function errorDeInstructor(codInstructor: string | null): Response | null {
  if (codInstructor === null) return null
  const instructor = buscarPersona(codInstructor)
  if (!instructor) return textoNoEncontrado('Persona especificada no existe.')
  if (!instructor.tipo?.startsWith('Instructor')) {
    return erroresDeCampo(["'codInstructor': El responsable del grupo debe ser un instructor."])
  }
  return null
}

function miembrosFinales(actuales: string[], personas: PersonaDeGrupo[], todasEntran: boolean): number {
  const miembros = new Set(actuales)
  for (const persona of personas) {
    if (todasEntran || persona.checked === true) miembros.add(texto(persona.codigo))
    else miembros.delete(texto(persona.codigo))
  }
  return miembros.size
}

const errorDeTope = () => erroresDeCampo([`'personas': Un grupo admite como máximo ${TOPE_ALUMNOS} alumnos.`])

export const handlersGrupos = [
  http.get(`${API}/api/grupos`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    return paginar(datos().grupos, new URL(request.url), { nombreLista: 'grupos', propiedadPorDefecto: 'id' })
  }),
  http.post(`${API}/api/grupos`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoGrupo
    const errores = erroresDeGrupo(cuerpo, true)
    if (errores.length > 0) return erroresDeCampo(errores)
    const personas = personasDelCuerpo(cuerpo)
    if (faltaAlguna(personas)) return textoNoEncontrado('Persona especificada no existe.')
    const codInstructor = codInstructorDe(cuerpo)
    const instructorInvalido = errorDeInstructor(codInstructor)
    if (instructorInvalido) return instructorInvalido
    if (miembrosFinales([], personas, true) > TOPE_ALUMNOS) return errorDeTope()
    const grupo: GrupoMock = {
      id: siguienteId('grupo'),
      nombre: texto(cuerpo.nombre),
      descripcion: texto(cuerpo.descripcion),
      programa: cuerpo.programa === 'PDE' ? 'PDE' : ('PDI' as ProgramaMock),
      estado: 'EN_INSCRIPCION',
      codInstructor,
    }
    datos().grupos.push(grupo)
    for (const elegida of personas) {
      const persona = buscarPersona(texto(elegida.codigo))
      if (persona) persona.idGrupo = grupo.id
    }
    return guardado('Grupo', 'grupo', detalleGrupo(grupo))
  }),
  http.get(`${API}/api/grupos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    return HttpResponse.json(detalleGrupo(grupo))
  }),
  http.get(`${API}/api/grupos/:id/consolidado`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Enrollments')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    return HttpResponse.json(
      alumnosDe(grupo).map((alumno) => ({
        codigo: alumno.codigo,
        nombre: [alumno.nombre, alumno.aPaterno, alumno.aMaterno].filter(Boolean).join(' '),
        estadoAcademico: alumno.estado,
        nfpi: nfpiDe(alumno.codigo),
      })),
    )
  }),
  http.put(`${API}/api/grupos/:id/estado`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Enrollments')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    const { estado } = (await request.json()) as { estado: string }
    const permitida =
      (grupo.estado === 'EN_INSCRIPCION' && estado === 'EN_PROGRESO') ||
      (grupo.estado === 'EN_PROGRESO' && estado === 'CERRADA')
    if (!permitida) return HttpResponse.text('Transición de estado de la cohorte no permitida.', { status: 409 })
    if (estado === 'EN_PROGRESO') {
      const faltan = motivosParaIniciar(grupo)
      if (faltan.length > 0) return HttpResponse.text(faltan.join(' '), { status: 409 })
      const hoy = new Date()
      grupo.fechaInicio = iso(hoy)
      grupo.fechaFin = iso(sumarDiasHabiles(hoy, PLAN_BASE_DIAS_HABILES))
      cerrarConvocatoriasDeCohorte(grupo.id)
    }
    grupo.estado = estado
    return HttpResponse.json({ mensaje: 'Estado de la cohorte actualizado.' })
  }),
  http.put(`${API}/api/grupos/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    const cuerpo = (await request.json()) as CuerpoGrupo
    const errores = erroresDeGrupo(cuerpo, false)
    if (errores.length > 0) return erroresDeCampo(errores)
    const personas = personasDelCuerpo(cuerpo)
    if (faltaAlguna(personas)) return textoNoEncontrado('Persona especificada no existe.')
    const codInstructor = codInstructorDe(cuerpo)
    const instructorInvalido = errorDeInstructor(codInstructor)
    if (instructorInvalido) return instructorInvalido
    const actuales = datos()
      .personas.filter((persona) => persona.idGrupo === grupo.id)
      .map((persona) => persona.codigo)
    if (miembrosFinales(actuales, personas, false) > TOPE_ALUMNOS) return errorDeTope()
    grupo.nombre = texto(cuerpo.nombre)
    grupo.codInstructor = codInstructor
    grupo.descripcion = texto(cuerpo.descripcion)
    for (const elegida of personas) {
      const persona = buscarPersona(texto(elegida.codigo))
      if (persona) persona.idGrupo = elegida.checked === true ? grupo.id : null
    }
    return guardado('Grupo', 'grupo', detalleGrupo(grupo))
  }),
  http.delete(`${API}/api/grupos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    for (const persona of datos().personas) {
      if (persona.idGrupo === grupo.id) persona.idGrupo = null
    }
    datos().grupos = datos().grupos.filter((candidato) => candidato.id !== grupo.id)
    return textoEliminado('Grupo')
  }),
]

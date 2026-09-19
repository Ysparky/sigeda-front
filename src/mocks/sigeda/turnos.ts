import { http, HttpResponse } from 'msw'
import { esFechaIso, esHora, esPosteriorAHoy } from '@/lib/dominio/calendario'
import { permiteCambios, seSuperponen } from '@/lib/dominio/turno'
import { API, autorizar, errorResponse, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, nombreCorto, type AlumnoTurnoMock, type ProgramaMock, type TurnoMock } from './datos'

type CuerpoTurno = {
  nombre?: unknown
  fechaEval?: unknown
  programa?: unknown
  idSubfase?: unknown
  codInstructor?: unknown
  aeronave?: { id?: unknown } | null
  alumnosTurno?: { codAlumno?: unknown; horaInicio?: unknown; horaFin?: unknown }[]
  maniobrasTurno?: { idManiobra?: unknown; nota_min?: unknown }[]
}

const MENSAJE_HORA = 'La hora debe estar en formato HH:mm (09:00, 14:00)'

function programaDeConsulta(valor: string | null): ProgramaMock {
  return (valor ?? 'pdi').toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function resumen(turno: TurnoMock) {
  return {
    id: turno.id,
    subfase: turno.subfase,
    nombre: turno.nombre,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    cantAlumno: turno.alumnos.length,
    cantManiobra: turno.maniobras.length,
  }
}

export function detalleTurno(turno: TurnoMock) {
  const instructor = turno.codInstructor ? buscarPersona(turno.codInstructor) : undefined
  const aeronave = datos().aeronaves.find((candidata) => candidata.id === turno.idAeronave)
  return {
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    fase: turno.fase,
    codInstructor: turno.codInstructor,
    instructor: instructor ? nombreCorto(instructor) : null,
    aeronave: aeronave ? { id: aeronave.id, nombre: aeronave.nombre, estado: aeronave.estado } : null,
    alumnosTurno: turno.alumnos.map((alumno) => {
      const persona = buscarPersona(alumno.codAlumno)
      return { ...alumno, alumno: persona ? nombreCorto(persona) : alumno.codAlumno }
    }),
    maniobrasTurno: turno.maniobras.map((item) => ({
      nota_min: item.notaMin,
      maniobra: datos().maniobras.find((maniobra) => maniobra.id === item.idManiobra) ?? {
        id: item.idManiobra,
        nombre: `Maniobra ${item.idManiobra}`,
        descripcion: '',
      },
    })),
  }
}

function filtrar(url: URL): TurnoMock[] {
  const programa = programaDeConsulta(url.searchParams.get('programa'))
  const idSubfase = Number(url.searchParams.get('idSubfase') ?? 0)
  const fechaPre = url.searchParams.get('fechaPre') ?? ''
  const fechaPost = url.searchParams.get('fechaPost') ?? ''
  const conFechas = esFechaIso(fechaPre) && esFechaIso(fechaPost)
  return datos().turnos.filter(
    (turno) =>
      turno.programa === programa &&
      (idSubfase === 0 || turno.idSubfase === idSubfase) &&
      (!conFechas || (turno.fechaEval >= fechaPre && turno.fechaEval <= fechaPost)),
  )
}

function validarCampos(cuerpo: CuerpoTurno, conProgramaYSubfase: boolean): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': no debe estar vacío")
  else if (nombre.length < 10 || nombre.length > 30) errores.push("'nombre': Nombre debe tener de 10 a 30 caracteres.")
  const fechaEval = texto(cuerpo.fechaEval)
  if (!esFechaIso(fechaEval)) errores.push("'fechaEval': Ingresar fecha válida.")
  else if (!esPosteriorAHoy(fechaEval)) errores.push("'fechaEval': La fecha del turno debe ser posterior a hoy.")
  if (conProgramaYSubfase) {
    if (cuerpo.programa !== 'PDI' && cuerpo.programa !== 'PDE') errores.push("'programa': Ingresar programa válido.")
    if (!(Number(cuerpo.idSubfase) > 0)) errores.push("'idSubfase': La subfase es requerida.")
  }
  if (texto(cuerpo.codInstructor).trim() === '') errores.push("'codInstructor': Instructor debe ser asignado.")
  if (!cuerpo.aeronave) errores.push("'aeronave': La asignación de aeronave es requerida.")
  const alumnos = cuerpo.alumnosTurno ?? []
  if (alumnos.length === 0) errores.push("'alumnosTurno': La asignación de alumnos es requerida")
  alumnos.forEach((alumno, indice) => {
    if (texto(alumno.codAlumno).length !== 6) errores.push(`'alumnosTurno[${indice}].codAlumno': Código de alumno es requerido.`)
    if (!esHora(texto(alumno.horaInicio))) errores.push(`'alumnosTurno[${indice}].horaInicio': ${MENSAJE_HORA}`)
    if (!esHora(texto(alumno.horaFin))) errores.push(`'alumnosTurno[${indice}].horaFin': ${MENSAJE_HORA}`)
  })
  const maniobras = cuerpo.maniobrasTurno ?? []
  if (maniobras.length === 0) errores.push("'maniobrasTurno': La asignación de maniobras es requerida")
  maniobras.forEach((maniobra, indice) => {
    if (!(Number(maniobra.idManiobra) > 0)) errores.push(`'maniobrasTurno[${indice}].idManiobra': La maniobra es requerida`)
    if (!/^(D|I|R|B|E)$/i.test(texto(maniobra.nota_min))) {
      errores.push(`'maniobrasTurno[${indice}].nota_min': Nota mínima debe utilizar sistema de calificación`)
    }
  })
  return errores
}

function erroresDeSolape(alumnos: AlumnoTurnoMock[], fechaEval: string, idAeronave: number, idPropio: number | null) {
  const ocupados = datos()
    .turnos.filter((turno) => turno.id !== idPropio && turno.fechaEval === fechaEval && turno.idAeronave === idAeronave)
    .flatMap((turno) => turno.alumnos)
  return alumnos
    .map((alumno, indice) =>
      ocupados.some((ocupado) => seSuperponen(alumno, ocupado))
        ? `'alumnosTurno[${indice}].codAlumno': El alumno ${alumno.codAlumno} tiene un horario que se cruza con otro turno de la aeronave.`
        : null,
    )
    .filter((mensaje): mensaje is string => mensaje !== null)
}

function aAlumnos(cuerpo: CuerpoTurno): AlumnoTurnoMock[] {
  return (cuerpo.alumnosTurno ?? []).map((alumno) => ({
    codAlumno: texto(alumno.codAlumno),
    horaInicio: texto(alumno.horaInicio),
    horaFin: texto(alumno.horaFin),
  }))
}

function guardado(turno: TurnoMock) {
  return HttpResponse.json({ mensaje: 'Turno guardado con éxito.', turno: detalleTurno(turno) }, { status: 201 })
}

function validarGuardado(cuerpo: CuerpoTurno, idSubfase: number | null, idPropio: number | null): Response | null {
  const errores = validarCampos(cuerpo, idPropio === null)
  if (idSubfase !== null && idSubfase > 0 && !datos().subfases.some((subfase) => subfase.id === idSubfase)) {
    return errorResponse(404, 'Recurso no encontrado', 'No existe información de subfase.')
  }
  if (cuerpo.aeronave) {
    const aeronave = datos().aeronaves.find((candidata) => candidata.id === Number(cuerpo.aeronave?.id))
    if (!aeronave) return errorResponse(404, 'Recurso no encontrado', 'No existe información de aeronave.')
    if (aeronave.estado !== 'Disponible') return errorResponse(400, 'Error al validar el modelo', 'Asignar aeronave disponible.')
    if (errores.length === 0) {
      errores.push(...erroresDeSolape(aAlumnos(cuerpo), texto(cuerpo.fechaEval), aeronave.id, idPropio))
    }
  }
  return errores.length > 0 ? HttpResponse.json(errores, { status: 400 }) : null
}

function aplicar(turno: TurnoMock, cuerpo: CuerpoTurno) {
  turno.nombre = texto(cuerpo.nombre)
  turno.fechaEval = texto(cuerpo.fechaEval)
  turno.codInstructor = texto(cuerpo.codInstructor)
  turno.idAeronave = Number(cuerpo.aeronave?.id)
  turno.alumnos = aAlumnos(cuerpo)
  turno.maniobras = (cuerpo.maniobrasTurno ?? []).map((maniobra) => ({
    idManiobra: Number(maniobra.idManiobra),
    notaMin: texto(maniobra.nota_min).toUpperCase(),
  }))
}

function turnoVencido() {
  return errorResponse(410, 'Fecha de modificación expiró', 'No se puede modificar. El turno ya ha sido evaluado.')
}

export const handlersTurnos = [
  http.get(`${API}/api/turnos`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    return paginar(filtrar(url), url, {
      nombreLista: 'turnos',
      propiedadPorDefecto: 'id',
      proyectar: resumen,
    })
  }),
  http.get(`${API}/api/turnos/alumno`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const codAlumno = url.searchParams.get('codAlumno') ?? '000000'
    const turnos = datos().turnos.filter((turno) => turno.alumnos.some((alumno) => alumno.codAlumno === codAlumno))
    return paginar(turnos, url, { nombreLista: 'turnos', propiedadPorDefecto: 'id', proyectar: resumen })
  }),
  http.get(`${API}/api/turnos/:fecha/aeronave/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const aeronave = datos().aeronaves.find((candidata) => candidata.id === Number(params.id))
    const ocupaciones = datos()
      .turnos.filter(
        (turno) =>
          turno.fechaEval === String(params.fecha) && turno.idAeronave === Number(params.id) && turno.alumnos.length > 0,
      )
      .map((turno) => ({
        id: turno.id,
        nombre: turno.nombre,
        fechaEval: turno.fechaEval,
        horaInicio: turno.alumnos.map((alumno) => alumno.horaInicio).sort()[0],
        horaFin: turno.alumnos.map((alumno) => alumno.horaFin).sort().at(-1),
        aeronave: aeronave ? { id: aeronave.id, nombre: aeronave.nombre } : null,
      }))
    return HttpResponse.json(ocupaciones)
  }),
  http.get(`${API}/api/turnos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const turno = datos().turnos.find((candidato) => candidato.id === Number(params.id))
    if (!turno) return textoNoEncontrado('Turno especificada no existe.')
    return HttpResponse.json(detalleTurno(turno))
  }),
  http.post(`${API}/api/turnos`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoTurno
    const idSubfase = Number(cuerpo.idSubfase)
    const rechazo = validarGuardado(cuerpo, idSubfase, null)
    if (rechazo) return rechazo
    const subfase = datos().subfases.find((candidata) => candidata.id === idSubfase)
    const turno: TurnoMock = {
      id: datos().siguienteIdTurno,
      nombre: '',
      fechaEval: '',
      programa: cuerpo.programa === 'PDE' ? 'PDE' : 'PDI',
      idSubfase,
      subfase: subfase?.nombre ?? '',
      fase: subfase?.fase ?? '',
      codInstructor: null,
      idAeronave: null,
      alumnos: [],
      maniobras: [],
    }
    aplicar(turno, cuerpo)
    datos().siguienteIdTurno += 1
    datos().turnos.push(turno)
    return guardado(turno)
  }),
  http.put(`${API}/api/turnos/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const turno = datos().turnos.find((candidato) => candidato.id === Number(params.id))
    if (!turno) return errorResponse(404, 'Recurso no encontrado', 'No existe información de turno.')
    if (!permiteCambios(turno.fechaEval)) return turnoVencido()
    const cuerpo = (await request.json()) as CuerpoTurno
    const rechazo = validarGuardado(cuerpo, null, turno.id)
    if (rechazo) return rechazo
    aplicar(turno, cuerpo)
    return guardado(turno)
  }),
  http.delete(`${API}/api/turnos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const turno = datos().turnos.find((candidato) => candidato.id === Number(params.id))
    if (!turno) return errorResponse(404, 'Recurso no encontrado', 'No existe información de turno.')
    if (!permiteCambios(turno.fechaEval)) return turnoVencido()
    datos().turnos = datos().turnos.filter((candidato) => candidato.id !== turno.id)
    return HttpResponse.text('Turno eliminado con éxito.')
  }),
]

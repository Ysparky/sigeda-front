import { http, HttpResponse } from 'msw'
import { hoyIso } from '@/lib/dominio/calendario'
import { esBajoEstandar } from '@/lib/dominio/dirbe'
import { API, autorizar, paginar, texto, textoNoEncontrado } from './comun'
import {
  buscarPersona,
  datos,
  nombreCorto,
  type CalificacionMock,
  type EvaluacionMock,
  type ProgramaMock,
} from './datos'

type CalificacionEntrante = {
  idManiobra?: unknown
  nota?: unknown
  causa?: unknown
  observacion?: unknown
  recomendacion?: unknown
}

type CuerpoEvaluacion = {
  nombre?: unknown
  categoria?: unknown
  recomendacion?: unknown
  url?: unknown
  codEvaluador?: unknown
  calificaciones?: CalificacionEntrante[] | null
}

const CATEGORIAS: Record<string, string> = {
  Ponderada: 'Ponderada',
  Chequeo: 'Chequeo',
  chequeoSubFase: 'Chequeo Sub Fase',
  Complementacion: 'Complementación',
}

const CLASIFICACIONES = ['Malo', 'Regular', 'Bueno', 'Excelente']
const INVALIDAS = new Set(['ID', 'IB', 'IE', 'RD', 'RE', 'BD', 'ED'])
const MENSAJE_ULTIMA = 'Solo se puede modificar la ultima evaluación realiza por el alumno.'

function opcional(valor: unknown): string | null {
  const limpio = texto(valor).trim()
  return limpio === '' ? null : limpio
}

function mensaje(status: number, contenido: string | string[]) {
  return HttpResponse.json({ mensaje: contenido }, { status })
}

function resumen(evaluacion: EvaluacionMock) {
  return {
    codigo: evaluacion.codigo,
    nombre: evaluacion.nombre,
    fase: evaluacion.fase,
    evaluador: evaluacion.evaluador,
    fecha: evaluacion.fecha,
    alumno: evaluacion.alumno,
    promedio: evaluacion.promedio,
    clasificacion: evaluacion.clasificacion,
  }
}

function esProgramada(categoria: string) {
  return categoria === 'Ponderada' || categoria === 'chequeoSubFase'
}

function validarCampos(cuerpo: CuerpoEvaluacion): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': Ingresar nombre de evaluación.")
  else if (nombre.length < 10 || nombre.length > 30) errores.push("'nombre': Nombre debe tener de 10 a 30 caracteres.")
  if (!(texto(cuerpo.categoria) in CATEGORIAS)) errores.push("'categoria': Ingresar categoria válida.")
  if (texto(cuerpo.recomendacion).length > 250) {
    errores.push("'recomendacion': Recomendación debe tener un máximo de 250 caracteres.")
  }
  if (!Array.isArray(cuerpo.calificaciones)) errores.push("'calificaciones': Las calificaciones son requeridas")
  for (const [indice, calificacion] of (cuerpo.calificaciones ?? []).entries()) {
    if (!(Number(calificacion.idManiobra) > 0)) errores.push(`'calificaciones[${indice}].idManiobra': La maniobra es requerida`)
    if (texto(calificacion.nota).trim() === '') {
      errores.push(`'calificaciones[${indice}].nota': Ingresar calificación de maniobra.`)
    }
    for (const [campo, etiqueta] of [
      ['causa', 'Causa'],
      ['observacion', 'Observación'],
      ['recomendacion', 'Recomendación'],
    ] as const) {
      if (texto(calificacion[campo]).length > 250) {
        errores.push(`'calificaciones[${indice}].${campo}': ${etiqueta} debe tener un máximo de 250 caracteres.`)
      }
    }
  }
  return errores
}

function comprobarEstado(categoria: string, estado: string): string | null {
  const apto = estado === 'Apto' || estado === 'En Observación'
  if (categoria === 'Ponderada' && !apto) return 'El alumno debe ser apto para realizar evaluaciones ponderadas.'
  if (categoria === 'Chequeo' && estado !== 'En Chequeo' && estado !== 'En Final') return 'El alumno no se encuentra en chequeo.'
  if (categoria === 'chequeoSubFase' && !apto) return 'El alumno debe ser apto para realizar el chequeo de subfase.'
  if (categoria === 'Complementacion' && !apto && estado !== 'En Complementación') {
    return 'El alumno debe ser apto o realizar complementaciones de subfase.'
  }
  return null
}

function erroresDeNotas(pares: { idManiobra: number; notaMin: string; nota: string }[]): string[] {
  const noDirbe = pares.filter((par) => !/^[DIRBE]$/.test(par.nota)).map((par) => par.idManiobra)
  const incorrectas = pares.filter((par) => INVALIDAS.has(`${par.notaMin}${par.nota}`)).map((par) => par.idManiobra)
  const mensajes: string[] = []
  if (noDirbe.length > 0) mensajes.push(`Las notas con id: ${noDirbe.join(' ')} no utilizan el sistema de calificación.`)
  if (incorrectas.length > 0) mensajes.push(`La nota de las maniobras con id: ${incorrectas.join(' ')} no son correctas.`)
  return mensajes
}

function erroresBajoEstandar(cuerpo: CuerpoEvaluacion, notasMinimas: string[]): string[] {
  return (cuerpo.calificaciones ?? []).flatMap((calificacion, indice) => {
    if (!esBajoEstandar(notasMinimas[indice] ?? '', texto(calificacion.nota).toUpperCase())) return []
    const faltantes: string[] = []
    if (texto(calificacion.causa).trim() === '') {
      faltantes.push(`'calificaciones[${indice}].causa': La causa es requerida para calificaciones bajo el estándar.`)
    }
    if (texto(calificacion.observacion).trim() === '') {
      faltantes.push(
        `'calificaciones[${indice}].observacion': La observación es requerida para calificaciones bajo el estándar.`,
      )
    }
    if (texto(calificacion.recomendacion).trim() === '') {
      faltantes.push(
        `'calificaciones[${indice}].recomendacion': La recomendación es requerida para calificaciones bajo el estándar.`,
      )
    }
    return faltantes
  })
}

function calcular(categoria: string, pares: string[]): { clasificacion: string; promedio: string | null } {
  const bajas = pares.some((par) => esBajoEstandar(par[0] ?? '', par[1] ?? ''))
  if (!esProgramada(categoria)) return { clasificacion: bajas ? 'Malo' : 'Bueno', promedio: null }
  const cuenta = (valores: string[]) => pares.filter((par) => valores.includes(par)).length
  const subI = cuenta(['RI', 'BI'])
  const subR = cuenta(['BR'])
  const postR = cuenta(['IR'])
  const postB = cuenta(['RB'])
  const postE = cuenta(['BE'])
  let clasificacion = 'Bueno'
  if (subI > 0 || subR >= 5) clasificacion = 'Malo'
  else if (subR === 4) clasificacion = 'Regular'
  else if (subR >= 1) clasificacion = 'Bueno'
  else if (postE >= 5) clasificacion = 'Excelente'
  const base = { Malo: 12, Regular: 15, Bueno: 17, Excelente: 20 }[clasificacion] ?? 12
  const total = clasificacion === 'Malo' ? base : base - 0.5 * subR + 0.6 * (postR + postB)
  const todasD = pares.every((par) => par === 'DD')
  return { clasificacion, promedio: todasD || total > 20 ? '20.0' : total.toFixed(1) }
}

function calificacionesDesde(
  codigo: string,
  cuerpo: CuerpoEvaluacion,
  notasMinimas: string[],
  idsManiobra: number[],
): CalificacionMock[] {
  return (cuerpo.calificaciones ?? []).map((calificacion, indice) => {
    const idManiobra = idsManiobra[indice] ?? Number(calificacion.idManiobra)
    const notaMin = notasMinimas[indice] ?? ''
    return {
      codEvaluacion: codigo,
      idManiobra,
      notaMin,
      nota: notaMin === 'D' ? 'D' : texto(calificacion.nota).toUpperCase(),
      causa: opcional(calificacion.causa),
      observacion: opcional(calificacion.observacion),
      recomendacion: opcional(calificacion.recomendacion),
      maniobra: datos().maniobras.find((maniobra) => maniobra.id === idManiobra) ?? {
        id: idManiobra,
        nombre: `Maniobra ${idManiobra}`,
        descripcion: '',
      },
    }
  })
}

function guardada(evaluacion: EvaluacionMock, codEvaluador: string | null) {
  return HttpResponse.json(
    { mensaje: 'Evaluación guardada con éxito.', 'evaluación': { ...evaluacion, codEvaluador } },
    { status: 201 },
  )
}

export const handlersEvaluaciones = [
  http.get(`${API}/api/evaluaciones/filter/persona/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const programa: ProgramaMock = (url.searchParams.get('nombre') ?? 'pdi').toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
    const idSubfase = Number(url.searchParams.get('idSubfase') ?? 0)
    const clasificacion = url.searchParams.get('clasificacion') ?? ''
    const filtradas = datos().evaluaciones.filter(
      (evaluacion) =>
        evaluacion.codPersona === String(params.cod) &&
        evaluacion.programa === programa &&
        (idSubfase === 0 || evaluacion.idSubFase === idSubfase) &&
        (!CLASIFICACIONES.includes(clasificacion) || evaluacion.clasificacion === clasificacion),
    )
    return paginar(filtradas, url, { nombreLista: 'evaluaciones', propiedadPorDefecto: 'codigo', proyectar: resumen })
  }),
  http.get(`${API}/api/evaluaciones/persona/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const prefijo = `${String(params.cod)}-${url.searchParams.get('idTurno') ?? '0'}`
    const filtradas = datos().evaluaciones.filter((evaluacion) => evaluacion.codigo.startsWith(prefijo))
    return paginar(filtradas, url, { nombreLista: 'evaluaciones', propiedadPorDefecto: 'codigo', proyectar: resumen })
  }),
  http.get(`${API}/api/evaluaciones/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const evaluacion = datos().evaluaciones.find((candidata) => candidata.codigo === String(params.cod))
    if (!evaluacion) return textoNoEncontrado('Evaluación especificada no existe.')
    return HttpResponse.json(evaluacion)
  }),
  http.post(`${API}/api/evaluaciones/turno/:id/persona/:cod`, async ({ request, params }) => {
    const usuario = autorizar(request, 'Write')
    if (usuario instanceof Response) return usuario
    const cuerpo = (await request.json()) as CuerpoEvaluacion
    const errores = validarCampos(cuerpo)
    if (errores.length > 0) return HttpResponse.json(errores, { status: 400 })
    const categoria = texto(cuerpo.categoria)
    const idTurno = Number(params.id)
    const codAlumno = String(params.cod)
    const turno = datos().turnos.find((candidato) => candidato.id === idTurno)
    const programada = esProgramada(categoria)
    if (programada && turno?.codInstructor !== usuario.codPersona) {
      return mensaje(403, 'Solo el instructor asignado al turno puede registrar esta evaluación.')
    }
    const codEvaluador = texto(cuerpo.codEvaluador)
    if (!programada && codEvaluador.length !== 6) return mensaje(400, 'Instructor requerido para evaluación no programada.')
    if (programada && datos().evaluaciones.some((evaluacion) => evaluacion.codigo === `${codAlumno}-${idTurno}`)) {
      return mensaje(403, 'La evaluación ya ha sido registrada.')
    }
    const alumno = buscarPersona(codAlumno)
    if (!alumno) return textoNoEncontrado('Alumno especificada no existe.')
    const rechazoEstado = comprobarEstado(categoria, alumno.estado)
    if (rechazoEstado) return mensaje(400, rechazoEstado)
    if (!turno) return textoNoEncontrado('Turno especificada no existe.')
    const calificaciones = cuerpo.calificaciones ?? []
    if (turno.maniobras.length !== calificaciones.length) return mensaje(400, 'Todas las notas son requeridas.')
    const notasMinimas = turno.maniobras.map((item) => item.notaMin)
    const pares = calificaciones.map((calificacion, indice) => ({
      idManiobra: Number(calificacion.idManiobra),
      notaMin: notasMinimas[indice] ?? '',
      nota: notasMinimas[indice] === 'D' ? 'D' : texto(calificacion.nota).toUpperCase(),
    }))
    const erroresNotas = erroresDeNotas(pares)
    if (erroresNotas.length > 0) return mensaje(400, erroresNotas)
    const faltantes = erroresBajoEstandar(cuerpo, notasMinimas)
    if (faltantes.length > 0) return HttpResponse.json(faltantes, { status: 400 })
    const evaluador = buscarPersona(programada ? (turno.codInstructor ?? '') : codEvaluador)
    if (!evaluador) return textoNoEncontrado('Evaluador especificada no existe.')
    let codigo = `${codAlumno}-${idTurno}`
    if (!programada) {
      alumno.contEval += 1
      codigo = `${codigo}-${alumno.contEval}`
    }
    const resultado = calcular(
      categoria,
      pares.map((par) => `${par.notaMin}${par.nota}`),
    )
    const evaluacion: EvaluacionMock = {
      codigo,
      nombre: texto(cuerpo.nombre),
      fecha: hoyIso(),
      programa: turno.programa,
      categoria: CATEGORIAS[categoria] ?? categoria,
      clasificacion: resultado.clasificacion,
      promedio: resultado.promedio,
      recomendacion: opcional(cuerpo.recomendacion),
      archivoUrl: opcional(cuerpo.url),
      idSubFase: turno.idSubfase,
      fase: turno.fase,
      subFase: turno.subfase,
      estadoAlumno: alumno.estado,
      codEvalPrevia: alumno.codEvalRealizada,
      codEvaluador: null,
      evaluador: nombreCorto(evaluador),
      codPersona: codAlumno,
      alumno: nombreCorto(alumno),
      calificaciones: calificacionesDesde(
        codigo,
        cuerpo,
        notasMinimas,
        turno.maniobras.map((item) => item.idManiobra),
      ),
    }
    alumno.codEvalRealizada = codigo
    datos().evaluaciones.push(evaluacion)
    return guardada(evaluacion, evaluador.codigo)
  }),
  http.put(`${API}/api/evaluaciones/:cod`, async ({ request, params }) => {
    const usuario = autorizar(request, 'Modify Evaluations')
    if (usuario instanceof Response) return usuario
    const cuerpo = (await request.json()) as CuerpoEvaluacion
    const errores = validarCampos(cuerpo)
    if (errores.length > 0) return HttpResponse.json(errores, { status: 400 })
    const codigo = String(params.cod)
    const alumno = buscarPersona(codigo.slice(0, 6))
    if (!alumno) return textoNoEncontrado('Alumno especificada no existe.')
    if (alumno.codEvalRealizada !== codigo) return mensaje(403, MENSAJE_ULTIMA)
    const categoria = texto(cuerpo.categoria)
    const codEvaluador = texto(cuerpo.codEvaluador)
    if (!esProgramada(categoria) && codEvaluador.length !== 6) {
      return mensaje(400, 'Instructor requerido para evaluación no programada.')
    }
    const evaluacion = datos().evaluaciones.find((candidata) => candidata.codigo === codigo)
    if (!evaluacion) return textoNoEncontrado('Evaluación especificada no existe.')
    const rechazoEstado = comprobarEstado(categoria, evaluacion.estadoAlumno)
    if (rechazoEstado) return mensaje(400, rechazoEstado)
    const calificaciones = cuerpo.calificaciones ?? []
    if (evaluacion.calificaciones.length !== calificaciones.length) return mensaje(400, 'Todas las notas son requeridas.')
    const notasMinimas = evaluacion.calificaciones.map((calificacion) => calificacion.notaMin)
    const pares = calificaciones.map((calificacion, indice) => ({
      idManiobra: Number(calificacion.idManiobra),
      notaMin: notasMinimas[indice] ?? '',
      nota: notasMinimas[indice] === 'D' ? 'D' : texto(calificacion.nota).toUpperCase(),
    }))
    const erroresNotas = erroresDeNotas(pares)
    if (erroresNotas.length > 0) return mensaje(400, erroresNotas)
    const faltantes = erroresBajoEstandar(cuerpo, notasMinimas)
    if (faltantes.length > 0) return HttpResponse.json(faltantes, { status: 400 })
    if (!esProgramada(categoria)) {
      const evaluador = buscarPersona(codEvaluador)
      if (!evaluador) return textoNoEncontrado('Evaluador especificada no existe.')
      evaluacion.evaluador = nombreCorto(evaluador)
    }
    const resultado = calcular(
      categoria,
      pares.map((par) => `${par.notaMin}${par.nota}`),
    )
    Object.assign(evaluacion, {
      nombre: texto(cuerpo.nombre),
      categoria: CATEGORIAS[categoria] ?? categoria,
      recomendacion: opcional(cuerpo.recomendacion),
      archivoUrl: opcional(cuerpo.url),
      fecha: hoyIso(),
      clasificacion: resultado.clasificacion,
      promedio: resultado.promedio,
      calificaciones: calificacionesDesde(
        codigo,
        cuerpo,
        notasMinimas,
        evaluacion.calificaciones.map((calificacion) => calificacion.idManiobra),
      ),
    })
    return guardada(evaluacion, null)
  }),
  http.delete(`${API}/api/evaluaciones/:cod`, ({ request, params }) => {
    const usuario = autorizar(request, 'Modify Evaluations')
    if (usuario instanceof Response) return usuario
    const codigo = String(params.cod)
    const evaluacion = datos().evaluaciones.find((candidata) => candidata.codigo === codigo)
    if (!evaluacion) return textoNoEncontrado('Evaluación especificada no existe.')
    const alumno = buscarPersona(evaluacion.codPersona)
    if (!alumno || alumno.codEvalRealizada !== codigo) return mensaje(403, MENSAJE_ULTIMA)
    alumno.codEvalRealizada = evaluacion.codEvalPrevia
    datos().evaluaciones = datos().evaluaciones.filter((candidata) => candidata.codigo !== codigo)
    return HttpResponse.text('Evaluación eliminado con éxito.')
  }),
]

import { http, HttpResponse } from 'msw'
import { esFechaIso, esHora, momento } from '@/lib/dominio/calendario'
import { normalizarRespuesta } from '@/lib/dominio/aprendizaje'
import {
  estadoDeVentana,
  exigeTurnoOrigen,
  minutosEntre,
  PUNTAJE_TOTAL_EXAMEN,
  TIPOS_EXAMEN,
  VENTANA_MINIMA_MINUTOS,
} from '@/lib/dominio/teoria'
import {
  API,
  autorizar,
  erroresDeCampo,
  paginar,
  texto,
  textoEliminado,
  textoNoEncontrado,
} from './comun'
import {
  alternativasDePregunta,
  alumnosDeGrupo,
  alumnosHabilitados,
  bloqueadoPorSubsanacion,
  buscarMateria,
  buscarPersona,
  buscarPregunta,
  buscarTurnoTeorico,
  cuestionarioDe,
  datos,
  nombreCompleto,
  preguntasDelTurno,
  siguienteId,
} from './datos'
import { D2_PREGUNTA_NO_EXISTE, D4_MATERIA_NO_EXISTE } from './preguntas'
import { minimoAplicado, type CuestionarioMock, type TipoExamenMock, type TurnoTeoricoMock } from './semilla-teoria'

export const D5_SIN_TURNOS = 'No existen turnos teóricos disponibles.'
export const D6_TURNO_NO_EXISTE = 'Turno teórico especificada no existe.'
export const D7_VENTANA_COMENZADA = 'El turno teórico ya no se puede modificar: su ventana comenzó.'
export const D19_TURNO_ELIMINADO = 'Turno teórico eliminado con éxito.'
export const D22_TURNO_GUARDADO = 'Turno teórico guardado con éxito.'
export const D26_GRUPO_NO_EXISTE = 'Grupo especificada no existe.'
export const D28_SIN_GRUPOS = 'No existen grupos disponibles.'

const TIPOS: readonly TipoExamenMock[] = TIPOS_EXAMEN.map((tipo) => tipo.valor)

type PreguntaEnviada = { idPregunta?: unknown; puntajeMaximo?: unknown }

type CuerpoTurno = {
  nombre?: unknown
  programa?: unknown
  idMateria?: unknown
  tipoExamen?: unknown
  fechaExamen?: unknown
  horaInicio?: unknown
  horaFin?: unknown
  idGrupo?: unknown
  idTurnoOrigen?: unknown
  preguntas?: unknown
}

export function estadoDelTurno(turno: TurnoTeoricoMock) {
  return estadoDeVentana(turno.fechaExamen, turno.horaInicio, turno.horaFin)
}

export function respuestaEsperada(idPregunta: number): string {
  return alternativasDePregunta(idPregunta).find((alternativa) => alternativa.correcto)?.respuesta ?? ''
}

// El contrato §4.4 punto 1 califica OPCION_MULTIPLE y VERDADERO_FALSO comparando el **id** de
// la alternativa, no su texto. Comparar texto normalizado marcaba como correcta cualquiera de
// dos alternativas que difirieran solo en tildes o mayúsculas — y §2.3 permite ese par, porque
// su regla de unicidad ignora mayúsculas y espacios pero no tildes. COMPLETAR sí compara texto
// normalizado, que es lo que §4.4 punto 2 pide.
function esCorrecta(idPregunta: number, guardada: string): boolean {
  if (guardada.trim() === '') return false
  if (buscarPregunta(idPregunta)?.tipoPregunta === 'COMPLETAR')
    return normalizarRespuesta(guardada) === normalizarRespuesta(respuestaEsperada(idPregunta))
  const correcta = alternativasDePregunta(idPregunta).find((alternativa) => alternativa.correcto)
  return correcta !== undefined && String(correcta.id) === guardada.trim()
}

function respuestaDada(idPregunta: number, guardada: string): string | null {
  if (guardada.trim() === '') return null
  const pregunta = buscarPregunta(idPregunta)
  if (pregunta?.tipoPregunta === 'COMPLETAR') return guardada
  return alternativasDePregunta(idPregunta).find((alternativa) => String(alternativa.id) === guardada)?.respuesta ?? null
}

export function calificar(cuestionario: CuestionarioMock, fechaEntrega: string, horaEntrega: string) {
  const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
  if (!turno) return
  const materia = buscarMateria(turno.idMateria)
  cuestionario.calificaciones = preguntasDelTurno(turno.id).map((fila) => {
    const esperada = respuestaEsperada(fila.idPregunta)
    const dada = respuestaDada(fila.idPregunta, cuestionario.respuestas[fila.idPregunta] ?? '')
    const correcto = esCorrecta(fila.idPregunta, cuestionario.respuestas[fila.idPregunta] ?? '')
    return {
      idPregunta: fila.idPregunta,
      orden: fila.orden,
      enunciado: buscarPregunta(fila.idPregunta)?.enunciado ?? '',
      respuestaCorrecta: esperada,
      respuestaAlumno: dada,
      correcto,
      puntajeMaximo: fila.puntajeMaximo,
      puntajeObtenido: correcto ? fila.puntajeMaximo : 0,
    }
  })
  const nota = cuestionario.calificaciones.reduce((total, fila) => total + fila.puntajeObtenido, 0)
  cuestionario.nota = Number(nota.toFixed(2))
  cuestionario.notaMinimaAplicada = minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen)
  cuestionario.aprobado = cuestionario.nota >= cuestionario.notaMinimaAplicada
  cuestionario.estado = 'ENTREGADO'
  cuestionario.fechaEntrega = fechaEntrega
  cuestionario.horaEntrega = horaEntrega
}

export function cerrarExamenesVencidos(idTurnoTeorico?: number) {
  const ahora = new Date()
  for (const cuestionario of datos().cuestionarios) {
    if (cuestionario.estado !== 'EN_CURSO') continue
    if (idTurnoTeorico !== undefined && cuestionario.idTurnoTeorico !== idTurnoTeorico) continue
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    if (!turno || ahora <= momento(turno.fechaExamen, turno.horaFin)) continue
    calificar(cuestionario, turno.fechaExamen, turno.horaFin)
  }
}

function rindieron(turno: TurnoTeoricoMock): CuestionarioMock[] {
  return datos().cuestionarios.filter(
    (cuestionario) => cuestionario.idTurnoTeorico === turno.id && cuestionario.estado === 'ENTREGADO',
  )
}

function filaPublica(turno: TurnoTeoricoMock) {
  const grupo = datos().grupos.find((candidato) => candidato.id === turno.idGrupo)
  return {
    id: turno.id,
    nombre: turno.nombre,
    idMateria: turno.idMateria,
    materia: buscarMateria(turno.idMateria)?.nombre ?? '',
    tipoExamen: turno.tipoExamen,
    fechaExamen: turno.fechaExamen,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    estado: estadoDelTurno(turno),
    idGrupo: turno.idGrupo,
    grupo: grupo?.nombre ?? '',
    programa: grupo?.programa ?? 'PDI',
    codInstructor: turno.codInstructor,
    idTurnoOrigen: turno.idTurnoOrigen,
    cantPreguntas: preguntasDelTurno(turno.id).length,
    cantAlumnos: alumnosHabilitados(turno).length,
    rindieron: rindieron(turno).length,
  }
}

export function detallePublico(turno: TurnoTeoricoMock) {
  const materia = buscarMateria(turno.idMateria)
  const grupo = datos().grupos.find((candidato) => candidato.id === turno.idGrupo)
  const instructor = buscarPersona(turno.codInstructor)
  const origen = turno.idTurnoOrigen === null ? undefined : buscarTurnoTeorico(turno.idTurnoOrigen)
  const habilitados = alumnosHabilitados(turno)
  const entregados = rindieron(turno)
  const notas = entregados.flatMap((cuestionario) => (cuestionario.nota === null ? [] : [cuestionario.nota]))
  return {
    id: turno.id,
    nombre: turno.nombre,
    materia: { id: turno.idMateria, nombre: materia?.nombre ?? '', notaMinima: materia?.notaMinima ?? 0 },
    tipoExamen: turno.tipoExamen,
    notaMinimaAplicada: minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen),
    fechaExamen: turno.fechaExamen,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    estado: estadoDelTurno(turno),
    grupo: { id: turno.idGrupo, nombre: grupo?.nombre ?? '', programa: grupo?.programa ?? 'PDI' },
    instructor: { codigo: turno.codInstructor, nombre: instructor ? nombreCompleto(instructor) : '' },
    turnoOrigen: origen ? { id: origen.id, nombre: origen.nombre, fechaExamen: origen.fechaExamen } : null,
    preguntas: preguntasDelTurno(turno.id).map((fila) => {
      const pregunta = buscarPregunta(fila.idPregunta)
      return {
        idPregunta: fila.idPregunta,
        orden: fila.orden,
        enunciado: pregunta?.enunciado ?? '',
        tipoPregunta: pregunta?.tipoPregunta ?? 'OPCION_MULTIPLE',
        dificultad: pregunta?.dificultad ?? 'MEDIA',
        puntajeMaximo: fila.puntajeMaximo,
      }
    }),
    resultados: habilitados.map((alumno) => {
      const cuestionario = cuestionarioDe(turno.id, alumno.codigo)
      return {
        codAlumno: alumno.codigo,
        alumno: nombreCompleto(alumno),
        estado: cuestionario?.estado ?? 'NO_RINDIO',
        idCuestionario: cuestionario?.id ?? null,
        nota: cuestionario?.nota ?? null,
        aprobado: cuestionario?.aprobado ?? null,
        bloqueadoPorSubsanacion: bloqueadoPorSubsanacion(alumno.codigo),
      }
    }),
    resumen: {
      habilitados: habilitados.length,
      rindieron: entregados.length,
      aprobados: entregados.filter((cuestionario) => cuestionario.aprobado === true).length,
      notaPromedio:
        notas.length === 0 ? null : Number((notas.reduce((total, nota) => total + nota, 0) / notas.length).toFixed(2)),
    },
  }
}

function preguntasDelCuerpo(valor: unknown): PreguntaEnviada[] {
  return Array.isArray(valor) ? (valor as PreguntaEnviada[]) : []
}

function erroresDeForma(cuerpo: CuerpoTurno): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre).trim()
  if (nombre === '') errores.push("'nombre': El nombre es obligatorio")
  else if (nombre.length < 10 || nombre.length > 60) {
    errores.push("'nombre': El nombre debe tener entre 10 y 60 caracteres.")
  }
  if (cuerpo.programa !== 'PDI' && cuerpo.programa !== 'PDE') errores.push("'programa': Ingresar programa válido.")
  if (typeof cuerpo.idMateria !== 'number' || cuerpo.idMateria <= 0) {
    errores.push("'idMateria': La materia es obligatoria.")
  }
  if (!TIPOS.some((tipo) => tipo === cuerpo.tipoExamen)) errores.push("'tipoExamen': Ingresar tipo de examen válido.")
  const fecha = texto(cuerpo.fechaExamen)
  const horaInicio = texto(cuerpo.horaInicio)
  const horaFin = texto(cuerpo.horaFin)
  if (!esFechaIso(fecha)) errores.push("'fechaExamen': La fecha del examen es obligatoria.")
  if (!esHora(horaInicio)) errores.push("'horaInicio': La hora de inicio es obligatoria.")
  if (!esHora(horaFin)) errores.push("'horaFin': La hora de fin es obligatoria.")
  if (esFechaIso(fecha) && esHora(horaInicio) && momento(fecha, horaInicio) <= new Date()) {
    errores.push("'fechaExamen': El examen debe comenzar en el futuro.")
  }
  if (esHora(horaInicio) && esHora(horaFin) && minutosEntre(horaInicio, horaFin) < VENTANA_MINIMA_MINUTOS) {
    errores.push("'horaFin': La ventana del examen debe durar al menos 10 minutos.")
  }
  if (typeof cuerpo.idGrupo !== 'number' || cuerpo.idGrupo <= 0) errores.push("'idGrupo': El grupo es obligatorio.")
  const conOrigen = exigeTurnoOrigen(texto(cuerpo.tipoExamen))
  const idOrigen = cuerpo.idTurnoOrigen
  if (conOrigen && (typeof idOrigen !== 'number' || idOrigen <= 0)) {
    errores.push("'idTurnoOrigen': El turno de origen es obligatorio para una subsanación o un rezagado.")
  }
  if (!conOrigen && typeof idOrigen === 'number') {
    errores.push("'idTurnoOrigen': El turno de origen solo se indica en una subsanación o un rezagado.")
  }
  const preguntas = preguntasDelCuerpo(cuerpo.preguntas)
  if (preguntas.length === 0) errores.push("'preguntas': Debe elegir al menos una pregunta.")
  else {
    const ids = preguntas.map((pregunta) => Number(pregunta.idPregunta))
    if (new Set(ids).size !== ids.length) errores.push("'preguntas': No se puede repetir una pregunta.")
  }
  preguntas.forEach((pregunta, indice) => {
    const puntaje = pregunta.puntajeMaximo
    if (typeof puntaje !== 'number' || !Number.isInteger(puntaje) || puntaje < 1 || puntaje > PUNTAJE_TOTAL_EXAMEN) {
      errores.push(`'preguntas[${indice}].puntajeMaximo': El puntaje debe ser un entero entre 1 y 20.`)
    }
  })
  if (
    preguntas.length > 0 &&
    preguntas.reduce((total, pregunta) => total + Number(pregunta.puntajeMaximo ?? 0), 0) !== PUNTAJE_TOTAL_EXAMEN
  ) {
    errores.push("'preguntas': Los puntajes de las preguntas deben sumar 20.")
  }
  return errores
}

function gruposDelInstructor(codInstructor: string): number[] {
  const codigos = datos()
    .turnos.filter((turno) => turno.codInstructor === codInstructor)
    .flatMap((turno) => turno.alumnos.map((alumno) => alumno.codAlumno))
  const ids = codigos.flatMap((codigo) => {
    const idGrupo = buscarPersona(codigo)?.idGrupo
    return idGrupo === null || idGrupo === undefined ? [] : [idGrupo]
  })
  return [...new Set(ids)]
}

function erroresDeCruce(cuerpo: CuerpoTurno, codInstructor: string, todosLosGrupos: boolean): string[] {
  const errores: string[] = []
  const grupo = datos().grupos.find((candidato) => candidato.id === Number(cuerpo.idGrupo))
  if (!grupo) return errores
  if (alumnosDeGrupo(grupo.id).length === 0) errores.push("'idGrupo': El grupo no tiene alumnos.")
  if (grupo.programa !== cuerpo.programa) errores.push("'programa': El programa no corresponde al grupo.")
  // El campo es `idGrupo` y no `codInstructor`, y no es cosmético: el formulario no tiene un campo
  // de instructor —lo resuelve el servidor—, así que el error no tenía dónde pintarse y el usuario
  // veía un 400 sin mensaje. `idGrupo` es el selector que sí puede corregir.
  if (!todosLosGrupos && !gruposDelInstructor(codInstructor).includes(grupo.id)) {
    errores.push("'idGrupo': El grupo no corresponde al instructor.")
  }
  const origen = typeof cuerpo.idTurnoOrigen === 'number' ? buscarTurnoTeorico(cuerpo.idTurnoOrigen) : undefined
  if (origen) {
    if (estadoDelTurno(origen) !== 'FINALIZADO' || origen.idMateria !== cuerpo.idMateria || origen.idGrupo !== grupo.id) {
      errores.push("'idTurnoOrigen': El turno de origen debe ser un turno finalizado de la misma materia y grupo.")
    } else {
      const candidatos = alumnosDeGrupo(origen.idGrupo).filter((alumno) => {
        const cuestionario = cuestionarioDe(origen.id, alumno.codigo)
        return cuerpo.tipoExamen === 'SUBSANACION' ? cuestionario?.aprobado === false : cuestionario === undefined
      })
      if (candidatos.length === 0) {
        errores.push("'idTurnoOrigen': Ningún alumno del turno de origen corresponde a este tipo de examen.")
      }
    }
  }
  const preguntas = preguntasDelCuerpo(cuerpo.preguntas)
  if (preguntas.some((pregunta) => buscarPregunta(Number(pregunta.idPregunta))?.idMateria !== cuerpo.idMateria)) {
    errores.push("'preguntas': Todas las preguntas deben ser de la materia del turno.")
  }
  return errores
}

function noEncontrados(cuerpo: CuerpoTurno): Response | null {
  if (!buscarMateria(Number(cuerpo.idMateria))) return textoNoEncontrado(D4_MATERIA_NO_EXISTE)
  if (!datos().grupos.some((grupo) => grupo.id === Number(cuerpo.idGrupo))) return textoNoEncontrado(D26_GRUPO_NO_EXISTE)
  if (typeof cuerpo.idTurnoOrigen === 'number' && !buscarTurnoTeorico(cuerpo.idTurnoOrigen)) {
    return textoNoEncontrado(D6_TURNO_NO_EXISTE)
  }
  if (preguntasDelCuerpo(cuerpo.preguntas).some((pregunta) => !buscarPregunta(Number(pregunta.idPregunta)))) {
    return textoNoEncontrado(D2_PREGUNTA_NO_EXISTE)
  }
  return null
}

function guardarPreguntas(idTurnoTeorico: number, cuerpo: CuerpoTurno) {
  datos().preguntasTurno = datos().preguntasTurno.filter((fila) => fila.idTurnoTeorico !== idTurnoTeorico)
  preguntasDelCuerpo(cuerpo.preguntas).forEach((pregunta, indice) => {
    datos().preguntasTurno.push({
      idTurnoTeorico,
      idPregunta: Number(pregunta.idPregunta),
      orden: indice + 1,
      puntajeMaximo: Number(pregunta.puntajeMaximo),
    })
  })
}

function aplicar(turno: TurnoTeoricoMock, cuerpo: CuerpoTurno, codInstructor: string) {
  turno.nombre = texto(cuerpo.nombre).trim()
  turno.idMateria = Number(cuerpo.idMateria)
  turno.tipoExamen = TIPOS.find((tipo) => tipo === cuerpo.tipoExamen) ?? turno.tipoExamen
  turno.fechaExamen = texto(cuerpo.fechaExamen)
  turno.horaInicio = texto(cuerpo.horaInicio)
  turno.horaFin = texto(cuerpo.horaFin)
  turno.idGrupo = Number(cuerpo.idGrupo)
  // Al revés que en preguntas, y a propósito: acá el instructor del turno pasa a ser quien lo
  // modifica, porque es la regla que el servidor tenía escrita antes de la 51 y se tradujo fiel.
  turno.codInstructor = codInstructor
  turno.idTurnoOrigen = typeof cuerpo.idTurnoOrigen === 'number' ? cuerpo.idTurnoOrigen : null
  guardarPreguntas(turno.id, cuerpo)
}

function filtrados(url: URL) {
  const idGrupo = Number(url.searchParams.get('idGrupo'))
  const idMateria = Number(url.searchParams.get('idMateria'))
  const estado = url.searchParams.get('estado')
  const tipoExamen = url.searchParams.get('tipoExamen')
  const codInstructor = url.searchParams.get('codInstructor')
  const fechaPre = url.searchParams.get('fechaPre')
  const fechaPost = url.searchParams.get('fechaPost')
  return datos()
    .turnosTeoricos.filter((turno) => (idGrupo > 0 ? turno.idGrupo === idGrupo : true))
    .filter((turno) => (idMateria > 0 ? turno.idMateria === idMateria : true))
    .filter((turno) => (estado === null ? true : estadoDelTurno(turno) === estado))
    .filter((turno) => (tipoExamen === null ? true : turno.tipoExamen === tipoExamen))
    .filter((turno) => (codInstructor === null ? true : turno.codInstructor === codInstructor))
    .filter((turno) => (fechaPre === null ? true : turno.fechaExamen >= fechaPre))
    .filter((turno) => (fechaPost === null ? true : turno.fechaExamen <= fechaPost))
    .map(filaPublica)
}

export const handlersTurnosTeoricos = [
  http.get(`${API}/api/turnos-teoricos/grupos`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const programa = url.searchParams.get('programa')
    if (programa !== 'PDI' && programa !== 'PDE') {
      return erroresDeCampo(["'programa': Ingresar programa válido."])
    }
    // La escotilla de `Manage Groups` decide sola: antes hacía falta ADEMÁS omitir el parámetro, y
    // ahora no hay parámetro que omitir. Es lo que mantiene la ruta usable para el Administrador
    // Web, cuya persona no programa turnos y por tanto no alcanza ningún grupo.
    const todosLosGrupos = !(autorizar(request, 'Manage Groups') instanceof Response)
    const alcanzables = todosLosGrupos ? null : gruposDelInstructor(permitido.codPersona)
    const grupos = datos()
      .grupos.filter((grupo) => grupo.programa === programa)
      .filter((grupo) => alumnosDeGrupo(grupo.id).length > 0)
      .filter((grupo) => alcanzables === null || alcanzables.includes(grupo.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
      .map((grupo) => ({
        id: grupo.id,
        nombre: grupo.nombre,
        programa: grupo.programa,
        cantAlumnos: alumnosDeGrupo(grupo.id).length,
      }))
    if (grupos.length === 0) return textoNoEncontrado(D28_SIN_GRUPOS)
    return HttpResponse.json(grupos)
  }),
  http.get(`${API}/api/turnos-teoricos`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    return paginar(filtrados(url), url, { nombreLista: 'turnos teóricos', propiedadPorDefecto: 'fechaExamen' })
  }),
  http.post(`${API}/api/turnos-teoricos`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoTurno
    const forma = erroresDeForma(cuerpo)
    if (forma.length > 0) return erroresDeCampo(forma)
    const faltante = noEncontrados(cuerpo)
    if (faltante) return faltante
    const cruce = erroresDeCruce(cuerpo, permitido.codPersona, !(autorizar(request, 'Manage Groups') instanceof Response))
    if (cruce.length > 0) return erroresDeCampo(cruce)
    const turno: TurnoTeoricoMock = {
      id: siguienteId('turnoTeorico'),
      nombre: '',
      idMateria: 0,
      tipoExamen: 'TEST',
      fechaExamen: '',
      horaInicio: '',
      horaFin: '',
      idGrupo: 0,
      codInstructor: '',
      idTurnoOrigen: null,
    }
    datos().turnosTeoricos.push(turno)
    aplicar(turno, cuerpo, permitido.codPersona)
    return HttpResponse.json({ mensaje: D22_TURNO_GUARDADO, turnoTeorico: detallePublico(turno) }, { status: 201 })
  }),
  http.get(`${API}/api/turnos-teoricos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    cerrarExamenesVencidos(turno.id)
    return HttpResponse.json(detallePublico(turno))
  }),
  http.put(`${API}/api/turnos-teoricos/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    if (estadoDelTurno(turno) !== 'PROGRAMADO') return HttpResponse.text(D7_VENTANA_COMENZADA, { status: 409 })
    const cuerpo = (await request.json()) as CuerpoTurno
    const forma = erroresDeForma(cuerpo)
    if (forma.length > 0) return erroresDeCampo(forma)
    const faltante = noEncontrados(cuerpo)
    if (faltante) return faltante
    const cruce = erroresDeCruce(cuerpo, permitido.codPersona, !(autorizar(request, 'Manage Groups') instanceof Response))
    if (cruce.length > 0) return erroresDeCampo(cruce)
    aplicar(turno, cuerpo, permitido.codPersona)
    return HttpResponse.json({ mensaje: D22_TURNO_GUARDADO, turnoTeorico: detallePublico(turno) }, { status: 201 })
  }),
  http.delete(`${API}/api/turnos-teoricos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    if (estadoDelTurno(turno) !== 'PROGRAMADO') return HttpResponse.text(D7_VENTANA_COMENZADA, { status: 409 })
    datos().turnosTeoricos = datos().turnosTeoricos.filter((candidato) => candidato.id !== turno.id)
    datos().preguntasTurno = datos().preguntasTurno.filter((fila) => fila.idTurnoTeorico !== turno.id)
    return textoEliminado('Turno teórico')
  }),
]

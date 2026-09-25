import { http, HttpResponse } from 'msw'
import { aFechaIso, momento } from '@/lib/dominio/calendario'
import { API, autorizar, erroresDeCampo, texto, textoNoEncontrado, textoProhibido } from './comun'
import {
  alternativasDePregunta,
  alumnosHabilitados,
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
import { minimoAplicado, type CuestionarioMock, type TurnoTeoricoMock } from './semilla-teoria'
import { calificar, cerrarExamenesVencidos, estadoDelTurno, D6_TURNO_NO_EXISTE } from './turnos-teoricos'

export const D8_EXAMEN_NO_DISPONIBLE = 'El examen no está disponible en este momento.'
export const D9_ALUMNO_NO_HABILITADO = 'El alumno no está habilitado para este examen.'
export const D10_EXAMEN_ENTREGADO = 'El examen ya fue entregado.'
export const D11_VENTANA_CERRADA = 'La ventana del examen cerró.'
export const D12_EXAMEN_NO_EXISTE = 'Examen especificada no existe.'
export const D15_SOLO_LO_PROPIO = 'Solo puede consultar sus propios exámenes.'
export const D17_SIN_PENDIENTES = 'No existen exámenes pendientes.'
export const D23_EXAMEN_ENTREGADO_CON_EXITO = 'Examen entregado con éxito.'
export const D25_RESPUESTAS_GUARDADAS = 'Respuestas guardadas.'
export const D27_PERSONA_NO_EXISTE = 'Persona especificada no existe.'

type CuerpoAlumno = { codAlumno?: unknown }

type CuerpoRespuestas = CuerpoAlumno & { respuestas?: unknown }

type RespuestaEnviada = { idPregunta?: unknown; respuesta?: unknown }

function puntajeTotal(turno: TurnoTeoricoMock): number {
  return preguntasDelTurno(turno.id).reduce((total, fila) => total + fila.puntajeMaximo, 0)
}

function enCursoPublico(cuestionario: CuestionarioMock, turno: TurnoTeoricoMock) {
  const materia = buscarMateria(turno.idMateria)
  return {
    id: cuestionario.id,
    idTurnoTeorico: turno.id,
    turnoTeorico: turno.nombre,
    materia: { id: turno.idMateria, nombre: materia?.nombre ?? '', notaMinima: materia?.notaMinima ?? 0 },
    tipoExamen: turno.tipoExamen,
    notaMinimaAplicada: minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen),
    codAlumno: cuestionario.codAlumno,
    estado: cuestionario.estado,
    fechaExamen: turno.fechaExamen,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    puntajeTotal: puntajeTotal(turno),
    preguntas: cuestionario.orden.map((idPregunta, indice) => {
      const pregunta = buscarPregunta(idPregunta)
      const fila = preguntasDelTurno(turno.id).find((candidata) => candidata.idPregunta === idPregunta)
      return {
        idPregunta,
        orden: fila?.orden ?? indice + 1,
        enunciado: pregunta?.enunciado ?? '',
        tipoPregunta: pregunta?.tipoPregunta ?? 'OPCION_MULTIPLE',
        puntajeMaximo: fila?.puntajeMaximo ?? 0,
        alternativas:
          pregunta?.tipoPregunta === 'COMPLETAR'
            ? []
            : alternativasDePregunta(idPregunta).map((alternativa) => ({
                id: alternativa.id,
                respuesta: alternativa.respuesta,
              })),
        respuestaAlumno: cuestionario.respuestas[idPregunta] ?? null,
      }
    }),
  }
}

export function resueltoPublico(cuestionario: CuestionarioMock, conDetalle: boolean) {
  const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
  const materia = turno ? buscarMateria(turno.idMateria) : undefined
  const alumno = buscarPersona(cuestionario.codAlumno)
  return {
    id: cuestionario.id,
    turnoTeorico: {
      id: turno?.id ?? 0,
      nombre: turno?.nombre ?? '',
      estado: turno ? estadoDelTurno(turno) : 'FINALIZADO',
    },
    materia: { id: turno?.idMateria ?? 0, nombre: materia?.nombre ?? '', notaMinima: materia?.notaMinima ?? 0 },
    tipoExamen: turno?.tipoExamen ?? 'TEST',
    notaMinimaAplicada: cuestionario.notaMinimaAplicada,
    codAlumno: cuestionario.codAlumno,
    alumno: alumno ? nombreCompleto(alumno) : '',
    estado: cuestionario.estado,
    fechaExamen: turno?.fechaExamen ?? '',
    horaInicio: turno?.horaInicio ?? '',
    horaFin: turno?.horaFin ?? '',
    fechaEntrega: cuestionario.fechaEntrega,
    horaEntrega: cuestionario.horaEntrega,
    puntajeTotal: turno ? puntajeTotal(turno) : 0,
    nota: cuestionario.nota,
    aprobado: cuestionario.aprobado,
    calificaciones: conDetalle
      ? cuestionario.calificaciones.map((fila) => ({
          ...fila,
          explicacion: buscarPregunta(fila.idPregunta)?.explicacion ?? null,
          tipoPregunta: buscarPregunta(fila.idPregunta)?.tipoPregunta ?? 'OPCION_MULTIPLE',
        }))
      : [],
  }
}

function ventanaCerrada(turno: TurnoTeoricoMock): boolean {
  return new Date() > momento(turno.fechaExamen, turno.horaFin)
}

function horaActual(): string {
  const ahora = new Date()
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
}

function pendientesDe(codAlumno: string) {
  return datos()
    .turnosTeoricos.filter((turno) => alumnosHabilitados(turno).some((alumno) => alumno.codigo === codAlumno))
    .filter((turno) => estadoDelTurno(turno) !== 'FINALIZADO')
    .filter((turno) => cuestionarioDe(turno.id, codAlumno)?.estado !== 'ENTREGADO')
    .sort((a, b) => a.fechaExamen.localeCompare(b.fechaExamen) || a.horaInicio.localeCompare(b.horaInicio))
    .map((turno) => {
      const materia = buscarMateria(turno.idMateria)
      const cuestionario = cuestionarioDe(turno.id, codAlumno)
      return {
        idTurnoTeorico: turno.id,
        nombre: turno.nombre,
        idMateria: turno.idMateria,
        materia: materia?.nombre ?? '',
        notaMinimaAplicada: minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen),
        tipoExamen: turno.tipoExamen,
        fechaExamen: turno.fechaExamen,
        horaInicio: turno.horaInicio,
        horaFin: turno.horaFin,
        estado: estadoDelTurno(turno),
        cantPreguntas: preguntasDelTurno(turno.id).length,
        idCuestionario: cuestionario?.id ?? null,
        estadoRendicion: cuestionario?.estado ?? 'NO_RINDIO',
      }
    })
}

export const handlersCuestionariosTeoria = [
  http.get(`${API}/api/examenes/pendientes`, ({ request }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const codAlumno = new URL(request.url).searchParams.get('codAlumno') ?? ''
    if (!buscarPersona(codAlumno)) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    cerrarExamenesVencidos()
    const pendientes = pendientesDe(codAlumno)
    if (pendientes.length === 0) return textoNoEncontrado(D17_SIN_PENDIENTES)
    return HttpResponse.json(pendientes)
  }),
  http.post(`${API}/api/turnos-teoricos/:id/iniciar`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    const cuerpo = (await request.json()) as CuerpoAlumno
    const codAlumno = texto(cuerpo.codAlumno)
    if (codAlumno === '') return erroresDeCampo(["'codAlumno': El código del alumno es obligatorio."])
    if (!buscarPersona(codAlumno)) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    if (!alumnosHabilitados(turno).some((alumno) => alumno.codigo === codAlumno)) {
      return textoProhibido(D9_ALUMNO_NO_HABILITADO)
    }
    const existente = cuestionarioDe(turno.id, codAlumno)
    if (existente?.estado === 'ENTREGADO') return HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 })
    if (estadoDelTurno(turno) !== 'EN_CURSO') return HttpResponse.text(D8_EXAMEN_NO_DISPONIBLE, { status: 409 })
    if (existente) return HttpResponse.json(enCursoPublico(existente, turno))
    const materia = buscarMateria(turno.idMateria)
    const cuestionario: CuestionarioMock = {
      id: siguienteId('cuestionario'),
      idTurnoTeorico: turno.id,
      codAlumno,
      estado: 'EN_CURSO',
      fechaEntrega: null,
      horaEntrega: null,
      nota: null,
      notaMinimaAplicada: minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen),
      aprobado: null,
      orden: preguntasDelTurno(turno.id).map((fila) => fila.idPregunta),
      respuestas: {},
      calificaciones: [],
    }
    datos().cuestionarios.push(cuestionario)
    return HttpResponse.json(enCursoPublico(cuestionario, turno), { status: 201 })
  }),
  http.get(`${API}/api/turnos-teoricos/:id/mi-cuestionario`, ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    const codAlumno = new URL(request.url).searchParams.get('codAlumno') ?? ''
    if (permitido.codPersona !== codAlumno) return textoProhibido(D15_SOLO_LO_PROPIO)
    cerrarExamenesVencidos(turno.id)
    const cuestionario = cuestionarioDe(turno.id, codAlumno)
    if (!cuestionario) return textoNoEncontrado(D12_EXAMEN_NO_EXISTE)
    return HttpResponse.json(resueltoPublico(cuestionario, estadoDelTurno(turno) === 'FINALIZADO'))
  }),
  http.put(`${API}/api/cuestionarios/:id/respuestas`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const cuestionario = datos().cuestionarios.find((candidato) => candidato.id === Number(params.id))
    if (!cuestionario) return textoNoEncontrado(D12_EXAMEN_NO_EXISTE)
    const cuerpo = (await request.json()) as CuerpoRespuestas
    const codAlumno = texto(cuerpo.codAlumno)
    const errores: string[] = []
    if (codAlumno === '') errores.push("'codAlumno': El código del alumno es obligatorio.")
    if (!Array.isArray(cuerpo.respuestas)) errores.push("'respuestas': Las respuestas son obligatorias.")
    if (errores.length > 0) return erroresDeCampo(errores)
    if (cuestionario.codAlumno !== codAlumno) return textoProhibido(D15_SOLO_LO_PROPIO)
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    if (turno && ventanaCerrada(turno)) {
      cerrarExamenesVencidos(turno.id)
      return HttpResponse.text(D11_VENTANA_CERRADA, { status: 409 })
    }
    if (cuestionario.estado === 'ENTREGADO') return HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 })
    const enviadas = cuerpo.respuestas as RespuestaEnviada[]
    const problemas: string[] = []
    const vistas = new Set<number>()
    enviadas.forEach((fila, indice) => {
      const idPregunta = Number(fila.idPregunta)
      if (!cuestionario.orden.includes(idPregunta) || vistas.has(idPregunta)) {
        problemas.push(`'respuestas[${indice}].idPregunta': La pregunta no pertenece a este examen.`)
        return
      }
      vistas.add(idPregunta)
      const valor = texto(fila.respuesta)
      if (valor === '') return
      const pregunta = buscarPregunta(idPregunta)
      if (pregunta?.tipoPregunta === 'COMPLETAR') {
        if (valor.length > 200) {
          problemas.push(`'respuestas[${indice}].respuesta': La respuesta no puede superar los 200 caracteres.`)
        }
        return
      }
      if (!alternativasDePregunta(idPregunta).some((alternativa) => String(alternativa.id) === valor)) {
        problemas.push(`'respuestas[${indice}].respuesta': La alternativa no pertenece a esta pregunta.`)
      }
    })
    if (problemas.length > 0) return erroresDeCampo(problemas)
    cuestionario.respuestas = {}
    for (const fila of enviadas) {
      const valor = texto(fila.respuesta)
      if (valor !== '') cuestionario.respuestas[Number(fila.idPregunta)] = valor
    }
    return HttpResponse.json({ mensaje: D25_RESPUESTAS_GUARDADAS, respuestasGuardadas: vistas.size })
  }),
  http.post(`${API}/api/cuestionarios/:id/entregar`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const cuestionario = datos().cuestionarios.find((candidato) => candidato.id === Number(params.id))
    if (!cuestionario) return textoNoEncontrado(D12_EXAMEN_NO_EXISTE)
    const cuerpo = (await request.json()) as CuerpoAlumno
    const codAlumno = texto(cuerpo.codAlumno)
    if (codAlumno === '') return erroresDeCampo(["'codAlumno': El código del alumno es obligatorio."])
    if (cuestionario.codAlumno !== codAlumno) return textoProhibido(D15_SOLO_LO_PROPIO)
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    if (turno && ventanaCerrada(turno)) {
      cerrarExamenesVencidos(turno.id)
      return HttpResponse.text(D11_VENTANA_CERRADA, { status: 409 })
    }
    if (cuestionario.estado === 'ENTREGADO') return HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 })
    calificar(cuestionario, aFechaIso(new Date()), horaActual())
    return HttpResponse.json({
      mensaje: D23_EXAMEN_ENTREGADO_CON_EXITO,
      cuestionario: resueltoPublico(cuestionario, turno !== undefined && estadoDelTurno(turno) === 'FINALIZADO'),
    })
  }),
  http.get(`${API}/api/cuestionarios/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    const conManageExams = !(autorizar(request, 'Manage Exams') instanceof Response)
    if (permitido instanceof Response && !conManageExams) return permitido
    const cuestionario = datos().cuestionarios.find((candidato) => candidato.id === Number(params.id))
    if (!cuestionario) return textoNoEncontrado(D12_EXAMEN_NO_EXISTE)
    const propio = !(permitido instanceof Response) && permitido.codPersona === cuestionario.codAlumno
    if (!propio && !conManageExams) return textoProhibido(D15_SOLO_LO_PROPIO)
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    cerrarExamenesVencidos(cuestionario.idTurnoTeorico)
    const finalizado = turno !== undefined && estadoDelTurno(turno) === 'FINALIZADO'
    return HttpResponse.json(resueltoPublico(cuestionario, conManageExams || finalizado))
  }),
]

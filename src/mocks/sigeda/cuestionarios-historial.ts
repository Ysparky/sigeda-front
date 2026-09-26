import { http, HttpResponse } from 'msw'
import { API, autorizar, numero, textoNoEncontrado, textoProhibido } from './comun'
import { D15_SOLO_LO_PROPIO } from './cuestionarios-teoria'
import { buscarMateria, buscarTurnoTeorico, datos, rolPorId, usuarioDePersona } from './datos'
import type { CuestionarioMock, TurnoTeoricoMock } from './semilla-teoria'
import { estadoDelTurno } from './turnos-teoricos'

export const D14_SIN_EXAMENES = 'No existen exámenes disponibles.'

function subsanadoPor(propio: TurnoTeoricoMock, codAlumno: string) {
  const turno = datos()
    .turnosTeoricos.filter(
      (candidato) =>
        candidato.tipoExamen === 'SUBSANACION' &&
        candidato.id !== propio.id &&
        candidato.idMateria === propio.idMateria &&
        candidato.fechaExamen >= propio.fechaExamen,
    )
    .toSorted((izquierda, derecha) => izquierda.fechaExamen.localeCompare(derecha.fechaExamen))
    .at(0)
  if (!turno) return null
  const suyo = datos().cuestionarios.find(
    (cuestionario) => cuestionario.idTurnoTeorico === turno.id && cuestionario.codAlumno === codAlumno,
  )
  return {
    idTurnoTeorico: turno.id,
    turnoTeorico: turno.nombre,
    fechaExamen: turno.fechaExamen,
    estado: estadoDelTurno(turno),
    nota: suyo?.nota ?? null,
  }
}

function filaDe(cuestionario: CuestionarioMock) {
  const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
  if (!turno) return null
  const origen = turno.idTurnoOrigen === null ? null : buscarTurnoTeorico(turno.idTurnoOrigen)
  return {
    id: cuestionario.id,
    idTurnoTeorico: turno.id,
    turnoTeorico: turno.nombre,
    idMateria: turno.idMateria,
    materia: buscarMateria(turno.idMateria)?.nombre ?? '',
    tipoExamen: turno.tipoExamen,
    fechaExamen: turno.fechaExamen,
    estado: cuestionario.estado,
    fechaEntrega: cuestionario.fechaEntrega,
    horaEntrega: cuestionario.horaEntrega,
    nota: cuestionario.nota,
    notaMinimaAplicada: cuestionario.notaMinimaAplicada,
    aprobado: cuestionario.aprobado,
    idTurnoOrigen: origen?.id ?? null,
    turnoOrigen: origen?.nombre ?? null,
    subsanadoPor: cuestionario.aprobado === false ? subsanadoPor(turno, cuestionario.codAlumno) : null,
  }
}

function paginarExamenes(filas: readonly NonNullable<ReturnType<typeof filaDe>>[], url: URL) {
  const page = numero(url, 'page', 0)
  const size = numero(url, 'size', 6)
  const direccion = (url.searchParams.get('direction') ?? 'DESC').toUpperCase()
  const propiedad = url.searchParams.get('property') ?? 'fechaExamen'
  if (page < 0 || size < 1 || (direccion !== 'ASC' && direccion !== 'DESC')) {
    return HttpResponse.json({ error: 'Argumento incorrecto', mensaje: 'Paginado inválido.' }, { status: 400 })
  }
  if (filas.length > 0 && !(propiedad in filas[0])) {
    return HttpResponse.json(
      {
        error: 'Argumento incorrecto',
        mensaje: `No se encontró atributo '${propiedad}' para ordenar cuestionarios.`,
      },
      { status: 400 },
    )
  }
  const ordenados = [...filas].sort((a, b) => {
    const izquierda = String((a as Record<string, unknown>)[propiedad] ?? '')
    const derecha = String((b as Record<string, unknown>)[propiedad] ?? '')
    const comparacion = izquierda.localeCompare(derecha, 'es', { numeric: true })
    return direccion === 'DESC' ? -comparacion : comparacion
  })
  const pagina = ordenados.slice(page * size, page * size + size)
  const totalPages = Math.max(Math.ceil(ordenados.length / size), 1)
  return HttpResponse.json({
    content: pagina,
    totalElements: ordenados.length,
    totalPages,
    size,
    number: page,
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: pagina.length,
    empty: pagina.length === 0,
  })
}

export const handlersCuestionariosHistorial = [
  http.get(`${API}/api/cuestionarios`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const codAlumno = url.searchParams.get('codAlumno') ?? ''
    const esAlumno = rolPorId(usuarioDePersona(permitido.codPersona)?.idRol ?? null)?.nombre === 'Alumno'
    if (esAlumno && permitido.codPersona !== codAlumno) return textoProhibido(D15_SOLO_LO_PROPIO)
    const propios = datos().cuestionarios.filter((cuestionario) => cuestionario.codAlumno === codAlumno)
    if (propios.length === 0) return textoNoEncontrado(D14_SIN_EXAMENES)
    const idMateria = Number(url.searchParams.get('idMateria') ?? 0)
    const estado = url.searchParams.get('estado') ?? ''
    const filas = propios.flatMap((cuestionario) => {
      const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
      if (!turno) return []
      if (idMateria > 0 && turno.idMateria !== idMateria) return []
      if (estado !== '' && cuestionario.estado !== estado) return []
      const fila = filaDe(cuestionario)
      return fila ? [fila] : []
    })
    return paginarExamenes(filas, url)
  }),
]

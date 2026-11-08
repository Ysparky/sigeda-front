import { http, HttpResponse } from 'msw'
import { API, autorizar, pideLoDeOtro, textoNoEncontrado, textoProhibido } from './comun'
import { bloqueadoPorSubsanacion, buscarPersona, datos, nombreCorto, nombreDeFase, type PersonaMock } from './datos'
import { D15_SOLO_LO_PROPIO } from './cuestionarios-teoria'
import { nfpiDe } from './indices'
import { minutosDeSimuladorCompletados } from './simulador'

const DIAS_DEL_PLAN = 81

function iso(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function diasHabilesDesde(inicio: string, hoy: string): number {
  const fecha = new Date(`${inicio}T00:00:00`)
  const fin = new Date(`${hoy}T00:00:00`)
  let dias = 0
  while (fecha <= fin) {
    if (fecha.getDay() !== 0 && fecha.getDay() !== 6) dias++
    fecha.setDate(fecha.getDate() + 1)
  }
  return Math.min(dias, DIAS_DEL_PLAN)
}

const minutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

const dos = (valor: number) => Math.round(valor * 100) / 100

function idTurnoDe(codigoEvaluacion: string): number | null {
  const id = Number(codigoEvaluacion.split('-')[1])
  return Number.isInteger(id) ? id : null
}

function subfasesDe(cod: string) {
  const evaluaciones = datos().evaluaciones.filter((e) => e.codPersona === cod)
  const fases = [...new Set(datos().subfases.map((s) => s.idFase))].sort((a, b) => a - b)
  let enCursoAsignada = false
  return fases.map((idFase) => ({
    id: idFase,
    nombre: nombreDeFase(idFase),
    subfases: datos()
      .subfases.filter((s) => s.idFase === idFase)
      .sort((a, b) => a.id - b.id)
      .map((s) => {
        const misiones = datos().misiones.filter((m) => m.idSubfase === s.id).length
        const propias = evaluaciones.filter((e) => e.idSubFase === s.id)
        const misionesEvaluadas = new Set(
          propias.map((e) => datos().turnos.find((t) => t.id === idTurnoDe(e.codigo))?.idMision ?? `e-${e.codigo}`),
        )
        const evaluadas = Math.min(misionesEvaluadas.size, misiones)
        const notas = propias.map((e) => Number(e.promedio)).filter((n) => !Number.isNaN(n))
        const ultima = [...propias].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
        let estado: 'COMPLETA' | 'EN_CURSO' | 'PENDIENTE' = misiones > 0 && evaluadas >= misiones ? 'COMPLETA' : 'PENDIENTE'
        if (estado === 'PENDIENTE' && !enCursoAsignada) {
          estado = 'EN_CURSO'
          enCursoAsignada = true
        }
        return {
          id: s.id,
          nombre: s.nombre,
          misiones,
          evaluadas,
          promedio: notas.length ? dos(notas.reduce((a, b) => a + b, 0) / notas.length) : null,
          ultimaClasificacion: ultima?.clasificacion ?? null,
          estado,
        }
      }),
  }))
}

function tierraDe(persona: PersonaMock, hoy: string) {
  const entregados = datos().cuestionarios.filter((c) => c.codAlumno === persona.codigo && c.estado === 'ENTREGADO')
  const turnoTeorico = (id: number) => datos().turnosTeoricos.find((t) => t.id === id)
  const materias = [...datos().materias]
    .sort((a, b) => a.parte.localeCompare(b.parte) || a.id - b.id)
    .map((materia) => {
      const propios = entregados
        .filter((c) => turnoTeorico(c.idTurnoTeorico)?.idMateria === materia.id)
        .sort((a, b) => (a.fechaEntrega ?? '').localeCompare(b.fechaEntrega ?? ''))
      const aprobado = propios.find((c) => c.aprobado)
      const ultimo = propios.at(-1)
      const proximo = datos()
        .turnosTeoricos.filter((t) => t.idMateria === materia.id && t.idGrupo === persona.idGrupo && t.fechaExamen >= hoy)
        .sort((a, b) => a.fechaExamen.localeCompare(b.fechaExamen))[0]
      return {
        id: materia.id,
        nombre: materia.nombre,
        parte: materia.parte,
        estado: aprobado ? ('APROBADA' as const) : ultimo && ultimo.aprobado === false ? ('DESAPROBADA' as const) : ('PENDIENTE' as const),
        nota: (aprobado ?? ultimo)?.nota ?? null,
        proximoExamen: proximo?.fechaExamen ?? null,
      }
    })
  const primera = materias.filter((m) => m.parte === 'PRIMERA_PARTE')
  return { aprobadas: primera.filter((m) => m.estado === 'APROBADA').length, total: primera.length, materias }
}

function cohorteDe(persona: PersonaMock, hoy: string) {
  const grupo = datos().grupos.find((g) => g.id === persona.idGrupo)
  if (!grupo) return null
  const instructor = grupo.codInstructor ? buscarPersona(grupo.codInstructor) : undefined
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    estado: grupo.estado,
    instructor: instructor ? nombreCorto(instructor) : null,
    fechaInicio: grupo.fechaInicio ?? null,
    fechaFin: grupo.fechaFin ?? null,
    diaDelCurso: grupo.fechaInicio ? diasHabilesDesde(grupo.fechaInicio, hoy) : null,
    diasDelPlan: DIAS_DEL_PLAN,
  }
}

function miCurso(persona: PersonaMock) {
  const hoy = iso(new Date())
  const cod = persona.codigo
  const proximo = datos()
    .turnos.filter((t) => t.fechaEval >= hoy && t.estado !== 'SUSPENDIDO')
    .flatMap((t) => t.alumnos.filter((a) => a.codAlumno === cod).map((a) => ({ t, a })))
    .sort((x, y) => x.t.fechaEval.localeCompare(y.t.fechaEval) || x.a.horaInicio.localeCompare(y.a.horaInicio))[0]
  const mision = proximo ? datos().misiones.find((m) => m.id === proximo.t.idMision) : undefined
  const aeronave = proximo ? datos().aeronaves.find((a) => a.id === proximo.t.idAeronave) : undefined
  const instructor = proximo?.t.codInstructor ? buscarPersona(proximo.t.codInstructor) : undefined
  const evaluados = new Set(
    datos()
      .evaluaciones.filter((e) => e.codPersona === cod)
      .map((e) => idTurnoDe(e.codigo)),
  )
  const vuelo = datos()
    .turnos.filter((t) => evaluados.has(t.id))
    .flatMap((t) => t.alumnos.filter((a) => a.codAlumno === cod))
    .reduce((total, a) => total + minutos(a.horaFin) - minutos(a.horaInicio), 0)
  const tierra = tierraDe(persona, hoy)
  const notasVuelo = datos()
    .evaluaciones.filter((e) => e.codPersona === cod)
    .map((e) => ({ tipo: 'VUELO' as const, titulo: e.subFase, fecha: e.fecha, nota: e.promedio === null ? null : Number(e.promedio), resultado: e.clasificacion }))
  const notasTierra = datos()
    .cuestionarios.filter((c) => c.codAlumno === cod && c.estado === 'ENTREGADO' && c.fechaEntrega)
    .map((c) => {
      const turno = datos().turnosTeoricos.find((t) => t.id === c.idTurnoTeorico)
      return {
        tipo: 'TIERRA' as const,
        titulo: datos().materias.find((m) => m.id === turno?.idMateria)?.nombre ?? 'Examen',
        fecha: c.fechaEntrega ?? '',
        nota: c.nota,
        resultado: c.aprobado ? 'Aprobado' : 'Desaprobado',
      }
    })
  const entregadosEn = new Set(datos().cuestionarios.filter((c) => c.codAlumno === cod).map((c) => c.idTurnoTeorico))
  return {
    alumno: { codigo: cod, nombre: [persona.nombre, persona.aPaterno, persona.aMaterno].join(' '), rango: persona.rango },
    cohorte: cohorteDe(persona, hoy),
    proximoTurno: proximo
      ? {
          id: proximo.t.id,
          fecha: proximo.t.fechaEval,
          horaInicio: proximo.a.horaInicio,
          horaFin: proximo.a.horaFin,
          aeronave: aeronave?.nombre ?? null,
          mision: mision?.codigo ?? null,
          horasMision: mision?.horas ?? null,
          instructor: instructor ? nombreCorto(instructor) : null,
          subfase: proximo.t.subfase,
        }
      : null,
    tierra,
    fases: subfasesDe(cod),
    notasRecientes: [...notasVuelo, ...notasTierra].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5),
    porRendir: datos()
      .turnosTeoricos.filter((t) => t.idGrupo === persona.idGrupo && t.fechaExamen >= hoy && !entregadosEn.has(t.id))
      .sort((a, b) => a.fechaExamen.localeCompare(b.fechaExamen))
      .map((t) => ({
        idTurnoTeorico: t.id,
        materia: datos().materias.find((m) => m.id === t.idMateria)?.nombre ?? t.nombre,
        fecha: t.fechaExamen,
        horaInicio: t.horaInicio,
      })),
    horas: {
      vuelo: dos(vuelo / 60),
      simulador: dos(minutosDeSimuladorCompletados(cod) / 60),
      programa: dos(datos().misiones.reduce((total, m) => total + m.horas, 0)),
    },
    nfpi: nfpiDe(cod),
  }
}

function miCohorte(instructor: PersonaMock) {
  const hoy = iso(new Date())
  const cod = instructor.codigo
  const grupos = datos().grupos.filter((g) => g.codInstructor === cod && g.estado !== 'CERRADA')
  const alumnosDe = (idGrupo: number) => datos().personas.filter((p) => p.idGrupo === idGrupo && p.tipo === 'Alumno')
  const evaluado = (codAlumno: string, idTurno: number) =>
    datos().evaluaciones.some((e) => e.codPersona === codAlumno && idTurnoDe(e.codigo) === idTurno)
  const propios = datos().turnos.filter((t) => t.codInstructor === cod && t.estado !== 'SUSPENDIDO')
  const enProgreso = grupos.filter((g) => g.estado === 'EN_PROGRESO').flatMap((g) => alumnosDe(g.id))
  const enCurso = new Map<number, number>()
  for (const alumno of enProgreso) {
    const actual = subfasesDe(alumno.codigo)
      .flatMap((f) => f.subfases)
      .find((s) => s.estado === 'EN_CURSO')
    if (actual) enCurso.set(actual.id, (enCurso.get(actual.id) ?? 0) + 1)
  }
  return {
    instructor: { codigo: cod, nombre: nombreCorto(instructor) },
    cohortes: grupos.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      estado: g.estado,
      fechaInicio: g.fechaInicio ?? null,
      fechaFin: g.fechaFin ?? null,
      diaDelCurso: g.fechaInicio ? diasHabilesDesde(g.fechaInicio, hoy) : null,
      alumnos: alumnosDe(g.id).length,
    })),
    turnosDeHoy: propios
      .filter((t) => t.fechaEval === hoy)
      .map((t) => ({
        id: t.id,
        nombre: t.nombre,
        horaInicio: t.alumnos.map((a) => a.horaInicio).sort()[0] ?? '',
        horaFin: t.alumnos.map((a) => a.horaFin).sort().at(-1) ?? '',
        aeronave: datos().aeronaves.find((a) => a.id === t.idAeronave)?.nombre ?? null,
        mision: datos().misiones.find((m) => m.id === t.idMision)?.codigo ?? null,
        subfase: t.subfase,
        alumnos: t.alumnos.map((a) => {
          const persona = buscarPersona(a.codAlumno)
          return {
            codigo: a.codAlumno,
            nombre: persona ? nombreCorto(persona) : a.codAlumno,
            horaInicio: a.horaInicio,
            horaFin: a.horaFin,
            evaluado: evaluado(a.codAlumno, t.id),
          }
        }),
      }))
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    porEvaluar: propios
      .filter((t) => t.fechaEval < hoy)
      .flatMap((t) =>
        t.alumnos
          .filter((a) => !evaluado(a.codAlumno, t.id))
          .map((a) => {
            const persona = buscarPersona(a.codAlumno)
            return { idTurno: t.id, fecha: t.fechaEval, codigo: a.codAlumno, nombre: persona ? nombreCorto(persona) : a.codAlumno }
          }),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 10),
    fases: subfasesDe('').map((f) => ({
      id: f.id,
      nombre: f.nombre,
      subfases: f.subfases.map((s) => ({ id: s.id, nombre: s.nombre, alumnos: enCurso.get(s.id) ?? 0 })),
    })),
    alertas: grupos
      .flatMap((g) => alumnosDe(g.id))
      .filter((a) => bloqueadoPorSubsanacion(a.codigo))
      .map((a) => ({ codigo: a.codigo, alumno: nombreCorto(a), motivo: 'Subsanación pendiente en instrucción en tierra.' })),
    proximosExamenes: datos()
      .turnosTeoricos.filter((t) => grupos.some((g) => g.id === t.idGrupo) && t.fechaExamen >= hoy)
      .sort((a, b) => a.fechaExamen.localeCompare(b.fechaExamen))
      .slice(0, 5)
      .map((t) => ({
        idTurnoTeorico: t.id,
        materia: datos().materias.find((m) => m.id === t.idMateria)?.nombre ?? t.nombre,
        grupo: datos().grupos.find((g) => g.id === t.idGrupo)?.nombre ?? null,
        fecha: t.fechaExamen,
        horaInicio: t.horaInicio,
      })),
  }
}

export const handlersAula = [
  http.get(`${API}/api/aula/alumnos/:cod`, ({ request, params }) => {
    const usuario = autorizar(request, 'Read')
    if (usuario instanceof Response) return usuario
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    if (pideLoDeOtro(usuario, persona.codigo)) return textoProhibido(D15_SOLO_LO_PROPIO)
    return HttpResponse.json(miCurso(persona))
  }),
  http.get(`${API}/api/aula/instructor`, ({ request }) => {
    const usuario = autorizar(request, 'Read')
    if (usuario instanceof Response) return usuario
    const persona = usuario.codPersona ? buscarPersona(usuario.codPersona) : undefined
    if (!persona || persona.tipo !== 'Instructor PDI') return textoProhibido('No tienes permisos para realizar esta acción')
    return HttpResponse.json(miCohorte(persona))
  }),
]

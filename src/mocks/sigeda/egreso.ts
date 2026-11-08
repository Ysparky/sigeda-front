import { http, HttpResponse } from 'msw'
import { subfasesDe, tierraDe } from './aula'
import { API, autorizar, pideLoDeOtro, textoNoEncontrado, textoProhibido } from './comun'
import { D15_SOLO_LO_PROPIO } from './cuestionarios-teoria'
import { buscarPersona, datos, nombreCompleto, type GrupoMock, type PersonaMock } from './datos'
import { horasRegistradas } from './ficha-licencia'
import { nfpiDe } from './indices'
import { registrarResultado, resultadoDe, resultadosFinales, type ResultadoFinalMock } from './resultados'

const PLAZO_MAXIMO = 120

function iso(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function sumarDiasHabiles(desde: string, dias: number): string {
  const fecha = new Date(`${desde}T00:00:00`)
  let contados = 0
  while (contados < dias) {
    fecha.setDate(fecha.getDate() + 1)
    if (fecha.getDay() !== 0 && fecha.getDay() !== 6) contados++
  }
  return iso(fecha)
}

const dia = (fecha: string) => fecha.split('-').reverse().join('/')
const dos = (valor: number) => Math.round(valor * 100) / 100
const nombreCorto = (p: PersonaMock) => `${p.nombre} ${p.aPaterno}`.trim()

function alumnosDe(grupo: GrupoMock) {
  return datos()
    .personas.filter((p) => p.idGrupo === grupo.id && p.tipo === 'Alumno')
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
}

function avanceDe(persona: PersonaMock) {
  const subfases = subfasesDe(persona.codigo).flatMap((f) => f.subfases)
  const materias = tierraDe(persona, iso(new Date())).materias
  const completas = subfases.filter((s) => s.estado === 'COMPLETA').length
  const aprobadas = materias.filter((m) => m.estado === 'APROBADA').length
  const evaluable = persona.estado === 'Apto' || persona.estado === 'En Observación'
  return {
    subfasesCompletas: completas,
    subfasesTotales: subfases.length,
    asignaturasAprobadas: aprobadas,
    asignaturasTotales: materias.length,
    cumple: completas === subfases.length && aprobadas === materias.length && evaluable,
  }
}

export function plazoMaximo(grupo: GrupoMock) {
  return grupo.fechaInicio ? sumarDiasHabiles(grupo.fechaInicio, PLAZO_MAXIMO) : null
}

export function tableroDeCierre(grupo: GrupoMock) {
  const hoy = iso(new Date())
  const pendientes: string[] = []
  const alumnos = alumnosDe(grupo).map((p) => {
    const r = resultadoDe(p.codigo)
    const avance = avanceDe(p)
    const situacion = r ? r.situacion : avance.cumple ? 'LISTO' : 'EN_CURSO'
    if (situacion === 'EN_CURSO') pendientes.push(nombreCorto(p))
    return {
      codigo: p.codigo,
      nombre: nombreCorto(p),
      estado: p.estado,
      situacion,
      subfasesCompletas: avance.subfasesCompletas,
      subfasesTotales: avance.subfasesTotales,
      asignaturasAprobadas: avance.asignaturasAprobadas,
      asignaturasTotales: avance.asignaturasTotales,
      nfpi: r?.nfpi ?? nfpiDe(p.codigo),
      puesto: r?.puesto ?? null,
      constancia: r?.constancia ?? null,
      observacion: r?.observacion ?? null,
    }
  })
  const plazo = plazoMaximo(grupo)
  const motivos: string[] = []
  if (grupo.estado !== 'EN_PROGRESO')
    motivos.push(grupo.estado === 'CERRADA' ? 'La cohorte ya está cerrada.' : 'La cohorte no está en curso.')
  else if (pendientes.length > 0 && (plazo === null || hoy <= plazo))
    motivos.push(
      `Sin concluir: ${pendientes.join(', ')}. Cada alumno debe egresar o tener registrada la decisión del Consejo o su retiro` +
        (plazo === null ? '.' : `, o debe vencer el plazo máximo (${dia(plazo)}).`),
    )
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    estado: grupo.estado,
    fechaInicio: grupo.fechaInicio ?? null,
    fechaFin: grupo.fechaFin ?? null,
    plazoMaximo: plazo,
    puedeCerrar: motivos.length === 0,
    motivos,
    alumnos,
  }
}

function nuevo(p: PersonaMock, grupo: GrupoMock, situacion: ResultadoFinalMock['situacion'], observacion: string | null) {
  const horas = horasRegistradas(p.codigo)
  return {
    codAlumno: p.codigo,
    idGrupo: grupo.id,
    situacion,
    fecha: iso(new Date()),
    observacion,
    nit: null,
    nia: null,
    nfpi: nfpiDe(p.codigo),
    puesto: null,
    horasVuelo: dos(horas.vuelo),
    horasSimulador: dos(horas.simulador),
    constancia: null,
  } satisfies ResultadoFinalMock
}

/** Cierra la cohorte o devuelve por qué no puede; congela el resultado de cada alumno. */
export function cerrarCohorte(grupo: GrupoMock): string[] {
  const tablero = tableroDeCierre(grupo)
  if (!tablero.puedeCerrar) return tablero.motivos
  for (const p of alumnosDe(grupo)) {
    if (resultadoDe(p.codigo)) continue
    const listo = tablero.alumnos.find((a) => a.codigo === p.codigo)?.situacion === 'LISTO'
    registrarResultado(nuevo(p, grupo, listo ? 'EGRESADO' : 'NO_CULMINO', null))
  }
  const egresados = resultadosFinales()
    .filter((r) => r.idGrupo === grupo.id && r.situacion === 'EGRESADO')
    .sort((a, b) => (b.nfpi ?? -1) - (a.nfpi ?? -1) || a.codAlumno.localeCompare(b.codAlumno))
  const anio = new Date().getFullYear()
  egresados.forEach((r, i) => {
    const empata = i > 0 && r.nfpi !== null && r.nfpi === egresados[i - 1].nfpi
    r.puesto = r.nfpi === null ? null : empata ? egresados[i - 1].puesto : i + 1
    r.constancia = `CE-${anio}-${String(grupo.id).padStart(3, '0')}-${String(i + 1).padStart(2, '0')}`
  })
  return []
}

export const handlersEgreso = [
  http.get(`${API}/api/grupos/:id/cierre`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Enrollments')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((g) => g.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    return HttpResponse.json(tableroDeCierre(grupo))
  }),
  http.post(`${API}/api/grupos/:id/alumnos/:cod/decision`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Enrollments')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((g) => g.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    const { decision, observacion } = (await request.json()) as { decision: string; observacion?: string | null }
    if (grupo.estado !== 'EN_PROGRESO') return HttpResponse.text('La cohorte no está en curso.', { status: 409 })
    const alumno = alumnosDe(grupo).find((p) => p.codigo === String(params.cod))
    if (!alumno) return textoNoEncontrado('Persona especificada no existe.')
    if (resultadoDe(alumno.codigo)) return HttpResponse.text('El alumno ya tiene su resultado final.', { status: 409 })
    if (decision !== 'RETIRO' && alumno.estado !== 'En Deliberación')
      return HttpResponse.text('El Consejo de Evaluación de Vuelos solo decide sobre un alumno En Deliberación.', { status: 409 })
    if (decision === 'CONTINUA') {
      alumno.estado = 'En Observación'
    } else {
      alumno.estado = 'No Apto'
      registrarResultado(nuevo(alumno, grupo, decision === 'SEPARADO' ? 'DESAPROBADO' : 'RETIRADO', observacion ?? null))
    }
    return HttpResponse.json({ mensaje: 'Decisión registrada.' })
  }),
  http.get(`${API}/api/resultados-finales/:cod`, ({ request, params }) => {
    const usuario = autorizar(request, 'Read')
    if (usuario instanceof Response) return usuario
    const cod = String(params.cod)
    if (pideLoDeOtro(usuario, cod)) return textoProhibido(D15_SOLO_LO_PROPIO)
    const r = resultadoDe(cod)
    if (!r) return textoNoEncontrado('Resultado final especificada no existe.')
    const persona = buscarPersona(cod)
    const grupo = datos().grupos.find((g) => g.id === r.idGrupo)
    return HttpResponse.json({
      ...r,
      nombre: persona ? nombreCompleto(persona) : cod,
      dni: persona?.dni ?? null,
      cohorte: grupo?.nombre ?? null,
      fechaInicio: grupo?.fechaInicio ?? null,
      egresados: resultadosFinales().filter((x) => x.idGrupo === r.idGrupo && x.situacion === 'EGRESADO').length,
    })
  }),
]

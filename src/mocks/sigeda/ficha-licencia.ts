import { http, HttpResponse } from 'msw'
import { API, autorizar } from './comun'
import { datos } from './datos'
import { documentoAceptadoDe } from './inscripcion'
import { resultadoDe } from './resultados'
import { minutosDeSimuladorCompletados } from './simulador'

function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/** La regla fija de la migración 041: qué misiones son solo, de travesía o nocturnas. */
const SOLO = new Set(['CM-7', 'CP-4', 'CP-5', 'NL-5', 'NL-6', 'NR-6', 'NR-7', 'NC-3', 'NC-4'])

function modalidad(idMision: number | null | undefined) {
  const mision = datos().misiones.find((m) => m.id === idMision)
  const subfase = datos().subfases.find((s) => s.id === mision?.idSubfase)
  return {
    solo: mision ? SOLO.has(mision.codigo) : false,
    travesia: subfase ? ['Navegación en Ruta', 'Navegación Compleja'].includes(subfase.nombre) : false,
    nocturna: subfase ? subfase.idFase === 4 : false,
    travesia100nm: mision?.codigo === 'NC-4',
  }
}

type Registradas = {
  vuelo: number
  simulador: number
  solo: number
  soloTravesia: number
  nocturno: number
  aterrizajesNocturnos: number
  travesia100nm: boolean
}

function horasRegistradas(cod: string): Registradas {
  const turnosEvaluados = new Set(
    datos()
      .evaluaciones.filter((e) => e.codPersona === cod)
      .map((e) => Number(e.codigo.split('-')[1]))
      .filter((id) => Number.isInteger(id)),
  )
  const r: Registradas = { vuelo: 0, simulador: minutosDeSimuladorCompletados(cod) / 60, solo: 0, soloTravesia: 0, nocturno: 0, aterrizajesNocturnos: 0, travesia100nm: false }
  for (const t of datos().turnos.filter((x) => turnosEvaluados.has(x.id)))
    for (const a of t.alumnos.filter((x) => x.codAlumno === cod)) {
      const h = (minutos(a.horaFin) - minutos(a.horaInicio)) / 60
      const m = modalidad(t.idMision)
      r.vuelo += h
      if (m.solo) r.solo += h
      if (m.solo && m.travesia) r.soloTravesia += h
      if (m.nocturna) {
        r.nocturno += h
        r.aterrizajesNocturnos += 1
      }
      if (m.solo && m.travesia100nm) r.travesia100nm = true
    }
  return r
}

const dos = (v: number) => Math.round(v * 100) / 100

/** Lo que la admisión y el curso ya saben completa lo que no se cargó a mano (como el backend). */
function completar(cod: string, manual: FichaMock, r: Registradas, fechaEgreso: string | null): FichaMock {
  const f = { ...manual }
  if (documentoAceptadoDe(cod, 'CERTIFICADO_SECUNDARIA')) f.secundariaCompleta = true
  const medico = documentoAceptadoDe(cod, 'CERTIFICADO_MEDICO')
  if (f.medicoVigencia === null && medico?.vigenciaHasta) f.medicoVigencia = medico.vigenciaHasta
  const ingles = documentoAceptadoDe(cod, 'CONSTANCIA_INGLES')
  if (f.inglesVigencia === null && ingles?.vigenciaHasta) f.inglesVigencia = ingles.vigenciaHasta
  if (f.inglesNivel === null && ingles?.nivel) f.inglesNivel = ingles.nivel
  const doble = Math.max(0, r.vuelo - r.solo)
  if (f.horasDobleMando === null && doble > 0) f.horasDobleMando = dos(doble)
  if (f.horasSolo === null && r.solo > 0) f.horasSolo = dos(r.solo)
  if (f.horasSoloTravesia === null && r.soloTravesia > 0) f.horasSoloTravesia = dos(r.soloTravesia)
  if (f.horasNocturnas === null && r.nocturno > 0) f.horasNocturnas = dos(r.nocturno)
  if (r.travesia100nm) f.travesia100nm = true
  if (r.aterrizajesNocturnos >= 10) f.nocturno10x10 = true
  if (f.declaracionFecha === null && fechaEgreso) f.declaracionFecha = fechaEgreso
  return f
}

type FichaMock = {
  codAlumno: string
  fechaNacimiento: string | null
  secundariaCompleta: boolean | null
  inglesNivel: string | null
  inglesVigencia: string | null
  medicoVigencia: string | null
  licenciaAlumnoEmision: string | null
  horasTotal: number | null
  horasDobleMando: number | null
  horasSolo: number | null
  horasSoloTravesia: number | null
  horasNocturnas: number | null
  horasInstrumentos: number | null
  horasSimulador: number | null
  travesia100nm: boolean | null
  nocturno10x10: boolean | null
  examenTeoricoFecha: string | null
  examenTeoricoNota: number | null
  declaracionFecha: string | null
  periciaFecha: string | null
  periciaResultado: 'APROBADA' | 'DESAPROBADA' | null
  pagoTeorico: boolean | null
  pagoPractica: boolean | null
  solicitudPresentada: boolean | null
  licenciaEmitida: boolean | null
}

function fichaVacia(cod: string): FichaMock {
  return {
    codAlumno: cod,
    fechaNacimiento: null,
    secundariaCompleta: null,
    inglesNivel: null,
    inglesVigencia: null,
    medicoVigencia: null,
    licenciaAlumnoEmision: null,
    horasTotal: null,
    horasDobleMando: null,
    horasSolo: null,
    horasSoloTravesia: null,
    horasNocturnas: null,
    horasInstrumentos: null,
    horasSimulador: null,
    travesia100nm: null,
    nocturno10x10: null,
    examenTeoricoFecha: null,
    examenTeoricoNota: null,
    declaracionFecha: null,
    periciaFecha: null,
    periciaResultado: null,
    pagoTeorico: null,
    pagoPractica: null,
    solicitudPresentada: null,
    licenciaEmitida: null,
  }
}

let fichasMock: FichaMock[] = []

export function reiniciarFichaLicencia() {
  fichasMock = []
}

// Réplica del motor §16 del backend (MotorFicha) para que el mock muestre un resumen coherente.
const dia = (s: string | null) => (s ? new Date(`${s}T00:00:00`) : null)
const sumarDias = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)
const sumarMeses = (d: Date, n: number) => {
  const r = new Date(d)
  const dia = r.getDate()
  r.setMonth(r.getMonth() + n)
  if (r.getDate() < dia) r.setDate(0) // clamp a fin de mes, como plusMonths de Java (evita el desborde de setMonth)
  return r
}
const vigente = (venc: string | null, hoy: Date) => {
  const f = dia(venc)
  return f !== null && f.getTime() >= hoy.getTime()
}
const hora = (v: number | null, min: number) => v !== null && v >= min

function calcularResumen(
  manual: FichaMock,
  hoy: Date,
  registradas: { vuelo: number; simulador: number; solo?: number } = { vuelo: 0, simulador: 0 },
  cursoAprobado = false,
) {
  const f = {
    ...manual,
    horasDobleMando:
      manual.horasDobleMando ?? (registradas.vuelo - (registradas.solo ?? 0) > 0 ? registradas.vuelo - (registradas.solo ?? 0) : null),
    horasSimulador: manual.horasSimulador ?? (registradas.simulador > 0 ? registradas.simulador : null),
    horasTotal:
      manual.horasTotal ?? (registradas.vuelo + registradas.simulador > 0 ? registradas.vuelo + registradas.simulador : null),
  }
  const acreditables = f.horasTotal === null ? null : f.horasTotal - Math.max(0, (f.horasSimulador ?? 0) - 5)
  const teoricoVigente =
    f.examenTeoricoFecha !== null &&
    sumarMeses(dia(f.examenTeoricoFecha)!, 12).getTime() >= hoy.getTime() &&
    f.examenTeoricoNota !== null &&
    f.examenTeoricoNota >= 75
  const requisitos = [
    { clave: 'curso_ciac', cumple: cursoAprobado, detalle: 'Curso del CIAC aprobado (constancia de egreso)' },
    { clave: 'horas_total', cumple: acreditables !== null && acreditables >= 40, detalle: '40 h en total (el simulador acredita hasta 5 h)' },
    { clave: 'doble_mando', cumple: hora(f.horasDobleMando, 20), detalle: '20 h de doble mando' },
    { clave: 'solo', cumple: hora(f.horasSolo, 10), detalle: '10 h de vuelo solo diurno' },
    { clave: 'solo_travesia', cumple: hora(f.horasSoloTravesia, 5), detalle: '5 h de travesía solo' },
    { clave: 'travesia_100nm', cumple: f.travesia100nm === true, detalle: 'Travesía de 100 NM con 2 aterrizajes' },
    { clave: 'nocturnas', cumple: hora(f.horasNocturnas, 3), detalle: '3 h de vuelo nocturno' },
    { clave: 'nocturno_10x10', cumple: f.nocturno10x10 === true, detalle: '10 despegues y 10 aterrizajes nocturnos' },
    { clave: 'medico', cumple: vigente(f.medicoVigencia, hoy), detalle: 'Certificado médico Clase 2 vigente' },
    { clave: 'ingles', cumple: vigente(f.inglesVigencia, hoy), detalle: 'Inglés vigente' },
    { clave: 'secundaria', cumple: f.secundariaCompleta === true, detalle: 'Secundaria completa' },
    { clave: 'examen_teorico', cumple: teoricoVigente, detalle: 'Examen teórico DGAC ≥ 75% y vigente (1 año)' },
    {
      clave: 'declaracion',
      cumple: f.declaracionFecha !== null && sumarDias(dia(f.declaracionFecha)!, 30).getTime() >= hoy.getTime(),
      detalle: 'Declaración del instructor vigente (30 días)',
    },
  ]
  const alertas: string[] = []
  if (f.medicoVigencia && dia(f.medicoVigencia)!.getTime() < hoy.getTime()) alertas.push('El certificado médico está vencido.')
  else if (f.medicoVigencia && dia(f.medicoVigencia)!.getTime() < sumarDias(hoy, 30).getTime())
    alertas.push('El certificado médico vence en menos de 30 días.')
  if (f.inglesVigencia && dia(f.inglesVigencia)!.getTime() < hoy.getTime()) alertas.push('El nivel de inglés está vencido.')
  if (f.examenTeoricoFecha && sumarMeses(dia(f.examenTeoricoFecha)!, 12).getTime() < hoy.getTime())
    alertas.push('El examen teórico tiene más de 1 año (vencido).')
  if (f.declaracionFecha && sumarDias(dia(f.declaracionFecha)!, 30).getTime() < hoy.getTime())
    alertas.push('La declaración del instructor tiene más de 30 días (vencida).')
  if (f.licenciaAlumnoEmision && sumarMeses(dia(f.licenciaAlumnoEmision)!, 24).getTime() < hoy.getTime())
    alertas.push('La licencia de alumno tiene más de 24 meses (vencida).')
  const bloqueos: string[] = []
  if (f.examenTeoricoNota !== null && f.examenTeoricoNota < 75) bloqueos.push('El examen teórico está reprobado (nota menor a 75%).')
  if (f.periciaResultado === 'DESAPROBADA') bloqueos.push('La prueba de pericia está desaprobada.')
  if (f.periciaFecha !== null && !teoricoVigente)
    bloqueos.push('Hay pericia registrada sin examen teórico aprobado y vigente (12 meses).')

  const vacia =
    f.horasTotal === null && f.medicoVigencia === null && f.inglesVigencia === null && f.examenTeoricoFecha === null &&
    f.examenTeoricoNota === null && f.declaracionFecha === null && f.periciaFecha === null && f.horasDobleMando === null &&
    f.horasSolo === null && f.horasSoloTravesia === null && f.horasNocturnas === null && f.licenciaAlumnoEmision === null &&
    f.horasSimulador === null && f.horasInstrumentos === null &&
    f.secundariaCompleta !== true && f.travesia100nm !== true && f.nocturno10x10 !== true
  let estado: string
  if (f.licenciaEmitida === true) estado = 'LICENCIA_EMITIDA'
  else if (f.periciaResultado === 'APROBADA') estado = 'PERICIA_APROBADA'
  else if (vacia) estado = 'EN_PREPARACION'
  else if (bloqueos.length === 0 && requisitos.every((r) => r.cumple)) estado = 'LISTA_PARA_PERICIA'
  else estado = 'OBSERVADA'
  return { estado, requisitos, alertas, bloqueos }
}

function fichaConResumen(cod: string, ficha: FichaMock, hoy: Date) {
  const resultado = resultadoDe(cod)
  const registradas = horasRegistradas(cod)
  if (resultado?.horasVuelo != null) {
    registradas.vuelo = resultado.horasVuelo
    registradas.simulador = resultado.horasSimulador ?? 0
  }
  const cursoAprobado = resultado?.situacion === 'EGRESADO'
  const completa = completar(cod, ficha, registradas, cursoAprobado ? resultado!.fecha : null)
  return { ...completa, cursoAprobado, horasRegistradas: registradas, resumen: calcularResumen(completa, hoy, registradas, cursoAprobado) }
}

/** El resumen de la ficha del alumno, como lo ve el aula. */
export function resumenDeFicha(cod: string) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return fichaConResumen(cod, fichasMock.find((x) => x.codAlumno === cod) ?? fichaVacia(cod), hoy).resumen
}

export { horasRegistradas }

export const handlersFichaLicencia = [
  http.get(`${API}/api/fichas-licencia/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Licensing')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    const ficha = fichasMock.find((x) => x.codAlumno === cod) ?? fichaVacia(cod)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0) // granularidad de día, como LocalDate en el backend
    return HttpResponse.json(fichaConResumen(cod, ficha, hoy))
  }),
  http.put(`${API}/api/fichas-licencia/:cod`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Licensing')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    if (resultadoDe(cod)?.situacion !== 'EGRESADO')
      return HttpResponse.text('La ficha de licencia se abre al egresar del curso.', { status: 409 })
    const cuerpo = (await request.json()) as Partial<FichaMock>
    const existente = fichasMock.find((x) => x.codAlumno === cod)
    const actualizada: FichaMock = { ...fichaVacia(cod), ...cuerpo, codAlumno: cod }
    if (existente) Object.assign(existente, actualizada)
    else fichasMock.push(actualizada)
    return HttpResponse.json({ mensaje: 'Ficha guardada.' })
  }),
]

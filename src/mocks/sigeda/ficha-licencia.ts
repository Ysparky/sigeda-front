import { http, HttpResponse } from 'msw'
import { API, autorizar } from './comun'

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

function calcularResumen(f: FichaMock, hoy: Date) {
  const acreditables = f.horasTotal === null ? null : f.horasTotal - Math.max(0, (f.horasSimulador ?? 0) - 5)
  const teoricoVigente =
    f.examenTeoricoFecha !== null &&
    sumarMeses(dia(f.examenTeoricoFecha)!, 12).getTime() >= hoy.getTime() &&
    f.examenTeoricoNota !== null &&
    f.examenTeoricoNota >= 75
  const requisitos = [
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

export const handlersFichaLicencia = [
  http.get(`${API}/api/fichas-licencia/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Licensing')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    const ficha = fichasMock.find((x) => x.codAlumno === cod) ?? fichaVacia(cod)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0) // granularidad de día, como LocalDate en el backend
    return HttpResponse.json({ ...ficha, resumen: calcularResumen(ficha, hoy) })
  }),
  http.put(`${API}/api/fichas-licencia/:cod`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Licensing')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    const cuerpo = (await request.json()) as Partial<FichaMock>
    const existente = fichasMock.find((x) => x.codAlumno === cod)
    const actualizada: FichaMock = { ...fichaVacia(cod), ...cuerpo, codAlumno: cod }
    if (existente) Object.assign(existente, actualizada)
    else fichasMock.push(actualizada)
    return HttpResponse.json({ mensaje: 'Ficha guardada.' })
  }),
]

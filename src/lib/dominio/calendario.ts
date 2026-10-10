import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  getDate,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'

export const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/

export function aFechaIso(fecha: Date): string {
  return format(fecha, 'yyyy-MM-dd')
}

export function hoyIso(ahora: Date = new Date()): string {
  return aFechaIso(ahora)
}

export function momento(fecha: string, hora: string): Date {
  return parse(`${fecha} ${hora}`, 'yyyy-MM-dd HH:mm', new Date(0))
}

export function esFechaIso(valor: string): boolean {
  return PATRON_FECHA.test(valor) && isValid(parse(valor, 'yyyy-MM-dd', new Date(0)))
}

export function sumarDias(fecha: string, dias: number): string {
  return aFechaIso(addDays(parse(fecha, 'yyyy-MM-dd', new Date(0)), dias))
}

export function esPosteriorAHoy(fecha: string, ahora: Date = new Date()): boolean {
  return fecha > hoyIso(ahora)
}

export function esHora(valor: string): boolean {
  return PATRON_HORA.test(valor)
}

export function restarHoras(hora: string, horas: number): string {
  const [h, m] = hora.split(':').map(Number)
  const minutos = (((h * 60 + m - horas * 60) % 1440) + 1440) % 1440
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

// ───────────────────────── Vista de calendario mensual ─────────────────────────
// Helpers para una grilla de mes (semana de lunes a domingo). Trabajan con fechas
// ISO `yyyy-MM-dd` y usan la misma convención de parseo que el resto del archivo.

const aFecha = (iso: string): Date => parse(iso, 'yyyy-MM-dd', new Date(0))

/** Encabezados de la semana, de lunes a domingo. */
export const DIAS_DE_LA_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

/** El primer día del mes al que pertenece `fecha` (yyyy-MM-01). */
export function primerDiaDelMes(fecha: string): string {
  return aFechaIso(startOfMonth(aFecha(fecha)))
}

/** El primer día del mes anterior / siguiente al de `fecha`. */
export function mesAnterior(fecha: string): string {
  return aFechaIso(startOfMonth(addMonths(aFecha(fecha), -1)))
}
export function mesSiguiente(fecha: string): string {
  return aFechaIso(startOfMonth(addMonths(aFecha(fecha), 1)))
}

/** El número de día del mes (1..31). */
export function diaDelMes(fecha: string): number {
  return getDate(aFecha(fecha))
}

/** Si `fecha` cae en el mismo mes natural que `mes`. */
export function esMismoMes(fecha: string, mes: string): boolean {
  return isSameMonth(aFecha(fecha), aFecha(mes))
}

/** Nombre del mes con año, capitalizado: "Octubre 2026". */
export function nombreDelMes(mes: string): string {
  const texto = format(aFecha(mes), 'LLLL yyyy', { locale: es })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Los días (yyyy-MM-dd) de la grilla del mes: seis semanas de lunes a domingo que
 * cubren el mes entero, con los días de relleno de los meses vecinos al principio y
 * al final. Siempre 42 celdas, para que la grilla no cambie de alto entre meses.
 */
export function diasDeLaGrilla(mes: string): string[] {
  const inicio = startOfWeek(startOfMonth(aFecha(mes)), { weekStartsOn: 1 })
  return eachDayOfInterval({ start: inicio, end: addDays(inicio, 41) }).map(aFechaIso)
}

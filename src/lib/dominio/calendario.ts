import { addDays, format, isValid, parse } from 'date-fns'

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

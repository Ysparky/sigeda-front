import { format, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function fechaCorta(iso: string | null): string {
  if (!iso) return '—'
  const fecha = parseISO(iso)
  return isValid(fecha) ? format(fecha, 'EEE d MMM', { locale: es }).replace('.', '') : '—'
}

export function fechaLarga(iso: string | null): string {
  if (!iso) return '—'
  const fecha = parseISO(iso)
  return isValid(fecha) ? format(fecha, "d 'de' MMMM yyyy", { locale: es }) : '—'
}

export function horas(valor: number): string {
  return `${valor.toLocaleString('es-PE', { maximumFractionDigits: 1 })} h`
}

export function nota(valor: number | null): string {
  return valor === null ? '—' : valor.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export type EstadoCelda = 'COMPLETA' | 'EN_CURSO' | 'PENDIENTE'

export const ETIQUETA_ESTADO: Record<EstadoCelda, string> = {
  COMPLETA: 'Completa',
  EN_CURSO: 'En curso',
  PENDIENTE: 'Pendiente',
}

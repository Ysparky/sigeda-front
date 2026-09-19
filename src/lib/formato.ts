import { format, isValid, parseISO } from 'date-fns'

export function formatearFecha(iso: string): string {
  if (!iso) return '—'
  const fecha = parseISO(iso)
  return isValid(fecha) ? format(fecha, 'dd/MM/yyyy') : '—'
}

export function formatearNota(nota: number | null | undefined): string {
  if (nota === null || nota === undefined || Number.isNaN(nota)) return '—'
  return nota.toFixed(2)
}

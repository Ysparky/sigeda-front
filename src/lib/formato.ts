import { format, parseISO } from 'date-fns'

export function formatearFecha(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy')
}

export function formatearNota(nota: number): string {
  return nota.toFixed(2)
}

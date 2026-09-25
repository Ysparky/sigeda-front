import { ApiError } from '@/lib/api/errors'

export const D8_EXAMEN_NO_DISPONIBLE = 'El examen no está disponible en este momento.'
export const D10_EXAMEN_ENTREGADO = 'El examen ya fue entregado.'
export const D11_VENTANA_CERRADA = 'La ventana del examen cerró.'

function esConflicto(error: unknown, mensaje: string): boolean {
  return error instanceof ApiError && error.status === 409 && error.message.trim() === mensaje
}

export function esExamenEntregado(error: unknown): boolean {
  return esConflicto(error, D10_EXAMEN_ENTREGADO)
}

export function esVentanaCerrada(error: unknown): boolean {
  return esConflicto(error, D11_VENTANA_CERRADA)
}

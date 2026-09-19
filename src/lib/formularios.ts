import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '@/lib/api/errors'

export function rutaDeCampo(campo: string, renombrar: Readonly<Record<string, string>> = {}): string {
  return campo
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segmento) => renombrar[segmento] ?? segmento)
    .join('.')
}

export function aplicarErroresDeCampo<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  renombrar: Readonly<Record<string, string>> = {},
): boolean {
  const entradas = Object.entries(error.erroresDeCampo)
  for (const [campo, mensaje] of entradas) {
    setError(rutaDeCampo(campo, renombrar) as Path<T>, { type: 'server', message: mensaje })
  }
  return entradas.length > 0
}

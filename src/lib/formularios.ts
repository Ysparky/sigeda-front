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
  colapsar: readonly string[] = [],
): boolean {
  const entradas = Object.entries(error.erroresDeCampo)
  const colapsados = new Set<string>()
  for (const [campo, mensaje] of entradas) {
    const ruta = rutaDeCampo(campo, renombrar)
    const raiz = ruta.split('.')[0] ?? ruta
    if (!colapsar.includes(raiz)) {
      setError(ruta as Path<T>, { type: 'server', message: mensaje })
      continue
    }
    if (colapsados.has(raiz)) continue
    colapsados.add(raiz)
    setError(raiz as Path<T>, { type: 'server', message: mensaje })
  }
  return entradas.length > 0
}

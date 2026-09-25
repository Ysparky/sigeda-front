import type { FieldValues, Path, UseFormGetValues, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '@/lib/api/errors'

export function rutaDeCampo(campo: string, renombrar: Readonly<Record<string, string>> = {}): string {
  return campo
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segmento) => (Object.hasOwn(renombrar, segmento) ? (renombrar[segmento] ?? segmento) : segmento))
    .join('.')
}

export function aplicarErroresDeCampo<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  renombrar: Readonly<Record<string, string>> = {},
  colapsar: readonly string[] = [],
  getValues?: UseFormGetValues<T>,
): string[] {
  const colapsados = new Set<string>()
  const huerfanos: string[] = []
  for (const [campo, mensaje] of Object.entries(error.erroresDeCampo)) {
    const ruta = rutaDeCampo(campo, renombrar)
    const raiz = ruta.split('.')[0] ?? ruta
    const colapsado = colapsar.includes(raiz)
    const destino = colapsado ? raiz : ruta
    if (getValues !== undefined && getValues(destino as Path<T>) === undefined) {
      huerfanos.push(mensaje)
      continue
    }
    if (colapsado) {
      if (colapsados.has(raiz)) continue
      colapsados.add(raiz)
    }
    setError(destino as Path<T>, { type: 'server', message: mensaje })
  }
  return huerfanos
}

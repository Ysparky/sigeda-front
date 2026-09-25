import { useCallback, useEffect, useRef } from 'react'

export const MILISEGUNDOS_DE_REBOTE = 300

export function useAccionRetardada<T>(accion: (valor: T) => void, milisegundos: number): (valor: T) => void {
  const ultima = useRef(accion)
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ultima.current = accion
  })

  useEffect(
    () => () => {
      if (reloj.current !== null) clearTimeout(reloj.current)
    },
    [],
  )

  return useCallback(
    (valor: T) => {
      if (reloj.current !== null) clearTimeout(reloj.current)
      reloj.current = setTimeout(() => {
        reloj.current = null
        ultima.current(valor)
      }, milisegundos)
    },
    [milisegundos],
  )
}

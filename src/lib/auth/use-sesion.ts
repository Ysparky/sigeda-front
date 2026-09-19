import { useSyncExternalStore } from 'react'
import { puede, type Permiso } from './permisos'
import { sesion, type Sesion } from './sesion'

export function useSesion(): Sesion | null {
  return useSyncExternalStore(sesion.suscribir, sesion.actual, sesion.actual)
}

export function usePuede(permiso: Permiso | undefined): boolean {
  const actual = useSesion()
  return actual !== null && puede(actual.permisos, permiso)
}

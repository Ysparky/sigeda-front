import { notFound } from '@tanstack/react-router'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { pantallaVisible, type Pantalla } from './pantallas'
import type { Sesion } from './sesion'

export class SinPermisoError extends Error {
  constructor() {
    super(MENSAJE_SIN_PERMISO)
    this.name = 'SinPermisoError'
  }
}

export function exigirPantalla(pantalla: Pantalla, actual: Sesion | null, esDesarrollo: boolean = import.meta.env.DEV) {
  if (pantalla.soloDesarrollo && !esDesarrollo) throw notFound()
  if (!actual || !pantallaVisible(pantalla, actual.permisos, esDesarrollo)) throw new SinPermisoError()
}

export function destinoSeguro(destino: string | undefined): string {
  if (!destino || !destino.startsWith('/') || destino.startsWith('//') || destino.startsWith('/login')) return '/'
  return destino
}

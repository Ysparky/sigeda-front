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
  if (!destino) return '/'
  let url: URL
  try {
    url = new URL(destino, window.location.origin)
  } catch {
    return '/'
  }
  if (url.origin !== window.location.origin) return '/'
  if (url.pathname.startsWith('//')) return '/'
  if (url.pathname.startsWith('/login')) return '/'
  return url.pathname + url.search + url.hash
}

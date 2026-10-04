import { notFound } from '@tanstack/react-router'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { pantallaPorRuta, pantallaVisible, type Pantalla } from './pantallas'
import type { Sesion } from './sesion'

export class SinPermisoError extends Error {
  constructor() {
    super(MENSAJE_SIN_PERMISO)
    this.name = 'SinPermisoError'
  }
}

export function exigirPantalla(pantalla: Pantalla, actual: Sesion | null, esDesarrollo: boolean = import.meta.env.DEV) {
  if (pantalla.soloDesarrollo && !esDesarrollo) throw notFound()
  if (!actual || !pantallaVisible(pantalla, actual, esDesarrollo)) throw new SinPermisoError()
}

/**
 * El destino al que mandar después de iniciar sesión, saneado.
 *
 * ADEMÁS DEL ORIGEN, MIRA LOS PERMISOS DE QUIEN ENTRA. Un `redirect` puede quedar apuntando a una
 * pantalla que la sesión nueva no puede ver —una sesión vencida que otro usuario retoma, o un enlace
 * guardado— y entonces el alumno aterriza en «Acceso restringido» en vez de en Inicio. Sólo se
 * descarta cuando la ruta corresponde a una pantalla CONOCIDA y no visible: una ruta con parámetros
 * (`/seguimiento/$alumno`) no figura en el catálogo por su texto literal y pasa, porque su propia
 * guarda la protege igual.
 */
export function destinoSeguro(destino: string | undefined, actual?: Sesion | null,
    esDesarrollo: boolean = import.meta.env.DEV): string {
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

  const pantalla = pantallaPorRuta(url.pathname)
  if (pantalla && actual && !pantallaVisible(pantalla, actual, esDesarrollo)) return '/'

  return url.pathname + url.search + url.hash
}

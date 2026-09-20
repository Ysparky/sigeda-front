import { HttpResponse } from 'msw'
import { permisosDeRol, type Permiso } from '@/lib/auth/permisos'
import { config } from '@/lib/config'
import { usuarioAutenticado } from './auth'
import { rolPorId } from './datos'
import type { UsuarioMock } from './usuarios'

export const API = config.sigedaApiUrl

export function errorResponse(status: number, error: string, message: string | null, messages: string[] | null = null) {
  return HttpResponse.json(
    { timestamp: '2026-09-19T10:00:00', status, error, message, messages },
    { status },
  )
}

export function autorizar(request: Request, permiso: Permiso): UsuarioMock | Response {
  const usuario = usuarioAutenticado(request)
  if (!usuario) {
    return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 })
  }
  if (!permisosDeRol(rolPorId(usuario.idRol)?.nombre ?? '').has(permiso)) {
    return errorResponse(403, 'Acceso denegado', 'No tienes permisos para realizar esta acción')
  }
  return usuario
}

export function textoNoEncontrado(mensaje: string) {
  return HttpResponse.text(mensaje, { status: 404 })
}

export function textoMalaPeticion(mensaje: string) {
  return HttpResponse.text(mensaje, { status: 400 })
}

export function textoProhibido(mensaje: string) {
  return HttpResponse.text(mensaje, { status: 403 })
}

export function erroresDeCampo(errores: readonly string[]) {
  return HttpResponse.json(errores, { status: 400 })
}

export function guardado(entidad: string, clave: string, cuerpo: unknown) {
  return HttpResponse.json({ mensaje: `${entidad} guardada con éxito.`, [clave]: cuerpo }, { status: 201 })
}

export function textoEliminado(entidad: string) {
  return HttpResponse.text(`${entidad} eliminado con éxito.`)
}

export function numero(url: URL, clave: string, porDefecto: number): number {
  const valor = Number(url.searchParams.get(clave) ?? porDefecto)
  return Number.isFinite(valor) ? valor : porDefecto
}

export function paginar<T extends object>(
  elementos: readonly T[],
  url: URL,
  opciones: { nombreLista: string; propiedadPorDefecto: string; proyectar?: (elemento: T) => unknown },
) {
  const page = numero(url, 'page', 0)
  const size = numero(url, 'size', 6)
  const direccion = (url.searchParams.get('direction') ?? 'ASC').toUpperCase()
  const propiedad = url.searchParams.get('property') ?? opciones.propiedadPorDefecto
  if (page < 0 || size < 1 || (direccion !== 'ASC' && direccion !== 'DESC')) {
    return HttpResponse.json({ error: 'Argumento incorrecto', mensaje: 'Paginado inválido.' }, { status: 400 })
  }
  if (elementos.length > 0 && !(propiedad in elementos[0])) {
    return HttpResponse.json(
      {
        error: 'Argumento incorrecto',
        mensaje: `No se encontró atributo '${propiedad}' para ordenar ${opciones.nombreLista}.`,
      },
      { status: 400 },
    )
  }
  const ordenados = [...elementos].sort((a, b) => {
    const izquierda = String((a as Record<string, unknown>)[propiedad] ?? '')
    const derecha = String((b as Record<string, unknown>)[propiedad] ?? '')
    const comparacion = izquierda.localeCompare(derecha, 'es', { numeric: true })
    return direccion === 'DESC' ? -comparacion : comparacion
  })
  const pagina = ordenados.slice(page * size, page * size + size)
  if (pagina.length === 0) return textoNoEncontrado(`No existen ${opciones.nombreLista} disponibles.`)
  const content = opciones.proyectar ? pagina.map(opciones.proyectar) : pagina
  const totalPages = Math.ceil(ordenados.length / size)
  return HttpResponse.json({
    content,
    totalElements: ordenados.length,
    totalPages,
    size,
    number: page,
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: content.length,
    empty: false,
  })
}

import { ApiError, MENSAJE_SIN_CONEXION, normalizarError } from './errors'
import { aPagina, paginaVacia, type Pagina, type PaginaSpring } from './pagina'

export type Parametros = Record<string, string | number | boolean | null | undefined>

export type ResultadoRenovacion =
  | { estado: 'renovado'; token: string }
  | { estado: 'rechazado' }
  | { estado: 'no-disponible' }

export type Autenticacion = {
  obtenerToken: () => string | null
  renovarToken: () => Promise<ResultadoRenovacion>
  alExpirar: () => void
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE'

export function construirUrl(base: string, ruta: string, parametros?: Parametros): string {
  const url = new URL(ruta, base)
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, String(valor))
  }
  return url.toString()
}

async function leerCuerpo(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text()
  if (texto === '') return null
  try {
    return JSON.parse(texto)
  } catch {
    return texto
  }
}

function esRutaDeAutenticacion(ruta: string) {
  return ruta.startsWith('/auth/')
}

function esNoEncontrado(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

export function crearCliente(base: string, autenticacion: Autenticacion) {
  async function solicitar<T>(
    metodo: Metodo,
    ruta: string,
    cuerpo?: unknown,
    parametros?: Parametros,
    reintentar = true,
  ): Promise<T> {
    const cabeceras: Record<string, string> = { Accept: 'application/json' }
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
    const token = autenticacion.obtenerToken()
    if (token) cabeceras.Authorization = `Bearer ${token}`

    let respuesta: Response
    try {
      respuesta = await fetch(construirUrl(base, ruta, parametros), {
        method: metodo,
        headers: cabeceras,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      })
    } catch {
      throw new ApiError(0, MENSAJE_SIN_CONEXION)
    }

    if (respuesta.status === 401 && reintentar && !esRutaDeAutenticacion(ruta)) {
      const resultado = await autenticacion.renovarToken()
      if (resultado.estado === 'renovado') return solicitar<T>(metodo, ruta, cuerpo, parametros, false)
      if (resultado.estado === 'no-disponible') throw new ApiError(0, MENSAJE_SIN_CONEXION)
      autenticacion.alExpirar()
    }

    const datos = await leerCuerpo(respuesta)
    if (!respuesta.ok) throw normalizarError(respuesta.status, datos)
    return datos as T
  }

  function get<T>(ruta: string, parametros?: Parametros) {
    return solicitar<T>('GET', ruta, undefined, parametros)
  }

  function post<T>(ruta: string, cuerpo?: unknown) {
    return solicitar<T>('POST', ruta, cuerpo)
  }

  function put<T>(ruta: string, cuerpo?: unknown) {
    return solicitar<T>('PUT', ruta, cuerpo)
  }

  function eliminar<T>(ruta: string) {
    return solicitar<T>('DELETE', ruta)
  }

  async function pagina<T>(ruta: string, parametros?: Parametros): Promise<Pagina<T>> {
    try {
      return aPagina(await get<PaginaSpring<T>>(ruta, parametros))
    } catch (error) {
      if (esNoEncontrado(error)) return paginaVacia(Number(parametros?.page ?? 0), Number(parametros?.size ?? 0))
      throw error
    }
  }

  async function lista<T>(ruta: string, parametros?: Parametros): Promise<T[]> {
    try {
      return await get<T[]>(ruta, parametros)
    } catch (error) {
      if (esNoEncontrado(error)) return []
      throw error
    }
  }

  return { get, post, put, eliminar, pagina, lista }
}

export type ClienteHttp = ReturnType<typeof crearCliente>

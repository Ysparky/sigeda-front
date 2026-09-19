import { z } from 'zod'
import { ApiError } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { permisosDeRol, type Permiso } from './permisos'
import { tokens, usernameDelToken } from './tokens'

export type Sesion = {
  usuario: { id: number; username: string; correo: string | null }
  codPersona: string | null
  rol: { id: number; nombre: string }
  permisos: ReadonlySet<Permiso>
}

export const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos.'

const esquemaUsuario = z.object({
  id: z.number(),
  username: z.string(),
  correo: z.string().nullish(),
  codPersona: z.string().nullish(),
  rol: z.object({ id: z.number(), nombre: z.string() }),
})

type RespuestaLogin = { token: string; refresh_token: string; username: string }

let actual: Sesion | null = null
const oyentes = new Set<() => void>()

function fijar(nueva: Sesion | null) {
  actual = nueva
  oyentes.forEach((oyente) => oyente())
}

async function cargar(username: string): Promise<Sesion> {
  const datos = esquemaUsuario.parse(await sigeda.get(`/api/usuarios/nombre/${encodeURIComponent(username)}`))
  return {
    usuario: { id: datos.id, username: datos.username, correo: datos.correo ?? null },
    codPersona: datos.codPersona ?? null,
    rol: { id: datos.rol.id, nombre: datos.rol.nombre },
    permisos: permisosDeRol(datos.rol.nombre),
  }
}

tokens.alExpirar(() => fijar(null))

export const sesion = {
  actual: (): Sesion | null => actual,
  suscribir(oyente: () => void) {
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  },
  async iniciar(username: string, password: string): Promise<Sesion> {
    let respuesta: RespuestaLogin
    try {
      respuesta = await sigeda.post<RespuestaLogin>('/auth/login', { username, password })
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        throw new ApiError(401, MENSAJE_CREDENCIALES)
      }
      throw error
    }
    tokens.guardar(respuesta.token, respuesta.refresh_token)
    try {
      const nueva = await cargar(respuesta.username)
      fijar(nueva)
      return nueva
    } catch (error) {
      tokens.limpiar()
      throw error
    }
  },
  async restaurar(): Promise<Sesion | null> {
    if (!tokens.refresh()) return null
    const acceso = await tokens.renovar()
    const username = acceso ? usernameDelToken(acceso) : null
    if (!username) {
      tokens.limpiar()
      return null
    }
    try {
      const restaurada = await cargar(username)
      fijar(restaurada)
      return restaurada
    } catch {
      tokens.limpiar()
      return null
    }
  },
  async cerrar(): Promise<void> {
    const refresh = tokens.refresh()
    if (refresh) await sigeda.post('/auth/logout', { refreshToken: refresh }).catch(() => undefined)
    tokens.limpiar()
    fijar(null)
  },
  expirar() {
    tokens.limpiar()
    fijar(null)
  },
}

import { z } from 'zod'
import { ApiError } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { permisosDeRol, type Permiso } from './permisos'
import { tokens, usernameDelToken } from './tokens'

export type PersonaDeSesion = { nombre: string; aPaterno: string; aMaterno: string; idGrupo: number | null }

export type Sesion = {
  usuario: { id: number; username: string; correo: string | null }
  codPersona: string | null
  persona: PersonaDeSesion
  rol: { id: number; nombre: string }
  permisos: ReadonlySet<Permiso>
}

export const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos.'
export const MENSAJE_SIN_ROL = 'Su cuenta no tiene un rol asignado. Comuníquese con el administrador.'

export class CuentaSinRolError extends ApiError {
  constructor() {
    super(403, MENSAJE_SIN_ROL)
    this.name = 'CuentaSinRolError'
  }
}

const CUENTA_INVALIDA = new Set([401, 403, 404])

const esquemaPersona = z.object({
  codigo: z.string().nullish(),
  nombre: z.string(),
  aPaterno: z.string().nullish(),
  aMaterno: z.string().nullish(),
  idGrupo: z.number().nullish(),
  usuario: z.object({
    id: z.number(),
    nombre: z.string(),
    correo: z.string().nullish(),
    rol: z.object({ id: z.number(), nombre: z.string() }).nullish(),
  }),
})

/**
 * EL ÚNICO SITIO DONDE UN DESAJUSTE DE FORMA NO DA UNA PANTALLA VACÍA SINO UNA SESIÓN INCONSISTENTE:
 * si `token` llegara ausente, `tokens.guardar(undefined, …)` guardaría basura y la aplicación quedaría
 * «con sesión» pero sin poder autenticar una sola petición. Por eso las tres claves se comprueban de
 * verdad y no con un genérico —`sigeda.post<T>` hace `return datos as T`, sin validar nada—, y se
 * exige que no vengan vacías, que es tan malo como que falten. Comprobado contra el servidor real: las
 * tres llegan y son texto.
 */
const esquemaLogin = z.object({
  token: z.string().min(1),
  refresh_token: z.string().min(1),
  username: z.string().min(1),
})

type RespuestaLogin = z.infer<typeof esquemaLogin>

let actual: Sesion | null = null
let aviso: string | null = null
const oyentes = new Set<() => void>()

export function nombreDeSesion(persona: PersonaDeSesion): string {
  return [persona.nombre, persona.aPaterno].filter(Boolean).join(' ')
}

function fijar(nueva: Sesion | null) {
  actual = nueva
  if (nueva) aviso = null
  oyentes.forEach((oyente) => oyente())
}

async function cargar(username: string): Promise<Sesion> {
  const datos = esquemaPersona.parse(await sigeda.get(`/api/personas/${encodeURIComponent(username)}`))
  if (!datos.usuario.rol) throw new CuentaSinRolError()
  return {
    usuario: { id: datos.usuario.id, username: datos.usuario.nombre, correo: datos.usuario.correo ?? null },
    codPersona: datos.codigo ?? null,
    persona: {
      nombre: datos.nombre,
      aPaterno: datos.aPaterno ?? '',
      aMaterno: datos.aMaterno ?? '',
      idGrupo: datos.idGrupo ?? null,
    },
    rol: { id: datos.usuario.rol.id, nombre: datos.usuario.rol.nombre },
    permisos: permisosDeRol(datos.usuario.rol.nombre),
  }
}

tokens.alExpirar(() => fijar(null))

export const sesion = {
  actual: (): Sesion | null => actual,
  aviso: (): string | null => aviso,
  suscribir(oyente: () => void) {
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  },
  async iniciar(username: string, password: string): Promise<Sesion> {
    let respuesta: RespuestaLogin
    try {
      const cuerpo = await sigeda.post<unknown>('/auth/login', { username, password })
      const validado = esquemaLogin.safeParse(cuerpo)
      // safeParse y no parse: un ZodError NO es un ApiError, así que no pasaría por `normalizarError`
      // ni llegaría a la pantalla como un aviso — saldría como error crudo. Es el mismo problema que
      // tenía `nota_min.toUpperCase()` sobre un null.
      if (!validado.success) {
        throw new ApiError(0, 'El servidor respondió al login con una forma inesperada.')
      }
      respuesta = validado.data
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
    const resultado = await tokens.renovar()
    if (resultado.estado === 'rechazado') {
      tokens.limpiar()
      return null
    }
    if (resultado.estado === 'no-disponible') return null
    const username = usernameDelToken(resultado.token)
    if (!username) {
      tokens.limpiar()
      return null
    }
    try {
      const restaurada = await cargar(username)
      fijar(restaurada)
      return restaurada
    } catch (error) {
      if (error instanceof CuentaSinRolError) {
        tokens.limpiar()
        aviso = MENSAJE_SIN_ROL
        return null
      }
      if (error instanceof ApiError && CUENTA_INVALIDA.has(error.status)) tokens.limpiar()
      return null
    }
  },
  async cerrar(): Promise<void> {
    const refresh = tokens.refresh()
    if (refresh) await sigeda.post('/auth/logout', { refreshToken: refresh }).catch(() => undefined)
    tokens.limpiar()
    aviso = null
    fijar(null)
  },
  expirar() {
    tokens.limpiar()
    aviso = null
    fijar(null)
  },
}

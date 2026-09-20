import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type Rol = { id: number; nombre: string; descripcion: string | null }

export const MENSAJE_CUENTA_GUARDADA = 'Usuario guardada con éxito.'

const esquemaMensaje = z.object({ mensaje: z.string() })

export function soloMensaje(respuesta: unknown, porDefecto: string = MENSAJE_CUENTA_GUARDADA): string {
  const leido = esquemaMensaje.safeParse(respuesta)
  return leido.success ? leido.data.mensaje : porDefecto
}

export const clavesCuentas = {
  todo: ['cuentas'] as const,
  roles: () => [...clavesCuentas.todo, 'roles'] as const,
}

export async function listarRoles(): Promise<Rol[]> {
  const roles = await sigeda.lista<{ id: number; nombre: string; descripcion?: string | null }>('/api/roles')
  return roles.map((rol) => ({ id: rol.id, nombre: rol.nombre, descripcion: rol.descripcion ?? null }))
}

export async function asignarRol(idUsuario: number, idRol: number): Promise<string> {
  const respuesta = await sigeda.put<unknown>(`/api/usuarios/${encodeURIComponent(idUsuario)}/rol`, {
    rol: { id: idRol },
  })
  return soloMensaje(respuesta)
}

export async function restablecerContrasena(idUsuario: number, username: string, password: string): Promise<string> {
  const respuesta = await sigeda.put<unknown>(`/api/usuarios/${encodeURIComponent(idUsuario)}`, { username, password })
  return soloMensaje(respuesta)
}

export async function cambiarContrasenaPropia(
  idUsuario: number,
  username: string,
  password: string,
  passwordActual: string,
): Promise<string> {
  const respuesta = await sigeda.put<unknown>(`/api/usuarios/${encodeURIComponent(idUsuario)}`, {
    username,
    password,
    passwordActual,
  })
  return soloMensaje(respuesta)
}

export const consultasCuentas = {
  roles: () => queryOptions({ queryKey: clavesCuentas.roles(), queryFn: listarRoles, staleTime: 300_000 }),
}

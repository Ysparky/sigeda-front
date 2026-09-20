import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import type { CuerpoPersonaNueva } from './schemas'

export type PersonaFila = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  rango: string | null
  tipo: string | null
}

export type CuentaDePersona = {
  id: number
  username: string
  correo: string | null
  rol: { id: number; nombre: string } | null
}

export type PersonaDetalle = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  dni: string | null
  rango: string | null
  tipo: string | null
  estado: string | null
  grupo: { id: number; nombre: string } | null
  cuenta: CuentaDePersona | null
}

type IndexPersonaApi = {
  codigo: string
  nombre: string
  aPaterno?: string | null
  aMaterno?: string | null
  rango?: string | null
  tipo?: string | null
}

export const MENSAJE_PERSONA_GUARDADA = 'Persona guardada con éxito.'
export const MENSAJE_PERSONA_ELIMINADA = 'Persona eliminado con éxito.'

const esquemaDetalle = z.object({
  codigo: z.string(),
  nombre: z.string(),
  aPaterno: z.string().nullish(),
  aMaterno: z.string().nullish(),
  dni: z.string().nullish(),
  rango: z.string().nullish(),
  tipo: z.string().nullish(),
  estado: z.string().nullish(),
  grupo: z.object({ id: z.number(), nombre: z.string() }).nullish(),
  usuario: z
    .object({
      id: z.number().nullish(),
      nombre: z.string(),
      correo: z.string().nullish(),
      rol: z.object({ id: z.number(), nombre: z.string() }).nullish(),
    })
    .nullish(),
})

const esquemaIdDeUsuario = z.object({ usuario: z.object({ id: z.number() }) })

const esquemaPersonaCreada = z.object({ mensaje: z.string(), persona: z.object({ codigo: z.string() }) })

export function apellidosYNombres(persona: Pick<PersonaFila, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  const apellidos = [persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
  return apellidos === '' ? persona.nombre : `${apellidos}, ${persona.nombre}`
}

export function nombreCompletoDePersona(persona: Pick<PersonaFila, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  return [persona.nombre, persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
}

export function aPersonaFila(persona: IndexPersonaApi): PersonaFila {
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno ?? '',
    aMaterno: persona.aMaterno ?? '',
    rango: persona.rango ?? null,
    tipo: persona.tipo ?? null,
  }
}

export const clavesPersonas = {
  todo: ['personas'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesPersonas.todo, 'lista', parametros] as const,
  detalle: (codigo: string) => [...clavesPersonas.todo, 'detalle', codigo] as const,
}

export async function listarPersonas(parametros: ParametrosPagina): Promise<Pagina<PersonaFila>> {
  const pagina = await sigeda.pagina<IndexPersonaApi>('/api/personas', parametros)
  return { ...pagina, items: pagina.items.map(aPersonaFila) }
}

async function idDeUsuario(username: string): Promise<number | null> {
  try {
    const leida = esquemaIdDeUsuario.parse(await sigeda.get(`/api/personas/${encodeURIComponent(username)}`))
    return leida.usuario.id
  } catch {
    return null
  }
}

export async function obtenerPersona(codigo: string): Promise<PersonaDetalle> {
  const datos = esquemaDetalle.parse(await sigeda.get(`/api/personas/${encodeURIComponent(codigo)}/usuario`))
  const usuario = datos.usuario ?? null
  const idUsuario = usuario === null ? null : (usuario.id ?? (await idDeUsuario(usuario.nombre)))
  return {
    codigo: datos.codigo,
    nombre: datos.nombre,
    aPaterno: datos.aPaterno ?? '',
    aMaterno: datos.aMaterno ?? '',
    dni: datos.dni ?? null,
    rango: datos.rango ?? null,
    tipo: datos.tipo ?? null,
    estado: datos.estado ?? null,
    grupo: datos.grupo ?? null,
    cuenta:
      usuario && idUsuario !== null
        ? { id: idUsuario, username: usuario.nombre, correo: usuario.correo ?? null, rol: usuario.rol ?? null }
        : null,
  }
}

export async function crearPersona(cuerpo: CuerpoPersonaNueva): Promise<{ mensaje: string; codigo: string }> {
  const respuesta = await sigeda.post<unknown>('/api/personas', cuerpo)
  const leida = esquemaPersonaCreada.safeParse(respuesta)
  return leida.success
    ? { mensaje: leida.data.mensaje, codigo: leida.data.persona.codigo }
    : { mensaje: MENSAJE_PERSONA_GUARDADA, codigo: cuerpo.codigo }
}

export async function eliminarPersona(codigo: string): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/personas/${encodeURIComponent(codigo)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_PERSONA_ELIMINADA
}

export async function modificarPersona(
  codigo: string,
  cuerpo: { rango: string | null; tipo: string | null },
): Promise<string> {
  const respuesta = await sigeda.put<unknown>(`/api/personas/${encodeURIComponent(codigo)}`, cuerpo)
  return soloMensaje(respuesta, MENSAJE_PERSONA_GUARDADA)
}

export const consultasPersonas = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesPersonas.lista(parametros),
      queryFn: () => listarPersonas(parametros),
      placeholderData: keepPreviousData,
    }),
  detalle: (codigo: string) =>
    queryOptions({ queryKey: clavesPersonas.detalle(codigo), queryFn: () => obtenerPersona(codigo) }),
}

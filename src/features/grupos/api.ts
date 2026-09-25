import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import { ApiError } from '@/lib/api/errors'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type GrupoFila = { id: number; nombre: string; descripcion: string | null; programa: string }

export type AlumnoDeGrupo = { codigo: string; nombreCompleto: string; estado: string | null }

export type GrupoDetalle = {
  id: number
  nombre: string
  descripcion: string | null
  programa: string
  alumnos: AlumnoDeGrupo[]
}

export type CuerpoGrupoNuevo = {
  nombre: string
  descripcion: string | null
  programa: string
  personas: { codigo: string }[]
}

export type CuerpoGrupoModificado = {
  nombre: string
  descripcion: string | null
  personas: { codigo: string; checked: boolean }[]
}

export const MENSAJE_GRUPO_GUARDADO = 'Grupo guardada con éxito.'
export const MENSAJE_GRUPO_ELIMINADO = 'Grupo eliminado con éxito.'
export const MENSAJE_GRUPO_NO_ENCONTRADO = 'Grupo especificada no existe.'

const esquemaFila = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullish(),
  programa: z.string().nullish(),
})

const esquemaDetalle = esquemaFila.extend({
  personas: z
    .array(
      z.object({
        codigo: z.string(),
        nombre: z.string(),
        aPaterno: z.string().nullish(),
        aMaterno: z.string().nullish(),
        estado: z.string().nullish(),
      }),
    )
    .nullish(),
})

const esquemaGrupoGuardado = z.object({ mensaje: z.string(), grupo: z.object({ id: z.number() }) })

export const clavesGrupos = {
  todo: ['grupos'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesGrupos.todo, 'lista', parametros] as const,
  detalle: (id: number) => [...clavesGrupos.todo, 'detalle', id] as const,
  alumnosSinGrupo: () => [...clavesGrupos.todo, 'alumnos-sin-grupo'] as const,
}

export async function listarGrupos(parametros: ParametrosPagina): Promise<Pagina<GrupoFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/grupos', parametros)
  return {
    ...pagina,
    items: pagina.items.map((fila) => {
      const grupo = esquemaFila.parse(fila)
      return { id: grupo.id, nombre: grupo.nombre, descripcion: grupo.descripcion ?? null, programa: grupo.programa ?? '' }
    }),
  }
}

export async function obtenerGrupo(id: number): Promise<GrupoDetalle> {
  const respuesta = await sigeda.get<unknown>(`/api/grupos/${encodeURIComponent(id)}`)
  if (respuesta === null || respuesta === undefined) throw new ApiError(404, MENSAJE_GRUPO_NO_ENCONTRADO)
  const grupo = esquemaDetalle.parse(respuesta)
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    descripcion: grupo.descripcion ?? null,
    programa: grupo.programa ?? '',
    alumnos: (grupo.personas ?? []).map((persona) => ({
      codigo: persona.codigo,
      nombreCompleto: [persona.nombre, persona.aPaterno, persona.aMaterno].filter(Boolean).join(' '),
      estado: persona.estado ?? null,
    })),
  }
}

export async function listarAlumnosSinGrupo(): Promise<AlumnoDeGrupo[]> {
  const alumnos = await sigeda.lista<{ codigo: string; nombre: string; aPaterno?: string | null; aMaterno?: string | null }>(
    '/api/personas/alumno/Alumno',
  )
  return alumnos.map((alumno) => ({
    codigo: alumno.codigo,
    nombreCompleto: [alumno.nombre, alumno.aPaterno, alumno.aMaterno].filter(Boolean).join(' '),
    estado: null,
  }))
}

export type GrupoGuardado = { mensaje: string; id: number | null }

function grupoGuardado(respuesta: unknown, idPorDefecto: number | null): GrupoGuardado {
  const leida = esquemaGrupoGuardado.safeParse(respuesta)
  return leida.success
    ? { mensaje: leida.data.mensaje, id: leida.data.grupo.id }
    : { mensaje: soloMensaje(respuesta, MENSAJE_GRUPO_GUARDADO), id: idPorDefecto }
}

export async function crearGrupo(cuerpo: CuerpoGrupoNuevo): Promise<GrupoGuardado> {
  return grupoGuardado(await sigeda.post<unknown>('/api/grupos', cuerpo), null)
}

export async function modificarGrupo(id: number, cuerpo: CuerpoGrupoModificado): Promise<GrupoGuardado> {
  return grupoGuardado(await sigeda.put<unknown>(`/api/grupos/${encodeURIComponent(id)}`, cuerpo), id)
}

export async function eliminarGrupo(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/grupos/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_GRUPO_ELIMINADO
}

export const consultasGrupos = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesGrupos.lista(parametros),
      queryFn: () => listarGrupos(parametros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) => queryOptions({ queryKey: clavesGrupos.detalle(id), queryFn: () => obtenerGrupo(id) }),
  alumnosSinGrupo: () =>
    queryOptions({ queryKey: clavesGrupos.alumnosSinGrupo(), queryFn: listarAlumnosSinGrupo, staleTime: 300_000 }),
}

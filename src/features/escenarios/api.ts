import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type Indicador = {
  id: number
  nombre: string
  descripcion: string | null
  competencia: string | null
  orden: number
}

export type Escenario = {
  id: number
  nombre: string
  descripcion: string | null
  objetivo: string | null
  duracionMin: number | null
  activo: boolean
  indicadores: Indicador[]
  idSubfase: number | null
  subfase: string | null
}

export type CuerpoIndicador = { nombre: string; descripcion: string; competencia: string; orden: number }

export type CuerpoEscenario = {
  nombre: string
  descripcion: string
  objetivo: string
  duracionMin: number | null
  activo: boolean
  indicadores: CuerpoIndicador[]
  idSubfase: number | null
}

const nulable = z
  .string()
  .nullish()
  .transform((v) => v ?? null)

const esquemaIndicador = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: nulable,
  competencia: nulable,
  orden: z.number(),
})

const esquemaEscenario = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: nulable,
  objetivo: nulable,
  duracionMin: z
    .number()
    .nullish()
    .transform((v) => v ?? null),
  activo: z.boolean(),
  indicadores: z.array(esquemaIndicador).default([]),
  idSubfase: z.number().nullish().transform((v) => v ?? null),
  subfase: nulable,
})

export const clavesEscenarios = {
  todo: ['escenarios'] as const,
  lista: () => [...clavesEscenarios.todo, 'lista'] as const,
  detalle: (id: number) => [...clavesEscenarios.todo, 'detalle', id] as const,
}

export async function listarEscenarios(): Promise<Escenario[]> {
  const filas = await sigeda.lista<unknown>('/api/escenarios')
  return filas.map((fila) => esquemaEscenario.parse(fila))
}

export async function obtenerEscenario(id: number): Promise<Escenario> {
  return esquemaEscenario.parse(await sigeda.get<unknown>(`/api/escenarios/${id}`))
}

export async function crearEscenario(cuerpo: CuerpoEscenario): Promise<Escenario> {
  const respuesta = await sigeda.post<{ escenario: unknown }>('/api/escenarios', cuerpo)
  return esquemaEscenario.parse(respuesta.escenario)
}

export async function modificarEscenario(id: number, cuerpo: CuerpoEscenario): Promise<Escenario> {
  return esquemaEscenario.parse(await sigeda.put<unknown>(`/api/escenarios/${id}`, cuerpo))
}

export const escenariosQuery = () =>
  queryOptions({ queryKey: clavesEscenarios.lista(), queryFn: listarEscenarios })

export const escenarioQuery = (id: number) =>
  queryOptions({ queryKey: clavesEscenarios.detalle(id), queryFn: () => obtenerEscenario(id) })

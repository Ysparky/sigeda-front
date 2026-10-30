import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type TipoSimulador = 'FNPT' | 'FTD' | 'FFS'

export type Simulador = {
  id: number
  nombre: string
  tipo: TipoSimulador
  descripcion: string | null
  ubicacion: string | null
  activo: boolean
}

export type CuerpoSimulador = {
  nombre: string
  tipo: TipoSimulador
  descripcion: string
  ubicacion: string
  activo: boolean
}

const esquemaSimulador = z.object({
  id: z.number(),
  nombre: z.string(),
  tipo: z.enum(['FNPT', 'FTD', 'FFS']),
  descripcion: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  ubicacion: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  activo: z.boolean(),
})

export const clavesSimuladores = {
  todo: ['simuladores'] as const,
  lista: () => [...clavesSimuladores.todo, 'lista'] as const,
  detalle: (id: number) => [...clavesSimuladores.todo, 'detalle', id] as const,
}

export async function listarSimuladores(): Promise<Simulador[]> {
  const filas = await sigeda.lista<unknown>('/api/simuladores')
  return filas.map((fila) => esquemaSimulador.parse(fila))
}

export async function obtenerSimulador(id: number): Promise<Simulador> {
  return esquemaSimulador.parse(await sigeda.get<unknown>(`/api/simuladores/${id}`))
}

export async function crearSimulador(cuerpo: CuerpoSimulador): Promise<Simulador> {
  const respuesta = await sigeda.post<{ simulador: unknown }>('/api/simuladores', cuerpo)
  return esquemaSimulador.parse(respuesta.simulador)
}

export async function modificarSimulador(id: number, cuerpo: CuerpoSimulador): Promise<Simulador> {
  return esquemaSimulador.parse(await sigeda.put<unknown>(`/api/simuladores/${id}`, cuerpo))
}

export const simuladoresQuery = () =>
  queryOptions({ queryKey: clavesSimuladores.lista(), queryFn: listarSimuladores })

export const simuladorQuery = (id: number) =>
  queryOptions({ queryKey: clavesSimuladores.detalle(id), queryFn: () => obtenerSimulador(id) })

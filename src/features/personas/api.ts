import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type PersonaFila = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  rango: string | null
  tipo: string | null
}

type IndexPersonaApi = {
  codigo: string
  nombre: string
  aPaterno?: string | null
  aMaterno?: string | null
  rango?: string | null
  tipo?: string | null
}

export function apellidosYNombres(persona: Pick<PersonaFila, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  const apellidos = [persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
  return apellidos === '' ? persona.nombre : `${apellidos}, ${persona.nombre}`
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

export const consultasPersonas = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesPersonas.lista(parametros),
      queryFn: () => listarPersonas(parametros),
      placeholderData: keepPreviousData,
    }),
}

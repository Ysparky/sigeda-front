import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type ManiobraFila = { id: number; nombre: string; descripcion: string | null }

export type EstandarDeManiobra = { id: number; nombre: string; descripcion: string | null }

export type SubfaseDeManiobra = { id: number; nombre: string }

export type ManiobraDetalle = ManiobraFila & {
  estandares: EstandarDeManiobra[]
  subfases: SubfaseDeManiobra[] | null
}

export type CuerpoManiobra = { nombre: string; descripcion: string; subfases: { idSubfase: number }[] }

export type CuerpoEstandares = { estandares: { id: number; nombre: string; descripcion: string }[] }

const esquemaFila = z.object({ id: z.number(), nombre: z.string(), descripcion: z.string().nullish() })

const esquemaDetalle = esquemaFila.extend({
  estandares: z.array(esquemaFila).nullish(),
  subfases: z.array(z.object({ id: z.number(), nombre: z.string() })).nullish(),
})

export const clavesManiobras = {
  todo: ['maniobras'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesManiobras.todo, 'lista', parametros] as const,
  detalle: (id: number) => [...clavesManiobras.todo, 'detalle', id] as const,
}

function aFila(maniobra: z.infer<typeof esquemaFila>): ManiobraFila {
  return { id: maniobra.id, nombre: maniobra.nombre, descripcion: maniobra.descripcion ?? null }
}

export async function listarManiobras(parametros: ParametrosPagina): Promise<Pagina<ManiobraFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/maniobras', {
    page: parametros.page,
    size: parametros.size,
    direction: parametros.direction,
    properties: parametros.property,
  })
  return { ...pagina, items: pagina.items.map((fila) => aFila(esquemaFila.parse(fila))) }
}

export async function obtenerManiobra(id: number): Promise<ManiobraDetalle> {
  const maniobra = esquemaDetalle.parse(await sigeda.get(`/api/maniobras/${encodeURIComponent(id)}`))
  return {
    ...aFila(maniobra),
    estandares: (maniobra.estandares ?? []).map(aFila),
    subfases: maniobra.subfases === null || maniobra.subfases === undefined ? null : maniobra.subfases,
  }
}

export async function crearManiobra(cuerpo: CuerpoManiobra): Promise<number> {
  const maniobra = esquemaFila.parse(await sigeda.post('/api/maniobras', cuerpo))
  return maniobra.id
}

export async function modificarManiobra(id: number, cuerpo: CuerpoManiobra): Promise<number> {
  const maniobra = esquemaFila.parse(await sigeda.put(`/api/maniobras/${encodeURIComponent(id)}`, cuerpo))
  return maniobra.id
}

export async function guardarEstandares(id: number, cuerpo: CuerpoEstandares): Promise<void> {
  await sigeda.put<unknown>(`/api/maniobras/${encodeURIComponent(id)}/estandar`, cuerpo)
}

export async function eliminarManiobra(id: number): Promise<void> {
  await sigeda.eliminar<unknown>(`/api/maniobras/${encodeURIComponent(id)}`)
}

export const consultasManiobras = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesManiobras.lista(parametros),
      queryFn: () => listarManiobras(parametros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) =>
    queryOptions({ queryKey: clavesManiobras.detalle(id), queryFn: () => obtenerManiobra(id) }),
}

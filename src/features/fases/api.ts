import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type FaseFila = { id: number; nombre: string; descripcion: string | null }

export type SubfaseDeFase = { id: number; nombre: string; descripcion: string | null }

export type FaseDetalle = FaseFila & { subfases: SubfaseDeFase[] }

export type SubfaseDetalle = SubfaseDeFase & { maniobras: { id: number; nombre: string }[] }

export type CuerpoFase = {
  nombre: string
  descripcion: string
  subfases: { id: number; nombre: string; descripcion: string }[]
}

const esquemaFila = z.object({ id: z.number(), nombre: z.string(), descripcion: z.string().nullish() })

const esquemaDetalle = esquemaFila.extend({ subfases: z.array(esquemaFila).nullish() })

const esquemaSubfase = esquemaFila.extend({
  maniobrasSubfase: z
    .array(z.object({ maniobra: z.object({ id: z.number(), nombre: z.string() }) }))
    .nullish(),
})

export type FaseConSubfases = { fase: FaseFila; subfases: SubfaseDeFase[] }

export const clavesFases = {
  todo: ['fases'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesFases.todo, 'lista', parametros] as const,
  catalogo: () => [...clavesFases.todo, 'catalogo'] as const,
  conSubfases: () => [...clavesFases.todo, 'con-subfases'] as const,
  detalle: (id: number) => [...clavesFases.todo, 'detalle', id] as const,
  subfase: (id: number) => [...clavesFases.todo, 'subfase', id] as const,
}

function aFila(fase: z.infer<typeof esquemaFila>): FaseFila {
  return { id: fase.id, nombre: fase.nombre, descripcion: fase.descripcion ?? null }
}

export async function listarFases(parametros: ParametrosPagina): Promise<Pagina<FaseFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/fases', {
    page: parametros.page,
    size: parametros.size,
    direction: parametros.direction,
    properties: parametros.property,
  })
  return { ...pagina, items: pagina.items.map((fila) => aFila(esquemaFila.parse(fila))) }
}

export async function listarTodasLasFases(): Promise<FaseFila[]> {
  const primera = await listarFases({ page: 0, size: 10, direction: 'ASC' })
  const restantes = await Promise.all(
    Array.from({ length: Math.max(primera.totalPages - 1, 0) }, (_, indice) =>
      listarFases({ page: indice + 1, size: 10, direction: 'ASC' }),
    ),
  )
  return [primera, ...restantes].flatMap((pagina) => pagina.items)
}

export async function obtenerFase(id: number): Promise<FaseDetalle> {
  const fase = esquemaDetalle.parse(await sigeda.get(`/api/fases/${encodeURIComponent(id)}`))
  return { ...aFila(fase), subfases: (fase.subfases ?? []).map(aFila) }
}

export async function obtenerSubfase(id: number): Promise<SubfaseDetalle> {
  const subfase = esquemaSubfase.parse(await sigeda.get(`/api/subfases/${encodeURIComponent(id)}`))
  return {
    ...aFila(subfase),
    maniobras: (subfase.maniobrasSubfase ?? []).map((enlace) => enlace.maniobra),
  }
}

export async function listarFasesConSubfases(): Promise<FaseConSubfases[]> {
  const fases = await listarTodasLasFases()
  return Promise.all(fases.map(async (fase) => ({ fase, subfases: (await obtenerFase(fase.id)).subfases })))
}

export async function crearFase(cuerpo: CuerpoFase): Promise<number> {
  const fase = esquemaFila.parse(await sigeda.post('/api/fases', cuerpo))
  return fase.id
}

export async function modificarFase(id: number, cuerpo: CuerpoFase): Promise<number> {
  const fase = esquemaFila.parse(await sigeda.put(`/api/fases/${encodeURIComponent(id)}`, cuerpo))
  return fase.id
}

export async function eliminarFase(id: number): Promise<void> {
  await sigeda.eliminar<unknown>(`/api/fases/${encodeURIComponent(id)}`)
}

export const consultasFases = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesFases.lista(parametros),
      queryFn: () => listarFases(parametros),
      placeholderData: keepPreviousData,
    }),
  catalogo: () => queryOptions({ queryKey: clavesFases.catalogo(), queryFn: listarTodasLasFases, staleTime: 300_000 }),
  conSubfases: () =>
    queryOptions({ queryKey: clavesFases.conSubfases(), queryFn: listarFasesConSubfases, staleTime: 300_000 }),
  detalle: (id: number) => queryOptions({ queryKey: clavesFases.detalle(id), queryFn: () => obtenerFase(id) }),
  subfase: (id: number) => queryOptions({ queryKey: clavesFases.subfase(id), queryFn: () => obtenerSubfase(id) }),
}

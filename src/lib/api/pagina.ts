export type Pagina<T> = { items: T[]; page: number; size: number; total: number; totalPages: number }

export type PaginaSpring<T> = {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

export function aPagina<T>(pagina: PaginaSpring<T>): Pagina<T> {
  return {
    items: pagina.content,
    page: pagina.number,
    size: pagina.size,
    total: pagina.totalElements,
    totalPages: pagina.totalPages,
  }
}

export function paginaVacia<T>(page = 0, size = 0): Pagina<T> {
  return { items: [], page, size, total: 0, totalPages: 0 }
}

export type DireccionOrden = 'ASC' | 'DESC'

export type ParametrosPagina = { page: number; size: number; property?: string; direction: DireccionOrden }

export async function todasLasPaginas<T>(
  traer: (parametros: { page: number; size: number }) => Promise<Pagina<T>>,
  size: number,
): Promise<T[]> {
  const primera = await traer({ page: 0, size })
  const restantes = await Promise.all(
    Array.from({ length: Math.max(primera.totalPages - 1, 0) }, (_, indice) => traer({ page: indice + 1, size })),
  )
  return [primera, ...restantes].flatMap((pagina) => pagina.items)
}

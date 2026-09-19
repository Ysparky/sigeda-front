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

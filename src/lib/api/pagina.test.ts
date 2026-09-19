import { describe, expect, it } from 'vitest'
import { aPagina, paginaVacia } from './pagina'

describe('pagina', () => {
  it('convierte un Page de Spring', () => {
    expect(
      aPagina({ content: [{ id: 1 }], number: 2, size: 6, totalElements: 13, totalPages: 3 }),
    ).toEqual({ items: [{ id: 1 }], page: 2, size: 6, total: 13, totalPages: 3 })
  })

  it('crea una página vacía', () => {
    expect(paginaVacia(1, 6)).toEqual({ items: [], page: 1, size: 6, total: 0, totalPages: 0 })
  })
})

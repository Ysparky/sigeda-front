import { describe, expect, it } from 'vitest'
import { aPagina, paginaVacia, todasLasPaginas, type Pagina } from './pagina'

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

describe('todasLasPaginas', () => {
  function servidor(total: number, size: number) {
    const filas = Array.from({ length: total }, (_, indice) => indice)
    const pedidas: { page: number; size: number }[] = []
    const traer = (parametros: { page: number; size: number }): Promise<Pagina<number>> => {
      pedidas.push(parametros)
      return Promise.resolve({
        items: filas.slice(parametros.page * parametros.size, parametros.page * parametros.size + parametros.size),
        page: parametros.page,
        size: parametros.size,
        total,
        totalPages: Math.ceil(total / size),
      })
    }
    return { pedidas, traer }
  }

  it('recorre hasta totalPages con el tamaño pedido y no pierde la última página', async () => {
    const { pedidas, traer } = servidor(25, 10)
    await expect(todasLasPaginas(traer, 10)).resolves.toHaveLength(25)
    expect(pedidas).toEqual([
      { page: 0, size: 10 },
      { page: 1, size: 10 },
      { page: 2, size: 10 },
    ])
  })

  it('con una sola página pide una sola vez y con totalPages 0 devuelve una lista vacía', async () => {
    const unaPagina = servidor(4, 100)
    await expect(todasLasPaginas(unaPagina.traer, 100)).resolves.toHaveLength(4)
    expect(unaPagina.pedidas).toEqual([{ page: 0, size: 100 }])
    const vacio = servidor(0, 10)
    await expect(todasLasPaginas(vacio.traer, 10)).resolves.toEqual([])
    expect(vacio.pedidas).toHaveLength(1)
  })
})

import { describe, expect, it } from 'vitest'
import { iniciarComo } from '@/test/render'
import { listarOrdenDeMerito, obtenerIndices } from './api'

describe('capa de API de reportes', () => {
  it('contrato §3.1 los índices llegan con sus dos mitades y su desglose', async () => {
    await iniciarComo('instructor.perez')
    const indices = await obtenerIndices('555555')
    expect(indices).toMatchObject({ codigo: '555555', programa: 'PDI', nfpi: 16.44 })
    expect(indices.nit).toMatchObject({ valor: 17.6, nct: 18, nei: 16 })
    expect(indices.nia.fases.map((fase) => fase.valor)).toEqual([14.5, 16, 16.5, 17.44, 17.5])
    expect(indices.nit.asignaturas.every((asignatura) => asignatura.na !== null)).toBe(true)
  })

  it('contrato §4.1 el orden de mérito se pide por programa y grupo, paginado', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await listarOrdenDeMerito({ programa: 'PDI', page: 0, size: 2, direction: 'ASC' })
    expect(pagina.items.map((fila) => fila.codigo)).toEqual(['222222', '555555'])
    expect(pagina.total).toBe(6)
    expect(pagina.totalPages).toBe(3)
    const porGrupo = await listarOrdenDeMerito({ programa: 'PDI', idGrupo: 6, page: 0, size: 10, direction: 'ASC' })
    expect(porGrupo.items.map((fila) => [fila.puesto, fila.codigo])).toEqual([[1, '999999']])
  })

  it('contrato §4.1 una lista vacía llega como página vacía y no como error', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await listarOrdenDeMerito({ programa: 'PDE', page: 0, size: 10, direction: 'ASC' })
    expect(pagina.items).toEqual([])
    expect(pagina.total).toBe(0)
  })
})

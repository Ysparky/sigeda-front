import { describe, expect, it } from 'vitest'
import { iniciarComo } from '@/test/render'
import { aPersonaFila, apellidosYNombres, listarPersonas } from './api'

const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }

describe('api de personas', () => {
  it('CA-PER-01 lista las personas paginadas con su tipo', async () => {
    await iniciarComo('admin.sistema')
    const pagina = await listarPersonas({ ...PAGINA, property: 'codigo' })
    expect(pagina).toMatchObject({ page: 0, size: 10, total: 13 })
    expect(pagina.items[1]).toEqual({
      codigo: '111111',
      nombre: 'Oscar',
      aPaterno: 'Lopez',
      aMaterno: 'Chaparro',
      rango: 'Cadete',
      tipo: 'Alumno',
    })
  })

  it('dependencia 27 tolera una fila sin tipo ni rango', () => {
    const fila = aPersonaFila({ codigo: '123ABC', nombre: 'Rosa', aPaterno: 'Quispe' })
    expect(fila).toEqual({ codigo: '123ABC', nombre: 'Rosa', aPaterno: 'Quispe', aMaterno: '', rango: null, tipo: null })
    expect(apellidosYNombres(fila)).toBe('Quispe, Rosa')
  })
})

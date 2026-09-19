import { describe, expect, it } from 'vitest'
import { categoriaDesde, esCategoriaProgramada, etiquetaCategoria, requiereEvaluador } from './categorias'

describe('categorías de evaluación', () => {
  it('CA-EVA-11 entiende la grafía de la petición y la de la respuesta', () => {
    expect(categoriaDesde('chequeoSubFase')).toBe('chequeoSubFase')
    expect(categoriaDesde('Chequeo Sub Fase')).toBe('chequeoSubFase')
    expect(categoriaDesde('Complementacion')).toBe('Complementacion')
    expect(categoriaDesde('Complementación')).toBe('Complementacion')
    expect(categoriaDesde('Ponderada')).toBe('Ponderada')
    expect(categoriaDesde('Otra')).toBeNull()
  })

  it('muestra la grafía de la respuesta', () => {
    expect(etiquetaCategoria('chequeoSubFase')).toBe('Chequeo Sub Fase')
    expect(etiquetaCategoria('Complementacion')).toBe('Complementación')
  })

  it('CA-EVA-11 pide el código del evaluador solo en Chequeo y Complementación', () => {
    expect(esCategoriaProgramada('Ponderada')).toBe(true)
    expect(esCategoriaProgramada('chequeoSubFase')).toBe(true)
    expect(requiereEvaluador('Chequeo')).toBe(true)
    expect(requiereEvaluador('Complementacion')).toBe(true)
    expect(requiereEvaluador('Ponderada')).toBe(false)
  })
})

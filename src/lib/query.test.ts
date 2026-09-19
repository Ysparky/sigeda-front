import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { errorDePrimeraCarga } from './query'

describe('errorDePrimeraCarga', () => {
  const primero = new ApiError(400, 'Primero')
  const segundo = new ApiError(400, 'Segundo')

  it('devuelve el primer error de una consulta que nunca trajo datos', () => {
    expect(
      errorDePrimeraCarga(
        { error: null, data: undefined },
        { error: primero, data: undefined },
        { error: segundo, data: undefined },
      ),
    ).toBe(primero)
  })

  it('ignora la falla de una recarga cuando ya hay datos', () => {
    expect(errorDePrimeraCarga({ error: primero, data: [] }, { error: segundo, data: undefined })).toBe(segundo)
    expect(errorDePrimeraCarga({ error: primero, data: null })).toBeNull()
  })

  it('devuelve null si no hay fallas', () => {
    expect(errorDePrimeraCarga()).toBeNull()
    expect(errorDePrimeraCarga({ error: null, data: undefined }, { error: null, data: 1 })).toBeNull()
  })
})

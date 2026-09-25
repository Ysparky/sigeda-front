import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { crearQueryClient, errorDePrimeraCarga } from './query'

function opcionesDeConsulta(cliente: ReturnType<typeof crearQueryClient>) {
  const queries = cliente.getDefaultOptions().queries
  const retry = queries?.retry as (fallas: number, error: unknown) => boolean
  return { staleTime: queries?.staleTime, retry }
}

describe('crearQueryClient', () => {
  it('conserva los datos treinta segundos y reintenta solo los errores del servidor', () => {
    const { staleTime, retry } = opcionesDeConsulta(crearQueryClient())
    expect(staleTime).toBe(30_000)
    expect(retry(0, new ApiError(500, 'Error'))).toBe(true)
    expect(retry(0, new ApiError(0, 'Error'))).toBe(true)
    expect(retry(2, new ApiError(500, 'Error'))).toBe(false)
    expect(retry(0, new ApiError(400, 'Error'))).toBe(false)
  })

  it('sin reintentos conserva el mismo staleTime que producción', () => {
    const { staleTime, retry } = opcionesDeConsulta(crearQueryClient({ reintentar: false }))
    expect(staleTime).toBe(30_000)
    expect(retry(0, new ApiError(500, 'Error'))).toBe(false)
  })
})

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

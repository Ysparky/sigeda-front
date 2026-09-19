import { describe, expect, it } from 'vitest'
import {
  contarRespectoAlEstandar,
  esBajoEstandar,
  esCalificacionValida,
  esNotaDirbe,
  esSobreEstandar,
  opcionesDeNota,
} from './dirbe'

describe('DIRBE', () => {
  it('CA-EVA-04 ofrece solo las calificaciones válidas para cada nota mínima', () => {
    expect(opcionesDeNota('D')).toEqual(['D'])
    expect(opcionesDeNota('I')).toEqual(['I', 'R'])
    expect(opcionesDeNota('R')).toEqual(['I', 'R', 'B'])
    expect(opcionesDeNota('B')).toEqual(['I', 'R', 'B', 'E'])
    expect(opcionesDeNota('E')).toEqual(['I', 'R', 'B', 'E'])
  })

  it('CA-EVA-04 rechaza las combinaciones que el backend marca como no válidas', () => {
    for (const [minima, nota] of [
      ['I', 'D'],
      ['I', 'B'],
      ['I', 'E'],
      ['R', 'D'],
      ['R', 'E'],
      ['B', 'D'],
      ['E', 'D'],
      ['D', 'B'],
    ] as const) {
      expect(esCalificacionValida(minima, nota)).toBe(false)
    }
    expect(esCalificacionValida('B', 'E')).toBe(true)
  })

  it('CA-EVA-05 considera bajo el estándar solo RI, BI y BR', () => {
    expect(esBajoEstandar('R', 'I')).toBe(true)
    expect(esBajoEstandar('B', 'I')).toBe(true)
    expect(esBajoEstandar('B', 'R')).toBe(true)
    expect(esBajoEstandar('E', 'B')).toBe(false)
    expect(esBajoEstandar('B', 'B')).toBe(false)
  })

  it('considera sobre el estándar IR, RB y BE', () => {
    expect(esSobreEstandar('I', 'R')).toBe(true)
    expect(esSobreEstandar('R', 'B')).toBe(true)
    expect(esSobreEstandar('B', 'E')).toBe(true)
    expect(esSobreEstandar('B', 'B')).toBe(false)
  })

  it('cuenta las maniobras bajo y sobre el estándar y las que faltan calificar', () => {
    expect(
      contarRespectoAlEstandar([
        { notaMin: 'B', nota: 'R' },
        { notaMin: 'B', nota: 'E' },
        { notaMin: 'R', nota: 'R' },
        { notaMin: 'I', nota: '' },
      ]),
    ).toEqual({ bajo: 1, sobre: 1, sinCalificar: 1 })
  })

  it('reconoce las notas DIRBE', () => {
    expect(esNotaDirbe('B')).toBe(true)
    expect(esNotaDirbe('b')).toBe(false)
    expect(esNotaDirbe(3)).toBe(false)
  })
})

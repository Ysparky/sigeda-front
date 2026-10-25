import { describe, expect, it } from 'vitest'
import { aPropuesta } from './api'

describe('propuesta del simulador', () => {
  it('conserva la letra DIRBE propuesta y deja null las maniobras sin propuesta', () => {
    const propuesta = aPropuesta({
      calificaciones: [
        { idManiobra: 1, maniobra: 'Hover', notaMin: 'B', notaPropuesta: 'E', observacion: 'ALTITUD 1012 ft (desvío 12)' },
        { idManiobra: 2, maniobra: 'Patrón', notaMin: 'B', notaPropuesta: null, observacion: null },
      ],
    })

    expect(propuesta.calificaciones[0].notaPropuesta).toBe('E')
    expect(propuesta.calificaciones[0].observacion).toBe('ALTITUD 1012 ft (desvío 12)')
    expect(propuesta.calificaciones[1].notaPropuesta).toBeNull()
  })

  it('descarta una nota propuesta que no es DIRBE', () => {
    const propuesta = aPropuesta({
      calificaciones: [{ idManiobra: 1, maniobra: 'Hover', notaMin: 'B', notaPropuesta: 'Z', observacion: null }],
    })

    expect(propuesta.calificaciones[0].notaPropuesta).toBeNull()
  })
})

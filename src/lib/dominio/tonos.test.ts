import { describe, expect, it } from 'vitest'
import { CLASES_ETIQUETA_DEBRIEFING } from './tonos'

describe('etiquetas del debriefing', () => {
  it('siguen la convención de la institución: observación en rojo, causa en azul, recomendación sin color', () => {
    expect(CLASES_ETIQUETA_DEBRIEFING).toEqual({
      observacion: 'text-tono-peligro-texto',
      causa: 'text-tono-info-texto',
      recomendacion: '',
    })
  })
})

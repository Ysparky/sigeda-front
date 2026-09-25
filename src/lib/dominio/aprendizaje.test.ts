import { describe, expect, it } from 'vitest'
import {
  etiquetaDeTipo,
  formatearTamano,
  normalizarRespuesta,
  porcentajeDeSimilitud,
  motivoDeRechazo,
  respuestaCorrecta,
  TEXTO_ARCHIVO_RECHAZADO,
  TEXTO_ARCHIVO_VACIO,
  trozosConCitas,
} from './aprendizaje'

describe('etiquetaDeTipo', () => {
  it('CA-DOC-01 traduce los tres tipos aceptados y desconoce el resto', () => {
    expect(etiquetaDeTipo('application/pdf')).toBe('PDF')
    expect(etiquetaDeTipo('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('DOCX')
    expect(etiquetaDeTipo('text/plain')).toBe('TXT')
    expect(etiquetaDeTipo('image/png')).toBe('—')
  })
})

describe('formatearTamano', () => {
  it('CA-DOC-01 muestra el tamaño en bytes, kilobytes o megabytes', () => {
    expect(formatearTamano(512)).toBe('512 B')
    expect(formatearTamano(12_288)).toBe('12.0 KB')
    expect(formatearTamano(2_411_008)).toBe('2.3 MB')
    expect(formatearTamano(-1)).toBe('—')
  })
})

describe('motivoDeRechazo', () => {
  it('CA-DOC-02 acepta PDF, DOCX y TXT de hasta 25 MB', () => {
    expect(motivoDeRechazo({ name: 'Apunte.pdf', size: 1024 })).toBeNull()
    expect(motivoDeRechazo({ name: 'APUNTE.DOCX', size: 26_214_400 })).toBeNull()
    expect(motivoDeRechazo({ name: 'apunte.txt', size: 1 })).toBeNull()
  })

  it('CA-DOC-02 rechaza con A11 otra extensión y el que pasa de 25 MB', () => {
    expect(motivoDeRechazo({ name: 'foto.png', size: 1024 })).toBe(TEXTO_ARCHIVO_RECHAZADO)
    expect(motivoDeRechazo({ name: 'apunte.pdf', size: 26_214_401 })).toBe(TEXTO_ARCHIVO_RECHAZADO)
  })

  it('M3-6 rechaza el archivo vacío con A17, que explica el motivo', () => {
    expect(motivoDeRechazo({ name: 'apunte.txt', size: 0 })).toBe(TEXTO_ARCHIVO_VACIO)
  })
})

describe('respuestaCorrecta', () => {
  it('CA-CUE-10 compara completar sin mayúsculas, tildes ni espacios sobrantes', () => {
    expect(normalizarRespuesta('  AutoRROTACIÓN  ')).toBe('autorrotacion')
    expect(respuestaCorrecta('fill_blank', 'autorrotación', '  AutoRRotacion ')).toBe(true)
    expect(respuestaCorrecta('fill_blank', 'flujo de aire', 'flujo   de  aire')).toBe(true)
    expect(respuestaCorrecta('fill_blank', 'autorrotación', 'autogiro')).toBe(false)
  })

  it('CA-CUE-09 compara opción múltiple y verdadero o falso por igualdad exacta', () => {
    expect(respuestaCorrecta('multiple_choice', 'a', 'a')).toBe(true)
    expect(respuestaCorrecta('multiple_choice', 'a', 'A')).toBe(false)
    expect(respuestaCorrecta('true_false', 'true', 'true')).toBe(true)
    expect(respuestaCorrecta('true_false', 'true', 'false')).toBe(false)
  })
})

describe('trozosConCitas', () => {
  it('CA-CON-05 marca como cita solo los números dentro del rango de fuentes', () => {
    expect(trozosConCitas('Permite descender [1]. El rotor gira [1][2].', 2)).toEqual([
      { texto: 'Permite descender ', cita: null },
      { texto: '[1]', cita: 1 },
      { texto: '. El rotor gira ', cita: null },
      { texto: '[1]', cita: 1 },
      { texto: '[2]', cita: 2 },
      { texto: '.', cita: null },
    ])
  })

  it('CA-CON-05 deja como texto un marcador fuera de rango', () => {
    expect(trozosConCitas('Ver [7] y [1].', 2)).toEqual([
      { texto: 'Ver [7] y ', cita: null },
      { texto: '[1]', cita: 1 },
      { texto: '.', cita: null },
    ])
  })

  it('CA-CON-09 sin fuentes deja todos los marcadores como texto', () => {
    expect(trozosConCitas('Permite descender [1][2].', 0)).toEqual([{ texto: 'Permite descender [1][2].', cita: null }])
  })
})

describe('porcentajeDeSimilitud', () => {
  it('CA-CON-05 muestra el porcentaje solo cuando el servidor lo informa', () => {
    expect(porcentajeDeSimilitud(0.812)).toBe('81 %')
    expect(porcentajeDeSimilitud(null)).toBeNull()
  })
})

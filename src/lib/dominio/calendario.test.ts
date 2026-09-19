import { describe, expect, it } from 'vitest'
import { esFechaIso, esHora, esPosteriorAHoy, hoyIso, momento, restarHoras, sumarDias } from './calendario'

const AHORA = new Date(2026, 8, 19, 10, 30)

describe('calendario', () => {
  it('da la fecha de hoy en formato del backend', () => {
    expect(hoyIso(AHORA)).toBe('2026-09-19')
  })

  it('CA-TUR-02 solo considera válidas las fechas posteriores a hoy', () => {
    expect(esPosteriorAHoy('2026-09-20', AHORA)).toBe(true)
    expect(esPosteriorAHoy('2026-09-19', AHORA)).toBe(false)
    expect(esPosteriorAHoy('2024-03-01', AHORA)).toBe(false)
  })

  it('valida fechas y horas', () => {
    expect(esFechaIso('2026-02-28')).toBe(true)
    expect(esFechaIso('2026-02-30')).toBe(false)
    expect(esFechaIso('28/02/2026')).toBe(false)
    expect(esHora('09:00')).toBe(true)
    expect(esHora('24:00')).toBe(false)
    expect(esHora('9:00')).toBe(false)
  })

  it('suma días y resta horas', () => {
    expect(sumarDias('2026-09-30', 1)).toBe('2026-10-01')
    expect(sumarDias('2026-09-19', -1)).toBe('2026-09-18')
    expect(restarHoras('13:00', 2)).toBe('11:00')
    expect(restarHoras('00:30', 1)).toBe('23:30')
  })

  it('combina fecha y hora', () => {
    expect(momento('2026-09-19', '13:45')).toEqual(new Date(2026, 8, 19, 13, 45))
  })
})

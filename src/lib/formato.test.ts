import { describe, expect, it } from 'vitest'
import { formatearFecha, formatearNota } from './formato'

describe('formato', () => {
  it('muestra las fechas del backend como dd/MM/yyyy', () => {
    expect(formatearFecha('2026-09-14')).toBe('14/09/2026')
  })

  it('muestra "—" para una fecha vacía o inválida', () => {
    expect(formatearFecha('')).toBe('—')
    expect(formatearFecha('no-es-una-fecha')).toBe('—')
  })

  it('muestra las notas con dos decimales', () => {
    expect(formatearNota(17.5)).toBe('17.50')
    expect(formatearNota(12)).toBe('12.00')
  })

  it('muestra "—" para notas null, undefined o NaN', () => {
    expect(formatearNota(null)).toBe('—')
    expect(formatearNota(undefined)).toBe('—')
    expect(formatearNota(Number.NaN)).toBe('—')
  })
})

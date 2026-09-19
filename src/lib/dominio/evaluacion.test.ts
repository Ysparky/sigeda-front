import { describe, expect, it } from 'vitest'
import { perteneceAlTurno, ultimaEvaluacion } from './evaluacion'

describe('evaluaciones del alumno', () => {
  it('CA-EVA-12 reconoce la última evaluación por fecha, turno y correlativo', () => {
    expect(
      ultimaEvaluacion([
        { codigo: '555555-1', fecha: '2024-03-01' },
        { codigo: '555555-3', fecha: '2024-03-15' },
        { codigo: '555555-2', fecha: '2024-03-08' },
      ]),
    ).toBe('555555-3')
    expect(
      ultimaEvaluacion([
        { codigo: '555555-9', fecha: '2026-09-19' },
        { codigo: '555555-10-2', fecha: '2026-09-19' },
        { codigo: '555555-10-1', fecha: '2026-09-19' },
      ]),
    ).toBe('555555-10-2')
    expect(ultimaEvaluacion([])).toBeNull()
  })

  it('CA-EVA-02 relaciona las evaluaciones con su turno sin confundir turnos de prefijo parecido', () => {
    expect(perteneceAlTurno('111111-1', '111111', 1)).toBe(true)
    expect(perteneceAlTurno('111111-1-2', '111111', 1)).toBe(true)
    expect(perteneceAlTurno('111111-12', '111111', 1)).toBe(false)
  })
})

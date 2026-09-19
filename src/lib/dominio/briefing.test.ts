import { describe, expect, it } from 'vitest'
import { etapasDeMision, EXPLICA_INSTRUCTOR, EXPONE_ALUMNO, responsableDeManiobra } from './briefing'

const VUELO = { fechaEval: '2026-09-25', horaInicio: '13:00', horaFin: '14:30' }

describe('hoja de briefing', () => {
  it('CA-TUR-16 el instructor explica las maniobras con nota mínima D, I o R', () => {
    expect(responsableDeManiobra('D')).toBe(EXPLICA_INSTRUCTOR)
    expect(responsableDeManiobra('I')).toBe(EXPLICA_INSTRUCTOR)
    expect(responsableDeManiobra('R')).toBe(EXPLICA_INSTRUCTOR)
  })

  it('CA-TUR-16 el alumno expone las maniobras con nota mínima B o E', () => {
    expect(responsableDeManiobra('B')).toBe(EXPONE_ALUMNO)
    expect(responsableDeManiobra('E')).toBe(EXPONE_ALUMNO)
  })
})

describe('etapasDeMision', () => {
  it('CA-TUR-10 ubica las cuatro etapas respecto de la hora de vuelo', () => {
    const etapas = etapasDeMision(VUELO, false, new Date(2026, 8, 19))
    expect(etapas.map((etapa) => [etapa.titulo, etapa.detalle])).toEqual([
      ['Briefing diario', 'T−2 h · 11:00'],
      ['Briefing de detalle', 'T−1 h · 12:00'],
      ['Vuelo', '13:00 – 14:30'],
      ['Debriefing', 'Evaluación pendiente'],
    ])
    expect(etapas.every((etapa) => !etapa.hecha)).toBe(true)
  })

  it('CA-TUR-10 marca las etapas cumplidas según la hora actual', () => {
    const etapas = etapasDeMision(VUELO, false, new Date(2026, 8, 25, 12, 15))
    expect(etapas.map((etapa) => etapa.hecha)).toEqual([true, true, false, false])
  })

  it('CA-TUR-10 el debriefing se cumple cuando existe la evaluación', () => {
    const etapas = etapasDeMision(VUELO, true, new Date(2026, 8, 19))
    expect(etapas.map((etapa) => etapa.hecha)).toEqual([true, true, true, true])
    expect(etapas[3]?.detalle).toBe('Evaluación registrada')
  })
})

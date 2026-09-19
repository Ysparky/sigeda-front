import { describe, expect, it } from 'vitest'
import { conflictosDeAeronave, permiteCambios, seSuperponen } from './turno'

const AHORA = new Date(2026, 8, 19, 10, 30)

describe('reglas del turno', () => {
  it('CA-TUR-11 permite modificar y eliminar solo mientras la fecha sea posterior a hoy', () => {
    expect(permiteCambios('2026-09-20', AHORA)).toBe(true)
    expect(permiteCambios('2026-09-19', AHORA)).toBe(false)
    expect(permiteCambios('2024-03-01', AHORA)).toBe(false)
  })

  it('CA-TUR-07 detecta horarios que se superponen', () => {
    expect(seSuperponen({ horaInicio: '13:00', horaFin: '14:30' }, { horaInicio: '14:00', horaFin: '15:00' })).toBe(true)
    expect(seSuperponen({ horaInicio: '13:00', horaFin: '14:30' }, { horaInicio: '12:00', horaFin: '13:30' })).toBe(true)
    expect(seSuperponen({ horaInicio: '13:00', horaFin: '14:30' }, { horaInicio: '13:15', horaFin: '14:00' })).toBe(true)
  })

  it('CA-TUR-07 no considera superpuestos los horarios contiguos', () => {
    expect(seSuperponen({ horaInicio: '13:00', horaFin: '14:30' }, { horaInicio: '14:30', horaFin: '16:00' })).toBe(false)
    expect(seSuperponen({ horaInicio: '09:00', horaFin: '10:00' }, { horaInicio: '11:00', horaFin: '12:00' })).toBe(false)
  })
})

describe('conflictosDeAeronave', () => {
  const ocupaciones = [
    { idTurno: 8, nombre: 'Navegación Nocturna', horaInicio: '09:00', horaFin: '12:30' },
    { idTurno: 9, nombre: 'Instrumentos Básicos', horaInicio: '07:30', horaFin: '08:30' },
  ]

  it('CA-TUR-07 informa cada horario que choca con otro turno de la aeronave', () => {
    expect(
      conflictosDeAeronave(
        [
          { horaInicio: '08:00', horaFin: '09:30' },
          { horaInicio: '13:00', horaFin: '14:00' },
        ],
        ocupaciones,
      ),
    ).toEqual([
      { indice: 0, ocupacion: ocupaciones[0] },
      { indice: 0, ocupacion: ocupaciones[1] },
    ])
  })

  it('CA-TUR-07 ignora el propio turno al modificarlo y los horarios incompletos', () => {
    expect(conflictosDeAeronave([{ horaInicio: '09:00', horaFin: '10:00' }], ocupaciones, 8)).toEqual([])
    expect(conflictosDeAeronave([{ horaInicio: '09:00', horaFin: '' }], ocupaciones)).toEqual([])
  })
})

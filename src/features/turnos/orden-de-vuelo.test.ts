import { describe, expect, it } from 'vitest'
import type { TurnoDetalle } from './api'
import { horaDelBriefingDiario, ordenDeVuelo } from './orden-de-vuelo'

function turno(id: number, aeronave: string, alumnos: [string, string, string][]): TurnoDetalle {
  return {
    id,
    nombre: `Turno ${id}`,
    subfase: 'Navegación',
    fase: 'Adaptación',
    fechaEval: '2026-09-26',
    programa: 'PDI',
    codInstructor: '444444',
    instructor: 'Juan Torres',
    aeronave: { id, nombre: aeronave, estado: 'Disponible' },
    alumnos: alumnos.map(([codAlumno, horaInicio, horaFin]) => ({ codAlumno, alumno: `Alumno ${codAlumno}`, horaInicio, horaFin })),
    maniobras: [],
  }
}

describe('orden de vuelo del día', () => {
  const turnos = [
    turno(1, 'Robinson R22', [
      ['111111', '11:00', '12:00'],
      ['222222', '09:00', '10:00'],
    ]),
    turno(2, 'Bell 206', [['333333', '10:00', '11:00']]),
    turno(3, 'Robinson R22', [['444444', '07:30', '08:30']]),
  ]

  it('CA-TUR-15 agrupa los vuelos por aeronave y los ordena por hora', () => {
    expect(
      ordenDeVuelo(turnos).map((grupo) => [grupo.aeronave, grupo.vuelos.map((vuelo) => `${vuelo.horaInicio} ${vuelo.codAlumno}`)]),
    ).toEqual([
      ['Bell 206', ['10:00 333333']],
      ['Robinson R22', ['07:30 444444', '09:00 222222', '11:00 111111']],
    ])
  })

  it('ubica el briefing diario dos horas antes del primer vuelo', () => {
    expect(horaDelBriefingDiario(ordenDeVuelo(turnos))).toBe('05:30')
    expect(horaDelBriefingDiario([])).toBeNull()
  })
})

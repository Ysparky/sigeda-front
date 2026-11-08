import { describe, expect, it } from 'vitest'
import { crearTurno, type CuerpoTurno } from '@/features/turnos/api'
import type { ApiError } from '@/lib/api/errors'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo } from '@/test/render'

function cuerpo(cantidad: number): CuerpoTurno {
  return {
    nombre: 'Turno Con Tope',
    fechaEval: sumarDias(hoyIso(), 20),
    programa: 'PDI',
    idSubfase: 1,
    codInstructor: '444444',
    aeronave: { id: 1 },
    alumnosTurno: Array.from({ length: cantidad }, (_, indice) => ({
      codAlumno: `30000${indice}`,
      horaInicio: `${10 + indice}:00`,
      horaFin: `${10 + indice}:30`,
    })),
    maniobrasTurno: [{ idManiobra: 1, nota_min: 'B' }],
  }
}

describe('mock de turnos', () => {
  it('rechaza un turno con más de 5 alumnos', async () => {
    await iniciarComo('jefe.operaciones')
    const error = (await crearTurno(cuerpo(6)).catch((problema: unknown) => problema)) as ApiError
    expect(error.erroresDeCampo.alumnosTurno).toBe('Un turno admite como máximo 5 alumnos.')
  })
})

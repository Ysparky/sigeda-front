import { describe, expect, it } from 'vitest'
import { crearTurno, obtenerTurno, suspenderTurno, type CuerpoTurno } from '@/features/turnos/api'
import type { ApiError } from '@/lib/api/errors'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'

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

  it('suspende un turno con su motivo y no deja suspenderlo dos veces', async () => {
    await iniciarComo('jefe.operaciones')
    await expect(suspenderTurno(8, { motivo: 'CLIMA', observacion: 'Viento fuerte' })).resolves.toBe('Turno suspendido.')
    const turno = await obtenerTurno(8)
    expect(turno.estado).toBe('SUSPENDIDO')
    expect(turno.motivoSuspension).toBe('CLIMA')
    const repetido = (await suspenderTurno(8, { motivo: 'CLIMA', observacion: null }).catch((problema: unknown) => problema)) as ApiError
    expect(repetido.status).toBe(409)
  })

  it('no deja suspender un turno que ya pasó', async () => {
    await iniciarComo('jefe.operaciones')
    const error = (await suspenderTurno(1, { motivo: 'PERSONAL', observacion: null }).catch((problema: unknown) => problema)) as ApiError
    expect(error.status).toBe(410)
  })

  it('rechaza un horario solapado con otro vuelo del instructor y más de 8 h en el día', async () => {
    await iniciarComo('jefe.operaciones')
    const fecha = sumarDias(hoyIso(), 25)
    datos().turnos.push({
      id: 900, nombre: 'Seis Horas', fechaEval: fecha, programa: 'PDI', idSubfase: 1, subfase: 'Control Básico',
      fase: 'Adaptación', codInstructor: '444444', idAeronave: 1, idMision: null,
      alumnos: [
        { codAlumno: '111111', horaInicio: '08:00', horaFin: '09:30' },
        { codAlumno: '222222', horaInicio: '10:00', horaFin: '11:30' },
        { codAlumno: '555555', horaInicio: '12:00', horaFin: '13:30' },
        { codAlumno: '666666', horaInicio: '14:00', horaFin: '15:30' },
      ],
      maniobras: [{ idManiobra: 1, notaMin: 'B' }],
    })
    const base = { ...cuerpo(1), fechaEval: fecha }
    const solapado = (await crearTurno({ ...base, alumnosTurno: [{ codAlumno: '777777', horaInicio: '09:00', horaFin: '10:00' }] })
      .catch((problema: unknown) => problema)) as ApiError
    expect(solapado.erroresDeCampo.codInstructor).toBe('El instructor ya tiene un vuelo en ese horario en otro turno del día.')
    const largo = (await crearTurno({
      ...base,
      alumnosTurno: [
        { codAlumno: '777777', horaInicio: '16:00', horaFin: '17:30' },
        { codAlumno: '999999', horaInicio: '18:00', horaFin: '19:00' },
      ],
    }).catch((problema: unknown) => problema)) as ApiError
    expect(largo.erroresDeCampo.codInstructor).toBe('El instructor superaría las 8 horas de instrucción de vuelo en el día (RAP 61).')
  })
})

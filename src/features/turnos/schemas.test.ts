import { describe, expect, it } from 'vitest'
import { aCuerpoTurno, crearEsquemaTurno, turnoVacio, type ValoresTurno } from './schemas'

const esquema = crearEsquemaTurno('2026-09-19', new Set([1]))

function valido(cambios: Partial<ValoresTurno> = {}): ValoresTurno {
  return {
    ...turnoVacio(),
    nombre: 'Navegación Diurna',
    fechaEval: '2026-09-30',
    idSubfase: '2',
    codInstructor: '444444',
    idAeronave: '1',
    alumnosTurno: [{ codAlumno: '222222', horaInicio: '08:00', horaFin: '09:30' }],
    maniobrasTurno: [{ idManiobra: '1', notaMin: 'B' }],
    ...cambios,
  }
}

function mensajes(valores: ValoresTurno) {
  const resultado = esquema.safeParse(valores)
  return resultado.success ? [] : resultado.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

describe('esquema del turno', () => {
  it('acepta un turno completo', () => {
    expect(mensajes(valido())).toEqual([])
  })

  it('CA-TUR-02 exige una fecha posterior a hoy', () => {
    expect(mensajes(valido({ fechaEval: '2026-09-19' }))).toEqual(['fechaEval: La fecha del turno debe ser posterior a hoy.'])
  })

  it('CA-TUR-03 exige de 10 a 30 caracteres que no sean solo espacios', () => {
    expect(mensajes(valido({ nombre: '            ' }))[0]).toBe('nombre: Ingrese el nombre del turno.')
    expect(mensajes(valido({ nombre: 'Corto' }))).toEqual(['nombre: Nombre debe tener de 10 a 30 caracteres.'])
    expect(mensajes(valido({ nombre: 'N'.repeat(31) }))).toEqual(['nombre: Nombre debe tener de 10 a 30 caracteres.'])
  })

  it('CA-TUR-04 exige al menos un alumno y una maniobra, sin repetir', () => {
    expect(mensajes(valido({ alumnosTurno: [], maniobrasTurno: [] }))).toEqual([
      'alumnosTurno: La asignación de alumnos es requerida',
      'maniobrasTurno: La asignación de maniobras es requerida',
    ])
    expect(
      mensajes(
        valido({
          alumnosTurno: [
            { codAlumno: '222222', horaInicio: '08:00', horaFin: '09:00' },
            { codAlumno: '222222', horaInicio: '10:00', horaFin: '11:00' },
          ],
          maniobrasTurno: [
            { idManiobra: '1', notaMin: 'B' },
            { idManiobra: '1', notaMin: 'R' },
          ],
        }),
      ),
    ).toEqual(['alumnosTurno.1.codAlumno: El alumno está repetido.', 'maniobrasTurno.1.idManiobra: La maniobra está repetida.'])
  })

  it('CA-TUR-06 solo acepta notas mínimas D, I, R, B o E', () => {
    expect(mensajes(valido({ maniobrasTurno: [{ idManiobra: '1', notaMin: 'X' }] }))).toEqual([
      'maniobrasTurno.0.notaMin: Ingresar nota mínima de maniobra.',
    ])
  })

  it('CA-TUR-07 exige HH:mm y fin posterior a inicio', () => {
    expect(mensajes(valido({ alumnosTurno: [{ codAlumno: '222222', horaInicio: '8:00', horaFin: '09:30' }] }))).toEqual([
      'alumnosTurno.0.horaInicio: La hora debe estar en formato HH:mm (09:00, 14:00)',
    ])
    expect(mensajes(valido({ alumnosTurno: [{ codAlumno: '222222', horaInicio: '10:00', horaFin: '09:30' }] }))).toEqual([
      'alumnosTurno.0.horaFin: La hora de fin debe ser posterior a la de inicio.',
    ])
  })

  it('CA-TUR-08 y CA-TUR-09 exigen instructor y una aeronave disponible', () => {
    expect(mensajes(valido({ codInstructor: '', idAeronave: '' }))).toEqual([
      'codInstructor: Instructor debe ser asignado.',
      'idAeronave: La asignación de aeronave es requerida.',
    ])
    expect(mensajes(valido({ idAeronave: '2' }))).toEqual(['idAeronave: Asignar aeronave disponible.'])
  })

  it('arma el cuerpo que espera el backend', () => {
    expect(aCuerpoTurno(valido({ nombre: '  Navegación Diurna  ' }))).toEqual({
      nombre: 'Navegación Diurna',
      fechaEval: '2026-09-30',
      programa: 'PDI',
      idSubfase: 2,
      idMision: null,
      codInstructor: '444444',
      aeronave: { id: 1 },
      alumnosTurno: [{ codAlumno: '222222', horaInicio: '08:00', horaFin: '09:30' }],
      maniobrasTurno: [{ idManiobra: 1, nota_min: 'B' }],
    })
  })

  it('dependencia 62 la misión es opcional y el selector vacío viaja como null, no como 0', () => {
    expect(mensajes(valido({ idMision: '' }))).toEqual([])
    expect(aCuerpoTurno(valido({ idMision: '' })).idMision).toBeNull()
    expect(aCuerpoTurno(valido({ idMision: '9' })).idMision).toBe(9)
  })
})

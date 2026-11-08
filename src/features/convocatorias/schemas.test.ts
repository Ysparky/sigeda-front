import { describe, expect, it } from 'vitest'
import { aCuerpoConvocatoria, CONVOCATORIA_VACIA, esquemaConvocatoria, type ValoresConvocatoria } from './schemas'

function valido(cambios: Partial<ValoresConvocatoria> = {}): ValoresConvocatoria {
  return {
    ...CONVOCATORIA_VACIA,
    nombre: 'Admisión 2026-I',
    descripcion: 'Proceso de admisión',
    fechaInicio: '2026-01-08',
    fechaFin: '2026-01-18',
    vacantes: '20',
    ...cambios,
  }
}

function mensajes(valores: ValoresConvocatoria) {
  const r = esquemaConvocatoria.safeParse(valores)
  return r.success ? [] : r.error.issues.map((i) => i.message)
}

describe('esquema de convocatoria', () => {
  it('acepta una convocatoria completa', () => {
    expect(mensajes(valido())).toEqual([])
  })

  it('exige nombre, fechas válidas y vacantes', () => {
    expect(mensajes(valido({ nombre: '' }))).toContain('El nombre es obligatorio.')
    expect(mensajes(valido({ fechaInicio: 'no-fecha' }))).toContain('Ingrese una fecha de inicio válida.')
    expect(mensajes(valido({ vacantes: 'abc' }))).toContain('Ingrese un número de vacantes válido.')
  })

  it('exige que la fecha de fin no sea anterior a la de inicio', () => {
    expect(mensajes(valido({ fechaInicio: '2026-01-18', fechaFin: '2026-01-08' }))).toContain(
      'La fecha de fin debe ser posterior a la de inicio.',
    )
  })

  it('convierte las cadenas del formulario al cuerpo del backend', () => {
    expect(aCuerpoConvocatoria(valido())).toEqual({
      idCurso: 1,
      nombre: 'Admisión 2026-I',
      descripcion: 'Proceso de admisión',
      fechaInicio: '2026-01-08',
      fechaFin: '2026-01-18',
      vacantes: 20,
      })
  })
})

import { describe, expect, it } from 'vitest'
import { PERMISOS_CONTRATO, permisosDeRol, puede } from './permisos'

describe('permisosDeRol replica Role.java', () => {
  it('Alumno solo lee, actualiza su usuario y rinde exámenes', () => {
    expect([...permisosDeRol('Alumno')]).toEqual(['Read', 'Update', 'Take Exams'])
  })

  it('Jefe de Operaciones programa turnos y asigna estándares, pero no crea maniobras', () => {
    const permisos = permisosDeRol('Jefe de Operaciones')
    expect(permisos.has('Manage Shifts')).toBe(true)
    expect(permisos.has('Manage Standards')).toBe(true)
    expect(permisos.has('Manage Maneuvers')).toBe(false)
  })

  it('M5-24 Manage Groups lo tiene exactamente el Administrador Web (dependencia 4)', () => {
    // Dos aserciones y no una: el error natural al editar una lista de siete permisos es llevarse un
    // vecino, y ningún otro caso de la suite mira los otros seis del Jefe de Operaciones.
    const conElPermiso = ['Administrador Web', 'Comandante de Escuadrón', 'Jefe de Operaciones', 'Instructor', 'Alumno']
      .filter((rol) => permisosDeRol(rol).has('Manage Groups'))
    expect(conElPermiso).toEqual(['Administrador Web'])
    expect([...permisosDeRol('Jefe de Operaciones')]).toEqual([
      'Read',
      'Write',
      'Update',
      'View My Group',
      'Manage Shifts',
      'Manage Standards',
    ])
  })

  it('Comandante crea maniobras y modifica evaluaciones, pero no programa turnos', () => {
    const permisos = permisosDeRol('Comandante de Escuadrón')
    expect(permisos.has('Manage Maneuvers')).toBe(true)
    expect(permisos.has('Modify Evaluations')).toBe(true)
    expect(permisos.has('Manage Shifts')).toBe(false)
  })

  it('Instructor registra evaluaciones pero no las modifica', () => {
    const permisos = permisosDeRol('Instructor')
    expect(permisos.has('Write')).toBe(true)
    expect(permisos.has('Modify Evaluations')).toBe(false)
  })

  it('Administrador Web tiene los 17 permisos del backend y 3 de los 4 del contrato: no rinde examenes', () => {
    expect(permisosDeRol('Administrador Web').size).toBe(20)
    expect(permisosDeRol('Administrador Web').has('Take Exams')).toBe(false)
  })

  it('M2-9 los permisos del contrato de teoría se reparten según su documento', () => {
    expect([...PERMISOS_CONTRATO]).toEqual(['Manage Subjects', 'Manage Questions', 'Manage Exams', 'Take Exams'])
    expect(permisosDeRol('Comandante de Escuadrón').has('Manage Subjects')).toBe(true)
    expect(permisosDeRol('Jefe de Operaciones').has('Manage Subjects')).toBe(false)
    expect(permisosDeRol('Instructor').has('Manage Questions')).toBe(true)
    expect(permisosDeRol('Instructor').has('Manage Subjects')).toBe(false)
    expect(permisosDeRol('Alumno').has('Take Exams')).toBe(true)
    expect(permisosDeRol('Administrador Web').has('Take Exams')).toBe(false)
  })

  it('un rol desconocido no tiene permisos', () => {
    expect(permisosDeRol('Visitante').size).toBe(0)
  })

  it('un rol que coincide con una propiedad heredada de Object no tiene permisos', () => {
    expect(permisosDeRol('constructor').size).toBe(0)
  })
})

describe('puede', () => {
  it('permite cuando no se exige permiso', () => {
    expect(puede(new Set(), undefined)).toBe(true)
  })

  it('exige el permiso indicado', () => {
    expect(puede(permisosDeRol('Alumno'), 'Manage Roles')).toBe(false)
    expect(puede(permisosDeRol('Administrador Web'), 'Manage Roles')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { permisosDeRol, puede } from './permisos'

describe('permisosDeRol replica Role.java', () => {
  it('Alumno solo lee y actualiza su usuario', () => {
    expect([...permisosDeRol('Alumno')]).toEqual(['Read', 'Update'])
  })

  it('Jefe de Operaciones programa turnos y asigna estándares, pero no crea maniobras', () => {
    const permisos = permisosDeRol('Jefe de Operaciones')
    expect(permisos.has('Manage Shifts')).toBe(true)
    expect(permisos.has('Manage Standards')).toBe(true)
    expect(permisos.has('Manage Maneuvers')).toBe(false)
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

  it('Administrador Web tiene los 17 permisos que usa el backend', () => {
    expect(permisosDeRol('Administrador Web').size).toBe(17)
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

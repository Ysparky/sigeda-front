import { describe, expect, it } from 'vitest'
import { SinPermisoError } from '@/lib/auth/guardas'
import type { Sesion } from '@/lib/auth/sesion'
import { cargarLegajoVisible, codigoQueSeConsulta } from './cargar'

function sesion(rol: string, codPersona: string | null): Sesion {
  return {
    usuario: { id: 1, username: 'x', correo: null },
    codPersona,
    persona: { nombre: 'X', aPaterno: 'Y', aMaterno: 'Z', idGrupo: null },
    rol: { id: 1, nombre: rol },
    permisos: new Set(),
  }
}

describe('propiedad del legajo', () => {
  it('CA-LEG-15 el alumno solo puede cargar el suyo', () => {
    expect(cargarLegajoVisible(sesion('Alumno', '777777'), '777777')).toEqual({ codAlumno: '777777' })
    expect(() => cargarLegajoVisible(sesion('Alumno', '777777'), '555555')).toThrow(SinPermisoError)
  })

  it('CA-LEG-15 los cuatro roles de personal usan el código de la URL tal cual', () => {
    for (const rol of ['Administrador Web', 'Comandante de Escuadrón', 'Jefe de Operaciones', 'Instructor']) {
      expect(cargarLegajoVisible(sesion(rol, '444444'), '777777')).toEqual({ codAlumno: '777777' })
      expect(codigoQueSeConsulta(sesion(rol, '444444'), '777777')).toBe('777777')
    }
  })

  it('CA-LEG-15 para el alumno la capa de API usa el código de la sesión, no el de la URL', () => {
    expect(codigoQueSeConsulta(sesion('Alumno', '777777'), '555555')).toBe('777777')
    expect(codigoQueSeConsulta(sesion('Alumno', null), '555555')).toBe('')
    expect(codigoQueSeConsulta(null, '777777')).toBe('777777')
  })

  it('CA-LEG-15 un código que no es de seis dígitos no es un legajo', () => {
    expect(() => cargarLegajoVisible(sesion('Instructor', '444444'), 'abc')).toThrow()
    expect(() => cargarLegajoVisible(sesion('Instructor', '444444'), '77777')).toThrow()
  })
})

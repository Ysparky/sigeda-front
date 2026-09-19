import { isNotFound } from '@tanstack/react-router'
import { House } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { destinoSeguro, exigirPantalla, SinPermisoError } from './guardas'
import type { Pantalla, RutaApp } from './pantallas'
import { permisosDeRol } from './permisos'
import type { Sesion } from './sesion'

const usuarios: Pantalla = {
  ruta: '/usuarios' as RutaApp,
  titulo: 'Usuarios',
  descripcion: '',
  grupo: 'Matrícula',
  icono: House,
  permiso: 'Manage Roles',
  enMenu: true,
}
const guia: Pantalla = { ...usuarios, permiso: undefined, soloDesarrollo: true }

function sesionDe(rol: string): Sesion {
  return {
    usuario: { id: 1, username: 'prueba', correo: null },
    codPersona: null,
    rol: { id: 1, nombre: rol },
    permisos: permisosDeRol(rol),
  }
}

function capturar(accion: () => void): unknown {
  try {
    accion()
  } catch (error) {
    return error
  }
  return null
}

describe('exigirPantalla', () => {
  it('CA-SES-04 rechaza al rol sin el permiso con "No tiene permisos para esta acción"', () => {
    const error = capturar(() => exigirPantalla(usuarios, sesionDe('Alumno')))
    expect(error).toBeInstanceOf(SinPermisoError)
    expect((error as Error).message).toBe(MENSAJE_SIN_PERMISO)
  })

  it('permite al rol con el permiso', () => {
    expect(() => exigirPantalla(usuarios, sesionDe('Administrador Web'))).not.toThrow()
  })

  it('rechaza sin sesión', () => {
    expect(capturar(() => exigirPantalla(usuarios, null))).toBeInstanceOf(SinPermisoError)
  })

  it('las pantallas de desarrollo no existen en producción', () => {
    expect(isNotFound(capturar(() => exigirPantalla(guia, sesionDe('Administrador Web'), false)))).toBe(true)
    expect(() => exigirPantalla(guia, sesionDe('Alumno'), true)).not.toThrow()
  })
})

describe('destinoSeguro', () => {
  it('acepta rutas internas', () => {
    expect(destinoSeguro('/cuenta?x=1')).toBe('/cuenta?x=1')
  })

  it('descarta destinos externos, vacíos o de vuelta al login', () => {
    expect(destinoSeguro(undefined)).toBe('/')
    expect(destinoSeguro('https://evil.com')).toBe('/')
    expect(destinoSeguro('//evil.com')).toBe('/')
    expect(destinoSeguro('/login?redirect=%2F')).toBe('/')
  })
})

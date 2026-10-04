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
    persona: { nombre: 'Prueba', aPaterno: 'Apellido', aMaterno: '', idGrupo: null },
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

  it('acepta rutas internas con hash', () => {
    expect(destinoSeguro('/cuenta?x=1#y')).toBe('/cuenta?x=1#y')
  })

  it('descarta destinos externos, vacíos o de vuelta al login', () => {
    expect(destinoSeguro(undefined)).toBe('/')
    expect(destinoSeguro('https://evil.com')).toBe('/')
    expect(destinoSeguro('//evil.com')).toBe('/')
    expect(destinoSeguro('/login?redirect=%2F')).toBe('/')
  })

  it('descarta destinos que abusan de barras invertidas o de esquemas peligrosos', () => {
    expect(destinoSeguro('/\\evil.com')).toBe('/')
    expect(destinoSeguro('/\t/evil.com')).toBe('/')
    expect(destinoSeguro('javascript:alert(1)')).toBe('/')
  })
})

describe('destinoSeguro con rutas que se normalizan a otro origen', () => {
  it('descarta una ruta cuyo pathname resuelto empieza con //', () => {
    expect(destinoSeguro('/x/..//evil.com')).toBe('/')
    expect(destinoSeguro('/turnos/../..//evil.com/a')).toBe('/')
  })
})

/**
 * EL CASO QUE LO MOTIVÓ, medido en el navegador: `admin.sistema` estaba en /grupos, cerró sesión y
 * la guarda lo mandó a `/login?redirect=%2Fgrupos`; al entrar `alumno.falconi` —que no tiene
 * `Manage Groups`— aterrizó en /grupos con «Acceso restringido» en vez de en Inicio.
 *
 * El arreglo principal es que un cierre deliberado no lleve `redirect` (ver `_app.tsx`). Esto es la
 * segunda mitad: aunque el `redirect` llegue —de una sesión vencida que otro retoma, o de un enlace
 * guardado—, no se obedece si la sesión que entra no puede ver esa pantalla.
 */
describe('destinoSeguro con los permisos de quien entra', () => {
  it('descarta la pantalla que la sesión nueva no puede ver', () => {
    expect(destinoSeguro('/grupos?page=0', sesionDe('Alumno'), false)).toBe('/')
  })

  it('respeta la que sí puede ver, con su búsqueda', () => {
    expect(destinoSeguro('/grupos?page=0', sesionDe('Administrador Web'), false)).toBe('/grupos?page=0')
  })

  it('deja pasar una ruta con parámetros, que no figura en el catálogo por su texto', () => {
    expect(destinoSeguro('/seguimiento/555555', sesionDe('Alumno'), false)).toBe('/seguimiento/555555')
  })

  it('sin sesión se comporta como antes: sólo sanea el origen', () => {
    expect(destinoSeguro('/grupos?page=0')).toBe('/grupos?page=0')
    expect(destinoSeguro('https://evil.com', sesionDe('Alumno'), false)).toBe('/')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { accionDisponible, dependenciasPendientes, parsearDependencias } from './dependencias'

describe('dependencias resueltas', () => {
  it('CA-DEP-02 en modo mock todas las acciones están disponibles', () => {
    vi.stubEnv('VITE_MOCK_API', 'true')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    expect(accionDisponible('registrarPersona')).toBe(true)
    expect(accionDisponible('modificarManiobra')).toBe(true)
  })

  it('CA-DEP-02 fuera del modo mock cada acción espera todos sus números', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '22, 32 ,37')
    expect(accionDisponible('registrarPersona')).toBe(true)
    expect(accionDisponible('eliminarFase')).toBe(true)
    expect(accionDisponible('eliminarPersona')).toBe(false)
    expect(accionDisponible('modificarManiobra')).toBe(false)
    expect(dependenciasPendientes('modificarManiobra')).toEqual([33])
  })

  it('CA-DEP-02 ignora los valores que no son números positivos', () => {
    expect([...parsearDependencias('22,x, ,-1,0,30')]).toEqual([22, 30])
    expect([...parsearDependencias(undefined)]).toEqual([])
  })

  it('CA-DEP-01 sin la variable ninguna acción con dependencia está disponible', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    expect(accionDisponible('registrarPersona')).toBe(false)
    expect(accionDisponible('eliminarPersona')).toBe(false)
    expect(accionDisponible('modificarManiobra')).toBe(false)
    expect(accionDisponible('eliminarFase')).toBe(false)
  })

  it('CA-DOC-10 subir y eliminar documentos esperan la dependencia 39', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '22,30,32,33,37')
    expect(accionDisponible('subirDocumento')).toBe(false)
    expect(accionDisponible('eliminarDocumento')).toBe(false)
    expect(dependenciasPendientes('subirDocumento')).toEqual([39])
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '39')
    expect(accionDisponible('subirDocumento')).toBe(true)
    expect(accionDisponible('eliminarDocumento')).toBe(true)
  })
})

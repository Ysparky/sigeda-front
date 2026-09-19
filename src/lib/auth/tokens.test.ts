import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { jwtDePrueba } from '@/mocks/sigeda/auth'
import { server } from '@/mocks/server'
import { CLAVE_REFRESH, tokens, usernameDelToken } from './tokens'

function valoresGuardados() {
  return Array.from({ length: localStorage.length }, (_, indice) => localStorage.getItem(localStorage.key(indice) ?? ''))
}

describe('usernameDelToken', () => {
  it('lee el subject del JWT', () => {
    expect(usernameDelToken(jwtDePrueba('instructor.perez'))).toBe('instructor.perez')
  })

  it('devuelve null cuando el token no es un JWT', () => {
    expect(usernameDelToken('vencido')).toBeNull()
  })
})

describe('tokens', () => {
  it('guarda el refresh token en localStorage y el de acceso solo en memoria', () => {
    tokens.guardar('acceso-secreto', 'refresh-1')
    expect(tokens.acceso()).toBe('acceso-secreto')
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe('refresh-1')
    expect(valoresGuardados()).not.toContain('acceso-secreto')
  })

  it('comparte una sola renovación entre peticiones simultáneas', async () => {
    let llamadas = 0
    server.use(
      http.post(`${config.sigedaApiUrl}/auth/refresh`, () => {
        llamadas += 1
        return HttpResponse.json({ accessToken: 'nuevo', refreshToken: 'refresh-1', tokenType: 'Bearer' })
      }),
    )
    tokens.guardar('viejo', 'refresh-1')
    await expect(Promise.all([tokens.renovar(), tokens.renovar()])).resolves.toEqual(['nuevo', 'nuevo'])
    expect(llamadas).toBe(1)
    expect(tokens.acceso()).toBe('nuevo')
  })

  it('no renueva sin refresh token', async () => {
    await expect(tokens.renovar()).resolves.toBeNull()
  })
})

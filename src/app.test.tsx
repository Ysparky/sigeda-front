import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sesion } from '@/lib/auth/sesion'
import { iniciarComo, renderApp } from '@/test/render'

describe('navegación protegida', () => {
  it('sin sesión, una ruta protegida redirige a /login conservando el destino', async () => {
    const { router } = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toEqual({ redirect: '/' })
  })

  it('con sesión, /login lleva al destino solicitado', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/login?redirect=%2F')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('ignora destinos externos después del login', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/login?redirect=%2F%2Fevil.com')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(router.state.location.href).toBe('/')
  })

  it('ignora un redirect que no es texto y lleva a Inicio', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/login?redirect=123')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(router.state.location.href).toBe('/')
  })

  it('al expirar la sesión vuelve al login', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    act(() => sesion.expirar())
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('una dirección inexistente muestra "Página no encontrada"', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/no-existe')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})

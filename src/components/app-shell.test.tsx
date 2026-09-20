import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sesion } from '@/lib/auth/sesion'
import { CLAVE_REFRESH, tokens } from '@/lib/auth/tokens'
import { iniciarComo, renderApp } from '@/test/render'

describe('estructura de la aplicación', () => {
  it('CA-SES-06 muestra la marca, el menú principal y el nombre de la persona con su rol', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^SIGEDA/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Cuenta de Juan Torres' })).toHaveTextContent('Instructor')
  })

  it('CA-SES-05 cerrar sesión invalida el refresh token en el servidor y vuelve a /login', async () => {
    await iniciarComo('instructor.perez')
    const refresh = tokens.refresh()
    const { usuario } = renderApp('/')
    await usuario.click(await screen.findByRole('button', { name: 'Cuenta de Juan Torres' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(tokens.refresh()).toBeNull()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    await expect(sesion.restaurar()).resolves.toBeNull()
  })

  it('permite elegir el tema oscuro', async () => {
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp('/')
    await usuario.click(await screen.findByRole('button', { name: 'Cuenta de Oscar Lopez' }))
    await usuario.click(await screen.findByRole('menuitemradio', { name: 'Oscuro' }))
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))
  })
})

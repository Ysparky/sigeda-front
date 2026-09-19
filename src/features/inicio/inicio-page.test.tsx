import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

it('saluda al usuario, muestra su rol y los accesos que tiene', async () => {
  await iniciarComo('alumno.lopez')
  renderApp('/')
  expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  expect(screen.getByText('Hola, alumno.lopez.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Cambiar contraseña/ })).toHaveAttribute('href', '/cuenta')
})

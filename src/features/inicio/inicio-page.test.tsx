import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

it('CA-SES-06 saluda con el nombre de la persona, muestra su rol y los accesos que tiene', async () => {
  await iniciarComo('jefe.operaciones')
  renderApp('/')
  expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  expect(screen.getByText(/^Hola, /)).toBeInTheDocument()
  expect(screen.getAllByText('Jefe de Operaciones').length).toBeGreaterThan(0)
  expect(screen.getByRole('link', { name: /Cambiar contraseña/ })).toHaveAttribute('href', '/cuenta')
})

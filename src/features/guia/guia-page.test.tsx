import { screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

it('reúne los estados del dominio, los patrones y una tabla de referencia', async () => {
  await iniciarComo('admin.sistema')
  renderApp('/guia')
  expect(await screen.findByRole('heading', { name: 'Guía de estilo' })).toBeInTheDocument()
  expect(screen.getByText('No apto')).toHaveAttribute('data-tono', 'peligro')
  expect(screen.getByText('En complementación')).toHaveAttribute('data-tono', 'violeta')
  const tabla = screen.getByRole('table')
  expect(within(tabla).getAllByRole('row')).toHaveLength(5)
  expect(within(tabla).getByText('17.50')).toBeInTheDocument()
  expect(within(tabla).getByText('14/09/2026')).toBeInTheDocument()
})

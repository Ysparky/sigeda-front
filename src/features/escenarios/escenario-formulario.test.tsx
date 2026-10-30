import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Escenarios', () => {
  it('crea un escenario con indicadores y los muestra en el detalle', async () => {
    await iniciarComo('jefe.operaciones')
    const { usuario } = renderApp('/escenarios/nueva')

    await usuario.type(await screen.findByLabelText('Nombre'), 'Falla de motor')
    await usuario.click(screen.getByRole('button', { name: 'Agregar indicador' }))
    await usuario.type(screen.getByLabelText('Indicador 1'), 'Procedimientos')
    await usuario.click(screen.getByRole('button', { name: 'Agregar indicador' }))
    await usuario.type(screen.getByLabelText('Indicador 2'), 'Comunicación')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('heading', { name: 'Falla de motor' })).toBeInTheDocument()
    expect(screen.getByText('Procedimientos')).toBeInTheDocument()
    expect(screen.getByText('Comunicación')).toBeInTheDocument()
  })

  it('exige el nombre del escenario', async () => {
    await iniciarComo('jefe.operaciones')
    const { usuario } = renderApp('/escenarios/nueva')
    await usuario.click(await screen.findByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument()
  })
})

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Simuladores', () => {
  it('sin el permiso Manage Simulator, la ruta queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/simuladores')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })

  it('lista el simulador sembrado y permite crear uno nuevo', async () => {
    await iniciarComo('jefe.operaciones')
    const { usuario } = renderApp('/simuladores')

    expect(await screen.findByRole('link', { name: 'FNPT II - Bell 206' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('link', { name: 'Nuevo simulador' }))
    await usuario.type(await screen.findByLabelText('Nombre'), 'Sim de prueba')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('heading', { name: 'Sim de prueba' })).toBeInTheDocument()
  })
})

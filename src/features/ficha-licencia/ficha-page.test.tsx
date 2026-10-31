import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Ficha de licencia (/fichas-licencia/$cod)', () => {
  it('sin el permiso, la ruta queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/fichas-licencia/A001')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })

  it('un alumno sin ficha abre en preparación y se puede capturar', async () => {
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/fichas-licencia/A001')

    expect(await screen.findByRole('heading', { level: 1, name: /Ficha de licencia · A001/ })).toBeInTheDocument()
    expect(screen.getByText('En preparación')).toBeInTheDocument()
    // Todos los requisitos arrancan en "falta".
    const requisitos = within(screen.getByRole('list', { name: 'Requisitos de la licencia' }))
    expect(requisitos.getAllByText(/falta/).length).toBeGreaterThan(0)

    // Capturar horas insuficientes: la ficha pasa a Observada y el requisito de 40 h sigue faltando.
    await usuario.type(screen.getByLabelText('Total'), '30')
    await usuario.click(screen.getByRole('button', { name: 'Guardar ficha' }))

    expect(await screen.findByText('Ficha guardada.')).toBeInTheDocument()
    expect(await screen.findByText('Observada')).toBeInTheDocument()
    expect(screen.getByText(/40 h en total/)).toHaveTextContent('falta')
  })
})

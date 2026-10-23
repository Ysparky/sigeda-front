import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'

describe('LandingPage (/bienvenida)', () => {
  it('muestra el catálogo público sin necesidad de sesión', async () => {
    renderApp('/bienvenida')

    const tarjeta = await screen.findByText('Piloto de Helicóptero')
    const seccion = tarjeta.closest('section') ?? document.body
    expect(within(seccion).getByText(/220 horas/)).toBeInTheDocument()
    expect(within(seccion).getByText(/médico aeronáutico/)).toBeInTheDocument()
  })

  it('el botón "Inscribirme" lleva al formulario de matrícula del curso', async () => {
    const { usuario } = renderApp('/bienvenida')

    const boton = await screen.findByRole('link', { name: 'Inscribirme' })
    await usuario.click(boton)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Matrícula' })).toBeInTheDocument())
  })
})

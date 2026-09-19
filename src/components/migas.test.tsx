import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function migas() {
  return within(await screen.findByRole('navigation', { name: 'Migas de pan' }))
}

describe('migas de pan', () => {
  it('M1-12 muestra el camino hasta la hoja de briefing con enlaces a cada nivel', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/8/briefing/111111')
    const nav = await migas()
    expect(await nav.findByText('Hoja de briefing')).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(nav.getByRole('link', { name: 'Programación de turnos' })).toHaveAttribute('href', '/turnos')
    expect(nav.getByRole('link', { name: 'Detalle de turno' })).toHaveAttribute('href', '/turnos/8')
  })

  it('M1-12 el alumno no ve la sección de programación en sus migas', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos/8')
    const nav = await migas()
    expect(await nav.findByText('Detalle de turno')).toHaveAttribute('aria-current', 'page')
    expect(nav.queryByRole('link', { name: 'Programación de turnos' })).not.toBeInTheDocument()
  })

  it('no muestra migas en Inicio', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/')
    await screen.findByRole('heading', { name: 'Inicio' })
    expect(screen.queryByRole('navigation', { name: 'Migas de pan' })).not.toBeInTheDocument()
  })
})

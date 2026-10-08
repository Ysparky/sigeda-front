import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Proyección — lista', () => {
  it('muestra una tarjeta por alumno con su riesgo y su última nota', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/seguimiento/proyeccion')

    const garcia = (await screen.findByText('Pedro Rodriguez Garcia')).closest('a') as HTMLElement
    expect(within(garcia).getByText('Riesgo bajo')).toBeInTheDocument()
    expect(within(garcia).getByText('En ascenso')).toBeInTheDocument()
    expect(within(garcia).getByText('17.00')).toBeInTheDocument()
    expect(garcia).toHaveAttribute('href', expect.stringContaining('/seguimiento/proyeccion/'))

    expect(screen.getByText('Oscar Lopez Chaparro')).toBeInTheDocument()
  })

  it('un alumno no accede a la pantalla', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/seguimiento/proyeccion')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })
})

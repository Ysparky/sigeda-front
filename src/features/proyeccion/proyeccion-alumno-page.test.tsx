import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ID_PROY_GARCIA, ID_PROY_LOPEZ } from '@/mocks/ia/proyeccion'
import { iniciarComo, renderApp } from '@/test/render'

describe('Proyección — detalle', () => {
  it('muestra la proyección, el gráfico y el desglose, distinguiendo la banda de la clasificación', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp(`/seguimiento/proyeccion/${ID_PROY_GARCIA}`)

    expect(await screen.findByRole('heading', { name: 'Pedro Rodriguez Garcia', level: 1 })).toBeInTheDocument()

    const proyeccion = screen.getByRole('heading', { name: 'Proyección del modelo' }).closest('div') as HTMLElement
    expect(within(proyeccion).getByText('17.40')).toBeInTheDocument()
    expect(within(proyeccion).getByText('Óptimo')).toBeInTheDocument()
    // La banda del motor NO debe presentarse como la clasificación DIRBE.
    expect(within(proyeccion).getByText(/Banda del modelo, no la clasificación DIRBE/)).toBeInTheDocument()

    expect(screen.getByRole('img', { name: /Tendencia de los puntajes/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Maniobra' })).toBeInTheDocument()
    expect(screen.getByText('Reforzar circuitos y maniobras')).toBeInTheDocument()
  })

  it('con datos insuficientes no dibuja el gráfico', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp(`/seguimiento/proyeccion/${ID_PROY_LOPEZ}`)

    expect(await screen.findByText('Todavía no hay datos suficientes para proyectar')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Tendencia de los puntajes/ })).not.toBeInTheDocument()
  })
})

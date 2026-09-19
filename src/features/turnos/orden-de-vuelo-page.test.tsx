import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo, renderApp } from '@/test/render'

const EN_UNA_SEMANA = sumarDias(hoyIso(), 7)

describe('Orden de vuelo del día', () => {
  it('CA-TUR-15 agrupa por aeronave y ordena los vuelos por hora', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp(`/turnos/dia/${EN_UNA_SEMANA}`)
    const tabla = within(await screen.findByRole('table', { name: 'Vuelos de Robinson R22' }))
    expect(
      tabla
        .getAllByRole('row')
        .slice(1)
        .map((fila) => within(fila).getAllByRole('cell').slice(0, 3).map((celda) => celda.textContent)),
    ).toEqual([
      ['07:30 – 08:30', 'Carlos Ramirez', 'Instrumentos Básicos'],
      ['09:00 – 10:30', 'Oscar Lopez', 'Navegación Nocturna'],
      ['11:00 – 12:30', 'Ana Torres', 'Navegación Nocturna'],
    ])
    expect(screen.getByText('05:30')).toBeInTheDocument()
  })

  it('navega al día siguiente y avisa cuando no hay vuelos', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp(`/turnos/dia/${hoyIso()}`)
    expect(await screen.findByText('No hay vuelos programados para este día.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Día siguiente' })).toHaveAttribute('href', `/turnos/dia/${sumarDias(hoyIso(), 1)}`)
  })

  it('una fecha inválida muestra la página no encontrada', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/dia/manana')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { clavesTurnos } from './api'

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

it('conserva el aviso de día sin vuelos cuando falla una recarga en segundo plano', async () => {
  const fecha = sumarDias(hoyIso(), 30)
  await iniciarComo('jefe.operaciones')
  const { queryClient } = renderApp(`/turnos/dia/${fecha}`)
  expect(await screen.findByText('No hay vuelos programados para este día.')).toBeInTheDocument()
  server.use(http.get(`${config.sigedaApiUrl}/api/turnos`, () => HttpResponse.error()))
  await queryClient.refetchQueries({ queryKey: clavesTurnos.dia(fecha) })
  await waitFor(() => expect(queryClient.getQueryState(clavesTurnos.dia(fecha))?.status).toBe('error'))
  expect(screen.getByText('No hay vuelos programados para este día.')).toBeInTheDocument()
})

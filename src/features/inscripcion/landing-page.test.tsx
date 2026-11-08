import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { renderApp } from '@/test/render'

describe('LandingPage (/)', () => {
  it('muestra el catálogo público con las horas de vuelo y los requisitos de la admisión', async () => {
    renderApp('/')

    const tarjeta = (await screen.findByRole('heading', { name: 'Piloto de Helicóptero' })).parentElement as HTMLElement
    expect(within(tarjeta).getByText(/94 horas/)).toBeInTheDocument()
    expect(await within(tarjeta).findByText(/Declaración jurada firmada/)).toBeInTheDocument()
    expect(within(tarjeta).getByText(/mayor de edad/)).toBeInTheDocument()
    expect(within(tarjeta).getByText(/médico aeronáutico clase 2 antes del resultado/)).toBeInTheDocument()
  })

  it('el botón "Postular" lleva al formulario de la convocatoria', async () => {
    const { usuario } = renderApp('/')

    const boton = await screen.findByRole('link', { name: 'Postular' })
    await usuario.click(boton)

    await waitFor(() => expect(screen.getByLabelText('Número de documento')).toBeInTheDocument())
  })

  it('el llamado a la admisión nombra la convocatoria abierta, su fecha límite y sus vacantes', async () => {
    renderApp('/')
    const seccion = (await screen.findByRole('heading', { name: /Postula a Admisión 2026-I/ })).closest('section') as HTMLElement
    expect(within(seccion).getByText(/hasta el 31\/12\/2026/)).toBeInTheDocument()
    expect(within(seccion).getByText(/20 vacantes/)).toBeInTheDocument()
  })

  it('sin convocatoria abierta no anuncia una admisión abierta', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/public/convocatorias`, () => HttpResponse.json([])))
    renderApp('/')
    expect(await screen.findByRole('heading', { name: /No hay convocatoria abierta/ })).toBeInTheDocument()
    expect(screen.queryByText(/La admisión está abierta/)).not.toBeInTheDocument()
  })

  it('explica el proceso real: postulación, revisión, evaluación, matrícula y cuenta', async () => {
    renderApp('/')
    const pasos = await screen.findByRole('list', { name: 'Pasos de la admisión' })
    expect(within(pasos).getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Postula en línea',
      'Revisión documental',
      'Evaluación de admisión',
      'Resultado y matrícula',
      'Activa tu cuenta',
    ])
    expect(screen.queryByText(/comprobante/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Inscríbete/)).not.toBeInTheDocument()
    expect(screen.queryByText(/creas tu cuenta/)).not.toBeInTheDocument()
  })
})

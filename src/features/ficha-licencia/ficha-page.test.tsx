import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
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

  it('captura la emisión de la licencia de alumno y dispara la alerta de 24 meses', async () => {
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/fichas-licencia/A002')
    await screen.findByRole('heading', { level: 1, name: /Ficha de licencia · A002/ })
    await usuario.type(screen.getByLabelText('Licencia de alumno (emisión)'), '2023-01-01')
    await usuario.click(screen.getByRole('button', { name: 'Guardar ficha' }))
    expect(await screen.findByText(/licencia de alumno tiene más de 24 meses/i)).toBeInTheDocument()
  })

  it('muestra las horas que el sistema ya registró del curso', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/fichas-licencia/:cod`, () =>
        HttpResponse.json({
          codAlumno: 'A003',
          horasRegistradas: { vuelo: 3, simulador: 1.5 },
          resumen: { estado: 'EN_PREPARACION', requisitos: [], alertas: [], bloqueos: [] },
        }),
      ),
    )
    await iniciarComo('coordinador.rivas')
    renderApp('/fichas-licencia/A003')
    const registro = within(await screen.findByRole('region', { name: 'Registrado por el sistema' }))
    expect(registro.getByText('3.00 h')).toBeInTheDocument()
    expect(registro.getByText('1.50 h')).toBeInTheDocument()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { registrarResultado } from '@/mocks/sigeda/resultados'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

function egresado(cod: string) {
  registrarResultado({
    codAlumno: cod,
    idGrupo: 1,
    situacion: 'EGRESADO',
    fecha: '2026-11-01',
    observacion: null,
    nit: null,
    nia: null,
    nfpi: 16,
    puesto: 1,
    horasVuelo: null,
    horasSimulador: null,
    constancia: 'CE-2026-001-01',
  })
}

const estadoDeLaFicha = () => screen.getByText(/./, { selector: 'span[data-estado]' })

describe('Ficha de licencia (/fichas-licencia/$cod)', () => {
  it('sin el permiso, la ruta queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/fichas-licencia/A001')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })

  it('un alumno sin ficha abre en preparación y se puede capturar', async () => {
    egresado('A001')
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/fichas-licencia/A001')

    expect(await screen.findByRole('heading', { level: 1, name: /Ficha de licencia · A001/ })).toBeInTheDocument()
    expect(estadoDeLaFicha()).toHaveTextContent('En preparación')
    // Todos los requisitos arrancan en "falta".
    const requisitos = within(screen.getByRole('list', { name: 'Requisitos de la licencia' }))
    expect(requisitos.getAllByText(/falta/).length).toBeGreaterThan(0)

    // Capturar horas insuficientes: la ficha pasa a Observada y el requisito de 40 h sigue faltando.
    await usuario.type(screen.getByLabelText('Total'), '30')
    await usuario.click(screen.getByRole('button', { name: 'Guardar ficha' }))

    expect(await screen.findByText('Ficha guardada.')).toBeInTheDocument()
    await waitFor(() => expect(estadoDeLaFicha()).toHaveTextContent('Observada'))
    expect(screen.getByText(/40 h en total/)).toHaveTextContent('falta')
  })

  it('captura la emisión de la licencia de alumno y dispara la alerta de 24 meses', async () => {
    egresado('A002')
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
  it('la ficha de quien no egresó se consulta pero no se guarda', async () => {
    await iniciarComo('coordinador.rivas')
    renderApp('/fichas-licencia/A009')
    expect(await screen.findByRole('alert')).toHaveTextContent('La ficha de licencia se abre al egresar del curso.')
    expect(screen.getByRole('button', { name: 'Guardar ficha' })).toBeDisabled()
    expect(screen.getByText(/Curso del CIAC aprobado/)).toHaveTextContent('falta')
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirFases(username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp('/programa/fases')
  await screen.findByRole('heading', { name: 'Fases y subfases' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Fases del programa' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

describe('Fases y subfases', () => {
  it('CA-FAS-01 muestra nombre y descripción, y ofrece registrar con Manage Phases', async () => {
    await abrirFases()
    expect(await screen.findByRole('table', { name: 'Fases del programa' })).toBeInTheDocument()
    expect(filas()).toEqual([
      ['Adaptación', 'Control básico del helicóptero, circuitos y precisión'],
      ['Navegación Visual', 'Navegación local, en ruta y compleja con referencias visuales'],
      ['Emergencias y Maniobras Avanzadas', 'Autorrotación y fallas de sistemas'],
      ['Vuelo Nocturno', 'Adaptación, navegación y emergencias de noche'],
      ['Vuelo por Instrumentos', 'Procedimientos, aproximación y emergencias IFR'],
    ])
    expect(screen.getByRole('link', { name: 'Registrar fase' })).toHaveAttribute('href', '/programa/fases/nueva')
  })

  it('CA-FAS-01 el personal sin Manage Phases solo consulta', async () => {
    await abrirFases('jefe.operaciones')
    expect(await screen.findByRole('table', { name: 'Fases del programa' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar fase' })).not.toBeInTheDocument()
  })

  it('CA-FAS-01 ordena por nombre y guarda el orden en la URL', async () => {
    const { usuario, router } = await abrirFases()
    await usuario.click(await screen.findByRole('button', { name: /Nombre/ }))
    expect(router.state.location.search).toMatchObject({ property: 'nombre', direction: 'ASC' })
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Adaptación'))
    await usuario.click(screen.getByRole('button', { name: /Nombre/ }))
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Vuelo por Instrumentos'))
  })

  it('muestra el aviso de error si la lista no carga', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/fases`, () => HttpResponse.error()))
    await abrirFases()
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
  })
})

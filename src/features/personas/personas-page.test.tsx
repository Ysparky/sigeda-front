import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirPersonas(ruta = '/personas') {
  await iniciarComo('admin.sistema')
  const vista = renderApp(ruta)
  await screen.findByRole('heading', { name: 'Personas' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Personas registradas' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

describe('Personas', () => {
  it('CA-PER-01 muestra código, apellidos y nombres, rango y tipo', async () => {
    await abrirPersonas()
    expect(await screen.findByRole('table', { name: 'Personas registradas' })).toBeInTheDocument()
    expect(filas().slice(0, 3)).toEqual([
      ['000001', 'Sistema Web, Admin', 'Admin', '—'],
      ['111111', 'Lopez Chaparro, Oscar', 'Cadete', 'Alumno'],
      ['222222', 'Falconi Fernandez, Juan', 'Alférez', 'Alumno'],
    ])
    expect(screen.getByRole('link', { name: '111111' })).toHaveAttribute('href', '/personas/111111')
  })

  it('CA-PER-01 ordena por apellido paterno y guarda el orden y la página en la URL', async () => {
    const { usuario, router } = await abrirPersonas()
    await usuario.click(await screen.findByRole('button', { name: /Apellidos y nombres/ }))
    expect(router.state.location.search).toMatchObject({ property: 'aPaterno', direction: 'ASC', page: 0 })
    expect(filas()[0]?.[1]).toBe('Aguirre Salas, Jorge')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(router.state.location.search).toMatchObject({ page: 1, property: 'aPaterno' })
  })

  it('CA-PER-01 respeta el orden que llega en la URL', async () => {
    await abrirPersonas('/personas?property=codigo&direction=DESC')
    expect(await screen.findByRole('table', { name: 'Personas registradas' })).toBeInTheDocument()
    expect(filas()[0]?.[0]).toBe('999999')
  })

  it('muestra el aviso de error con reintentar si la lista no carga', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/personas`, () => HttpResponse.error()))
    await abrirPersonas()
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('CA-DEP-01 sin la dependencia 22 resuelta, Registrar persona está deshabilitada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirPersonas()
    expect(screen.getByRole('button', { name: 'Registrar persona' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })

  it('CA-DEP-02 en modo mock se puede registrar una persona', async () => {
    await abrirPersonas()
    expect(screen.getByRole('link', { name: 'Registrar persona' })).toHaveAttribute('href', '/personas/nueva')
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirGrupos(username = 'admin.sistema') {
  await iniciarComo(username)
  const vista = renderApp('/grupos')
  await screen.findByRole('heading', { name: 'Grupos' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Grupos registrados' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

describe('Grupos', () => {
  it('CA-GRU-01 muestra nombre, descripción y programa', async () => {
    await abrirGrupos()
    expect(await screen.findByRole('table', { name: 'Grupos registrados' })).toBeInTheDocument()
    expect(filas()[0]).toEqual(['Grupo 1', 'Instrucción básica - Nuevos ingresantes', 'PDI'])
    expect(screen.getByRole('link', { name: 'Grupo 1' })).toHaveAttribute('href', '/grupos/1')
  })

  it('CA-GRU-01 ordena por nombre y deja el orden en la URL', async () => {
    const { usuario, router } = await abrirGrupos()
    await usuario.click(await screen.findByRole('button', { name: /Nombre/ }))
    expect(router.state.location.search).toMatchObject({ property: 'nombre', direction: 'ASC' })
    await usuario.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(router.state.location.search).toMatchObject({ property: 'nombre', direction: 'DESC' })
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Grupo 6'))
  })

  it('CA-GRU-01 también la ve el jefe de operaciones', async () => {
    await abrirGrupos('jefe.operaciones')
    expect(await screen.findByRole('table', { name: 'Grupos registrados' })).toBeInTheDocument()
  })

  it('muestra el aviso de error si la lista no carga', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/grupos`, () => HttpResponse.error()))
    await abrirGrupos()
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
  })
})

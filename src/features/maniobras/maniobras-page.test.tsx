import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirManiobras(username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp('/programa/maniobras')
  await screen.findByRole('heading', { name: 'Maniobras' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Maniobras del programa' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

describe('Maniobras', () => {
  it('CA-MAN-01 muestra nombre y descripción y ofrece registrar con Manage Maneuvers', async () => {
    await abrirManiobras()
    expect(await screen.findByRole('table', { name: 'Maniobras del programa' })).toBeInTheDocument()
    expect(filas()[0]).toEqual(['Ingreso al circuito de tránsito', 'Incorporación al circuito por el tramo y altura publicados'])
    expect(screen.getByRole('link', { name: 'Registrar maniobra' })).toHaveAttribute('href', '/programa/maniobras/nueva')
  })

  it('CA-EST-01 quien solo asigna estándares no ve registrar maniobras', async () => {
    await abrirManiobras('jefe.operaciones')
    expect(await screen.findByRole('table', { name: 'Maniobras del programa' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar maniobra' })).not.toBeInTheDocument()
  })

  it('CA-MAN-01 pagina de a 10 y guarda la página en la URL', async () => {
    const { usuario, router } = await abrirManiobras()
    await screen.findByRole('table', { name: 'Maniobras del programa' })
    expect(filas()).toHaveLength(10)
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(router.state.location.search).toMatchObject({ page: 1 })
    await waitFor(() => expect(filas()).toEqual([['Autorrotación', 'Aterrizaje sin potencia']]))
  })
})

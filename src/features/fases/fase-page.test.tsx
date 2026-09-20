import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_FASE_SIN_SUBFASES } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirFase(id: number, username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(`/programa/fases/${id}`)
  await screen.findByRole('heading', { level: 2, name: 'Subfases' })
  return vista
}

describe('Detalle de fase', () => {
  it('CA-FAS-03 muestra la fase, sus subfases y las maniobras de cada una', async () => {
    await abrirFase(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Adaptación' })).toBeInTheDocument()
    const instrumentos = await screen.findByRole('region', { name: 'Instrumentos' })
    await waitFor(() => expect(within(instrumentos).getByText('Maniobra 9')).toBeInTheDocument())
    expect(within(instrumentos).getByText('Maniobra 10')).toBeInTheDocument()
    const contacto = screen.getByRole('region', { name: 'Contacto' })
    await waitFor(() => expect(within(contacto).getByText('Sin maniobras asignadas.')).toBeInTheDocument())
  })

  it('CA-FAS-05 una fase con subfases no se puede eliminar y se explica', async () => {
    await abrirFase(1)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText(TEXTO_FASE_SIN_SUBFASES)).toBeInTheDocument()
  })

  it('CA-FAS-05 una fase sin subfases se elimina con confirmación', async () => {
    const { usuario, router } = await abrirFase(2)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Se eliminará «Operaciones HeliTransportadas»')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Fase eliminada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/fases'))
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Operaciones HeliTransportadas' })).not.toBeInTheDocument(),
    )
  })

  it('CA-DEP-01 sin la dependencia 37 resuelta, eliminar está deshabilitada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirFase(2)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })

  it('CA-FAS-01 sin Manage Phases no se ofrece modificar ni eliminar', async () => {
    await abrirFase(1, 'instructor.perez')
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
  })

  it('si falla la carga de una subfase lo indica en su tarjeta', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/subfases/:id`, () => HttpResponse.error()))
    await abrirFase(1)
    const contacto = await screen.findByRole('region', { name: 'Contacto' })
    expect(
      await within(contacto).findByText('No se pudieron cargar las maniobras de la subfase'),
    ).toBeInTheDocument()
  })

  it('una fase inexistente muestra la página no encontrada', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/fases/99')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})

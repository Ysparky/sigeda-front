import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_MANIOBRA_CON_ESTANDARES, TEXTO_SUBFASES_NO_DISPONIBLES } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirManiobra(id: number, username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(`/programa/maniobras/${id}`)
  await screen.findByRole('heading', { level: 2, name: 'Estándares' })
  return vista
}

describe('Detalle de maniobra', () => {
  it('CA-MAN-03 muestra la maniobra, sus estándares y sus subfases con su fase', async () => {
    await abrirManiobra(9)
    expect(screen.getByRole('heading', { level: 1, name: 'Estacionario fuera de efecto suelo' })).toBeInTheDocument()
    expect(screen.getByText('Altura sostenida sin efecto suelo')).toBeInTheDocument()
    expect(screen.getByText('Potencia dentro de límites')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('· Adaptación')).toBeInTheDocument())
    expect(screen.getByText('Control Preciso')).toBeInTheDocument()
  })

  it('CA-MAN-03 si la respuesta no trae subfases lo indica', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/maniobras/:id`, () =>
        HttpResponse.json({
          id: 9,
          nombre: 'Estacionario fuera de efecto suelo',
          descripcion: 'Estacionario sin asistencia del efecto suelo, con mayor demanda de potencia',
          estandares: [{ id: 10, nombre: 'Estacionario fuera de efecto suelo', descripcion: null }],
        }),
      ),
    )
    await abrirManiobra(9)
    expect(screen.getByText(TEXTO_SUBFASES_NO_DISPONIBLES)).toBeInTheDocument()
  })

  it('CA-MAN-05 una maniobra con estándares no se puede eliminar', async () => {
    await abrirManiobra(9)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText(TEXTO_MANIOBRA_CON_ESTANDARES)).toBeInTheDocument()
  })

  it('CA-MAN-05 una maniobra sin estándares se elimina con confirmación', async () => {
    const { usuario, router } = await abrirManiobra(11)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Se eliminará «Autorrotación»')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Maniobra eliminada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras'))
  })

  it('CA-MAN-05 modificar y eliminar una maniobra refrescan el detalle de su fase', async () => {
    await iniciarComo('comandante.aguirre')
    const { usuario, router, queryClient } = renderApp('/programa/fases/1')
    queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } })
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Control Básico' })).toHaveTextContent('Sin maniobras asignadas.'),
    )

    await router.navigate({ to: '/programa/maniobras/$id/editar', params: { id: '11' } })
    await screen.findByLabelText('Nombre')
    await usuario.click(await screen.findByRole('checkbox', { name: 'Control Básico' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras/11'))

    await router.navigate({ to: '/programa/fases/$id', params: { id: '1' } })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Control Básico' })).toHaveTextContent('Autorrotación'))

    await router.navigate({ to: '/programa/maniobras/$id', params: { id: '11' } })
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras'))

    await router.navigate({ to: '/programa/fases/$id', params: { id: '1' } })
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Control Básico' })).toHaveTextContent('Sin maniobras asignadas.'),
    )
  })

  it('CA-MAN-05 muestra el motivo del backend si rechaza la eliminación', async () => {
    server.use(
      http.delete(`${config.sigedaApiUrl}/api/maniobras/:id`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-09-19T10:00:00',
            status: 410,
            error: 'Acción expirada',
            message: 'La maniobra no se pudo eliminar, está presente en un turno.',
          },
          { status: 410 },
        ),
      ),
    )
    const { usuario } = await abrirManiobra(11)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('La maniobra no se pudo eliminar, está presente en un turno.')).toBeInTheDocument()
  })

  it('CA-EST-01 el jefe de operaciones solo edita los estándares', async () => {
    await abrirManiobra(9, 'jefe.operaciones')
    expect(screen.getByRole('link', { name: 'Editar estándares' })).toHaveAttribute(
      'href',
      '/programa/maniobras/9/estandares',
    )
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
  })

  it('CA-EST-01 el comandante ve los estándares pero no los edita', async () => {
    await abrirManiobra(9)
    expect(screen.queryByRole('link', { name: 'Editar estándares' })).not.toBeInTheDocument()
  })

  it('CA-DEP-01 sin las dependencias 32 y 33, modificar está deshabilitada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirManiobra(9)
    expect(screen.getByRole('button', { name: 'Modificar' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })

  it('una maniobra inexistente muestra la página no encontrada', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/maniobras/99')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})

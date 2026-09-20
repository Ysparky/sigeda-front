import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_DESCRIPCION_SE_CONSERVA, TEXTO_ESTANDAR_NO_SE_QUITA } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirEstandares(id: number) {
  await iniciarComo('jefe.operaciones')
  const vista = renderApp(`/programa/maniobras/${id}/estandares`)
  await screen.findByRole('heading', { level: 1, name: 'Estándares de la maniobra' })
  return vista
}

describe('Estándares de la maniobra', () => {
  it('CA-EST-02 y CA-EST-04 edita los estándares y vuelve al detalle con el aviso', async () => {
    const { usuario, router } = await abrirEstandares(9)
    expect(screen.getByLabelText('Nombre 1')).toHaveValue('Estandar 60')
    await usuario.type(screen.getByLabelText('Descripción 1'), 'Mantener altitud ±50 ft')
    await usuario.click(screen.getByRole('button', { name: 'Agregar estándar' }))
    await usuario.type(screen.getByLabelText('Nombre 3'), 'Mantener rumbo ±5°')
    await usuario.click(screen.getByRole('button', { name: 'Guardar estándares' }))
    expect(await screen.findByText('Estándares guardados.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras/9'))
    expect(await screen.findByText('Mantener rumbo ±5°')).toBeInTheDocument()
    expect(screen.getByText('· Mantener altitud ±50 ft')).toBeInTheDocument()
  })

  it('CA-EST-03 un estándar guardado no se puede quitar y avisa sobre la descripción', async () => {
    const { usuario } = await abrirEstandares(9)
    expect(screen.getAllByText(TEXTO_ESTANDAR_NO_SE_QUITA)).toHaveLength(2)
    expect(screen.getAllByText(TEXTO_DESCRIPCION_SE_CONSERVA)).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Quitar estándar 1' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Agregar estándar' }))
    expect(screen.getByRole('button', { name: 'Quitar estándar 3' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Quitar estándar 3' }))
    expect(screen.queryByLabelText('Nombre 3')).not.toBeInTheDocument()
  })

  it('CA-EST-02 exige al menos un estándar con nombre válido', async () => {
    const { usuario } = await abrirEstandares(11)
    expect(screen.getByLabelText('Nombre 1')).toHaveValue('')
    await usuario.click(screen.getByRole('button', { name: 'Guardar estándares' }))
    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Nombre 1'), 'AB')
    await usuario.click(screen.getByRole('button', { name: 'Guardar estándares' }))
    expect(await screen.findByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
  })

  it('CA-EST-04 el error de lista vacía aparece sobre la lista y los de cada fila bajo su campo', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/maniobras/:id/estandar`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-09-19T10:00:00',
            status: 400,
            error: 'Error al validar el modelo',
            message: null,
            messages: [
              "'estandares': La asignación de estandares es requerida",
              "'estandares[0].nombre': El nombre debe tener entre 3 y 35 caracteres.",
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirEstandares(9)
    await usuario.click(screen.getByRole('button', { name: 'Guardar estándares' }))
    expect(await screen.findByText('La asignación de estandares es requerida')).toBeInTheDocument()
    const fila = screen.getByLabelText('Nombre 1').closest('div')
    expect(within(fila as HTMLElement).getByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
  })
})

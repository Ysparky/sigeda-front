import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_DESCRIPCION_SE_CONSERVA, TEXTO_SUBFASE_NO_SE_QUITA } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(ruta: string) {
  await iniciarComo('comandante.aguirre')
  const vista = renderApp(ruta)
  await screen.findByLabelText('Nombre')
  return vista
}

describe('Formulario de fase', () => {
  it('CA-FAS-02 registra una fase con al menos una subfase y abre el detalle', async () => {
    const { usuario, router } = await abrir('/programa/fases/nueva')
    await usuario.type(screen.getByLabelText('Nombre'), 'Operaciones Nocturnas')
    await usuario.type(screen.getByLabelText('Descripción'), 'Vuelo con visores nocturnos')
    await usuario.type(screen.getByLabelText('Nombre 1'), 'Familiarización NVG')
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    expect(await screen.findByText('Fase registrada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/fases/6'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Operaciones Nocturnas' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Familiarización NVG' })).toBeInTheDocument()
  })

  it('CA-FAS-02 exige nombre y al menos una subfase con nombre válido', async () => {
    const { usuario } = await abrir('/programa/fases/nueva')
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    expect(await screen.findAllByText('El nombre es obligatorio')).toHaveLength(2)
    await usuario.click(screen.getByRole('button', { name: 'Quitar subfase 1' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    expect(await screen.findByText('La asignación de subfases es requerida')).toBeInTheDocument()
  })

  it('CA-FAS-04 al modificar precarga las subfases, no deja quitar las guardadas y agrega nuevas', async () => {
    const { usuario, router } = await abrir('/programa/fases/1/editar')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Adaptación')
    expect(screen.getByLabelText('Nombre 1')).toHaveValue('Control Básico')
    expect(screen.getAllByText(TEXTO_SUBFASE_NO_SE_QUITA)).toHaveLength(3)
    expect(screen.getAllByText(TEXTO_DESCRIPCION_SE_CONSERVA).length).toBeGreaterThan(1)
    expect(screen.queryByRole('button', { name: 'Quitar subfase 1' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Agregar subfase' }))
    await usuario.type(screen.getByLabelText('Nombre 4'), 'Autorrotaciones')
    expect(screen.getByRole('button', { name: 'Quitar subfase 4' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    expect(await screen.findByText('Fase modificada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/fases/1'))
    expect(await screen.findByRole('region', { name: 'Autorrotaciones' })).toBeInTheDocument()
  })

  it('CA-FAS-06 los errores del backend aparecen bajo su campo, también en cada subfase', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/fases/:id`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-09-19T10:00:00',
            status: 400,
            error: 'Error al validar el modelo',
            message: null,
            messages: ["'subfases[0].nombre': El nombre debe tener entre 3 y 35 caracteres."],
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrir('/programa/fases/1/editar')
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    const fila = (await screen.findByLabelText('Nombre 1')).closest('div')
    expect(within(fila as HTMLElement).getByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
  })
})

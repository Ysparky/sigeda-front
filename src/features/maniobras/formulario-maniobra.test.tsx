import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_DESCRIPCION_SE_CONSERVA } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(ruta: string) {
  await iniciarComo('comandante.aguirre')
  const vista = renderApp(ruta)
  await screen.findByLabelText('Nombre')
  return vista
}

describe('Formulario de maniobra', () => {
  it('CA-MAN-02 registra una maniobra con sus subfases agrupadas por fase', async () => {
    const { usuario, router } = await abrir('/programa/maniobras/nueva')
    const grupo = within(await screen.findByRole('group', { name: 'Subfases de la maniobra' }))
    expect(grupo.getByText('Adaptación')).toBeInTheDocument()
    expect(grupo.getAllByRole('checkbox')).toHaveLength(5)
    await usuario.type(screen.getByLabelText('Nombre'), 'Autorrotación doble')
    await usuario.type(screen.getByLabelText('Descripción'), 'Aterrizaje sin potencia')
    await usuario.click(grupo.getByRole('checkbox', { name: 'Circuitos y Maniobras' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    expect(await screen.findByText('Maniobra registrada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras/12'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Autorrotación doble' })).toBeInTheDocument()
    expect(screen.getByText('Circuitos y Maniobras')).toBeInTheDocument()
  })

  it('CA-MAN-02 exige el nombre y al menos una subfase', async () => {
    const { usuario } = await abrir('/programa/maniobras/nueva')
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La asignación de subfases es requerida')).toBeInTheDocument()
  })

  it('CA-MAN-04 modificar precarga las subfases actuales y avisa sobre la descripción', async () => {
    const { usuario, router } = await abrir('/programa/maniobras/9/editar')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Maniobra 9')
    expect(screen.getByRole('checkbox', { name: 'Control Preciso' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Circuitos y Maniobras' })).not.toBeChecked()
    expect(screen.getByText(TEXTO_DESCRIPCION_SE_CONSERVA)).toBeInTheDocument()
    await usuario.click(screen.getByRole('checkbox', { name: 'Circuitos y Maniobras' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    expect(await screen.findByText('Maniobra modificada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras/9'))
    await waitFor(() => expect(screen.getByText('Circuitos y Maniobras')).toBeInTheDocument())
  })

  it('CA-MAN-06 los errores del backend aparecen bajo su campo y bajo el selector de subfases', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/maniobras`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-09-19T10:00:00',
            status: 400,
            error: 'Error al validar el modelo',
            message: null,
            messages: [
              "'nombre': El nombre debe tener entre 3 y 35 caracteres.",
              "'subfases[0].idSubfase': La subfase es requerida.",
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrir('/programa/maniobras/nueva')
    await usuario.type(screen.getByLabelText('Nombre'), 'Autorrotación doble')
    await usuario.click(screen.getByRole('checkbox', { name: 'Circuitos y Maniobras' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    expect(await screen.findByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('La subfase es requerida.')).toBeInTheDocument()
  })

  it('CA-DEP-01 sin las dependencias 32 y 33 la ruta de modificar no muestra el formulario', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/maniobras/9/editar')
    expect(await screen.findByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })
})

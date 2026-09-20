import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { TEXTO_PROGRAMA_FIJO } from './components/formulario-grupo'

async function abrir(ruta: string) {
  await iniciarComo('admin.sistema')
  const vista = renderApp(ruta)
  await screen.findByLabelText('Nombre')
  return vista
}

function alumnosOfrecidos() {
  return within(screen.getByRole('group', { name: 'Alumnos del grupo' }))
    .getAllByRole('checkbox')
    .map((casilla) => casilla.getAttribute('id'))
}

describe('Formulario de grupo', () => {
  it('CA-GRU-02 registra un grupo con sus alumnos y abre el detalle', async () => {
    const { usuario, router } = await abrir('/grupos/nuevo')
    await usuario.type(screen.getByLabelText('Nombre'), 'Grupo 7')
    await usuario.type(screen.getByLabelText('Descripción'), 'Promoción 2027')
    await usuario.selectOptions(screen.getByLabelText('Programa'), 'PDE')
    await usuario.click(screen.getByRole('checkbox', { name: 'Lucía Mendoza Ríos' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await screen.findByText('Grupo guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/grupos/7'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Grupo 7' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Alumnos del grupo' })).toHaveTextContent('Lucía Mendoza Ríos')
  })

  it('CA-GRU-02 si la respuesta no trae el id del grupo se vuelve a la lista', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/grupos`, () =>
        HttpResponse.json({ mensaje: 'Grupo guardada con éxito.' }, { status: 201 }),
      ),
    )
    const { usuario, router } = await abrir('/grupos/nuevo')
    await usuario.type(screen.getByLabelText('Nombre'), 'Grupo 7')
    await usuario.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await screen.findByText('Grupo guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/grupos'))
    expect(await screen.findByRole('table', { name: 'Grupos registrados' })).toBeInTheDocument()
    expect(screen.queryByText('Página no encontrada')).not.toBeInTheDocument()
  })

  it('CA-GRU-02 exige un nombre de 3 a 35 caracteres', async () => {
    const { usuario } = await abrir('/grupos/nuevo')
    await usuario.type(screen.getByLabelText('Nombre'), 'G')
    await usuario.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await screen.findByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
  })

  it('CA-GRU-03 ofrece los alumnos sin grupo y, al modificar, también los propios ya marcados', async () => {
    const primera = await abrir('/grupos/nuevo')
    expect(alumnosOfrecidos()).toEqual(['alumno-654321'])
    primera.unmount()
    await abrir('/grupos/3/editar')
    expect(alumnosOfrecidos()).toEqual(['alumno-555555', 'alumno-666666', 'alumno-654321'])
    expect(screen.getByRole('checkbox', { name: 'Pedro Rodriguez Garcia' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Lucía Mendoza Ríos' })).not.toBeChecked()
  })

  it('CA-GRU-04 al modificar el programa es de solo lectura y se explica', async () => {
    await abrir('/grupos/3/editar')
    expect(screen.getByLabelText('Programa')).toBeDisabled()
    expect(screen.getByText(TEXTO_PROGRAMA_FIJO)).toBeInTheDocument()
  })

  it('CA-GRU-05 desmarcar un alumno lo deja sin grupo y vuelve a ofrecerse', async () => {
    const primera = await abrir('/grupos/3/editar')
    await primera.usuario.click(screen.getByRole('checkbox', { name: 'Pedro Rodriguez Garcia' }))
    await primera.usuario.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await screen.findByText('Grupo guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(primera.router.state.location.pathname).toBe('/grupos/3'))
    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Alumnos del grupo' })).not.toHaveTextContent('Pedro Rodriguez Garcia'),
    )
    primera.unmount()
    await abrir('/grupos/1/editar')
    expect(screen.getByRole('checkbox', { name: 'Pedro Rodriguez Garcia' })).not.toBeChecked()
  })
})

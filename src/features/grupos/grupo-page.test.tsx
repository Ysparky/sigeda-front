import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirGrupo(id: number) {
  await iniciarComo('admin.sistema')
  const vista = renderApp(`/grupos/${id}`)
  await screen.findByRole('heading', { level: 2, name: 'Alumnos' })
  return vista
}

describe('Detalle de grupo', () => {
  it('CA-GRU-06 muestra los datos del grupo y sus alumnos', async () => {
    await abrirGrupo(3)
    expect(screen.getByRole('heading', { level: 1, name: 'Grupo 3' })).toBeInTheDocument()
    expect(screen.getAllByText('Entrenamiento especializado - Nivel 1').length).toBe(2)
    const tabla = within(screen.getByRole('table', { name: 'Alumnos del grupo' }))
    expect(
      tabla
        .getAllByRole('row')
        .slice(1)
        .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent)),
    ).toEqual([
      ['555555', 'Pedro Rodriguez Garcia', 'Apto'],
      ['666666', 'Ana Torres Martinez', 'Apto'],
    ])
  })

  it('CA-GRU-07 eliminar avisa que los alumnos quedarán sin grupo y vuelve a la lista', async () => {
    const { usuario, router } = await abrirGrupo(3)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('sus alumnos quedarán sin grupo')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Grupo eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/grupos'))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Grupo 3' })).not.toBeInTheDocument())
  })

  it('CA-GRU-08 un grupo inexistente muestra la página no encontrada', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/grupos/99')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })

  it('CA-GRU-08 un 200 sin cuerpo también es no encontrado', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/grupos/:id`, () => new HttpResponse(null, { status: 200 })))
    await iniciarComo('admin.sistema')
    renderApp('/grupos/3')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})

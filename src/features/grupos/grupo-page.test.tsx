import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { datos } from '@/mocks/sigeda/datos'
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

  it('el Coordinador ve en el tablero por qué la cohorte aún no puede cerrar', async () => {
    await iniciarComo('coordinador.rivas')
    renderApp('/grupos/1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Grupo 1' })).toBeInTheDocument()
    const tablero = within(await screen.findByRole('region', { name: 'Cierre de la cohorte' }))
    expect(tablero.getByRole('button', { name: 'Cerrar cohorte' })).toBeDisabled()
    expect(tablero.getByRole('alert')).toHaveTextContent('Sin concluir: Oscar Lopez')
    const fila = within(tablero.getByRole('row', { name: /Oscar Lopez/ }))
    expect(fila.getByText('En curso')).toBeInTheDocument()
  })

  it('vencido el plazo máximo cierra y el acta deja a los pendientes como no culminados', async () => {
    datos().grupos.find((g) => g.id === 1)!.fechaInicio = '2025-01-06'
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/grupos/1')
    const tablero = within(await screen.findByRole('region', { name: 'Cierre de la cohorte' }))
    await waitFor(() => expect(tablero.getByRole('button', { name: 'Cerrar cohorte' })).toBeEnabled())
    await usuario.click(tablero.getByRole('button', { name: 'Cerrar cohorte' }))
    const acta = within(await screen.findByRole('table', { name: 'Acta de cierre' }))
    expect(acta.getByText('No culminó')).toBeInTheDocument()
    expect(await screen.findByText('Cerrada')).toBeInTheDocument()
  })

  it('el Coordinador registra un retiro y el alumno queda con su situación final', async () => {
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/grupos/1')
    await usuario.click(await screen.findByRole('button', { name: 'Registrar decisión de Oscar Lopez' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getByText(/solo se puede registrar su retiro/)).toBeInTheDocument()
    await usuario.type(dialogo.getByLabelText('Acta u observación'), 'Retiro voluntario')
    await usuario.click(dialogo.getByRole('button', { name: 'Registrar decisión' }))
    expect(await screen.findByText('Decisión registrada.')).toBeInTheDocument()
    const tablero = within(screen.getByRole('region', { name: 'Cierre de la cohorte' }))
    expect(await tablero.findByText('Retirado')).toBeInTheDocument()
    expect(tablero.getByText('Retiro voluntario')).toBeInTheDocument()
  })

  it('un rol sin Manage Enrollments no ve el botón de cerrar la cohorte', async () => {
    await iniciarComo('admin.sistema') // tiene Manage Groups (ve el grupo) pero no Manage Enrollments
    renderApp('/grupos/1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Grupo 1' })).toBeInTheDocument()
    expect(screen.getByText('En progreso')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar cohorte' })).not.toBeInTheDocument()
  })

  it('el Coordinador no puede iniciar una cohorte incompleta y ve los motivos', async () => {
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/grupos/6')
    expect(await screen.findByRole('heading', { level: 1, name: 'Promoción 2026-A' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Iniciar cohorte' }))
    expect(await screen.findByText(/La cohorte no tiene instructor responsable\./)).toBeInTheDocument()
    expect(screen.getByText('En inscripción')).toBeInTheDocument()
  })

  it('al iniciar la cohorte fija su inicio y el fin previsto del plan base', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/grupos/:id/estado`, () =>
        HttpResponse.json({ mensaje: 'Estado de la cohorte actualizado.' }),
      ),
      http.get(`${config.sigedaApiUrl}/api/grupos/6`, () =>
        HttpResponse.json({
          id: 6,
          nombre: 'Promoción 2026-A',
          descripcion: null,
          programa: 'PDI',
          estado: 'EN_PROGRESO',
          codInstructor: '444444',
          fechaInicio: '2026-11-09',
          fechaFin: '2027-03-03',
          personas: [],
        }),
      ),
    )
    await iniciarComo('coordinador.rivas')
    renderApp('/grupos/6')
    expect(await screen.findByText('09/11/2026')).toBeInTheDocument()
    expect(screen.getByText('03/03/2027')).toBeInTheDocument()
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

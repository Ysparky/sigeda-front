import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirEvaluacion(username: string, codigo: string) {
  await iniciarComo(username)
  const vista = renderApp(`/evaluaciones/${codigo}`)
  await screen.findByRole('table', { name: 'Calificaciones por maniobra' })
  return vista
}

describe('Detalle de evaluación', () => {
  it('CA-EVA-08 muestra por maniobra nota mínima, nota obtenida, causa, observación y recomendación', async () => {
    await abrirEvaluacion('comandante.aguirre', '111111-1')
    const tabla = within(screen.getByRole('table', { name: 'Calificaciones por maniobra' }))
    const filas = tabla.getAllByRole('row').slice(1)
    expect(filas).toHaveLength(6)
    expect(within(filas[2] as HTMLElement).getAllByRole('cell').map((celda) => celda.textContent)).toEqual([
      'Maniobra 3',
      'B (Bueno)',
      'R (Regular)',
      'Falta de coordinación en pedales',
      'Pierde altura en el viraje',
      'Practicar virajes coordinados',
    ])
    expect(filas[2]).toHaveAttribute('data-bajo-estandar', 'true')
    expect(within(filas[0] as HTMLElement).getAllByRole('cell')[3]).toHaveTextContent('—')
  })

  it('CA-EVA-07 muestra el promedio y la clasificación que calculó el backend', async () => {
    await abrirEvaluacion('comandante.aguirre', '111111-1')
    expect(screen.getByText('16.50')).toBeInTheDocument()
    expect(screen.getByText('Bueno')).toHaveAttribute('data-tono', 'exito')
    expect(screen.getByText('Ponderada')).toBeInTheDocument()
  })

  it('CA-EVA-09 sin Modify Evaluations no se ofrece modificar ni eliminar', async () => {
    await abrirEvaluacion('instructor.perez', '555555-3')
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
  })

  it('CA-EVA-12 una evaluación que no es la última no se modifica y se explica el motivo', async () => {
    await abrirEvaluacion('comandante.aguirre', '555555-1')
    expect(
      await screen.findByText('Solo la última evaluación del alumno puede modificarse o eliminarse.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modificar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
  })

  it('CA-EVA-09 eliminar la última evaluación pide confirmación', async () => {
    const { usuario, router } = await abrirEvaluacion('comandante.aguirre', '555555-3')
    expect(await screen.findByRole('link', { name: 'Modificar' })).toHaveAttribute('href', '/evaluaciones/555555-3/editar')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Eliminar la evaluación?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Evaluación eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/evaluaciones'))
    expect(router.state.location.search).toMatchObject({ alumno: '555555' })
  })

  it('CA-EVA-10 el alumno no abre evaluaciones de otros alumnos', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/evaluaciones/555555-1')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-EVA-10 el alumno abre sus propias evaluaciones', async () => {
    await abrirEvaluacion('alumno.lopez', '111111-1')
    expect(screen.getByRole('heading', { level: 1, name: 'Ponderada Contacto Básico' })).toBeInTheDocument()
  })

  it('una evaluación inexistente muestra la página no encontrada', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/evaluaciones/999999-9')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })

  it('CA-EVA-09 si no se puede identificar la última evaluación lo indica', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/evaluaciones/filter/persona/:cod`, ({ request }) => {
        if (new URL(request.url).searchParams.get('size') === '500') {
          return HttpResponse.text('No se pudo calcular la última evaluación.', { status: 400 })
        }
        return undefined
      }),
    )
    await abrirEvaluacion('comandante.aguirre', '555555-3')
    expect(await screen.findByText('No se pudo identificar la última evaluación')).toBeInTheDocument()
    expect(screen.getByText('Resultado')).toBeInTheDocument()
  })
})

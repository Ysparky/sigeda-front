import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(codigo: string, username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(`/evaluaciones/${codigo}/editar`)
  await screen.findByRole('heading', { name: 'Modificar evaluación' })
  return vista
}

function maniobra(nombre: string) {
  return within(screen.getByRole('group', { name: new RegExp(`^${nombre}`) }))
}

describe('Modificar evaluación', () => {
  it('CA-EVA-12 carga la última evaluación con sus calificaciones', async () => {
    await abrir('555555-3')
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Ponderada Control Básico 3')
    expect(screen.getByLabelText('Categoría')).toBeDisabled()
    expect(screen.getByLabelText('Categoría')).toHaveValue('Ponderada')
    expect(maniobra('Ingreso al circuito de tránsito').getByRole('radio', { name: 'R (Regular)' })).toHaveAttribute('aria-checked', 'true')
    expect(maniobra('Ingreso al circuito de tránsito').getByLabelText('Causa')).toBeInTheDocument()
  })

  it('CA-EVA-12 guarda los cambios y muestra el resultado del backend', async () => {
    const { usuario, router } = await abrir('555555-3')
    await screen.findByLabelText('Nombre')
    for (const nombre of ['Ingreso al circuito de tránsito', 'Circuito de tránsito completo', 'Virajes a nivel', 'Ascensos y descensos']) {
      await usuario.click(maniobra(nombre).getByRole('radio', { name: 'B (Bueno)' }))
    }
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Promedio: 17.00 · Clasificación: Bueno')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/evaluaciones/555555-3'))
  })

  it('CA-EVA-12 una evaluación anterior no se puede modificar y se explica el motivo', async () => {
    await abrir('555555-1')
    expect(
      await screen.findByText('Solo la última evaluación del alumno puede modificarse o eliminarse.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('CA-EVA-09 exige el permiso Modify Evaluations', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/evaluaciones/555555-3/editar')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-EVA-13 muestra el rechazo del backend con su mensaje', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/evaluaciones/:cod`, () =>
        HttpResponse.json({ mensaje: 'Solo se puede modificar la ultima evaluación realiza por el alumno.' }, { status: 403 }),
      ),
    )
    const { usuario } = await abrir('555555-3')
    await screen.findByLabelText('Nombre')
    for (const nombre of ['Ingreso al circuito de tránsito', 'Circuito de tránsito completo', 'Virajes a nivel', 'Ascensos y descensos']) {
      await usuario.click(maniobra(nombre).getByRole('radio', { name: 'B (Bueno)' }))
    }
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(
      await screen.findByText('Solo se puede modificar la ultima evaluación realiza por el alumno.'),
    ).toBeInTheDocument()
  })

  it('CA-EVA-12 si no se puede identificar la última evaluación lo indica', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/evaluaciones/filter/persona/:cod`, ({ request }) => {
        if (new URL(request.url).searchParams.get('size') === '500') {
          return HttpResponse.text('No se pudo calcular la última evaluación.', { status: 400 })
        }
        return undefined
      }),
    )
    await abrir('555555-3')
    expect(await screen.findByText('No se pudo identificar la última evaluación')).toBeInTheDocument()
    expect(
      screen.queryByText('Solo la última evaluación del alumno puede modificarse o eliminarse.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar evaluación' })).not.toBeInTheDocument()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function tablaCargada() {
  await screen.findByText(/^Página \d+ de \d+/)
  return within(screen.getByRole('table', { name: 'Evaluaciones' }))
}

function codigos(tabla: ReturnType<typeof within>) {
  return tabla
    .getAllByRole('row')
    .slice(1)
    .map((fila: HTMLElement) => within(fila).getAllByRole('cell')[0]?.textContent)
}

describe('Evaluaciones', () => {
  it('M1-9 el personal elige primero al alumno', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/evaluaciones')
    expect(await screen.findByText('Elija un alumno para ver sus evaluaciones')).toBeInTheDocument()
  })

  it('CA-EVA-01 muestra código, nombre, fase, evaluador, fecha, alumno, promedio y clasificación', async () => {
    await iniciarComo('comandante.aguirre')
    const { usuario, router } = renderApp('/evaluaciones')
    await screen.findByRole('option', { name: 'Pedro Rodriguez Garcia' })
    await usuario.selectOptions(screen.getByLabelText('Alumno'), 'Pedro Rodriguez Garcia')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ alumno: '555555' }))
    const tabla = await tablaCargada()
    expect(tabla.getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual([
      'Código',
      'Nombre',
      'Fase',
      'Evaluador',
      'Fecha',
      'Alumno',
      'Promedio',
      'Clasificación',
      'Acciones',
    ])
    const fila = tabla.getByRole('link', { name: '555555-1' }).closest('tr') as HTMLElement
    expect(within(fila).getAllByRole('cell').slice(0, 8).map((celda) => celda.textContent)).toEqual([
      '555555-1',
      'Ponderada Contacto Básico',
      'Adaptación',
      'Juan Torres',
      '01/03/2024',
      'Pedro Rodriguez',
      '14.00',
      'Regular',
    ])
  })

  it('CA-EVA-01 filtra por clasificación y sub fase desde la URL', async () => {
    await iniciarComo('comandante.aguirre')
    const { usuario } = renderApp('/evaluaciones?alumno=%22555555%22&clasificacion=Bueno')
    expect(codigos(await tablaCargada())).toEqual(['555555-2'])
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
    expect(await screen.findByText('No hay evaluaciones')).toBeInTheDocument()
  })

  it('M1-9 el instructor elige entre los alumnos de sus turnos', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/evaluaciones')
    const selector = await screen.findByLabelText('Alumno')
    await waitFor(() =>
      expect(within(selector).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
        'Elija un alumno',
        'Oscar Lopez Chaparro',
        'Juan Falconi Fernandez',
        'Pedro Rodriguez Garcia',
        'Ana Torres Martinez',
      ]),
    )
  })

  it('CA-EVA-12 solo la última evaluación del alumno ofrece modificar', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/evaluaciones?alumno=%22555555%22')
    const tabla = await tablaCargada()
    expect(await tabla.findByRole('link', { name: 'Modificar' })).toHaveAttribute('href', '/evaluaciones/555555-3/editar')
    expect(tabla.getAllByText('Solo la última se modifica')).toHaveLength(2)
    expect(screen.getByText('Solo la última evaluación del alumno puede modificarse o eliminarse.')).toBeInTheDocument()
  })

  it('CA-EVA-09 sin Modify Evaluations no hay acciones', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/evaluaciones?alumno=%22555555%22')
    const tabla = await tablaCargada()
    expect(tabla.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument()
  })

  it('M1-9 si no cargan los alumnos lo indica en vez de mostrar la lista vacía', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/grupos/programa/:nombre`, () =>
        HttpResponse.text('No se pudo listar los alumnos.', { status: 400 }),
      ),
    )
    await iniciarComo('comandante.aguirre')
    renderApp('/evaluaciones')
    expect(await screen.findByText('No se pudieron cargar los alumnos')).toBeInTheDocument()
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
    await iniciarComo('comandante.aguirre')
    renderApp('/evaluaciones?alumno=%22555555%22')
    expect(await screen.findByText('No se pudo identificar la última evaluación')).toBeInTheDocument()
    const tabla = await tablaCargada()
    expect(codigos(tabla)).toEqual(['555555-1', '555555-2', '555555-3'])
  })

  it('CA-EVA-12 si falla la recarga de la última evaluación conserva la acción de modificar', async () => {
    await iniciarComo('comandante.aguirre')
    const { queryClient } = renderApp('/evaluaciones?alumno=%22555555%22')
    const tabla = await tablaCargada()
    await tabla.findByRole('link', { name: 'Modificar' })
    server.use(
      http.get(`${config.sigedaApiUrl}/api/evaluaciones/filter/persona/:cod`, ({ request }) => {
        if (new URL(request.url).searchParams.get('size') === '500') {
          return HttpResponse.text('No se pudo calcular la última evaluación.', { status: 400 })
        }
        return undefined
      }),
    )
    await queryClient.invalidateQueries()
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(screen.queryByText('No se pudo identificar la última evaluación')).not.toBeInTheDocument()
    expect((await tablaCargada()).getByRole('link', { name: 'Modificar' })).toHaveAttribute(
      'href',
      '/evaluaciones/555555-3/editar',
    )
  })
})

describe('Mis evaluaciones', () => {
  it('CA-EVA-10 el alumno ve solo sus propias evaluaciones', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/mis-evaluaciones')
    const tabla = await tablaCargada()
    expect(codigos(tabla)).toEqual(['111111-1'])
    expect(tabla.queryByRole('columnheader', { name: 'Alumno' })).not.toBeInTheDocument()
  })

  it('si no cargan las sub fases lo indica bajo el filtro y conserva la lista', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/subfases`, () => HttpResponse.text('No disponible.', { status: 400 })),
    )
    await iniciarComo('alumno.lopez')
    renderApp('/mis-evaluaciones')
    expect(await screen.findByText('No se pudieron cargar las sub fases.')).toBeInTheDocument()
    expect(screen.getByLabelText('Sub fase')).toBeInTheDocument()
    expect(codigos(await tablaCargada())).toEqual(['111111-1'])
  })
})

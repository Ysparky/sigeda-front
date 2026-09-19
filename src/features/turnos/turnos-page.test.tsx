import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function tablaDeTurnos() {
  await screen.findByText(/^Página \d+ de \d+/)
  return within(screen.getByRole('table', { name: 'Turnos programados' }))
}

function nombresEnTabla(tabla: ReturnType<typeof within>) {
  return tabla
    .getAllByRole('row')
    .slice(1)
    .map((fila: HTMLElement) => within(fila).getAllByRole('cell')[0]?.textContent)
}

describe('Programación de turnos', () => {
  it('CA-TUR-01 muestra nombre, sub fase, programa, fecha, cantidad de alumnos y de maniobras', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos')
    const tabla = await tablaDeTurnos()
    expect(tabla.getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual([
      'Nombre',
      'Sub fase',
      'Programa',
      'Fecha de evaluación',
      'Alumnos',
      'Maniobras',
    ])
    const fila = tabla.getByRole('link', { name: 'Navegación Nocturna' }).closest('tr')
    expect(fila).not.toBeNull()
    expect(within(fila as HTMLElement).getAllByRole('cell').map((celda) => celda.textContent)).toEqual([
      'Navegación Nocturna',
      'Navegación',
      'PDI',
      expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
      '2',
      '4',
    ])
    expect(tabla.getByRole('link', { name: 'Contacto Básico' })).toHaveAttribute('href', '/turnos/1')
  })

  it('CA-TUR-01 filtra por sub fase y guarda el filtro en la URL', async () => {
    await iniciarComo('jefe.operaciones')
    const { router, usuario } = renderApp('/turnos')
    await tablaDeTurnos()
    await usuario.selectOptions(await screen.findByLabelText('Sub fase'), 'Campos Extraños')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idSubfase: 4, page: 0 }))
    await waitFor(async () => expect(nombresEnTabla(await tablaDeTurnos())).toEqual(['Campos Tácticos']))
  })

  it('CA-TUR-01 aplica el rango de fechas que llega en la URL', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos?desde=2024-03-01&hasta=2024-03-15')
    await waitFor(async () =>
      expect(nombresEnTabla(await tablaDeTurnos())).toEqual(['Contacto Básico', 'Contacto Intermedio', 'Contacto Avanzado']),
    )
    expect(screen.getByLabelText('Desde')).toHaveValue('2024-03-01')
    expect(screen.getByLabelText('Hasta')).toHaveValue('2024-03-15')
  })

  it('CA-TUR-01 pagina y conserva la página en la URL', async () => {
    await iniciarComo('jefe.operaciones')
    const { router, usuario } = renderApp('/turnos?size=6')
    expect(await screen.findByText('Página 1 de 2 · 9 registros')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1, size: 6 }))
    expect(await screen.findByText('Página 2 de 2 · 9 registros')).toBeInTheDocument()
  })

  it('ordena por fecha de evaluación en el servidor', async () => {
    await iniciarComo('jefe.operaciones')
    const { router, usuario } = renderApp('/turnos')
    await tablaDeTurnos()
    await usuario.click(screen.getByRole('button', { name: /Fecha de evaluación/ }))
    await usuario.click(screen.getByRole('button', { name: /Fecha de evaluación/ }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ property: 'fechaEval', direction: 'DESC' }))
    await waitFor(async () => expect(nombresEnTabla(await tablaDeTurnos())[0]).toBe('Navegación Nocturna'))
  })

  it('solo quien programa turnos ve la acción de registrar', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/turnos')
    await tablaDeTurnos()
    expect(screen.queryByRole('link', { name: 'Registrar turno' })).not.toBeInTheDocument()
  })

  it('si no cargan las sub fases lo indica bajo el filtro y conserva la lista', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/subfases`, () => HttpResponse.text('No disponible.', { status: 400 })),
    )
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos')
    expect(await screen.findByText('No se pudieron cargar las sub fases.')).toBeInTheDocument()
    expect(screen.getByLabelText('Sub fase')).toBeInTheDocument()
    expect(nombresEnTabla(await tablaDeTurnos())).toContain('Navegación Nocturna')
  })

  it('conserva la lista si falla una recarga en segundo plano', async () => {
    await iniciarComo('jefe.operaciones')
    const { queryClient } = renderApp('/turnos')
    await tablaDeTurnos()
    server.use(
      http.get(`${config.sigedaApiUrl}/api/turnos`, () => HttpResponse.text('No se pudo recargar.', { status: 400 })),
    )
    await queryClient.invalidateQueries()
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(screen.queryByText('No se pudo recargar.')).not.toBeInTheDocument()
    expect(nombresEnTabla(await tablaDeTurnos())).toContain('Navegación Nocturna')
  })
})

describe('Mis turnos', () => {
  it('CA-TUR-14 el alumno ve solo sus propios turnos', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/mis-turnos')
    await screen.findByText(/^Página \d+ de \d+/)
    const tabla = within(screen.getByRole('table', { name: 'Mis turnos' }))
    expect(nombresEnTabla(tabla)).toEqual(['Contacto Básico', 'Navegación Nocturna'])
  })

  it('si no cargan sus turnos lo indica y permite reintentar', async () => {
    let fallas = 1
    server.use(
      http.get(`${config.sigedaApiUrl}/api/turnos/alumno`, () => {
        if (fallas-- > 0) return HttpResponse.text('No se pudo listar sus turnos.', { status: 400 })
        return undefined
      }),
    )
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp('/mis-turnos')
    expect(await screen.findByText('No se pudo listar sus turnos.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Mis turnos' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByText(/^Página \d+ de \d+/)
    expect(nombresEnTabla(within(screen.getByRole('table', { name: 'Mis turnos' })))).toEqual([
      'Contacto Básico',
      'Navegación Nocturna',
    ])
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirTurno(username: string, id: number) {
  await iniciarComo(username)
  const vista = renderApp(`/turnos/${id}`)
  await screen.findByRole('heading', { name: 'Alumnos y ciclo de la misión' })
  return vista
}

function etapas(alumno: string) {
  const tarjeta = screen.getByRole('region', { name: alumno })
  return within(within(tarjeta).getByRole('list', { name: 'Ciclo de la misión' }))
    .getAllByRole('listitem')
    .map((etapa) => etapa.textContent)
}

describe('Detalle de turno', () => {
  it('CA-TUR-10 muestra los datos, los alumnos con horario y las maniobras con nota mínima', async () => {
    await abrirTurno('jefe.operaciones', 8)
    expect(screen.getByRole('heading', { level: 1, name: 'Navegación Nocturna' })).toBeInTheDocument()
    expect(screen.getByText('Juan Torres')).toBeInTheDocument()
    expect(screen.getByText('Robinson R22')).toBeInTheDocument()
    const oscar = screen.getByRole('region', { name: 'Oscar Lopez' })
    expect(within(oscar).getAllByText('09:00 – 10:30').length).toBeGreaterThan(0)
    const maniobras = within(screen.getByRole('table', { name: 'Maniobras del turno' }))
    expect(maniobras.getAllByRole('row').slice(1).map((fila) => fila.textContent)).toEqual([
      'Maniobra 1R (Regular)',
      'Maniobra 2B (Bueno)',
      'Maniobra 3E (Excelente)',
      'Maniobra 4I (Insuficiente)',
    ])
  })

  it('CA-TUR-10 muestra la línea de tiempo de la misión por alumno', async () => {
    await abrirTurno('jefe.operaciones', 8)
    await waitFor(() =>
      expect(etapas('Ana Torres')).toEqual([
        'Briefing diarioT−2 h · 09:00Pendiente',
        'Briefing de detalleT−1 h · 10:00Pendiente',
        'Vuelo11:00 – 12:30Pendiente',
        'DebriefingEvaluación pendientePendiente',
      ]),
    )
  })

  it('CA-TUR-10 el debriefing figura como hecho cuando la evaluación existe', async () => {
    await abrirTurno('jefe.operaciones', 3)
    await waitFor(() =>
      expect(etapas('Pedro Rodriguez')).toEqual([
        'Briefing diarioT−2 h · 11:00Completada',
        'Briefing de detalleT−1 h · 12:00Completada',
        'Vuelo13:00 – 14:30Completada',
        'DebriefingEvaluación registradaCompletada',
      ]),
    )
    expect(screen.getByRole('link', { name: 'Ver evaluación 555555-3' })).toHaveAttribute('href', '/evaluaciones/555555-3')
  })

  it('CA-TUR-11 con la fecha vencida no permite modificar ni eliminar y explica el motivo', async () => {
    await abrirTurno('jefe.operaciones', 1)
    expect(screen.getByRole('button', { name: 'Modificar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText('El turno ya no se puede modificar porque su fecha pasó.')).toBeInTheDocument()
  })

  it('CA-TUR-11 eliminar pide confirmación y vuelve a la programación', async () => {
    const { usuario, router } = await abrirTurno('jefe.operaciones', 8)
    expect(screen.getByRole('link', { name: 'Modificar' })).toHaveAttribute('href', '/turnos/8/editar')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Se eliminará «Navegación Nocturna»')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Turno eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/turnos'))
  })

  it('M1-2 muestra el mensaje del backend cuando rechaza la eliminación', async () => {
    server.use(
      http.delete(`${config.sigedaApiUrl}/api/turnos/:id`, () =>
        HttpResponse.json(
          { status: 410, error: 'Fecha de modificación expiró', message: 'No se puede modificar. El turno ya ha sido evaluado.' },
          { status: 410 },
        ),
      ),
    )
    const { usuario } = await abrirTurno('jefe.operaciones', 8)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('No se puede modificar. El turno ya ha sido evaluado.')).toBeInTheDocument()
  })

  it('solo quien programa turnos ve modificar y eliminar', async () => {
    await abrirTurno('instructor.perez', 8)
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByText('El turno ya no se puede modificar porque su fecha pasó.')).not.toBeInTheDocument()
  })

  it('CA-EVA-02 el instructor asignado ve registrar evaluación para el alumno aún no evaluado', async () => {
    await abrirTurno('instructor.perez', 2)
    expect(await screen.findByRole('link', { name: 'Registrar evaluación' })).toHaveAttribute(
      'href',
      '/turnos/2/evaluar/222222',
    )
  })

  it('CA-EVA-02 otro instructor no ve la acción', async () => {
    await abrirTurno('instructor.mendoza', 2)
    await screen.findByRole('link', { name: 'Hoja de briefing' })
    expect(screen.queryByRole('link', { name: 'Registrar evaluación' })).not.toBeInTheDocument()
  })

  it('CA-EVA-02 una vez registrada la evaluación ya no se ofrece registrarla', async () => {
    await abrirTurno('instructor.perez', 1)
    expect(await screen.findByRole('link', { name: 'Ver evaluación 111111-1' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar evaluación' })).not.toBeInTheDocument()
  })

  it('CA-TUR-14 el alumno no puede abrir un turno que no es suyo', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos/2')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-TUR-14 el alumno abre sus propios turnos', async () => {
    await abrirTurno('alumno.lopez', 1)
    expect(screen.getByRole('heading', { level: 1, name: 'Control Básico Inicial' })).toBeInTheDocument()
  })

  it('CA-TUR-14 en un turno compartido el alumno ve solo su propio vuelo', async () => {
    const consultados: string[] = []
    server.use(
      http.get(`${config.sigedaApiUrl}/api/evaluaciones/persona/:cod`, ({ params }) => {
        consultados.push(String(params.cod))
        return undefined
      }),
    )
    const { queryClient } = await abrirTurno('alumno.lopez', 8)
    expect(screen.getByRole('region', { name: 'Oscar Lopez' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Ana Torres' })).not.toBeInTheDocument()
    expect(screen.queryByText('Ana Torres')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Hoja de briefing' })).toHaveLength(1)
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(consultados).toEqual(['111111'])
  })

  it('si no carga la evaluación de un alumno lo indica en vez de darla por pendiente', async () => {
    let fallas = 1
    server.use(
      http.get(`${config.sigedaApiUrl}/api/evaluaciones/persona/:cod`, () => {
        if (fallas-- > 0) return HttpResponse.text('No se pudo consultar la evaluación.', { status: 400 })
        return undefined
      }),
    )
    const { usuario } = await abrirTurno('instructor.perez', 2)
    const tarjeta = within(screen.getByRole('region', { name: 'Juan Falconi' }))
    expect(await tarjeta.findByText('No se pudo cargar la evaluación de este alumno')).toBeInTheDocument()
    expect(tarjeta.getByText('No se pudo consultar la evaluación.')).toBeInTheDocument()
    expect(tarjeta.queryByText('Evaluación pendiente')).not.toBeInTheDocument()
    expect(tarjeta.queryByText('Pendiente')).not.toBeInTheDocument()
    expect(tarjeta.getByRole('link', { name: 'Hoja de briefing' })).toBeInTheDocument()
    await usuario.click(tarjeta.getByRole('button', { name: 'Reintentar' }))
    expect(await tarjeta.findByRole('link', { name: 'Registrar evaluación' })).toHaveAttribute('href', '/turnos/2/evaluar/222222')
    expect(tarjeta.getByText('Evaluación pendiente')).toBeInTheDocument()
    expect(tarjeta.queryByText('No se pudo cargar la evaluación de este alumno')).not.toBeInTheDocument()
  })

  it('al reintentar no muestra el ciclo de la misión mientras la evaluación vuelve a cargar', async () => {
    let intentos = 0
    server.use(
      http.get(`${config.sigedaApiUrl}/api/evaluaciones/persona/:cod`, async () => {
        intentos += 1
        if (intentos > 1) await delay('infinite')
        return HttpResponse.text('No se pudo consultar la evaluación.', { status: 400 })
      }),
    )
    const { usuario } = await abrirTurno('instructor.perez', 2)
    const tarjeta = within(screen.getByRole('region', { name: 'Juan Falconi' }))
    expect(await tarjeta.findByText('No se pudo cargar la evaluación de este alumno')).toBeInTheDocument()
    await usuario.click(tarjeta.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() =>
      expect(tarjeta.queryByText('No se pudo cargar la evaluación de este alumno')).not.toBeInTheDocument(),
    )
    expect(tarjeta.queryByRole('list', { name: 'Ciclo de la misión' })).not.toBeInTheDocument()
    expect(tarjeta.queryByText('Evaluación pendiente')).not.toBeInTheDocument()
  })

  it('un turno inexistente muestra la página no encontrada', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/999')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})

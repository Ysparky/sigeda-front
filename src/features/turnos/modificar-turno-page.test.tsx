import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { textoBloqueadoPorSubsanacion } from '@/lib/dominio/teoria'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const MOTIVO_666666 = 'Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.'

async function abrirEdicion(id = 8) {
  await iniciarComo('jefe.operaciones')
  const vista = renderApp(`/turnos/${id}/editar`)
  await screen.findByRole('heading', { name: 'Modificar turno' })
  return vista
}

async function quitarAlumnoBloqueado(usuario: UserEvent) {
  await screen.findByText(textoBloqueadoPorSubsanacion(MOTIVO_666666))
  await usuario.click(screen.getByRole('button', { name: 'Quitar alumno 2' }))
}

describe('Modificar turno', () => {
  it('CA-TUR-12 carga los datos actuales del turno', async () => {
    await abrirEdicion()
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Navegación Nocturna')
    expect(screen.getByLabelText('Programa')).toBeDisabled()
    expect(screen.getByLabelText('Sub fase')).toHaveValue('2')
    expect(screen.getByLabelText('Sub fase')).toBeDisabled()
    expect(screen.getByLabelText('Instructor')).toHaveValue('444444')
    expect(screen.getByLabelText('Aeronave')).toHaveValue('1')
    expect(screen.getByLabelText('Alumno 1')).toHaveValue('111111')
    expect(screen.getByLabelText('Inicio 1')).toHaveValue('09:00')
    expect(screen.getByLabelText('Alumno 2')).toHaveValue('666666')
    expect(screen.getByLabelText('Maniobra 3')).toHaveValue('3')
    expect(screen.getByLabelText('Nota mínima 3')).toHaveValue('E')
  })

  // Dependencia 62, y es una limitación del servidor, no una decisión de la pantalla:
  // `GET /api/turnos/{id}` no publica `idMision` —comprobado con curl contra el 8080—, así que el
  // formulario no tiene de dónde leer la misión que el turno ya tenía. El selector arranca vacío y lo
  // DICE, porque el `PUT` escribe el campo tal cual llega y guardar así borra la asignación.
  it('dependencia 62 el selector de misión arranca vacío al modificar y avisa que guardar así la borra', async () => {
    await abrirEdicion()
    const mision = await screen.findByLabelText('Misión del PDI')
    expect(mision).toHaveValue('')
    expect(mision).toBeEnabled()
    expect(
      screen.getByText(
        'El servidor no informa la misión que el turno ya tenía: si la deja sin asignar, la asignación anterior se borra al guardar.',
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('option', { name: 'N/I-7 · 1 h · coef. 0.1000' })).toBeInTheDocument())
  })

  it('recupera la sub fase por su nombre si el detalle no trae el idSubfase', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/turnos/8`, () =>
        HttpResponse.json({
          id: 8,
          nombre: 'Navegación Nocturna',
          subfase: 'Circuitos y Maniobras',
          fechaEval: sumarDias(hoyIso(), 7),
          programa: 'PDI',
          fase: 'Adaptación',
          codInstructor: '444444',
          instructor: 'Juan Torres',
          aeronave: { id: 1, nombre: 'Robinson R22', estado: 'Disponible' },
          alumnosTurno: [{ codAlumno: '111111', alumno: 'Oscar Lopez', horaInicio: '09:00', horaFin: '10:30' }],
          maniobrasTurno: [{ nota_min: 'R', maniobra: { id: 1, nombre: 'Ingreso al circuito de tránsito', descripcion: '' } }],
        }),
      ),
    )
    await abrirEdicion()
    expect(await screen.findByLabelText('Sub fase')).toHaveValue('2')
    expect(screen.getByLabelText('Maniobra 1')).toHaveValue('1')
  })

  it('CA-TUR-12 aplica las mismas validaciones que registrar', async () => {
    const { usuario } = await abrirEdicion()
    await quitarAlumnoBloqueado(usuario)
    await usuario.clear(await screen.findByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await usuario.clear(screen.getByLabelText('Fecha de evaluación'))
    await usuario.type(screen.getByLabelText('Fecha de evaluación'), hoyIso())
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('Nombre debe tener de 10 a 30 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('La fecha del turno debe ser posterior a hoy.')).toBeInTheDocument()
  })

  it('CA-TUR-12 guarda los cambios sin advertir cruces con su propio horario', async () => {
    const { usuario, router } = await abrirEdicion()
    await quitarAlumnoBloqueado(usuario)
    await usuario.clear(await screen.findByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Navegación Nocturna II')
    expect(screen.queryByText('Horario superpuesto en la aeronave')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('Turno guardado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/turnos/8'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Navegación Nocturna II' })).toBeInTheDocument()
  })

  it('CA-TUR-11 un turno con fecha vencida no se puede modificar y se explica el motivo', async () => {
    await abrirEdicion(1)
    expect(screen.getByText('El turno ya no se puede modificar porque su fecha pasó.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('M1-2 muestra el mensaje del backend si rechaza el cambio por la fecha', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/turnos/:id`, () =>
        HttpResponse.json(
          { status: 410, error: 'Fecha de modificación expiró', message: 'No se puede modificar. El turno ya ha sido evaluado.' },
          { status: 410 },
        ),
      ),
    )
    const { usuario } = await abrirEdicion()
    await screen.findByLabelText('Nombre')
    await quitarAlumnoBloqueado(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('No se puede modificar. El turno ya ha sido evaluado.')).toBeInTheDocument()
  })

  it('CA-TUR-12 si no cargan los catálogos muestra el error en vez del formulario', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/aeronaves`, () =>
        HttpResponse.text('Catálogo no disponible.', { status: 400 }),
      ),
    )
    await abrirEdicion()
    expect(await screen.findByText('No se pudieron cargar los datos del formulario')).toBeInTheDocument()
    expect(screen.getByText('Catálogo no disponible.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('conserva el formulario si falla la recarga de un catálogo', async () => {
    const { usuario, queryClient } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Navegación Nocturna II')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/aeronaves`, () =>
        HttpResponse.text('Catálogo no disponible.', { status: 400 }),
      ),
    )
    await queryClient.invalidateQueries()
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(screen.getByLabelText('Nombre')).toHaveValue('Navegación Nocturna II')
    expect(screen.getByLabelText('Aeronave')).toHaveValue('1')
    expect(screen.queryByText('No se pudieron cargar los datos del formulario')).not.toBeInTheDocument()
    expect(screen.queryByText('No se pudieron cargar las aeronaves.')).not.toBeInTheDocument()
  })

  it('si no cargan los catálogos permite reintentar', async () => {
    let fallas = 1
    server.use(
      http.get(`${config.sigedaApiUrl}/api/aeronaves`, () => {
        if (fallas-- > 0) return HttpResponse.text('Catálogo no disponible.', { status: 400 })
        return undefined
      }),
    )
    const { usuario } = await abrirEdicion()
    await screen.findByText('No se pudieron cargar los datos del formulario')
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Navegación Nocturna')
  })
})

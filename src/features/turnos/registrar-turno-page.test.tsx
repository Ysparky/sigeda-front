import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const EN_UNA_SEMANA = sumarDias(hoyIso(), 7)
const EN_DIEZ_DIAS = sumarDias(hoyIso(), 10)

async function abrirFormulario() {
  await iniciarComo('jefe.operaciones')
  const vista = renderApp('/turnos/nuevo')
  await screen.findByRole('heading', { name: 'Registrar turno' })
  await screen.findByRole('option', { name: 'Robinson R22' })
  await screen.findByRole('option', { name: 'Navegación' })
  return vista
}

async function llenarDatos(usuario: UserEvent, fecha = EN_DIEZ_DIAS) {
  await usuario.type(screen.getByLabelText('Nombre'), 'Navegación Diurna')
  await usuario.type(screen.getByLabelText('Fecha de evaluación'), fecha)
  await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
  await usuario.selectOptions(await screen.findByLabelText('Instructor'), 'Juan Torres Perez')
  await usuario.selectOptions(screen.getByLabelText('Aeronave'), 'Robinson R22')
}

async function agregarAlumno(usuario: UserEvent, numero: number, nombre: string, inicio: string, fin: string) {
  await usuario.click(screen.getByRole('button', { name: 'Agregar alumno' }))
  await usuario.selectOptions(await screen.findByLabelText(`Alumno ${numero}`), nombre)
  await usuario.type(screen.getByLabelText(`Inicio ${numero}`), inicio)
  await usuario.type(screen.getByLabelText(`Fin ${numero}`), fin)
}

async function agregarManiobra(usuario: UserEvent, numero: number, nombre: string, nota: string) {
  await usuario.click(screen.getByRole('button', { name: 'Agregar maniobra' }))
  await usuario.selectOptions(await screen.findByLabelText(`Maniobra ${numero}`), nombre)
  await usuario.selectOptions(screen.getByLabelText(`Nota mínima ${numero}`), nota)
}

function guardar(usuario: UserEvent) {
  return usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
}

describe('Registrar turno', () => {
  it('CA-TUR-04 y CA-TUR-09 exigen alumnos, maniobras, instructor y aeronave', async () => {
    const { usuario } = await abrirFormulario()
    await guardar(usuario)
    expect(await screen.findByText('La asignación de alumnos es requerida')).toBeInTheDocument()
    expect(screen.getByText('La asignación de maniobras es requerida')).toBeInTheDocument()
    expect(screen.getByText('Instructor debe ser asignado.')).toBeInTheDocument()
    expect(screen.getByText('La asignación de aeronave es requerida.')).toBeInTheDocument()
    expect(screen.getByText('La subfase es requerida.')).toBeInTheDocument()
  })

  it('CA-TUR-03 rechaza nombres de solo espacios o fuera de 10 a 30 caracteres', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), '            ')
    await guardar(usuario)
    expect(await screen.findByText('Ingrese el nombre del turno.')).toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await guardar(usuario)
    expect(await screen.findByText('Nombre debe tener de 10 a 30 caracteres.')).toBeInTheDocument()
  })

  it('CA-TUR-02 la fecha de evaluación debe ser posterior a hoy', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Fecha de evaluación'), hoyIso())
    await guardar(usuario)
    expect(await screen.findByText('La fecha del turno debe ser posterior a hoy.')).toBeInTheDocument()
  })

  it('CA-TUR-08 las aeronaves que no están disponibles no se pueden elegir', async () => {
    await abrirFormulario()
    expect(screen.getByRole('option', { name: 'Robinson R22' })).toBeEnabled()
    expect(screen.getByRole('option', { name: 'Enstrom 280FX · En mantenimiento' })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Schweizer S-300C · No disponible' })).toBeDisabled()
  })

  it('CA-TUR-05 ofrece solo las maniobras de la sub fase elegida', async () => {
    const { usuario } = await abrirFormulario()
    expect(screen.getByRole('button', { name: 'Agregar maniobra' })).toBeDisabled()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Campos Extraños')
    await usuario.click(screen.getByRole('button', { name: 'Agregar maniobra' }))
    const selector = await screen.findByLabelText('Maniobra 1')
    await waitFor(() =>
      expect(within(selector).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
        'Elija una maniobra',
        'Maniobra 7',
        'Maniobra 8',
      ]),
    )
  })

  it('CA-TUR-05 cambiar la sub fase pide confirmación y limpia las maniobras', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
    await agregarManiobra(usuario, 1, 'Maniobra 2', 'B')
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Instrumentos')
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Cambiar la sub fase?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Conservar sub fase' }))
    expect(screen.getByLabelText('Sub fase')).toHaveValue('2')
    expect(screen.getByLabelText('Maniobra 1')).toHaveValue('2')
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Instrumentos')
    await usuario.click(await screen.findByRole('button', { name: 'Cambiar y quitar maniobras' }))
    await waitFor(() => expect(screen.getByLabelText('Sub fase')).toHaveValue('3'))
    expect(screen.queryByLabelText('Maniobra 1')).not.toBeInTheDocument()
  })

  it('CA-TUR-06 la nota mínima solo ofrece D, I, R, B o E', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
    await usuario.click(screen.getByRole('button', { name: 'Agregar maniobra' }))
    const notas = within(await screen.findByLabelText('Nota mínima 1')).getAllByRole('option')
    expect(notas.map((opcion) => opcion.textContent)).toEqual(['—', 'D', 'I', 'R', 'B', 'E'])
  })

  it('CA-TUR-07 exige que la hora de fin sea posterior a la de inicio', async () => {
    const { usuario } = await abrirFormulario()
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '10:00', '09:00')
    await guardar(usuario)
    expect(await screen.findByText('La hora de fin debe ser posterior a la de inicio.')).toBeInTheDocument()
  })

  it('CA-TUR-04 no permite repetir un alumno', async () => {
    const { usuario } = await abrirFormulario()
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:00')
    await agregarAlumno(usuario, 2, 'Juan Falconi Fernandez', '10:00', '11:00')
    await guardar(usuario)
    expect(await screen.findByText('El alumno está repetido.')).toBeInTheDocument()
  })

  it('registra el turno y abre su detalle', async () => {
    const { usuario, router } = await abrirFormulario()
    await llenarDatos(usuario)
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:30')
    await agregarManiobra(usuario, 1, 'Maniobra 1', 'B')
    await guardar(usuario)
    expect(await screen.findByText('Turno guardado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/turnos/10'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Navegación Diurna' })).toBeInTheDocument()
  })

  it('CA-TUR-07 advierte el cruce con otro turno de la aeronave antes de guardar', async () => {
    const { usuario } = await abrirFormulario()
    await llenarDatos(usuario, EN_UNA_SEMANA)
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:30')
    await agregarManiobra(usuario, 1, 'Maniobra 1', 'B')
    const aviso = await screen.findByText('Horario superpuesto en la aeronave')
    expect(aviso.parentElement).toHaveTextContent('se cruza con «Instrumentos Básicos» (07:30–08:30)')
    expect(aviso.parentElement).toHaveTextContent('se cruza con «Navegación Nocturna» (09:00–12:30)')
    await guardar(usuario)
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Guardar con horarios superpuestos?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar de todos modos' }))
    expect(
      await screen.findByText('El alumno 222222 tiene un horario que se cruza con otro turno de la aeronave.'),
    ).toBeInTheDocument()
  })

  it('si no carga un catálogo lo indica bajo su campo y conserva el formulario', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/instructor/:tipo`, () =>
        HttpResponse.text('No disponible.', { status: 400 }),
      ),
      http.get(`${config.sigedaApiUrl}/api/maniobras/subfase/:id`, () =>
        HttpResponse.text('No disponible.', { status: 400 }),
      ),
      http.get(`${config.sigedaApiUrl}/api/alumnos/programa/:nombre`, () =>
        HttpResponse.text('No disponible.', { status: 400 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Navegación Diurna')
    const instructor = screen.getByLabelText('Instructor').closest('[data-slot="field"]') as HTMLElement
    expect(await within(instructor).findByText('No se pudieron cargar los instructores.')).toBeInTheDocument()
    expect(await screen.findByText('No se pudieron cargar los alumnos.')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
    expect(await screen.findByText('No se pudieron cargar las maniobras.')).toBeInTheDocument()
    expect(screen.queryByText('No se pudieron cargar las aeronaves.')).not.toBeInTheDocument()
    expect(screen.queryByText('No se pudieron cargar las sub fases.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Navegación Diurna')
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeInTheDocument()
  })

  it('si no cargan las aeronaves ni las sub fases lo indica bajo cada campo', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/aeronaves`, () => HttpResponse.text('No disponible.', { status: 400 })),
      http.get(`${config.sigedaApiUrl}/api/subfases`, () => HttpResponse.text('No disponible.', { status: 400 })),
    )
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/nuevo')
    const aeronave = (await screen.findByLabelText('Aeronave')).closest('[data-slot="field"]') as HTMLElement
    const subfase = screen.getByLabelText('Sub fase').closest('[data-slot="field"]') as HTMLElement
    expect(await within(aeronave).findByText('No se pudieron cargar las aeronaves.')).toBeInTheDocument()
    expect(await within(subfase).findByText('No se pudieron cargar las sub fases.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })

  it('CA-TUR-13 muestra bajo cada campo los errores de validación del backend', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/turnos`, () =>
        HttpResponse.json(
          {
            status: 400,
            error: 'Error al validar el modelo',
            message: null,
            messages: [
              "'nombre': Nombre debe tener de 10 a 30 caracteres.",
              "'alumnosTurno[0].horaInicio': La hora debe estar en formato HH:mm (09:00, 14:00)",
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirFormulario()
    await llenarDatos(usuario)
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:30')
    await agregarManiobra(usuario, 1, 'Maniobra 1', 'B')
    await guardar(usuario)
    expect(await screen.findByText('Revise los campos marcados.')).toBeInTheDocument()
    expect(screen.getByText('Nombre debe tener de 10 a 30 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('La hora debe estar en formato HH:mm (09:00, 14:00)')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true')
  })
})

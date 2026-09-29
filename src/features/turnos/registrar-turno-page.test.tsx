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
  await screen.findByRole('option', { name: 'Circuitos y Maniobras' })
  return vista
}

async function llenarDatos(usuario: UserEvent, fecha = EN_DIEZ_DIAS) {
  await usuario.type(screen.getByLabelText('Nombre'), 'Navegación Diurna')
  await usuario.type(screen.getByLabelText('Fecha de evaluación'), fecha)
  await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Circuitos y Maniobras')
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
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación Local')
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
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Circuitos y Maniobras')
    await agregarManiobra(usuario, 1, 'Maniobra 2', 'B')
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Control Preciso')
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Cambiar la sub fase?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Conservar sub fase' }))
    expect(screen.getByLabelText('Sub fase')).toHaveValue('2')
    expect(screen.getByLabelText('Maniobra 1')).toHaveValue('2')
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Control Preciso')
    await usuario.click(await screen.findByRole('button', { name: 'Cambiar y quitar maniobras' }))
    await waitFor(() => expect(screen.getByLabelText('Sub fase')).toHaveValue('3'))
    expect(screen.queryByLabelText('Maniobra 1')).not.toBeInTheDocument()
  })

  // Dependencia 62. Sin este selector el `idMision` del turno no se puede asignar desde ninguna
  // pantalla, y sin misión asignada el servidor calcula la nota de sub fase como promedio simple.
  it('dependencia 62 ofrece las misiones de la sub fase elegida, con su código, sus horas y su coeficiente', async () => {
    const { usuario } = await abrirFormulario()
    expect(screen.getByLabelText('Misión del PDI')).toBeDisabled()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Circuitos y Maniobras')
    const selector = screen.getByLabelText('Misión del PDI')
    await waitFor(() => expect(within(selector).getAllByRole('option')).toHaveLength(8))
    expect(within(selector).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Sin misión asignada',
      'N/I-1 · 1.5 h · coef. 0.1500',
      'N/I-2 · 1.5 h · coef. 0.1500',
      'N/I-3 · 1.5 h · coef. 0.1500',
      'N/I-4 · 1.5 h · coef. 0.1500',
      'N/I-5 · 1.5 h · coef. 0.1500',
      'N/I-6 · 1.5 h · coef. 0.1500',
      'N/I-7 · 1 h · coef. 0.1000',
    ])
    expect(selector).toHaveValue('')
  })

  it('dependencia 62 cambiar la sub fase descarta la misión elegida, que era de la otra', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Circuitos y Maniobras')
    await waitFor(() => expect(within(screen.getByLabelText('Misión del PDI')).getAllByRole('option')).toHaveLength(8))
    await usuario.selectOptions(screen.getByLabelText('Misión del PDI'), 'N/I-3 · 1.5 h · coef. 0.1500')
    expect(screen.getByLabelText('Misión del PDI')).toHaveValue('10')
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Control Básico')
    await waitFor(() => expect(screen.getByLabelText('Misión del PDI')).toHaveValue(''))
  })

  it('dependencia 62 guarda la misión elegida en el cuerpo del turno', async () => {
    let recibido: Record<string, unknown> | null = null
    server.use(
      http.post(`${config.sigedaApiUrl}/api/turnos`, async ({ request }) => {
        recibido = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ mensaje: 'Turno guardado con éxito.', turno: { id: 10 } }, { status: 201 })
      }),
    )
    const { usuario } = await abrirFormulario()
    await llenarDatos(usuario)
    await waitFor(() => expect(within(screen.getByLabelText('Misión del PDI')).getAllByRole('option')).toHaveLength(8))
    await usuario.selectOptions(screen.getByLabelText('Misión del PDI'), 'N/I-7 · 1 h · coef. 0.1000')
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:30')
    await agregarManiobra(usuario, 1, 'Maniobra 1', 'B')
    await guardar(usuario)
    await waitFor(() => expect(recibido).not.toBeNull())
    expect(recibido).toMatchObject({ idSubfase: 2, idMision: 14 })
  })

  it('CA-TUR-06 la nota mínima solo ofrece D, I, R, B o E', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Circuitos y Maniobras')
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
    // El solape de AERONAVE avisa y deja guardar (decisión M1-10), así que confirmar guarda de
    // verdad. Antes esta prueba esperaba un 400 del servidor, porque el mock rechazaba el solape
    // de aeronave: era más estricto que su propia decisión documentada y que el servidor real.
    // El rechazo con 400 es para el solape del ALUMNO, y lo cubre `api.test.ts`.
    expect(await screen.findByText('Turno guardado con éxito.')).toBeInTheDocument()
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
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Circuitos y Maniobras')
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

  it('M5-23 el rechazo del servidor por subsanación se pinta en el selector de esa fila', async () => {
    // Con la dependencia 7 resuelta la interfaz ya deshabilita Guardar (lo fija
    // `subsanacion-turno.test.tsx`), así que el 400 de la dependencia 57 solo se alcanza cuando el
    // frontend NO sabe del bloqueo: dependencia 7 pendiente, o el bloqueo aparece entre la carga y
    // el guardado. Se simula ese desconocimiento con el estado teórico en falso; el 400 es el real
    // del mock. Lo que se fija es que el mensaje CAIGA en el campo de la fila: un error de campo sin
    // campo es un 400 en blanco.
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/666666/estado-teorico`, () =>
        HttpResponse.json({ bloqueadoPorSubsanacion: false, motivo: null, desaprobados: [], pendientes: [] }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await llenarDatos(usuario)
    await agregarAlumno(usuario, 1, 'Ana Torres Martinez', '08:00', '09:30')
    await agregarManiobra(usuario, 1, 'Maniobra 1', 'B')
    await guardar(usuario)
    const fila = (await screen.findByLabelText('Alumno 1')).closest('[data-slot="field"]') as HTMLElement
    expect(
      await within(fila).findByText(
        'El alumno 666666 tiene una subsanación pendiente y no puede programarse en un turno práctico.',
      ),
    ).toBeInTheDocument()
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

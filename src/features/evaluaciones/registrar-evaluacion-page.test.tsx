import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(username: string, ruta: string) {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('heading', { name: 'Registrar evaluación' })
  return vista
}

async function abrirFormulario(username = 'instructor.perez', ruta = '/turnos/2/evaluar/222222') {
  const vista = await abrir(username, ruta)
  await screen.findByRole('heading', { name: 'Calificación por maniobra' })
  return vista
}

function maniobra(nombre: string) {
  return within(screen.getByRole('group', { name: new RegExp(`^${nombre}`) }))
}

async function calificar(usuario: UserEvent, nombre: string, nota: string) {
  await usuario.click(maniobra(nombre).getByRole('radio', { name: new RegExp(`^${nota} \\(`) }))
}

async function calificarTodasConB(usuario: UserEvent) {
  for (const numero of [1, 2, 3, 4, 5, 6]) await calificar(usuario, `Maniobra ${numero}`, 'B')
}

describe('Registrar evaluación', () => {
  it('CA-EVA-02 solo el instructor asignado al turno puede registrarla', async () => {
    await abrir('instructor.mendoza', '/turnos/2/evaluar/222222')
    expect(
      screen.getByText('Solo el instructor asignado al turno puede registrar esta evaluación.'),
    ).toBeInTheDocument()
  })

  it('CA-EVA-02 una vez por alumno y turno', async () => {
    await abrir('instructor.perez', '/turnos/1/evaluar/111111')
    expect(await screen.findByText('La evaluación ya ha sido registrada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver evaluación 111111-1' })).toHaveAttribute('href', '/evaluaciones/111111-1')
  })

  it('CA-EVA-03 pide nombre, categoría, recomendación, enlace y una calificación por maniobra', async () => {
    await abrirFormulario()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoría')).toBeInTheDocument()
    expect(screen.getByLabelText('Recomendación general')).toBeInTheDocument()
    expect(screen.getByLabelText('Enlace a material de respaldo')).toBeInTheDocument()
    expect(screen.getAllByRole('radiogroup')).toHaveLength(6)
  })

  it('CA-EVA-11 ofrece las categorías sugeridas por el estado del alumno', async () => {
    const { usuario } = await abrirFormulario()
    const opciones = within(screen.getByLabelText('Categoría')).getAllByRole('option')
    expect(opciones.map((opcion) => opcion.textContent)).toEqual([
      'Elija una categoría',
      'Ponderada',
      'Chequeo Sub Fase',
      'Complementación',
    ])
    expect(screen.queryByLabelText('Código del evaluador')).not.toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Complementación')
    expect(await screen.findByLabelText('Código del evaluador')).toHaveValue('444444')
  })

  it('CA-EVA-11 un alumno en chequeo solo admite Chequeo y exige el código del evaluador', async () => {
    const { usuario } = await abrirFormulario('instructor.mendoza', '/turnos/9/evaluar/777777')
    expect(within(screen.getByLabelText('Categoría')).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Elija una categoría',
      'Chequeo',
    ])
    expect(screen.getByLabelText('Categoría')).toHaveValue('Chequeo')
    await usuario.clear(screen.getByLabelText('Código del evaluador'))
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Ingrese el código de 6 dígitos del evaluador.')).toBeInTheDocument()
  })

  it('CA-EVA-11 si no cargan las categorías lo indica', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/:cod/status`, () => HttpResponse.text('No se pudo cargar el estado.', { status: 400 })),
    )
    await abrir('instructor.perez', '/turnos/2/evaluar/222222')
    expect(await screen.findByText('No se pudieron cargar los datos de la evaluación')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar evaluación' })).not.toBeInTheDocument()
  })

  it('conserva el formulario si falla una recarga en segundo plano', async () => {
    const { usuario, queryClient } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/evaluaciones/persona/:cod`, () =>
        HttpResponse.text('No se pudo recargar la evaluación.', { status: 400 }),
      ),
    )
    await queryClient.invalidateQueries()
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ponderada Contacto Medio')
    expect(screen.queryByText('No se pudieron cargar los datos de la evaluación')).not.toBeInTheDocument()
  })

  it('CA-EVA-04 solo habilita las calificaciones válidas para la nota mínima', async () => {
    await abrirFormulario('instructor.perez', '/turnos/8/evaluar/111111')
    const habilitadas = (nombre: string) =>
      maniobra(nombre)
        .getAllByRole('radio')
        .filter((opcion) => !(opcion as HTMLButtonElement).disabled)
        .map((opcion) => opcion.textContent)
    expect(habilitadas('Maniobra 1')).toEqual(['I', 'R', 'B'])
    expect(habilitadas('Maniobra 2')).toEqual(['I', 'R', 'B', 'E'])
    expect(habilitadas('Maniobra 4')).toEqual(['I', 'R'])
    expect(maniobra('Maniobra 2').getByRole('radio', { name: 'D (Demostrativo)' })).toBeDisabled()
  })

  it('CA-EVA-06 no guarda con maniobras sin calificar', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findAllByText('Califique la maniobra.')).toHaveLength(6)
  })

  it('CA-EVA-06 al guardar enfoca la primera maniobra sin calificar y la marca como inválida', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificar(usuario, 'Maniobra 1', 'B')
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    const grupo = screen.getByRole('radiogroup', { name: 'Calificación de Maniobra 2' })
    await waitFor(() => expect(grupo).toContainElement(document.activeElement as HTMLElement))
    expect(grupo).toHaveAttribute('aria-invalid', 'true')
    expect(grupo).toHaveAccessibleDescription('Califique la maniobra.')
    expect(screen.getByRole('radiogroup', { name: 'Calificación de Maniobra 1' })).toHaveAttribute('aria-invalid', 'false')
  })

  it('CA-EVA-05 una calificación bajo el estándar exige observación, causa y recomendación', async () => {
    const { usuario } = await abrirFormulario()
    await calificar(usuario, 'Maniobra 1', 'R')
    const fila = maniobra('Maniobra 1')
    expect(fila.getByText('Observación')).toHaveClass('text-tono-peligro-texto')
    expect(fila.getByText('Causa')).toHaveClass('text-tono-info-texto')
    expect(fila.getByLabelText('Recomendación')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await fila.findByText('La causa es requerida para calificaciones bajo el estándar.')).toBeInTheDocument()
    expect(fila.getByText('La observación es requerida para calificaciones bajo el estándar.')).toBeInTheDocument()
    expect(fila.getByText('La recomendación es requerida para calificaciones bajo el estándar.')).toBeInTheDocument()
  })

  it('cuenta en vivo las maniobras bajo y sobre el estándar', async () => {
    const { usuario } = await abrirFormulario()
    await calificar(usuario, 'Maniobra 1', 'R')
    await calificar(usuario, 'Maniobra 2', 'E')
    expect(screen.getByText('Bajo el estándar: 1')).toBeInTheDocument()
    expect(screen.getByText('Sobre el estándar: 1')).toBeInTheDocument()
    expect(screen.getByText('Sin calificar: 4')).toBeInTheDocument()
  })

  it('CA-EVA-07 al guardar muestra el promedio y la clasificación del backend', async () => {
    const { usuario, router } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificarTodasConB(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Evaluación guardada con éxito.')).toBeInTheDocument()
    expect(screen.getByText('Promedio: 17.00 · Clasificación: Bueno')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/evaluaciones/222222-2'))
  })

  it('CA-EVA-07 el frontend no recalcula lo que devuelve el backend', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/evaluaciones/turno/:id/persona/:cod`, () =>
        HttpResponse.json(
          { mensaje: 'Evaluación guardada con éxito.', evaluación: { codigo: '222222-2', promedio: '18.3', clasificacion: 'Excelente' } },
          { status: 201 },
        ),
      ),
    )
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificarTodasConB(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Promedio: 18.30 · Clasificación: Excelente')).toBeInTheDocument()
  })

  it('CA-EVA-13 muestra las reglas del backend con su mensaje', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/evaluaciones/turno/:id/persona/:cod`, () =>
        HttpResponse.json({ mensaje: 'El alumno debe ser apto para realizar evaluaciones ponderadas.' }, { status: 400 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificarTodasConB(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('El alumno debe ser apto para realizar evaluaciones ponderadas.')).toBeInTheDocument()
  })

  it('CA-EVA-13 ubica bajo cada maniobra los errores de campo del backend', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/evaluaciones/turno/:id/persona/:cod`, () =>
        HttpResponse.json(["'calificaciones[2].nota': Ingresar calificación de maniobra."], { status: 400 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificarTodasConB(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await maniobra('Maniobra 3').findByText('Ingresar calificación de maniobra.')).toBeInTheDocument()
  })
})

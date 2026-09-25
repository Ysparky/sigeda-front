import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import {
  TEXTO_MATERIA_SIN_PREGUNTAS,
  TEXTO_SUBSANACION_TARDIA,
  TEXTO_VENTANA_COMENZADA,
  textoPuntajeAsignado,
} from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { buscarTurnoTeorico } from '@/mocks/sigeda/datos'
import { D7_VENTANA_COMENZADA, detallePublico } from '@/mocks/sigeda/turnos-teoricos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const EN_CINCO_DIAS = sumarDias(hoyIso(), 5)

async function abrirRegistrar() {
  await iniciarComo('instructor.perez')
  const resultado = renderApp('/teoria/turnos/nuevo')
  await screen.findByLabelText('Nombre')
  await screen.findByRole('option', { name: 'Adoctrinamiento de Vuelo' })
  return resultado
}

async function llenarCabecera(usuario: UserEvent, materia = 'Límites de Operación') {
  await usuario.type(screen.getByLabelText('Nombre'), 'Quincenal Límites de Operación')
  await usuario.selectOptions(screen.getByLabelText('Materia'), materia)
  await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
  await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Quincenal')
  await usuario.type(screen.getByLabelText('Fecha del examen'), EN_CINCO_DIAS)
  await usuario.type(screen.getByLabelText('Hora de inicio'), '09:00')
  await usuario.type(screen.getByLabelText('Hora de fin'), '10:00')
}

async function agregarPregunta(usuario: UserEvent, numero: number, idPregunta: string, puntaje: string) {
  await usuario.click(screen.getByRole('button', { name: 'Agregar pregunta' }))
  await usuario.selectOptions(screen.getByLabelText(`Pregunta ${numero}`), idPregunta)
  await usuario.type(screen.getByLabelText(`Puntaje ${numero}`), puntaje)
}

describe('Registrar y modificar turno teórico', () => {
  it('CA-TUT-03 exige nombre de 10 a 60, fecha futura y ventana de al menos 10 minutos', async () => {
    const { usuario } = await abrirRegistrar()
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await usuario.type(screen.getByLabelText('Fecha del examen'), sumarDias(hoyIso(), -1))
    await usuario.type(screen.getByLabelText('Hora de inicio'), '09:00')
    await usuario.type(screen.getByLabelText('Hora de fin'), '09:05')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Límites de Operación')
    await agregarPregunta(usuario, 1, '17', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El nombre debe tener entre 10 y 60 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('El examen debe comenzar en el futuro.')).toBeInTheDocument()
    expect(screen.getByText('La ventana del examen debe durar al menos 10 minutos.')).toBeInTheDocument()
    expect(screen.getByText('El grupo es obligatorio.')).toBeInTheDocument()
  })

  it('CA-TUT-03 la hora de inicio vacía muestra el mensaje del contrato', async () => {
    const { usuario } = await abrirRegistrar()
    await usuario.type(screen.getByLabelText('Nombre'), 'Quincenal Límites de Operación')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Límites de Operación')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await usuario.type(screen.getByLabelText('Fecha del examen'), EN_CINCO_DIAS)
    await usuario.type(screen.getByLabelText('Hora de fin'), '10:00')
    await agregarPregunta(usuario, 1, '17', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('La hora de inicio es obligatoria.')).toBeInTheDocument()
  })

  it('CA-TUT-04 el programa limita los grupos y cambiarlo limpia el grupo elegido', async () => {
    const { usuario } = await abrirRegistrar()
    expect(screen.getByLabelText('Grupo')).toHaveDisplayValue('Elija un grupo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    expect(screen.getByLabelText('Grupo')).toHaveDisplayValue('Grupo 3 · 2 alumnos')
    expect(within(screen.getByLabelText('Grupo')).getAllByRole('option')).toHaveLength(4)
    await usuario.selectOptions(screen.getByLabelText('Programa'), 'PDE')
    expect(screen.getByLabelText('Grupo')).toHaveDisplayValue('Elija un grupo')
    await screen.findByRole('option', { name: 'Elija un grupo' })
    expect(within(screen.getByLabelText('Grupo')).getAllByRole('option')).toHaveLength(1)
  })

  it('CA-TUT-05 las preguntas son las de la materia, cambiarla confirma y limpia la selección', async () => {
    const { usuario } = await abrirRegistrar()
    expect(screen.getByRole('button', { name: 'Agregar pregunta' })).toBeDisabled()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Límites de Operación')
    await agregarPregunta(usuario, 1, '17', '20')
    expect(within(screen.getByLabelText('Pregunta 1')).getAllByRole('option')).toHaveLength(6)
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText('¿Cambiar la materia?')).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Conservar la materia' }))
    expect(screen.getByLabelText('Pregunta 1')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cambiar y quitar preguntas' }),
    )
    expect(screen.queryByLabelText('Pregunta 1')).not.toBeInTheDocument()
  })

  it('CA-TUT-05 una materia sin preguntas muestra E12 y no deja agregar', async () => {
    const { usuario } = await abrirRegistrar()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Meteorología')
    expect(await screen.findByText(TEXTO_MATERIA_SIN_PREGUNTAS)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar pregunta' })).toBeDisabled()
  })

  it('CA-TUT-06 CA-TUT-07 el contador E9 bloquea Guardar hasta sumar 20 y rechaza repetidas', async () => {
    const { usuario } = await abrirRegistrar()
    await llenarCabecera(usuario)
    expect(screen.getByText(textoPuntajeAsignado(0))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno teórico' })).toBeDisabled()
    await agregarPregunta(usuario, 1, '17', '12')
    expect(screen.getByText(textoPuntajeAsignado(12))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno teórico' })).toBeDisabled()
    await agregarPregunta(usuario, 2, '17', '8')
    expect(screen.getByText(textoPuntajeAsignado(20))).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('No se puede repetir una pregunta.')).toBeInTheDocument()
  })

  it('CA-TUT-06 el puntaje debe ser un entero de 1 a 20', async () => {
    const { usuario } = await abrirRegistrar()
    await llenarCabecera(usuario)
    await agregarPregunta(usuario, 1, '17', '0')
    await agregarPregunta(usuario, 2, '18', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El puntaje debe ser un entero entre 1 y 20.')).toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Puntaje 1'))
    await usuario.type(screen.getByLabelText('Puntaje 1'), '10')
    await usuario.clear(screen.getByLabelText('Puntaje 2'))
    await usuario.type(screen.getByLabelText('Puntaje 2'), '21')
    expect(await screen.findByText('El puntaje debe ser un entero entre 1 y 20.')).toBeInTheDocument()
  })

  it('CA-TUT-03 CA-TUT-07 guarda un turno válido y lleva a sus resultados', async () => {
    const { usuario, router } = await abrirRegistrar()
    await llenarCabecera(usuario)
    await agregarPregunta(usuario, 1, '17', '10')
    await agregarPregunta(usuario, 2, '18', '10')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('Turno teórico guardado con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/teoria/turnos/6')
  })

  it('CA-TUT-08 el turno de origen solo aparece en subsanación o rezagado', async () => {
    const { usuario } = await abrirRegistrar()
    expect(screen.queryByLabelText('Turno de origen')).not.toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    expect(screen.getByLabelText('Turno de origen')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    expect(await screen.findByRole('option', { name: 'Mensual Adoctrinamiento de Vuelo' })).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Rezagado')
    expect(await screen.findByRole('option', { name: 'Mensual Adoctrinamiento de Vuelo' })).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Mensual')
    expect(screen.queryByLabelText('Turno de origen')).not.toBeInTheDocument()
  })

  it('CA-TUT-08 sin turno de origen una subsanación no se guarda', async () => {
    const { usuario } = await abrirRegistrar()
    await usuario.type(screen.getByLabelText('Nombre'), 'Subsanación Adoctrinamiento')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    await usuario.type(screen.getByLabelText('Fecha del examen'), EN_CINCO_DIAS)
    await usuario.type(screen.getByLabelText('Hora de inicio'), '09:00')
    await usuario.type(screen.getByLabelText('Hora de fin'), '10:00')
    await agregarPregunta(usuario, 1, '1', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(
      await screen.findByText('El turno de origen es obligatorio para una subsanación o un rezagado.'),
    ).toBeInTheDocument()
  })

  it('CA-TUT-09 una subsanación más de un día después de su origen avisa con E11 y deja guardar', async () => {
    const { usuario, router } = await abrirRegistrar()
    await usuario.type(screen.getByLabelText('Nombre'), 'Subsanación Adoctrinamiento')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    await usuario.type(screen.getByLabelText('Fecha del examen'), EN_CINCO_DIAS)
    await usuario.type(screen.getByLabelText('Hora de inicio'), '09:00')
    await usuario.type(screen.getByLabelText('Hora de fin'), '10:00')
    await usuario.selectOptions(await screen.findByLabelText('Turno de origen'), 'Mensual Adoctrinamiento de Vuelo')
    expect(await screen.findByText(TEXTO_SUBSANACION_TARDIA)).toBeInTheDocument()
    await agregarPregunta(usuario, 1, '1', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('Turno teórico guardado con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/teoria/turnos/6')
  })

  it('CA-TUT-13 un fallo del catálogo de turnos de origen avisa bajo su selector sin bloquear el formulario', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos`, () => HttpResponse.error()))
    const { usuario } = await abrirRegistrar()
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    expect(await screen.findByText('No se pudieron cargar los turnos de origen.')).toBeInTheDocument()
    expect(screen.getByLabelText('Turno de origen')).toBeEnabled()
    expect(screen.getByLabelText('Nombre')).toBeEnabled()
  })

  it('CA-TUT-12 los errores del backend aparecen bajo su campo, con índice en las preguntas', async () => {
    server.use(
      http.post(`${API}/api/turnos-teoricos`, () =>
        HttpResponse.json(
          ["'nombre': El nombre es obligatorio", "'preguntas[1].puntajeMaximo': El puntaje debe ser un entero entre 1 y 20."],
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirRegistrar()
    await llenarCabecera(usuario)
    await agregarPregunta(usuario, 1, '17', '10')
    await agregarPregunta(usuario, 2, '18', '10')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El puntaje debe ser un entero entre 1 y 20.')).toBeInTheDocument()
  })

  it('CA-TUT-10 modificar reaplica la regla del nombre y guarda', async () => {
    await iniciarComo('instructor.perez')
    const { usuario, router } = renderApp('/teoria/turnos/4/editar')
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Quincenal Límites de Operación')
    expect(screen.getByText(textoPuntajeAsignado(20))).toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El nombre debe tener entre 10 y 60 caracteres.')).toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Quincenal Límites corregido')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('Turno teórico guardado con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/teoria/turnos/4')
  })

  it('CA-TUT-10 modificar reaplica la regla de fecha futura', async () => {
    const turnoOrigen = buscarTurnoTeorico(4)
    if (!turnoOrigen) throw new Error('El turno teórico 4 no existe en los datos de prueba')
    const detalle = {
      ...detallePublico({ ...turnoOrigen, fechaExamen: sumarDias(hoyIso(), -1) }),
      estado: 'PROGRAMADO' as const,
    }
    server.use(http.get(`${API}/api/turnos-teoricos/4`, () => HttpResponse.json(detalle)))
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/teoria/turnos/4/editar')
    await screen.findByLabelText('Nombre')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El examen debe comenzar en el futuro.')).toBeInTheDocument()
  })

  it('CA-TUT-10 un turno cuya ventana comenzó no ofrece el formulario y muestra E10', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/teoria/turnos/1/editar')
    expect(await screen.findByText(TEXTO_VENTANA_COMENZADA)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver los resultados' })).toHaveAttribute('href', '/teoria/turnos/1')
  })

  it('CA-TUT-10 un intento por URL que el servidor rechaza muestra D7', async () => {
    server.use(
      http.put(`${API}/api/turnos-teoricos/:id`, () => HttpResponse.text(D7_VENTANA_COMENZADA, { status: 409 })),
    )
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/teoria/turnos/4/editar')
    await screen.findByLabelText('Nombre')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText(D7_VENTANA_COMENZADA)).toBeInTheDocument()
  })

  it('CA-TUT-13 un fallo en la primera carga del formulario ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos/:id`, () => HttpResponse.error()))
    await iniciarComo('instructor.perez')
    renderApp('/teoria/turnos/4/editar')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })
})

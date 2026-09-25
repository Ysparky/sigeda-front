import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TEXTO_RESULTADO_SIN_DETALLE } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'

async function abrirResultado(username: string, idTurno: number) {
  await iniciarComo(username)
  const resultado = renderApp(`/examenes/${idTurno}/resultado`)
  await screen.findByRole('heading', { level: 2, name: 'Su resultado' })
  return resultado
}

describe('Resultado del examen', () => {
  it('CA-RES-07 CA-RES-03 muestra la nota, si aprobó y la nota mínima aplicable', async () => {
    await abrirResultado('alumno.torres', 1)
    expect(screen.getByText('12.00 / mínimo 18')).toBeInTheDocument()
    expect(screen.getByText('Desaprobado')).toBeInTheDocument()
    expect(screen.getByText('Adoctrinamiento de Vuelo')).toBeInTheDocument()
    expect(screen.getByText('Mensual')).toBeInTheDocument()
    expect(screen.getByText('Estado').nextElementSibling).toHaveTextContent('Entregado')
  })

  it('CA-RES-08 con el turno finalizado muestra por pregunta la respuesta, la correcta, el puntaje y la explicación', async () => {
    await abrirResultado('alumno.torres', 1)
    const detalle = within(screen.getByRole('region', { name: 'Detalle de sus respuestas' }))
    expect(detalle.getAllByRole('group', { name: /^Pregunta / })).toHaveLength(5)
    const primera = within(detalle.getByRole('group', { name: 'Pregunta 1' }))
    expect(primera.getByRole('heading', { level: 2, name: 'Pregunta 1 · 4 de 4' })).toBeInTheDocument()
    expect(primera.getByText('Correcta')).toBeInTheDocument()
    expect(primera.getByText('Su respuesta: El PDI EA-510')).toBeInTheDocument()
    expect(primera.getByText('Respuesta correcta: El PDI EA-510')).toBeInTheDocument()
    expect(primera.getByText('El PDI EA-510 es el plan de instrucción vigente del curso.')).toBeInTheDocument()
    const tercera = within(detalle.getByRole('group', { name: 'Pregunta 3' }))
    expect(tercera.getByText('Incorrecta')).toBeInTheDocument()
    expect(tercera.getByRole('heading', { level: 2, name: 'Pregunta 3 · 0 de 4' })).toBeInTheDocument()
  })

  it('CA-RES-07 mientras el turno no está finalizado muestra E19 y ninguna respuesta', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    server.use(
      http.get(`${API}/api/turnos-teoricos/3/mi-cuestionario`, () =>
        HttpResponse.json({
          id: 3,
          turnoTeorico: { id: 3, nombre: 'Semanal Adoctrinamiento de Vuelo', estado: 'EN_CURSO' },
          materia: { id: 3, nombre: 'Adoctrinamiento de Vuelo', notaMinima: 18 },
          tipoExamen: 'SEMANAL',
          notaMinimaAplicada: 18,
          codAlumno: '111111',
          alumno: 'Oscar Lopez Chaparro',
          estado: 'ENTREGADO',
          fechaExamen: '2026-09-25',
          horaInicio: '09:00',
          horaFin: '09:25',
          fechaEntrega: '2026-09-25',
          horaEntrega: '09:10',
          puntajeTotal: 20,
          nota: 8,
          aprobado: false,
          calificaciones: [],
        }),
      ),
    )
    await abrirResultado('alumno.lopez', 3)
    expect(screen.getByText('8.00 / mínimo 18')).toBeInTheDocument()
    expect(screen.getByText(TEXTO_RESULTADO_SIN_DETALLE)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Detalle de sus respuestas' })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Respuesta correcta')
  })

  it('CA-RES-09 el alumno no puede abrir el resultado de un turno ajeno', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/examenes/1/resultado')
    expect(await screen.findByText(/no encontr/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Su resultado' })).not.toBeInTheDocument()
  })

  it('CA-RES-12 un fallo en la primera carga del resultado ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos/:id/mi-cuestionario`, () => HttpResponse.error()))
    await iniciarComo('alumno.torres')
    const { usuario } = renderApp('/examenes/1/resultado')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Su resultado' })).toBeInTheDocument()
  })

  it('CA-RES-07 el resultado ofrece volver a Mis exámenes', async () => {
    await abrirResultado('alumno.torres', 1)
    expect(screen.getByRole('link', { name: 'Volver a Mis exámenes' })).toHaveAttribute('href', '/examenes')
  })
})

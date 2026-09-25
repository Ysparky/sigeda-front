import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { TEXTO_SIN_HABILITADOS, TEXTO_TEORIA_SOLO_MOCK, TEXTO_VENTANA_COMENZADA } from '@/lib/dominio/teoria'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirResultados(id: number) {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(`/teoria/turnos/${id}`)
  await screen.findByRole('table', { name: 'Resultados por alumno' })
  return resultado
}

function filasDeAlumnos() {
  return within(screen.getByRole('table', { name: 'Resultados por alumno' })).getAllByRole('row').slice(1)
}

describe('Resultados por turno teórico', () => {
  it('CA-RES-01 CA-RES-03 muestra los datos del turno, sus preguntas y un resultado por alumno', async () => {
    await abrirResultados(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Mensual Adoctrinamiento de Vuelo' })).toBeInTheDocument()
    const datos = within(screen.getByRole('heading', { level: 2, name: 'Datos del examen' }).closest('div[data-slot="card"]')!)
    expect(datos.getByText('Adoctrinamiento de Vuelo')).toBeInTheDocument()
    expect(datos.getByText('Mensual')).toBeInTheDocument()
    expect(datos.getByText('Grupo 3 · PDI')).toBeInTheDocument()
    expect(datos.getByText('Juan Torres Perez')).toBeInTheDocument()
    expect(datos.getByText('08:00–09:00')).toBeInTheDocument()
    expect(datos.getByText('Finalizado')).toBeInTheDocument()
    const preguntas = within(screen.getByRole('table', { name: 'Preguntas del examen' }))
    expect(preguntas.getAllByRole('row')).toHaveLength(6)
    expect(preguntas.getByText('¿Qué documento fija la conducta del alumno piloto durante la instrucción?')).toBeInTheDocument()
    const primera = within(filasDeAlumnos()[0]!)
    expect(primera.getByText('Pedro Rodriguez Garcia')).toBeInTheDocument()
    expect(primera.getByText('Entregado')).toBeInTheDocument()
    expect(primera.getByText('20.00 / mínimo 18')).toBeInTheDocument()
    expect(primera.getByText('Aprobado')).toBeInTheDocument()
  })

  it('CA-RES-04 el resumen muestra habilitados, rindieron, aprobados y el promedio', async () => {
    await abrirResultados(1)
    const resumen = within(screen.getByRole('heading', { level: 2, name: 'Resumen' }).closest('div[data-slot="card"]')!)
    expect(resumen.getByText('Habilitados').nextElementSibling).toHaveTextContent('2')
    expect(resumen.getByText('Rindieron').nextElementSibling).toHaveTextContent('2')
    expect(resumen.getByText('Aprobados').nextElementSibling).toHaveTextContent('1')
    expect(resumen.getByText('Promedio del turno').nextElementSibling).toHaveTextContent('16.00')
  })

  it('CA-RES-06 el alumno con subsanación pendiente queda marcado en su fila', async () => {
    await abrirResultados(1)
    const segunda = within(filasDeAlumnos()[1]!)
    expect(segunda.getByText('Ana Torres Martinez')).toBeInTheDocument()
    expect(segunda.getByText('12.00 / mínimo 18')).toBeInTheDocument()
    expect(segunda.getByText('Desaprobado')).toBeInTheDocument()
    expect(segunda.getByText('Subsanación pendiente')).toBeInTheDocument()
    expect(within(filasDeAlumnos()[0]!).queryByText('Subsanación pendiente')).not.toBeInTheDocument()
  })

  it('CA-RES-02 un turno sin entregas deriva No rindió y no promedia', async () => {
    await abrirResultados(2)
    expect(filasDeAlumnos()).toHaveLength(1)
    const fila = within(filasDeAlumnos()[0]!)
    expect(fila.getByText('Juan Falconi Fernandez')).toBeInTheDocument()
    expect(fila.getByText('No rindió')).toBeInTheDocument()
    expect(fila.getByText('— / mínimo 20')).toBeInTheDocument()
    const resumen = within(screen.getByRole('heading', { level: 2, name: 'Resumen' }).closest('div[data-slot="card"]')!)
    expect(resumen.getByText('Promedio del turno').nextElementSibling).toHaveTextContent('—')
  })

  it('CA-RES-02 la subsanación solo lista a quien desaprobó su turno de origen', async () => {
    await abrirResultados(5)
    expect(filasDeAlumnos()).toHaveLength(1)
    expect(within(filasDeAlumnos()[0]!).getByText('Ana Torres Martinez')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mensual Adoctrinamiento de Vuelo' })).toHaveAttribute(
      'href',
      '/teoria/turnos/1',
    )
  })

  it('CA-TUT-10 un turno programado ofrece Modificar y Eliminar', async () => {
    await abrirResultados(4)
    expect(screen.getByRole('link', { name: 'Modificar' })).toHaveAttribute('href', '/teoria/turnos/4/editar')
    expect(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' })).toBeEnabled()
    expect(screen.queryByText(TEXTO_VENTANA_COMENZADA)).not.toBeInTheDocument()
  })

  it('CA-TUT-10 un turno cuya ventana comenzó muestra E10 en lugar de las acciones', async () => {
    await abrirResultados(1)
    expect(screen.getByText(TEXTO_VENTANA_COMENZADA)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument()
  })

  it('CA-RES-13 un Pre-Solo aprueba con 18 aunque la materia pida 16 y muestra ese mínimo', async () => {
    server.use(
      http.get(`${API}/api/turnos-teoricos/4`, () =>
        HttpResponse.json({
          id: 4,
          nombre: 'Pre-Solo Aerodinámica Aplicada',
          materia: { id: 1, nombre: 'Aerodinámica Aplicada a Helicópteros', notaMinima: 16 },
          tipoExamen: 'PRE_SOLO',
          notaMinimaAplicada: 18,
          fechaExamen: '2026-09-18',
          horaInicio: '08:00',
          horaFin: '09:00',
          estado: 'FINALIZADO',
          grupo: { id: 3, nombre: 'Grupo 3', programa: 'PDI' },
          instructor: { codigo: '444444', nombre: 'Juan Torres Perez' },
          turnoOrigen: null,
          preguntas: [],
          resultados: [
            {
              codAlumno: '555555',
              alumno: 'Pedro Rodriguez Garcia',
              estado: 'ENTREGADO',
              idCuestionario: 9,
              nota: 16,
              aprobado: false,
              bloqueadoPorSubsanacion: false,
            },
          ],
          resumen: { habilitados: 1, rindieron: 1, aprobados: 0, notaPromedio: 16 },
        }),
      ),
    )
    await abrirResultados(4)
    expect(screen.getByText('Pre-Solo')).toBeInTheDocument()
    const fila = within(filasDeAlumnos()[0]!)
    expect(fila.getByText('16.00 / mínimo 18')).toBeInTheDocument()
    expect(fila.getByText('Desaprobado')).toBeInTheDocument()
  })

  it('CA-RES-02 un turno sin alumnos habilitados lo dice y no muestra la tabla', async () => {
    server.use(
      http.get(`${API}/api/turnos-teoricos/5`, () =>
        HttpResponse.json({
          id: 5,
          nombre: 'Subsanación Adoctrinamiento de Vuelo',
          materia: { id: 3, nombre: 'Adoctrinamiento de Vuelo', notaMinima: 16 },
          tipoExamen: 'SUBSANACION',
          notaMinimaAplicada: 16,
          fechaExamen: '2026-09-26',
          horaInicio: '08:00',
          horaFin: '09:00',
          estado: 'PROGRAMADO',
          grupo: { id: 3, nombre: 'Grupo 3', programa: 'PDI' },
          instructor: { codigo: '444444', nombre: 'Juan Torres Perez' },
          turnoOrigen: { id: 1, nombre: 'Mensual Adoctrinamiento de Vuelo', fechaExamen: '2026-09-18' },
          preguntas: [],
          resultados: [],
          resumen: { habilitados: 0, rindieron: 0, aprobados: 0, notaPromedio: null },
        }),
      ),
    )
    await iniciarComo('instructor.perez')
    renderApp('/teoria/turnos/5')
    expect(await screen.findByText(TEXTO_SIN_HABILITADOS)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Resultados por alumno' })).not.toBeInTheDocument()
  })

  it('CA-RES-12 un fallo en la primera carga del detalle ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos/:id`, () => HttpResponse.error()))
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/teoria/turnos/1')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Resultados por alumno' })).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Resultados por alumno' })).toBeInTheDocument()
  })

  it('CA-RES-12 un turno inexistente lleva a la página de no encontrado', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/teoria/turnos/999')
    expect(await screen.findByText(/no encontr/i)).toBeInTheDocument()
  })

  it('CA-TUT-14 fuera del modo mock y sin la dependencia 6 Modificar y Eliminar quedan deshabilitados', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirResultados(4)
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modificar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })
})

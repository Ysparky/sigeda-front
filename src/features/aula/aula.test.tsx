import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const API = config.sigedaApiUrl

describe('Mi curso (inicio del alumno)', () => {
  it('muestra la cohorte, el próximo turno y el programa con la sub fase en curso', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/inicio')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi curso' })).toBeInTheDocument()
    expect(screen.getByText(/Grupo 1/)).toBeInTheDocument()

    const pase = within(screen.getByRole('region', { name: 'Próximo turno' }))
    expect(pase.getByText('Robinson R22')).toBeInTheDocument()

    const mapa = within(screen.getByRole('region', { name: 'Programa PDI EA-510' }))
    expect(mapa.getByRole('heading', { name: 'Instrucción en tierra' })).toBeInTheDocument()
    expect(mapa.getByRole('heading', { name: 'Adaptación' })).toBeInTheDocument()
    expect(mapa.getByText('En curso')).toBeInTheDocument()
  })

  it('una sub fase que exige simulador muestra si el requisito está aprobado o pendiente', async () => {
    server.use(
      http.get(`${API}/api/aula/alumnos/:cod`, () =>
        HttpResponse.json({
          alumno: { codigo: '111111', nombre: 'Oscar Lopez Chaparro', rango: 'Cadete' },
          cohorte: null,
          proximoTurno: null,
          tierra: { aprobadas: 0, total: 0, materias: [] },
          fases: [
            {
              id: 3,
              nombre: 'Emergencias y Maniobras Avanzadas',
              subfases: [
                { id: 7, nombre: 'Autorrotación', misiones: 5, evaluadas: 0, promedio: null, ultimaClasificacion: null, estado: 'EN_CURSO', simulador: { escenario: 'Emergencia en vuelo - falla de motor', aprobado: false } },
                { id: 8, nombre: 'Falla Sistemas y Maniobras', misiones: 7, evaluadas: 0, promedio: null, ultimaClasificacion: null, estado: 'PENDIENTE', simulador: null },
              ],
            },
          ],
          notasRecientes: [],
          porRendir: [],
          horas: { vuelo: 0, simulador: 0, programa: 94 },
          nfpi: null,
        }),
      ),
    )
    await iniciarComo('alumno.lopez')
    renderApp('/inicio')
    expect(await screen.findByText('Simulador · pendiente')).toHaveAttribute(
      'title',
      'Antes de volar esta sub fase: aprobar en simulador «Emergencia en vuelo - falla de motor»',
    )
    expect(screen.getAllByText(/Simulador ·/)).toHaveLength(1)
  })

  it('sin turnos ni cohorte lo dice en lugar de dejar huecos', async () => {
    server.use(
      http.get(`${API}/api/aula/alumnos/:cod`, () =>
        HttpResponse.json({
          alumno: { codigo: '111111', nombre: 'Oscar Lopez Chaparro', rango: 'Cadete' },
          cohorte: null,
          proximoTurno: null,
          tierra: { aprobadas: 0, total: 0, materias: [] },
          fases: [],
          notasRecientes: [],
          porRendir: [],
          horas: { vuelo: 0, simulador: 0, programa: 94 },
          nfpi: null,
        }),
      ),
    )
    await iniciarComo('alumno.lopez')
    renderApp('/inicio')
    expect(await screen.findByText('Aún no tienes cohorte asignada.')).toBeInTheDocument()
    expect(screen.getByText('No tienes turnos de vuelo programados.')).toBeInTheDocument()
    expect(screen.getByText('Todavía no hay notas.')).toBeInTheDocument()
  })
})

describe('Mi cohorte (inicio del instructor)', () => {
  it('muestra sus cohortes, los alumnos por sub fase y lo que tiene por evaluar', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/inicio')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi cohorte' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Turnos de hoy' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Alumnos por sub fase' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Por evaluar' })).toBeInTheDocument()
  })

  it('cada alumno de un turno de hoy sin evaluar lleva a registrar su evaluación', async () => {
    server.use(
      http.get(`${API}/api/aula/instructor`, () =>
        HttpResponse.json({
          instructor: { codigo: '444444', nombre: 'Juan Torres' },
          cohortes: [{ id: 1, nombre: 'Grupo 1', estado: 'EN_PROGRESO', fechaInicio: null, fechaFin: null, diaDelCurso: null, alumnos: 1 }],
          turnosDeHoy: [
            {
              id: 8,
              nombre: 'Circuitos',
              horaInicio: '09:00',
              horaFin: '12:30',
              aeronave: 'Robinson R22',
              mision: 'CM-2',
              subfase: 'Circuitos y Maniobras',
              alumnos: [
                { codigo: '111111', nombre: 'Oscar Lopez', horaInicio: '09:00', horaFin: '10:30', evaluado: false },
                { codigo: '666666', nombre: 'Ana Torres', horaInicio: '11:00', horaFin: '12:30', evaluado: true },
              ],
            },
          ],
          porEvaluar: [],
          fases: [],
          alertas: [],
          proximosExamenes: [],
        }),
      ),
    )
    await iniciarComo('instructor.perez')
    renderApp('/inicio')
    const hoy = within(await screen.findByRole('region', { name: 'Turnos de hoy' }))
    expect(hoy.getByRole('link', { name: 'Evaluar a Oscar Lopez' })).toHaveAttribute('href', '/turnos/8/evaluar/111111')
    expect(hoy.getByText('Evaluado')).toBeInTheDocument()
  })
})

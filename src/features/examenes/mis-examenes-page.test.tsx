import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import {
  TEXTO_SIN_EXAMENES_PENDIENTES,
  TEXTO_SUBSANACION_PENDIENTE,
  textoSeHabilita,
} from '@/lib/dominio/teoria'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { formatearFecha } from '@/lib/formato'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'

async function abrirMisExamenes(username: string) {
  await iniciarComo(username)
  const resultado = renderApp('/examenes')
  await screen.findByRole('heading', { level: 1, name: 'Mis exámenes' })
  return resultado
}

function tarjetas() {
  return within(screen.getByRole('region', { name: 'Exámenes pendientes' })).getAllByRole('heading', { level: 2 })
}

function valorDe(etiqueta: string): string {
  return screen.getByText(etiqueta).nextElementSibling?.textContent ?? ''
}

describe('Mis exámenes', () => {
  it('CA-EXA-01 lista los turnos habilitados con materia, tipo, fecha y horario', async () => {
    relojFalso()
    abrirVentanaDeExamen({ transcurridos: 5 })
    await abrirMisExamenes('alumno.lopez')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(tarjetas().map((titulo) => titulo.textContent)).toEqual(['Semanal Adoctrinamiento de Vuelo'])
    expect(screen.getByText('Adoctrinamiento de Vuelo')).toBeInTheDocument()
    expect(screen.getByText('Semanal')).toBeInTheDocument()
    expect(valorDe('Horario')).toBe('08:55–09:25')
    expect(valorDe('Fecha')).toBe(formatearFecha(hoyIso()))
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar el examen' })).toHaveAttribute('href', '/examenes/3')
  })

  it('CA-EXA-02 un examen cuya ventana no comenzó no se puede abrir y muestra E13', async () => {
    await abrirMisExamenes('alumno.torres')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(tarjetas().map((titulo) => titulo.textContent)).toEqual([
      'Subsanación Adoctrinamiento de Vuelo',
      'Quincenal Límites de Operación',
    ])
    expect(screen.queryByRole('link', { name: /examen/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('Programado')).toHaveLength(2)
    expect(screen.getByText(textoSeHabilita(sumarDias(hoyIso(), 1), '08:00'))).toBeInTheDocument()
    expect(screen.getByText(textoSeHabilita(sumarDias(hoyIso(), 3), '09:00'))).toBeInTheDocument()
  })

  it('CA-EXA-01 sin pendientes muestra E24', async () => {
    await abrirMisExamenes('alumno.falconi')
    expect(await screen.findByText(TEXTO_SIN_EXAMENES_PENDIENTES)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Exámenes pendientes' })).not.toBeInTheDocument()
  })

  it('CA-RES-06 el alumno bloqueado por una subsanación ve E21 con su motivo', async () => {
    await abrirMisExamenes('alumno.torres')
    expect(await screen.findByText(TEXTO_SUBSANACION_PENDIENTE)).toBeInTheDocument()
    expect(
      screen.getByText('Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.'),
    ).toBeInTheDocument()
  })

  it('CA-RES-06 un alumno sin subsanación pendiente no ve E21', async () => {
    await abrirMisExamenes('alumno.lopez')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SUBSANACION_PENDIENTE)).not.toBeInTheDocument()
  })

  it('CA-EXA-13 un fallo en la primera carga ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/examenes/pendientes`, () => HttpResponse.error()))
    const { usuario } = await abrirMisExamenes('alumno.lopez')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_EXAMENES_PENDIENTES)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
  })

  it('CA-RES-06 si el estado teórico no responde la pantalla sigue usable', async () => {
    server.use(http.get(`${API}/api/personas/:cod/estado-teorico`, () => HttpResponse.error()))
    await abrirMisExamenes('alumno.torres')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SUBSANACION_PENDIENTE)).not.toBeInTheDocument()
  })

  it('M4-12 fuera del modo mock y sin la dependencia 7 no se consulta el estado teórico', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    let consultas = 0
    server.use(
      http.get(`${API}/api/personas/:cod/estado-teorico`, () => {
        consultas += 1
        return HttpResponse.json({})
      }),
    )
    await abrirMisExamenes('alumno.torres')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(consultas).toBe(0)
    expect(screen.queryByText(TEXTO_SUBSANACION_PENDIENTE)).not.toBeInTheDocument()
  })
})

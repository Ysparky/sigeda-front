import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { TEXTO_ESTADO_TEORICO_DESCONOCIDO, textoBloqueadoPorSubsanacion } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const MOTIVO = 'Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.'

async function abrirRegistrarTurno() {
  await iniciarComo('jefe.operaciones')
  const resultado = renderApp('/turnos/nuevo')
  await screen.findByLabelText('Nombre')
  await screen.findByRole('option', { name: 'Robinson R22' })
  return resultado
}

async function agregarAlumno(usuario: UserEvent, numero: number, codigo: string) {
  await usuario.click(screen.getByRole('button', { name: 'Agregar alumno' }))
  await screen.findByRole('option', { name: 'Ana Torres Martinez' })
  await usuario.selectOptions(screen.getByLabelText(`Alumno ${numero}`), codigo)
}

describe('Bloqueo por subsanación en el turno práctico', () => {
  it('CA-RES-10 la fila de un alumno bloqueado muestra E22 con su motivo e impide guardar', async () => {
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '666666')
    expect(await screen.findByText(textoBloqueadoPorSubsanacion(MOTIVO))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeDisabled()
  })

  it('CA-RES-10 un alumno sin subsanación pendiente no muestra ningún aviso', async () => {
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '111111')
    expect(await screen.findByLabelText('Alumno 1')).toHaveValue('111111')
    expect(screen.queryByText(textoBloqueadoPorSubsanacion(MOTIVO))).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_ESTADO_TEORICO_DESCONOCIDO)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeEnabled()
  })

  it('CA-RES-10 quitar al alumno bloqueado vuelve a habilitar Guardar', async () => {
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '666666')
    await screen.findByText(textoBloqueadoPorSubsanacion(MOTIVO))
    await usuario.click(screen.getByRole('button', { name: 'Quitar alumno 1' }))
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeEnabled()
  })

  it('CA-RES-10 si el estado teórico no se puede consultar la fila muestra E23 y se puede guardar', async () => {
    server.use(http.get(`${API}/api/personas/:cod/estado-teorico`, () => HttpResponse.error()))
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '666666')
    expect(await screen.findByText(TEXTO_ESTADO_TEORICO_DESCONOCIDO)).toBeInTheDocument()
    expect(screen.queryByText(textoBloqueadoPorSubsanacion(MOTIVO))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeEnabled()
  })

  it('CA-RES-10 sin la dependencia 7 no se consulta el estado teórico ni se bloquea', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    let consultas = 0
    const oyente = ({ request }: { request: Request }) => {
      if (request.url.includes('/estado-teorico')) consultas += 1
    }
    server.events.on('request:start', oyente)
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '666666')
    expect(await screen.findByLabelText('Alumno 1')).toHaveValue('666666')
    expect(screen.queryByText(textoBloqueadoPorSubsanacion(MOTIVO))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeEnabled()
    expect(consultas).toBe(0)
    server.events.removeListener('request:start', oyente)
  })
})

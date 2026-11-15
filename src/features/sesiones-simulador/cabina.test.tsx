import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sembrarTelemetriaMock } from '@/mocks/sigeda/simulador'
import { iniciarComo, renderApp } from '@/test/render'
import { generarTelemetria } from './cabina-simulada'

describe('Cabina del simulador (integración simulada)', () => {
  it('la cabina simulada genera el mismo vuelo para la misma semilla y otro para otra', () => {
    const a = generarTelemetria('Emergencia en vuelo - falla de motor', '111111-1')
    const b = generarTelemetria('Emergencia en vuelo - falla de motor', '111111-1')
    const c = generarTelemetria('Emergencia en vuelo - falla de motor', '222222-1')
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
    expect(a.eventos.map((e) => e.tipo)).toEqual(expect.arrayContaining(['FALLA', 'RESPUESTA', 'DECLARA_EMERGENCIA', 'FINAL']))
    expect(a.muestras.at(-1)?.altitud).toBe(0)
  })

  it('con los datos recibidos, la sesión muestra la propuesta del sistema por competencia', async () => {
    sembrarTelemetriaMock(1, generarTelemetria('Emergencia en vuelo - falla de motor', 'demo'))
    await iniciarComo('instructor.perez')
    renderApp('/sesiones-simulador/1')
    const cabina = within(await screen.findByRole('region', { name: 'Cabina FNPT II' }))
    expect(await cabina.findByText('Datos del ejercicio recibidos')).toBeInTheDocument()
    const propuesta = within(cabina.getByRole('list', { name: 'Propuesta del sistema' }))
    expect(propuesta.getByText(/Respondió a la falla en/)).toBeInTheDocument()
    expect(cabina.getByRole('link', { name: /Calificar con esta propuesta/ })).toHaveAttribute('href', '/sesiones-simulador/1/calificar')
    expect(cabina.getByRole('button', { name: 'Repetir el ejercicio' })).toBeInTheDocument()
  })

  it('calificar arranca con los grados que propuso la cabina', async () => {
    sembrarTelemetriaMock(1, {
      muestras: [{ t: 0, altitud: 1500, velocidad: 80, rpmRotor: 100, velocidadVertical: 0 }],
      eventos: [
        { t: 10, tipo: 'FALLA', detalle: 'Falla de motor' },
        { t: 15, tipo: 'RESPUESTA', detalle: 'Entrada en autorrotación' },
        { t: 13, tipo: 'DECLARA_EMERGENCIA', detalle: 'MAYDAY' },
      ],
    })
    await iniciarComo('instructor.perez')
    renderApp('/sesiones-simulador/1/calificar')
    expect(await screen.findByText('Propuesto por la cabina: 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Aplicación de procedimientos')).toHaveValue('2')
    expect(screen.getByLabelText('Comunicación')).toHaveValue('5')
  })

  it('sin datos de la cabina, una sesión en curso ofrece conectarla', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/sesiones-simulador/1')
    const cabina = within(await screen.findByRole('region', { name: 'Cabina FNPT II' }))
    expect(await cabina.findByRole('button', { name: 'Conectar cabina (simulación)' })).toBeInTheDocument()
  })
})

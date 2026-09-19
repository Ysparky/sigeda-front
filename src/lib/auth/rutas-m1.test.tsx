import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { hoyIso } from '@/lib/dominio/calendario'
import { iniciarComo, renderApp } from '@/test/render'

describe('rutas de turnos y evaluaciones', () => {
  it('CA-TUR-14 el alumno no puede abrir la programación general de turnos', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-EVA-10 el alumno no puede abrir la lista general de evaluaciones', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/evaluaciones')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('Mis turnos es solo para alumnos', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/mis-turnos')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-SES-04 registrar un turno exige Manage Shifts', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/turnos/nuevo')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('la orden de vuelo sin fecha abre la de hoy', async () => {
    await iniciarComo('jefe.operaciones')
    const { router } = renderApp('/turnos/dia')
    await screen.findByRole('heading', { name: 'Orden de vuelo del día' })
    expect(router.state.location.pathname).toBe(`/turnos/dia/${hoyIso()}`)
  })
})

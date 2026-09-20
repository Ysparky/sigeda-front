import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

const SIN_PERMISO = 'No tiene permisos para esta acción.'

describe('rutas de matrícula y programa', () => {
  it('CA-PER-11 Personas exige Manage Users', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/personas')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-GRU-01 Grupos exige Manage Groups', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/grupos')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-FAS-01 el personal ve las fases y solo Manage Phases registra', async () => {
    await iniciarComo('jefe.operaciones')
    const { router } = renderApp('/programa/fases')
    expect(await screen.findByRole('heading', { name: 'Fases y subfases' })).toBeInTheDocument()
    await router.navigate({ to: '/programa/fases/nueva' })
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-EST-01 los estándares exigen Manage Standards', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/maniobras/9/estandares')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-MAN-01 el comandante registra maniobras y el jefe de operaciones no', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/programa/maniobras/nueva')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-MAT-01 el alumno no ve las materias', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/programa/materias')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })
})

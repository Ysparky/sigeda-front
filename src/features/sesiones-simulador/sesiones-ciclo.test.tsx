import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Sesiones de simulador — ciclo de vida', () => {
  it('planifica una sesión y la inicia', async () => {
    await iniciarComo('jefe.operaciones')
    const { usuario } = renderApp('/sesiones-simulador/nueva')

    await usuario.type(await screen.findByLabelText('Código del alumno'), '111111')
    await usuario.type(screen.getByLabelText('Código del instructor'), 'I00001')
    await usuario.type(screen.getByLabelText('Fecha planificada'), '2026-11-10')
    await usuario.click(screen.getByRole('button', { name: 'Planificar' }))

    expect(await screen.findByText('Planificada')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Iniciar' }))
    expect(await screen.findByText('En curso')).toBeInTheDocument()
  })

  it('sin el permiso, la bandeja queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/sesiones-simulador')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })
})

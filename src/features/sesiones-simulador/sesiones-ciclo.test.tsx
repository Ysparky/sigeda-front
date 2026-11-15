import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Sesiones de simulador — ciclo de vida', () => {
  it('planifica una sesión y la inicia', async () => {
    await iniciarComo('jefe.operaciones')
    const { usuario } = renderApp('/sesiones-simulador/nueva')

    await usuario.selectOptions(await screen.findByLabelText('Alumno'), '111111')
    await usuario.selectOptions(screen.getByLabelText('Instructor'), '444444')
    expect(screen.getByLabelText('Fecha planificada')).not.toHaveValue('')
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

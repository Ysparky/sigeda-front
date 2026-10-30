import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Sesiones de simulador — calificación', () => {
  it('califica una sesión en curso y marca no competente cuando hay un indicador en 1', async () => {
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/sesiones-simulador/1/calificar')

    const procedimientos = await screen.findByLabelText('Aplicación de procedimientos')
    await usuario.selectOptions(procedimientos, '1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar calificación' }))

    expect(await screen.findByText('No competente')).toBeInTheDocument()
  })

  it('el alumno ve sus propias sesiones', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/mis-sesiones')
    expect(await screen.findByRole('heading', { name: 'Mis sesiones de simulador' })).toBeInTheDocument()
    expect(await screen.findByText('Emergencia en vuelo - falla de motor')).toBeInTheDocument()
  })
})

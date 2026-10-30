import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sembrarMatriculaMock } from '@/mocks/sigeda/inscripcion'
import { iniciarComo, renderApp } from '@/test/render'

describe('Admisión de postulaciones', () => {
  it('el coordinador observa una postulación pendiente', async () => {
    sembrarMatriculaMock({ id: 60, dni: '71234567', nombres: 'Rosa', aPaterno: 'Quispe', aMaterno: 'Huaman', codPersona: 'P60' })
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/matriculas/60')

    await screen.findByRole('heading', { name: /Rosa Quispe/ })
    await usuario.click(screen.getByRole('button', { name: 'Observar' }))
    await usuario.type(await screen.findByLabelText(/Observaciones/), 'Falta el certificado médico')
    await usuario.click(screen.getByRole('button', { name: 'Enviar observaciones' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Matrículas' })).toBeInTheDocument())
  })

  it('el coordinador admite una postulación validada', async () => {
    sembrarMatriculaMock({ id: 61, dni: '70999888', nombres: 'Mario', aPaterno: 'Vega', aMaterno: 'Luna', estado: 'VALIDADA', codPersona: 'P61' })
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/matriculas/61')

    await screen.findByRole('heading', { name: /Mario Vega/ })
    await usuario.click(screen.getByRole('button', { name: 'Admitir' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Matrículas' })).toBeInTheDocument())
  })

  it('el postulante observado ve las observaciones y puede subsanar', async () => {
    sembrarMatriculaMock({
      id: 62,
      estado: 'OBSERVADA',
      observaciones: 'Falta el certificado médico',
      correo: 'alumno1@sigeda.com',
      codPersona: '111111',
    })
    await iniciarComo('alumno.lopez')
    renderApp('/mi-matricula')

    expect(await screen.findByText('Observada')).toBeInTheDocument()
    expect(screen.getByText(/Falta el certificado médico/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar subsanación/ })).toBeInTheDocument()
  })
})

import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sembrarMatriculaMock } from '@/mocks/sigeda/inscripcion'
import { iniciarComo, renderApp } from '@/test/render'

describe('Bandeja de matrículas (/matriculas)', () => {
  it('sin el permiso, la ruta queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/matriculas')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })

  it('lista pendientes, abre el detalle con el comprobante, valida y rechaza', async () => {
    sembrarMatriculaMock({ id: 50, dni: '71234567', nombres: 'Rosa', aPaterno: 'Quispe', aMaterno: 'Huaman', codPersona: 'P50' })
    sembrarMatriculaMock({ id: 51, dni: '70999888', nombres: 'Mario', aPaterno: 'Vega', aMaterno: 'Luna', codPersona: 'P51' })
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/matriculas')

    expect(await screen.findByRole('heading', { name: 'Matrículas' })).toBeInTheDocument()
    expect(await screen.findByText('Quispe Huaman, Rosa')).toBeInTheDocument()
    expect(screen.getByText('Vega Luna, Mario')).toBeInTheDocument()

    await usuario.click(screen.getByRole('link', { name: /71234567/ }))
    expect(await screen.findByRole('heading', { name: /Rosa Quispe/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ver comprobante/ })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Validar matrícula' }))
    await waitFor(() => expect(screen.queryByText('Quispe Huaman, Rosa')).not.toBeInTheDocument())
    expect(screen.getByText('Vega Luna, Mario')).toBeInTheDocument()

    await usuario.click(screen.getByRole('link', { name: /70999888/ }))
    await screen.findByRole('heading', { name: /Mario Vega/ })
    await usuario.click(screen.getByRole('button', { name: 'Rechazar' }))
    await usuario.type(await screen.findByLabelText(/Motivo/), 'Comprobante ilegible')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))
    await waitFor(() => expect(screen.queryByText('Vega Luna, Mario')).not.toBeInTheDocument())
  })
})

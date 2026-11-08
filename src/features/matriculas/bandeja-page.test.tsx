import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sembrarMatriculaMock } from '@/mocks/sigeda/inscripcion'
import { iniciarComo, renderApp } from '@/test/render'

describe('Bandeja de matrículas (/matriculas)', () => {
  it('sin el permiso, la ruta queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/matriculas')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })

  it('lista pendientes, abre el detalle con sus documentos, valida y rechaza', async () => {
    sembrarMatriculaMock({ id: 50, numeroDocumento: '71234567', nombres: 'Rosa', aPaterno: 'Quispe', aMaterno: 'Huaman' })
    sembrarMatriculaMock({ id: 51, numeroDocumento: '70999888', nombres: 'Mario', aPaterno: 'Vega', aMaterno: 'Luna' })
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/matriculas')

    expect(await screen.findByText('Quispe Huaman, Rosa')).toBeInTheDocument()
    expect(screen.getByText('Vega Luna, Mario')).toBeInTheDocument()

    await usuario.click(screen.getByRole('link', { name: /71234567/ }))
    await screen.findByRole('heading', { name: /Rosa Quispe/ })
    const documentos = within(screen.getByRole('table', { name: 'Documentos del postulante' }))
    expect(documentos.getByText('Certificado médico aeronáutico clase 2')).toBeInTheDocument()
    expect(documentos.getAllByText('Por revisar')).toHaveLength(5)

    await usuario.click(screen.getByRole('button', { name: 'Validar documentación' }))
    await waitFor(() => expect(screen.queryByText('Quispe Huaman, Rosa')).not.toBeInTheDocument())

    await usuario.click(screen.getByRole('link', { name: /70999888/ }))
    await screen.findByRole('heading', { name: /Mario Vega/ })
    await usuario.click(screen.getByRole('button', { name: 'Rechazar' }))
    await usuario.type(await screen.findByLabelText(/Motivo/), 'Documento adulterado')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))
    await waitFor(() => expect(screen.queryByText('Vega Luna, Mario')).not.toBeInTheDocument())
  })
})

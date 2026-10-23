import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'

describe('MatriculaPage (/matricula)', () => {
  it('sin curso, invita a elegir uno del catálogo', async () => {
    renderApp('/matricula')
    expect(await screen.findByText(/Elige un curso/)).toBeInTheDocument()
  })

  it('envía la matrícula y muestra el estado pendiente', async () => {
    const { usuario } = renderApp('/matricula?curso=1')

    await usuario.type(await screen.findByLabelText('DNI'), '71234567')
    await usuario.type(screen.getByLabelText('Nombres'), 'Rosa')
    await usuario.type(screen.getByLabelText('Apellido paterno'), 'Quispe')
    await usuario.type(screen.getByLabelText('Apellido materno'), 'Huaman')
    await usuario.type(screen.getByLabelText('Correo'), 'rosa@correo.com')
    await usuario.type(screen.getByLabelText('Teléfono de contacto'), '999111222')
    await usuario.type(screen.getByLabelText('Contraseña'), 'Cambio2026')

    const archivo = new File([new Uint8Array([1, 2, 3])], 'pago.pdf', { type: 'application/pdf' })
    await usuario.upload(screen.getByLabelText(/Archivo/), archivo)

    await usuario.click(screen.getByRole('button', { name: 'Enviar matrícula' }))

    await waitFor(() => expect(screen.getByText('Matrícula enviada')).toBeInTheDocument())
    expect(screen.getByText(/pendiente de validación/)).toBeInTheDocument()
  })

  it('no envía sin comprobante y pide adjuntarlo', async () => {
    const { usuario } = renderApp('/matricula?curso=1')

    await usuario.type(await screen.findByLabelText('DNI'), '71234567')
    await usuario.type(screen.getByLabelText('Nombres'), 'Rosa')
    await usuario.type(screen.getByLabelText('Apellido paterno'), 'Quispe')
    await usuario.type(screen.getByLabelText('Apellido materno'), 'Huaman')
    await usuario.type(screen.getByLabelText('Correo'), 'rosa@correo.com')
    await usuario.type(screen.getByLabelText('Teléfono de contacto'), '999111222')
    await usuario.type(screen.getByLabelText('Contraseña'), 'Cambio2026')

    await usuario.click(screen.getByRole('button', { name: 'Enviar matrícula' }))

    expect(await screen.findByText(/Adjunta tu comprobante/)).toBeInTheDocument()
    expect(screen.queryByText('Matrícula enviada')).not.toBeInTheDocument()
  })
})

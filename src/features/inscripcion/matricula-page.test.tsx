import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'

async function llenarDatos(usuario: UserEvent, nacimiento = '2000-05-10') {
  await usuario.type(await screen.findByLabelText('Número de documento'), '71234567')
  await usuario.type(screen.getByLabelText('Nombres'), 'Rosa')
  await usuario.type(screen.getByLabelText('Apellido paterno'), 'Quispe')
  await usuario.type(screen.getByLabelText('Apellido materno'), 'Huaman')
  await usuario.type(screen.getByLabelText('Fecha de nacimiento'), nacimiento)
  await usuario.selectOptions(screen.getByLabelText('Sexo'), 'FEMENINO')
  await usuario.type(screen.getByLabelText('Dirección'), 'Jr. Los Pinos 123')
  await usuario.type(screen.getByLabelText('Correo'), 'rosa@correo.com')
  await usuario.type(screen.getByLabelText('Teléfono de contacto'), '999111222')
}

const pdf = (nombre: string) => new File([new Uint8Array([1, 2, 3])], nombre, { type: 'application/pdf' })

async function adjuntarObligatorios(usuario: UserEvent) {
  await usuario.upload(await screen.findByLabelText('Documento de identidad'), pdf('dni.pdf'))
  await usuario.upload(screen.getByLabelText('Certificado de estudios secundarios'), pdf('sec.pdf'))
  await usuario.upload(screen.getByLabelText('Fotografía'), new File([new Uint8Array([1])], 'foto.png', { type: 'image/png' }))
  await usuario.upload(screen.getByLabelText('Certificado de antecedentes policiales'), pdf('ant.pdf'))
  await usuario.upload(screen.getByLabelText('Declaración jurada firmada'), pdf('declaracion.pdf'))
}

describe('MatriculaPage (/matricula)', () => {
  it('sin convocatoria, invita a elegir una del catálogo', async () => {
    renderApp('/matricula')
    expect(await screen.findByText(/Elige una convocatoria abierta/)).toBeInTheDocument()
  })

  it('no pide contraseña ni horario', async () => {
    renderApp('/matricula?convocatoria=1')
    await screen.findByLabelText('Número de documento')
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/horario/i)).not.toBeInTheDocument()
  })

  it('envía la postulación y muestra el código para consultarla', async () => {
    const { usuario } = renderApp('/matricula?convocatoria=1')
    await llenarDatos(usuario)
    await adjuntarObligatorios(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: /Autorizo al Aeroclub/ }))
    await usuario.click(screen.getByRole('button', { name: 'Enviar postulación' }))

    await waitFor(() => expect(screen.getByText('Postulación enviada')).toBeInTheDocument())
    expect(screen.getByLabelText('Código de postulación')).toHaveTextContent(/^COD\d{5}$/)
    expect(screen.getByRole('link', { name: 'Consultar mi postulación' })).toHaveAttribute('href', '/postulacion')
  })

  it('exige la mayoría de edad y el consentimiento de datos', async () => {
    const { usuario } = renderApp('/matricula?convocatoria=1')
    await llenarDatos(usuario, '2015-01-01')
    await usuario.click(screen.getByRole('button', { name: 'Enviar postulación' }))

    expect(await screen.findByText('Debe ser mayor de edad para postular.')).toBeInTheDocument()
    expect(screen.getByText('Debe autorizar el tratamiento de sus datos personales.')).toBeInTheDocument()
    expect(screen.queryByText('Postulación enviada')).not.toBeInTheDocument()
  })

  it('marca el documento obligatorio que falta', async () => {
    const { usuario } = renderApp('/matricula?convocatoria=1')
    await llenarDatos(usuario)
    await usuario.upload(await screen.findByLabelText('Documento de identidad'), pdf('dni.pdf'))
    await usuario.click(screen.getByRole('checkbox', { name: /Autorizo al Aeroclub/ }))
    await usuario.click(screen.getByRole('button', { name: 'Enviar postulación' }))
    expect(await screen.findByText('Falta el documento «Certificado de antecedentes policiales».')).toBeInTheDocument()
    expect(screen.getByText('Falta el documento «Declaración jurada firmada».')).toBeInTheDocument()
  })

  it('el modelo de declaración jurada pide antes los datos con que se prellena', async () => {
    const { usuario } = renderApp('/matricula?convocatoria=1')
    await usuario.click(await screen.findByRole('button', { name: 'Descargar modelo para firmar' }))
    expect(await screen.findByText(/Completa primero tu documento/)).toBeInTheDocument()
  })
})

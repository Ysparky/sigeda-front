import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { sembrarMatriculaMock } from '@/mocks/sigeda/inscripcion'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(id: number) {
  await iniciarComo('coordinador.rivas')
  const vista = renderApp(`/matriculas/${id}`)
  await screen.findByRole('heading', { name: 'Documentos' })
  return vista
}

describe('Admisión desde el detalle de la postulación', () => {
  it('observar un documento deja la postulación observada con su observación', async () => {
    sembrarMatriculaMock({ id: 70 })
    const { usuario } = await abrir(70)
    await usuario.click(await screen.findByRole('button', { name: 'Observar Fotografía' }))
    await usuario.type(await screen.findByLabelText('Observación'), 'Foto borrosa')
    await usuario.click(screen.getByRole('button', { name: 'Observar documento' }))
    expect(await screen.findByText('Foto borrosa')).toBeInTheDocument()
    expect(screen.getByText('Observada')).toBeInTheDocument()
  })

  it('el certificado médico se acepta con su vigencia y la muestra', async () => {
    sembrarMatriculaMock({
      id: 74,
      estado: 'VALIDADA',
      documentos: { CERTIFICADO_MEDICO: { estado: 'PENDIENTE', observacion: null, tipoArchivo: 'application/pdf' } },
    })
    const { usuario } = await abrir(74)
    await usuario.click(screen.getByRole('button', { name: 'Aceptar Certificado médico aeronáutico clase 2' }))
    const dialogo = within(await screen.findByRole('dialog'))
    const vence = sumarDias(hoyIso(), 200)
    await usuario.type(dialogo.getByLabelText('Vigente hasta'), vence)
    await usuario.click(dialogo.getByRole('button', { name: 'Aceptar documento' }))
    expect(await screen.findByText('Documento aceptado.')).toBeInTheDocument()
    const [anio, mes, dia] = vence.split('-')
    expect(await screen.findByText(`Vigente hasta ${dia}/${mes}/${anio}`)).toBeInTheDocument()
  })

  it('la constancia de inglés pide nivel y vigencia', async () => {
    sembrarMatriculaMock({
      id: 75,
      estado: 'VALIDADA',
      documentos: { CONSTANCIA_INGLES: { estado: 'PENDIENTE', observacion: null, tipoArchivo: 'application/pdf' } },
    })
    const { usuario } = await abrir(75)
    await usuario.click(screen.getByRole('button', { name: 'Aceptar Constancia de inglés' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Nivel de inglés'), 'Operacional (4)')
    await usuario.type(dialogo.getByLabelText('Vigente hasta'), sumarDias(hoyIso(), 900))
    await usuario.click(dialogo.getByRole('button', { name: 'Aceptar documento' }))
    expect(await screen.findByText(/Nivel Operacional \(4\) · Vigente hasta/)).toBeInTheDocument()
  })

  it('cita al postulante validado', async () => {
    sembrarMatriculaMock({ id: 71, estado: 'VALIDADA' })
    const { usuario } = await abrir(71)
    await usuario.type(screen.getByLabelText('Fecha'), sumarDias(hoyIso(), 5))
    await usuario.type(screen.getByLabelText('Hora'), '09:00')
    await usuario.type(screen.getByLabelText('Lugar'), 'Hangar 2')
    await usuario.click(screen.getByRole('button', { name: 'Citar' }))
    expect(await screen.findByText(/Hangar 2\./)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Evaluación de admisión' })).toBeInTheDocument()
  })

  it('sin el certificado médico aceptado no registra la evaluación', async () => {
    sembrarMatriculaMock({ id: 72, estado: 'CITADA', citacion: { fecha: hoyIso(), hora: '09:00', lugar: 'Hangar' } })
    const { usuario } = await abrir(72)
    await usuario.type(screen.getByLabelText('Examen de conocimientos (0–20)'), '17')
    await usuario.click(screen.getByRole('button', { name: 'Registrar evaluación' }))
    expect(await screen.findByText('Falta aceptar el certificado médico aeronáutico.')).toBeInTheDocument()
  })

  it('con nota 14 y ambos aptos admite y pide el pago, que luego se registra', async () => {
    sembrarMatriculaMock({
      id: 73,
      estado: 'CITADA',
      citacion: { fecha: hoyIso(), hora: '09:00', lugar: 'Hangar' },
      documentos: { CERTIFICADO_MEDICO: { estado: 'ACEPTADO', observacion: null, tipoArchivo: 'application/pdf' } },
    })
    const { usuario } = await abrir(73)
    await usuario.type(screen.getByLabelText('Examen de conocimientos (0–20)'), '14')
    await usuario.click(screen.getByRole('button', { name: 'Registrar evaluación' }))
    const pago = await screen.findByRole('heading', { name: 'Pago de matrícula' })
    expect(screen.getByText('Admitida')).toBeInTheDocument()

    const tarjeta = pago.closest('[data-slot="card"]') as HTMLElement
    await usuario.type(within(tarjeta).getByLabelText('Monto (S/)'), '1500')
    await usuario.type(within(tarjeta).getByLabelText('N.º de operación'), 'OP-991')
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Registrar pago' }))
    expect(await screen.findByText(/Pago confirmado: S\/ 1500\.00/)).toBeInTheDocument()
  })

  it('con nota 13 no admite', async () => {
    sembrarMatriculaMock({
      id: 74,
      estado: 'CITADA',
      citacion: { fecha: hoyIso(), hora: '09:00', lugar: 'Hangar' },
      documentos: { CERTIFICADO_MEDICO: { estado: 'ACEPTADO', observacion: null, tipoArchivo: 'application/pdf' } },
    })
    const { usuario } = await abrir(74)
    await usuario.type(screen.getByLabelText('Examen de conocimientos (0–20)'), '13')
    await usuario.click(screen.getByRole('button', { name: 'Registrar evaluación' }))
    expect(await screen.findByText('No admitido', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pago de matrícula' })).not.toBeInTheDocument()
  })
})

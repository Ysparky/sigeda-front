import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { sembrarMatriculaMock } from '@/mocks/sigeda/inscripcion'
import { renderApp } from '@/test/render'

async function consultar(usuario: UserEvent, numero: string, codigo: string) {
  await usuario.type(await screen.findByLabelText('Número de documento'), numero)
  await usuario.type(screen.getByLabelText('Código de postulación'), codigo)
  await usuario.click(screen.getByRole('button', { name: 'Consultar' }))
}

describe('Consulta de la postulación (/postulacion)', () => {
  it('con un código errado avisa que no la encuentra', async () => {
    const { usuario } = renderApp('/postulacion')
    await consultar(usuario, '71111111', 'XXXXXXXX')
    expect(await screen.findByText('No encontramos una postulación con esos datos.')).toBeInTheDocument()
  })

  it('muestra el documento observado y deja reemplazarlo', async () => {
    const fila = sembrarMatriculaMock({
      numeroDocumento: '72000001',
      estado: 'OBSERVADA',
      documentos: { CERTIFICADO_SECUNDARIA: { estado: 'OBSERVADO', observacion: 'Ilegible', tipoArchivo: 'application/pdf' } },
    })
    const { usuario } = renderApp('/postulacion')
    await consultar(usuario, '72000001', fila.codigo)

    expect(await screen.findByTestId('estado-postulacion')).toHaveTextContent('Observada')
    expect(screen.getByText('Ilegible')).toBeInTheDocument()
    await usuario.upload(
      screen.getByLabelText(/Reemplazar Certificado de estudios secundarios/),
      new File([new Uint8Array([1])], 'sec.pdf', { type: 'application/pdf' }),
    )
    expect(await screen.findByText('Documento recibido.')).toBeInTheDocument()
    expect(await screen.findByTestId('estado-postulacion')).toHaveTextContent('En revisión documental')
  })

  it('muestra la citación a la evaluación de admisión', async () => {
    const fila = sembrarMatriculaMock({
      numeroDocumento: '72000002',
      estado: 'CITADA',
      citacion: { fecha: '2026-12-01', hora: '09:00', lugar: 'Hangar 2' },
    })
    const { usuario } = renderApp('/postulacion')
    await consultar(usuario, '72000002', fila.codigo)
    expect(await screen.findByText(/09:00 · Hangar 2/)).toBeInTheDocument()
  })

  it('el admitido activa su cuenta', async () => {
    const fila = sembrarMatriculaMock({ numeroDocumento: '72000003', estado: 'ADMITIDA', codPersona: 'P900' })
    const { usuario } = renderApp('/postulacion')
    await consultar(usuario, '72000003', fila.codigo)

    const tarjeta = (await screen.findByRole('heading', { name: 'Activa tu cuenta' })).closest('section') as HTMLElement
    await usuario.type(within(tarjeta).getByLabelText('Contraseña nueva'), 'Cambio2026')
    await usuario.type(within(tarjeta).getByLabelText('Repite la contraseña'), 'Cambio2026')
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Activar cuenta' }))
    expect(await screen.findByText('Tu cuenta está activa')).toBeInTheDocument()
  })
})

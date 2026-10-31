import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Convocatorias (/convocatorias)', () => {
  it('sin el permiso, la ruta queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/convocatorias')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })

  it('lista la convocatoria sembrada y permite cerrar su estado', async () => {
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/convocatorias')

    const enlace = await screen.findByRole('link', { name: 'Admisión 2026-I' })
    await usuario.click(enlace)

    expect(await screen.findByRole('heading', { name: 'Admisión 2026-I' })).toBeInTheDocument()
    expect(screen.getByText('Publicada')).toBeInTheDocument()
    // La cohorte destino de la convocatoria, con su estado.
    expect(screen.getByText('Cohorte destino')).toBeInTheDocument()
    expect(screen.getByText('Promoción 2026-I · En inscripción')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Finalizar' })).toBeInTheDocument())
    expect(screen.getByText('Cerrada')).toBeInTheDocument()
  })

  it('crea una convocatoria desde el formulario', async () => {
    await iniciarComo('coordinador.rivas')
    const { usuario } = renderApp('/convocatorias/nueva')

    await usuario.type(await screen.findByLabelText('Nombre'), 'Admisión 2026-II')
    await usuario.type(screen.getByLabelText('Fecha de inicio'), '2026-07-08')
    await usuario.type(screen.getByLabelText('Fecha de fin'), '2026-07-18')
    await usuario.type(screen.getByLabelText('Vacantes'), '15')
    await usuario.click(screen.getByRole('button', { name: 'Guardar convocatoria' }))

    expect(await screen.findByRole('heading', { name: 'Admisión 2026-II' })).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { AvisoDeError } from './aviso-de-error'

describe('AvisoDeError', () => {
  it('muestra el título y el mensaje del backend', () => {
    render(<AvisoDeError titulo="No se pudieron cargar los datos" error={new ApiError(400, 'Catálogo no disponible.')} />)
    const aviso = screen.getByRole('alert')
    expect(aviso).toHaveTextContent('No se pudieron cargar los datos')
    expect(aviso).toHaveTextContent('Catálogo no disponible.')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('muestra el mensaje genérico ante un error desconocido', () => {
    render(<AvisoDeError error={new Error('interno')} />)
    expect(screen.getByRole('alert')).toHaveTextContent(MENSAJE_GENERICO)
    expect(screen.queryByText('interno')).not.toBeInTheDocument()
  })

  it('reintenta al pulsar Reintentar', async () => {
    const alReintentar = vi.fn()
    render(<AvisoDeError error={new ApiError(400, 'Falló.')} alReintentar={alReintentar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(alReintentar).toHaveBeenCalledOnce()
  })
})

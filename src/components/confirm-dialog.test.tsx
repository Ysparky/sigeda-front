import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from './confirm-dialog'

function montar(alConfirmar: () => void) {
  render(
    <ConfirmDialog
      disparador={<Button>Eliminar turno</Button>}
      titulo="¿Eliminar el turno?"
      descripcion="Esta acción no se puede deshacer."
      confirmar="Eliminar"
      destructivo
      alConfirmar={alConfirmar}
    />,
  )
}

describe('ConfirmDialog', () => {
  it('ejecuta la acción solo al confirmar', async () => {
    const alConfirmar = vi.fn()
    montar(alConfirmar)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar turno' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Esta acción no se puede deshacer.')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(alConfirmar).toHaveBeenCalledOnce()
  })

  it('cancelar no ejecuta la acción', async () => {
    const alConfirmar = vi.fn()
    montar(alConfirmar)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar turno' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(alConfirmar).not.toHaveBeenCalled()
  })
})

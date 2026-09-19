import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Button } from '@/components/ui/button'
import { EmptyState } from './empty-state'

it('muestra el título, la descripción y la siguiente acción', () => {
  render(
    <EmptyState
      titulo="No hay turnos programados"
      descripcion="Programe el primer turno de la sub fase."
      accion={<Button>Registrar turno</Button>}
    />,
  )
  expect(screen.getByText('No hay turnos programados')).toBeInTheDocument()
  expect(screen.getByText('Programe el primer turno de la sub fase.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Registrar turno' })).toBeInTheDocument()
})

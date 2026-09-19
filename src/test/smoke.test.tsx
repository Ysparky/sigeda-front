import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Button } from '@/components/ui/button'

it('renderiza componentes de la interfaz a través del alias @', () => {
  render(<Button>Ingresar</Button>)
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
})

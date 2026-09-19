import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it('muestra la etiqueta y el tono del estado del alumno', () => {
    render(<StatusBadge vocabulario="estado" valor="En Chequeo" />)
    expect(screen.getByText('En chequeo')).toHaveAttribute('data-tono', 'alerta')
  })

  it('describe el calificativo DIRBE para lectores de pantalla', () => {
    const { container } = render(<StatusBadge vocabulario="calificativo" valor="B" />)
    expect(container.querySelector('[data-tono="exito"]')).toHaveTextContent('B (Bueno)')
  })

  it('muestra valores desconocidos sin romperse', () => {
    render(<StatusBadge vocabulario="clasificacion" valor="Pendiente" />)
    expect(screen.getByText('Pendiente')).toHaveAttribute('data-tono', 'neutro')
  })
})

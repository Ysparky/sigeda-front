import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Hoja de briefing', () => {
  it('CA-TUR-16 indica quién explica cada maniobra según su nota mínima', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/turnos/8/briefing/111111')
    const tabla = within(await screen.findByRole('table', { name: 'Maniobras del briefing' }))
    expect(
      tabla
        .getAllByRole('row')
        .slice(1)
        .map((fila) => {
          const [maniobra, , responsable] = within(fila).getAllByRole('cell')
          return [maniobra?.firstElementChild?.textContent, responsable?.textContent]
        }),
    ).toEqual([
      ['Ingreso al circuito de tránsito', 'Explica: Instructor'],
      ['Circuito de tránsito completo', 'Expone: Alumno'],
      ['Virajes a nivel', 'Expone: Alumno'],
      ['Ascensos y descensos', 'Explica: Instructor'],
    ])
    expect(screen.getByText('Oscar Lopez · Navegación Nocturna')).toBeInTheDocument()
  })

  it('un alumno que no vuela en el turno muestra la página no encontrada', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/turnos/8/briefing/222222')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })

  it('CA-TUR-14 el alumno solo abre su propia hoja de briefing', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos/8/briefing/666666')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })
})

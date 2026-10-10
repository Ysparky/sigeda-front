import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CalendarioMensual, type EventoCalendario } from './calendario-mensual'

const eventos: EventoCalendario[] = [
  { id: '1', fecha: '2026-10-05', titulo: 'Autorrotación Inicial', subtitulo: 'AU' },
  { id: '2', fecha: '2026-10-05', titulo: 'Control Básico' },
  { id: '3', fecha: '2026-10-22', titulo: 'Semanal Adoctrinamiento' },
]

describe('CalendarioMensual', () => {
  it('rotula el mes y muestra los eventos del mes', () => {
    render(<CalendarioMensual mes="2026-10-01" eventos={eventos} onMes={vi.fn()} />)
    expect(screen.getByText('Octubre 2026')).toBeInTheDocument()
    expect(screen.getByText('Autorrotación Inicial')).toBeInTheDocument()
    expect(screen.getByText('Control Básico')).toBeInTheDocument()
    expect(screen.getByText('Semanal Adoctrinamiento')).toBeInTheDocument()
  })

  it('un evento es un botón que invoca onEvento con su dato', async () => {
    const onEvento = vi.fn()
    render(<CalendarioMensual mes="2026-10-01" eventos={eventos} onMes={vi.fn()} onEvento={onEvento} />)
    await userEvent.click(screen.getByRole('button', { name: 'Autorrotación Inicial' }))
    expect(onEvento).toHaveBeenCalledWith(eventos[0])
  })

  it('navega al mes anterior, siguiente y a hoy', async () => {
    const onMes = vi.fn()
    render(<CalendarioMensual mes="2026-10-01" eventos={[]} onMes={onMes} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(onMes).toHaveBeenLastCalledWith('2026-11-01')
    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(onMes).toHaveBeenLastCalledWith('2026-09-01')
  })
})

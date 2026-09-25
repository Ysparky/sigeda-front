import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MILISEGUNDOS_DE_REBOTE, useAccionRetardada } from './use-retardo'
import { relojFalso } from '@/test/tiempo'

function Caja({ alBuscar }: { alBuscar: (valor: string) => void }) {
  const [texto, setTexto] = useState('')
  const retardada = useAccionRetardada(alBuscar, MILISEGUNDOS_DE_REBOTE)
  return (
    <input
      aria-label="Buscar"
      value={texto}
      onChange={(evento) => {
        setTexto(evento.target.value)
        retardada(evento.target.value)
      }}
    />
  )
}

describe('useAccionRetardada', () => {
  it('M5-23 no ejecuta la acción antes de que pasen los 300 ms', async () => {
    const { usuario, avanzar } = relojFalso()
    const alBuscar = vi.fn()
    render(<Caja alBuscar={alBuscar} />)
    await usuario.type(screen.getByLabelText('Buscar'), 'ana')
    expect(alBuscar).not.toHaveBeenCalled()
    await avanzar(1_000)
    expect(alBuscar).toHaveBeenCalledTimes(1)
    expect(alBuscar).toHaveBeenCalledWith('ana')
  })

  it('M5-23 cada tecla reinicia la espera: una sola ejecución con el último valor', async () => {
    const { usuario, avanzar } = relojFalso()
    const alBuscar = vi.fn()
    render(<Caja alBuscar={alBuscar} />)
    const campo = screen.getByLabelText('Buscar')
    await usuario.type(campo, 'an')
    await avanzar(100)
    await usuario.type(campo, 'a')
    await avanzar(1_000)
    expect(alBuscar).toHaveBeenCalledTimes(1)
    expect(alBuscar).toHaveBeenCalledWith('ana')
  })

  it('M5-23 dos ráfagas separadas ejecutan la acción dos veces', async () => {
    const { usuario, avanzar } = relojFalso()
    const alBuscar = vi.fn()
    render(<Caja alBuscar={alBuscar} />)
    const campo = screen.getByLabelText('Buscar')
    await usuario.type(campo, 'an')
    await avanzar(1_000)
    await usuario.type(campo, 'a')
    await avanzar(1_000)
    expect(alBuscar.mock.calls.map(([valor]) => valor)).toEqual(['an', 'ana'])
  })

  it('M5-23 al desmontar no queda ninguna ejecución pendiente', async () => {
    const { usuario, avanzar } = relojFalso()
    const alBuscar = vi.fn()
    const { unmount } = render(<Caja alBuscar={alBuscar} />)
    await usuario.type(screen.getByLabelText('Buscar'), 'ana')
    unmount()
    await avanzar(2_000)
    expect(alBuscar).not.toHaveBeenCalled()
  })
})

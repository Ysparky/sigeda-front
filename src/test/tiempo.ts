import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

export function relojFalso() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  return {
    usuario: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
    avanzar: (milisegundos: number) => vi.advanceTimersByTimeAsync(milisegundos),
  }
}

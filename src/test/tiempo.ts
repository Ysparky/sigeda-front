import userEvent from '@testing-library/user-event'
import { addMinutes, format } from 'date-fns'
import { vi } from 'vitest'
import { hoyIso, momento } from '@/lib/dominio/calendario'
import { buscarTurnoTeorico } from '@/mocks/sigeda/datos'
import { ID_TURNO_ABIERTO } from '@/mocks/sigeda/semilla-teoria'

const HORA_BASE = '09:00'

export function relojFalso() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  return {
    usuario: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
    avanzar: (milisegundos: number) => vi.advanceTimersByTimeAsync(milisegundos),
  }
}

export function abrirVentanaDeExamen({ transcurridos = 0, restantes = 25 } = {}) {
  if (!vi.isFakeTimers()) throw new Error('abrirVentanaDeExamen se llama despues de relojFalso()')
  const base = momento(hoyIso(), HORA_BASE)
  vi.setSystemTime(base)
  const turno = buscarTurnoTeorico(ID_TURNO_ABIERTO)
  if (!turno) throw new Error(`El turno teorico ${ID_TURNO_ABIERTO} no existe en los datos de prueba`)
  turno.fechaExamen = hoyIso(base)
  turno.horaInicio = format(addMinutes(base, -transcurridos), 'HH:mm')
  turno.horaFin = format(addMinutes(base, restantes), 'HH:mm')
  return turno
}

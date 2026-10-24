import type { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { cargarEvaluacionVisible } from './cargar'

function clienteFalso(detalle: unknown): QueryClient {
  return { ensureQueryData: vi.fn().mockResolvedValue(detalle) } as unknown as QueryClient
}

describe('carga de la evaluación visible', () => {
  it('acepta el código de un alumno matriculado (alfanumérico)', async () => {
    const cliente = clienteFalso({ codPersona: 'S92ZFX' })
    await expect(cargarEvaluacionVisible(cliente, null, 'S92ZFX-20')).resolves.toEqual({ codPersona: 'S92ZFX' })
    expect(cliente.ensureQueryData).toHaveBeenCalledOnce()
  })

  it('un código mal formado no llega a la API', async () => {
    const cliente = clienteFalso({})
    await expect(cargarEvaluacionVisible(cliente, null, 'xx-1')).rejects.toBeDefined()
    expect(cliente.ensureQueryData).not.toHaveBeenCalled()
  })
})

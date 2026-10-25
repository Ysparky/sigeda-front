import { describe, expect, it } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'

describe('mock del simulador', () => {
  it('ingerir en un turno de aeronave responde 409', async () => {
    await iniciarComo('jefe.operaciones')
    const turno = datos().turnos.find((candidato) => candidato.medio === 'AERONAVE')
    expect(turno).toBeDefined()

    await expect(
      sigeda.post(`/api/turnos/${turno!.id}/sesiones-simulador`, { codAlumno: '111111', maniobras: [] }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('la propuesta por defecto llega vacía', async () => {
    await iniciarComo('jefe.operaciones')
    const propuesta = await sigeda.get('/api/turnos/1/persona/111111/propuesta-simulador')
    expect(propuesta).toEqual({ calificaciones: [] })
  })
})

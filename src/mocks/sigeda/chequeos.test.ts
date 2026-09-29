import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { tokens } from '@/lib/auth/tokens'
import { jwtDePrueba } from '@/mocks/sigeda/auth'
import { iniciarComo } from '@/test/render'
import { D13_SIN_CHEQUEOS } from './chequeos'

describe('GET /api/personas/{cod}/chequeos', () => {
  it('contrato §9.4 999999 tiene la única fila, aprobada, con la foto de contadores previa al reinicio', async () => {
    await iniciarComo('instructor.perez')
    const chequeos = await sigeda.lista<{
      codigo: string
      tipo: string
      resultado: string
      contadores: Record<string, number>
      subfase: string
    }>('/api/personas/999999/chequeos')
    expect(chequeos).toHaveLength(1)
    expect(chequeos[0]).toMatchObject({
      codigo: '999999-2',
      tipo: 'SUBFASE',
      resultado: 'Aprobado',
      contadores: { chequeo: 0, evaluaciones: 7, malos: 0, regulares: 1 },
      subfase: 'Control Básico',
      idSubfase: 1,
    })
  })

  it('contrato §9.4 ni 777777 ni 555555 tienen fila, y por razones distintas', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.lista('/api/personas/777777/chequeos')).resolves.toEqual([])
    await expect(sigeda.lista('/api/personas/555555/chequeos')).resolves.toEqual([])
  })

  it('contrato §6.2 una lista vacía responde 404 D13, una persona inexistente 404 D2 y el endpoint pide Read', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/personas/777777/chequeos')).rejects.toMatchObject({
      status: 404,
      message: D13_SIN_CHEQUEOS,
    })
    await expect(sigeda.get('/api/personas/000000/chequeos')).rejects.toMatchObject({
      status: 404,
      message: 'Persona especificada no existe.',
    })
    tokens.guardar(jwtDePrueba('raul.paredes'), '')
    await expect(sigeda.get('/api/personas/999999/chequeos')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })
})

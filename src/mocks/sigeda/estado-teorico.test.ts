import { describe, expect, it } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { D15_SOLO_LO_PROPIO } from './cuestionarios-teoria'

type Causal = { codigo: string; idMateria: number | null; materia: string | null; grupo: string[] | null; detalle: string; fecha: string }

describe('causales[] del estado teórico', () => {
  it('contrato §9.8 111111 lleva cuatro causales que cubren las tres formas de payload', async () => {
    await iniciarComo('instructor.perez')
    const estado = await sigeda.get<{ causales: Causal[] }>('/api/personas/111111/estado-teorico')
    expect(estado.causales.map((causal) => [causal.codigo, causal.idMateria])).toEqual([
      ['PROMEDIO_ASIGNATURA', 3],
      ['PROMEDIO_ASIGNATURA', 2],
      ['PERIODICOS_GENERALES', 2],
      ['TRES_ASIGNATURAS', null],
    ])
    expect(estado.causales[0]).toMatchObject({
      materia: 'Adoctrinamiento de Vuelo',
      grupo: null,
      detalle: 'Nota de asignatura 12.50 en Adoctrinamiento de Vuelo, por debajo de 13.',
    })
    expect(estado.causales[2]?.grupo).toHaveLength(5)
    expect(estado.causales[3]).toMatchObject({ materia: null, grupo: null, detalle: '3 asignaturas desaprobadas.' })
  })

  it('contrato §5.1 el resto llega con causales vacías, y 666666 prueba bloqueo sin causal', async () => {
    await iniciarComo('instructor.perez')
    const bloqueado = await sigeda.get<{ bloqueadoPorSubsanacion: boolean; causales: Causal[] }>(
      '/api/personas/666666/estado-teorico',
    )
    expect(bloqueado.bloqueadoPorSubsanacion).toBe(true)
    expect(bloqueado.causales).toEqual([])
    const sinNada = await sigeda.get<{ bloqueadoPorSubsanacion: boolean; causales: Causal[] }>(
      '/api/personas/555555/estado-teorico',
    )
    expect([sinNada.bloqueadoPorSubsanacion, sinNada.causales]).toEqual([false, []])
  })

  it('contrato §5.3 la variante en lote no lleva causales', async () => {
    await iniciarComo('instructor.perez')
    const lote = await sigeda.get<Record<string, unknown>[]>('/api/estado-teorico?codAlumnos=111111,666666')
    expect(lote).toHaveLength(2)
    expect(lote[0]).not.toHaveProperty('causales')
    expect(lote[0]).toHaveProperty('bloqueadoPorSubsanacion')
  })

  it('contrato §5.3 un alumno solo puede pedirse a sí mismo en el lote (dependencia 56)', async () => {
    // Sin esto un alumno leería el bloqueo de todo su grupo en un solo pedido, que es más de lo que
    // la ruta por persona le deja pedir de a uno. Un código ajeno entre los propios también rechaza.
    await iniciarComo('alumno.lopez')
    const propio = await sigeda.get<Record<string, unknown>[]>('/api/estado-teorico?codAlumnos=111111')
    expect(propio.map((fila) => fila.codAlumno)).toEqual(['111111'])
    await expect(sigeda.get('/api/estado-teorico?codAlumnos=666666')).rejects.toThrow(D15_SOLO_LO_PROPIO)
    await expect(sigeda.get('/api/estado-teorico?codAlumnos=111111,666666')).rejects.toThrow(D15_SOLO_LO_PROPIO)
  })
})

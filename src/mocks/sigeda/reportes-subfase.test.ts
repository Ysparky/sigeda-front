import { describe, expect, it } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { D6_REPORTE_SIN_EVALUACIONES } from './reportes-subfase'

type Reporte = {
  cabecera: { fase: string; subFase: string; programa: string; alumno: string }
  maniobras: { id: number; nombre: string }[]
  notas: { codigo: string; categoria: string; clasificacion: string; promedio: string | null; calificaciones: unknown[] }[]
}

describe('el reporte de subfase, que nunca tuvo handler', () => {
  it('contrato §9.9 el par (777777, 3) es el único con maniobras y trae las cinco notas', async () => {
    await iniciarComo('instructor.perez')
    const reporte = await sigeda.get<Reporte>('/api/evaluaciones/subfase/3/persona/777777')
    expect(reporte.cabecera).toEqual({
      fase: 'Adaptación',
      subFase: 'Instrumentos',
      programa: 'PDI',
      alumno: 'Carlos Ramirez Sanchez',
    })
    expect(reporte.maniobras).toEqual([
      { id: 9, nombre: 'Maniobra 9' },
      { id: 10, nombre: 'Maniobra 10' },
    ])
    expect(reporte.notas.map((nota) => nota.codigo)).toEqual([
      '777777-1',
      '777777-2',
      '777777-3',
      '777777-4',
      '777777-6',
    ])
    expect(reporte.notas[0]).toMatchObject({ categoria: 'Ponderada', clasificacion: 'Malo', promedio: '12.0' })
    expect(reporte.notas[0]?.calificaciones).toEqual([
      { notaMin: 'B', nota: 'I' },
      { notaMin: 'B', nota: 'R' },
    ])
  })

  it('contrato §9.9 un par sin evaluaciones responde el 404 mal formado del backend', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/evaluaciones/subfase/2/persona/555555')).rejects.toMatchObject({
      status: 404,
      message: D6_REPORTE_SIN_EVALUACIONES,
    })
    expect(D6_REPORTE_SIN_EVALUACIONES).toBe('evaluaciones especificada no existe.')
  })

  it('contrato §9.9 los promedios se filtran a Ponderada y Chequeo Sub Fase', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/evaluaciones/promedio/subfase/1/persona/555555')).resolves.toEqual([
      { codigo: '555555-1', promedio: '14.0' },
      { codigo: '555555-3', promedio: '15.0' },
    ])
    await expect(sigeda.get('/api/evaluaciones/promedio/subfase/1/persona/999999')).resolves.toEqual([
      { codigo: '999999-1', promedio: '15.0' },
      { codigo: '999999-2', promedio: '17.0' },
    ])
  })

  it('contrato §9.9 una subfase sin evaluaciones ponderadas responde 200 con lista vacía, nunca 404', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/evaluaciones/promedio/subfase/2/persona/555555')).resolves.toEqual([])
  })
})

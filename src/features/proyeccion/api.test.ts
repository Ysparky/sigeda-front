import { describe, expect, it } from 'vitest'
import { ID_PROY_GARCIA, ID_PROY_LOPEZ } from '@/mocks/ia/proyeccion'
import { listarProyecciones, obtenerProyeccion } from './api'

describe('api de proyección', () => {
  it('lista las proyecciones con su resumen de riesgo', async () => {
    const proyecciones = await listarProyecciones()
    const garcia = proyecciones.find((alumno) => alumno.studentId === ID_PROY_GARCIA)
    expect(garcia).toMatchObject({
      fullName: 'Pedro Rodriguez Garcia',
      riskLevel: 'bajo',
      trendDirection: 'up',
      evaluationCount: 5,
      latestScore: 17,
    })
    expect(proyecciones.map((alumno) => alumno.studentId)).toContain(ID_PROY_LOPEZ)
  })

  it('trae la proyección completa de un alumno', async () => {
    const proyeccion = await obtenerProyeccion(ID_PROY_GARCIA)
    expect(proyeccion.predictedScore).toBe(17.4)
    expect(proyeccion.predictedBand).toBe('optimo')
    expect(proyeccion.scale).toEqual({ floor: 12, ceiling: 20 })
    expect(proyeccion.trendSeries.some((punto) => punto.kind === 'predicted')).toBe(true)
    expect(proyeccion.maneuverBreakdown.length).toBeGreaterThan(0)
    expect(proyeccion.insufficientData).toBe(false)
  })

  it('marca insufficientData cuando el alumno no tiene evaluaciones', async () => {
    const proyeccion = await obtenerProyeccion(ID_PROY_LOPEZ)
    expect(proyeccion.insufficientData).toBe(true)
    expect(proyeccion.evaluationCount).toBe(0)
    expect(proyeccion.predictedScore).toBeNull()
  })

  it('propaga el 404 de un alumno desconocido', async () => {
    await expect(obtenerProyeccion('00000000-0000-4000-8000-000000000000')).rejects.toThrow()
  })
})

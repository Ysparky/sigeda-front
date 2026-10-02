import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import {
  aEvaluacionGuardada,
  aNota,
  eliminarEvaluacion,
  listarEvaluaciones,
  listarEvaluacionesDelTurno,
  modificarEvaluacion,
  obtenerEvaluacion,
  obtenerUltimaEvaluacion,
  registrarEvaluacion,
  sugerirCategorias,
  type CuerpoEvaluacion,
} from './api'

const API = config.sigedaApiUrl
const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }

function cuerpoPonderada(cambios: Partial<CuerpoEvaluacion> = {}): CuerpoEvaluacion {
  return {
    nombre: 'Ponderada Control Básico Medio',
    categoria: 'Ponderada',
    recomendacion: 'Seguir practicando',
    url: null,
    codEvaluador: null,
    calificaciones: [1, 2, 3, 4, 5, 6].map((idManiobra) => ({
      idManiobra,
      nota: 'B' as const,
      causa: null,
      observacion: null,
      recomendacion: null,
    })),
    ...cambios,
  }
}

describe('api de evaluaciones', () => {
  it('CA-EVA-01 lista las evaluaciones de un alumno con sus filtros', async () => {
    await iniciarComo('comandante.aguirre')
    const todas = await listarEvaluaciones('555555', { ...PAGINA, programa: 'PDI' })
    expect(todas.items.map((evaluacion) => evaluacion.codigo)).toEqual(['555555-1', '555555-2', '555555-3'])
    expect(todas.items[0]).toEqual({
      codigo: '555555-1',
      nombre: 'Ponderada Control Básico 1',
      fase: 'Adaptación',
      evaluador: 'Juan Torres',
      fecha: '2024-03-01',
      alumno: 'Pedro Rodriguez',
      promedio: 14,
      clasificacion: 'Regular',
    })
    const regulares = await listarEvaluaciones('555555', { ...PAGINA, programa: 'PDI', clasificacion: 'Bueno' })
    expect(regulares.items.map((evaluacion) => evaluacion.codigo)).toEqual(['555555-2'])
    await expect(listarEvaluaciones('555555', { ...PAGINA, programa: 'PDI', idSubfase: 2 })).resolves.toMatchObject({
      items: [],
    })
  })

  it('CA-EVA-02 encuentra la evaluación de un alumno en un turno sin confundir turnos parecidos', async () => {
    server.use(
      http.get(`${API}/api/evaluaciones/persona/:cod`, () =>
        HttpResponse.json({
          content: [
            { codigo: '111111-1', nombre: 'a', fase: '', evaluador: '', fecha: '2024-03-01', alumno: '', promedio: null, clasificacion: null },
            { codigo: '111111-12', nombre: 'b', fase: '', evaluador: '', fecha: '2024-03-02', alumno: '', promedio: null, clasificacion: null },
          ],
          number: 0,
          size: 50,
          totalElements: 2,
          totalPages: 1,
        }),
      ),
    )
    await iniciarComo('instructor.perez')
    expect((await listarEvaluacionesDelTurno('111111', 1)).map((evaluacion) => evaluacion.codigo)).toEqual(['111111-1'])
  })

  it('CA-EVA-12 identifica la última evaluación del alumno', async () => {
    await iniciarComo('comandante.aguirre')
    await expect(obtenerUltimaEvaluacion('555555', 'PDI')).resolves.toBe('555555-3')
  })

  it('CA-EVA-08 trae el detalle con la categoría normalizada y cada calificación', async () => {
    await iniciarComo('comandante.aguirre')
    const evaluacion = await obtenerEvaluacion('111111-1')
    expect(evaluacion).toMatchObject({ categoria: 'Ponderada', clasificacion: 'Bueno', promedio: 16.5 })
    expect(evaluacion.calificaciones[2]).toEqual({
      idManiobra: 3,
      maniobra: 'Virajes a nivel',
      notaMin: 'B',
      nota: 'R',
      causa: 'Falta de coordinación en pedales',
      observacion: 'Pierde altura en el viraje',
      recomendacion: 'Practicar virajes coordinados',
    })
  })

  it('CA-EVA-11 sugiere categorías según el estado del alumno', async () => {
    await iniciarComo('instructor.perez')
    await expect(sugerirCategorias('111111')).resolves.toEqual(['Ponderada', 'chequeoSubFase', 'Complementacion'])
    await expect(sugerirCategorias('777777')).resolves.toEqual(['Chequeo'])
  })

  it('CA-EVA-07 devuelve el promedio y la clasificación calculados por el backend', async () => {
    await iniciarComo('instructor.perez')
    await expect(registrarEvaluacion(2, '222222', cuerpoPonderada())).resolves.toEqual({
      mensaje: 'Evaluación guardada con éxito.',
      codigo: '222222-2',
      promedio: 17,
      clasificacion: 'Bueno',
    })
  })

  it('CA-EVA-13 muestra las reglas del backend con su mensaje', async () => {
    await iniciarComo('instructor.perez')
    await expect(registrarEvaluacion(1, '111111', cuerpoPonderada())).rejects.toMatchObject({
      status: 403,
      message: 'La evaluación ya ha sido registrada.',
    })
    await expect(registrarEvaluacion(5, '777777', cuerpoPonderada())).rejects.toMatchObject({
      status: 403,
      message: 'Solo el instructor asignado al turno puede registrar esta evaluación.',
    })
    await iniciarComo('instructor.mendoza')
    await expect(
      registrarEvaluacion(5, '777777', cuerpoPonderada({ calificaciones: cuerpoPonderada().calificaciones.slice(0, 2) })),
    ).rejects.toMatchObject({ status: 400, message: 'El alumno debe ser apto para realizar evaluaciones ponderadas.' })
  })

  it('convierte el promedio del backend en número y lo deja nulo cuando no hay', () => {
    expect(aNota('14.0')).toBe(14)
    expect(aNota(15)).toBe(15)
    expect(aNota(null)).toBeNull()
    expect(aNota('')).toBeNull()
    expect(aNota('n/a')).toBeNull()
  })

  it('tolera la clave sin tilde en la respuesta guardada', () => {
    expect(
      aEvaluacionGuardada({ mensaje: 'Evaluación guardada con éxito.', evaluacion: { codigo: '222222-2', promedio: null, clasificacion: 'Bueno' } }),
    ).toEqual({ mensaje: 'Evaluación guardada con éxito.', codigo: '222222-2', promedio: null, clasificacion: 'Bueno' })
  })

  it('CA-EVA-12 el backend solo permite modificar y eliminar la última evaluación', async () => {
    await iniciarComo('comandante.aguirre')
    await expect(modificarEvaluacion('555555-1', cuerpoPonderada())).rejects.toMatchObject({
      status: 403,
      message: 'Solo se puede modificar la ultima evaluación realiza por el alumno.',
    })
    await expect(eliminarEvaluacion('555555-3')).resolves.toBe('Evaluación eliminado con éxito.')
    await expect(obtenerUltimaEvaluacion('555555', 'PDI')).resolves.toBe('555555-2')
  })

  it('codifica cada segmento de la ruta', async () => {
    await iniciarComo('comandante.aguirre')
    const rutas: string[] = []
    const registrar = ({ request }: { request: Request }) => {
      rutas.push(new URL(request.url).pathname)
    }
    server.events.on('request:start', registrar)
    try {
      await expect(obtenerEvaluacion('../../turnos/8')).rejects.toMatchObject({ status: 404 })
      await expect(listarEvaluacionesDelTurno('../111111', 1)).resolves.toEqual([])
    } finally {
      server.events.removeListener('request:start', registrar)
    }
    expect(rutas).toEqual(['/api/evaluaciones/..%2F..%2Fturnos%2F8', '/api/evaluaciones/persona/..%2F111111'])
  })
})

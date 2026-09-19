import { describe, expect, it } from 'vitest'
import { CALIFICATIVOS, CLASIFICACIONES, ESTADOS_ALUMNO, termino } from './vocabulario'

describe('vocabulario del dominio', () => {
  it('cubre los calificativos DIRBE', () => {
    expect(Object.keys(CALIFICATIVOS)).toEqual(['D', 'I', 'R', 'B', 'E'])
  })

  it('cubre las clasificaciones del enum Clasificacion del backend', () => {
    expect(Object.keys(CLASIFICACIONES).sort()).toEqual(['Bueno', 'Excelente', 'Malo', 'Regular'])
  })

  it('cubre los siete estados del enum Estado del backend', () => {
    expect(Object.keys(ESTADOS_ALUMNO)).toEqual([
      'Apto',
      'En Observación',
      'En Chequeo',
      'En Final',
      'En Complementación',
      'En Deliberación',
      'No Apto',
    ])
  })

  it('reserva el tono de peligro para las alarmas', () => {
    expect(termino('calificativo', 'I').tono).toBe('peligro')
    expect(termino('clasificacion', 'Malo').tono).toBe('peligro')
    expect(termino('estado', 'No Apto').tono).toBe('peligro')
    expect(termino('estado', 'En Deliberación').tono).toBe('peligro')
    expect(termino('estado', 'Apto').tono).toBe('exito')
    expect(termino('clasificacion', 'Bueno').tono).toBe('exito')
  })

  it('devuelve un término neutro con el valor original cuando no lo conoce', () => {
    expect(termino('estado', 'Suspendido')).toEqual({ etiqueta: 'Suspendido', tono: 'neutro' })
  })
})

import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { aplicarErroresDeCampo, rutaDeCampo } from './formularios'

describe('rutaDeCampo', () => {
  it('convierte los índices del backend en rutas de react-hook-form', () => {
    expect(rutaDeCampo('alumnosTurno[0].horaInicio')).toBe('alumnosTurno.0.horaInicio')
    expect(rutaDeCampo('calificaciones[2].causa')).toBe('calificaciones.2.causa')
  })

  it('renombra los segmentos que el formulario llama distinto', () => {
    expect(rutaDeCampo('maniobrasTurno[1].nota_min', { nota_min: 'notaMin' })).toBe('maniobrasTurno.1.notaMin')
    expect(rutaDeCampo('aeronave', { aeronave: 'idAeronave' })).toBe('idAeronave')
  })

  it('no toma por renombre una propiedad heredada de Object', () => {
    expect(rutaDeCampo('constructor')).toBe('constructor')
    expect(rutaDeCampo('datos.toString', { nota_min: 'notaMin' })).toBe('datos.toString')
  })
})

describe('aplicarErroresDeCampo', () => {
  it('CA-TUR-13 marca cada campo con el mensaje del backend', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Revise los campos marcados.', {
      nombre: 'Nombre debe tener de 10 a 30 caracteres.',
      'alumnosTurno[0].codAlumno': 'Código de alumno es requerido.',
    })
    expect(aplicarErroresDeCampo(error, setError)).toEqual([])
    expect(setError).toHaveBeenCalledWith('nombre', { type: 'server', message: 'Nombre debe tener de 10 a 30 caracteres.' })
    expect(setError).toHaveBeenCalledWith('alumnosTurno.0.codAlumno', {
      type: 'server',
      message: 'Código de alumno es requerido.',
    })
  })

  it('CA-MAN-06 agrupa en un solo campo los errores de una lista', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Revise los campos marcados.', {
      'subfases[0].idSubfase': 'La subfase es requerida.',
      nombre: 'El nombre es obligatorio',
    })
    expect(aplicarErroresDeCampo(error, setError, {}, ['subfases'])).toEqual([])
    expect(setError).toHaveBeenCalledWith('subfases', { type: 'server', message: 'La subfase es requerida.' })
    expect(setError).toHaveBeenCalledWith('nombre', { type: 'server', message: 'El nombre es obligatorio' })
  })

  it('CA-MAN-06 conserva el primer mensaje cuando dos filas caen en el mismo campo', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Revise los campos marcados.', {
      'subfases[0].idSubfase': 'La subfase es requerida.',
      'subfases[1].idSubfase': 'La subfase no existe.',
    })
    expect(aplicarErroresDeCampo(error, setError, {}, ['subfases'])).toEqual([])
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('subfases', { type: 'server', message: 'La subfase es requerida.' })
  })

  it('no marca nada cuando el error no trae campos', () => {
    const setError = vi.fn()
    expect(aplicarErroresDeCampo(new ApiError(400, 'Asignar aeronave disponible.'), setError)).toEqual([])
    expect(setError).not.toHaveBeenCalled()
  })

  it('CA-TUT-12 devuelve el mensaje de un campo que el formulario no tiene y no lo marca', () => {
    const setError = vi.fn()
    const getValues = ((ruta: string) => (ruta === 'nombre' ? 'Quincenal' : undefined)) as never
    const error = new ApiError(400, 'Revise los campos marcados.', {
      codInstructor: 'El grupo no corresponde al instructor.',
      nombre: 'El nombre es obligatorio',
    })
    expect(aplicarErroresDeCampo(error, setError, {}, [], getValues)).toEqual([
      'El grupo no corresponde al instructor.',
    ])
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('nombre', { type: 'server', message: 'El nombre es obligatorio' })
  })

  it('CA-TUT-12 trata como huérfano un índice que el formulario ya no muestra', () => {
    const setError = vi.fn()
    const getValues = ((ruta: string) => (ruta === 'preguntas.0.puntajeMaximo' ? '10' : undefined)) as never
    const error = new ApiError(400, 'Revise los campos marcados.', {
      'preguntas[0].puntajeMaximo': 'El puntaje debe ser un entero entre 1 y 20.',
      'preguntas[7].puntajeMaximo': 'El puntaje debe ser un entero entre 1 y 20.',
    })
    expect(aplicarErroresDeCampo(error, setError, {}, [], getValues)).toEqual([
      'El puntaje debe ser un entero entre 1 y 20.',
    ])
    expect(setError).toHaveBeenCalledTimes(1)
  })
})

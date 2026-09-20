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
})

describe('aplicarErroresDeCampo', () => {
  it('CA-TUR-13 marca cada campo con el mensaje del backend', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Revise los campos marcados.', {
      nombre: 'Nombre debe tener de 10 a 30 caracteres.',
      'alumnosTurno[0].codAlumno': 'Código de alumno es requerido.',
    })
    expect(aplicarErroresDeCampo(error, setError)).toBe(true)
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
    expect(aplicarErroresDeCampo(error, setError, {}, ['subfases'])).toBe(true)
    expect(setError).toHaveBeenCalledWith('subfases', { type: 'server', message: 'La subfase es requerida.' })
    expect(setError).toHaveBeenCalledWith('nombre', { type: 'server', message: 'El nombre es obligatorio' })
  })

  it('no marca nada cuando el error no trae campos', () => {
    const setError = vi.fn()
    expect(aplicarErroresDeCampo(new ApiError(400, 'Asignar aeronave disponible.'), setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})

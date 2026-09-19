import { describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  MENSAJE_GENERICO,
  MENSAJE_REVISAR_CAMPOS,
  MENSAJE_SIN_PERMISO,
  normalizarError,
  parsearErroresDeCampo,
} from './errors'

describe('parsearErroresDeCampo', () => {
  it('separa los mensajes de validación por campo', () => {
    const { campos, otros } = parsearErroresDeCampo([
      "'fechaEval': La fecha del turno debe ser posterior a hoy.",
      "'nombre': Nombre debe tener de 10 a 30 caracteres.",
      'Mensaje sin campo',
    ])
    expect(campos).toEqual({
      fechaEval: 'La fecha del turno debe ser posterior a hoy.',
      nombre: 'Nombre debe tener de 10 a 30 caracteres.',
    })
    expect(otros).toEqual(['Mensaje sin campo'])
  })

  it('conserva el primer mensaje cuando un campo se repite', () => {
    const { campos } = parsearErroresDeCampo(["'nombre': Primero.", "'nombre': Segundo."])
    expect(campos).toEqual({ nombre: 'Primero.' })
  })
})

describe('normalizarError', () => {
  it('convierte la lista de validación del backend en errores de campo', () => {
    const error = normalizarError(400, ["'nombre': Nombre debe tener de 10 a 30 caracteres."])
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.message).toBe(MENSAJE_REVISAR_CAMPOS)
    expect(error.erroresDeCampo).toEqual({ nombre: 'Nombre debe tener de 10 a 30 caracteres.' })
  })

  it('muestra "error" y envía "mensaje" (puede traer SQL) solo a la consola', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = normalizarError(500, {
      error: 'Error al realizar la consulta.',
      mensaje: 'could not execute statement; SQL [insert into turnos]',
    })
    expect(error.message).toBe('Error al realizar la consulta.')
    expect(consola).toHaveBeenCalledWith('could not execute statement; SQL [insert into turnos]')
  })

  it('usa el texto plano del backend como mensaje', () => {
    expect(normalizarError(404, 'Turno especificada no existe.').message).toBe('Turno especificada no existe.')
  })

  it('entiende los errores de NestJS con message simple o lista', () => {
    expect(normalizarError(400, { statusCode: 400, message: 'Archivo no permitido' }).message).toBe('Archivo no permitido')
    expect(normalizarError(400, { statusCode: 400, message: ['a', 'b'] }).message).toBe('a. b')
  })

  it('traduce siempre el 403 a un mensaje en español', () => {
    expect(normalizarError(403, { error: 'Forbidden' }).message).toBe(MENSAJE_SIN_PERMISO)
  })

  it('usa un mensaje genérico cuando el cuerpo no se entiende', () => {
    expect(normalizarError(500, null).message).toBe(MENSAJE_GENERICO)
  })
})

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

  it('en un 500 con forma ErrorResponse nunca muestra "message" (puede traer SQL)', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = normalizarError(500, {
      timestamp: '2026-09-19T00:00:00Z',
      status: 500,
      error: 'Error al acceder a base de datos',
      message: 'could not execute statement; SQL [insert into turnos]',
      messages: null,
    })
    expect(error.message).toBe('Error al acceder a base de datos')
    expect(consola).toHaveBeenCalledWith('could not execute statement; SQL [insert into turnos]')
  })

  it('en un 500 de Spring por defecto no muestra "message"', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = normalizarError(500, {
      timestamp: '2026-09-19T00:00:00Z',
      status: 500,
      error: 'Internal Server Error',
      message: 'x',
      path: '/api/turnos',
    })
    expect(error.message).not.toBe('x')
  })
})

describe('normalizarError con las respuestas de turnos y evaluaciones', () => {
  it('CA-TUR-13 convierte los messages de ErrorResponse en errores de campo', () => {
    const error = normalizarError(400, {
      timestamp: '2026-09-19T10:00:00',
      status: 400,
      error: 'Error al validar el modelo',
      message: null,
      messages: [
        "'fechaEval': La fecha del turno debe ser posterior a hoy.",
        "'alumnosTurno[0].horaInicio': La hora debe estar en formato HH:mm (09:00, 14:00)",
      ],
    })
    expect(error.message).toBe(MENSAJE_REVISAR_CAMPOS)
    expect(error.erroresDeCampo).toEqual({
      fechaEval: 'La fecha del turno debe ser posterior a hoy.',
      'alumnosTurno[0].horaInicio': 'La hora debe estar en formato HH:mm (09:00, 14:00)',
    })
  })

  it('en un 4xx con forma ErrorResponse muestra "message", también en el 410 de un turno vencido', () => {
    const vencido = normalizarError(410, {
      timestamp: '2026-09-19T10:00:00',
      status: 410,
      error: 'Fecha de modificación expiró',
      message: 'No se puede modificar. El turno ya ha sido evaluado.',
      messages: null,
    })
    expect(vencido.status).toBe(410)
    expect(vencido.message).toBe('No se puede modificar. El turno ya ha sido evaluado.')
    expect(
      normalizarError(404, { status: 404, error: 'Recurso no encontrado', message: 'No existe información de subfase.' })
        .message,
    ).toBe('No existe información de subfase.')
  })

  it('en un 4xx con forma ErrorResponse sin "message" muestra "error"', () => {
    expect(
      normalizarError(400, { status: 400, error: 'Error al validar el modelo', message: null, messages: null }).message,
    ).toBe('Error al validar el modelo')
  })

  it('CA-EVA-13 muestra el mensaje de una regla de negocio, incluso con 403', () => {
    expect(normalizarError(400, { mensaje: 'El alumno debe ser apto para realizar evaluaciones ponderadas.' }).message).toBe(
      'El alumno debe ser apto para realizar evaluaciones ponderadas.',
    )
    expect(normalizarError(403, { mensaje: 'La evaluación ya ha sido registrada.' }).message).toBe(
      'La evaluación ya ha sido registrada.',
    )
  })

  it('CA-EVA-13 une la lista de mensajes de notas incorrectas, con o sin los dos puntos en la clave', () => {
    const mensajes = [
      'Las notas con id: 3 no utilizan el sistema de calificación.',
      'La nota de las maniobras con id: 5 no son correctas.',
    ]
    const esperado = 'Las notas con id: 3 no utilizan el sistema de calificación. La nota de las maniobras con id: 5 no son correctas.'
    expect(normalizarError(400, { 'mensaje:': mensajes }).message).toBe(esperado)
    expect(normalizarError(400, { mensaje: mensajes }).message).toBe(esperado)
  })

  it('sigue ocultando el mensaje técnico cuando la respuesta trae error y mensaje', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(normalizarError(400, { error: 'Argumento incorrecto', mensaje: 'Dirección debe ser asc' }).message).toBe(
      'Argumento incorrecto',
    )
  })

  it('en un 5xx con forma ErrorResponse no muestra message, messages ni SQL', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = normalizarError(500, {
      timestamp: '2026-09-19T10:00:00',
      status: 500,
      error: 'Error inesperado',
      message: 'could not execute statement; SQL [update personas set estado=?]',
      messages: ["'estado': SQL [update personas]"],
    })
    expect(error.message).toBe('Error inesperado')
    expect(error.erroresDeCampo).toEqual({})
    expect(consola).toHaveBeenCalledWith('could not execute statement; SQL [update personas set estado=?]')
  })

  it('en un 5xx no muestra el mensaje de una regla ni un texto plano', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(normalizarError(503, { mensaje: 'SQL [select * from turnos]' }).message).toBe(MENSAJE_GENERICO)
    expect(normalizarError(500, 'java.sql.SQLException: SQL [insert into turnos]').message).toBe(MENSAJE_GENERICO)
    expect(consola).toHaveBeenCalledWith('java.sql.SQLException: SQL [insert into turnos]')
  })
})

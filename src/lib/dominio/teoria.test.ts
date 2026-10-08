import { describe, expect, it } from 'vitest'
import {
  alternativasRequeridas,
  distribuirPuntaje,
  elegirAlAzar,
  estadoDeVentana,
  etiquetaDeDificultad,
  etiquetaDeOrigen,
  etiquetaDeTipoExamen,
  etiquetaDeTipoPregunta,
  exigeTurnoOrigen,
  formatearRestante,
  MARCADOR_COMPLETAR,
  milisegundosRestantes,
  textoBloqueadoPorSubsanacion,
  textoConMinimo,
  textoPuntajeAsignado,
  textoRespondidas,
  textoSeHabilita,
  textoSinResponder,
  TIPOS_EXAMEN,
} from './teoria'

describe('vocabulario de teoría', () => {
  it('M4-13 etiqueta los cuatro enumerados del contrato en español', () => {
    expect(etiquetaDeTipoPregunta('OPCION_MULTIPLE')).toBe('Opción múltiple')
    expect(etiquetaDeTipoPregunta('VERDADERO_FALSO')).toBe('Verdadero o falso')
    expect(etiquetaDeTipoPregunta('COMPLETAR')).toBe('Completar')
    expect(etiquetaDeDificultad('MEDIA')).toBe('Media')
    expect(etiquetaDeOrigen('IA')).toBe('IA')
    expect(etiquetaDeTipoExamen('PRE_SOLO')).toBe('Pre-Solo')
    expect(etiquetaDeTipoExamen('SUBSANACION')).toBe('Subsanación')
  })

  it('M4-22 los once tipos de examen del contrato están disponibles', () => {
    expect(TIPOS_EXAMEN.map((tipo) => tipo.valor)).toEqual([
      'TEST',
      'EXAMEN',
      'SEMANAL',
      'QUINCENAL',
      'MENSUAL',
      'SEMESTRAL',
      'INOPINADO',
      'PRE_SOLO',
      'SUBSANACION',
      'REZAGADO',
      'BALOTAS',
    ])
  })

  it('devuelve el valor original cuando no conoce la etiqueta', () => {
    expect(etiquetaDeTipoPregunta('OTRO')).toBe('OTRO')
  })
})

describe('reglas por tipo de pregunta', () => {
  it('CA-BAN-05 CA-BAN-06 CA-BAN-07 fija la cantidad de alternativas de cada tipo', () => {
    expect(alternativasRequeridas('OPCION_MULTIPLE')).toBe(4)
    expect(alternativasRequeridas('VERDADERO_FALSO')).toBe(2)
    expect(alternativasRequeridas('COMPLETAR')).toBe(1)
    expect(MARCADOR_COMPLETAR).toBe('_____')
  })

  it('CA-TUT-08 solo la subsanación y el rezagado exigen turno de origen', () => {
    expect(exigeTurnoOrigen('SUBSANACION')).toBe(true)
    expect(exigeTurnoOrigen('REZAGADO')).toBe(true)
    expect(exigeTurnoOrigen('MENSUAL')).toBe(false)
  })
})

describe('ventana del examen', () => {
  const fecha = '2026-09-25'

  it('M4-8 deriva el estado del turno de la fecha y las dos horas', () => {
    expect(estadoDeVentana(fecha, '09:00', '10:00', new Date(2026, 8, 25, 8, 59))).toBe('PROGRAMADO')
    expect(estadoDeVentana(fecha, '09:00', '10:00', new Date(2026, 8, 25, 9, 30))).toBe('EN_CURSO')
    expect(estadoDeVentana(fecha, '09:00', '10:00', new Date(2026, 8, 25, 10, 1))).toBe('FINALIZADO')
  })

  it('CA-EXA-06 cuenta los milisegundos que faltan y nunca baja de cero', () => {
    expect(milisegundosRestantes(fecha, '10:00', new Date(2026, 8, 25, 9, 55))).toBe(5 * 60_000)
    expect(milisegundosRestantes(fecha, '10:00', new Date(2026, 8, 25, 10, 30))).toBe(0)
  })

  it('CA-EXA-06 formatea el tiempo restante en minutos y segundos', () => {
    expect(formatearRestante(5 * 60_000)).toBe('05:00')
    expect(formatearRestante(59_000)).toBe('00:59')
    expect(formatearRestante(0)).toBe('00:00')
    expect(formatearRestante(3_900_000)).toBe('1:05:00')
  })
})

describe('autogenerado de preguntas al azar', () => {
  it('reparte 20 en enteros ≥ 1 que suman 20, lo más parejos posible', () => {
    expect(distribuirPuntaje(5)).toEqual([4, 4, 4, 4, 4])
    expect(distribuirPuntaje(4)).toEqual([5, 5, 5, 5])
    const siete = distribuirPuntaje(7)
    expect(siete.reduce((total, valor) => total + valor, 0)).toBe(20)
    expect(siete).toEqual([3, 3, 3, 3, 3, 3, 2])
    expect(distribuirPuntaje(20)).toHaveLength(20)
    expect(distribuirPuntaje(20).every((valor) => valor === 1)).toBe(true)
  })

  it('no hay reparto para una cantidad fuera de 1..20', () => {
    expect(distribuirPuntaje(0)).toEqual([])
    expect(distribuirPuntaje(21)).toEqual([])
    expect(distribuirPuntaje(2.5)).toEqual([])
  })

  it('elige la cantidad pedida de elementos distintos, acotada al tamaño de la lista', () => {
    const banco = [10, 20, 30, 40, 50]
    const cola = [0.99, 0, 0.5, 0]
    const aleatorio = () => cola.shift() ?? 0
    const elegidas = elegirAlAzar(banco, 3, aleatorio)
    expect(elegidas).toHaveLength(3)
    expect(new Set(elegidas).size).toBe(3)
    expect(elegidas.every((valor) => banco.includes(valor))).toBe(true)
    expect(elegirAlAzar(banco, 99)).toHaveLength(banco.length)
    expect(elegirAlAzar(banco, 0)).toEqual([])
  })
})

describe('textos fijos de M4', () => {
  it('CA-RES-03 muestra la nota con dos decimales junto al mínimo aplicable', () => {
    expect(textoConMinimo(12, 18)).toBe('12.00 / mínimo 18')
    expect(textoConMinimo(null, 20)).toBe('— / mínimo 20')
  })

  it('arma los textos E9, E13, E18, E22 y E29 con sus valores', () => {
    expect(textoPuntajeAsignado(16)).toBe('Puntaje asignado: 16 de 20.')
    expect(textoSeHabilita('2026-09-28', '09:00')).toBe('Se habilita el 28/09/2026 a las 09:00.')
    expect(textoSinResponder(3)).toBe('Quedan 3 preguntas sin responder: se califican con 0.')
    expect(textoBloqueadoPorSubsanacion('Desaprobó Mensual.')).toBe('Subsanación pendiente: Desaprobó Mensual.')
    expect(textoRespondidas(2, 5)).toBe('Respondidas: 2 de 5.')
  })
})

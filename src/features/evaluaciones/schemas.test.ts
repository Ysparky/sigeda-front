import { describe, expect, it } from 'vitest'
import { aCuerpoEvaluacion, esquemaEvaluacion, valoresDeEvaluacion, type ValoresEvaluacion } from './schemas'

function valida(cambios: Partial<ValoresEvaluacion> = {}): ValoresEvaluacion {
  return {
    ...valoresDeEvaluacion(
      [
        { idManiobra: 1, maniobra: 'Maniobra 1', notaMin: 'B', nota: 'B' },
        { idManiobra: 2, maniobra: 'Maniobra 2', notaMin: 'D' },
      ],
      { nombre: 'Ponderada Navegación', categoria: 'Ponderada' },
    ),
    ...cambios,
  }
}

function mensajes(valores: ValoresEvaluacion) {
  const resultado = esquemaEvaluacion.safeParse(valores)
  return resultado.success ? [] : resultado.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

describe('esquema de la evaluación', () => {
  it('fija la nota D cuando la nota mínima es D', () => {
    expect(valida().calificaciones[1]?.nota).toBe('D')
    expect(mensajes(valida())).toEqual([])
  })

  it('CA-EVA-03 valida nombre, categoría, recomendación y enlace', () => {
    expect(mensajes(valida({ nombre: 'Corta', categoria: 'chequeo', recomendacion: 'x'.repeat(251), url: 'drive' }))).toEqual([
      'nombre: Nombre debe tener de 10 a 30 caracteres.',
      'categoria: Ingresar categoria válida.',
      'recomendacion: Recomendación debe tener un máximo de 250 caracteres.',
      'url: Ingrese un enlace válido que empiece con https://',
    ])
  })

  it('CA-EVA-06 exige calificar todas las maniobras', () => {
    const valores = valida()
    valores.calificaciones[0] = { ...valores.calificaciones[0]!, nota: '' }
    expect(mensajes(valores)).toEqual(['calificaciones.0.nota: Califique la maniobra.'])
  })

  it('CA-EVA-04 rechaza una calificación que no corresponde a la nota mínima', () => {
    const valores = valida()
    valores.calificaciones[1] = { ...valores.calificaciones[1]!, nota: 'B' }
    expect(mensajes(valores)).toEqual(['calificaciones.1.nota: La calificación no es válida para la nota mínima.'])
  })

  it('CA-EVA-05 bajo el estándar exige causa, observación y recomendación', () => {
    const valores = valida()
    valores.calificaciones[0] = { ...valores.calificaciones[0]!, nota: 'R' }
    expect(mensajes(valores)).toEqual([
      'calificaciones.0.causa: La causa es requerida para calificaciones bajo el estándar.',
      'calificaciones.0.observacion: La observación es requerida para calificaciones bajo el estándar.',
      'calificaciones.0.recomendacion: La recomendación es requerida para calificaciones bajo el estándar.',
    ])
  })

  it('CA-EVA-11 Chequeo y Complementación exigen el código del evaluador', () => {
    expect(mensajes(valida({ categoria: 'Chequeo', codEvaluador: '44' }))).toEqual([
      'codEvaluador: Ingrese el código de 6 dígitos del evaluador.',
    ])
    expect(mensajes(valida({ categoria: 'Complementacion', codEvaluador: '444444' }))).toEqual([])
  })

  it('arma el cuerpo con la grafía de petición y sin evaluador en las programadas', () => {
    expect(aCuerpoEvaluacion(valida({ codEvaluador: '444444', recomendacion: '  ' }))).toEqual({
      nombre: 'Ponderada Navegación',
      categoria: 'Ponderada',
      recomendacion: null,
      url: null,
      codEvaluador: null,
      calificaciones: [
        { idManiobra: 1, nota: 'B', causa: null, observacion: null, recomendacion: null },
        { idManiobra: 2, nota: 'D', causa: null, observacion: null, recomendacion: null },
      ],
    })
    expect(aCuerpoEvaluacion(valida({ categoria: 'chequeoSubFase' })).categoria).toBe('chequeoSubFase')
  })

  it('descarta el debriefing de las maniobras que no están bajo el estándar', () => {
    const valores = valida()
    valores.calificaciones[0] = { ...valores.calificaciones[0]!, causa: 'x'.repeat(300) }
    expect(esquemaEvaluacion.safeParse(valores).success).toBe(true)
    expect(aCuerpoEvaluacion(valores).calificaciones[0]).toEqual({
      idManiobra: 1,
      nota: 'B',
      causa: null,
      observacion: null,
      recomendacion: null,
    })
  })
})

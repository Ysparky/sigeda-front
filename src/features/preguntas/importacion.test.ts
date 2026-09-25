import { describe, expect, it } from 'vitest'
import type { Pregunta } from '@/features/aprendizaje/api'
import { TEXTO_ALTERNATIVAS_REPETIDAS, TEXTO_ENUNCIADO_CORTO, TEXTO_ENUNCIADO_RECORTADO } from '@/lib/dominio/teoria'
import {
  aCuerpoDeLote,
  avisosDeFila,
  erroresPorFila,
  filaDesdeIa,
  filaImportable,
  filasDesdeIa,
  LARGO_ENUNCIADO,
  LARGO_RESPUESTA,
  recortar,
  TEXTO_ALTERNATIVA_VACIA,
  TEXTO_REPETIDA_EN_LOTE,
  TEXTO_SIN_CORRECTA,
} from './importacion'
import { MENSAJE_ENUNCIADO } from './schemas'

function pregunta(parcial: Partial<Pregunta>): Pregunta {
  return {
    id: 'p1',
    type: 'multiple_choice',
    position: 0,
    prompt: 'Un enunciado suficientemente largo para el banco.',
    options: [
      { id: 'a', text: 'Primera' },
      { id: 'b', text: 'Segunda' },
      { id: 'c', text: 'Tercera' },
      { id: 'd', text: 'Cuarta' },
    ],
    correctAnswer: 'a',
    explanation: null,
    sourceExcerpt: null,
    ...parcial,
  }
}

describe('contrato §6 mapeo de la importación', () => {
  it('CA-IMP-06 verdadero o falso se convierte en Verdadero y Falso con la correcta marcada', () => {
    const verdadero = filaDesdeIa(pregunta({ type: 'true_false', options: null, correctAnswer: 'true' }), '3', 'BAJA')
    expect(verdadero.tipoPregunta).toBe('VERDADERO_FALSO')
    expect(verdadero.alternativas).toEqual(['Verdadero', 'Falso'])
    expect(verdadero.correcta).toBe('0')
    const falso = filaDesdeIa(pregunta({ type: 'true_false', options: null, correctAnswer: 'false' }), '3', 'BAJA')
    expect(falso.correcta).toBe('1')
  })

  it('M4-5 completar deja una sola alternativa con la respuesta esperada', () => {
    const fila = filaDesdeIa(
      pregunta({ type: 'fill_blank', options: null, correctAnswer: 'autorrotación', prompt: 'Se llama _____.' }),
      '3',
      'ALTA',
    )
    expect(fila.tipoPregunta).toBe('COMPLETAR')
    expect(fila.alternativas).toEqual(['autorrotación'])
    expect(fila.correcta).toBe('0')
    expect(fila.dificultad).toBe('ALTA')
    expect(fila.idMateria).toBe('3')
  })

  it('CA-IMP-05 un enunciado de más de 500 llega recortado con E5 y bloquea la fila', () => {
    const fila = filaDesdeIa(pregunta({ prompt: 'a'.repeat(620) }), '3', 'MEDIA')
    expect(fila.enunciado).toHaveLength(LARGO_ENUNCIADO)
    expect(fila.recortado).toBe(true)
    expect(avisosDeFila(fila, [fila])).toContain(TEXTO_ENUNCIADO_RECORTADO)
    expect(filaImportable(fila, [fila])).toBe(false)
    const revisada = { ...fila, recortado: false }
    expect(filaImportable(revisada, [revisada])).toBe(true)
  })

  it('CA-IMP-05 un enunciado de menos de 10 muestra E26 y bloquea la fila', () => {
    const fila = filaDesdeIa(pregunta({ prompt: 'Motor?' }), '3', 'MEDIA')
    expect(avisosDeFila(fila, [fila])).toContain(TEXTO_ENUNCIADO_CORTO)
    expect(filaImportable(fila, [fila])).toBe(false)
  })

  it('CA-IMP-07 una alternativa de más de 200 se recorta sin aviso', () => {
    const fila = filaDesdeIa(
      pregunta({ options: [{ id: 'a', text: 'x'.repeat(240) }, { id: 'b', text: 'b' }, { id: 'c', text: 'c' }, { id: 'd', text: 'd' }] }),
      '3',
      'MEDIA',
    )
    expect(fila.alternativas[0]).toHaveLength(LARGO_RESPUESTA)
    expect(avisosDeFila(fila, [fila])).toEqual([])
    expect(recortar('corto', LARGO_RESPUESTA)).toBe('corto')
  })

  it('CA-IMP-07 alternativas repetidas muestran E6 y bloquean la fila', () => {
    const fila = filaDesdeIa(
      pregunta({ options: [{ id: 'a', text: 'Igual' }, { id: 'b', text: ' igual ' }, { id: 'c', text: 'c' }, { id: 'd', text: 'd' }] }),
      '3',
      'MEDIA',
    )
    expect(avisosDeFila(fila, [fila])).toContain(TEXTO_ALTERNATIVAS_REPETIDAS)
  })

  it('M4-5 una correcta que no empata con ninguna opción deja la fila sin marcar', () => {
    const fila = filaDesdeIa(pregunta({ correctAnswer: 'z' }), '3', 'MEDIA')
    expect(fila.correcta).toBe('')
    expect(avisosDeFila(fila, [fila])).toContain(TEXTO_SIN_CORRECTA)
  })

  it('CA-IMP-09 dos preguntas idénticas dentro del lote se señalan antes de enviar', () => {
    const filas = filasDesdeIa([pregunta({ id: 'p1' }), pregunta({ id: 'p2' })], '3', 'MEDIA')
    expect(avisosDeFila(filas[0]!, filas)).toEqual([])
    expect(avisosDeFila(filas[1]!, filas)).toContain(TEXTO_REPETIDA_EN_LOTE)
  })

  it('CA-IMP-08 el cuerpo del lote lleva la materia y la dificultad de cada fila', () => {
    const filas = filasDesdeIa([pregunta({})], '3', 'MEDIA')
    expect(aCuerpoDeLote([{ ...filas[0]!, idMateria: '6', dificultad: 'ALTA' }])).toEqual([
      {
        idMateria: 6,
        enunciado: 'Un enunciado suficientemente largo para el banco.',
        tipoPregunta: 'OPCION_MULTIPLE',
        dificultad: 'ALTA',
        explicacion: null,
        alternativas: [
          { respuesta: 'Primera', correcto: true },
          { respuesta: 'Segunda', correcto: false },
          { respuesta: 'Tercera', correcto: false },
          { respuesta: 'Cuarta', correcto: false },
        ],
      },
    ])
  })
})

describe('ronda de revisión: correcciones', () => {
  it('contrato §2.3 dos alternativas que solo difieren en tildes no se consideran repetidas', () => {
    const fila = filaDesdeIa(
      pregunta({ options: [{ id: 'a', text: 'Región' }, { id: 'b', text: 'Region' }, { id: 'c', text: 'c' }, { id: 'd', text: 'd' }] }),
      '3',
      'MEDIA',
    )
    expect(avisosDeFila(fila, [fila])).not.toContain(TEXTO_ALTERNATIVAS_REPETIDAS)
  })

  it('contrato §2.6 dos enunciados que solo difieren en tildes no se consideran repetidos en el lote', () => {
    const filas = filasDesdeIa(
      [
        pregunta({ id: 'p1', prompt: 'Región de vuelo permitida para el alumno piloto.' }),
        pregunta({ id: 'p2', prompt: 'Region de vuelo permitida para el alumno piloto.' }),
      ],
      '3',
      'MEDIA',
    )
    expect(avisosDeFila(filas[1]!, filas)).not.toContain(TEXTO_REPETIDA_EN_LOTE)
  })

  it('contrato §2.3 una alternativa vacía muestra que la respuesta es obligatoria, no que está repetida', () => {
    const fila = filaDesdeIa(
      pregunta({
        options: [{ id: 'a', text: '' }, { id: 'b', text: 'Segunda' }, { id: 'c', text: 'Tercera' }, { id: 'd', text: 'Cuarta' }],
      }),
      '3',
      'MEDIA',
    )
    const avisos = avisosDeFila(fila, [fila])
    expect(avisos).toContain(TEXTO_ALTERNATIVA_VACIA)
    expect(avisos).not.toContain(TEXTO_ALTERNATIVAS_REPETIDAS)
  })

  it('contrato §2.3 un enunciado editado que vuelve a superar 500 caracteres se bloquea con el mensaje del formulario', () => {
    const base = filaDesdeIa(pregunta({}), '3', 'MEDIA')
    const editada = { ...base, enunciado: 'a'.repeat(510), recortado: false }
    expect(avisosDeFila(editada, [editada])).toContain(MENSAJE_ENUNCIADO)
    expect(filaImportable(editada, [editada])).toBe(false)
  })

  it('CA-IMP-09 el error de una fila se ubica según las filas enviadas, no según cualquier otro arreglo', () => {
    const enviadas = filasDesdeIa([pregunta({ id: 'p1' }), pregunta({ id: 'p2' })], '3', 'MEDIA')
    const errores = { 'preguntas[1].enunciado': 'El enunciado debe tener entre 10 y 500 caracteres.' }
    expect(erroresPorFila(errores, enviadas)).toEqual({ p2: 'El enunciado debe tener entre 10 y 500 caracteres.' })
  })
})

import { describe, expect, it } from 'vitest'
import { aCuerpoParametros, esquemaParametros, PARAMETRO_VACIO, type ValoresParametros } from './schemas'

function valido(cambios: Record<string, string> = {}): ValoresParametros {
  return {
    parametros: [
      {
        ...PARAMETRO_VACIO,
        clave: 'ALTITUD',
        unidad: 'ft',
        objetivo: '1000',
        tolExcelente: '20',
        tolBueno: '50',
        tolRegular: '100',
        ...cambios,
      },
    ],
  }
}

function mensajes(valores: ValoresParametros) {
  const resultado = esquemaParametros.safeParse(valores)
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message)
}

describe('esquema de parámetros de maniobra', () => {
  it('acepta un parámetro completo', () => {
    expect(mensajes(valido())).toEqual([])
  })

  it('exige al menos un parámetro', () => {
    expect(mensajes({ parametros: [] })).toEqual(['La asignación de parámetros es requerida'])
  })

  it('exige clave, unidad y bandas numéricas positivas', () => {
    expect(mensajes(valido({ clave: '' }))).toContain('La clave es requerida')
    expect(mensajes(valido({ tolExcelente: '0' }))).toContain('La banda Excelente debe ser un número positivo')
    expect(mensajes(valido({ objetivo: 'abc' }))).toContain('Ingrese un objetivo numérico')
  })

  it('convierte las cadenas del formulario a números para el backend', () => {
    expect(aCuerpoParametros(valido())).toEqual({
      parametros: [
        { clave: 'ALTITUD', tipo: 'LINEAL', unidad: 'ft', objetivo: 1000, tolExcelente: 20, tolBueno: 50, tolRegular: 100 },
      ],
    })
  })
})

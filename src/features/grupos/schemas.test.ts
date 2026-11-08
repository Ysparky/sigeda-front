import { describe, expect, it } from 'vitest'
import { esquemaGrupo, GRUPO_VACIO } from './schemas'

function mensajes(alumnos: string[]) {
  const resultado = esquemaGrupo.safeParse({ ...GRUPO_VACIO, nombre: 'Grupo Tope', alumnos })
  return resultado.success ? [] : resultado.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

describe('esquema del grupo', () => {
  it('admite como máximo 20 alumnos', () => {
    const codigos = (cantidad: number) => Array.from({ length: cantidad }, (_, indice) => `4${String(indice).padStart(5, '0')}`)
    expect(mensajes(codigos(20))).toEqual([])
    expect(mensajes(codigos(21))).toEqual(['alumnos: Un grupo admite como máximo 20 alumnos.'])
  })
})

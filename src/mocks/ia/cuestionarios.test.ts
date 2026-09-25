import { describe, expect, it } from 'vitest'
import { generarCuestionario, obtenerCuestionario, type CuerpoGeneracion } from '@/features/aprendizaje/api'
import { CanceladoError } from '@/lib/api/errors'
import { conLimiteDeTiempo } from '@/lib/api/http'
import { relojFalso } from '@/test/tiempo'
import { C5_DOCUMENTOS_AJENOS, C7_GENERACION_FALLIDA, C8_CUESTIONARIO_NO_ENCONTRADO, ID_CUESTIONARIO } from './cuestionarios'

const ID_PRINCIPAL = 'd0c00000-0000-4000-8000-000000000001'
const ID_ERROR = 'd0c00000-0000-4000-8000-000000000003'
const ID_ETERNO = 'd0c00000-0000-4000-8000-000000000006'
const ID_AJENO = 'd0c00000-0000-4000-8000-00000000aaaa'

function cuerpo(parcial: Partial<CuerpoGeneracion> = {}): CuerpoGeneracion {
  return { documentIds: [ID_PRINCIPAL], questionTypes: ['multiple_choice'], questionCount: 5, ...parcial }
}

function sinLimite() {
  return new AbortController().signal
}

describe('mock de cuestionarios', () => {
  it('contrato §7.2 devuelve el cuestionario fijo con una pregunta de cada tipo', async () => {
    const cuestionario = await generarCuestionario(cuerpo(), sinLimite())
    expect(cuestionario.id).toBe(ID_CUESTIONARIO)
    expect(cuestionario.requestedCount).toBe(5)
    expect(cuestionario.preguntas.map((pregunta) => pregunta.type)).toEqual([
      'multiple_choice',
      'true_false',
      'fill_blank',
    ])
    expect(cuestionario.preguntas[0]?.options).toHaveLength(4)
    expect(cuestionario.preguntas[2]?.prompt).toContain('_____')
    expect(cuestionario.preguntas[2]?.correctAnswer).toBe('autorrotación')
  })

  it('contrato §7.2 con questionCount 7 devuelve C7 con su detalle técnico', async () => {
    await expect(generarCuestionario(cuerpo({ questionCount: 7 }), sinLimite())).rejects.toMatchObject({
      status: 400,
      message: C7_GENERACION_FALLIDA,
    })
  })

  it('contrato §7.2 con questionCount 13 no responde nunca', async () => {
    const { avanzar } = relojFalso()
    let error: unknown = null
    const peticion = conLimiteDeTiempo(120_000, (senal) =>
      generarCuestionario(cuerpo({ questionCount: 13 }), senal),
    ).catch((e: unknown) => {
      error = e
    })
    await avanzar(119_000)
    expect(error).toBeNull()
    await avanzar(1000)
    await peticion
    expect(error).toBeInstanceOf(CanceladoError)
  })

  it('contrato §7.2 con questionCount 20 responde después de tres segundos', async () => {
    const { avanzar } = relojFalso()
    let listo = false
    const peticion = generarCuestionario(cuerpo({ questionCount: 20 }), sinLimite()).then(() => {
      listo = true
    })
    await avanzar(2900)
    expect(listo).toBe(false)
    await avanzar(100)
    await peticion
    expect(listo).toBe(true)
  })

  it('contrato §7.2 un documento inexistente devuelve C5 y uno no listo devuelve C6', async () => {
    await expect(generarCuestionario(cuerpo({ documentIds: [ID_AJENO] }), sinLimite())).rejects.toMatchObject({
      status: 404,
      message: C5_DOCUMENTOS_AJENOS,
    })
    await expect(
      generarCuestionario(cuerpo({ documentIds: [ID_PRINCIPAL, ID_ERROR, ID_ETERNO] }), sinLimite()),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Los siguientes documentos aún no están listos: Manual de vuelo escaneado.pdf, Reglamento de operaciones.pdf',
    })
  })

  it('contrato §7.2 el id fijo se recupera y cualquier otro devuelve C8', async () => {
    await expect(obtenerCuestionario(ID_CUESTIONARIO)).resolves.toMatchObject({ id: ID_CUESTIONARIO })
    await expect(obtenerCuestionario('c0e50000-0000-4000-8000-00000000aaaa')).rejects.toMatchObject({
      status: 404,
      message: C8_CUESTIONARIO_NO_ENCONTRADO,
    })
  })
})

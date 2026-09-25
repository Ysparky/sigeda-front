import { describe, expect, it } from 'vitest'
import { crearSesion, enviarMensaje, obtenerSesion } from '@/features/aprendizaje/api'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import {
  C10_SIN_RESPUESTA,
  C9_SESION_NO_ENCONTRADA,
  ID_MENSAJE_ASISTENTE_CON_FUENTES,
  ID_MENSAJE_ASISTENTE_SIN_FUENTES,
  ID_MENSAJE_USUARIO_CON_FUENTES,
  ID_MENSAJE_USUARIO_SIN_FUENTES,
  ID_SESION_CON_FUENTES,
  ID_SESION_CREADA,
  ID_SESION_ILEGIBLE,
  ID_SESION_SIN_FUENTES,
} from './consultas'
import { C5_DOCUMENTOS_AJENOS } from './cuestionarios'

const ID_PRINCIPAL = 'd0c00000-0000-4000-8000-000000000001'
const ID_SEGUNDO = 'd0c00000-0000-4000-8000-000000000002'
const ID_ETERNO = 'd0c00000-0000-4000-8000-000000000006'
const ID_AJENO = '5e550000-0000-4000-8000-00000000aaaa'
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('mock de consultas', () => {
  it('contrato §7.3 crear la conversación devuelve el id fijo, el título por defecto y sus documentos', async () => {
    const sesion = await crearSesion([ID_PRINCIPAL, ID_SEGUNDO])
    expect(sesion.id).toBe(ID_SESION_CREADA)
    expect(sesion.title).toBe('Consulta sobre PDI EA-510 Título III.pdf, Procedimientos de emergencia.docx')
    expect(sesion.documentos.map((documento) => documento.filename)).toEqual([
      'PDI EA-510 Título III.pdf',
      'Procedimientos de emergencia.docx',
    ])
    expect(Object.keys(sesion.documentos[0] ?? {})).not.toContain('extractedText')
  })

  it('contrato §7.3 crear la conversación repite los errores C5 y C6', async () => {
    await expect(crearSesion([ID_AJENO])).rejects.toMatchObject({ status: 404, message: C5_DOCUMENTOS_AJENOS })
    await expect(crearSesion([ID_ETERNO])).rejects.toMatchObject({
      status: 400,
      message: 'Los siguientes documentos aún no están listos: Reglamento de operaciones.pdf',
    })
  })

  it('contrato §7.3 la respuesta normal cita dos fuentes con su similitud', async () => {
    await crearSesion([ID_PRINCIPAL])
    const respuesta = await enviarMensaje(ID_SESION_CREADA, '¿Qué es la autorrotación?')
    expect(respuesta.content).toContain('[1]')
    expect(respuesta.fuentes?.map((fuente) => fuente.similarity)).toEqual([0.812, 0.774])
    expect(respuesta.fuentes?.[0]?.documentFilename).toBe('PDI EA-510 Título III.pdf')
  })

  it('contrato §7.3 una pregunta con «clima» no trae fuentes y una con «error» devuelve C10', async () => {
    await crearSesion([ID_PRINCIPAL])
    await expect(enviarMensaje(ID_SESION_CREADA, '¿Cómo afecta el clima?')).resolves.toMatchObject({ fuentes: [] })
    await expect(enviarMensaje(ID_SESION_CREADA, 'provoca un error')).resolves.toMatchObject({
      content: C10_SIN_RESPUESTA,
      fuentes: [],
    })
  })

  it('contrato §7.3 una pregunta con «falla» devuelve 500 y no guarda nada', async () => {
    await crearSesion([ID_PRINCIPAL])
    await expect(enviarMensaje(ID_SESION_CREADA, 'esto falla')).rejects.toMatchObject({
      status: 500,
      message: MENSAJE_GENERICO,
    })
    await expect(obtenerSesion(ID_SESION_CREADA)).resolves.toMatchObject({ mensajes: [] })
  })

  it('contrato §7.3 un sessionId desconocido devuelve C9', async () => {
    await expect(enviarMensaje(ID_AJENO, 'hola')).rejects.toMatchObject({
      status: 404,
      message: C9_SESION_NO_ENCONTRADA,
    })
  })

  it('contrato §7.3 la conversación con fuentes las resuelve sin similitud', async () => {
    const sesion = await obtenerSesion(ID_SESION_CON_FUENTES)
    expect(sesion.mensajes).toHaveLength(2)
    expect(sesion.mensajes[0]?.fuentes).toEqual([])
    expect(sesion.mensajes[1]?.fuentes).toEqual([
      {
        referenceNumber: 1,
        documentId: ID_PRINCIPAL,
        documentFilename: 'PDI EA-510 Título III.pdf',
        excerpt: 'La autorrotación es la condición de vuelo en la que el rotor principal gira por el flujo de aire ascendente.',
        similarity: null,
      },
      {
        referenceNumber: 2,
        documentId: ID_PRINCIPAL,
        documentFilename: 'PDI EA-510 Título III.pdf',
        excerpt: 'El régimen de rotor debe mantenerse dentro del arco verde durante todo el descenso.',
        similarity: null,
      },
    ])
  })

  it('contrato §7.3 la conversación sin fuentes llega sin la clave sources', async () => {
    const sesion = await obtenerSesion(ID_SESION_SIN_FUENTES)
    expect(sesion.mensajes.map((mensaje) => mensaje.fuentes)).toEqual([null, null])
    expect(sesion.mensajes[1]?.content).toContain('[1]')
  })

  it('contrato §7.3 los mensajes de las dos conversaciones fijas tienen los ids que documenta el contrato', async () => {
    const conFuentes = await obtenerSesion(ID_SESION_CON_FUENTES)
    expect(conFuentes.mensajes.map((mensaje) => mensaje.id)).toEqual([
      ID_MENSAJE_USUARIO_CON_FUENTES,
      ID_MENSAJE_ASISTENTE_CON_FUENTES,
    ])
    const sinFuentes = await obtenerSesion(ID_SESION_SIN_FUENTES)
    expect(sinFuentes.mensajes.map((mensaje) => mensaje.id)).toEqual([
      ID_MENSAJE_USUARIO_SIN_FUENTES,
      ID_MENSAJE_ASISTENTE_SIN_FUENTES,
    ])
    for (const mensaje of [...conFuentes.mensajes, ...sinFuentes.mensajes]) {
      expect(mensaje.id).toMatch(UUID_V4)
    }
  })

  it('contrato §7.3 la conversación ilegible responde 500 y otra inexistente C9', async () => {
    await expect(obtenerSesion(ID_SESION_ILEGIBLE)).rejects.toMatchObject({ status: 500, message: MENSAJE_GENERICO })
    await expect(obtenerSesion(ID_AJENO)).rejects.toMatchObject({ status: 404, message: C9_SESION_NO_ENCONTRADA })
  })
})

import { describe, expect, it } from 'vitest'
import { eliminarDocumento, listarDocumentos, subirDocumento } from '@/features/aprendizaje/api'
import { C4_SIN_TEXTO_LEGIBLE } from '@/features/aprendizaje/mensajes'
import { ia } from '@/lib/api/ia'
import { C13_ARCHIVO_GRANDE, C3_DOCUMENTO_NO_ENCONTRADO } from './documentos'

const ID_PRINCIPAL = 'd0c00000-0000-4000-8000-000000000001'
const ID_ERROR = 'd0c00000-0000-4000-8000-000000000003'
const ID_LENTO = 'd0c00000-0000-4000-8000-000000000004'
const ID_SUBIDO = 'd0c00000-0000-4000-8000-000000000005'
const ID_ETERNO = 'd0c00000-0000-4000-8000-000000000006'
const ID_AJENO = 'd0c00000-0000-4000-8000-00000000aaaa'

function archivo(nombre = 'Apuntes nuevos.txt', tipo = 'text/plain', contenido = 'contenido de prueba') {
  return new File([contenido], nombre, { type: tipo })
}

describe('mock de documentos', () => {
  it('contrato §7.1 devuelve las cinco fijaciones de la más reciente a la más antigua', async () => {
    const documentos = await listarDocumentos()
    expect(documentos.map((documento) => documento.filename)).toEqual([
      'Reglamento de operaciones.pdf',
      'Apuntes de aerodinámica.txt',
      'Manual de vuelo escaneado.pdf',
      'Procedimientos de emergencia.docx',
      'PDI EA-510 Título III.pdf',
    ])
    expect(documentos.map((documento) => documento.status)).toEqual([
      'processing',
      'processing',
      'error',
      'ready',
      'ready',
    ])
    expect(documentos[2]?.errorMessage).toBe(C4_SIN_TEXTO_LEGIBLE)
    expect(documentos[4]?.tags).toEqual(['instrucción', 'maniobras'])
    expect(documentos[4]?.processedAt).not.toBeNull()
  })

  it('contrato §7.1 el documento lento queda listo en su tercera consulta y el eterno nunca', async () => {
    await listarDocumentos()
    await listarDocumentos()
    const tercera = await listarDocumentos()
    const lento = tercera.find((documento) => documento.id === ID_LENTO)
    expect(lento?.status).toBe('ready')
    expect(lento?.tags).toEqual(['aerodinámica'])
    expect(tercera.find((documento) => documento.id === ID_ETERNO)?.status).toBe('processing')
  })

  it('contrato §7.1 el detalle suma al contador del documento que aún procesa', async () => {
    await ia.get(`/documents/${ID_LENTO}`)
    await ia.get(`/documents/${ID_LENTO}`)
    await expect(ia.get(`/documents/${ID_LENTO}`)).resolves.toMatchObject({ status: 'ready' })
    await expect(ia.get(`/documents/${ID_PRINCIPAL}`)).resolves.toMatchObject({ status: 'ready' })
    await expect(ia.get(`/documents/${ID_AJENO}`)).rejects.toMatchObject({
      status: 404,
      message: C3_DOCUMENTO_NO_ENCONTRADO,
    })
  })

  it('contrato §7.1 la subida encabeza la lista y queda lista en su tercera consulta', async () => {
    const subido = await subirDocumento(archivo())
    expect(subido).toMatchObject({ id: ID_SUBIDO, status: 'processing', tags: [], processedAt: null })
    expect((await listarDocumentos())[0]?.id).toBe(ID_SUBIDO)
    await listarDocumentos()
    expect((await listarDocumentos())[0]?.status).toBe('ready')
  })

  it('contrato §7.1 rechaza un tipo no soportado con C2', async () => {
    await expect(subirDocumento(archivo('foto.png', 'image/png'))).rejects.toMatchObject({
      status: 400,
      message: 'Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.',
    })
  })

  it('contrato §7.1 rechaza con C13 un archivo de más de 25 MB', async () => {
    const grande = new File([new Uint8Array(26 * 1024 * 1024)], 'Manual.pdf', { type: 'application/pdf' })
    await expect(subirDocumento(grande)).rejects.toMatchObject({ status: 413, message: C13_ARCHIVO_GRANDE })
  })

  it('contrato §7.1 eliminar responde {deleted:true} y saca el documento de la lista', async () => {
    await eliminarDocumento(ID_ERROR)
    expect((await listarDocumentos()).some((documento) => documento.id === ID_ERROR)).toBe(false)
    await expect(eliminarDocumento(ID_AJENO)).rejects.toMatchObject({
      status: 404,
      message: C3_DOCUMENTO_NO_ENCONTRADO,
    })
  })
})

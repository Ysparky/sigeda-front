import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError, MENSAJE_GENERICO, MENSAJE_SIN_CONEXION, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { TEXTO_DOCUMENTO_CON_ERROR, TEXTO_GENERACION_RECHAZADA } from '@/lib/dominio/aprendizaje'
import { server } from '@/mocks/server'
import {
  crearSesion,
  enviarMensaje,
  eliminarDocumento,
  listarDocumentos,
  obtenerCuestionario,
  obtenerSesion,
  subirDocumento,
} from './api'
import {
  C10_SIN_RESPUESTA,
  C4_SIN_TEXTO_LEGIBLE,
  C5_DOCUMENTOS_AJENOS,
  C8_CUESTIONARIO_NO_ENCONTRADO,
  mensajeDeError,
  mensajePermitido,
  motivoDelDocumento,
} from './mensajes'

const IA = config.iaApiUrl

const DOCUMENTO_CRUDO = {
  id: 'd0c00000-0000-4000-8000-000000000001',
  filename: 'PDI EA-510 Título III.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2_411_008,
  status: 'ready',
  errorMessage: null,
  tags: ['instrucción'],
  createdAt: '2026-09-18T14:02:11.000Z',
  processedAt: '2026-09-18T14:02:58.000Z',
  extractedText: 'texto extraído que no debe salir',
  storageKey: 'documentos/abc',
  ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
}

describe('listarDocumentos', () => {
  it('CA-DOC-08 no expone el texto extraído, la ruta de almacenamiento ni el dueño', async () => {
    server.use(http.get(`${IA}/documents`, () => HttpResponse.json([DOCUMENTO_CRUDO])))
    const documentos = await listarDocumentos()
    expect(Object.keys(documentos[0] ?? {}).sort()).toEqual([
      'createdAt',
      'errorMessage',
      'filename',
      'id',
      'mimeType',
      'processedAt',
      'sizeBytes',
      'status',
      'tags',
    ])
  })

  it('M3-7 trata uploading y cualquier estado desconocido como procesando', async () => {
    server.use(
      http.get(`${IA}/documents`, () =>
        HttpResponse.json([
          { ...DOCUMENTO_CRUDO, status: 'uploading' },
          { ...DOCUMENTO_CRUDO, id: 'd0c00000-0000-4000-8000-000000000002', status: 'vaya' },
          { ...DOCUMENTO_CRUDO, id: 'd0c00000-0000-4000-8000-000000000003', status: 'error', errorMessage: 'boom' },
        ]),
      ),
    )
    expect((await listarDocumentos()).map((documento) => documento.status)).toEqual(['processing', 'processing', 'error'])
  })

  it('CA-DOC-01 una lista vacía es una lista vacía', async () => {
    server.use(http.get(`${IA}/documents`, () => HttpResponse.json([])))
    await expect(listarDocumentos()).resolves.toEqual([])
  })
})

describe('subirDocumento y eliminarDocumento', () => {
  it('CA-DOC-04 devuelve el documento recién creado en procesamiento', async () => {
    server.use(
      http.post(`${IA}/documents/upload`, () =>
        HttpResponse.json(
          { ...DOCUMENTO_CRUDO, id: 'd0c00000-0000-4000-8000-000000000005', status: 'processing', tags: [], processedAt: null },
          { status: 201 },
        ),
      ),
    )
    const documento = await subirDocumento(new File(['a'], 'Apunte.txt', { type: 'text/plain' }))
    expect(documento).toMatchObject({ id: 'd0c00000-0000-4000-8000-000000000005', status: 'processing', tags: [] })
  })

  it('CA-DOC-07 eliminar acepta el cuerpo {deleted:true}', async () => {
    let recibido = ''
    server.use(
      http.delete(`${IA}/documents/:id`, ({ params }) => {
        recibido = String(params.id)
        return HttpResponse.json({ deleted: true })
      }),
    )
    await expect(eliminarDocumento('d0c00000-0000-4000-8000-000000000001')).resolves.toBeUndefined()
    expect(recibido).toBe('d0c00000-0000-4000-8000-000000000001')
  })
})

describe('obtenerCuestionario', () => {
  it('CA-CUE-07 ordena las preguntas por position y conserva las opciones nulas', async () => {
    server.use(
      http.get(`${IA}/quizzes/:id`, () =>
        HttpResponse.json({
          id: 'c0e50000-0000-4000-8000-000000000001',
          ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
          title: 'Cuestionario sin título',
          questionTypes: ['multiple_choice', 'true_false'],
          requestedCount: 5,
          modelName: 'claude-opus-5',
          createdAt: '2026-09-19T09:15:00.000Z',
          questions: [
            {
              id: '9e500000-0000-4000-8000-000000000002',
              type: 'true_false',
              position: 1,
              prompt: 'La autorrotación necesita potencia.',
              options: null,
              correctAnswer: 'false',
              explanation: 'No la necesita.',
              sourceDocumentId: null,
              sourceExcerpt: null,
              createdAt: '2026-09-19T09:15:00.000Z',
            },
            {
              id: '9e500000-0000-4000-8000-000000000001',
              type: 'multiple_choice',
              position: 0,
              prompt: '¿Qué permite la autorrotación?',
              options: [{ id: 'a', text: 'Descender sin potencia' }],
              correctAnswer: 'a',
              explanation: 'El rotor gira por el flujo ascendente.',
              sourceDocumentId: null,
              sourceExcerpt: 'La autorrotación es…',
              createdAt: '2026-09-19T09:15:00.000Z',
            },
          ],
        }),
      ),
    )
    const cuestionario = await obtenerCuestionario('c0e50000-0000-4000-8000-000000000001')
    expect(cuestionario.preguntas.map((pregunta) => pregunta.position)).toEqual([0, 1])
    expect(cuestionario.preguntas[1]?.options).toBeNull()
    expect(cuestionario.requestedCount).toBe(5)
  })

  it('CA-CUE-12 propaga C8 de un cuestionario inexistente', async () => {
    server.use(
      http.get(`${IA}/quizzes/:id`, () =>
        HttpResponse.json({ statusCode: 404, message: C8_CUESTIONARIO_NO_ENCONTRADO, error: 'Not Found' }, { status: 404 }),
      ),
    )
    await expect(obtenerCuestionario('c0e50000-0000-4000-8000-000000000009')).rejects.toMatchObject({
      message: C8_CUESTIONARIO_NO_ENCONTRADO,
    })
  })
})

describe('sesiones de consulta', () => {
  const sesionCruda = {
    id: '5e550000-0000-4000-8000-000000000001',
    title: 'Consulta sobre PDI EA-510 Título III.pdf',
    createdAt: '2026-09-19T10:30:00.000Z',
    documents: [DOCUMENTO_CRUDO],
  }

  it('CA-CON-02 crea la conversación con sus documentos aplanados', async () => {
    let cuerpo: unknown = null
    server.use(
      http.post(`${IA}/chat/sessions`, async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json(sesionCruda, { status: 201 })
      }),
    )
    const sesion = await crearSesion(['d0c00000-0000-4000-8000-000000000001'])
    expect(cuerpo).toEqual({ documentIds: ['d0c00000-0000-4000-8000-000000000001'] })
    expect(sesion.documentos[0]?.filename).toBe('PDI EA-510 Título III.pdf')
    expect(sesion.mensajes).toEqual([])
  })

  it('M3-10 distingue los mensajes sin la clave sources de los que la traen vacía', async () => {
    server.use(
      http.get(`${IA}/chat/sessions/:id`, () =>
        HttpResponse.json({
          ...sesionCruda,
          messages: [
            { id: '3e550000-0000-4000-8000-000000000001', sessionId: sesionCruda.id, role: 'user', content: '¿Y esto?', createdAt: '2026-09-19T10:31:00.000Z' },
            {
              id: '3e550000-0000-4000-8000-000000000002',
              sessionId: sesionCruda.id,
              role: 'assistant',
              content: 'Respuesta [1].',
              createdAt: '2026-09-19T10:31:12.000Z',
              sources: [
                {
                  referenceNumber: 1,
                  documentId: 'd0c00000-0000-4000-8000-000000000001',
                  documentFilename: 'PDI EA-510 Título III.pdf',
                  excerpt: 'La autorrotación…',
                  similarity: null,
                },
              ],
            },
          ],
        }),
      ),
    )
    const sesion = await obtenerSesion(sesionCruda.id)
    expect(sesion.mensajes[0]?.fuentes).toBeNull()
    expect(sesion.mensajes[1]?.fuentes).toEqual([
      {
        referenceNumber: 1,
        documentId: 'd0c00000-0000-4000-8000-000000000001',
        documentFilename: 'PDI EA-510 Título III.pdf',
        excerpt: 'La autorrotación…',
        similarity: null,
      },
    ])
  })

  it('CA-CON-07 una respuesta fallida del modelo llega como mensaje normal sin fuentes', async () => {
    server.use(
      http.post(`${IA}/chat/messages`, () =>
        HttpResponse.json(
          {
            message: {
              id: '3e550000-0000-4000-8000-000000000004',
              sessionId: sesionCruda.id,
              role: 'assistant',
              content: C10_SIN_RESPUESTA,
              citedChunkIds: [],
              createdAt: '2026-09-19T10:32:00.000Z',
            },
            sources: [],
          },
          { status: 201 },
        ),
      ),
    )
    const respuesta = await enviarMensaje(sesionCruda.id, 'algo con error')
    expect(respuesta.content).toBe(C10_SIN_RESPUESTA)
    expect(respuesta.fuentes).toEqual([])
  })
})

describe('mensajes del contrato', () => {
  it('M3-5 acepta los mensajes exactos y los de prefijo fijo', () => {
    expect(mensajePermitido(C5_DOCUMENTOS_AJENOS)).toBe(C5_DOCUMENTOS_AJENOS)
    expect(mensajePermitido('Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.')).toBe(
      'Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.',
    )
    expect(mensajePermitido('Los siguientes documentos aún no están listos: Apuntes.txt')).toBe(
      'Los siguientes documentos aún no están listos: Apuntes.txt',
    )
    expect(mensajePermitido('El archivo supera el tamaño máximo de 25 MB.')).toBe(
      'El archivo supera el tamaño máximo de 25 MB.',
    )
    expect(mensajePermitido(MENSAJE_SIN_CONEXION)).toBe(MENSAJE_SIN_CONEXION)
    expect(mensajePermitido(MENSAJE_SIN_PERMISO)).toBe(MENSAJE_SIN_PERMISO)
  })

  it('M3-5 rechaza C7, los textos de librerías y el inglés de Nest', () => {
    expect(mensajePermitido('No se pudo generar el cuestionario tras 3 intentos: Unexpected token }')).toBeNull()
    expect(mensajePermitido('Internal Server Error')).toBeNull()
    expect(mensajePermitido('questionCount must not be greater than 20')).toBeNull()
    expect(mensajePermitido('pdf-parse: bad XRef entry')).toBeNull()
  })

  it('CA-CUE-05 mensajeDeError reemplaza lo que no está en la lista y conserva lo que sí', () => {
    expect(
      mensajeDeError(new ApiError(400, 'No se pudo generar el cuestionario tras 3 intentos: Zod'), TEXTO_GENERACION_RECHAZADA),
    ).toBe(TEXTO_GENERACION_RECHAZADA)
    expect(mensajeDeError(new ApiError(500, 'Internal Server Error'), TEXTO_GENERACION_RECHAZADA)).toBe(
      TEXTO_GENERACION_RECHAZADA,
    )
    expect(mensajeDeError(new ApiError(404, C5_DOCUMENTOS_AJENOS), TEXTO_GENERACION_RECHAZADA)).toBe(C5_DOCUMENTOS_AJENOS)
    expect(mensajeDeError(new ApiError(0, MENSAJE_SIN_CONEXION), TEXTO_GENERACION_RECHAZADA)).toBe(MENSAJE_SIN_CONEXION)
    expect(mensajeDeError(new Error('otro'), MENSAJE_GENERICO)).toBe(MENSAJE_GENERICO)
  })

  it('CA-DOC-05 el motivo del documento solo se muestra si es C4', () => {
    expect(motivoDelDocumento(C4_SIN_TEXTO_LEGIBLE)).toBe(C4_SIN_TEXTO_LEGIBLE)
    expect(motivoDelDocumento('mammoth: not a valid docx')).toBe(TEXTO_DOCUMENTO_CON_ERROR)
    expect(motivoDelDocumento(null)).toBe(TEXTO_DOCUMENTO_CON_ERROR)
  })
})

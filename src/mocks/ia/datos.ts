export type EstadoDocumentoMock = 'processing' | 'ready' | 'error'

export const TIPO_PDF = 'application/pdf'
export const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const TIPO_TXT = 'text/plain'

export const MENSAJE_SIN_TEXTO_LEGIBLE =
  'No se pudo extraer contenido legible del documento (posiblemente escaneado sin OCR).'

export const ID_DOCUMENTO_SUBIDO = 'd0c00000-0000-4000-8000-000000000005'

export type DocumentoMock = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  status: EstadoDocumentoMock
  errorMessage: string | null
  tags: string[]
  createdAt: string
  processedAt: string | null
  consultas: number
  consultasHastaListo: number | null
  etiquetasAlQuedarListo: string[]
}

export type MensajeMock = {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  citedChunkIds: string[]
}

export type SesionMock = {
  id: string
  title: string
  createdAt: string
  documentIds: string[]
  mensajes: MensajeMock[]
  conFuentes: boolean
}

export type DatosIa = { documentos: DocumentoMock[]; sesiones: SesionMock[] }

function crearDocumentos(): DocumentoMock[] {
  return [
    {
      id: 'd0c00000-0000-4000-8000-000000000006',
      filename: 'Reglamento de operaciones.pdf',
      mimeType: TIPO_PDF,
      sizeBytes: 3_145_728,
      status: 'processing',
      errorMessage: null,
      tags: [],
      createdAt: '2026-09-19T08:00:00.000Z',
      processedAt: null,
      consultas: 0,
      consultasHastaListo: null,
      etiquetasAlQuedarListo: [],
    },
    {
      id: 'd0c00000-0000-4000-8000-000000000004',
      filename: 'Apuntes de aerodinámica.txt',
      mimeType: TIPO_TXT,
      sizeBytes: 12_288,
      status: 'processing',
      errorMessage: null,
      tags: [],
      createdAt: '2026-09-19T07:30:00.000Z',
      processedAt: null,
      consultas: 0,
      consultasHastaListo: 3,
      etiquetasAlQuedarListo: ['aerodinámica'],
    },
    {
      id: 'd0c00000-0000-4000-8000-000000000003',
      filename: 'Manual de vuelo escaneado.pdf',
      mimeType: TIPO_PDF,
      sizeBytes: 5_242_880,
      status: 'error',
      errorMessage: MENSAJE_SIN_TEXTO_LEGIBLE,
      tags: [],
      createdAt: '2026-09-18T18:45:00.000Z',
      processedAt: null,
      consultas: 0,
      consultasHastaListo: null,
      etiquetasAlQuedarListo: [],
    },
    {
      id: 'd0c00000-0000-4000-8000-000000000002',
      filename: 'Procedimientos de emergencia.docx',
      mimeType: TIPO_DOCX,
      sizeBytes: 184_320,
      status: 'ready',
      errorMessage: null,
      tags: ['emergencias', 'autorrotación'],
      createdAt: '2026-09-18T16:20:00.000Z',
      processedAt: '2026-09-18T16:20:41.000Z',
      consultas: 0,
      consultasHastaListo: null,
      etiquetasAlQuedarListo: [],
    },
    {
      id: 'd0c00000-0000-4000-8000-000000000001',
      filename: 'PDI EA-510 Título III.pdf',
      mimeType: TIPO_PDF,
      sizeBytes: 2_411_008,
      status: 'ready',
      errorMessage: null,
      tags: ['instrucción', 'maniobras'],
      createdAt: '2026-09-18T14:02:11.000Z',
      processedAt: '2026-09-18T14:02:58.000Z',
      consultas: 0,
      consultasHastaListo: null,
      etiquetasAlQuedarListo: [],
    },
  ]
}

function crearDatos(): DatosIa {
  return { documentos: crearDocumentos(), sesiones: [] }
}

let datosActuales = crearDatos()

export function datosIa(): DatosIa {
  return datosActuales
}

export function reiniciarIaMock() {
  datosActuales = crearDatos()
}

export function buscarDocumento(id: string): DocumentoMock | undefined {
  return datosActuales.documentos.find((documento) => documento.id === id)
}

export function documentoNuevo(filename: string, mimeType: string, sizeBytes: number): DocumentoMock {
  return {
    id: ID_DOCUMENTO_SUBIDO,
    filename,
    mimeType,
    sizeBytes,
    status: 'processing',
    errorMessage: null,
    tags: [],
    createdAt: new Date().toISOString(),
    processedAt: null,
    consultas: 0,
    consultasHastaListo: 3,
    etiquetasAlQuedarListo: ['procedimientos'],
  }
}

export function consultar(documento: DocumentoMock): DocumentoMock {
  if (documento.status !== 'processing') return documento
  documento.consultas += 1
  if (documento.consultasHastaListo !== null && documento.consultas >= documento.consultasHastaListo) {
    documento.status = 'ready'
    documento.tags = documento.etiquetasAlQuedarListo
    documento.processedAt = new Date().toISOString()
  }
  return documento
}

export function documentosOrdenados(): DocumentoMock[] {
  return [...datosActuales.documentos].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

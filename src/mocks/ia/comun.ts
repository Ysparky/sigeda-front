import { HttpResponse } from 'msw'
import { config } from '@/lib/config'
import type { DocumentoMock } from './datos'

export const IA = config.iaApiUrl

export function errorNest(status: number, mensaje: string, error: string) {
  return HttpResponse.json({ statusCode: status, message: mensaje, error }, { status })
}

export function noEncontrado(mensaje: string) {
  return errorNest(404, mensaje, 'Not Found')
}

export function malaPeticion(mensaje: string) {
  return errorNest(400, mensaje, 'Bad Request')
}

export function documentoPublico(documento: DocumentoMock) {
  return {
    id: documento.id,
    filename: documento.filename,
    mimeType: documento.mimeType,
    sizeBytes: documento.sizeBytes,
    status: documento.status,
    errorMessage: documento.errorMessage,
    tags: documento.tags,
    createdAt: documento.createdAt,
    processedAt: documento.processedAt,
  }
}

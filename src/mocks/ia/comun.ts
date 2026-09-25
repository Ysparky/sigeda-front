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

export function errorInterno() {
  return HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 })
}

export function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((elemento): elemento is string => typeof elemento === 'string') : []
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

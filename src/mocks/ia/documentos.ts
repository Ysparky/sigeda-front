import { http, HttpResponse } from 'msw'
import { TAMANO_MAXIMO_BYTES, TAMANO_MAXIMO_MB, TIPOS_ACEPTADOS } from '@/lib/dominio/aprendizaje'
import { documentoPublico, errorNest, IA, malaPeticion, noEncontrado } from './comun'
import { buscarDocumento, consultar, datosIa, documentoNuevo, documentosOrdenados } from './datos'

export const C1_SIN_ARCHIVO = 'No se recibió ningún archivo.'
export const C3_DOCUMENTO_NO_ENCONTRADO = 'Documento no encontrado.'
export const C13_ARCHIVO_GRANDE = `El archivo supera el tamaño máximo de ${TAMANO_MAXIMO_MB} MB.`

function tipoSoportado(mimeType: string): boolean {
  return TIPOS_ACEPTADOS.some((tipo) => tipo.mimeType === mimeType)
}

export const handlersDocumentos = [
  http.post(`${IA}/documents/upload`, async ({ request }) => {
    const formulario = await request.formData()
    const archivo = formulario.get('file')
    if (!(archivo instanceof File)) return malaPeticion(C1_SIN_ARCHIVO)
    if (archivo.size > TAMANO_MAXIMO_BYTES) return errorNest(413, C13_ARCHIVO_GRANDE, 'Payload Too Large')
    if (!tipoSoportado(archivo.type)) {
      return malaPeticion(`Tipo de archivo no soportado: ${archivo.type}. Solo se aceptan PDF, DOCX y TXT.`)
    }
    const nuevo = documentoNuevo(archivo.name, archivo.type, archivo.size)
    datosIa().documentos = [...datosIa().documentos.filter((documento) => documento.id !== nuevo.id), nuevo]
    return HttpResponse.json(documentoPublico(nuevo), { status: 201 })
  }),
  http.get(`${IA}/documents`, () => HttpResponse.json(documentosOrdenados().map(consultar).map(documentoPublico))),
  http.get(`${IA}/documents/:id`, ({ params }) => {
    const documento = buscarDocumento(String(params.id))
    if (!documento) return noEncontrado(C3_DOCUMENTO_NO_ENCONTRADO)
    return HttpResponse.json(documentoPublico(consultar(documento)))
  }),
  http.delete(`${IA}/documents/:id`, ({ params }) => {
    const documento = buscarDocumento(String(params.id))
    if (!documento) return noEncontrado(C3_DOCUMENTO_NO_ENCONTRADO)
    datosIa().documentos = datosIa().documentos.filter((candidato) => candidato.id !== documento.id)
    return HttpResponse.json({ deleted: true })
  }),
]

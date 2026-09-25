import { ApiError, MENSAJE_SIN_CONEXION, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { TEXTO_DOCUMENTO_CON_ERROR } from '@/lib/dominio/aprendizaje'

export const C1_SIN_ARCHIVO = 'No se recibió ningún archivo.'
export const C3_DOCUMENTO_NO_ENCONTRADO = 'Documento no encontrado.'
export const C4_SIN_TEXTO_LEGIBLE =
  'No se pudo extraer contenido legible del documento (posiblemente escaneado sin OCR).'
export const C5_DOCUMENTOS_AJENOS = 'Uno o más documentos no existen o no te pertenecen.'
export const C8_CUESTIONARIO_NO_ENCONTRADO = 'Cuestionario no encontrado.'
export const C9_SESION_NO_ENCONTRADA = 'Sesión de chat no encontrada.'
export const C10_SIN_RESPUESTA = 'No se pudo generar una respuesta. Intenta reformular tu pregunta.'

export const PREFIJO_C2_TIPO_NO_SOPORTADO = 'Tipo de archivo no soportado:'
export const PREFIJO_C6_DOCUMENTOS_NO_LISTOS = 'Los siguientes documentos aún no están listos:'
export const PREFIJO_C13_ARCHIVO_GRANDE = 'El archivo supera el tamaño máximo'

const EXACTOS: readonly string[] = [
  C1_SIN_ARCHIVO,
  C3_DOCUMENTO_NO_ENCONTRADO,
  C4_SIN_TEXTO_LEGIBLE,
  C5_DOCUMENTOS_AJENOS,
  C8_CUESTIONARIO_NO_ENCONTRADO,
  C9_SESION_NO_ENCONTRADA,
  C10_SIN_RESPUESTA,
  MENSAJE_SIN_CONEXION,
  MENSAJE_SIN_PERMISO,
]

const PREFIJOS: readonly string[] = [
  PREFIJO_C2_TIPO_NO_SOPORTADO,
  PREFIJO_C6_DOCUMENTOS_NO_LISTOS,
  PREFIJO_C13_ARCHIVO_GRANDE,
]

export function mensajePermitido(mensaje: string): string | null {
  const limpio = mensaje.trim()
  if (EXACTOS.includes(limpio)) return limpio
  return PREFIJOS.some((prefijo) => limpio.startsWith(prefijo)) ? limpio : null
}

export function mensajeDeError(error: unknown, alternativo: string): string {
  return (error instanceof ApiError ? mensajePermitido(error.message) : null) ?? alternativo
}

export function motivoDelDocumento(errorMessage: string | null): string {
  return errorMessage !== null && errorMessage.trim() === C4_SIN_TEXTO_LEGIBLE
    ? C4_SIN_TEXTO_LEGIBLE
    : TEXTO_DOCUMENTO_CON_ERROR
}

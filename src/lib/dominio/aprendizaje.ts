export const TEXTO_DOCUMENTOS_COMPARTIDOS =
  'Los documentos son compartidos: el servidor de Aprendizaje todavía no identifica a cada usuario.'
export const TEXTO_CUESTIONARIO_REINICIADO =
  'El cuestionario se reinició: las respuestas no se guardan al recargar la página.'
export const TEXTO_GENERANDO_CUESTIONARIO =
  'Generando el cuestionario. Puede tardar hasta dos minutos; no cierre esta página.'
export const TEXTO_GENERACION_DEMORADA =
  'La generación tardó demasiado. Intente de nuevo con menos preguntas o menos documentos.'
export const TEXTO_GENERACION_RECHAZADA =
  'No se pudo generar el cuestionario con los documentos elegidos. Intente de nuevo o elija otro documento.'
export const TEXTO_DOCUMENTO_SIGUE_PROCESANDO = 'El documento sigue procesándose. Actualice para ver su estado.'
export const TEXTO_CONVERSACION_ILEGIBLE = 'No se pudo recuperar la conversación. Inicie una nueva consulta.'
export const TEXTO_FUENTES_NO_DISPONIBLES =
  'Las fuentes de las respuestas anteriores no están disponibles después de recargar.'
export const TEXTO_RESPUESTA_SIN_FUENTES =
  'No se encontraron fragmentos relevantes en los documentos seleccionados para esta pregunta.'
export const TEXTO_CUESTIONARIO_SIN_NOTA = 'El cuestionario de práctica no se registra: su nota es solo para estudiar.'
export const TEXTO_ARCHIVO_RECHAZADO = 'Solo se aceptan archivos PDF, DOCX o TXT de hasta 25 MB.'
export const TEXTO_ARCHIVO_VACIO = 'El archivo está vacío.'
export const TEXTO_DOCUMENTO_CON_ERROR = 'No se pudo procesar el documento. Elimínelo y vuelva a subirlo.'
export const TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO =
  'Se eliminará el documento. Los cuestionarios ya generados se conservan, pero las consultas que lo usan se quedarán sin esa fuente.'
export const TEXTO_SIN_DOCUMENTOS =
  'Todavía no hay documentos. Suba un archivo PDF, DOCX o TXT para generar cuestionarios y hacer consultas.'
export const TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO =
  'No hay documentos listos para generar un cuestionario. Suba uno en Documentos y espere a que termine de procesarse.'
export const TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS =
  'No hay documentos listos para consultar. Suba uno en Documentos y espere a que termine de procesarse.'

export const MENSAJE_DOCUMENTO_SUBIDO = 'Documento subido. Aparecerá como Procesando hasta que termine.'

export const MENSAJE_DOCUMENTO_ELIMINADO = 'Documento eliminado.'

export const TIPOS_ACEPTADOS = [
  { extension: '.pdf', mimeType: 'application/pdf', etiqueta: 'PDF' },
  {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    etiqueta: 'DOCX',
  },
  { extension: '.txt', mimeType: 'text/plain', etiqueta: 'TXT' },
] as const

export const TAMANO_MAXIMO_MB = 25

export const TAMANO_MAXIMO_BYTES = TAMANO_MAXIMO_MB * 1024 * 1024

export function etiquetaDeTipo(mimeType: string): string {
  return TIPOS_ACEPTADOS.find((tipo) => tipo.mimeType === mimeType)?.etiqueta ?? '—'
}

export function formatearTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function motivoDeRechazo(archivo: { name: string; size: number }): string | null {
  const nombre = archivo.name.toLowerCase()
  const extensionValida = TIPOS_ACEPTADOS.some((tipo) => nombre.endsWith(tipo.extension))
  if (!extensionValida || archivo.size > TAMANO_MAXIMO_BYTES) return TEXTO_ARCHIVO_RECHAZADO
  return archivo.size === 0 ? TEXTO_ARCHIVO_VACIO : null
}

export function normalizarRespuesta(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
}

export function respuestaCorrecta(tipo: string, correcta: string, dada: string): boolean {
  return tipo === 'fill_blank' ? normalizarRespuesta(dada) === normalizarRespuesta(correcta) : dada === correcta
}

export const MARCADOR_COMPLETAR = '_____'

export type TrozoDeRespuesta = { texto: string; cita: number | null }

const PATRON_CITA = /\[(\d+)\]/g

export function trozosConCitas(contenido: string, cantidadDeFuentes: number): TrozoDeRespuesta[] {
  const trozos: TrozoDeRespuesta[] = []
  let ultimo = 0
  for (const coincidencia of contenido.matchAll(PATRON_CITA)) {
    const indice = coincidencia.index
    const numero = Number(coincidencia[1])
    const enRango = numero >= 1 && numero <= cantidadDeFuentes
    if (!enRango) continue
    if (indice > ultimo) trozos.push({ texto: contenido.slice(ultimo, indice), cita: null })
    trozos.push({ texto: coincidencia[0], cita: numero })
    ultimo = indice + coincidencia[0].length
  }
  if (ultimo < contenido.length) trozos.push({ texto: contenido.slice(ultimo), cita: null })
  return trozos
}

export function porcentajeDeSimilitud(similitud: number | null): string | null {
  return similitud === null ? null : `${Math.round(similitud * 100)} %`
}

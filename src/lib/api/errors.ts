export type ErroresDeCampo = Record<string, string>

export class ApiError extends Error {
  readonly status: number
  readonly erroresDeCampo: ErroresDeCampo

  constructor(status: number, mensaje: string, erroresDeCampo: ErroresDeCampo = {}) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.erroresDeCampo = erroresDeCampo
  }
}

export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor.'
export const MENSAJE_SIN_PERMISO = 'No tiene permisos para esta acción.'
export const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intente nuevamente.'
export const MENSAJE_REVISAR_CAMPOS = 'Revise los campos marcados.'

const PATRON_CAMPO = /^'([^']+)':\s*(.+)$/

export function parsearErroresDeCampo(lineas: readonly string[]) {
  const campos: ErroresDeCampo = {}
  const otros: string[] = []
  for (const linea of lineas) {
    const coincidencia = PATRON_CAMPO.exec(linea)
    if (coincidencia) {
      const [, campo, mensaje] = coincidencia
      campos[campo] ??= mensaje
    } else {
      otros.push(linea)
    }
  }
  return { campos, otros }
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function esListaDeTextos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((elemento) => typeof elemento === 'string')
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim() !== ''
}

function desdeLineas(status: number, lineas: readonly string[]) {
  const { campos, otros } = parsearErroresDeCampo(lineas)
  return new ApiError(status, otros[0] ?? MENSAJE_REVISAR_CAMPOS, campos)
}

function mensajeDeRegla(cuerpo: Record<string, unknown>): string | null {
  if ('error' in cuerpo) return null
  const valor = cuerpo.mensaje ?? cuerpo['mensaje:']
  if (esTexto(valor)) return valor.trim()
  if (esListaDeTextos(valor) && valor.length > 0) return valor.join(' ')
  return null
}

function errorDelServidor(status: number, cuerpo: unknown): ApiError {
  if (esTexto(cuerpo)) {
    console.error(cuerpo)
    return new ApiError(status, MENSAJE_GENERICO)
  }
  if (esRegistro(cuerpo)) {
    if ('mensaje' in cuerpo) console.error(cuerpo.mensaje)
    if ('message' in cuerpo) console.error(cuerpo.message)
    if (esTexto(cuerpo.error)) return new ApiError(status, cuerpo.error)
  }
  return new ApiError(status, MENSAJE_GENERICO)
}

export function normalizarError(status: number, cuerpo: unknown): ApiError {
  if (status >= 500) return errorDelServidor(status, cuerpo)
  if (esRegistro(cuerpo)) {
    const regla = mensajeDeRegla(cuerpo)
    if (regla) return new ApiError(status, regla)
  }
  if (status === 403) return new ApiError(status, MENSAJE_SIN_PERMISO)
  if (esListaDeTextos(cuerpo)) return desdeLineas(status, cuerpo)
  if (esTexto(cuerpo)) return new ApiError(status, cuerpo.trim())
  if (esRegistro(cuerpo)) {
    if (typeof cuerpo.error === 'string' && typeof cuerpo.mensaje === 'string') {
      console.error(cuerpo.mensaje)
      return new ApiError(status, cuerpo.error)
    }
    if ('statusCode' in cuerpo) {
      if (esTexto(cuerpo.message)) return new ApiError(status, cuerpo.message)
      if (esListaDeTextos(cuerpo.message)) return new ApiError(status, cuerpo.message.join('. '))
    }
    if (esListaDeTextos(cuerpo.messages) && cuerpo.messages.length > 0) return desdeLineas(status, cuerpo.messages)
    if (esTexto(cuerpo.message)) return new ApiError(status, cuerpo.message.trim())
    if (esTexto(cuerpo.error)) return new ApiError(status, cuerpo.error.trim())
  }
  return new ApiError(status, MENSAJE_GENERICO)
}

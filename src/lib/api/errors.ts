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

export function normalizarError(status: number, cuerpo: unknown): ApiError {
  if (status === 403) return new ApiError(status, MENSAJE_SIN_PERMISO)
  if (esListaDeTextos(cuerpo)) {
    const { campos, otros } = parsearErroresDeCampo(cuerpo)
    return new ApiError(status, otros[0] ?? MENSAJE_REVISAR_CAMPOS, campos)
  }
  if (typeof cuerpo === 'string' && cuerpo.trim() !== '') return new ApiError(status, cuerpo.trim())
  if (esRegistro(cuerpo)) {
    if (typeof cuerpo.error === 'string' && typeof cuerpo.mensaje === 'string') {
      console.error(cuerpo.mensaje)
      return new ApiError(status, cuerpo.error)
    }
    if (typeof cuerpo.message === 'string') return new ApiError(status, cuerpo.message)
    if (esListaDeTextos(cuerpo.message)) return new ApiError(status, cuerpo.message.join('. '))
  }
  return new ApiError(status, MENSAJE_GENERICO)
}

import { config } from './config'

export const MENSAJE_DEPENDENCIA_PENDIENTE = 'No disponible: el servidor aún no realiza esta acción de forma segura.'

export const DEPENDENCIAS = {
  registrarPersona: [22],
  eliminarPersona: [30],
  modificarManiobra: [32, 33],
  eliminarFase: [37],
} as const

export type AccionConDependencia = keyof typeof DEPENDENCIAS

export function parsearDependencias(valor: string | undefined): Set<number> {
  return new Set(
    (valor ?? '')
      .split(',')
      .map((parte) => Number(parte.trim()))
      .filter((numero) => Number.isInteger(numero) && numero > 0),
  )
}

export function dependenciasPendientes(accion: AccionConDependencia): number[] {
  if (config.mockApi) return []
  const resueltas = parsearDependencias(config.dependenciasResueltas)
  return DEPENDENCIAS[accion].filter((numero) => !resueltas.has(numero))
}

export function accionDisponible(accion: AccionConDependencia): boolean {
  return dependenciasPendientes(accion).length === 0
}

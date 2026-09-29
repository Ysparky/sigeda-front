import { config } from './config'

export const MENSAJE_DEPENDENCIA_PENDIENTE = 'No disponible: el servidor aún no realiza esta acción de forma segura.'

export const DEPENDENCIAS = {
  registrarPersona: [22],
  eliminarPersona: [30],
  modificarManiobra: [32, 33],
  eliminarFase: [37],
  subirDocumento: [39],
  eliminarDocumento: [39],
  gestionarMaterias: [5],
  gestionarPreguntas: [6],
  importarPreguntas: [6],
  programarTurnoTeorico: [6],
  rendirExamen: [6],
  bloqueoSubsanacion: [7],
  // LA 62 NO VA ACÁ, Y ES UNA DISTINCIÓN DE FONDO: el servidor **sí** calcula la mitad teórica
  // (NIT, NCT, NEI) con los coeficientes reales de las materias, que son dato institucional
  // publicado. Lo que la 62 traba es la tabla de coeficientes de MISIÓN, que el PDI nunca publicó, y
  // sin ella el servidor devuelve `nfpi` y `nia` en `null` diciendo por qué. Tenerlas juntas tapaba
  // el NIT con un aviso que además afirmaba algo falso («el servidor todavía no calcula los
  // índices»). El orden de mérito sí pide la 62, porque no se puede ordenar por un índice que no se
  // puede calcular — y **desde el 28 sep 2026 la 62 está resuelta**: el servidor tiene el catálogo de
  // misiones del programa con sus coeficientes y devuelve el NFPI con un número (16.34 para 555555,
  // sobre la estructura de la Tabla 4). La
  // compuerta sigue declarada así porque la condición es real, no porque falte: si un día el servidor
  // deja de calcular el NFPI, el orden de mérito tiene que volver a cerrarse solo.
  verIndices: [61],
  verAlertas: [66],
  verOrdenMerito: [6, 62, 63],
  verCicloChequeo: [64, 65],
  verHistorialTeorico: [6, 67],
  verCausalesTeoricos: [7, 68],
  verBloqueoTeoricoLote: [7, 56],
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

export const MOTIVO_NO_ES_ULTIMA = 'Solo la última evaluación del alumno puede modificarse o eliminarse.'

export type EvaluacionFechada = { codigo: string; fecha: string }

function clave(evaluacion: EvaluacionFechada): [string, number, number] {
  const [, turno, correlativo] = evaluacion.codigo.split('-')
  return [evaluacion.fecha, Number(turno ?? 0), Number(correlativo ?? 0)]
}

function comparar(a: EvaluacionFechada, b: EvaluacionFechada): number {
  const [fechaA, turnoA, correlativoA] = clave(a)
  const [fechaB, turnoB, correlativoB] = clave(b)
  if (fechaA !== fechaB) return fechaA < fechaB ? -1 : 1
  if (turnoA !== turnoB) return turnoA - turnoB
  return correlativoA - correlativoB
}

export function ultimaEvaluacion(evaluaciones: readonly EvaluacionFechada[]): string | null {
  if (evaluaciones.length === 0) return null
  return [...evaluaciones].sort(comparar).at(-1)?.codigo ?? null
}

export function codigoDeTurno(codAlumno: string, idTurno: number): string {
  return `${codAlumno}-${idTurno}`
}

export function perteneceAlTurno(codigo: string, codAlumno: string, idTurno: number): boolean {
  const base = codigoDeTurno(codAlumno, idTurno)
  return codigo === base || codigo.startsWith(`${base}-`)
}

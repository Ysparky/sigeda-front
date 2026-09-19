import { esHora, esPosteriorAHoy } from './calendario'

export const MOTIVO_TURNO_VENCIDO = 'El turno ya no se puede modificar porque su fecha pasó.'

export type Intervalo = { horaInicio: string; horaFin: string }

export type Ocupacion = Intervalo & { idTurno: number; nombre: string }

export type Conflicto = { indice: number; ocupacion: Ocupacion }

export function permiteCambios(fechaEval: string, ahora: Date = new Date()): boolean {
  return esPosteriorAHoy(fechaEval, ahora)
}

export function seSuperponen(a: Intervalo, b: Intervalo): boolean {
  return a.horaInicio < b.horaFin && b.horaInicio < a.horaFin
}

export function conflictosDeAeronave(
  horarios: readonly Intervalo[],
  ocupaciones: readonly Ocupacion[],
  idTurnoPropio?: number,
): Conflicto[] {
  return horarios.flatMap((horario, indice) => {
    if (!esHora(horario.horaInicio) || !esHora(horario.horaFin) || horario.horaFin <= horario.horaInicio) return []
    return ocupaciones
      .filter((ocupacion) => ocupacion.idTurno !== idTurnoPropio && seSuperponen(horario, ocupacion))
      .map((ocupacion) => ({ indice, ocupacion }))
  })
}

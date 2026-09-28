import { esHora, esPosteriorAHoy } from './calendario'

export const MOTIVO_TURNO_VENCIDO = 'El turno ya no se puede modificar porque su fecha pasó.'

export const TEXTO_TURNO_SIN_MISION = 'Sin misión asignada'
export const TEXTO_MISION_PONDERA_LA_SUBFASE =
  'Es la misión del PDI que este turno cubre. Sin ella la nota de sub fase sale como promedio simple, no ponderada por el coeficiente de cada misión.'
/**
 * No es una advertencia defensiva: `GET /api/turnos/{id}` no publica `idMision`, así que el
 * formulario no puede recuperar la que ya tenía, y el `PUT` escribe el campo tal cual llega. Quien
 * modifica el turno sin volver a elegirla la pierde, y tiene que saberlo antes de guardar.
 */
export const TEXTO_MISION_AL_MODIFICAR =
  'El servidor no informa la misión que el turno ya tenía: si la deja sin asignar, la asignación anterior se borra al guardar.'

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

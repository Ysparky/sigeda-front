import { restarHoras } from '@/lib/dominio/calendario'
import type { TurnoDetalle } from './api'

export type VueloDelDia = {
  idTurno: number
  turno: string
  subfase: string
  instructor: string | null
  codAlumno: string
  alumno: string
  horaInicio: string
  horaFin: string
}

export type VuelosDeAeronave = { aeronave: string; vuelos: VueloDelDia[] }

export const SIN_AERONAVE = 'Sin aeronave asignada'

export function ordenDeVuelo(turnos: readonly TurnoDetalle[]): VuelosDeAeronave[] {
  const porAeronave = new Map<string, VueloDelDia[]>()
  for (const turno of turnos) {
    const aeronave = turno.aeronave?.nombre ?? SIN_AERONAVE
    const vuelos = turno.alumnos.map((alumno) => ({
      idTurno: turno.id,
      turno: turno.nombre,
      subfase: turno.subfase,
      instructor: turno.instructor,
      ...alumno,
    }))
    porAeronave.set(aeronave, [...(porAeronave.get(aeronave) ?? []), ...vuelos])
  }
  return [...porAeronave.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([aeronave, vuelos]) => ({
      aeronave,
      vuelos: [...vuelos].sort(
        (a, b) => a.horaInicio.localeCompare(b.horaInicio) || a.alumno.localeCompare(b.alumno, 'es'),
      ),
    }))
}

export function horaDelBriefingDiario(grupos: readonly VuelosDeAeronave[]): string | null {
  const primera = grupos
    .flatMap((grupo) => grupo.vuelos.map((vuelo) => vuelo.horaInicio))
    .sort()
    .at(0)
  return primera ? restarHoras(primera, 2) : null
}

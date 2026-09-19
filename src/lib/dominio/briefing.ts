import { momento, restarHoras } from './calendario'
import type { NotaDirbe } from './dirbe'

export const EXPLICA_INSTRUCTOR = 'Explica: Instructor'
export const EXPONE_ALUMNO = 'Expone: Alumno'

export type Responsable = typeof EXPLICA_INSTRUCTOR | typeof EXPONE_ALUMNO

export function responsableDeManiobra(notaMinima: NotaDirbe): Responsable {
  return notaMinima === 'B' || notaMinima === 'E' ? EXPONE_ALUMNO : EXPLICA_INSTRUCTOR
}

export type ClaveEtapa = 'briefing-diario' | 'briefing-detalle' | 'vuelo' | 'debriefing'

export type EtapaMision = { clave: ClaveEtapa; titulo: string; detalle: string; hecha: boolean }

export type VueloProgramado = { fechaEval: string; horaInicio: string; horaFin: string }

export function etapasDeMision(vuelo: VueloProgramado, evaluada: boolean, ahora: Date = new Date()): EtapaMision[] {
  const briefingDiario = restarHoras(vuelo.horaInicio, 2)
  const briefingDetalle = restarHoras(vuelo.horaInicio, 1)
  const ocurrio = (hora: string) => evaluada || ahora >= momento(vuelo.fechaEval, hora)
  return [
    {
      clave: 'briefing-diario',
      titulo: 'Briefing diario',
      detalle: `T−2 h · ${briefingDiario}`,
      hecha: ocurrio(briefingDiario),
    },
    {
      clave: 'briefing-detalle',
      titulo: 'Briefing de detalle',
      detalle: `T−1 h · ${briefingDetalle}`,
      hecha: ocurrio(briefingDetalle),
    },
    {
      clave: 'vuelo',
      titulo: 'Vuelo',
      detalle: `${vuelo.horaInicio} – ${vuelo.horaFin}`,
      hecha: ocurrio(vuelo.horaFin),
    },
    {
      clave: 'debriefing',
      titulo: 'Debriefing',
      detalle: evaluada ? 'Evaluación registrada' : 'Evaluación pendiente',
      hecha: evaluada,
    },
  ]
}

import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { esFechaIso, esHora, momento, PATRON_HORA } from '@/lib/dominio/calendario'
import {
  ESTADOS_TURNO,
  exigeTurnoOrigen,
  PUNTAJE_TOTAL_EXAMEN,
  TIPOS_EXAMEN,
  VENTANA_MINIMA_MINUTOS,
} from '@/lib/dominio/teoria'
import type { CuerpoTurnoTeorico, TurnoTeoricoDetalle } from './api'

const MENSAJE_PUNTAJE = 'El puntaje debe ser un entero entre 1 y 20.'

export const esquemaBusquedaTurnosTeoricos = z.object({
  ...esquemaPaginacion,
  idGrupo: numeroOpcional,
  idMateria: numeroOpcional,
  estado: z.enum(ESTADOS_TURNO).optional().catch(undefined),
  tipoExamen: z
    .enum(TIPOS_EXAMEN.map((tipo) => tipo.valor))
    .optional()
    .catch(undefined),
  fechaPre: fechaOpcional,
  fechaPost: fechaOpcional,
})

export type BusquedaTurnosTeoricos = z.infer<typeof esquemaBusquedaTurnosTeoricos>

const MENSAJE_NOMBRE = 'El nombre debe tener entre 10 y 60 caracteres.'
const MENSAJE_HORA = 'La hora debe estar en formato HH:mm (09:00, 14:00)'

export function crearEsquemaTurnoTeorico(ahora: Date) {
  return z
    .object({
      nombre: z.string().trim().min(1, 'El nombre es obligatorio').min(10, MENSAJE_NOMBRE).max(60, MENSAJE_NOMBRE),
      programa: z.enum(PROGRAMAS),
      idMateria: z.string().min(1, 'La materia es obligatoria.'),
      tipoExamen: z.enum(TIPOS_EXAMEN.map((tipo) => tipo.valor)),
      idGrupo: z.string().min(1, 'El grupo es obligatorio.'),
      fechaExamen: z.string().refine(esFechaIso, 'La fecha del examen es obligatoria.'),
      horaInicio: z.string().regex(PATRON_HORA, MENSAJE_HORA),
      horaFin: z.string().regex(PATRON_HORA, MENSAJE_HORA),
      idTurnoOrigen: z.string(),
      preguntas: z
        .array(
          z.object({
            idPregunta: z.string().min(1, 'Elija una pregunta.'),
            puntajeMaximo: z
              .string()
              .regex(/^\d{1,2}$/, MENSAJE_PUNTAJE)
              .refine((valor) => Number(valor) >= 1 && Number(valor) <= PUNTAJE_TOTAL_EXAMEN, MENSAJE_PUNTAJE),
          }),
        )
        .min(1, 'Debe elegir al menos una pregunta.'),
    })
    .superRefine((valores, contexto) => {
      if (esFechaIso(valores.fechaExamen) && esHora(valores.horaInicio)) {
        if (momento(valores.fechaExamen, valores.horaInicio) <= ahora) {
          contexto.addIssue({ code: 'custom', message: 'El examen debe comenzar en el futuro.', path: ['fechaExamen'] })
        }
      }
      if (esHora(valores.horaInicio) && esHora(valores.horaFin) && minutosEntre(valores.horaInicio, valores.horaFin) < VENTANA_MINIMA_MINUTOS) {
        contexto.addIssue({
          code: 'custom',
          message: 'La ventana del examen debe durar al menos 10 minutos.',
          path: ['horaFin'],
        })
      }
      if (exigeTurnoOrigen(valores.tipoExamen) && valores.idTurnoOrigen === '') {
        contexto.addIssue({
          code: 'custom',
          message: 'El turno de origen es obligatorio para una subsanación o un rezagado.',
          path: ['idTurnoOrigen'],
        })
      }
      const ids = valores.preguntas.map((pregunta) => pregunta.idPregunta)
      ids.forEach((id, indice) => {
        if (id !== '' && ids.indexOf(id) !== indice) {
          contexto.addIssue({
            code: 'custom',
            message: 'No se puede repetir una pregunta.',
            path: ['preguntas', indice, 'idPregunta'],
          })
        }
      })
    })
}

export type ValoresTurnoTeorico = z.input<ReturnType<typeof crearEsquemaTurnoTeorico>>

export function minutosEntre(horaInicio: string, horaFin: string): number {
  const [hi, mi] = horaInicio.split(':').map(Number)
  const [hf, mf] = horaFin.split(':').map(Number)
  return hf * 60 + mf - (hi * 60 + mi)
}

export function puntajeAsignado(valores: ValoresTurnoTeorico): number {
  return valores.preguntas.reduce((total, pregunta) => total + (Number(pregunta.puntajeMaximo) || 0), 0)
}

export function turnoTeoricoVacio(): ValoresTurnoTeorico {
  return {
    nombre: '',
    programa: 'PDI',
    idMateria: '',
    tipoExamen: 'TEST',
    idGrupo: '',
    fechaExamen: '',
    horaInicio: '',
    horaFin: '',
    idTurnoOrigen: '',
    preguntas: [],
  }
}

export function valoresDesdeTurnoTeorico(turno: TurnoTeoricoDetalle): ValoresTurnoTeorico {
  return {
    nombre: turno.nombre,
    programa: turno.grupo.programa,
    idMateria: String(turno.materia.id),
    tipoExamen: turno.tipoExamen,
    idGrupo: String(turno.grupo.id),
    fechaExamen: turno.fechaExamen,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    idTurnoOrigen: turno.turnoOrigen === null ? '' : String(turno.turnoOrigen.id),
    preguntas: turno.preguntas.map((pregunta) => ({
      idPregunta: String(pregunta.idPregunta),
      puntajeMaximo: String(pregunta.puntajeMaximo),
    })),
  }
}

export function aCuerpoTurnoTeorico(valores: ValoresTurnoTeorico, codInstructor: string): CuerpoTurnoTeorico {
  return {
    codInstructor,
    nombre: valores.nombre.trim(),
    programa: valores.programa,
    idMateria: Number(valores.idMateria),
    tipoExamen: valores.tipoExamen,
    fechaExamen: valores.fechaExamen,
    horaInicio: valores.horaInicio,
    horaFin: valores.horaFin,
    idGrupo: Number(valores.idGrupo),
    idTurnoOrigen: valores.idTurnoOrigen === '' ? null : Number(valores.idTurnoOrigen),
    preguntas: valores.preguntas.map((pregunta) => ({
      idPregunta: Number(pregunta.idPregunta),
      puntajeMaximo: Number(pregunta.puntajeMaximo),
    })),
  }
}

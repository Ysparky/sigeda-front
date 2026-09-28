import { z } from 'zod'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { esFechaIso, esHora, PATRON_HORA } from '@/lib/dominio/calendario'
import { esNotaDirbe } from '@/lib/dominio/dirbe'
import type { CuerpoTurno, TurnoDetalle } from './api'

export const esquemaBusquedaTurnos = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idSubfase: numeroOpcional,
  desde: fechaOpcional,
  hasta: fechaOpcional,
})

export type BusquedaTurnos = z.infer<typeof esquemaBusquedaTurnos>

export const esquemaBusquedaPaginada = z.object(esquemaPaginacion)

export const MENSAJE_NOMBRE_TURNO = 'Nombre debe tener de 10 a 30 caracteres.'
export const MENSAJE_HORA = 'La hora debe estar en formato HH:mm (09:00, 14:00)'

function marcarRepetidos(
  valores: string[],
  lista: 'alumnosTurno' | 'maniobrasTurno',
  campo: 'codAlumno' | 'idManiobra',
  mensaje: string,
  contexto: z.RefinementCtx,
) {
  const vistos = new Set<string>()
  valores.forEach((valor, indice) => {
    if (valor !== '' && vistos.has(valor)) contexto.addIssue({ code: 'custom', message: mensaje, path: [lista, indice, campo] })
    vistos.add(valor)
  })
}

export function crearEsquemaTurno(hoy: string, aeronavesDisponibles: ReadonlySet<number>) {
  return z
    .object({
      nombre: z.string().trim().min(1, 'Ingrese el nombre del turno.').min(10, MENSAJE_NOMBRE_TURNO).max(30, MENSAJE_NOMBRE_TURNO),
      fechaEval: z
        .string()
        .refine(esFechaIso, 'Ingresar fecha válida.')
        .refine((fecha) => fecha > hoy, 'La fecha del turno debe ser posterior a hoy.'),
      programa: z.string().refine((valor) => valor === 'PDI' || valor === 'PDE', 'Ingresar programa válido.'),
      idSubfase: z.string().min(1, 'La subfase es requerida.'),
      // La misión del PDI es opcional en el servidor y acá también: un turno puede programarse sin
      // ella, y entonces su nota de sub fase sale como promedio simple en vez de ponderada.
      idMision: z.string(),
      codInstructor: z.string().min(1, 'Instructor debe ser asignado.'),
      idAeronave: z
        .string()
        .min(1, 'La asignación de aeronave es requerida.')
        .refine((valor) => valor === '' || aeronavesDisponibles.has(Number(valor)), 'Asignar aeronave disponible.'),
      alumnosTurno: z
        .array(
          z.object({
            codAlumno: z.string().min(1, 'Seleccione un alumno.'),
            horaInicio: z.string().regex(PATRON_HORA, MENSAJE_HORA),
            horaFin: z.string().regex(PATRON_HORA, MENSAJE_HORA),
          }),
        )
        .min(1, 'La asignación de alumnos es requerida'),
      maniobrasTurno: z
        .array(
          z.object({
            idManiobra: z.string().min(1, 'Seleccione una maniobra.'),
            notaMin: z.string().refine(esNotaDirbe, 'Ingresar nota mínima de maniobra.'),
          }),
        )
        .min(1, 'La asignación de maniobras es requerida'),
    })
    .superRefine((valores, contexto) => {
      valores.alumnosTurno.forEach((alumno, indice) => {
        if (esHora(alumno.horaInicio) && esHora(alumno.horaFin) && alumno.horaFin <= alumno.horaInicio) {
          contexto.addIssue({
            code: 'custom',
            message: 'La hora de fin debe ser posterior a la de inicio.',
            path: ['alumnosTurno', indice, 'horaFin'],
          })
        }
      })
      marcarRepetidos(
        valores.alumnosTurno.map((alumno) => alumno.codAlumno),
        'alumnosTurno',
        'codAlumno',
        'El alumno está repetido.',
        contexto,
      )
      marcarRepetidos(
        valores.maniobrasTurno.map((maniobra) => maniobra.idManiobra),
        'maniobrasTurno',
        'idManiobra',
        'La maniobra está repetida.',
        contexto,
      )
    })
}

export type ValoresTurno = z.input<ReturnType<typeof crearEsquemaTurno>>

export function turnoVacio(programa: Programa = 'PDI'): ValoresTurno {
  return {
    nombre: '',
    fechaEval: '',
    programa,
    idSubfase: '',
    idMision: '',
    codInstructor: '',
    idAeronave: '',
    alumnosTurno: [],
    maniobrasTurno: [],
  }
}

/**
 * `idMision` arranca VACÍO al modificar y no se puede hacer mejor: `GET /api/turnos/{id}` no publica
 * la misión asignada (comprobado con curl: la respuesta del `PUT` la trae, el `GET` no), así que el
 * formulario no tiene de dónde leerla. El campo se manda igual —`null` si queda vacío— porque el
 * `PUT` reemplaza y omitirlo borraría la asignación sin decírselo a nadie; con el selector a la vista
 * la pérdida se ve y se puede volver a elegir.
 */
export function valoresDesdeTurno(turno: TurnoDetalle, idSubfase: number | undefined): ValoresTurno {
  return {
    nombre: turno.nombre,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    idSubfase: idSubfase === undefined ? '' : String(idSubfase),
    idMision: '',
    codInstructor: turno.codInstructor ?? '',
    idAeronave: turno.aeronave ? String(turno.aeronave.id) : '',
    alumnosTurno: turno.alumnos.map(({ codAlumno, horaInicio, horaFin }) => ({ codAlumno, horaInicio, horaFin })),
    maniobrasTurno: turno.maniobras.map((item) => ({ idManiobra: String(item.maniobra.id), notaMin: item.notaMin })),
  }
}

export function aCuerpoTurno(valores: ValoresTurno): CuerpoTurno {
  return {
    nombre: valores.nombre.trim(),
    fechaEval: valores.fechaEval,
    programa: valores.programa === 'PDE' ? 'PDE' : 'PDI',
    idSubfase: Number(valores.idSubfase),
    idMision: valores.idMision === '' ? null : Number(valores.idMision),
    codInstructor: valores.codInstructor,
    aeronave: { id: Number(valores.idAeronave) },
    alumnosTurno: valores.alumnosTurno.map(({ codAlumno, horaInicio, horaFin }) => ({ codAlumno, horaInicio, horaFin })),
    maniobrasTurno: valores.maniobrasTurno.flatMap((maniobra) =>
      esNotaDirbe(maniobra.notaMin) ? [{ idManiobra: Number(maniobra.idManiobra), nota_min: maniobra.notaMin }] : [],
    ),
  }
}

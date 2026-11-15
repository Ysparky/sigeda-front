import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

const num = z.number().nullish().transform((v) => v ?? null)
const txt = z.string().nullish().transform((v) => v ?? null)

const esquemaCohorte = z.object({
  id: z.number(),
  nombre: z.string(),
  estado: txt,
  instructor: txt,
  fechaInicio: txt,
  fechaFin: txt,
  diaDelCurso: num,
  diasDelPlan: z.number().default(81),
})

const esquemaSubfaseDelAlumno = z.object({
  id: z.number(),
  nombre: z.string(),
  misiones: z.number(),
  evaluadas: z.number(),
  promedio: num,
  ultimaClasificacion: txt,
  estado: z.enum(['COMPLETA', 'EN_CURSO', 'PENDIENTE']),
  simulador: z
    .object({ escenario: z.string(), aprobado: z.boolean() })
    .nullish()
    .transform((v) => v ?? null),
})

const esquemaMiCurso = z.object({
  alumno: z.object({ codigo: z.string(), nombre: z.string(), rango: txt }),
  cohorte: esquemaCohorte.nullish().transform((v) => v ?? null),
  proximoTurno: z
    .object({
      id: z.number(),
      fecha: z.string(),
      horaInicio: z.string(),
      horaFin: z.string(),
      aeronave: txt,
      mision: txt,
      horasMision: num,
      instructor: txt,
      subfase: txt,
    })
    .nullish()
    .transform((v) => v ?? null),
  tierra: z.object({
    aprobadas: z.number(),
    total: z.number(),
    materias: z.array(
      z.object({
        id: z.number(),
        nombre: z.string(),
        parte: z.string(),
        estado: z.enum(['APROBADA', 'DESAPROBADA', 'PENDIENTE']),
        nota: num,
        proximoExamen: txt,
      }),
    ),
  }),
  fases: z.array(z.object({ id: z.number(), nombre: z.string(), subfases: z.array(esquemaSubfaseDelAlumno) })),
  notasRecientes: z.array(
    z.object({ tipo: z.enum(['VUELO', 'TIERRA']), titulo: z.string(), fecha: z.string(), nota: num, resultado: txt }),
  ),
  porRendir: z.array(z.object({ idTurnoTeorico: z.number(), materia: z.string(), fecha: z.string(), horaInicio: txt })),
  horas: z.object({ vuelo: z.number(), simulador: z.number(), programa: z.number() }),
  nfpi: num,
  final: z
    .object({
      situacion: z.enum(['EGRESADO', 'DESAPROBADO', 'RETIRADO', 'NO_CULMINO']),
      fecha: txt,
      constancia: txt,
      puesto: num,
      egresados: z.number(),
      nfpi: num,
      observacion: txt,
      ficha: z
        .object({ estado: z.string(), faltan: z.array(z.string()) })
        .nullish()
        .transform((v) => v ?? null),
    })
    .nullish()
    .transform((v) => v ?? null),
})

const esquemaMiCohorte = z.object({
  instructor: z.object({ codigo: z.string(), nombre: z.string() }),
  cohortes: z.array(
    z.object({
      id: z.number(),
      nombre: z.string(),
      estado: txt,
      fechaInicio: txt,
      fechaFin: txt,
      diaDelCurso: num,
      alumnos: z.number(),
    }),
  ),
  turnosDeHoy: z.array(
    z.object({
      id: z.number(),
      nombre: z.string(),
      horaInicio: z.string(),
      horaFin: z.string(),
      aeronave: txt,
      mision: txt,
      subfase: txt,
      alumnos: z.array(
        z.object({ codigo: z.string(), nombre: z.string(), horaInicio: z.string(), horaFin: z.string(), evaluado: z.boolean() }),
      ),
    }),
  ),
  porEvaluar: z.array(z.object({ idTurno: z.number(), fecha: z.string(), codigo: z.string(), nombre: z.string() })),
  fases: z.array(
    z.object({
      id: z.number(),
      nombre: z.string(),
      subfases: z.array(z.object({ id: z.number(), nombre: z.string(), alumnos: z.number() })),
    }),
  ),
  alertas: z.array(z.object({ codigo: z.string(), alumno: z.string(), motivo: z.string() })),
  proximosExamenes: z.array(
    z.object({ idTurnoTeorico: z.number(), materia: z.string(), grupo: txt, fecha: z.string(), horaInicio: txt }),
  ),
})

export type MiCurso = z.infer<typeof esquemaMiCurso>
export type MiCohorte = z.infer<typeof esquemaMiCohorte>
export type SubfaseDelAlumno = z.infer<typeof esquemaSubfaseDelAlumno>

export async function obtenerMiCurso(codAlumno: string): Promise<MiCurso> {
  return esquemaMiCurso.parse(await sigeda.get<unknown>(`/api/aula/alumnos/${encodeURIComponent(codAlumno)}`))
}

export async function obtenerMiCohorte(): Promise<MiCohorte> {
  return esquemaMiCohorte.parse(await sigeda.get<unknown>('/api/aula/instructor'))
}

export const clavesAula = {
  todo: ['aula'] as const,
  curso: (cod: string) => [...clavesAula.todo, 'curso', cod] as const,
  cohorte: () => [...clavesAula.todo, 'cohorte'] as const,
}

export const consultasAula = {
  curso: (cod: string) => queryOptions({ queryKey: clavesAula.curso(cod), queryFn: () => obtenerMiCurso(cod) }),
  cohorte: () => queryOptions({ queryKey: clavesAula.cohorte(), queryFn: obtenerMiCohorte }),
}

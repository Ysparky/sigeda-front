import { z } from 'zod'
import type { CuerpoSesion } from './api'

export const esquemaBusquedaSesiones = z.object({
  estado: z.enum(['PLANIFICADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA']).optional().catch(undefined),
})
export type BusquedaSesiones = z.infer<typeof esquemaBusquedaSesiones>

export const esquemaSesion = z.object({
  idSimulador: z.string().min(1, 'El simulador es requerido.'),
  idEscenario: z.string().min(1, 'El escenario es requerido.'),
  codAlumno: z.string().trim().min(1, 'El código del alumno es requerido.'),
  codInstructor: z.string().trim().min(1, 'El código del instructor es requerido.'),
  fechaPlanificada: z.string().min(1, 'La fecha planificada es requerida.'),
})

export type ValoresSesion = z.input<typeof esquemaSesion>

export function aCuerpoSesion(valores: ValoresSesion): CuerpoSesion {
  return {
    idSimulador: Number(valores.idSimulador),
    idEscenario: Number(valores.idEscenario),
    codAlumno: valores.codAlumno.trim(),
    codInstructor: valores.codInstructor.trim(),
    fechaPlanificada: valores.fechaPlanificada,
  }
}

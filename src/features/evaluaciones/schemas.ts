import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { esquemaPaginacion, numeroOpcional } from '@/lib/busqueda'

export const CLASIFICACIONES_FILTRO = ['Malo', 'Regular', 'Bueno', 'Excelente'] as const

const filtros = {
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idSubfase: numeroOpcional,
  clasificacion: z.enum(CLASIFICACIONES_FILTRO).optional().catch(undefined),
}

export const esquemaBusquedaEvaluaciones = z.object({
  ...filtros,
  alumno: z.coerce
    .string()
    .regex(/^\d{6}$/)
    .optional()
    .catch(undefined),
})

export const esquemaBusquedaMisEvaluaciones = z.object(filtros)

export type BusquedaEvaluaciones = z.infer<typeof esquemaBusquedaEvaluaciones>

export type FiltrosDeEvaluacion = z.infer<typeof esquemaBusquedaMisEvaluaciones>

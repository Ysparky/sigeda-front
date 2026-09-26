import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { CLASIFICACIONES_FILTRO } from '@/features/evaluaciones/schemas'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { TIPOS_ALERTA } from '@/lib/dominio/seguimiento'

export const esquemaBusquedaEscuadron = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idGrupo: numeroOpcional,
  estado: z.string().trim().min(1).optional().catch(undefined),
  texto: z.string().trim().min(1).optional().catch(undefined),
})

export const esquemaBusquedaAlertas = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idGrupo: numeroOpcional,
  tipo: z
    .enum(TIPOS_ALERTA.map((tipo) => tipo.valor))
    .optional()
    .catch(undefined),
  fechaPre: fechaOpcional,
  fechaPost: fechaOpcional,
})

export const PESTANAS = ['resumen', 'practico', 'teorico'] as const

export const esquemaBusquedaLegajo = z.object({
  tab: z.enum(PESTANAS).default('resumen').catch('resumen'),
  idSubfase: numeroOpcional,
  clasificacion: z.enum(CLASIFICACIONES_FILTRO).optional().catch(undefined),
  page: esquemaPaginacion.page,
  size: esquemaPaginacion.size,
})

export const esquemaBusquedaReportes = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idGrupo: numeroOpcional,
})

export type BusquedaEscuadron = z.infer<typeof esquemaBusquedaEscuadron>
export type BusquedaAlertas = z.infer<typeof esquemaBusquedaAlertas>
export type BusquedaLegajo = z.infer<typeof esquemaBusquedaLegajo>
export type BusquedaReportes = z.infer<typeof esquemaBusquedaReportes>
export type Pestana = (typeof PESTANAS)[number]

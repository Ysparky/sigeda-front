import { z } from 'zod'

export const esquemaPaginacion = {
  page: z.number().int().min(0).default(0).catch(0),
  size: z.number().int().min(1).max(100).default(10).catch(10),
  property: z.string().optional().catch(undefined),
  direction: z.enum(['ASC', 'DESC']).default('ASC').catch('ASC'),
}

export const esquemaPaginacionPrograma = {
  page: z.number().int().min(0).default(0).catch(0),
  size: z.number().int().min(1).max(10).default(10).catch(10),
  property: z.string().optional().catch(undefined),
  direction: z.enum(['ASC', 'DESC']).default('ASC').catch('ASC'),
}

export const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)

export const numeroOpcional = z.number().int().positive().optional().catch(undefined)

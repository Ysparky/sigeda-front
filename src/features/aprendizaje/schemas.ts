import { z } from 'zod'

export const esquemaBusquedaCuestionario = z.object({
  cuestionario: z.uuidv4().optional().catch(undefined),
})

export type BusquedaCuestionario = z.infer<typeof esquemaBusquedaCuestionario>

export const esquemaBusquedaConsultas = z.object({
  sesion: z.uuidv4().optional().catch(undefined),
})

export type BusquedaConsultas = z.infer<typeof esquemaBusquedaConsultas>

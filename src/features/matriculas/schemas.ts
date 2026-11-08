import { z } from 'zod'
import { ESTADOS_MATRICULA } from './api'

export const esquemaBusquedaMatriculas = z.object({
  estado: z.enum(ESTADOS_MATRICULA).default('PENDIENTE'),
})

export type BusquedaMatriculas = z.infer<typeof esquemaBusquedaMatriculas>

import { z } from 'zod'

export const esquemaBusquedaMatriculas = z.object({
  estado: z.enum(['PENDIENTE', 'VALIDADA', 'RECHAZADA']).default('PENDIENTE'),
})

export type BusquedaMatriculas = z.infer<typeof esquemaBusquedaMatriculas>

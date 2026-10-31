import { z } from 'zod'

export const esquemaBusquedaMatriculas = z.object({
  estado: z.enum(['PENDIENTE', 'OBSERVADA', 'VALIDADA', 'RECHAZADA', 'NO_ADMITIDO']).default('PENDIENTE'),
})

export type BusquedaMatriculas = z.infer<typeof esquemaBusquedaMatriculas>

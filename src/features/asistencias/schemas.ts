import { z } from 'zod'

export const esquemaBusquedaReporte = z.object({
  grupo: z.number().default(1),
})

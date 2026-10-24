import { z } from 'zod'

export const esquemaBusquedaReporte = z.object({
  // `.catch(1)` cubre una URL manipulada (?grupo=abc); `.default(1)` cubre el parámetro ausente.
  grupo: z.number().default(1).catch(1),
})

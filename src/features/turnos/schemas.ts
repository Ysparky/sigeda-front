import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'

export const esquemaBusquedaTurnos = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idSubfase: numeroOpcional,
  desde: fechaOpcional,
  hasta: fechaOpcional,
})

export type BusquedaTurnos = z.infer<typeof esquemaBusquedaTurnos>

export const esquemaBusquedaPaginada = z.object(esquemaPaginacion)

import { z } from 'zod'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { ESTADOS_TURNO, TIPOS_EXAMEN } from '@/lib/dominio/teoria'

export const esquemaBusquedaTurnosTeoricos = z.object({
  ...esquemaPaginacion,
  idGrupo: numeroOpcional,
  idMateria: numeroOpcional,
  estado: z.enum(ESTADOS_TURNO).optional().catch(undefined),
  tipoExamen: z
    .enum(TIPOS_EXAMEN.map((tipo) => tipo.valor))
    .optional()
    .catch(undefined),
  fechaPre: fechaOpcional,
  fechaPost: fechaOpcional,
})

export type BusquedaTurnosTeoricos = z.infer<typeof esquemaBusquedaTurnosTeoricos>

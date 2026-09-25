import { z } from 'zod'
import { esquemaPaginacion, numeroOpcional } from '@/lib/busqueda'
import { DIFICULTADES, ORIGENES_PREGUNTA, TIPOS_PREGUNTA } from '@/lib/dominio/teoria'

export const esquemaBusquedaPreguntas = z.object({
  ...esquemaPaginacion,
  idMateria: numeroOpcional,
  dificultad: z
    .enum(DIFICULTADES.map((dificultad) => dificultad.valor))
    .optional()
    .catch(undefined),
  tipo: z
    .enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor))
    .optional()
    .catch(undefined),
  origen: z
    .enum(ORIGENES_PREGUNTA.map((origen) => origen.valor))
    .optional()
    .catch(undefined),
  texto: z.string().trim().min(1).optional().catch(undefined),
})

export type BusquedaPreguntas = z.infer<typeof esquemaBusquedaPreguntas>

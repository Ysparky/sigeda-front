import { z } from 'zod'

export const TIPOS_PREGUNTA = [
  { valor: 'multiple_choice', etiqueta: 'Opción múltiple' },
  { valor: 'true_false', etiqueta: 'Verdadero o falso' },
  { valor: 'fill_blank', etiqueta: 'Completar' },
] as const

export const MENSAJE_CANTIDAD = 'La cantidad debe ser un número entero entre 2 y 20.'

export const esquemaGeneracion = z.object({
  documentos: z.array(z.string()).min(1, 'Elija al menos un documento.'),
  tipos: z
    .array(z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor)))
    .min(1, 'Elija al menos un tipo de pregunta.'),
  cantidad: z
    .string()
    .min(1, MENSAJE_CANTIDAD)
    .regex(/^\d{1,2}$/, MENSAJE_CANTIDAD)
    .refine((valor) => Number(valor) >= 2 && Number(valor) <= 20, MENSAJE_CANTIDAD),
})

export type ValoresGeneracion = z.input<typeof esquemaGeneracion>

export const GENERACION_VACIA: ValoresGeneracion = { documentos: [], tipos: ['multiple_choice'], cantidad: '5' }

export const esquemaBusquedaCuestionario = z.object({
  cuestionario: z.uuidv4().optional().catch(undefined),
})

export type BusquedaCuestionario = z.infer<typeof esquemaBusquedaCuestionario>

export const esquemaBusquedaConsultas = z.object({
  sesion: z.uuidv4().optional().catch(undefined),
})

export type BusquedaConsultas = z.infer<typeof esquemaBusquedaConsultas>

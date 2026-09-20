import { z } from 'zod'
import { PARTES_CURSO } from './api'

export const esquemaMateria = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener entre 3 y 60 caracteres.')
    .max(60, 'El nombre debe tener entre 3 y 60 caracteres.'),
  notaMinima: z
    .string()
    .min(1, 'La nota mínima es obligatoria.')
    .regex(/^\d{1,2}$/, 'La nota mínima debe ser un entero entre 0 y 20.')
    .refine((valor) => Number(valor) >= 0 && Number(valor) <= 20, 'La nota mínima debe ser un entero entre 0 y 20.'),
  coeficiente: z
    .string()
    .min(1, 'El coeficiente es obligatorio.')
    .regex(/^\d(\.\d{1,2})?$/, 'El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.')
    .refine((valor) => Number(valor) >= 0 && Number(valor) <= 1, 'El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.'),
  parte: z.enum(PARTES_CURSO.map((parte) => parte.valor)),
})

export type ValoresMateria = z.input<typeof esquemaMateria>

export const MATERIA_VACIA: ValoresMateria = {
  nombre: '',
  notaMinima: '',
  coeficiente: '',
  parte: 'PRIMERA_PARTE',
}

import { z } from 'zod'

const MENSAJE_NOMBRE = 'El nombre debe tener entre 3 y 35 caracteres.'

export const esquemaNombreCorto = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .min(3, MENSAJE_NOMBRE)
  .max(35, MENSAJE_NOMBRE)

export const esquemaDescripcionLarga = z.string().trim().max(255, 'La descripción no puede superar los 255 caracteres.')

export const esquemaFilaNombreDescripcion = z.object({
  id: z.string(),
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
})

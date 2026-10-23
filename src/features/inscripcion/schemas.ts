import { z } from 'zod'

export const esquemaMatricula = z.object({
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos.'),
  nombres: z.string().min(1, 'El nombre es obligatorio').max(50, 'El nombre no puede superar los 50 caracteres.'),
  aPaterno: z
    .string()
    .min(1, 'El apellido paterno es obligatorio.')
    .max(50, 'El apellido paterno no puede superar los 50 caracteres.'),
  aMaterno: z.string().max(50, 'El apellido materno no puede superar los 50 caracteres.'),
  correo: z.string().min(1, 'El correo es obligatorio.').email('Ingresar correo válido.'),
  contacto: z.string().max(30, 'El contacto no puede superar los 30 caracteres.'),
  idHorario: z.string(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

export type ValoresMatricula = z.infer<typeof esquemaMatricula>

export const matriculaVacia: ValoresMatricula = {
  dni: '',
  nombres: '',
  aPaterno: '',
  aMaterno: '',
  correo: '',
  contacto: '',
  idHorario: '',
  password: '',
}

export const TIPOS_COMPROBANTE = ['application/pdf', 'image/jpeg', 'image/png']
export const MAX_COMPROBANTE = 5 * 1024 * 1024

export function errorDeComprobante(archivo: File | null): string | null {
  if (!archivo) return 'Adjunta tu comprobante de pago.'
  if (archivo.size > MAX_COMPROBANTE) return 'El comprobante no puede superar los 5 MB.'
  if (!TIPOS_COMPROBANTE.includes(archivo.type)) return 'El comprobante debe ser un PDF, JPG o PNG.'
  return null
}

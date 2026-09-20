import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'
import { TIPOS_PERSONA } from '@/lib/dominio/personas'

export const esquemaBusquedaPersonas = z.object(esquemaPaginacion)

export type BusquedaPersonas = z.infer<typeof esquemaBusquedaPersonas>

export const esquemaPersonaNueva = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(1, 'El código es obligatorio.')
      .regex(/^[A-Za-z0-9]{6}$/, 'El código debe tener 6 caracteres alfanuméricos.'),
    dni: z.string().trim().min(1, 'El DNI es obligatorio.').regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos.'),
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(50, 'El nombre no puede superar los 50 caracteres.'),
    aPaterno: z
      .string()
      .trim()
      .min(1, 'El apellido paterno es obligatorio.')
      .max(50, 'El apellido paterno no puede superar los 50 caracteres.'),
    aMaterno: z.string().trim().max(50, 'El apellido materno no puede superar los 50 caracteres.'),
    rango: z.string().trim().max(30, 'El rango no puede superar los 30 caracteres.'),
    tipo: z.string().refine((valor) => valor === '' || TIPOS_PERSONA.some((tipo) => tipo === valor), {
      message: 'Ingresar tipo de persona válido.',
    }),
    usuario: z.object({
      username: z
        .string()
        .trim()
        .min(1, 'El nombre de usuario es obligatorio.')
        .regex(
          /^[a-z0-9._]{4,30}$/,
          'El nombre de usuario debe tener de 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.',
        ),
      correo: z.string().trim().min(1, 'El correo es obligatorio.').regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Ingresar correo válido.'),
      password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
      confirmacion: z.string().min(1, 'Repita la contraseña.'),
      idRol: z.string().min(1, 'El rol es requerido.'),
    }),
  })
  .refine((datos) => datos.usuario.password === datos.usuario.confirmacion, {
    message: 'Las contraseñas no coinciden.',
    path: ['usuario', 'confirmacion'],
  })

export type ValoresPersonaNueva = z.input<typeof esquemaPersonaNueva>

export function personaNuevaVacia(idRolAlumno?: number): ValoresPersonaNueva {
  return {
    codigo: '',
    dni: '',
    nombre: '',
    aPaterno: '',
    aMaterno: '',
    rango: '',
    tipo: 'Alumno',
    usuario: {
      username: '',
      correo: '',
      password: '',
      confirmacion: '',
      idRol: idRolAlumno === undefined ? '' : String(idRolAlumno),
    },
  }
}

export function aCuerpoPersonaNueva(valores: ValoresPersonaNueva) {
  return {
    codigo: valores.codigo.trim(),
    dni: valores.dni.trim(),
    nombre: valores.nombre.trim(),
    aPaterno: valores.aPaterno.trim(),
    aMaterno: valores.aMaterno.trim() === '' ? null : valores.aMaterno.trim(),
    rango: valores.rango.trim() === '' ? null : valores.rango.trim(),
    tipo: valores.tipo === '' ? null : valores.tipo,
    usuario: {
      username: valores.usuario.username.trim(),
      correo: valores.usuario.correo.trim(),
      password: valores.usuario.password,
      idRol: Number(valores.usuario.idRol),
    },
  }
}

export type CuerpoPersonaNueva = ReturnType<typeof aCuerpoPersonaNueva>

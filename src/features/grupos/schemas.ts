import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'
import { PROGRAMAS } from '@/features/catalogos/api'

export const esquemaBusquedaGrupos = z.object(esquemaPaginacion)

export type BusquedaGrupos = z.infer<typeof esquemaBusquedaGrupos>

export const esquemaGrupo = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener entre 3 y 35 caracteres.')
    .max(35, 'El nombre debe tener entre 3 y 35 caracteres.'),
  descripcion: z.string().trim().max(255, 'La descripción no puede superar los 255 caracteres.'),
  programa: z.enum(PROGRAMAS),
  alumnos: z.array(z.string()),
})

export type ValoresGrupo = z.input<typeof esquemaGrupo>

export const GRUPO_VACIO: ValoresGrupo = { nombre: '', descripcion: '', programa: 'PDI', alumnos: [] }

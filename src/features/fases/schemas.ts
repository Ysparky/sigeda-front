import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'

export const esquemaBusquedaFases = z.object(esquemaPaginacionPrograma)

export type BusquedaFases = z.infer<typeof esquemaBusquedaFases>

const MENSAJE_NOMBRE = 'El nombre debe tener entre 3 y 35 caracteres.'

const esquemaNombre = z.string().trim().min(1, 'El nombre es obligatorio').min(3, MENSAJE_NOMBRE).max(35, MENSAJE_NOMBRE)

const esquemaDescripcion = z.string().trim().max(255, 'La descripción no puede superar los 255 caracteres.')

export const esquemaFase = z.object({
  nombre: esquemaNombre,
  descripcion: esquemaDescripcion,
  subfases: z
    .array(z.object({ id: z.string(), nombre: esquemaNombre, descripcion: esquemaDescripcion }))
    .min(1, 'La asignación de subfases es requerida'),
})

export type ValoresFase = z.input<typeof esquemaFase>

export const FASE_VACIA: ValoresFase = {
  nombre: '',
  descripcion: '',
  subfases: [{ id: '0', nombre: '', descripcion: '' }],
}

import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'

export const esquemaBusquedaManiobras = z.object(esquemaPaginacionPrograma)

export type BusquedaManiobras = z.infer<typeof esquemaBusquedaManiobras>

const MENSAJE_NOMBRE = 'El nombre debe tener entre 3 y 35 caracteres.'

const esquemaNombre = z.string().trim().min(1, 'El nombre es obligatorio').min(3, MENSAJE_NOMBRE).max(35, MENSAJE_NOMBRE)

const esquemaDescripcion = z.string().trim().max(255, 'La descripción no puede superar los 255 caracteres.')

export const esquemaManiobra = z.object({
  nombre: esquemaNombre,
  descripcion: esquemaDescripcion,
  subfases: z.array(z.string()).min(1, 'La asignación de subfases es requerida'),
})

export type ValoresManiobra = z.input<typeof esquemaManiobra>

export const MANIOBRA_VACIA: ValoresManiobra = { nombre: '', descripcion: '', subfases: [] }

export const esquemaEstandares = z.object({
  estandares: z
    .array(z.object({ id: z.string(), nombre: esquemaNombre, descripcion: esquemaDescripcion }))
    .min(1, 'La asignación de estandares es requerida'),
})

export type ValoresEstandares = z.input<typeof esquemaEstandares>

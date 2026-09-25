import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'
import { esquemaDescripcionLarga, esquemaFilaNombreDescripcion, esquemaNombreCorto } from '@/lib/esquemas'

export const esquemaBusquedaManiobras = z.object(esquemaPaginacionPrograma)

export type BusquedaManiobras = z.infer<typeof esquemaBusquedaManiobras>

export const esquemaManiobra = z.object({
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
  subfases: z.array(z.string()).min(1, 'La asignación de subfases es requerida'),
})

export type ValoresManiobra = z.input<typeof esquemaManiobra>

export const MANIOBRA_VACIA: ValoresManiobra = { nombre: '', descripcion: '', subfases: [] }

export const esquemaEstandares = z.object({
  estandares: z.array(esquemaFilaNombreDescripcion).min(1, 'La asignación de estandares es requerida'),
})

export type ValoresEstandares = z.input<typeof esquemaEstandares>

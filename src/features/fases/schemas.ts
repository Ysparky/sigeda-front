import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'
import { esquemaDescripcionLarga, esquemaFilaNombreDescripcion, esquemaNombreCorto } from '@/lib/esquemas'

export const esquemaBusquedaFases = z.object(esquemaPaginacionPrograma)

export type BusquedaFases = z.infer<typeof esquemaBusquedaFases>

export const esquemaFase = z.object({
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
  subfases: z.array(esquemaFilaNombreDescripcion).min(1, 'La asignación de subfases es requerida'),
})

export type ValoresFase = z.input<typeof esquemaFase>

export const FASE_VACIA: ValoresFase = {
  nombre: '',
  descripcion: '',
  subfases: [{ id: '0', nombre: '', descripcion: '' }],
}

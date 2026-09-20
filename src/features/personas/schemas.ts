import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'

export const esquemaBusquedaPersonas = z.object(esquemaPaginacion)

export type BusquedaPersonas = z.infer<typeof esquemaBusquedaPersonas>

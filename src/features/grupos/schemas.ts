import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'
import { esquemaDescripcionLarga, esquemaNombreCorto } from '@/lib/esquemas'
import { PROGRAMAS } from '@/features/catalogos/api'

export const esquemaBusquedaGrupos = z.object(esquemaPaginacion)

export type BusquedaGrupos = z.infer<typeof esquemaBusquedaGrupos>

export const esquemaGrupo = z.object({
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
  programa: z.enum(PROGRAMAS),
  alumnos: z.array(z.string()),
})

export type ValoresGrupo = z.input<typeof esquemaGrupo>

export const GRUPO_VACIO: ValoresGrupo = { nombre: '', descripcion: '', programa: 'PDI', alumnos: [] }

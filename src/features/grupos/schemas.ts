import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'
import { esquemaDescripcionLarga, esquemaNombreCorto } from '@/lib/esquemas'
import { PROGRAMAS } from '@/features/catalogos/api'

export const esquemaBusquedaGrupos = z.object(esquemaPaginacion)

export type BusquedaGrupos = z.infer<typeof esquemaBusquedaGrupos>

export const TOPE_ALUMNOS_GRUPO = 20
export const MENSAJE_TOPE_ALUMNOS_GRUPO = 'Un grupo admite como máximo 20 alumnos.'

export const esquemaGrupo = z.object({
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
  programa: z.enum(PROGRAMAS),
  codInstructor: z.string(),
  alumnos: z.array(z.string()).max(TOPE_ALUMNOS_GRUPO, MENSAJE_TOPE_ALUMNOS_GRUPO),
})

export type ValoresGrupo = z.input<typeof esquemaGrupo>

export const GRUPO_VACIO: ValoresGrupo = { nombre: '', descripcion: '', programa: 'PDI', codInstructor: '', alumnos: [] }

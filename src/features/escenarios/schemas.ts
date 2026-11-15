import { z } from 'zod'
import type { CuerpoEscenario } from './api'

const esEnteroPositivo = (v: string) => v.trim() === '' || (Number.isInteger(Number(v)) && Number(v) > 0)

const esquemaIndicadorForm = z.object({
  nombre: z.string().trim().min(1, 'El nombre del indicador es obligatorio.').max(255),
  competencia: z.string().max(255),
})

export const esquemaEscenario = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(255),
  descripcion: z.string().max(2000),
  objetivo: z.string().max(2000),
  duracionMin: z.string().refine(esEnteroPositivo, 'Ingrese una duración válida en minutos.'),
  activo: z.boolean(),
  idSubfase: z.string(),
  indicadores: z.array(esquemaIndicadorForm),
})

export type ValoresEscenario = z.input<typeof esquemaEscenario>

export const ESCENARIO_VACIO: ValoresEscenario = {
  nombre: '',
  descripcion: '',
  objetivo: '',
  duracionMin: '',
  activo: true,
  idSubfase: '',
  indicadores: [],
}

export function aCuerpoEscenario(valores: ValoresEscenario): CuerpoEscenario {
  return {
    nombre: valores.nombre.trim(),
    descripcion: valores.descripcion.trim(),
    objetivo: valores.objetivo.trim(),
    duracionMin: valores.duracionMin.trim() === '' ? null : Number(valores.duracionMin),
    activo: valores.activo,
    idSubfase: valores.idSubfase === '' ? null : Number(valores.idSubfase),
    indicadores: valores.indicadores.map((indicador, posicion) => ({
      nombre: indicador.nombre.trim(),
      descripcion: '',
      competencia: indicador.competencia.trim(),
      orden: posicion + 1,
    })),
  }
}

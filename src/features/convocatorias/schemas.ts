import { z } from 'zod'
import { esFechaIso } from '@/lib/dominio/calendario'
import type { CuerpoConvocatoria } from './api'

const esEntero = (v: string) => v.trim() !== '' && Number.isInteger(Number(v)) && Number(v) >= 0

export const esquemaConvocatoria = z
  .object({
    idCurso: z.string().min(1, 'El curso es requerido.'),
    nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(255),
    descripcion: z.string().max(255),
    fechaInicio: z.string().refine(esFechaIso, 'Ingrese una fecha de inicio válida.'),
    fechaFin: z.string().refine(esFechaIso, 'Ingrese una fecha de fin válida.'),
    vacantes: z.string().refine(esEntero, 'Ingrese un número de vacantes válido.'),
    documentosRequeridos: z.string().max(1000),
  })
  .superRefine((valores, contexto) => {
    if (esFechaIso(valores.fechaInicio) && esFechaIso(valores.fechaFin) && valores.fechaFin < valores.fechaInicio) {
      contexto.addIssue({ code: 'custom', message: 'La fecha de fin debe ser posterior a la de inicio.', path: ['fechaFin'] })
    }
  })

export type ValoresConvocatoria = z.input<typeof esquemaConvocatoria>

export const CONVOCATORIA_VACIA: ValoresConvocatoria = {
  idCurso: '1',
  nombre: '',
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
  vacantes: '',
  documentosRequeridos: '',
}

export function aCuerpoConvocatoria(valores: ValoresConvocatoria): CuerpoConvocatoria {
  return {
    idCurso: Number(valores.idCurso),
    nombre: valores.nombre.trim(),
    descripcion: valores.descripcion.trim(),
    fechaInicio: valores.fechaInicio,
    fechaFin: valores.fechaFin,
    vacantes: Number(valores.vacantes),
    documentosRequeridos: valores.documentosRequeridos.trim(),
  }
}

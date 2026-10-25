import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'
import { esquemaDescripcionLarga, esquemaFilaNombreDescripcion, esquemaNombreCorto } from '@/lib/esquemas'
import type { CuerpoParametros } from './api'

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

const esNumero = (valor: string) => valor.trim() !== '' && Number.isFinite(Number(valor))
const esPositivo = (valor: string) => esNumero(valor) && Number(valor) > 0

export const esquemaParametros = z
  .object({
    parametros: z
      .array(
        z.object({
          clave: z.string().trim().min(1, 'La clave es requerida'),
          tipo: z.enum(['LINEAL', 'ANGULAR']),
          unidad: z.string().trim().min(1, 'La unidad es requerida'),
          objetivo: z.string().refine(esNumero, 'Ingrese un objetivo numérico'),
          tolExcelente: z.string().refine(esPositivo, 'La banda Excelente debe ser un número positivo'),
          tolBueno: z.string().refine(esPositivo, 'La banda Bueno debe ser un número positivo'),
          tolRegular: z.string().refine(esPositivo, 'La banda Regular debe ser un número positivo'),
        }),
      )
      .min(1, 'La asignación de parámetros es requerida'),
  })
  .superRefine((valores, contexto) => {
    const vistas = new Set<string>()
    valores.parametros.forEach((parametro, indice) => {
      const clave = parametro.clave.trim()
      if (clave !== '' && vistas.has(clave)) {
        contexto.addIssue({ code: 'custom', message: 'La clave está repetida', path: ['parametros', indice, 'clave'] })
      }
      vistas.add(clave)
      const e = Number(parametro.tolExcelente)
      const b = Number(parametro.tolBueno)
      const r = Number(parametro.tolRegular)
      if ([e, b, r].every(Number.isFinite) && (e > b || b > r)) {
        contexto.addIssue({
          code: 'custom',
          message: 'Las bandas deben cumplir Excelente ≤ Bueno ≤ Regular',
          path: ['parametros', indice, 'tolExcelente'],
        })
      }
    })
  })

export type ValoresParametros = z.input<typeof esquemaParametros>

export const PARAMETRO_VACIO = {
  clave: '',
  tipo: 'LINEAL' as const,
  unidad: '',
  objetivo: '',
  tolExcelente: '',
  tolBueno: '',
  tolRegular: '',
}

export function aCuerpoParametros(valores: ValoresParametros): CuerpoParametros {
  return {
    parametros: valores.parametros.map((parametro) => ({
      clave: parametro.clave.trim(),
      tipo: parametro.tipo,
      unidad: parametro.unidad.trim(),
      objetivo: Number(parametro.objetivo),
      tolExcelente: Number(parametro.tolExcelente),
      tolBueno: Number(parametro.tolBueno),
      tolRegular: Number(parametro.tolRegular),
    })),
  }
}

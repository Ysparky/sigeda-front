import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { esquemaPaginacion, numeroOpcional } from '@/lib/busqueda'
import { esCategoria, requiereEvaluador } from '@/lib/dominio/categorias'
import { esBajoEstandar, esCalificacionValida, esNotaDirbe, type NotaDirbe } from '@/lib/dominio/dirbe'
import type { CuerpoEvaluacion } from './api'

export const CLASIFICACIONES_FILTRO = ['Malo', 'Regular', 'Bueno', 'Excelente'] as const

const filtros = {
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idSubfase: numeroOpcional,
  clasificacion: z.enum(CLASIFICACIONES_FILTRO).optional().catch(undefined),
}

export const esquemaBusquedaEvaluaciones = z.object({
  ...filtros,
  alumno: z.coerce
    .string()
    .regex(/^\d{6}$/)
    .optional()
    .catch(undefined),
})

export const esquemaBusquedaMisEvaluaciones = z.object(filtros)

export type BusquedaEvaluaciones = z.infer<typeof esquemaBusquedaEvaluaciones>

export type FiltrosDeEvaluacion = z.infer<typeof esquemaBusquedaMisEvaluaciones>

export const MENSAJE_NOMBRE_EVALUACION = 'Nombre debe tener de 10 a 30 caracteres.'

const MENSAJES_BAJO_ESTANDAR = {
  causa: 'La causa es requerida para calificaciones bajo el estándar.',
  observacion: 'La observación es requerida para calificaciones bajo el estándar.',
  recomendacion: 'La recomendación es requerida para calificaciones bajo el estándar.',
} as const

function esEnlace(valor: string) {
  try {
    const url = new URL(valor)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const textoLargo = (campo: string) => z.string().max(250, `${campo} debe tener un máximo de 250 caracteres.`)

export const esquemaEvaluacion = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Ingresar nombre de evaluación.')
      .min(10, MENSAJE_NOMBRE_EVALUACION)
      .max(30, MENSAJE_NOMBRE_EVALUACION),
    categoria: z.string().refine(esCategoria, 'Ingresar categoria válida.'),
    recomendacion: textoLargo('Recomendación'),
    url: z
      .string()
      .trim()
      .refine((valor) => valor === '' || esEnlace(valor), 'Ingrese un enlace válido que empiece con https://'),
    codEvaluador: z.string().trim(),
    calificaciones: z.array(
      z.object({
        idManiobra: z.number(),
        maniobra: z.string(),
        notaMin: z.string(),
        nota: z.string().min(1, 'Califique la maniobra.'),
        causa: textoLargo('Causa'),
        observacion: textoLargo('Observación'),
        recomendacion: textoLargo('Recomendación'),
      }),
    ),
  })
  .superRefine((valores, contexto) => {
    if (esCategoria(valores.categoria) && requiereEvaluador(valores.categoria) && !/^\d{6}$/.test(valores.codEvaluador)) {
      contexto.addIssue({
        code: 'custom',
        message: 'Ingrese el código de 6 dígitos del evaluador.',
        path: ['codEvaluador'],
      })
    }
    valores.calificaciones.forEach((calificacion, indice) => {
      if (calificacion.nota === '') return
      if (esNotaDirbe(calificacion.notaMin) && !esCalificacionValida(calificacion.notaMin, calificacion.nota)) {
        contexto.addIssue({
          code: 'custom',
          message: 'La calificación no es válida para la nota mínima.',
          path: ['calificaciones', indice, 'nota'],
        })
      }
      if (!esBajoEstandar(calificacion.notaMin, calificacion.nota)) return
      for (const campo of ['causa', 'observacion', 'recomendacion'] as const) {
        if (calificacion[campo].trim() === '') {
          contexto.addIssue({
            code: 'custom',
            message: MENSAJES_BAJO_ESTANDAR[campo],
            path: ['calificaciones', indice, campo],
          })
        }
      }
    })
  })

export type ValoresEvaluacion = z.input<typeof esquemaEvaluacion>

export type CalificacionInicial = { idManiobra: number; maniobra: string; notaMin: NotaDirbe; nota?: string } & Partial<
  Record<'causa' | 'observacion' | 'recomendacion', string | null>
>

export function valoresDeEvaluacion(
  calificaciones: readonly CalificacionInicial[],
  inicial: Partial<Omit<ValoresEvaluacion, 'calificaciones'>> = {},
): ValoresEvaluacion {
  return {
    nombre: '',
    categoria: '',
    recomendacion: '',
    url: '',
    codEvaluador: '',
    ...inicial,
    calificaciones: calificaciones.map((calificacion) => ({
      idManiobra: calificacion.idManiobra,
      maniobra: calificacion.maniobra,
      notaMin: calificacion.notaMin,
      nota: calificacion.nota ?? (calificacion.notaMin === 'D' ? 'D' : ''),
      causa: calificacion.causa ?? '',
      observacion: calificacion.observacion ?? '',
      recomendacion: calificacion.recomendacion ?? '',
    })),
  }
}

function textoONulo(valor: string) {
  const limpio = valor.trim()
  return limpio === '' ? null : limpio
}

export function aCuerpoEvaluacion(valores: ValoresEvaluacion): CuerpoEvaluacion {
  const categoria = esCategoria(valores.categoria) ? valores.categoria : 'Ponderada'
  return {
    nombre: valores.nombre.trim(),
    categoria,
    recomendacion: textoONulo(valores.recomendacion),
    url: textoONulo(valores.url),
    codEvaluador: requiereEvaluador(categoria) ? valores.codEvaluador.trim() : null,
    calificaciones: valores.calificaciones.flatMap((calificacion) =>
      esNotaDirbe(calificacion.nota)
        ? [
            {
              idManiobra: calificacion.idManiobra,
              nota: calificacion.nota,
              causa: textoONulo(calificacion.causa),
              observacion: textoONulo(calificacion.observacion),
              recomendacion: textoONulo(calificacion.recomendacion),
            },
          ]
        : [],
    ),
  }
}

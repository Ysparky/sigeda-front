import { z } from 'zod'
import { esquemaPaginacion, numeroOpcional } from '@/lib/busqueda'
import {
  alternativasRequeridas,
  DIFICULTADES,
  MARCADOR_COMPLETAR,
  MENSAJE_MATERIA_OBLIGATORIA,
  MENSAJE_RESPUESTA_OBLIGATORIA,
  ORIGENES_PREGUNTA,
  TEXTOS_VERDADERO_FALSO,
  TIPOS_PREGUNTA,
  type TipoPregunta,
} from '@/lib/dominio/teoria'
import { MENSAJE_CANTIDAD, TIPOS_PREGUNTA as TIPOS_DE_IA } from '@/features/aprendizaje/schemas'
import type { CuerpoPregunta, PreguntaDetalle } from './api'

export const esquemaBusquedaPreguntas = z.object({
  ...esquemaPaginacion,
  idMateria: numeroOpcional,
  dificultad: z
    .enum(DIFICULTADES.map((dificultad) => dificultad.valor))
    .optional()
    .catch(undefined),
  tipo: z
    .enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor))
    .optional()
    .catch(undefined),
  origen: z
    .enum(ORIGENES_PREGUNTA.map((origen) => origen.valor))
    .optional()
    .catch(undefined),
  texto: z.string().trim().min(1).optional().catch(undefined),
})

export type BusquedaPreguntas = z.infer<typeof esquemaBusquedaPreguntas>

export const MENSAJE_ENUNCIADO = 'El enunciado debe tener entre 10 y 500 caracteres.'

export const esquemaPregunta = z
  .object({
    idMateria: z.string().min(1, MENSAJE_MATERIA_OBLIGATORIA),
    enunciado: z.string().trim().min(1, 'El enunciado es obligatorio.').min(10, MENSAJE_ENUNCIADO).max(500, MENSAJE_ENUNCIADO),
    tipoPregunta: z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor)),
    dificultad: z.enum(DIFICULTADES.map((dificultad) => dificultad.valor)),
    explicacion: z.string().trim().max(1000, 'La explicación no puede superar los 1000 caracteres.'),
    alternativas: z.array(
      z.object({
        respuesta: z
          .string()
          .trim()
          .min(1, MENSAJE_RESPUESTA_OBLIGATORIA)
          .max(200, 'La respuesta no puede superar los 200 caracteres.'),
      }),
    ),
    correcta: z.string(),
  })
  .superRefine((valores, contexto) => {
    if (valores.tipoPregunta === 'COMPLETAR' && !valores.enunciado.includes(MARCADOR_COMPLETAR)) {
      contexto.addIssue({
        code: 'custom',
        message: `El enunciado de una pregunta de completar debe incluir el marcador ${MARCADOR_COMPLETAR}.`,
        path: ['enunciado'],
      })
    }
    if (valores.correcta === '') {
      contexto.addIssue({
        code: 'custom',
        message: 'Debe marcar exactamente una alternativa como correcta.',
        path: ['correcta'],
      })
    }
    const textos = valores.alternativas
      .map((alternativa) => alternativa.respuesta.trim().toLowerCase())
      .filter((respuesta) => respuesta !== '')
    if (new Set(textos).size !== textos.length) {
      contexto.addIssue({ code: 'custom', message: 'Las alternativas no pueden repetirse.', path: ['alternativas'] })
    }
  })

export type ValoresPregunta = z.input<typeof esquemaPregunta>

export function alternativasPara(tipo: TipoPregunta): { respuesta: string }[] {
  if (tipo === 'VERDADERO_FALSO') return TEXTOS_VERDADERO_FALSO.map((respuesta) => ({ respuesta }))
  return Array.from({ length: alternativasRequeridas(tipo) }, () => ({ respuesta: '' }))
}

export function preguntaVacia(tipo: TipoPregunta = 'OPCION_MULTIPLE'): ValoresPregunta {
  return {
    idMateria: '',
    enunciado: '',
    tipoPregunta: tipo,
    dificultad: 'MEDIA',
    explicacion: '',
    alternativas: alternativasPara(tipo),
    correcta: tipo === 'COMPLETAR' ? '0' : '',
  }
}

export function valoresDesdePregunta(pregunta: PreguntaDetalle): ValoresPregunta {
  return {
    idMateria: String(pregunta.materia.id),
    enunciado: pregunta.enunciado,
    tipoPregunta: pregunta.tipoPregunta,
    dificultad: pregunta.dificultad,
    explicacion: pregunta.explicacion ?? '',
    alternativas: pregunta.alternativas.map((alternativa) => ({ respuesta: alternativa.respuesta })),
    correcta: String(pregunta.alternativas.findIndex((alternativa) => alternativa.correcto)),
  }
}

export function aCuerpoPregunta(valores: ValoresPregunta): CuerpoPregunta {
  return {
    idMateria: Number(valores.idMateria),
    enunciado: valores.enunciado.trim(),
    tipoPregunta: valores.tipoPregunta,
    dificultad: valores.dificultad,
    explicacion: valores.explicacion.trim() === '' ? null : valores.explicacion.trim(),
    alternativas: valores.alternativas.map((alternativa, indice) => ({
      respuesta: alternativa.respuesta.trim(),
      correcto: String(indice) === valores.correcta,
    })),
  }
}

export const esquemaImportacion = z.object({
  documentos: z.array(z.string()).min(1, 'Elija al menos un documento.'),
  tipos: z.array(z.enum(TIPOS_DE_IA.map((tipo) => tipo.valor))).min(1, 'Elija al menos un tipo de pregunta.'),
  cantidad: z
    .string()
    .min(1, MENSAJE_CANTIDAD)
    .regex(/^\d{1,2}$/, MENSAJE_CANTIDAD)
    .refine((valor) => Number(valor) >= 2 && Number(valor) <= 20, MENSAJE_CANTIDAD),
  idMateria: z.string().min(1, MENSAJE_MATERIA_OBLIGATORIA),
  dificultad: z.enum(DIFICULTADES.map((dificultad) => dificultad.valor)),
})

export type ValoresImportacion = z.input<typeof esquemaImportacion>

export const IMPORTACION_VACIA: ValoresImportacion = {
  documentos: [],
  tipos: ['multiple_choice'],
  cantidad: '5',
  idMateria: '',
  dificultad: 'MEDIA',
}

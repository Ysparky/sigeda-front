import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type CursoCatalogo = {
  id: number
  nombre: string
  descripcion: string
  duracion: number
  requisitos: string
}

export type HorarioItem = { id: number; nombre: string; detalle: string }

export type CursoDetalle = CursoCatalogo & { horarios: HorarioItem[] }

const esquemaCurso = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string(),
  duracion: z.number(),
  requisitos: z.string(),
})

const esquemaDetalle = esquemaCurso.extend({
  horarios: z.array(z.object({ id: z.number(), nombre: z.string(), detalle: z.string() })),
})

export const clavesInscripcion = {
  todo: ['inscripcion'] as const,
  catalogo: () => [...clavesInscripcion.todo, 'catalogo'] as const,
  curso: (id: number) => [...clavesInscripcion.todo, 'curso', id] as const,
}

export async function listarCatalogo(): Promise<CursoCatalogo[]> {
  const cursos = await sigeda.lista<unknown>('/api/public/cursos')
  return cursos.map((curso) => esquemaCurso.parse(curso))
}

export async function obtenerCurso(id: number): Promise<CursoDetalle> {
  const curso = await sigeda.get<unknown>(`/api/public/cursos/${id}`)
  return esquemaDetalle.parse(curso)
}

export const catalogoQuery = () => queryOptions({ queryKey: clavesInscripcion.catalogo(), queryFn: listarCatalogo })

export const cursoQuery = (id: number) =>
  queryOptions({ queryKey: clavesInscripcion.curso(id), queryFn: () => obtenerCurso(id) })

// --- Convocatorias (catálogo público) ---

export type ConvocatoriaPublica = {
  id: number
  idCurso: number | null
  nombre: string
  descripcion: string | null
  fechaInicio: string
  fechaFin: string
  vacantes: number
}

const esquemaConvocatoriaPublica = z.object({
  id: z.number(),
  idCurso: z.number().nullish().transform((v) => v ?? null),
  nombre: z.string(),
  descripcion: z.string().nullish().transform((v) => v ?? null),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  vacantes: z.number(),
})

export async function listarConvocatoriasPublicas(): Promise<ConvocatoriaPublica[]> {
  const datos = await sigeda.lista<unknown>('/api/public/convocatorias')
  return datos.map((c) => esquemaConvocatoriaPublica.parse(c))
}

export async function obtenerConvocatoriaPublica(id: number): Promise<ConvocatoriaPublica> {
  return esquemaConvocatoriaPublica.parse(await sigeda.get<unknown>(`/api/public/convocatorias/${id}`))
}

export const convocatoriasPublicasQuery = () =>
  queryOptions({ queryKey: [...clavesInscripcion.todo, 'convocatorias'], queryFn: listarConvocatoriasPublicas })

export const convocatoriaPublicaQuery = (id: number) =>
  queryOptions({ queryKey: [...clavesInscripcion.todo, 'convocatoria', id], queryFn: () => obtenerConvocatoriaPublica(id) })

// --- Postulación (sin cuenta) ---

export const TIPOS_DOCUMENTO_IDENTIDAD = ['DNI', 'CE', 'PASAPORTE'] as const
export type TipoDocumentoIdentidad = (typeof TIPOS_DOCUMENTO_IDENTIDAD)[number]

export const DOCUMENTOS_POSTULACION = [
  'DOCUMENTO_IDENTIDAD',
  'CERTIFICADO_SECUNDARIA',
  'FOTOGRAFIA',
  'ANTECEDENTES_POLICIALES',
  'DECLARACION_JURADA',
  'ESTUDIOS_SUPERIORES',
  'CONSTANCIA_INGLES',
  'CERTIFICADO_MEDICO',
] as const
export type TipoDocumentoPostulacion = (typeof DOCUMENTOS_POSTULACION)[number]

export type EstadoMatricula = 'PENDIENTE' | 'OBSERVADA' | 'VALIDADA' | 'CITADA' | 'ADMITIDA' | 'NO_ADMITIDO' | 'RECHAZADA'
export type EstadoDocumento = 'FALTANTE' | 'PENDIENTE' | 'OBSERVADO' | 'ACEPTADO'

const esquemaDocumento = z.object({
  tipo: z.enum(DOCUMENTOS_POSTULACION),
  nombre: z.string(),
  obligatorio: z.boolean(),
  momento: z.enum(['POSTULACION', 'ANTES_DEL_RESULTADO']),
  soloImagen: z.boolean(),
  estado: z.enum(['FALTANTE', 'PENDIENTE', 'OBSERVADO', 'ACEPTADO']),
  observacion: z.string().nullish().transform((v) => v ?? null),
})

export type DocumentoVista = z.infer<typeof esquemaDocumento>

const esquemaRequisitos = z.object({
  edadMinima: z.number(),
  notaMinimaAdmision: z.number(),
  documentos: z.array(esquemaDocumento),
})

export type Requisitos = z.infer<typeof esquemaRequisitos>

export const esquemaCitacion = z
  .object({ fecha: z.string(), hora: z.string(), lugar: z.string() })
  .nullish()
  .transform((v) => v ?? null)

export const esquemaEvaluacion = z
  .object({
    resultado: z.enum(['ADMITIDO', 'NO_ADMITIDO']),
    notaConocimientos: z.number().nullable(),
    entrevista: z.enum(['APTO', 'NO_APTO']).nullable(),
    evaluacionPsicologica: z.enum(['APTO', 'NO_APTO']).nullable(),
    observaciones: z.string().nullish().transform((v) => v ?? null),
  })
  .nullish()
  .transform((v) => v ?? null)

const ESTADOS = ['PENDIENTE', 'OBSERVADA', 'VALIDADA', 'CITADA', 'ADMITIDA', 'NO_ADMITIDO', 'RECHAZADA'] as const

const esquemaPostulacion = z.object({
  convocatoria: z.string().nullish().transform((v) => v ?? null),
  nombres: z.string(),
  aPaterno: z.string(),
  fecha: z.string(),
  estado: z.enum(ESTADOS),
  observaciones: z.string().nullish().transform((v) => v ?? null),
  motivoRechazo: z.string().nullish().transform((v) => v ?? null),
  documentos: z.array(esquemaDocumento),
  citacion: esquemaCitacion,
  evaluacion: esquemaEvaluacion,
  cuentaActiva: z.boolean(),
})

export type Postulacion = z.infer<typeof esquemaPostulacion>

export type DatosPostulacion = {
  idConvocatoria: number
  tipoDocumento: TipoDocumentoIdentidad
  numeroDocumento: string
  nombres: string
  aPaterno: string
  aMaterno: string
  fechaNacimiento: string
  sexo: 'MASCULINO' | 'FEMENINO'
  nacionalidad: string
  direccion: string
  correo: string
  contacto: string
  aceptaTratamientoDatos: boolean
}

export type Credencial = { numeroDocumento: string; codigo: string }

export const requisitosQuery = () =>
  queryOptions({
    queryKey: [...clavesInscripcion.todo, 'requisitos'],
    queryFn: async () => esquemaRequisitos.parse(await sigeda.get<unknown>('/api/public/postulaciones/requisitos')),
  })

export async function crearMatricula(
  datos: DatosPostulacion,
  archivos: Partial<Record<TipoDocumentoPostulacion, File>>,
): Promise<{ codigo: string; mensaje: string }> {
  const formulario = new FormData()
  formulario.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
  for (const [tipo, archivo] of Object.entries(archivos)) if (archivo) formulario.append(tipo, archivo, archivo.name)
  return sigeda.multipart('POST', '/api/public/matriculas', formulario)
}

export async function consultarPostulacion(credencial: Credencial): Promise<Postulacion> {
  return esquemaPostulacion.parse(await sigeda.post<unknown>('/api/public/postulaciones/consulta', credencial))
}

export async function subirDocumento(
  credencial: Credencial,
  tipo: TipoDocumentoPostulacion,
  archivo: File,
): Promise<{ mensaje: string }> {
  const formulario = new FormData()
  formulario.append('datos', new Blob([JSON.stringify({ ...credencial, tipo })], { type: 'application/json' }))
  formulario.append('archivo', archivo, archivo.name)
  return sigeda.multipart('POST', '/api/public/postulaciones/documentos', formulario)
}

export async function activarCuenta(credencial: Credencial, password: string): Promise<{ mensaje: string; usuario: string }> {
  return sigeda.post('/api/public/postulaciones/activacion', { ...credencial, password })
}

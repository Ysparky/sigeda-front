import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { DOCUMENTOS_POSTULACION, esquemaCitacion, esquemaEvaluacion, type TipoDocumentoPostulacion } from '@/features/inscripcion/api'
import { sigeda } from '@/lib/api/sigeda'
import { tokens } from '@/lib/auth/tokens'
import { config } from '@/lib/config'

export const ESTADOS_MATRICULA = ['PENDIENTE', 'OBSERVADA', 'VALIDADA', 'CITADA', 'ADMITIDA', 'NO_ADMITIDO', 'RECHAZADA'] as const
export type EstadoMatricula = (typeof ESTADOS_MATRICULA)[number]

export const MEDIOS_PAGO = ['TRANSFERENCIA', 'DEPOSITO', 'YAPE', 'PLIN', 'CAJA'] as const
export type MedioPago = (typeof MEDIOS_PAGO)[number]

const esquemaBandeja = z.object({
  id: z.number(),
  idConvocatoria: z.number().nullish().transform((v) => v ?? null),
  tipoDocumento: z.string().nullish().transform((v) => v ?? 'DNI'),
  numeroDocumento: z.string(),
  nombres: z.string(),
  aPaterno: z.string(),
  aMaterno: z.string().nullish().transform((v) => v ?? ''),
  correo: z.string(),
  fecha: z.string(),
  estado: z.enum(ESTADOS_MATRICULA),
})

export type MatriculaBandeja = z.infer<typeof esquemaBandeja>

const esquemaDocumento = z.object({
  tipo: z.enum(DOCUMENTOS_POSTULACION),
  nombre: z.string(),
  obligatorio: z.boolean(),
  momento: z.enum(['POSTULACION', 'ANTES_DEL_RESULTADO']),
  soloImagen: z.boolean(),
  estado: z.enum(['FALTANTE', 'PENDIENTE', 'OBSERVADO', 'ACEPTADO']),
  observacion: z.string().nullish().transform((v) => v ?? null),
  vigenciaHasta: z.string().nullish().transform((v) => v ?? null),
  nivel: z.string().nullish().transform((v) => v ?? null),
})

/** El médico y la constancia de inglés se aceptan con su vigencia; el inglés, además, con su nivel. */
export const pideVigencia = (tipo: TipoDocumentoPostulacion) => tipo === 'CERTIFICADO_MEDICO' || tipo === 'CONSTANCIA_INGLES'

const esquemaDetalle = esquemaBandeja.extend({
  fechaNacimiento: z.string().nullish().transform((v) => v ?? null),
  sexo: z.string().nullish().transform((v) => v ?? null),
  nacionalidad: z.string().nullish().transform((v) => v ?? null),
  direccion: z.string().nullish().transform((v) => v ?? null),
  contacto: z.string().nullish().transform((v) => v ?? null),
  motivoRechazo: z.string().nullish().transform((v) => v ?? null),
  observaciones: z.string().nullish().transform((v) => v ?? null),
  codPersona: z.string().nullish().transform((v) => v ?? null),
  documentos: z.array(esquemaDocumento),
  citacion: esquemaCitacion,
  evaluacion: esquemaEvaluacion,
  pago: z
    .object({ fecha: z.string(), monto: z.number(), medio: z.enum(MEDIOS_PAGO), numeroOperacion: z.string() })
    .nullish()
    .transform((v) => v ?? null),
})

export type MatriculaDetalle = z.infer<typeof esquemaDetalle>
export type DocumentoDeMatricula = z.infer<typeof esquemaDocumento>

export type CuerpoEvaluacion = {
  notaConocimientos: number
  entrevista: 'APTO' | 'NO_APTO'
  evaluacionPsicologica: 'APTO' | 'NO_APTO'
  observaciones: string
}

export type CuerpoPago = { fecha: string; monto: number; medio: MedioPago; numeroOperacion: string }

export const clavesMatriculas = {
  todo: ['matriculas'] as const,
  lista: (estado: EstadoMatricula) => [...clavesMatriculas.todo, 'lista', estado] as const,
  detalle: (id: number) => [...clavesMatriculas.todo, 'detalle', id] as const,
}

export async function listarBandeja(estado: EstadoMatricula): Promise<MatriculaBandeja[]> {
  const filas = await sigeda.lista<unknown>('/api/matriculas', { estado })
  return filas.map((fila) => esquemaBandeja.parse(fila))
}

export async function obtenerMatricula(id: number): Promise<MatriculaDetalle> {
  return esquemaDetalle.parse(await sigeda.get<unknown>(`/api/matriculas/${id}`))
}

type Mensaje = { mensaje: string }

export const validarMatricula = (id: number) => sigeda.put<Mensaje>(`/api/matriculas/${id}/validar`)
export const rechazarMatricula = (id: number, motivo: string) => sigeda.put<Mensaje>(`/api/matriculas/${id}/rechazar`, { motivo })
export const observarMatricula = (id: number, observaciones: string) =>
  sigeda.put<Mensaje>(`/api/matriculas/${id}/observar`, { observaciones })
export const observarDocumento = (id: number, tipo: TipoDocumentoPostulacion, observaciones: string) =>
  sigeda.put<Mensaje>(`/api/matriculas/${id}/documentos/${tipo}/observar`, { observaciones })
export const aceptarDocumento = (
  id: number,
  tipo: TipoDocumentoPostulacion,
  datos?: { vigenciaHasta: string; nivel?: string | null },
) => sigeda.put<Mensaje>(`/api/matriculas/${id}/documentos/${tipo}/aceptar`, datos)
export const citarPostulante = (id: number, cuerpo: { fecha: string; hora: string; lugar: string }) =>
  sigeda.put<Mensaje>(`/api/matriculas/${id}/citacion`, cuerpo)
export const registrarEvaluacion = (id: number, cuerpo: CuerpoEvaluacion) =>
  sigeda.post<Mensaje & { resultado: 'ADMITIDO' | 'NO_ADMITIDO' }>(`/api/matriculas/${id}/resultado`, cuerpo)
export const registrarPago = (id: number, cuerpo: CuerpoPago) => sigeda.put<Mensaje>(`/api/matriculas/${id}/pago`, cuerpo)

export const bandejaQuery = (estado: EstadoMatricula) =>
  queryOptions({ queryKey: clavesMatriculas.lista(estado), queryFn: () => listarBandeja(estado) })

export const matriculaQuery = (id: number) =>
  queryOptions({ queryKey: clavesMatriculas.detalle(id), queryFn: () => obtenerMatricula(id) })

/**
 * Los documentos están detrás de `Manage Enrollments`, así que no se abren con un `<img src>` —no llevan
 * el token—. Se descargan por el cliente autenticado y se abren como object URL.
 */
export async function abrirDocumento(id: number, tipo: TipoDocumentoPostulacion): Promise<void> {
  const respuesta = await fetch(`${config.sigedaApiUrl}/api/matriculas/${id}/documentos/${tipo}`, {
    headers: { Authorization: `Bearer ${tokens.acceso() ?? ''}` },
  })
  if (!respuesta.ok) throw new Error('No se pudo descargar el documento.')
  const url = URL.createObjectURL(await respuesta.blob())
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

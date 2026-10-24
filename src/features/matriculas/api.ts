import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'
import { tokens } from '@/lib/auth/tokens'
import { config } from '@/lib/config'

export type EstadoMatricula = 'PENDIENTE' | 'VALIDADA' | 'RECHAZADA'

export type MatriculaBandeja = {
  id: number
  idCurso: number | null
  dni: string
  nombres: string
  aPaterno: string
  aMaterno: string
  correo: string
  fecha: string
  estado: EstadoMatricula
}

export type MatriculaDetalle = MatriculaBandeja & {
  contacto: string | null
  idHorario: number | null
  comprobanteTipo: string | null
  motivoRechazo: string | null
  codPersona: string | null
}

const esquemaEstado = z.enum(['PENDIENTE', 'VALIDADA', 'RECHAZADA'])

const esquemaBandeja = z.object({
  id: z.number(),
  idCurso: z.number().nullable(),
  dni: z.string(),
  nombres: z.string(),
  aPaterno: z.string(),
  aMaterno: z.string(),
  correo: z.string(),
  fecha: z.string(),
  estado: esquemaEstado,
})

const esquemaDetalle = esquemaBandeja.extend({
  contacto: z.string().nullable(),
  idHorario: z.number().nullable(),
  comprobanteTipo: z.string().nullable(),
  motivoRechazo: z.string().nullable(),
  codPersona: z.string().nullable(),
})

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

export function validarMatricula(id: number): Promise<{ mensaje: string }> {
  return sigeda.put<{ mensaje: string }>(`/api/matriculas/${id}/validar`)
}

export function rechazarMatricula(id: number, motivo: string): Promise<{ mensaje: string }> {
  return sigeda.put<{ mensaje: string }>(`/api/matriculas/${id}/rechazar`, { motivo })
}

export const bandejaQuery = (estado: EstadoMatricula) =>
  queryOptions({ queryKey: clavesMatriculas.lista(estado), queryFn: () => listarBandeja(estado) })

export const matriculaQuery = (id: number) =>
  queryOptions({ queryKey: clavesMatriculas.detalle(id), queryFn: () => obtenerMatricula(id) })

/**
 * El comprobante está detrás de `Manage Enrollments`, así que no se puede abrir con un `<img src>` —no
 * lleva el token—. Se descarga por el cliente autenticado y se abre como object URL.
 */
export async function abrirComprobante(id: number): Promise<void> {
  const respuesta = await fetch(`${config.sigedaApiUrl}/api/matriculas/${id}/comprobante`, {
    headers: { Authorization: `Bearer ${tokens.acceso() ?? ''}` },
  })
  if (!respuesta.ok) throw new Error('No se pudo descargar el comprobante.')
  const url = URL.createObjectURL(await respuesta.blob())
  window.open(url, '_blank', 'noopener')
}

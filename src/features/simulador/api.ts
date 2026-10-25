import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'
import { clavesTurnos } from '@/features/turnos/api'
import { esNotaDirbe, type NotaDirbe } from '@/lib/dominio/dirbe'

export type CalificacionPropuesta = {
  idManiobra: number
  maniobra: string
  notaMin: string
  notaPropuesta: NotaDirbe | null
  observacion: string | null
}

export type PropuestaEvaluacion = { calificaciones: CalificacionPropuesta[] }

export type MedicionTelemetria = { clave: string; valor: number; unidad?: string }
export type ManiobraMedida = { idManiobra: number; mediciones: MedicionTelemetria[] }
export type SesionTelemetria = {
  codAlumno: string
  dispositivo?: string | null
  fuente?: string | null
  maniobras: ManiobraMedida[]
}

const esquemaCalificacion = z.object({
  idManiobra: z.number(),
  maniobra: z.string().nullish(),
  notaMin: z.string().nullish(),
  notaPropuesta: z.string().nullish(),
  observacion: z.string().nullish(),
})

const esquemaPropuesta = z.object({ calificaciones: z.array(esquemaCalificacion) })

// Una nota propuesta solo se acepta si es DIRBE; cualquier otra cosa (null incluido) deja la
// maniobra sin proponer, para que el instructor la califique a mano.
export function aPropuesta(raw: z.infer<typeof esquemaPropuesta>): PropuestaEvaluacion {
  return {
    calificaciones: raw.calificaciones.map((calificacion) => {
      const propuesta = (calificacion.notaPropuesta ?? '').toUpperCase()
      return {
        idManiobra: calificacion.idManiobra,
        maniobra: calificacion.maniobra ?? '',
        notaMin: (calificacion.notaMin ?? '').toUpperCase(),
        notaPropuesta: esNotaDirbe(propuesta) ? propuesta : null,
        observacion: calificacion.observacion ?? null,
      }
    }),
  }
}

export const clavesSimulador = {
  propuesta: (idTurno: number, codAlumno: string) => ['simulador', 'propuesta', idTurno, codAlumno] as const,
}

export async function obtenerPropuesta(idTurno: number, codAlumno: string): Promise<PropuestaEvaluacion> {
  const raw = await sigeda.get<unknown>(
    `/api/turnos/${encodeURIComponent(idTurno)}/persona/${encodeURIComponent(codAlumno)}/propuesta-simulador`,
  )
  return aPropuesta(esquemaPropuesta.parse(raw))
}

export async function ingerirSesion(idTurno: number, cuerpo: SesionTelemetria): Promise<void> {
  await sigeda.post<unknown>(`/api/turnos/${encodeURIComponent(idTurno)}/sesiones-simulador`, cuerpo)
}

export const consultasSimulador = {
  propuesta: (idTurno: number, codAlumno: string, habilitado: boolean) =>
    queryOptions({
      queryKey: clavesSimulador.propuesta(idTurno, codAlumno),
      queryFn: () => obtenerPropuesta(idTurno, codAlumno),
      enabled: habilitado,
    }),
}

export function useIngerirSesion(idTurno: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: SesionTelemetria) => ingerirSesion(idTurno, cuerpo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulador', 'propuesta', idTurno] })
      queryClient.invalidateQueries({ queryKey: clavesTurnos.detalle(idTurno) })
    },
  })
}

import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import { sigeda } from '@/lib/api/sigeda'

export type SituacionFinal = 'EGRESADO' | 'DESAPROBADO' | 'RETIRADO' | 'NO_CULMINO'
export type SituacionDelCierre = SituacionFinal | 'EN_CURSO' | 'LISTO'
export type Decision = 'CONTINUA' | 'SEPARADO' | 'RETIRO'

export const ETIQUETA_SITUACION: Record<SituacionDelCierre, string> = {
  EN_CURSO: 'En curso',
  LISTO: 'Cumple el egreso',
  EGRESADO: 'Egresado',
  DESAPROBADO: 'Separado',
  RETIRADO: 'Retirado',
  NO_CULMINO: 'No culminó',
}

const situacionFinal = z.enum(['EGRESADO', 'DESAPROBADO', 'RETIRADO', 'NO_CULMINO'])
const nulo = <T extends z.ZodTypeAny>(esquema: T) => esquema.nullish().transform((v) => v ?? null)

const esquemaTablero = z.object({
  id: z.number(),
  nombre: z.string(),
  estado: nulo(z.string()),
  fechaInicio: nulo(z.string()),
  fechaFin: nulo(z.string()),
  plazoMaximo: nulo(z.string()),
  puedeCerrar: z.boolean(),
  motivos: z.array(z.string()),
  alumnos: z.array(
    z.object({
      codigo: z.string(),
      nombre: z.string(),
      estado: nulo(z.string()),
      situacion: z.enum(['EN_CURSO', 'LISTO', 'EGRESADO', 'DESAPROBADO', 'RETIRADO', 'NO_CULMINO']),
      subfasesCompletas: z.number(),
      subfasesTotales: z.number(),
      asignaturasAprobadas: z.number(),
      asignaturasTotales: z.number(),
      nfpi: nulo(z.number()),
      puesto: nulo(z.number()),
      constancia: nulo(z.string()),
      observacion: nulo(z.string()),
    }),
  ),
})

export type TableroDeCierre = z.infer<typeof esquemaTablero>
export type AlumnoDelCierre = TableroDeCierre['alumnos'][number]

const esquemaConstancia = z.object({
  codAlumno: z.string(),
  nombre: z.string(),
  dni: nulo(z.string()),
  cohorte: nulo(z.string()),
  fechaInicio: nulo(z.string()),
  fecha: nulo(z.string()),
  situacion: situacionFinal,
  observacion: nulo(z.string()),
  nit: nulo(z.number()),
  nia: nulo(z.number()),
  nfpi: nulo(z.number()),
  puesto: nulo(z.number()),
  egresados: z.number(),
  horasVuelo: nulo(z.number()),
  horasSimulador: nulo(z.number()),
  constancia: nulo(z.string()),
})

export type ConstanciaDeEgreso = z.infer<typeof esquemaConstancia>

export const clavesEgreso = {
  todo: ['egreso'] as const,
  cierre: (id: number) => [...clavesEgreso.todo, 'cierre', id] as const,
  constancia: (cod: string) => [...clavesEgreso.todo, 'constancia', cod] as const,
}

export async function obtenerCierre(id: number): Promise<TableroDeCierre> {
  return esquemaTablero.parse(await sigeda.get<unknown>(`/api/grupos/${encodeURIComponent(id)}/cierre`))
}

export async function registrarDecision(id: number, cod: string, decision: Decision, observacion: string | null): Promise<string> {
  return soloMensaje(
    await sigeda.post<unknown>(`/api/grupos/${encodeURIComponent(id)}/alumnos/${encodeURIComponent(cod)}/decision`, {
      decision,
      observacion,
    }),
  )
}

export async function obtenerConstancia(cod: string): Promise<ConstanciaDeEgreso> {
  return esquemaConstancia.parse(await sigeda.get<unknown>(`/api/resultados-finales/${encodeURIComponent(cod)}`))
}

export const consultasEgreso = {
  cierre: (id: number) => queryOptions({ queryKey: clavesEgreso.cierre(id), queryFn: () => obtenerCierre(id) }),
  constancia: (cod: string) => queryOptions({ queryKey: clavesEgreso.constancia(cod), queryFn: () => obtenerConstancia(cod) }),
}

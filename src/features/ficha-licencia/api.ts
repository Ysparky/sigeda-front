import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type EstadoFicha =
  | 'EN_PREPARACION'
  | 'OBSERVADA'
  | 'LISTA_PARA_PERICIA'
  | 'PERICIA_APROBADA'
  | 'LICENCIA_EMITIDA'

export type Requisito = { clave: string; cumple: boolean; detalle: string }
export type ResumenFicha = {
  estado: EstadoFicha
  requisitos: Requisito[]
  alertas: string[]
  bloqueos: string[]
}

/** Lo que captura el formulario (todo opcional; la ficha se llena por partes). */
export type CuerpoFicha = {
  fechaNacimiento: string | null
  secundariaCompleta: boolean | null
  inglesNivel: string | null
  inglesVigencia: string | null
  medicoVigencia: string | null
  licenciaAlumnoEmision: string | null
  horasTotal: number | null
  horasDobleMando: number | null
  horasSolo: number | null
  horasSoloTravesia: number | null
  horasNocturnas: number | null
  horasInstrumentos: number | null
  horasSimulador: number | null
  travesia100nm: boolean | null
  nocturno10x10: boolean | null
  examenTeoricoFecha: string | null
  examenTeoricoNota: number | null
  declaracionFecha: string | null
  periciaFecha: string | null
  periciaResultado: 'APROBADA' | 'DESAPROBADA' | null
  pagoTeorico: boolean | null
  pagoPractica: boolean | null
  solicitudPresentada: boolean | null
  licenciaEmitida: boolean | null
}

export type HorasRegistradas = {
  vuelo: number
  simulador: number
  solo: number
  soloTravesia: number
  nocturno: number
  aterrizajesNocturnos: number
  travesia100nm: boolean
}

export type Ficha = CuerpoFicha & {
  codAlumno: string
  cursoAprobado: boolean
  horasRegistradas: HorasRegistradas
  resumen: ResumenFicha
}

const esquemaResumen = z.object({
  estado: z.enum(['EN_PREPARACION', 'OBSERVADA', 'LISTA_PARA_PERICIA', 'PERICIA_APROBADA', 'LICENCIA_EMITIDA']),
  requisitos: z.array(z.object({ clave: z.string(), cumple: z.boolean(), detalle: z.string() })),
  alertas: z.array(z.string()),
  bloqueos: z.array(z.string()),
})

const n = () => z.number().nullish().transform((v) => v ?? null)
const b = () => z.boolean().nullish().transform((v) => v ?? null)
const f = () => z.string().nullish().transform((v) => v ?? null)

const esquemaFicha = z.object({
  codAlumno: z.string(),
  fechaNacimiento: f(),
  secundariaCompleta: b(),
  inglesNivel: f(),
  inglesVigencia: f(),
  medicoVigencia: f(),
  licenciaAlumnoEmision: f(),
  horasTotal: n(),
  horasDobleMando: n(),
  horasSolo: n(),
  horasSoloTravesia: n(),
  horasNocturnas: n(),
  horasInstrumentos: n(),
  horasSimulador: n(),
  travesia100nm: b(),
  nocturno10x10: b(),
  examenTeoricoFecha: f(),
  examenTeoricoNota: n(),
  declaracionFecha: f(),
  periciaFecha: f(),
  periciaResultado: z.enum(['APROBADA', 'DESAPROBADA']).nullish().transform((v) => v ?? null),
  pagoTeorico: b(),
  pagoPractica: b(),
  solicitudPresentada: b(),
  licenciaEmitida: b(),
  cursoAprobado: z.boolean().nullish().transform((v) => v === true),
  horasRegistradas: z
    .object({
      vuelo: z.number(),
      simulador: z.number(),
      solo: z.number().default(0),
      soloTravesia: z.number().default(0),
      nocturno: z.number().default(0),
      aterrizajesNocturnos: z.number().default(0),
      travesia100nm: z.boolean().default(false),
    })
    .nullish()
    .transform(
      (v) => v ?? { vuelo: 0, simulador: 0, solo: 0, soloTravesia: 0, nocturno: 0, aterrizajesNocturnos: 0, travesia100nm: false },
    ),
  resumen: esquemaResumen,
})

export const clavesFicha = {
  todo: ['ficha-licencia'] as const,
  detalle: (cod: string) => [...clavesFicha.todo, cod] as const,
}

export async function obtenerFicha(cod: string): Promise<Ficha> {
  return esquemaFicha.parse(await sigeda.get<unknown>(`/api/fichas-licencia/${encodeURIComponent(cod)}`))
}

export async function guardarFicha(cod: string, cuerpo: CuerpoFicha): Promise<void> {
  await sigeda.put<unknown>(`/api/fichas-licencia/${encodeURIComponent(cod)}`, cuerpo)
}

export const fichaQuery = (cod: string) =>
  queryOptions({ queryKey: clavesFicha.detalle(cod), queryFn: () => obtenerFicha(cod) })

export const ETIQUETA_ESTADO_FICHA: Record<EstadoFicha, string> = {
  EN_PREPARACION: 'En preparación',
  OBSERVADA: 'Observada',
  LISTA_PARA_PERICIA: 'Lista para pericia',
  PERICIA_APROBADA: 'Pericia aprobada',
  LICENCIA_EMITIDA: 'Licencia emitida',
}

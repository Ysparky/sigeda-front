import { http, HttpResponse } from 'msw'
import { API, autorizar, erroresDeCampo, textoNoEncontrado } from './comun'

type TipoSimuladorMock = 'FNPT' | 'FTD' | 'FFS'

type SimuladorMock = {
  id: number
  nombre: string
  tipo: TipoSimuladorMock
  descripcion: string | null
  ubicacion: string | null
  activo: boolean
}

const SIMULADORES_SEMILLA: SimuladorMock[] = [
  {
    id: 1,
    nombre: 'FNPT II - Bell 206',
    tipo: 'FNPT',
    descripcion: 'Entrenador de procedimientos de vuelo para helicóptero ligero.',
    ubicacion: 'Escuadrón de Instrucción',
    activo: true,
  },
]

let simuladoresMock: SimuladorMock[] = SIMULADORES_SEMILLA.map((s) => ({ ...s }))
let secuenciaSimulador = 1

type IndicadorMock = {
  id: number
  nombre: string
  descripcion: string | null
  competencia: string | null
  orden: number
}

type EscenarioMock = {
  id: number
  nombre: string
  descripcion: string | null
  objetivo: string | null
  duracionMin: number | null
  activo: boolean
  indicadores: IndicadorMock[]
}

const ESCENARIOS_SEMILLA: EscenarioMock[] = [
  {
    id: 1,
    nombre: 'Emergencia en vuelo - falla de motor',
    descripcion: 'Gestión de una falla de motor en crucero y autorrotación hasta la toma.',
    objetivo: 'Evaluar la respuesta del alumno ante una emergencia de motor bajo carga.',
    duracionMin: 60,
    activo: true,
    indicadores: [
      { id: 1, nombre: 'Aplicación de procedimientos', descripcion: null, competencia: 'Aplicación de procedimientos', orden: 1 },
      { id: 2, nombre: 'Comunicación', descripcion: null, competencia: 'Comunicación', orden: 2 },
    ],
  },
]

const clonarEscenario = (e: EscenarioMock): EscenarioMock => ({
  ...e,
  indicadores: e.indicadores.map((i) => ({ ...i })),
})

let escenariosMock: EscenarioMock[] = ESCENARIOS_SEMILLA.map(clonarEscenario)
let secuenciaEscenario = 1
let secuenciaIndicador = 100

export function reiniciarSimulador() {
  simuladoresMock = SIMULADORES_SEMILLA.map((s) => ({ ...s }))
  secuenciaSimulador = 1
  escenariosMock = ESCENARIOS_SEMILLA.map(clonarEscenario)
  secuenciaEscenario = 1
  secuenciaIndicador = 100
}

export function sembrarSimuladorMock(parcial: Partial<SimuladorMock> = {}): SimuladorMock {
  const fila: SimuladorMock = {
    id: (secuenciaSimulador += 1),
    nombre: 'Simulador',
    tipo: 'FNPT',
    descripcion: null,
    ubicacion: null,
    activo: true,
    ...parcial,
  }
  simuladoresMock.push(fila)
  return fila
}

export const handlersSimulador = [
  http.get(`${API}/api/simuladores`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json(simuladoresMock)
  }),

  http.post(`${API}/api/simuladores`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as Partial<SimuladorMock>
    if (!cuerpo.nombre || cuerpo.nombre.trim() === '')
      return erroresDeCampo(["'nombre': El nombre es obligatorio."])
    const fila = sembrarSimuladorMock({
      nombre: cuerpo.nombre,
      tipo: (cuerpo.tipo as TipoSimuladorMock) ?? 'FNPT',
      descripcion: cuerpo.descripcion ?? null,
      ubicacion: cuerpo.ubicacion ?? null,
      activo: cuerpo.activo ?? true,
    })
    return HttpResponse.json({ mensaje: 'Simulador guardado con éxito.', simulador: fila }, { status: 201 })
  }),

  http.get(`${API}/api/simuladores/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = simuladoresMock.find((s) => String(s.id) === params.id)
    if (!fila) return textoNoEncontrado('Simulador')
    return HttpResponse.json(fila)
  }),

  http.put(`${API}/api/simuladores/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = simuladoresMock.find((s) => String(s.id) === params.id)
    if (!fila) return textoNoEncontrado('Simulador')
    const cuerpo = (await request.json()) as Partial<SimuladorMock>
    Object.assign(fila, {
      nombre: cuerpo.nombre ?? fila.nombre,
      tipo: (cuerpo.tipo as TipoSimuladorMock) ?? fila.tipo,
      descripcion: cuerpo.descripcion ?? null,
      ubicacion: cuerpo.ubicacion ?? null,
      activo: cuerpo.activo ?? fila.activo,
    })
    return HttpResponse.json(fila)
  }),

  http.get(`${API}/api/escenarios`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json(escenariosMock)
  }),

  http.post(`${API}/api/escenarios`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as Partial<EscenarioMock>
    if (!cuerpo.nombre || cuerpo.nombre.trim() === '')
      return erroresDeCampo(["'nombre': El nombre es obligatorio."])
    const escenario: EscenarioMock = {
      id: (secuenciaEscenario += 1),
      nombre: cuerpo.nombre,
      descripcion: cuerpo.descripcion ?? null,
      objetivo: cuerpo.objetivo ?? null,
      duracionMin: cuerpo.duracionMin ?? null,
      activo: cuerpo.activo ?? true,
      indicadores: indicadoresDesde(cuerpo.indicadores),
    }
    escenariosMock.push(escenario)
    return HttpResponse.json({ mensaje: 'Escenario guardado con éxito.', escenario }, { status: 201 })
  }),

  http.get(`${API}/api/escenarios/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = escenariosMock.find((e) => String(e.id) === params.id)
    if (!fila) return textoNoEncontrado('Escenario')
    return HttpResponse.json(fila)
  }),

  http.put(`${API}/api/escenarios/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = escenariosMock.find((e) => String(e.id) === params.id)
    if (!fila) return textoNoEncontrado('Escenario')
    const cuerpo = (await request.json()) as Partial<EscenarioMock>
    Object.assign(fila, {
      nombre: cuerpo.nombre ?? fila.nombre,
      descripcion: cuerpo.descripcion ?? null,
      objetivo: cuerpo.objetivo ?? null,
      duracionMin: cuerpo.duracionMin ?? null,
      activo: cuerpo.activo ?? fila.activo,
      indicadores: indicadoresDesde(cuerpo.indicadores),
    })
    return HttpResponse.json(fila)
  }),
]

function indicadoresDesde(entrantes: EscenarioMock['indicadores'] | undefined): IndicadorMock[] {
  return (entrantes ?? []).map((i, posicion) => ({
    id: (secuenciaIndicador += 1),
    nombre: i.nombre,
    descripcion: i.descripcion ?? null,
    competencia: i.competencia ?? null,
    orden: i.orden ?? posicion + 1,
  }))
}

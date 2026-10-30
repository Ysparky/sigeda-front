import { http, HttpResponse } from 'msw'
import { usuarioAutenticado } from './auth'
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

type EstadoSesionMock = 'PLANIFICADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'

type ResultadoSesionMock = { idIndicador: number; calificacion: number; comentario: string | null }

type SesionMock = {
  id: number
  idSimulador: number | null
  idEscenario: number | null
  codAlumno: string
  codInstructor: string
  fechaPlanificada: string
  fechaEjecucion: string | null
  estado: EstadoSesionMock
  notasBriefing: string | null
  notasDebrief: string | null
  autoevaluacionAlumno: string | null
  resultados: ResultadoSesionMock[]
}

const SESIONES_SEMILLA: SesionMock[] = [
  {
    id: 1,
    idSimulador: 1,
    idEscenario: 1,
    codAlumno: '111111',
    codInstructor: 'I00001',
    fechaPlanificada: '2026-11-01',
    fechaEjecucion: null,
    estado: 'EN_CURSO',
    notasBriefing: null,
    notasDebrief: null,
    autoevaluacionAlumno: null,
    resultados: [],
  },
]

const clonarSesion = (s: SesionMock): SesionMock => ({ ...s, resultados: s.resultados.map((r) => ({ ...r })) })

let sesionesMock: SesionMock[] = SESIONES_SEMILLA.map(clonarSesion)
let secuenciaSesion = 1

export function reiniciarSimulador() {
  simuladoresMock = SIMULADORES_SEMILLA.map((s) => ({ ...s }))
  secuenciaSimulador = 1
  escenariosMock = ESCENARIOS_SEMILLA.map(clonarEscenario)
  secuenciaEscenario = 1
  secuenciaIndicador = 100
  sesionesMock = SESIONES_SEMILLA.map(clonarSesion)
  secuenciaSesion = 1
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
    if (sesionesMock.some((s) => s.idEscenario === fila.id && s.estado === 'COMPLETADA'))
      return HttpResponse.text('No se puede modificar un escenario con sesiones ya calificadas.', { status: 409 })
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

const TRANSICIONES: Record<EstadoSesionMock, EstadoSesionMock[]> = {
  PLANIFICADA: ['EN_CURSO', 'CANCELADA'],
  EN_CURSO: ['CANCELADA'],
  COMPLETADA: [],
  CANCELADA: [],
}

function nombreSimulador(id: number | null): string | null {
  return id === null ? null : (simuladoresMock.find((s) => s.id === id)?.nombre ?? null)
}

function escenarioPorId(id: number | null): EscenarioMock | undefined {
  return id === null ? undefined : escenariosMock.find((e) => e.id === id)
}

function aIndex(s: SesionMock) {
  return {
    id: s.id,
    idSimulador: s.idSimulador,
    simuladorNombre: nombreSimulador(s.idSimulador),
    idEscenario: s.idEscenario,
    escenarioNombre: escenarioPorId(s.idEscenario)?.nombre ?? null,
    codAlumno: s.codAlumno,
    fechaPlanificada: s.fechaPlanificada,
    estado: s.estado,
  }
}

function aDetalle(s: SesionMock) {
  const indicadores = escenarioPorId(s.idEscenario)?.indicadores ?? []
  const resumen =
    s.estado !== 'COMPLETADA' ? null : s.resultados.some((r) => r.calificacion === 1) ? 'NO_COMPETENTE' : 'COMPETENTE'
  return {
    ...aIndex(s),
    codInstructor: s.codInstructor,
    fechaEjecucion: s.fechaEjecucion,
    notasBriefing: s.notasBriefing,
    notasDebrief: s.notasDebrief,
    autoevaluacionAlumno: s.autoevaluacionAlumno,
    resultados: s.resultados.map((r) => {
      const indicador = indicadores.find((i) => i.id === r.idIndicador)
      return {
        idIndicador: r.idIndicador,
        indicadorNombre: indicador?.nombre ?? null,
        competencia: indicador?.competencia ?? null,
        calificacion: r.calificacion,
        comentario: r.comentario,
      }
    }),
    resumen,
  }
}

export const handlersSesionSimulador = [
  http.get(`${API}/api/sesiones-simulador/mias`, ({ request }) => {
    const usuario = usuarioAutenticado(request)
    if (!usuario) return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 })
    return HttpResponse.json(sesionesMock.filter((s) => s.codAlumno === usuario.codPersona).map(aIndex))
  }),

  http.get(`${API}/api/sesiones-simulador`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const estado = new URL(request.url).searchParams.get('estado')
    return HttpResponse.json(sesionesMock.filter((s) => !estado || s.estado === estado).map(aIndex))
  }),

  http.get(`${API}/api/sesiones-simulador/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = sesionesMock.find((s) => String(s.id) === params.id)
    if (!fila) return textoNoEncontrado('Sesión')
    return HttpResponse.json(aDetalle(fila))
  }),

  http.post(`${API}/api/sesiones-simulador`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as Partial<SesionMock>
    if (cuerpo.idSimulador == null || !simuladoresMock.some((s) => s.id === cuerpo.idSimulador))
      return HttpResponse.text('El simulador indicado no existe.', { status: 400 })
    if (cuerpo.idEscenario == null || !escenariosMock.some((e) => e.id === cuerpo.idEscenario))
      return HttpResponse.text('El escenario indicado no existe.', { status: 400 })
    const sesion: SesionMock = {
      id: (secuenciaSesion += 1),
      idSimulador: cuerpo.idSimulador,
      idEscenario: cuerpo.idEscenario,
      codAlumno: cuerpo.codAlumno ?? '',
      codInstructor: cuerpo.codInstructor ?? '',
      fechaPlanificada: cuerpo.fechaPlanificada ?? '',
      fechaEjecucion: null,
      estado: 'PLANIFICADA',
      notasBriefing: null,
      notasDebrief: null,
      autoevaluacionAlumno: null,
      resultados: [],
    }
    sesionesMock.push(sesion)
    return HttpResponse.json({ mensaje: 'Sesión planificada.', sesion }, { status: 201 })
  }),

  http.put(`${API}/api/sesiones-simulador/:id/estado`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = sesionesMock.find((s) => String(s.id) === params.id)
    if (!fila) return textoNoEncontrado('Sesión')
    const { estado } = (await request.json()) as { estado: EstadoSesionMock }
    if (!TRANSICIONES[fila.estado].includes(estado))
      return HttpResponse.text('Transición de estado no permitida.', { status: 409 })
    fila.estado = estado
    return HttpResponse.json({ mensaje: 'Estado de la sesión actualizado.' })
  }),

  http.post(`${API}/api/sesiones-simulador/:id/calificacion`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = sesionesMock.find((s) => String(s.id) === params.id)
    if (!fila) return textoNoEncontrado('Sesión')
    if (fila.estado !== 'EN_CURSO')
      return HttpResponse.text('Solo se califica una sesión en curso.', { status: 409 })
    const cuerpo = (await request.json()) as {
      notasBriefing?: string
      notasDebrief?: string
      autoevaluacionAlumno?: string
      resultados?: ResultadoSesionMock[]
    }
    if ((cuerpo.resultados ?? []).length === 0)
      return HttpResponse.text('Debe calificar al menos un indicador.', { status: 400 })
    const validos = new Set((escenarioPorId(fila.idEscenario)?.indicadores ?? []).map((i) => i.id))
    const vistos = new Set<number>()
    for (const r of cuerpo.resultados ?? []) {
      if (!validos.has(r.idIndicador))
        return HttpResponse.text('Hay un indicador que no pertenece al escenario de la sesión.', { status: 400 })
      if (vistos.has(r.idIndicador))
        return HttpResponse.text('Hay un indicador calificado más de una vez.', { status: 400 })
      vistos.add(r.idIndicador)
    }
    fila.resultados = (cuerpo.resultados ?? []).map((r) => ({
      idIndicador: r.idIndicador,
      calificacion: r.calificacion,
      comentario: r.comentario ?? null,
    }))
    fila.notasBriefing = cuerpo.notasBriefing ?? null
    fila.notasDebrief = cuerpo.notasDebrief ?? null
    fila.autoevaluacionAlumno = cuerpo.autoevaluacionAlumno ?? null
    fila.estado = 'COMPLETADA'
    fila.fechaEjecucion = '2026-10-30'
    return HttpResponse.json({ mensaje: 'Sesión calificada.' })
  }),
]

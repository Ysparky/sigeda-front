import { http, HttpResponse } from 'msw'
import { datos } from './datos'
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
  idSubfase?: number | null
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

type MuestraMock = { t: number; altitud: number; velocidad: number; rpmRotor: number; velocidadVertical: number }
type EventoMock = { t: number; tipo: string; detalle: string; valor?: number | null }
type TelemetriaMock = { muestras: MuestraMock[]; eventos: EventoMock[] }
let telemetriasMock = new Map<number, TelemetriaMock>()

/** Las mismas reglas fijas que el backend (EvaluadorDeCabina). */
function proponer(datos: TelemetriaMock, indicadores: IndicadorMock[]) {
  if (datos.muestras.length === 0 && datos.eventos.length === 0) return []
  const primero = (tipo: string) => datos.eventos.find((e) => e.tipo === tipo)
  const seg = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)} s`
  const falla = primero('FALLA')
  return indicadores.flatMap((ind) => {
    const c = (ind.competencia ?? ind.nombre).toLowerCase()
    if (c.includes('procedimiento')) {
      const r = primero('RESPUESTA')
      if (!falla || !r) return [{ idIndicador: ind.id, calificacion: 1, motivo: 'No hubo respuesta a la falla.' }]
      const d = r.t - falla.t
      return [{ idIndicador: ind.id, calificacion: d <= 2 ? 5 : d <= 3 ? 4 : d <= 4 ? 3 : d <= 6 ? 2 : 1, motivo: `Respondió a la falla en ${seg(d)}.` }]
    }
    if (c.includes('comunicaci')) {
      const dec = primero('DECLARA_EMERGENCIA')
      if (!dec) return [{ idIndicador: ind.id, calificacion: 1, motivo: 'No declaró la emergencia.' }]
      const d = dec.t - (falla?.t ?? 0)
      return [{ idIndicador: ind.id, calificacion: d <= 5 ? 5 : d <= 10 ? 4 : d <= 20 ? 3 : 2, motivo: `Declaró la emergencia a los ${seg(d)} de la falla.` }]
    }
    if (c.includes('conciencia')) {
      const tras = datos.muestras.filter((m) => m.t >= (falla?.t ?? 0))
      if (tras.length === 0) return []
      const pct = Math.round((tras.filter((m) => m.rpmRotor >= 90 && m.rpmRotor <= 110).length * 100) / tras.length)
      return [{ idIndicador: ind.id, calificacion: pct >= 95 ? 5 : pct >= 85 ? 4 : pct >= 70 ? 3 : pct >= 50 ? 2 : 1, motivo: `Mantuvo las RPM del rotor en rango el ${pct} % del tiempo.` }]
    }
    if (c.includes('liderazgo')) {
      const n = datos.eventos.filter((e) => e.tipo === 'CHECKLIST').length
      return [{ idIndicador: ind.id, calificacion: n >= 4 ? 5 : n === 3 ? 4 : n === 2 ? 3 : n === 1 ? 2 : 1, motivo: `Ejecutó ${n} ${n === 1 ? 'lista' : 'listas'} de chequeo.` }]
    }
    if (c.includes('carga')) {
      const fin = primero('FINAL')
      if (!fin || fin.valor == null) return [{ idIndicador: ind.id, calificacion: 1, motivo: 'El ejercicio no terminó.' }]
      const vs = Math.abs(fin.valor)
      return [{ idIndicador: ind.id, calificacion: vs <= 300 ? 5 : vs <= 500 ? 4 : vs <= 700 ? 3 : vs <= 900 ? 2 : 1, motivo: `Terminó a ${Math.round(vs)} ft/min.` }]
    }
    return []
  })
}

export function sembrarTelemetriaMock(idSesion: number, datos: TelemetriaMock) {
  telemetriasMock.set(idSesion, datos)
}

function vistaTelemetria(sesion: SesionMock) {
  const datos = telemetriasMock.get(sesion.id) ?? { muestras: [], eventos: [] }
  const escenario = escenariosMock.find((e) => e.id === sesion.idEscenario)
  return { ...datos, propuesta: proponer(datos, escenario?.indicadores ?? []) }
}
let secuenciaSesion = 1

export function minutosDeSimuladorCompletados(codAlumno: string): number {
  return sesionesMock
    .filter((s) => s.codAlumno === codAlumno && s.estado === 'COMPLETADA')
    .reduce((total, s) => total + (escenariosMock.find((e) => e.id === s.idEscenario)?.duracionMin ?? 0), 0)
}

export function reiniciarSimulador() {
  simuladoresMock = SIMULADORES_SEMILLA.map((s) => ({ ...s }))
  secuenciaSimulador = 1
  escenariosMock = ESCENARIOS_SEMILLA.map(clonarEscenario)
  secuenciaEscenario = 1
  secuenciaIndicador = 100
  sesionesMock = SESIONES_SEMILLA.map(clonarSesion)
  secuenciaSesion = 1
  telemetriasMock = new Map()
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
      idSubfase: cuerpo.idSubfase ?? null,
    }
    escenariosMock.push(escenario)
    return HttpResponse.json({ mensaje: 'Escenario guardado con éxito.', escenario }, { status: 201 })
  }),

  http.get(`${API}/api/escenarios/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = escenariosMock.find((e) => String(e.id) === params.id)
    if (!fila) return textoNoEncontrado('Escenario')
    return HttpResponse.json(conSubfase(fila))
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
      idSubfase: cuerpo.idSubfase ?? null,
    })
    return HttpResponse.json(conSubfase(fila))
  }),
]

function conSubfase(e: EscenarioMock) {
  return { ...e, idSubfase: e.idSubfase ?? null, subfase: datos().subfases.find((s) => s.id === e.idSubfase)?.nombre ?? null }
}

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
  http.get(`${API}/api/sesiones-simulador/:id/telemetria`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = sesionesMock.find((s) => String(s.id) === params.id)
    if (!fila) return textoNoEncontrado('Sesión')
    return HttpResponse.json(vistaTelemetria(fila))
  }),

  http.post(`${API}/api/sesiones-simulador/:id/telemetria`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Simulator')
    if (permitido instanceof Response) return permitido
    const fila = sesionesMock.find((s) => String(s.id) === params.id)
    if (!fila) return textoNoEncontrado('Sesión')
    if (fila.estado !== 'EN_CURSO') return HttpResponse.text('La cabina solo envía datos durante una sesión en curso.', { status: 409 })
    const datos = (await request.json()) as TelemetriaMock
    telemetriasMock.set(fila.id, { muestras: datos.muestras ?? [], eventos: datos.eventos ?? [] })
    return HttpResponse.json(vistaTelemetria(fila))
  }),

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

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

export function reiniciarSimulador() {
  simuladoresMock = SIMULADORES_SEMILLA.map((s) => ({ ...s }))
  secuenciaSimulador = 1
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
]

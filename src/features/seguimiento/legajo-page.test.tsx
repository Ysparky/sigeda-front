import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_SIN_CONEXION } from '@/lib/api/errors'
import {
  TEXTO_CHEQUEO_SIN_SERVIDOR,
  TEXTO_ESTADO_TEORICO_SIN_SERVIDOR,
  TEXTO_EVALUADOR_SIN_CODIGO,
  TEXTO_INDICES_SIN_SERVIDOR,
  TEXTO_SIN_CAUSALES,
  TEXTO_SIN_DATOS_SUFICIENTES,
  TEXTO_SIN_GRUPO,
} from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const API = config.sigedaApiUrl

async function abrirLegajo(cod = '777777', busqueda = '', username = 'instructor.perez') {
  await iniciarComo(username)
  const vista = renderApp(`/seguimiento/${cod}${busqueda}`)
  await screen.findByRole('heading', { level: 1, name: 'Legajo del alumno' })
  return vista
}

async function reabrirLegajo(cod: string, busqueda = '', username = 'instructor.perez') {
  cleanup()
  return abrirLegajo(cod, busqueda, username)
}

function panel(nombre: string) {
  return within(screen.getByRole('region', { name: nombre }))
}

function dato(region: ReturnType<typeof within>, etiqueta: string) {
  return within(region.getByText(etiqueta).closest('div') as HTMLElement)
}

describe('Legajo: cabecera y pestañas', () => {
  it('CA-LEG-01 la cabecera muestra código, nombres, DNI, rango, tipo, estado, grupo y cuenta', async () => {
    await abrirLegajo()
    const cabecera = panel('Cabecera')
    expect(await cabecera.findByText('Carlos Ramirez Sanchez')).toBeInTheDocument()
    expect(cabecera.getByText('777777')).toBeInTheDocument()
    expect(cabecera.getByText('78901234')).toBeInTheDocument()
    expect(cabecera.getByText('Mayor')).toBeInTheDocument()
    expect(cabecera.getByText('Alumno')).toBeInTheDocument()
    expect(cabecera.getByText('En chequeo')).toBeInTheDocument()
    expect(cabecera.getByText('Grupo 4 · PDI')).toBeInTheDocument()
    expect(cabecera.getByText('alumno.ramirez')).toBeInTheDocument()
  })

  it('CA-LEG-01 los apellidos llegan con las claves APaterno y AMaterno y se muestran igual', async () => {
    let pedido = false
    server.use(
      http.get(`${API}/api/personas/:cod/alumno`, () => {
        pedido = true
        return HttpResponse.json({
          dni: '99999999',
          nombre: 'Prueba',
          APaterno: 'Mayúscula',
          AMaterno: 'Rara',
          rango: 'Cadete',
          estado: 'Apto',
          usuario: null,
        })
      }),
    )
    await abrirLegajo()
    expect(await panel('Cabecera').findByText('Prueba Mayúscula Rara')).toBeInTheDocument()
    expect(pedido).toBe(true)
    expect(panel('Cabecera').getByText('Sin cuenta')).toBeInTheDocument()
  })

  it('CA-LEG-01 un alumno sin grupo lo muestra con S3', async () => {
    await abrirLegajo('654321')
    expect(await panel('Cabecera').findByText(TEXTO_SIN_GRUPO)).toBeInTheDocument()
  })

  it('CA-LEG-02 las tres pestañas se ven en la URL y sobreviven una recarga', async () => {
    const { usuario, router } = await abrirLegajo()
    expect(screen.getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    await usuario.click(screen.getByRole('link', { name: 'Práctico' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ tab: 'practico' }))
    expect(screen.getByRole('link', { name: 'Práctico' })).toHaveAttribute('aria-current', 'page')
    const recargada = await reabrirLegajo('777777', '?tab=teorico')
    expect(recargada.router.state.location.search).toMatchObject({ tab: 'teorico' })
    expect(screen.getByRole('link', { name: 'Teórico' })).toHaveAttribute('aria-current', 'page')
  })

  it('CA-LEG-02 cada pestaña carga sus datos solo al abrirse', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    const { usuario } = await abrirLegajo()
    await waitFor(() => expect(pedidas).toContain('/api/personas/777777/alumno'))
    expect(pedidas).not.toContain('/api/evaluaciones/filter/persona/777777')
    await usuario.click(screen.getByRole('link', { name: 'Práctico' }))
    await waitFor(() => expect(pedidas).toContain('/api/evaluaciones/filter/persona/777777'))
    server.events.removeAllListeners('request:start')
  })
})

describe('Legajo: historial práctico', () => {
  it('CA-LEG-03 muestra código, nombre, fase, evaluador, fecha, promedio y clasificación', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const tabla = within(await screen.findByRole('table', { name: 'Historial de evaluaciones' }))
    for (const columna of ['Código', 'Nombre', 'Fase', 'Evaluador', 'Fecha', 'Promedio', 'Clasificación']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    const fila = within(tabla.getByRole('link', { name: '777777-1' }).closest('tr') as HTMLElement)
    expect(fila.getByText('Adaptación')).toBeInTheDocument()
    expect(fila.getByText('Maria Flores')).toBeInTheDocument()
    expect(fila.getByText('12.00')).toBeInTheDocument()
    expect(fila.getByText('Malo')).toBeInTheDocument()
  })

  it('CA-LEG-03 pagina y filtra por subfase y clasificación desde la URL', async () => {
    await abrirLegajo('777777', '?tab=practico&size=2')
    expect(await screen.findByText('Página 1 de 3 · 5 registros')).toBeInTheDocument()
    await reabrirLegajo('777777', '?tab=practico&clasificacion=Bueno')
    await waitFor(() =>
      expect(within(screen.getByRole('table', { name: 'Historial de evaluaciones' })).getAllByRole('row')).toHaveLength(2),
    )
    await reabrirLegajo('555555', '?tab=practico&idSubfase=2')
    expect(await screen.findByText('No hay evaluaciones')).toBeInTheDocument()
  })

  it('CA-LEG-04 el evaluador es el texto del servidor, con S10 y sin enlace a su persona', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const tabla = within(await screen.findByRole('table', { name: 'Historial de evaluaciones' }))
    const evaluador = tabla.getAllByText('Maria Flores')[0]!
    expect(evaluador.closest('a')).toBeNull()
    expect(screen.getByText(TEXTO_EVALUADOR_SIN_CODIGO)).toBeInTheDocument()
    expect(tabla.queryByText(/cod.*evaluador/i)).not.toBeInTheDocument()
  })

  it('CA-LEG-04 si el catálogo de sub fases falla lo avisa bajo su propio selector y la tabla sigue', async () => {
    server.use(http.get(`${API}/api/subfases`, () => HttpResponse.error()))
    await abrirLegajo('777777', '?tab=practico')
    expect(await screen.findByText('No se pudieron cargar las sub fases.')).toBeInTheDocument()
    expect(screen.getByLabelText('Sub fase')).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Historial de evaluaciones' })).toBeInTheDocument()
  })

  it('CA-LEG-01 sin la dependencia del ciclo de chequeo la cabecera lo dice en lugar del grupo', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirLegajo()
    expect(await screen.findByText(TEXTO_CHEQUEO_SIN_SERVIDOR)).toBeInTheDocument()
    vi.unstubAllEnvs()
  })
})

describe('Legajo: índices del PDI', () => {
  it('CA-LEG-13 muestra el NFPI y, desglosados, el NIT con su NCT y NEI y el NIA con sus tres fases', async () => {
    await abrirLegajo('555555')
    const indices = panel('Índices del PDI')
    expect(await indices.findByText('16.44')).toBeInTheDocument()
    expect(dato(indices, 'NFPI').getByText('NIT (0.2) + NIA (0.8)')).toBeInTheDocument()
    expect(dato(indices, 'NIT').getByText('17.60')).toBeInTheDocument()
    expect(dato(indices, 'NCT').getByText('18.00')).toBeInTheDocument()
    expect(dato(indices, 'NEI').getByText('16.00')).toBeInTheDocument()
    expect(dato(indices, 'NIA').getByText('16.15')).toBeInTheDocument()
    for (const sigla of ['NFAD', 'NFOH', 'NFOA']) {
      expect(indices.getByText(sigla)).toBeInTheDocument()
    }
  })

  it('CA-LEG-13 cada fase baja a sus sub fases con el peso que informa el servidor', async () => {
    await abrirLegajo('777777')
    const indices = panel('Índices del PDI')
    const adaptacion = within(await indices.findByRole('table', { name: 'Sub fases de Adaptación' }))
    expect(adaptacion.getAllByRole('row').slice(1)).toHaveLength(5)
    const contacto = within(adaptacion.getByText('Contacto').closest('tr') as HTMLElement)
    expect(contacto.getByText('0.25')).toBeInTheDocument()
    expect(contacto.getByText('13.00')).toBeInTheDocument()
    expect(indices.queryByRole('table', { name: 'Sub fases de Operaciones AeroTácticas' })).not.toBeInTheDocument()
  })

  it('CA-LEG-13 la pantalla muestra el NFPI del servidor y no uno derivado de sus mitades', async () => {
    server.use(
      http.get(`${API}/api/personas/:cod/indices`, () =>
        HttpResponse.json({
          codigo: '555555',
          alumno: 'Pedro Rodriguez Garcia',
          programa: 'PDI',
          nfpi: 9.99,
          nit: { valor: 20, nct: 20, nei: 20, neiEvaluaciones: 4, asignaturas: [], asignaturasSinNota: [], reduccionPorRezagadoAplicada: false },
          nia: { valor: 20, fases: [], motivo: null },
        }),
      ),
    )
    await abrirLegajo('555555')
    expect(await panel('Índices del PDI').findByText('9.99')).toBeInTheDocument()
  })

  it('CA-LEG-14 un índice nulo se muestra con S14 y nunca como 0', async () => {
    await abrirLegajo('654321')
    const indices = panel('Índices del PDI')
    expect(await indices.findAllByText(TEXTO_SIN_DATOS_SUFICIENTES)).not.toHaveLength(0)
    expect(indices.queryByText('0.00')).not.toBeInTheDocument()
  })

  it('CA-LEG-14 un NFPI nulo no impide mostrar las mitades que sí existen y explica el NIA', async () => {
    await abrirLegajo('666666')
    const indices = panel('Índices del PDI')
    expect(await indices.findByText('12.80')).toBeInTheDocument()
    expect(dato(indices, 'NFPI').getByText(TEXTO_SIN_DATOS_SUFICIENTES)).toBeInTheDocument()
    expect(dato(indices, 'NFAD').getByText('14.00')).toBeInTheDocument()
    expect(indices.getByText('Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.')).toBeInTheDocument()
  })

  it('CA-LEG-13 sin la dependencia el panel de índices lo dice y no pide nada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await abrirLegajo('555555')
    expect(await panel('Índices del PDI').findByText(TEXTO_INDICES_SIN_SERVIDOR)).toBeInTheDocument()
    expect(pedidas.some((ruta) => ruta.includes('/indices'))).toBe(false)
    server.events.removeAllListeners('request:start')
    vi.unstubAllEnvs()
  })
})

describe('Legajo: estado teórico y causales', () => {
  it('CA-LEG-12 muestra el bloqueo por subsanación con su motivo', async () => {
    await abrirLegajo('666666')
    const teorico = panel('Estado teórico')
    expect(await teorico.findByText('Subsanación pendiente')).toBeInTheDocument()
    expect(teorico.getByText(/Desaprobó Mensual Adoctrinamiento de Vuelo/)).toBeInTheDocument()
  })

  it('CA-LEG-12 las causales llevan su etiqueta, su materia y el grupo sobre el que contaron', async () => {
    await abrirLegajo('111111')
    const teorico = panel('Estado teórico')
    expect(await teorico.findAllByText('Promedio de asignatura bajo 13')).toHaveLength(2)
    expect(teorico.getByText('Periódicos generales')).toBeInTheDocument()
    expect(teorico.getAllByText('Adoctrinamiento de Vuelo').length).toBeGreaterThan(0)
    expect(teorico.getByText(/Meteorología/)).toBeInTheDocument()
    expect(teorico.getByText('Nota de asignatura 11.80 en Ingeniería del Helicóptero, por debajo de 13.')).toBeInTheDocument()
  })

  it('CA-LEG-12 una causal sin materia se muestra sin ella y no como un hueco', async () => {
    await abrirLegajo('111111')
    const teorico = panel('Estado teórico')
    const fila = within((await teorico.findByText('Tres asignaturas desaprobadas')).closest('li') as HTMLElement)
    expect(fila.getByText('3 asignaturas desaprobadas.')).toBeInTheDocument()
    expect(fila.queryByText('—')).not.toBeInTheDocument()
    expect(fila.queryByText(/Adoctrinamiento/)).not.toBeInTheDocument()
  })

  it('CA-LEG-12 sin causales el panel lo dice en vez de dejarlo vacío', async () => {
    await abrirLegajo('666666')
    const teorico = panel('Estado teórico')
    await teorico.findByText('Subsanación pendiente')
    expect(teorico.getByText(TEXTO_SIN_CAUSALES)).toBeInTheDocument()
  })

  it('CA-LEG-12 sin la dependencia el panel de estado teórico lo dice', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirLegajo('666666')
    expect(await panel('Estado teórico').findByText(TEXTO_ESTADO_TEORICO_SIN_SERVIDOR)).toBeInTheDocument()
    vi.unstubAllEnvs()
  })
})

describe('Legajo: un panel que falla', () => {
  it('CA-LEG-16 el panel que falla muestra su aviso con Reintentar y los demás siguen con sus datos', async () => {
    server.use(http.get(`${API}/api/personas/:cod/indices`, () => HttpResponse.error()))
    const { usuario } = await abrirLegajo('666666')
    const indices = panel('Índices del PDI')
    expect(await indices.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(panel('Cabecera').getByText('Ana Torres Martinez')).toBeInTheDocument()
    expect(await panel('Estado teórico').findByText('Subsanación pendiente')).toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(indices.getByRole('button', { name: 'Reintentar' }))
    expect(await indices.findByText('12.80')).toBeInTheDocument()
  })
})

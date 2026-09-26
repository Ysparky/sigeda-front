import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_SIN_CONEXION, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import {
  TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR,
  TEXTO_CHEQUEO_SIN_SERVIDOR,
  TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR,
  TEXTO_ESTADO_TEORICO_SIN_SERVIDOR,
  TEXTO_ESTADO_YA_CAMBIO,
  TEXTO_EVALUADOR_SIN_CODIGO,
  TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR,
  TEXTO_INDICES_SIN_SERVIDOR,
  TEXTO_INDICES_SOLO_MOCK,
  TEXTO_MEDIA_SIMPLE_SUBFASE,
  TEXTO_MITAD_PRACTICA,
  TEXTO_MITAD_TEORICA,
  TEXTO_PREVALECE_LA_PRIMERA_NOTA,
  TEXTO_SIN_CAUSALES,
  TEXTO_SIN_CHEQUEOS,
  TEXTO_SIN_DATOS_SUFICIENTES,
  TEXTO_SIN_DESAPROBADOS,
  TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE,
  TEXTO_SIN_EXAMENES_DEL_ALUMNO,
  TEXTO_NOTA_QUE_NO_CUENTA,
  TEXTO_NOTA_QUE_PREVALECE,
  TEXTO_SIN_GRUPO,
  TEXTO_SIN_PROMEDIOS_PONDERADOS,
  TEXTO_SIN_SEGUNDA_NOTA,
  TEXTO_SIN_SUBFASE_ELEGIDA,
  TEXTO_SIN_TURNOS_DEL_ALUMNO,
  TEXTO_TURNO_SIN_CANTIDAD,
  textoCriterioCumplido,
  textoRegularAlternado,
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

function codigosDelHistorial() {
  return within(screen.getByRole('table', { name: 'Historial de evaluaciones' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('link')[0]?.textContent ?? '')
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

  it('CA-LEG-03 abre en fecha descendente, igual que el teórico, y el encabezado lo invierte', async () => {
    const { usuario, router } = await abrirLegajo('777777', '?tab=practico')
    const tabla = within(await screen.findByRole('table', { name: 'Historial de evaluaciones' }))
    expect(codigosDelHistorial()).toEqual(['777777-6', '777777-4', '777777-3', '777777-2', '777777-1'])
    expect(tabla.queryByRole('button', { name: 'Nombre' })).not.toBeInTheDocument()
    await usuario.click(tabla.getByRole('button', { name: 'Fecha' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ property: 'fecha', direction: 'ASC' }))
    await waitFor(() =>
      expect(codigosDelHistorial()).toEqual(['777777-1', '777777-2', '777777-3', '777777-4', '777777-6']),
    )
  })

  it('CA-LEG-03 el orden del historial se alcanza por la URL y viaja a la consulta', async () => {
    const consultas: URL[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname === '/api/evaluaciones/filter/persona/777777') consultas.push(url)
    })
    await abrirLegajo('777777', '?tab=practico&property=codigo&direction=ASC')
    await screen.findByRole('table', { name: 'Historial de evaluaciones' })
    server.events.removeAllListeners('request:start')
    expect(codigosDelHistorial()).toEqual(['777777-1', '777777-2', '777777-3', '777777-4', '777777-6'])
    expect(consultas.map((url) => url.searchParams.get('property'))).toContain('codigo')
    expect(consultas.map((url) => url.searchParams.get('direction'))).toContain('ASC')
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

  it('CA-LEG-01 sin la dependencia del ciclo de chequeo la cabecera lo dice en el Tipo y en el Grupo', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirLegajo()
    const cabecera = panel('Cabecera')
    await cabecera.findByText('Carlos Ramirez Sanchez')
    expect(cabecera.getAllByText(TEXTO_CHEQUEO_SIN_SERVIDOR)).toHaveLength(2)
    expect(dato(cabecera, 'Tipo').getByText(TEXTO_CHEQUEO_SIN_SERVIDOR)).toBeInTheDocument()
    expect(dato(cabecera, 'Grupo').getByText(TEXTO_CHEQUEO_SIN_SERVIDOR)).toBeInTheDocument()
    expect(cabecera.queryByText('—')).not.toBeInTheDocument()
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

  it('CA-LEG-13 dos encabezados separan la mitad teórica de la práctica y cada cifra cae bajo el suyo', async () => {
    await abrirLegajo('555555')
    const indices = panel('Índices del PDI')
    const teorica = await indices.findByRole('heading', { level: 3, name: TEXTO_MITAD_TEORICA })
    const practica = indices.getByRole('heading', { level: 3, name: TEXTO_MITAD_PRACTICA })
    const mitadTeorica = within(teorica.parentElement as HTMLElement)
    const mitadPractica = within(practica.parentElement as HTMLElement)
    for (const sigla of ['NIT', 'NCT', 'NEI']) {
      expect(mitadTeorica.getByText(sigla)).toBeInTheDocument()
      expect(mitadPractica.queryByText(sigla)).not.toBeInTheDocument()
    }
    for (const sigla of ['NIA', 'NFAD', 'NFOH', 'NFOA']) {
      expect(mitadPractica.getByText(sigla)).toBeInTheDocument()
      expect(mitadTeorica.queryByText(sigla)).not.toBeInTheDocument()
    }
    expect(dato(mitadTeorica, 'NEI').getByText('16.00')).toBeInTheDocument()
    expect(dato(mitadPractica, 'NFOH').getByText('16.00')).toBeInTheDocument()
    expect(mitadTeorica.queryByText('NFPI')).not.toBeInTheDocument()
    expect(mitadPractica.queryByText('NFPI')).not.toBeInTheDocument()
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

  it('CA-LEG-13 sin asignaturas pendientes no queda el encabezado de la lista suelto', async () => {
    server.use(
      http.get(`${API}/api/personas/:cod/indices`, () =>
        HttpResponse.json({
          codigo: '555555',
          alumno: 'Pedro Rodriguez Garcia',
          programa: 'PDI',
          nfpi: 16.44,
          nit: {
            valor: 17.6,
            nct: 18,
            nei: 16,
            neiEvaluaciones: 4,
            asignaturas: [],
            asignaturasSinNota: [],
            reduccionPorRezagadoAplicada: false,
          },
          nia: { valor: 16.15, fases: [], motivo: null },
        }),
      ),
    )
    await abrirLegajo('555555')
    const indices = panel('Índices del PDI')
    expect(await indices.findByText('16.44')).toBeInTheDocument()
    expect(indices.queryByText('Sin coeficiente aplicado por falta de nota:')).not.toBeInTheDocument()
  })

  it('M5-22 con la dependencia de índices cerrada la pantalla no pide los índices', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await abrirLegajo('555555')
    await panel('Índices del PDI').findByText(TEXTO_INDICES_SIN_SERVIDOR)
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

describe('Legajo: reporte de sub fase', () => {
  it('CA-LEG-05 elegida una sub fase, el reporte muestra su cabecera, sus maniobras y sus notas', async () => {
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    const reporte = panel('Reporte de sub fase')
    expect(await reporte.findByText('Instrumentos')).toBeInTheDocument()
    expect(reporte.getByText('Adaptación')).toBeInTheDocument()
    expect(reporte.getByText('Carlos Ramirez Sanchez')).toBeInTheDocument()
    const listaDeManiobras = within(reporte.getByRole('list'))
    expect(listaDeManiobras.getByText('Maniobra 9')).toBeInTheDocument()
    expect(listaDeManiobras.getByText('Maniobra 10')).toBeInTheDocument()
    expect(reporte.getAllByRole('article')).toHaveLength(5)
  })

  it('CA-LEG-05 cada evaluación muestra su categoría, clasificación, promedio, recomendación y sus calificaciones', async () => {
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    const reporte = panel('Reporte de sub fase')
    const primera = within((await reporte.findAllByRole('article'))[0]!)
    expect(primera.getByText('777777-1')).toBeInTheDocument()
    expect(primera.getByText('Ponderada')).toBeInTheDocument()
    expect(primera.getByText('Malo')).toBeInTheDocument()
    expect(primera.getByText('12.00')).toBeInTheDocument()
    const calificaciones = within(primera.getByRole('table', { name: 'Calificaciones de 777777-1' }))
    expect(calificaciones.getAllByRole('row').slice(1)).toHaveLength(2)
    const fila = within(calificaciones.getAllByRole('row')[1]!)
    expect(fila.getByText('B')).toBeInTheDocument()
    expect(fila.getByText('I')).toBeInTheDocument()
  })

  it('CA-LEG-05 una sub fase sin evaluaciones muestra el panel vacío, nunca el texto del servidor', async () => {
    await abrirLegajo('555555', '?tab=practico&idSubfase=2')
    const reporte = panel('Reporte de sub fase')
    expect(await reporte.findByText(TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE)).toBeInTheDocument()
    expect(screen.queryByText(/especificada no existe/)).not.toBeInTheDocument()
  })

  it('CA-LEG-05 sin elegir una sub fase el panel lo dice y no pide el reporte', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await abrirLegajo('777777', '?tab=practico')
    await screen.findByRole('table', { name: 'Turnos del alumno' })
    server.events.removeAllListeners('request:start')
    expect(panel('Reporte de sub fase').getByText(TEXTO_SIN_SUBFASE_ELEGIDA)).toBeInTheDocument()
    expect(pedidas.some((ruta) => ruta.startsWith('/api/evaluaciones/subfase/'))).toBe(false)
  })

  it('CA-LEG-05 si las calificaciones no calzan con las maniobras la fila cae al índice', async () => {
    server.use(
      http.get(`${API}/api/evaluaciones/subfase/:id/persona/:cod`, () =>
        HttpResponse.json({
          cabecera: { fase: 'Adaptación', subFase: 'Instrumentos', programa: 'PDI', alumno: 'Carlos Ramirez Sanchez' },
          maniobras: [
            { id: 9, nombre: 'Maniobra 9' },
            { id: 10, nombre: 'Maniobra 10' },
          ],
          notas: [
            {
              codigo: '777777-1',
              categoria: 'Ponderada',
              clasificacion: 'Malo',
              promedio: '12.0',
              recomendacion: null,
              calificaciones: [
                { notaMin: 'B', nota: 'I' },
                { notaMin: 'B', nota: 'R' },
                { notaMin: 'B', nota: 'B' },
              ],
            },
          ],
        }),
      ),
    )
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    const reporte = panel('Reporte de sub fase')
    const tabla = within(await reporte.findByRole('table', { name: 'Calificaciones de 777777-1' }))
    const filas = tabla.getAllByRole('row').slice(1)
    expect(filas).toHaveLength(3)
    expect(within(filas[0]!).getByText('Maniobra 1')).toBeInTheDocument()
    expect(within(filas[1]!).getByText('Maniobra 2')).toBeInTheDocument()
    expect(within(filas[2]!).getByText('Maniobra 3')).toBeInTheDocument()
    expect(tabla.queryByText('Maniobra 9')).not.toBeInTheDocument()
    expect(tabla.queryByText('Maniobra 10')).not.toBeInTheDocument()
  })
})

describe('Legajo: promedios de la sub fase', () => {
  it('CA-LEG-06 lista los promedios del servidor y su media simple con dos decimales bajo S9', async () => {
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    const promedios = panel('Promedios de la sub fase')
    expect(await promedios.findByText(TEXTO_MEDIA_SIMPLE_SUBFASE)).toBeInTheDocument()
    expect(promedios.getAllByText('12.00')).toHaveLength(4)
    expect(promedios.getByText('17.00')).toBeInTheDocument()
    expect(promedios.getByText('13.00')).toBeInTheDocument()
  })

  it('CA-LEG-06 el filtro del servidor excluye el Chequeo e incluye el Chequeo Sub Fase', async () => {
    await abrirLegajo('555555', '?tab=practico&idSubfase=1')
    const deCinco = panel('Promedios de la sub fase')
    expect(await deCinco.findByText('14.50')).toBeInTheDocument()
    expect(deCinco.queryByText('555555-2')).not.toBeInTheDocument()
    await reabrirLegajo('999999', '?tab=practico&idSubfase=1')
    const deNueve = panel('Promedios de la sub fase')
    expect(await deNueve.findByText('16.00')).toBeInTheDocument()
    expect(deNueve.getByText('999999-2')).toBeInTheDocument()
  })

  it('CA-LEG-06 con un solo promedio la media es ese promedio y sin ninguno el panel lo dice', async () => {
    server.use(
      http.get(`${API}/api/evaluaciones/promedio/subfase/:id/persona/:cod`, () =>
        HttpResponse.json([{ codigo: '777777-1', promedio: '12.0' }]),
      ),
    )
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    expect(await panel('Promedios de la sub fase').findAllByText('12.00')).toHaveLength(2)
    server.resetHandlers()
    await reabrirLegajo('555555', '?tab=practico&idSubfase=2')
    expect(await panel('Promedios de la sub fase').findByText(TEXTO_SIN_PROMEDIOS_PONDERADOS)).toBeInTheDocument()
  })

  it('CA-LEG-06 sin elegir una sub fase el panel lo dice y no pide los promedios', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await abrirLegajo('777777', '?tab=practico')
    await screen.findByRole('table', { name: 'Turnos del alumno' })
    server.events.removeAllListeners('request:start')
    expect(panel('Promedios de la sub fase').getByText(TEXTO_SIN_SUBFASE_ELEGIDA)).toBeInTheDocument()
    expect(pedidas.some((ruta) => ruta.startsWith('/api/evaluaciones/promedio/subfase/'))).toBe(false)
  })
})

describe('Legajo: turnos realizados', () => {
  it('CA-LEG-08 lista los turnos del alumno y muestra S11 en lugar de la cantidad de alumnos', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const turnos = panel('Turnos realizados')
    const tabla = within(await turnos.findByRole('table', { name: 'Turnos del alumno' }))
    for (const columna of ['Turno', 'Sub fase', 'Programa', 'Fecha']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(tabla.getByText('Instrumentos Avanzados')).toBeInTheDocument()
    expect(turnos.getByText(TEXTO_TURNO_SIN_CANTIDAD)).toBeInTheDocument()
    expect(tabla.queryByText('Alumnos')).not.toBeInTheDocument()
  })

  it('CA-LEG-08 el panel pagina y declara cuántos turnos hay en total', async () => {
    const { usuario, router } = await abrirLegajo('777777', '?tab=practico&sizeTurnos=1')
    const turnos = panel('Turnos realizados')
    const tabla = within(await turnos.findByRole('table', { name: 'Turnos del alumno' }))
    expect(await turnos.findByText('Página 1 de 2 · 2 registros')).toBeInTheDocument()
    expect(tabla.getAllByRole('row').slice(1)).toHaveLength(1)
    expect(tabla.getByText('Instrumentos Avanzados')).toBeInTheDocument()
    await usuario.click(turnos.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ pageTurnos: 1 }))
    expect(await turnos.findByText('Página 2 de 2 · 2 registros')).toBeInTheDocument()
    expect(within(turnos.getByRole('table', { name: 'Turnos del alumno' })).getByText('Instrumentos Básicos')).toBeInTheDocument()
  })

  it('CA-LEG-08 paginar los turnos no mueve el historial práctico', async () => {
    const { usuario, router } = await abrirLegajo('777777', '?tab=practico&size=2&sizeTurnos=1')
    await panel('Turnos realizados').findByText('Página 1 de 2 · 2 registros')
    await usuario.click(panel('Turnos realizados').getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ pageTurnos: 1, page: 0 }))
    expect(panel('Historial de evaluaciones').getByText('Página 1 de 3 · 5 registros')).toBeInTheDocument()
  })

  it('CA-LEG-08 sin turnos el panel lo dice en vez de una tabla vacía', async () => {
    await abrirLegajo('654321', '?tab=practico')
    const turnos = panel('Turnos realizados')
    expect(await turnos.findByText(TEXTO_SIN_TURNOS_DEL_ALUMNO)).toBeInTheDocument()
    expect(turnos.queryByRole('table')).not.toBeInTheDocument()
    expect(turnos.queryByText(TEXTO_TURNO_SIN_CANTIDAD)).not.toBeInTheDocument()
  })
})

describe('Legajo: vuelos desaprobados', () => {
  it('CA-LEG-07 muestra código, clasificación, sub fase, fecha y programa y enlaza la evaluación', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const desaprobados = panel('Vuelos desaprobados')
    const tabla = within(await desaprobados.findByRole('table', { name: 'Vuelos desaprobados del alumno' }))
    expect(tabla.getAllByRole('row').slice(1)).toHaveLength(3)
    const fila = within(tabla.getByRole('link', { name: '777777-1' }).closest('tr') as HTMLElement)
    expect(fila.getByText('Malo')).toBeInTheDocument()
    expect(fila.getByText('Instrumentos')).toBeInTheDocument()
    expect(fila.getByText('PDI')).toBeInTheDocument()
    expect(tabla.getByRole('link', { name: '777777-1' })).toHaveAttribute('href', '/evaluaciones/777777-1')
  })

  it('CA-LEG-07 sin View Disapproved el panel no se pide ni se muestra', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await abrirLegajo('777777', '?tab=practico', 'jefe.operaciones')
    await screen.findByRole('table', { name: 'Historial de evaluaciones' })
    server.events.removeAllListeners('request:start')
    expect(pedidas).not.toContain('/api/desaprobados/persona/777777')
    expect(screen.queryByRole('region', { name: 'Vuelos desaprobados' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR)).not.toBeInTheDocument()
  })

  it('CA-LEG-07 en el legajo propio de un alumno se muestra S29 en lugar del panel', async () => {
    await abrirLegajo('777777', '?tab=practico', 'alumno.ramirez')
    expect(await screen.findByText(TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Vuelos desaprobados del alumno' })).not.toBeInTheDocument()
  })

  it('CA-LEG-07 sin vuelos desaprobados el panel lo dice en vez de una tabla vacía', async () => {
    await abrirLegajo('654321', '?tab=practico')
    const desaprobados = panel('Vuelos desaprobados')
    expect(await desaprobados.findByText(TEXTO_SIN_DESAPROBADOS)).toBeInTheDocument()
    expect(desaprobados.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('Legajo: ciclo de chequeo', () => {
  it('CA-LEG-09 muestra los cuatro contadores y el criterio que aplica a la fase', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByText('Criterio 1')).toBeInTheDocument()
    expect(chequeo.getByText('Chequeos: 4')).toBeInTheDocument()
    expect(chequeo.getByText('Evaluaciones: 10')).toBeInTheDocument()
    expect(chequeo.getByText('Malos: 3')).toBeInTheDocument()
    expect(chequeo.getByText('Regulares: 2')).toBeInTheDocument()
    expect(chequeo.getByText('3 vuelos Malos')).toBeInTheDocument()
    expect(chequeo.getByText('6 Regulares alternados')).toBeInTheDocument()
  })

  it('CA-LEG-09 muestra el historial de chequeos y la regla del Regular alternado', async () => {
    await abrirLegajo('999999', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByText(textoRegularAlternado(true))).toBeInTheDocument()
    const historial = within(chequeo.getByRole('table', { name: 'Historial de chequeos' }))
    expect(historial.getAllByRole('row').slice(1)).toHaveLength(1)
    const fila = within(historial.getAllByRole('row')[1]!)
    expect(fila.getByText('Aprobado')).toBeInTheDocument()
    expect(fila.getByText('Contacto')).toBeInTheDocument()
    await reabrirLegajo('777777', '?tab=practico')
    expect(await panel('Ciclo de chequeo').findByText(TEXTO_SIN_CHEQUEOS)).toBeInTheDocument()
  })

  it('CA-LEG-09 sin la dependencia del ciclo de chequeo el panel lo dice y no pide nada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await abrirLegajo('777777', '?tab=practico')
    expect(await panel('Ciclo de chequeo').findByText(TEXTO_CHEQUEO_SIN_SERVIDOR)).toBeInTheDocument()
    expect(pedidas.some((ruta) => ruta.includes('/legajo') || ruta.includes('/chequeos'))).toBe(false)
    server.events.removeAllListeners('request:start')
    vi.unstubAllEnvs()
  })

  it('CA-LEG-10 con el criterio cumplido y el estado ya movido muestra S12 y S31', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByText(textoCriterioCumplido('Adaptación', '3 vuelos Malos'))).toBeInTheDocument()
    expect(chequeo.getByText(TEXTO_ESTADO_YA_CAMBIO)).toBeInTheDocument()
    expect(chequeo.queryByText(TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR)).not.toBeInTheDocument()
  })

  it('CA-LEG-10 con el criterio cumplido y el alumno todavía Apto muestra S12 y S30', async () => {
    await abrirLegajo('999999', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByText(textoCriterioCumplido('Adaptación', '2 Malos y 2 Regulares alternados'))).toBeInTheDocument()
    expect(chequeo.getByText(TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR)).toBeInTheDocument()
    expect(chequeo.queryByText(TEXTO_ESTADO_YA_CAMBIO)).not.toBeInTheDocument()
  })

  it('CA-LEG-10 sin cumplir el criterio no muestra S12, S30 ni S31', async () => {
    await abrirLegajo('555555', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    await chequeo.findByText('Chequeos: 2')
    expect(chequeo.queryByText(TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR)).not.toBeInTheDocument()
    expect(chequeo.queryByText(TEXTO_ESTADO_YA_CAMBIO)).not.toBeInTheDocument()
  })

  it('CA-LEG-10 enlaza la cadena por la evaluación previa y muestra el estado que cada una tenía', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByRole('link', { name: '777777-6' })).toHaveAttribute('href', '/evaluaciones/777777-6')
    expect(chequeo.getByText('En Chequeo')).toBeInTheDocument()
    expect(chequeo.getByRole('link', { name: '777777-4' })).toHaveAttribute('href', '/evaluaciones/777777-4')
    for (const [etiqueta, valor] of [
      ['Última evaluación', '777777-6'],
      ['Estado en esa evaluación', 'En Chequeo'],
      ['Evaluación previa', '777777-4'],
    ] as const) {
      expect(dato(chequeo, etiqueta).getByText(valor)).toBeInTheDocument()
    }
  })

  it('el ancla #chequeo de las alertas cae sobre el panel de chequeo', async () => {
    await abrirLegajo('999999', '?tab=practico#chequeo')
    const chequeo = await screen.findByRole('region', { name: 'Ciclo de chequeo' })
    expect(chequeo).toHaveAttribute('id', 'chequeo')
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

describe('Legajo: historial teórico', () => {
  it('CA-LEG-11 muestra materia, tipo de examen, fecha, nota con su mínimo y si aprobó', async () => {
    await abrirLegajo('999999', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    const tabla = within(await historial.findByRole('table', { name: 'Exámenes del alumno' }))
    for (const columna of ['Materia', 'Tipo de examen', 'Fecha', 'Nota', 'Resultado']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(tabla.getAllByText('Aerodinámica Aplicada a Helicópteros')).toHaveLength(2)
    expect(tabla.getByText('10.00 / mínimo 16')).toBeInTheDocument()
    expect(tabla.getByText('17.00 / mínimo 16')).toBeInTheDocument()
    expect(tabla.getByText('Desaprobado')).toBeInTheDocument()
    expect(tabla.getByText('Aprobado')).toBeInTheDocument()
  })

  it('CA-LEG-11 una fila desaprobada con subsanación aprobada muestra las dos notas y S17', async () => {
    await abrirLegajo('999999', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    expect(await historial.findByText(TEXTO_PREVALECE_LA_PRIMERA_NOTA)).toBeInTheDocument()
    const desaprobada = within(historial.getByText('10.00 / mínimo 16').closest('tr') as HTMLElement)
    expect(desaprobada.getByText(/Subsanada con 17\.00/)).toHaveAttribute('title', 'Subsanada con 17.00')
    expect(desaprobada.getByText(TEXTO_NOTA_QUE_PREVALECE)).toBeInTheDocument()
    const subsanacion = within(historial.getByText('17.00 / mínimo 16').closest('tr') as HTMLElement)
    expect(subsanacion.getByText(TEXTO_NOTA_QUE_NO_CUENTA)).toBeInTheDocument()
    expect(subsanacion.queryByText(TEXTO_NOTA_QUE_PREVALECE)).not.toBeInTheDocument()
    const filas = within(historial.getByRole('table', { name: 'Exámenes del alumno' })).getAllByRole('row').slice(1)
    expect(within(filas[0]!).getByText(TEXTO_NOTA_QUE_NO_CUENTA)).toBeInTheDocument()
    expect(within(filas[1]!).getByText(TEXTO_NOTA_QUE_PREVALECE)).toBeInTheDocument()
  })

  it('CA-LEG-11 una subsanación desaprobada lleva exactamente un marcador', async () => {
    server.use(
      http.get(`${API}/api/cuestionarios`, () =>
        HttpResponse.json({
          content: [
            {
              id: 5,
              idTurnoTeorico: 7,
              turnoTeorico: 'Subsanación Aerodinámica Aplicada a Helicópteros',
              idMateria: 1,
              materia: 'Aerodinámica Aplicada a Helicópteros',
              tipoExamen: 'SUBSANACION',
              fechaExamen: '2026-09-15',
              estado: 'ENTREGADO',
              fechaEntrega: '2026-09-15',
              horaEntrega: '09:10',
              nota: 9,
              notaMinimaAplicada: 16,
              aprobado: false,
              idTurnoOrigen: 6,
              turnoOrigen: 'Test Aerodinámica Aplicada a Helicópteros',
              subsanadoPor: {
                idTurnoTeorico: 7,
                turnoTeorico: 'Subsanación Aerodinámica Aplicada a Helicópteros',
                fechaExamen: '2026-09-15',
                estado: 'FINALIZADO',
                nota: 9,
              },
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      ),
    )
    await abrirLegajo('999999', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    const fila = within((await historial.findByText('9.00 / mínimo 16')).closest('tr') as HTMLElement)
    expect(fila.getByText(TEXTO_NOTA_QUE_NO_CUENTA)).toBeInTheDocument()
    expect(fila.queryByText(TEXTO_NOTA_QUE_PREVALECE)).not.toBeInTheDocument()
  })

  it('CA-LEG-11 los dos marcadores del par son paralelos y se distinguen por tono', async () => {
    await abrirLegajo('999999', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    const cuenta = await historial.findByText(TEXTO_NOTA_QUE_PREVALECE)
    const noCuenta = historial.getByText(TEXTO_NOTA_QUE_NO_CUENTA)
    for (const marcador of [cuenta, noCuenta]) {
      expect(marcador).toHaveAttribute('data-slot', 'badge')
      expect(marcador.tagName).toBe('SPAN')
    }
    expect(cuenta).toHaveAttribute('data-tono', 'info')
    expect(noCuenta).toHaveAttribute('data-tono', 'neutro')
  })

  it('CA-LEG-11 la fila de la subsanación muestra su turno de origen', async () => {
    await abrirLegajo('999999', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    const subsanacion = within((await historial.findByText('17.00 / mínimo 16')).closest('tr') as HTMLElement)
    expect(subsanacion.getByText(/Test Aerodinámica Aplicada a Helicópteros/)).toBeInTheDocument()
  })

  it('CA-LEG-11 una subsanación pendiente muestra que no hay segunda nota', async () => {
    await abrirLegajo('666666', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    expect(await historial.findByText(TEXTO_SIN_SEGUNDA_NOTA)).toHaveAttribute('title', TEXTO_SIN_SEGUNDA_NOTA)
    expect(historial.getByText('12.00 / mínimo 18')).toBeInTheDocument()
  })

  it('CA-LEG-11 el panel pagina y declara cuántos exámenes hay en total', async () => {
    const { usuario, router } = await abrirLegajo('999999', '?tab=teorico&size=1')
    const historial = panel('Historial de exámenes')
    const tabla = within(await historial.findByRole('table', { name: 'Exámenes del alumno' }))
    expect(await historial.findByText('Página 1 de 2 · 2 registros')).toBeInTheDocument()
    expect(tabla.getAllByRole('row').slice(1)).toHaveLength(1)
    expect(tabla.getByText('17.00 / mínimo 16')).toBeInTheDocument()
    await usuario.click(historial.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1 }))
    expect(await historial.findByText('Página 2 de 2 · 2 registros')).toBeInTheDocument()
    expect(within(historial.getByRole('table', { name: 'Exámenes del alumno' })).getByText('10.00 / mínimo 16')).toBeInTheDocument()
  })

  it('CA-LEG-11 sin exámenes el panel lo dice en vez de una tabla vacía', async () => {
    await abrirLegajo('777777', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    expect(await historial.findByText(TEXTO_SIN_EXAMENES_DEL_ALUMNO)).toBeInTheDocument()
    expect(historial.queryByRole('table')).not.toBeInTheDocument()
    expect(historial.queryByText(TEXTO_PREVALECE_LA_PRIMERA_NOTA)).not.toBeInTheDocument()
  })
})

describe('Legajo: propiedad y modo vivo', () => {
  it('CA-LEG-15 /mi-legajo lleva al alumno a su propio legajo y pide su propio código', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await iniciarComo('alumno.castro')
    const { router } = renderApp('/mi-legajo')
    await screen.findByRole('heading', { level: 1, name: 'Legajo del alumno' })
    expect(router.state.location.pathname).toBe('/seguimiento/999999')
    await waitFor(() => expect(pedidas).toContain('/api/personas/999999/alumno'))
    server.events.removeAllListeners('request:start')
    expect(pedidas.some((ruta) => ruta.includes('555555'))).toBe(false)
  })

  it('CA-LEG-15 un código ajeno en la URL lo rechaza el cargador de la ruta', async () => {
    await iniciarComo('alumno.castro')
    renderApp('/seguimiento/555555')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cabecera' })).not.toBeInTheDocument()
  })

  it('CA-LEG-17 fuera del modo mock cada panel muestra su propio aviso y el encabezado S1', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const { usuario } = await abrirLegajo('777777')
    expect(screen.getByText(TEXTO_INDICES_SOLO_MOCK)).toBeInTheDocument()
    expect(await panel('Índices del PDI').findByText(TEXTO_INDICES_SIN_SERVIDOR)).toBeInTheDocument()
    await usuario.click(screen.getByRole('link', { name: 'Práctico' }))
    expect(await panel('Ciclo de chequeo').findByText(TEXTO_CHEQUEO_SIN_SERVIDOR)).toBeInTheDocument()
    await usuario.click(screen.getByRole('link', { name: 'Teórico' }))
    expect(await panel('Historial de exámenes').findByText(TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR)).toBeInTheDocument()
  })

  it('CA-LEG-17 sin ninguna dependencia resuelta los cuatro paneles reales siguen funcionando', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const { usuario } = await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    expect(await screen.findByRole('table', { name: 'Historial de evaluaciones' })).toBeInTheDocument()
    expect(await panel('Reporte de sub fase').findByText('Instrumentos')).toBeInTheDocument()
    expect(await panel('Promedios de la sub fase').findByText('13.00')).toBeInTheDocument()
    expect(await panel('Vuelos desaprobados').findByRole('table', { name: 'Vuelos desaprobados del alumno' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('link', { name: 'Resumen' }))
    expect(await panel('Cabecera').findByText('Carlos Ramirez Sanchez')).toBeInTheDocument()
  })
})

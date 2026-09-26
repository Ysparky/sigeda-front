import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_CONEXION } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { TEXTO_ALERTAS_SIN_SERVIDOR, TEXTO_SIN_ALERTAS } from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const API = config.sigedaApiUrl

async function abrirAlertas(ruta = '/seguimiento/alertas?size=20', username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('table', { name: 'Alertas del escuadrón' })
  await screen.findByText(/registros?$/)
  await within(screen.getByLabelText('Grupo')).findByRole('option', { name: 'Grupo 4' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Alertas del escuadrón' }))
    .getAllByRole('row')
    .slice(1)
}

describe('Alertas', () => {
  it('CA-ALE-01 muestra tipo, alumno, grupo, fecha, detalle y severidad', async () => {
    await abrirAlertas()
    const tabla = within(screen.getByRole('table', { name: 'Alertas del escuadrón' }))
    for (const columna of ['Tipo', 'Alumno', 'Grupo', 'Fecha', 'Detalle', 'Severidad']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    const primera = within(filas()[0]!)
    expect(primera.getByText('Subsanación pendiente')).toBeInTheDocument()
    expect(primera.getByText('Ana Torres Martinez')).toBeInTheDocument()
    expect(primera.getByText('Grupo 3')).toBeInTheDocument()
    expect(primera.getByText('Alta')).toBeInTheDocument()
    expect(primera.getByText(/Subsanación pendiente\./)).toBeInTheDocument()
  })

  it('CA-ALE-01 pagina de 10 en 10 con las páginas del servidor', async () => {
    const { usuario, router } = await abrirAlertas('/seguimiento/alertas')
    expect(screen.getByText('Página 1 de 2 · 13 registros')).toBeInTheDocument()
    expect(filas()).toHaveLength(10)
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1 }))
    await waitFor(() => expect(filas()).toHaveLength(3))
  })

  it('CA-ALE-02 filtra por programa, grupo y tipo y todo viaja en la URL', async () => {
    const { usuario, router } = await abrirAlertas()
    await usuario.selectOptions(screen.getByLabelText('Programa'), 'PDE')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ programa: 'PDE' }))
    expect(await screen.findByText(TEXTO_SIN_ALERTAS)).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Programa'), 'PDI')
    await waitFor(() => expect(filas()).toHaveLength(13))
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '4')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 4 }))
    await waitFor(() => expect(filas()).toHaveLength(4))
    await usuario.selectOptions(screen.getByLabelText('Tipo de alerta'), 'VUELO_DESAPROBADO')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 4, tipo: 'VUELO_DESAPROBADO' }))
    await waitFor(() => expect(filas()).toHaveLength(3))
  })

  it('CA-ALE-02 el rango cerrado de fechas filtra y Limpiar filtros lo borra', async () => {
    const desde = sumarDias(hoyIso(), -15)
    const { usuario } = await abrirAlertas(`/seguimiento/alertas?size=20&fechaPre=${desde}`)
    expect(screen.getByLabelText('Desde')).toHaveValue(desde)
    const conFiltro = filas().length
    expect(conFiltro).toBeLessThan(13)
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(filas()).toHaveLength(13))
    expect(screen.getByLabelText('Desde')).toHaveValue('')
    const hasta = sumarDias(hoyIso(), -25)
    await usuario.type(screen.getByLabelText('Hasta'), hasta)
    await waitFor(() => expect(filas()).toHaveLength(3))
  })

  it('CA-ALE-08 si el catálogo de grupos falla lo avisa bajo su propio selector y la tabla sigue', async () => {
    server.use(http.get(`${API}/api/grupos/programa/:nombre`, () => HttpResponse.error()))
    await iniciarComo('comandante.aguirre')
    renderApp('/seguimiento/alertas?size=20')
    await screen.findByRole('table', { name: 'Alertas del escuadrón' })
    expect(await screen.findByText('No se pudieron cargar los grupos.')).toBeInTheDocument()
    await waitFor(() => expect(filas()).toHaveLength(13))
  })

  it('CA-ALE-02 una URL mal escrita vuelve a los valores por defecto', async () => {
    await iniciarComo('comandante.aguirre')
    const { router } = renderApp('/seguimiento/alertas?page=-2&size=0&tipo=NO_EXISTE&fechaPre=ayer')
    await screen.findByRole('table', { name: 'Alertas del escuadrón' })
    expect(router.state.location.search).toEqual({ page: 0, size: 10, direction: 'ASC', programa: 'PDI' })
  })

  it('CA-ALE-05 sin alertas abiertas se muestra S7 y ninguna tabla vacía', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/seguimiento/alertas?programa=PDE')
    expect(await screen.findByText(TEXTO_SIN_ALERTAS)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Alertas del escuadrón' })).not.toBeInTheDocument()
  })

  it('CA-ALE-08 un fallo en la primera carga muestra el aviso con Reintentar', async () => {
    server.use(http.get(`${API}/api/seguimiento/alertas`, () => HttpResponse.error()))
    await iniciarComo('comandante.aguirre')
    const { usuario } = renderApp('/seguimiento/alertas')
    expect(await screen.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALERTAS)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Alertas del escuadrón' })).toBeInTheDocument()
  })
})

describe('Alertas: tipos y destinos', () => {
  it('CA-ALE-03 los cinco tipos se muestran con su etiqueta y su tono', async () => {
    await abrirAlertas()
    const tabla = within(screen.getByRole('table', { name: 'Alertas del escuadrón' }))
    const esperados: [string, string][] = [
      ['Subsanación pendiente', 'alerta'],
      ['Estado crítico', 'peligro'],
      ['Chequeo pendiente', 'aviso'],
      ['Causal teórico', 'violeta'],
      ['Vuelo desaprobado', 'info'],
    ]
    for (const [etiqueta, tono] of esperados) {
      expect(tabla.getAllByText(etiqueta)[0]).toHaveAttribute('data-tono', tono)
    }
    for (const [etiqueta, tono] of [
      ['Alta', 'peligro'],
      ['Media', 'aviso'],
      ['Baja', 'neutro'],
    ] as const) {
      expect(tabla.getAllByText(etiqueta)[0]).toHaveAttribute('data-tono', tono)
    }
  })

  it('CA-ALE-03 el orden por defecto es Alta, Media, Baja y luego fecha descendente', async () => {
    await abrirAlertas()
    const severidades = filas().map((fila) =>
      within(fila)
        .getAllByRole('cell')
        .at(-1)!
        .textContent?.trim(),
    )
    expect(severidades).toEqual([
      'Alta',
      'Media',
      'Media',
      'Media',
      'Media',
      'Media',
      'Media',
      'Baja',
      'Baja',
      'Baja',
      'Baja',
      'Baja',
      'Baja',
    ])
  })

  it('CA-ALE-03 una alerta sin fecha queda al final de su severidad', async () => {
    server.use(
      http.get(`${API}/api/seguimiento/alertas`, () =>
        HttpResponse.json({
          content: [
            {
              id: 'ESTADO_CRITICO:111111',
              tipo: 'ESTADO_CRITICO',
              severidad: 'MEDIA',
              codAlumno: '111111',
              alumno: 'Oscar Lopez Chaparro',
              idGrupo: 1,
              grupo: 'Grupo 1',
              programa: 'PDI',
              fecha: null,
              detalle: 'El alumno está En Observación.',
              codEvaluacion: null,
              idSubfase: null,
              idMateria: null,
              idCuestionario: null,
              causal: null,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      ),
    )
    await abrirAlertas()
    expect(within(filas()[0]!).getByText('—')).toBeInTheDocument()
  })

  it('CA-ALE-04 una alerta de vuelo desaprobado abre su evaluación', async () => {
    await abrirAlertas()
    expect(screen.getByRole('link', { name: 'Abrir Vuelo desaprobado de Pedro Rodriguez Garcia' })).toHaveAttribute(
      'href',
      '/evaluaciones/555555-1',
    )
  })

  it('CA-ALE-04 un vuelo desaprobado sin código de evaluación abre el legajo en vez de una URL rota', async () => {
    server.use(
      http.get(`${API}/api/seguimiento/alertas`, () =>
        HttpResponse.json({
          content: [
            {
              id: 'VUELO_DESAPROBADO:555555-1',
              tipo: 'VUELO_DESAPROBADO',
              severidad: 'BAJA',
              codAlumno: '555555',
              alumno: 'Pedro Rodriguez Garcia',
              idGrupo: 3,
              grupo: 'Grupo 3',
              programa: 'PDI',
              fecha: '2024-03-01',
              detalle: 'Vuelo Regular en Contacto.',
              codEvaluacion: null,
              idSubfase: 1,
              idMateria: null,
              idCuestionario: null,
              causal: null,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      ),
    )
    await abrirAlertas()
    expect(screen.getByRole('link', { name: 'Abrir Vuelo desaprobado de Pedro Rodriguez Garcia' })).toHaveAttribute(
      'href',
      '/seguimiento/555555',
    )
  })

  it('CA-ALE-04 una causal y una subsanación pendiente abren la pestaña Teórico del legajo', async () => {
    await abrirAlertas()
    expect(screen.getByRole('link', { name: 'Abrir Subsanación pendiente de Ana Torres Martinez' })).toHaveAttribute(
      'href',
      '/seguimiento/666666?tab=teorico',
    )
    expect(screen.getAllByRole('link', { name: 'Abrir Causal teórico de Oscar Lopez Chaparro' })[0]).toHaveAttribute(
      'href',
      '/seguimiento/111111?tab=teorico',
    )
  })

  it('CA-ALE-04 el chequeo pendiente abre el panel de chequeo y el estado crítico el legajo', async () => {
    await abrirAlertas()
    expect(screen.getByRole('link', { name: 'Abrir Chequeo pendiente de Luis Diaz Castro' })).toHaveAttribute(
      'href',
      '/seguimiento/999999?tab=practico#chequeo',
    )
    expect(screen.getByRole('link', { name: 'Abrir Estado crítico de Carlos Ramirez Sanchez' })).toHaveAttribute(
      'href',
      '/seguimiento/777777',
    )
  })

  it('CA-ALE-07 fuera del modo mock y sin la dependencia 66 muestra S8 y no pide el listado', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await iniciarComo('comandante.aguirre')
    renderApp('/seguimiento/alertas')
    expect(await screen.findByText(TEXTO_ALERTAS_SIN_SERVIDOR)).toBeInTheDocument()
    server.events.removeAllListeners('request:start')
    expect(pedidas).not.toContain('/api/seguimiento/alertas')
    expect(screen.queryByRole('table', { name: 'Alertas del escuadrón' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALERTAS)).not.toBeInTheDocument()
  })
})

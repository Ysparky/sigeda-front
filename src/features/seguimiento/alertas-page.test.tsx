import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_CONEXION } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { TEXTO_SIN_ALERTAS } from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const API = config.sigedaApiUrl

async function abrirAlertas(ruta = '/seguimiento/alertas?size=20', username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('heading', { name: 'Alertas' })
  await screen.findByRole('table', { name: 'Alertas del escuadrón' })
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

import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_CONEXION } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { momento, hoyIso } from '@/lib/dominio/calendario'
import {
  TEXTO_DESEMPATE,
  TEXTO_INDICES_SOLO_MOCK,
  TEXTO_ORDEN_MERITO_SIN_SERVIDOR,
  TEXTO_SIN_ALUMNOS_CON_INDICES,
  TEXTO_SIN_DATOS_SUFICIENTES,
  textoOrdenDeMeritoConsultado,
  textoSinNfpi,
} from '@/lib/dominio/seguimiento'
import { formatearFecha } from '@/lib/formato'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'

async function abrirReportes(ruta = '/reportes', username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('table', { name: 'Orden de mérito' })
  await screen.findByText(/registros?$/)
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Orden de mérito' }))
    .getAllByRole('row')
    .slice(1)
}

function celdas(indice: number) {
  return within(filas()[indice]!)
    .getAllByRole('cell')
    .map((celda) => {
      const visible = celda.cloneNode(true) as HTMLElement
      visible.querySelectorAll('.sr-only').forEach((nodo) => nodo.remove())
      return visible.textContent?.trim() ?? ''
    })
}

describe('Reportes y orden de mérito', () => {
  it('CA-REP-01 muestra puesto, código, alumno, grupo, NFPI, NIT y NIA con dos decimales', async () => {
    await abrirReportes()
    const tabla = within(screen.getByRole('table', { name: 'Orden de mérito' }))
    for (const columna of ['Puesto', 'Código', 'Alumno', 'Grupo', 'NFPI', 'NIT', 'NIA']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(celdas(0)).toEqual(['1', '222222', 'Juan Falconi Fernandez', 'Grupo 2', '17.16', '17.20', '17.15'])
    expect(filas()).toHaveLength(6)
  })

  it('CA-REP-01 pagina de 10 en 10 y el servidor es quien ordena', async () => {
    const { usuario, router } = await abrirReportes('/reportes?size=2')
    expect(screen.getByText('Página 1 de 3 · 6 registros')).toBeInTheDocument()
    expect(celdas(0)[0]).toBe('1')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1 }))
    await waitFor(() => expect(celdas(0)[0]).toBe('3'))
  })

  it('CA-REP-02 filtra por programa y grupo y los filtros viajan en la URL', async () => {
    const { usuario, router } = await abrirReportes()
    await within(screen.getByLabelText('Grupo')).findAllByRole('option', { name: /^Grupo|^Promoción/ })
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 3 }))
    await waitFor(() => expect(filas()).toHaveLength(2))
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(filas()).toHaveLength(6))
  })

  it('CA-REP-02 filtrando por grupo los puestos empiezan en 1 dentro de ese grupo', async () => {
    await abrirReportes('/reportes?idGrupo=3')
    expect(celdas(0)[0]).toBe('1')
    expect(celdas(0)[1]).toBe('555555')
  })

  it('CA-REP-03 muestra S22 con la fecha y la hora de la consulta y S23 con el desempate', async () => {
    relojFalso()
    vi.setSystemTime(momento(hoyIso(), '09:15'))
    await iniciarComo('comandante.aguirre')
    renderApp('/reportes')
    await screen.findByRole('table', { name: 'Orden de mérito' })
    await screen.findByText(textoOrdenDeMeritoConsultado(formatearFecha(hoyIso()), '09:15'))
    expect(screen.getByText(TEXTO_DESEMPATE)).toBeInTheDocument()
  })

  it('CA-REP-03 al cambiar de página el sello nunca muestra una fecha de 1970', async () => {
    const { usuario } = await abrirReportes('/reportes?size=2')
    let pedidas = 0
    server.use(
      http.get(`${config.sigedaApiUrl}/api/reportes/orden-merito`, async () => {
        pedidas += 1
        await delay(80)
        return HttpResponse.json({
          content: [
            {
              puesto: 3,
              codigo: '111111',
              alumno: 'Oscar Lopez Chaparro',
              idGrupo: 1,
              grupo: 'Grupo 1',
              nfpi: 15.28,
              nit: 15.8,
              nia: 15.15,
              motivoSinNfpi: null,
            },
          ],
          totalElements: 6,
          totalPages: 3,
          size: 2,
          number: 1,
        })
      }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument()
    await waitFor(() => expect(pedidas).toBe(1))
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument()
    expect(await screen.findByText(/Orden de mérito consultado el/)).toBeInTheDocument()
  })

  it('CA-REP-04 el empate se rompe por NIA y el puesto no cambia al reordenar la tabla', async () => {
    const { usuario } = await abrirReportes()
    expect(celdas(2)).toEqual(['3', '999999', 'Luis Diaz Castro', 'Promoción 2026-A', '15.28', '14.80', '15.40'])
    expect(celdas(3)).toEqual(['4', '111111', 'Oscar Lopez Chaparro', 'Grupo 1', '15.28', '15.80', '15.15'])
    await usuario.click(screen.getByRole('button', { name: 'NIT' }))
    await waitFor(() => expect(celdas(0)[1]).toBe('555555'))
    expect(celdas(0)[0]).not.toBe('1')
  })
})

describe('Reportes: el alumno sin NFPI y los estados de la pantalla', () => {
  it('CA-REP-05 un alumno sin NFPI completo aparece al final, sin puesto, con S14 y S24', async () => {
    await abrirReportes()
    const ultima = filas().at(-1)!
    const fila = within(ultima)
    expect(fila.getByText('666666')).toBeInTheDocument()
    expect(fila.getByText('Sin puesto')).toHaveAttribute(
      'title',
      textoSinNfpi('Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.'),
    )
    expect(fila.getAllByText(TEXTO_SIN_DATOS_SUFICIENTES)).toHaveLength(2)
    expect(fila.getByText('12.80')).toBeInTheDocument()
    const marcador = fila.getByText('Sin puesto')
    const soloLectores = marcador.querySelector('.sr-only')
    expect(soloLectores?.textContent?.trim()).toBe(
      textoSinNfpi('Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.'),
    )
  })

  it('CA-REP-05 los puestos van 1..n sobre los rankeables y el que no lo es no desplaza a nadie', async () => {
    await abrirReportes()
    expect(filas().map((_, indice) => celdas(indice)[0])).toEqual(['1', '2', '3', '4', '5', 'Sin puesto'])
  })

  it('CA-REP-06 sin alumnos con índices se muestra S25 y ninguna tabla vacía', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/reportes?programa=PDE')
    expect(await screen.findByText(TEXTO_SIN_ALUMNOS_CON_INDICES)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Orden de mérito' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Grupo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
  })

  it('CA-REP-08 un fallo en la primera carga muestra el aviso con Reintentar', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/reportes/orden-merito`, () => HttpResponse.error()))
    await iniciarComo('comandante.aguirre')
    const { usuario } = renderApp('/reportes')
    expect(await screen.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALUMNOS_CON_INDICES)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Orden de mérito' })).toBeInTheDocument()
  })

  it('CA-REP-08 fuera del modo mock y sin las dependencias 6, 62 y 63 muestra S1 y S26 y no pide la tabla', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await iniciarComo('comandante.aguirre')
    renderApp('/reportes')
    expect(await screen.findByText(TEXTO_ORDEN_MERITO_SIN_SERVIDOR)).toBeInTheDocument()
    expect(screen.getByText(TEXTO_INDICES_SOLO_MOCK)).toBeInTheDocument()
    server.events.removeAllListeners('request:start')
    expect(pedidas).not.toContain('/api/reportes/orden-merito')
    expect(screen.queryByRole('table', { name: 'Orden de mérito' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALUMNOS_CON_INDICES)).not.toBeInTheDocument()
  })
})

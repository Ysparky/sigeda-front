import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_SIN_GRUPO } from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const API = config.sigedaApiUrl

async function abrirEscuadron(ruta = '/seguimiento', username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('heading', { name: 'Escuadrón' })
  await screen.findByRole('table', { name: 'Alumnos del escuadrón' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Alumnos del escuadrón' }))
    .getAllByRole('row')
    .slice(1)
}

function celdas(indice: number) {
  return within(filas()[indice]!)
    .getAllByRole('cell')
    .map((celda) => celda.textContent?.trim() ?? '')
}

describe('Escuadrón', () => {
  it('CA-SEG-01 muestra código, alumno, grupo y estado de cada alumno', async () => {
    await abrirEscuadron()
    const tabla = within(screen.getByRole('table', { name: 'Alumnos del escuadrón' }))
    for (const columna of ['Código', 'Alumno', 'Grupo', 'Estado']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(filas()).toHaveLength(6)
    const fila = within(tabla.getByRole('link', { name: '777777' }).closest('tr') as HTMLElement)
    expect(fila.getByText('Carlos Ramirez Sanchez')).toBeInTheDocument()
    expect(fila.getByText('Grupo 4')).toBeInTheDocument()
    expect(fila.getByText('En chequeo')).toBeInTheDocument()
  })

  it('CA-SEG-01 pagina de 10 en 10 en el navegador, sin volver a pedir el catálogo', async () => {
    const { router, usuario } = await abrirEscuadron('/seguimiento?size=2')
    expect(router.state.location.search).toMatchObject({ size: 2, page: 0 })
    expect(screen.getByText('Página 1 de 3 · 6 registros')).toBeInTheDocument()
    let pedidos = 0
    const contar = () => {
      pedidos += 1
    }
    server.events.on('request:start', contar)
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1 }))
    expect(screen.getByText('Página 2 de 3 · 6 registros')).toBeInTheDocument()
    server.events.removeListener('request:start', contar)
    expect(pedidos).toBe(0)
  })

  it('CA-SEG-01 el orden lo resuelve el navegador y viaja en la URL', async () => {
    const { router, usuario } = await abrirEscuadron()
    expect(celdas(0)[0]).toBe('111111')
    await usuario.click(screen.getByRole('button', { name: 'Código' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ property: 'codigo', direction: 'ASC' }))
    await usuario.click(screen.getByRole('button', { name: 'Código' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ direction: 'DESC' }))
    await waitFor(() => expect(celdas(0)[0]).toBe('999999'))
  })

  it('CA-SEG-04 el grupo se muestra con S4 desde el idGrupo y un alumno sin grupo con S3', async () => {
    server.use(
      http.get(`${API}/api/grupos/programa/:nombre`, () =>
        HttpResponse.json({
          content: [
            {
              personas: [
                { codigo: '654321', nombre: 'Lucía', aPaterno: 'Mendoza', aMaterno: 'Ríos', idGrupo: null, estado: 'Apto' },
                { codigo: '999999', nombre: 'Luis', aPaterno: 'Diaz', aMaterno: 'Castro', idGrupo: 6, estado: 'Apto' },
              ],
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      ),
    )
    await abrirEscuadron()
    expect(celdas(0)).toContain(TEXTO_SIN_GRUPO)
    expect(celdas(1)).toContain('Grupo 6')
  })

  it('CA-SEG-04 la etiqueta del grupo 6 es la derivada del id, no el nombre real del grupo', async () => {
    await abrirEscuadron()
    const fila = within(screen.getByRole('link', { name: '999999' }).closest('tr') as HTMLElement)
    expect(fila.getByText('Grupo 6')).toBeInTheDocument()
    expect(fila.queryByText('Promoción 2026-A')).not.toBeInTheDocument()
  })

  it('CA-SEG-05 cada alumno aparece una sola vez y el total cuenta alumnos, no filas del servidor', async () => {
    await abrirEscuadron('/seguimiento', 'instructor.perez')
    expect(screen.getByText('Página 1 de 1 · 4 registros')).toBeInTheDocument()
    expect(filas()).toHaveLength(4)
    expect(screen.getAllByRole('link', { name: '111111' })).toHaveLength(1)
  })

  it('CA-SEG-08 cada fila abre el legajo del alumno', async () => {
    await abrirEscuadron()
    expect(screen.getByRole('link', { name: '777777' })).toHaveAttribute('href', '/seguimiento/777777')
    expect(screen.getByRole('link', { name: '111111' })).toHaveAttribute('href', '/seguimiento/111111')
  })
})

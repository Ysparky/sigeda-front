import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_CONEXION } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { TEXTO_SIN_ALUMNOS_ASIGNADOS, TEXTO_SIN_ALUMNOS_EN_PROGRAMA, TEXTO_SIN_GRUPO } from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'

const API = config.sigedaApiUrl

let vistaActual: ReturnType<typeof renderApp> | null = null

async function abrirEscuadron(ruta = '/seguimiento', username = 'comandante.aguirre') {
  await iniciarComo(username)
  vistaActual = renderApp(ruta)
  await screen.findByRole('heading', { name: 'Escuadrón' })
  await screen.findByRole('table', { name: 'Alumnos del escuadrón' })
  return vistaActual
}

async function reabrir(ruta: string, username: string) {
  vistaActual?.unmount()
  await iniciarComo(username)
  vistaActual = renderApp(ruta)
  await screen.findByRole('heading', { name: 'Escuadrón' })
  return vistaActual
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

describe('Escuadrón: filtros', () => {
  it('CA-SEG-02 el programa se envía al servidor y elige el catálogo', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    const { usuario, router } = await abrirEscuadron()
    await usuario.selectOptions(screen.getByLabelText('Programa'), 'PDE')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ programa: 'PDE' }))
    await waitFor(() => expect(pedidas.filter((ruta) => ruta === '/api/grupos/programa/PDE')).toHaveLength(1))
    server.events.removeAllListeners('request:start')
    expect(pedidas.filter((ruta) => ruta === '/api/grupos/programa/PDI')).toHaveLength(1)
  })

  it('CA-SEG-02 grupo, estado y texto se aplican en el navegador y quedan en la URL', async () => {
    const { usuario, router } = await abrirEscuadron()
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 3 }))
    expect(screen.getByText('Página 1 de 1 · 2 registros')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Estado'), 'Apto')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 3, estado: 'Apto' }))
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(screen.getByText('Página 1 de 1 · 6 registros')).toBeInTheDocument())
    expect(router.state.location.search).not.toHaveProperty('idGrupo')
  })

  it('CA-SEG-02 el filtro de texto espera 300 ms tras la última tecla antes de navegar', async () => {
    const { usuario, avanzar } = relojFalso()
    await iniciarComo('comandante.aguirre')
    const { router } = renderApp('/seguimiento', usuario)
    await screen.findByRole('table', { name: 'Alumnos del escuadrón' })
    await usuario.type(screen.getByLabelText('Alumno'), 'ram')
    expect(router.state.location.search).not.toHaveProperty('texto')
    await avanzar(1_000)
    await waitFor(() => expect(router.state.location.search).toMatchObject({ texto: 'ram' }))
    await waitFor(() =>
      expect(within(screen.getByRole('table', { name: 'Alumnos del escuadrón' })).getAllByRole('row')).toHaveLength(2),
    )
  })

  it('CA-SEG-02 una URL mal escrita vuelve a los valores por defecto', async () => {
    await iniciarComo('comandante.aguirre')
    const { router } = renderApp('/seguimiento?page=-1&size=0&programa=XX&idGrupo=cero&direction=NO')
    await screen.findByRole('table', { name: 'Alumnos del escuadrón' })
    expect(router.state.location.search).toEqual({ page: 0, size: 10, direction: 'ASC', programa: 'PDI' })
  })

  it('CA-SEG-03 con View All Groups trae los alumnos de todos los grupos del programa', async () => {
    await abrirEscuadron()
    expect(filas()).toHaveLength(6)
    expect(screen.getByRole('link', { name: '777777' })).toBeInTheDocument()
  })

  it('CA-SEG-03 sin View All Groups solo los alumnos con los que voló, y sin ninguno muestra S2', async () => {
    await abrirEscuadron('/seguimiento', 'instructor.perez')
    expect(filas()).toHaveLength(4)
    expect(screen.queryByRole('link', { name: '777777' })).not.toBeInTheDocument()
    await reabrir('/seguimiento', 'jefe.operaciones')
    expect(await screen.findByText(TEXTO_SIN_ALUMNOS_ASIGNADOS)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Alumnos del escuadrón' })).not.toBeInTheDocument()
  })

  it('CA-SEG-03 un programa sin alumnos muestra S6', async () => {
    await abrirEscuadron('/seguimiento?programa=PDE')
    expect(await screen.findByText(TEXTO_SIN_ALUMNOS_EN_PROGRAMA)).toBeInTheDocument()
  })

  it('CA-SEG-09 un fallo en la primera carga muestra el aviso con Reintentar, no una lista vacía', async () => {
    server.use(http.get(`${API}/api/grupos/programa/:nombre`, () => HttpResponse.error()))
    await iniciarComo('comandante.aguirre')
    const { usuario } = renderApp('/seguimiento')
    expect(await screen.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Alumnos del escuadrón' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALUMNOS_EN_PROGRAMA)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Alumnos del escuadrón' })).toBeInTheDocument()
  })
})

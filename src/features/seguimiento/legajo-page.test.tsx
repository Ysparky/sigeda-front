import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_CHEQUEO_SIN_SERVIDOR, TEXTO_EVALUADOR_SIN_CODIGO, TEXTO_SIN_GRUPO } from '@/lib/dominio/seguimiento'
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

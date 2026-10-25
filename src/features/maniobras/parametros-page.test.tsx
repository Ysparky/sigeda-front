import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

function stubParametros() {
  const cuerpos: Array<Record<string, unknown>> = []
  server.use(
    http.get(`${config.sigedaApiUrl}/api/maniobras/:id/parametros`, () => HttpResponse.json([])),
    http.put(`${config.sigedaApiUrl}/api/maniobras/:id/parametros`, async ({ request }) => {
      cuerpos.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ mensaje: 'ok' })
    }),
  )
  return cuerpos
}

async function abrirParametros(id: number) {
  await iniciarComo('jefe.operaciones')
  const vista = renderApp(`/programa/maniobras/${id}/parametros`)
  await screen.findByRole('heading', { level: 1, name: 'Tolerancias de la maniobra' })
  return vista
}

describe('Tolerancias de la maniobra', () => {
  it('guarda un parámetro numérico y vuelve al detalle', async () => {
    const cuerpos = stubParametros()
    const { usuario, router } = await abrirParametros(9)

    await usuario.type(screen.getByLabelText('Clave 1'), 'ALTITUD')
    await usuario.type(screen.getByLabelText('Unidad 1'), 'ft')
    await usuario.type(screen.getByLabelText('Objetivo 1'), '1000')
    await usuario.type(screen.getByLabelText('Banda E 1'), '20')
    await usuario.type(screen.getByLabelText('Banda B 1'), '50')
    await usuario.type(screen.getByLabelText('Banda R 1'), '100')
    await usuario.click(screen.getByRole('button', { name: 'Guardar tolerancias' }))

    expect(await screen.findByText('Tolerancias guardadas con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras/9'))
    expect(cuerpos[0]).toEqual({
      parametros: [{ clave: 'ALTITUD', tipo: 'LINEAL', unidad: 'ft', objetivo: 1000, tolExcelente: 20, tolBueno: 50, tolRegular: 100 }],
    })
  })

  it('exige clave, unidad y bandas numéricas positivas', async () => {
    stubParametros()
    const { usuario } = await abrirParametros(11)

    await usuario.click(screen.getByRole('button', { name: 'Guardar tolerancias' }))
    expect(await screen.findByText('La clave es requerida')).toBeInTheDocument()
    expect(screen.getByText('Ingrese un objetivo numérico')).toBeInTheDocument()
  })
})

import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { crearGrupo, modificarGrupo } from './api'

const CUERPO = { nombre: 'Grupo A', descripcion: null, programa: 'PDI', personas: [] }

describe('crearGrupo', () => {
  it('devuelve el id del grupo creado', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/grupos`, () =>
        HttpResponse.json({ mensaje: 'Grupo guardada con éxito.', grupo: { id: 7 } }, { status: 201 }),
      ),
    )
    await expect(crearGrupo(CUERPO)).resolves.toEqual({ mensaje: 'Grupo guardada con éxito.', id: 7 })
  })

  it('sin grupo en la respuesta no inventa un id', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/grupos`, () => HttpResponse.json({ mensaje: 'Guardado.' }, { status: 201 })),
    )
    await expect(crearGrupo(CUERPO)).resolves.toEqual({ mensaje: 'Guardado.', id: null })
  })
})

describe('modificarGrupo', () => {
  it('sin grupo en la respuesta conserva el id modificado', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/grupos/4`, () => HttpResponse.json({ mensaje: 'Guardado.' }, { status: 201 })),
    )
    await expect(modificarGrupo(4, { nombre: 'Grupo A', descripcion: null, personas: [] })).resolves.toEqual({
      mensaje: 'Guardado.',
      id: 4,
    })
  })
})

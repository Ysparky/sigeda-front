import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { sesion } from '@/lib/auth/sesion'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'

import { ApiError } from './errors'
import { sigeda } from './sigeda'

const API = import.meta.env.VITE_SIGEDA_API_URL ?? ''

/**
 * El envoltorio de página se valida una sola vez dentro de `sigeda.pagina`, y con eso quedan cubiertas
 * las veinte llamadas que pasan por ahí. Lo que se fija acá es que un cuerpo que NO es una página
 * falle de forma ruidosa y con la ruta en el mensaje, en vez de dejar `items` en `undefined` y que la
 * pantalla estalle después en un `.map()` lejos de la causa.
 */
describe('sigeda.pagina valida el envoltorio', () => {
  it('un arreglo pelado donde se espera una página falla con la ruta en el mensaje', async () => {
    await iniciarComo('admin.sistema')
    server.use(http.get(`${API}/api/materias`, () => HttpResponse.json([{ id: 1, nombre: 'Meteorología' }])))

    const error = await sigeda.pagina('/api/materias').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toContain('/api/materias')
    expect((error as ApiError).message).toContain('no es una página')
  })

  it('una página sin los números se acepta y el contenido llega igual', async () => {
    await iniciarComo('admin.sistema')
    server.use(http.get(`${API}/api/materias`, () => HttpResponse.json({ content: [{ id: 7 }] })))

    const pagina = await sigeda.pagina<{ id: number }>('/api/materias')
    expect(pagina.items).toEqual([{ id: 7 }])
    expect(pagina.total).toBe(0)
  })
})

/**
 * El login es el único sitio donde un desajuste de forma no da una pantalla vacía sino una sesión
 * inconsistente: sin `token`, la aplicación guardaría basura y quedaría «con sesión» sin poder
 * autenticar nada. Y el error tiene que ser un ApiError, no un ZodError, o no llega a la pantalla.
 */
describe('el login valida la forma de la respuesta', () => {
  it('una respuesta sin token falla como ApiError y no deja sesión', async () => {
    server.use(
      http.post(`${API}/auth/login`, () => HttpResponse.json({ refresh_token: 'r', username: 'admin.sistema' })),
    )

    const error = await sesion.iniciar('admin.sistema', '123').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toContain('forma inesperada')
    expect(sesion.actual()).toBeNull()
  })

  it('un token vacío se rechaza igual que uno ausente', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ token: '', refresh_token: 'r', username: 'admin.sistema' }),
      ),
    )

    // Se afirma EL MENSAJE y no sólo que sea ApiError: sin la guarda, un token vacío igual termina en
    // ApiError por otro camino (la carga de la sesión falla después), así que una aserción genérica
    // pasaba con y sin el arreglo. Medido con la mutación.
    const error = await sesion.iniciar('admin.sistema', '123').catch((e: unknown) => e)
    expect((error as ApiError).message).toContain('forma inesperada')
  })
})

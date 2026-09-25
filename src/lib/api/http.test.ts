import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { relojFalso } from '@/test/tiempo'
import { ApiError, CanceladoError, MENSAJE_SIN_CONEXION } from './errors'
import { conLimiteDeTiempo, construirUrl, crearCliente, type Autenticacion } from './http'

const BASE = 'http://api.prueba'

function autenticacion(parcial: Partial<Autenticacion> = {}): Autenticacion {
  return {
    obtenerToken: () => 'token-1',
    renovarToken: vi.fn(async () => ({ estado: 'rechazado' }) as const),
    alExpirar: vi.fn(),
    ...parcial,
  }
}

describe('construirUrl', () => {
  it('omite los parámetros vacíos', () => {
    expect(
      construirUrl(BASE, '/api/turnos', { page: 0, programa: 'pdi', fechaPre: '', idSubfase: undefined, x: null }),
    ).toBe('http://api.prueba/api/turnos?page=0&programa=pdi')
  })
})

describe('crearCliente', () => {
  it('envía el token Bearer y devuelve el JSON', async () => {
    let cabecera: string | null = null
    server.use(
      http.get(`${BASE}/api/eco`, ({ request }) => {
        cabecera = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await expect(crearCliente(BASE, autenticacion()).get('/api/eco')).resolves.toEqual({ ok: true })
    expect(cabecera).toBe('Bearer token-1')
  })

  it('devuelve el texto cuando la respuesta no es JSON', async () => {
    server.use(http.delete(`${BASE}/api/turnos/1`, () => HttpResponse.text('Turno eliminado con éxito.')))
    await expect(crearCliente(BASE, autenticacion()).eliminar('/api/turnos/1')).resolves.toBe('Turno eliminado con éxito.')
  })

  it('convierte los errores de validación en errores de campo', async () => {
    server.use(
      http.post(`${BASE}/api/turnos`, () =>
        HttpResponse.json(["'nombre': Nombre debe tener de 10 a 30 caracteres."], { status: 400 }),
      ),
    )
    const error = await crearCliente(BASE, autenticacion()).post('/api/turnos', {}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).erroresDeCampo).toEqual({ nombre: 'Nombre debe tener de 10 a 30 caracteres.' })
  })

  it('CA-SES-03 renueva el token una sola vez ante un 401 y reintenta', async () => {
    const vigentes = ['viejo']
    const auth = autenticacion({
      obtenerToken: () => vigentes.at(-1) ?? null,
      renovarToken: vi.fn(async () => {
        vigentes.push('nuevo')
        return { estado: 'renovado', token: 'nuevo' } as const
      }),
    })
    server.use(
      http.get(`${BASE}/api/eco`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer nuevo'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 }),
      ),
    )
    await expect(crearCliente(BASE, auth).get('/api/eco')).resolves.toEqual({ ok: true })
    expect(auth.renovarToken).toHaveBeenCalledOnce()
    expect(auth.alExpirar).not.toHaveBeenCalled()
  })

  it('expira la sesión cuando la renovación falla', async () => {
    const auth = autenticacion()
    server.use(http.get(`${BASE}/api/eco`, () => new HttpResponse(null, { status: 401 })))
    await expect(crearCliente(BASE, auth).get('/api/eco')).rejects.toMatchObject({ status: 401 })
    expect(auth.alExpirar).toHaveBeenCalledOnce()
  })

  it('informa la falta de conexión cuando la renovación no está disponible y no expira la sesión', async () => {
    const auth = autenticacion({
      renovarToken: vi.fn(async () => ({ estado: 'no-disponible' }) as const),
    })
    server.use(http.get(`${BASE}/api/eco`, () => new HttpResponse(null, { status: 401 })))
    await expect(crearCliente(BASE, auth).get('/api/eco')).rejects.toMatchObject({
      status: 0,
      message: MENSAJE_SIN_CONEXION,
    })
    expect(auth.alExpirar).not.toHaveBeenCalled()
  })

  it('no intenta renovar en las rutas /auth/', async () => {
    const auth = autenticacion()
    server.use(http.post(`${BASE}/auth/login`, () => new HttpResponse(null, { status: 401 })))
    await expect(crearCliente(BASE, auth).post('/auth/login', {})).rejects.toMatchObject({ status: 401 })
    expect(auth.renovarToken).not.toHaveBeenCalled()
    expect(auth.alExpirar).not.toHaveBeenCalled()
  })

  it('pagina() convierte el Page de Spring', async () => {
    server.use(
      http.get(`${BASE}/api/turnos`, () =>
        HttpResponse.json({ content: [{ id: 7 }], number: 0, size: 6, totalElements: 1, totalPages: 1 }),
      ),
    )
    await expect(crearCliente(BASE, autenticacion()).pagina('/api/turnos', { page: 0, size: 6 })).resolves.toEqual({
      items: [{ id: 7 }],
      page: 0,
      size: 6,
      total: 1,
      totalPages: 1,
    })
  })

  it('pagina() trata el 404 de lista vacía como una página vacía', async () => {
    server.use(http.get(`${BASE}/api/turnos`, () => HttpResponse.text('No existen turnos disponibles.', { status: 404 })))
    await expect(crearCliente(BASE, autenticacion()).pagina('/api/turnos', { page: 2, size: 6 })).resolves.toEqual({
      items: [],
      page: 2,
      size: 6,
      total: 0,
      totalPages: 0,
    })
  })

  it('lista() trata el 404 como lista vacía', async () => {
    server.use(http.get(`${BASE}/api/programas`, () => HttpResponse.text('No existen programas disponibles.', { status: 404 })))
    await expect(crearCliente(BASE, autenticacion()).lista('/api/programas')).resolves.toEqual([])
  })

  it('get() propaga el 404 de un detalle', async () => {
    server.use(http.get(`${BASE}/api/turnos/9`, () => HttpResponse.text('Turno especificada no existe.', { status: 404 })))
    await expect(crearCliente(BASE, autenticacion()).get('/api/turnos/9')).rejects.toMatchObject({
      status: 404,
      message: 'Turno especificada no existe.',
    })
  })

  it('informa la falta de conexión', async () => {
    server.use(http.get(`${BASE}/api/eco`, () => HttpResponse.error()))
    await expect(crearCliente(BASE, autenticacion()).get('/api/eco')).rejects.toMatchObject({
      status: 0,
      message: MENSAJE_SIN_CONEXION,
    })
  })
})

describe('subirArchivo', () => {
  const archivo = () => new File(['contenido del apunte'], 'Apunte.txt', { type: 'text/plain' })

  it('M3-6 envía el archivo en el campo file, con el token y sin fijar el Content-Type', async () => {
    let nombre: string | null = null
    let tipoDeclarado: string | null = null
    let cabecera: string | null = null
    server.use(
      http.post(`${BASE}/documents/upload`, async ({ request }) => {
        cabecera = request.headers.get('Authorization')
        tipoDeclarado = request.headers.get('Content-Type')
        const formulario = await request.formData()
        const recibido = formulario.get('file')
        nombre = recibido instanceof File ? recibido.name : null
        return HttpResponse.json({ id: 'd0c00000-0000-4000-8000-000000000005' }, { status: 201 })
      }),
    )
    await expect(crearCliente(BASE, autenticacion()).subirArchivo('/documents/upload', archivo())).resolves.toEqual({
      id: 'd0c00000-0000-4000-8000-000000000005',
    })
    expect(nombre).toBe('Apunte.txt')
    expect(cabecera).toBe('Bearer token-1')
    expect(tipoDeclarado).toMatch(/^multipart\/form-data; boundary=/)
  })

  it('M3-6 reenvía el archivo tras renovar el token', async () => {
    const vigentes = ['viejo']
    const auth = autenticacion({
      obtenerToken: () => vigentes.at(-1) ?? null,
      renovarToken: vi.fn(async () => {
        vigentes.push('nuevo')
        return { estado: 'renovado', token: 'nuevo' } as const
      }),
    })
    const recibidos: string[] = []
    server.use(
      http.post(`${BASE}/documents/upload`, async ({ request }) => {
        const formulario = await request.formData()
        const recibido = formulario.get('file')
        recibidos.push(recibido instanceof File ? recibido.name : '')
        return request.headers.get('Authorization') === 'Bearer nuevo'
          ? HttpResponse.json({ id: 'ok' }, { status: 201 })
          : new HttpResponse(null, { status: 401 })
      }),
    )
    await expect(crearCliente(BASE, auth).subirArchivo('/documents/upload', archivo())).resolves.toEqual({ id: 'ok' })
    expect(recibidos).toEqual(['Apunte.txt', 'Apunte.txt'])
  })

  it('CA-DOC-09 una caída de red al subir informa la falta de conexión', async () => {
    server.use(http.post(`${BASE}/documents/upload`, () => HttpResponse.error()))
    await expect(crearCliente(BASE, autenticacion()).subirArchivo('/documents/upload', archivo())).rejects.toMatchObject({
      status: 0,
      message: MENSAJE_SIN_CONEXION,
    })
  })

  it('CA-DOC-03 propaga el mensaje del servidor que rechaza el archivo', async () => {
    server.use(
      http.post(`${BASE}/documents/upload`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.',
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    )
    await expect(crearCliente(BASE, autenticacion()).subirArchivo('/documents/upload', archivo())).rejects.toMatchObject({
      status: 400,
      message: 'Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.',
    })
  })
})

describe('conLimiteDeTiempo', () => {
  it('M3-4 corta con CanceladoError la petición que no responde', async () => {
    const { avanzar } = relojFalso()
    server.use(http.post(`${BASE}/quizzes/generate`, async () => { await delay('infinite') }))
    const cliente = crearCliente(BASE, autenticacion())
    let error: unknown = null
    const peticion = conLimiteDeTiempo(120_000, (senal) => cliente.post('/quizzes/generate', {}, senal)).catch((e: unknown) => {
      error = e
    })
    await avanzar(119_000)
    expect(error).toBeNull()
    await avanzar(1000)
    await peticion
    expect(error).toBeInstanceOf(CanceladoError)
  })

  it('M3-4 corta con CanceladoError el corte que llega mientras se lee el cuerpo', async () => {
    const { avanzar } = relojFalso()
    vi.stubGlobal('fetch', (_ruta: string, opciones: { signal?: AbortSignal }) =>
      Promise.resolve({
        status: 200,
        ok: true,
        text: () =>
          new Promise<string>((_, rechazar) => {
            opciones.signal?.addEventListener('abort', () =>
              rechazar(new DOMException('The operation was aborted.', 'AbortError')),
            )
          }),
      }),
    )
    try {
      const cliente = crearCliente(BASE, autenticacion())
      let error: unknown = null
      const peticion = conLimiteDeTiempo(120_000, (senal) => cliente.post('/quizzes/generate', {}, senal)).catch(
        (e: unknown) => {
          error = e
        },
      )
      await avanzar(119_000)
      expect(error).toBeNull()
      await avanzar(1000)
      await peticion
      expect(error).toBeInstanceOf(CanceladoError)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('M3-4 devuelve la respuesta y apaga el reloj cuando llega a tiempo', async () => {
    const { avanzar } = relojFalso()
    server.use(
      http.post(`${BASE}/quizzes/generate`, async () => {
        await delay(3000)
        return HttpResponse.json({ id: 'c0e5' }, { status: 201 })
      }),
    )
    const cliente = crearCliente(BASE, autenticacion())
    const peticion = conLimiteDeTiempo(120_000, (senal) => cliente.post('/quizzes/generate', {}, senal))
    await avanzar(3000)
    await expect(peticion).resolves.toEqual({ id: 'c0e5' })
  })
})

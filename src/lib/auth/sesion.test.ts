import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { CLAVE_REFRESH, tokens } from './tokens'
import { MENSAJE_CREDENCIALES, MENSAJE_SIN_ROL, sesion } from './sesion'

function personaSinRol() {
  return HttpResponse.json({
    codigo: '765432',
    nombre: 'Raúl',
    aPaterno: 'Paredes',
    aMaterno: 'Soto',
    idGrupo: null,
    usuario: { nombre: 'raul.paredes', correo: 'raul.paredes@sigeda.com', id: 12, rol: null },
  })
}

describe('sesion', () => {
  it('CA-SES-01 con credenciales válidas crea la sesión con los permisos del rol', async () => {
    const creada = await sesion.iniciar('instructor.perez', '123')
    expect(creada.usuario).toEqual({ id: 2, username: 'instructor.perez', correo: 'instructor@sigeda.com' })
    expect(creada.codPersona).toBe('444444')
    expect(creada.rol).toEqual({ id: 4, nombre: 'Instructor' })
    expect(creada.permisos.has('Write')).toBe(true)
    expect(sesion.actual()).toBe(creada)
  })

  it('M2-10 la sesión trae la persona del usuario', async () => {
    const creada = await sesion.iniciar('instructor.perez', '123')
    expect(creada.persona).toEqual({ nombre: 'Juan', aPaterno: 'Torres', aMaterno: 'Perez', idGrupo: null })
  })

  it('CA-SES-07 arma la sesión sin consultar endpoints que devuelven la contraseña', async () => {
    const rutas: string[] = []
    const escucha = ({ request }: { request: Request }) => rutas.push(new URL(request.url).pathname)
    server.events.on('request:start', escucha)
    try {
      await sesion.iniciar('instructor.perez', '123')
    } finally {
      server.events.removeListener('request:start', escucha)
    }
    expect(rutas).toEqual(['/auth/login', '/api/personas/instructor.perez'])
  })

  it('CA-SES-08 una cuenta sin rol no inicia sesión y borra los tokens', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/personas/:nom`, personaSinRol))
    await expect(sesion.iniciar('instructor.perez', '123')).rejects.toMatchObject({ message: MENSAJE_SIN_ROL })
    expect(sesion.actual()).toBeNull()
    expect(tokens.refresh()).toBeNull()
  })

  it('CA-SES-08 al restaurar, una cuenta sin rol borra los tokens y deja el aviso', async () => {
    await sesion.iniciar('instructor.perez', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(http.get(`${config.sigedaApiUrl}/api/personas/:nom`, personaSinRol))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBeNull()
    expect(sesion.aviso()).toBe(MENSAJE_SIN_ROL)
  })

  it('nunca conserva el hash de la contraseña que envía el backend', async () => {
    const creada = await sesion.iniciar('instructor.perez', '123')
    expect(JSON.stringify({ ...creada, permisos: [...creada.permisos] })).not.toContain('$2a$')
  })

  it('CA-SES-01 con credenciales inválidas no revela cuál falló', async () => {
    await expect(sesion.iniciar('instructor.perez', 'incorrecta')).rejects.toMatchObject({
      status: 401,
      message: MENSAJE_CREDENCIALES,
    })
    await expect(sesion.iniciar('nadie', '123')).rejects.toMatchObject({ message: MENSAJE_CREDENCIALES })
    expect(sesion.actual()).toBeNull()
    expect(tokens.refresh()).toBeNull()
  })

  it('CA-SES-02 restaura la sesión con el refresh token guardado', async () => {
    await sesion.iniciar('comandante.aguirre', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    const restaurada = await sesion.restaurar()
    expect(restaurada?.usuario.username).toBe('comandante.aguirre')
    expect(restaurada?.permisos.has('Manage Maneuvers')).toBe(true)
  })

  it('no restaura nada sin refresh token', async () => {
    await expect(sesion.restaurar()).resolves.toBeNull()
  })

  it('CA-SES-02 una falla temporal en /auth/refresh (500) no borra el refresh token', async () => {
    await sesion.iniciar('comandante.aguirre', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(http.post(`${config.sigedaApiUrl}/auth/refresh`, () => new HttpResponse(null, { status: 500 })))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe(refresh)
  })

  it('CA-SES-02 una falla de red en /auth/refresh no borra el refresh token', async () => {
    await sesion.iniciar('comandante.aguirre', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(http.post(`${config.sigedaApiUrl}/auth/refresh`, () => HttpResponse.error()))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe(refresh)
  })

  it('CA-SES-03 una petición con el token vencido se renueva y se reintenta', async () => {
    await sesion.iniciar('instructor.perez', '123')
    tokens.guardar('vencido', tokens.refresh() ?? '')
    await expect(sigeda.get('/api/usuarios/nombre/instructor.perez')).resolves.toMatchObject({ username: 'instructor.perez' })
    expect(tokens.acceso()).not.toBe('vencido')
  })

  it('CA-SES-05 cerrar sesión invalida el refresh token en el servidor', async () => {
    await sesion.iniciar('alumno.lopez', '123')
    const refresh = tokens.refresh()
    await sesion.cerrar()
    expect(sesion.actual()).toBeNull()
    expect(tokens.refresh()).toBeNull()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBeNull()
  })

  it('avisa a los suscriptores cuando cambia la sesión', async () => {
    const oyente = vi.fn()
    const desuscribir = sesion.suscribir(oyente)
    await sesion.iniciar('alumno.lopez', '123')
    sesion.expirar()
    desuscribir()
    expect(oyente).toHaveBeenCalledTimes(2)
  })

  it('CA-SES-02 conserva el refresh token si el perfil no carga por una falla del servidor o de red', async () => {
    await sesion.iniciar('comandante.aguirre', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(http.get(`${config.sigedaApiUrl}/api/personas/:nom`, () => new HttpResponse(null, { status: 503 })))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe(refresh)
    server.use(http.get(`${config.sigedaApiUrl}/api/personas/:nom`, () => HttpResponse.error()))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe(refresh)
  })

  it('borra el refresh token si el perfil responde 404', async () => {
    await sesion.iniciar('comandante.aguirre', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/:nom`, () =>
        HttpResponse.text('Persona especificada no existe.', { status: 404 }),
      ),
    )
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBeNull()
  })
})

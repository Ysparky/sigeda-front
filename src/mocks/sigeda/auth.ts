import { http, HttpResponse } from 'msw'
import { usernameDelToken } from '@/lib/auth/tokens'
import { config } from '@/lib/config'
import { CONTRASENA_SEED, USUARIOS_MOCK } from './usuarios'

const API = config.sigedaApiUrl
const HASH_DE_PRUEBA = '$2a$10$hashDePruebaQueNuncaDebeLlegarALaSesion'
const PREFIJO_REFRESH = 'refresh:'

const refreshRevocados = new Set<string>()
let secuencia = 0

function base64Url(texto: string) {
  return btoa(texto).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function jwtDePrueba(username: string) {
  return [base64Url(JSON.stringify({ alg: 'HS256' })), base64Url(JSON.stringify({ sub: username })), 'firma'].join('.')
}

export function reiniciarAuthMock() {
  refreshRevocados.clear()
  secuencia = 0
}

function usernameDelRefresh(refresh: string | undefined) {
  if (!refresh || !refresh.startsWith(PREFIJO_REFRESH) || refreshRevocados.has(refresh)) return null
  const username = refresh.slice(PREFIJO_REFRESH.length).split(':')[0]
  return username && USUARIOS_MOCK[username] ? username : null
}

export function usuarioAutenticado(request: Request) {
  const cabecera = request.headers.get('Authorization') ?? ''
  const username = cabecera.startsWith('Bearer ') ? usernameDelToken(cabecera.slice(7)) : null
  return username ? (USUARIOS_MOCK[username] ?? null) : null
}

function noAutorizado() {
  return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 })
}

export const handlersAuth = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const { username, password } = (await request.json()) as { username?: string; password?: string }
    const usuario = username ? USUARIOS_MOCK[username] : undefined
    if (!usuario || password !== CONTRASENA_SEED) return new HttpResponse(null, { status: 401 })
    secuencia += 1
    return HttpResponse.json({
      token: jwtDePrueba(usuario.username),
      refresh_token: `${PREFIJO_REFRESH}${usuario.username}:${secuencia}`,
      username: usuario.username,
    })
  }),
  http.post(`${API}/auth/refresh`, async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken?: string }
    const username = usernameDelRefresh(refreshToken)
    if (!username) return HttpResponse.text('Invalid refresh token', { status: 401 })
    return HttpResponse.json({ accessToken: jwtDePrueba(username), refreshToken, tokenType: 'Bearer' })
  }),
  http.post(`${API}/auth/logout`, async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken?: string }
    if (refreshToken) refreshRevocados.add(refreshToken)
    return HttpResponse.text('Logout successful')
  }),
  http.get(`${API}/api/usuarios/nombre/:nombre`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = USUARIOS_MOCK[String(params.nombre)]
    if (!usuario) return HttpResponse.text('Usuario especificada no existe.', { status: 404 })
    return HttpResponse.json({ ...usuario, password: HASH_DE_PRUEBA })
  }),
  http.put(`${API}/api/usuarios/:id`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const cuerpo = (await request.json()) as { username?: string }
    const usuario = Object.values(USUARIOS_MOCK).find((candidato) => candidato.id === Number(params.id))
    if (!usuario) return HttpResponse.text('Usuario especificada no existe.', { status: 404 })
    return HttpResponse.json(
      {
        mensaje: 'Usuario guardada con éxito.',
        usuario: { ...usuario, username: cuerpo.username ?? usuario.username, password: HASH_DE_PRUEBA },
      },
      { status: 201 },
    )
  }),
]

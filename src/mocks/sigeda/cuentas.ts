import { http, HttpResponse } from 'msw'
import { rolCompatible } from '@/lib/dominio/personas'
import { noAutorizado, usuarioAutenticado } from './auth'
import { API, autorizar, erroresDeCampo, guardado, textoMalaPeticion, textoNoEncontrado } from './comun'
import { buscarPersona, buscarUsuarioPorId, datos, rolPorId } from './datos'
import { ROLES_MOCK, type UsuarioMock } from './usuarios'

const PATRON_USUARIO = /^[a-z0-9._]{4,30}$/

export function erroresDeUsername(username: unknown, campo: string, idPropio: number | null): string[] {
  if (typeof username !== 'string' || username.trim() === '') return [`'${campo}': El nombre de usuario es obligatorio.`]
  if (!PATRON_USUARIO.test(username)) {
    return [`'${campo}': El nombre de usuario debe tener de 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.`]
  }
  const enUso = datos().usuarios.some((usuario) => usuario.username === username && usuario.id !== idPropio)
  return enUso ? [`'${campo}': El nombre de usuario ya está en uso.`] : []
}

export function erroresDeContrasena(password: unknown, campo: string): string[] {
  if (typeof password !== 'string' || password === '') return [`'${campo}': La contraseña es obligatoria.`]
  return password.length < 8 ? [`'${campo}': La contraseña debe tener al menos 8 caracteres.`] : []
}

function erroresDeContrasenaActual(valor: unknown, usuario: UsuarioMock): string[] {
  if (typeof valor !== 'string' || valor === '') return ["'passwordActual': La contraseña actual es obligatoria."]
  return valor === usuario.password ? [] : ["'passwordActual': La contraseña actual no es correcta."]
}

function cuerpoDeUsuario(usuario: UsuarioMock) {
  return {
    id: usuario.id,
    username: usuario.username,
    correo: usuario.correo,
    codPersona: usuario.codPersona,
    password: usuario.password,
    rol: rolPorId(usuario.idRol),
  }
}

export const handlersCuentas = [
  http.get(`${API}/api/roles`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Roles')
    if (permitido instanceof Response) return permitido
    if (ROLES_MOCK.length === 0) return textoNoEncontrado('No existen roles disponibles.')
    return HttpResponse.json(ROLES_MOCK)
  }),
  http.put(`${API}/api/usuarios/:id/rol`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Roles')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as { rol?: { id?: unknown } | null }
    if (!cuerpo.rol) return textoMalaPeticion('Selecciones roles a asignar.')
    const usuario = buscarUsuarioPorId(Number(params.id))
    if (!usuario) return textoNoEncontrado('Usuario especificada no existe.')
    const rol = rolPorId(Number(cuerpo.rol.id))
    if (!rol) return textoNoEncontrado('Rol especificada no existe.')
    const persona = buscarPersona(usuario.codPersona)
    if (!rolCompatible(persona?.tipo ?? null, rol.nombre)) {
      return textoMalaPeticion('El rol no corresponde al tipo de persona.')
    }
    usuario.idRol = rol.id
    return guardado('Usuario', 'usuario', cuerpoDeUsuario(usuario))
  }),
  http.put(`${API}/api/usuarios/:id`, async ({ request, params }) => {
    const autenticado = usuarioAutenticado(request)
    if (!autenticado) return noAutorizado()
    const esPropia = autenticado.id === Number(params.id)
    if (!esPropia) {
      const permitido = autorizar(request, 'Manage Users')
      if (permitido instanceof Response) return permitido
    }
    const usuario = buscarUsuarioPorId(Number(params.id))
    if (!usuario) return textoNoEncontrado('Usuario especificada no existe.')
    const cuerpo = (await request.json()) as { username?: unknown; password?: unknown; passwordActual?: unknown }
    const errores = [
      ...erroresDeUsername(cuerpo.username, 'username', usuario.id),
      ...erroresDeContrasena(cuerpo.password, 'password'),
      ...(esPropia ? erroresDeContrasenaActual(cuerpo.passwordActual, usuario) : []),
    ]
    if (errores.length > 0) return erroresDeCampo(errores)
    usuario.username = String(cuerpo.username)
    usuario.password = String(cuerpo.password)
    return guardado('Usuario', 'usuario', cuerpoDeUsuario(usuario))
  }),
]

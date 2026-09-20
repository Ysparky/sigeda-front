import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import { asignarRol, cambiarContrasenaPropia, listarRoles, restablecerContrasena, soloMensaje } from './api'

const API = config.sigedaApiUrl

const RESPUESTA_CON_CONTRASENA = {
  mensaje: 'Usuario guardada con éxito.',
  usuario: {
    id: 3,
    username: 'alumno.lopez',
    correo: 'alumno1@sigeda.com',
    password: '$2a$10$hashQueNuncaDebeLlegarALaAplicacion',
    rol: { id: 1, nombre: 'Alumno', descripcion: null },
  },
}

describe('api de cuentas', () => {
  it('M2-9 lista los roles del backend', async () => {
    await iniciarComo('admin.sistema')
    const roles = await listarRoles()
    expect(roles.map((rol) => rol.nombre)).toEqual([
      'Alumno',
      'Administrador Web',
      'Jefe de Operaciones',
      'Instructor',
      'Comandante de Escuadrón',
    ])
  })

  it('CA-PER-08 asigna el rol con el cuerpo que espera el backend', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${API}/api/usuarios/:id/rol`, async ({ request, params }) => {
        recibido = { id: params.id, ...((await request.json()) as object) }
        return HttpResponse.json(RESPUESTA_CON_CONTRASENA, { status: 201 })
      }),
    )
    await iniciarComo('admin.sistema')
    await expect(asignarRol(3, 1)).resolves.toBe('Usuario guardada con éxito.')
    expect(recibido).toEqual({ id: '3', rol: { id: 1 } })
  })

  it('CA-PER-09 restablece la contraseña enviando siempre el usuario', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${API}/api/usuarios/:id`, async ({ request, params }) => {
        recibido = { id: params.id, ...((await request.json()) as object) }
        return HttpResponse.json(RESPUESTA_CON_CONTRASENA, { status: 201 })
      }),
    )
    await iniciarComo('admin.sistema')
    await expect(restablecerContrasena(3, 'alumno.lopez', 'clave-segura-1')).resolves.toBe('Usuario guardada con éxito.')
    expect(recibido).toEqual({ id: '3', username: 'alumno.lopez', password: 'clave-segura-1' })
  })

  it('CA-PER-13 de las respuestas de usuarios solo conserva el mensaje', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(
      http.put(`${API}/api/usuarios/:id/rol`, () => HttpResponse.json(RESPUESTA_CON_CONTRASENA, { status: 201 })),
      http.put(`${API}/api/usuarios/:id`, () => HttpResponse.json(RESPUESTA_CON_CONTRASENA, { status: 201 })),
    )
    await iniciarComo('admin.sistema')
    const respuestas = [
      await asignarRol(3, 1),
      await restablecerContrasena(3, 'alumno.lopez', 'clave-segura-1'),
      await cambiarContrasenaPropia(10, 'admin.sistema', 'clave-segura-1', '123'),
    ]
    expect(respuestas).toEqual(Array.from({ length: 3 }, () => 'Usuario guardada con éxito.'))
    expect(JSON.stringify(respuestas)).not.toContain('$2a$')
    expect(consola).not.toHaveBeenCalled()
  })

  it('M2-3 usa el mensaje por defecto si el backend no devuelve uno', () => {
    expect(soloMensaje({ usuario: { password: 'secreta' } })).toBe('Usuario guardada con éxito.')
    expect(soloMensaje('texto')).toBe('Usuario guardada con éxito.')
  })

  it('CA-PER-13 la contraseña actual incorrecta llega como error del campo', async () => {
    await iniciarComo('admin.sistema')
    await expect(cambiarContrasenaPropia(10, 'admin.sistema', 'clave-segura-1', 'otra')).rejects.toMatchObject({
      erroresDeCampo: { passwordActual: 'La contraseña actual no es correcta.' },
    })
  })

  it('M2-13 el backend rechaza un rol incompatible con el tipo de la persona', async () => {
    await iniciarComo('admin.sistema')
    await expect(asignarRol(3, 4)).rejects.toMatchObject({
      status: 400,
      message: 'El rol no corresponde al tipo de persona.',
    })
    await expect(asignarRol(3, 99)).rejects.toBeInstanceOf(ApiError)
  })
})

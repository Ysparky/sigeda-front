import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirCuenta() {
  await iniciarComo('instructor.perez')
  const vista = renderApp('/cuenta')
  await screen.findByRole('heading', { name: 'Cambiar contraseña' })
  return vista
}

describe('CA-CTA-01 Cambiar contraseña', () => {
  it('CA-CTA-01 exige repetir la contraseña nueva exactamente', async () => {
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-2')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
  })

  it('CA-CTA-01 exige al menos 8 caracteres', async () => {
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'corta')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'corta')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('CA-CTA-01 guarda enviando el usuario actual y muestra el mensaje del backend', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${config.sigedaApiUrl}/api/usuarios/:id`, async ({ request, params }) => {
        recibido = { id: params.id, ...((await request.json()) as object) }
        return HttpResponse.json({ mensaje: 'Usuario guardada con éxito.' }, { status: 201 })
      }),
    )
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Usuario guardada con éxito.')).toBeInTheDocument()
    expect(recibido).toEqual({ id: '2', username: 'instructor.perez', password: 'clave-segura-1' })
  })

  it('muestra el error del backend sin detalles internos', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(
      http.put(`${config.sigedaApiUrl}/api/usuarios/:id`, () =>
        HttpResponse.json({ error: 'Error al realizar el registro.', mensaje: 'SQL constraint' }, { status: 500 }),
      ),
    )
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Error al realizar el registro.')).toBeInTheDocument()
    expect(screen.queryByText(/SQL/)).not.toBeInTheDocument()
  })

  it('CA-SES-01 después de iniciar sesión vuelve a la página solicitada', async () => {
    const { usuario } = renderApp('/cuenta')
    await screen.findByRole('heading', { name: 'Iniciar sesión' })
    await usuario.type(screen.getByLabelText('Usuario'), 'instructor.perez')
    await usuario.type(screen.getByLabelText('Contraseña'), '123')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument()
  })
})

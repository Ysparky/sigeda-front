import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_SIN_ROL, sesion } from '@/lib/auth/sesion'
import { CLAVE_REFRESH, tokens } from '@/lib/auth/tokens'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirLogin() {
  const vista = renderApp('/login')
  await screen.findByRole('heading', { name: 'Iniciar sesión' })
  return vista
}

describe('Iniciar sesión', () => {
  it('CA-SES-01 con credenciales válidas lleva al Inicio del rol', async () => {
    const { usuario } = await abrirLogin()
    await usuario.type(screen.getByLabelText('Usuario'), 'instructor.perez')
    await usuario.type(screen.getByLabelText('Contraseña'), '123')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('CA-SES-01 con credenciales inválidas muestra un mensaje que no revela cuál falló', async () => {
    const { usuario } = await abrirLogin()
    await usuario.type(screen.getByLabelText('Usuario'), 'instructor.perez')
    await usuario.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('exige usuario y contraseña antes de llamar al servidor', async () => {
    const { usuario } = await abrirLogin()
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Ingrese su usuario.')).toBeInTheDocument()
    expect(screen.getByText('Ingrese su contraseña.')).toBeInTheDocument()
  })

  it('CA-SES-08 una cuenta sin rol vuelve al inicio de sesión con el aviso', async () => {
    await iniciarComo('instructor.perez')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/:nom`, () =>
        HttpResponse.json({
          codigo: '765432',
          nombre: 'Raúl',
          aPaterno: 'Paredes',
          aMaterno: 'Soto',
          idGrupo: null,
          usuario: { nombre: 'raul.paredes', correo: 'raul.paredes@sigeda.com', id: 12, rol: null },
        }),
      ),
    )
    await sesion.restaurar()
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByText(MENSAJE_SIN_ROL)).toBeInTheDocument()
  })

  it('informa cuando no hay conexión con el servidor', async () => {
    server.use(http.post(`${config.sigedaApiUrl}/auth/login`, () => HttpResponse.error()))
    const { usuario } = await abrirLogin()
    await usuario.type(screen.getByLabelText('Usuario'), 'instructor.perez')
    await usuario.type(screen.getByLabelText('Contraseña'), '123')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
  })
})

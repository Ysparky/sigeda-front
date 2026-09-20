import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirFormulario() {
  await iniciarComo('admin.sistema')
  const vista = renderApp('/personas/nueva')
  await screen.findByLabelText('Código')
  return vista
}

function opcionesDeRol() {
  return Array.from(screen.getByLabelText('Rol').querySelectorAll('option')).map((opcion) => opcion.textContent)
}

async function completar(usuario: ReturnType<typeof renderApp>['usuario']) {
  await usuario.type(screen.getByLabelText('Código'), '123ABC')
  await usuario.type(screen.getByLabelText('DNI'), '71234567')
  await usuario.type(screen.getByLabelText('Nombre'), 'Rosa')
  await usuario.type(screen.getByLabelText('Apellido paterno'), 'Quispe')
  await usuario.type(screen.getByLabelText('Apellido materno'), 'Huamán')
  await usuario.type(screen.getByLabelText('Rango'), 'Cadete')
  await usuario.type(screen.getByLabelText('Usuario'), 'rosa.quispe')
  await usuario.type(screen.getByLabelText('Correo'), 'rosa.quispe@sigeda.com')
  await usuario.type(screen.getByLabelText('Contraseña'), 'Cambio2026')
  await usuario.type(screen.getByLabelText('Repetir contraseña'), 'Cambio2026')
}

describe('Registrar persona', () => {
  it('CA-PER-02 exige los datos de la persona y de la cuenta', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El código es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El DNI es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El apellido paterno es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El correo es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('CA-PER-02 valida el formato del código, el DNI, el usuario y la contraseña repetida', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Código'), '12')
    await usuario.type(screen.getByLabelText('DNI'), '123')
    await usuario.type(screen.getByLabelText('Usuario'), 'Rosa Quispe')
    await usuario.type(screen.getByLabelText('Correo'), 'rosa')
    await usuario.type(screen.getByLabelText('Contraseña'), 'Cambio2026')
    await usuario.type(screen.getByLabelText('Repetir contraseña'), 'otra-clave')
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El código debe tener 6 caracteres alfanuméricos.')).toBeInTheDocument()
    expect(screen.getByText('El DNI debe tener 8 dígitos.')).toBeInTheDocument()
    expect(
      screen.getByText('El nombre de usuario debe tener de 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingresar correo válido.')).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
  })

  it('CA-PER-03 propone el rol según el tipo y solo ofrece los compatibles', async () => {
    const { usuario } = await abrirFormulario()
    expect(screen.getByLabelText('Tipo')).toHaveValue('Alumno')
    expect(screen.getByLabelText('Rol')).toHaveValue('1')
    expect(opcionesDeRol()).toEqual(['Elija un rol', 'Alumno'])
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Instructor PDI')
    expect(screen.getByLabelText('Rol')).toHaveValue('4')
    expect(opcionesDeRol()).toEqual(['Elija un rol', 'Jefe de Operaciones', 'Instructor', 'Comandante de Escuadrón'])
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Sin tipo')
    expect(screen.getByLabelText('Rol')).toHaveValue('')
    expect(opcionesDeRol()).toEqual([
      'Elija un rol',
      'Administrador Web',
      'Jefe de Operaciones',
      'Comandante de Escuadrón',
    ])
  })

  it('CA-PER-04 muestra el mensaje del backend cuando el código ya existe', async () => {
    const { usuario } = await abrirFormulario()
    await completar(usuario)
    await usuario.clear(screen.getByLabelText('Código'))
    await usuario.type(screen.getByLabelText('Código'), '111111')
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El alumno ya ha sido registrado.')).toBeInTheDocument()
  })

  it('CA-PER-04 lleva los errores del backend al campo de la cuenta', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/personas`, () =>
        HttpResponse.json(["'usuario.username': El nombre de usuario ya está en uso."], { status: 400 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await completar(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El nombre de usuario ya está en uso.')).toBeInTheDocument()
  })

  it('CA-PER-05 guarda, avisa y abre el detalle sin mostrar la contraseña', async () => {
    const { usuario, router } = await abrirFormulario()
    await completar(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('Persona guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/personas/123ABC'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Rosa Quispe Huamán' })).toBeInTheDocument()
    expect(screen.getByText('rosa.quispe')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Cambio2026')
  })

  it('CA-DEP-01 sin la dependencia 22 resuelta la ruta no muestra el formulario', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('admin.sistema')
    renderApp('/personas/nueva')
    expect(await screen.findByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
  })
})

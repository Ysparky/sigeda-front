import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { TEXTO_SOLO_RANGO_Y_TIPO } from './components/dialogo-modificar-persona'
import { TEXTO_CUENTA_PROPIA, TEXTO_CUENTA_SIN_ROL, TEXTO_SIN_CUENTA } from './components/seccion-cuenta'

async function abrirPersona(cod: string, username = 'admin.sistema') {
  await iniciarComo(username)
  const vista = renderApp(`/personas/${cod}`)
  await screen.findByRole('heading', { level: 2, name: 'Cuenta' })
  return vista
}

function cuenta() {
  return within(screen.getByRole('heading', { level: 2, name: 'Cuenta' }).closest('div[data-slot="card"]') as HTMLElement)
}

describe('Detalle de persona', () => {
  it('CA-PER-06 muestra los datos de la persona y su cuenta', async () => {
    await abrirPersona('111111')
    expect(screen.getByRole('heading', { level: 1, name: 'Oscar Lopez Chaparro' })).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(screen.getByText('Cadete')).toBeInTheDocument()
    expect(screen.getByText('Grupo 1')).toBeInTheDocument()
    expect(screen.getByText('Apto')).toBeInTheDocument()
    expect(cuenta().getByText('alumno.lopez')).toBeInTheDocument()
    expect(cuenta().getByText('alumno1@sigeda.com')).toBeInTheDocument()
    expect(cuenta().getByText('Alumno')).toBeInTheDocument()
  })

  it('CA-PER-06 una cuenta sin rol lo advierte', async () => {
    await abrirPersona('765432')
    expect(cuenta().getByText('raul.paredes')).toBeInTheDocument()
    expect(screen.getByText(TEXTO_CUENTA_SIN_ROL)).toBeInTheDocument()
  })

  it('CA-PER-06 una persona sin cuenta lo indica', async () => {
    await abrirPersona('654321')
    expect(screen.getByText(TEXTO_SIN_CUENTA)).toBeInTheDocument()
  })

  it('CA-PER-12 en la propia persona la cuenta explica que no se gestiona desde aquí', async () => {
    await abrirPersona('000001')
    expect(screen.getByText(TEXTO_CUENTA_PROPIA)).toBeInTheDocument()
  })

  it('CA-PER-07 modificar solo cambia rango y tipo y muestra el mensaje del backend', async () => {
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Modificar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getAllByText(TEXTO_SOLO_RANGO_Y_TIPO).length).toBeGreaterThan(0)
    expect(dialogo.queryByLabelText('DNI')).not.toBeInTheDocument()
    expect(dialogo.getByLabelText('Tipo')).toHaveValue('Alumno')
    expect(
      dialogo.getAllByRole('option').map((opcion) => (opcion as HTMLOptionElement).textContent),
    ).toEqual(['Alumno'])
    await usuario.clear(dialogo.getByLabelText('Rango'))
    await usuario.type(dialogo.getByLabelText('Rango'), 'Teniente')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('Persona guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Teniente')).toBeInTheDocument())
  })

  it('CA-PER-07 sin cuenta se ofrecen todos los tipos', async () => {
    const { usuario } = await abrirPersona('654321')
    await usuario.click(screen.getByRole('button', { name: 'Modificar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Alumno',
      'Instructor PDI',
      'Instructor PDE',
      'Sin tipo',
    ])
  })

  it('CA-PER-07 el backend rechaza un tipo incompatible con el rol de la cuenta', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/personas/:cod`, () =>
        HttpResponse.json(["'tipo': El tipo no corresponde al rol de la cuenta."], { status: 400 }),
      ),
    )
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Modificar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El tipo no corresponde al rol de la cuenta.')).toBeInTheDocument()
  })

  it('CA-PER-07 una cuenta sin rol acepta cualquier tipo', async () => {
    const { usuario } = await abrirPersona('765432')
    await usuario.click(screen.getByRole('button', { name: 'Modificar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Alumno',
      'Instructor PDI',
      'Instructor PDE',
      'Sin tipo',
    ])
    await usuario.selectOptions(dialogo.getByLabelText('Tipo'), 'Instructor PDI')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar persona' }))
    expect((await screen.findAllByText('Persona guardada con éxito.')).length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Instructor PDI')).toBeInTheDocument())
  })

  it('CA-PER-08 asigna un rol compatible con el tipo y refleja el cambio', async () => {
    const { usuario } = await abrirPersona('765432')
    await usuario.click(screen.getByRole('button', { name: 'Asignar rol' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByLabelText('Rol')).toBeInTheDocument()
    expect(dialogo.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Elija un rol',
      'Administrador Web',
      'Jefe de Operaciones',
      'Comandante de Escuadrón',
    ])
    await usuario.selectOptions(dialogo.getByLabelText('Rol'), 'Comandante de Escuadrón')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar rol' }))
    expect(await screen.findByText('Usuario guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(cuenta().getByText('Comandante de Escuadrón')).toBeInTheDocument())
  })

  it('CA-PER-08 el rol de un alumno solo puede ser Alumno', async () => {
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Asignar rol' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByLabelText('Rol')).toBeInTheDocument()
    expect(dialogo.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual(['Elija un rol', 'Alumno'])
  })

  it('CA-PER-09 restablece la contraseña pidiéndola dos veces', async () => {
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(dialogo.getByLabelText('Repetir contraseña nueva'), 'otra-clave-1')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await dialogo.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    await usuario.clear(dialogo.getByLabelText('Repetir contraseña nueva'))
    await usuario.type(dialogo.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar contraseña' }))
    expect((await screen.findAllByText('Usuario guardada con éxito.')).length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('CA-PER-09 exige al menos 8 caracteres', async () => {
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Contraseña nueva'), 'corta')
    await usuario.type(dialogo.getByLabelText('Repetir contraseña nueva'), 'corta')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await dialogo.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('CA-PER-12 en la propia persona no se ofrecen acciones sobre la cuenta', async () => {
    await abrirPersona('000001')
    expect(screen.queryByRole('button', { name: 'Asignar rol' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restablecer contraseña' })).not.toBeInTheDocument()
  })

  it('CA-PER-08 si los roles no cargan lo avisa dentro del diálogo', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/roles`, () => HttpResponse.error()))
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Asignar rol' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(dialogo.queryByLabelText('Rol')).not.toBeInTheDocument()
  })

  it('una persona inexistente muestra la página no encontrada', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/personas/ZZ9999')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })

  it('un código con formato inválido no consulta al backend', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/personas/xx')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})

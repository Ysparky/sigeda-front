import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirEdicion(id = 8) {
  await iniciarComo('jefe.operaciones')
  const vista = renderApp(`/turnos/${id}/editar`)
  await screen.findByRole('heading', { name: 'Modificar turno' })
  return vista
}

describe('Modificar turno', () => {
  it('CA-TUR-12 carga los datos actuales del turno', async () => {
    await abrirEdicion()
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Navegación Nocturna')
    expect(screen.getByLabelText('Programa')).toBeDisabled()
    expect(screen.getByLabelText('Sub fase')).toHaveValue('2')
    expect(screen.getByLabelText('Sub fase')).toBeDisabled()
    expect(screen.getByLabelText('Instructor')).toHaveValue('444444')
    expect(screen.getByLabelText('Aeronave')).toHaveValue('1')
    expect(screen.getByLabelText('Alumno 1')).toHaveValue('111111')
    expect(screen.getByLabelText('Inicio 1')).toHaveValue('09:00')
    expect(screen.getByLabelText('Alumno 2')).toHaveValue('666666')
    expect(screen.getByLabelText('Maniobra 3')).toHaveValue('3')
    expect(screen.getByLabelText('Nota mínima 3')).toHaveValue('E')
  })

  it('CA-TUR-12 aplica las mismas validaciones que registrar', async () => {
    const { usuario } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await usuario.clear(screen.getByLabelText('Fecha de evaluación'))
    await usuario.type(screen.getByLabelText('Fecha de evaluación'), hoyIso())
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('Nombre debe tener de 10 a 30 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('La fecha del turno debe ser posterior a hoy.')).toBeInTheDocument()
  })

  it('CA-TUR-12 guarda los cambios sin advertir cruces con su propio horario', async () => {
    const { usuario, router } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Navegación Nocturna II')
    expect(screen.queryByText('Horario superpuesto en la aeronave')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('Turno guardado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/turnos/8'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Navegación Nocturna II' })).toBeInTheDocument()
  })

  it('CA-TUR-11 un turno con fecha vencida no se puede modificar y se explica el motivo', async () => {
    await abrirEdicion(1)
    expect(screen.getByText('El turno ya no se puede modificar porque su fecha pasó.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('M1-2 muestra el mensaje del backend si rechaza el cambio por la fecha', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/turnos/:id`, () =>
        HttpResponse.json(
          { status: 410, error: 'Fecha de modificación expiró', message: 'No se puede modificar. El turno ya ha sido evaluado.' },
          { status: 410 },
        ),
      ),
    )
    const { usuario } = await abrirEdicion()
    await screen.findByLabelText('Nombre')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('No se puede modificar. El turno ya ha sido evaluado.')).toBeInTheDocument()
  })
})

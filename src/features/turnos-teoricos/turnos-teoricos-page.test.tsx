import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { TEXTO_SIN_TURNOS_TEORICOS, TEXTO_TEORIA_SOLO_MOCK, TEXTO_VENTANA_COMENZADA } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { D7_VENTANA_COMENZADA } from '@/mocks/sigeda/turnos-teoricos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirTurnos(ruta = '/teoria/turnos') {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(ruta)
  await screen.findByText(/registro/)
  return resultado
}

function filas() {
  return within(screen.getByRole('table', { name: 'Turnos teóricos programados' })).getAllByRole('row').slice(1)
}

describe('Turnos teóricos', () => {
  it('CA-TUT-01 muestra nombre, materia, tipo, grupo, fecha, horario, estado y cuántos rindieron', async () => {
    await abrirTurnos()
    const tabla = within(screen.getByRole('table', { name: 'Turnos teóricos programados' }))
    for (const columna of ['Nombre', 'Materia', 'Tipo de examen', 'Grupo', 'Fecha', 'Horario', 'Estado', 'Rindieron']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(filas()).toHaveLength(5)
    expect(screen.getByText('Página 1 de 1 · 5 registros')).toBeInTheDocument()
    const primera = within(filas()[0]!)
    expect(primera.getByRole('link', { name: 'Mensual Adoctrinamiento de Vuelo' })).toHaveAttribute(
      'href',
      '/teoria/turnos/1',
    )
    expect(primera.getByText('Mensual')).toBeInTheDocument()
    expect(primera.getByText('Grupo 3')).toBeInTheDocument()
    expect(primera.getByText('08:00–09:00')).toBeInTheDocument()
    expect(primera.getByText('Finalizado')).toBeInTheDocument()
    expect(primera.getByText('2 de 2')).toBeInTheDocument()
  })

  it('CA-TUT-02 filtra por grupo, materia, estado y tipo y todo viaja en la URL', async () => {
    const { router, usuario } = await abrirTurnos()
    await usuario.selectOptions(screen.getByLabelText('Grupo'), 'Grupo 3')
    await screen.findByText('Página 1 de 1 · 3 registros')
    expect(router.state.location.search).toMatchObject({ idGrupo: 3 })
    await usuario.selectOptions(screen.getByLabelText('Estado'), 'Programado')
    await screen.findByText('Página 1 de 1 · 2 registros')
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    await screen.findByText('Página 1 de 1 · 1 registro')
    expect(router.state.location.search).toMatchObject({ idGrupo: 3, estado: 'PROGRAMADO', tipoExamen: 'SUBSANACION' })
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await screen.findByText('Página 1 de 1 · 5 registros')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Procedimientos de Emergencias')
    await screen.findByText('Página 1 de 1 · 1 registro')
  })

  it('CA-TUT-02 el rango cerrado de fechas filtra, se muestra en los campos y Limpiar filtros lo borra', async () => {
    const desde = sumarDias(hoyIso(), -6)
    const hasta = sumarDias(hoyIso(), 2)
    const { usuario } = await abrirTurnos(`/teoria/turnos?fechaPre=${desde}&fechaPost=${hasta}`)
    expect(await screen.findByText('Página 1 de 1 · 3 registros')).toBeInTheDocument()
    expect(filas()).toHaveLength(3)
    expect(screen.getByLabelText('Desde')).toHaveValue(desde)
    expect(screen.getByLabelText('Hasta')).toHaveValue(hasta)
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(await screen.findByText('Página 1 de 1 · 5 registros')).toBeInTheDocument()
    expect(screen.getByLabelText('Desde')).toHaveValue('')
    expect(screen.getByLabelText('Hasta')).toHaveValue('')
  })

  it('CA-TUT-02 sin turnos muestra E25 y una URL mal escrita vuelve a los valores por defecto', async () => {
    server.use(
      http.get(`${API}/api/turnos-teoricos`, () =>
        HttpResponse.text('No existen turnos teóricos disponibles.', { status: 404 }),
      ),
    )
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/teoria/turnos?page=-1&estado=CERRADO&size=0')
    expect(await screen.findByText(TEXTO_SIN_TURNOS_TEORICOS)).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ page: 0, size: 10, direction: 'ASC' })
  })

  it('CA-TUT-01 el orden lo resuelve el servidor y viaja en la URL', async () => {
    const { router, usuario } = await abrirTurnos()
    await usuario.click(screen.getByRole('button', { name: 'Nombre' }))
    await screen.findByText('Página 1 de 1 · 5 registros')
    expect(router.state.location.search).toMatchObject({ property: 'nombre', direction: 'ASC' })
    expect(within(filas()[0]!).getByRole('link', { name: 'Mensual Adoctrinamiento de Vuelo' })).toBeInTheDocument()
  })

  it('CA-TUT-10 CA-TUT-11 Modificar y Eliminar solo están en un turno programado', async () => {
    await abrirTurnos()
    expect(within(filas()[0]!).getByText(TEXTO_VENTANA_COMENZADA)).toBeInTheDocument()
    expect(within(filas()[0]!).queryByRole('link', { name: /Modificar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modificar Quincenal Límites de Operación' })).toHaveAttribute(
      'href',
      '/teoria/turnos/4/editar',
    )
    expect(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' })).toBeEnabled()
  })

  it('CA-TUT-11 eliminar pide confirmación y quita el turno de la lista', async () => {
    const { usuario } = await abrirTurnos()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText('¿Eliminar el turno teórico?')).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Turno teórico eliminado con éxito.')).toBeInTheDocument()
    expect(await screen.findByText('Página 1 de 1 · 4 registros')).toBeInTheDocument()
  })

  it('CA-TUT-11 una eliminación que el servidor rechaza muestra D7', async () => {
    server.use(
      http.delete(`${API}/api/turnos-teoricos/:id`, () => HttpResponse.text(D7_VENTANA_COMENZADA, { status: 409 })),
    )
    const { usuario } = await abrirTurnos()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText(D7_VENTANA_COMENZADA)).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1 · 5 registros')).toBeInTheDocument()
  })

  it('CA-TUT-13 un fallo en la primera carga de la lista ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos`, () => HttpResponse.error()))
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/teoria/turnos')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Turnos teóricos programados' })).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(/registro/)).toBeInTheDocument()
  })

  it('CA-TUT-13 un fallo del catálogo de grupos avisa bajo su selector sin bloquear la pantalla', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos/grupos`, () => HttpResponse.error()))
    await abrirTurnos()
    expect(await screen.findByText('No se pudieron cargar los grupos.')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Turnos teóricos programados' })).toBeInTheDocument()
  })

  it('CA-TUT-14 fuera del modo mock y sin la dependencia 6 muestra E1 y deshabilita Registrar', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirTurnos()
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar turno teórico' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument()
  })
})

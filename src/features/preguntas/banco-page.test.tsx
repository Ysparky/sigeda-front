import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_SIN_PREGUNTAS, TEXTO_TEORIA_SOLO_MOCK } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirBanco(ruta = '/banco') {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(ruta)
  await screen.findByText(/registro/)
  return resultado
}

function filas() {
  return within(screen.getByRole('table', { name: 'Preguntas del banco' })).getAllByRole('row').slice(1)
}

describe('Banco de preguntas', () => {
  it('CA-BAN-01 muestra materia, enunciado, tipo, dificultad, origen y uso, de 10 en 10', async () => {
    await abrirBanco()
    const tabla = within(screen.getByRole('table', { name: 'Preguntas del banco' }))
    for (const columna of ['Materia', 'Enunciado', 'Tipo', 'Dificultad', 'Origen', 'En uso']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(filas()).toHaveLength(10)
    expect(screen.getByText('Página 1 de 3 · 24 registros')).toBeInTheDocument()
    const primera = within(filas()[0]!)
    expect(primera.getByText('Adoctrinamiento de Vuelo')).toBeInTheDocument()
    expect(primera.getByText('Opción múltiple')).toBeInTheDocument()
    expect(primera.getByText('Media')).toBeInTheDocument()
    expect(primera.getByText('Manual')).toBeInTheDocument()
    expect(primera.getByText('Sí')).toBeInTheDocument()
  })

  it('CA-BAN-01 la página y el orden viajan en la URL y los resuelve el servidor', async () => {
    const { router, usuario } = await abrirBanco()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Página 2 de 3 · 24 registros')
    expect(router.state.location.search).toMatchObject({ page: 1 })
    await usuario.click(screen.getByRole('button', { name: 'Enunciado' }))
    await screen.findByText('Página 1 de 3 · 24 registros')
    expect(router.state.location.search).toMatchObject({ property: 'enunciado', direction: 'ASC', page: 0 })
    expect(within(filas()[0]!).getByText(/¿Cada cuánto se practica/)).toBeInTheDocument()
  })

  it('CA-BAN-02 filtra por materia, dificultad, tipo, origen y texto, y limpia los filtros', async () => {
    const { router, usuario } = await abrirBanco()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await screen.findByText('Página 1 de 1 · 10 registros')
    expect(router.state.location.search).toMatchObject({ idMateria: 3 })
    await usuario.selectOptions(screen.getByLabelText('Dificultad'), 'Media')
    await screen.findByText('Página 1 de 1 · 4 registros')
    await usuario.selectOptions(screen.getByLabelText('Origen'), 'IA')
    await screen.findByText('Página 1 de 1 · 1 registro')
    expect(router.state.location.search).toMatchObject({ idMateria: 3, dificultad: 'MEDIA', origen: 'IA' })
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await screen.findByText('Página 1 de 3 · 24 registros')
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Completar')
    await screen.findByText('Página 1 de 1 · 5 registros')
    await usuario.type(screen.getByLabelText('Enunciado'), 'autorrotación')
    await screen.findByText('Página 1 de 1 · 1 registro')
    expect(router.state.location.search).toMatchObject({ tipo: 'COMPLETAR', texto: 'autorrotación' })
  })

  it('CA-BAN-02 una URL mal escrita vuelve a los valores por defecto', async () => {
    const { router } = await abrirBanco('/banco?page=-3&size=999&dificultad=URGENTE&origen=OTRO&idMateria=cero')
    expect(router.state.location.search).toEqual({ page: 0, size: 10, direction: 'ASC' })
    expect(screen.getByText('Página 1 de 3 · 24 registros')).toBeInTheDocument()
  })

  it('CA-BAN-03 sin preguntas muestra E3 con Importar desde IA', async () => {
    server.use(
      http.get(`${API}/api/preguntas`, () => HttpResponse.text('No existen preguntas disponibles.', { status: 404 })),
    )
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    expect(await screen.findByText(TEXTO_SIN_PREGUNTAS)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Importar desde IA' }).length).toBeGreaterThan(0)
  })

  it('CA-BAN-13 un fallo en la primera carga ofrece Reintentar en lugar de una lista vacía', async () => {
    server.use(http.get(`${API}/api/preguntas`, () => HttpResponse.error()))
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/banco')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_PREGUNTAS)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Preguntas del banco' })).toBeInTheDocument()
  })

  it('CA-BAN-14 fuera del modo mock y sin la dependencia 6 muestra E1 y deshabilita Importar', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirBanco()
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar desde IA' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })
})

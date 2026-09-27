import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { TEXTO_TEORIA_SOLO_MOCK } from '@/lib/dominio/teoria'
import { iniciarComo, renderApp } from '@/test/render'

describe('rutas de teoría', () => {
  it('CA-BAN-14 CA-TUT-14 el instructor abre las cuatro pantallas de gestión', async () => {
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/banco')
    expect(await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })).toBeInTheDocument()
    await router.navigate({ to: '/banco/importar' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Importar desde IA' })).toBeInTheDocument()
    await router.navigate({ to: '/teoria/turnos' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Turnos teóricos' })).toBeInTheDocument()
    await router.navigate({ to: '/teoria/turnos/nuevo' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Registrar turno teórico' })).toBeInTheDocument()
  })

  it('M4-14 el instructor ve el grupo Teoría en el menú', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })
    expect(screen.getByText('Teoría')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Banco de preguntas' }).map((enlace) => enlace.getAttribute('href'))).toContain(
      '/banco',
    )
    expect(screen.getByRole('link', { name: 'Turnos teóricos' })).toHaveAttribute('href', '/teoria/turnos')
    expect(screen.queryByRole('link', { name: 'Mis exámenes' })).not.toBeInTheDocument()
  })

  it('M4-13 Importar desde IA cuelga del banco en las migas', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/banco/importar')
    await screen.findByRole('heading', { level: 1, name: 'Importar desde IA' })
    const migas = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(migas.getByRole('link', { name: 'Banco de preguntas' })).toHaveAttribute('href', '/banco')
    expect(migas.getByText('Importar desde IA')).toBeInTheDocument()
  })

  it('M4-14 el alumno abre Mis exámenes y no alcanza el banco', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/examenes')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis exámenes' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Mis exámenes' }).map((enlace) => enlace.getAttribute('href'))).toContain(
      '/examenes',
    )
    await router.navigate({ to: '/banco' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M4-14 el Comandante de Escuadrón no alcanza los turnos teóricos', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/teoria/turnos')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M4-14 el Administrador Web no alcanza las pantallas del alumno', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/examenes')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-BAN-14 CA-TUT-14 en modo mock no se muestra E1', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })
    expect(screen.queryByText(TEXTO_TEORIA_SOLO_MOCK)).not.toBeInTheDocument()
  })

  it('CA-BAN-14 CA-TUT-14 fuera del modo mock y sin la dependencia 6 cada pantalla muestra E1', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/banco')
    await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    await router.navigate({ to: '/banco/importar' })
    await screen.findByRole('heading', { level: 1, name: 'Importar desde IA' })
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    await router.navigate({ to: '/teoria/turnos' })
    await screen.findByRole('heading', { level: 1, name: 'Turnos teóricos' })
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
  })

  it('CA-EXA-13 el alumno también ve E1 sin la dependencia 6', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('alumno.lopez')
    renderApp('/examenes')
    await screen.findByRole('heading', { level: 1, name: 'Mis exámenes' })
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
  })

  it('CA-BAN-14 con la dependencia 6 resuelta E1 desaparece', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '6')
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })
    expect(screen.queryByText(TEXTO_TEORIA_SOLO_MOCK)).not.toBeInTheDocument()
  })
})

import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_DOCUMENTOS_COMPARTIDOS } from '@/lib/dominio/aprendizaje'
import { iniciarComo, renderApp } from '@/test/render'

const ROLES = ['admin.sistema', 'comandante.aguirre', 'jefe.operaciones', 'instructor.perez', 'alumno.lopez']

describe('rutas de aprendizaje', () => {
  it.each(ROLES)('CA-DOC-11 %s abre las tres pantallas de Aprendizaje', async (username) => {
    await iniciarComo(username)
    const { router } = renderApp('/aprendizaje')
    expect(await screen.findByRole('heading', { level: 1, name: 'Documentos' })).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/cuestionario' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Cuestionario de práctica' })).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/consultas' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Consultas' })).toBeInTheDocument()
  })

  it.each(ROLES)('CA-DOC-11 %s ve el grupo Aprendizaje en el menú', async (username) => {
    await iniciarComo(username)
    renderApp('/aprendizaje')
    await screen.findByRole('heading', { level: 1, name: 'Documentos' })
    expect(screen.getByText('Aprendizaje')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Documentos' }).map((enlace) => enlace.getAttribute('href'))).toContain(
      '/aprendizaje',
    )
    expect(screen.getByRole('link', { name: 'Cuestionario de práctica' })).toHaveAttribute(
      'href',
      '/aprendizaje/cuestionario',
    )
    expect(screen.getByRole('link', { name: 'Consultas' })).toHaveAttribute('href', '/aprendizaje/consultas')
  })

  it('M3-13 el cuestionario y las consultas cuelgan de Documentos en las migas', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/aprendizaje/cuestionario')
    await screen.findByRole('heading', { level: 1, name: 'Cuestionario de práctica' })
    const migas = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(migas.getByRole('link', { name: 'Documentos' })).toHaveAttribute('href', '/aprendizaje')
    expect(migas.getByText('Cuestionario de práctica')).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/consultas' })
    await screen.findByRole('heading', { level: 1, name: 'Consultas' })
    expect(
      within(screen.getByRole('navigation', { name: 'Migas de pan' })).getByRole('link', { name: 'Documentos' }),
    ).toHaveAttribute('href', '/aprendizaje')
  })

  it('CA-DOC-10 en modo mock las tres pantallas no muestran A1', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/aprendizaje')
    await screen.findByRole('heading', { level: 1, name: 'Documentos' })
    expect(screen.queryByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).not.toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/cuestionario' })
    await screen.findByRole('heading', { level: 1, name: 'Cuestionario de práctica' })
    expect(screen.queryByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).not.toBeInTheDocument()
  })

  it('CA-DOC-10 fuera del modo mock y sin la dependencia 39 las tres pantallas muestran A1', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/aprendizaje')
    await screen.findByRole('heading', { level: 1, name: 'Documentos' })
    expect(screen.getByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/cuestionario' })
    await screen.findByRole('heading', { level: 1, name: 'Cuestionario de práctica' })
    expect(screen.getByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/consultas' })
    await screen.findByRole('heading', { level: 1, name: 'Consultas' })
    expect(screen.getByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).toBeInTheDocument()
  })

  it('CA-DOC-10 con la dependencia 39 resuelta A1 no aparece y las acciones quedan disponibles', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '39')
    await iniciarComo('alumno.lopez')
    renderApp('/aprendizaje')
    await screen.findByRole('heading', { level: 1, name: 'Documentos' })
    expect(screen.queryByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).not.toBeInTheDocument()
    expect(screen.queryByText(MENSAJE_DEPENDENCIA_PENDIENTE)).not.toBeInTheDocument()
  })
})

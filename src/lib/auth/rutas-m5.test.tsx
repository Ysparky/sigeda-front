import { QueryClient } from '@tanstack/react-query'
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import {
  TEXTO_ALERTAS_SIN_SERVIDOR,
  TEXTO_INDICES_SIN_SERVIDOR,
  TEXTO_ORDEN_MERITO_SIN_COEFICIENTES,
  TEXTO_ORDEN_MERITO_SIN_SERVIDOR,
} from '@/lib/dominio/seguimiento'
import { crearRouter } from '@/router'
import { iniciarComo, renderApp } from '@/test/render'
import { PANTALLAS } from './pantallas'

function rutaDeCoincidencia(fullPath: string) {
  return fullPath.length > 1 ? fullPath.replace(/\/$/, '') : fullPath
}

describe('rutas de seguimiento', () => {
  it('M5-5 el instructor abre el escuadrón, las alertas, un legajo y los reportes', async () => {
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento')
    expect(await screen.findByRole('heading', { level: 1, name: 'Escuadrón' })).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/alertas' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Alertas' })).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/$alumno', params: { alumno: '777777' } })
    expect(await screen.findByRole('heading', { level: 1, name: /Legajo/ })).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })).toBeInTheDocument()
  })

  it('M5-5 M5-19 el jefe de operaciones ve el escuadrón y no las alertas ni los reportes', async () => {
    await iniciarComo('jefe.operaciones')
    const { router } = renderApp('/seguimiento')
    expect(await screen.findByRole('heading', { level: 1, name: 'Escuadrón' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Alertas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reportes y orden de mérito' })).not.toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/alertas' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M5-19 el comandante alcanza las cuatro pantallas de personal', async () => {
    await iniciarComo('comandante.aguirre')
    const { router } = renderApp('/seguimiento')
    expect(await screen.findByRole('heading', { level: 1, name: 'Escuadrón' })).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/alertas' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Alertas' })).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/$alumno', params: { alumno: '555555' } })
    expect(await screen.findByRole('heading', { level: 1, name: 'Legajo del alumno' })).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })).toBeInTheDocument()
  })

  it('M5-10 /mi-legajo lleva al alumno a su propio legajo y no ve el escuadrón', async () => {
    await iniciarComo('alumno.ramirez')
    const { router } = renderApp('/mi-legajo')
    await screen.findByRole('heading', { level: 1, name: /Legajo/ })
    expect(router.state.location.pathname).toBe('/seguimiento/777777')
    await router.navigate({ to: '/seguimiento' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M5-10 el alumno no alcanza las alertas ni los reportes y el personal no ve Mi legajo', async () => {
    await iniciarComo('alumno.ramirez')
    const { router, unmount } = renderApp('/seguimiento/alertas')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
    unmount()
    await iniciarComo('instructor.perez')
    renderApp('/mi-legajo')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M5-9 el legajo y las alertas cuelgan del escuadrón en las migas', async () => {
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento/alertas')
    await screen.findByRole('heading', { level: 1, name: 'Alertas' })
    const migas = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(migas.getByRole('link', { name: 'Escuadrón' })).toHaveAttribute('href', '/seguimiento')
    expect(migas.getByText('Alertas')).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/$alumno', params: { alumno: '555555' } })
    await screen.findByRole('heading', { level: 1, name: 'Legajo del alumno' })
    const migasLegajo = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(migasLegajo.getByRole('link', { name: 'Escuadrón' })).toHaveAttribute('href', '/seguimiento')
  })

  it('M5-22 en modo mock ninguna pantalla muestra un aviso de dependencia', async () => {
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento/alertas')
    await screen.findByRole('heading', { level: 1, name: 'Alertas' })
    expect(screen.queryByText(TEXTO_ALERTAS_SIN_SERVIDOR)).not.toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })
    expect(screen.queryByText(TEXTO_ORDEN_MERITO_SIN_SERVIDOR)).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_ORDEN_MERITO_SIN_COEFICIENTES)).not.toBeInTheDocument()
  })

  it('M5-22 fuera del modo mock cada pantalla muestra el aviso de su dependencia', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento/alertas')
    await screen.findByRole('heading', { level: 1, name: 'Alertas' })
    expect(screen.getByText(TEXTO_ALERTAS_SIN_SERVIDOR)).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })
    expect(screen.getByText(TEXTO_ORDEN_MERITO_SIN_COEFICIENTES)).toBeInTheDocument()
    expect(screen.getByText(TEXTO_ORDEN_MERITO_SIN_SERVIDOR)).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/$alumno', params: { alumno: '777777' } })
    await screen.findByRole('heading', { level: 1, name: /Legajo/ })
    // El legajo ya NO lleva aviso de página para los índices: la mitad teórica (NIT) sí la calcula el
    // servidor, así que taparla con «todavía no existen» afirmaba algo falso. El aviso que queda es el
    // del propio panel, y sale cuando su dependencia no está resuelta.
    expect(await screen.findByText(TEXTO_INDICES_SIN_SERVIDOR)).toBeInTheDocument()
  })

  it('M5-22 con las dependencias resueltas los avisos desaparecen', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '6,61,62,63,66')
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento/alertas')
    await screen.findByRole('heading', { level: 1, name: 'Alertas' })
    expect(screen.queryByText(TEXTO_ALERTAS_SIN_SERVIDOR)).not.toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })
    expect(screen.queryByText(TEXTO_ORDEN_MERITO_SIN_SERVIDOR)).not.toBeInTheDocument()
  })

  it('M5-5 las cinco pantallas de seguimiento tienen una ruta real en el árbol del router', () => {
    const router = crearRouter(new QueryClient())
    const rutasReales = new Set(
      Object.values(router.routesById)
        .filter((ruta) => ruta.id.startsWith('/_app/'))
        .map((ruta) => rutaDeCoincidencia(ruta.fullPath)),
    )
    const pantallas = [PANTALLAS.escuadron, PANTALLAS.alertas, PANTALLAS.legajo, PANTALLAS.miLegajo, PANTALLAS.reportes]
    expect(pantallas.filter((pantalla) => !rutasReales.has(pantalla.ruta))).toEqual([])
  })
})

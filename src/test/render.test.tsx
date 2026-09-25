import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from './render'

describe('renderApp', () => {
  it('usa el cliente de consultas de producción: una lista recién cargada no se vuelve a pedir', async () => {
    let pedidos = 0
    const contar = ({ request }: { request: Request }) => {
      if (request.url === `${config.sigedaApiUrl}/api/materias`) pedidos += 1
    }
    server.events.on('request:start', contar)
    try {
      await iniciarComo('comandante.aguirre')
      const { router } = renderApp('/programa/materias')
      await screen.findByRole('table', { name: 'Materias del curso' })
      expect(pedidos).toBe(1)
      await router.navigate({ to: '/' })
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })
      await router.navigate({ to: '/programa/materias' })
      await screen.findByRole('table', { name: 'Materias del curso' })
      await waitFor(() => expect(screen.getByText('Meteorología')).toBeInTheDocument())
      expect(pedidos).toBe(1)
    } finally {
      server.events.removeListener('request:start', contar)
    }
  })
})

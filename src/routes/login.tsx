import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage } from '@/features/auth/login-page'
import { destinoSeguro } from '@/lib/auth/guardas'

const busqueda = z.object({ redirect: z.string().optional().catch(undefined) })

export const Route = createFileRoute('/login')({
  validateSearch: busqueda,
  beforeLoad: ({ context, search }) => {
    if (context.sesion.actual()) throw redirect({ href: destinoSeguro(search.redirect) })
  },
  component: LoginPage,
})

import { createFileRoute, redirect } from '@tanstack/react-router'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { hoyIso } from '@/lib/dominio/calendario'

export const Route = createFileRoute('/_app/turnos/dia/')({
  beforeLoad: ({ context }) => {
    exigirPantalla(PANTALLAS.ordenDeVuelo, context.sesion.actual())
    throw redirect({ to: '/turnos/dia/$fecha', params: { fecha: hoyIso() } })
  },
})

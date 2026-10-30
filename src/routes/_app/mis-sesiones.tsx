import { createFileRoute } from '@tanstack/react-router'
import { MisSesionesPage } from '@/features/sesiones-simulador/mis-sesiones-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mis-sesiones')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misSesiones, context.sesion.actual()),
  component: MisSesionesPage,
})

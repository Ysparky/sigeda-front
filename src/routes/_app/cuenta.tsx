import { createFileRoute } from '@tanstack/react-router'
import { CambiarContrasenaPage } from '@/features/auth/cambiar-contrasena-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/cuenta')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.cuenta, context.sesion.actual()),
  component: CambiarContrasenaPage,
})

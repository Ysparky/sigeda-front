import { createFileRoute } from '@tanstack/react-router'
import { RegistrarFasePage } from '@/features/fases/registrar-fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarFase, context.sesion.actual()),
  component: RegistrarFasePage,
})

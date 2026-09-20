import { createFileRoute } from '@tanstack/react-router'
import { RegistrarManiobraPage } from '@/features/maniobras/registrar-maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarManiobra, context.sesion.actual()),
  component: RegistrarManiobraPage,
})

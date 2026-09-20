import { createFileRoute } from '@tanstack/react-router'
import { RegistrarGrupoPage } from '@/features/grupos/registrar-grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/nuevo')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarGrupo, context.sesion.actual()),
  component: RegistrarGrupoPage,
})

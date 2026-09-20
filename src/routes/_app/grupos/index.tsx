import { createFileRoute } from '@tanstack/react-router'
import { GruposPage } from '@/features/grupos/grupos-page'
import { esquemaBusquedaGrupos } from '@/features/grupos/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/')({
  validateSearch: esquemaBusquedaGrupos,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupos, context.sesion.actual()),
  component: GruposPage,
})

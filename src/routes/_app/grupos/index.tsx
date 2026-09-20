import { createFileRoute } from '@tanstack/react-router'
import { GruposPage } from '@/features/grupos/grupos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupos, context.sesion.actual()),
  component: GruposPage,
})

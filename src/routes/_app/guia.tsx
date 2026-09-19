import { createFileRoute } from '@tanstack/react-router'
import { GuiaPage } from '@/features/guia/guia-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/guia')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.guia, context.sesion.actual()),
  component: GuiaPage,
})

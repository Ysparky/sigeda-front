import { createFileRoute } from '@tanstack/react-router'
import { EscuadronPage } from '@/features/seguimiento/escuadron-page'
import { esquemaBusquedaEscuadron } from '@/features/seguimiento/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/seguimiento/')({
  validateSearch: esquemaBusquedaEscuadron,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.escuadron, context.sesion.actual()),
  component: EscuadronPage,
})

import { createFileRoute } from '@tanstack/react-router'
import { BancoPage } from '@/features/preguntas/banco-page'
import { esquemaBusquedaPreguntas } from '@/features/preguntas/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/banco/')({
  validateSearch: esquemaBusquedaPreguntas,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.banco, context.sesion.actual()),
  component: BancoPage,
})

import { createFileRoute } from '@tanstack/react-router'
import { BandejaPage } from '@/features/matriculas/bandeja-page'
import { esquemaBusquedaMatriculas } from '@/features/matriculas/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/matriculas/')({
  validateSearch: esquemaBusquedaMatriculas,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.matriculas, context.sesion.actual()),
  component: BandejaPage,
})

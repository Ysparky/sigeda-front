import { createFileRoute } from '@tanstack/react-router'
import { EvaluacionesPage } from '@/features/evaluaciones/evaluaciones-page'
import { esquemaBusquedaEvaluaciones } from '@/features/evaluaciones/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/')({
  validateSearch: esquemaBusquedaEvaluaciones,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.evaluaciones, context.sesion.actual()),
  component: EvaluacionesPage,
})

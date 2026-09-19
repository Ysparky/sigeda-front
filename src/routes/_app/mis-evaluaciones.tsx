import { createFileRoute } from '@tanstack/react-router'
import { MisEvaluacionesPage } from '@/features/evaluaciones/mis-evaluaciones-page'
import { esquemaBusquedaMisEvaluaciones } from '@/features/evaluaciones/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mis-evaluaciones')({
  validateSearch: esquemaBusquedaMisEvaluaciones,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misEvaluaciones, context.sesion.actual()),
  component: MisEvaluacionesPage,
})

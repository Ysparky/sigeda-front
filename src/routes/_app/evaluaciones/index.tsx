import { createFileRoute } from '@tanstack/react-router'
import { EvaluacionesPage } from '@/features/evaluaciones/evaluaciones-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.evaluaciones, context.sesion.actual()),
  component: EvaluacionesPage,
})

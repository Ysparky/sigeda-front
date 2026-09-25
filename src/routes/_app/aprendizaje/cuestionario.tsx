import { createFileRoute } from '@tanstack/react-router'
import { CuestionarioPage } from '@/features/aprendizaje/cuestionario-page'
import { esquemaBusquedaCuestionario } from '@/features/aprendizaje/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/aprendizaje/cuestionario')({
  validateSearch: esquemaBusquedaCuestionario,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.cuestionario, context.sesion.actual()),
  component: CuestionarioPage,
})

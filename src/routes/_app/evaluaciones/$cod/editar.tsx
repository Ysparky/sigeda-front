import { createFileRoute } from '@tanstack/react-router'
import { cargarEvaluacionVisible } from '@/features/evaluaciones/cargar'
import { ModificarEvaluacionPage } from '@/features/evaluaciones/modificar-evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/$cod/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarEvaluacion, context.sesion.actual()),
  loader: ({ context, params }) => cargarEvaluacionVisible(context.queryClient, context.sesion.actual(), params.cod),
  component: RutaModificarEvaluacion,
})

function RutaModificarEvaluacion() {
  const { cod } = Route.useParams()
  return <ModificarEvaluacionPage codigo={cod} />
}

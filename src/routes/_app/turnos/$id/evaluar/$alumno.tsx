import { createFileRoute } from '@tanstack/react-router'
import { RegistrarEvaluacionPage } from '@/features/evaluaciones/registrar-evaluacion-page'
import { cargarTurnoVisible } from '@/features/turnos/cargar'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/evaluar/$alumno')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarEvaluacion, context.sesion.actual()),
  loader: ({ context, params }) =>
    cargarTurnoVisible(context.queryClient, context.sesion.actual(), params.id, params.alumno),
  component: RutaRegistrarEvaluacion,
})

function RutaRegistrarEvaluacion() {
  const { id, alumno } = Route.useParams()
  return <RegistrarEvaluacionPage id={Number(id)} codAlumno={alumno} />
}

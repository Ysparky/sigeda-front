import { createFileRoute } from '@tanstack/react-router'
import { cargarTurnoTeorico } from '@/features/turnos-teoricos/cargar'
import { ResultadosTurnoPage } from '@/features/turnos-teoricos/resultados-turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/teoria/turnos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.resultadosTurnoTeorico, context.sesion.actual()),
  loader: ({ context, params }) => cargarTurnoTeorico(context.queryClient, params.id),
  component: RutaResultados,
})

function RutaResultados() {
  const { id } = Route.useParams()
  return <ResultadosTurnoPage id={Number(id)} />
}

import { createFileRoute } from '@tanstack/react-router'
import { escenarioQuery } from '@/features/escenarios/api'
import { FormularioEscenario } from '@/features/escenarios/formulario-escenario'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/escenarios/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.escenarioEditar, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(escenarioQuery(Number(params.id))),
  component: RutaEditar,
})

function RutaEditar() {
  const escenario = Route.useLoaderData()
  return <FormularioEscenario escenario={escenario} />
}

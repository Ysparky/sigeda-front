import { createFileRoute } from '@tanstack/react-router'
import { simuladorQuery } from '@/features/simuladores/api'
import { FormularioSimulador } from '@/features/simuladores/formulario-simulador'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/simuladores/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.simuladorEditar, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(simuladorQuery(Number(params.id))),
  component: RutaEditar,
})

function RutaEditar() {
  const simulador = Route.useLoaderData()
  return <FormularioSimulador simulador={simulador} />
}

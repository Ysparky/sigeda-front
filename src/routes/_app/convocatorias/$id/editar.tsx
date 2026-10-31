import { createFileRoute } from '@tanstack/react-router'
import { convocatoriaQuery } from '@/features/convocatorias/api'
import { FormularioConvocatoria } from '@/features/convocatorias/formulario-convocatoria'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/convocatorias/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.convocatoriaEditar, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(convocatoriaQuery(Number(params.id))),
  component: RutaEditar,
})

function RutaEditar() {
  const convocatoria = Route.useLoaderData()
  return <FormularioConvocatoria convocatoria={convocatoria} />
}

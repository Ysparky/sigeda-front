import { createFileRoute } from '@tanstack/react-router'
import { consultasManiobras } from '@/features/maniobras/api'
import { cargarManiobraVisible } from '@/features/maniobras/cargar'
import { ParametrosPage } from '@/features/maniobras/parametros-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/parametros')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.parametros, context.sesion.actual()),
  loader: async ({ context, params }) => {
    const maniobra = await cargarManiobraVisible(context.queryClient, params.id)
    await context.queryClient.ensureQueryData(consultasManiobras.parametros(maniobra.id))
    return maniobra
  },
  component: RutaParametros,
})

function RutaParametros() {
  const { id } = Route.useParams()
  return <ParametrosPage id={Number(id)} />
}

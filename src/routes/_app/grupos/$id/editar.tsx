import { createFileRoute } from '@tanstack/react-router'
import { cargarGrupoVisible } from '@/features/grupos/cargar'
import { ModificarGrupoPage } from '@/features/grupos/modificar-grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarGrupo, context.sesion.actual()),
  loader: ({ context, params }) => cargarGrupoVisible(context.queryClient, params.id),
  component: RutaModificarGrupo,
})

function RutaModificarGrupo() {
  const { id } = Route.useParams()
  return <ModificarGrupoPage id={Number(id)} />
}

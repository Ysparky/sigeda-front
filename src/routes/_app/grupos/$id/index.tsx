import { createFileRoute } from '@tanstack/react-router'
import { GrupoPage } from '@/features/grupos/grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupo, context.sesion.actual()),
  component: RutaGrupo,
})

function RutaGrupo() {
  const { id } = Route.useParams()
  return <GrupoPage id={Number(id)} />
}

import { createFileRoute } from '@tanstack/react-router'
import { cargarFaseVisible } from '@/features/fases/cargar'
import { FasePage } from '@/features/fases/fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fase, context.sesion.actual()),
  loader: ({ context, params }) => cargarFaseVisible(context.queryClient, params.id),
  component: RutaFase,
})

function RutaFase() {
  const { id } = Route.useParams()
  return <FasePage id={Number(id)} />
}

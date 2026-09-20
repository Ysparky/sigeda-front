import { createFileRoute } from '@tanstack/react-router'
import { MateriasPage } from '@/features/materias/materias-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/materias')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.materias, context.sesion.actual()),
  component: MateriasPage,
})

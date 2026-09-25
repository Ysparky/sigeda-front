import { createFileRoute } from '@tanstack/react-router'
import { MisExamenesPage } from '@/features/examenes/mis-examenes-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/examenes/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misExamenes, context.sesion.actual()),
  component: MisExamenesPage,
})

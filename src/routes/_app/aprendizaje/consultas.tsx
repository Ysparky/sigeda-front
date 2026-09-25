import { createFileRoute } from '@tanstack/react-router'
import { ConsultasPage } from '@/features/aprendizaje/consultas-page'
import { esquemaBusquedaConsultas } from '@/features/aprendizaje/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/aprendizaje/consultas')({
  validateSearch: esquemaBusquedaConsultas,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.consultas, context.sesion.actual()),
  component: ConsultasPage,
})

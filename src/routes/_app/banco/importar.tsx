import { createFileRoute } from '@tanstack/react-router'
import { ImportarPreguntasPage } from '@/features/preguntas/importar-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/banco/importar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.importarPreguntas, context.sesion.actual()),
  component: ImportarPreguntasPage,
})

import { createFileRoute } from '@tanstack/react-router'
import { DocumentosPage } from '@/features/aprendizaje/documentos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/aprendizaje/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.documentos, context.sesion.actual()),
  component: DocumentosPage,
})

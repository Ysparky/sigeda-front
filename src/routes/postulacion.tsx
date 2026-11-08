import { createFileRoute } from '@tanstack/react-router'
import { ConsultaPage } from '@/features/inscripcion/consulta-page'

export const Route = createFileRoute('/postulacion')({
  component: ConsultaPage,
})

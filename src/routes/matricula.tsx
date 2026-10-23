import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { MatriculaPage } from '@/features/inscripcion/matricula-page'

const busqueda = z.object({ curso: z.number().optional().catch(undefined) })

export const Route = createFileRoute('/matricula')({
  validateSearch: busqueda,
  component: MatriculaPage,
})

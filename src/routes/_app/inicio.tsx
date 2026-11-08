import { createFileRoute } from '@tanstack/react-router'
import { consultasAula } from '@/features/aula/api'
import { MiCohortePage } from '@/features/aula/mi-cohorte-page'
import { MiCursoPage } from '@/features/aula/mi-curso-page'
import { InicioPage } from '@/features/inicio/inicio-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

type Aula = { tipo: 'curso'; codAlumno: string } | { tipo: 'cohorte' } | { tipo: 'general' }

export const Route = createFileRoute('/_app/inicio')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.inicio, context.sesion.actual()),
  loader: async ({ context }): Promise<Aula> => {
    const actual = context.sesion.actual()
    try {
      if (actual?.rol.nombre === 'Alumno' && actual.codPersona) {
        await context.queryClient.ensureQueryData(consultasAula.curso(actual.codPersona))
        return { tipo: 'curso', codAlumno: actual.codPersona }
      }
      if (actual?.rol.nombre === 'Instructor') {
        await context.queryClient.ensureQueryData(consultasAula.cohorte())
        return { tipo: 'cohorte' }
      }
    } catch {
      return { tipo: 'general' }
    }
    return { tipo: 'general' }
  },
  component: RutaInicio,
})

function RutaInicio() {
  const aula = Route.useLoaderData()
  if (aula.tipo === 'curso') return <MiCursoPage codAlumno={aula.codAlumno} />
  if (aula.tipo === 'cohorte') return <MiCohortePage />
  return <InicioPage />
}

import { getRouteApi } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { useSesion } from '@/lib/auth/use-sesion'
import { FiltrosEvaluaciones } from './components/filtros-evaluaciones'
import { TablaEvaluaciones } from './components/tabla-evaluaciones'
import type { FiltrosDeEvaluacion } from './schemas'

const ruta = getRouteApi('/_app/mis-evaluaciones')

export function MisEvaluacionesPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const codPersona = useSesion()?.codPersona ?? ''

  function cambiar(cambios: Partial<FiltrosDeEvaluacion>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  return (
    <>
      <PageHeader titulo="Mis evaluaciones" descripcion="Sus evaluaciones prácticas y su clasificación." />
      {codPersona === '' ? (
        <EmptyState titulo="Su usuario no tiene una persona asociada" descripcion="Consulte con el administrador." />
      ) : (
        <>
          <FiltrosEvaluaciones filtros={busqueda} alCambiar={cambiar} />
          <TablaEvaluaciones
            codPersona={codPersona}
            filtros={busqueda}
            alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
            conAlumno={false}
          />
        </>
      )}
    </>
  )
}

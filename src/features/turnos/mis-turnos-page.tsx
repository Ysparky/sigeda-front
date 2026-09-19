import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { useSesion } from '@/lib/auth/use-sesion'
import { consultasTurnos } from './api'
import { COLUMNAS_MIS_TURNOS } from './columnas'

const ruta = getRouteApi('/_app/mis-turnos')

export function MisTurnosPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const codPersona = useSesion()?.codPersona ?? ''
  const turnos = useQuery({ ...consultasTurnos.delAlumno(codPersona, busqueda), enabled: codPersona !== '' })

  return (
    <>
      <PageHeader titulo="Mis turnos" descripcion="Sus turnos de vuelo programados." />
      {codPersona === '' ? (
        <EmptyState titulo="Su usuario no tiene una persona asociada" descripcion="Consulte con el administrador." />
      ) : (
        <DataTable
          etiqueta="Mis turnos"
          columnas={COLUMNAS_MIS_TURNOS}
          pagina={turnos.data}
          cargando={turnos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(turno) => String(turno.id)}
          vacio={<EmptyState titulo="No tiene turnos programados" descripcion="Aquí aparecerán sus próximos vuelos." />}
        />
      )}
    </>
  )
}

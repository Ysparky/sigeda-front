import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_ALERTAS_SIN_SERVIDOR, TEXTO_SIN_ALERTAS } from '@/lib/dominio/seguimiento'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento } from './api'
import { columnasAlertas } from './columnas-alertas'
import { FiltrosAlertas } from './components/filtros-alertas'
import type { BusquedaAlertas } from './schemas'

const ruta = getRouteApi('/_app/seguimiento/alertas')

export function AlertasPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const alertas = useQuery(consultasSeguimiento.alertas(busqueda))
  const error = errorDePrimeraCarga(alertas)

  function cambiar(cambios: Partial<BusquedaAlertas>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  return (
    <div className="grid gap-4">
      <PageHeader titulo={PANTALLAS.alertas.titulo} descripcion={PANTALLAS.alertas.descripcion} />
      <AvisoDeDependencia accion="verAlertas" texto={TEXTO_ALERTAS_SIN_SERVIDOR} />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void alertas.refetch()} />
      ) : (
        <>
          <FiltrosAlertas busqueda={busqueda} alCambiar={cambiar} />
          <DataTable
            etiqueta="Alertas del escuadrón"
            columnas={columnasAlertas()}
            pagina={alertas.data}
            cargando={alertas.isFetching}
            parametros={busqueda}
            alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
            idDeFila={(alerta) => alerta.id}
            vacio={<EmptyState titulo="No hay alertas" descripcion={TEXTO_SIN_ALERTAS} />}
          />
        </>
      )}
    </div>
  )
}

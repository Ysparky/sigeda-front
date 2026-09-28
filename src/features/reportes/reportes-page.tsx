import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { format } from 'date-fns'
import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { hoyIso } from '@/lib/dominio/calendario'
import { accionDisponible } from '@/lib/dependencias'
import {
  TEXTO_DESEMPATE,
  TEXTO_ORDEN_MERITO_SIN_NFPI,
  TEXTO_ORDEN_MERITO_SIN_SERVIDOR,
  TEXTO_SIN_ALUMNOS_CON_INDICES,
  textoOrdenDeMeritoConsultado,
} from '@/lib/dominio/seguimiento'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import type { BusquedaReportes } from '@/features/seguimiento/schemas'
import { consultasReportes } from './api'
import { COLUMNAS_MERITO } from './columnas'
import { FiltrosReportes } from './components/filtros-reportes'

const ruta = getRouteApi('/_app/reportes')

export function ReportesPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const disponible = accionDisponible('verOrdenMerito')
  const merito = useQuery({ ...consultasReportes.ordenDeMerito(busqueda), enabled: disponible })
  const error = errorDePrimeraCarga(merito)

  function cambiar(cambios: Partial<BusquedaReportes>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const consultadoEn = new Date(merito.dataUpdatedAt)
  const sello = textoOrdenDeMeritoConsultado(formatearFecha(hoyIso(consultadoEn)), format(consultadoEn, 'HH:mm'))

  return (
    <div className="grid gap-4">
      <PageHeader titulo={PANTALLAS.reportes.titulo} descripcion={PANTALLAS.reportes.descripcion} />
      <AvisoDeDependencia accion="verOrdenMerito" texto={TEXTO_ORDEN_MERITO_SIN_NFPI} />
      <AvisoDeDependencia accion="verOrdenMerito" texto={TEXTO_ORDEN_MERITO_SIN_SERVIDOR} />
      {disponible && error !== null && <AvisoDeError error={error} alReintentar={() => void merito.refetch()} />}
      {disponible && error === null && (
        <>
          <FiltrosReportes busqueda={busqueda} alCambiar={cambiar} />
          <div className="grid gap-1 text-sm text-muted-foreground">
            <p>{sello}</p>
            <p>{TEXTO_DESEMPATE}</p>
          </div>
          <DataTable
            etiqueta="Orden de mérito"
            columnas={COLUMNAS_MERITO}
            pagina={merito.data}
            cargando={merito.isFetching}
            parametros={busqueda}
            alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
            idDeFila={(fila) => fila.codigo}
            vacio={<EmptyState titulo="Sin alumnos con índices" descripcion={TEXTO_SIN_ALUMNOS_CON_INDICES} />}
          />
        </>
      )}
    </div>
  )
}

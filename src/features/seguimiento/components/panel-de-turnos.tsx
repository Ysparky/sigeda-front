import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { consultasTurnos, type TurnoResumen } from '@/features/turnos/api'
import type { ParametrosPagina } from '@/lib/api/pagina'
import { TEXTO_SIN_TURNOS_DEL_ALUMNO, TEXTO_TURNO_SIN_CANTIDAD } from '@/lib/dominio/seguimiento'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import type { BusquedaLegajo } from '../schemas'
import { Panel } from './panel'

const ruta = getRouteApi('/_app/seguimiento/$alumno')

const ayudante = ayudanteDeColumnas<TurnoResumen>()

const columnas = ayudante.columns([
  ayudante.accessor('nombre', { header: 'Turno' }),
  ayudante.accessor('subfase', { header: 'Sub fase' }),
  ayudante.accessor('programa', { header: 'Programa' }),
  ayudante.accessor('fechaEval', {
    header: 'Fecha',
    cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
  }),
])

type Props = { codAlumno: string; busqueda: BusquedaLegajo }

export function PanelDeTurnos({ codAlumno, busqueda }: Props) {
  const navegar = ruta.useNavigate()
  const parametros: ParametrosPagina = { page: busqueda.pageTurnos, size: busqueda.sizeTurnos, direction: 'ASC' }
  const turnos = useQuery(consultasTurnos.delAlumno(codAlumno, parametros))
  const error = errorDePrimeraCarga(turnos)
  const primeraCarga = turnos.data === undefined && error === null

  function cambiarPagina(cambios: Partial<ParametrosPagina>) {
    void navegar({
      search: (previa) => ({
        ...previa,
        pageTurnos: cambios.page ?? previa.pageTurnos,
        sizeTurnos: cambios.size ?? previa.sizeTurnos,
      }),
    })
  }

  return (
    <Panel
      titulo="Turnos realizados"
      error={error}
      alReintentar={() => void turnos.refetch()}
      cargando={primeraCarga}
    >
      <div className="grid gap-3">
        <DataTable
          etiqueta="Turnos del alumno"
          columnas={columnas}
          pagina={turnos.data}
          cargando={turnos.isFetching}
          parametros={parametros}
          alCambiar={cambiarPagina}
          idDeFila={(turno) => String(turno.id)}
          vacio={<EmptyState titulo="No hay turnos" descripcion={TEXTO_SIN_TURNOS_DEL_ALUMNO} />}
        />
        {turnos.data && turnos.data.items.length > 0 && (
          <p className="text-sm text-muted-foreground">{TEXTO_TURNO_SIN_CANTIDAD}</p>
        )}
      </div>
    </Panel>
  )
}

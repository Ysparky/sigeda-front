import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import type { ParametrosPagina } from '@/lib/api/pagina'
import { accionDisponible } from '@/lib/dependencias'
import {
  TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR,
  TEXTO_PREVALECE_LA_PRIMERA_NOTA,
  TEXTO_SIN_EXAMENES_DEL_ALUMNO,
  TEXTO_SIN_SEGUNDA_NOTA,
} from '@/lib/dominio/seguimiento'
import { etiquetaDeTipoExamen, textoConMinimo } from '@/lib/dominio/teoria'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento, type ExamenDelHistorial } from '../api'
import type { BusquedaLegajo } from '../schemas'
import { Panel } from './panel'

const ruta = getRouteApi('/_app/seguimiento/$alumno')

const PROPIEDAD_HISTORIAL = 'fechaExamen'

function ResultadoDeExamen({ fila }: { fila: ExamenDelHistorial }) {
  const segunda =
    fila.subsanadoPor && fila.subsanadoPor.nota !== null
      ? `Subsanada con ${formatearNota(fila.subsanadoPor.nota)}`
      : TEXTO_SIN_SEGUNDA_NOTA
  return (
    <div className="grid gap-0.5">
      {fila.aprobado === null ? (
        '—'
      ) : (
        <StatusBadge vocabulario="examen" valor={fila.aprobado ? 'aprobado' : 'desaprobado'} />
      )}
      {fila.aprobado === false && (
        <span className="block max-w-[14rem] truncate text-xs text-muted-foreground" title={segunda}>
          {segunda}
        </span>
      )}
    </div>
  )
}

const ayudante = ayudanteDeColumnas<ExamenDelHistorial>()

const columnas = ayudante.columns([
  ayudante.accessor('materia', {
    header: 'Materia',
    cell: (contexto) => {
      const fila = contexto.row.original
      return (
        <div className="grid gap-0.5">
          <span className="block max-w-[14rem] truncate" title={fila.materia}>
            {fila.materia}
          </span>
          {fila.idTurnoOrigen !== null && (
            <span
              className="block max-w-[14rem] truncate text-xs text-muted-foreground"
              title={fila.turnoOrigen ?? ''}
            >
              {`Origen: ${fila.turnoOrigen}`}
            </span>
          )}
        </div>
      )
    },
  }),
  ayudante.accessor('tipoExamen', {
    header: 'Tipo de examen',
    cell: (contexto) => etiquetaDeTipoExamen(contexto.getValue()),
  }),
  ayudante.accessor(PROPIEDAD_HISTORIAL, {
    header: 'Fecha',
    cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
  }),
  ayudante.accessor('nota', {
    header: 'Nota',
    cell: (contexto) => {
      const fila = contexto.row.original
      return (
        <div className="grid gap-1">
          <span className="tabular-nums">{textoConMinimo(fila.nota, fila.notaMinimaAplicada)}</span>
          {fila.subsanadoPor !== null && fila.tipoExamen !== 'SUBSANACION' && (
            <StatusBadge vocabulario="notaDelPromedio" valor="cuenta" />
          )}
          {fila.tipoExamen === 'SUBSANACION' && fila.idTurnoOrigen !== null && (
            <StatusBadge vocabulario="notaDelPromedio" valor="noCuenta" />
          )}
        </div>
      )
    },
  }),
  ayudante.display({
    id: 'resultado',
    header: 'Resultado',
    cell: (contexto) => <ResultadoDeExamen fila={contexto.row.original} />,
  }),
])

type Props = { codAlumno: string; busqueda: BusquedaLegajo }

export function PanelDeHistorialTeorico({ codAlumno, busqueda }: Props) {
  const navegar = ruta.useNavigate()
  const disponible = accionDisponible('verHistorialTeorico')
  const parametros: ParametrosPagina = {
    page: busqueda.page,
    size: busqueda.size,
    property: PROPIEDAD_HISTORIAL,
    direction: 'DESC',
  }
  const historial = useQuery({
    ...consultasSeguimiento.historialTeorico(codAlumno, parametros),
    enabled: disponible,
  })
  const error = errorDePrimeraCarga(historial)
  const cargando = disponible && historial.data === undefined && error === null

  function cambiarPagina(cambios: Partial<ParametrosPagina>) {
    void navegar({
      search: (previa) => ({
        ...previa,
        page: cambios.page ?? previa.page,
        size: cambios.size ?? previa.size,
      }),
    })
  }

  return (
    <Panel
      titulo="Historial de exámenes"
      error={error}
      alReintentar={() => void historial.refetch()}
      cargando={cargando}
    >
      {!disponible ? (
        <p className="text-sm text-muted-foreground">{TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR}</p>
      ) : (
        <div className="grid gap-3">
          {historial.data && historial.data.items.length > 0 && (
            <p className="text-sm text-muted-foreground">{TEXTO_PREVALECE_LA_PRIMERA_NOTA}</p>
          )}
          <DataTable
            etiqueta="Exámenes del alumno"
            columnas={columnas}
            pagina={historial.data}
            cargando={historial.isFetching}
            parametros={parametros}
            alCambiar={cambiarPagina}
            idDeFila={(fila) => String(fila.id)}
            vacio={<EmptyState titulo="No hay exámenes" descripcion={TEXTO_SIN_EXAMENES_DEL_ALUMNO} />}
          />
        </div>
      )}
    </Panel>
  )
}

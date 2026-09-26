import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { DataTable } from '@/components/data-table'
import { Enlace } from '@/components/enlace'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasCatalogos } from '@/features/catalogos/api'
import { consultasEvaluaciones, type EvaluacionResumen } from '@/features/evaluaciones/api'
import { CLASIFICACIONES_FILTRO } from '@/features/evaluaciones/schemas'
import type { ParametrosPagina } from '@/lib/api/pagina'
import { TEXTO_EVALUADOR_SIN_CODIGO, TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE } from '@/lib/dominio/seguimiento'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import type { BusquedaLegajo } from '../schemas'
import { Panel } from './panel'

const ruta = getRouteApi('/_app/seguimiento/$alumno')

const ayudante = ayudanteDeColumnas<EvaluacionResumen>()

const columnas = ayudante.columns([
  ayudante.accessor('codigo', {
    header: 'Código',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/evaluaciones/$cod" params={{ cod: contexto.getValue() }} className="font-mono text-xs">
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('nombre', {
    header: 'Nombre',
    cell: (contexto) => (
      <span className="block max-w-[14rem] truncate" title={contexto.getValue()}>
        {contexto.getValue()}
      </span>
    ),
  }),
  ayudante.accessor('fase', { header: 'Fase' }),
  ayudante.accessor('evaluador', { header: 'Evaluador' }),
  ayudante.accessor('fecha', {
    header: 'Fecha',
    enableSorting: true,
    cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
  }),
  ayudante.accessor('promedio', {
    header: 'Promedio',
    cell: (contexto) => <span className="tabular-nums">{formatearNota(contexto.getValue())}</span>,
  }),
  ayudante.accessor('clasificacion', {
    header: 'Clasificación',
    cell: (contexto) => {
      const valor = contexto.getValue()
      return valor ? <StatusBadge vocabulario="clasificacion" valor={valor} /> : '—'
    },
  }),
])

type Props = { codAlumno: string; busqueda: BusquedaLegajo }

export function HistorialPractico({ codAlumno, busqueda }: Props) {
  const navegar = ruta.useNavigate()
  const subfases = useQuery(consultasCatalogos.subfases())
  const evaluaciones = useQuery(
    consultasEvaluaciones.lista(codAlumno, {
      programa: 'PDI',
      idSubfase: busqueda.idSubfase,
      clasificacion: busqueda.clasificacion,
      page: busqueda.page,
      size: busqueda.size,
      property: busqueda.property,
      direction: busqueda.direction,
    }),
  )
  const error = errorDePrimeraCarga(evaluaciones)
  const primeraCarga = evaluaciones.data === undefined && error === null

  function cambiarFiltro(cambios: Partial<Pick<BusquedaLegajo, 'idSubfase' | 'clasificacion'>>) {
    void navegar({ search: (previa) => ({ ...previa, ...cambios, page: 0 }) })
  }

  function cambiarPagina(cambios: Partial<ParametrosPagina>) {
    void navegar({
      search: (previa) => ({
        ...previa,
        page: cambios.page ?? previa.page,
        size: cambios.size ?? previa.size,
        property: cambios.property ?? previa.property,
        direction: cambios.direction ?? previa.direction,
      }),
    })
  }

  return (
    <Panel
      titulo="Historial de evaluaciones"
      error={error}
      alReintentar={() => void evaluaciones.refetch()}
      cargando={primeraCarga}
    >
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="legajo-subfase">Sub fase</FieldLabel>
            <NativeSelect
              id="legajo-subfase"
              className="w-full"
              value={busqueda.idSubfase ?? ''}
              onChange={(evento) =>
                cambiarFiltro({ idSubfase: evento.target.value === '' ? undefined : Number(evento.target.value) })
              }
            >
              <NativeSelectOption value="">Todas</NativeSelectOption>
              {(subfases.data ?? []).map((subfase) => (
                <NativeSelectOption key={subfase.id} value={subfase.id}>
                  {subfase.nombre}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {errorDePrimeraCarga(subfases) !== null && <FieldError>No se pudieron cargar las sub fases.</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="legajo-clasificacion">Clasificación</FieldLabel>
            <NativeSelect
              id="legajo-clasificacion"
              className="w-full"
              value={busqueda.clasificacion ?? ''}
              onChange={(evento) =>
                cambiarFiltro({ clasificacion: CLASIFICACIONES_FILTRO.find((valor) => valor === evento.target.value) })
              }
            >
              <NativeSelectOption value="">Todas</NativeSelectOption>
              {CLASIFICACIONES_FILTRO.map((valor) => (
                <NativeSelectOption key={valor} value={valor}>
                  {valor}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <DataTable
          etiqueta="Historial de evaluaciones"
          columnas={columnas}
          pagina={evaluaciones.data}
          cargando={evaluaciones.isFetching}
          parametros={{
            page: busqueda.page,
            size: busqueda.size,
            property: busqueda.property,
            direction: busqueda.direction,
          }}
          alCambiar={cambiarPagina}
          idDeFila={(evaluacion) => evaluacion.codigo}
          vacio={<EmptyState titulo="No hay evaluaciones" descripcion={TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE} />}
        />
        <p className="text-sm text-muted-foreground">{TEXTO_EVALUADOR_SIN_CODIGO}</p>
      </div>
    </Panel>
  )
}

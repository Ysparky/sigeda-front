import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import type { ParametrosPagina } from '@/lib/api/pagina'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { consultasEvaluaciones, type EvaluacionResumen } from '../api'
import type { FiltrosDeEvaluacion } from '../schemas'

const ayudante = ayudanteDeColumnas<EvaluacionResumen>()

type Props = {
  codPersona: string
  filtros: FiltrosDeEvaluacion
  alCambiar: (cambios: Partial<ParametrosPagina>) => void
  conAlumno: boolean
  ultima?: string | null
  puedeModificar?: boolean
}

export function TablaEvaluaciones({ codPersona, filtros, alCambiar, conAlumno, ultima = null, puedeModificar = false }: Props) {
  const evaluaciones = useQuery(consultasEvaluaciones.lista(codPersona, filtros))
  const columnas = useMemo(
    () =>
      ayudante.columns([
        ayudante.accessor('codigo', {
          header: 'Código',
          enableSorting: true,
          cell: (contexto) => (
            <Enlace to="/evaluaciones/$cod" params={{ cod: contexto.getValue() }} className="font-mono text-xs">
              {contexto.getValue()}
            </Enlace>
          ),
        }),
        ayudante.accessor('nombre', { header: 'Nombre' }),
        ayudante.accessor('fase', { header: 'Fase' }),
        ayudante.accessor('evaluador', { header: 'Evaluador' }),
        ayudante.accessor('fecha', {
          header: 'Fecha',
          enableSorting: true,
          cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
        }),
        ...(conAlumno ? [ayudante.accessor('alumno', { header: 'Alumno' })] : []),
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
        ...(puedeModificar
          ? [
              ayudante.display({
                id: 'acciones',
                header: 'Acciones',
                cell: (contexto) =>
                  contexto.row.original.codigo === ultima ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/evaluaciones/$cod/editar" params={{ cod: contexto.row.original.codigo }}>
                        Modificar
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Solo la última se modifica</span>
                  ),
              }),
            ]
          : []),
      ]),
    [conAlumno, puedeModificar, ultima],
  )

  if (evaluaciones.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {evaluaciones.error instanceof ApiError ? evaluaciones.error.message : MENSAJE_GENERICO}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <DataTable
      etiqueta="Evaluaciones"
      columnas={columnas}
      pagina={evaluaciones.data}
      cargando={evaluaciones.isFetching}
      parametros={filtros}
      alCambiar={alCambiar}
      idDeFila={(evaluacion) => evaluacion.codigo}
      vacio={<EmptyState titulo="No hay evaluaciones" descripcion="Ninguna evaluación coincide con los filtros." />}
    />
  )
}

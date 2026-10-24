import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorDePrimeraCarga } from '@/lib/query'
import { reporteQuery } from './api'

const ruta = getRouteApi('/_app/asistencias/')

export function ReporteAsistenciaPage() {
  const { grupo } = ruta.useSearch()
  const reporte = useQuery(reporteQuery(grupo))
  const error = errorDePrimeraCarga(reporte)

  return (
    <>
      <PageHeader
        titulo="Asistencia"
        descripcion="Inasistencia de vuelo por alumno. La condición EN RIESGO (> 30 %) es una alerta de lectura, no cambia el estado del alumno."
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void reporte.refetch()} />
      ) : reporte.data && reporte.data.length === 0 ? (
        <EmptyState titulo="Sin datos" descripcion="No hay asistencia registrada para este grupo." />
      ) : (
        <Table aria-label="Reporte de asistencia">
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead className="text-right">Sesiones</TableHead>
              <TableHead className="text-right">Faltas</TableHead>
              <TableHead className="text-right">% inasistencia</TableHead>
              <TableHead>Condición</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reporte.data ?? []).map((fila) => {
              const enRiesgo = fila.condicion === 'EN_RIESGO'
              return (
                <TableRow key={fila.codAlumno} data-riesgo={enRiesgo || undefined}>
                  <TableCell className="font-medium">{fila.nombre}</TableCell>
                  <TableCell className="text-right">{fila.sesiones}</TableCell>
                  <TableCell className="text-right">{fila.faltas}</TableCell>
                  <TableCell className="text-right">{fila.porcentajeInasistencia}%</TableCell>
                  <TableCell>
                    <Badge variant={enRiesgo ? 'destructive' : 'secondary'}>
                      {enRiesgo ? 'En riesgo' : 'Regular'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </>
  )
}

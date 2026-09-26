import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from '@/components/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

type Props = { codAlumno: string; busqueda: BusquedaLegajo }

function ResultadoDeExamen({ fila }: { fila: ExamenDelHistorial }) {
  return (
    <div className="grid gap-0.5">
      {fila.aprobado === null ? (
        '—'
      ) : (
        <StatusBadge vocabulario="examen" valor={fila.aprobado ? 'aprobado' : 'desaprobado'} />
      )}
      {fila.aprobado === false && (
        <span className="block max-w-[14rem] truncate text-xs text-muted-foreground">
          {fila.subsanadoPor && fila.subsanadoPor.nota !== null
            ? `Subsanada con ${formatearNota(fila.subsanadoPor.nota)}`
            : TEXTO_SIN_SEGUNDA_NOTA}
        </span>
      )}
    </div>
  )
}

export function PanelDeHistorialTeorico({ codAlumno, busqueda }: Props) {
  const disponible = accionDisponible('verHistorialTeorico')
  const historial = useQuery({
    ...consultasSeguimiento.historialTeorico(codAlumno, { page: busqueda.page, size: busqueda.size, direction: 'DESC' }),
    enabled: disponible,
  })
  const error = errorDePrimeraCarga(historial)
  const cargando = disponible && historial.data === undefined && error === null

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
        historial.data &&
        (historial.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{TEXTO_SIN_EXAMENES_DEL_ALUMNO}</p>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">{TEXTO_PREVALECE_LA_PRIMERA_NOTA}</p>
            <Table aria-label="Exámenes del alumno">
              <TableHeader>
                <TableRow>
                  <TableHead>Materia</TableHead>
                  <TableHead>Tipo de examen</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.data.items.map((fila) => (
                  <TableRow key={fila.id}>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <span className="block max-w-[14rem] truncate" title={fila.materia}>
                          {fila.materia}
                        </span>
                        {fila.idTurnoOrigen !== null && (
                          <span className="block max-w-[14rem] truncate text-xs text-muted-foreground" title={fila.turnoOrigen ?? ''}>
                            {`Origen: ${fila.turnoOrigen}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{etiquetaDeTipoExamen(fila.tipoExamen)}</TableCell>
                    <TableCell className="tabular-nums">{formatearFecha(fila.fechaExamen)}</TableCell>
                    <TableCell className="tabular-nums">{textoConMinimo(fila.nota, fila.notaMinimaAplicada)}</TableCell>
                    <TableCell>
                      <ResultadoDeExamen fila={fila} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </Panel>
  )
}

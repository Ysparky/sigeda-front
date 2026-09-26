import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultasTurnos } from '@/features/turnos/api'
import { TEXTO_SIN_TURNOS_DEL_ALUMNO, TEXTO_TURNO_SIN_CANTIDAD } from '@/lib/dominio/seguimiento'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { Panel } from './panel'

type Props = { codAlumno: string }

export function PanelDeTurnos({ codAlumno }: Props) {
  const turnos = useQuery(consultasTurnos.delAlumno(codAlumno, { page: 0, size: 10, direction: 'ASC' }))
  const error = errorDePrimeraCarga(turnos)
  const cargando = turnos.data === undefined && error === null

  return (
    <Panel titulo="Turnos realizados" error={error} alReintentar={() => void turnos.refetch()} cargando={cargando}>
      {turnos.data &&
        (turnos.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{TEXTO_SIN_TURNOS_DEL_ALUMNO}</p>
        ) : (
          <div className="grid gap-3">
            <Table aria-label="Turnos del alumno">
              <TableHeader>
                <TableRow>
                  <TableHead>Turno</TableHead>
                  <TableHead>Sub fase</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnos.data.items.map((turno) => (
                  <TableRow key={turno.id}>
                    <TableCell>{turno.nombre}</TableCell>
                    <TableCell>{turno.subfase}</TableCell>
                    <TableCell>{turno.programa}</TableCell>
                    <TableCell className="tabular-nums">{formatearFecha(turno.fechaEval)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-sm text-muted-foreground">{TEXTO_TURNO_SIN_CANTIDAD}</p>
          </div>
        ))}
    </Panel>
  )
}

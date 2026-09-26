import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  TEXTO_MEDIA_SIMPLE_SUBFASE,
  TEXTO_SIN_PROMEDIOS_PONDERADOS,
  TEXTO_SIN_SUBFASE_ELEGIDA,
  mediaSimple,
} from '@/lib/dominio/seguimiento'
import { formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento } from '../api'
import { Panel } from './panel'

type Props = { codAlumno: string; idSubfase: number | undefined }

export function PanelDePromedios({ codAlumno, idSubfase }: Props) {
  const elegida = (idSubfase ?? 0) > 0
  const promedios = useQuery(consultasSeguimiento.promediosDeSubfase(idSubfase ?? 0, codAlumno))
  const error = errorDePrimeraCarga(promedios)
  const cargando = elegida && promedios.data === undefined && error === null
  const filas = promedios.data ?? []
  const valores = filas.flatMap((fila) => (fila.promedio === null ? [] : [fila.promedio]))
  const media = mediaSimple(valores)

  return (
    <Panel
      titulo="Promedios de la sub fase"
      error={error}
      alReintentar={() => void promedios.refetch()}
      cargando={cargando}
    >
      {!elegida ? (
        <p className="text-sm text-muted-foreground">{TEXTO_SIN_SUBFASE_ELEGIDA}</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{TEXTO_SIN_PROMEDIOS_PONDERADOS}</p>
      ) : (
        <div className="grid gap-4">
          <Table aria-label="Promedios de la sub fase">
            <TableHeader>
              <TableRow>
                <TableHead>Evaluación</TableHead>
                <TableHead>Promedio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <TableRow key={fila.codigo}>
                  <TableCell>{fila.codigo}</TableCell>
                  <TableCell className="tabular-nums">{formatearNota(fila.promedio)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm">
            <span className="font-medium tabular-nums">{formatearNota(media)}</span>{' '}
            <span className="text-muted-foreground">{TEXTO_MEDIA_SIMPLE_SUBFASE}</span>
          </p>
        </div>
      )}
    </Panel>
  )
}

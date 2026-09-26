import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE, TEXTO_SIN_SUBFASE_ELEGIDA } from '@/lib/dominio/seguimiento'
import { formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento } from '../api'
import { Panel } from './panel'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

type Props = { codAlumno: string; idSubfase: number | undefined }

export function PanelDeSubfase({ codAlumno, idSubfase }: Props) {
  const elegida = (idSubfase ?? 0) > 0
  const reporte = useQuery(consultasSeguimiento.reporteDeSubfase(idSubfase ?? 0, codAlumno))
  const error = errorDePrimeraCarga(reporte)
  const cargando = elegida && reporte.data === undefined && error === null
  const datos = reporte.data

  return (
    <Panel titulo="Reporte de sub fase" error={error} alReintentar={() => void reporte.refetch()} cargando={cargando}>
      {!elegida ? (
        <p className="text-sm text-muted-foreground">{TEXTO_SIN_SUBFASE_ELEGIDA}</p>
      ) : datos === null ? (
        <p className="text-sm text-muted-foreground">{TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE}</p>
      ) : (
        datos && (
          <div className="grid gap-4">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Dato etiqueta="Fase">{datos.cabecera.fase}</Dato>
              <Dato etiqueta="Sub fase">{datos.cabecera.subFase}</Dato>
              <Dato etiqueta="Programa">{datos.cabecera.programa}</Dato>
              <Dato etiqueta="Alumno">{datos.cabecera.alumno}</Dato>
            </dl>
            <ul className="list-disc pl-5 text-sm">
              {datos.maniobras.map((maniobra) => (
                <li key={maniobra.id}>{maniobra.nombre}</li>
              ))}
            </ul>
            <div className="grid gap-4">
              {datos.notas.map((nota) => {
                const maniobraAlineada = datos.maniobras.length === nota.calificaciones.length
                return (
                  <article
                    key={nota.codigo}
                    aria-label={nota.codigo}
                    className="grid gap-2 border-t pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Enlace to="/evaluaciones/$cod" params={{ cod: nota.codigo }} className="font-mono text-xs">
                        {nota.codigo}
                      </Enlace>
                      <span className="text-sm">{nota.categoria}</span>
                      {nota.clasificacion ? (
                        <StatusBadge vocabulario="clasificacion" valor={nota.clasificacion} />
                      ) : (
                        '—'
                      )}
                      <span className="text-sm font-medium tabular-nums">{formatearNota(nota.promedio)}</span>
                    </div>
                    {nota.recomendacion && <p className="text-sm text-muted-foreground">{nota.recomendacion}</p>}
                    <Table aria-label={`Calificaciones de ${nota.codigo}`}>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Maniobra</TableHead>
                          <TableHead>Nota mínima</TableHead>
                          <TableHead>Nota</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nota.calificaciones.map((calificacion, indice) => (
                          <TableRow key={indice}>
                            <TableCell title={maniobraAlineada ? datos.maniobras[indice].nombre : undefined}>
                              {maniobraAlineada ? datos.maniobras[indice].id : indice + 1}
                            </TableCell>
                            <TableCell>{calificacion.notaMin}</TableCell>
                            <TableCell>{calificacion.nota}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </article>
                )
              })}
            </div>
          </div>
        )
      )}
    </Panel>
  )
}

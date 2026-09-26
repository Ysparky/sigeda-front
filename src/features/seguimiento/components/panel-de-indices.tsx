import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultasReportes } from '@/features/reportes/api'
import { accionDisponible } from '@/lib/dependencias'
import { TEXTO_INDICES_SIN_SERVIDOR, TEXTO_SIN_DATOS_SUFICIENTES, formulaDeIndice } from '@/lib/dominio/seguimiento'
import { formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { Panel } from './panel'

function Dato({ etiqueta, valor, ayuda }: { etiqueta: string; valor: number | null; ayuda?: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium tabular-nums">{valor === null ? TEXTO_SIN_DATOS_SUFICIENTES : formatearNota(valor)}</dd>
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  )
}

function NotaDeSubfase({ valor }: { valor: number | null }): ReactNode {
  return valor === null ? TEXTO_SIN_DATOS_SUFICIENTES : formatearNota(valor)
}

type Props = { codAlumno: string }

export function PanelDeIndices({ codAlumno }: Props) {
  const disponible = accionDisponible('verIndices')
  const indices = useQuery({ ...consultasReportes.indices(codAlumno), enabled: disponible })
  const error = errorDePrimeraCarga(indices)
  const cargando = disponible && indices.data === undefined && error === null

  return (
    <Panel titulo="Índices del PDI" error={error} alReintentar={() => void indices.refetch()} cargando={cargando}>
      {!disponible ? (
        <p className="text-sm text-muted-foreground">{TEXTO_INDICES_SIN_SERVIDOR}</p>
      ) : (
        indices.data && (
          <div className="grid gap-6">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Dato etiqueta="NFPI" valor={indices.data.nfpi} ayuda={formulaDeIndice('NFPI')} />
              <Dato etiqueta="NIT" valor={indices.data.nit.valor} ayuda={formulaDeIndice('NIT')} />
              <Dato etiqueta="NCT" valor={indices.data.nit.nct} ayuda={formulaDeIndice('NCT')} />
              <Dato etiqueta="NEI" valor={indices.data.nit.nei} ayuda={formulaDeIndice('NEI')} />
              <Dato etiqueta="NIA" valor={indices.data.nia.valor} ayuda={formulaDeIndice('NIA')} />
            </dl>
            <div className="grid gap-1 text-sm text-muted-foreground">
              <p>Sin coeficiente aplicado por falta de nota:</p>
              <ul className="list-disc pl-5">
                {indices.data.nit.asignaturasSinNota.map((materia) => (
                  <li key={materia}>{materia}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4">
              {indices.data.nia.fases.map((fase) => (
                <div key={fase.sigla} className="grid gap-3 border-t pt-4 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm text-muted-foreground">{fase.fase}</span>
                    <Dato etiqueta={fase.sigla} valor={fase.valor} />
                    <span className="text-sm tabular-nums text-muted-foreground">Peso {fase.peso.toFixed(2)}</span>
                  </div>
                  {fase.subfases.length > 0 && (
                    <Table aria-label={`Sub fases de ${fase.fase}`}>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sub fase</TableHead>
                          <TableHead>Sigla</TableHead>
                          <TableHead>Peso</TableHead>
                          <TableHead>NSF</TableHead>
                          <TableHead>Misiones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fase.subfases.map((subfase) => (
                          <TableRow key={subfase.idSubfase}>
                            <TableCell>{subfase.subfase}</TableCell>
                            <TableCell>{subfase.sigla}</TableCell>
                            <TableCell className="tabular-nums">{subfase.peso.toFixed(2)}</TableCell>
                            <TableCell className="tabular-nums">
                              <NotaDeSubfase valor={subfase.nsf} />
                            </TableCell>
                            <TableCell className="tabular-nums">{subfase.misiones}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
            {indices.data.nia.valor === null && indices.data.nia.motivo && (
              <p className="text-sm text-muted-foreground">{indices.data.nia.motivo}</p>
            )}
          </div>
        )
      )}
    </Panel>
  )
}

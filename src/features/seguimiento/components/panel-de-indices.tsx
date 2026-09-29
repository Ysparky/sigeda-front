import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultasReportes, type SubfaseDeIndices } from '@/features/reportes/api'
import { accionDisponible } from '@/lib/dependencias'
import {
  TEXTO_INDICES_SIN_SERVIDOR,
  TEXTO_MITAD_PRACTICA,
  TEXTO_MITAD_TEORICA,
  TEXTO_NFPI_SIN_NIA,
  TEXTO_NIA_CON_SALVEDAD,
  TEXTO_SIN_COEFICIENTE_APLICADO,
  TEXTO_SIN_DATOS_SUFICIENTES,
  etiquetaDePonderacion,
  formulaDeIndice,
  textoDeCobertura,
} from '@/lib/dominio/seguimiento'
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

/**
 * El NSF nunca sale solo: desde la tanda H puede ser el promedio simple de las misiones —cuando los
 * turnos no tienen misión asignada— y puede estar renormalizado sobre una sub fase a medio volar.
 * Mostrar el número sin decir cuál de las dos cosas es lo presentaría como la ponderación del PDI.
 */
function NotaDeSubfase({ subfase }: { subfase: SubfaseDeIndices }): ReactNode {
  if (subfase.nsf === null) return TEXTO_SIN_DATOS_SUFICIENTES
  const ponderacion = etiquetaDePonderacion(subfase.ponderacion)
  const cobertura = textoDeCobertura(subfase.cobertura)
  return (
    <div className="grid gap-1">
      <span>{formatearNota(subfase.nsf)}</span>
      {ponderacion && <span className="text-xs font-normal text-muted-foreground">{ponderacion}</span>}
      {cobertura && <span className="text-xs font-normal text-muted-foreground">{cobertura}</span>}
    </div>
  )
}

function MotivosDeSubfase({ subfases }: { subfases: SubfaseDeIndices[] }) {
  const conMotivo = subfases.filter((subfase) => subfase.motivo !== null)
  if (conMotivo.length === 0) return null
  return (
    <ul className="grid gap-1 pl-5 text-xs text-muted-foreground list-disc">
      {conMotivo.map((subfase) => (
        <li key={subfase.idSubfase}>
          {subfase.subfase}: {subfase.motivo}
        </li>
      ))}
    </ul>
  )
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
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato
                etiqueta="NFPI"
                valor={indices.data.nfpi}
                // Texto propio y NO el `nia.motivo`: ése ya se muestra en la mitad práctica, y
                // repetirlo dejaba la misma frase dos veces en el panel. Cada índice explica lo suyo.
                ayuda={indices.data.nfpi === null ? TEXTO_NFPI_SIN_NIA : formulaDeIndice('NFPI')}
              />
            </dl>
            <div className="grid gap-4 border-t pt-4">
              <h3 className="text-sm font-semibold">{TEXTO_MITAD_TEORICA}</h3>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Dato etiqueta="NIT" valor={indices.data.nit.valor} ayuda={formulaDeIndice('NIT')} />
                <Dato etiqueta="NCT" valor={indices.data.nit.nct} ayuda={formulaDeIndice('NCT')} />
                <Dato etiqueta="NEI" valor={indices.data.nit.nei} ayuda={formulaDeIndice('NEI')} />
              </dl>
              {indices.data.nit.asignaturasSinNota.length > 0 && (
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <p>{TEXTO_SIN_COEFICIENTE_APLICADO}</p>
                  <ul className="list-disc pl-5">
                    {indices.data.nit.asignaturasSinNota.map((materia) => (
                      <li key={materia}>{materia}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid gap-4 border-t pt-4">
              <h3 className="text-sm font-semibold">{TEXTO_MITAD_PRACTICA}</h3>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Dato etiqueta="NIA" valor={indices.data.nia.valor} ayuda={formulaDeIndice('NIA')} />
              </dl>
              <div className="grid gap-4">
                {indices.data.nia.fases.map((fase) => (
                  <div key={fase.sigla} className="grid gap-3 border-t pt-4 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-sm text-muted-foreground">{fase.fase}</span>
                      <Dato etiqueta={fase.sigla} valor={fase.valor} />
                      <span className="text-sm tabular-nums text-muted-foreground">Peso {fase.peso.toFixed(4)}</span>
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
                              <TableCell className="tabular-nums">{subfase.peso.toFixed(4)}</TableCell>
                              <TableCell className="tabular-nums">
                                <NotaDeSubfase subfase={subfase} />
                              </TableCell>
                              <TableCell className="tabular-nums">{subfase.misiones}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    <MotivosDeSubfase subfases={fase.subfases} />
                  </div>
                ))}
                </div>
              {/* El motivo ya no acompaña solo al hueco: cuando el NIA existe pero alguna sub fase se
                  ponderó uniforme, es el aviso de que esa nota no es la ponderación de la norma.
                  Mostrarlo solo con `valor === null` escondía justamente ese caso. */}
              {indices.data.nia.motivo && (
                <p className="text-sm text-muted-foreground">
                  {indices.data.nia.valor === null
                    ? indices.data.nia.motivo
                    : `${TEXTO_NIA_CON_SALVEDAD} ${indices.data.nia.motivo}`}
                </p>
              )}
            </div>
          </div>
        )
      )}
    </Panel>
  )
}

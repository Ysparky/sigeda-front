import { useQuery } from '@tanstack/react-query'
import { Enlace } from '@/components/enlace'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultasEvaluaciones } from '@/features/evaluaciones/api'
import { accionDisponible } from '@/lib/dependencias'
import {
  TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR,
  TEXTO_CHEQUEO_SIN_SERVIDOR,
  TEXTO_ESTADO_YA_CAMBIO,
  TEXTO_SIN_CHEQUEOS,
  ramasDeCriterio,
  textoCriterioCumplido,
  textoRegularAlternado,
} from '@/lib/dominio/seguimiento'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento } from '../api'
import { Panel } from './panel'

type Props = { codAlumno: string }

export function PanelDeChequeo({ codAlumno }: Props) {
  const disponible = accionDisponible('verCicloChequeo')
  const legajo = useQuery({ ...consultasSeguimiento.legajo(codAlumno), enabled: disponible })
  const chequeos = useQuery({ ...consultasSeguimiento.chequeos(codAlumno), enabled: disponible })
  const codUltima = legajo.data?.ultimaEvaluacion?.codigo
  const detalle = useQuery({
    ...consultasEvaluaciones.detalle(codUltima ?? ''),
    enabled: disponible && codUltima !== undefined,
  })
  const error = errorDePrimeraCarga(legajo, chequeos, detalle)
  const cargando = disponible && legajo.data === undefined && error === null

  return (
    <Panel
      titulo="Ciclo de chequeo"
      id="chequeo"
      error={error}
      alReintentar={() => {
        void legajo.refetch()
        void chequeos.refetch()
        void detalle.refetch()
      }}
      cargando={cargando}
    >
      {!disponible ? (
        <p className="text-sm text-muted-foreground">{TEXTO_CHEQUEO_SIN_SERVIDOR}</p>
      ) : (
        legajo.data && (
          <div className="grid gap-4">
            <dl className="flex flex-wrap gap-4 text-sm">
              <div>{`Chequeos: ${legajo.data.contadores.chequeo}`}</div>
              <div>{`Evaluaciones: ${legajo.data.contadores.evaluaciones}`}</div>
              <div>{`Malos: ${legajo.data.contadores.malos}`}</div>
              <div>{`Regulares: ${legajo.data.contadores.regulares}`}</div>
            </dl>
            <div className="grid gap-1 text-sm">
              <p className="font-medium">{`Criterio ${legajo.data.chequeo.criterio}`}</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {ramasDeCriterio(legajo.data.chequeo.criterio === 2 ? 2 : 1).map((rama) => (
                  <li key={rama}>{rama}</li>
                ))}
              </ul>
            </div>
            {legajo.data.chequeo.criterioCumplido && (
              <div className="grid gap-1 text-sm">
                <p>{textoCriterioCumplido(legajo.data.chequeo.fase, legajo.data.chequeo.detalle)}</p>
                <p className="text-muted-foreground">
                  {legajo.data.chequeo.cuentaConEsteEstado ? TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR : TEXTO_ESTADO_YA_CAMBIO}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{textoRegularAlternado(legajo.data.chequeo.regularAlternado)}</p>
            {detalle.data && (
              <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">Última evaluación</dt>
                  <dd>
                    <Enlace to="/evaluaciones/$cod" params={{ cod: detalle.data.codigo }} className="font-mono text-xs">
                      {detalle.data.codigo}
                    </Enlace>
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">Estado en esa evaluación</dt>
                  <dd>{detalle.data.estadoAlumno}</dd>
                </div>
                {detalle.data.codEvalPrevia !== null && (
                  <div className="flex items-center gap-2">
                    <dt className="text-muted-foreground">Evaluación previa</dt>
                    <dd>
                      <Enlace
                        to="/evaluaciones/$cod"
                        params={{ cod: detalle.data.codEvalPrevia }}
                        className="font-mono text-xs"
                      >
                        {detalle.data.codEvalPrevia}
                      </Enlace>
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {chequeos.data &&
              (chequeos.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">{TEXTO_SIN_CHEQUEOS}</p>
              ) : (
                <Table aria-label="Historial de chequeos">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Sub fase</TableHead>
                      <TableHead>Contadores</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chequeos.data.map((fila) => (
                      <TableRow key={fila.codigo}>
                        <TableCell className="tabular-nums">{formatearFecha(fila.fecha)}</TableCell>
                        <TableCell>{fila.tipo}</TableCell>
                        <TableCell>{fila.resultado}</TableCell>
                        <TableCell>{fila.subfase}</TableCell>
                        <TableCell>{`Chequeos: ${fila.contadores.chequeo} · Evaluaciones: ${fila.contadores.evaluaciones} · Malos: ${fila.contadores.malos} · Regulares: ${fila.contadores.regulares}`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ))}
          </div>
        )
      )}
    </Panel>
  )
}

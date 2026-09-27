import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from '@/components/status-badge'
import { accionDisponible } from '@/lib/dependencias'
import { TEXTO_ESTADO_TEORICO_SIN_SERVIDOR, TEXTO_SIN_CAUSALES, etiquetaDeCausal } from '@/lib/dominio/seguimiento'
import { textoConMinimo } from '@/lib/dominio/teoria'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento } from '../api'
import { Panel } from './panel'

type Props = { codAlumno: string }

export function PanelDeEstadoTeorico({ codAlumno }: Props) {
  const disponible = accionDisponible('verCausalesTeoricos')
  const estado = useQuery({ ...consultasSeguimiento.estadoTeoricoDe(codAlumno), enabled: disponible })
  const error = errorDePrimeraCarga(estado)
  const cargando = disponible && estado.data === undefined && error === null

  return (
    <Panel titulo="Estado teórico" error={error} alReintentar={() => void estado.refetch()} cargando={cargando}>
      {!disponible ? (
        <p className="text-sm text-muted-foreground">{TEXTO_ESTADO_TEORICO_SIN_SERVIDOR}</p>
      ) : (
        estado.data && (
          <div className="grid gap-4">
            {estado.data.bloqueadoPorSubsanacion && (
              <div className="grid gap-1">
                <StatusBadge vocabulario="subsanacion" valor="pendiente" />
                {estado.data.motivo && <p className="text-sm text-muted-foreground">{estado.data.motivo}</p>}
              </div>
            )}
            {estado.data.desaprobados.length > 0 && (
              <ul className="grid gap-1 text-sm">
                {estado.data.desaprobados.map((desaprobado) => (
                  <li key={desaprobado.idCuestionario}>
                    {`${desaprobado.materia} (${desaprobado.tipoExamen}): ${textoConMinimo(desaprobado.nota, desaprobado.notaMinimaAplicada)} · ${formatearFecha(desaprobado.fechaExamen)}`}
                  </li>
                ))}
              </ul>
            )}
            {(estado.data.causales ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{TEXTO_SIN_CAUSALES}</p>
            ) : (
              <ul className="grid gap-2">
                {(estado.data.causales ?? []).map((causal, indice) => (
                  <li
                    key={`${causal.codigo}-${causal.idMateria ?? indice}`}
                    className="grid gap-1 border-t pt-2 first:border-t-0 first:pt-0"
                  >
                    <span className="font-medium">{etiquetaDeCausal(causal.codigo)}</span>
                    {causal.materia && <span className="text-sm">{causal.materia}</span>}
                    {causal.grupo && <span className="text-sm text-muted-foreground">{causal.grupo.join(' · ')}</span>}
                    <span className="text-sm text-muted-foreground">{causal.detalle}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatearFecha(causal.fecha)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}
    </Panel>
  )
}

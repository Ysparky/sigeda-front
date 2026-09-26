import { useQuery } from '@tanstack/react-query'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePuede, useSesion } from '@/lib/auth/use-sesion'
import { TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR, TEXTO_SIN_DESAPROBADOS } from '@/lib/dominio/seguimiento'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento } from '../api'
import { Panel } from './panel'

type Props = { codAlumno: string }

export function PanelDeDesaprobados({ codAlumno }: Props) {
  const puedeVer = usePuede('View Disapproved')
  const propio = useSesion()?.codPersona === codAlumno
  const desaprobados = useQuery({ ...consultasSeguimiento.desaprobados(codAlumno), enabled: puedeVer })

  if (!puedeVer) {
    if (!propio) return null
    return (
      <Panel titulo="Vuelos desaprobados">
        <p className="text-sm text-muted-foreground">{TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR}</p>
      </Panel>
    )
  }

  const error = errorDePrimeraCarga(desaprobados)
  const cargando = desaprobados.data === undefined && error === null

  return (
    <Panel
      titulo="Vuelos desaprobados"
      error={error}
      alReintentar={() => void desaprobados.refetch()}
      cargando={cargando}
    >
      {desaprobados.data &&
        (desaprobados.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{TEXTO_SIN_DESAPROBADOS}</p>
        ) : (
          <Table aria-label="Vuelos desaprobados del alumno">
            <TableHeader>
              <TableRow>
                <TableHead>Evaluación</TableHead>
                <TableHead>Clasificación</TableHead>
                <TableHead>Sub fase</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Programa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {desaprobados.data.map((desaprobado) => (
                <TableRow key={desaprobado.codigo}>
                  <TableCell>
                    <Enlace to="/evaluaciones/$cod" params={{ cod: desaprobado.codigo }} className="font-mono text-xs">
                      {desaprobado.codigo}
                    </Enlace>
                  </TableCell>
                  <TableCell>
                    <StatusBadge vocabulario="clasificacion" valor={desaprobado.clasificacion} />
                  </TableCell>
                  <TableCell>{desaprobado.subfase}</TableCell>
                  <TableCell className="tabular-nums">{formatearFecha(desaprobado.fecha)}</TableCell>
                  <TableCell>{desaprobado.programa}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}
    </Panel>
  )
}

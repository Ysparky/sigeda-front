import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { accionDisponible } from '@/lib/dependencias'
import { TEXTO_CHEQUEO_SIN_SERVIDOR, TEXTO_SIN_GRUPO } from '@/lib/dominio/seguimiento'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento, type DetalleAlumno } from '../api'
import { Panel } from './panel'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

type Props = { codAlumno: string; alumno: UseQueryResult<DetalleAlumno> }

export function CabeceraDelLegajo({ codAlumno, alumno }: Props) {
  const disponibleChequeo = accionDisponible('verCicloChequeo')
  const legajo = useQuery({ ...consultasSeguimiento.legajo(codAlumno), enabled: disponibleChequeo })
  const error = errorDePrimeraCarga(alumno)
  const cargando = alumno.data === undefined && error === null

  return (
    <Panel titulo="Cabecera" error={error} alReintentar={() => void alumno.refetch()} cargando={cargando}>
      {alumno.data && (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato etiqueta="Código">{codAlumno}</Dato>
          <Dato etiqueta="Nombre">{`${alumno.data.nombre} ${alumno.data.aPaterno} ${alumno.data.aMaterno}`.trim()}</Dato>
          <Dato etiqueta="DNI">{alumno.data.dni}</Dato>
          <Dato etiqueta="Rango">{alumno.data.rango ?? '—'}</Dato>
          <Dato etiqueta="Tipo">
            {!disponibleChequeo ? TEXTO_CHEQUEO_SIN_SERVIDOR : (legajo.data?.tipo ?? '—')}
          </Dato>
          <Dato etiqueta="Estado">
            <StatusBadge vocabulario="estado" valor={alumno.data.estado} />
          </Dato>
          <Dato etiqueta="Grupo">
            {!disponibleChequeo
              ? TEXTO_CHEQUEO_SIN_SERVIDOR
              : legajo.data
                ? legajo.data.grupo === null
                  ? TEXTO_SIN_GRUPO
                  : `${legajo.data.grupo.nombre} · ${legajo.data.grupo.programa}`
                : '—'}
          </Dato>
          <Dato etiqueta="Cuenta">{alumno.data.usuario?.nombre ?? 'Sin cuenta'}</Dato>
        </dl>
      )}
    </Panel>
  )
}

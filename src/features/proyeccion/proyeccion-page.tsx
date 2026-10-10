import { useQuery } from '@tanstack/react-query'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Enlace } from '@/components/enlace'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { errorDePrimeraCarga } from '@/lib/query'
import { formatearNota } from '@/lib/formato'
import { consultasProyeccion, type ResumenAlumno, type Tendencia } from './api'

const ICONO_TENDENCIA = { up: TrendingUp, down: TrendingDown, flat: Minus }

function iconoTendencia(direccion: Tendencia) {
  const Icono = ICONO_TENDENCIA[direccion]
  return <Icono className="size-4" aria-hidden />
}

export function ProyeccionPage() {
  const proyecciones = useQuery(consultasProyeccion.lista())
  const error = errorDePrimeraCarga(proyecciones)

  return (
    <>
      <PageHeader titulo={PANTALLAS.proyeccion.titulo} descripcion={PANTALLAS.proyeccion.descripcion} />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void proyecciones.refetch()} />
      ) : proyecciones.isPending || !proyecciones.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, indice) => (
            <Skeleton key={indice} className="h-36 w-full" />
          ))}
        </div>
      ) : proyecciones.data.length === 0 ? (
        <EmptyState
          titulo="No hay alumnos para proyectar"
          descripcion="Ningún alumno en su alcance tiene evaluaciones registradas."
        />
      ) : (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {proyecciones.data.map((alumno) => (
            <li key={alumno.studentId}>
              <TarjetaDeAlumno alumno={alumno} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function TarjetaDeAlumno({ alumno }: { alumno: ResumenAlumno }) {
  return (
    <Enlace
      to="/seguimiento/proyeccion/$studentId"
      params={{ studentId: alumno.studentId }}
      className="block rounded-lg border bg-card p-4 no-underline transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-card-foreground">{alumno.fullName}</p>
        <StatusBadge vocabulario="riesgo" valor={alumno.riskLevel} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Última nota</dt>
          <dd className="tabular-nums">{alumno.latestScore === null ? '—' : formatearNota(alumno.latestScore)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Evaluaciones</dt>
          <dd className="tabular-nums">{alumno.evaluationCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tendencia</dt>
          <dd className="flex items-center gap-1.5">
            {iconoTendencia(alumno.trendDirection)}
            <StatusBadge vocabulario="tendencia" valor={alumno.trendDirection} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Último evaluador</dt>
          <dd>{alumno.instructorName ?? '—'}</dd>
        </div>
      </dl>
    </Enlace>
  )
}

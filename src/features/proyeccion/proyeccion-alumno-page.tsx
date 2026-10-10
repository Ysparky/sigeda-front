import { useQuery } from '@tanstack/react-query'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { errorDePrimeraCarga } from '@/lib/query'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { consultasProyeccion, type ProyeccionAlumno, type Recomendacion } from './api'
import { GraficoDeTendencia } from './components/grafico-de-tendencia'

export function ProyeccionAlumnoPage({ studentId }: { studentId: string }) {
  const proyeccion = useQuery(consultasProyeccion.alumno(studentId))
  const error = errorDePrimeraCarga(proyeccion)

  if (error !== null) {
    return (
      <>
        <PageHeader titulo="Proyección del alumno" />
        <AvisoDeError error={error} alReintentar={() => void proyeccion.refetch()} />
      </>
    )
  }

  if (proyeccion.isPending || !proyeccion.data) {
    return (
      <>
        <PageHeader titulo="Proyección del alumno" />
        <Skeleton className="h-80 w-full" />
      </>
    )
  }

  return <Detalle datos={proyeccion.data} />
}

function Detalle({ datos }: { datos: ProyeccionAlumno }) {
  return (
    <>
      <PageHeader
        titulo={datos.fullName}
        descripcion={datos.instructorName ? `Último evaluador: ${datos.instructorName}` : undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge vocabulario="riesgo" valor={datos.riskLevel} />
        <StatusBadge vocabulario="tendencia" valor={datos.trendDirection} />
      </div>

      {datos.insufficientData ? (
        <EmptyState
          titulo="Todavía no hay datos suficientes para proyectar"
          descripcion={
            datos.evaluationCount === 0
              ? 'El alumno aún no tiene evaluaciones prácticas registradas.'
              : `Con ${datos.evaluationCount} evaluación(es) no alcanza para ajustar una tendencia confiable.`
          }
        />
      ) : (
        <>
          <section aria-label="Cifras clave" className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-medium text-muted-foreground">Último desempeño</h2>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatearNota(datos.latestScore)}</p>
              {datos.latestEvaluation && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {datos.latestEvaluation.name ?? 'Evaluación'}
                  {datos.latestEvaluation.sigedaClassification && (
                    <>
                      {' · '}
                      <StatusBadge vocabulario="clasificacion" valor={datos.latestEvaluation.sigedaClassification} />
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-medium text-muted-foreground">Proyección del modelo</h2>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">{formatearNota(datos.predictedScore)}</span>
                {datos.predictedBand && <StatusBadge vocabulario="banda" valor={datos.predictedBand} />}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Banda del modelo, no la clasificación DIRBE. Cortes: óptimo ≥ {datos.bandThresholds.optimo}, regular ≥{' '}
                {datos.bandThresholds.regular}.
              </p>
            </div>
          </section>

          <section aria-label="Tendencia" className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Tendencia y proyección</h2>
            <GraficoDeTendencia puntos={datos.trendSeries} escala={datos.scale} cortes={datos.bandThresholds} />
          </section>

          <Desglose datos={datos} />

          <section aria-label="Recomendaciones" className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Recomendaciones</h2>
            {datos.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay recomendaciones para este alumno.</p>
            ) : (
              <ul className="space-y-3">
                {datos.recommendations.map((recomendacion, indice) => (
                  <Recomendacion key={indice} recomendacion={recomendacion} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <PieDeModelo datos={datos} />
    </>
  )
}

function Desglose({ datos }: { datos: ProyeccionAlumno }) {
  if (datos.maneuverBreakdown.length === 0) {
    return (
      <section aria-label="Desglose por maniobra" className="rounded-lg border p-4">
        <h2 className="mb-1 font-medium">Desglose por maniobra</h2>
        <p className="text-sm text-muted-foreground">No se pudo leer el detalle por maniobra de sus evaluaciones.</p>
      </section>
    )
  }

  return (
    <section aria-label="Desglose por maniobra" className="rounded-lg border p-4">
      <h2 className="mb-3 font-medium">Desglose por maniobra</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Cuántas veces cada maniobra quedó bajo, al o sobre el estándar exigido. «Severos» es un subconjunto de «bajo»:
        una sola fuerza el «Malo» de la misión.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Maniobra</TableHead>
            <TableHead className="text-right">Bajo</TableHead>
            <TableHead className="text-right">Al estándar</TableHead>
            <TableHead className="text-right">Sobre</TableHead>
            <TableHead className="text-right">Severos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {datos.maneuverBreakdown.map((fila) => (
            <TableRow key={fila.maneuverId}>
              <TableCell>{fila.maneuver ?? `Maniobra ${fila.maneuverId}`}</TableCell>
              <TableCell className="text-right tabular-nums">{fila.below}</TableCell>
              <TableCell className="text-right tabular-nums">{fila.atStandard}</TableCell>
              <TableCell className="text-right tabular-nums">{fila.above}</TableCell>
              <TableCell className="text-right tabular-nums">{fila.severe}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

// La prioridad de la recomendación comparte los tonos de la severidad de alerta (alta/media/baja),
// así que se reusa ese vocabulario en vez de duplicar los cortes de color.
const SEVERIDAD_POR_PRIORIDAD = { alta: 'ALTA', media: 'MEDIA', baja: 'BAJA' } as const

function Recomendacion({ recomendacion }: { recomendacion: Recomendacion }) {
  return (
    <li className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{recomendacion.title}</p>
        <StatusBadge vocabulario="severidad" valor={SEVERIDAD_POR_PRIORIDAD[recomendacion.priority]} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{recomendacion.description}</p>
    </li>
  )
}

function PieDeModelo({ datos }: { datos: ProyeccionAlumno }) {
  const avisos: string[] = []
  if (datos.discardedCount > 0) {
    avisos.push(`${datos.discardedCount} evaluación(es) sin nota legible quedaron fuera de la serie.`)
  }
  if (datos.maneuverDetailFailures > 0) {
    avisos.push(`No se pudo leer el detalle de ${datos.maneuverDetailFailures} evaluación(es) para el desglose.`)
  }

  return (
    <>
      {avisos.length > 0 && (
        <Alert>
          <AlertDescription>{avisos.join(' ')}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-muted-foreground">
        Modelo {datos.modelVersion} · calculado el {formatearFecha(datos.computedAt.slice(0, 10))} ·{' '}
        {datos.evaluationCount} evaluación(es) en la serie.
      </p>
    </>
  )
}

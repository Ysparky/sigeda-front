import { useQuery } from '@tanstack/react-query'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { errorDePrimeraCarga } from '@/lib/query'
import { misSesionesQuery } from './api'
import { ETIQUETA_ESTADO_SESION } from './estado'

export function MisSesionesPage() {
  const sesiones = useQuery(misSesionesQuery())
  const error = errorDePrimeraCarga(sesiones)

  return (
    <div className="grid gap-6">
      <PageHeader titulo="Mis sesiones de simulador" descripcion="Tus sesiones de entrenamiento en el simulador." />

      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void sesiones.refetch()} />
      ) : sesiones.data && sesiones.data.length === 0 ? (
        <EmptyState titulo="Sin sesiones" descripcion="Todavía no tienes sesiones de simulador." />
      ) : (
        <div className="grid gap-3">
          {sesiones.data?.map((s) => {
            const etiqueta = ETIQUETA_ESTADO_SESION[s.estado]
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="grid gap-0.5">
                    <p className="font-medium">{s.escenarioNombre ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.simuladorNombre ?? '—'} · {s.fechaPlanificada}
                    </p>
                  </div>
                  <Badge variant={etiqueta.variante}>{etiqueta.texto}</Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

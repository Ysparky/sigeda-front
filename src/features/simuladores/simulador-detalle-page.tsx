import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { simuladorQuery } from './api'
import { ETIQUETA_TIPO_SIMULADOR } from './estado'

export function SimuladorDetallePage({ id }: { id: number }) {
  const { data: simulador } = useSuspenseQuery(simuladorQuery(id))

  return (
    <div className="grid gap-6">
      <PageHeader
        titulo={simulador.nombre}
        descripcion={ETIQUETA_TIPO_SIMULADOR[simulador.tipo]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/simuladores/$id/editar" params={{ id: String(simulador.id) }}>
              <Pencil aria-hidden />
              Editar
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="grid gap-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato termino="Tipo" valor={ETIQUETA_TIPO_SIMULADOR[simulador.tipo]} />
            <Dato termino="Ubicación" valor={simulador.ubicacion ?? '—'} />
            <Dato termino="Descripción" valor={simulador.descripcion ?? '—'} />
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <Badge variant={simulador.activo ? 'default' : 'secondary'}>
                  {simulador.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{termino}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

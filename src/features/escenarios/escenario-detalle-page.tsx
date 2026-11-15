import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { escenarioQuery } from './api'

export function EscenarioDetallePage({ id }: { id: number }) {
  const { data: escenario } = useSuspenseQuery(escenarioQuery(id))

  return (
    <div className="grid gap-6">
      <PageHeader
        titulo={escenario.nombre}
        descripcion={escenario.objetivo ?? undefined}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/escenarios/$id/editar" params={{ id: String(escenario.id) }}>
              <Pencil aria-hidden />
              Editar
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-0.5 sm:col-span-2">
              <dt className="text-muted-foreground">Requisito antes de volar</dt>
              <dd>{escenario.subfase ? `Sub fase ${escenario.subfase}: el alumno debe aprobarlo antes de volarla.` : 'Ninguno (práctica libre)'}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Duración</dt>
              <dd>{escenario.duracionMin ? `${escenario.duracionMin} min` : '—'}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <Badge variant={escenario.activo ? 'default' : 'secondary'}>
                  {escenario.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </dd>
            </div>
            <div className="grid gap-0.5 sm:col-span-2">
              <dt className="text-muted-foreground">Descripción</dt>
              <dd>{escenario.descripcion ?? '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Indicadores de competencia</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {escenario.indicadores.length === 0 ? (
            <EmptyState titulo="Sin indicadores" descripcion="Este escenario no tiene indicadores." />
          ) : (
            <Table aria-label="Indicadores">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Competencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escenario.indicadores.map((indicador) => (
                  <TableRow key={indicador.id}>
                    <TableCell>{indicador.orden}</TableCell>
                    <TableCell className="font-medium">{indicador.nombre}</TableCell>
                    <TableCell>{indicador.competencia ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

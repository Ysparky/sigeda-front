import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorDePrimeraCarga } from '@/lib/query'
import { escenariosQuery } from './api'

export function EscenariosPage() {
  const escenarios = useQuery(escenariosQuery())
  const error = errorDePrimeraCarga(escenarios)

  return (
    <div className="grid gap-6">
      <PageHeader
        titulo="Escenarios"
        descripcion="Plantillas de entrenamiento con sus indicadores de competencia."
        acciones={
          <Button asChild>
            <Link to="/escenarios/nueva">
              <Plus aria-hidden />
              Nuevo escenario
            </Link>
          </Button>
        }
      />

      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void escenarios.refetch()} />
      ) : escenarios.data && escenarios.data.length === 0 ? (
        <EmptyState titulo="Sin escenarios" descripcion="Aún no se ha registrado ningún escenario." />
      ) : (
        <Table aria-label="Escenarios">
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Indicadores</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {escenarios.data?.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    to="/escenarios/$id"
                    params={{ id: String(e.id) }}
                  >
                    {e.nombre}
                  </Link>
                </TableCell>
                <TableCell>{e.duracionMin ? `${e.duracionMin} min` : '—'}</TableCell>
                <TableCell>{e.indicadores.length}</TableCell>
                <TableCell>
                  <Badge variant={e.activo ? 'default' : 'secondary'}>{e.activo ? 'Activo' : 'Inactivo'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

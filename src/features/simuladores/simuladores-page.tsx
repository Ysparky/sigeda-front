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
import { simuladoresQuery } from './api'

export function SimuladoresPage() {
  const simuladores = useQuery(simuladoresQuery())
  const error = errorDePrimeraCarga(simuladores)

  return (
    <div className="grid gap-6">
      <PageHeader
        titulo="Simuladores"
        descripcion="Dispositivos de simulación disponibles para las sesiones de entrenamiento."
        acciones={
          <Button asChild>
            <Link to="/simuladores/nueva">
              <Plus aria-hidden />
              Nuevo simulador
            </Link>
          </Button>
        }
      />

      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void simuladores.refetch()} />
      ) : simuladores.data && simuladores.data.length === 0 ? (
        <EmptyState titulo="Sin simuladores" descripcion="Aún no se ha registrado ningún dispositivo." />
      ) : (
        <Table aria-label="Simuladores">
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {simuladores.data?.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link className="font-medium underline-offset-4 hover:underline" to="/simuladores/$id" params={{ id: String(s.id) }}>
                    {s.nombre}
                  </Link>
                </TableCell>
                <TableCell>{s.tipo}</TableCell>
                <TableCell>{s.ubicacion ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={s.activo ? 'default' : 'secondary'}>{s.activo ? 'Activo' : 'Inactivo'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

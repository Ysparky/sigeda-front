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
import { convocatoriasQuery, type EstadoConvocatoria } from './api'

export const ETIQUETA_ESTADO_CONVOCATORIA: Record<
  EstadoConvocatoria,
  { texto: string; variante: 'secondary' | 'default' | 'destructive' }
> = {
  BORRADOR: { texto: 'Borrador', variante: 'secondary' },
  PUBLICADA: { texto: 'Publicada', variante: 'default' },
  CERRADA: { texto: 'Cerrada', variante: 'secondary' },
  FINALIZADA: { texto: 'Finalizada', variante: 'destructive' },
}

export function ConvocatoriasPage() {
  const convocatorias = useQuery(convocatoriasQuery())
  const error = errorDePrimeraCarga(convocatorias)

  return (
    <>
      <PageHeader
        titulo="Convocatorias"
        descripcion="Procesos de admisión: vacantes, fechas y documentos requeridos."
        acciones={
          <Button asChild>
            <Link to="/convocatorias/nueva">
              <Plus aria-hidden />
              Nueva convocatoria
            </Link>
          </Button>
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void convocatorias.refetch()} />
      ) : convocatorias.data && convocatorias.data.length === 0 ? (
        <EmptyState titulo="Sin convocatorias" descripcion="Crea la primera convocatoria de admisión." />
      ) : (
        <Table aria-label="Convocatorias">
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Vacantes</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(convocatorias.data ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link to="/convocatorias/$id" params={{ id: String(c.id) }} className="text-primary hover:underline">
                    {c.nombre}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.fechaInicio}</TableCell>
                <TableCell className="text-muted-foreground">{c.fechaFin}</TableCell>
                <TableCell className="tabular-nums">{c.vacantes}</TableCell>
                <TableCell>
                  <Badge variant={ETIQUETA_ESTADO_CONVOCATORIA[c.estado].variante}>
                    {ETIQUETA_ESTADO_CONVOCATORIA[c.estado].texto}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}

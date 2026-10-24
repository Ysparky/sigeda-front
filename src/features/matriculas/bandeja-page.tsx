import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorDePrimeraCarga } from '@/lib/query'
import { bandejaQuery, type EstadoMatricula } from './api'
import { ETIQUETA_ESTADO } from './estado'

const ruta = getRouteApi('/_app/matriculas/')

export function BandejaPage() {
  const { estado } = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const matriculas = useQuery(bandejaQuery(estado))
  const error = errorDePrimeraCarga(matriculas)

  return (
    <>
      <PageHeader
        titulo="Matrículas"
        descripcion="Solicitudes de matrícula del tramo de entrada, con su comprobante de pago."
        acciones={
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Estado</span>
            <NativeSelect
              aria-label="Filtrar por estado"
              value={estado}
              onChange={(evento) =>
                void navegar({ search: { estado: evento.target.value as EstadoMatricula } })
              }
            >
              <NativeSelectOption value="PENDIENTE">Pendientes</NativeSelectOption>
              <NativeSelectOption value="VALIDADA">Validadas</NativeSelectOption>
              <NativeSelectOption value="RECHAZADA">Rechazadas</NativeSelectOption>
            </NativeSelect>
          </label>
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void matriculas.refetch()} />
      ) : matriculas.data && matriculas.data.length === 0 ? (
        <EmptyState titulo="No hay matrículas" descripcion="No hay solicitudes en este estado." />
      ) : (
        <Table aria-label="Solicitudes de matrícula">
          <TableHeader>
            <TableRow>
              <TableHead>Postulante</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(matriculas.data ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.aPaterno} {m.aMaterno}, {m.nombres}
                </TableCell>
                <TableCell>
                  <Link to="/matriculas/$id" params={{ id: String(m.id) }} className="text-primary hover:underline">
                    {m.dni}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.correo}</TableCell>
                <TableCell className="text-muted-foreground">{m.fecha}</TableCell>
                <TableCell>
                  <Badge variant={ETIQUETA_ESTADO[m.estado].variante}>{ETIQUETA_ESTADO[m.estado].texto}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}

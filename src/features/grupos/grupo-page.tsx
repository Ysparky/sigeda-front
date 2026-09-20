import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { clavesGrupos, consultasGrupos, eliminarGrupo } from './api'

export function GrupoPage({ id }: { id: number }) {
  const { data: grupo } = useSuspenseQuery(consultasGrupos.detalle(id))
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const eliminar = useMutation({
    mutationFn: () => eliminarGrupo(grupo.id),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.todo })
      await navegar({ to: '/grupos' })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo={grupo.nombre}
        descripcion={grupo.descripcion || grupo.programa}
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link to="/grupos/$id/editar" params={{ id: String(grupo.id) }}>
                <Pencil aria-hidden />
                Modificar
              </Link>
            </Button>
            <ConfirmDialog
              disparador={
                <Button variant="destructive" disabled={eliminar.isPending}>
                  <Trash2 aria-hidden />
                  Eliminar
                </Button>
              }
              titulo="¿Eliminar el grupo?"
              descripcion={`Se eliminará «${grupo.nombre}» y sus alumnos quedarán sin grupo.`}
              confirmar="Eliminar"
              destructivo
              alConfirmar={() => eliminar.mutate()}
            />
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del grupo</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Nombre</dt>
              <dd className="text-sm font-medium">{grupo.nombre}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Descripción</dt>
              <dd className="text-sm font-medium">{grupo.descripcion || '—'}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Programa</dt>
              <dd className="text-sm font-medium">{grupo.programa}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Alumnos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grupo.alumnos.length === 0 ? (
            <p className="text-sm text-muted-foreground">El grupo no tiene alumnos asignados.</p>
          ) : (
            <Table aria-label="Alumnos del grupo">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupo.alumnos.map((alumno) => (
                  <TableRow key={alumno.codigo}>
                    <TableCell className="tabular-nums">{alumno.codigo}</TableCell>
                    <TableCell>{alumno.nombreCompleto}</TableCell>
                    <TableCell>{alumno.estado ? <StatusBadge vocabulario="estado" valor={alumno.estado} /> : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}

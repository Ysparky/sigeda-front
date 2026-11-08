import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { CircleAlert, Pencil, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePuede } from '@/lib/auth/use-sesion'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { cambiarEstadoGrupo, clavesGrupos, consultasGrupos, eliminarGrupo } from './api'

const ETIQUETA_ESTADO_COHORTE: Record<string, string> = {
  EN_INSCRIPCION: 'En inscripción',
  EN_PROGRESO: 'En progreso',
  CERRADA: 'Cerrada',
}

export function GrupoPage({ id }: { id: number }) {
  const { data: grupo } = useSuspenseQuery(consultasGrupos.detalle(id))
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const puedeCerrar = usePuede('Manage Enrollments')
  const [motivos, setMotivos] = useState<string | null>(null)
  const consolidado = useQuery({ ...consultasGrupos.consolidado(grupo.id), enabled: grupo.estado === 'CERRADA' && puedeCerrar })
  const iniciar = useMutation({
    mutationFn: () => cambiarEstadoGrupo(grupo.id, 'EN_PROGRESO'),
    onMutate: () => setMotivos(null),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.detalle(grupo.id) })
    },
    onError: (error) => setMotivos(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })
  const cerrar = useMutation({
    mutationFn: () => cambiarEstadoGrupo(grupo.id, 'CERRADA'),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.detalle(grupo.id) })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })
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
            {grupo.estado === 'EN_INSCRIPCION' && puedeCerrar && (
              <Button disabled={iniciar.isPending} onClick={() => iniciar.mutate()}>
                <Play aria-hidden />
                {iniciar.isPending ? 'Iniciando…' : 'Iniciar cohorte'}
              </Button>
            )}
            {grupo.estado === 'EN_PROGRESO' && puedeCerrar && (
              <Button variant="outline" disabled={cerrar.isPending} onClick={() => cerrar.mutate()}>
                {cerrar.isPending ? 'Cerrando…' : 'Cerrar cohorte'}
              </Button>
            )}
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
      {motivos && (
        <div role="alert" className="flex gap-2.5 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="grid gap-1">
            <p className="font-medium">La cohorte aún no puede iniciar.</p>
            <p>{motivos}</p>
          </div>
        </div>
      )}
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
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Estado de la cohorte</dt>
              <dd className="text-sm font-medium">
                {grupo.estado ? (ETIQUETA_ESTADO_COHORTE[grupo.estado] ?? grupo.estado) : '—'}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Inicio</dt>
              <dd className="text-sm font-medium tabular-nums">{grupo.fechaInicio ? formatearFecha(grupo.fechaInicio) : '—'}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Fin previsto (81 días hábiles)</dt>
              <dd className="text-sm font-medium tabular-nums">{grupo.fechaFin ? formatearFecha(grupo.fechaFin) : '—'}</dd>
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
      {consolidado.data && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Consolidado de la cohorte</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consolidado.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">La cohorte cerró sin alumnos.</p>
            ) : (
              <Table aria-label="Consolidado de la cohorte">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Estado académico</TableHead>
                    <TableHead className="text-right">NFPI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consolidado.data.map((alumno) => (
                    <TableRow key={alumno.codigo}>
                      <TableCell className="tabular-nums">{alumno.codigo}</TableCell>
                      <TableCell>{alumno.nombre}</TableCell>
                      <TableCell>
                        {alumno.estadoAcademico ? <StatusBadge vocabulario="estado" valor={alumno.estadoAcademico} /> : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatearNota(alumno.nfpi)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

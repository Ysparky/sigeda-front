import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/lib/api/errors'
import { cambiarEstadoSesion, clavesSesiones, sesionQuery, type EstadoSesion } from './api'
import { ETIQUETA_ESTADO_SESION, ETIQUETA_RESUMEN } from './estado'
import { PanelCabina } from './panel-cabina'
import { usePuede } from '@/lib/auth/use-sesion'

export function SesionDetallePage({ id }: { id: number }) {
  const gestiona = usePuede('Manage Simulator')
  const { data: sesion } = useSuspenseQuery(sesionQuery(id))
  const queryClient = useQueryClient()

  const cambiar = useMutation({
    mutationFn: (estado: EstadoSesion) => cambiarEstadoSesion(id, estado),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesSesiones.todo })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado.'),
  })

  const etiqueta = ETIQUETA_ESTADO_SESION[sesion.estado]

  return (
    <div className="grid gap-6">
      <PageHeader
        titulo={sesion.escenarioNombre ?? 'Sesión de simulador'}
        descripcion={sesion.simuladorNombre ?? undefined}
        acciones={<Badge variant={etiqueta.variante}>{etiqueta.texto}</Badge>}
      />

      <Card>
        <CardContent className="grid gap-3 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato termino="Alumno" valor={sesion.codAlumno} />
            <Dato termino="Instructor" valor={sesion.codInstructor} />
            <Dato termino="Fecha planificada" valor={sesion.fechaPlanificada} />
            <Dato termino="Fecha de ejecución" valor={sesion.fechaEjecucion ?? '—'} />
          </dl>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {sesion.estado === 'PLANIFICADA' && (
              <Button disabled={cambiar.isPending} onClick={() => cambiar.mutate('EN_CURSO')}>
                Iniciar
              </Button>
            )}
            {sesion.estado === 'EN_CURSO' && (
              <Button asChild>
                <Link to="/sesiones-simulador/$id/calificar" params={{ id: String(sesion.id) }}>
                  Calificar
                </Link>
              </Button>
            )}
            {(sesion.estado === 'PLANIFICADA' || sesion.estado === 'EN_CURSO') && (
              <Button variant="destructive" disabled={cambiar.isPending} onClick={() => cambiar.mutate('CANCELADA')}>
                Cancelar sesión
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {gestiona && (
        <PanelCabina
          idSesion={sesion.id}
          idEscenario={sesion.idEscenario}
          codAlumno={sesion.codAlumno}
          enCurso={sesion.estado === 'EN_CURSO'}
        />
      )}

      {sesion.estado === 'COMPLETADA' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>
              <h2>Resultado de la sesión</h2>
            </CardTitle>
            {sesion.resumen && (
              <Badge variant={ETIQUETA_RESUMEN[sesion.resumen].variante}>
                {ETIQUETA_RESUMEN[sesion.resumen].texto}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            <Table aria-label="Resultados por indicador">
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Competencia</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead>Comentario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sesion.resultados.map((r) => (
                  <TableRow key={r.idIndicador}>
                    <TableCell className="font-medium">{r.indicadorNombre ?? '—'}</TableCell>
                    <TableCell>{r.competencia ?? '—'}</TableCell>
                    <TableCell>{r.calificacion}</TableCell>
                    <TableCell>{r.comentario ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sesion.notasBriefing && <Nota titulo="Briefing" texto={sesion.notasBriefing} />}
            {sesion.notasDebrief && <Nota titulo="Debrief" texto={sesion.notasDebrief} />}
            {sesion.autoevaluacionAlumno && <Nota titulo="Autoevaluación del alumno" texto={sesion.autoevaluacionAlumno} />}
          </CardContent>
        </Card>
      )}
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

function Nota({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="grid gap-0.5 text-sm">
      <p className="font-medium">{titulo}</p>
      <p className="text-muted-foreground">{texto}</p>
    </div>
  )
}

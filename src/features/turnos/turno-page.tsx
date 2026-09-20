import { useQueries, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ClipboardPen, FileText, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultasEvaluaciones } from '@/features/evaluaciones/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { veSoloLoPropio } from '@/lib/auth/pantallas'
import { usePuede, useSesion } from '@/lib/auth/use-sesion'
import { etapasDeMision } from '@/lib/dominio/briefing'
import { MOTIVO_TURNO_VENCIDO, permiteCambios } from '@/lib/dominio/turno'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnos, useEliminarTurno, type AlumnoDelTurno, type TurnoDetalle } from './api'
import { LineaDeTiempo } from './components/linea-de-tiempo'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

type PropsAlumno = {
  turno: TurnoDetalle
  alumno: AlumnoDelTurno
  evaluaciones: { codigo: string }[] | undefined
  error: unknown
  alReintentar: () => void
  puedeEvaluar: boolean
}

function TarjetaAlumno({ turno, alumno, evaluaciones, error, alReintentar, puedeEvaluar }: PropsAlumno) {
  const evaluada = (evaluaciones?.length ?? 0) > 0
  const idTitulo = `alumno-${alumno.codAlumno}`
  const params = { id: String(turno.id), alumno: alumno.codAlumno }

  return (
    <Card aria-labelledby={idTitulo} role="region">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5">
          <CardTitle>
            <h3 id={idTitulo}>{alumno.alumno}</h3>
          </CardTitle>
          <p className="text-sm text-muted-foreground tabular-nums">
            {alumno.horaInicio} – {alumno.horaFin}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/turnos/$id/briefing/$alumno" params={params}>
              <FileText aria-hidden />
              Hoja de briefing
            </Link>
          </Button>
          {evaluaciones?.map((evaluacion) => (
            <Button key={evaluacion.codigo} variant="outline" size="sm" asChild>
              <Link to="/evaluaciones/$cod" params={{ cod: evaluacion.codigo }}>
                Ver evaluación {evaluacion.codigo}
              </Link>
            </Button>
          ))}
          {puedeEvaluar && evaluaciones !== undefined && !evaluada && (
            <Button size="sm" asChild>
              <Link to="/turnos/$id/evaluar/$alumno" params={params}>
                <ClipboardPen aria-hidden />
                Registrar evaluación
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error !== null && (
          <AvisoDeError
            titulo="No se pudo cargar la evaluación de este alumno"
            error={error}
            alReintentar={alReintentar}
          />
        )}
        {error === null && evaluaciones === undefined && <Skeleton className="h-16 w-full" aria-busy="true" />}
        {error === null && evaluaciones !== undefined && (
          <LineaDeTiempo etapas={etapasDeMision({ fechaEval: turno.fechaEval, ...alumno }, evaluada)} />
        )}
      </CardContent>
    </Card>
  )
}

export function TurnoPage({ id }: { id: number }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const actual = useSesion()
  const puedeGestionar = usePuede('Manage Shifts')
  const puedeEscribir = usePuede('Write')
  const navegar = useNavigate()
  const eliminar = useEliminarTurno()
  const alumnos =
    actual && veSoloLoPropio(actual)
      ? turno.alumnos.filter((alumno) => alumno.codAlumno === actual.codPersona)
      : turno.alumnos
  const evaluaciones = useQueries({
    queries: alumnos.map((alumno) => consultasEvaluaciones.delTurno(alumno.codAlumno, turno.id)),
  })
  const modificable = permiteCambios(turno.fechaEval)
  const esSuInstructor = puedeEscribir && actual?.codPersona != null && actual.codPersona === turno.codInstructor

  function confirmarEliminacion() {
    eliminar.mutate(turno.id, {
      onSuccess: (mensaje) => {
        toast.success(mensaje)
        void navegar({ to: '/turnos' })
      },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
    })
  }

  return (
    <>
      <PageHeader
        titulo={turno.nombre}
        descripcion={`${turno.subfase} · ${turno.fase} · ${turno.programa}`}
        acciones={
          puedeGestionar && (
            <>
              {modificable ? (
                <Button variant="outline" asChild>
                  <Link to="/turnos/$id/editar" params={{ id: String(turno.id) }}>
                    <Pencil aria-hidden />
                    Modificar
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <Pencil aria-hidden />
                  Modificar
                </Button>
              )}
              <ConfirmDialog
                disparador={
                  <Button variant="destructive" disabled={!modificable || eliminar.isPending}>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                }
                titulo="¿Eliminar el turno?"
                descripcion={`Se eliminará «${turno.nombre}» con sus alumnos y maniobras. Esta acción no se puede deshacer.`}
                confirmar="Eliminar"
                destructivo
                alConfirmar={confirmarEliminacion}
              />
            </>
          )
        }
      />
      {puedeGestionar && !modificable && <p className="text-sm text-muted-foreground">{MOTIVO_TURNO_VENCIDO}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Datos del turno</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato etiqueta="Fecha de evaluación">
                <span className="tabular-nums">{formatearFecha(turno.fechaEval)}</span>
              </Dato>
              <Dato etiqueta="Programa">{turno.programa}</Dato>
              <Dato etiqueta="Fase">{turno.fase || '—'}</Dato>
              <Dato etiqueta="Sub fase">{turno.subfase}</Dato>
              <Dato etiqueta="Instructor">{turno.instructor ?? 'Sin asignar'}</Dato>
              <Dato etiqueta="Aeronave">
                {turno.aeronave ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {turno.aeronave.nombre}
                    <StatusBadge vocabulario="aeronave" valor={turno.aeronave.estado} />
                  </span>
                ) : (
                  'Sin asignar'
                )}
              </Dato>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Maniobras</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table aria-label="Maniobras del turno">
              <TableHeader>
                <TableRow>
                  <TableHead>Maniobra</TableHead>
                  <TableHead>Nota mínima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turno.maniobras.map((item) => (
                  <TableRow key={item.maniobra.id}>
                    <TableCell>{item.maniobra.nombre}</TableCell>
                    <TableCell>
                      <StatusBadge vocabulario="calificativo" valor={item.notaMin} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <section aria-labelledby="titulo-alumnos" className="grid gap-4">
        <h2 id="titulo-alumnos" className="text-lg font-semibold tracking-tight">
          Alumnos y ciclo de la misión
        </h2>
        {alumnos.map((alumno, indice) => {
          const consulta = evaluaciones[indice]
          return (
            <TarjetaAlumno
              key={alumno.codAlumno}
              turno={turno}
              alumno={alumno}
              evaluaciones={consulta?.data}
              error={consulta ? errorDePrimeraCarga(consulta) : null}
              alReintentar={() => void consulta?.refetch()}
              puedeEvaluar={esSuInstructor}
            />
          )
        })}
      </section>
    </>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { MENSAJE_DEPENDENCIA_PENDIENTE, accionDisponible } from '@/lib/dependencias'
import { TEXTO_SIN_HABILITADOS, TEXTO_VENTANA_COMENZADA, etiquetaDeDificultad, etiquetaDeTipoExamen, etiquetaDeTipoPregunta, textoConMinimo } from '@/lib/dominio/teoria'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnosTeoricos, type TurnoTeoricoDetalle } from './api'
import { EliminarTurnoTeorico } from './components/eliminar-turno-teorico'

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function Acciones({ turno }: { turno: TurnoTeoricoDetalle }) {
  const navegar = useNavigate()
  if (turno.estado !== 'PROGRAMADO') return <p className="text-sm text-muted-foreground">{TEXTO_VENTANA_COMENZADA}</p>
  const deshabilitado = !accionDisponible('programarTurnoTeorico')
  return (
    <>
      {deshabilitado ? (
        <Button variant="outline" disabled>
          <Pencil aria-hidden />
          Modificar
        </Button>
      ) : (
        <Button variant="outline" asChild>
          <Link to="/teoria/turnos/$id/editar" params={{ id: String(turno.id) }}>
            <Pencil aria-hidden />
            Modificar
          </Link>
        </Button>
      )}
      <EliminarTurnoTeorico
        id={turno.id}
        nombre={turno.nombre}
        deshabilitado={deshabilitado}
        alEliminar={() => void navegar({ to: '/teoria/turnos' })}
      />
      {deshabilitado && (
        <p className="w-full text-right text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      )}
    </>
  )
}

export function ResultadosTurnoPage({ id }: { id: number }) {
  const consulta = useQuery(consultasTurnosTeoricos.detalle(id))
  const error = errorDePrimeraCarga(consulta)
  const turno = consulta.data

  return (
    <>
      <PageHeader
        titulo={turno?.nombre ?? PANTALLAS.resultadosTurnoTeorico.titulo}
        descripcion={PANTALLAS.resultadosTurnoTeorico.descripcion}
        acciones={turno && <Acciones turno={turno} />}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void consulta.refetch()} />
      ) : turno === undefined ? (
        <Skeleton className="h-64 w-full" aria-busy="true" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Datos del examen</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Dato etiqueta="Materia">{turno.materia.nombre}</Dato>
                <Dato etiqueta="Tipo de examen">{etiquetaDeTipoExamen(turno.tipoExamen)}</Dato>
                <Dato etiqueta="Grupo">
                  {turno.grupo.nombre} · {turno.grupo.programa}
                </Dato>
                <Dato etiqueta="Instructor">{turno.instructor.nombre}</Dato>
                <Dato etiqueta="Fecha">
                  <span className="tabular-nums">{formatearFecha(turno.fechaExamen)}</span>
                </Dato>
                <Dato etiqueta="Horario">
                  <span className="tabular-nums">
                    {turno.horaInicio}–{turno.horaFin}
                  </span>
                </Dato>
                <Dato etiqueta="Estado">
                  <StatusBadge vocabulario="turnoTeorico" valor={turno.estado} />
                </Dato>
                <Dato etiqueta="Nota mínima aplicable">
                  <span className="tabular-nums">{turno.notaMinimaAplicada}</span>
                </Dato>
                {turno.turnoOrigen && (
                  <Dato etiqueta="Turno de origen">
                    <Link to="/teoria/turnos/$id" params={{ id: String(turno.turnoOrigen.id) }}>
                      {turno.turnoOrigen.nombre}
                    </Link>
                  </Dato>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Resumen</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Dato etiqueta="Habilitados">
                  <span className="tabular-nums">{turno.resumen.habilitados}</span>
                </Dato>
                <Dato etiqueta="Rindieron">
                  <span className="tabular-nums">{turno.resumen.rindieron}</span>
                </Dato>
                <Dato etiqueta="Aprobados">
                  <span className="tabular-nums">{turno.resumen.aprobados}</span>
                </Dato>
                <Dato etiqueta="Promedio del turno">
                  <span className="tabular-nums">{formatearNota(turno.resumen.notaPromedio)}</span>
                </Dato>
              </dl>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border">
            <Table aria-label="Preguntas del examen">
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Enunciado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead>Puntaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turno.preguntas.map((pregunta) => (
                  <TableRow key={pregunta.idPregunta}>
                    <TableCell className="tabular-nums">{pregunta.orden}</TableCell>
                    <TableCell>{pregunta.enunciado}</TableCell>
                    <TableCell>{etiquetaDeTipoPregunta(pregunta.tipoPregunta)}</TableCell>
                    <TableCell>{etiquetaDeDificultad(pregunta.dificultad)}</TableCell>
                    <TableCell className="tabular-nums">{pregunta.puntajeMaximo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {turno.resultados.length === 0 ? (
            <Alert>
              <AlertDescription>{TEXTO_SIN_HABILITADOS}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table aria-label="Resultados por alumno">
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Estado teórico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turno.resultados.map((resultado) => (
                    <TableRow key={resultado.codAlumno}>
                      <TableCell>{resultado.alumno}</TableCell>
                      <TableCell>
                        <StatusBadge vocabulario="rendicion" valor={resultado.estado} />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {textoConMinimo(resultado.nota, turno.notaMinimaAplicada)}
                      </TableCell>
                      <TableCell>
                        {resultado.aprobado === null ? (
                          '—'
                        ) : (
                          <StatusBadge vocabulario="examen" valor={resultado.aprobado ? 'aprobado' : 'desaprobado'} />
                        )}
                      </TableCell>
                      <TableCell>
                        {resultado.bloqueadoPorSubsanacion ? (
                          <StatusBadge vocabulario="subsanacion" valor="pendiente" />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { etiquetaDeTipoExamen, TEXTO_RESULTADO_SIN_DETALLE, textoConMinimo } from '@/lib/dominio/teoria'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasExamenes } from './api'

export function ResultadoExamenPage({ idTurno }: { idTurno: number }) {
  const sesion = useSesion()
  const codAlumno = sesion?.codPersona ?? ''
  const consulta = useQuery(consultasExamenes.miExamen(idTurno, codAlumno))
  const error = errorDePrimeraCarga(consulta)
  const examen = consulta.data
  const finalizado = examen?.turnoTeorico.estado === 'FINALIZADO'

  return (
    <>
      <PageHeader
        titulo={examen?.turnoTeorico.nombre ?? PANTALLAS.resultadoExamen.titulo}
        descripcion={PANTALLAS.resultadoExamen.descripcion}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/examenes">Volver a Mis exámenes</Link>
          </Button>
        }
      />
      <AvisoDeTeoria accion="rendirExamen" />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void consulta.refetch()} />
      ) : examen === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Su resultado</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Nota</dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {textoConMinimo(examen.nota, examen.notaMinimaAplicada)}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Resultado</dt>
                  <dd>
                    {examen.aprobado === null ? (
                      '—'
                    ) : (
                      <StatusBadge vocabulario="examen" valor={examen.aprobado ? 'aprobado' : 'desaprobado'} />
                    )}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Materia</dt>
                  <dd className="font-medium">{examen.materia.nombre}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Tipo de examen</dt>
                  <dd className="font-medium">{etiquetaDeTipoExamen(examen.tipoExamen)}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Entregado</dt>
                  <dd className="font-medium tabular-nums">
                    {examen.fechaEntrega === null
                      ? '—'
                      : `${formatearFecha(examen.fechaEntrega)} ${examen.horaEntrega ?? ''}`}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Estado</dt>
                  <dd>
                    <StatusBadge vocabulario="rendicion" valor={examen.estado} />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          {finalizado ? (
            <section aria-label="Detalle de sus respuestas" className="grid gap-4">
              {examen.calificaciones.map((fila) => (
                <Card key={fila.idPregunta} role="group" aria-label={`Pregunta ${fila.orden}`}>
                  <CardHeader>
                    <CardTitle>
                      <h2>
                        Pregunta {fila.orden} · {fila.puntajeObtenido} de {fila.puntajeMaximo}
                      </h2>
                    </CardTitle>
                    <p>{fila.enunciado}</p>
                  </CardHeader>
                  <CardContent className="grid gap-1 text-sm">
                    <StatusBadge
                      vocabulario="respuesta"
                      valor={fila.correcto ? 'correcta' : 'incorrecta'}
                      className="w-fit"
                    />
                    <p>Su respuesta: {fila.respuestaAlumno ?? 'Sin responder'}</p>
                    <p>Respuesta correcta: {fila.respuestaCorrecta}</p>
                    {fila.explicacion !== null && <p className="text-muted-foreground">{fila.explicacion}</p>}
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : (
            <Alert>
              <AlertDescription>{TEXTO_RESULTADO_SIN_DETALLE}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </>
  )
}

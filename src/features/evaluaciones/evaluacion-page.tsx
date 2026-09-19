import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Enlace, EnlaceExterno } from '@/components/enlace'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { etiquetaCategoria } from '@/lib/dominio/categorias'
import { esBajoEstandar } from '@/lib/dominio/dirbe'
import { MOTIVO_NO_ES_ULTIMA } from '@/lib/dominio/evaluacion'
import { CLASES_ETIQUETA_DEBRIEFING } from '@/lib/dominio/tonos'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasEvaluaciones, useEliminarEvaluacion } from './api'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

export function EvaluacionPage({ codigo }: { codigo: string }) {
  const { data: evaluacion } = useSuspenseQuery(consultasEvaluaciones.detalle(codigo))
  const puedeModificar = usePuede('Modify Evaluations')
  const navegar = useNavigate()
  const eliminar = useEliminarEvaluacion()
  const ultima = useQuery({
    ...consultasEvaluaciones.ultima(evaluacion.codPersona, evaluacion.programa),
    enabled: puedeModificar,
  })
  const esUltima = ultima.data === evaluacion.codigo
  const errorDeUltima = errorDePrimeraCarga(ultima)

  function confirmarEliminacion() {
    eliminar.mutate(evaluacion.codigo, {
      onSuccess: (mensaje) => {
        toast.success(mensaje)
        void navegar({ to: '/evaluaciones', search: { alumno: evaluacion.codPersona } })
      },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
    })
  }

  return (
    <>
      <PageHeader
        titulo={evaluacion.nombre}
        descripcion={`${evaluacion.codigo} · ${evaluacion.alumno}`}
        acciones={
          puedeModificar && (
            <>
              {esUltima ? (
                <Button variant="outline" asChild>
                  <Link to="/evaluaciones/$cod/editar" params={{ cod: evaluacion.codigo }}>
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
                  <Button variant="destructive" disabled={!esUltima || eliminar.isPending}>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                }
                titulo="¿Eliminar la evaluación?"
                descripcion={`Se eliminará la evaluación ${evaluacion.codigo} de ${evaluacion.alumno} y se revertirá su efecto en el estado del alumno.`}
                confirmar="Eliminar"
                destructivo
                alConfirmar={confirmarEliminacion}
              />
            </>
          )
        }
      />
      {puedeModificar && errorDeUltima !== null && (
        <AvisoDeError
          titulo="No se pudo identificar la última evaluación"
          error={errorDeUltima}
          alReintentar={() => void ultima.refetch()}
        />
      )}
      {puedeModificar && ultima.data !== undefined && !esUltima && (
        <p className="text-sm text-muted-foreground">{MOTIVO_NO_ES_ULTIMA}</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Resultado</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Dato etiqueta="Promedio">
              <span className="text-lg tabular-nums">{formatearNota(evaluacion.promedio)}</span>
            </Dato>
            <Dato etiqueta="Clasificación">
              {evaluacion.clasificacion ? (
                <StatusBadge vocabulario="clasificacion" valor={evaluacion.clasificacion} />
              ) : (
                '—'
              )}
            </Dato>
            <Dato etiqueta="Categoría">
              {evaluacion.categoria ? etiquetaCategoria(evaluacion.categoria) : evaluacion.categoriaTexto}
            </Dato>
            <Dato etiqueta="Estado del alumno">
              <StatusBadge vocabulario="estado" valor={evaluacion.estadoAlumno} />
            </Dato>
            <Dato etiqueta="Fecha">
              <span className="tabular-nums">{formatearFecha(evaluacion.fecha)}</span>
            </Dato>
            <Dato etiqueta="Fase">{evaluacion.fase}</Dato>
            <Dato etiqueta="Sub fase">{evaluacion.subFase}</Dato>
            <Dato etiqueta="Programa">{evaluacion.programa}</Dato>
            <Dato etiqueta="Evaluador">{evaluacion.evaluador}</Dato>
            <Dato etiqueta="Evaluación previa">
              {evaluacion.codEvalPrevia ? (
                <Enlace to="/evaluaciones/$cod" params={{ cod: evaluacion.codEvalPrevia }}>
                  {evaluacion.codEvalPrevia}
                </Enlace>
              ) : (
                '—'
              )}
            </Dato>
            <Dato etiqueta="Material de respaldo">
              {evaluacion.archivoUrl ? (
                <EnlaceExterno href={evaluacion.archivoUrl} target="_blank" rel="noreferrer">
                  Abrir enlace
                </EnlaceExterno>
              ) : (
                '—'
              )}
            </Dato>
          </dl>
          {evaluacion.recomendacion && (
            <div className="mt-4 grid gap-1">
              <p className="text-xs text-muted-foreground">Recomendación general</p>
              <p className="text-sm">{evaluacion.recomendacion}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label="Calificaciones por maniobra">
          <TableHeader>
            <TableRow>
              <TableHead>Maniobra</TableHead>
              <TableHead>Nota mínima</TableHead>
              <TableHead>Nota obtenida</TableHead>
              <TableHead className={CLASES_ETIQUETA_DEBRIEFING.causa}>Causa</TableHead>
              <TableHead className={CLASES_ETIQUETA_DEBRIEFING.observacion}>Observación</TableHead>
              <TableHead className={CLASES_ETIQUETA_DEBRIEFING.recomendacion}>Recomendación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluacion.calificaciones.map((calificacion) => (
              <TableRow
                key={calificacion.idManiobra}
                data-bajo-estandar={esBajoEstandar(calificacion.notaMin, calificacion.nota)}
              >
                <TableCell className="font-medium">{calificacion.maniobra}</TableCell>
                <TableCell>
                  <StatusBadge vocabulario="calificativo" valor={calificacion.notaMin} />
                </TableCell>
                <TableCell>
                  <StatusBadge vocabulario="calificativo" valor={calificacion.nota} />
                </TableCell>
                <TableCell className="whitespace-normal">{calificacion.causa ?? '—'}</TableCell>
                <TableCell className="whitespace-normal">{calificacion.observacion ?? '—'}</TableCell>
                <TableCell className="whitespace-normal">{calificacion.recomendacion ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

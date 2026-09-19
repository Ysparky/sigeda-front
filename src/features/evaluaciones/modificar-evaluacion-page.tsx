import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { MOTIVO_NO_ES_ULTIMA } from '@/lib/dominio/evaluacion'
import { consultasEvaluaciones, useModificarEvaluacion } from './api'
import { FormularioEvaluacion } from './components/formulario-evaluacion'
import { valoresDeEvaluacion } from './schemas'

export function ModificarEvaluacionPage({ codigo }: { codigo: string }) {
  const { data: evaluacion } = useSuspenseQuery(consultasEvaluaciones.detalle(codigo))
  const ultima = useQuery(consultasEvaluaciones.ultima(evaluacion.codPersona, evaluacion.programa))
  const guardar = useModificarEvaluacion(codigo)
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/evaluaciones/$cod" params={{ cod: codigo }}>
        Volver a la evaluación
      </Link>
    </Button>
  )

  function contenido() {
    if (ultima.isPending) return <Skeleton className="h-64 w-full" />
    if (ultima.isError && ultima.data === undefined) {
      return (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>No se pudo identificar la última evaluación</AlertTitle>
          <AlertDescription>
            {ultima.error instanceof ApiError ? ultima.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )
    }
    if (ultima.data !== evaluacion.codigo || evaluacion.categoria === null) {
      return (
        <Alert>
          <CircleAlert />
          <AlertTitle>No disponible</AlertTitle>
          <AlertDescription>{MOTIVO_NO_ES_ULTIMA}</AlertDescription>
        </Alert>
      )
    }
    return (
      <FormularioEvaluacion
        valoresIniciales={valoresDeEvaluacion(
          evaluacion.calificaciones.map((calificacion) => ({
            idManiobra: calificacion.idManiobra,
            maniobra: calificacion.maniobra,
            notaMin: calificacion.notaMin,
            nota: calificacion.nota,
            causa: calificacion.causa,
            observacion: calificacion.observacion,
            recomendacion: calificacion.recomendacion,
          })),
          {
            nombre: evaluacion.nombre,
            categoria: evaluacion.categoria,
            recomendacion: evaluacion.recomendacion ?? '',
            url: evaluacion.archivoUrl ?? '',
          },
        )}
        categorias={[evaluacion.categoria]}
        categoriaFija
        guardar={guardar}
        cancelar={
          <Link to="/evaluaciones/$cod" params={{ cod: codigo }}>
            Cancelar
          </Link>
        }
      />
    )
  }

  return (
    <>
      <PageHeader
        titulo="Modificar evaluación"
        descripcion={`${evaluacion.codigo} · ${evaluacion.alumno} · Evaluador: ${evaluacion.evaluador}`}
        acciones={volver}
      />
      {contenido()}
    </>
  )
}

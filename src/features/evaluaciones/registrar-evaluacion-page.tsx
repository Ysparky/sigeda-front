import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Enlace } from '@/components/enlace'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { consultasTurnos } from '@/features/turnos/api'
import { useSesion } from '@/lib/auth/use-sesion'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { consultasEvaluaciones, useRegistrarEvaluacion } from './api'
import { FormularioEvaluacion } from './components/formulario-evaluacion'
import { valoresDeEvaluacion } from './schemas'

export const MENSAJE_SOLO_INSTRUCTOR = 'Solo el instructor asignado al turno puede registrar esta evaluación.'

function Aviso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Alert>
      <CircleAlert />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function RegistrarEvaluacionPage({ id, codAlumno }: { id: number; codAlumno: string }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const actual = useSesion()
  const esSuInstructor = actual?.codPersona != null && actual.codPersona === turno.codInstructor
  const existentes = useQuery({ ...consultasEvaluaciones.delTurno(codAlumno, id), enabled: esSuInstructor })
  const categorias = useQuery({ ...consultasEvaluaciones.sugerencias(codAlumno), enabled: esSuInstructor })
  const guardar = useRegistrarEvaluacion(id, codAlumno)
  const alumno = turno.alumnos.find((candidato) => candidato.codAlumno === codAlumno)
  const volver = (
    <Link to="/turnos/$id" params={{ id: String(id) }}>
      Volver al turno
    </Link>
  )

  function contenido() {
    if (!esSuInstructor) return <Aviso titulo="No disponible">{MENSAJE_SOLO_INSTRUCTOR}</Aviso>
    if (existentes.isPending || categorias.isPending) return <Skeleton className="h-64 w-full" />
    const enCurso = guardar.isPending || guardar.isSuccess
    const registrada = existentes.data?.[0]
    if (registrada && !enCurso) {
      return (
        <Aviso titulo="Evaluación registrada">
          <p>La evaluación ya ha sido registrada.</p>
          <Enlace to="/evaluaciones/$cod" params={{ cod: registrada.codigo }} className="mt-2 inline-block">
            Ver evaluación {registrada.codigo}
          </Enlace>
        </Aviso>
      )
    }
    const fallo = (existentes.data === undefined ? existentes.error : null) ?? (categorias.data === undefined ? categorias.error : null)
    if (fallo) {
      return (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>No se pudieron cargar los datos de la evaluación</AlertTitle>
          <AlertDescription>{fallo instanceof ApiError ? fallo.message : MENSAJE_GENERICO}</AlertDescription>
        </Alert>
      )
    }
    const sugeridas = categorias.data ?? []
    if (sugeridas.length === 0 && !enCurso) {
      return (
        <Aviso titulo="Sin categorías disponibles">
          El estado actual del alumno no habilita ninguna categoría de evaluación.
        </Aviso>
      )
    }
    return (
      <FormularioEvaluacion
        valoresIniciales={valoresDeEvaluacion(
          turno.maniobras.map((item) => ({
            idManiobra: item.maniobra.id,
            maniobra: item.maniobra.nombre,
            notaMin: item.notaMin,
          })),
          { categoria: sugeridas.length === 1 ? sugeridas[0] : '', codEvaluador: actual?.codPersona ?? '' },
        )}
        categorias={sugeridas}
        guardar={guardar}
        cancelar={
          <Link to="/turnos/$id" params={{ id: String(id) }}>
            Cancelar
          </Link>
        }
      />
    )
  }

  return (
    <>
      <PageHeader
        titulo="Registrar evaluación"
        descripcion={`${alumno?.alumno ?? codAlumno} · ${turno.nombre} · ${turno.subfase}`}
        acciones={
          <Button variant="outline" asChild>
            {volver}
          </Button>
        }
      />
      {contenido()}
    </>
  )
}

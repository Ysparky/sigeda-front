import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Enlace } from '@/components/enlace'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { consultasSimulador } from '@/features/simulador/api'
import { consultasTurnos } from '@/features/turnos/api'
import { useSesion } from '@/lib/auth/use-sesion'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasEvaluaciones, useRegistrarEvaluacion } from './api'
import { CargarSesionSimulador } from './components/cargar-sesion'
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
  const esSimulador = turno.medio === 'SIMULADOR'
  const existentes = useQuery({ ...consultasEvaluaciones.delTurno(codAlumno, id), enabled: esSuInstructor })
  const categorias = useQuery({ ...consultasEvaluaciones.sugerencias(codAlumno), enabled: esSuInstructor })
  const propuesta = useQuery(consultasSimulador.propuesta(id, codAlumno, esSuInstructor && esSimulador))
  const guardar = useRegistrarEvaluacion(id, codAlumno)
  const alumno = turno.alumnos.find((candidato) => candidato.codAlumno === codAlumno)
  const volver = (
    <Link to="/turnos/$id" params={{ id: String(id) }}>
      Volver al turno
    </Link>
  )

  function reintentar() {
    for (const consulta of [existentes, categorias]) {
      if (consulta.isError) void consulta.refetch()
    }
  }

  function contenido() {
    if (!esSuInstructor) return <Aviso titulo="No disponible">{MENSAJE_SOLO_INSTRUCTOR}</Aviso>
    if (existentes.isPending || categorias.isPending || (esSimulador && propuesta.isPending))
      return <Skeleton className="h-64 w-full" />
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
    const fallo = errorDePrimeraCarga(existentes, categorias)
    if (fallo !== null) {
      return (
        <AvisoDeError
          titulo="No se pudieron cargar los datos de la evaluación"
          error={fallo}
          alReintentar={reintentar}
        />
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
    const propuestaPorManiobra = new Map((propuesta.data?.calificaciones ?? []).map((item) => [item.idManiobra, item]))
    const hayPropuesta = [...propuestaPorManiobra.values()].some((item) => item.notaPropuesta !== null)
    return (
      <div className="grid gap-6">
        {esSimulador && (
          <CargarSesionSimulador idTurno={id} codAlumno={codAlumno} dispositivo={turno.dispositivo} />
        )}
        {esSimulador && hayPropuesta && (
          <Aviso titulo="Calificación propuesta por el simulador">
            Las letras vienen prellenadas de la telemetría; revíselas y corrija lo que haga falta antes de firmar. Las
            maniobras sin medición quedan en blanco.
          </Aviso>
        )}
        <FormularioEvaluacion
          valoresIniciales={valoresDeEvaluacion(
            turno.maniobras.map((item) => {
              const propuesto = propuestaPorManiobra.get(item.maniobra.id)
              return {
                idManiobra: item.maniobra.id,
                maniobra: item.maniobra.nombre,
                notaMin: item.notaMin,
                nota: propuesto?.notaPropuesta ?? undefined,
                observacion: propuesto?.observacion ?? undefined,
              }
            }),
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
      </div>
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

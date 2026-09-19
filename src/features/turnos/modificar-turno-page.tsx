import { useQueries, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { consultasCatalogos, type Programa } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { MOTIVO_TURNO_VENCIDO, permiteCambios } from '@/lib/dominio/turno'
import { consultasTurnos } from './api'
import { FormularioTurno } from './components/formulario-turno'
import { valoresDesdeTurno } from './schemas'

export function ModificarTurnoPage({ id }: { id: number }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const programa: Programa = turno.programa === 'PDE' ? 'PDE' : 'PDI'
  const subfases = useQuery(consultasCatalogos.subfases())
  const idSubfase = subfases.data?.find((subfase) => subfase.nombre === turno.subfase)?.id
  const catalogos = useQueries({
    queries: [
      consultasCatalogos.aeronaves(),
      consultasCatalogos.instructores(programa),
      consultasCatalogos.alumnos('programacion', programa, null),
      consultasCatalogos.maniobras(idSubfase ?? 0),
    ],
  })
  const listo = subfases.isSuccess && catalogos.every((consulta) => consulta.isSuccess || (consulta.isPending && consulta.fetchStatus === 'idle'))
  const primerError = subfases.error ?? catalogos.find((consulta) => consulta.error)?.error
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/turnos/$id" params={{ id: String(turno.id) }}>
        Volver al turno
      </Link>
    </Button>
  )

  if (!permiteCambios(turno.fechaEval)) {
    return (
      <>
        <PageHeader titulo="Modificar turno" descripcion={turno.nombre} acciones={volver} />
        <Alert>
          <CircleAlert />
          <AlertTitle>No disponible</AlertTitle>
          <AlertDescription>{MOTIVO_TURNO_VENCIDO}</AlertDescription>
        </Alert>
      </>
    )
  }

  if (primerError) {
    return (
      <>
        <PageHeader titulo="Modificar turno" descripcion={turno.nombre} acciones={volver} />
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>No se pudieron cargar los datos del formulario</AlertTitle>
          <AlertDescription>
            {primerError instanceof ApiError ? primerError.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader titulo="Modificar turno" descripcion={turno.nombre} acciones={volver} />
      {listo ? (
        <FormularioTurno valoresIniciales={valoresDesdeTurno(turno, idSubfase)} idTurno={turno.id} />
      ) : (
        <div className="grid gap-3" aria-busy="true">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
    </>
  )
}

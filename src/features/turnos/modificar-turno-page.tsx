import { useQueries, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { consultasCatalogos, type Programa } from '@/features/catalogos/api'
import { MOTIVO_TURNO_VENCIDO, permiteCambios } from '@/lib/dominio/turno'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnos } from './api'
import { FormularioTurno } from './components/formulario-turno'
import { valoresDesdeTurno } from './schemas'

export function ModificarTurnoPage({ id }: { id: number }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const programa: Programa = turno.programa === 'PDE' ? 'PDE' : 'PDI'
  const subfases = useQuery(consultasCatalogos.subfases())
  const idSubfase = turno.idSubfase ?? subfases.data?.find((subfase) => subfase.nombre === turno.subfase)?.id
  const catalogos = useQueries({
    queries: [
      consultasCatalogos.aeronaves(),
      consultasCatalogos.instructores(programa),
      consultasCatalogos.alumnos('programacion', programa, null),
      consultasCatalogos.maniobras(idSubfase ?? 0),
    ],
  })
  const listo =
    subfases.data !== undefined &&
    catalogos.every((consulta) => consulta.data !== undefined || (consulta.isPending && consulta.fetchStatus === 'idle'))
  const primerError = errorDePrimeraCarga(subfases, ...catalogos)
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/turnos/$id" params={{ id: String(turno.id) }}>
        Volver al turno
      </Link>
    </Button>
  )

  function reintentar() {
    for (const consulta of [subfases, ...catalogos]) {
      if (consulta.isError) void consulta.refetch()
    }
  }

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

  if (primerError !== null) {
    return (
      <>
        <PageHeader titulo="Modificar turno" descripcion={turno.nombre} acciones={volver} />
        <AvisoDeError
          titulo="No se pudieron cargar los datos del formulario"
          error={primerError}
          alReintentar={reintentar}
        />
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

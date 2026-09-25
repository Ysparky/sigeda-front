import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/errors'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasExamenes, type ExamenEnCurso } from './api'
import { ResolucionDeExamen } from './components/resolucion-de-examen'
import { esExamenEntregado, esExamenNoDisponible } from './mensajes'
import { useAutoguardado } from './use-autoguardado'

function Examen({ examen }: { examen: ExamenEnCurso }) {
  const { respuestas, estado, responder, guardarAhora } = useAutoguardado(examen)
  return (
    <ResolucionDeExamen
      examen={examen}
      respuestas={respuestas}
      estado={estado}
      bloqueado={false}
      alResponder={responder}
      alReintentar={() => void guardarAhora()}
    />
  )
}

export function RendirExamenPage({ idTurno }: { idTurno: number }) {
  const sesion = useSesion()
  const codAlumno = sesion?.codPersona ?? ''
  const examen = useQuery(consultasExamenes.enCurso(idTurno, codAlumno))
  const error = errorDePrimeraCarga(examen)

  return (
    <>
      <PageHeader
        titulo={examen.data?.turnoTeorico ?? PANTALLAS.rendirExamen.titulo}
        descripcion={PANTALLAS.rendirExamen.descripcion}
      />
      <AvisoDeTeoria accion="rendirExamen" />
      {esExamenEntregado(error) ? (
        <Alert>
          <AlertDescription className="grid gap-3">
            <span>{(error as ApiError).message}</span>
            <Button variant="outline" size="sm" className="justify-self-start" asChild>
              <Link to="/examenes/$id/resultado" params={{ id: String(idTurno) }}>
                Ver el resultado
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : esExamenNoDisponible(error) ? (
        <Alert>
          <AlertDescription>{(error as ApiError).message}</AlertDescription>
        </Alert>
      ) : error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void examen.refetch()} />
      ) : examen.data === undefined ? (
        <Skeleton className="h-64 w-full" aria-busy="true" />
      ) : (
        <Examen examen={examen.data} />
      )}
    </>
  )
}

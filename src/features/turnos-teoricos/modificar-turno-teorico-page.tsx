import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_TEORIA_SOLO_MOCK, TEXTO_VENTANA_COMENZADA } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnosTeoricos } from './api'
import { FormularioTurnoTeorico } from './components/formulario-turno-teorico'
import { valoresDesdeTurnoTeorico } from './schemas'

export function ModificarTurnoTeoricoPage({ id }: { id: number }) {
  const turno = useQuery(consultasTurnosTeoricos.detalle(id))
  const error = errorDePrimeraCarga(turno)

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.modificarTurnoTeorico.titulo}
        descripcion={PANTALLAS.modificarTurnoTeorico.descripcion}
      />
      <AvisoDeDependencia accion="programarTurnoTeorico" texto={TEXTO_TEORIA_SOLO_MOCK} />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void turno.refetch()} />
      ) : turno.data === undefined ? (
        <Skeleton className="h-64 w-full" aria-busy="true" />
      ) : turno.data.estado !== 'PROGRAMADO' ? (
        <Alert>
          <AlertDescription className="grid gap-3">
            <span>{TEXTO_VENTANA_COMENZADA}</span>
            <Button variant="outline" size="sm" className="justify-self-start" asChild>
              <Link to="/teoria/turnos/$id" params={{ id: String(id) }}>
                Ver los resultados
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <FormularioTurnoTeorico valoresIniciales={valoresDesdeTurnoTeorico(turno.data)} idTurno={id} />
      )}
    </>
  )
}

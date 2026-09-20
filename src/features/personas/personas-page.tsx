import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasPersonas } from './api'
import { COLUMNAS_PERSONAS } from './columnas'

const ruta = getRouteApi('/_app/personas/')

export function PersonasPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const personas = useQuery(consultasPersonas.lista(busqueda))
  const error = errorDePrimeraCarga(personas)
  const puedeRegistrar = accionDisponible('registrarPersona')

  return (
    <>
      <PageHeader
        titulo="Personas"
        descripcion="Alumnos, instructores y personal con su cuenta de acceso."
        acciones={
          puedeRegistrar ? (
            <Button asChild>
              <Link to="/personas/nueva">
                <UserPlus aria-hidden />
                Registrar persona
              </Link>
            </Button>
          ) : (
            <div className="grid justify-items-end gap-1">
              <Button disabled>
                <UserPlus aria-hidden />
                Registrar persona
              </Button>
              <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
            </div>
          )
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void personas.refetch()} />
      ) : (
        <DataTable
          etiqueta="Personas registradas"
          columnas={COLUMNAS_PERSONAS}
          pagina={personas.data}
          cargando={personas.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(persona) => persona.codigo}
          vacio={<EmptyState titulo="No hay personas registradas" descripcion="Registre la primera persona del curso." />}
        />
      )}
    </>
  )
}

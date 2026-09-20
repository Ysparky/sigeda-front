import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasGrupos } from './api'
import { COLUMNAS_GRUPOS } from './columnas'

const ruta = getRouteApi('/_app/grupos/')

export function GruposPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const grupos = useQuery(consultasGrupos.lista(busqueda))
  const error = errorDePrimeraCarga(grupos)

  return (
    <>
      <PageHeader
        titulo="Grupos"
        descripcion="Grupos de alumnos por programa."
        acciones={
          <Button asChild>
            <Link to="/grupos/nuevo">
              <Plus aria-hidden />
              Registrar grupo
            </Link>
          </Button>
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void grupos.refetch()} />
      ) : (
        <DataTable
          etiqueta="Grupos registrados"
          columnas={COLUMNAS_GRUPOS}
          pagina={grupos.data}
          cargando={grupos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(grupo) => String(grupo.id)}
          vacio={
            <EmptyState
              titulo="No hay grupos registrados"
              descripcion="Cree el primer grupo del programa."
              accion={
                <Button asChild size="sm">
                  <Link to="/grupos/nuevo">Registrar grupo</Link>
                </Button>
              }
            />
          }
        />
      )}
    </>
  )
}

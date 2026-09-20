import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { usePuede } from '@/lib/auth/use-sesion'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasManiobras } from './api'
import { COLUMNAS_MANIOBRAS } from './columnas'

const ruta = getRouteApi('/_app/programa/maniobras/')

export function ManiobrasPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const puedeGestionar = usePuede('Manage Maneuvers')
  const maniobras = useQuery(consultasManiobras.lista(busqueda))
  const error = errorDePrimeraCarga(maniobras)

  return (
    <>
      <PageHeader
        titulo="Maniobras"
        descripcion="Maniobras del programa y sus estándares."
        acciones={
          puedeGestionar && (
            <Button asChild>
              <Link to="/programa/maniobras/nueva">
                <Plus aria-hidden />
                Registrar maniobra
              </Link>
            </Button>
          )
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void maniobras.refetch()} />
      ) : (
        <DataTable
          etiqueta="Maniobras del programa"
          columnas={COLUMNAS_MANIOBRAS}
          pagina={maniobras.data}
          cargando={maniobras.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(maniobra) => String(maniobra.id)}
          vacio={<EmptyState titulo="No hay maniobras registradas" descripcion="Registre la primera maniobra." />}
        />
      )}
    </>
  )
}

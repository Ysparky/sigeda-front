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
import { consultasFases } from './api'
import { COLUMNAS_FASES } from './columnas'

const ruta = getRouteApi('/_app/programa/fases/')

export function FasesPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const puedeGestionar = usePuede('Manage Phases')
  const fases = useQuery(consultasFases.lista(busqueda))
  const error = errorDePrimeraCarga(fases)

  return (
    <>
      <PageHeader
        titulo="Fases y subfases"
        descripcion="Estructura del programa de instrucción."
        acciones={
          puedeGestionar && (
            <Button asChild>
              <Link to="/programa/fases/nueva">
                <Plus aria-hidden />
                Registrar fase
              </Link>
            </Button>
          )
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void fases.refetch()} />
      ) : (
        <DataTable
          etiqueta="Fases del programa"
          columnas={COLUMNAS_FASES}
          pagina={fases.data}
          cargando={fases.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(fase) => String(fase.id)}
          vacio={<EmptyState titulo="No hay fases registradas" descripcion="Registre la primera fase del programa." />}
        />
      )}
    </>
  )
}

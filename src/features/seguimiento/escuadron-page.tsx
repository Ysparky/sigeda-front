import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { TEXTO_SIN_ALUMNOS_EN_PROGRAMA } from '@/lib/dominio/seguimiento'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento, fuenteDeSeguimiento, paginarAlumnos } from './api'
import { COLUMNAS_ESCUADRON } from './columnas'

const ruta = getRouteApi('/_app/seguimiento/')

export function EscuadronPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const actual = useSesion()
  const fuente = actual === null ? null : fuenteDeSeguimiento(actual.permisos)
  const alumnos = useQuery({
    ...consultasSeguimiento.alumnos(fuente ?? 'instructor', busqueda.programa, actual?.codPersona ?? null),
    enabled: fuente !== null,
  })
  const error = errorDePrimeraCarga(alumnos)
  const pagina = alumnos.data === undefined ? undefined : paginarAlumnos(alumnos.data, busqueda)

  return (
    <>
      <PageHeader titulo={PANTALLAS.escuadron.titulo} descripcion={PANTALLAS.escuadron.descripcion} />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void alumnos.refetch()} />
      ) : (
        <DataTable
          etiqueta="Alumnos del escuadrón"
          columnas={COLUMNAS_ESCUADRON}
          pagina={pagina}
          cargando={alumnos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(alumno) => alumno.codigo}
          vacio={<EmptyState titulo="No hay alumnos" descripcion={TEXTO_SIN_ALUMNOS_EN_PROGRAMA} />}
        />
      )}
    </>
  )
}

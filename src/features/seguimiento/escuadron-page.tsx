import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { accionDisponible } from '@/lib/dependencias'
import {
  TEXTO_ALUMNOS_SIN_COINCIDENCIAS,
  TEXTO_ESTADO_TEORICO_EN_LOTE,
  TEXTO_SIN_ALUMNOS_ASIGNADOS,
  TEXTO_SIN_ALUMNOS_EN_PROGRAMA,
} from '@/lib/dominio/seguimiento'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento, filtrarAlumnos, fuenteDeSeguimiento, paginarAlumnos } from './api'
import { columnasEscuadron } from './columnas'
import { FiltrosEscuadron } from './components/filtros-escuadron'
import { ResumenDeEstados } from './components/resumen-de-estados'
import type { BusquedaEscuadron } from './schemas'

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
  const visibles = filtrarAlumnos(alumnos.data ?? [], busqueda)

  const conTeorica = accionDisponible('verBloqueoTeoricoLote')
  const codigos = pagina?.items.map((alumno) => alumno.codigo) ?? []
  const teorico = useQuery({
    ...consultasSeguimiento.estadoTeorico(codigos),
    enabled: conTeorica && codigos.length > 0,
  })
  const mapaTeorico = conTeorica
    ? new Map((teorico.data ?? []).map((fila) => [fila.codAlumno, fila.bloqueadoPorSubsanacion]))
    : null

  function cambiar(cambios: Partial<BusquedaEscuadron>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const sinCatalogo = (alumnos.data ?? []).length === 0
  const vacio =
    sinCatalogo && fuente === 'instructor' ? (
      <EmptyState titulo="No tiene alumnos asignados" descripcion={TEXTO_SIN_ALUMNOS_ASIGNADOS} />
    ) : sinCatalogo ? (
      <EmptyState titulo="No hay alumnos" descripcion={TEXTO_SIN_ALUMNOS_EN_PROGRAMA} />
    ) : (
      <EmptyState titulo="Ningún alumno coincide" descripcion={TEXTO_ALUMNOS_SIN_COINCIDENCIAS} />
    )

  return (
    <>
      <PageHeader titulo={PANTALLAS.escuadron.titulo} descripcion={PANTALLAS.escuadron.descripcion} />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void alumnos.refetch()} />
      ) : (
        <>
          <FiltrosEscuadron busqueda={busqueda} alumnos={alumnos.data ?? []} alCambiar={cambiar} />
          <ResumenDeEstados alumnos={visibles} />
          {conTeorica && teorico.isError && (
            <Alert>
              <AlertDescription>{TEXTO_ESTADO_TEORICO_EN_LOTE}</AlertDescription>
            </Alert>
          )}
          <DataTable
            etiqueta="Alumnos del escuadrón"
            columnas={columnasEscuadron({ estadoTeorico: mapaTeorico })}
            pagina={pagina}
            cargando={alumnos.isFetching}
            parametros={busqueda}
            alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
            idDeFila={(alumno) => alumno.codigo}
            vacio={vacio}
          />
        </>
      )}
    </>
  )
}

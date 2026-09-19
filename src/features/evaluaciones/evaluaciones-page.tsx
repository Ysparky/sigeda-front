import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { CircleAlert, UserSearch } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { agruparPorGrupo, consultasCatalogos, fuenteDeAlumnos } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede, useSesion } from '@/lib/auth/use-sesion'
import { MOTIVO_NO_ES_ULTIMA } from '@/lib/dominio/evaluacion'
import { consultasEvaluaciones } from './api'
import { FiltrosEvaluaciones } from './components/filtros-evaluaciones'
import { TablaEvaluaciones } from './components/tabla-evaluaciones'
import type { BusquedaEvaluaciones } from './schemas'

const ruta = getRouteApi('/_app/evaluaciones/')

export function EvaluacionesPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const actual = useSesion()
  const puedeModificar = usePuede('Modify Evaluations')
  const fuente = actual ? fuenteDeAlumnos(actual.permisos) : null
  const alumnos = useQuery({
    ...consultasCatalogos.alumnos(fuente ?? 'todos', busqueda.programa, actual?.codPersona ?? null),
    enabled: fuente !== null,
  })
  const ultima = useQuery({
    ...consultasEvaluaciones.ultima(busqueda.alumno ?? '', busqueda.programa),
    enabled: puedeModificar && busqueda.alumno !== undefined,
  })

  function cambiar(cambios: Partial<BusquedaEvaluaciones>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  return (
    <>
      <PageHeader titulo="Evaluaciones" descripcion="Evaluaciones prácticas de cada alumno." />
      <FiltrosEvaluaciones filtros={busqueda} alCambiar={cambiar}>
        <Field>
          <FieldLabel htmlFor="filtro-alumno">Alumno</FieldLabel>
          <NativeSelect
            id="filtro-alumno"
            className="w-full"
            value={busqueda.alumno ?? ''}
            onChange={(evento) => cambiar({ alumno: evento.target.value === '' ? undefined : evento.target.value })}
          >
            <NativeSelectOption value="">Elija un alumno</NativeSelectOption>
            {agruparPorGrupo(alumnos.data ?? []).map(([grupo, lista]) => (
              <NativeSelectOptGroup key={grupo} label={grupo}>
                {lista.map((alumno) => (
                  <NativeSelectOption key={alumno.codigo} value={alumno.codigo}>
                    {alumno.nombreCompleto}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </Field>
      </FiltrosEvaluaciones>
      {alumnos.isError && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>No se pudieron cargar los alumnos</AlertTitle>
          <AlertDescription>
            {alumnos.error instanceof ApiError ? alumnos.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      {busqueda.alumno === undefined ? (
        <EmptyState
          icono={UserSearch}
          titulo="Elija un alumno para ver sus evaluaciones"
          descripcion="Las evaluaciones se consultan por alumno."
        />
      ) : (
        <>
          {puedeModificar &&
            (ultima.isError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>No se pudo identificar la última evaluación</AlertTitle>
                <AlertDescription>
                  {ultima.error instanceof ApiError ? ultima.error.message : MENSAJE_GENERICO}
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">{MOTIVO_NO_ES_ULTIMA}</p>
            ))}
          <TablaEvaluaciones
            codPersona={busqueda.alumno}
            filtros={busqueda}
            alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
            conAlumno
            ultima={ultima.data ?? null}
            puedeModificar={puedeModificar}
          />
        </>
      )}
    </>
  )
}

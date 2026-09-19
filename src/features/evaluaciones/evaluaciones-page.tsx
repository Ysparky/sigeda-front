import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { UserSearch } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { agruparPorGrupo, consultasCatalogos, fuenteDeAlumnos } from '@/features/catalogos/api'
import { usePuede, useSesion } from '@/lib/auth/use-sesion'
import { MOTIVO_NO_ES_ULTIMA } from '@/lib/dominio/evaluacion'
import { errorDePrimeraCarga } from '@/lib/query'
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
  const errorDeAlumnos = errorDePrimeraCarga(alumnos)
  const errorDeUltima = errorDePrimeraCarga(ultima)

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
      {errorDeAlumnos !== null && (
        <AvisoDeError
          titulo="No se pudieron cargar los alumnos"
          error={errorDeAlumnos}
          alReintentar={() => void alumnos.refetch()}
        />
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
            (errorDeUltima !== null ? (
              <AvisoDeError
                titulo="No se pudo identificar la última evaluación"
                error={errorDeUltima}
                alReintentar={() => void ultima.refetch()}
              />
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

import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { consultasSeguimiento, fuenteDeSeguimiento } from '@/features/seguimiento/api'
import { useSesion } from '@/lib/auth/use-sesion'
import { etiquetaDeGrupo } from '@/lib/dominio/seguimiento'
import { errorDePrimeraCarga } from '@/lib/query'
import type { BusquedaReportes } from '@/features/seguimiento/schemas'

type Props = {
  busqueda: BusquedaReportes
  alCambiar: (cambios: Partial<BusquedaReportes>) => void
}

export function FiltrosReportes({ busqueda, alCambiar }: Props) {
  const actual = useSesion()
  const fuente = actual === null ? null : fuenteDeSeguimiento(actual.permisos)
  const alumnos = useQuery({
    ...consultasSeguimiento.alumnos(fuente ?? 'instructor', busqueda.programa, actual?.codPersona ?? null),
    enabled: fuente !== null,
  })

  const grupos = [
    ...new Set(
      (alumnos.data ?? []).map((alumno) => alumno.idGrupo).filter((idGrupo): idGrupo is number => idGrupo !== null),
    ),
  ].sort((izquierdo, derecho) => izquierdo - derecho)

  const hayFiltros = busqueda.idGrupo !== undefined

  return (
    <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <Field>
        <FieldLabel htmlFor="filtro-programa">Programa</FieldLabel>
        <NativeSelect
          id="filtro-programa"
          className="w-full"
          value={busqueda.programa}
          onChange={(evento) => alCambiar({ programa: evento.target.value as Programa })}
        >
          {PROGRAMAS.map((programa) => (
            <NativeSelectOption key={programa} value={programa}>
              {programa}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-grupo">Grupo</FieldLabel>
        <NativeSelect
          id="filtro-grupo"
          className="w-full"
          value={busqueda.idGrupo ?? ''}
          onChange={(evento) =>
            alCambiar({ idGrupo: evento.target.value === '' ? undefined : Number(evento.target.value) })
          }
        >
          <NativeSelectOption value="">Todos</NativeSelectOption>
          {grupos.map((idGrupo) => (
            <NativeSelectOption key={idGrupo} value={idGrupo}>
              {etiquetaDeGrupo(idGrupo)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {errorDePrimeraCarga(alumnos) !== null && <FieldError>No se pudieron cargar los grupos.</FieldError>}
      </Field>
      <Button variant="ghost" disabled={!hayFiltros} onClick={() => alCambiar({ idGrupo: undefined })}>
        Limpiar filtros
      </Button>
    </section>
  )
}

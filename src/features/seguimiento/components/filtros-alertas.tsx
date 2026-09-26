import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { useSesion } from '@/lib/auth/use-sesion'
import { etiquetaDeGrupo, TIPOS_ALERTA } from '@/lib/dominio/seguimiento'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento, fuenteDeSeguimiento } from '../api'
import type { BusquedaAlertas } from '../schemas'

type Props = {
  busqueda: BusquedaAlertas
  alCambiar: (cambios: Partial<BusquedaAlertas>) => void
}

export function FiltrosAlertas({ busqueda, alCambiar }: Props) {
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

  const hayFiltros =
    busqueda.idGrupo !== undefined ||
    busqueda.tipo !== undefined ||
    busqueda.fechaPre !== undefined ||
    busqueda.fechaPost !== undefined

  return (
    <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
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
      <Field>
        <FieldLabel htmlFor="filtro-tipo">Tipo de alerta</FieldLabel>
        <NativeSelect
          id="filtro-tipo"
          className="w-full"
          value={busqueda.tipo ?? ''}
          onChange={(evento) => {
            const valor = TIPOS_ALERTA.find((tipo) => tipo.valor === evento.target.value)
            alCambiar({ tipo: valor?.valor })
          }}
        >
          <NativeSelectOption value="">Todos</NativeSelectOption>
          {TIPOS_ALERTA.map((tipo) => (
            <NativeSelectOption key={tipo.valor} value={tipo.valor}>
              {tipo.etiqueta}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-desde">Desde</FieldLabel>
        <Input
          id="filtro-desde"
          type="date"
          value={busqueda.fechaPre ?? ''}
          onChange={(evento) => alCambiar({ fechaPre: evento.target.value || undefined })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-hasta">Hasta</FieldLabel>
        <Input
          id="filtro-hasta"
          type="date"
          value={busqueda.fechaPost ?? ''}
          onChange={(evento) => alCambiar({ fechaPost: evento.target.value || undefined })}
        />
      </Field>
      <Button
        variant="ghost"
        disabled={!hayFiltros}
        onClick={() => alCambiar({ idGrupo: undefined, tipo: undefined, fechaPre: undefined, fechaPost: undefined })}
      >
        Limpiar filtros
      </Button>
    </section>
  )
}

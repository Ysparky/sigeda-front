import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasCatalogos, PROGRAMAS } from '@/features/catalogos/api'
import { errorDePrimeraCarga } from '@/lib/query'
import { CLASIFICACIONES_FILTRO, type FiltrosDeEvaluacion } from '../schemas'

type Props = {
  filtros: FiltrosDeEvaluacion
  alCambiar: (cambios: Partial<FiltrosDeEvaluacion>) => void
  children?: ReactNode
}

export function FiltrosEvaluaciones({ filtros, alCambiar, children }: Props) {
  const subfases = useQuery(consultasCatalogos.subfases())
  return (
    <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <Field>
        <FieldLabel htmlFor="filtro-programa">Programa</FieldLabel>
        <NativeSelect
          id="filtro-programa"
          className="w-full"
          value={filtros.programa}
          onChange={(evento) => alCambiar({ programa: evento.target.value === 'PDE' ? 'PDE' : 'PDI' })}
        >
          {PROGRAMAS.map((programa) => (
            <NativeSelectOption key={programa} value={programa}>
              {programa}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-subfase">Sub fase</FieldLabel>
        <NativeSelect
          id="filtro-subfase"
          className="w-full"
          value={filtros.idSubfase ?? ''}
          onChange={(evento) =>
            alCambiar({ idSubfase: evento.target.value === '' ? undefined : Number(evento.target.value) })
          }
        >
          <NativeSelectOption value="">Todas</NativeSelectOption>
          {(subfases.data ?? []).map((subfase) => (
            <NativeSelectOption key={subfase.id} value={subfase.id}>
              {subfase.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {errorDePrimeraCarga(subfases) !== null && <FieldError>No se pudieron cargar las sub fases.</FieldError>}
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-clasificacion">Clasificación</FieldLabel>
        <NativeSelect
          id="filtro-clasificacion"
          className="w-full"
          value={filtros.clasificacion ?? ''}
          onChange={(evento) => {
            const valor = CLASIFICACIONES_FILTRO.find((clasificacion) => clasificacion === evento.target.value)
            alCambiar({ clasificacion: valor })
          }}
        >
          <NativeSelectOption value="">Todas</NativeSelectOption>
          {CLASIFICACIONES_FILTRO.map((clasificacion) => (
            <NativeSelectOption key={clasificacion} value={clasificacion}>
              {clasificacion}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </section>
  )
}

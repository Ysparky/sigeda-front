import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { etiquetaDeGrupo } from '@/lib/dominio/seguimiento'
import { ESTADOS_ALUMNO, termino } from '@/lib/dominio/vocabulario'
import { MILISEGUNDOS_DE_REBOTE, useAccionRetardada } from '@/lib/use-retardo'
import type { AlumnoSeguimiento } from '../api'
import type { BusquedaEscuadron } from '../schemas'

type Props = {
  busqueda: BusquedaEscuadron
  alumnos: readonly AlumnoSeguimiento[]
  alCambiar: (cambios: Partial<BusquedaEscuadron>) => void
}

export function FiltrosEscuadron({ busqueda, alumnos, alCambiar }: Props) {
  const [texto, setTexto] = useState(busqueda.texto ?? '')
  const navegarConTexto = useAccionRetardada(
    (valor: string) => alCambiar({ texto: valor.trim() === '' ? undefined : valor }),
    MILISEGUNDOS_DE_REBOTE,
  )

  const grupos = [
    ...new Set(alumnos.map((alumno) => alumno.idGrupo).filter((idGrupo): idGrupo is number => idGrupo !== null)),
  ].sort((izquierdo, derecho) => izquierdo - derecho)

  const hayFiltros = busqueda.idGrupo !== undefined || busqueda.estado !== undefined || busqueda.texto !== undefined

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
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-estado">Estado</FieldLabel>
        <NativeSelect
          id="filtro-estado"
          className="w-full"
          value={busqueda.estado ?? ''}
          onChange={(evento) => alCambiar({ estado: evento.target.value === '' ? undefined : evento.target.value })}
        >
          <NativeSelectOption value="">Todos</NativeSelectOption>
          {Object.keys(ESTADOS_ALUMNO).map((valor) => (
            <NativeSelectOption key={valor} value={valor}>
              {termino('estado', valor).etiqueta}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-alumno">Alumno</FieldLabel>
        <Input
          id="filtro-alumno"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
            navegarConTexto(evento.target.value)
          }}
        />
      </Field>
      <Button
        variant="ghost"
        disabled={!hayFiltros}
        onClick={() => {
          setTexto('')
          alCambiar({ idGrupo: undefined, estado: undefined, texto: undefined })
        }}
      >
        Limpiar filtros
      </Button>
    </section>
  )
}

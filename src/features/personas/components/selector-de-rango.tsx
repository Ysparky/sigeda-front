import type { ComponentProps } from 'react'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

/** Los rangos del Escuadrón, de menor a mayor. */
const RANGOS = ['Cadete', 'Alférez', 'Teniente', 'Capitán', 'Mayor', 'Comandante', 'Coronel'] as const

/** Un rango registrado antes con otro texto se conserva como opción, para no perderlo al guardar. */
export function SelectorDeRango({ actual, ...props }: ComponentProps<typeof NativeSelect> & { actual?: string | null }) {
  const extra = actual && !(RANGOS as readonly string[]).includes(actual) ? actual : null
  return (
    <NativeSelect className="w-full" {...props}>
      <NativeSelectOption value="">Sin rango</NativeSelectOption>
      {RANGOS.map((rango) => (
        <NativeSelectOption key={rango} value={rango}>
          {rango}
        </NativeSelectOption>
      ))}
      {extra && <NativeSelectOption value={extra}>{extra}</NativeSelectOption>}
    </NativeSelect>
  )
}

import { cn } from '@/lib/utils'

const ESCALAS = [
  { clave: 'EN_PREPARACION', etiqueta: 'En preparación' },
  { clave: 'LISTA_PARA_PERICIA', etiqueta: 'Lista para pericia' },
  { clave: 'PERICIA_APROBADA', etiqueta: 'Pericia aprobada' },
  { clave: 'LICENCIA_EMITIDA', etiqueta: 'Licencia emitida' },
] as const

/** El estado de la ficha como una ruta con escalas: la observada se detiene antes de la pericia. */
export function RutaDeLicencia({ estado, className }: { estado: string; className?: string }) {
  const observada = estado === 'OBSERVADA'
  const alcanzada = observada ? 0 : Math.max(0, ESCALAS.findIndex((e) => e.clave === estado))
  return (
    <ol aria-label="Ruta de la licencia PP-H" className={cn('grid grid-cols-4 gap-1', className)}>
      {ESCALAS.map((escala, indice) => {
        const hecha = indice < alcanzada || (indice === alcanzada && estado === 'LICENCIA_EMITIDA')
        const actual = indice === alcanzada && !hecha
        const detenida = observada && indice === 1
        return (
          <li
            key={escala.clave}
            aria-current={actual ? 'step' : undefined}
            className="relative grid justify-items-center gap-2 text-center"
          >
            {indice > 0 && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-[9px] right-1/2 h-0.5 w-full',
                  indice <= alcanzada ? 'bg-[#101a3c] dark:bg-[#d8b858]' : 'border-t-2 border-dashed border-[#101a3c]/25 dark:border-white/20',
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-10 size-5 rounded-full border-2',
                hecha && 'border-[#101a3c] bg-[#101a3c] dark:border-[#d8b858] dark:bg-[#d8b858]',
                actual && 'border-[#d8b858] bg-[#fbf3da] ring-4 ring-[#d8b858]/25 dark:bg-[#16204a]',
                detenida && 'border-[#b42318] bg-card',
                !hecha && !actual && !detenida && 'border-[#101a3c]/25 bg-card dark:border-white/25',
              )}
            />
            <span
              className={cn(
                'font-heading text-[11px] leading-tight font-bold tracking-[0.1em] uppercase',
                actual || hecha ? 'text-foreground' : 'text-muted-foreground',
                detenida && 'text-[#b42318] dark:text-[#f7b4a8]',
              )}
            >
              {escala.etiqueta}
              {detenida && <span className="block font-sans text-[11px] font-semibold tracking-normal normal-case">Observada</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

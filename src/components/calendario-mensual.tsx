import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DIAS_DE_LA_SEMANA,
  diaDelMes,
  diasDeLaGrilla,
  esMismoMes,
  hoyIso,
  mesAnterior,
  mesSiguiente,
  nombreDelMes,
  primerDiaDelMes,
} from '@/lib/dominio/calendario'
import { cn } from '@/lib/utils'

export type EventoCalendario = {
  /** Clave estable del evento (p. ej. el id del turno). */
  id: string
  /** Día del evento, `yyyy-MM-dd`. */
  fecha: string
  titulo: string
  subtitulo?: string
}

type Props = {
  /** Mes visible, como su primer día `yyyy-MM-01`. Lo controla el padre. */
  mes: string
  eventos: EventoCalendario[]
  /** Cambiar de mes (anterior, siguiente u hoy). */
  onMes: (mes: string) => void
  /** Si se pasa, cada evento es un botón que lo invoca (p. ej. para navegar). */
  onEvento?: (evento: EventoCalendario) => void
  etiqueta?: string
}

export function CalendarioMensual({ mes, eventos, onMes, onEvento, etiqueta = 'Calendario' }: Props) {
  const hoy = hoyIso()
  const dias = diasDeLaGrilla(mes)

  const porDia = new Map<string, EventoCalendario[]>()
  for (const evento of eventos) {
    const lista = porDia.get(evento.fecha)
    if (lista) lista.push(evento)
    else porDia.set(evento.fecha, [evento])
  }

  return (
    <section aria-label={etiqueta} className="rounded-lg border">
      <header className="flex items-center justify-between gap-2 border-b p-3">
        <h2 className="text-sm font-medium" aria-live="polite">
          {nombreDelMes(mes)}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onMes(primerDiaDelMes(hoy))}>
            Hoy
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => onMes(mesAnterior(mes))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => onMes(mesSiguiente(mes))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[36rem]">
          <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
            {DIAS_DE_LA_SEMANA.map((dia) => (
              <div key={dia} className="p-2">
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((dia) => {
              const delMes = esMismoMes(dia, mes)
              const esHoy = dia === hoy
              const eventosDelDia = porDia.get(dia) ?? []
              return (
                <div
                  key={dia}
                  className={cn(
                    'min-h-24 border-r border-b p-1 last:border-r-0 [&:nth-child(7n)]:border-r-0',
                    !delMes && 'bg-muted/40 text-muted-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs',
                      esHoy && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {diaDelMes(dia)}
                  </div>
                  <ul className="flex list-none flex-col gap-1 p-0">
                    {eventosDelDia.map((evento) => (
                      <li key={evento.id}>
                        {onEvento ? (
                          <button
                            type="button"
                            onClick={() => onEvento(evento)}
                            title={evento.subtitulo ? `${evento.titulo} · ${evento.subtitulo}` : evento.titulo}
                            className="w-full truncate rounded bg-primary/10 px-1.5 py-0.5 text-left text-xs text-primary transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {evento.titulo}
                          </button>
                        ) : (
                          <span
                            title={evento.subtitulo ? `${evento.titulo} · ${evento.subtitulo}` : evento.titulo}
                            className="block truncate rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                          >
                            {evento.titulo}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

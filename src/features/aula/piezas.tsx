import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { fechaLarga, type EstadoCelda } from './formato'

export function CabeceraDelAula({
  titulo,
  detalle,
  dia,
  diasDelPlan,
  fin,
}: {
  titulo: string
  detalle: string
  dia: number | null
  diasDelPlan: number
  fin: string | null
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="grid min-w-0 gap-1.5">
        <h1 className="font-heading text-4xl leading-none font-bold tracking-wide uppercase md:text-5xl">{titulo}</h1>
        <p className="text-[15px] text-muted-foreground">{detalle}</p>
      </div>
      {dia !== null && (
        <p className="text-right text-[15px] leading-tight text-muted-foreground">
          <span className="font-heading text-3xl font-bold text-foreground tabular-nums">Día {dia}</span> de {diasDelPlan}{' '}
          hábiles
          {fin && <span className="block text-[13px]">Fin previsto {fechaLarga(fin)}</span>}
        </p>
      )}
    </div>
  )
}

export type Segmento = { etiqueta: string; valor: ReactNode }

export function Pase({
  titulo,
  fecha,
  segmentos,
  accion,
}: {
  titulo: string
  fecha: string
  segmentos: Segmento[]
  accion?: ReactNode
}) {
  return (
    <section
      aria-label={titulo}
      className="grid overflow-hidden rounded-2xl bg-[#101a3c] text-white shadow-[0_14px_40px_rgb(16_26_60/0.18)] dark:bg-[#16204a] dark:ring-1 dark:ring-white/10 sm:grid-cols-[minmax(150px,auto)_1fr]"
    >
      <div className="relative grid content-center gap-1 bg-[#d8b858] px-5 py-4 text-[#101a3c] sm:border-r-2 sm:border-dotted sm:border-[#101a3c]/35">
        <span className="font-heading text-[11px] font-bold tracking-[0.14em] text-[#4d3f12] uppercase">{titulo}</span>
        <span className="font-heading text-2xl leading-none font-bold uppercase">{fecha}</span>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap">
        {segmentos.map((segmento) => (
          <div
            key={segmento.etiqueta}
            className="grid min-w-0 content-center gap-1 border-white/20 px-5 py-4 sm:flex-auto sm:border-r sm:border-dashed"
          >
            <span className="font-heading text-[11px] font-bold tracking-[0.14em] text-[#b9c1db] uppercase">
              {segmento.etiqueta}
            </span>
            <span className="font-heading text-xl leading-tight font-bold tracking-wide tabular-nums">{segmento.valor}</span>
          </div>
        ))}
        {accion && <div className="col-span-2 flex items-center px-5 py-4 sm:col-span-1 sm:ml-auto">{accion}</div>}
      </div>
    </section>
  )
}

export function PaseVacio({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <section
      aria-label={titulo}
      className="grid overflow-hidden rounded-2xl border-2 border-dashed border-[#101a3c]/25 bg-card sm:grid-cols-[minmax(150px,auto)_1fr] dark:border-white/15"
    >
      <div className="grid content-center gap-1 bg-[#d8b858]/25 px-5 py-4 text-[#101a3c] sm:border-r-2 sm:border-dotted sm:border-[#101a3c]/25 dark:bg-[#d8b858]/10 dark:text-[#e8c66a]">
        <span className="font-heading text-[11px] font-bold tracking-[0.14em] text-[#4d3f12] uppercase dark:text-[#e8c66a]">{titulo}</span>
        <span className="font-heading text-2xl leading-none font-bold uppercase">Sin turno</span>
      </div>
      <p className="flex items-center px-5 py-4 text-[15px] text-foreground">{mensaje}</p>
    </section>
  )
}

export function Panel({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  const id = `panel-${titulo.toLowerCase().replace(/[^a-záéíóúñ0-9]+/g, '-')}`
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'rounded-2xl bg-card p-5 shadow-[0_10px_40px_rgb(16_26_60/0.07)] ring-1 ring-foreground/5 dark:shadow-none dark:ring-foreground/10',
        className,
      )}
    >
      <h2 id={id} className="font-heading mb-3 text-base font-bold tracking-wide uppercase">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

export function Filas({ children }: { children: ReactNode }) {
  return <ul className="grid divide-y divide-border text-sm">{children}</ul>
}

export function Fila({ izquierda, derecha }: { izquierda: ReactNode; derecha: ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="min-w-0">{izquierda}</span>
      <span className="shrink-0 text-right font-semibold text-foreground tabular-nums">{derecha}</span>
    </li>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

export function Celda({ estado, children }: { estado: EstadoCelda; children: ReactNode }) {
  return (
    <li
      data-estado={estado}
      className={cn(
        'grid gap-1 rounded-xl border px-3 py-2.5 text-[13px] leading-snug',
        estado === 'COMPLETA' && 'border-[#101a3c] bg-[#101a3c] text-white dark:border-[#2a3770] dark:bg-[#1e2a55]',
        estado === 'EN_CURSO' && 'border-2 border-[#d8b858] bg-[#fbf3da] text-[#101a3c] dark:bg-[#d8b858] dark:text-[#101a3c]',
        estado === 'PENDIENTE' && 'border-border bg-card text-foreground',
      )}
    >
      {children}
    </li>
  )
}

export function ColumnaDeFase({
  titulo,
  detalle,
  plegada = false,
  children,
}: {
  titulo: string
  detalle: string
  plegada?: boolean
  children: ReactNode
}) {
  const cabecera = (
    <>
      <h3 className="font-heading text-sm font-bold tracking-wide uppercase">{titulo}</h3>
      <p className="text-xs text-muted-foreground">{detalle}</p>
    </>
  )
  if (plegada)
    return (
      <details className="group rounded-xl bg-muted/70 p-3 dark:bg-white/4">
        <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-3 rounded-lg px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="grid gap-0.5">{cabecera}</span>
          <ChevronDown className="size-4 text-muted-foreground transition group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="mt-2 grid gap-2">{children}</ul>
      </details>
    )
  return (
    <div className="grid content-start gap-2 rounded-xl bg-muted/70 p-3 dark:bg-white/4">
      <div className="grid content-start gap-0.5 px-0.5 lg:min-h-[3.75rem]">{cabecera}</div>
      <ul className="grid gap-2">{children}</ul>
    </div>
  )
}

export function Puntos({ total, hechos, estado }: { total: number; hechos: number; estado: EstadoCelda }) {
  if (total === 0) return null
  return (
    <span className="flex flex-wrap items-center gap-1" aria-hidden>
      {Array.from({ length: total }, (_, indice) => (
        <span
          key={indice}
          className={cn(
            'size-2 rounded-full',
            estado === 'COMPLETA'
              ? 'bg-white/80'
              : estado === 'EN_CURSO'
                ? indice < hechos
                  ? 'bg-[#101a3c]'
                  : indice === hechos
                    ? 'ring-2 ring-[#101a3c] ring-inset'
                    : 'bg-[#101a3c]/25'
                : indice < hechos
                  ? 'bg-[#101a3c] dark:bg-[#c3c9db]'
                  : 'bg-current/20',
          )}
        />
      ))}
    </span>
  )
}

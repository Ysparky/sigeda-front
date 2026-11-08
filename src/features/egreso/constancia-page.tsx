import { useSuspenseQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { consultasEgreso, ETIQUETA_SITUACION, type ConstanciaDeEgreso } from './api'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="grid gap-1 px-5 py-4">
      <dt className="font-heading text-[11px] font-bold tracking-[0.14em] text-[#5b6072] uppercase">{etiqueta}</dt>
      <dd className="font-heading text-2xl leading-none font-bold text-[#101a3c] tabular-nums">{valor}</dd>
    </div>
  )
}

function Cuerpo({ c }: { c: ConstanciaDeEgreso }) {
  const periodo = c.fechaInicio && c.fecha ? ` del ${formatearFecha(c.fechaInicio)} al ${formatearFecha(c.fecha)}` : ''
  if (c.situacion !== 'EGRESADO')
    return (
      <p className="max-w-[62ch] text-base leading-relaxed text-[#2a3150]">
        <strong className="text-[#101a3c]">{c.nombre}</strong> no egresó del curso
        {c.cohorte ? ` (cohorte ${c.cohorte})` : ''}: su situación final es{' '}
        <strong className="text-[#101a3c]">{ETIQUETA_SITUACION[c.situacion].toLowerCase()}</strong>
        {c.fecha ? ` desde el ${formatearFecha(c.fecha)}` : ''}. No corresponde constancia de egreso.
        {c.observacion && <span className="mt-3 block text-[15px] text-[#5b6072]">{c.observacion}</span>}
      </p>
    )
  return (
    <p className="max-w-[62ch] text-base leading-relaxed text-[#2a3150]">
      Se deja constancia de que <strong className="text-[#101a3c]">{c.nombre}</strong>
      {c.dni ? `, DNI ${c.dni},` : ''} culminó y aprobó el Curso de Piloto de Helicóptero (programa PDI EA-510) en la cohorte{' '}
      <strong className="text-[#101a3c]">{c.cohorte ?? '—'}</strong>
      {periodo}, con la instrucción en tierra aprobada y todas las fases de instrucción en el aire completas.
    </p>
  )
}

export function ConstanciaPage({ cod }: { cod: string }) {
  const { data: c } = useSuspenseQuery(consultasEgreso.constancia(cod))
  const egreso = c.situacion === 'EGRESADO'
  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
        <h1 className="sr-only">{egreso ? 'Constancia de egreso' : 'Resultado final'}</h1>
        {egreso && (
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden />
            Imprimir
          </Button>
        )}
      </div>

      <article
        aria-label={egreso ? `Constancia ${c.constancia ?? ''}` : 'Resultado final'}
        className="mx-auto grid w-full max-w-[860px] overflow-hidden rounded-2xl bg-white text-[#101a3c] shadow-[0_14px_40px_rgb(16_26_60/0.12)] ring-1 ring-[#101a3c]/8 print:max-w-none print:rounded-none print:shadow-none print:ring-0"
      >
        <div className="h-2 bg-[#d8b858]" aria-hidden />
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#d9dce5] px-8 pt-8 pb-6 md:px-12">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#101a3c] p-2">
              <img src="/asa-logo.png" alt="" className="h-full w-full object-contain" />
            </span>
            <div className="grid gap-0.5">
              <p className="font-heading text-lg leading-tight font-bold tracking-wide uppercase">Aeroclub Sudamericano de los Andes</p>
              <p className="text-[13px] text-[#5b6072]">Centro de Instrucción de Aeronáutica Civil · RAP 141</p>
            </div>
          </div>
          {c.constancia && (
            <p className="text-right">
              <span className="font-heading block text-[11px] font-bold tracking-[0.14em] text-[#5b6072] uppercase">N.° de constancia</span>
              <span className="font-heading text-xl font-bold tabular-nums">{c.constancia}</span>
            </p>
          )}
        </header>

        <div className="grid gap-8 px-8 py-10 md:px-12">
          {egreso && (
            <p aria-hidden className="font-heading text-4xl leading-none font-bold tracking-wide uppercase md:text-5xl">Constancia de egreso</p>
          )}
          {!egreso && <h2 className="font-heading text-3xl leading-none font-bold tracking-wide uppercase">Resultado final</h2>}
          <Cuerpo c={c} />

          {egreso && (
            <dl className="grid grid-cols-2 divide-x divide-y divide-dashed divide-[#d9dce5] rounded-xl border border-[#d9dce5] sm:grid-cols-4 sm:divide-y-0">
              <Dato etiqueta="NFPI" valor={formatearNota(c.nfpi)} />
              <Dato etiqueta="Orden de mérito" valor={c.puesto ? `${c.puesto}.º de ${c.egresados}` : '—'} />
              <Dato etiqueta="Horas de vuelo" valor={c.horasVuelo === null ? '—' : `${formatearNota(c.horasVuelo)} h`} />
              <Dato etiqueta="Simulador" valor={c.horasSimulador === null ? '—' : `${formatearNota(c.horasSimulador)} h`} />
            </dl>
          )}
        </div>

        {egreso && (
          <footer className="grid gap-8 border-t border-[#d9dce5] px-8 pt-14 pb-8 md:px-12">
            <div className="grid grid-cols-2 gap-10">
              {['Coordinación Académica', 'Dirección de Instrucción'].map((cargo) => (
                <div key={cargo} className="grid gap-1.5 border-t border-[#101a3c] pt-2">
                  <span className="font-heading text-[13px] font-bold tracking-wider uppercase">{cargo}</span>
                  <span className="text-xs text-[#5b6072]">Firma y sello</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#5b6072]">
              Emitida el {c.fecha ? formatearFecha(c.fecha) : '—'}. Acredita el curso del CIAC que exige el §61.235 de la RAP 61
              para rendir el examen teórico de Piloto Privado de Helicóptero ante la DGAC.
            </p>
          </footer>
        )}
      </article>
    </>
  )
}

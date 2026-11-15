import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Radio } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { cn } from '@/lib/utils'
import { escenarioQuery } from '@/features/escenarios/api'
import { generarTelemetria } from './cabina-simulada'
import { enviarTelemetria, telemetriaQuery, type EventoCabina, type Muestra, type TelemetriaCabina } from './api'

const SEGUNDOS_POR_TICK = 1
const MS_POR_TICK = 500

const ETIQUETA_EVENTO: Record<EventoCabina['tipo'], string> = {
  FALLA: 'Emergencia',
  RESPUESTA: 'Respuesta',
  DECLARA_EMERGENCIA: 'Comunicación',
  CHECKLIST: 'Lista',
  FINAL: 'Fin',
}

function Instrumento({ etiqueta, valor, unidad, alerta = false }: { etiqueta: string; valor: string; unidad: string; alerta?: boolean }) {
  return (
    <div className="grid gap-1 px-4 py-3">
      <span className="font-heading text-[11px] font-bold tracking-[0.14em] text-[#b9c1db] uppercase">{etiqueta}</span>
      <span className={cn('font-heading text-3xl leading-none font-bold tabular-nums', alerta ? 'text-[#f7b4a8]' : 'text-white')}>
        {valor}
        <span className="ml-1 text-sm font-semibold text-[#b9c1db]">{unidad}</span>
      </span>
    </div>
  )
}

function Grafica({ muestras, eventos, total }: { muestras: Muestra[]; eventos: EventoCabina[]; total: number }) {
  const ancho = 640
  const alto = 150
  const x = (t: number) => (t / Math.max(total, 1)) * ancho
  const maxAlt = Math.max(...muestras.map((m) => m.altitud), 100)
  const yAlt = (a: number) => alto - (a / maxAlt) * (alto - 10) - 5
  const yRpm = (r: number) => alto - ((Math.min(Math.max(r, 70), 115) - 70) / 45) * (alto - 10) - 5
  const linea = (f: (m: Muestra) => number) => muestras.map((m) => `${x(m.t).toFixed(1)},${f(m).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-36 w-full" role="img" aria-label="Altitud y RPM del rotor durante el ejercicio">
      <rect x="0" y={yRpm(110)} width={ancho} height={yRpm(90) - yRpm(110)} fill="#d8b858" opacity="0.12" />
      {eventos
        .filter((e) => e.t <= (muestras.at(-1)?.t ?? 0))
        .map((e) => (
          <line key={`${e.tipo}-${e.t}`} x1={x(e.t)} x2={x(e.t)} y1="0" y2={alto} stroke="#b9c1db" strokeDasharray="3 4" strokeWidth="1" />
        ))}
      <polyline points={linea((m) => yAlt(m.altitud))} fill="none" stroke="#ffffff" strokeWidth="2" />
      <polyline points={linea((m) => yRpm(m.rpmRotor))} fill="none" stroke="#d8b858" strokeWidth="2" />
    </svg>
  )
}

export function PanelCabina({
  idSesion,
  idEscenario,
  codAlumno,
  enCurso,
}: {
  idSesion: number
  idEscenario: number | null
  codAlumno: string | null
  enCurso: boolean
}) {
  const queryClient = useQueryClient()
  const guardada = useQuery(telemetriaQuery(idSesion))
  const escenario = useQuery({ ...escenarioQuery(idEscenario ?? 0), enabled: idEscenario !== null })
  const [vuelo, setVuelo] = useState<TelemetriaCabina | null>(null)
  const [t, setT] = useState(0)
  const temporizador = useRef<number | null>(null)

  const enviar = useMutation({
    mutationFn: (datos: TelemetriaCabina) => enviarTelemetria(idSesion, datos),
    onSuccess: async (vista) => {
      queryClient.setQueryData(telemetriaQuery(idSesion).queryKey, vista)
      setVuelo(null)
    },
  })

  useEffect(() => () => {
    if (temporizador.current) window.clearInterval(temporizador.current)
  }, [])

  function conectar() {
    const datos = generarTelemetria(escenario.data?.nombre ?? '', `${codAlumno ?? ''}-${idSesion}`)
    const total = datos.muestras.at(-1)?.t ?? 0
    setVuelo(datos)
    setT(0)
    temporizador.current = window.setInterval(() => {
      setT((previo) => {
        const siguiente = previo + SEGUNDOS_POR_TICK
        if (siguiente >= total) {
          if (temporizador.current) window.clearInterval(temporizador.current)
          enviar.mutate(datos)
          return total
        }
        return siguiente
      })
    }, MS_POR_TICK)
  }

  const registrada = guardada.data && guardada.data.muestras.length > 0 ? guardada.data : null
  const enVuelo = vuelo !== null
  const muestras = enVuelo ? vuelo.muestras.filter((m) => m.t <= t) : (registrada?.muestras ?? [])
  const eventos = enVuelo ? vuelo.eventos.filter((e) => e.t <= t) : (registrada?.eventos ?? [])
  const total = (enVuelo ? vuelo.muestras.at(-1)?.t : registrada?.muestras.at(-1)?.t) ?? 50
  const actual = muestras.at(-1)
  const indicadores = escenario.data?.indicadores ?? []

  if (!enCurso && !registrada) return null

  return (
    <section
      aria-labelledby="titulo-cabina"
      className="grid gap-5 overflow-hidden rounded-2xl bg-[#101a3c] p-5 text-white shadow-[0_14px_40px_rgb(16_26_60/0.18)] md:p-6 dark:bg-[#16204a] dark:ring-1 dark:ring-white/10"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="titulo-cabina" className="font-heading text-xl font-bold tracking-wide uppercase">
            Cabina FNPT II
          </h2>
          <p className="flex items-center gap-2 text-sm text-[#dde1ec]">
            <span className={cn('size-2 rounded-full', enVuelo ? 'animate-pulse bg-[#6fcf9a]' : registrada ? 'bg-[#d8b858]' : 'bg-white/30')} />
            {enVuelo
              ? `Conectada · recibiendo datos (${Math.round(t)} s)`
              : registrada
                ? 'Datos del ejercicio recibidos'
                : 'Sin conectar'}
          </p>
        </div>
        {enCurso && !enVuelo && import.meta.env.DEV && (
          <Button
            onClick={conectar}
            disabled={enviar.isPending || !escenario.data}
            className="bg-[#d8b858] text-[#101a3c] hover:bg-[#e6c96a]"
          >
            <Radio aria-hidden />
            {registrada ? 'Repetir el ejercicio' : 'Conectar cabina (simulación)'}
          </Button>
        )}
      </div>

      {(enVuelo || registrada) && (
        <>
          <div className="grid grid-cols-2 divide-white/15 rounded-xl bg-white/5 sm:grid-cols-4 sm:divide-x">
            <Instrumento etiqueta="Altitud" valor={String(Math.round(actual?.altitud ?? 0))} unidad="ft" />
            <Instrumento etiqueta="Velocidad" valor={String(Math.round(actual?.velocidad ?? 0))} unidad="kt" />
            <Instrumento
              etiqueta="RPM rotor"
              valor={String(Math.round(actual?.rpmRotor ?? 0))}
              unidad="%"
              alerta={actual !== undefined && (actual.rpmRotor < 90 || actual.rpmRotor > 110)}
            />
            <Instrumento etiqueta="Vel. vertical" valor={String(Math.round(actual?.velocidadVertical ?? 0))} unidad="ft/min" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="grid gap-2">
              <Grafica muestras={muestras} eventos={eventos} total={total} />
              <p className="flex flex-wrap gap-4 text-xs text-[#b9c1db]">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-white" /> Altitud</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#d8b858]" /> RPM del rotor</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 bg-[#d8b858]/25" /> Rango 90–110 %</span>
              </p>
            </div>
            <ol aria-label="Eventos del ejercicio" className="grid content-start gap-1.5 text-sm">
              {eventos.map((e) => (
                <li key={`${e.tipo}-${e.t}`} className="flex gap-3">
                  <span className="w-12 shrink-0 text-right text-[#b9c1db] tabular-nums">{e.t.toFixed(1)} s</span>
                  <span className="font-heading w-24 shrink-0 text-[11px] font-bold tracking-[0.12em] text-[#d8b858] uppercase">
                    {ETIQUETA_EVENTO[e.tipo]}
                  </span>
                  <span className="text-[#dde1ec]">{e.detalle}</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {enviar.isPending && <p className="text-sm text-[#dde1ec]">Enviando los datos a SIGEDA…</p>}
      {enviar.isError && (
        <p role="alert" className="text-sm text-[#f7b4a8]">
          {enviar.error instanceof ApiError ? enviar.error.message : MENSAJE_GENERICO}
        </p>
      )}

      {!enVuelo && registrada && registrada.propuesta.length > 0 && (
        <div className="grid gap-3 rounded-xl bg-white p-4 text-[#101a3c]">
          <h3 className="font-heading text-sm font-bold tracking-wide uppercase">Propuesta del sistema</h3>
          <ul aria-label="Propuesta del sistema" className="grid gap-2 text-sm">
            {registrada.propuesta.map((p) => (
              <li key={p.idIndicador} className="flex items-start gap-3">
                <span
                  className={cn(
                    'font-heading grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold',
                    p.calificacion === 1 ? 'bg-[#fdecea] text-[#b42318]' : 'bg-[#101a3c] text-white',
                  )}
                >
                  {p.calificacion}
                </span>
                <span>
                  <span className="block font-semibold">
                    {indicadores.find((i) => i.id === p.idIndicador)?.nombre ?? `Indicador ${p.idIndicador}`}
                  </span>
                  <span className="text-[#5b6072]">{p.motivo}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#5b6072]">
            Reglas fijas sobre la telemetría. Es una propuesta: el instructor la confirma o la ajusta al calificar.
          </p>
          {enCurso && (
            <Button asChild className="justify-self-start">
              <Link to="/sesiones-simulador/$id/calificar" params={{ id: String(idSesion) }}>
                Calificar con esta propuesta
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      )}

      {enCurso && import.meta.env.DEV && (
        <p className="text-xs text-[#b9c1db]">
          Simulación de la integración: en producción estos datos los envía el adaptador de la cabina del simulador.
        </p>
      )}
    </section>
  )
}

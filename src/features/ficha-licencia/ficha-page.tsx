import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { CircleAlert, CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { formatearNota } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { RutaDeLicencia } from '@/features/egreso/ruta-de-licencia'
import { clavesFicha, ETIQUETA_ESTADO_FICHA, fichaQuery, guardarFicha, type CuerpoFicha, type Ficha } from './api'

type Valores = {
  fechaNacimiento: string
  inglesNivel: string
  horasTotal: string
  horasDobleMando: string
  horasSolo: string
  horasSoloTravesia: string
  horasNocturnas: string
  horasInstrumentos: string
  horasSimulador: string
  medicoVigencia: string
  inglesVigencia: string
  licenciaAlumnoEmision: string
  examenTeoricoFecha: string
  examenTeoricoNota: string
  declaracionFecha: string
  periciaFecha: string
  periciaResultado: string
  secundariaCompleta: boolean
  travesia100nm: boolean
  nocturno10x10: boolean
  pagoTeorico: boolean
  pagoPractica: boolean
  solicitudPresentada: boolean
  licenciaEmitida: boolean
}

const num = (v: string) => (v.trim() === '' ? null : Number(v))
const fecha = (v: string) => (v.trim() === '' ? null : v)

function aValores(f: Ficha): Valores {
  const s = (v: number | null) => (v === null ? '' : String(v))
  return {
    fechaNacimiento: f.fechaNacimiento ?? '',
    inglesNivel: f.inglesNivel ?? '',
    horasTotal: s(f.horasTotal),
    horasDobleMando: s(f.horasDobleMando),
    horasSolo: s(f.horasSolo),
    horasSoloTravesia: s(f.horasSoloTravesia),
    horasNocturnas: s(f.horasNocturnas),
    horasInstrumentos: s(f.horasInstrumentos),
    horasSimulador: s(f.horasSimulador),
    medicoVigencia: f.medicoVigencia ?? '',
    inglesVigencia: f.inglesVigencia ?? '',
    licenciaAlumnoEmision: f.licenciaAlumnoEmision ?? '',
    examenTeoricoFecha: f.examenTeoricoFecha ?? '',
    examenTeoricoNota: s(f.examenTeoricoNota),
    declaracionFecha: f.declaracionFecha ?? '',
    periciaFecha: f.periciaFecha ?? '',
    periciaResultado: f.periciaResultado ?? '',
    secundariaCompleta: f.secundariaCompleta === true,
    travesia100nm: f.travesia100nm === true,
    nocturno10x10: f.nocturno10x10 === true,
    pagoTeorico: f.pagoTeorico === true,
    pagoPractica: f.pagoPractica === true,
    solicitudPresentada: f.solicitudPresentada === true,
    licenciaEmitida: f.licenciaEmitida === true,
  }
}

function aCuerpo(v: Valores): CuerpoFicha {
  return {
    fechaNacimiento: fecha(v.fechaNacimiento),
    secundariaCompleta: v.secundariaCompleta,
    inglesNivel: v.inglesNivel.trim() === '' ? null : v.inglesNivel,
    inglesVigencia: fecha(v.inglesVigencia),
    medicoVigencia: fecha(v.medicoVigencia),
    licenciaAlumnoEmision: fecha(v.licenciaAlumnoEmision),
    horasTotal: num(v.horasTotal),
    horasDobleMando: num(v.horasDobleMando),
    horasSolo: num(v.horasSolo),
    horasSoloTravesia: num(v.horasSoloTravesia),
    horasNocturnas: num(v.horasNocturnas),
    horasInstrumentos: num(v.horasInstrumentos),
    horasSimulador: num(v.horasSimulador),
    travesia100nm: v.travesia100nm,
    nocturno10x10: v.nocturno10x10,
    examenTeoricoFecha: fecha(v.examenTeoricoFecha),
    examenTeoricoNota: num(v.examenTeoricoNota),
    declaracionFecha: fecha(v.declaracionFecha),
    periciaFecha: fecha(v.periciaFecha),
    periciaResultado: v.periciaResultado === 'APROBADA' || v.periciaResultado === 'DESAPROBADA' ? v.periciaResultado : null,
    pagoTeorico: v.pagoTeorico,
    pagoPractica: v.pagoPractica,
    solicitudPresentada: v.solicitudPresentada,
    licenciaEmitida: v.licenciaEmitida,
  }
}

export function FichaPage({ cod }: { cod: string }) {
  const { data: ficha } = useSuspenseQuery(fichaQuery(cod))
  const queryClient = useQueryClient()
  const formulario = useForm<Valores>({ values: aValores(ficha) })

  const guardar = useMutation({
    mutationFn: (v: Valores) => guardarFicha(cod, aCuerpo(v)),
    onSuccess: async () => {
      toast.success('Ficha guardada.')
      await queryClient.invalidateQueries({ queryKey: clavesFicha.detalle(cod) })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : MENSAJE_GENERICO),
  })

  const r = ficha.resumen

  return (
    <div className="grid gap-6">
      <PageHeader titulo={`Ficha de licencia · ${cod}`} descripcion="Obtención de la licencia de Piloto Privado de Helicóptero (PP-H)." />

      {!ficha.cursoAprobado && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-[#8a5a00]/35 bg-[#fdf3e1] p-4 text-sm text-[#5c3c00] dark:bg-[#8a5a00]/15 dark:text-[#f0c675]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="grid gap-1">
            <p className="font-semibold">La ficha de licencia se abre al egresar del curso.</p>
            <p>El alumno todavía no tiene constancia de egreso: la ficha se puede consultar, pero no guardar.</p>
          </div>
        </div>
      )}

      <section
        aria-labelledby="estado-licencia"
        className="grid gap-6 rounded-2xl bg-card p-5 shadow-[0_10px_40px_rgb(16_26_60/0.07)] ring-1 ring-foreground/5 md:p-6 dark:shadow-none dark:ring-foreground/10"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="estado-licencia" className="font-heading text-xl font-bold tracking-wide uppercase">
            Estado de la licencia
          </h2>
          <span data-estado={r.estado} className="font-heading text-sm font-bold tracking-wider uppercase">
            {ETIQUETA_ESTADO_FICHA[r.estado]}
          </span>
        </div>
        <RutaDeLicencia estado={r.estado} className="max-w-3xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-2">
            <h3 className="font-heading text-sm font-bold tracking-wide uppercase">Requisitos</h3>
            <ul className="grid gap-x-6 sm:grid-cols-2" aria-label="Requisitos de la licencia">
              {r.requisitos.map((req) => (
                <li key={req.clave} className="flex items-start gap-2 border-b border-dashed border-border py-2 text-sm">
                  {req.cumple ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-[#1e7a4c] dark:text-[#6fcf9a]" aria-hidden />
                  ) : (
                    <CircleX className="mt-0.5 size-4 shrink-0 text-[#b42318] dark:text-[#f7b4a8]" aria-hidden />
                  )}
                  <span className={cn(req.cumple ? 'text-foreground' : 'text-[#7a1a10] dark:text-[#f7b4a8]')}>
                    {req.detalle} — {req.cumple ? 'cumple' : 'falta'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid content-start gap-4">
            {r.bloqueos.length > 0 && (
              <div className="grid gap-2 rounded-xl border border-[#b42318]/30 bg-[#fdecea] p-4 text-sm text-[#7a1a10] dark:bg-[#b42318]/15 dark:text-[#f7b4a8]">
                <h3 className="font-heading text-sm font-bold tracking-wide uppercase">Bloqueos</h3>
                <ul className="grid gap-1">{r.bloqueos.map((b) => <li key={b}>{b}</li>)}</ul>
              </div>
            )}
            {r.alertas.length > 0 && (
              <div className="grid gap-2 rounded-xl border border-[#8a5a00]/35 bg-[#fdf3e1] p-4 text-sm text-[#5c3c00] dark:bg-[#8a5a00]/15 dark:text-[#f0c675]">
                <h3 className="font-heading flex items-center gap-1.5 text-sm font-bold tracking-wide uppercase">
                  <TriangleAlert className="size-4" aria-hidden />
                  Alertas
                </h3>
                <ul className="grid gap-1">{r.alertas.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
            )}
            {r.bloqueos.length === 0 && r.alertas.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin alertas de vencimiento ni bloqueos.</p>
            )}
          </div>
        </div>
      </section>

      <form onSubmit={formulario.handleSubmit((v) => guardar.mutate(v))} className="grid gap-6">
        <fieldset disabled={!ficha.cursoAprobado} className="grid min-w-0 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Horas de vuelo</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <section
              aria-labelledby="registrado-sistema"
              className="grid gap-2 rounded-lg border bg-muted/40 p-4 text-sm sm:col-span-3"
            >
              <h3 id="registrado-sistema" className="font-medium">
                Registrado por el sistema
              </h3>
              <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-[auto_auto_1fr]">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Vuelo con instructor (turnos evaluados)</dt>
                  <dd className="font-medium tabular-nums">{formatearNota(ficha.horasRegistradas.vuelo)} h</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Simulador (sesiones completadas)</dt>
                  <dd className="font-medium tabular-nums">{formatearNota(ficha.horasRegistradas.simulador)} h</dd>
                </div>
              </dl>
              <p className="text-muted-foreground">
                Si deja vacíos Total, Doble mando o Simulador, la ficha usa estas horas.
              </p>
            </section>
            <CampoNumero label="Total" reg={formulario.register('horasTotal')} />
            <CampoNumero label="Doble mando" reg={formulario.register('horasDobleMando')} />
            <CampoNumero label="Solo" reg={formulario.register('horasSolo')} />
            <CampoNumero label="Solo travesía" reg={formulario.register('horasSoloTravesia')} />
            <CampoNumero label="Nocturnas" reg={formulario.register('horasNocturnas')} />
            <CampoNumero label="Instrumentos" reg={formulario.register('horasInstrumentos')} />
            <CampoNumero label="Simulador" reg={formulario.register('horasSimulador')} />
            <CampoCheck label="Travesía de 100 NM" reg={formulario.register('travesia100nm')} />
            <CampoCheck label="Nocturno 10 × 10" reg={formulario.register('nocturno10x10')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Requisitos y trámite</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <CampoFecha label="Fecha de nacimiento" reg={formulario.register('fechaNacimiento')} />
            <Field>
              <FieldLabel htmlFor="inglesNivel">Nivel de inglés</FieldLabel>
              <Input id="inglesNivel" type="text" {...formulario.register('inglesNivel')} />
            </Field>
            <CampoFecha label="Médico vigente hasta" reg={formulario.register('medicoVigencia')} />
            <CampoFecha label="Inglés vigente hasta" reg={formulario.register('inglesVigencia')} />
            <CampoFecha label="Licencia de alumno (emisión)" reg={formulario.register('licenciaAlumnoEmision')} />
            <CampoCheck label="Secundaria completa" reg={formulario.register('secundariaCompleta')} />
            <CampoFecha label="Examen teórico (fecha)" reg={formulario.register('examenTeoricoFecha')} />
            <CampoNumero label="Examen teórico (nota)" reg={formulario.register('examenTeoricoNota')} />
            <CampoFecha label="Declaración del instructor" reg={formulario.register('declaracionFecha')} />
            <CampoFecha label="Pericia (fecha)" reg={formulario.register('periciaFecha')} />
            <Field>
              <FieldLabel htmlFor="periciaResultado">Pericia (resultado)</FieldLabel>
              <NativeSelect id="periciaResultado" {...formulario.register('periciaResultado')}>
                <NativeSelectOption value="">—</NativeSelectOption>
                <NativeSelectOption value="APROBADA">Aprobada</NativeSelectOption>
                <NativeSelectOption value="DESAPROBADA">Desaprobada</NativeSelectOption>
              </NativeSelect>
            </Field>
            <CampoCheck label="Pago del examen teórico" reg={formulario.register('pagoTeorico')} />
            <CampoCheck label="Pago de la evaluación práctica" reg={formulario.register('pagoPractica')} />
            <CampoCheck label="Solicitud presentada" reg={formulario.register('solicitudPresentada')} />
            <CampoCheck label="Licencia emitida" reg={formulario.register('licenciaEmitida')} />
          </CardContent>
        </Card>

        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" disabled={guardar.isPending || !ficha.cursoAprobado}>
            {guardar.isPending ? 'Guardando…' : 'Guardar ficha'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function CampoNumero({ label, reg }: { label: string; reg: ReturnType<ReturnType<typeof useForm<Valores>>['register']> }) {
  return (
    <Field>
      <FieldLabel htmlFor={reg.name}>{label}</FieldLabel>
      <Input id={reg.name} type="number" step="0.1" {...reg} />
    </Field>
  )
}

function CampoFecha({ label, reg }: { label: string; reg: ReturnType<ReturnType<typeof useForm<Valores>>['register']> }) {
  return (
    <Field>
      <FieldLabel htmlFor={reg.name}>{label}</FieldLabel>
      <Input id={reg.name} type="date" {...reg} />
    </Field>
  )
}

function CampoCheck({ label, reg }: { label: string; reg: ReturnType<ReturnType<typeof useForm<Valores>>['register']> }) {
  return (
    <label className="flex items-center gap-2 text-sm" htmlFor={reg.name}>
      <input id={reg.name} type="checkbox" {...reg} />
      {label}
    </label>
  )
}

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { clavesFicha, ETIQUETA_ESTADO_FICHA, fichaQuery, guardarFicha, type CuerpoFicha, type Ficha } from './api'

type Valores = {
  horasTotal: string
  horasDobleMando: string
  horasSolo: string
  horasSoloTravesia: string
  horasNocturnas: string
  horasSimulador: string
  medicoVigencia: string
  inglesVigencia: string
  examenTeoricoFecha: string
  examenTeoricoNota: string
  declaracionFecha: string
  periciaFecha: string
  periciaResultado: string
  secundariaCompleta: boolean
  travesia100nm: boolean
  nocturno10x10: boolean
  licenciaEmitida: boolean
}

const num = (v: string) => (v.trim() === '' ? null : Number(v))
const fecha = (v: string) => (v.trim() === '' ? null : v)

function aValores(f: Ficha): Valores {
  const s = (v: number | null) => (v === null ? '' : String(v))
  return {
    horasTotal: s(f.horasTotal),
    horasDobleMando: s(f.horasDobleMando),
    horasSolo: s(f.horasSolo),
    horasSoloTravesia: s(f.horasSoloTravesia),
    horasNocturnas: s(f.horasNocturnas),
    horasSimulador: s(f.horasSimulador),
    medicoVigencia: f.medicoVigencia ?? '',
    inglesVigencia: f.inglesVigencia ?? '',
    examenTeoricoFecha: f.examenTeoricoFecha ?? '',
    examenTeoricoNota: s(f.examenTeoricoNota),
    declaracionFecha: f.declaracionFecha ?? '',
    periciaFecha: f.periciaFecha ?? '',
    periciaResultado: f.periciaResultado ?? '',
    secundariaCompleta: f.secundariaCompleta === true,
    travesia100nm: f.travesia100nm === true,
    nocturno10x10: f.nocturno10x10 === true,
    licenciaEmitida: f.licenciaEmitida === true,
  }
}

function aCuerpo(v: Valores): CuerpoFicha {
  return {
    secundariaCompleta: v.secundariaCompleta,
    inglesVigencia: fecha(v.inglesVigencia),
    medicoVigencia: fecha(v.medicoVigencia),
    horasTotal: num(v.horasTotal),
    horasDobleMando: num(v.horasDobleMando),
    horasSolo: num(v.horasSolo),
    horasSoloTravesia: num(v.horasSoloTravesia),
    horasNocturnas: num(v.horasNocturnas),
    horasSimulador: num(v.horasSimulador),
    travesia100nm: v.travesia100nm,
    nocturno10x10: v.nocturno10x10,
    examenTeoricoFecha: fecha(v.examenTeoricoFecha),
    examenTeoricoNota: num(v.examenTeoricoNota),
    declaracionFecha: fecha(v.declaracionFecha),
    periciaFecha: fecha(v.periciaFecha),
    periciaResultado: v.periciaResultado === 'APROBADA' || v.periciaResultado === 'DESAPROBADA' ? v.periciaResultado : null,
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Estado de la licencia</h2>
          </CardTitle>
          <span className="rounded-full border px-3 py-1 text-sm font-medium" data-estado={r.estado}>
            {ETIQUETA_ESTADO_FICHA[r.estado]}
          </span>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">Requisitos</h3>
            <ul className="grid gap-1" aria-label="Requisitos de la licencia">
              {r.requisitos.map((req) => (
                <li key={req.clave} className="flex items-center gap-2 text-sm">
                  <span aria-hidden>{req.cumple ? '✓' : '✗'}</span>
                  <span className={req.cumple ? '' : 'text-destructive'}>
                    {req.detalle} — {req.cumple ? 'cumple' : 'falta'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {r.alertas.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-amber-600">Alertas</h3>
              <ul className="grid gap-1 text-sm">{r.alertas.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          {r.bloqueos.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-destructive">Bloqueos</h3>
              <ul className="grid gap-1 text-sm">{r.bloqueos.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={formulario.handleSubmit((v) => guardar.mutate(v))} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Horas de vuelo</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <CampoNumero label="Total" reg={formulario.register('horasTotal')} />
            <CampoNumero label="Doble mando" reg={formulario.register('horasDobleMando')} />
            <CampoNumero label="Solo" reg={formulario.register('horasSolo')} />
            <CampoNumero label="Solo travesía" reg={formulario.register('horasSoloTravesia')} />
            <CampoNumero label="Nocturnas" reg={formulario.register('horasNocturnas')} />
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
            <CampoFecha label="Médico vigente hasta" reg={formulario.register('medicoVigencia')} />
            <CampoFecha label="Inglés vigente hasta" reg={formulario.register('inglesVigencia')} />
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
            <CampoCheck label="Licencia emitida" reg={formulario.register('licenciaEmitida')} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={guardar.isPending}>
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

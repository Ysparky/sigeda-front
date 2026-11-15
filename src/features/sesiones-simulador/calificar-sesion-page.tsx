import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { escenarioQuery } from '@/features/escenarios/api'
import { ApiError } from '@/lib/api/errors'
import { errorDePrimeraCarga } from '@/lib/query'
import { calificarSesion, clavesSesiones, sesionQuery, telemetriaQuery } from './api'

const GRADOS = ['1', '2', '3', '4', '5']

type FilaCalificacion = { calificacion: string; comentario: string }

export function CalificarSesionPage({ id }: { id: number }) {
  const { data: sesion } = useSuspenseQuery(sesionQuery(id))
  const escenario = useQuery({ ...escenarioQuery(sesion.idEscenario ?? 0), enabled: sesion.idEscenario !== null })
  const telemetria = useQuery(telemetriaQuery(id))
  const propuesta = new Map((telemetria.data?.propuesta ?? []).map((p) => [p.idIndicador, p]))
  const error = errorDePrimeraCarga(escenario)

  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [filas, setFilas] = useState<Record<number, FilaCalificacion>>({})
  const [notasBriefing, setNotasBriefing] = useState('')
  const [notasDebrief, setNotasDebrief] = useState('')
  const [autoevaluacion, setAutoevaluacion] = useState('')

  const guardar = useMutation({
    mutationFn: () =>
      calificarSesion(id, {
        notasBriefing,
        notasDebrief,
        autoevaluacionAlumno: autoevaluacion,
        resultados: (escenario.data?.indicadores ?? []).map((indicador) => ({
          idIndicador: indicador.id,
          calificacion: Number(filas[indicador.id]?.calificacion ?? String(propuesta.get(indicador.id)?.calificacion ?? 3)),
          comentario: filas[indicador.id]?.comentario ?? propuesta.get(indicador.id)?.motivo ?? '',
        })),
      }),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesSesiones.todo })
      await navegar({ to: '/sesiones-simulador/$id', params: { id: String(id) } })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo guardar la calificación.'),
  })

  if (error !== null) return <AvisoDeError error={error} alReintentar={() => void escenario.refetch()} />
  if (!escenario.data) return <p className="text-sm text-muted-foreground">Cargando el escenario…</p>

  function fijar(idIndicador: number, cambio: Partial<FilaCalificacion>) {
    setFilas((previas) => {
      const sugerida = propuesta.get(idIndicador)
      const previa = previas[idIndicador] ?? {
        calificacion: String(sugerida?.calificacion ?? 3),
        comentario: sugerida?.motivo ?? '',
      }
      return { ...previas, [idIndicador]: { ...previa, ...cambio } }
    })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        titulo="Calificar sesión"
        descripcion={`${escenario.data.nombre} · grado CBTA 1 (no competente) a 5.`}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Indicadores de competencia</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {escenario.data.indicadores.map((indicador) => (
            <div key={indicador.id} className="grid gap-3 sm:grid-cols-[2fr_auto_2fr] sm:items-end">
              <Field>
                <FieldLabel htmlFor={`calif-${indicador.id}`}>{indicador.nombre}</FieldLabel>
                <NativeSelect
                  id={`calif-${indicador.id}`}
                  value={filas[indicador.id]?.calificacion ?? String(propuesta.get(indicador.id)?.calificacion ?? 3)}
                  onChange={(evento) => fijar(indicador.id, { calificacion: evento.target.value })}
                >
                  {GRADOS.map((g) => (
                    <NativeSelectOption key={g} value={g}>
                      {g}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <span className="hidden text-sm text-muted-foreground sm:block sm:pb-2">
                {propuesta.has(indicador.id) ? `Propuesto por la cabina: ${propuesta.get(indicador.id)!.calificacion}` : (indicador.competencia ?? '')}
              </span>
              <Field>
                <FieldLabel htmlFor={`comentario-${indicador.id}`}>Comentario</FieldLabel>
                <Input
                  id={`comentario-${indicador.id}`}
                  value={filas[indicador.id]?.comentario ?? propuesta.get(indicador.id)?.motivo ?? ''}
                  onChange={(evento) => fijar(indicador.id, { comentario: evento.target.value })}
                />
              </Field>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Briefing y debrief</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="notas-briefing">Notas de briefing</FieldLabel>
            <Textarea id="notas-briefing" value={notasBriefing} onChange={(e) => setNotasBriefing(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="notas-debrief">Notas de debrief</FieldLabel>
            <Textarea id="notas-debrief" value={notasDebrief} onChange={(e) => setNotasDebrief(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="autoevaluacion">Autoevaluación del alumno</FieldLabel>
            <Textarea id="autoevaluacion" value={autoevaluacion} onChange={(e) => setAutoevaluacion(e.target.value)} />
          </Field>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button disabled={guardar.isPending} onClick={() => guardar.mutate()}>
          {guardar.isPending ? 'Guardando…' : 'Guardar calificación'}
        </Button>
      </div>
    </div>
  )
}

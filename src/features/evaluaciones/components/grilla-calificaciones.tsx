import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { StatusBadge } from '@/components/status-badge'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { contarRespectoAlEstandar, esBajoEstandar, esNotaDirbe, NOTAS_DIRBE, opcionesDeNota } from '@/lib/dominio/dirbe'
import { CLASES_ETIQUETA_DEBRIEFING } from '@/lib/dominio/tonos'
import { CALIFICATIVOS } from '@/lib/dominio/vocabulario'
import type { ValoresEvaluacion } from '../schemas'

const CAMPOS_DEBRIEFING = [
  ['observacion', 'Observación'],
  ['causa', 'Causa'],
  ['recomendacion', 'Recomendación'],
] as const

type Props = {
  control: Control<ValoresEvaluacion>
  register: UseFormRegister<ValoresEvaluacion>
  errores: FieldErrors<ValoresEvaluacion>['calificaciones']
}

export function GrillaCalificaciones({ control, register, errores }: Props) {
  const calificaciones = useWatch({ control, name: 'calificaciones' })
  const conteo = contarRespectoAlEstandar(calificaciones)

  return (
    <div className="grid gap-4">
      <p aria-live="polite" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
        <span>Bajo el estándar: {conteo.bajo}</span>
        <span>Sobre el estándar: {conteo.sobre}</span>
        <span>Sin calificar: {conteo.sinCalificar}</span>
      </p>
      {calificaciones.map((calificacion, indice) => {
        const error = errores?.[indice]
        const permitidas = esNotaDirbe(calificacion.notaMin) ? opcionesDeNota(calificacion.notaMin) : []
        const bajo = esBajoEstandar(calificacion.notaMin, calificacion.nota)
        return (
          <FieldSet key={calificacion.idManiobra} className="rounded-lg border p-4">
            <FieldLegend className="flex flex-wrap items-center gap-2">
              {calificacion.maniobra}
              <span className="text-xs font-normal text-muted-foreground">Nota mínima</span>
              <StatusBadge vocabulario="calificativo" valor={calificacion.notaMin} />
            </FieldLegend>
            <Field data-invalid={Boolean(error?.nota)}>
              <Controller
                control={control}
                name={`calificaciones.${indice}.nota`}
                render={({ field }) => (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={0}
                    aria-label={`Calificación de ${calificacion.maniobra}`}
                    value={field.value}
                    onValueChange={(valor) => {
                      if (valor) field.onChange(valor)
                    }}
                  >
                    {NOTAS_DIRBE.map((nota) => (
                      <ToggleGroupItem
                        key={nota}
                        value={nota}
                        disabled={!permitidas.includes(nota)}
                        aria-label={`${nota} (${CALIFICATIVOS[nota].descripcion})`}
                        className="w-10"
                      >
                        {nota}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
              <FieldError errors={[error?.nota]} />
            </Field>
            {bajo && (
              <div className="grid gap-3 md:grid-cols-3">
                {CAMPOS_DEBRIEFING.map(([campo, etiqueta]) => (
                  <Field key={campo} data-invalid={Boolean(error?.[campo])}>
                    <FieldLabel htmlFor={`calificacion-${indice}-${campo}`} className={CLASES_ETIQUETA_DEBRIEFING[campo]}>
                      {etiqueta}
                    </FieldLabel>
                    <Textarea
                      id={`calificacion-${indice}-${campo}`}
                      aria-invalid={Boolean(error?.[campo])}
                      {...register(`calificaciones.${indice}.${campo}`)}
                    />
                    <FieldError errors={[error?.[campo]]} />
                  </Field>
                ))}
              </div>
            )}
          </FieldSet>
        )
      })}
    </div>
  )
}

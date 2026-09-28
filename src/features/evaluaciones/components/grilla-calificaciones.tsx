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

/**
 * LAS FLECHAS TIENEN QUE SELECCIONAR, NO SÓLO MOVER EL FOCO. `ToggleGroup` con `type="single"` se
 * anuncia como `role="radiogroup"` con items `role="radio"`, y el patrón WAI-ARIA de radiogroup exige
 * que la flecha CAMBIE la selección. Radix sólo mueve el foco: medido en un banco aparte, tras
 * `Tab` + `ArrowRight` el foco pasaba de `D` a `I` y quedaban **cero** items con `aria-checked="true"`.
 * En la pantalla que registra las notas de un alumno, eso es recorrer la escala con el teclado
 * creyendo elegir y no elegir nada.
 *
 * No se llama `preventDefault`: Radix mueve el foco al siguiente item HABILITADO, y acá se elige de la
 * misma lista y en el mismo orden, así que foco y selección terminan en el mismo sitio. `permitidas`
 * ya excluye las notas que el estándar no admite —son las que van `disabled` y las que Radix saltea—,
 * y el módulo queda igual: no se tocó `components/ui/toggle-group.tsx`, que lo comparten pantallas
 * donde la semántica de *toggle* sí es la correcta.
 */
const PASO_POR_TECLA: Record<string, number | undefined> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
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
        const idErrorNota = `calificacion-${indice}-nota-error`
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
                    aria-invalid={Boolean(error?.nota)}
                    aria-describedby={error?.nota ? idErrorNota : undefined}
                    value={field.value}
                    onValueChange={(valor) => {
                      if (valor) field.onChange(valor)
                    }}
                    onKeyDown={(evento) => {
                      const paso = PASO_POR_TECLA[evento.key]
                      if (paso === undefined) return
                      const orden = NOTAS_DIRBE.filter((nota) => permitidas.includes(nota))
                      // SE PARTE DEL ITEM ENFOCADO, NO DE `field.value`, y la diferencia importa: con
                      // nada seleccionado, Radix mueve el foco de la primera a la segunda nota mientras
                      // `field.value` sigue vacío. Partir del valor elegiría la PRIMERA y dejaría el foco
                      // en la segunda — foco y selección separados, que es peor que el defecto original.
                      const enfocada = (evento.target as HTMLElement).dataset.nota
                      const actual = enfocada === undefined ? -1 : orden.indexOf(enfocada as (typeof orden)[number])
                      if (actual === -1) return
                      const proxima = orden[(actual + paso + orden.length) % orden.length]
                      if (proxima !== undefined) field.onChange(proxima)
                    }}
                  >
                    {NOTAS_DIRBE.map((nota) => (
                      <ToggleGroupItem
                        key={nota}
                        ref={nota === permitidas[0] ? field.ref : undefined}
                        value={nota}
                        data-nota={nota}
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
              <FieldError id={idErrorNota} errors={[error?.nota]} />
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

import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  MARCADOR_COMPLETAR,
  respuestaCorrecta,
  TEXTO_CUESTIONARIO_SIN_NOTA,
} from '@/lib/dominio/aprendizaje'
import type { Cuestionario, Pregunta } from '../api'

const VERDADERO_FALSO = [
  { valor: 'true', etiqueta: 'Verdadero' },
  { valor: 'false', etiqueta: 'Falso' },
] as const

function etiquetaDeRespuesta(pregunta: Pregunta, valor: string): string {
  if (valor.trim() === '') return 'Sin responder'
  if (pregunta.type === 'multiple_choice') {
    return pregunta.options?.find((opcion) => opcion.id === valor)?.text ?? valor
  }
  if (pregunta.type === 'true_false') {
    return VERDADERO_FALSO.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor
  }
  return valor
}

function EnunciadoConCampo({
  pregunta,
  numero,
  valor,
  alCambiar,
  bloqueado,
}: {
  pregunta: Pregunta
  numero: number
  valor: string
  alCambiar: (siguiente: string) => void
  bloqueado: boolean
}) {
  const [antes, ...resto] = pregunta.prompt.split(MARCADOR_COMPLETAR)
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span>{antes}</span>
      <Input
        className="w-48"
        aria-label={`Respuesta de la pregunta ${numero}`}
        disabled={bloqueado}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
      />
      <span>{resto.join(MARCADOR_COMPLETAR)}</span>
    </p>
  )
}

export function ResolucionDeCuestionario({ cuestionario }: { cuestionario: Cuestionario }) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [entregado, setEntregado] = useState(false)
  const total = cuestionario.preguntas.length
  const respuestaDe = (pregunta: Pregunta) => respuestas[pregunta.id] ?? ''
  const completas = cuestionario.preguntas.every((pregunta) => respuestaDe(pregunta).trim() !== '')
  const aciertos = cuestionario.preguntas.filter((pregunta) =>
    respuestaCorrecta(pregunta.type, pregunta.correctAnswer, respuestaDe(pregunta)),
  ).length
  const porcentaje = total === 0 ? 0 : Math.round((aciertos / total) * 100)

  function responder(pregunta: Pregunta, valor: string) {
    setRespuestas((previas) => ({ ...previas, [pregunta.id]: valor }))
  }

  return (
    <section aria-label="Preguntas del cuestionario" className="grid gap-4">
      {entregado && (
        <Alert>
          <AlertDescription className="grid gap-1">
            <span className="font-medium tabular-nums">
              Aciertos: {aciertos} de {total} ({porcentaje} %)
            </span>
            <span>{TEXTO_CUESTIONARIO_SIN_NOTA}</span>
          </AlertDescription>
        </Alert>
      )}
      {cuestionario.preguntas.map((pregunta, indice) => {
        const numero = indice + 1
        const dada = respuestaDe(pregunta)
        const correcta = respuestaCorrecta(pregunta.type, pregunta.correctAnswer, dada)
        return (
          <Card key={pregunta.id} role="group" aria-label={`Pregunta ${numero}`}>
            <CardHeader>
              <CardTitle>
                <h3>Pregunta {numero}</h3>
              </CardTitle>
              {pregunta.type === 'fill_blank' ? (
                <EnunciadoConCampo
                  pregunta={pregunta}
                  numero={numero}
                  valor={dada}
                  bloqueado={entregado}
                  alCambiar={(siguiente) => responder(pregunta, siguiente)}
                />
              ) : (
                <p>{pregunta.prompt}</p>
              )}
            </CardHeader>
            <CardContent className="grid gap-3">
              {pregunta.type !== 'fill_blank' && (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="flex flex-wrap justify-start"
                  aria-label={`Respuesta de la pregunta ${numero}`}
                  value={dada}
                  disabled={entregado}
                  onValueChange={(valor) => valor !== '' && responder(pregunta, valor)}
                >
                  {(pregunta.type === 'multiple_choice'
                    ? (pregunta.options ?? []).map((opcion) => ({ valor: opcion.id, etiqueta: opcion.text }))
                    : VERDADERO_FALSO.map((opcion) => ({ valor: opcion.valor, etiqueta: opcion.etiqueta }))
                  ).map((opcion) => (
                    <ToggleGroupItem key={opcion.valor} value={opcion.valor} aria-label={opcion.etiqueta}>
                      {opcion.etiqueta}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              {entregado && (
                <div className="grid gap-1 text-sm">
                  <StatusBadge
                    vocabulario="respuesta"
                    valor={correcta ? 'correcta' : 'incorrecta'}
                    className="w-fit"
                  />
                  <p>Su respuesta: {etiquetaDeRespuesta(pregunta, dada)}</p>
                  <p>Respuesta correcta: {etiquetaDeRespuesta(pregunta, pregunta.correctAnswer)}</p>
                  {pregunta.explanation && <p className="text-muted-foreground">{pregunta.explanation}</p>}
                  {pregunta.sourceExcerpt && <p className="text-muted-foreground">«{pregunta.sourceExcerpt}»</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
      {!entregado && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!completas && <p className="text-sm text-muted-foreground">Responda las {total} preguntas para entregar.</p>}
          <ConfirmDialog
            disparador={
              <Button type="button" disabled={!completas}>
                Entregar
              </Button>
            }
            titulo="¿Entregar el cuestionario?"
            descripcion={TEXTO_CUESTIONARIO_SIN_NOTA}
            confirmar="Entregar"
            alConfirmar={() => setEntregado(true)}
          />
        </div>
      )}
    </section>
  )
}

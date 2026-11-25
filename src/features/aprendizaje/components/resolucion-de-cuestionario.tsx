import { useMutation } from '@tanstack/react-query'
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
  TEXTO_CUESTIONARIO_SIN_NOTA,
  TEXTO_INTENTO_NO_REGISTRADO,
} from '@/lib/dominio/aprendizaje'
import { registrarIntento, type Cuestionario, type Pregunta } from '../api'

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
  const entrega = useMutation({ mutationFn: () => registrarIntento(cuestionario.id, respuestas) })
  const resultado = entrega.data
  const entregado = resultado !== undefined
  const bloqueado = entregado || entrega.isPending
  const total = cuestionario.preguntas.length
  const respuestaDe = (pregunta: Pregunta) => respuestas[pregunta.id] ?? ''
  const completas = cuestionario.preguntas.every((pregunta) => respuestaDe(pregunta).trim() !== '')
  const aciertos = resultado?.correctCount ?? 0
  const porcentaje = !resultado || resultado.totalCount === 0 ? 0 : Math.round((aciertos / resultado.totalCount) * 100)
  const corregida = (pregunta: Pregunta) => resultado?.answers.find((respuesta) => respuesta.questionId === pregunta.id)

  function responder(pregunta: Pregunta, valor: string) {
    setRespuestas((previas) => ({ ...previas, [pregunta.id]: valor }))
  }

  return (
    <section aria-label="Preguntas del cuestionario" className="grid gap-4">
      {entregado && (
        <Alert>
          <AlertDescription className="grid gap-1">
            <span className="font-medium tabular-nums">
              Aciertos: {aciertos} de {resultado.totalCount} ({porcentaje} %)
            </span>
            <span>{TEXTO_CUESTIONARIO_SIN_NOTA}</span>
          </AlertDescription>
        </Alert>
      )}
      {cuestionario.preguntas.map((pregunta, indice) => {
        const numero = indice + 1
        const dada = respuestaDe(pregunta)
        const correccion = corregida(pregunta)
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
                  bloqueado={bloqueado}
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
                  disabled={bloqueado}
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
              {correccion && (
                <div className="grid gap-1 text-sm">
                  <StatusBadge
                    vocabulario="respuesta"
                    valor={correccion.isCorrect ? 'correcta' : 'incorrecta'}
                    className="w-fit"
                  />
                  <p>Su respuesta: {etiquetaDeRespuesta(pregunta, dada)}</p>
                  <p>
                    Respuesta correcta: {etiquetaDeRespuesta(pregunta, correccion.correctAnswer ?? pregunta.correctAnswer)}
                  </p>
                  {pregunta.explanation && <p className="text-muted-foreground">{pregunta.explanation}</p>}
                  {pregunta.sourceExcerpt && <p className="text-muted-foreground">«{pregunta.sourceExcerpt}»</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
      {entrega.isError && (
        <Alert variant="destructive">
          <AlertDescription>{TEXTO_INTENTO_NO_REGISTRADO}</AlertDescription>
        </Alert>
      )}
      {!entregado && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!completas && <p className="text-sm text-muted-foreground">Responda las {total} preguntas para entregar.</p>}
          <ConfirmDialog
            disparador={
              <Button type="button" disabled={!completas || entrega.isPending}>
                {entrega.isPending ? 'Entregando…' : 'Entregar'}
              </Button>
            }
            titulo="¿Entregar el cuestionario?"
            descripcion={TEXTO_CUESTIONARIO_SIN_NOTA}
            confirmar="Entregar"
            alConfirmar={() => entrega.mutate()}
          />
        </div>
      )}
    </section>
  )
}

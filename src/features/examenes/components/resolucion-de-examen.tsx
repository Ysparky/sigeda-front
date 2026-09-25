import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MARCADOR_COMPLETAR, TEXTO_AUTOGUARDADO_FALLIDO, TEXTO_GUARDADO, TEXTO_GUARDANDO } from '@/lib/dominio/teoria'
import type { ExamenEnCurso, PreguntaDeExamen } from '../api'
import type { EstadoGuardado, Respuestas } from '../autoguardado'

function EnunciadoConCampo({
  pregunta,
  valor,
  bloqueado,
  alCambiar,
}: {
  pregunta: PreguntaDeExamen
  valor: string
  bloqueado: boolean
  alCambiar: (siguiente: string) => void
}) {
  const [antes, ...resto] = pregunta.enunciado.split(MARCADOR_COMPLETAR)
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span>{antes}</span>
      <Input
        className="w-48"
        aria-label={`Respuesta de la pregunta ${pregunta.orden}`}
        disabled={bloqueado}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
      />
      <span>{resto.join(MARCADOR_COMPLETAR)}</span>
    </p>
  )
}

type Props = {
  examen: ExamenEnCurso
  respuestas: Respuestas
  estado: EstadoGuardado
  bloqueado: boolean
  alResponder: (idPregunta: number, valor: string) => void
  alReintentar: () => void
}

export function ResolucionDeExamen({ examen, respuestas, estado, bloqueado, alResponder, alReintentar }: Props) {
  return (
    <section aria-label="Preguntas del examen" className="grid gap-4">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {estado === 'guardando' ? TEXTO_GUARDANDO : estado === 'guardado' ? TEXTO_GUARDADO : ''}
      </p>
      {estado === 'error' && (
        <Alert variant="destructive">
          <AlertDescription className="grid gap-3">
            <span>{TEXTO_AUTOGUARDADO_FALLIDO}</span>
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={alReintentar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {examen.preguntas.map((pregunta) => {
        const valor = respuestas[pregunta.idPregunta] ?? ''
        return (
          <Card key={pregunta.idPregunta} role="group" aria-label={`Pregunta ${pregunta.orden}`}>
            <CardHeader>
              <CardTitle>
                <h2>
                  Pregunta {pregunta.orden} · {pregunta.puntajeMaximo}{' '}
                  {pregunta.puntajeMaximo === 1 ? 'punto' : 'puntos'}
                </h2>
              </CardTitle>
              {pregunta.tipoPregunta === 'COMPLETAR' ? (
                <EnunciadoConCampo
                  pregunta={pregunta}
                  valor={valor}
                  bloqueado={bloqueado}
                  alCambiar={(siguiente) => alResponder(pregunta.idPregunta, siguiente)}
                />
              ) : (
                <p>{pregunta.enunciado}</p>
              )}
            </CardHeader>
            {pregunta.tipoPregunta !== 'COMPLETAR' && (
              <CardContent>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="flex flex-wrap justify-start"
                  aria-label={`Respuesta de la pregunta ${pregunta.orden}`}
                  value={valor}
                  disabled={bloqueado}
                  onValueChange={(siguiente) => siguiente !== '' && alResponder(pregunta.idPregunta, siguiente)}
                >
                  {pregunta.alternativas.map((alternativa) => (
                    <ToggleGroupItem
                      key={alternativa.id}
                      value={String(alternativa.id)}
                      aria-label={alternativa.respuesta}
                    >
                      {alternativa.respuesta}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </CardContent>
            )}
          </Card>
        )
      })}
    </section>
  )
}

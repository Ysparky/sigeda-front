import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { TEXTO_RESPUESTA_SIN_FUENTES, trozosConCitas } from '@/lib/dominio/aprendizaje'
import type { MensajeChat } from '../api'
import { C10_SIN_RESPUESTA } from '../mensajes'
import { CitaDeFuente } from './cita-de-fuente'

function Respuesta({ mensaje }: { mensaje: MensajeChat }) {
  const fuentes = mensaje.fuentes
  if (fuentes === null) return <p>{mensaje.content}</p>
  return (
    <p>
      {trozosConCitas(mensaje.content, fuentes.length).map((trozo, indice) => {
        const fuente = trozo.cita === null ? undefined : fuentes[trozo.cita - 1]
        return fuente === undefined ? (
          <span key={`${indice}-texto`}>{trozo.texto}</span>
        ) : (
          <CitaDeFuente key={`${indice}-cita`} etiqueta={trozo.texto} fuente={fuente} />
        )
      })}
    </p>
  )
}

export function Conversacion({ mensajes }: { mensajes: readonly MensajeChat[] }) {
  return (
    <section aria-label="Conversación" className="grid gap-3">
      {mensajes.map((mensaje) => (
        <Card
          key={mensaje.id}
          role="group"
          aria-label={mensaje.role === 'user' ? 'Su pregunta' : 'Respuesta'}
          className={mensaje.role === 'user' ? 'bg-muted' : undefined}
        >
          <CardContent className="grid gap-2">
            {mensaje.role === 'user' ? <p>{mensaje.content}</p> : <Respuesta mensaje={mensaje} />}
            {mensaje.role === 'assistant' &&
              mensaje.fuentes !== null &&
              mensaje.fuentes.length === 0 &&
              mensaje.content !== C10_SIN_RESPUESTA && (
                <Alert>
                  <AlertDescription>{TEXTO_RESPUESTA_SIN_FUENTES}</AlertDescription>
                </Alert>
              )}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

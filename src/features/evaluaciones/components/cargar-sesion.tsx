import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { useIngerirSesion, type ManiobraMedida } from '@/features/simulador/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'

type Props = { idTurno: number; codAlumno: string; dispositivo: string | null }

/**
 * Carga la telemetría de la sesión de simulador (pegada como JSON) y la ingiere. Al terminar, el
 * backend recalcula la propuesta y la pantalla de evaluación la vuelve a leer (el hook invalida la
 * query). El instructor sigue siendo quien confirma y firma.
 */
export function CargarSesionSimulador({ idTurno, codAlumno, dispositivo }: Props) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ingerir = useIngerirSesion(idTurno)

  function enviar() {
    setError(null)
    let maniobras: ManiobraMedida[]
    try {
      const parseado = JSON.parse(texto) as unknown
      const crudo = Array.isArray(parseado)
        ? parseado
        : ((parseado as { maniobras?: unknown }).maniobras ?? [])
      if (!Array.isArray(crudo)) throw new Error('forma inválida')
      maniobras = crudo as ManiobraMedida[]
    } catch {
      setError('La telemetría no es un JSON válido con una lista de maniobras.')
      return
    }
    ingerir.mutate(
      { codAlumno, dispositivo, fuente: 'pegado-manual', maniobras },
      {
        onSuccess: () => {
          toast.success('Telemetría ingerida; la propuesta se actualizó.')
          setTexto('')
        },
        onError: (fallo) => setError(fallo instanceof ApiError ? fallo.message : MENSAJE_GENERICO),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Telemetría del simulador</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="telemetria">Sesión de simulador (JSON)</FieldLabel>
          <Textarea
            id="telemetria"
            rows={4}
            value={texto}
            aria-invalid={Boolean(error)}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder='{"maniobras":[{"idManiobra":1,"mediciones":[{"clave":"ALTITUD","valor":1012}]}]}'
          />
          <FieldDescription>Pegue la telemetría exportada; se contrastará contra las tolerancias de cada maniobra.</FieldDescription>
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <div className="flex justify-end">
          <Button type="button" onClick={enviar} disabled={ingerir.isPending || texto.trim() === ''}>
            {ingerir.isPending ? 'Cargando…' : 'Cargar telemetría'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

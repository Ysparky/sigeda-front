import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Cuestionario } from '../api'

export function ResolucionDeCuestionario({ cuestionario }: { cuestionario: Cuestionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Cuestionario de práctica</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{cuestionario.preguntas.length} preguntas</p>
      </CardContent>
    </Card>
  )
}

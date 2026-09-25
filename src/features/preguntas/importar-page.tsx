import { useState } from 'react'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Cuestionario } from '@/features/aprendizaje/api'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_REVISAR_IMPORTACION } from '@/lib/dominio/teoria'
import { FormularioImportacion } from './components/formulario-importacion'
import type { ValoresImportacion } from './schemas'

export function ImportarPreguntasPage() {
  const [generado, setGenerado] = useState<{ cuestionario: Cuestionario; valores: ValoresImportacion } | null>(null)

  return (
    <>
      <PageHeader titulo={PANTALLAS.importarPreguntas.titulo} descripcion={PANTALLAS.importarPreguntas.descripcion} />
      <AvisoDeTeoria accion="importarPreguntas" />
      {generado === null ? (
        <FormularioImportacion alGenerar={(cuestionario, valores) => setGenerado({ cuestionario, valores })} />
      ) : (
        <>
          <Alert>
            <AlertDescription>{TEXTO_REVISAR_IMPORTACION}</AlertDescription>
          </Alert>
          <ul aria-label="Preguntas generadas" className="grid gap-2">
            {generado.cuestionario.preguntas.map((pregunta) => (
              <li key={pregunta.id}>{pregunta.prompt}</li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

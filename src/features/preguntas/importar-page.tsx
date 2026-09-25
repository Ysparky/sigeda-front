import { useState } from 'react'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { FormularioImportacion } from './components/formulario-importacion'
import { TablaDeImportacion } from './components/tabla-de-importacion'
import { filasDesdeIa, type FilaImportacion } from './importacion'

export function ImportarPreguntasPage() {
  const [filas, setFilas] = useState<FilaImportacion[] | null>(null)

  return (
    <>
      <PageHeader titulo={PANTALLAS.importarPreguntas.titulo} descripcion={PANTALLAS.importarPreguntas.descripcion} />
      <AvisoDeTeoria accion="importarPreguntas" />
      {filas === null ? (
        <FormularioImportacion
          alGenerar={(cuestionario, valores) =>
            setFilas(filasDesdeIa(cuestionario.preguntas, valores.idMateria, valores.dificultad))
          }
        />
      ) : (
        <TablaDeImportacion filas={filas} />
      )}
    </>
  )
}

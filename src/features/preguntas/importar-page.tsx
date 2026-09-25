import { useState } from 'react'
import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_TEORIA_SOLO_MOCK } from '@/lib/dominio/teoria'
import { FormularioImportacion } from './components/formulario-importacion'
import { TablaDeImportacion } from './components/tabla-de-importacion'
import { filasDesdeIa, type FilaImportacion } from './importacion'

export function ImportarPreguntasPage() {
  const [filas, setFilas] = useState<FilaImportacion[] | null>(null)

  return (
    <>
      <PageHeader titulo={PANTALLAS.importarPreguntas.titulo} descripcion={PANTALLAS.importarPreguntas.descripcion} />
      <AvisoDeDependencia accion="importarPreguntas" texto={TEXTO_TEORIA_SOLO_MOCK} />
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

import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function ImportarPreguntasPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.importarPreguntas.titulo} descripcion={PANTALLAS.importarPreguntas.descripcion} />
      <AvisoDeTeoria accion="importarPreguntas" />
    </>
  )
}

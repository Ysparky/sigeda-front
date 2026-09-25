import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'

export function CuestionarioPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.cuestionario.titulo} descripcion={PANTALLAS.cuestionario.descripcion} />
      <AvisoDocumentosCompartidos />
    </>
  )
}

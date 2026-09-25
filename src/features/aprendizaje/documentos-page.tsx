import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'

export function DocumentosPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.documentos.titulo} descripcion={PANTALLAS.documentos.descripcion} />
      <AvisoDocumentosCompartidos />
    </>
  )
}

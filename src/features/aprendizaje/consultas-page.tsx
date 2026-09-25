import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'

export function ConsultasPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.consultas.titulo} descripcion={PANTALLAS.consultas.descripcion} />
      <AvisoDocumentosCompartidos />
    </>
  )
}

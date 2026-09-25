import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function BancoPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.banco.titulo} descripcion={PANTALLAS.banco.descripcion} />
      <AvisoDeTeoria accion="gestionarPreguntas" />
    </>
  )
}

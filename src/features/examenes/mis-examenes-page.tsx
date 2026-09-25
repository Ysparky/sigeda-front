import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function MisExamenesPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.misExamenes.titulo} descripcion={PANTALLAS.misExamenes.descripcion} />
      <AvisoDeTeoria accion="rendirExamen" />
    </>
  )
}

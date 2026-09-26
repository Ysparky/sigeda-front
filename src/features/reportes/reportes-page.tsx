import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_INDICES_SOLO_MOCK, TEXTO_ORDEN_MERITO_SIN_SERVIDOR } from '@/lib/dominio/seguimiento'

export function ReportesPage() {
  return (
    <div className="grid gap-4">
      <PageHeader titulo={PANTALLAS.reportes.titulo} descripcion={PANTALLAS.reportes.descripcion} />
      <AvisoDeDependencia accion="verOrdenMerito" texto={TEXTO_INDICES_SOLO_MOCK} />
      <AvisoDeDependencia accion="verOrdenMerito" texto={TEXTO_ORDEN_MERITO_SIN_SERVIDOR} />
    </div>
  )
}

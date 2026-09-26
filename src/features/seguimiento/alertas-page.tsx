import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_ALERTAS_SIN_SERVIDOR } from '@/lib/dominio/seguimiento'

export function AlertasPage() {
  return (
    <div className="grid gap-4">
      <PageHeader titulo={PANTALLAS.alertas.titulo} descripcion={PANTALLAS.alertas.descripcion} />
      <AvisoDeDependencia accion="verAlertas" texto={TEXTO_ALERTAS_SIN_SERVIDOR} />
    </div>
  )
}

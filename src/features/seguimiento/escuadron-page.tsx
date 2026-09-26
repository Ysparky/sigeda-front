import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function EscuadronPage() {
  return <PageHeader titulo={PANTALLAS.escuadron.titulo} descripcion={PANTALLAS.escuadron.descripcion} />
}

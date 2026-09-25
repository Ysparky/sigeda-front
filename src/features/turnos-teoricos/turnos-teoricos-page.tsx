import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function TurnosTeoricosPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.turnosTeoricos.titulo} descripcion={PANTALLAS.turnosTeoricos.descripcion} />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
    </>
  )
}

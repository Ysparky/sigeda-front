import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function RendirExamenPage({ idTurno }: { idTurno: number }) {
  void idTurno
  return (
    <>
      <PageHeader titulo={PANTALLAS.rendirExamen.titulo} descripcion={PANTALLAS.rendirExamen.descripcion} />
      <AvisoDeTeoria accion="rendirExamen" />
    </>
  )
}

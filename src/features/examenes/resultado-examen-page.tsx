import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function ResultadoExamenPage({ idTurno }: { idTurno: number }) {
  void idTurno
  return (
    <>
      <PageHeader titulo={PANTALLAS.resultadoExamen.titulo} descripcion={PANTALLAS.resultadoExamen.descripcion} />
      <AvisoDeTeoria accion="rendirExamen" />
    </>
  )
}

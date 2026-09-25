import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function ResultadosTurnoPage({ id }: { id: number }) {
  void id
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.resultadosTurnoTeorico.titulo}
        descripcion={PANTALLAS.resultadosTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
    </>
  )
}

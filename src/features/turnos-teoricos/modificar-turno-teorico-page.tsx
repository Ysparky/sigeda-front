import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function ModificarTurnoTeoricoPage({ id }: { id: number }) {
  void id
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.modificarTurnoTeorico.titulo}
        descripcion={PANTALLAS.modificarTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
    </>
  )
}

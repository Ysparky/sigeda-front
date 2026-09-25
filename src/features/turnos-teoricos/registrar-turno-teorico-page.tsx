import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function RegistrarTurnoTeoricoPage() {
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.registrarTurnoTeorico.titulo}
        descripcion={PANTALLAS.registrarTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
    </>
  )
}

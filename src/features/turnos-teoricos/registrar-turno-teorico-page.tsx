import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { FormularioTurnoTeorico } from './components/formulario-turno-teorico'
import { turnoTeoricoVacio } from './schemas'

export function RegistrarTurnoTeoricoPage() {
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.registrarTurnoTeorico.titulo}
        descripcion={PANTALLAS.registrarTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
      <FormularioTurnoTeorico valoresIniciales={turnoTeoricoVacio()} />
    </>
  )
}

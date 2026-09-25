import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_TEORIA_SOLO_MOCK } from '@/lib/dominio/teoria'
import { FormularioTurnoTeorico } from './components/formulario-turno-teorico'
import { turnoTeoricoVacio } from './schemas'

export function RegistrarTurnoTeoricoPage() {
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.registrarTurnoTeorico.titulo}
        descripcion={PANTALLAS.registrarTurnoTeorico.descripcion}
      />
      <AvisoDeDependencia accion="programarTurnoTeorico" texto={TEXTO_TEORIA_SOLO_MOCK} />
      <FormularioTurnoTeorico valoresIniciales={turnoTeoricoVacio()} />
    </>
  )
}

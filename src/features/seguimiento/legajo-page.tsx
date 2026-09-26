import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_INDICES_SOLO_MOCK } from '@/lib/dominio/seguimiento'

export function LegajoPage({ codAlumno }: { codAlumno: string }) {
  return (
    <div className="grid gap-4">
      <PageHeader titulo={PANTALLAS.legajo.titulo} descripcion={PANTALLAS.legajo.descripcion} />
      <p className="sr-only">Legajo de {codAlumno}</p>
      <AvisoDeDependencia accion="verIndices" texto={TEXTO_INDICES_SOLO_MOCK} />
    </div>
  )
}

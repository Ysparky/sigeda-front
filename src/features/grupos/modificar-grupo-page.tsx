import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarGrupoPage({ id }: Props) {
  return <PageHeader titulo="Modificar grupo" descripcion={String(id)} />
}

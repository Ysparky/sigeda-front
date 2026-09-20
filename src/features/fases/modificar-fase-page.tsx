import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarFasePage({ id }: Props) {
  return <PageHeader titulo="Modificar fase" descripcion={String(id)} />
}

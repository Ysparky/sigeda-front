import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function GrupoPage({ id }: Props) {
  return <PageHeader titulo="Detalle de grupo" descripcion={String(id)} />
}

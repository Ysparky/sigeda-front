import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function FasePage({ id }: Props) {
  return <PageHeader titulo="Detalle de fase" descripcion={String(id)} />
}

import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ManiobraPage({ id }: Props) {
  return <PageHeader titulo="Detalle de maniobra" descripcion={String(id)} />
}

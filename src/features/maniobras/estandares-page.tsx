import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function EstandaresPage({ id }: Props) {
  return <PageHeader titulo="Estándares de la maniobra" descripcion={String(id)} />
}

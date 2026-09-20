import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarManiobraPage({ id }: Props) {
  return <PageHeader titulo="Modificar maniobra" descripcion={String(id)} />
}

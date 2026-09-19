import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function TurnoPage({ id }: Props) {
  return <PageHeader titulo="Detalle de turno" descripcion={`${id}`} />
}

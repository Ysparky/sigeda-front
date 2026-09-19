import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarTurnoPage({ id }: Props) {
  return <PageHeader titulo="Modificar turno" descripcion={`${id}`} />
}

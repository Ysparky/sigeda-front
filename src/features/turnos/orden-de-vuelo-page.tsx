import { PageHeader } from '@/components/page-header'

type Props = { fecha: string }

export function OrdenDeVueloPage({ fecha }: Props) {
  return <PageHeader titulo="Orden de vuelo del día" descripcion={`${fecha}`} />
}

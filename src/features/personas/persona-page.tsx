import { PageHeader } from '@/components/page-header'

type Props = { cod: string }

export function PersonaPage({ cod }: Props) {
  return <PageHeader titulo="Detalle de persona" descripcion={String(cod)} />
}

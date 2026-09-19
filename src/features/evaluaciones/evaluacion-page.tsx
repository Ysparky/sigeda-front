import { PageHeader } from '@/components/page-header'

type Props = { codigo: string }

export function EvaluacionPage({ codigo }: Props) {
  return <PageHeader titulo="Detalle de evaluación" descripcion={`${codigo}`} />
}

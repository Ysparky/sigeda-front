import { PageHeader } from '@/components/page-header'

type Props = { codigo: string }

export function ModificarEvaluacionPage({ codigo }: Props) {
  return <PageHeader titulo="Modificar evaluación" descripcion={`${codigo}`} />
}

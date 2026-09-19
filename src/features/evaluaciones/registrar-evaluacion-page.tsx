import { PageHeader } from '@/components/page-header'

type Props = { id: number; codAlumno: string }

export function RegistrarEvaluacionPage({ id, codAlumno }: Props) {
  return <PageHeader titulo="Registrar evaluación" descripcion={`${id} · ${codAlumno}`} />
}

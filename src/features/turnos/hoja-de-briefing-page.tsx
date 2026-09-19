import { PageHeader } from '@/components/page-header'

type Props = { id: number; codAlumno: string }

export function HojaDeBriefingPage({ id, codAlumno }: Props) {
  return <PageHeader titulo="Hoja de briefing" descripcion={`${id} · ${codAlumno}`} />
}

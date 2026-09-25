import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { accionDisponible } from '@/lib/dependencias'
import {
  etiquetaDeTipoExamen,
  TEXTO_SIN_EXAMENES_PENDIENTES,
  TEXTO_SUBSANACION_PENDIENTE,
  TEXTO_TEORIA_SOLO_MOCK,
  textoSeHabilita,
} from '@/lib/dominio/teoria'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasExamenes } from './api'

export function MisExamenesPage() {
  const sesion = useSesion()
  const codAlumno = sesion?.codPersona ?? ''
  const pendientes = useQuery(consultasExamenes.pendientes(codAlumno))
  const estadoTeorico = useQuery({
    ...consultasExamenes.estadoTeorico(codAlumno),
    enabled: codAlumno !== '' && accionDisponible('bloqueoSubsanacion'),
  })
  const error = errorDePrimeraCarga(pendientes)

  return (
    <>
      <PageHeader titulo={PANTALLAS.misExamenes.titulo} descripcion={PANTALLAS.misExamenes.descripcion} />
      <AvisoDeDependencia accion="rendirExamen" texto={TEXTO_TEORIA_SOLO_MOCK} />
      {estadoTeorico.data?.bloqueadoPorSubsanacion === true && (
        <Alert>
          <AlertDescription className="grid gap-1">
            <span>{TEXTO_SUBSANACION_PENDIENTE}</span>
            {estadoTeorico.data.motivo !== null && (
              <span className="text-sm text-muted-foreground">{estadoTeorico.data.motivo}</span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void pendientes.refetch()} />
      ) : pendientes.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : pendientes.data.length === 0 ? (
        <EmptyState titulo="Sin exámenes pendientes" descripcion={TEXTO_SIN_EXAMENES_PENDIENTES} />
      ) : (
        <section aria-label="Exámenes pendientes" className="grid gap-4">
          {pendientes.data.map((examen) => (
            <Card key={examen.idTurnoTeorico}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                <CardTitle>
                  <h2>{examen.nombre}</h2>
                </CardTitle>
                <StatusBadge vocabulario="turnoTeorico" valor={examen.estado} />
              </CardHeader>
              <CardContent className="grid gap-3">
                <dl className="grid gap-3 sm:grid-cols-4">
                  <div className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">Materia</dt>
                    <dd className="font-medium">{examen.materia}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">Tipo de examen</dt>
                    <dd className="font-medium">{etiquetaDeTipoExamen(examen.tipoExamen)}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">Fecha</dt>
                    <dd className="font-medium tabular-nums">{formatearFecha(examen.fechaExamen)}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">Horario</dt>
                    <dd className="font-medium tabular-nums">
                      {examen.horaInicio}–{examen.horaFin}
                    </dd>
                  </div>
                </dl>
                {examen.estado === 'PROGRAMADO' ? (
                  <p className="text-sm text-muted-foreground">
                    {textoSeHabilita(examen.fechaExamen, examen.horaInicio)}
                  </p>
                ) : (
                  <Button className="justify-self-start" asChild>
                    <Link to="/examenes/$id" params={{ id: String(examen.idTurnoTeorico) }}>
                      <GraduationCap aria-hidden />
                      {examen.estadoRendicion === 'EN_CURSO' ? 'Continuar el examen' : 'Rendir examen'}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </>
  )
}

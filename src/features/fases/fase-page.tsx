import { useMutation, useQueries, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { MENSAJE_FASE_ELIMINADA, TEXTO_FASE_SIN_SUBFASES } from '@/lib/dominio/programa'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesFases, consultasFases, eliminarFase } from './api'

export function FasePage({ id }: { id: number }) {
  const { data: fase } = useSuspenseQuery(consultasFases.detalle(id))
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const puedeGestionar = usePuede('Manage Phases')
  const disponible = accionDisponible('eliminarFase')
  const sinSubfases = fase.subfases.length === 0
  const subfases = useQueries({ queries: fase.subfases.map((subfase) => consultasFases.subfase(subfase.id)) })

  const eliminar = useMutation({
    mutationFn: () => eliminarFase(fase.id),
    onSuccess: async () => {
      toast.success(MENSAJE_FASE_ELIMINADA)
      await queryClient.invalidateQueries({ queryKey: clavesFases.todo })
      await navegar({ to: '/programa/fases' })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo={fase.nombre}
        descripcion={fase.descripcion ?? undefined}
        acciones={
          puedeGestionar && (
            <>
              <Button variant="outline" asChild>
                <Link to="/programa/fases/$id/editar" params={{ id: String(fase.id) }}>
                  <Pencil aria-hidden />
                  Modificar
                </Link>
              </Button>
              {!sinSubfases ? (
                <div className="grid justify-items-end gap-1">
                  <Button variant="destructive" disabled>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                  <p className="text-xs text-muted-foreground">{TEXTO_FASE_SIN_SUBFASES}</p>
                </div>
              ) : !disponible ? (
                <div className="grid justify-items-end gap-1">
                  <Button variant="destructive" disabled>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                  <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
                </div>
              ) : (
                <ConfirmDialog
                  disparador={
                    <Button variant="destructive" disabled={eliminar.isPending}>
                      <Trash2 aria-hidden />
                      Eliminar
                    </Button>
                  }
                  titulo="¿Eliminar la fase?"
                  descripcion={`Se eliminará «${fase.nombre}». Esta acción no se puede deshacer.`}
                  confirmar="Eliminar"
                  destructivo
                  alConfirmar={() => eliminar.mutate()}
                />
              )}
            </>
          )
        }
      />
      <section aria-labelledby="titulo-subfases" className="grid gap-4">
        <h2 id="titulo-subfases" className="text-lg font-semibold tracking-tight">
          Subfases
        </h2>
        {sinSubfases && <p className="text-sm text-muted-foreground">La fase no tiene subfases registradas.</p>}
        {fase.subfases.map((subfase, indice) => {
          const consulta = subfases[indice]
          const error = consulta ? errorDePrimeraCarga(consulta) : null
          return (
            <Card key={subfase.id} role="region" aria-labelledby={`subfase-${subfase.id}`}>
              <CardHeader>
                <CardTitle>
                  <h3 id={`subfase-${subfase.id}`}>{subfase.nombre}</h3>
                </CardTitle>
                {subfase.descripcion && <p className="text-sm text-muted-foreground">{subfase.descripcion}</p>}
              </CardHeader>
              <CardContent>
                {error !== null ? (
                  <AvisoDeError
                    titulo="No se pudieron cargar las maniobras de la subfase"
                    error={error}
                    alReintentar={() => void consulta?.refetch()}
                  />
                ) : consulta?.data === undefined ? (
                  <Skeleton className="h-10 w-full" aria-busy="true" />
                ) : consulta.data.maniobras.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin maniobras asignadas.</p>
                ) : (
                  <ul className="grid gap-1 text-sm">
                    {consulta.data.maniobras.map((maniobra) => (
                      <li key={maniobra.id}>{maniobra.nombre}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )
        })}
      </section>
    </>
  )
}

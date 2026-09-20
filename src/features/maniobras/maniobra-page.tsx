import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Ruler, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { consultasFases } from '@/features/fases/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import {
  MENSAJE_MANIOBRA_ELIMINADA,
  TEXTO_MANIOBRA_CON_ESTANDARES,
  TEXTO_SUBFASES_NO_DISPONIBLES,
} from '@/lib/dominio/programa'
import { clavesManiobras, consultasManiobras, eliminarManiobra } from './api'

export function ManiobraPage({ id }: { id: number }) {
  const { data: maniobra } = useSuspenseQuery(consultasManiobras.detalle(id))
  const fases = useQuery(consultasFases.conSubfases())
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const puedeGestionar = usePuede('Manage Maneuvers')
  const puedeEstandares = usePuede('Manage Standards')
  const conEstandares = maniobra.estandares.length > 0
  const puedeModificar = accionDisponible('modificarManiobra')

  const faseDeSubfase = (idSubfase: number) =>
    fases.data?.find((grupo) => grupo.subfases.some((subfase) => subfase.id === idSubfase))?.fase.nombre ?? null

  const eliminar = useMutation({
    mutationFn: () => eliminarManiobra(maniobra.id),
    onSuccess: async () => {
      toast.success(MENSAJE_MANIOBRA_ELIMINADA)
      await queryClient.invalidateQueries({ queryKey: clavesManiobras.todo })
      await navegar({ to: '/programa/maniobras' })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo={maniobra.nombre}
        descripcion={maniobra.descripcion ?? undefined}
        acciones={
          <>
            {puedeEstandares && (
              <Button variant="outline" asChild>
                <Link to="/programa/maniobras/$id/estandares" params={{ id: String(maniobra.id) }}>
                  <Ruler aria-hidden />
                  Editar estándares
                </Link>
              </Button>
            )}
            {puedeGestionar &&
              (puedeModificar ? (
                <Button variant="outline" asChild>
                  <Link to="/programa/maniobras/$id/editar" params={{ id: String(maniobra.id) }}>
                    <Pencil aria-hidden />
                    Modificar
                  </Link>
                </Button>
              ) : (
                <div className="grid justify-items-end gap-1">
                  <Button variant="outline" disabled>
                    <Pencil aria-hidden />
                    Modificar
                  </Button>
                  <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
                </div>
              ))}
            {puedeGestionar &&
              (conEstandares ? (
                <div className="grid justify-items-end gap-1">
                  <Button variant="destructive" disabled>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                  <p className="text-xs text-muted-foreground">{TEXTO_MANIOBRA_CON_ESTANDARES}</p>
                </div>
              ) : (
                <ConfirmDialog
                  disparador={
                    <Button variant="destructive" disabled={eliminar.isPending}>
                      <Trash2 aria-hidden />
                      Eliminar
                    </Button>
                  }
                  titulo="¿Eliminar la maniobra?"
                  descripcion={`Se eliminará «${maniobra.nombre}». Esta acción no se puede deshacer.`}
                  confirmar="Eliminar"
                  destructivo
                  alConfirmar={() => eliminar.mutate()}
                />
              ))}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Subfases</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maniobra.subfases === null ? (
              <p className="text-sm text-muted-foreground">{TEXTO_SUBFASES_NO_DISPONIBLES}</p>
            ) : maniobra.subfases.length === 0 ? (
              <p className="text-sm text-muted-foreground">La maniobra no está asignada a ninguna subfase.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {maniobra.subfases.map((subfase) => (
                  <li key={subfase.id}>
                    {subfase.nombre}
                    {faseDeSubfase(subfase.id) !== null && (
                      <span className="text-muted-foreground"> · {faseDeSubfase(subfase.id)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Estándares</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maniobra.estandares.length === 0 ? (
              <p className="text-sm text-muted-foreground">La maniobra no tiene estándares asignados.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {maniobra.estandares.map((estandar) => (
                  <li key={estandar.id}>
                    {estandar.nombre}
                    {estandar.descripcion && <span className="text-muted-foreground"> · {estandar.descripcion}</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

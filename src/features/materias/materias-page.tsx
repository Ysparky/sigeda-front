import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesMaterias, consultasMaterias, eliminarMateria, etiquetaDeParte } from './api'
import { DialogoMateria } from './components/dialogo-materia'

export function MateriasPage() {
  const materias = useQuery(consultasMaterias.lista())
  const error = errorDePrimeraCarga(materias)
  const puedeGestionar = usePuede('Manage Subjects') && accionDisponible('gestionarMaterias')
  const esperaDependencia = usePuede('Manage Subjects') && !accionDisponible('gestionarMaterias')
  const queryClient = useQueryClient()

  const eliminar = useMutation({
    mutationFn: eliminarMateria,
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesMaterias.todo })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo="Materias"
        descripcion="Materias del curso en tierra con su nota mínima y coeficiente."
        acciones={
          esperaDependencia ? (
            <div className="grid justify-items-end gap-1">
              <Button disabled>
                <Plus aria-hidden />
                Registrar materia
              </Button>
              <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
            </div>
          ) : (
            puedeGestionar && (
              <DialogoMateria
                disparador={
                  <Button>
                    <Plus aria-hidden />
                    Registrar materia
                  </Button>
                }
              />
            )
          )
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void materias.refetch()} />
      ) : materias.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : materias.data.length === 0 ? (
        <EmptyState titulo="No hay materias registradas" descripcion="Registre la primera materia del curso." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table aria-label="Materias del curso">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Nota mínima</TableHead>
                <TableHead>Coeficiente</TableHead>
                <TableHead>Parte del curso</TableHead>
                {puedeGestionar && (
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {materias.data.map((materia) => (
                <TableRow key={materia.id}>
                  <TableCell>{materia.nombre}</TableCell>
                  <TableCell className="tabular-nums">{formatearNota(materia.notaMinima)}</TableCell>
                  <TableCell className="tabular-nums">{formatearNota(materia.coeficiente)}</TableCell>
                  <TableCell>{etiquetaDeParte(materia.parte)}</TableCell>
                  {puedeGestionar && (
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <DialogoMateria
                          materia={materia}
                          disparador={
                            <Button variant="outline" size="sm" aria-label={`Modificar ${materia.nombre}`}>
                              <Pencil aria-hidden />
                              Modificar
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          disparador={
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={eliminar.isPending}
                              aria-label={`Eliminar ${materia.nombre}`}
                            >
                              <Trash2 aria-hidden />
                              Eliminar
                            </Button>
                          }
                          titulo="¿Eliminar la materia?"
                          descripcion={`Se eliminará «${materia.nombre}». Esta acción no se puede deshacer.`}
                          confirmar="Eliminar"
                          destructivo
                          alConfirmar={() => eliminar.mutate(materia.id)}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

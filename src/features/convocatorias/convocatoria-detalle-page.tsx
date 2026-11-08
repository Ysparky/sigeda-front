import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { cambiarEstadoConvocatoria, clavesConvocatorias, convocatoriaQuery, type EstadoConvocatoria } from './api'
import { ETIQUETA_ESTADO_CONVOCATORIA } from './estado'

// El siguiente estado alcanzable y su etiqueta de acción.
const SIGUIENTE: Partial<Record<EstadoConvocatoria, { estado: EstadoConvocatoria; accion: string }>> = {
  BORRADOR: { estado: 'PUBLICADA', accion: 'Publicar' },
  PUBLICADA: { estado: 'CERRADA', accion: 'Cerrar' },
  CERRADA: { estado: 'FINALIZADA', accion: 'Finalizar' },
}

const ETIQUETA_ESTADO_COHORTE: Record<string, string> = {
  EN_INSCRIPCION: 'En inscripción',
  EN_PROGRESO: 'En progreso',
  CERRADA: 'Cerrada',
}

export function ConvocatoriaDetallePage({ id }: { id: number }) {
  const { data: convocatoria } = useSuspenseQuery(convocatoriaQuery(id))
  const queryClient = useQueryClient()
  const siguiente = SIGUIENTE[convocatoria.estado]

  const cambiar = useMutation({
    mutationFn: (estado: EstadoConvocatoria) => cambiarEstadoConvocatoria(id, estado),
    onSuccess: async () => {
      toast.success('Estado de la convocatoria actualizado.')
      await queryClient.invalidateQueries({ queryKey: clavesConvocatorias.todo })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo={convocatoria.nombre}
        descripcion={convocatoria.descripcion ?? undefined}
        acciones={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/convocatorias/$id/editar" params={{ id: String(id) }}>
                <Pencil aria-hidden />
                Modificar
              </Link>
            </Button>
            {siguiente && (
              <Button disabled={cambiar.isPending} onClick={() => cambiar.mutate(siguiente.estado)}>
                {siguiente.accion}
              </Button>
            )}
          </div>
        }
      />
      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Dato etiqueta="Estado">
            <Badge variant={ETIQUETA_ESTADO_CONVOCATORIA[convocatoria.estado].variante}>
              {ETIQUETA_ESTADO_CONVOCATORIA[convocatoria.estado].texto}
            </Badge>
          </Dato>
          <Dato etiqueta="Cohorte destino">
            {convocatoria.grupoNombre
              ? `${convocatoria.grupoNombre}${
                  convocatoria.grupoEstado ? ` · ${ETIQUETA_ESTADO_COHORTE[convocatoria.grupoEstado] ?? convocatoria.grupoEstado}` : ''
                }`
              : '—'}
          </Dato>
          <Dato etiqueta="Vacantes">{convocatoria.vacantes}</Dato>
          <Dato etiqueta="Inicio">{convocatoria.fechaInicio}</Dato>
          <Dato etiqueta="Fin">{convocatoria.fechaFin}</Dato>
        </CardContent>
      </Card>
    </>
  )
}

function Dato({ etiqueta, children, ancho }: { etiqueta: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? 'sm:col-span-2' : undefined}>
      <p className="text-sm text-muted-foreground">{etiqueta}</p>
      <div className="font-medium">{children}</div>
    </div>
  )
}

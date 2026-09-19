import { CircleAlert, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CALIFICATIVOS, CLASIFICACIONES, ESTADOS_ALUMNO } from '@/lib/dominio/vocabulario'
import { formatearFecha, formatearNota } from '@/lib/formato'

const COLORES = [
  { nombre: 'Primario', clase: 'bg-primary' },
  { nombre: 'Secundario', clase: 'bg-secondary' },
  { nombre: 'Acento', clase: 'bg-accent' },
  { nombre: 'Atenuado', clase: 'bg-muted' },
  { nombre: 'Destructivo', clase: 'bg-destructive' },
  { nombre: 'Menú', clase: 'bg-sidebar' },
]

const EVALUACIONES_DE_EJEMPLO = [
  { codigo: '111111-7-1', alumno: 'López, Carlos', subfase: 'Contacto', fecha: '2026-09-14', promedio: 17.5, clasificacion: 'Bueno' },
  { codigo: '222222-7-1', alumno: 'Falconi, Ana', subfase: 'Contacto', fecha: '2026-09-13', promedio: 15, clasificacion: 'Regular' },
  { codigo: '555555-9-1', alumno: 'García, Luis', subfase: 'Formación', fecha: '2026-09-15', promedio: 12, clasificacion: 'Malo' },
  { codigo: '666666-9-1', alumno: 'Torres, María', subfase: 'Formación', fecha: '2026-09-15', promedio: 20, clasificacion: 'Excelente' },
]

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{titulo}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  )
}

export function GuiaPage() {
  return (
    <>
      <PageHeader
        titulo="Guía de estilo"
        descripcion="Tokens, componentes y estados del dominio. Solo visible en desarrollo."
      />

      <Seccion titulo="Colores">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLORES.map((color) => (
            <div key={color.nombre} className="grid gap-1.5">
              <div className={`h-12 rounded-lg border ${color.clase}`} />
              <span className="text-xs text-muted-foreground">{color.nombre}</span>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Tipografía">
        <p className="text-2xl font-semibold tracking-tight">Programación de turnos</p>
        <p className="text-base">Texto de cuerpo para descripciones y formularios.</p>
        <p className="text-sm text-muted-foreground">Texto secundario para ayudas y metadatos.</p>
        <p className="font-medium tabular-nums">17.50 · 15.00 · 12.00 · 20.00</p>
      </Seccion>

      <Seccion titulo="Estados del dominio">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-32 text-sm text-muted-foreground">Calificativo</span>
            {Object.keys(CALIFICATIVOS).map((valor) => (
              <StatusBadge key={valor} vocabulario="calificativo" valor={valor} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-32 text-sm text-muted-foreground">Clasificación</span>
            {Object.keys(CLASIFICACIONES).map((valor) => (
              <StatusBadge key={valor} vocabulario="clasificacion" valor={valor} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-32 text-sm text-muted-foreground">Estado del alumno</span>
            {Object.keys(ESTADOS_ALUMNO).map((valor) => (
              <StatusBadge key={valor} vocabulario="estado" valor={valor} />
            ))}
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Botones">
        <div className="flex flex-wrap gap-2">
          <Button>
            <Plus aria-hidden />
            Registrar turno
          </Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="outline">Filtrar</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="destructive">Eliminar</Button>
          <Button variant="link">Ver detalle</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </Seccion>

      <Seccion titulo="Formulario">
        <FieldGroup className="max-w-sm">
          <Field>
            <FieldLabel htmlFor="guia-nombre">Nombre del turno</FieldLabel>
            <Input id="guia-nombre" defaultValue="Contacto 1" />
            <FieldDescription>De 10 a 30 caracteres.</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="guia-fecha">Fecha de evaluación</FieldLabel>
            <Input id="guia-fecha" type="date" aria-invalid />
            <FieldError>La fecha del turno debe ser posterior a hoy.</FieldError>
          </Field>
        </FieldGroup>
      </Seccion>

      <Seccion titulo="Alertas">
        <Alert>
          <CircleAlert />
          <AlertTitle>Alumno bloqueado</AlertTitle>
          <AlertDescription>Tiene una subsanación pendiente y no puede programarse en turnos de vuelo.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>No se pudo guardar</AlertTitle>
          <AlertDescription>Error al realizar el registro.</AlertDescription>
        </Alert>
      </Seccion>

      <Seccion titulo="Tabla">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Alumno</TableHead>
              <TableHead>Sub fase</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Promedio</TableHead>
              <TableHead>Clasificación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EVALUACIONES_DE_EJEMPLO.map((evaluacion) => (
              <TableRow key={evaluacion.codigo}>
                <TableCell className="font-mono text-xs">{evaluacion.codigo}</TableCell>
                <TableCell>{evaluacion.alumno}</TableCell>
                <TableCell>{evaluacion.subfase}</TableCell>
                <TableCell className="tabular-nums">{formatearFecha(evaluacion.fecha)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearNota(evaluacion.promedio)}</TableCell>
                <TableCell>
                  <StatusBadge vocabulario="clasificacion" valor={evaluacion.clasificacion} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Seccion>

      <Seccion titulo="Vacío, carga y confirmación">
        <EmptyState
          titulo="No hay turnos programados"
          descripcion="Programe el primer turno de la sub fase."
          accion={<Button size="sm">Registrar turno</Button>}
        />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfirmDialog
            disparador={<Button variant="destructive">Eliminar turno</Button>}
            titulo="¿Eliminar el turno?"
            descripcion="Esta acción no se puede deshacer."
            confirmar="Eliminar"
            destructivo
            alConfirmar={() => toast.success('Turno eliminado con éxito.')}
          />
          <Button variant="outline" onClick={() => toast.success('Turno guardado con éxito.')}>
            Mostrar notificación
          </Button>
        </div>
      </Seccion>
    </>
  )
}

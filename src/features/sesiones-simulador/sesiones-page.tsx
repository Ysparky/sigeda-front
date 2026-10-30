import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorDePrimeraCarga } from '@/lib/query'
import { sesionesQuery, type EstadoSesion } from './api'
import { ETIQUETA_ESTADO_SESION } from './estado'

const ESTADOS: EstadoSesion[] = ['PLANIFICADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA']

export function SesionesPage({ estado }: { estado?: EstadoSesion }) {
  const sesiones = useQuery(sesionesQuery(estado))
  const error = errorDePrimeraCarga(sesiones)
  const navegar = useNavigate()

  return (
    <div className="grid gap-6">
      <PageHeader
        titulo="Sesiones de simulador"
        descripcion="Planificación, ejecución y calificación de las sesiones de simulador."
        acciones={
          <Button asChild>
            <Link to="/sesiones-simulador/nueva">
              <Plus aria-hidden />
              Planificar sesión
            </Link>
          </Button>
        }
      />

      <Field className="w-56">
        <FieldLabel htmlFor="filtro-estado">Filtrar por estado</FieldLabel>
        <NativeSelect
          id="filtro-estado"
          value={estado ?? ''}
          onChange={(evento) =>
            void navegar({
              to: '/sesiones-simulador',
              search: { estado: (evento.target.value || undefined) as EstadoSesion | undefined },
            })
          }
        >
          <NativeSelectOption value="">Todos</NativeSelectOption>
          {ESTADOS.map((e) => (
            <NativeSelectOption key={e} value={e}>
              {ETIQUETA_ESTADO_SESION[e].texto}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void sesiones.refetch()} />
      ) : sesiones.data && sesiones.data.length === 0 ? (
        <EmptyState titulo="Sin sesiones" descripcion="No hay sesiones con ese filtro." />
      ) : (
        <Table aria-label="Sesiones de simulador">
          <TableHeader>
            <TableRow>
              <TableHead>Escenario</TableHead>
              <TableHead>Simulador</TableHead>
              <TableHead>Alumno</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sesiones.data?.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    to="/sesiones-simulador/$id"
                    params={{ id: String(s.id) }}
                  >
                    {s.escenarioNombre ?? '—'}
                  </Link>
                </TableCell>
                <TableCell>{s.simuladorNombre ?? '—'}</TableCell>
                <TableCell>{s.codAlumno}</TableCell>
                <TableCell>{s.fechaPlanificada}</TableCell>
                <TableCell>
                  <Badge variant={ETIQUETA_ESTADO_SESION[s.estado].variante}>
                    {ETIQUETA_ESTADO_SESION[s.estado].texto}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

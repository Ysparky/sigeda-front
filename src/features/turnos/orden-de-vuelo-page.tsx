import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, PlaneTakeoff } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { Enlace } from '@/components/enlace'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { esFechaIso, sumarDias } from '@/lib/dominio/calendario'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnos } from './api'
import { horaDelBriefingDiario, ordenDeVuelo } from './orden-de-vuelo'

export function OrdenDeVueloPage({ fecha }: { fecha: string }) {
  const navegar = useNavigate()
  const turnos = useQuery(consultasTurnos.dia(fecha))
  const errorDeTurnos = errorDePrimeraCarga(turnos)
  const grupos = ordenDeVuelo(turnos.data ?? [])
  const briefing = horaDelBriefingDiario(grupos)

  return (
    <>
      <PageHeader
        titulo="Orden de vuelo del día"
        descripcion={`Vuelos del ${formatearFecha(fecha)} agrupados por aeronave.`}
        acciones={
          <div className="flex flex-wrap items-end gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link to="/turnos/dia/$fecha" params={{ fecha: sumarDias(fecha, -1) }} aria-label="Día anterior">
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
            <div className="grid gap-1">
              <Label htmlFor="orden-fecha" className="sr-only">
                Fecha
              </Label>
              <Input
                id="orden-fecha"
                type="date"
                value={fecha}
                onChange={(evento) => {
                  if (esFechaIso(evento.target.value)) {
                    void navegar({ to: '/turnos/dia/$fecha', params: { fecha: evento.target.value } })
                  }
                }}
              />
            </div>
            <Button variant="outline" size="icon" asChild>
              <Link to="/turnos/dia/$fecha" params={{ fecha: sumarDias(fecha, 1) }} aria-label="Día siguiente">
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          </div>
        }
      />
      {errorDeTurnos !== null && <AvisoDeError error={errorDeTurnos} alReintentar={() => void turnos.refetch()} />}
      {turnos.isPending && <Skeleton className="h-40 w-full" />}
      {turnos.data !== undefined && grupos.length === 0 && (
        <EmptyState icono={PlaneTakeoff} titulo="No hay vuelos programados para este día." />
      )}
      {briefing && (
        <p className="text-sm">
          Briefing diario: <span className="font-medium tabular-nums">{briefing}</span>{' '}
          <span className="text-muted-foreground">(2 h antes del primer vuelo)</span>
        </p>
      )}
      {grupos.map((grupo) => (
        <Card key={grupo.aeronave}>
          <CardHeader>
            <CardTitle>
              <h2>{grupo.aeronave}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table aria-label={`Vuelos de ${grupo.aeronave}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Horario</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Sub fase</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupo.vuelos.map((vuelo) => (
                  <TableRow key={`${vuelo.idTurno}-${vuelo.codAlumno}`}>
                    <TableCell className="tabular-nums">
                      {vuelo.horaInicio} – {vuelo.horaFin}
                    </TableCell>
                    <TableCell>{vuelo.alumno}</TableCell>
                    <TableCell>
                      <Enlace to="/turnos/$id" params={{ id: String(vuelo.idTurno) }}>
                        {vuelo.turno}
                      </Enlace>
                    </TableCell>
                    <TableCell>{vuelo.subfase}</TableCell>
                    <TableCell>{vuelo.instructor ?? 'Sin asignar'}</TableCell>
                    <TableCell>
                      <Enlace
                        to="/turnos/$id/briefing/$alumno"
                        params={{ id: String(vuelo.idTurno), alumno: vuelo.codAlumno }}
                      >
                        Hoja de briefing
                      </Enlace>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

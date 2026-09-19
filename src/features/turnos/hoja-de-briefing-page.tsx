import { useSuspenseQuery } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { responsableDeManiobra } from '@/lib/dominio/briefing'
import { restarHoras } from '@/lib/dominio/calendario'
import { formatearFecha } from '@/lib/formato'
import { consultasTurnos } from './api'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

export function HojaDeBriefingPage({ id, codAlumno }: { id: number; codAlumno: string }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const alumno = turno.alumnos.find((candidato) => candidato.codAlumno === codAlumno)
  if (!alumno) throw notFound()

  return (
    <>
      <PageHeader
        titulo="Hoja de briefing"
        descripcion={`${alumno.alumno} · ${turno.nombre}`}
        acciones={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden />
            Imprimir
          </Button>
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Dato etiqueta="Fecha">
              <span className="tabular-nums">{formatearFecha(turno.fechaEval)}</span>
            </Dato>
            <Dato etiqueta="Vuelo">
              <span className="tabular-nums">
                {alumno.horaInicio} – {alumno.horaFin}
              </span>
            </Dato>
            <Dato etiqueta="Briefing de detalle">
              <span className="tabular-nums">{restarHoras(alumno.horaInicio, 1)}</span>
            </Dato>
            <Dato etiqueta="Sub fase">{turno.subfase}</Dato>
            <Dato etiqueta="Instructor">{turno.instructor ?? 'Sin asignar'}</Dato>
            <Dato etiqueta="Aeronave">{turno.aeronave?.nombre ?? 'Sin asignar'}</Dato>
          </dl>
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label="Maniobras del briefing">
          <TableHeader>
            <TableRow>
              <TableHead>Maniobra</TableHead>
              <TableHead>Nota mínima</TableHead>
              <TableHead>Responsable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {turno.maniobras.map((item) => (
              <TableRow key={item.maniobra.id}>
                <TableCell>
                  <p className="font-medium">{item.maniobra.nombre}</p>
                  {item.maniobra.descripcion && (
                    <p className="text-xs text-muted-foreground">{item.maniobra.descripcion}</p>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge vocabulario="calificativo" valor={item.notaMin} />
                </TableCell>
                <TableCell>{responsableDeManiobra(item.notaMin)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        Con nota mínima D, I o R el instructor explica la maniobra; con B o E la expone el alumno.
      </p>
    </>
  )
}

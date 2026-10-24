import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorDePrimeraCarga } from '@/lib/query'
import {
  clavesAsistencia,
  guardarAsistencia,
  rosterQuery,
  type AsistenciaAlumno,
  type EstadoAsistencia,
} from './api'

const OPCIONES: { valor: EstadoAsistencia; texto: string }[] = [
  { valor: 'PRESENTE', texto: 'Presente' },
  { valor: 'AUSENTE', texto: 'Ausente' },
  { valor: 'JUSTIFICADA', texto: 'Justificada' },
]

function nombreDe(alumno: AsistenciaAlumno) {
  return `${alumno.aPaterno ?? ''} ${alumno.aMaterno ?? ''}, ${alumno.nombres ?? ''}`.trim()
}

export function AsistenciaRegistroPage({ idTurno }: { idTurno: number }) {
  const roster = useQuery(rosterQuery(idTurno))
  const error = errorDePrimeraCarga(roster)
  const queryClient = useQueryClient()
  // Solo se guardan los cambios del instructor; el estado efectivo se deriva del roster + estos overrides.
  const [cambios, setCambios] = useState<Record<string, EstadoAsistencia>>({})

  // La marca por defecto de un alumno sin registro es AUSENTE: el instructor confirma a los presentes.
  const estadoDe = (alumno: AsistenciaAlumno): EstadoAsistencia =>
    cambios[alumno.codAlumno] ?? alumno.estado ?? 'AUSENTE'

  const guardar = useMutation({
    mutationFn: () =>
      guardarAsistencia(
        idTurno,
        (roster.data ?? []).map((alumno) => ({ codAlumno: alumno.codAlumno, estado: estadoDe(alumno) })),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clavesAsistencia.roster(idTurno) })
    },
  })

  return (
    <>
      <PageHeader titulo="Asistencia del turno" descripcion="Marca la presencia de cada alumno del turno práctico." />

      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void roster.refetch()} />
      ) : (
        <>
          {guardar.isSuccess && (
            <Alert>
              <AlertTitle>Asistencia guardada</AlertTitle>
              <AlertDescription>Se registró la asistencia del turno.</AlertDescription>
            </Alert>
          )}
          {guardar.isError && (
            <AvisoDeError titulo="No se pudo guardar" error={guardar.error} />
          )}

          <Table aria-label="Alumnos del turno">
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(roster.data ?? []).map((alumno) => {
                const nombre = nombreDe(alumno)
                return (
                  <TableRow key={alumno.codAlumno}>
                    <TableCell className="font-medium">{nombre}</TableCell>
                    <TableCell>
                      <NativeSelect
                        aria-label={`Estado de ${nombre}`}
                        value={estadoDe(alumno)}
                        onChange={(evento) =>
                          setCambios((previo) => ({
                            ...previo,
                            [alumno.codAlumno]: evento.target.value as EstadoAsistencia,
                          }))
                        }
                      >
                        {OPCIONES.map((opcion) => (
                          <NativeSelectOption key={opcion.valor} value={opcion.valor}>
                            {opcion.texto}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div>
            <Button disabled={guardar.isPending || !roster.data} onClick={() => guardar.mutate()}>
              {guardar.isPending ? 'Guardando…' : 'Guardar asistencia'}
            </Button>
          </div>
        </>
      )}
    </>
  )
}

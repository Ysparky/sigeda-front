import { CloudOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { termino } from '@/lib/dominio/vocabulario'
import { MOTIVOS_SUSPENSION, useSuspenderTurno, type MotivoSuspension } from '../api'

export function DialogoSuspension({ idTurno }: { idTurno: number }) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState<MotivoSuspension | ''>('')
  const [observacion, setObservacion] = useState('')
  const [faltaMotivo, setFaltaMotivo] = useState(false)
  const suspender = useSuspenderTurno()

  function confirmar() {
    if (motivo === '') {
      setFaltaMotivo(true)
      return
    }
    const texto = observacion.trim()
    suspender.mutate(
      { id: idTurno, cuerpo: { motivo, observacion: texto === '' ? null : texto } },
      {
        onSuccess: (mensaje) => {
          toast.success(mensaje)
          setAbierto(false)
        },
        onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
      },
    )
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CloudOff aria-hidden />
          Suspender
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspender el turno</DialogTitle>
          <DialogDescription>
            El turno deja de ocupar a sus alumnos, al instructor y a la aeronave hasta que se reprograme.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={faltaMotivo}>
            <FieldLabel htmlFor="suspension-motivo">Motivo</FieldLabel>
            <NativeSelect
              id="suspension-motivo"
              className="w-full"
              aria-invalid={faltaMotivo}
              value={motivo}
              onChange={(evento) => {
                setMotivo(evento.target.value as MotivoSuspension | '')
                setFaltaMotivo(false)
              }}
            >
              <NativeSelectOption value="">Elija un motivo</NativeSelectOption>
              {MOTIVOS_SUSPENSION.map((opcion) => (
                <NativeSelectOption key={opcion} value={opcion}>
                  {termino('motivoSuspension', opcion).etiqueta}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {faltaMotivo && <FieldError>Indique el motivo de la suspensión.</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="suspension-observacion">Observación</FieldLabel>
            <Textarea
              id="suspension-observacion"
              maxLength={255}
              value={observacion}
              onChange={(evento) => setObservacion(evento.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={suspender.isPending}>
            {suspender.isPending ? 'Suspendiendo…' : 'Suspender turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

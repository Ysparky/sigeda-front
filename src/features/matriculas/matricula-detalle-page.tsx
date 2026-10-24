import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { errorDePrimeraCarga } from '@/lib/query'
import { abrirComprobante, clavesMatriculas, matriculaQuery, rechazarMatricula, validarMatricula } from './api'
import { ETIQUETA_ESTADO } from './estado'

export function MatriculaDetallePage({ id }: { id: number }) {
  const matricula = useQuery(matriculaQuery(id))
  const error = errorDePrimeraCarga(matricula)
  const queryClient = useQueryClient()
  const navegar = useNavigate()

  async function volverALaBandeja() {
    await queryClient.invalidateQueries({ queryKey: clavesMatriculas.todo })
    await navegar({ to: '/matriculas', search: { estado: 'PENDIENTE' } })
  }

  const validar = useMutation({
    mutationFn: () => validarMatricula(id),
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      await volverALaBandeja()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo validar la matrícula.'),
  })

  if (error !== null) return <AvisoDeError error={error} alReintentar={() => void matricula.refetch()} />
  if (!matricula.data) return <p className="text-sm text-muted-foreground">Cargando la matrícula…</p>

  const m = matricula.data
  const procesada = m.estado !== 'PENDIENTE'

  return (
    <>
      <PageHeader titulo={`${m.nombres} ${m.aPaterno} ${m.aMaterno}`} descripcion={`DNI ${m.dni}`} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Datos de la solicitud</span>
            <Badge variant={ETIQUETA_ESTADO[m.estado].variante}>{ETIQUETA_ESTADO[m.estado].texto}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <Dato termino="Correo" valor={m.correo} />
            <Dato termino="Contacto" valor={m.contacto ?? '—'} />
            <Dato termino="Fecha de solicitud" valor={m.fecha} />
          </dl>

          <Button type="button" variant="outline" className="w-fit" onClick={() => void abrirComprobante(id)}>
            <FileText aria-hidden />
            Ver comprobante
          </Button>

          {m.estado === 'RECHAZADA' && m.motivoRechazo && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <strong>Motivo del rechazo:</strong> {m.motivoRechazo}
            </p>
          )}

          {!procesada && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button disabled={validar.isPending} onClick={() => validar.mutate()}>
                {validar.isPending ? 'Validando…' : 'Validar matrícula'}
              </Button>
              <DialogoRechazo id={id} alRechazar={volverALaBandeja} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{termino}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

function DialogoRechazo({ id, alRechazar }: { id: number; alRechazar: () => Promise<void> }) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [problema, setProblema] = useState<string | null>(null)

  const rechazar = useMutation({
    mutationFn: () => rechazarMatricula(id, motivo.trim()),
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      setAbierto(false)
      await alRechazar()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo rechazar la matrícula.'),
  })

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="destructive">Rechazar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar matrícula</DialogTitle>
          <DialogDescription>
            El postulante verá el motivo y podrá volver a subir su comprobante.
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={Boolean(problema)}>
          <FieldLabel htmlFor="motivo">Motivo del rechazo</FieldLabel>
          <Textarea
            id="motivo"
            value={motivo}
            aria-invalid={Boolean(problema)}
            onChange={(evento) => {
              setMotivo(evento.target.value)
              if (problema) setProblema(null)
            }}
          />
          {problema && <FieldError>{problema}</FieldError>}
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={rechazar.isPending}
            onClick={() => {
              if (motivo.trim().length < 3) {
                setProblema('Indica un motivo (mínimo 3 caracteres).')
                return
              }
              rechazar.mutate()
            }}
          >
            {rechazar.isPending ? 'Rechazando…' : 'Confirmar rechazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

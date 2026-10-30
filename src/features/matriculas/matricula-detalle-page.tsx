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
import {
  abrirComprobante,
  clavesMatriculas,
  matriculaQuery,
  observarMatricula,
  rechazarMatricula,
  registrarResultado,
  validarMatricula,
  type ResultadoAdmision,
} from './api'
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

  const verComprobante = useMutation({
    mutationFn: () => abrirComprobante(id),
    onError: () => toast.error('No se pudo abrir el comprobante.'),
  })

  const resultado = useMutation({
    mutationFn: (decision: ResultadoAdmision) => registrarResultado(id, decision, ''),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      await volverALaBandeja()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo registrar el resultado.'),
  })

  if (error !== null) return <AvisoDeError error={error} alReintentar={() => void matricula.refetch()} />
  if (!matricula.data) return <p className="text-sm text-muted-foreground">Cargando la matrícula…</p>

  const m = matricula.data
  const enRevision = m.estado === 'PENDIENTE' || m.estado === 'OBSERVADA'
  const esperandoResultado = m.estado === 'VALIDADA' && m.resultado === null

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

          <Button
            type="button"
            variant="outline"
            className="w-fit"
            disabled={verComprobante.isPending}
            onClick={() => verComprobante.mutate()}
          >
            <FileText aria-hidden />
            {verComprobante.isPending ? 'Abriendo…' : 'Ver comprobante'}
          </Button>

          {m.estado === 'RECHAZADA' && m.motivoRechazo && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <strong>Motivo del rechazo:</strong> {m.motivoRechazo}
            </p>
          )}

          {m.estado === 'OBSERVADA' && m.observaciones && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <strong>Observaciones:</strong> {m.observaciones}
            </p>
          )}

          {m.resultado !== null && (
            <p className="rounded-lg border bg-muted/40 p-3">
              <strong>Resultado de admisión:</strong>{' '}
              {m.resultado === 'ADMITIDO' ? 'Admitido' : 'No admitido'}
            </p>
          )}

          {enRevision && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button disabled={validar.isPending} onClick={() => validar.mutate()}>
                {validar.isPending ? 'Validando…' : 'Validar documentación'}
              </Button>
              <DialogoObservar id={id} alObservar={volverALaBandeja} />
              <DialogoRechazo id={id} alRechazar={volverALaBandeja} />
            </div>
          )}

          {esperandoResultado && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button disabled={resultado.isPending} onClick={() => resultado.mutate('ADMITIDO')}>
                {resultado.isPending ? 'Registrando…' : 'Admitir'}
              </Button>
              <Button
                variant="destructive"
                disabled={resultado.isPending}
                onClick={() => resultado.mutate('NO_ADMITIDO')}
              >
                No admitir
              </Button>
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

function DialogoObservar({ id, alObservar }: { id: number; alObservar: () => Promise<void> }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [problema, setProblema] = useState<string | null>(null)

  const observar = useMutation({
    mutationFn: () => observarMatricula(id, texto.trim()),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      setAbierto(false)
      await alObservar()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo observar la matrícula.'),
  })

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline">Observar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Observar postulación</DialogTitle>
          <DialogDescription>
            El postulante verá las observaciones y podrá subsanar sus datos y volver a enviar.
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={Boolean(problema)}>
          <FieldLabel htmlFor="observaciones">Observaciones</FieldLabel>
          <Textarea
            id="observaciones"
            value={texto}
            aria-invalid={Boolean(problema)}
            onChange={(evento) => {
              setTexto(evento.target.value)
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
            disabled={observar.isPending}
            onClick={() => {
              if (texto.trim().length < 3) {
                setProblema('Indica qué debe subsanar (mínimo 3 caracteres).')
                return
              }
              observar.mutate()
            }}
          >
            {observar.isPending ? 'Enviando…' : 'Enviar observaciones'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

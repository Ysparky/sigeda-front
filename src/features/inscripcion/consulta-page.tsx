import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarClock, CheckCircle2, CircleAlert, FileUp, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { formatearFecha } from '@/lib/formato'
import {
  activarCuenta,
  consultarPostulacion,
  subirDocumento,
  type Credencial,
  type DocumentoVista,
  type EstadoMatricula,
  type Postulacion,
} from './api'
import { BarraPublica } from './barra-publica'
import { errorDeArchivo } from './schemas'

function campo(formulario: HTMLFormElement, nombre: string): string {
  const elemento = formulario.elements.namedItem(nombre) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
  return elemento?.value ?? ''
}

const ETIQUETA_ESTADO: Record<EstadoMatricula, string> = {
  PENDIENTE: 'En revisión documental',
  OBSERVADA: 'Observada: subsana lo indicado',
  VALIDADA: 'Documentos validados',
  CITADA: 'Citado a la evaluación de admisión',
  ADMITIDA: 'Admitido',
  NO_ADMITIDO: 'No admitido',
  RECHAZADA: 'Rechazada',
}

const ETIQUETA_DOCUMENTO: Record<DocumentoVista['estado'], string> = {
  FALTANTE: 'Sin cargar',
  PENDIENTE: 'En revisión',
  OBSERVADO: 'Observado',
  ACEPTADO: 'Aceptado',
}

const RECIBE_DOCUMENTOS: EstadoMatricula[] = ['PENDIENTE', 'OBSERVADA', 'VALIDADA', 'CITADA']

function mensajeDe(error: unknown) {
  return error instanceof ApiError ? error.message : MENSAJE_GENERICO
}

export function ConsultaPage() {
  const [credencial, setCredencial] = useState<Credencial | null>(null)
  const [postulacion, setPostulacion] = useState<Postulacion | null>(null)
  const consultar = useMutation({
    mutationFn: consultarPostulacion,
    onSuccess: (resultado, enviada) => {
      setCredencial(enviada)
      setPostulacion(resultado)
    },
  })

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    consultar.mutate({
      numeroDocumento: campo(formulario, 'numeroDocumento').trim(),
      codigo: campo(formulario, 'codigo').trim().toUpperCase(),
    })
  }

  const recargar = () => credencial && consultar.mutate(credencial)

  return (
    <div className="flex min-h-dvh flex-col bg-muted/20">
      <BarraPublica />
      <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-6 px-4 py-10 sm:px-6">
        <div>
          <Badge variant="secondary" className="mb-2" style={{ backgroundColor: '#D8B85822', color: '#8a6d1f' }}>
            Postulación
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Consultar mi postulación</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresa tu número de documento y el código que recibiste al postular. ¿Aún no postulas?{' '}
            <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
              Ver convocatorias
            </Link>
            .
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field>
                <FieldLabel htmlFor="c-numero">Número de documento</FieldLabel>
                <Input id="c-numero" name="numeroDocumento" required autoComplete="off" />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-codigo">Código de postulación</FieldLabel>
                <Input id="c-codigo" name="codigo" required autoComplete="off" className="uppercase" />
              </Field>
              <Button type="submit" disabled={consultar.isPending}>
                {consultar.isPending ? 'Consultando…' : 'Consultar'}
              </Button>
            </form>
            {consultar.error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {mensajeDe(consultar.error)}
              </p>
            )}
          </CardContent>
        </Card>
        {postulacion && credencial && (
          <Detalle postulacion={postulacion} credencial={credencial} alCambiar={recargar} />
        )}
      </main>
    </div>
  )
}

function Detalle({
  postulacion,
  credencial,
  alCambiar,
}: {
  postulacion: Postulacion
  credencial: Credencial
  alCambiar: () => void
}) {
  const recibe = RECIBE_DOCUMENTOS.includes(postulacion.estado)
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>
              {postulacion.nombres} {postulacion.aPaterno}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>
            <span className="text-muted-foreground">Convocatoria:</span> {postulacion.convocatoria ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Estado:</span>{' '}
            <strong data-testid="estado-postulacion">{ETIQUETA_ESTADO[postulacion.estado]}</strong>
          </p>
          {postulacion.observaciones && postulacion.estado === 'OBSERVADA' && (
            <Alert>
              <CircleAlert />
              <AlertTitle>Observación del Coordinador</AlertTitle>
              <AlertDescription>{postulacion.observaciones}</AlertDescription>
            </Alert>
          )}
          {postulacion.motivoRechazo && postulacion.estado === 'RECHAZADA' && (
            <Alert variant="destructive">
              <AlertTitle>Motivo del rechazo</AlertTitle>
              <AlertDescription>{postulacion.motivoRechazo}</AlertDescription>
            </Alert>
          )}
          {postulacion.citacion && postulacion.estado === 'CITADA' && (
            <Alert>
              <CalendarClock />
              <AlertTitle>Evaluación de admisión</AlertTitle>
              <AlertDescription>
                {formatearFecha(postulacion.citacion.fecha)} a las {postulacion.citacion.hora} · {postulacion.citacion.lugar}.
                Incluye examen de conocimientos, entrevista personal y evaluación psicológica. Recuerda que el
                certificado médico aeronáutico debe estar cargado y aceptado.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Documentos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table aria-label="Documentos de la postulación">
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postulacion.documentos.map((documento) => (
                <TableRow key={documento.tipo}>
                  <TableCell>
                    {documento.nombre}
                    {documento.observacion && documento.estado === 'OBSERVADO' && (
                      <p className="text-xs text-destructive">{documento.observacion}</p>
                    )}
                  </TableCell>
                  <TableCell>{ETIQUETA_DOCUMENTO[documento.estado]}</TableCell>
                  <TableCell>
                    {recibe && documento.estado !== 'ACEPTADO' && (
                      <SubirDocumento documento={documento} credencial={credencial} alSubir={alCambiar} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {postulacion.evaluacion && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Resultado de admisión</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              {postulacion.evaluacion.resultado === 'ADMITIDO' ? 'Admitido' : 'No admitido'} · examen{' '}
              {postulacion.evaluacion.notaConocimientos ?? '—'}/20 · entrevista{' '}
              {postulacion.evaluacion.entrevista === 'APTO' ? 'apto' : 'no apto'} · evaluación psicológica{' '}
              {postulacion.evaluacion.evaluacionPsicologica === 'APTO' ? 'apto' : 'no apto'}
            </p>
          </CardContent>
        </Card>
      )}
      {postulacion.estado === 'ADMITIDA' &&
        (postulacion.cuentaActiva ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Tu cuenta está activa</AlertTitle>
            <AlertDescription>
              <Link to="/login" search={{}} className="font-medium underline-offset-4 hover:underline">
                Inicia sesión
              </Link>{' '}
              con tu correo.
            </AlertDescription>
          </Alert>
        ) : (
          <ActivarCuenta credencial={credencial} alActivar={alCambiar} />
        ))}
    </>
  )
}

function SubirDocumento({
  documento,
  credencial,
  alSubir,
}: {
  documento: DocumentoVista
  credencial: Credencial
  alSubir: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const subir = useMutation({
    mutationFn: (archivo: File) => subirDocumento(credencial, documento.tipo, archivo),
    onSuccess: (respuesta) => {
      toast.success(respuesta.mensaje)
      alSubir()
    },
    onError: (problema) => setError(mensajeDe(problema)),
  })
  const id = `c-doc-${documento.tipo}`
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary">
        <FileUp className="size-4" aria-hidden />
        {documento.estado === 'FALTANTE' ? 'Cargar' : 'Reemplazar'}
        <span className="sr-only"> {documento.nombre}</span>
      </label>
      <input
        id={id}
        type="file"
        className="sr-only"
        accept={documento.soloImagen ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
        onChange={(evento) => {
          const archivo = evento.target.files?.[0]
          if (!archivo) return
          const problema = errorDeArchivo(archivo, documento.soloImagen)
          setError(problema)
          if (!problema) subir.mutate(archivo)
        }}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

function ActivarCuenta({ credencial, alActivar }: { credencial: Credencial; alActivar: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const activar = useMutation({
    mutationFn: () => activarCuenta(credencial, password),
    onSuccess: (respuesta) => {
      toast.success(respuesta.mensaje)
      alActivar()
    },
    onError: (problema) => setError(mensajeDe(problema)),
  })

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirmacion) return setError('Las contraseñas no coinciden.')
    setError(null)
    activar.mutate()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <KeyRound className="size-5" aria-hidden />
            Activa tu cuenta
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="a-password">Contraseña nueva</FieldLabel>
              <Input id="a-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <FieldDescription>Al menos 8 caracteres. Tu usuario será tu correo.</FieldDescription>
            </Field>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="a-confirmacion">Repite la contraseña</FieldLabel>
              <Input id="a-confirmacion" type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
            </Field>
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" disabled={activar.isPending} className="w-fit">
            {activar.isPending ? 'Activando…' : 'Activar cuenta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

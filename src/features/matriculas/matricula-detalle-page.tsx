import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { hoyIso } from '@/lib/dominio/calendario'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import {
  abrirDocumento,
  aceptarDocumento,
  pideVigencia,
  citarPostulante,
  clavesMatriculas,
  MEDIOS_PAGO,
  matriculaQuery,
  observarDocumento,
  observarMatricula,
  rechazarMatricula,
  registrarEvaluacion,
  registrarPago,
  validarMatricula,
  type DocumentoDeMatricula,
  type MatriculaDetalle,
  type MedioPago,
} from './api'
import { ETIQUETA_ESTADO } from './estado'

const ETIQUETA_DOCUMENTO: Record<DocumentoDeMatricula['estado'], string> = {
  FALTANTE: 'Sin cargar',
  PENDIENTE: 'Por revisar',
  OBSERVADO: 'Observado',
  ACEPTADO: 'Aceptado',
}

const ETIQUETA_MEDIO: Record<MedioPago, string> = {
  TRANSFERENCIA: 'Transferencia bancaria',
  DEPOSITO: 'Depósito en cuenta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  CAJA: 'Pago en caja',
}

function mensajeDe(e: unknown, porDefecto: string) {
  return e instanceof Error ? e.message : porDefecto
}

function campo(formulario: HTMLFormElement, nombre: string): string {
  const elemento = formulario.elements.namedItem(nombre) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
  return elemento?.value ?? ''
}

export function MatriculaDetallePage({ id }: { id: number }) {
  const matricula = useQuery(matriculaQuery(id))
  const error = errorDePrimeraCarga(matricula)
  const queryClient = useQueryClient()
  const navegar = useNavigate()

  async function refrescar() {
    await queryClient.invalidateQueries({ queryKey: clavesMatriculas.todo })
  }

  async function volverALaBandeja() {
    await refrescar()
    await navegar({ to: '/matriculas', search: { estado: 'PENDIENTE' } })
  }

  const validar = useMutation({
    mutationFn: () => validarMatricula(id),
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      await volverALaBandeja()
    },
    onError: (e) => toast.error(mensajeDe(e, 'No se pudo validar la postulación.')),
  })

  if (error !== null) return <AvisoDeError error={error} alReintentar={() => void matricula.refetch()} />
  if (!matricula.data) return <p className="text-sm text-muted-foreground">Cargando la postulación…</p>

  const m = matricula.data
  const enRevision = m.estado === 'PENDIENTE' || m.estado === 'OBSERVADA'
  const revisaDocumentos = enRevision || m.estado === 'VALIDADA' || m.estado === 'CITADA'

  return (
    <>
      <PageHeader titulo={`${m.nombres} ${m.aPaterno} ${m.aMaterno}`} descripcion={`${m.tipoDocumento} ${m.numeroDocumento}`} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Datos del postulante</span>
            <Badge variant={ETIQUETA_ESTADO[m.estado].variante}>{ETIQUETA_ESTADO[m.estado].texto}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <dl className="grid gap-2 sm:grid-cols-3">
            <Dato termino="Fecha de nacimiento" valor={m.fechaNacimiento ? formatearFecha(m.fechaNacimiento) : '—'} />
            <Dato termino="Sexo" valor={m.sexo === 'FEMENINO' ? 'Femenino' : m.sexo === 'MASCULINO' ? 'Masculino' : '—'} />
            <Dato termino="Nacionalidad" valor={m.nacionalidad ?? '—'} />
            <Dato termino="Dirección" valor={m.direccion ?? '—'} />
            <Dato termino="Correo" valor={m.correo} />
            <Dato termino="Teléfono" valor={m.contacto ?? '—'} />
            <Dato termino="Fecha de postulación" valor={formatearFecha(m.fecha)} />
          </dl>

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

          {enRevision && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button disabled={validar.isPending} onClick={() => validar.mutate()}>
                {validar.isPending ? 'Validando…' : 'Validar documentación'}
              </Button>
              {m.estado === 'PENDIENTE' && <DialogoObservar id={id} alObservar={volverALaBandeja} />}
              <DialogoRechazo id={id} alRechazar={volverALaBandeja} />
            </div>
          )}
        </CardContent>
      </Card>

      <Documentos matricula={m} revisa={revisaDocumentos} alCambiar={refrescar} />

      {(m.estado === 'VALIDADA' || m.estado === 'CITADA') && <FormularioCitacion matricula={m} alCitar={refrescar} />}
      {m.estado === 'CITADA' && <FormularioEvaluacion id={id} alRegistrar={refrescar} />}
      {m.evaluacion && <ResultadoAdmision matricula={m} />}
      {m.estado === 'ADMITIDA' && <SeccionPago matricula={m} alRegistrar={refrescar} />}
    </>
  )
}

function Documentos({ matricula, revisa, alCambiar }: { matricula: MatriculaDetalle; revisa: boolean; alCambiar: () => Promise<void> }) {
  const ver = useMutation({
    mutationFn: (tipo: DocumentoDeMatricula['tipo']) => abrirDocumento(matricula.id, tipo),
    onError: () => toast.error('No se pudo abrir el documento.'),
  })
  const aceptar = useMutation({
    mutationFn: (tipo: DocumentoDeMatricula['tipo']) => aceptarDocumento(matricula.id, tipo),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      await alCambiar()
    },
    onError: (e) => toast.error(mensajeDe(e, 'No se pudo aceptar el documento.')),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Documentos</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table aria-label="Documentos del postulante">
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matricula.documentos.map((documento) => (
              <TableRow key={documento.tipo}>
                <TableCell>
                  {documento.nombre}
                  {!documento.obligatorio && <span className="text-muted-foreground"> (opcional)</span>}
                  {documento.momento === 'ANTES_DEL_RESULTADO' && (
                    <span className="block text-xs text-muted-foreground">Exigido antes del resultado de admisión</span>
                  )}
                  {documento.observacion && <span className="block text-xs text-destructive">{documento.observacion}</span>}
                  {documento.vigenciaHasta && (
                    <span className="block text-xs text-muted-foreground">
                      {documento.nivel ? `Nivel ${documento.nivel} · ` : ''}Vigente hasta {formatearFecha(documento.vigenciaHasta)}
                    </span>
                  )}
                </TableCell>
                <TableCell>{ETIQUETA_DOCUMENTO[documento.estado]}</TableCell>
                <TableCell>
                  {documento.estado !== 'FALTANTE' && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => ver.mutate(documento.tipo)}>
                        <FileText aria-hidden />
                        Ver <span className="sr-only">{documento.nombre}</span>
                      </Button>
                      {revisa && documento.estado !== 'ACEPTADO' && pideVigencia(documento.tipo) && (
                        <DialogoAceptarConVigencia id={matricula.id} documento={documento} alAceptar={alCambiar} />
                      )}
                      {revisa && documento.estado !== 'ACEPTADO' && !pideVigencia(documento.tipo) && (
                        <Button size="sm" variant="outline" onClick={() => aceptar.mutate(documento.tipo)}>
                          Aceptar <span className="sr-only">{documento.nombre}</span>
                        </Button>
                      )}
                      {revisa && documento.estado !== 'OBSERVADO' && (
                        <DialogoObservarDocumento id={matricula.id} documento={documento} alObservar={alCambiar} />
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function DialogoAceptarConVigencia({
  id,
  documento,
  alAceptar,
}: {
  id: number
  documento: DocumentoDeMatricula
  alAceptar: () => Promise<void>
}) {
  const ingles = documento.tipo === 'CONSTANCIA_INGLES'
  const [abierto, setAbierto] = useState(false)
  const [vigencia, setVigencia] = useState('')
  const [nivel, setNivel] = useState('')
  const aceptar = useMutation({
    mutationFn: () => aceptarDocumento(id, documento.tipo, { vigenciaHasta: vigencia, nivel: ingles ? nivel.trim() : null }),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      setAbierto(false)
      await alAceptar()
    },
    onError: (e) => toast.error(mensajeDe(e, 'No se pudo aceptar el documento.')),
  })
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Aceptar <span className="sr-only">{documento.nombre}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aceptar «{documento.nombre}»</DialogTitle>
          <DialogDescription>
            La ficha de licencia del alumno usa esta vigencia{ingles ? ' y este nivel' : ''}; si vence durante el curso, el
            instructor recibe una alerta.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            aceptar.mutate()
          }}
        >
          {ingles && (
            <Field>
              <FieldLabel htmlFor={`nivel-${documento.tipo}`}>Nivel de inglés</FieldLabel>
              <Input
                id={`nivel-${documento.tipo}`}
                required
                maxLength={60}
                placeholder="Por ejemplo, Operacional (4)"
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
              />
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor={`vigencia-${documento.tipo}`}>Vigente hasta</FieldLabel>
            <Input
              id={`vigencia-${documento.tipo}`}
              type="date"
              required
              min={hoyIso()}
              value={vigencia}
              onChange={(e) => setVigencia(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={aceptar.isPending}>
              {aceptar.isPending ? 'Aceptando…' : 'Aceptar documento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogoObservarDocumento({
  id,
  documento,
  alObservar,
}: {
  id: number
  documento: DocumentoDeMatricula
  alObservar: () => Promise<void>
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const observar = useMutation({
    mutationFn: () => observarDocumento(id, documento.tipo, texto.trim()),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      setAbierto(false)
      await alObservar()
    },
    onError: (e) => toast.error(mensajeDe(e, 'No se pudo observar el documento.')),
  })
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Observar <span className="sr-only">{documento.nombre}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Observar «{documento.nombre}»</DialogTitle>
          <DialogDescription>El postulante verá la observación en su consulta y podrá reemplazar el archivo.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="obs-documento">Observación</FieldLabel>
          <Textarea id="obs-documento" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button disabled={observar.isPending || texto.trim().length < 3} onClick={() => observar.mutate()}>
            {observar.isPending ? 'Enviando…' : 'Observar documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FormularioCitacion({ matricula, alCitar }: { matricula: MatriculaDetalle; alCitar: () => Promise<void> }) {
  const citar = useMutation({
    mutationFn: (cuerpo: { fecha: string; hora: string; lugar: string }) => citarPostulante(matricula.id, cuerpo),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      await alCitar()
    },
    onError: (e) => toast.error(mensajeDe(e, 'No se pudo registrar la citación.')),
  })
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    citar.mutate({
      fecha: campo(formulario, 'fecha'),
      hora: campo(formulario, 'hora'),
      lugar: campo(formulario, 'lugar').trim(),
    })
  }
  const c = matricula.citacion
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{c ? 'Citación a la evaluación de admisión' : 'Citar a la evaluación de admisión'}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {c && (
          <p>
            Citado para el {formatearFecha(c.fecha)} a las {c.hora} · {c.lugar}.
          </p>
        )}
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
          <Field>
            <FieldLabel htmlFor="cit-fecha">Fecha</FieldLabel>
            <Input id="cit-fecha" name="fecha" type="date" min={hoyIso()} required defaultValue={c?.fecha} />
          </Field>
          <Field>
            <FieldLabel htmlFor="cit-hora">Hora</FieldLabel>
            <Input id="cit-hora" name="hora" type="time" required defaultValue={c?.hora} />
          </Field>
          <Field>
            <FieldLabel htmlFor="cit-lugar">Lugar</FieldLabel>
            <Input id="cit-lugar" name="lugar" required defaultValue={c?.lugar} />
          </Field>
          <Button type="submit" disabled={citar.isPending}>
            {c ? 'Reprogramar citación' : 'Citar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function FormularioEvaluacion({ id, alRegistrar }: { id: number; alRegistrar: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const registrar = useMutation({
    mutationFn: (cuerpo: Parameters<typeof registrarEvaluacion>[1]) => registrarEvaluacion(id, cuerpo),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.resultado === 'ADMITIDO' ? 'Postulante admitido.' : 'Postulante no admitido.')
      await alRegistrar()
    },
    onError: (e) => setError(mensajeDe(e, 'No se pudo registrar la evaluación.')),
  })
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const nota = Number(campo(formulario, 'nota'))
    if (!Number.isInteger(nota) || nota < 0 || nota > 20) return setError('La nota debe ser un entero entre 0 y 20.')
    setError(null)
    registrar.mutate({
      notaConocimientos: nota,
      entrevista: campo(formulario, 'entrevista') as 'APTO' | 'NO_APTO',
      evaluacionPsicologica: campo(formulario, 'psicologica') as 'APTO' | 'NO_APTO',
      observaciones: campo(formulario, 'observaciones'),
    })
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Evaluación de admisión</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="text-muted-foreground">
          Se admite con nota de 14 o más en el examen de conocimientos y «apto» en la entrevista y en la evaluación
          psicológica. Requiere el certificado médico aeronáutico aceptado.
        </p>
        <form onSubmit={enviar} className="grid gap-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="ev-nota">Examen de conocimientos (0–20)</FieldLabel>
              <Input id="ev-nota" name="nota" type="number" min={0} max={20} step={1} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="ev-entrevista">Entrevista personal</FieldLabel>
              <NativeSelect id="ev-entrevista" name="entrevista" className="w-full" defaultValue="APTO">
                <NativeSelectOption value="APTO">Apto</NativeSelectOption>
                <NativeSelectOption value="NO_APTO">No apto</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="ev-psicologica">Evaluación psicológica</FieldLabel>
              <NativeSelect id="ev-psicologica" name="psicologica" className="w-full" defaultValue="APTO">
                <NativeSelectOption value="APTO">Apto</NativeSelectOption>
                <NativeSelectOption value="NO_APTO">No apto</NativeSelectOption>
              </NativeSelect>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="ev-observaciones">Observaciones</FieldLabel>
            <Textarea id="ev-observaciones" name="observaciones" />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" className="w-fit" disabled={registrar.isPending}>
            {registrar.isPending ? 'Registrando…' : 'Registrar evaluación'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ResultadoAdmision({ matricula }: { matricula: MatriculaDetalle }) {
  const e = matricula.evaluacion!
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Resultado de admisión</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <p>
          <strong>{e.resultado === 'ADMITIDO' ? 'Admitido' : 'No admitido'}</strong> · examen {e.notaConocimientos}/20 ·
          entrevista {e.entrevista === 'APTO' ? 'apto' : 'no apto'} · evaluación psicológica{' '}
          {e.evaluacionPsicologica === 'APTO' ? 'apto' : 'no apto'}
        </p>
        {e.observaciones && <p className="mt-1 text-muted-foreground">{e.observaciones}</p>}
      </CardContent>
    </Card>
  )
}

function SeccionPago({ matricula, alRegistrar }: { matricula: MatriculaDetalle; alRegistrar: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const registrar = useMutation({
    mutationFn: (cuerpo: Parameters<typeof registrarPago>[1]) => registrarPago(matricula.id, cuerpo),
    onSuccess: async (respuesta) => {
      toast.success(respuesta.mensaje)
      await alRegistrar()
    },
    onError: (e) => setError(mensajeDe(e, 'No se pudo registrar el pago.')),
  })
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const monto = Number(campo(formulario, 'monto'))
    if (!(monto > 0)) return setError('El monto debe ser mayor que cero.')
    setError(null)
    registrar.mutate({
      fecha: campo(formulario, 'fecha'),
      monto,
      medio: campo(formulario, 'medio') as MedioPago,
      numeroOperacion: campo(formulario, 'operacion').trim(),
    })
  }
  const p = matricula.pago
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Pago de matrícula</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {p ? (
          <p>
            Pago confirmado: S/ {p.monto.toFixed(2)} · {ETIQUETA_MEDIO[p.medio]} · operación {p.numeroOperacion} ·{' '}
            {formatearFecha(p.fecha)}. Ya se puede asignar a un grupo.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground">
              El sistema no procesa pagos: registra aquí el pago verificado. Sin él, el alumno no se puede asignar a un grupo.
            </p>
            <form onSubmit={enviar} className="grid gap-4">
              <FieldGroup className="grid gap-4 sm:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="pago-fecha">Fecha</FieldLabel>
                  <Input id="pago-fecha" name="fecha" type="date" max={hoyIso()} defaultValue={hoyIso()} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pago-monto">Monto (S/)</FieldLabel>
                  <Input id="pago-monto" name="monto" type="number" min="0.01" step="0.01" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pago-medio">Medio</FieldLabel>
                  <NativeSelect id="pago-medio" name="medio" className="w-full" defaultValue="TRANSFERENCIA">
                    {MEDIOS_PAGO.map((medio) => (
                      <NativeSelectOption key={medio} value={medio}>
                        {ETIQUETA_MEDIO[medio]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="pago-operacion">N.º de operación</FieldLabel>
                  <Input id="pago-operacion" name="operacion" required />
                </Field>
              </FieldGroup>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" className="w-fit" disabled={registrar.isPending}>
                {registrar.isPending ? 'Registrando…' : 'Registrar pago'}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
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
            El postulante verá las observaciones en su consulta.
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
          <DialogTitle>Rechazar postulación</DialogTitle>
          <DialogDescription>
            El postulante verá el motivo en su consulta. La postulación queda cerrada.
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

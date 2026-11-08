import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Clock, FileDown, Layers } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { hoyIso } from '@/lib/dominio/calendario'
import { formatearFecha } from '@/lib/formato'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { Route } from '@/routes/matricula'
import {
  convocatoriaPublicaQuery,
  crearMatricula,
  cursoQuery,
  requisitosQuery,
  type DatosPostulacion,
  type DocumentoVista,
  type TipoDocumentoPostulacion,
} from './api'
import { BarraPublica } from './barra-publica'
import {
  DECLARACION_JURADA,
  errorDeArchivo,
  esquemaMatricula,
  matriculaVacia,
  modeloDeclaracionJurada,
  TEXTO_CONSENTIMIENTO,
  type ValoresMatricula,
} from './schemas'

function Pagina({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/20">
      <BarraPublica />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  )
}

export function MatriculaPage() {
  const { convocatoria } = Route.useSearch()

  if (!convocatoria) {
    return (
      <Pagina>
        <h1 className="text-2xl font-semibold tracking-tight">Postulación</h1>
        <p className="mt-2 text-muted-foreground">
          Elige una convocatoria abierta en el{' '}
          <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
            catálogo
          </Link>{' '}
          para postular.
        </p>
      </Pagina>
    )
  }

  return <FormularioMatricula idConvocatoria={convocatoria} />
}

type Archivos = Partial<Record<TipoDocumentoPostulacion, File>>

function CampoTexto({
  id,
  etiqueta,
  error,
  descripcion,
  ...resto
}: React.ComponentProps<typeof Input> & { etiqueta: string; error?: string; descripcion?: string }) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Input id={id} aria-invalid={Boolean(error)} {...resto} />
      {descripcion && <FieldDescription>{descripcion}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function CampoArchivo({
  documento,
  error,
  alElegir,
}: {
  documento: DocumentoVista
  error: string | null
  alElegir: (archivo: File | null) => void
}) {
  const id = `m-doc-${documento.tipo}`
  const indicacion =
    documento.momento === 'ANTES_DEL_RESULTADO'
      ? 'Opcional ahora; obligatorio antes del resultado de admisión.'
      : documento.obligatorio
        ? 'Obligatorio.'
        : 'Opcional, si aplica.'
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{documento.nombre}</FieldLabel>
      <Input
        id={id}
        type="file"
        accept={documento.soloImagen ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
        aria-invalid={Boolean(error)}
        onChange={(evento) => alElegir(evento.target.files?.[0] ?? null)}
      />
      <FieldDescription>
        {indicacion} {documento.soloImagen ? 'JPG o PNG' : 'PDF, JPG o PNG'}, máx. 5 MB.
      </FieldDescription>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function FormularioMatricula({ idConvocatoria }: { idConvocatoria: number }) {
  const convocatoria = useQuery(convocatoriaPublicaQuery(idConvocatoria))
  const requisitos = useQuery(requisitosQuery())
  const idCurso = convocatoria.data?.idCurso ?? null
  const detalle = useQuery({ ...cursoQuery(idCurso ?? 0), enabled: idCurso !== null })
  const [archivos, setArchivos] = useState<Archivos>({})
  const [erroresArchivo, setErroresArchivo] = useState<Partial<Record<TipoDocumentoPostulacion, string>>>({})
  const [codigo, setCodigo] = useState<string | null>(null)

  const formulario = useForm<ValoresMatricula>({ resolver: zodResolver(esquemaMatricula), defaultValues: matriculaVacia })
  const { errors } = formulario.formState
  const documentos = requisitos.data?.documentos ?? []

  const guardar = useMutation({
    mutationFn: (valores: ValoresMatricula) => {
      const datos: DatosPostulacion = { ...valores, idConvocatoria, aceptaTratamientoDatos: true }
      return crearMatricula(datos, archivos)
    },
    onSuccess: (respuesta) => setCodigo(respuesta.codigo),
    onError: (error) => {
      if (!(error instanceof ApiError)) return
      aplicarErroresDeCampo(error, formulario.setError)
      const deArchivos: Partial<Record<TipoDocumentoPostulacion, string>> = {}
      for (const documento of documentos) {
        const mensaje = error.erroresDeCampo[documento.tipo]
        if (mensaje) deArchivos[documento.tipo] = mensaje
      }
      setErroresArchivo(deArchivos)
    },
  })

  const [avisoModelo, setAvisoModelo] = useState<string | null>(null)

  async function abrirModelo() {
    const completos = await formulario.trigger(['tipoDocumento', 'numeroDocumento', 'nombres', 'aPaterno', 'direccion'])
    if (!completos) {
      setAvisoModelo('Completa primero tu documento, nombres, apellido y dirección: el modelo sale con esos datos.')
      return
    }
    setAvisoModelo(null)
    const v = formulario.getValues()
    const ventana = window.open('', '_blank')
    if (!ventana) {
      setAvisoModelo('El navegador bloqueó la ventana del modelo; permite las ventanas emergentes e inténtalo de nuevo.')
      return
    }
    ventana.document.write(
      modeloDeclaracionJurada({
        nombres: v.nombres,
        aPaterno: v.aPaterno,
        aMaterno: v.aMaterno,
        tipoDocumento: v.tipoDocumento,
        numeroDocumento: v.numeroDocumento,
        direccion: v.direccion,
        convocatoria: convocatoria.data?.nombre ?? 'Postulación',
        fecha: formatearFecha(hoyIso()),
      }),
    )
    ventana.document.close()
  }

  function elegir(documento: DocumentoVista, archivo: File | null) {
    setArchivos((previos) => ({ ...previos, [documento.tipo]: archivo ?? undefined }))
    setErroresArchivo((previos) => ({ ...previos, [documento.tipo]: errorDeArchivo(archivo, documento.soloImagen) ?? undefined }))
  }

  function enviar(valores: ValoresMatricula) {
    const problemas: Partial<Record<TipoDocumentoPostulacion, string>> = {}
    for (const documento of documentos) {
      const archivo = archivos[documento.tipo] ?? null
      const exigido = documento.obligatorio && documento.momento === 'POSTULACION'
      const problema = archivo ? errorDeArchivo(archivo, documento.soloImagen) : exigido ? `Falta el documento «${documento.nombre}».` : null
      if (problema) problemas[documento.tipo] = problema
    }
    setErroresArchivo(problemas)
    if (Object.keys(problemas).length > 0) return
    guardar.mutate(valores)
  }

  const errorDetalle = errorDePrimeraCarga(convocatoria) ?? errorDePrimeraCarga(requisitos) ?? errorDePrimeraCarga(detalle)
  if (errorDetalle !== null)
    return (
      <Pagina>
        <AvisoDeError error={errorDetalle} alReintentar={() => void requisitos.refetch()} />
      </Pagina>
    )

  if (codigo) {
    return (
      <Pagina>
        <Card className="text-center">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <span
              className="grid size-14 place-items-center rounded-full"
              style={{ backgroundColor: '#D8B85822', color: '#8a6d1f' }}
            >
              <CheckCircle2 className="size-8" aria-hidden />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Postulación enviada</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Tu postulación quedó <strong className="text-foreground">en revisión documental</strong>. Guarda tu código:
              con él y tu número de documento consultas el avance, subsanas lo que te observen y, si eres admitido,
              activas tu cuenta.
            </p>
            <p className="rounded-md border bg-background px-6 py-3 font-mono text-2xl tracking-[0.3em]" aria-label="Código de postulación">
              {codigo}
            </p>
            <Button asChild className="text-white hover:brightness-110" style={{ backgroundColor: '#101A3C' }}>
              <Link to="/postulacion">Consultar mi postulación</Link>
            </Button>
          </CardContent>
        </Card>
      </Pagina>
    )
  }

  return (
    <Pagina>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 w-fit text-muted-foreground">
        <Link to="/">
          <ArrowLeft className="size-4" aria-hidden />
          Volver al catálogo
        </Link>
      </Button>

      <div className="mb-6">
        <Badge variant="secondary" className="mb-2" style={{ backgroundColor: '#D8B85822', color: '#8a6d1f' }}>
          Postulación
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          {convocatoria.data?.nombre ?? detalle.data?.nombre ?? 'Postulación'}
        </h1>
        {detalle.data && (
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" style={{ color: '#b6831a' }} aria-hidden />
              {detalle.data.duracion} horas de vuelo
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="size-4" style={{ color: '#b6831a' }} aria-hidden />
              Programa PDI EA-510
            </span>
          </div>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          No necesitas crear una cuenta: al enviar recibirás un código para seguir tu postulación. Requisitos: ser
          mayor de edad y contar con secundaria completa.
        </p>
      </div>

      <form noValidate onSubmit={formulario.handleSubmit(enviar)} className="grid gap-6">
        {guardar.error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo enviar la postulación</AlertTitle>
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Datos personales</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="m-tipo-documento">Tipo de documento</FieldLabel>
                <NativeSelect id="m-tipo-documento" className="w-full" {...formulario.register('tipoDocumento')}>
                  <NativeSelectOption value="DNI">DNI</NativeSelectOption>
                  <NativeSelectOption value="CE">Carné de extranjería</NativeSelectOption>
                  <NativeSelectOption value="PASAPORTE">Pasaporte</NativeSelectOption>
                </NativeSelect>
              </Field>
              <CampoTexto id="m-numero" etiqueta="Número de documento" error={errors.numeroDocumento?.message} {...formulario.register('numeroDocumento')} />
              <CampoTexto id="m-nombres" etiqueta="Nombres" error={errors.nombres?.message} {...formulario.register('nombres')} />
              <CampoTexto id="m-apaterno" etiqueta="Apellido paterno" error={errors.aPaterno?.message} {...formulario.register('aPaterno')} />
              <CampoTexto id="m-amaterno" etiqueta="Apellido materno" error={errors.aMaterno?.message} {...formulario.register('aMaterno')} />
              <CampoTexto id="m-nacimiento" type="date" etiqueta="Fecha de nacimiento" error={errors.fechaNacimiento?.message} {...formulario.register('fechaNacimiento')} />
              <Field data-invalid={Boolean(errors.sexo)}>
                <FieldLabel htmlFor="m-sexo">Sexo</FieldLabel>
                <NativeSelect id="m-sexo" className="w-full" aria-invalid={Boolean(errors.sexo)} {...formulario.register('sexo')}>
                  <NativeSelectOption value="">Elija una opción</NativeSelectOption>
                  <NativeSelectOption value="FEMENINO">Femenino</NativeSelectOption>
                  <NativeSelectOption value="MASCULINO">Masculino</NativeSelectOption>
                </NativeSelect>
                {errors.sexo && <FieldError>{errors.sexo.message}</FieldError>}
              </Field>
              <CampoTexto id="m-nacionalidad" etiqueta="Nacionalidad" error={errors.nacionalidad?.message} {...formulario.register('nacionalidad')} />
              <CampoTexto id="m-direccion" etiqueta="Dirección" error={errors.direccion?.message} {...formulario.register('direccion')} />
              <CampoTexto id="m-correo" type="email" etiqueta="Correo" error={errors.correo?.message} descripcion="Si eres admitido, será tu usuario." {...formulario.register('correo')} />
              <CampoTexto id="m-contacto" etiqueta="Teléfono de contacto" error={errors.contacto?.message} {...formulario.register('contacto')} />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Declaración jurada</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p className="text-muted-foreground">
              Descarga el modelo con tus datos, fírmalo a mano (o con firma digital) y súbelo abajo como «Declaración jurada
              firmada». En él declaras bajo juramento que:
            </p>
            <ul className="grid list-disc gap-1.5 pl-5 text-muted-foreground">
              {DECLARACION_JURADA.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="grid gap-1">
              <Button type="button" variant="outline" className="w-fit" onClick={() => void abrirModelo()}>
                <FileDown aria-hidden />
                Descargar modelo para firmar
              </Button>
              {avisoModelo && <FieldError>{avisoModelo}</FieldError>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Documentos</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              {documentos.map((documento) => (
                <CampoArchivo
                  key={documento.tipo}
                  documento={documento}
                  error={erroresArchivo[documento.tipo] ?? null}
                  alElegir={(archivo) => elegir(documento, archivo)}
                />
              ))}
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Tratamiento de datos personales</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Controller
              control={formulario.control}
              name="aceptaTratamientoDatos"
              render={({ field }) => (
                <Field data-invalid={Boolean(errors.aceptaTratamientoDatos)} orientation="horizontal">
                  <Checkbox
                    id="m-consentimiento"
                    checked={field.value === true}
                    onCheckedChange={(marcado) => field.onChange(marcado === true)}
                  />
                  <Label htmlFor="m-consentimiento" className="font-normal">
                    {TEXTO_CONSENTIMIENTO}
                  </Label>
                </Field>
              )}
            />
            {errors.aceptaTratamientoDatos && <FieldError>{errors.aceptaTratamientoDatos.message}</FieldError>}
          </CardContent>
        </Card>
        <Button
          type="submit"
          disabled={guardar.isPending}
          className="w-fit text-white hover:brightness-110"
          style={{ backgroundColor: '#101A3C' }}
        >
          {guardar.isPending ? 'Enviando…' : 'Enviar postulación'}
        </Button>
      </form>
    </Pagina>
  )
}

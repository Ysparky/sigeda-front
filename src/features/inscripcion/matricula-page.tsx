import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, FileDown, FileText, Paperclip, ShieldCheck } from 'lucide-react'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { archivosDeEjemplo, aspiranteDeEjemplo } from './ejemplo-de-postulacion'
import { Skeleton } from '@/components/ui/skeleton'
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
  type ConvocatoriaPublica,
  type DatosPostulacion,
  type DocumentoVista,
  type TipoDocumentoPostulacion,
} from './api'
import { BODY, BTN_ORO, CONTROL, ERROR, EXITO, FOCO, FOTO_COCKPIT, GOLD, LINEA, NAVY, PANEL, PASOS, TINTA, TITULO_PANEL } from './marca'
import { PaginaPublica as Pagina } from './pagina-publica'
import {
  DECLARACION_JURADA,
  errorDeArchivo,
  esquemaMatricula,
  matriculaVacia,
  modeloDeclaracionJurada,
  TEXTO_CONSENTIMIENTO,
  type ValoresMatricula,
} from './schemas'


export function MatriculaPage() {
  const { convocatoria } = Route.useSearch()

  if (!convocatoria) {
    return (
      <Pagina>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-4xl font-bold uppercase" style={{ color: TINTA }}>
            Postulación
          </h1>
          <p className="mt-4 text-lg">
            Elige una convocatoria abierta en el{' '}
            <Link to="/" hash="cursos" className={`rounded font-semibold underline underline-offset-4 ${FOCO}`} style={{ color: TINTA }}>
              catálogo
            </Link>{' '}
            para postular.
          </p>
        </main>
      </Pagina>
    )
  }

  return <FormularioMatricula idConvocatoria={convocatoria} />
}

type Archivos = Partial<Record<TipoDocumentoPostulacion, File>>
type ErroresArchivo = Partial<Record<TipoDocumentoPostulacion, string>>

function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  className = '',
  children,
}: {
  id: string
  etiqueta: string
  error?: string
  ayuda?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`grid content-start gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold" style={{ color: TINTA }}>
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && <p className="text-[13px]">{ayuda}</p>}
      {error && (
        <p className="text-[13px] font-medium" style={{ color: ERROR }}>
          {error}
        </p>
      )}
    </div>
  )
}

function Texto({ invalido, ...resto }: ComponentProps<'input'> & { invalido: boolean }) {
  return <input aria-invalid={invalido} className={CONTROL} style={{ borderColor: invalido ? ERROR : LINEA, color: TINTA }} {...resto} />
}

function Encabezado({ titulo, descripcion }: { titulo: string; descripcion?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className={TITULO_PANEL} style={{ color: TINTA }}>
        {titulo}
      </h2>
      {descripcion && <p className="mt-1.5 max-w-[62ch] text-[15px]">{descripcion}</p>}
    </div>
  )
}

function indicacion(documento: DocumentoVista) {
  if (documento.momento === 'ANTES_DEL_RESULTADO') return 'Puedes subirlo después, antes del resultado de admisión'
  return documento.obligatorio ? 'Obligatorio' : 'Opcional, si aplica'
}

function FilaDocumento({
  documento,
  archivo,
  error,
  alElegir,
}: {
  documento: DocumentoVista
  archivo?: File
  error?: string
  alElegir: (archivo: File | null) => void
}) {
  const id = `m-doc-${documento.tipo}`
  const cargado = archivo !== undefined && !error
  return (
    <li className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: cargado ? '#E6F4EC' : '#EEF0F5', color: cargado ? EXITO : TINTA }}
        aria-hidden
      >
        {cargado ? <Check className="size-5" /> : <FileText className="size-5" />}
      </span>
      <div className="min-w-0">
        <p className="font-semibold" style={{ color: TINTA }}>
          {documento.nombre}
        </p>
        <p className="text-[13px] sm:truncate">
          {archivo ? archivo.name : `${indicacion(documento)} · ${documento.soloImagen ? 'JPG o PNG' : 'PDF, JPG o PNG'}, máx. 5 MB`}
        </p>
        {error && (
          <p className="text-[13px] font-medium" style={{ color: ERROR }}>
            {error}
          </p>
        )}
      </div>
      <input
        id={id}
        type="file"
        className="peer sr-only"
        aria-label={documento.nombre}
        aria-invalid={Boolean(error)}
        accept={documento.soloImagen ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
        onChange={(evento) => alElegir(evento.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className="font-display col-start-2 inline-flex cursor-pointer items-center gap-2 justify-self-start rounded-full border px-4 py-2 sm:col-start-auto sm:justify-self-end text-xs font-bold uppercase tracking-wider transition hover:bg-[#101A3C]/5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#D8B858] peer-focus-visible:ring-offset-2"
        style={{ borderColor: LINEA, color: TINTA }}
      >
        <Paperclip className="size-3.5" aria-hidden />
        {archivo ? 'Cambiar' : 'Elegir archivo'}
      </label>
    </li>
  )
}

type Paso = { listo: boolean; texto: string; nota?: string }

function Resumen({ pasos }: { pasos: Paso[] }) {
  const listos = pasos.filter((p) => p.listo).length
  return (
    <aside className="lg:sticky lg:top-6">
      <div className={PANEL}>
        <h2 className={TITULO_PANEL} style={{ color: TINTA }}>
          Antes de enviar
        </h2>
        <p className="mt-1 text-[15px]">
          {listos === pasos.length ? 'Todo listo para enviar.' : `${listos} de ${pasos.length} listos.`}
        </p>
        <ul className="mt-5 grid gap-3.5">
          {pasos.map((paso) => (
            <li key={paso.texto} className="flex gap-3">
              {paso.listo ? (
                <Check className="mt-0.5 size-5 shrink-0" style={{ color: EXITO }} aria-label="Listo" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0" style={{ color: '#9AA0B2' }} aria-label="Pendiente" />
              )}
              <span className="text-[15px]" style={{ color: paso.listo ? TINTA : BODY }}>
                {paso.texto}
                {paso.nota && <span className="block text-[13px]">{paso.nota}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-5 px-2 text-[15px]">
        ¿Ya postulaste?{' '}
        <Link to="/postulacion" className={`rounded font-semibold underline underline-offset-4 ${FOCO}`} style={{ color: TINTA }}>
          Consulta tu postulación
        </Link>
      </p>
    </aside>
  )
}

function Franja({ convocatoria, duracion }: { convocatoria?: ConvocatoriaPublica; duracion?: number }) {
  const datos = [
    duracion !== undefined ? `${duracion} horas de vuelo` : null,
    convocatoria ? `Postulaciones hasta el ${formatearFecha(convocatoria.fechaFin)}` : null,
    convocatoria ? `${convocatoria.vacantes} vacantes` : null,
  ].filter(Boolean)
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        backgroundImage: `linear-gradient(120deg, rgba(10,18,48,0.96) 0%, rgba(16,34,78,0.9) 55%, rgba(24,42,99,0.82) 100%), url('${FOTO_COCKPIT}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="mx-auto max-w-[1170px] px-4 pb-10 pt-8 sm:px-6">
        <Link
          to="/"
          hash="cursos"
          className={`inline-flex items-center gap-1.5 rounded text-sm font-semibold text-white/80 hover:text-white ${FOCO}`}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver al catálogo
        </Link>
        <h1 className="font-display mt-5 text-balance text-4xl font-bold uppercase leading-[1.05] sm:text-5xl">
          {convocatoria ? `Postula a ${convocatoria.nombre}` : 'Postulación'}
        </h1>
        <p className="mt-3 text-lg text-[#D6DBEA]">Piloto de Helicóptero · Programa PDI EA-510</p>
        {datos.length > 0 && (
          <p className="mt-2 text-[15px] text-[#D6DBEA]">{datos.join(' · ')}</p>
        )}
        <ol aria-label="Proceso de admisión" className="mt-8 grid gap-2 sm:grid-cols-5">
          {PASOS.map((paso, indice) => {
            const actual = indice === 0
            return (
              <li
                key={paso.titulo}
                aria-current={actual ? 'step' : undefined}
                className={`${actual ? 'flex' : 'hidden sm:flex'} items-center gap-2.5 rounded-lg px-3 py-2.5`}
                style={{ backgroundColor: actual ? 'rgba(216,184,88,0.16)' : 'rgba(255,255,255,0.05)' }}
              >
                <span
                  className="font-display grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold"
                  style={actual ? { backgroundColor: GOLD, color: NAVY } : { border: '1px solid rgba(255,255,255,0.35)' }}
                >
                  {indice + 1}
                </span>
                <span className={`text-[13px] leading-tight ${actual ? 'font-semibold text-white' : 'text-[#C3C9DB]'}`}>
                  {actual && <span className="sm:hidden">Paso 1 de {PASOS.length}: </span>}
                  {paso.titulo}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function FormularioMatricula({ idConvocatoria }: { idConvocatoria: number }) {
  const convocatoria = useQuery(convocatoriaPublicaQuery(idConvocatoria))
  const requisitos = useQuery(requisitosQuery())
  const idCurso = convocatoria.data?.idCurso ?? null
  const detalle = useQuery({ ...cursoQuery(idCurso ?? 0), enabled: idCurso !== null })
  const [archivos, setArchivos] = useState<Archivos>({})
  const [erroresArchivo, setErroresArchivo] = useState<ErroresArchivo>({})
  const [codigo, setCodigo] = useState<string | null>(null)
  const [avisoModelo, setAvisoModelo] = useState<string | null>(null)

  const formulario = useForm<ValoresMatricula>({ resolver: zodResolver(esquemaMatricula), defaultValues: matriculaVacia })
  const { errors } = formulario.formState
  const valores = useWatch({ control: formulario.control })
  const documentos = requisitos.data?.documentos ?? []

  const guardar = useMutation({
    mutationFn: (v: ValoresMatricula) => {
      const datos: DatosPostulacion = { ...v, idConvocatoria, aceptaTratamientoDatos: true }
      return crearMatricula(datos, archivos)
    },
    onSuccess: (respuesta) => {
      setCodigo(respuesta.codigo)
      window.scrollTo({ top: 0 })
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return
      aplicarErroresDeCampo(error, formulario.setError)
      const deArchivos: ErroresArchivo = {}
      for (const documento of documentos) {
        const mensaje = error.erroresDeCampo[documento.tipo]
        if (mensaje) deArchivos[documento.tipo] = mensaje
      }
      setErroresArchivo(deArchivos)
    },
  })

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

  function enviar(v: ValoresMatricula) {
    const problemas: ErroresArchivo = {}
    for (const documento of documentos) {
      const archivo = archivos[documento.tipo] ?? null
      const exigido = documento.obligatorio && documento.momento === 'POSTULACION'
      const problema = archivo
        ? errorDeArchivo(archivo, documento.soloImagen)
        : exigido
          ? `Falta el documento «${documento.nombre}».`
          : null
      if (problema) problemas[documento.tipo] = problema
    }
    setErroresArchivo(problemas)
    if (Object.keys(problemas).length > 0) return
    guardar.mutate(v)
  }

  const errorDetalle = errorDePrimeraCarga(convocatoria) ?? errorDePrimeraCarga(requisitos) ?? errorDePrimeraCarga(detalle)
  if (errorDetalle !== null) {
    return (
      <Pagina>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-20 sm:px-6">
          <div className={PANEL} role="alert">
            <h1 className={TITULO_PANEL} style={{ color: TINTA }}>
              No pudimos abrir la convocatoria
            </h1>
            <p className="mt-2">{errorDetalle instanceof ApiError ? errorDetalle.message : MENSAJE_GENERICO}</p>
            <button
              type="button"
              className={`${BTN_ORO} mt-6`}
              style={{ backgroundColor: GOLD, color: NAVY }}
              onClick={() => void Promise.all([convocatoria.refetch(), requisitos.refetch()])}
            >
              Reintentar
            </button>
          </div>
        </main>
      </Pagina>
    )
  }

  if (codigo) return <Enviada codigo={codigo} convocatoria={convocatoria.data?.nombre} />

  const obligatorios = documentos.filter((d) => d.obligatorio && d.momento === 'POSTULACION' && d.tipo !== 'DECLARACION_JURADA')
  const cargados = obligatorios.filter((d) => archivos[d.tipo] && !erroresArchivo[d.tipo]).length
  const datosCompletos = Boolean(
    valores.numeroDocumento &&
      valores.nombres &&
      valores.aPaterno &&
      valores.fechaNacimiento &&
      valores.sexo &&
      valores.nacionalidad &&
      valores.direccion &&
      valores.correo &&
      valores.contacto,
  )
  const pasos: Paso[] = [
    { listo: datosCompletos, texto: 'Datos personales completos' },
    { listo: cargados === obligatorios.length && obligatorios.length > 0, texto: `Documentos obligatorios (${cargados} de ${obligatorios.length})` },
    {
      listo: Boolean(archivos.DECLARACION_JURADA && !erroresArchivo.DECLARACION_JURADA),
      texto: 'Declaración jurada firmada',
      nota: 'Descarga el modelo, fírmalo y súbelo.',
    },
    { listo: valores.aceptaTratamientoDatos === true, texto: 'Autorización de datos personales' },
    {
      listo: Boolean(archivos.CERTIFICADO_MEDICO),
      texto: 'Certificado médico aeronáutico',
      nota: 'Opcional ahora; obligatorio antes del resultado.',
    },
  ]

  const reg = formulario.register

  return (
    <Pagina>
      <Franja convocatoria={convocatoria.data} duracion={detalle.data?.duracion} />
      <main className="mx-auto w-full max-w-[1170px] flex-1 px-4 py-10 sm:px-6">
        <form noValidate onSubmit={formulario.handleSubmit(enviar)} className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
            {guardar.error && (
              <div role="alert" className="flex gap-3 rounded-2xl border bg-white p-5" style={{ borderColor: ERROR }}>
                <CircleAlert className="mt-0.5 size-5 shrink-0" style={{ color: ERROR }} aria-hidden />
                <div>
                  <p className="font-semibold" style={{ color: ERROR }}>
                    No se pudo enviar la postulación
                  </p>
                  <p className="text-[15px]">{guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}</p>
                </div>
              </div>
            )}

            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => {
                  formulario.reset(aspiranteDeEjemplo())
                  setArchivos(archivosDeEjemplo())
                  setErroresArchivo({})
                }}
                className="justify-self-start rounded-full border border-dashed px-4 py-2 text-sm font-semibold"
                style={{ borderColor: LINEA, color: TINTA }}
              >
                Llenar con un aspirante de ejemplo
              </button>
            )}
            <section className={PANEL} aria-labelledby="titulo-datos">
              <h2 id="titulo-datos" className={`${TITULO_PANEL} mb-1.5`} style={{ color: TINTA }}>
                Tus datos
              </h2>
              <p className="mb-6 max-w-[62ch] text-[15px]">
                No necesitas crear una cuenta: al enviar recibirás un código para seguir tu postulación. Debes ser mayor
                de edad.
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                <Campo id="m-tipo-documento" etiqueta="Tipo de documento">
                  <select id="m-tipo-documento" className={CONTROL} style={{ borderColor: LINEA, color: TINTA }} {...reg('tipoDocumento')}>
                    <option value="DNI">DNI</option>
                    <option value="CE">Carné de extranjería</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </Campo>
                <Campo id="m-numero" etiqueta="Número de documento" error={errors.numeroDocumento?.message}>
                  <Texto id="m-numero" inputMode="text" autoComplete="off" invalido={Boolean(errors.numeroDocumento)} {...reg('numeroDocumento')} />
                </Campo>
                <Campo id="m-nombres" etiqueta="Nombres" error={errors.nombres?.message}>
                  <Texto id="m-nombres" autoComplete="given-name" invalido={Boolean(errors.nombres)} {...reg('nombres')} />
                </Campo>
                <Campo id="m-apaterno" etiqueta="Apellido paterno" error={errors.aPaterno?.message}>
                  <Texto id="m-apaterno" autoComplete="family-name" invalido={Boolean(errors.aPaterno)} {...reg('aPaterno')} />
                </Campo>
                <Campo id="m-amaterno" etiqueta="Apellido materno" error={errors.aMaterno?.message}>
                  <Texto id="m-amaterno" invalido={Boolean(errors.aMaterno)} {...reg('aMaterno')} />
                </Campo>
                <Campo id="m-nacimiento" etiqueta="Fecha de nacimiento" error={errors.fechaNacimiento?.message}>
                  <Texto id="m-nacimiento" type="date" autoComplete="bday" invalido={Boolean(errors.fechaNacimiento)} {...reg('fechaNacimiento')} />
                </Campo>
                <Campo id="m-sexo" etiqueta="Sexo" error={errors.sexo?.message}>
                  <select
                    id="m-sexo"
                    aria-invalid={Boolean(errors.sexo)}
                    className={CONTROL}
                    style={{ borderColor: errors.sexo ? ERROR : LINEA, color: TINTA }}
                    {...reg('sexo')}
                  >
                    <option value="">Elija una opción</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="MASCULINO">Masculino</option>
                  </select>
                </Campo>
                <Campo id="m-nacionalidad" etiqueta="Nacionalidad" error={errors.nacionalidad?.message}>
                  <Texto id="m-nacionalidad" invalido={Boolean(errors.nacionalidad)} {...reg('nacionalidad')} />
                </Campo>
                <Campo id="m-direccion" etiqueta="Dirección" error={errors.direccion?.message} className="sm:col-span-2">
                  <Texto id="m-direccion" autoComplete="street-address" invalido={Boolean(errors.direccion)} {...reg('direccion')} />
                </Campo>
                <Campo id="m-correo" etiqueta="Correo" error={errors.correo?.message} ayuda="Si eres admitido, será tu usuario.">
                  <Texto id="m-correo" type="email" autoComplete="email" invalido={Boolean(errors.correo)} {...reg('correo')} />
                </Campo>
                <Campo id="m-contacto" etiqueta="Teléfono de contacto" error={errors.contacto?.message}>
                  <Texto id="m-contacto" type="tel" autoComplete="tel" invalido={Boolean(errors.contacto)} {...reg('contacto')} />
                </Campo>
              </div>
            </section>

            <section className={PANEL} aria-labelledby="titulo-declaracion">
              <h2 id="titulo-declaracion" className={`${TITULO_PANEL} mb-1.5`} style={{ color: TINTA }}>
                Declaración jurada
              </h2>
              <p className="max-w-[62ch] text-[15px]">
                Descarga el modelo con tus datos, fírmalo a mano (o con firma digital) y súbelo abajo como «Declaración
                jurada firmada». En él declaras bajo juramento que:
              </p>
              <ol className="mt-4 grid max-w-[68ch] list-decimal gap-1.5 pl-5 text-[15px] marker:font-semibold marker:text-[#101A3C]">
                {DECLARACION_JURADA.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => void abrirModelo()}
                className={`font-display mt-6 inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-bold uppercase tracking-wider transition hover:bg-[#101A3C]/5 ${FOCO}`}
                style={{ borderColor: NAVY, color: NAVY }}
              >
                <FileDown className="size-4" aria-hidden />
                Descargar modelo para firmar
              </button>
              {avisoModelo && (
                <p className="mt-2 text-[13px] font-medium" style={{ color: ERROR }}>
                  {avisoModelo}
                </p>
              )}
            </section>

            <section className={PANEL} aria-labelledby="titulo-documentos">
              <Encabezado titulo="Documentos" descripcion="Un archivo por documento. Se revisan uno por uno; si alguno se observa, lo reemplazas desde tu consulta." />
              {requisitos.isPending ? (
                <div className="grid gap-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (
                <ul className="-my-4 divide-y" style={{ borderColor: LINEA }}>
                  {documentos.map((documento) => (
                    <FilaDocumento
                      key={documento.tipo}
                      documento={documento}
                      archivo={archivos[documento.tipo]}
                      error={erroresArchivo[documento.tipo]}
                      alElegir={(archivo) => elegir(documento, archivo)}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className={PANEL} aria-labelledby="titulo-datos-personales">
              <h2 id="titulo-datos-personales" className={`${TITULO_PANEL} mb-4`} style={{ color: TINTA }}>
                Tratamiento de datos personales
              </h2>
              <label htmlFor="m-consentimiento" className="flex cursor-pointer gap-3">
                <input
                  id="m-consentimiento"
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 cursor-pointer rounded accent-[#101A3C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D8B858]"
                  aria-invalid={Boolean(errors.aceptaTratamientoDatos)}
                  {...reg('aceptaTratamientoDatos')}
                />
                <span className="text-[15px]" style={{ color: TINTA }}>
                  {TEXTO_CONSENTIMIENTO}
                </span>
              </label>
              {errors.aceptaTratamientoDatos && (
                <p className="mt-2 text-[13px] font-medium" style={{ color: ERROR }}>
                  {errors.aceptaTratamientoDatos.message}
                </p>
              )}
            </section>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="submit"
                disabled={guardar.isPending}
                className={`${BTN_ORO} disabled:cursor-wait disabled:opacity-70`}
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                {guardar.isPending ? 'Enviando…' : 'Enviar postulación'}
                {!guardar.isPending && <ArrowRight className="size-4" aria-hidden />}
              </button>
              <p className="flex items-center gap-1.5 text-[13px]">
                <ShieldCheck className="size-4 shrink-0" style={{ color: TINTA }} aria-hidden />
                Tus documentos solo los revisa el coordinador académico.
              </p>
            </div>
          </div>

          <Resumen pasos={pasos} />
        </form>
      </main>
    </Pagina>
  )
}

function Enviada({ codigo, convocatoria }: { codigo: string; convocatoria?: string }) {
  return (
    <Pagina>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(16,26,60,0.08)]">
          <div className="px-6 py-10 text-center text-white sm:px-10" style={{ backgroundColor: NAVY }}>
            <span className="mx-auto grid size-14 place-items-center rounded-full" style={{ backgroundColor: GOLD, color: NAVY }}>
              <Check className="size-7" aria-hidden />
            </span>
            <h1 className="font-display mt-5 text-4xl font-bold uppercase">Postulación enviada</h1>
            <p className="mx-auto mt-3 max-w-md text-[#D6DBEA]">
              {convocatoria ? `${convocatoria}: ` : ''}tu postulación quedó{' '}
              <strong className="text-white">en revisión documental</strong>. Guarda tu código: con él y tu número de
              documento consultas el avance, subsanas lo que te observen y, si eres admitido, activas tu cuenta.
            </p>
          </div>
          <div className="grid justify-items-center gap-6 px-6 py-10 sm:px-10">
            <p
              className="rounded-xl border-2 border-dashed px-8 py-4 font-mono text-3xl font-semibold tracking-[0.3em]"
              style={{ borderColor: GOLD, color: NAVY }}
              aria-label="Código de postulación"
            >
              {codigo}
            </p>
            <div className="grid w-full max-w-md gap-3">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide" style={{ color: NAVY }}>
                Lo que sigue
              </h2>
            <ol className="grid gap-2 text-[15px]">
              {PASOS.slice(1).map((paso, indice) => (
                <li key={paso.titulo} className="flex gap-3">
                  <span className="font-display font-bold" style={{ color: NAVY }}>
                    {indice + 2}.
                  </span>
                  <span>
                    <strong style={{ color: NAVY }}>{paso.titulo}.</strong> {paso.texto}
                  </span>
                </li>
              ))}
            </ol>
            </div>
            <Link to="/postulacion" className={BTN_ORO} style={{ backgroundColor: GOLD, color: NAVY }}>
              Consultar mi postulación
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </main>
    </Pagina>
  )
}

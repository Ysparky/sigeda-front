import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleAlert,
  CircleX,
  FileText,
  KeyRound,
  Mail,
  Paperclip,
  Phone,
  Search,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
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
import {
  AVISO,
  BTN_ORO,
  CONTROL,
  ERROR,
  EXITO,
  FOCO,
  FOTO_COCKPIT,
  GOLD,
  LINEA,
  NAVY,
  PANEL,
  PASOS,
  TINTA,
  TITULO_PANEL,
} from './marca'
import { PaginaPublica } from './pagina-publica'
import { errorDeArchivo } from './schemas'

const ETIQUETA_ESTADO: Record<EstadoMatricula, string> = {
  PENDIENTE: 'En revisión documental',
  OBSERVADA: 'Observada: subsana lo indicado',
  VALIDADA: 'Documentos validados',
  CITADA: 'Citado a la evaluación de admisión',
  ADMITIDA: 'Admitido',
  NO_ADMITIDO: 'No admitido',
  RECHAZADA: 'Rechazada',
}

const EXPLICACION: Record<EstadoMatricula, string> = {
  PENDIENTE: 'El coordinador académico está revisando tus documentos. Te avisaremos aquí si hace falta corregir algo.',
  OBSERVADA: 'Hay algo por corregir. Revisa la observación y reemplaza el documento indicado; la revisión continúa sola.',
  VALIDADA: 'Tus documentos están en regla. El siguiente paso es la citación a la evaluación de admisión.',
  CITADA: 'Preséntate en la fecha y el lugar indicados. Lleva tu documento de identidad.',
  ADMITIDA: 'Aprobaste la evaluación de admisión. Coordina el pago de tu matrícula y activa tu cuenta para entrar a SIGEDA.',
  NO_ADMITIDO: 'No alcanzaste los requisitos de la evaluación de admisión esta vez. Podrás postular en la próxima convocatoria.',
  RECHAZADA: 'Tu postulación fue cerrada en la revisión documental. Podrás postular en la próxima convocatoria.',
}

/** El paso del proceso de admisión (PASOS) en que está cada estado; null si la postulación quedó cerrada. */
const PASO_ACTUAL: Record<EstadoMatricula, number | null> = {
  PENDIENTE: 1,
  OBSERVADA: 1,
  VALIDADA: 2,
  CITADA: 2,
  ADMITIDA: 3,
  NO_ADMITIDO: null,
  RECHAZADA: null,
}

const ETIQUETA_DOCUMENTO: Record<DocumentoVista['estado'], string> = {
  FALTANTE: 'Sin cargar',
  PENDIENTE: 'En revisión',
  OBSERVADO: 'Observado',
  ACEPTADO: 'Aceptado',
}

const COLOR_DOCUMENTO: Record<DocumentoVista['estado'], { fondo: string; tinta: string }> = {
  FALTANTE: { fondo: '#EEF0F5', tinta: '#4A5068' },
  PENDIENTE: { fondo: '#EAF0FB', tinta: '#2540A1' },
  OBSERVADO: { fondo: '#FDF1DC', tinta: AVISO },
  ACEPTADO: { fondo: '#E6F4EC', tinta: EXITO },
}

const RECIBE_DOCUMENTOS: EstadoMatricula[] = ['PENDIENTE', 'OBSERVADA', 'VALIDADA', 'CITADA']

function mensajeDe(error: unknown) {
  return error instanceof ApiError ? error.message : MENSAJE_GENERICO
}

function campo(formulario: HTMLFormElement, nombre: string): string {
  const elemento = formulario.elements.namedItem(nombre) as HTMLInputElement | null
  return elemento?.value ?? ''
}

function Aviso({ tono, icono, titulo, children }: { tono: string; icono: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border bg-white p-4" style={{ borderColor: tono }}>
      <span className="mt-0.5 shrink-0" style={{ color: tono }} aria-hidden>
        {icono}
      </span>
      <div>
        <p className="font-semibold" style={{ color: tono }}>
          {titulo}
        </p>
        <div className="text-[15px]">{children}</div>
      </div>
    </div>
  )
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
    <PaginaPublica>
      <section
        className="text-white"
        style={{
          backgroundImage: `linear-gradient(120deg, rgba(10,18,48,0.96) 0%, rgba(16,34,78,0.9) 55%, rgba(24,42,99,0.82) 100%), url('${FOTO_COCKPIT}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto max-w-[1170px] px-4 pb-24 pt-10 sm:px-6">
          <h1 className="font-display text-4xl font-bold uppercase leading-[1.05] sm:text-5xl">Mi postulación</h1>
          <p className="mt-3 max-w-[60ch] text-lg text-[#D6DBEA]">
            Ingresa tu número de documento y el código que recibiste al postular. ¿Aún no postulas?{' '}
            <Link to="/" hash="cursos" className={`rounded font-semibold text-white underline underline-offset-4 ${FOCO}`}>
              Ver convocatorias
            </Link>
            .
          </p>
        </div>
      </section>

      <main className="mx-auto -mt-16 w-full max-w-[1170px] flex-1 px-4 pb-16 sm:px-6">
        <div className={PANEL}>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <label htmlFor="c-numero" className="text-sm font-semibold" style={{ color: TINTA }}>
                Número de documento
              </label>
              <input
                id="c-numero"
                name="numeroDocumento"
                required
                autoComplete="off"
                className={CONTROL}
                style={{ borderColor: LINEA, color: TINTA }}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="c-codigo" className="text-sm font-semibold" style={{ color: TINTA }}>
                Código de postulación
              </label>
              <input
                id="c-codigo"
                name="codigo"
                required
                autoComplete="off"
                spellCheck={false}
                className={`${CONTROL} font-mono uppercase tracking-[0.2em]`}
                style={{ borderColor: LINEA, color: TINTA }}
              />
            </div>
            <button
              type="submit"
              disabled={consultar.isPending}
              className={`${BTN_ORO} h-11 py-0 disabled:cursor-wait disabled:opacity-70`}
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              <Search className="size-4" aria-hidden />
              {consultar.isPending ? 'Consultando…' : 'Consultar'}
            </button>
          </form>
          {consultar.error && (
            <p role="alert" className="mt-4 flex items-center gap-2 text-[15px] font-medium" style={{ color: ERROR }}>
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              {mensajeDe(consultar.error)}
            </p>
          )}
        </div>

        {postulacion && credencial ? (
          <Detalle postulacion={postulacion} credencial={credencial} alCambiar={recargar} />
        ) : (
          <Ayuda />
        )}
      </main>
    </PaginaPublica>
  )
}

function Ayuda() {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <div>
        <h2 className={TITULO_PANEL} style={{ color: TINTA }}>
          ¿Qué puedes hacer aquí?
        </h2>
        <ul className="mt-3 grid gap-2 text-[15px]">
          <li>Ver en qué paso de la admisión está tu postulación.</li>
          <li>Reemplazar un documento observado o subir el certificado médico.</li>
          <li>Ver la fecha, hora y lugar de tu evaluación de admisión.</li>
          <li>Activar tu cuenta si fuiste admitido.</li>
        </ul>
      </div>
      <Contacto />
    </div>
  )
}

function Contacto() {
  return (
    <div>
      <h2 className={TITULO_PANEL} style={{ color: TINTA }}>
        ¿Perdiste tu código?
      </h2>
      <p className="mt-3 text-[15px]">Escríbenos con tu número de documento y te ayudamos a recuperarlo.</p>
      <ul className="mt-3 grid gap-2 text-[15px]" style={{ color: TINTA }}>
        <li className="flex items-center gap-2">
          <Mail className="size-4 shrink-0" aria-hidden />
          <a href="mailto:info@asa.edu.pe" className={`rounded underline underline-offset-4 ${FOCO}`}>
            info@asa.edu.pe
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Phone className="size-4 shrink-0" aria-hidden />
          <a href="tel:+51949247364" className={`rounded underline underline-offset-4 ${FOCO}`}>
            +51 949 247 364
          </a>
        </li>
      </ul>
    </div>
  )
}

function Progreso({ estado }: { estado: EstadoMatricula }) {
  const actual = PASO_ACTUAL[estado]
  return (
    <ol aria-label="Avance de la admisión" className="grid gap-2 sm:grid-cols-5">
      {PASOS.map((paso, indice) => {
        const hecho = actual !== null && indice < actual
        const esActual = actual === indice
        return (
          <li
            key={paso.titulo}
            aria-current={esActual ? 'step' : undefined}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
            style={{ backgroundColor: esActual ? '#FBF4E1' : hecho ? '#F1F7F3' : '#F3F4F8' }}
          >
            <span
              className="font-display grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold"
              style={
                esActual
                  ? { backgroundColor: GOLD, color: NAVY }
                  : hecho
                    ? { backgroundColor: EXITO, color: '#fff' }
                    : { border: `1px solid ${LINEA}`, color: '#6B7185' }
              }
            >
              {hecho ? <Check className="size-4" aria-label="Completado" /> : indice + 1}
            </span>
            <span className={`text-[13px] leading-tight ${esActual ? 'font-semibold' : ''}`} style={{ color: esActual || hecho ? TINTA : '#5B6072' }}>
              {paso.titulo}
            </span>
          </li>
        )
      })}
    </ol>
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
  const cerrada = PASO_ACTUAL[postulacion.estado] === null
  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-6">
        <section className={PANEL} aria-labelledby="titulo-estado">
          <p className="text-[15px]">
            {postulacion.nombres} {postulacion.aPaterno}
            {postulacion.convocatoria ? ` · ${postulacion.convocatoria}` : ''}
          </p>
          <h2 id="titulo-estado" className="font-display mt-1 text-3xl font-bold uppercase" style={{ color: cerrada ? ERROR : TINTA }}>
            <span data-testid="estado-postulacion">{ETIQUETA_ESTADO[postulacion.estado]}</span>
          </h2>
          <p className="mt-2 max-w-[62ch] text-[15px]">{EXPLICACION[postulacion.estado]}</p>
          {!cerrada && (
            <div className="mt-6">
              <Progreso estado={postulacion.estado} />
            </div>
          )}
          <div className="mt-6 grid gap-3 empty:hidden">
            {postulacion.observaciones && postulacion.estado === 'OBSERVADA' && (
              <Aviso tono={AVISO} icono={<CircleAlert className="size-5" />} titulo="Observación del coordinador">
                {postulacion.observaciones}
              </Aviso>
            )}
            {postulacion.motivoRechazo && postulacion.estado === 'RECHAZADA' && (
              <Aviso tono={ERROR} icono={<CircleX className="size-5" />} titulo="Motivo del rechazo">
                {postulacion.motivoRechazo}
              </Aviso>
            )}
            {postulacion.citacion && postulacion.estado === 'CITADA' && (
              <Aviso tono={TINTA} icono={<CalendarClock className="size-5" />} titulo="Evaluación de admisión">
                <p>
                  <strong style={{ color: TINTA }}>
                    {formatearFecha(postulacion.citacion.fecha)} a las {postulacion.citacion.hora} · {postulacion.citacion.lugar}
                  </strong>
                </p>
                <p className="mt-1">
                  Incluye examen de conocimientos, entrevista personal y evaluación psicológica. El certificado médico
                  aeronáutico debe estar cargado y aceptado.
                </p>
              </Aviso>
            )}
          </div>
        </section>

        <section className={PANEL} aria-labelledby="titulo-documentos">
          <h2 id="titulo-documentos" className={`${TITULO_PANEL} mb-1.5`} style={{ color: TINTA }}>
            Documentos
          </h2>
          <p className="mb-2 max-w-[62ch] text-[15px]">
            {recibe ? 'Reemplaza un documento observado o sube los que te falten.' : 'La revisión de documentos terminó.'}
          </p>
          <ul aria-label="Documentos de la postulación" className="divide-y" style={{ borderColor: LINEA }}>
            {postulacion.documentos.map((documento) => (
              <FilaDocumento
                key={documento.tipo}
                documento={documento}
                credencial={credencial}
                puedeSubir={recibe && documento.estado !== 'ACEPTADO'}
                alSubir={alCambiar}
              />
            ))}
          </ul>
        </section>

        {postulacion.evaluacion && (
          <section className={PANEL} aria-labelledby="titulo-resultado">
            <h2 id="titulo-resultado" className={TITULO_PANEL} style={{ color: TINTA }}>
              Resultado de admisión
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-4">
              <Dato termino="Resultado">{postulacion.evaluacion.resultado === 'ADMITIDO' ? 'Admitido' : 'No admitido'}</Dato>
              <Dato termino="Examen">{postulacion.evaluacion.notaConocimientos ?? '—'} / 20</Dato>
              <Dato termino="Entrevista">{postulacion.evaluacion.entrevista === 'APTO' ? 'Apto' : 'No apto'}</Dato>
              <Dato termino="Evaluación psicológica">
                {postulacion.evaluacion.evaluacionPsicologica === 'APTO' ? 'Apto' : 'No apto'}
              </Dato>
            </dl>
          </section>
        )}

        {postulacion.estado === 'ADMITIDA' &&
          (postulacion.cuentaActiva ? (
            <section className={PANEL}>
              <Aviso tono={EXITO} icono={<Check className="size-5" />} titulo="Tu cuenta está activa">
                <Link to="/login" search={{}} className={`rounded font-semibold underline underline-offset-4 ${FOCO}`} style={{ color: TINTA }}>
                  Inicia sesión
                </Link>{' '}
                con tu correo.
              </Aviso>
            </section>
          ) : (
            <ActivarCuenta credencial={credencial} alActivar={alCambiar} />
          ))}
      </div>

      <aside className="grid gap-6 lg:sticky lg:top-6">
        <div className={PANEL}>
          <h2 className={TITULO_PANEL} style={{ color: TINTA }}>
            Tu postulación
          </h2>
          <dl className="mt-4 grid gap-3 text-[15px]">
            <Dato termino="Postulante">
              {postulacion.nombres} {postulacion.aPaterno}
            </Dato>
            <Dato termino="Convocatoria">{postulacion.convocatoria ?? '—'}</Dato>
            <Dato termino="Fecha de postulación">{formatearFecha(postulacion.fecha)}</Dato>
            <Dato termino="Código">
              <span className="font-mono tracking-[0.2em]">{credencial.codigo}</span>
            </Dato>
          </dl>
        </div>
        <div className="px-2">
          <Contacto />
        </div>
      </aside>
    </div>
  )
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[13px]">{termino}</dt>
      <dd className="font-semibold" style={{ color: TINTA }}>
        {children}
      </dd>
    </div>
  )
}

function FilaDocumento({
  documento,
  credencial,
  puedeSubir,
  alSubir,
}: {
  documento: DocumentoVista
  credencial: Credencial
  puedeSubir: boolean
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
  const color = COLOR_DOCUMENTO[documento.estado]
  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
      <span className="grid size-10 place-items-center rounded-full" style={{ backgroundColor: color.fondo, color: color.tinta }} aria-hidden>
        {documento.estado === 'ACEPTADO' ? <Check className="size-5" /> : <FileText className="size-5" />}
      </span>
      <div className="min-w-0">
        <p className="font-semibold" style={{ color: TINTA }}>
          {documento.nombre}
          {!documento.obligatorio && <span className="font-normal"> (opcional)</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px]">
          <span className="rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: color.fondo, color: color.tinta }}>
            {ETIQUETA_DOCUMENTO[documento.estado]}
          </span>
          {documento.momento === 'ANTES_DEL_RESULTADO' && documento.estado === 'FALTANTE' && (
            <span>Obligatorio antes del resultado</span>
          )}
        </p>
        {documento.observacion && documento.estado === 'OBSERVADO' && (
          <p className="mt-1 text-[13px] font-medium" style={{ color: AVISO }}>
            {documento.observacion}
          </p>
        )}
        {error && (
          <p className="mt-1 text-[13px] font-medium" style={{ color: ERROR }}>
            {error}
          </p>
        )}
      </div>
      {puedeSubir && (
        <>
          <input
            id={id}
            type="file"
            className="peer sr-only"
            accept={documento.soloImagen ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
            onChange={(evento) => {
              const archivo = evento.target.files?.[0]
              if (!archivo) return
              const problema = errorDeArchivo(archivo, documento.soloImagen)
              setError(problema)
              if (!problema) subir.mutate(archivo)
            }}
          />
          <label
            htmlFor={id}
            className="font-display col-start-2 inline-flex cursor-pointer items-center gap-2 justify-self-start rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition hover:bg-[#101A3C]/5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#D8B858] peer-focus-visible:ring-offset-2 sm:col-start-auto sm:justify-self-end"
            style={{ borderColor: LINEA, color: TINTA }}
          >
            <Paperclip className="size-3.5" aria-hidden />
            {subir.isPending ? 'Subiendo…' : documento.estado === 'FALTANTE' ? 'Cargar' : 'Reemplazar'}
            <span className="sr-only"> {documento.nombre}</span>
          </label>
        </>
      )}
    </li>
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
    <section className={PANEL} aria-labelledby="titulo-activar">
      <h2 id="titulo-activar" className={`${TITULO_PANEL} flex items-center gap-2`} style={{ color: TINTA }}>
        <KeyRound className="size-5" aria-hidden />
        Activa tu cuenta
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[15px]">Tu usuario será tu correo. Elige una contraseña de al menos 8 caracteres.</p>
      <form onSubmit={enviar} className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="a-password" className="text-sm font-semibold" style={{ color: TINTA }}>
              Contraseña nueva
            </label>
            <input
              id="a-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              className={CONTROL}
              style={{ borderColor: error ? ERROR : LINEA, color: TINTA }}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="a-confirmacion" className="text-sm font-semibold" style={{ color: TINTA }}>
              Repite la contraseña
            </label>
            <input
              id="a-confirmacion"
              type="password"
              autoComplete="new-password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              aria-invalid={Boolean(error)}
              className={CONTROL}
              style={{ borderColor: error ? ERROR : LINEA, color: TINTA }}
            />
          </div>
        </div>
        {error && (
          <p className="text-[13px] font-medium" style={{ color: ERROR }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={activar.isPending}
          className={`${BTN_ORO} w-fit disabled:cursor-wait disabled:opacity-70`}
          style={{ backgroundColor: GOLD, color: NAVY }}
        >
          {activar.isPending ? 'Activando…' : 'Activar cuenta'}
          {!activar.isPending && <ArrowRight className="size-4" aria-hidden />}
        </button>
      </form>
    </section>
  )
}

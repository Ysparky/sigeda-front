import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronRight,
  Layers,
  Mail,
  MapPin,
  Menu,
  Phone,
  Play,
  Plane,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Skeleton } from '@/components/ui/skeleton'
import { catalogoQuery, type CursoCatalogo } from './api'

// Paleta del template Pilotin (muestreada del Figma), con el contenido y el logo de ASA.
const NAVY = '#101A3C'
const BLUE = '#2540A1'
const GOLD = '#D8B858'
const BODY = '#5B6072'
const MUTED = '#A6ACBE'
const SURFACE = '#F8F8F8'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8B858] focus-visible:ring-offset-2'
const BTN_ORO = `font-display inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition hover:brightness-95 ${FOCO}`
const BTN_LINEA = `font-display inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition hover:bg-white/10 ${FOCO}`

const NAV = [
  { href: '#inicio', texto: 'Inicio' },
  { href: '#programa', texto: 'Programa' },
  { href: '#cursos', texto: 'Cursos' },
  { href: '#admision', texto: 'Admisión' },
  { href: '#contacto', texto: 'Contacto' },
]

const SECCIONES = NAV.map((n) => n.href.slice(1))

/**
 * Marca la sección visible para el indicador del menú (navegación de una sola página).
 * Usa una línea de disparo cerca del borde superior y, al final de la página, fija la última
 * sección: con un centro de viewport las secciones del fondo (Admisión, Contacto) nunca se
 * activaban porque no hay scroll suficiente para llevarlas al centro.
 */
function useSeccionActiva() {
  const [activo, setActivo] = useState(SECCIONES[0])
  useEffect(() => {
    const calcular = () => {
      const linea = window.scrollY + window.innerHeight * 0.3
      let actual = SECCIONES[0]
      for (const id of SECCIONES) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top + window.scrollY <= linea) actual = id
      }
      const alturaDoc = document.documentElement.scrollHeight
      if (alturaDoc > window.innerHeight && window.scrollY + window.innerHeight >= alturaDoc - 2)
        actual = SECCIONES[SECCIONES.length - 1]
      setActivo(actual)
    }
    calcular()
    window.addEventListener('scroll', calcular, { passive: true })
    window.addEventListener('resize', calcular)
    return () => {
      window.removeEventListener('scroll', calcular)
      window.removeEventListener('resize', calcular)
    }
  }, [])
  return activo
}

const VALORES = [
  { icono: Layers, titulo: 'Formación por fases', texto: 'Cinco fases, de la adaptación al vuelo por instrumentos.' },
  { icono: Users, titulo: 'Instructores certificados', texto: 'Acompañamiento cercano en cada misión y chequeo.' },
  { icono: ShieldCheck, titulo: 'Bajo norma RAP 141', texto: 'Programa PDI EA-510 reconocido por la autoridad.' },
]

const PASOS = [
  { titulo: 'Elige tu curso', texto: 'Revisa el programa, la duración y los requisitos de ingreso.' },
  { titulo: 'Completa tu matrícula', texto: 'Llena tus datos y adjunta el comprobante. Se crea tu cuenta al instante.' },
  { titulo: 'Validación y despegue', texto: 'El coordinador valida tu comprobante y pasas a ser alumno.' },
]

function Eyebrow({ children, centrado = false }: { children: ReactNode; centrado?: boolean }) {
  return (
    <span
      className="font-display inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em]"
      style={{ color: GOLD }}
    >
      <span className="h-px w-6" style={{ backgroundColor: GOLD }} />
      {children}
      {centrado && <span className="h-px w-6" style={{ backgroundColor: GOLD }} />}
    </span>
  )
}

/** Hueco de imagen. En el template original estos espacios son marcadores grises; aquí van fotos de ASA. */
function Foto({ ratio, className = '', etiqueta = 'Foto' }: { ratio: number; className?: string; etiqueta?: string }) {
  return (
    <div
      className={`grid place-items-center overflow-hidden rounded-xl bg-slate-200 text-slate-400 ${className}`}
      style={{ aspectRatio: String(ratio) }}
      role="img"
      aria-label={`Espacio para imagen (${etiqueta})`}
    >
      <Plane className="size-10 opacity-60" aria-hidden />
    </div>
  )
}

export function LandingPage() {
  const { data: cursos, isPending, isError, error, refetch } = useQuery(catalogoQuery())
  const activo = useSeccionActiva()
  return (
    <div className="font-body flex min-h-dvh flex-col bg-white" style={{ color: BODY }}>
      <Nav activo={activo} />
      <Hero />
      <main className="flex-1">
        <SeccionCompromiso />
        <SeccionImagenTexto
          id="programa"
          eyebrow="El programa"
          titulo="Formación por fases"
          cuerpo="El programa PDI EA-510 se recorre en cinco fases, de la adaptación hasta el vuelo por instrumentos. Cada maniobra se evalúa con estándares medibles para que avances con criterios claros."
          imagenDerecha
          ratio={1.25}
        />
        <SeccionImagenTexto
          eyebrow="Acompañamiento"
          titulo="Seguimiento académico de principio a fin"
          cuerpo="Llevamos el registro de tus índices, evaluaciones y ciclo de chequeo. Sabes en todo momento en qué fase estás y qué te falta para tu licencia."
          ratio={1.18}
        />
        <SeccionMetodo />
        <SeccionCursos cursos={cursos} isPending={isPending} isError={isError} error={error} alReintentar={refetch} />
        <LlamadaFinal />
        <SeccionPasos />
      </main>
      <PieDePagina />
    </div>
  )
}

function Nav({ activo }: { activo: string }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10 backdrop-blur"
      style={{ backgroundColor: 'rgba(16,26,60,0.92)' }}
    >
      <div className="mx-auto flex h-20 max-w-[1170px] items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Aeroclub Sudamericano de los Andes — inicio" className={`flex items-center rounded ${FOCO}`}>
          <span className="inline-flex rounded-md bg-white px-2.5 py-1.5">
            <img src="/asa-logo.png" alt="Aeroclub Sudamericano de los Andes" className="h-9 w-auto" />
          </span>
        </Link>
        <nav aria-label="Secciones" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => {
            const esActivo = activo === item.href.slice(1)
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={esActivo ? 'true' : undefined}
                className={`font-display rounded text-sm font-bold uppercase tracking-wide text-white/90 hover:text-white ${FOCO}`}
                style={esActivo ? { color: '#fff', borderBottom: `2px solid ${GOLD}`, paddingBottom: 2 } : undefined}
              >
                {item.texto}
              </a>
            )
          })}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 lg:flex">
            <Link
              to="/login"
              search={{}}
              className={`font-display rounded text-sm font-bold uppercase tracking-wide text-white/90 hover:text-white ${FOCO}`}
            >
              Iniciar sesión
            </Link>
            <a href="#cursos" className={BTN_ORO} style={{ backgroundColor: GOLD, color: NAVY }}>
              Inscríbete
            </a>
          </div>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-movil"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            className={`grid size-10 place-items-center rounded-md text-white lg:hidden ${FOCO}`}
          >
            {abierto ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </div>

      {abierto && (
        <nav id="menu-movil" aria-label="Secciones" className="border-t border-white/10 px-4 pb-5 pt-2 lg:hidden">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setAbierto(false)}
              aria-current={activo === item.href.slice(1) ? 'true' : undefined}
              className={`font-display block rounded px-2 py-3 text-sm font-bold uppercase tracking-wide ${FOCO}`}
              style={{ color: activo === item.href.slice(1) ? GOLD : '#ffffffcc' }}
            >
              {item.texto}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-3 border-t border-white/10 pt-4">
            <Link
              to="/login"
              search={{}}
              onClick={() => setAbierto(false)}
              className={`font-display rounded px-2 text-sm font-bold uppercase tracking-wide text-white/80 ${FOCO}`}
            >
              Iniciar sesión
            </Link>
            <a
              href="#cursos"
              onClick={() => setAbierto(false)}
              className={BTN_ORO}
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              Inscríbete
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden text-white"
      style={{ background: `linear-gradient(135deg, #0a1230 0%, ${NAVY} 55%, #182a63 100%)` }}
    >
      <div aria-hidden className="pointer-events-none absolute -right-40 top-10 size-[46rem] rounded-full border" style={{ borderColor: `${GOLD}1f` }} />
      <div aria-hidden className="pointer-events-none absolute -right-20 top-28 size-[30rem] rounded-full border" style={{ borderColor: `${GOLD}26` }} />
      <div className="relative mx-auto flex min-h-[32rem] max-w-[1170px] flex-col justify-center px-4 py-20 sm:px-6 lg:min-h-[36rem]">
        <Eyebrow>Bienvenido</Eyebrow>
        <h1 className="font-display mt-5 max-w-3xl text-balance text-5xl font-bold uppercase leading-[0.95] sm:text-6xl lg:text-7xl">
          Conviértete en piloto de helicóptero
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: '#d6dbEa' }}>
          El Aeroclub Sudamericano de los Andes forma pilotos bajo el programa PDI EA-510: instrucción estructurada,
          instructores certificados y seguimiento académico de principio a fin.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <a href="#cursos" className={BTN_ORO} style={{ backgroundColor: GOLD, color: NAVY }}>
            Inscríbete ahora
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <a href="#programa" className={BTN_LINEA} style={{ borderColor: GOLD, color: GOLD }}>
            Conoce el programa
          </a>
        </div>
      </div>
      {/* Franja blanca diagonal, como en el template, para pasar a la sección clara. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-white" style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }} />
    </section>
  )
}

function SeccionCompromiso() {
  return (
    <section className="mx-auto max-w-[1170px] px-4 py-20 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative">
          <Foto ratio={1.95} etiqueta="Instrucción en vuelo" />
          <div className="absolute -bottom-10 -right-6 hidden w-2/5 sm:block">
            <Foto ratio={1.42} className="ring-8 ring-white" etiqueta="Flota" />
          </div>
        </div>
        <div className="lg:pl-6">
          <Eyebrow>Nuestra escuela</Eyebrow>
          <h2 className="font-display mt-3 text-4xl font-bold uppercase leading-tight sm:text-5xl" style={{ color: NAVY }}>
            Comprometidos con tu formación
          </h2>
          <p className="mt-5 text-lg" style={{ color: BODY }}>
            Somos una escuela aeronáutica dedicada a formar pilotos de helicóptero con disciplina, seguridad y método.
          </p>
          <p className="mt-4" style={{ color: BODY }}>
            Cada etapa de tu instrucción está medida y acompañada. Al enviar tu matrícula creas tu cuenta y sigues su
            estado hasta que el coordinador académico la valide.
          </p>
          <a href="#cursos" className={`${BTN_ORO} mt-7`} style={{ backgroundColor: GOLD, color: NAVY }}>
            Inscríbete ahora
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}

function SeccionImagenTexto({
  id,
  eyebrow,
  titulo,
  cuerpo,
  imagenDerecha = false,
  ratio,
}: {
  id?: string
  eyebrow: string
  titulo: string
  cuerpo: string
  imagenDerecha?: boolean
  ratio: number
}) {
  const foto = <Foto ratio={ratio} className="h-full min-h-[18rem]" />
  const texto = (
    <div className={imagenDerecha ? 'lg:pr-10' : 'lg:pl-10'}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-display mt-3 text-4xl font-bold uppercase leading-tight sm:text-5xl" style={{ color: NAVY }}>
        {titulo}
      </h2>
      <p className="mt-5 text-lg" style={{ color: BODY }}>
        {cuerpo}
      </p>
      <a href="#cursos" className={`${BTN_ORO} mt-7`} style={{ backgroundColor: GOLD, color: NAVY }}>
        Inscríbete ahora
        <ArrowRight className="size-4" aria-hidden />
      </a>
    </div>
  )
  return (
    <section id={id} className="scroll-mt-24" style={{ backgroundColor: SURFACE }}>
      <div className="mx-auto grid max-w-[1170px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        {imagenDerecha ? (
          <>
            {texto}
            {foto}
          </>
        ) : (
          <>
            {foto}
            {texto}
          </>
        )}
      </div>
    </section>
  )
}

function SeccionMetodo() {
  return (
    <section className="mx-auto max-w-[1170px] px-4 py-20 sm:px-6">
      <div className="grid items-stretch gap-10 lg:grid-cols-2">
        <div className="rounded-2xl p-8 text-white sm:p-10" style={{ backgroundColor: BLUE }}>
          <Eyebrow>Por qué ASA</Eyebrow>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase leading-tight">Una escuela, un método</h2>
          <ul className="mt-8 grid gap-6">
            {VALORES.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: GOLD, color: NAVY }}>
                  <Icono className="size-6" aria-hidden />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold uppercase">{titulo}</h3>
                  <p className="mt-1 text-sm" style={{ color: '#c7cdde' }}>
                    {texto}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <Foto ratio={1.1} className="h-full min-h-[20rem]" etiqueta="Video de la escuela" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto grid size-20 place-items-center rounded-full shadow-lg"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            <Play className="size-7 translate-x-0.5 fill-current" />
          </span>
        </div>
      </div>
    </section>
  )
}

type EstadoCursos = {
  cursos: CursoCatalogo[] | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  alReintentar: () => void
}

function SeccionCursos({ cursos, isPending, isError, error, alReintentar }: EstadoCursos) {
  return (
    <section id="cursos" className="relative scroll-mt-24 overflow-hidden" style={{ backgroundColor: NAVY }}>
      <div className="mx-auto max-w-[1170px] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <Eyebrow centrado>Programas</Eyebrow>
          </div>
          <h2 className="font-display mt-3 text-4xl font-bold uppercase text-white sm:text-5xl">Nuestros cursos y programas</h2>
          <p className="mt-4" style={{ color: MUTED }}>
            Elige tu curso e inscríbete en línea en minutos.
          </p>
        </div>
        <div className="mt-14">
          {isError ? (
            <AvisoDeError titulo="No pudimos cargar el catálogo" error={error} alReintentar={alReintentar} />
          ) : isPending ? (
            <div className="mx-auto max-w-sm">
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          ) : (
            <div className={(cursos?.length ?? 0) <= 1 ? 'mx-auto max-w-md' : 'grid gap-8 md:grid-cols-2 lg:grid-cols-3'}>
              {(cursos ?? []).map((curso) => (
                <TarjetaCurso key={curso.id} curso={curso} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function TarjetaCurso({ curso }: { curso: CursoCatalogo }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_10px_50px_rgba(149,155,177,0.15)]">
      <Foto ratio={1.48} className="rounded-none" etiqueta="Curso" />
      <div className="flex flex-1 flex-col gap-4 p-7">
        <span className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: '#b6831a' }}>
          Programa PDI EA-510
        </span>
        <h3 className="font-display text-2xl font-bold uppercase leading-tight" style={{ color: NAVY }}>
          {curso.nombre}
        </h3>
        <p className="text-sm" style={{ color: BODY }}>
          {curso.descripcion}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: BODY }}>
          <span>
            <strong style={{ color: NAVY }}>{curso.duracion} horas</strong> de instrucción
          </span>
          <span>
            <strong style={{ color: NAVY }}>5 fases</strong> de formación
          </span>
        </div>
        <p className="text-xs" style={{ color: MUTED }}>
          Requisitos: {curso.requisitos}
        </p>
        <Link
          to="/matricula"
          search={{ curso: curso.id }}
          className={`${BTN_ORO} mt-auto w-full`}
          style={{ backgroundColor: GOLD, color: NAVY }}
        >
          Inscribirme
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

function LlamadaFinal() {
  return (
    <section
      id="admision"
      className="relative scroll-mt-24 overflow-hidden text-white"
      style={{ background: `linear-gradient(135deg, #0a1230 0%, ${NAVY} 60%, #182a63 100%)` }}
    >
      <div className="mx-auto grid max-w-[1170px] items-center gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <Eyebrow>Admisión</Eyebrow>
          <h2 className="font-display mt-3 text-4xl font-bold uppercase leading-tight sm:text-5xl">
            ¿Listo para el siguiente paso? Inscríbete hoy
          </h2>
        </div>
        <div className="lg:pl-6">
          <p className="text-lg" style={{ color: '#d6dbea' }}>
            La admisión está abierta. Completa tu matrícula hoy, sube tu comprobante y empieza tu camino como piloto de
            helicóptero.
          </p>
          <a href="#cursos" className={`${BTN_ORO} mt-7`} style={{ backgroundColor: GOLD, color: NAVY }}>
            Inscríbete ahora
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}

function SeccionPasos() {
  return (
    <section style={{ backgroundColor: SURFACE }}>
      <div className="mx-auto max-w-[1170px] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <Eyebrow centrado>Cómo inscribirte</Eyebrow>
          </div>
          <h2 className="font-display mt-3 text-4xl font-bold uppercase sm:text-5xl" style={{ color: NAVY }}>
            Tres pasos para despegar
          </h2>
        </div>
        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="rounded-2xl bg-white p-8 shadow-[0_10px_50px_rgba(149,155,177,0.12)]">
              <span className="font-display grid size-12 place-items-center rounded-full text-xl font-bold" style={{ backgroundColor: GOLD, color: NAVY }}>
                {i + 1}
              </span>
              <h3 className="font-display mt-5 text-lg font-bold uppercase" style={{ color: NAVY }}>
                {paso.titulo}
              </h3>
              <p className="mt-2 text-sm" style={{ color: BODY }}>
                {paso.texto}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function PieDePagina() {
  return (
    <footer id="contacto" className="scroll-mt-24 text-white" style={{ backgroundColor: NAVY }}>
      <div className="mx-auto grid max-w-[1170px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <span className="inline-flex rounded-lg bg-white p-2">
            <img src="/asa-logo.png" alt="Aeroclub Sudamericano de los Andes" className="h-12 w-auto" />
          </span>
          <p className="mt-4 text-sm" style={{ color: MUTED }}>
            Escuela de aviación RAP 141 · Programa PDI EA-510. Formación de pilotos de helicóptero.
          </p>
        </div>
        <div>
          <h3 className="font-display mb-4 text-lg font-bold uppercase" style={{ color: GOLD }}>
            Contacto
          </h3>
          <ul className="grid gap-2 text-sm" style={{ color: MUTED }}>
            <li className="flex items-center gap-2">
              <MapPin className="size-4" style={{ color: GOLD }} aria-hidden /> Los Olivos, Lima — Perú
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4" style={{ color: GOLD }} aria-hidden /> info@asa.edu.pe
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4" style={{ color: GOLD }} aria-hidden /> +51 949 247 364
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-display mb-4 text-lg font-bold uppercase" style={{ color: GOLD }}>
            SIGEDA
          </h3>
          <p className="text-sm" style={{ color: MUTED }}>
            ¿Ya eres parte de la escuela?
          </p>
          <Link
            to="/login"
            search={{}}
            className="mt-2 inline-flex font-medium underline-offset-4 hover:underline"
            style={{ color: GOLD }}
          >
            Inicia sesión en SIGEDA
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1170px] px-4 py-5 text-xs sm:px-6" style={{ color: '#6b7390' }}>
          © {new Date().getFullYear()} Aeroclub Sudamericano de los Andes. SIGEDA, sistema de gestión académica.
        </div>
      </div>
    </footer>
  )
}

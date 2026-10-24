import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Layers,
  Plane,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { catalogoQuery, type CursoCatalogo } from './api'
import { BarraPublica } from './barra-publica'

const CREDENCIALES = ['Escuela RAP 141', 'Programa PDI EA-510', 'Estándares DGAC', 'Flota propia de helicópteros']

const VALORES = [
  {
    icono: Layers,
    titulo: 'Formación por fases',
    texto: 'Cinco fases que van de la adaptación al vuelo por instrumentos, con estándares medibles en cada misión.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Bajo norma aeronáutica',
    texto: 'Instrucción alineada al RAP 141 y al programa PDI EA-510 reconocido por la autoridad.',
  },
  {
    icono: Users,
    titulo: 'Acompañamiento real',
    texto: 'Instructores certificados y seguimiento académico de tus índices, evaluaciones y chequeos.',
  },
  {
    icono: ClipboardCheck,
    titulo: 'Matrícula en línea',
    texto: 'Inscríbete, sube tu comprobante y sigue el estado de tu matrícula hasta que quede validada.',
  },
]

const PASOS = [
  { titulo: 'Elige tu curso', texto: 'Revisa el programa, la duración y los requisitos de ingreso.' },
  { titulo: 'Completa tu matrícula', texto: 'Llena tus datos y adjunta el comprobante de pago. Se crea tu cuenta al instante.' },
  { titulo: 'Validación y despegue', texto: 'El coordinador académico revisa tu comprobante y pasas a ser alumno del curso.' },
]

export function LandingPage() {
  const { data: cursos, isPending, isError, error, refetch } = useQuery(catalogoQuery())

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <BarraPublica />
      <Hero />

      <main className="flex-1">
        <FranjaCredenciales />
        <SeccionValores />
        <SeccionCursos cursos={cursos} isPending={isPending} isError={isError} error={error} alReintentar={refetch} />
        <SeccionPasos />
        <LlamadaFinal />
      </main>

      <PieDePagina />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-primary text-primary-foreground">
      {/* Motivo aeronáutico sutil: anillos que evocan el disco del rotor, sin imágenes externas. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[32rem] rounded-full border border-primary-foreground/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-10 size-[22rem] rounded-full border border-primary-foreground/10"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Badge className="mb-5 w-fit border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground">
          Admisión abierta · Curso de Piloto de Helicóptero
        </Badge>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          Aprende a volar helicópteros con formación certificada
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-lg text-primary-foreground/80">
          El Aeroclub Sudamericano de los Andes forma pilotos bajo el programa PDI EA-510: instrucción estructurada,
          instructores certificados y seguimiento académico de principio a fin.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary">
            <a href="#cursos">
              Inscríbete ahora
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <a href="#programa">Conoce el programa</a>
          </Button>
        </div>
      </div>
    </section>
  )
}

function FranjaCredenciales() {
  return (
    <section className="border-b bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 sm:px-6">
        {CREDENCIALES.map((item) => (
          <span key={item} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
            {item}
          </span>
        ))}
      </div>
    </section>
  )
}

function SeccionValores() {
  return (
    <section id="programa" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Una escuela, un método</h2>
        <p className="mt-3 text-muted-foreground">
          Todo lo que necesitas para pasar de aspirante a piloto, en un solo programa.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {VALORES.map(({ icono: Icono, titulo, texto }) => (
          <div key={titulo} className="rounded-2xl border bg-card p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icono className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-semibold">{titulo}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
          </div>
        ))}
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
    <section id="cursos" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Nuestros cursos</h2>
          <p className="mt-3 text-muted-foreground">Elige el tuyo e inscríbete en línea en minutos.</p>
        </div>

        <div className="mt-12">
          {isError ? (
            <AvisoDeError titulo="No pudimos cargar el catálogo" error={error} alReintentar={alReintentar} />
          ) : isPending ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-72 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div
              className={
                (cursos?.length ?? 0) <= 1 ? 'mx-auto max-w-xl' : 'grid gap-6 lg:grid-cols-2'
              }
            >
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
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="bg-card">
        <Badge variant="secondary" className="w-fit">
          Programa PDI EA-510
        </Badge>
        <CardTitle className="text-2xl">{curso.nombre}</CardTitle>
        <p className="text-sm text-muted-foreground">{curso.descripcion}</p>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-5">
        <div className="flex flex-wrap gap-6 text-sm">
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-primary" aria-hidden />
            <span className="font-medium">{curso.duracion} horas</span> de instrucción
          </span>
          <span className="flex items-center gap-2">
            <Layers className="size-4 text-primary" aria-hidden />
            <span className="font-medium">5 fases</span> de formación
          </span>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <GraduationCap className="size-4 text-primary" aria-hidden />
            Requisitos de ingreso
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{curso.requisitos}</p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link to="/matricula" search={{ curso: curso.id }}>
            Inscribirme
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function SeccionPasos() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Cómo inscribirte</h2>
        <p className="mt-3 text-muted-foreground">Tres pasos para empezar tu formación.</p>
      </div>
      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="relative">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <h3 className="mt-4 font-semibold">{paso.titulo}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{paso.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function LlamadaFinal() {
  return (
    <section className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">¿Listo para despegar?</h2>
        <p className="max-w-xl text-muted-foreground">
          La admisión está abierta. Completa tu matrícula hoy y empieza tu camino como piloto de helicóptero.
        </p>
        <Button asChild size="lg">
          <a href="#cursos">
            Inscríbete ahora
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </Button>
      </div>
    </section>
  )
}

function PieDePagina() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Plane className="size-4" aria-hidden />
          </span>
          <div className="text-sm">
            <p className="font-semibold">Aeroclub Sudamericano de los Andes</p>
            <p className="text-muted-foreground">Escuela de aviación RAP 141 · Programa PDI EA-510</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" search={{}} className="font-medium text-primary underline-offset-4 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </footer>
  )
}

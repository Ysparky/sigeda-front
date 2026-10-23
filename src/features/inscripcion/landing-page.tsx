import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { catalogoQuery } from './api'

export function LandingPage() {
  const { data: cursos, isPending, isError, error, refetch } = useQuery(catalogoQuery())

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Aeroclub Sudamericano de los Andes
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Forma tu carrera de vuelo</h1>
        <p className="max-w-2xl text-muted-foreground">
          Conoce nuestros cursos e inscríbete en línea. Al enviar tu matrícula creas tu cuenta y sigues su estado
          hasta que el coordinador académico la valide.
        </p>
      </header>

      {isError ? (
        <AvisoDeError titulo="No pudimos cargar el catálogo" error={error} alReintentar={() => refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <section aria-label="Cursos disponibles" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((curso) => (
            <Card key={curso.id} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{curso.nombre}</CardTitle>
                <CardDescription>{curso.descripcion}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-3">
                <dl className="grid gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Duración</dt>
                    <dd className="font-medium">{curso.duracion} horas</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">Requisitos</dt>
                    <dd>{curso.requisitos}</dd>
                  </div>
                </dl>
                <Button asChild className="w-full">
                  <Link to="/matricula" search={{ curso: curso.id }}>
                    Inscribirme
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <footer className="mt-10 text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" search={{}} className="font-medium text-primary underline-offset-4 hover:underline">
          Inicia sesión
        </Link>
        .
      </footer>
    </main>
  )
}

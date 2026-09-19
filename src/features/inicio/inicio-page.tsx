import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { accesosPara } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'

export function InicioPage() {
  const actual = useSesion()
  if (!actual) return null
  const accesos = accesosPara(actual.permisos, import.meta.env.DEV)

  return (
    <>
      <PageHeader
        titulo="Inicio"
        descripcion={`Hola, ${actual.usuario.username}.`}
        acciones={<Badge variant="secondary">{actual.rol.nombre}</Badge>}
      />
      <section aria-labelledby="titulo-accesos" className="grid gap-3">
        <h2 id="titulo-accesos" className="text-sm font-medium text-muted-foreground">
          Accesos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accesos.map((pantalla) => (
            <Link
              key={pantalla.ruta}
              to={pantalla.ruta}
              className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <pantalla.icono className="size-5 text-primary" aria-hidden />
                  <CardTitle>{pantalla.titulo}</CardTitle>
                  <CardDescription>{pantalla.descripcion}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { accesosPara, ORDEN_GRUPOS, type Pantalla } from '@/lib/auth/pantallas'
import { nombreDeSesion } from '@/lib/auth/sesion'
import { useSesion } from '@/lib/auth/use-sesion'

export function InicioPage() {
  const actual = useSesion()
  if (!actual) return null
  const accesos = accesosPara(actual, import.meta.env.DEV).filter((pantalla) => pantalla.ruta !== '/inicio')
  const secciones = ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    pantallas: accesos.filter((pantalla) => pantalla.grupo === grupo),
  })).filter((seccion) => seccion.pantallas.length > 0)

  return (
    <>
      <PageHeader
        titulo="Inicio"
        descripcion={`Hola, ${nombreDeSesion(actual.persona)}.`}
        acciones={
          <span className="font-heading rounded-full bg-[#101a3c] px-3.5 py-1 text-xs font-bold tracking-wider text-white uppercase dark:bg-[#d8b858] dark:text-[#101a3c]">
            {actual.rol.nombre}
          </span>
        }
      />
      <div className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>section]:mb-4 [&>section]:break-inside-avoid">
        {secciones.map((seccion) => (
          <section
            key={seccion.grupo}
            aria-labelledby={`accesos-${seccion.grupo}`}
            className="rounded-2xl bg-card p-2 shadow-[0_10px_40px_rgb(16_26_60/0.07)] ring-1 ring-foreground/5 dark:shadow-none dark:ring-foreground/10"
          >
            <h2
              id={`accesos-${seccion.grupo}`}
              className="font-heading px-3 pt-3 pb-1 text-base font-bold tracking-wide text-foreground uppercase"
            >
              {seccion.grupo}
            </h2>
            <ul>
              {seccion.pantallas.map((pantalla) => (
                <Acceso key={pantalla.ruta} pantalla={pantalla} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

function Acceso({ pantalla }: { pantalla: Pantalla }) {
  return (
    <li>
      <Link
        to={pantalla.ruta}
        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#101a3c] text-[#d8b858] dark:bg-white/8">
          <pantalla.icono className="size-4" aria-hidden />
        </span>
        <span className="grid min-w-0 flex-1 leading-snug">
          <span className="text-[15px] font-semibold text-foreground">{pantalla.titulo}</span>
          <span className="line-clamp-2 text-[13px] text-muted-foreground">{pantalla.descripcion}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  )
}

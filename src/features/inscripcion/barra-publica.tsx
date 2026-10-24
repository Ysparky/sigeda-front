import { Link } from '@tanstack/react-router'
import { Plane } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/** La barra de marca de las páginas públicas del tramo de entrada (landing, matrícula, mi matrícula). */
export function BarraPublica({ accion }: { accion?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-5" aria-hidden />
          </span>
          <span className="grid leading-tight">
            <span className="text-sm font-semibold tracking-tight">Aeroclub Sudamericano de los Andes</span>
            <span className="text-xs text-muted-foreground">Escuela de aviación · SIGEDA</span>
          </span>
        </Link>
        {accion ?? (
          <Button asChild variant="ghost" size="sm">
            <Link to="/login" search={{}}>
              Iniciar sesión
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}

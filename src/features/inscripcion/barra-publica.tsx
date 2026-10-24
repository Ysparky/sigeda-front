import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/** La barra de marca de las páginas públicas del tramo de entrada (landing, matrícula, mi matrícula). */
export function BarraPublica({ accion }: { accion?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Aeroclub Sudamericano de los Andes — inicio" className="flex items-center">
          {/* El logo está diseñado sobre blanco (texto granate); una placa clara lo hace legible en claro y oscuro. */}
          <span className="inline-flex rounded-md bg-white px-2.5 py-1.5">
            <img src="/asa-logo.png" alt="Aeroclub Sudamericano de los Andes" className="h-9 w-auto" />
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

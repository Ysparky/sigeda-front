import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { BODY, FOCO, NAVY, SURFACE } from './marca'

/** La cabecera de las páginas públicas del tramo de entrada, con la misma marca que la landing. */
export function CabeceraPublica() {
  return (
    <header className="border-b border-white/10" style={{ backgroundColor: NAVY }}>
      <div className="mx-auto flex h-20 max-w-[1170px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Aeroclub Sudamericano de los Andes — inicio" className={`flex items-center rounded ${FOCO}`}>
          <span className="inline-flex rounded-md bg-white px-2.5 py-1.5">
            <img src="/asa-logo.png" alt="Aeroclub Sudamericano de los Andes" className="h-9 w-auto" />
          </span>
        </Link>
        <nav aria-label="Accesos" className="flex items-center gap-5">
          <Link
            to="/postulacion"
            className={`font-display rounded text-sm font-bold uppercase tracking-wide text-white/90 hover:text-white ${FOCO}`}
            activeProps={{ 'aria-current': 'page', className: 'text-white underline decoration-[#D8B858] decoration-2 underline-offset-8' }}
          >
            Mi postulación
          </Link>
          <Link
            to="/login"
            search={{}}
            className={`font-display hidden rounded text-sm font-bold uppercase tracking-wide text-white/90 hover:text-white sm:inline ${FOCO}`}
          >
            Iniciar sesión
          </Link>
        </nav>
      </div>
    </header>
  )
}

/** El lienzo de una página pública: clara, con la tipografía y la selección de la marca. */
export function PaginaPublica({ children }: { children: ReactNode }) {
  return (
    <div
      className="font-body flex min-h-dvh flex-col selection:bg-[#D8B858]/40"
      style={{ backgroundColor: SURFACE, color: BODY, colorScheme: 'light' }}
    >
      <CabeceraPublica />
      {children}
    </div>
  )
}

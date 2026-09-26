import { CLASES_TONO } from '@/lib/dominio/tonos'
import { resumirEstados } from '@/lib/dominio/seguimiento'
import { termino } from '@/lib/dominio/vocabulario'
import type { AlumnoSeguimiento } from '../api'

export function ResumenDeEstados({ alumnos }: { alumnos: readonly AlumnoSeguimiento[] }) {
  const resumen = resumirEstados(alumnos.map((alumno) => alumno.estado))
  if (resumen.length === 0) return null
  return (
    <section aria-label="Resumen por estado" className="flex flex-wrap items-center gap-2 text-sm">
      {resumen.map((fila) => {
        const { etiqueta, tono } = termino('estado', fila.estado)
        return (
          <span key={fila.estado} className={`rounded-md border px-2 py-0.5 whitespace-nowrap ${CLASES_TONO[tono]}`}>
            {`${etiqueta}: ${fila.cantidad}`}
          </span>
        )
      })}
    </section>
  )
}

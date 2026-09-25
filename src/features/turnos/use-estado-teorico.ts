import { useQueries } from '@tanstack/react-query'
import { consultasExamenes, type EstadoTeorico } from '@/features/examenes/api'
import { accionDisponible } from '@/lib/dependencias'

export type EstadoTeoricoDeAlumno = { bloqueado: boolean; motivo: string | null; desconocido: boolean }

export function useEstadoTeoricoDeAlumnos(codigos: readonly string[]): Map<string, EstadoTeoricoDeAlumno> {
  const disponible = accionDisponible('bloqueoSubsanacion')
  const unicos = [...new Set(codigos.filter((codigo) => codigo !== ''))]
  const consultas = useQueries({
    queries: unicos.map((codigo) => ({ ...consultasExamenes.estadoTeorico(codigo), enabled: disponible })),
  })
  const estados = new Map<string, EstadoTeoricoDeAlumno>()
  unicos.forEach((codigo, indice) => {
    const consulta = consultas[indice]
    if (!disponible || consulta === undefined) return
    const datos = consulta.data as EstadoTeorico | undefined
    if (datos !== undefined) {
      estados.set(codigo, { bloqueado: datos.bloqueadoPorSubsanacion, motivo: datos.motivo, desconocido: false })
      return
    }
    if (consulta.error) estados.set(codigo, { bloqueado: false, motivo: null, desconocido: true })
  })
  return estados
}

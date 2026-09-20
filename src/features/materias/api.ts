import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import { sigeda } from '@/lib/api/sigeda'

export const PARTES_CURSO = [
  { valor: 'PRIMERA_PARTE', etiqueta: 'Primera parte' },
  { valor: 'SEGUNDA_PARTE', etiqueta: 'Segunda parte' },
  { valor: 'CULTURA_AERONAUTICA', etiqueta: 'Cultura aeronáutica' },
] as const

export type ParteCurso = (typeof PARTES_CURSO)[number]['valor']

export type Materia = { id: number; nombre: string; notaMinima: number; coeficiente: number; parte: ParteCurso }

export type CuerpoMateria = { nombre: string; notaMinima: number; coeficiente: number; parte: string }

export const MENSAJE_MATERIA_GUARDADA = 'Materia guardada con éxito.'
export const MENSAJE_MATERIA_ELIMINADA = 'Materia eliminado con éxito.'

const esquemaFila = z.object({
  id: z.number(),
  nombre: z.string(),
  notaMinima: z.number(),
  coeficiente: z.number(),
  parte: z.enum(PARTES_CURSO.map((parte) => parte.valor)),
})

export function etiquetaDeParte(parte: string): string {
  return PARTES_CURSO.find((opcion) => opcion.valor === parte)?.etiqueta ?? parte
}

export const clavesMaterias = {
  todo: ['materias'] as const,
  lista: () => [...clavesMaterias.todo, 'lista'] as const,
}

export async function listarMaterias(): Promise<Materia[]> {
  const materias = await sigeda.lista<unknown>('/api/materias')
  return materias.map((materia) => esquemaFila.parse(materia))
}

export async function crearMateria(cuerpo: CuerpoMateria): Promise<string> {
  return soloMensaje(await sigeda.post<unknown>('/api/materias', cuerpo), MENSAJE_MATERIA_GUARDADA)
}

export async function modificarMateria(id: number, cuerpo: CuerpoMateria): Promise<string> {
  return soloMensaje(await sigeda.put<unknown>(`/api/materias/${encodeURIComponent(id)}`, cuerpo), MENSAJE_MATERIA_GUARDADA)
}

export async function eliminarMateria(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/materias/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_MATERIA_ELIMINADA
}

export const consultasMaterias = {
  lista: () => queryOptions({ queryKey: clavesMaterias.lista(), queryFn: listarMaterias }),
}

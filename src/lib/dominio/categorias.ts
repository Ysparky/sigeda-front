export const CATEGORIAS = ['Ponderada', 'Chequeo', 'chequeoSubFase', 'Complementacion'] as const

export type Categoria = (typeof CATEGORIAS)[number]

const ETIQUETAS: Record<Categoria, string> = {
  Ponderada: 'Ponderada',
  Chequeo: 'Chequeo',
  chequeoSubFase: 'Chequeo Sub Fase',
  Complementacion: 'Complementación',
}

export function esCategoria(valor: unknown): valor is Categoria {
  return typeof valor === 'string' && (CATEGORIAS as readonly string[]).includes(valor)
}

export function etiquetaCategoria(categoria: Categoria): string {
  return ETIQUETAS[categoria]
}

export function categoriaDesde(texto: string): Categoria | null {
  if (esCategoria(texto)) return texto
  return CATEGORIAS.find((categoria) => ETIQUETAS[categoria] === texto) ?? null
}

export function esCategoriaProgramada(categoria: Categoria): boolean {
  return categoria === 'Ponderada' || categoria === 'chequeoSubFase'
}

export function requiereEvaluador(categoria: Categoria): boolean {
  return !esCategoriaProgramada(categoria)
}

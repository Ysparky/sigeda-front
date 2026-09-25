import { useQuery } from '@tanstack/react-query'
import { consultasAprendizaje } from './api'

export function useDocumentosListos() {
  return useQuery({
    ...consultasAprendizaje.documentos(),
    select: (documentos) => documentos.filter((documento) => documento.status === 'ready'),
  })
}

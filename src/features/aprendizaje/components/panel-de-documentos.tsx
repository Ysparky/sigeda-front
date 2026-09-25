import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS } from '@/lib/dominio/aprendizaje'
import { errorDePrimeraCarga } from '@/lib/query'
import type { Documento } from '../api'
import { useDocumentosListos } from '../use-documentos-listos'

export function DocumentosDeLaConsulta({ documentos }: { documentos: readonly Documento[] }) {
  return (
    <Card role="region" aria-label="Documentos de la consulta">
      <CardHeader>
        <CardTitle>
          <h2>Documentos de la consulta</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1 text-sm">
          {documentos.map((documento) => (
            <li key={documento.id}>{documento.filename}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function SelectorDeDocumentos({
  elegidos,
  alElegir,
  bloqueado,
}: {
  elegidos: readonly string[]
  alElegir: (siguientes: string[]) => void
  bloqueado: boolean
}) {
  const documentos = useDocumentosListos()
  const error = errorDePrimeraCarga(documentos)

  if (error !== null) {
    return (
      <AvisoDeError
        titulo="No se pudieron cargar los documentos"
        error={error}
        alReintentar={() => void documentos.refetch()}
      />
    )
  }

  if (documentos.data === undefined) return <Skeleton className="h-40 w-full" aria-busy="true" />

  if (documentos.data.length === 0) {
    return (
      <EmptyState
        titulo="No hay documentos listos"
        descripcion={TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS}
        accion={
          <Button variant="outline" asChild>
            <Link to="/aprendizaje">Ir a Documentos</Link>
          </Button>
        }
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Documentos de la consulta</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div role="group" aria-label="Documentos para consultar" className="grid gap-3">
          {documentos.data.map((documento) => (
            <div key={documento.id} className="flex items-center gap-2">
              <Checkbox
                id={`consulta-documento-${documento.id}`}
                disabled={bloqueado}
                checked={elegidos.includes(documento.id)}
                onCheckedChange={(marcado) =>
                  alElegir(
                    marcado === true
                      ? [...elegidos, documento.id]
                      : elegidos.filter((id) => id !== documento.id),
                  )
                }
              />
              <Label htmlFor={`consulta-documento-${documento.id}`} className="font-normal">
                {documento.filename}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

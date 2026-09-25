import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PANTALLAS } from '@/lib/auth/pantallas'
import {
  etiquetaDeTipo,
  formatearTamano,
  TEXTO_DOCUMENTO_SIGUE_PROCESANDO,
  TEXTO_SIN_DOCUMENTOS,
} from '@/lib/dominio/aprendizaje'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesAprendizaje, consultasAprendizaje, type Documento } from './api'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
import { DialogoSubirDocumento } from './components/dialogo-subir-documento'
import { EliminarDocumento } from './components/eliminar-documento'
import { motivoDelDocumento } from './mensajes'

export const INTERVALO_DE_CONSULTA = 3000

export const LIMITE_DE_CONSULTAS = 40

function procesa(documentos: readonly Documento[]): boolean {
  return documentos.some((documento) => documento.status === 'processing')
}

export function DocumentosPage() {
  const queryClient = useQueryClient()
  const [marca, setMarca] = useState(0)
  const [consultas, setConsultas] = useState(0)
  const documentos = useQuery(consultasAprendizaje.documentos())
  const filas = documentos.data ?? []
  const procesando = procesa(filas)
  const respuesta = Math.max(documentos.dataUpdatedAt, documentos.errorUpdatedAt)
  if (respuesta !== marca) {
    setMarca(respuesta)
    setConsultas(procesando ? consultas + 1 : 0)
  }
  const rendido = consultas >= LIMITE_DE_CONSULTAS
  const error = errorDePrimeraCarga(documentos)

  useEffect(() => {
    if (!procesando || rendido) return
    const reloj = setTimeout(() => {
      void queryClient.refetchQueries({ queryKey: clavesAprendizaje.documentos() })
    }, INTERVALO_DE_CONSULTA)
    return () => clearTimeout(reloj)
  }, [marca, procesando, queryClient, rendido])

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.documentos.titulo}
        descripcion={PANTALLAS.documentos.descripcion}
        acciones={<DialogoSubirDocumento etiqueta="Subir documento" />}
      />
      <AvisoDocumentosCompartidos />
      {rendido && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{TEXTO_DOCUMENTO_SIGUE_PROCESANDO}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void documentos.refetch()}>
              <RefreshCw aria-hidden />
              Actualizar
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {error !== null ? (
        <AvisoDeError
          titulo="No se pudieron cargar los documentos"
          error={error}
          alReintentar={() => void documentos.refetch()}
        />
      ) : documentos.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : filas.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay documentos"
          descripcion={TEXTO_SIN_DOCUMENTOS}
          accion={<DialogoSubirDocumento etiqueta="Subir documento" />}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table aria-label="Documentos de estudio">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Etiquetas</TableHead>
                <TableHead>Subido el</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((documento) => (
                <TableRow key={documento.id}>
                  <TableCell>{documento.filename}</TableCell>
                  <TableCell>{etiquetaDeTipo(documento.mimeType)}</TableCell>
                  <TableCell className="tabular-nums">{formatearTamano(documento.sizeBytes)}</TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <StatusBadge vocabulario="documento" valor={documento.status} className="w-fit" />
                      {documento.status === 'error' && (
                        <span className="text-xs text-muted-foreground">
                          {motivoDelDocumento(documento.errorMessage)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{documento.tags.length === 0 ? '—' : documento.tags.join(', ')}</TableCell>
                  <TableCell className="tabular-nums">{formatearFecha(documento.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <EliminarDocumento documento={documento} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

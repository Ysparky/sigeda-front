import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { TEXTO_CUESTIONARIO_REINICIADO } from '@/lib/dominio/aprendizaje'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesAprendizaje, consultasAprendizaje, type Cuestionario } from './api'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
import { FormularioGeneracion } from './components/formulario-generacion'
import { ResolucionDeCuestionario } from './components/resolucion-de-cuestionario'
import { mensajeDeError } from './mensajes'

const ruta = getRouteApi('/_app/aprendizaje/cuestionario')

export function CuestionarioPage() {
  const { cuestionario: id } = ruta.useSearch()
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [generadoAqui, setGeneradoAqui] = useState<string | null>(null)
  const cuestionario = useQuery({ ...consultasAprendizaje.cuestionario(id ?? ''), enabled: id !== undefined })
  const error = id === undefined ? null : errorDePrimeraCarga(cuestionario)
  const restaurado = id !== undefined && id !== generadoAqui

  async function alGenerar(generado: Cuestionario) {
    setGeneradoAqui(generado.id)
    queryClient.setQueryData(clavesAprendizaje.cuestionario(generado.id), generado)
    await navegar({ to: '/aprendizaje/cuestionario', search: { cuestionario: generado.id } })
  }

  async function alVolver() {
    setGeneradoAqui(null)
    await navegar({ to: '/aprendizaje/cuestionario', search: {} })
  }

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.cuestionario.titulo}
        descripcion={PANTALLAS.cuestionario.descripcion}
        acciones={
          id !== undefined && (
            <Button variant="outline" onClick={() => void alVolver()}>
              Nuevo cuestionario
            </Button>
          )
        }
      />
      <AvisoDocumentosCompartidos />
      {id === undefined ? (
        <FormularioGeneracion alGenerar={(generado) => void alGenerar(generado)} />
      ) : error !== null ? (
        <Alert variant="destructive">
          <AlertDescription className="grid justify-items-start gap-3">
            <span>{mensajeDeError(error, MENSAJE_GENERICO)}</span>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => void cuestionario.refetch()}>
                Reintentar
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void alVolver()}>
                Volver al formulario
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : cuestionario.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : (
        <>
          {restaurado && (
            <Alert>
              <AlertDescription>{TEXTO_CUESTIONARIO_REINICIADO}</AlertDescription>
            </Alert>
          )}
          <ResolucionDeCuestionario key={cuestionario.data.id} cuestionario={cuestionario.data} />
        </>
      )}
    </>
  )
}

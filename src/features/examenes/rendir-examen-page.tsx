import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { milisegundosRestantes, TEXTO_AUTOGUARDADO_FALLIDO, TEXTO_VENTANA_CERRADA } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import {
  clavesExamenes,
  consultasExamenes,
  entregarExamen,
  MENSAJE_EXAMEN_ENTREGADO,
  type ExamenEnCurso,
} from './api'
import { contarRespondidas, PASO_DEL_RELOJ } from './autoguardado'
import { CabeceraDeExamen } from './components/cabecera-de-examen'
import { ResolucionDeExamen } from './components/resolucion-de-examen'
import { esExamenEntregado, esExamenNoDisponible, esVentanaCerrada } from './mensajes'
import { useAutoguardado } from './use-autoguardado'

type VariablesEntrega = { cerrado: boolean }

function Examen({ examen, idTurno }: { examen: ExamenEnCurso; idTurno: number }) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [restante, setRestante] = useState(() => milisegundosRestantes(examen.fechaExamen, examen.horaFin))
  const { respuestas, estado, responder, guardarAhora } = useAutoguardado(examen, restante)
  const entregado = useRef(false)
  const restanteRef = useRef(restante)
  const cerrado = restante === 0

  useEffect(() => {
    restanteRef.current = restante
  }, [restante])

  const entregar = useMutation({
    mutationFn: (_variables: VariablesEntrega) => entregarExamen(examen.id, examen.codAlumno),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: clavesExamenes.todo })
    },
    onSuccess: async (_datos, variables) => {
      toast[variables.cerrado ? 'info' : 'success'](
        variables.cerrado ? TEXTO_VENTANA_CERRADA : MENSAJE_EXAMEN_ENTREGADO,
      )
      await navegar({ to: '/examenes/$id/resultado', params: { id: String(idTurno) } })
    },
    onError: async (error) => {
      if (esVentanaCerrada(error)) {
        toast.info(TEXTO_VENTANA_CERRADA)
        await navegar({ to: '/examenes/$id/resultado', params: { id: String(idTurno) } })
        return
      }
      if (esExamenEntregado(error)) {
        toast.info((error as ApiError).message)
        await navegar({ to: '/examenes/$id/resultado', params: { id: String(idTurno) } })
        return
      }
      entregado.current = false
      toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO)
    },
  })
  const enviarEntrega = entregar.mutate

  const entregarAhora = useCallback(async () => {
    if (entregado.current) return
    entregado.current = true
    const alDespachar: VariablesEntrega = { cerrado: restanteRef.current === 0 }
    const guardado = await guardarAhora()
    if (!guardado) toast.error(TEXTO_AUTOGUARDADO_FALLIDO)
    enviarEntrega(alDespachar)
  }, [enviarEntrega, guardarAhora])

  useEffect(() => {
    const reloj = setInterval(
      () => setRestante(milisegundosRestantes(examen.fechaExamen, examen.horaFin)),
      PASO_DEL_RELOJ,
    )
    return () => clearInterval(reloj)
  }, [examen.fechaExamen, examen.horaFin])

  useEffect(() => {
    if (cerrado) void entregarAhora()
  }, [cerrado, entregarAhora])

  return (
    <>
      <CabeceraDeExamen
        restante={restante}
        respondidas={contarRespondidas(respuestas)}
        total={examen.preguntas.length}
        entregando={entregar.isPending}
        alEntregar={() => void entregarAhora()}
      />
      <ResolucionDeExamen
        examen={examen}
        respuestas={respuestas}
        estado={estado}
        bloqueado={cerrado}
        alResponder={responder}
        alReintentar={() => void guardarAhora()}
      />
    </>
  )
}

export function RendirExamenPage({ idTurno }: { idTurno: number }) {
  const sesion = useSesion()
  const codAlumno = sesion?.codPersona ?? ''
  const examen = useQuery(consultasExamenes.enCurso(idTurno, codAlumno))
  const error = errorDePrimeraCarga(examen)

  return (
    <>
      <PageHeader
        titulo={examen.data?.turnoTeorico ?? PANTALLAS.rendirExamen.titulo}
        descripcion={PANTALLAS.rendirExamen.descripcion}
      />
      <AvisoDeTeoria accion="rendirExamen" />
      {esExamenEntregado(error) ? (
        <Alert>
          <AlertDescription className="grid gap-3">
            <span>{(error as ApiError).message}</span>
            <Button variant="outline" size="sm" className="justify-self-start" asChild>
              <Link to="/examenes/$id/resultado" params={{ id: String(idTurno) }}>
                Ver el resultado
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : esExamenNoDisponible(error) ? (
        <Alert>
          <AlertDescription>{(error as ApiError).message}</AlertDescription>
        </Alert>
      ) : error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void examen.refetch()} />
      ) : examen.data === undefined ? (
        <Skeleton className="h-64 w-full" aria-busy="true" />
      ) : (
        <Examen examen={examen.data} idTurno={idTurno} />
      )}
    </>
  )
}

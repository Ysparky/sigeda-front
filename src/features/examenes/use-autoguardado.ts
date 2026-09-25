import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { guardarRespuestas, type ExamenEnCurso } from './api'
import {
  aRespuestasEnviadas,
  DEBOUNCE_AUTOGUARDADO,
  MAXIMO_AUTOGUARDADO,
  respuestasIniciales,
  type EstadoGuardado,
  type Respuestas,
} from './autoguardado'

export function useAutoguardado(examen: ExamenEnCurso) {
  const [respuestas, setRespuestas] = useState<Respuestas>(() => respuestasIniciales(examen))
  const [estado, setEstado] = useState<EstadoGuardado>('limpio')
  const ultimas = useRef(respuestas)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maximo = useRef<ReturnType<typeof setTimeout> | null>(null)

  const guardar = useMutation({
    mutationFn: (valores: Respuestas) =>
      guardarRespuestas(examen.id, examen.codAlumno, aRespuestasEnviadas(valores)),
    onSuccess: () => setEstado('guardado'),
    onError: () => setEstado('error'),
  })
  const enviar = guardar.mutateAsync

  const limpiarRelojes = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (maximo.current) clearTimeout(maximo.current)
    debounce.current = null
    maximo.current = null
  }, [])

  const guardarAhora = useCallback(async () => {
    limpiarRelojes()
    setEstado('guardando')
    await enviar(ultimas.current).catch(() => undefined)
  }, [enviar, limpiarRelojes])

  const responder = useCallback(
    (idPregunta: number, valor: string) => {
      const siguientes = { ...ultimas.current, [idPregunta]: valor }
      ultimas.current = siguientes
      setRespuestas(siguientes)
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => void guardarAhora(), DEBOUNCE_AUTOGUARDADO)
      if (maximo.current === null) maximo.current = setTimeout(() => void guardarAhora(), MAXIMO_AUTOGUARDADO)
    },
    [guardarAhora],
  )

  useEffect(() => limpiarRelojes, [limpiarRelojes])

  return { respuestas, estado, responder, guardarAhora }
}

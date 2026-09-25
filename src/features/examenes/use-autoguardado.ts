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
  const enCurso = useRef<Promise<void> | null>(null)
  const pendiente = useRef(false)

  const guardar = useMutation({
    mutationFn: (valores: Respuestas) =>
      guardarRespuestas(examen.id, examen.codAlumno, aRespuestasEnviadas(valores)),
  })
  const enviar = guardar.mutateAsync

  const limpiarDebounce = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = null
  }, [])

  const limpiarMaximo = useCallback(() => {
    if (maximo.current) clearTimeout(maximo.current)
    maximo.current = null
  }, [])

  const enviarUnaVez = useCallback(async () => {
    setEstado('guardando')
    try {
      await enviar(ultimas.current)
      setEstado('guardado')
    } catch {
      setEstado('error')
    }
  }, [enviar])

  const guardarAhora = useCallback((): Promise<void> => {
    limpiarDebounce()
    if (enCurso.current) {
      pendiente.current = true
      return enCurso.current
    }
    limpiarMaximo()
    const tanda = (async () => {
      await enviarUnaVez()
      while (pendiente.current) {
        pendiente.current = false
        await enviarUnaVez()
      }
    })().finally(() => {
      enCurso.current = null
    })
    enCurso.current = tanda
    return tanda
  }, [enviarUnaVez, limpiarDebounce, limpiarMaximo])

  const responder = useCallback(
    (idPregunta: number, valor: string) => {
      const siguientes = { ...ultimas.current, [idPregunta]: valor }
      ultimas.current = siguientes
      setRespuestas(siguientes)
      limpiarDebounce()
      debounce.current = setTimeout(() => void guardarAhora(), DEBOUNCE_AUTOGUARDADO)
      if (maximo.current === null && enCurso.current === null) {
        maximo.current = setTimeout(() => void guardarAhora(), MAXIMO_AUTOGUARDADO)
      }
    },
    [guardarAhora, limpiarDebounce],
  )

  useEffect(
    () => () => {
      limpiarDebounce()
      limpiarMaximo()
    },
    [limpiarDebounce, limpiarMaximo],
  )

  return { respuestas, estado, responder, guardarAhora }
}

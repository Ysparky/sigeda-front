import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_CONVERSACION_ILEGIBLE, TEXTO_FUENTES_NO_DISPONIBLES } from '@/lib/dominio/aprendizaje'
import { errorDePrimeraCarga } from '@/lib/query'
import {
  clavesAprendizaje,
  consultasAprendizaje,
  crearSesion,
  enviarMensaje,
  type MensajeChat,
  type SesionDeConsulta,
} from './api'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
import { Conversacion } from './components/conversacion'
import { DocumentosDeLaConsulta, SelectorDeDocumentos } from './components/panel-de-documentos'
import { mensajeDeError } from './mensajes'

const ruta = getRouteApi('/_app/aprendizaje/consultas')

function mensajeDelUsuario(texto: string): MensajeChat {
  return { id: 'pregunta-en-curso', role: 'user', content: texto, createdAt: '', fuentes: null }
}

export function ConsultasPage() {
  const { sesion: id } = ruta.useSearch()
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [creadaAqui, setCreadaAqui] = useState<string | null>(null)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [pregunta, setPregunta] = useState('')
  const restaurada = id !== undefined && id !== creadaAqui
  const sesion = useQuery({ ...consultasAprendizaje.sesion(id ?? ''), enabled: restaurada })
  const errorDeSesion = restaurada ? errorDePrimeraCarga(sesion) : null

  const enviar = useMutation({
    mutationFn: async (texto: string) => {
      const activa = id ?? (await abrirConversacion())
      return { activa, respuesta: await enviarMensaje(activa, texto) }
    },
    onSuccess: ({ activa, respuesta }, texto) => {
      queryClient.setQueryData(clavesAprendizaje.sesion(activa), (previa: SesionDeConsulta | undefined) =>
        previa === undefined
          ? previa
          : {
              ...previa,
              mensajes: [
                ...previa.mensajes,
                { ...mensajeDelUsuario(texto), id: `${respuesta.id}-pregunta` },
                respuesta,
              ],
            },
      )
      setPregunta('')
    },
  })

  async function abrirConversacion(): Promise<string> {
    const creada = await crearSesion(elegidos)
    setCreadaAqui(creada.id)
    queryClient.setQueryData(clavesAprendizaje.sesion(creada.id), creada)
    await navegar({ to: '/aprendizaje/consultas', search: { sesion: creada.id } })
    return creada.id
  }

  async function nuevaConsulta() {
    setCreadaAqui(null)
    setElegidos([])
    setPregunta('')
    enviar.reset()
    await navegar({ to: '/aprendizaje/consultas', search: {} })
  }

  const mensajesVisibles = sesion.data?.mensajes ?? []
  const documentosVisibles = sesion.data?.documentos ?? []
  const enCurso = enviar.isPending ? [mensajeDelUsuario(enviar.variables)] : []
  const sinFuentesPrevias =
    restaurada &&
    mensajesVisibles.some((mensaje) => mensaje.role === 'assistant' && mensaje.fuentes === null)
  const conversacionAbierta = id !== undefined
  const puedeEnviar = pregunta.trim() !== '' && (conversacionAbierta || elegidos.length > 0)

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.consultas.titulo}
        descripcion={PANTALLAS.consultas.descripcion}
        acciones={
          conversacionAbierta && (
            <Button variant="outline" onClick={() => void nuevaConsulta()}>
              Nueva consulta
            </Button>
          )
        }
      />
      <AvisoDocumentosCompartidos />
      {errorDeSesion !== null ? (
        <Alert variant="destructive">
          <AlertDescription className="grid justify-items-start gap-3">
            <span>{mensajeDeError(errorDeSesion, TEXTO_CONVERSACION_ILEGIBLE)}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void nuevaConsulta()}>
              Nueva consulta
            </Button>
          </AlertDescription>
        </Alert>
      ) : restaurada && sesion.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4">
            {sinFuentesPrevias && (
              <Alert>
                <AlertDescription>{TEXTO_FUENTES_NO_DISPONIBLES}</AlertDescription>
              </Alert>
            )}
            <Conversacion mensajes={[...mensajesVisibles, ...enCurso]} />
            {enviar.error && (
              <Alert variant="destructive">
                <AlertDescription className="grid justify-items-start gap-3">
                  <span>{mensajeDeError(enviar.error, MENSAJE_GENERICO)}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => enviar.mutate(pregunta)}
                    disabled={!puedeEnviar}
                  >
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <form
              noValidate
              onSubmit={(evento) => {
                evento.preventDefault()
                if (puedeEnviar) enviar.mutate(pregunta)
              }}
              className="grid gap-3"
            >
              <Field>
                <FieldLabel htmlFor="consulta-pregunta">Pregunta</FieldLabel>
                <Textarea
                  id="consulta-pregunta"
                  rows={3}
                  disabled={enviar.isPending}
                  value={pregunta}
                  onChange={(evento) => setPregunta(evento.target.value)}
                />
              </Field>
              <div className="flex items-center justify-end gap-3">
                {enviar.isPending && <span className="text-sm text-muted-foreground">Esperando respuesta…</span>}
                <Button type="submit" disabled={!puedeEnviar || enviar.isPending}>
                  <Send aria-hidden />
                  {enviar.isPending ? 'Enviando…' : 'Enviar'}
                </Button>
              </div>
            </form>
          </div>
          {conversacionAbierta ? (
            <DocumentosDeLaConsulta documentos={documentosVisibles} />
          ) : (
            <SelectorDeDocumentos elegidos={elegidos} alElegir={setElegidos} bloqueado={enviar.isPending} />
          )}
        </div>
      )}
    </>
  )
}

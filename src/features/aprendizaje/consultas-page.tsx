import { useMutation } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { crearSesion, enviarMensaje, type Documento, type MensajeChat } from './api'
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
  const [elegidos, setElegidos] = useState<string[]>([])
  const [pregunta, setPregunta] = useState('')
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [documentosLocales, setDocumentosLocales] = useState<Documento[]>([])

  const enviar = useMutation({
    mutationFn: async (texto: string) => {
      if (id !== undefined) return { creada: null, respuesta: await enviarMensaje(id, texto) }
      const creada = await crearSesion(elegidos)
      return { creada, respuesta: await enviarMensaje(creada.id, texto) }
    },
    onSuccess: async ({ creada, respuesta }, texto) => {
      setMensajes((previos) => [...previos, { ...mensajeDelUsuario(texto), id: `${respuesta.id}-pregunta` }, respuesta])
      setPregunta('')
      if (creada === null) return
      setDocumentosLocales(creada.documentos)
      await navegar({ to: '/aprendizaje/consultas', search: { sesion: creada.id } })
    },
  })

  async function nuevaConsulta() {
    setElegidos([])
    setMensajes([])
    setDocumentosLocales([])
    setPregunta('')
    enviar.reset()
    await navegar({ to: '/aprendizaje/consultas', search: {} })
  }

  const enCurso = enviar.isPending ? [mensajeDelUsuario(enviar.variables)] : []
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
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4">
          <Conversacion mensajes={[...mensajes, ...enCurso]} />
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
          <DocumentosDeLaConsulta documentos={documentosLocales} />
        ) : (
          <SelectorDeDocumentos elegidos={elegidos} alElegir={setElegidos} bloqueado={enviar.isPending} />
        )}
      </div>
    </>
  )
}

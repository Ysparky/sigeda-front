import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import {
  archivoAceptado,
  MENSAJE_DOCUMENTO_SUBIDO,
  TEXTO_ARCHIVO_RECHAZADO,
  TIPOS_ACEPTADOS,
} from '@/lib/dominio/aprendizaje'
import { clavesAprendizaje, subirDocumento } from '../api'
import { mensajeDeError } from '../mensajes'

const ACEPTADOS = TIPOS_ACEPTADOS.map((tipo) => tipo.extension).join(',')

export function DialogoSubirDocumento({ etiqueta }: { etiqueta: string }) {
  const [abierto, setAbierto] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [rechazado, setRechazado] = useState(false)
  const queryClient = useQueryClient()
  const disponible = accionDisponible('subirDocumento')

  const subir = useMutation({
    mutationFn: subirDocumento,
    onSuccess: async () => {
      setAbierto(false)
      setArchivo(null)
      toast.success(MENSAJE_DOCUMENTO_SUBIDO)
      await queryClient.invalidateQueries({ queryKey: clavesAprendizaje.documentos() })
    },
  })

  if (!disponible) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button disabled>
          <Upload aria-hidden />
          {etiqueta}
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }

  function alElegir(elegido: File | null) {
    setArchivo(elegido)
    setRechazado(elegido !== null && !archivoAceptado(elegido))
    subir.reset()
  }

  function alEnviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (archivo === null || !archivoAceptado(archivo)) {
      setRechazado(archivo !== null)
      return
    }
    subir.mutate(archivo)
  }

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente)
    if (!siguiente) {
      setArchivo(null)
      setRechazado(false)
      subir.reset()
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={alAbrir}>
      <DialogTrigger asChild>
        <Button>
          <Upload aria-hidden />
          {etiqueta}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>{TEXTO_ARCHIVO_RECHAZADO}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={alEnviar}>
          {rechazado && (
            <Alert variant="destructive">
              <AlertDescription>{TEXTO_ARCHIVO_RECHAZADO}</AlertDescription>
            </Alert>
          )}
          {subir.error && (
            <Alert variant="destructive">
              <AlertDescription>{mensajeDeError(subir.error, MENSAJE_GENERICO)}</AlertDescription>
            </Alert>
          )}
          <Field className="mt-4">
            <FieldLabel htmlFor="documento-archivo">Archivo</FieldLabel>
            <Input
              id="documento-archivo"
              type="file"
              accept={ACEPTADOS}
              onChange={(evento) => alElegir(evento.target.files?.[0] ?? null)}
            />
            {archivo && <p className="text-sm text-muted-foreground">{archivo.name}</p>}
          </Field>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => alAbrir(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={archivo === null || subir.isPending}>
              {subir.isPending ? 'Subiendo…' : 'Subir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

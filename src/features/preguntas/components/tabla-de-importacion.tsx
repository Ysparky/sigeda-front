import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Upload, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { consultasMaterias } from '@/features/materias/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { useSesion } from '@/lib/auth/use-sesion'
import {
  DIFICULTADES,
  etiquetaDeTipoPregunta,
  TEXTO_CONFIRMAR_IMPORTACION,
  TEXTO_REVISAR_IMPORTACION,
} from '@/lib/dominio/teoria'
import { rutaDeCampo } from '@/lib/formularios'
import { clavesPreguntas, importarPreguntas } from '../api'
import { aCuerpoDeLote, avisosDeFila, filaImportable, type FilaImportacion } from '../importacion'

type Props = { filas: FilaImportacion[] }

export function TablaDeImportacion({ filas: iniciales }: Props) {
  const [filas, setFilas] = useState(iniciales)
  const [erroresPorFila, setErroresPorFila] = useState<Record<string, string>>({})
  const materias = useQuery(consultasMaterias.lista())
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const sesion = useSesion()
  const elegidas = filas.filter((fila) => fila.incluida)
  const importables = elegidas.every((fila) => filaImportable(fila, filas))

  const importar = useMutation({
    mutationFn: () =>
      importarPreguntas({ codInstructor: sesion?.codPersona ?? '', preguntas: aCuerpoDeLote(elegidas) }),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPreguntas.todo })
      await navegar({ to: '/banco' })
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        toast.error(MENSAJE_GENERICO)
        return
      }
      const porFila: Record<string, string> = {}
      for (const [campo, mensaje] of Object.entries(error.erroresDeCampo)) {
        const indice = Number(rutaDeCampo(campo).split('.')[1])
        const fila = elegidas[indice]
        if (fila) porFila[fila.id] = mensaje
      }
      setErroresPorFila(porFila)
      toast.error(error.message)
    },
  })

  function actualizar(id: string, cambios: Partial<FilaImportacion>) {
    setFilas((previas) => previas.map((fila) => (fila.id === id ? { ...fila, ...cambios } : fila)))
    setErroresPorFila((previos) => ({ ...previos, [id]: '' }))
  }

  return (
    <>
      <Alert>
        <AlertDescription>{TEXTO_REVISAR_IMPORTACION}</AlertDescription>
      </Alert>
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label="Preguntas generadas">
          <TableHeader>
            <TableRow>
              <TableHead>Importar</TableHead>
              <TableHead>Enunciado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Dificultad</TableHead>
              <TableHead>Alternativas</TableHead>
              <TableHead>Revisión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila, indice) => {
              const numero = indice + 1
              const avisos = avisosDeFila(fila, filas)
              const delServidor = erroresPorFila[fila.id]
              return (
                <TableRow key={fila.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Importar la pregunta ${numero}`}
                      checked={fila.incluida}
                      onCheckedChange={(marcado) => actualizar(fila.id, { incluida: marcado === true })}
                    />
                  </TableCell>
                  <TableCell className="min-w-72">
                    <Textarea
                      aria-label={`Enunciado de la pregunta ${numero}`}
                      value={fila.enunciado}
                      onChange={(evento) => actualizar(fila.id, { enunciado: evento.target.value, recortado: false })}
                    />
                  </TableCell>
                  <TableCell>{etiquetaDeTipoPregunta(fila.tipoPregunta)}</TableCell>
                  <TableCell>
                    <NativeSelect
                      aria-label={`Materia de la pregunta ${numero}`}
                      className="w-full"
                      value={fila.idMateria}
                      onChange={(evento) => actualizar(fila.id, { idMateria: evento.target.value })}
                    >
                      <NativeSelectOption value="">Elija una materia</NativeSelectOption>
                      {(materias.data ?? []).map((materia) => (
                        <NativeSelectOption key={materia.id} value={materia.id}>
                          {materia.nombre}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      aria-label={`Dificultad de la pregunta ${numero}`}
                      className="w-full"
                      value={fila.dificultad}
                      onChange={(evento) => actualizar(fila.id, { dificultad: evento.target.value as never })}
                    >
                      {DIFICULTADES.map((dificultad) => (
                        <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                          {dificultad.etiqueta}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="min-w-64">
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      className="grid gap-2"
                      aria-label={`Alternativa correcta de la pregunta ${numero}`}
                      value={fila.correcta}
                      onValueChange={(valor) => valor !== '' && actualizar(fila.id, { correcta: valor })}
                    >
                      {fila.alternativas.map((respuesta, posicion) => (
                        <div key={posicion} className="flex items-center gap-2">
                          <ToggleGroupItem
                            value={String(posicion)}
                            aria-label={`Alternativa ${posicion + 1} de la pregunta ${numero} es la correcta`}
                          >
                            Correcta
                          </ToggleGroupItem>
                          {fila.tipoPregunta === 'VERDADERO_FALSO' ? (
                            <span>{respuesta}</span>
                          ) : (
                            <Input
                              aria-label={`Alternativa ${posicion + 1} de la pregunta ${numero}`}
                              value={respuesta}
                              onChange={(evento) =>
                                actualizar(fila.id, {
                                  alternativas: fila.alternativas.map((texto, otra) =>
                                    otra === posicion ? evento.target.value : texto,
                                  ),
                                })
                              }
                            />
                          )}
                        </div>
                      ))}
                    </ToggleGroup>
                  </TableCell>
                  <TableCell className="min-w-64">
                    <div className="grid gap-1 text-sm">
                      {avisos.map((aviso) => (
                        <p key={aviso}>{aviso}</p>
                      ))}
                      {delServidor !== undefined && delServidor !== '' && <p>{delServidor}</p>}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        onClick={() => actualizar(fila.id, { incluida: false })}
                      >
                        <X aria-hidden />
                        Quitar de la importación
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          Elegidas: {elegidas.length} de {filas.length}.
        </p>
        <ConfirmDialog
          disparador={
            <Button type="button" disabled={elegidas.length === 0 || !importables || importar.isPending}>
              <Upload aria-hidden />
              Importar al banco
            </Button>
          }
          titulo="¿Importar las preguntas elegidas?"
          descripcion={TEXTO_CONFIRMAR_IMPORTACION}
          confirmar="Importar"
          alConfirmar={() => importar.mutate()}
        />
      </div>
    </>
  )
}

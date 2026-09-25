import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { PROGRAMAS } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesGrupos, consultasGrupos, crearGrupo, modificarGrupo, type AlumnoDeGrupo, type GrupoDetalle } from '../api'
import { esquemaGrupo, GRUPO_VACIO, type ValoresGrupo } from '../schemas'

export const TEXTO_PROGRAMA_FIJO = 'El programa de un grupo no se puede cambiar después de registrarlo.'

type Props = { grupo?: GrupoDetalle }

export function FormularioGrupo({ grupo }: Props) {
  const sinGrupo = useQuery(consultasGrupos.alumnosSinGrupo())
  const error = errorDePrimeraCarga(sinGrupo)

  if (error !== null) return <AvisoDeError error={error} alReintentar={() => void sinGrupo.refetch()} />
  if (!sinGrupo.isSuccess) return <p className="text-sm text-muted-foreground">Cargando los alumnos…</p>
  return <FormularioConAlumnos grupo={grupo} disponibles={sinGrupo.data} />
}

function FormularioConAlumnos({ grupo, disponibles }: Props & { disponibles: AlumnoDeGrupo[] }) {
  const modificando = grupo !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const miembros = grupo?.alumnos ?? []
  const codigosMiembros = new Set(miembros.map((alumno) => alumno.codigo))
  const opciones = [...miembros, ...disponibles.filter((alumno) => !codigosMiembros.has(alumno.codigo))]
  const iniciales: ValoresGrupo = grupo
    ? {
        nombre: grupo.nombre,
        descripcion: grupo.descripcion ?? '',
        programa: grupo.programa === 'PDE' ? 'PDE' : 'PDI',
        alumnos: miembros.map((alumno) => alumno.codigo),
      }
    : GRUPO_VACIO
  const formulario = useForm<ValoresGrupo>({ resolver: zodResolver(esquemaGrupo), defaultValues: iniciales })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresGrupo) => {
      const elegidos = new Set(valores.alumnos)
      const descripcion = valores.descripcion.trim() === '' ? null : valores.descripcion.trim()
      if (grupo) {
        return modificarGrupo(grupo.id, {
          nombre: valores.nombre.trim(),
          descripcion,
          personas: opciones
            .filter((alumno) => codigosMiembros.has(alumno.codigo) || elegidos.has(alumno.codigo))
            .map((alumno) => ({ codigo: alumno.codigo, checked: elegidos.has(alumno.codigo) })),
        })
      }
      return crearGrupo({
        nombre: valores.nombre.trim(),
        descripcion,
        programa: valores.programa,
        personas: [...elegidos].map((codigo) => ({ codigo })),
      })
    },
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.todo })
      await (resultado.id === null
        ? navegar({ to: '/grupos' })
        : navegar({ to: '/grupos/$id', params: { id: String(resultado.id) } }))
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el grupo</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del grupo</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="grupo-nombre">Nombre</FieldLabel>
              <Input id="grupo-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 3 a 35 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.programa)}>
              <FieldLabel htmlFor="grupo-programa">Programa</FieldLabel>
              <NativeSelect
                id="grupo-programa"
                className="w-full"
                disabled={modificando}
                {...formulario.register('programa')}
              >
                {PROGRAMAS.map((programa) => (
                  <NativeSelectOption key={programa} value={programa}>
                    {programa}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {modificando && <FieldDescription>{TEXTO_PROGRAMA_FIJO}</FieldDescription>}
              <FieldError errors={[errors.programa]} />
            </Field>
            <Field data-invalid={Boolean(errors.descripcion)} className="md:col-span-2">
              <FieldLabel htmlFor="grupo-descripcion">Descripción</FieldLabel>
              <Textarea
                id="grupo-descripcion"
                aria-invalid={Boolean(errors.descripcion)}
                {...formulario.register('descripcion')}
              />
              <FieldError errors={[errors.descripcion]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Alumnos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay alumnos sin grupo para asignar.</p>
          ) : (
            <Controller
              control={formulario.control}
              name="alumnos"
              render={({ field }) => (
                <div role="group" aria-label="Alumnos del grupo" className="grid gap-3 sm:grid-cols-2">
                  {opciones.map((alumno) => (
                    <div key={alumno.codigo} className="flex items-center gap-2">
                      <Checkbox
                        id={`alumno-${alumno.codigo}`}
                        checked={field.value.includes(alumno.codigo)}
                        onCheckedChange={(marcado) =>
                          field.onChange(
                            marcado === true
                              ? [...field.value, alumno.codigo]
                              : field.value.filter((codigo) => codigo !== alumno.codigo),
                          )
                        }
                      />
                      <Label htmlFor={`alumno-${alumno.codigo}`} className="font-normal">
                        {alumno.nombreCompleto}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/grupos/$id" params={{ id: String(grupo.id) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/grupos">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar grupo'}
        </Button>
      </div>
    </form>
  )
}

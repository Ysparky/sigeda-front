import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert, FileText, Gavel, IdCard } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { clavesGrupos } from '@/features/grupos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { cambiarEstadoGrupo } from '@/features/grupos/api'
import {
  clavesEgreso,
  consultasEgreso,
  ETIQUETA_SITUACION,
  registrarDecision,
  type AlumnoDelCierre,
  type Decision,
  type SituacionDelCierre,
  type TableroDeCierre,
} from './api'

const TONO: Record<SituacionDelCierre, string> = {
  EN_CURSO: 'border-border bg-card text-foreground',
  LISTO: 'border-[#d8b858] bg-[#fbf3da] text-[#4d3f12] dark:bg-[#d8b858]/15 dark:text-[#e8c66a]',
  EGRESADO: 'border-[#101a3c] bg-[#101a3c] text-white dark:border-[#d8b858] dark:bg-[#d8b858] dark:text-[#101a3c]',
  DESAPROBADO: 'border-[#b42318]/40 bg-[#fdecea] text-[#7a1a10] dark:bg-[#b42318]/20 dark:text-[#f7b4a8]',
  RETIRADO: 'border-border bg-muted text-muted-foreground',
  NO_CULMINO: 'border-[#8a5a00]/40 bg-[#fdf3e1] text-[#6b4600] dark:bg-[#8a5a00]/20 dark:text-[#f0c675]',
}

export function SituacionChip({ situacion }: { situacion: SituacionDelCierre }) {
  return (
    <span
      data-situacion={situacion}
      className={cn(
        'font-heading inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-[0.1em] whitespace-nowrap uppercase',
        TONO[situacion],
      )}
    >
      {ETIQUETA_SITUACION[situacion]}
    </span>
  )
}

function Avance({ hechas, total, etiqueta }: { hechas: number; total: number; etiqueta: string }) {
  return (
    <span className="grid gap-1">
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('h-2 w-2.5 rounded-[2px]', i < hechas ? 'bg-[#101a3c] dark:bg-[#d8b858]' : 'bg-[#101a3c]/15 dark:bg-white/15')} />
        ))}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {hechas} de {total} <span className="sr-only">{etiqueta}</span>
      </span>
    </span>
  )
}

function Fechas({ tablero }: { tablero: TableroDeCierre }) {
  const fechas = [
    { etiqueta: 'Inicio', valor: tablero.fechaInicio },
    { etiqueta: 'Fin previsto', valor: tablero.fechaFin, nota: '81 días hábiles' },
    { etiqueta: 'Plazo máximo', valor: tablero.plazoMaximo, nota: '120 días hábiles' },
  ]
  return (
    <dl className="grid grid-cols-3 divide-x divide-dashed divide-border rounded-xl bg-muted/70 dark:bg-white/4">
      {fechas.map((f) => (
        <div key={f.etiqueta} className="grid gap-0.5 px-4 py-3">
          <dt className="font-heading text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">{f.etiqueta}</dt>
          <dd className="font-heading text-lg leading-tight font-bold tabular-nums">{f.valor ? formatearFecha(f.valor) : '—'}</dd>
          {f.nota && <dd className="text-xs text-muted-foreground">{f.nota}</dd>}
        </div>
      ))}
    </dl>
  )
}

function RegistrarDecision({ idGrupo, alumno }: { idGrupo: number; alumno: AlumnoDelCierre }) {
  const enDeliberacion = alumno.estado === 'En Deliberación'
  const opciones: { valor: Decision; titulo: string; detalle: string }[] = [
    ...(enDeliberacion
      ? [
          { valor: 'CONTINUA' as const, titulo: 'El Consejo decide que continúa', detalle: 'Vuelve a volar En Observación.' },
          { valor: 'SEPARADO' as const, titulo: 'El Consejo decide la separación', detalle: 'Queda No Apto y su situación final es Separado.' },
        ]
      : []),
    { valor: 'RETIRO', titulo: 'Retiro del curso', detalle: 'Queda No Apto y su situación final es Retirado.' },
  ]
  const [abierto, setAbierto] = useState(false)
  const [decision, setDecision] = useState<Decision>(opciones[0].valor)
  const [observacion, setObservacion] = useState('')
  const queryClient = useQueryClient()
  const registrar = useMutation({
    mutationFn: () => registrarDecision(idGrupo, alumno.codigo, decision, observacion.trim() || null),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      setAbierto(false)
      await queryClient.invalidateQueries({ queryKey: clavesEgreso.cierre(idGrupo) })
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.detalle(idGrupo) })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : MENSAJE_GENERICO),
  })
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Registrar decisión de ${alumno.nombre}`}>
          <Gavel aria-hidden />
          Decisión
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decisión sobre {alumno.nombre}</DialogTitle>
          <DialogDescription>
            {enDeliberacion
              ? 'Registre lo que resolvió el Consejo de Evaluación de Vuelos, o un retiro.'
              : 'El alumno no está En Deliberación: solo se puede registrar su retiro.'}
          </DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-2">
          <legend className="sr-only">Decisión</legend>
          {opciones.map((o) => (
            <label
              key={o.valor}
              className={cn(
                'flex cursor-pointer gap-3 rounded-xl border p-3 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring',
                decision === o.valor ? 'border-[#101a3c] bg-[#101a3c]/4 dark:border-[#d8b858]' : 'border-border',
              )}
            >
              <input
                type="radio"
                name="decision"
                value={o.valor}
                checked={decision === o.valor}
                onChange={() => setDecision(o.valor)}
                className="mt-0.5 accent-[#101a3c]"
              />
              <span className="grid gap-0.5">
                <span className="font-semibold text-foreground">{o.titulo}</span>
                <span className="text-muted-foreground">{o.detalle}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Field>
          <FieldLabel htmlFor={`observacion-${alumno.codigo}`}>Acta u observación</FieldLabel>
          <Textarea
            id={`observacion-${alumno.codigo}`}
            maxLength={500}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="N.° de acta, fecha del Consejo o motivo del retiro"
          />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button disabled={registrar.isPending} onClick={() => registrar.mutate()}>
            {registrar.isPending ? 'Registrando…' : 'Registrar decisión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Conteo({ tablero }: { tablero: TableroDeCierre }) {
  const cuenta = (s: SituacionDelCierre[]) => tablero.alumnos.filter((a) => s.includes(a.situacion)).length
  const cerrada = tablero.estado === 'CERRADA'
  const partes = cerrada
    ? [
        { n: cuenta(['EGRESADO']), t: ['egresado', 'egresados'] },
        { n: cuenta(['DESAPROBADO', 'RETIRADO']), t: ['baja', 'bajas'] },
        { n: cuenta(['NO_CULMINO']), t: ['no culminó', 'no culminaron'] },
      ]
    : [
        { n: cuenta(['LISTO']), t: ['cumple el egreso', 'cumplen el egreso'] },
        { n: cuenta(['EN_CURSO']), t: ['en curso', 'en curso'] },
        { n: cuenta(['DESAPROBADO', 'RETIRADO']), t: ['baja', 'bajas'] },
      ]
  return (
    <p className="text-sm text-muted-foreground tabular-nums">
      {partes.map((p, i) => (
        <span key={p.t[1]}>
          {i > 0 && ' · '}
          <span className="font-semibold text-foreground">{p.n}</span> {p.n === 1 ? p.t[0] : p.t[1]}
        </span>
      ))}
    </p>
  )
}

export function CierreDeCohorte({ idGrupo }: { idGrupo: number }) {
  const { data: tablero } = useQuery(consultasEgreso.cierre(idGrupo))
  const puedeLicencia = usePuede('Manage Licensing')
  const queryClient = useQueryClient()
  const [rechazo, setRechazo] = useState<string | null>(null)
  const cerrar = useMutation({
    mutationFn: () => cambiarEstadoGrupo(idGrupo, 'CERRADA'),
    onMutate: () => setRechazo(null),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.detalle(idGrupo) })
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.consolidado(idGrupo) })
      await queryClient.invalidateQueries({ queryKey: clavesEgreso.cierre(idGrupo) })
    },
    onError: (e) => setRechazo(e instanceof ApiError ? e.message : MENSAJE_GENERICO),
  })
  if (!tablero || tablero.estado === 'EN_INSCRIPCION') return null
  const cerrada = tablero.estado === 'CERRADA'
  const motivos = rechazo ?? (tablero.puedeCerrar ? null : tablero.motivos.join(' '))

  return (
    <section
      aria-labelledby="titulo-cierre"
      className="grid gap-5 rounded-2xl bg-card p-5 shadow-[0_10px_40px_rgb(16_26_60/0.07)] ring-1 ring-foreground/5 md:p-6 dark:shadow-none dark:ring-foreground/10"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 id="titulo-cierre" className="font-heading text-xl font-bold tracking-wide uppercase">
            {cerrada ? 'Acta de cierre' : 'Cierre de la cohorte'}
          </h2>
          <Conteo tablero={tablero} />
        </div>
        {!cerrada && (
          <Button disabled={cerrar.isPending || !tablero.puedeCerrar} onClick={() => cerrar.mutate()}>
            {cerrar.isPending ? 'Cerrando…' : 'Cerrar cohorte'}
          </Button>
        )}
      </div>

      <Fechas tablero={tablero} />

      {!cerrada && motivos && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-[#8a5a00]/35 bg-[#fdf3e1] p-4 text-sm text-[#5c3c00] dark:bg-[#8a5a00]/15 dark:text-[#f0c675]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="grid gap-1">
            <p className="font-semibold">La cohorte aún no puede cerrar.</p>
            <p>{motivos}</p>
          </div>
        </div>
      )}

      {tablero.alumnos.length === 0 ? (
        <p className="text-sm text-muted-foreground">La cohorte no tiene alumnos.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table aria-label={cerrada ? 'Acta de cierre' : 'Cierre de la cohorte'} className={cn('w-full text-sm', cerrada ? 'min-w-[560px]' : 'min-w-[760px]')}>
            <thead>
              <tr className="font-heading border-b text-left text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {cerrada && <th className="w-12 py-2 pr-3 font-bold">Puesto</th>}
                <th className="py-2 pr-3 font-bold">Alumno</th>
                {!cerrada && <th className="py-2 pr-3 font-bold">Sub fases</th>}
                {!cerrada && <th className="py-2 pr-3 font-bold">Tierra</th>}
                <th className="py-2 pr-3 text-right font-bold">NFPI</th>
                <th className="py-2 pr-3 font-bold">Situación</th>
                <th className="py-2 text-right font-bold">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tablero.alumnos.map((a) => (
                <tr key={a.codigo} className="align-middle">
                  {cerrada && (
                    <td className="font-heading py-3 pr-3 text-xl font-bold tabular-nums">{a.puesto ?? <span className="text-muted-foreground">–</span>}</td>
                  )}
                  <td className="py-3 pr-3">
                    <span className="block font-semibold text-foreground">{a.nombre}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {a.codigo}
                      {a.estado && ` · ${a.estado}`}
                    </span>
                    {a.observacion && <span className="block max-w-[32ch] truncate text-xs text-muted-foreground">{a.observacion}</span>}
                  </td>
                  {!cerrada && (
                    <td className="py-3 pr-3">
                      <Avance hechas={a.subfasesCompletas} total={a.subfasesTotales} etiqueta="sub fases completas" />
                    </td>
                  )}
                  {!cerrada && (
                    <td className="py-3 pr-3 tabular-nums">
                      {a.asignaturasAprobadas} de {a.asignaturasTotales}
                      <span className="block text-xs text-muted-foreground">asignaturas</span>
                    </td>
                  )}
                  <td className="py-3 pr-3 text-right font-semibold tabular-nums">{formatearNota(a.nfpi)}</td>
                  <td className="py-3 pr-3">
                    <SituacionChip situacion={a.situacion} />
                    {a.constancia && <span className="mt-1 block text-xs text-muted-foreground tabular-nums">{a.constancia}</span>}
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex flex-wrap justify-end gap-1.5">
                      {!cerrada && (a.situacion === 'EN_CURSO' || a.situacion === 'LISTO') && (
                        <RegistrarDecision idGrupo={idGrupo} alumno={a} />
                      )}
                      {a.situacion === 'EGRESADO' && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/constancias/$cod" params={{ cod: a.codigo }} aria-label={`Constancia de ${a.nombre}`}>
                            <FileText aria-hidden />
                            Constancia
                          </Link>
                        </Button>
                      )}
                      {a.situacion === 'EGRESADO' && puedeLicencia && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/fichas-licencia/$cod" params={{ cod: a.codigo }} aria-label={`Ficha de licencia de ${a.nombre}`}>
                            <IdCard aria-hidden />
                            Licencia
                          </Link>
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

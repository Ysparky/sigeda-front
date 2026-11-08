import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, TriangleAlert } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { consultasAula, type MiCohorte } from './api'
import { fechaCorta } from './formato'
import { CabeceraDelAula, ColumnaDeFase, Fila, Filas, Panel, Pase, PaseVacio, Vacio } from './piezas'

const BOTON_ORO =
  'font-heading inline-flex items-center gap-1.5 rounded-full bg-[#d8b858] px-4 py-1.5 text-xs font-bold tracking-wider text-[#101a3c] uppercase transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#d8b858] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101a3c] focus-visible:outline-none'

function TurnosDeHoy({ turnos }: { turnos: MiCohorte['turnosDeHoy'] }) {
  if (turnos.length === 0)
    return (
      <PaseVacio
        titulo="Turnos de hoy"
        mensaje={`No tienes turnos de vuelo hoy, ${format(new Date(), "EEEE d 'de' MMMM", { locale: es })}.`}
      />
    )
  return (
    <section aria-label="Turnos de hoy" className="grid gap-4">
      {turnos.map((turno) => (
        <article key={turno.id} className="grid gap-0">
          <Pase
            titulo={turno.nombre}
            fecha={`${turno.horaInicio}–${turno.horaFin}`}
            segmentos={[
              { etiqueta: 'Aeronave', valor: turno.aeronave ?? '—' },
              { etiqueta: 'Misión', valor: turno.mision ?? '—' },
              { etiqueta: 'Sub fase', valor: turno.subfase ?? '—' },
            ]}
            accion={
              <Link
                to="/turnos/$id"
                params={{ id: String(turno.id) }}
                className="font-heading inline-flex items-center gap-1.5 rounded-full text-sm font-bold tracking-wider text-[#d8b858] uppercase hover:text-white focus-visible:ring-2 focus-visible:ring-[#d8b858] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101a3c] focus-visible:outline-none"
              >
                Ver turno
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <ul className="-mt-3 grid gap-px overflow-hidden rounded-b-2xl bg-[#101a3c]/10 pt-3 dark:bg-white/8">
            {turno.alumnos.map((alumno) => (
              <li key={alumno.codigo} className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-card px-5 py-3">
                <span className="font-heading w-24 text-base font-bold tabular-nums">
                  {alumno.horaInicio}–{alumno.horaFin}
                </span>
                <span className="min-w-0 flex-1 text-[15px] text-foreground">{alumno.nombre}</span>
                {alumno.evaluado ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e7a4c] dark:text-[#5cc28b]">
                    <Check className="size-4" aria-hidden />
                    Evaluado
                  </span>
                ) : (
                  <Link
                    to="/turnos/$id/evaluar/$alumno"
                    params={{ id: String(turno.id), alumno: alumno.codigo }}
                    aria-label={`Evaluar a ${alumno.nombre}`}
                    className={cn(BOTON_ORO, 'focus-visible:ring-offset-card')}
                  >
                    Evaluar
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  )
}

function AlumnosPorSubfase({ fases }: { fases: MiCohorte['fases'] }) {
  const total = fases.reduce((suma, fase) => suma + fase.subfases.reduce((s, sub) => s + sub.alumnos, 0), 0)
  return (
    <section
      aria-labelledby="titulo-por-subfase"
      className="rounded-2xl bg-card p-5 shadow-[0_10px_40px_rgb(16_26_60/0.07)] ring-1 ring-foreground/5 md:p-6 dark:shadow-none dark:ring-foreground/10"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="titulo-por-subfase" className="font-heading text-xl font-bold tracking-wide uppercase">
          Alumnos por sub fase
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {total} {total === 1 ? 'alumno' : 'alumnos'} en vuelo · programa PDI EA-510
        </p>
      </div>
      {fases.length === 0 ? (
        <Vacio>Tus cohortes aún no tienen alumnos en vuelo.</Vacio>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {fases.map((fase, indice) => (
            <ColumnaDeFase key={fase.id} titulo={fase.nombre} detalle={`Fase ${indice + 1}`}>
              {fase.subfases.map((subfase) => (
                <li
                  key={subfase.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[13px] leading-snug',
                    subfase.alumnos > 0
                      ? 'border-2 border-[#d8b858] bg-[#fbf3da] text-[#101a3c] dark:bg-[#d8b858] dark:text-[#101a3c]'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  <span className="font-semibold">{subfase.nombre}</span>
                  {subfase.alumnos > 0 ? (
                    <span className="font-heading text-2xl leading-none font-bold tabular-nums" aria-label={`${subfase.alumnos} alumnos`}>
                      {subfase.alumnos}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground/70" aria-label="Ningún alumno">
                      –
                    </span>
                  )}
                </li>
              ))}
            </ColumnaDeFase>
          ))}
        </div>
      )}
    </section>
  )
}

export function MiCohortePage() {
  const { data } = useSuspenseQuery(consultasAula.cohorte())
  const principal = data.cohortes.find((cohorte) => cohorte.estado === 'EN_PROGRESO') ?? data.cohortes[0]
  const detalle =
    data.cohortes.length === 0
      ? 'No eres instructor responsable de ninguna cohorte.'
      : data.cohortes.map((cohorte) => `${cohorte.nombre} · ${cohorte.alumnos} ${cohorte.alumnos === 1 ? 'alumno' : 'alumnos'}`).join(' — ')

  return (
    <>
      <CabeceraDelAula
        titulo="Mi cohorte"
        detalle={detalle}
        dia={principal?.diaDelCurso ?? null}
        diasDelPlan={81}
        fin={principal?.fechaFin ?? null}
      />

      <div className="grid gap-6">
        <TurnosDeHoy turnos={data.turnosDeHoy} />
        <AlumnosPorSubfase fases={data.fases} />
        <aside className="grid gap-4 md:grid-cols-3 md:items-start" aria-label="Pendientes">
          <Panel titulo="Por evaluar">
              {data.porEvaluar.length === 0 ? (
                <Vacio>Estás al día con las evaluaciones.</Vacio>
              ) : (
                <Filas>
                  {data.porEvaluar.map((fila) => (
                    <Fila
                      key={`${fila.idTurno}-${fila.codigo}`}
                      izquierda={
                        <Link
                          to="/turnos/$id/evaluar/$alumno"
                          params={{ id: String(fila.idTurno), alumno: fila.codigo }}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {fila.nombre}
                        </Link>
                      }
                      derecha={
                        <span className="text-[#8a5a00] dark:text-[#e8c66a]" title="Turno ya volado sin evaluación">
                          {fechaCorta(fila.fecha)}
                        </span>
                      }
                    />
                  ))}
                </Filas>
              )}
            </Panel>
          <Panel titulo="Alertas">
            {data.alertas.length === 0 ? (
              <Vacio>Ningún alumno bloqueado.</Vacio>
            ) : (
              <ul className="grid gap-3 text-sm">
                {data.alertas.map((alerta) => (
                  <li key={alerta.codigo} className="flex gap-2.5">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#8a5a00] dark:text-[#e8c66a]" aria-hidden />
                    <span>
                      <Link
                        to="/seguimiento/$alumno"
                        params={{ alumno: alerta.codigo }}
                        className="font-semibold text-foreground underline-offset-4 hover:underline"
                      >
                        {alerta.alumno}
                      </Link>
                      <span className="block text-muted-foreground">{alerta.motivo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel titulo="Próximos exámenes">
            {data.proximosExamenes.length === 0 ? (
              <Vacio>Sin exámenes programados.</Vacio>
            ) : (
              <Filas>
                {data.proximosExamenes.map((examen) => (
                  <Fila
                    key={examen.idTurnoTeorico}
                    izquierda={
                      <>
                        <span className="block text-foreground">{examen.materia}</span>
                        {examen.grupo && <span className="text-xs text-muted-foreground">{examen.grupo}</span>}
                      </>
                    }
                    derecha={fechaCorta(examen.fecha)}
                  />
                ))}
              </Filas>
            )}
          </Panel>
        </aside>
      </div>
    </>
  )
}

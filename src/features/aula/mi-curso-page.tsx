import { useSuspenseQuery } from '@tanstack/react-query'
import type React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CircleCheck, CircleDashed, CircleX } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { ETIQUETA_SITUACION } from '@/features/egreso/api'
import { RutaDeLicencia } from '@/features/egreso/ruta-de-licencia'
import { consultasAula, type MiCurso } from './api'
import { ETIQUETA_ESTADO, fechaCorta, horas, nota } from './formato'
import {
  CabeceraDelAula,
  Celda,
  ColumnaDeFase,
  Fila,
  Filas,
  Panel,
  Pase,
  PaseVacio,
  Puntos,
  Vacio,
} from './piezas'

const ENLACE = 'font-heading inline-flex items-center gap-1.5 rounded-full text-sm font-bold tracking-wider uppercase'

function Tierra({ tierra }: { tierra: MiCurso['tierra'] }) {
  const primera = tierra.materias.filter((materia) => materia.parte === 'PRIMERA_PARTE')
  const resto = tierra.materias.filter((materia) => materia.parte !== 'PRIMERA_PARTE')
  const restoAprobadas = resto.filter((materia) => materia.estado === 'APROBADA').length
  return (
    <div className="grid gap-3 rounded-xl bg-muted/70 p-4 dark:bg-white/4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="font-heading text-sm font-bold tracking-wide uppercase">Instrucción en tierra</h3>
        <p className="text-xs text-muted-foreground tabular-nums">
          1ª parte, antes de volar solo · {tierra.aprobadas} de {tierra.total} aprobadas
          {resto.length > 0 && ` · 2ª parte y cultura aeronáutica ${restoAprobadas} de ${resto.length}`}
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {primera.map((materia) => (
          <li
            key={materia.id}
            data-estado={materia.estado}
            className={cn(
              'inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pr-3 pl-2 text-[13px] leading-snug',
              materia.estado === 'APROBADA' && 'border-[#101a3c] bg-[#101a3c] text-white dark:border-[#2a3770] dark:bg-[#1e2a55]',
              materia.estado === 'DESAPROBADA' && 'border-[#b42318]/40 bg-[#fdecea] text-[#7a1a10] dark:bg-[#b42318]/20 dark:text-[#f7b4a8]',
              materia.estado === 'PENDIENTE' && 'border-border bg-card text-foreground',
              materia.proximoExamen && materia.estado !== 'APROBADA' && 'border-2 border-[#d8b858]',
            )}
          >
            {materia.estado === 'APROBADA' ? (
              <CircleCheck className="size-4 shrink-0 text-[#d8b858]" aria-label="Aprobada" />
            ) : materia.estado === 'DESAPROBADA' ? (
              <CircleX className="size-4 shrink-0" aria-label="Desaprobada" />
            ) : (
              <CircleDashed className="size-4 shrink-0 text-muted-foreground" aria-label="Pendiente" />
            )}
            <span className="truncate">{materia.nombre}</span>
            {materia.estado !== 'PENDIENTE' && materia.nota !== null && <span className="opacity-75 tabular-nums">{nota(materia.nota)}</span>}
            {materia.proximoExamen && materia.estado !== 'APROBADA' && (
              <span className="font-semibold whitespace-nowrap text-[#6b5414] dark:text-[#e8c66a]">· {fechaCorta(materia.proximoExamen)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MapaDelPrograma({ curso }: { curso: MiCurso }) {
  const esMovil = useIsMobile() === true
  const totalSub = curso.fases.reduce((total, fase) => total + fase.subfases.length, 0)
  const completas = curso.fases.reduce(
    (total, fase) => total + fase.subfases.filter((subfase) => subfase.estado === 'COMPLETA').length,
    0,
  )
  return (
    <section
      aria-labelledby="titulo-programa"
      className="rounded-2xl bg-card p-5 shadow-[0_10px_40px_rgb(16_26_60/0.07)] ring-1 ring-foreground/5 md:p-6 dark:shadow-none dark:ring-foreground/10"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="titulo-programa" className="font-heading text-xl font-bold tracking-wide uppercase">
          Programa PDI EA-510
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {completas} de {totalSub} sub fases completas · vuelo {horas(curso.horas.vuelo)} de {horas(curso.horas.programa)}
        </p>
      </div>
      <Tierra tierra={curso.tierra} />
      <div
        className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(var(--fases),minmax(0,1fr))]"
        style={{ '--fases': Math.max(curso.fases.length, 1) } as React.CSSProperties}
      >
        {curso.fases.map((fase, indice) => {
          const completas = fase.subfases.filter((subfase) => subfase.estado === 'COMPLETA').length
          const actual = fase.subfases.some((subfase) => subfase.estado === 'EN_CURSO')
          return (
            <ColumnaDeFase
              key={fase.id}
              titulo={fase.nombre}
              detalle={`Fase ${indice + 1} · ${completas} de ${fase.subfases.length} sub ${fase.subfases.length === 1 ? 'fase' : 'fases'}`}
              plegada={esMovil && !actual}
            >
              {fase.subfases.map((subfase) => (
                <Celda key={subfase.id} estado={subfase.estado}>
                  <span className="font-semibold">{subfase.nombre}</span>
                  <span
                    className={cn(
                      'flex flex-wrap gap-x-1 text-xs',
                      subfase.estado === 'COMPLETA' ? 'text-[#c3c9db]' : subfase.estado === 'EN_CURSO' ? 'text-[#4d3f12]' : 'text-muted-foreground',
                    )}
                  >
                    <span className={cn('whitespace-nowrap', subfase.estado === 'EN_CURSO' && 'font-semibold')}>
                      {subfase.estado === 'PENDIENTE' && subfase.evaluadas > 0 ? 'Iniciada' : ETIQUETA_ESTADO[subfase.estado]}
                    </span>
                    {subfase.misiones > 0 && (
                      <span className="whitespace-nowrap">
                        · {subfase.evaluadas} de {subfase.misiones} misiones
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <Puntos total={subfase.misiones} hechos={subfase.evaluadas} estado={subfase.estado} />
                    {subfase.promedio !== null && (
                      <span className="font-heading text-sm font-bold tabular-nums">{nota(subfase.promedio)}</span>
                    )}
                  </span>
                </Celda>
              ))}
            </ColumnaDeFase>
          )
        })}
      </div>
    </section>
  )
}

const ORO = `${ENLACE} text-[#d8b858] hover:text-white focus-visible:ring-2 focus-visible:ring-[#d8b858] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101a3c] focus-visible:outline-none`

function FinDelCurso({ final, codAlumno }: { final: NonNullable<MiCurso['final']>; codAlumno: string }) {
  if (final.situacion !== 'EGRESADO')
    return (
      <PaseVacio
        titulo="Curso"
        mensaje={`Tu situación final es ${ETIQUETA_SITUACION[final.situacion].toLowerCase()}${final.fecha ? ` desde el ${fechaCorta(final.fecha)}` : ''}.${final.observacion ? ` ${final.observacion}` : ''}`}
      />
    )
  const faltan = final.ficha?.faltan ?? []
  return (
    <>
      <Pase
        titulo="Egresaste"
        fecha={final.fecha ? fechaCorta(final.fecha) : '—'}
        segmentos={[
          { etiqueta: 'Constancia', valor: final.constancia ?? '—' },
          { etiqueta: 'NFPI', valor: nota(final.nfpi) },
          { etiqueta: 'Orden de mérito', valor: final.puesto ? `${final.puesto}.º de ${final.egresados}` : '—' },
        ]}
        accion={
          <Link to="/constancias/$cod" params={{ cod: codAlumno }} className={ORO}>
            Ver constancia
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      {final.ficha && (
        <Panel titulo="Tu licencia PP-H">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start">
            <div className="grid gap-3">
              <RutaDeLicencia estado={final.ficha.estado} />
              <p className="text-[13px] text-muted-foreground">
                El examen teórico y la pericia se rinden ante la DGAC después del curso. La Coordinación Académica lleva tu ficha.
              </p>
            </div>
            {faltan.length === 0 ? (
              <Vacio>Cumples todos los requisitos registrados.</Vacio>
            ) : (
              <div className="grid gap-2">
                <h3 className="font-heading text-sm font-bold tracking-wide uppercase">Te falta</h3>
                <ul className="grid gap-1.5 text-sm">
                  {faltan.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>
      )}
    </>
  )
}

export function MiCursoPage({ codAlumno }: { codAlumno: string }) {
  const { data: curso } = useSuspenseQuery(consultasAula.curso(codAlumno))
  const cohorte = curso.cohorte
  const turno = curso.proximoTurno

  return (
    <>
      <CabeceraDelAula
        titulo="Mi curso"
        detalle={
          cohorte
            ? [`PDI EA-510`, cohorte.nombre, cohorte.instructor && `Instructor ${cohorte.instructor}`].filter(Boolean).join(' · ')
            : 'Aún no tienes cohorte asignada.'
        }
        dia={curso.final ? null : (cohorte?.diaDelCurso ?? null)}
        diasDelPlan={cohorte?.diasDelPlan ?? 81}
        fin={cohorte?.fechaFin ?? null}
      />

      <div className="grid gap-6">
          {curso.final ? (
            <FinDelCurso final={curso.final} codAlumno={curso.alumno.codigo} />
          ) : turno ? (
            <Pase
              titulo="Próximo turno"
              fecha={fechaCorta(turno.fecha)}
              segmentos={[
                { etiqueta: 'Hora', valor: `${turno.horaInicio}–${turno.horaFin}` },
                { etiqueta: 'Aeronave', valor: turno.aeronave ?? '—' },
                {
                  etiqueta: 'Misión',
                  valor: turno.mision ? `${turno.mision}${turno.horasMision ? ` · ${horas(turno.horasMision)}` : ''}` : turno.subfase ?? '—',
                },
                { etiqueta: 'Instructor', valor: turno.instructor ?? '—' },
              ]}
              accion={
                <Link
                  to="/turnos/$id/briefing/$alumno"
                  params={{ id: String(turno.id), alumno: curso.alumno.codigo }}
                  className={ORO}
                >
                  Ver briefing
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
          ) : (
            <PaseVacio titulo="Próximo turno" mensaje="No tienes turnos de vuelo programados." />
          )}
          <MapaDelPrograma curso={curso} />

        <aside className="grid gap-4 md:grid-cols-3 md:items-start" aria-label="Resumen">
          <Panel titulo="Notas recientes">
            {curso.notasRecientes.length === 0 ? (
              <Vacio>Todavía no hay notas.</Vacio>
            ) : (
              <Filas>
                {curso.notasRecientes.map((fila) => (
                  <Fila
                    key={`${fila.tipo}-${fila.titulo}-${fila.fecha}`}
                    izquierda={
                      <>
                        <span className="block truncate text-foreground">{fila.titulo}</span>
                        <span className="text-xs text-muted-foreground">
                          {fila.tipo === 'VUELO' ? 'Vuelo' : 'Tierra'} · {fechaCorta(fila.fecha)}
                        </span>
                      </>
                    }
                    derecha={
                      <>
                        {nota(fila.nota)}
                        {fila.resultado && <span className="block text-xs font-medium text-muted-foreground">{fila.resultado}</span>}
                      </>
                    }
                  />
                ))}
              </Filas>
            )}
          </Panel>
          <Panel titulo="Por rendir">
            {curso.porRendir.length === 0 ? (
              <Vacio>No tienes exámenes programados.</Vacio>
            ) : (
              <Filas>
                {curso.porRendir.map((examen) => (
                  <Fila
                    key={examen.idTurnoTeorico}
                    izquierda={<span className="text-foreground">{examen.materia}</span>}
                    derecha={`${fechaCorta(examen.fecha)}${examen.horaInicio ? ` · ${examen.horaInicio}` : ''}`}
                  />
                ))}
              </Filas>
            )}
            <Link to="/examenes" className={`${ENLACE} mt-4 text-foreground underline decoration-[#d8b858] decoration-2 underline-offset-4 hover:decoration-[#101a3c] dark:hover:decoration-white`}>
              Mis exámenes
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Panel>
          <Panel titulo="Mis horas">
            <Filas>
              <Fila izquierda="Vuelo con instructor" derecha={horas(curso.horas.vuelo)} />
              <Fila izquierda="Simulador" derecha={horas(curso.horas.simulador)} />
              <Fila izquierda="NFPI" derecha={nota(curso.final?.nfpi ?? curso.nfpi)} />
            </Filas>
          </Panel>
        </aside>
      </div>
    </>
  )
}

import { http, HttpResponse } from 'msw'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { API, autorizar, erroresDeCampo, textoNoEncontrado, textoProhibido } from './comun'
import {
  alumnosHabilitados,
  buscarMateria,
  buscarPersona,
  buscarTurnoTeorico,
  datos,
  desaprobadosSinSubsanar,
  nombreCompleto,
  rolPorId,
  usuarioDePersona,
  type PersonaMock,
} from './datos'
import { D15_SOLO_LO_PROPIO, D27_PERSONA_NO_EXISTE } from './cuestionarios-teoria'
import { estadoDelTurno } from './turnos-teoricos'

export const D15_AL_MENOS_UN_CODIGO = 'Debe enviar al menos un código de alumno.'
export const D16_MAXIMO_CIEN = 'No se pueden consultar más de 100 alumnos a la vez.'

const GRUPO_PERIODICOS_GENERALES = [
  'Ingeniería del Helicóptero',
  'Adoctrinamiento de Vuelo',
  'Aerodinámica Aplicada a Helicópteros',
  'Meteorología',
  'Fraseología Aeronáutica en Inglés',
]

type CausalMock = {
  codigo: string
  idMateria: number | null
  materia: string | null
  grupo: string[] | null
  detalle: string
  fecha: string
}

function causalesDe(cod: string, hoy: string): CausalMock[] {
  if (cod !== '111111') return []
  return [
    {
      codigo: 'PROMEDIO_ASIGNATURA',
      idMateria: 3,
      materia: buscarMateria(3)?.nombre ?? '',
      grupo: null,
      detalle: 'Nota de asignatura 12.50 en Adoctrinamiento de Vuelo, por debajo de 13.',
      fecha: sumarDias(hoy, -7),
    },
    {
      codigo: 'PROMEDIO_ASIGNATURA',
      idMateria: 2,
      materia: buscarMateria(2)?.nombre ?? '',
      grupo: null,
      detalle: 'Nota de asignatura 11.80 en Ingeniería del Helicóptero, por debajo de 13.',
      fecha: sumarDias(hoy, -7),
    },
    {
      codigo: 'PERIODICOS_GENERALES',
      idMateria: 2,
      materia: buscarMateria(2)?.nombre ?? '',
      grupo: GRUPO_PERIODICOS_GENERALES,
      detalle: '3 desaprobados consecutivos en periódicos de Ingeniería del Helicóptero.',
      fecha: sumarDias(hoy, -5),
    },
    {
      codigo: 'TRES_ASIGNATURAS',
      idMateria: null,
      materia: null,
      grupo: null,
      detalle: '3 asignaturas desaprobadas.',
      fecha: sumarDias(hoy, -5),
    },
  ]
}

export function motivoDeBloqueo(codAlumno: string): string | null {
  const desaprobado = desaprobadosSinSubsanar(codAlumno)[0]
  if (!desaprobado) return null
  const turno = buscarTurnoTeorico(desaprobado.idTurnoTeorico)
  return `Desaprobó ${turno?.nombre ?? ''} (${(desaprobado.nota ?? 0).toFixed(2)} / mínimo ${desaprobado.notaMinimaAplicada}). Subsanación pendiente.`
}

export function resumenDeEstadoTeorico(cod: string, persona: PersonaMock) {
  const desaprobados = desaprobadosSinSubsanar(cod)
  return {
    codAlumno: cod,
    alumno: nombreCompleto(persona),
    bloqueadoPorSubsanacion: desaprobados.length > 0,
    motivo: motivoDeBloqueo(cod),
    desaprobados: desaprobados.map((cuestionario) => {
      const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
      const materia = turno ? buscarMateria(turno.idMateria) : undefined
      return {
        idCuestionario: cuestionario.id,
        idTurnoTeorico: cuestionario.idTurnoTeorico,
        turnoTeorico: turno?.nombre ?? '',
        idMateria: turno?.idMateria ?? 0,
        materia: materia?.nombre ?? '',
        tipoExamen: turno?.tipoExamen ?? 'TEST',
        fechaExamen: turno?.fechaExamen ?? '',
        nota: cuestionario.nota,
        notaMinimaAplicada: cuestionario.notaMinimaAplicada,
      }
    }),
    pendientes: datos()
      .turnosTeoricos.filter((turno) => turno.tipoExamen === 'SUBSANACION' || turno.tipoExamen === 'REZAGADO')
      .filter((turno) => estadoDelTurno(turno) !== 'FINALIZADO')
      .filter((turno) => alumnosHabilitados(turno).some((alumno) => alumno.codigo === cod))
      .map((turno) => ({
        idTurnoTeorico: turno.id,
        nombre: turno.nombre,
        tipoExamen: turno.tipoExamen,
        idMateria: turno.idMateria,
        materia: buscarMateria(turno.idMateria)?.nombre ?? '',
        fechaExamen: turno.fechaExamen,
        horaInicio: turno.horaInicio,
        horaFin: turno.horaFin,
      })),
  }
}

export const handlersEstadoTeorico = [
  http.get(`${API}/api/estado-teorico`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const codigos = (new URL(request.url).searchParams.get('codAlumnos') ?? '')
      .split(',')
      .map((valor) => valor.trim())
      .filter((valor) => valor !== '')
    if (codigos.length === 0) return erroresDeCampo([`'codAlumnos': ${D15_AL_MENOS_UN_CODIGO}`])
    if (codigos.length > 100) return erroresDeCampo([`'codAlumnos': ${D16_MAXIMO_CIEN}`])
    return HttpResponse.json(
      codigos.flatMap((cod) => {
        const persona = buscarPersona(cod)
        return persona ? [resumenDeEstadoTeorico(cod, persona)] : []
      }),
    )
  }),
  http.get(`${API}/api/personas/:cod/estado-teorico`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    const persona = buscarPersona(cod)
    if (!persona) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    const esAlumno = rolPorId(usuarioDePersona(permitido.codPersona)?.idRol ?? null)?.nombre === 'Alumno'
    if (esAlumno && permitido.codPersona !== cod) return textoProhibido(D15_SOLO_LO_PROPIO)
    return HttpResponse.json({ ...resumenDeEstadoTeorico(cod, persona), causales: causalesDe(cod, hoyIso()) })
  }),
]

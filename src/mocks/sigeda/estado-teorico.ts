import { http, HttpResponse } from 'msw'
import { API, autorizar, textoNoEncontrado, textoProhibido } from './comun'
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
} from './datos'
import { D15_SOLO_LO_PROPIO, D27_PERSONA_NO_EXISTE } from './cuestionarios-teoria'
import { estadoDelTurno } from './turnos-teoricos'

export function motivoDeBloqueo(codAlumno: string): string | null {
  const desaprobado = desaprobadosSinSubsanar(codAlumno)[0]
  if (!desaprobado) return null
  const turno = buscarTurnoTeorico(desaprobado.idTurnoTeorico)
  return `Desaprobó ${turno?.nombre ?? ''} (${(desaprobado.nota ?? 0).toFixed(2)} / mínimo ${desaprobado.notaMinimaAplicada}). Subsanación pendiente.`
}

export const handlersEstadoTeorico = [
  http.get(`${API}/api/personas/:cod/estado-teorico`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    const persona = buscarPersona(cod)
    if (!persona) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    const esAlumno = rolPorId(usuarioDePersona(permitido.codPersona)?.idRol ?? null)?.nombre === 'Alumno'
    if (esAlumno && permitido.codPersona !== cod) return textoProhibido(D15_SOLO_LO_PROPIO)
    const desaprobados = desaprobadosSinSubsanar(cod)
    return HttpResponse.json({
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
    })
  }),
]

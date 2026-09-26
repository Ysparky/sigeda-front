import { http } from 'msw'
import { permisosDeRol } from '@/lib/auth/permisos'
import { hoyIso } from '@/lib/dominio/calendario'
import { criterioDeFase, ordinalDeSeveridad, TIPOS_ALERTA } from '@/lib/dominio/seguimiento'
import { API, autorizar, paginarOrdenado, textoNoEncontrado, textoProhibido } from './comun'
import { bloqueadoPorSubsanacion, buscarTurnoTeorico, datos, desaprobadosSinSubsanar, gruposDeInstructor, nombreCompleto, rolPorId, type PersonaMock } from './datos'
import { criterioCumplido, ramaCumplida, replayDeResultados } from './desaprobados'
import { causalesDe, motivoDeBloqueo } from './estado-teorico'

export const D10_SIN_ALERTAS = 'No existen alertas disponibles.'
export const D17_GRUPO_FUERA_DE_ALCANCE = 'No tiene permiso para ver este grupo.'
export const D18_GRUPO_NO_EXISTE = 'Grupo especificada no existe.'

const ORDENABLES = ['severidad', 'fecha', 'tipo', 'alumno'] as const

const SEVERIDAD_POR_ESTADO: Record<string, string> = {
  'En Deliberación': 'ALTA',
  'No Apto': 'ALTA',
  'En Chequeo': 'MEDIA',
  'En Final': 'MEDIA',
  'En Complementación': 'MEDIA',
  'En Observación': 'BAJA',
}

type Alerta = {
  id: string
  tipo: string
  severidad: string
  codAlumno: string
  alumno: string
  idGrupo: number | null
  grupo: string
  programa: string
  fecha: string | null
  detalle: string
  codEvaluacion: string | null
  idSubfase: number | null
  idMateria: number | null
  idCuestionario: number | null
  causal: string | null
}

function ultima(codPersona: string) {
  return datos()
    .evaluaciones.filter((evaluacion) => evaluacion.codPersona === codPersona)
    .toSorted(
      (izquierda, derecha) => izquierda.fecha.localeCompare(derecha.fecha) || izquierda.codigo.localeCompare(derecha.codigo),
    )
    .at(-1)
}

function base(persona: PersonaMock) {
  const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
  return {
    codAlumno: persona.codigo,
    alumno: nombreCompleto(persona),
    idGrupo: persona.idGrupo,
    grupo: grupo?.nombre ?? '',
    programa: grupo?.programa ?? 'PDI',
    codEvaluacion: null,
    idSubfase: null,
    idMateria: null,
    idCuestionario: null,
    causal: null,
  }
}

function alertasDe(persona: PersonaMock): Alerta[] {
  const filas: Alerta[] = []
  const comun = base(persona)
  if (bloqueadoPorSubsanacion(persona.codigo)) {
    const desaprobado = desaprobadosSinSubsanar(persona.codigo)[0]
    const turno = desaprobado === undefined ? undefined : buscarTurnoTeorico(desaprobado.idTurnoTeorico)
    filas.push({
      ...comun,
      id: `SUBSANACION_PENDIENTE:${persona.codigo}:${desaprobado?.id ?? ''}`,
      tipo: 'SUBSANACION_PENDIENTE',
      severidad: 'ALTA',
      fecha: turno?.fechaExamen ?? null,
      detalle: motivoDeBloqueo(persona.codigo) ?? '',
      idMateria: turno?.idMateria ?? null,
      idCuestionario: desaprobado?.id ?? null,
    })
  }
  if (persona.estado !== 'Apto') {
    filas.push({
      ...comun,
      id: `ESTADO_CRITICO:${persona.codigo}`,
      tipo: 'ESTADO_CRITICO',
      severidad: SEVERIDAD_POR_ESTADO[persona.estado] ?? 'MEDIA',
      fecha: ultima(persona.codigo)?.fecha ?? null,
      detalle: `El alumno está ${persona.estado}.`,
    })
  } else {
    const ultimaEvaluacion = ultima(persona.codigo)
    const fase = ultimaEvaluacion?.fase ?? ''
    const criterio = criterioDeFase(fase)
    if (criterioCumplido(criterio, persona.contMalo, persona.contRegular)) {
      filas.push({
        ...comun,
        id: `CHEQUEO_PENDIENTE:${persona.codigo}`,
        tipo: 'CHEQUEO_PENDIENTE',
        severidad: 'MEDIA',
        fecha: ultimaEvaluacion?.fecha ?? null,
        detalle: `Cumple el criterio de chequeo de ${fase}: ${ramaCumplida(criterio, persona.contMalo, persona.contRegular) ?? ''}.`,
        idSubfase: ultimaEvaluacion?.idSubFase ?? null,
      })
    }
  }
  for (const causal of causalesDe(persona.codigo, hoyIso())) {
    filas.push({
      ...comun,
      id: `CAUSAL_TEORICO:${persona.codigo}:${causal.codigo}:${causal.idMateria ?? ''}`,
      tipo: 'CAUSAL_TEORICO',
      severidad: 'MEDIA',
      fecha: causal.fecha,
      detalle: causal.detalle,
      idMateria: causal.idMateria,
      causal: causal.codigo,
    })
  }
  for (const desaprobado of replayDeResultados().desaprobados.filter((fila) => fila.codPersona === persona.codigo)) {
    filas.push({
      ...comun,
      id: `VUELO_DESAPROBADO:${desaprobado.codigo}`,
      tipo: 'VUELO_DESAPROBADO',
      severidad: 'BAJA',
      fecha: desaprobado.fecha,
      detalle: `Vuelo ${desaprobado.clasificacion} en ${desaprobado.subfase}.`,
      codEvaluacion: desaprobado.codigo,
      idSubfase: desaprobado.idSubfase,
    })
  }
  return filas
}

function tieneVistaTotal(idRol: number | null): boolean {
  return permisosDeRol(rolPorId(idRol)?.nombre ?? '').has('View All Groups')
}

function esTipoConocido(valor: string): boolean {
  return TIPOS_ALERTA.some((tipo) => tipo.valor === valor)
}

export const handlersSeguimiento = [
  http.get(`${API}/api/seguimiento/alertas`, ({ request }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const programa = (url.searchParams.get('programa') ?? 'PDI').toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
    const alcance = tieneVistaTotal(permitido.idRol)
      ? new Set(datos().grupos.filter((grupo) => grupo.programa === programa).map((grupo) => grupo.id))
      : gruposDeInstructor(permitido.codPersona, programa)
    const idGrupoCrudo = url.searchParams.get('idGrupo')
    if (idGrupoCrudo !== null && idGrupoCrudo !== '') {
      const idGrupo = Number(idGrupoCrudo)
      if (!datos().grupos.some((grupo) => grupo.id === idGrupo)) return textoNoEncontrado(D18_GRUPO_NO_EXISTE)
      if (!alcance.has(idGrupo)) return textoProhibido(D17_GRUPO_FUERA_DE_ALCANCE)
    }
    const tipo = url.searchParams.get('tipo') ?? ''
    const fechaPre = url.searchParams.get('fechaPre') ?? ''
    const fechaPost = url.searchParams.get('fechaPost') ?? ''
    const filas = datos()
      .personas.filter((persona) => persona.tipo === 'Alumno' && persona.idGrupo !== null && alcance.has(persona.idGrupo))
      .flatMap(alertasDe)
      .filter((alerta) => alerta.programa === programa)
      .filter((alerta) => idGrupoCrudo === null || idGrupoCrudo === '' || alerta.idGrupo === Number(idGrupoCrudo))
      .filter((alerta) => tipo === '' || alerta.tipo === tipo || !esTipoConocido(tipo))
      .filter((alerta) => fechaPre === '' || (alerta.fecha ?? '') >= fechaPre)
      .filter((alerta) => fechaPost === '' || (alerta.fecha ?? '') <= fechaPost)
      .toSorted(
        (izquierda, derecha) =>
          ordinalDeSeveridad(izquierda.severidad) - ordinalDeSeveridad(derecha.severidad) ||
          (derecha.fecha ?? '').localeCompare(izquierda.fecha ?? ''),
      )
    return paginarOrdenado(filas, url, {
      nombreLista: 'alertas',
      ordenables: ORDENABLES,
      propiedadPorDefecto: 'severidad',
    })
  }),
]

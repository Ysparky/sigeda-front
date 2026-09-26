import { http, HttpResponse } from 'msw'
import { permisosDeRol } from '@/lib/auth/permisos'
import { API, autorizar, paginarOrdenado, textoNoEncontrado, textoProhibido } from './comun'
import { D2_PERSONA_NO_EXISTE } from './alumnos'
import { buscarPersona, datos, gruposDeInstructor, nombreCompleto, rolPorId, type PersonaMock } from './datos'

export const D12_SIN_ALUMNOS_CON_INDICES = 'No existen alumnos con índices disponibles.'
export const D17_FUERA_DE_ALCANCE = 'No tiene permiso para ver este grupo.'
export const D18_GRUPO_NO_EXISTE = 'Grupo especificada no existe.'

const MOTIVO_SIN_FASES = 'Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.'
const MOTIVO_SIN_DATOS = 'No tiene evaluaciones registradas.'

const CATEGORIAS_PONDERADAS = new Set(['Ponderada', 'Chequeo Sub Fase'])

const FASES = [
  { fase: 'Adaptación', sigla: 'NFAD', peso: 0.4 },
  { fase: 'Operaciones HeliTransportadas', sigla: 'NFOH', peso: 0.35 },
  { fase: 'Operaciones AeroTácticas', sigla: 'NFOA', peso: 0.25 },
] as const

const SUBFASES_NFAD = [
  { idSubfase: 1, sigla: 'C', peso: 0.25 },
  { idSubfase: 2, sigla: 'N', peso: 0.25 },
  { idSubfase: 3, sigla: 'I', peso: 0.2 },
  { idSubfase: 5, sigla: 'F', peso: 0.15 },
  { idSubfase: 4, sigla: 'CX', peso: 0.15 },
] as const

const ASIGNATURAS_CON_NOTA = [1, 2, 3]

type Fijacion = {
  nfad: number | null
  nfoh: number | null
  nfoa: number | null
  nia: number | null
  nct: number | null
  nei: number | null
  nit: number | null
  nfpi: number | null
}

const FIJACIONES: Record<string, Fijacion> = {
  '222222': { nfad: 18, nfoh: 17, nfoa: 16, nia: 17.15, nct: 17, nei: 18, nit: 17.2, nfpi: 17.16 },
  '555555': { nfad: 17, nfoh: 16, nfoa: 15, nia: 16.15, nct: 18, nei: 16, nit: 17.6, nfpi: 16.44 },
  '999999': { nfad: 16, nfoh: 15, nfoa: 15, nia: 15.4, nct: 15, nei: 14, nit: 14.8, nfpi: 15.28 },
  '111111': { nfad: 16, nfoh: 15, nfoa: 14, nia: 15.15, nct: 16, nei: 15, nit: 15.8, nfpi: 15.28 },
  '777777': { nfad: 13, nfoh: 13, nfoa: 12, nia: 12.75, nct: 14, nei: 13, nit: 13.8, nfpi: 12.96 },
  '666666': { nfad: 14, nfoh: null, nfoa: null, nia: null, nct: 13, nei: 12, nit: 12.8, nfpi: null },
  '654321': { nfad: null, nfoh: null, nfoa: null, nia: null, nct: null, nei: null, nit: null, nfpi: null },
}

const SIN_DATOS: Fijacion = FIJACIONES['654321']

function misiones(codPersona: string, idSubfase: number): number {
  return datos().evaluaciones.filter(
    (evaluacion) =>
      evaluacion.codPersona === codPersona &&
      evaluacion.idSubFase === idSubfase &&
      CATEGORIAS_PONDERADAS.has(evaluacion.categoria),
  ).length
}

function dosDecimales(valor: number | null): number | null {
  return valor === null ? null : Number(valor.toFixed(2))
}

function bloqueNit(fijacion: Fijacion) {
  const materias = datos().materias
  const conNota = materias.filter((materia) => ASIGNATURAS_CON_NOTA.includes(materia.id))
  const suma = conNota.reduce((total, materia) => total + materia.coeficiente, 0)
  return {
    valor: dosDecimales(fijacion.nit),
    nct: dosDecimales(fijacion.nct),
    nei: dosDecimales(fijacion.nei),
    neiEvaluaciones: fijacion.nei === null ? 0 : 4,
    asignaturas:
      fijacion.nct === null
        ? []
        : conNota.map((materia) => ({
            idMateria: materia.id,
            materia: materia.nombre,
            coeficiente: materia.coeficiente,
            coeficienteAplicado: Number((materia.coeficiente / suma).toFixed(4)),
            pe: dosDecimales(fijacion.nct),
            pt: dosDecimales(fijacion.nct),
            na: dosDecimales(fijacion.nct),
          })),
    asignaturasSinNota: materias
      .filter((materia) => !ASIGNATURAS_CON_NOTA.includes(materia.id))
      .map((materia) => materia.nombre),
    reduccionPorRezagadoAplicada: false,
  }
}

function bloqueNia(persona: PersonaMock, fijacion: Fijacion) {
  const valores: Record<string, number | null> = { NFAD: fijacion.nfad, NFOH: fijacion.nfoh, NFOA: fijacion.nfoa }
  return {
    valor: dosDecimales(fijacion.nia),
    fases: FASES.map((fase) => ({
      fase: fase.fase,
      sigla: fase.sigla,
      peso: fase.peso,
      valor: dosDecimales(valores[fase.sigla]),
      subfases:
        fase.sigla === 'NFAD'
          ? SUBFASES_NFAD.map((subfase) => ({
              idSubfase: subfase.idSubfase,
              subfase: datos().subfases.find((candidata) => candidata.id === subfase.idSubfase)?.nombre ?? '',
              sigla: subfase.sigla,
              peso: subfase.peso,
              nsf: dosDecimales(fijacion.nfad),
              misiones: misiones(persona.codigo, subfase.idSubfase),
            }))
          : [],
    })),
    motivo: fijacion.nia !== null ? null : fijacion.nfad === null ? MOTIVO_SIN_DATOS : MOTIVO_SIN_FASES,
  }
}

function indicesDe(persona: PersonaMock) {
  const fijacion = FIJACIONES[persona.codigo] ?? SIN_DATOS
  return {
    codigo: persona.codigo,
    alumno: nombreCompleto(persona),
    programa: datos().grupos.find((grupo) => grupo.id === persona.idGrupo)?.programa ?? 'PDI',
    nfpi: dosDecimales(fijacion.nfpi),
    nit: bloqueNit(fijacion),
    nia: bloqueNia(persona, fijacion),
  }
}

type FilaMerito = {
  puesto: number | null
  codigo: string
  alumno: string
  idGrupo: number | null
  grupo: string
  nfpi: number | null
  nit: number | null
  nia: number | null
  motivoSinNfpi: string | null
}

function tieneVistaTotal(idRol: number | null): boolean {
  return permisosDeRol(rolPorId(idRol)?.nombre ?? '').has('View All Groups')
}

function filasDeMerito(programa: string, idGrupo: number | null, alcance: ReadonlySet<number> | null): FilaMerito[] {
  const alumnos = datos()
    .personas.filter((persona) => persona.tipo === 'Alumno' && persona.idGrupo !== null)
    .filter((persona) => {
      const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
      if (grupo === undefined || grupo.programa !== programa) return false
      if (idGrupo !== null && grupo.id !== idGrupo) return false
      if (alcance !== null && !alcance.has(grupo.id)) return false
      return true
    })
  const filas = alumnos.map((persona) => {
    const fijacion = FIJACIONES[persona.codigo] ?? SIN_DATOS
    const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
    return {
      puesto: null as number | null,
      codigo: persona.codigo,
      alumno: nombreCompleto(persona),
      idGrupo: persona.idGrupo,
      grupo: grupo?.nombre ?? '',
      nfpi: dosDecimales(fijacion.nfpi),
      nit: dosDecimales(fijacion.nit),
      nia: dosDecimales(fijacion.nia),
      motivoSinNfpi:
        fijacion.nfpi !== null ? null : fijacion.nfad === null ? MOTIVO_SIN_DATOS : MOTIVO_SIN_FASES,
    }
  })
  const rankeables = filas
    .filter((fila) => fila.nfpi !== null)
    .sort(
      (izquierda, derecha) =>
        (derecha.nfpi ?? 0) - (izquierda.nfpi ?? 0) ||
        (derecha.nia ?? 0) - (izquierda.nia ?? 0) ||
        izquierda.codigo.localeCompare(derecha.codigo),
    )
  rankeables.forEach((fila, indice) => {
    fila.puesto = indice + 1
  })
  const sinPuesto = filas.filter((fila) => fila.nfpi === null).sort((a, b) => a.codigo.localeCompare(b.codigo))
  return [...rankeables, ...sinPuesto]
}

const ORDENABLES = new Set(['puesto', 'nfpi', 'nit', 'nia', 'alumno', 'codigo'])

function ordenar(filas: FilaMerito[], propiedad: string, direccion: string): FilaMerito[] {
  if (!ORDENABLES.has(propiedad) || propiedad === 'puesto') return filas
  const signo = direccion === 'DESC' ? -1 : 1
  const rankeables = filas.filter((fila) => fila.puesto !== null)
  const sinPuesto = filas.filter((fila) => fila.puesto === null)
  const comparar = (izquierda: FilaMerito, derecha: FilaMerito) =>
    propiedad === 'alumno' || propiedad === 'codigo'
      ? String(izquierda[propiedad]).localeCompare(String(derecha[propiedad]), 'es')
      : Number(izquierda[propiedad as 'nfpi'] ?? -1) - Number(derecha[propiedad as 'nfpi'] ?? -1)
  return [...[...rankeables].sort((a, b) => signo * comparar(a, b)), ...sinPuesto]
}

export const handlersIndices = [
  http.get(`${API}/api/personas/:cod/indices`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    return HttpResponse.json(indicesDe(persona))
  }),
  http.get(`${API}/api/reportes/orden-merito`, ({ request }) => {
    const permitido = autorizar(request, 'Create Reports')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const programa = (url.searchParams.get('programa') ?? 'PDI').toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
    const idGrupoCrudo = url.searchParams.get('idGrupo')
    const idGrupoPedido = idGrupoCrudo === null || idGrupoCrudo === '' ? null : Number(idGrupoCrudo)
    const alcance = tieneVistaTotal(permitido.idRol) ? null : gruposDeInstructor(permitido.codPersona, programa)
    if (idGrupoPedido !== null) {
      const grupoExiste = datos().grupos.some((grupo) => grupo.id === idGrupoPedido)
      if (!grupoExiste) return textoNoEncontrado(D18_GRUPO_NO_EXISTE)
      if (alcance !== null && !alcance.has(idGrupoPedido)) return textoProhibido(D17_FUERA_DE_ALCANCE)
    }
    const filas = ordenar(
      filasDeMerito(programa, idGrupoPedido, alcance),
      url.searchParams.get('property') ?? 'puesto',
      (url.searchParams.get('direction') ?? 'ASC').toUpperCase(),
    )
    return paginarOrdenado(filas, url, {
      nombreLista: 'alumnos con índices',
      ordenables: [...ORDENABLES],
      propiedadPorDefecto: 'puesto',
    })
  }),
]

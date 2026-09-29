import { http, HttpResponse } from 'msw'
import { permisosDeRol } from '@/lib/auth/permisos'
import { API, autorizar, paginarOrdenado, textoNoEncontrado, textoProhibido } from './comun'
import { D2_PERSONA_NO_EXISTE } from './alumnos'
import { buscarPersona, datos, gruposDeInstructor, nombreCompleto, rolPorId, usuarioDePersona, type PersonaMock } from './datos'
import { D15_SOLO_LO_PROPIO } from './cuestionarios-teoria'

export const D12_SIN_ALUMNOS_CON_INDICES = 'No existen alumnos con índices disponibles.'
export const D17_FUERA_DE_ALCANCE = 'No tiene permiso para ver este grupo.'
export const D18_GRUPO_NO_EXISTE = 'Grupo especificada no existe.'

const MOTIVO_SIN_FASES =
  'Sin nota en Navegación Visual, Emergencias y Maniobras Avanzadas, Vuelo Nocturno ni en Vuelo por Instrumentos.'
const MOTIVO_SIN_DATOS = 'No tiene evaluaciones registradas.'
const MOTIVO_SIN_MISIONES = 'El alumno no tiene ninguna misión calificada en esta sub fase.'
const MOTIVO_UNIFORME =
  'Ninguna de las misiones calificadas tiene misión del PDI asignada en su turno, así que la nota de sub fase es el promedio simple de las notas.'
// El servidor declara el aviso DOS veces —en la sub fase y en `nia.motivo`— porque quien mira la nota
// de arriba no necesariamente abre el desglose, y por eso `nia.motivo` puede venir con un `nia.valor`
// que no es null. El mock lo reproduce: sin esto la pantalla no tiene con qué ejercitar ese estado.
const MOTIVO_NIA_UNIFORME =
  'El NIA no está ponderado con los coeficientes de misión del PDI: hay sub fases calculadas como promedio simple.'

const CATEGORIAS_PONDERADAS = new Set(['Ponderada', 'Chequeo Sub Fase'])

// LAS CINCO FASES DE LA TABLA 4, con el peso que el servidor PUBLICA: las horas de la fase sobre las
// 94.0 del programa, a cuatro decimales. NO se pueden sumar para comprobarlos y eso es esperado —los de
// las sub fases de Adaptación dan 1.0001—, porque el servidor pondera por HORAS con una sola división
// al final y estos pesos son la cifra que se muestra, no el operando.
const FASES = [
  { fase: 'Adaptación', sigla: 'NFAD', peso: 0.2766 },
  { fase: 'Navegación Visual', sigla: 'NFNV', peso: 0.234 },
  { fase: 'Emergencias y Maniobras Avanzadas', sigla: 'NFEM', peso: 0.1596 },
  { fase: 'Vuelo Nocturno', sigla: 'NFVN', peso: 0.1596 },
  { fase: 'Vuelo por Instrumentos', sigla: 'NFVI', peso: 0.1702 },
] as const

// `cobertura` es la suma de los coeficientes que entraron en el NSF: 1 es la sub fase terminada y
// menos significa que el servidor renormalizó sobre lo volado. `ponderacion: 'uniforme'` marca la
// sub fase cuyos turnos no tienen misión asignada, donde el NSF es un promedio simple. El mock los
// FIJA, como el resto de §9.5, pero cubre los tres estados que la pantalla tiene que distinguir.
const SUBFASES_NFAD = [
  { idSubfase: 1, sigla: 'CB', peso: 0.4231, ponderacion: 'PDI', cobertura: 0.4423 },
  { idSubfase: 2, sigla: 'CM', peso: 0.3462, ponderacion: 'uniforme', cobertura: null },
  { idSubfase: 3, sigla: 'CP', peso: 0.2308, ponderacion: 'PDI', cobertura: 1 },
] as const

const ASIGNATURAS_CON_NOTA = [1, 2, 3]

type Fijacion = {
  nfad: number | null
  nfnv: number | null
  nfem: number | null
  nfvn: number | null
  nfvi: number | null
  nia: number | null
  nct: number | null
  nei: number | null
  nit: number | null
  nfpi: number | null
}

// EL NIA, EL NIT Y EL NFPI SON LOS DE §9.5 Y NO SE TOCAN: el empate de 111111 y 999999 en `nfpi` 15.28
// con `nia` distinto —15.15 contra 15.40— es el fixture del desempate del orden de mérito, y está
// afirmado en una decena de pruebas. LAS CINCO NOTAS DE FASE SÍ SE RECALCULARON, para que ponderadas por
// las horas de la Tabla 4 (26 · 22 · 15 · 15 · 16 sobre 94) den EXACTAMENTE el `nia` de su fila. Las tres
// que había —NFAD, NFOH, NFOA con 0.40/0.35/0.25— ya no cierran contra ninguna fórmula del sistema.
const FIJACIONES: Record<string, Fijacion> = {
  '222222': { nfad: 15.5, nfnv: 17, nfem: 17.5, nfvn: 18.44, nfvi: 18.5, nia: 17.15, nct: 17, nei: 18, nit: 17.2, nfpi: 17.16 },
  '555555': { nfad: 14.5, nfnv: 16, nfem: 16.5, nfvn: 17.44, nfvi: 17.5, nia: 16.15, nct: 18, nei: 16, nit: 17.6, nfpi: 16.44 },
  '999999': { nfad: 13.5, nfnv: 16.5, nfem: 15.5, nfvn: 16.34, nfvi: 16, nia: 15.4, nct: 15, nei: 14, nit: 14.8, nfpi: 15.28 },
  '111111': { nfad: 13.5, nfnv: 15, nfem: 15.5, nfvn: 16.44, nfvi: 16.5, nia: 15.15, nct: 16, nei: 15, nit: 15.8, nfpi: 15.28 },
  '777777': { nfad: 11, nfnv: 13.5, nfem: 12.5, nfvn: 13.6, nfvi: 14, nia: 12.75, nct: 14, nei: 13, nit: 13.8, nfpi: 12.96 },
  '666666': { nfad: 14, nfnv: null, nfem: null, nfvn: null, nfvi: null, nia: null, nct: 13, nei: 12, nit: 12.8, nfpi: null },
  '654321': { nfad: null, nfnv: null, nfem: null, nfvn: null, nfvi: null, nia: null, nct: null, nei: null, nit: null, nfpi: null },
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

function motivoDeSubfase(nsf: number | null, ponderacion: string, cobertura: number | null): string | null {
  if (nsf === null) return MOTIVO_SIN_MISIONES
  if (ponderacion === 'uniforme') return MOTIVO_UNIFORME
  if (cobertura !== null && cobertura !== 1) {
    return `La sub fase está incompleta: los coeficientes de las misiones calificadas suman ${cobertura.toFixed(4)} de 1.0000, así que la nota de sub fase se renormaliza sobre ese total.`
  }
  return null
}

function subfasesDelIndice(persona: PersonaMock, fijacion: Fijacion) {
  return SUBFASES_NFAD.map((subfase) => {
    const nsf = dosDecimales(fijacion.nfad)
    return {
      idSubfase: subfase.idSubfase,
      subfase: datos().subfases.find((candidata) => candidata.id === subfase.idSubfase)?.nombre ?? '',
      sigla: subfase.sigla,
      peso: subfase.peso,
      nsf,
      misiones: misiones(persona.codigo, subfase.idSubfase),
      ponderacion: nsf === null ? null : subfase.ponderacion,
      cobertura: nsf === null || subfase.ponderacion !== 'PDI' ? null : subfase.cobertura,
      motivo: motivoDeSubfase(nsf, subfase.ponderacion, subfase.cobertura),
    }
  })
}

function motivoDelNia(fijacion: Fijacion): string | null {
  if (fijacion.nia === null) return fijacion.nfad === null ? MOTIVO_SIN_DATOS : MOTIVO_SIN_FASES
  return fijacion.nfad === null ? null : MOTIVO_NIA_UNIFORME
}

function bloqueNia(persona: PersonaMock, fijacion: Fijacion) {
  const valores: Record<string, number | null> = {
    NFAD: fijacion.nfad,
    NFNV: fijacion.nfnv,
    NFEM: fijacion.nfem,
    NFVN: fijacion.nfvn,
    NFVI: fijacion.nfvi,
  }
  return {
    valor: dosDecimales(fijacion.nia),
    fases: FASES.map((fase) => ({
      fase: fase.fase,
      sigla: fase.sigla,
      peso: fase.peso,
      valor: dosDecimales(valores[fase.sigla]),
      subfases: fase.sigla === 'NFAD' ? subfasesDelIndice(persona, fijacion) : [],
    })),
    motivo: motivoDelNia(fijacion),
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
    const cod = String(params.cod)
    const persona = buscarPersona(cod)
    if (!persona) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    // §3.1 restringe el legajo ajeno con 403 D11. El mock no lo comprobaba y el servidor sí lo
    // hace desde la tanda D1, así que pedir el legajo de otro pasaba de 200 a 403 solo contra el
    // servidor. Misma forma que estado-teorico.ts, que es la ruta hermana.
    const esAlumno = rolPorId(usuarioDePersona(permitido.codPersona)?.idRol ?? null)?.nombre === 'Alumno'
    if (esAlumno && permitido.codPersona !== cod) return textoProhibido(D15_SOLO_LO_PROPIO)
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

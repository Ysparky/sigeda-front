import { http, HttpResponse } from 'msw'
import { MARCADOR_COMPLETAR, TEXTOS_VERDADERO_FALSO, alternativasRequeridas } from '@/lib/dominio/teoria'
import { API, autorizar, erroresDeCampo, paginar, texto, textoEliminado, textoNoEncontrado } from './comun'
import {
  alternativasDePregunta,
  buscarMateria,
  buscarPersona,
  buscarPregunta,
  datos,
  preguntaEnUso,
  siguienteId,
} from './datos'
import type { DificultadMock, OrigenMock, PreguntaMock, TipoPreguntaMock } from './semilla-teoria'

export const D1_SIN_PREGUNTAS = 'No existen preguntas disponibles.'
export const D2_PREGUNTA_NO_EXISTE = 'Pregunta especificada no existe.'
export const D3_PREGUNTA_EN_USO = 'La pregunta se usa en un turno teórico y no se puede eliminar.'
export const D4_MATERIA_NO_EXISTE = 'Materia especificada no existe.'
export const D18_PREGUNTA_ELIMINADA = 'Pregunta eliminado con éxito.'
export const D20_PREGUNTA_GUARDADA = 'Pregunta guardada con éxito.'
export const D21_PREGUNTAS_GUARDADAS = 'Preguntas guardadas con éxito.'
export const D27_PERSONA_NO_EXISTE = 'Persona especificada no existe.'

const TIPOS: TipoPreguntaMock[] = ['OPCION_MULTIPLE', 'VERDADERO_FALSO', 'COMPLETAR']
const DIFICULTADES: DificultadMock[] = ['BAJA', 'MEDIA', 'ALTA']
const ORIGENES: OrigenMock[] = ['MANUAL', 'IA']

type AlternativaEnviada = { respuesta?: unknown; correcto?: unknown }

type CuerpoPregunta = {
  codInstructor?: unknown
  idMateria?: unknown
  enunciado?: unknown
  tipoPregunta?: unknown
  dificultad?: unknown
  explicacion?: unknown
  alternativas?: unknown
}

type CuerpoLote = { codInstructor?: unknown; preguntas?: unknown }

function normalizar(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function claveDuplicadoDeLote(pregunta: CuerpoPregunta): string {
  return `${texto(pregunta.enunciado).trim().toLowerCase()}|${texto(pregunta.tipoPregunta)}`
}

function esTipo(valor: unknown): valor is TipoPreguntaMock {
  return TIPOS.some((tipo) => tipo === valor)
}

function esDificultad(valor: unknown): valor is DificultadMock {
  return DIFICULTADES.some((dificultad) => dificultad === valor)
}

function alternativasDelCuerpo(valor: unknown): AlternativaEnviada[] {
  return Array.isArray(valor) ? (valor as AlternativaEnviada[]) : []
}

function filaPublica(pregunta: PreguntaMock) {
  return {
    id: pregunta.id,
    idMateria: pregunta.idMateria,
    materia: buscarMateria(pregunta.idMateria)?.nombre ?? '',
    enunciado: pregunta.enunciado,
    tipoPregunta: pregunta.tipoPregunta,
    dificultad: pregunta.dificultad,
    origen: pregunta.origen,
    enUso: preguntaEnUso(pregunta.id),
    cantAlternativas: alternativasDePregunta(pregunta.id).length,
  }
}

function detallePublico(pregunta: PreguntaMock) {
  const materia = buscarMateria(pregunta.idMateria)
  return {
    id: pregunta.id,
    materia: { id: pregunta.idMateria, nombre: materia?.nombre ?? '', notaMinima: materia?.notaMinima ?? 0 },
    enunciado: pregunta.enunciado,
    tipoPregunta: pregunta.tipoPregunta,
    dificultad: pregunta.dificultad,
    explicacion: pregunta.explicacion,
    origen: pregunta.origen,
    codInstructor: pregunta.codInstructor,
    enUso: preguntaEnUso(pregunta.id),
    alternativas: alternativasDePregunta(pregunta.id).map((alternativa) => ({
      id: alternativa.id,
      respuesta: alternativa.respuesta,
      correcto: alternativa.correcto,
    })),
  }
}

function erroresDeAlternativas(cuerpo: CuerpoPregunta, prefijo: string): string[] {
  const alternativas = alternativasDelCuerpo(cuerpo.alternativas)
  const errores: string[] = []
  if (esTipo(cuerpo.tipoPregunta)) {
    const requeridas = alternativasRequeridas(cuerpo.tipoPregunta)
    const textosVf = alternativas.map((alternativa) => texto(alternativa.respuesta))
    if (cuerpo.tipoPregunta === 'OPCION_MULTIPLE' && alternativas.length !== requeridas) {
      errores.push(`'${prefijo}alternativas': Una pregunta de opción múltiple debe tener exactamente 4 alternativas.`)
    } else if (
      cuerpo.tipoPregunta === 'VERDADERO_FALSO' &&
      (alternativas.length !== requeridas || textosVf[0] !== TEXTOS_VERDADERO_FALSO[0] || textosVf[1] !== TEXTOS_VERDADERO_FALSO[1])
    ) {
      errores.push(
        `'${prefijo}alternativas': Una pregunta de verdadero o falso debe tener exactamente las alternativas Verdadero y Falso.`,
      )
    } else if (cuerpo.tipoPregunta === 'COMPLETAR' && alternativas.length !== requeridas) {
      errores.push(
        `'${prefijo}alternativas': Una pregunta de completar debe tener exactamente 1 alternativa con la respuesta esperada.`,
      )
    } else if (alternativas.filter((alternativa) => alternativa.correcto === true).length !== 1) {
      errores.push(`'${prefijo}alternativas': Debe marcar exactamente una alternativa como correcta.`)
    } else {
      const normalizadas = alternativas.map((alternativa) => texto(alternativa.respuesta).trim().toLowerCase())
      if (new Set(normalizadas).size !== normalizadas.length) {
        errores.push(`'${prefijo}alternativas': Las alternativas no pueden repetirse.`)
      }
    }
  }
  alternativas.forEach((alternativa, indice) => {
    const respuesta = texto(alternativa.respuesta)
    if (respuesta.trim() === '') {
      errores.push(`'${prefijo}alternativas[${indice}].respuesta': La respuesta es obligatoria.`)
    } else if (respuesta.length > 200) {
      errores.push(`'${prefijo}alternativas[${indice}].respuesta': La respuesta no puede superar los 200 caracteres.`)
    }
  })
  return errores
}

export function erroresDePregunta(cuerpo: CuerpoPregunta, prefijo = '', conInstructor = true): string[] {
  const errores: string[] = []
  if (conInstructor && !/^\d{6}$/.test(texto(cuerpo.codInstructor))) {
    errores.push("'codInstructor': El código del instructor es obligatorio.")
  }
  if (typeof cuerpo.idMateria !== 'number' || !Number.isInteger(cuerpo.idMateria) || cuerpo.idMateria <= 0) {
    errores.push(`'${prefijo}idMateria': La materia es obligatoria.`)
  }
  const enunciado = texto(cuerpo.enunciado)
  if (enunciado.trim() === '') errores.push(`'${prefijo}enunciado': El enunciado es obligatorio.`)
  else if (enunciado.trim().length < 10 || enunciado.trim().length > 500) {
    errores.push(`'${prefijo}enunciado': El enunciado debe tener entre 10 y 500 caracteres.`)
  } else if (cuerpo.tipoPregunta === 'COMPLETAR' && !enunciado.includes(MARCADOR_COMPLETAR)) {
    errores.push(
      `'${prefijo}enunciado': El enunciado de una pregunta de completar debe incluir el marcador ${MARCADOR_COMPLETAR}.`,
    )
  }
  if (!esTipo(cuerpo.tipoPregunta)) errores.push(`'${prefijo}tipoPregunta': Ingresar tipo de pregunta válido.`)
  if (!esDificultad(cuerpo.dificultad)) errores.push(`'${prefijo}dificultad': Ingresar dificultad válida.`)
  if (texto(cuerpo.explicacion).length > 1000) {
    errores.push(`'${prefijo}explicacion': La explicación no puede superar los 1000 caracteres.`)
  }
  return [...errores, ...erroresDeAlternativas(cuerpo, prefijo)]
}

function guardarAlternativas(idPregunta: number, cuerpo: CuerpoPregunta) {
  const enviadas = alternativasDelCuerpo(cuerpo.alternativas)
  const existentes = alternativasDePregunta(idPregunta)
  enviadas.forEach((alternativa, indice) => {
    const respuesta = texto(alternativa.respuesta).trim()
    const correcto = alternativa.correcto === true
    const actual = existentes[indice]
    if (actual) {
      actual.respuesta = respuesta
      actual.correcto = correcto
      return
    }
    datos().alternativas.push({ id: siguienteId('alternativa'), idPregunta, respuesta, correcto })
  })
  const quitadas = new Set(existentes.slice(enviadas.length).map((alternativa) => alternativa.id))
  if (quitadas.size > 0) {
    datos().alternativas = datos().alternativas.filter((alternativa) => !quitadas.has(alternativa.id))
  }
}

function insertar(cuerpo: CuerpoPregunta, origen: OrigenMock, codInstructor: string): PreguntaMock {
  const pregunta: PreguntaMock = {
    id: siguienteId('pregunta'),
    idMateria: Number(cuerpo.idMateria),
    enunciado: texto(cuerpo.enunciado).trim(),
    tipoPregunta: esTipo(cuerpo.tipoPregunta) ? cuerpo.tipoPregunta : 'OPCION_MULTIPLE',
    dificultad: esDificultad(cuerpo.dificultad) ? cuerpo.dificultad : 'MEDIA',
    explicacion: texto(cuerpo.explicacion).trim() === '' ? null : texto(cuerpo.explicacion).trim(),
    origen,
    codInstructor,
  }
  datos().preguntas.push(pregunta)
  guardarAlternativas(pregunta.id, cuerpo)
  return pregunta
}

function filtradas(url: URL) {
  const idMateria = Number(url.searchParams.get('idMateria'))
  const dificultad = url.searchParams.get('dificultad')
  const tipo = url.searchParams.get('tipo')
  const origen = url.searchParams.get('origen')
  const buscado = normalizar(url.searchParams.get('texto') ?? '')
  return datos()
    .preguntas.filter((pregunta) => (Number.isInteger(idMateria) && idMateria > 0 ? pregunta.idMateria === idMateria : true))
    .filter((pregunta) => (esDificultad(dificultad) ? pregunta.dificultad === dificultad : true))
    .filter((pregunta) => (esTipo(tipo) ? pregunta.tipoPregunta === tipo : true))
    .filter((pregunta) => (ORIGENES.some((valor) => valor === origen) ? pregunta.origen === origen : true))
    .filter((pregunta) => (buscado === '' ? true : normalizar(pregunta.enunciado).includes(buscado)))
    .map(filaPublica)
}

export const handlersPreguntas = [
  http.get(`${API}/api/preguntas`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    return paginar(filtradas(new URL(request.url)), new URL(request.url), {
      nombreLista: 'preguntas',
      propiedadPorDefecto: 'id',
    })
  }),
  http.post(`${API}/api/preguntas/lote`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoLote
    const lista = Array.isArray(cuerpo.preguntas) ? (cuerpo.preguntas as CuerpoPregunta[]) : []
    const errores: string[] = []
    if (!/^\d{6}$/.test(texto(cuerpo.codInstructor))) {
      errores.push("'codInstructor': El código del instructor es obligatorio.")
    }
    if (lista.length === 0) errores.push("'preguntas': Debe enviar al menos una pregunta.")
    else if (lista.length > 20) errores.push("'preguntas': No se pueden importar más de 20 preguntas a la vez.")
    const vistas = new Set<string>()
    lista.forEach((pregunta, indice) => {
      errores.push(...erroresDePregunta(pregunta, `preguntas[${indice}].`, false))
      const clave = claveDuplicadoDeLote(pregunta)
      if (vistas.has(clave)) {
        errores.push(`'preguntas[${indice}].enunciado': La pregunta está repetida en este lote.`)
      }
      vistas.add(clave)
    })
    if (errores.length > 0) return erroresDeCampo(errores)
    if (!buscarPersona(texto(cuerpo.codInstructor))) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    if (lista.some((pregunta) => !buscarMateria(Number(pregunta.idMateria)))) {
      return textoNoEncontrado(D4_MATERIA_NO_EXISTE)
    }
    const creadas = lista.map((pregunta) => insertar(pregunta, 'IA', texto(cuerpo.codInstructor)))
    return HttpResponse.json(
      { mensaje: D21_PREGUNTAS_GUARDADAS, preguntas: creadas.map(detallePublico) },
      { status: 201 },
    )
  }),
  http.post(`${API}/api/preguntas`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoPregunta
    const errores = erroresDePregunta(cuerpo)
    if (errores.length > 0) return erroresDeCampo(errores)
    if (!buscarPersona(texto(cuerpo.codInstructor))) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    if (!buscarMateria(Number(cuerpo.idMateria))) return textoNoEncontrado(D4_MATERIA_NO_EXISTE)
    const pregunta = insertar(cuerpo, 'MANUAL', texto(cuerpo.codInstructor))
    return HttpResponse.json({ mensaje: D20_PREGUNTA_GUARDADA, pregunta: detallePublico(pregunta) }, { status: 201 })
  }),
  http.get(`${API}/api/preguntas/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const pregunta = buscarPregunta(Number(params.id))
    if (!pregunta) return textoNoEncontrado(D2_PREGUNTA_NO_EXISTE)
    return HttpResponse.json(detallePublico(pregunta))
  }),
  http.put(`${API}/api/preguntas/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const pregunta = buscarPregunta(Number(params.id))
    if (!pregunta) return textoNoEncontrado(D2_PREGUNTA_NO_EXISTE)
    const cuerpo = (await request.json()) as CuerpoPregunta
    const errores = erroresDePregunta(cuerpo)
    if (errores.length > 0) return erroresDeCampo(errores)
    if (!buscarPersona(texto(cuerpo.codInstructor))) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    if (!buscarMateria(Number(cuerpo.idMateria))) return textoNoEncontrado(D4_MATERIA_NO_EXISTE)
    pregunta.idMateria = Number(cuerpo.idMateria)
    pregunta.enunciado = texto(cuerpo.enunciado).trim()
    if (esTipo(cuerpo.tipoPregunta)) pregunta.tipoPregunta = cuerpo.tipoPregunta
    if (esDificultad(cuerpo.dificultad)) pregunta.dificultad = cuerpo.dificultad
    pregunta.explicacion = texto(cuerpo.explicacion).trim() === '' ? null : texto(cuerpo.explicacion).trim()
    guardarAlternativas(pregunta.id, cuerpo)
    return HttpResponse.json({ mensaje: D20_PREGUNTA_GUARDADA, pregunta: detallePublico(pregunta) }, { status: 201 })
  }),
  http.delete(`${API}/api/preguntas/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const pregunta = buscarPregunta(Number(params.id))
    if (!pregunta) return textoNoEncontrado(D2_PREGUNTA_NO_EXISTE)
    if (preguntaEnUso(pregunta.id)) return HttpResponse.text(D3_PREGUNTA_EN_USO, { status: 409 })
    datos().preguntas = datos().preguntas.filter((candidata) => candidata.id !== pregunta.id)
    datos().alternativas = datos().alternativas.filter((alternativa) => alternativa.idPregunta !== pregunta.id)
    return textoEliminado('Pregunta')
  }),
]

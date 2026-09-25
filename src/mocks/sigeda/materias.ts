import { http, HttpResponse } from 'msw'
import { API, autorizar, erroresDeCampo, guardado, texto, textoEliminado, textoNoEncontrado } from './comun'
import { datos, materiaEnUso, siguienteId, type MateriaMock, type ParteMock } from './datos'

const PARTES: ParteMock[] = ['PRIMERA_PARTE', 'SEGUNDA_PARTE', 'CULTURA_AERONAUTICA']

type CuerpoMateria = { nombre?: unknown; notaMinima?: unknown; coeficiente?: unknown; parte?: unknown }

function esParte(valor: unknown): valor is ParteMock {
  return PARTES.some((parte) => parte === valor)
}

function erroresDeMateria(cuerpo: CuerpoMateria, idPropia: number | null): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': El nombre es obligatorio")
  else if (nombre.trim().length < 3 || nombre.trim().length > 60) {
    errores.push("'nombre': El nombre debe tener entre 3 y 60 caracteres.")
  } else if (
    datos().materias.some(
      (materia) => materia.id !== idPropia && materia.nombre.toLowerCase() === nombre.trim().toLowerCase(),
    )
  ) {
    errores.push("'nombre': Ya existe una materia con ese nombre.")
  }
  const nota = cuerpo.notaMinima
  if (nota === null || nota === undefined) errores.push("'notaMinima': La nota mínima es obligatoria.")
  else if (typeof nota !== 'number' || !Number.isInteger(nota) || nota < 0 || nota > 20) {
    errores.push("'notaMinima': La nota mínima debe ser un entero entre 0 y 20.")
  }
  const coeficiente = cuerpo.coeficiente
  if (coeficiente === null || coeficiente === undefined) errores.push("'coeficiente': El coeficiente es obligatorio.")
  else if (
    typeof coeficiente !== 'number' ||
    coeficiente < 0 ||
    coeficiente > 1 ||
    Math.round(coeficiente * 100) !== coeficiente * 100
  ) {
    errores.push("'coeficiente': El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.")
  }
  if (!esParte(cuerpo.parte)) errores.push("'parte': Ingresar parte del curso válida.")
  return errores
}

function materiaPublica(materia: MateriaMock) {
  return {
    id: materia.id,
    nombre: materia.nombre,
    notaMinima: materia.notaMinima,
    coeficiente: materia.coeficiente,
    parte: materia.parte,
  }
}

function ordenadas(): MateriaMock[] {
  return [...datos().materias].sort(
    (a, b) => PARTES.indexOf(a.parte) - PARTES.indexOf(b.parte) || a.nombre.localeCompare(b.nombre, 'es'),
  )
}

export const handlersMaterias = [
  http.get(`${API}/api/materias`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const materias = ordenadas()
    if (materias.length === 0) return textoNoEncontrado('No existen materias disponibles.')
    return HttpResponse.json(materias.map(materiaPublica))
  }),
  http.post(`${API}/api/materias`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Subjects')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoMateria
    const errores = erroresDeMateria(cuerpo, null)
    if (errores.length > 0) return erroresDeCampo(errores)
    const materia: MateriaMock = {
      id: siguienteId('materia'),
      nombre: texto(cuerpo.nombre).trim(),
      notaMinima: Number(cuerpo.notaMinima),
      coeficiente: Number(cuerpo.coeficiente),
      parte: esParte(cuerpo.parte) ? cuerpo.parte : 'PRIMERA_PARTE',
    }
    datos().materias.push(materia)
    return guardado('Materia', 'materia', materiaPublica(materia))
  }),
  http.get(`${API}/api/materias/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const materia = datos().materias.find((candidata) => candidata.id === Number(params.id))
    if (!materia) return textoNoEncontrado('Materia especificada no existe.')
    return HttpResponse.json(materiaPublica(materia))
  }),
  http.put(`${API}/api/materias/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Subjects')
    if (permitido instanceof Response) return permitido
    const materia = datos().materias.find((candidata) => candidata.id === Number(params.id))
    if (!materia) return textoNoEncontrado('Materia especificada no existe.')
    const cuerpo = (await request.json()) as CuerpoMateria
    const errores = erroresDeMateria(cuerpo, materia.id)
    if (errores.length > 0) return erroresDeCampo(errores)
    materia.nombre = texto(cuerpo.nombre).trim()
    materia.notaMinima = Number(cuerpo.notaMinima)
    materia.coeficiente = Number(cuerpo.coeficiente)
    materia.parte = esParte(cuerpo.parte) ? cuerpo.parte : materia.parte
    return guardado('Materia', 'materia', materiaPublica(materia))
  }),
  http.delete(`${API}/api/materias/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Subjects')
    if (permitido instanceof Response) return permitido
    const materia = datos().materias.find((candidata) => candidata.id === Number(params.id))
    if (!materia) return textoNoEncontrado('Materia especificada no existe.')
    if (materiaEnUso(materia.id)) {
      return HttpResponse.text('La materia no se puede eliminar, tiene preguntas o turnos teóricos.', { status: 409 })
    }
    datos().materias = datos().materias.filter((candidata) => candidata.id !== materia.id)
    return textoEliminado('Materia')
  }),
]

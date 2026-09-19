# Contrato API — Instrucción en tierra (evaluación teórica)

**Versión:** 1 · 2026-09-19
**Implementa:** `sigeda-back` (Spring Boot)
**Consume:** `sigeda-web` (mientras no exista, el frontend usa mocks MSW con exactamente estas formas)

Fuente del dominio: PDI EA-510 2023, Título II cap. II y Título III cap. I.

## Convenciones

Iguales a las del resto de `sigeda-back`, para que el frontend las trate con el
mismo código:

- Prefijo `/api`, autenticación `Authorization: Bearer <jwt>`, `@PreAuthorize` por permiso.
- Campos en camelCase. Fechas `yyyy-MM-dd`, horas `HH:mm`, instantes ISO-8601.
- Listas paginadas con Spring `Page` y parámetros `page`, `size`, `direction`, `property`.
- `201 { "mensaje": "...", "<entidad>": {...} }` al crear.
- `400` con `["'campo': mensaje", ...]` para errores de validación.
- `404` texto plano para detalle inexistente o lista vacía.
- `409` texto plano cuando la operación no es válida en el estado actual (nuevo en este contrato).

## Permisos nuevos

| Permiso | Roles |
|---|---|
| `Manage Subjects` | Comandante de Escuadrón, Administrador Web |
| `Manage Questions` | Instructor, Administrador Web |
| `Manage Exams` | Instructor, Administrador Web |
| `Take Exams` | Alumno |

Las consultas de materias usan `Read`.

## Enumeraciones

| Enum | Valores |
|---|---|
| `ParteCurso` | `PRIMERA_PARTE`, `SEGUNDA_PARTE`, `CULTURA_AERONAUTICA` |
| `TipoPregunta` | `OPCION_MULTIPLE`, `VERDADERO_FALSO`, `COMPLETAR` |
| `Dificultad` | `BAJA`, `MEDIA`, `ALTA` |
| `TipoExamen` | `TEST`, `EXAMEN`, `SEMANAL`, `QUINCENAL`, `MENSUAL`, `SEMESTRAL`, `INOPINADO`, `PRE_SOLO`, `SUBSANACION`, `REZAGADO`, `BALOTAS` |
| `EstadoTurnoTeorico` | `PROGRAMADO`, `EN_CURSO`, `FINALIZADO` (derivado de fecha y horas) |
| `EstadoCuestionario` | `EN_CURSO`, `ENTREGADO` |
| `EstadoRendicion` | `NO_RINDIO`, `EN_CURSO`, `ENTREGADO` |

## 1. Materias

```
GET    /api/materias                Read              lista completa (no paginada)
GET    /api/materias/{id}           Read
POST   /api/materias                Manage Subjects
PUT    /api/materias/{id}           Manage Subjects
DELETE /api/materias/{id}           Manage Subjects   409 si tiene preguntas o turnos
```

```json
{
  "id": 3,
  "nombre": "Adoctrinamiento de Vuelo",
  "notaMinima": 18,
  "coeficiente": 0.22,
  "parte": "PRIMERA_PARTE"
}
```

Validación: `nombre` 3–60 caracteres, único · `notaMinima` entero 0–20 ·
`coeficiente` 0–1 con 2 decimales · `parte` obligatoria.

Semilla sugerida (PDI, Curso en Tierra primera parte): Aerodinámica Aplicada a
Helicópteros 16/0.13 · Ingeniería del Helicóptero 16/0.16 · Adoctrinamiento de
Vuelo 18/0.22 · Límites de Operación 20/0.10 · Procedimientos Normales 16/0.10 ·
Procedimientos de Emergencias 20/0.10 · Meteorología 16/0.04 · Prevención de
Accidentes 16/0.04 · Normatividad FAP 16/0.04 · Regulaciones Aeronáuticas del
Perú 16/0.04 · Fraseología Aeronáutica en Inglés 16/0.03.

## 2. Banco de preguntas

```
GET    /api/preguntas?idMateria=&dificultad=&tipo=&texto=&page=&size=   Manage Questions
GET    /api/preguntas/{id}                                               Manage Questions
POST   /api/preguntas                                                    Manage Questions
POST   /api/preguntas/lote                                               Manage Questions
PUT    /api/preguntas/{id}                                               Manage Questions
DELETE /api/preguntas/{id}                                               Manage Questions   409 si está en un turno
```

```json
{
  "id": 41,
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo" },
  "enunciado": "¿Cuál es la velocidad de nunca exceder (VNE) del Enstrom 280FX?",
  "dificultad": "MEDIA",
  "tipoPregunta": "OPCION_MULTIPLE",
  "alternativas": [
    { "id": 161, "respuesta": "102 KIAS", "correcto": true },
    { "id": 162, "respuesta": "87 KIAS", "correcto": false },
    { "id": 163, "respuesta": "117 KIAS", "correcto": false },
    { "id": 164, "respuesta": "95 KIAS", "correcto": false }
  ]
}
```

Reglas por tipo:

| Tipo | Alternativas | Correctas |
|---|---|---|
| `OPCION_MULTIPLE` | exactamente 4, textos distintos | exactamente 1 |
| `VERDADERO_FALSO` | exactamente 2: "Verdadero" y "Falso" | exactamente 1 |
| `COMPLETAR` | exactamente 1 (la respuesta esperada); el enunciado contiene `_____` | 1 |

`enunciado` 10–500 caracteres. `POST /lote` recibe `{ "preguntas": [ ...sin id ] }`,
valida todas y guarda todas o ninguna (transacción); responde
`201 { "mensaje", "preguntas": [...] }`. Lo usa la importación desde IA.

## 3. Turnos teóricos

```
GET    /api/turnos-teoricos?idGrupo=&idMateria=&fechaPre=&fechaPost=&page=&size=   Manage Exams
GET    /api/turnos-teoricos/{id}                                                   Manage Exams
POST   /api/turnos-teoricos                                                        Manage Exams
PUT    /api/turnos-teoricos/{id}                                                   Manage Exams   409 si no está PROGRAMADO
DELETE /api/turnos-teoricos/{id}                                                   Manage Exams   409 si no está PROGRAMADO
```

Crear o modificar:

```json
{
  "nombre": "Mensual Adoctrinamiento Octubre",
  "idMateria": 3,
  "tipoExamen": "MENSUAL",
  "fechaExamen": "2026-10-02",
  "horaInicio": "08:00",
  "horaFin": "09:00",
  "idGrupo": 2,
  "idTurnoOrigen": null,
  "preguntas": [
    { "idPregunta": 41, "puntajeMaximo": 4 },
    { "idPregunta": 57, "puntajeMaximo": 4 }
  ]
}
```

Validación:

- `nombre` 10–60 caracteres. `fechaExamen` + `horaInicio` en el futuro. `horaFin` posterior a `horaInicio`.
- `codInstructor` se toma del usuario autenticado; el grupo debe ser uno de los suyos.
- Al menos 1 pregunta, sin repetidas, todas de la materia del turno.
- `puntajeMaximo` entero 1–20 y **la suma debe ser 20** (escala vigesimal).
- `idTurnoOrigen` obligatorio si `tipoExamen` es `SUBSANACION` o `REZAGADO`, prohibido en otro caso; debe ser un turno FINALIZADO de la misma materia y grupo.

Detalle (`GET /{id}`):

```json
{
  "id": 12,
  "nombre": "Mensual Adoctrinamiento Octubre",
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "tipoExamen": "MENSUAL",
  "fechaExamen": "2026-10-02",
  "horaInicio": "08:00",
  "horaFin": "09:00",
  "estado": "FINALIZADO",
  "grupo": { "id": 2, "nombre": "Grupo B" },
  "instructor": { "codigo": "444111", "nombre": "Cap. Pérez" },
  "idTurnoOrigen": null,
  "preguntas": [
    { "idPregunta": 41, "enunciado": "...", "tipoPregunta": "OPCION_MULTIPLE", "puntajeMaximo": 4 }
  ],
  "resultados": [
    { "codAlumno": "100200", "alumno": "Ramos, Luis", "estado": "ENTREGADO", "idCuestionario": 88, "nota": 18.00, "aprobado": true },
    { "codAlumno": "100201", "alumno": "Vega, Ana", "estado": "NO_RINDIO", "idCuestionario": null, "nota": null, "aprobado": null }
  ],
  "resumen": { "rindieron": 1, "aprobados": 1, "notaPromedio": 18.00 }
}
```

`resultados` lista a los alumnos habilitados: todos los del grupo, salvo en
`SUBSANACION` (solo quienes desaprobaron el turno de origen) y `REZAGADO` (solo
quienes no rindieron el turno de origen).

Inasistencia justificada (regla del 50%):

```
PUT /api/turnos-teoricos/{id}/inasistencias/{codAlumno}   Manage Exams
{ "justificada": true }
```

Solo aplica a alumnos `NO_RINDIO` de un turno FINALIZADO. En el `REZAGADO`
correspondiente, la nota de quien no tenga inasistencia justificada se registra
al 50%.

## 4. Rendición del examen (alumno)

```
GET  /api/examenes/pendientes                       Take Exams
POST /api/turnos-teoricos/{id}/iniciar              Take Exams
PUT  /api/cuestionarios/{id}/respuestas             Take Exams
POST /api/cuestionarios/{id}/entregar               Take Exams
GET  /api/cuestionarios/{id}                        Take Exams (propio) · Manage Exams
GET  /api/cuestionarios?codAlumno=&idMateria=&page=  Read (alumno: solo el propio)
```

`GET /examenes/pendientes` devuelve los turnos en los que el alumno está
habilitado, en estado `PROGRAMADO` o `EN_CURSO`, sin cuestionario entregado:

```json
[
  { "id": 12, "nombre": "Mensual Adoctrinamiento Octubre", "materia": "Adoctrinamiento de Vuelo",
    "tipoExamen": "MENSUAL", "fechaExamen": "2026-10-02", "horaInicio": "08:00", "horaFin": "09:00",
    "estado": "PROGRAMADO" }
]
```

`POST /turnos-teoricos/{id}/iniciar`:

- `409` fuera de la ventana horaria, si el alumno no está habilitado o si ya entregó.
- Si ya existe un cuestionario `EN_CURSO` del alumno, lo devuelve (idempotente: recargar la página retoma el examen).
- La respuesta **nunca incluye `correcto`**:

```json
{
  "id": 88,
  "estado": "EN_CURSO",
  "cierraEn": "2026-10-02T09:00:00-05:00",
  "preguntas": [
    {
      "idPregunta": 41,
      "enunciado": "¿Cuál es la velocidad de nunca exceder (VNE) del Enstrom 280FX?",
      "tipoPregunta": "OPCION_MULTIPLE",
      "puntajeMaximo": 4,
      "alternativas": [ { "id": 161, "respuesta": "102 KIAS" }, { "id": 162, "respuesta": "87 KIAS" } ],
      "respuestaAlumno": null
    }
  ]
}
```

En `COMPLETAR`, `alternativas` viene vacío.

`PUT /cuestionarios/{id}/respuestas` (autoguardado, reemplaza las enviadas):

```json
{ "respuestas": [ { "idPregunta": 41, "respuesta": "161" }, { "idPregunta": 57, "respuesta": "rotor de cola" } ] }
```

`respuesta` es el id de la alternativa (como texto) en `OPCION_MULTIPLE` y
`VERDADERO_FALSO`, o el texto escrito en `COMPLETAR`. `409` si el cuestionario
ya fue entregado o la ventana cerró.

`POST /cuestionarios/{id}/entregar` califica y cierra. Calificación:

- Opción múltiple y verdadero/falso: correcta si coincide la alternativa.
- Completar: correcta si coincide con la respuesta esperada ignorando mayúsculas, tildes y espacios extremos.
- `puntajeObtenido` = `puntajeMaximo` si es correcta, 0 si no. `nota` = suma, sobre 20, con 2 decimales.
- `aprobado` = `nota >= materia.notaMinima`.
- Al cerrar la ventana, el backend entrega automáticamente los cuestionarios `EN_CURSO` con lo que tengan guardado.

Resultado (`GET /cuestionarios/{id}`):

```json
{
  "id": 88,
  "turnoTeorico": { "id": 12, "nombre": "Mensual Adoctrinamiento Octubre" },
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "tipoExamen": "MENSUAL",
  "codAlumno": "100200",
  "estado": "ENTREGADO",
  "entregadoEn": "2026-10-02T08:41:12-05:00",
  "nota": 18.00,
  "aprobado": true,
  "calificaciones": [
    { "idPregunta": 41, "enunciado": "...", "respuestaAlumno": "102 KIAS", "respuestaCorrecta": "102 KIAS",
      "correcto": true, "puntajeMaximo": 4, "puntajeObtenido": 4 }
  ]
}
```

Mientras el turno no esté `FINALIZADO`, el alumno solo recibe `nota` y
`aprobado`; `calificaciones` va vacío para no revelar respuestas a quienes aún
rinden.

## 5. Estado teórico del alumno

```
GET /api/personas/{cod}/estado-teorico     Read (alumno: solo el propio)
```

```json
{
  "bloqueadoPorSubsanacion": true,
  "motivo": "Desaprobó Mensual Adoctrinamiento Octubre (15.00 / mínimo 18). Subsanación pendiente.",
  "pendientes": [ { "id": 14, "nombre": "Subsanación Adoctrinamiento Octubre", "tipoExamen": "SUBSANACION", "fechaExamen": "2026-10-03" } ],
  "causales": [ { "codigo": "PROMEDIO_ASIGNATURA", "descripcion": "Promedio menor a 13 en Meteorología" } ]
}
```

- `bloqueadoPorSubsanacion` es verdadero mientras exista un cuestionario desaprobado sin una subsanación aprobada posterior. Mientras sea verdadero, el alumno **no debe programarse en turnos prácticos**: el frontend lo marca como no disponible y `POST /api/turnos` debería rechazarlo con `400`.
- Códigos de `causales` (PDI, causal por bajo rendimiento académico):

| Código | Regla |
|---|---|
| `PROMEDIO_ASIGNATURA` | Promedio menor a 13 en una asignatura del curso en tierra |
| `TRES_ASIGNATURAS` | Tres asignaturas desaprobadas |
| `DOS_EXAMENES` | Dos exámenes desaprobados |
| `SEGUNDA_SUBSANACION` | Desaprobó la segunda subsanación de una asignatura |
| `PERIODICOS_EMERGENCIAS` | 3 consecutivos o 5 alternados desaprobados en Emergencias Críticas, No Críticas o Límites de Operación |
| `PERIODICOS_OTROS` | 3 consecutivos o 5 alternados desaprobados en Ingeniería, Adoctrinamiento, Instrumentos, Aerodinámica, Meteorología o Fraseología |
| `INOPINADOS` | 3 consecutivos o 5 alternados desaprobados en inopinados |

## 6. Relación con el modelo entidad-relación

| Diagrama | Contrato |
|---|---|
| Turno Teórico | `/api/turnos-teoricos` (+ `idMateria`, `idTurnoOrigen`) |
| Pregunta Teórica | `preguntas[{ idPregunta, puntajeMaximo }]` del turno |
| Pregunta · Alternativa | `/api/preguntas` con `alternativas` anidadas; `materia` pasa a ser `idMateria` |
| Cuestionario | `/api/cuestionarios` (uno por alumno y turno teórico) |
| Calificación Teórica | `calificaciones[]` del cuestionario |
| — | **Materia** (entidad nueva): `/api/materias` |

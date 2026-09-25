# Contrato API — Instrucción en tierra: teoría, banco de preguntas y examen

**Versión:** 2 · 2026-09-25 (la versión 1, del 2026-09-19, era una propuesta; queda reemplazada por este documento)
**Implementa:** `sigeda-back` (Spring Boot), branch `main` (leído en `ec2b0dd`)
**Consume:** `sigeda-web` M4. Los mocks MSW (`src/mocks/sigeda/`) implementan exactamente este documento.
**Para:** Victor — implementación en `sigeda-back`

Fuentes del dominio: PDI EA-510 2023, Título II cap. II y Título III cap. I (spec §3.4).
Fuentes técnicas: lectura del código de `sigeda-back` con evidencia archivo:línea (spec §16.1 y `.superpowers/notas/investigacion/m4-contrato-backend.md`), decisiones M4-1 a M4-21 (spec §16.2) y dependencias 51–60 (spec §16.5).

**Nada de este contrato existe todavía.** Un grep sobre `src/main` de `materia|pregunta|cuestionario|alternativa|examen|teoric|subsana` no devuelve una sola línea, y ninguna de las 18 tablas de `schema_prod.sql:117-296` es teórica. Así que, salvo la §1, **todo aquí es Nuevo** y no se etiqueta sección por sección: lo que se etiqueta es lo contrario, la regla que ya tiene precedente en el backend, para que el módulo nuevo no invente convenciones.

| Sección | Qué es | Dependencia |
|---|---|---|
| §1 Materias | Ya especificado y ya implementado en los mocks por M2. **No se redefine** | 5, 54 |
| §2 Banco de preguntas | Nuevo | 6, 53, 54 |
| §3 Turnos teóricos | Nuevo | 6, 52, 53, 54 |
| §4 Rendición del examen | Nuevo | 6, 51, 53, 54, 55 |
| §5 Estado teórico del alumno | Nuevo | 7, 56, 57 |

### Qué cambió respecto de la versión 1

| v1 | v2 | Motivo |
|---|---|---|
| §1 Materias con su propia forma y semilla | Puntero a `contrato-api-matricula.md` §6, que es lo que M2 implementó | M2 fijó los textos exactos (`"Materia eliminado con éxito."`, el 409, los mensajes de validación) que v1 no tenía |
| `codInstructor` "se toma del usuario autenticado"; alumno "solo el propio" | `codInstructor` y `codAlumno` viajan en el cuerpo o en la query | Ningún controlador de `sigeda-back` sabe quién llama (`@AuthenticationPrincipal` no aparece en ninguna parte; el JWT solo trae `sub`). Dependencia 51 |
| `cierraEn`, `entregadoEn` como instantes ISO-8601 con desfase | `fechaExamen` + `horaInicio` + `horaFin`; `fechaEntrega` + `horaEntrega` | El dominio usa `LocalDate` y horas `varchar`; lo que Spring emitiría para un instante con desfase es indeterminado |
| `Pregunta` sin explicación | `explicacion` (opcional, ≤ 1000) y `origen` (`MANUAL`/`IA`, lo fija el servidor) | La generación de IA siempre produce una explicación y no tenía dónde caer; `origen` hace auditable cuánto aportó la IA |
| "al cerrar la ventana el backend entrega automáticamente" | §4.8: cierre **perezoso** en cada lectura, más la dependencia 55 para el trabajo programado | No hay ningún `@Scheduled` en `sigeda-back`; sin mecanismo, la regla no era implementable |
| `POST /lote` como único detalle de la importación | §6 con el mapeo campo por campo desde `POST /quizzes/generate` | Los límites de las dos puntas no coinciden (2000 vs 500 caracteres, `'true'` vs `"Verdadero"`, sin materia ni dificultad) |
| Sin `mi-cuestionario` | `GET /api/turnos-teoricos/{id}/mi-cuestionario` | El alumno navega siempre por id de turno; así `/examenes/$id` y `/examenes/$id/resultado` se recargan sin un segundo espacio de ids |
| Sin fijaciones ni dependencias | §9 (datos de los mocks) y §10 (dependencias) | Es lo que los contratos de M2 y M3 tienen y lo que permite escribir los mocks sin adivinar |
| `409` sin advertencia | `409` con el precedente `410` dicho en voz alta | `CONFLICT` no aparece en el backend y `ActionExpiredException` devuelve 410 |

---

## Convenciones

- **Base y autenticación.** Prefijo `/api` sobre `http://localhost:8080`; `Authorization: Bearer <jwt>` en todo (`security/config/SecurityConfig.java:50-53`); CORS solo para `http://localhost:5173` (`:77-80`). Sin token válido → `401`.
- **Autorización.** `@PreAuthorize("hasRole('<Permiso>')")` por método; la autoridad es `"ROLE_" + permiso.nombre`. Los cuatro permisos de este contrato **no existen todavía** (dependencia 54): hasta que existan, cualquier usuario autenticado alcanza cualquier endpoint de aquí.
- **Quién llama.** Ningún controlador lo sabe. Mientras la dependencia 51 no exista:
  - las escrituras de §2 y §3 llevan `codInstructor` en el cuerpo, como ya lo hace `POST /api/turnos` en `ec2b0dd`;
  - los endpoints del alumno (§4, §5) llevan `codAlumno` en el cuerpo o en la query.
  El frontend envía el `codPersona` de la sesión y comprueba la propiedad en sus cargadores de ruta; **es una comprobación de interfaz, no de servidor** (la misma situación que la dependencia 20 para turnos y evaluaciones). Cuando la 51 llegue, los dos campos desaparecen de la firma y el servidor resuelve `sub` → `Usuario` → `Persona.codigo`.
- **Envoltura de error.** Se usa la convención **§A** de `contrato-api-turnos.md` (`utils/Response.java`), igual que Turno, Evaluación, Persona, Grupo y Materia:

  | Caso | HTTP | Cuerpo |
  |---|---|---|
  | Validación de campos | 400 | **arreglo JSON crudo** de `"'campo': mensaje"` (`Response.setErrorsFrom(bindingResult)`, `Response.java:90-93`) |
  | Detalle inexistente | 404 | texto plano `"<Entidad> especificada no existe."` (`:68-71`) |
  | Lista vacía | 404 | texto plano `"No existen <lista> disponibles."` (`:73-76`) |
  | Eliminado | 200 | texto plano `"<Entidad> eliminado con éxito."` (`:63-66`, siempre masculino) |
  | Regla de negocio de estado | **409** | texto plano |
  | Regla de negocio de habilitación | 403 | texto plano (`Response.isForbidden`, `:78-80`) |
  | Paginado inválido | 400 | `{"error":"Argumento incorrecto","mensaje":"…"}` |

  **[Dependencia 60]** Para que el 400 salga como arreglo hay que declarar `BindingResult` en la firma del handler y llamar a `Response.setErrorsFrom`. Un `@Valid` sin `BindingResult` produce en cambio `ErrorResponse{status:400,error:"Error al validar el modelo",message:null,messages:[…]}` (`GlobalExceptionHandler.java:80-92`), que **no** es la forma que describen las tablas de este documento. `ConstraintErrors.formatErrors` no ordena (`utils/ConstraintErrors.java:38-44`), así que un campo puede traer varios mensajes en cualquier orden; el frontend muestra el primero de cada campo y los mocks emiten solo el primer mensaje aplicable, en el orden de las tablas de aquí.
- **`409` y su precedente.** Este contrato usa **409 con texto plano** para "la operación no es válida en el estado actual". Aviso: `grep -rn CONFLICT src/main/java` no devuelve nada y el caso equivalente del backend hoy es **410 Gone** (`ActionExpiredException` → `GlobalExceptionHandler.java:131-140`, con envoltura `ErrorResponse`). Al frontend le sirven las dos (`src/lib/api/errors.ts:84` muestra tal cual cualquier cuerpo de texto por debajo de 500 y `:83,94` entiende `ErrorResponse`), pero los mocks implementan 409; si se prefiere 410, avisar y se cambia en un solo lugar. **[Dependencia 60]**
- **Creación.** `Response.wasSaved` arma la clave del cuerpo como `nombreEntidad.toLowerCase()` y siempre dice "guardada", lo que daría la clave JSON `"turno teórico"` (con espacio y tilde) y "Preguntas guardada con éxito." Por eso las creaciones de este contrato son **respuestas manuales** con claves camelCase y concordancia correcta: `{"mensaje":…,"pregunta":…}`, `{"mensaje":…,"preguntas":[…]}`, `{"mensaje":…,"turnoTeorico":…}`, `{"mensaje":…,"cuestionario":…}`. Los borrados sí usan la plantilla tal cual, porque M2 ya entregó `"Materia eliminado con éxito."` y la consistencia pesa más que la gramática ahí.
- **Fechas y horas.** Fechas `yyyy-MM-dd` (`utils/CustomDateDeserializer.java:15`), horas `"HH:mm"` como en los turnos prácticos (`schema_prod.sql:200-201,274-275`). **Este contrato no tiene ningún instante ISO-8601**: la ventana del examen es `fechaExamen` + `horaInicio` + `horaFin`, la entrega es `fechaEntrega` + `horaEntrega`, y el frontend arma la cuenta atrás con el reloj del navegador (zona `America/Lima`). El servidor vuelve a comprobar la ventana en cada escritura y responde D11 si cerró.
- **Números.** `nota`, `notaPromedio` y `coeficiente` son números JSON con 2 decimales; `notaMinima`, `puntajeMaximo` y `puntajeObtenido` son enteros. Aviso: en el lado práctico las notas se guardan como texto (`evaluaciones_practicas.promedio varchar(255)`, `CalculoNota.java:85`); aquí se piden como números y el frontend tolera ambos con `aNota` (`src/features/evaluaciones/api.ts:111-115`).
- **Paginación.** `utils/Page_Sort.java` (`page` def. `0`, `size` def. `6`, `direction` def. `ASC`, `property` **uno**, sin tope de tamaño), con el `Page` de Spring serializado directo; el frontend lee `content`, `totalElements`, `totalPages`, `size` y `number`, y pide `size=10`. Los mensajes de error de paginado son los de `contrato-api-matricula.md` › Paginación. Las **filas de lista son planas** (los nombres de materia y grupo como texto) y los **detalles anidan** (`materia: {id, nombre}`), igual que `TurnoRealizado` frente a `DetalleTurno`.
- **Enumeraciones.** `spring.jackson.deserialization.READ_UNKNOWN_ENUM_VALUES_AS_NULL=true` (`application.properties:35`): un valor inválido llega como `null`, así que **ausente e inválido no se distinguen** y cada enum tiene **un solo mensaje** que cubre los dos casos, como hizo materias.
- **Listas vacías.** 404 con texto; el frontend lo trata como lista vacía en cualquier endpoint de lista (`src/lib/api/http.ts:97-113`).
- **Mensajes visibles.** El frontend muestra literalmente los mensajes de la §7 y nada más.

---

## Permisos

| Permiso | Roles | Uso en este contrato |
|---|---|---|
| `Read` | todos | GET de materias (§1) |
| `Manage Subjects` | Administrador Web, Comandante de Escuadrón | POST/PUT/DELETE de materias (§1) |
| `Manage Questions` | Administrador Web, Instructor | todo §2 |
| `Manage Exams` | Administrador Web, Instructor | todo §3, y el detalle de cualquier cuestionario (§4.6) |
| `Take Exams` | Alumno | §4.1–§4.5 |
| `Read` | todos (alumno: solo el propio, dependencia 51) | §5 |

Los cuatro permisos nuevos **no existen en `sigeda-back`** (`Permiso.java:5-23`, `Permission.java:3-31`, `Role.java:9-37`): la dependencia 54 los agrega. El frontend ya los tiene aislados en `PERMISOS_CONTRATO` (`src/lib/auth/permisos.ts:22`); cuando lleguen, se mueven a `PERMISOS_BACKEND` y el frontend no cambia nada más.

Dos hechos de la semilla impiden ejercer `Manage Subjects` contra el backend real aunque la 54 llegue: el rol Comandante está con mojibake (`data_prod.sql:76`, dependencia 19) y **ningún usuario sembrado tiene `id_rol = 5`**. Los mocks inventan `comandante.aguirre`.

---

## Enumeraciones

| Enum | Valores | Etiqueta en la interfaz |
|---|---|---|
| `ParteCurso` | `PRIMERA_PARTE`, `SEGUNDA_PARTE`, `CULTURA_AERONAUTICA` | Primera parte · Segunda parte · Cultura aeronáutica |
| `TipoPregunta` | `OPCION_MULTIPLE`, `VERDADERO_FALSO`, `COMPLETAR` | Opción múltiple · Verdadero o falso · Completar |
| `Dificultad` | `BAJA`, `MEDIA`, `ALTA` | Baja · Media · Alta |
| `OrigenPregunta` | `MANUAL`, `IA` | Manual · IA |
| `TipoExamen` | `TEST`, `EXAMEN`, `SEMANAL`, `QUINCENAL`, `MENSUAL`, `SEMESTRAL`, `INOPINADO`, `PRE_SOLO`, `SUBSANACION`, `REZAGADO`, `BALOTAS` | Test · Examen · Semanal · Quincenal · Mensual · Semestral · Inopinado · Pre-Solo · Subsanación · Rezagado · Balotas |
| `EstadoTurnoTeorico` | `PROGRAMADO`, `EN_CURSO`, `FINALIZADO` | Programado · En curso · Finalizado |
| `EstadoCuestionario` | `EN_CURSO`, `ENTREGADO` | En curso · Entregado |
| `EstadoRendicion` | `NO_RINDIO`, `EN_CURSO`, `ENTREGADO` | No rindió · En curso · Entregado |

`EstadoTurnoTeorico` es **derivado**, nunca se envía ni se guarda: `PROGRAMADO` si `fechaExamen`+`horaInicio` está en el futuro, `FINALIZADO` si `fechaExamen`+`horaFin` está en el pasado, `EN_CURSO` entre ambos. El servidor lo calcula con su propio reloj y lo devuelve en las respuestas; el frontend lo muestra y, en la pantalla de rendición, además calcula el tiempo restante con el reloj del navegador.

`EstadoRendicion` es el estado de un alumno frente a un turno: `NO_RINDIO` si no tiene cuestionario, `EN_CURSO` o `ENTREGADO` según el que tenga.

---

## 1. Materias — ya especificado por M2

Rutas, permisos, forma, validación exacta, textos de error y semilla: **`contrato-api-matricula.md` §6** (dependencia 5). No se repiten aquí y no cambian: el frontend ya los consume (`src/features/materias/api.ts`, `schemas.ts`) y los mocks ya los implementan (`src/mocks/sigeda/materias.ts`). Recordatorio de lo único que M4 toca:

```
GET    /api/materias         Read              arreglo NO paginado, ordenado por parte y luego nombre
GET    /api/materias/{id}    Read
POST   /api/materias         Manage Subjects   201 {"mensaje":"Materia guardada con éxito.","materia":{…}}
PUT    /api/materias/{id}    Manage Subjects   201, mismo cuerpo
DELETE /api/materias/{id}    Manage Subjects   200 texto "Materia eliminado con éxito."; 409 si tiene preguntas o turnos
```

```json
{ "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18, "coeficiente": 0.22, "parte": "PRIMERA_PARTE" }
```

- El **409** de `DELETE` — texto `"La materia no se puede eliminar, tiene preguntas o turnos teóricos."` — pasa a ser **derivado**: se dispara si la materia tiene al menos una pregunta (§2) o al menos un turno teórico (§3). Hasta M4 era un booleano fijado a mano en los mocks (`MateriaMock.conPreguntas`), que desaparece.
- `notaMinima` **empieza a usarse**: es el umbral de `aprobado` en §3.2 y §4.6, y el número que la interfaz muestra al lado de la nota. Antes de M4 se guardaba y validaba sin que nadie lo leyera.
- `coeficiente` sigue sin consumidor: es la ponderación del NIT que calcula M5 (dependencia 8).

---

## 2. Banco de preguntas

```
GET    /api/preguntas?idMateria=&dificultad=&tipo=&texto=&origen=&page=&size=&direction=&property=   Manage Questions
GET    /api/preguntas/{id}                                                                          Manage Questions
POST   /api/preguntas                                                                               Manage Questions
PUT    /api/preguntas/{id}                                                                          Manage Questions
DELETE /api/preguntas/{id}                                                                          Manage Questions
POST   /api/preguntas/lote                                                                          Manage Questions
```

### Reglas por tipo de pregunta

| Tipo | Alternativas | Correctas | Enunciado |
|---|---|---|---|
| `OPCION_MULTIPLE` | exactamente 4, textos distintos entre sí | exactamente 1 | sin requisito extra |
| `VERDADERO_FALSO` | exactamente 2, con los textos literales `"Verdadero"` y `"Falso"`, en ese orden | exactamente 1 | sin requisito extra |
| `COMPLETAR` | exactamente 1: la respuesta esperada | esa 1, siempre `correcto: true` | debe contener el marcador literal `_____` (cinco guiones bajos) |

### 2.1 `GET /api/preguntas`

Filtros, todos opcionales y combinables con AND: `idMateria` (int), `dificultad` (`Dificultad`), `tipo` (`TipoPregunta`), `origen` (`OrigenPregunta`), `texto` (subcadena del enunciado, **sin distinguir mayúsculas ni tildes**). Paginado `Page_Sort` con `property` por defecto `"id"`; propiedades ordenables: `id`, `enunciado`, `dificultad`, `materia`. Un filtro con valor inválido se ignora (llega `null`), no devuelve 400.

**200** — `Page` de filas **planas**:

```json
{
  "content": [
    {
      "id": 1,
      "idMateria": 3,
      "materia": "Adoctrinamiento de Vuelo",
      "enunciado": "¿Qué documento fija la conducta del alumno piloto durante la instrucción?",
      "tipoPregunta": "OPCION_MULTIPLE",
      "dificultad": "MEDIA",
      "origen": "MANUAL",
      "enUso": true,
      "cantAlternativas": 4
    }
  ],
  "totalElements": 24, "totalPages": 3, "size": 10, "number": 0,
  "first": true, "last": false, "numberOfElements": 10, "empty": false
}
```

`enUso` es verdadero si la pregunta aparece en al menos un turno teórico; el frontend deshabilita Eliminar con él, sin sondear el servidor.

Lista vacía → **404** D1.

### 2.2 `GET /api/preguntas/{id}`

**200** — detalle con la materia anidada y las alternativas:

```json
{
  "id": 1,
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "enunciado": "¿Qué documento fija la conducta del alumno piloto durante la instrucción?",
  "tipoPregunta": "OPCION_MULTIPLE",
  "dificultad": "MEDIA",
  "explicacion": "El PDI EA-510 es el plan de instrucción vigente del curso.",
  "origen": "MANUAL",
  "codInstructor": "444444",
  "enUso": true,
  "alternativas": [
    { "id": 1, "respuesta": "El PDI EA-510", "correcto": true },
    { "id": 2, "respuesta": "El manual de vuelo de la aeronave", "correcto": false },
    { "id": 3, "respuesta": "La orden de vuelo del día", "correcto": false },
    { "id": 4, "respuesta": "El reglamento de tránsito aéreo", "correcto": false }
  ]
}
```

`alternativas` viene **ordenado por `id`** siempre (dependencia 38 pide `@OrderBy("id")` en las listas anidadas del resto del dominio; aquí es obligatorio desde el principio, porque el orden es el que ve el alumno). `explicacion` puede ser `null`.

**404** D2.

### 2.3 `POST /api/preguntas`

```json
{
  "codInstructor": "444444",
  "idMateria": 3,
  "enunciado": "¿Qué documento fija la conducta del alumno piloto durante la instrucción?",
  "tipoPregunta": "OPCION_MULTIPLE",
  "dificultad": "MEDIA",
  "explicacion": "El PDI EA-510 es el plan de instrucción vigente del curso.",
  "alternativas": [
    { "respuesta": "El PDI EA-510", "correcto": true },
    { "respuesta": "El manual de vuelo de la aeronave", "correcto": false },
    { "respuesta": "La orden de vuelo del día", "correcto": false },
    { "respuesta": "El reglamento de tránsito aéreo", "correcto": false }
  ]
}
```

`origen` **no se acepta en el cuerpo**: lo fija el servidor en `MANUAL` aquí y en `IA` en §2.6. Un `id` en el cuerpo se ignora. `codInstructor` desaparece con la dependencia 51.

**201** `{"mensaje":"Pregunta guardada con éxito.","pregunta":{…forma de §2.2…}}` (D20).

**404** D4 si `idMateria` no existe (no es un error de campo: el patrón de la casa para un id anidado inexistente es 404, como pide la dependencia 34).

Validación → **400** arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `codInstructor` | obligatorio, 6 dígitos, persona existente de tipo instructor | `El código del instructor es obligatorio.` |
| `idMateria` | obligatorio y positivo | `La materia es obligatoria.` |
| `enunciado` | obligatorio (`null`, `""` o solo espacios) | `El enunciado es obligatorio.` |
| | 10 a 500 caracteres | `El enunciado debe tener entre 10 y 500 caracteres.` |
| | en `COMPLETAR`, debe contener `_____` | `El enunciado de una pregunta de completar debe incluir el marcador _____.` |
| `tipoPregunta` | obligatorio y uno de los tres valores | `Ingresar tipo de pregunta válido.` |
| `dificultad` | obligatoria y uno de los tres valores | `Ingresar dificultad válida.` |
| `explicacion` | opcional, hasta 1000 caracteres | `La explicación no puede superar los 1000 caracteres.` |
| `alternativas` | cantidad según el tipo, `OPCION_MULTIPLE` | `Una pregunta de opción múltiple debe tener exactamente 4 alternativas.` |
| | cantidad y textos según el tipo, `VERDADERO_FALSO` | `Una pregunta de verdadero o falso debe tener exactamente las alternativas Verdadero y Falso.` |
| | cantidad según el tipo, `COMPLETAR` | `Una pregunta de completar debe tener exactamente 1 alternativa con la respuesta esperada.` |
| | exactamente una correcta | `Debe marcar exactamente una alternativa como correcta.` |
| | textos distintos entre sí (sin distinguir mayúsculas ni espacios extremos) | `Las alternativas no pueden repetirse.` |
| `alternativas[i].respuesta` | obligatoria | `La respuesta es obligatoria.` |
| | hasta 200 caracteres | `La respuesta no puede superar los 200 caracteres.` |

Los errores de una alternativa llevan el índice en el nombre del campo: `"'alternativas[0].respuesta': La respuesta es obligatoria."`. El frontend ya traduce esa forma a la ruta del formulario (`aplicarErroresDeCampo` convierte `alternativas[0].respuesta` en `alternativas.0.respuesta`).

### 2.4 `PUT /api/preguntas/{id}`

Mismo cuerpo, mismas reglas y mismo `201` que §2.3. `origen` **no cambia nunca**: una pregunta importada desde IA que se corrige a mano sigue siendo `IA`. `404` D2 si la pregunta no existe, `404` D4 si la nueva `idMateria` no existe. Se puede modificar una pregunta `enUso`: el turno guarda la referencia, no una copia, así que el cambio se ve también en los turnos que la usan y en los cuestionarios que todavía no se entregaron. Un cuestionario ya entregado conserva sus `calificaciones`, que guardan el enunciado y las respuestas tal como estaban.

### 2.5 `DELETE /api/preguntas/{id}`

**200** texto `"Pregunta eliminado con éxito."` (D18, plantilla `Response.wasDeleted`). Borra en cascada sus alternativas.

**404** D2. **409** D3 si la pregunta está en algún turno teórico.

### 2.6 `POST /api/preguntas/lote`

Lo usa **solo** Importar desde IA (§6).

```json
{
  "codInstructor": "444444",
  "preguntas": [ { "idMateria": 3, "enunciado": "…", "tipoPregunta": "VERDADERO_FALSO", "dificultad": "BAJA", "explicacion": "…", "alternativas": [ { "respuesta": "Verdadero", "correcto": true }, { "respuesta": "Falso", "correcto": false } ] } ]
}
```

- `preguntas` tiene de 1 a 20 elementos; cada uno se valida con las reglas de §2.3.
- **Todo o nada**, en una transacción: si una falla, ninguna se guarda.
- `origen` se fija en `IA` para todas.

**201** `{"mensaje":"Preguntas guardadas con éxito.","preguntas":[ …forma de §2.2, en el orden recibido… ]}` (D21).

Validación → **400** arreglo, con el índice de la pregunta en el nombre del campo: `"'preguntas[2].enunciado': El enunciado debe tener entre 10 y 500 caracteres."`, `"'preguntas[0].alternativas[1].respuesta': La respuesta es obligatoria."`. Reglas propias del lote:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `preguntas` | al menos 1 | `Debe enviar al menos una pregunta.` |
| | hasta 20 | `No se pueden importar más de 20 preguntas a la vez.` |

**404** D4 si alguna `idMateria` no existe.

---

## 3. Turnos teóricos

```
GET    /api/turnos-teoricos?idGrupo=&idMateria=&estado=&tipoExamen=&codInstructor=&fechaPre=&fechaPost=&page=&size=&direction=&property=   Manage Exams
GET    /api/turnos-teoricos/{id}                                                        Manage Exams
POST   /api/turnos-teoricos                                                             Manage Exams
PUT    /api/turnos-teoricos/{id}                                                        Manage Exams
DELETE /api/turnos-teoricos/{id}                                                        Manage Exams
PUT    /api/turnos-teoricos/{id}/inasistencias/{codAlumno}                              Manage Exams
```

### 3.1 `GET /api/turnos-teoricos`

Filtros opcionales combinables con AND: `idGrupo`, `idMateria`, `estado` (`EstadoTurnoTeorico`; al ser derivado se traduce a una comparación de `fechaExamen`+horas contra el reloj del servidor), `tipoExamen`, `codInstructor`, `fechaPre`/`fechaPost` (rango cerrado sobre `fechaExamen`, `yyyy-MM-dd`; los mismos nombres que `GET /api/turnos`). Paginado `Page_Sort`, `property` por defecto `"fechaExamen"`; propiedades ordenables: `id`, `nombre`, `fechaExamen`, `materia`, `grupo`.

**200** — `Page` de filas planas:

```json
{
  "content": [
    {
      "id": 1,
      "nombre": "Mensual Adoctrinamiento de Vuelo",
      "idMateria": 3,
      "materia": "Adoctrinamiento de Vuelo",
      "tipoExamen": "MENSUAL",
      "fechaExamen": "2026-09-18",
      "horaInicio": "08:00",
      "horaFin": "09:00",
      "estado": "FINALIZADO",
      "idGrupo": 3,
      "grupo": "Grupo 3",
      "codInstructor": "444444",
      "idTurnoOrigen": null,
      "cantPreguntas": 5,
      "cantAlumnos": 2,
      "rindieron": 2
    }
  ],
  "totalElements": 5, "totalPages": 1, "size": 10, "number": 0,
  "first": true, "last": true, "numberOfElements": 5, "empty": false
}
```

Lista vacía → **404** D5.

### 3.2 `GET /api/turnos-teoricos/{id}`

**200** — detalle con preguntas, resultados y resumen. Antes de responder, el servidor cierra los cuestionarios vencidos de este turno (§4.8).

```json
{
  "id": 1,
  "nombre": "Mensual Adoctrinamiento de Vuelo",
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "tipoExamen": "MENSUAL",
  "fechaExamen": "2026-09-18",
  "horaInicio": "08:00",
  "horaFin": "09:00",
  "estado": "FINALIZADO",
  "grupo": { "id": 3, "nombre": "Grupo 3" },
  "instructor": { "codigo": "444444", "nombre": "Juan Torres Perez" },
  "turnoOrigen": null,
  "preguntas": [
    { "idPregunta": 1, "orden": 1, "enunciado": "…", "tipoPregunta": "OPCION_MULTIPLE", "dificultad": "MEDIA", "puntajeMaximo": 4 }
  ],
  "resultados": [
    { "codAlumno": "555555", "alumno": "Pedro Rodriguez Garcia", "estado": "ENTREGADO", "idCuestionario": 1, "nota": 20.00, "aprobado": true,  "inasistenciaJustificada": null, "bloqueadoPorSubsanacion": false },
    { "codAlumno": "666666", "alumno": "Ana Torres Martinez",    "estado": "ENTREGADO", "idCuestionario": 2, "nota": 12.00, "aprobado": false, "inasistenciaJustificada": null, "bloqueadoPorSubsanacion": true }
  ],
  "resumen": { "habilitados": 2, "rindieron": 2, "aprobados": 1, "notaPromedio": 16.00 }
}
```

- `turnoOrigen` es `null` o `{"id":1,"nombre":"…","fechaExamen":"2026-09-18"}`.
- `preguntas` viene ordenado por `orden` (1..n), que es el orden fijado al crear el turno y el que ve el alumno.
- `resultados` lista a los **alumnos habilitados**, ordenados por apellido: todos los del grupo, salvo
  - `SUBSANACION`: solo los que **desaprobaron** el turno de origen;
  - `REZAGADO`: solo los que **no rindieron** el turno de origen.
  Un alumno sin grupo nunca aparece en ningún turno.
- `nota` y `aprobado` son `null` mientras el alumno no haya entregado. `inasistenciaJustificada` es `null` salvo para un `NO_RINDIO` de un turno `FINALIZADO`, donde es `true` o `false` (§3.6).
- `bloqueadoPorSubsanacion` repite el dato de §5 para no obligar a una consulta por alumno desde esta pantalla.
- `notaPromedio` es el promedio de los que entregaron, o `null` si no entregó nadie.

**404** D6.

### 3.3 `POST /api/turnos-teoricos`

```json
{
  "codInstructor": "444444",
  "nombre": "Quincenal Límites de Operación",
  "idMateria": 4,
  "tipoExamen": "QUINCENAL",
  "fechaExamen": "2026-09-28",
  "horaInicio": "09:00",
  "horaFin": "10:00",
  "idGrupo": 3,
  "idTurnoOrigen": null,
  "preguntas": [
    { "idPregunta": 17, "puntajeMaximo": 4 },
    { "idPregunta": 18, "puntajeMaximo": 4 },
    { "idPregunta": 19, "puntajeMaximo": 4 },
    { "idPregunta": 20, "puntajeMaximo": 4 },
    { "idPregunta": 21, "puntajeMaximo": 4 }
  ]
}
```

El `orden` de cada pregunta es su posición en el arreglo y se guarda: no se envía ni se puede cambiar después sin modificar el turno.

**201** `{"mensaje":"Turno teórico guardado con éxito.","turnoTeorico":{…forma de §3.2…}}` (D22).

**404** D4 si `idMateria` no existe; **404** `"Grupo especificada no existe."` si `idGrupo` no existe; **404** D6 si `idTurnoOrigen` no existe; **404** D2 si alguna `idPregunta` no existe.

Validación → **400** arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `codInstructor` | obligatorio | `El código del instructor es obligatorio.` |
| | el grupo debe ser uno de los del instructor | `El grupo no corresponde al instructor.` |
| `nombre` | obligatorio | `El nombre es obligatorio` |
| | 10 a 60 caracteres, no solo espacios | `El nombre debe tener entre 10 y 60 caracteres.` |
| `idMateria` | obligatoria | `La materia es obligatoria.` |
| `tipoExamen` | obligatorio y uno de los 11 valores | `Ingresar tipo de examen válido.` |
| `fechaExamen` | obligatoria, `yyyy-MM-dd` | `La fecha del examen es obligatoria.` |
| | posterior a hoy | `La fecha del examen debe ser posterior a hoy.` |
| `horaInicio` · `horaFin` | obligatorias, formato `HH:mm` | `La hora de inicio es obligatoria.` · `La hora de fin es obligatoria.` |
| | `horaFin` posterior a `horaInicio` | `La hora de fin debe ser posterior a la hora de inicio.` |
| `idGrupo` | obligatorio | `El grupo es obligatorio.` |
| | el grupo debe tener al menos un alumno | `El grupo no tiene alumnos.` |
| `idTurnoOrigen` | obligatorio si `tipoExamen` es `SUBSANACION` o `REZAGADO` | `El turno de origen es obligatorio para una subsanación o un rezagado.` |
| | prohibido en cualquier otro tipo | `El turno de origen solo se indica en una subsanación o un rezagado.` |
| | debe ser un turno `FINALIZADO` de la misma materia y el mismo grupo | `El turno de origen debe ser un turno finalizado de la misma materia y grupo.` |
| | en `SUBSANACION`, alguien debe haber desaprobado el origen; en `REZAGADO`, alguien debe no haber rendido | `Ningún alumno del turno de origen corresponde a este tipo de examen.` |
| `preguntas` | al menos 1 | `Debe elegir al menos una pregunta.` |
| | sin repetidas | `No se puede repetir una pregunta.` |
| | todas de la materia del turno | `Todas las preguntas deben ser de la materia del turno.` |
| `preguntas[i].puntajeMaximo` | entero de 1 a 20 | `El puntaje debe ser un entero entre 1 y 20.` |
| `preguntas` | la suma de los puntajes debe ser exactamente 20 | `Los puntajes de las preguntas deben sumar 20.` |

La regla de las 24 horas del PDI (una subsanación se rinde dentro de las 24 h del examen desaprobado) **no se valida**: el frontend avisa y deja guardar (spec M4-20).

### 3.4 `PUT /api/turnos-teoricos/{id}`

Mismo cuerpo, mismas reglas y mismo `201` que §3.3, con `fechaExamen` que puede ser hoy si sigue siendo futura respecto de `horaInicio`.

**404** D6. **409** D7 si el turno no está `PROGRAMADO` (su ventana ya comenzó o terminó).

### 3.5 `DELETE /api/turnos-teoricos/{id}`

**200** texto `"Turno teórico eliminado con éxito."` (D19). Borra sus `preguntas_turno`; no puede haber cuestionarios, porque solo se borra un turno `PROGRAMADO`.

**404** D6. **409** D7 si el turno no está `PROGRAMADO`.

### 3.6 `PUT /api/turnos-teoricos/{id}/inasistencias/{codAlumno}`

Registra si la inasistencia de un alumno fue justificada (regla del 50 % del PDI).

```json
{ "justificada": true }
```

**200** `{"mensaje":"Inasistencia registrada con éxito.","resultado":{ …la fila de `resultados` del alumno… }}` (D24).

**404** D6 si el turno no existe; **404** `"Persona especificada no existe."` si el alumno no existe.
**409** D13 si el alumno no está `NO_RINDIO` o el turno no está `FINALIZADO`.

Validación → **400** arreglo: `justificada` obligatoria y booleana → `Debe indicar si la inasistencia fue justificada.`

Efecto: en el `REZAGADO` correspondiente, la nota de quien **no** tenga la inasistencia justificada se registra al **50 %** de lo obtenido, redondeado a 2 decimales. El servidor aplica la reducción al entregar (§4.4) y el campo `reduccionPorRezagado` del cuestionario dice si se aplicó.

---

## 4. Rendición del examen (alumno)

```
GET  /api/examenes/pendientes?codAlumno=                        Take Exams
POST /api/turnos-teoricos/{id}/iniciar                          Take Exams
PUT  /api/cuestionarios/{id}/respuestas                         Take Exams
POST /api/cuestionarios/{id}/entregar                           Take Exams
GET  /api/turnos-teoricos/{id}/mi-cuestionario?codAlumno=       Take Exams
GET  /api/cuestionarios/{id}                                    Take Exams (propio) · Manage Exams
GET  /api/cuestionarios?codAlumno=&idMateria=&estado=&page=      Take Exams (propio) · Manage Exams
```

`codAlumno` es obligatorio en las tres rutas que lo declaran y sale de la sesión del frontend; con la dependencia 51 desaparece y el servidor lo resuelve. Un `codAlumno` distinto del propio debe responder **403** D15 en cuanto la 51 exista; hoy no hay manera de comprobarlo y el frontend es el único guardián.

### 4.1 `GET /api/examenes/pendientes`

Los turnos en los que el alumno está habilitado (§3.2), en estado `PROGRAMADO` o `EN_CURSO`, sin cuestionario entregado. **Arreglo no paginado**, ordenado por `fechaExamen` y luego `horaInicio`; la lista es corta por construcción.

```json
[
  {
    "idTurnoTeorico": 3,
    "nombre": "Semanal Adoctrinamiento de Vuelo",
    "idMateria": 3,
    "materia": "Adoctrinamiento de Vuelo",
    "notaMinima": 18,
    "tipoExamen": "SEMANAL",
    "fechaExamen": "2026-09-25",
    "horaInicio": "09:55",
    "horaFin": "10:20",
    "estado": "EN_CURSO",
    "cantPreguntas": 5,
    "idCuestionario": 3,
    "estadoRendicion": "EN_CURSO"
  }
]
```

`idCuestionario` y `estadoRendicion` dicen si el alumno ya empezó: `null` y `"NO_RINDIO"` si no. Lista vacía → **404** D17.

### 4.2 `POST /api/turnos-teoricos/{id}/iniciar`

```json
{ "codAlumno": "111111" }
```

- **Idempotente**: si el alumno ya tiene un cuestionario `EN_CURSO` de este turno, lo devuelve con las respuestas guardadas en lugar de crear otro. Recargar la página retoma el examen.
- El **orden de las preguntas** es el `orden` del turno (§3.3) y se guarda en el cuestionario al crearlo, así que nunca cambia entre recargas ni entre alumnos.
- La respuesta **nunca incluye `correcto`, `respuestaCorrecta` ni `explicacion`**.

**201** la primera vez, **200** las siguientes:

```json
{
  "id": 3,
  "idTurnoTeorico": 3,
  "turnoTeorico": "Semanal Adoctrinamiento de Vuelo",
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "tipoExamen": "SEMANAL",
  "codAlumno": "111111",
  "estado": "EN_CURSO",
  "fechaExamen": "2026-09-25",
  "horaInicio": "09:55",
  "horaFin": "10:20",
  "puntajeTotal": 20,
  "preguntas": [
    {
      "idPregunta": 1,
      "orden": 1,
      "enunciado": "¿Qué documento fija la conducta del alumno piloto durante la instrucción?",
      "tipoPregunta": "OPCION_MULTIPLE",
      "puntajeMaximo": 4,
      "alternativas": [
        { "id": 1, "respuesta": "El PDI EA-510" },
        { "id": 2, "respuesta": "El manual de vuelo de la aeronave" },
        { "id": 3, "respuesta": "La orden de vuelo del día" },
        { "id": 4, "respuesta": "El reglamento de tránsito aéreo" }
      ],
      "respuestaAlumno": "1"
    },
    {
      "idPregunta": 4,
      "orden": 4,
      "enunciado": "El instructor explica la maniobra cuando su nota mínima es _____.",
      "tipoPregunta": "COMPLETAR",
      "puntajeMaximo": 4,
      "alternativas": [],
      "respuestaAlumno": null
    }
  ]
}
```

En `COMPLETAR`, `alternativas` es `[]`. `respuestaAlumno` es `null` mientras no se haya guardado nada.

Errores:

- **404** D6 si el turno no existe.
- **403** D9 si el alumno no está habilitado para el turno (no pertenece al grupo, o el turno es una subsanación o un rezagado que no le corresponde).
- **409** D8 si la ventana no comenzó o ya cerró.
- **409** D10 si el alumno ya entregó.
- Validación → **400** arreglo: `codAlumno` obligatorio → `El código del alumno es obligatorio.`

### 4.3 `PUT /api/cuestionarios/{id}/respuestas`

Autoguardado. **Reemplaza el conjunto completo**: lo que no venga queda sin responder.

```json
{
  "codAlumno": "111111",
  "respuestas": [
    { "idPregunta": 1, "respuesta": "1" },
    { "idPregunta": 4, "respuesta": "rotor de cola" }
  ]
}
```

`respuesta` es el **id de la alternativa como texto** en `OPCION_MULTIPLE` y `VERDADERO_FALSO`, y el texto escrito en `COMPLETAR`. Una `respuesta` vacía o `null` equivale a no responder esa pregunta. No se califica nada aquí.

**200** `{"mensaje":"Respuestas guardadas.","respuestasGuardadas":2}` (D25). El frontend marca la hora del guardado con su propio reloj: el servidor no devuelve ninguna.

Errores:

- **404** D12 si el cuestionario no existe. **403** D15 si es de otro alumno (dependencia 51).
- **409** D10 si ya fue entregado. **409** D11 si la ventana cerró — el servidor cierra y califica el cuestionario antes de responder (§4.8).
- Validación → **400** arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `codAlumno` | obligatorio | `El código del alumno es obligatorio.` |
| `respuestas` | presente (puede venir vacío) | `Las respuestas son obligatorias.` |
| `respuestas[i].idPregunta` | debe ser una pregunta del cuestionario, sin repetir | `La pregunta no pertenece a este examen.` |
| `respuestas[i].respuesta` | en `OPCION_MULTIPLE` y `VERDADERO_FALSO`, id de una alternativa de esa pregunta | `La alternativa no pertenece a esta pregunta.` |
| | en `COMPLETAR`, hasta 200 caracteres | `La respuesta no puede superar los 200 caracteres.` |

### 4.4 `POST /api/cuestionarios/{id}/entregar`

```json
{ "codAlumno": "111111" }
```

Califica y cierra. **Calificación:**

1. `OPCION_MULTIPLE` y `VERDADERO_FALSO`: correcta si `respuesta` es el id de la alternativa marcada `correcto`.
2. `COMPLETAR`: correcta si coincide con la respuesta esperada **ignorando mayúsculas, tildes, espacios extremos y espacios internos repetidos**.
3. `puntajeObtenido` = `puntajeMaximo` si es correcta, `0` si no. Sin puntajes parciales.
4. `nota` = suma de `puntajeObtenido`, sobre 20, con 2 decimales. Como los puntajes suman 20 (§3.3), la nota nunca pasa de 20.
5. Si el turno es `REZAGADO` y el alumno **no** tiene la inasistencia justificada en el turno de origen (§3.6), la nota se reduce al **50 %** y `reduccionPorRezagado` es `true`.
6. `aprobado` = `nota >= materia.notaMinima`.
7. `fechaEntrega` y `horaEntrega` son la fecha y hora del servidor al entregar.

**200** `{"mensaje":"Examen entregado con éxito.","cuestionario":{…forma de §4.6…}}` (D23). Devolver el detalle completo evita una segunda petición: el frontend ya tiene el resultado que va a mostrar.

Errores: **404** D12 · **403** D15 · **409** D10 si ya fue entregado · **409** D11 si la ventana cerró (en ese caso el cuestionario **ya quedó entregado y calificado** por §4.8, así que el frontend muestra el resultado) · **400** arreglo con `El código del alumno es obligatorio.`

### 4.5 `GET /api/turnos-teoricos/{id}/mi-cuestionario`

El cuestionario del alumno para ese turno, cualquiera sea su estado. Existe para que el alumno navegue siempre por id de turno.

**200** — forma de §4.6. **404** D12 si el alumno no tiene cuestionario en ese turno; **404** D6 si el turno no existe; **403** D15 para otro alumno (dependencia 51). Antes de responder se aplica §4.8.

### 4.6 `GET /api/cuestionarios/{id}`

**200**:

```json
{
  "id": 2,
  "turnoTeorico": { "id": 1, "nombre": "Mensual Adoctrinamiento de Vuelo", "estado": "FINALIZADO" },
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "tipoExamen": "MENSUAL",
  "codAlumno": "666666",
  "alumno": "Ana Torres Martinez",
  "estado": "ENTREGADO",
  "fechaExamen": "2026-09-18",
  "horaInicio": "08:00",
  "horaFin": "09:00",
  "fechaEntrega": "2026-09-18",
  "horaEntrega": "08:41",
  "puntajeTotal": 20,
  "nota": 12.00,
  "aprobado": false,
  "reduccionPorRezagado": false,
  "calificaciones": [
    {
      "idPregunta": 1,
      "orden": 1,
      "enunciado": "¿Qué documento fija la conducta del alumno piloto durante la instrucción?",
      "tipoPregunta": "OPCION_MULTIPLE",
      "respuestaAlumno": "El PDI EA-510",
      "respuestaCorrecta": "El PDI EA-510",
      "explicacion": "El PDI EA-510 es el plan de instrucción vigente del curso.",
      "correcto": true,
      "puntajeMaximo": 4,
      "puntajeObtenido": 4
    }
  ]
}
```

- `respuestaAlumno` y `respuestaCorrecta` son **textos**, no ids: el resultado se lee, no se vuelve a responder. Una pregunta sin responder trae `respuestaAlumno: null`, `correcto: false` y `puntajeObtenido: 0`.
- **Mientras el turno no esté `FINALIZADO`, `calificaciones` va vacío** en las respuestas al propio alumno, para no revelar respuestas a quienes todavía rinden; `nota` y `aprobado` sí llegan. Con `Manage Exams` el detalle llega completo en cualquier estado.
- Un cuestionario `EN_CURSO` trae `nota: null`, `aprobado: null`, `fechaEntrega: null`, `horaEntrega: null` y `calificaciones: []`.

**404** D12. **403** D15 si es de otro alumno y el llamador no tiene `Manage Exams` (dependencia 51).

### 4.7 `GET /api/cuestionarios`

Historial. Filtros: `codAlumno` (obligatorio para `Take Exams`, opcional con `Manage Exams`), `idMateria`, `estado` (`EstadoCuestionario`). Paginado `Page_Sort`, `property` por defecto `"id"`, `direction` por defecto `DESC` en este endpoint (lo último primero); propiedades ordenables: `id`, `nota`, `fechaExamen`.

**200** — `Page` de filas planas:

```json
{
  "content": [
    { "id": 2, "idTurnoTeorico": 1, "turnoTeorico": "Mensual Adoctrinamiento de Vuelo",
      "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "notaMinima": 18,
      "tipoExamen": "MENSUAL", "codAlumno": "666666", "alumno": "Ana Torres Martinez",
      "estado": "ENTREGADO", "fechaExamen": "2026-09-18", "nota": 12.00, "aprobado": false }
  ],
  "totalElements": 3, "totalPages": 1, "size": 10, "number": 0,
  "first": true, "last": true, "numberOfElements": 3, "empty": false
}
```

Lista vacía → **404** D14. **400** arreglo con `El código del alumno es obligatorio.` si falta `codAlumno` sin `Manage Exams`.

### 4.8 Cierre de la ventana

No hay ningún `@Scheduled`, `@EnableScheduling` ni `TaskScheduler` en `sigeda-back`, así que el cierre automático **no puede depender de un trabajo programado**. Regla del contrato:

> Antes de responder, `GET /api/examenes/pendientes`, `GET /api/turnos-teoricos/{id}`, `GET /api/turnos-teoricos/{id}/mi-cuestionario`, `GET /api/cuestionarios/{id}`, `GET /api/cuestionarios`, `PUT /api/cuestionarios/{id}/respuestas` y `POST /api/cuestionarios/{id}/entregar` **califican y cierran** todo cuestionario `EN_CURSO` cuyo `fechaExamen`+`horaFin` ya pasó, con las respuestas que tenga guardadas, aplicando §4.4 puntos 1 a 6. `fechaEntrega`/`horaEntrega` son el `horaFin` del turno, no el momento de la lectura.

Así ningún lector ve un estado inconsistente y ningún alumno conserva un examen abierto por haber cerrado la pestaña. **[Dependencia 55]** La versión limpia es un trabajo programado cada minuto que haga lo mismo; el cierre perezoso se queda igual, porque sigue siendo correcto.

El frontend, además, cuenta el tiempo restante con el reloj del navegador: al llegar a cero deshabilita los campos, fuerza el autoguardado pendiente y llama a `entregar` una vez. Un **409 D11** en esa llamada es el caso esperado y no es un error para el usuario.

---

## 5. Estado teórico del alumno — dependencia 7

```
GET /api/personas/{cod}/estado-teorico      Read (alumno: solo el propio, dependencia 51)
GET /api/estado-teorico?codAlumnos=         Read (dependencia 56)
```

### 5.1 `GET /api/personas/{cod}/estado-teorico`

```json
{
  "codAlumno": "666666",
  "alumno": "Ana Torres Martinez",
  "bloqueadoPorSubsanacion": true,
  "motivo": "Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.",
  "desaprobados": [
    { "idCuestionario": 2, "idTurnoTeorico": 1, "turnoTeorico": "Mensual Adoctrinamiento de Vuelo",
      "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "tipoExamen": "MENSUAL",
      "fechaExamen": "2026-09-18", "nota": 12.00, "notaMinima": 18 }
  ],
  "pendientes": [
    { "idTurnoTeorico": 5, "nombre": "Subsanación Adoctrinamiento de Vuelo", "tipoExamen": "SUBSANACION",
      "idMateria": 3, "materia": "Adoctrinamiento de Vuelo",
      "fechaExamen": "2026-09-26", "horaInicio": "08:00", "horaFin": "09:00" }
  ],
  "causales": []
}
```

- `bloqueadoPorSubsanacion` es verdadero mientras exista un cuestionario desaprobado **sin una subsanación aprobada posterior** de la misma materia. Mientras lo sea, el alumno **no debe programarse en turnos prácticos** (PDI, spec §3.4): el frontend lo ofrece deshabilitado con su motivo y `POST`/`PUT /api/turnos` debe rechazarlo (dependencia 57).
- `motivo` es `null` cuando no está bloqueado; es el texto que la interfaz muestra y por eso lo arma el servidor, con el nombre del turno, la nota con 2 decimales y la nota mínima.
- `desaprobados` son los cuestionarios desaprobados sin subsanar; `pendientes` son los turnos `PROGRAMADO` o `EN_CURSO` de tipo `SUBSANACION` o `REZAGADO` en los que está habilitado.
- `causales` son las causales de bajo rendimiento académico del PDI, con este código y esta descripción:

| Código | Regla |
|---|---|
| `PROMEDIO_ASIGNATURA` | Promedio menor a 13 en una asignatura del curso en tierra |
| `TRES_ASIGNATURAS` | Tres asignaturas desaprobadas |
| `DOS_EXAMENES` | Dos exámenes desaprobados |
| `SEGUNDA_SUBSANACION` | Desaprobó la segunda subsanación de una asignatura |
| `PERIODICOS_EMERGENCIAS` | 3 consecutivos o 5 alternados desaprobados en Emergencias Críticas, No Críticas o Límites de Operación |
| `PERIODICOS_OTROS` | 3 consecutivos o 5 alternados desaprobados en Ingeniería, Adoctrinamiento, Instrumentos, Aerodinámica, Meteorología o Fraseología |
| `INOPINADOS` | 3 consecutivos o 5 alternados desaprobados en inopinados |

Cada causal es `{"codigo":"INOPINADOS","descripcion":"3 inopinados desaprobados de forma consecutiva."}`: la `descripcion` la arma el servidor con los datos concretos, porque solo él los tiene. Una causal **no** bloquea por sí misma: es una alerta para el Consejo de Evaluación y M5 la usa; el bloqueo lo da `bloqueadoPorSubsanacion`.

**404** `"Persona especificada no existe."` si el código no existe. Una persona que **no** es alumno responde `200` con todo en falso y vacío, para que el llamador no tenga que saber el tipo.

### 5.2 `GET /api/estado-teorico?codAlumnos=` — dependencia 56

`codAlumnos` es una lista separada por comas, de 1 a 100 códigos. Arreglo no paginado con un objeto de §5.1 por cada código, en el orden pedido; un código inexistente se **omite** (no rompe la respuesta).

**400** texto D16 si `codAlumnos` falta o llega vacío; **400** texto `"No se pueden consultar más de 100 alumnos a la vez."` si se pasa del tope.

Lo consume el formulario de turno práctico, que necesita el estado de todos los alumnos del selector en una sola petición.

---

## 6. Importación desde IA — cómo se traduce el cuestionario generado

La única integración real de M4. `POST /quizzes/generate` en `sigeda_chat_status` (`contrato-api-aprendizaje.md` §2.1) devuelve un cuestionario de práctica; el instructor lo revisa en `/banco/importar` y lo que apruebe se escribe con `POST /api/preguntas/lote` (§2.6). **Nada se guarda en el banco antes de esa confirmación.**

| Campo de la IA | Campo del banco | Traducción |
|---|---|---|
| `type: "multiple_choice"` | `tipoPregunta: "OPCION_MULTIPLE"` | directa; las 4 `options` pasan a `alternativas` en su orden, y `correcto` es la que empata con `correctAnswer` (`"a"`–`"d"`) |
| `type: "true_false"` | `tipoPregunta: "VERDADERO_FALSO"` | se **sintetizan** dos alternativas, `"Verdadero"` y `"Falso"` en ese orden; `correcto` va en la primera si `correctAnswer` es `"true"`, en la segunda si es `"false"` |
| `type: "fill_blank"` | `tipoPregunta: "COMPLETAR"` | una sola alternativa con `correctAnswer` y `correcto: true`; el `prompt` ya contiene `_____`, que es lo que el banco exige |
| `prompt` (1–2000) | `enunciado` (10–500) | **no coinciden.** Más de 500 caracteres llega recortado a 500 con el aviso E5 y la fila no se puede importar hasta que el instructor la revise; menos de 10 tampoco se puede importar |
| `options[].text` (≤ 500) | `alternativas[].respuesta` (≤ 200) | recortado a 200 con el mismo criterio; **textos repetidos** se señalan con E6 y la fila no se puede importar hasta corregirlos, porque el banco los exige distintos |
| `explanation` (1–1000) | `explicacion` (≤ 1000) | directa, editable. Es el motivo de que `explicacion` exista (spec M4-4) |
| `sourceExcerpt`, `sourceDocumentId` | — | **se descartan.** `sourceDocumentId` siempre llega `null` (`quiz.service.ts:87-90`), así que un fragmento sin documento sería una cita que no se puede comprobar |
| `correctAnswer` de `multiple_choice` | `alternativas[i].correcto` | si no empata con ningún `option.id`, la fila queda sin correcta marcada y no se puede importar |
| — | `idMateria` | **no lo produce la IA**: se elige una vez para el lote, con anulación por pregunta |
| — | `dificultad` | igual que `idMateria` |
| — | `origen` | lo fija el servidor en `IA` por usar `/lote` |
| `id`, `quizId`, `position`, `ownerId`, `modelName`, `createdAt` | — | no se envían |

Notas heredadas de M3 que valen aquí: la generación es **síncrona** con hasta tres intentos del modelo, así que el frontend corta a los 120 s (M3-4); su 400 puede traer texto crudo de Zod, así que solo se muestran los mensajes de la lista cerrada de M3-5 y cualquier otro se reemplaza por E8 (dependencia 50); el servidor de IA **no autentica** (dependencia 39), pero Importar **no** está bloqueada por eso, porque la pregunta se escribe en `sigeda-back` con el `codInstructor` que envía el frontend y no se agrega nada a ninguna lista compartida del lado de la IA (spec M4-5).

**[Dependencia 59, opcional]** Si `POST /quizzes/generate` aceptara `maxPromptChars` (≤ 500) y una pista de dificultad, casi toda la edición manual desaparecería.

---

## 7. Mensajes que el frontend muestra literalmente

Cualquier otro texto del servidor se reemplaza por el genérico y solo va a la consola.

| ID | HTTP | Texto | Donde |
|---|---|---|---|
| D1 | 404 | No existen preguntas disponibles. | §2.1 (el frontend lo trata como lista vacía) |
| D2 | 404 | Pregunta especificada no existe. | §2.2, §2.4, §2.5, §3.3 |
| D3 | 409 | La pregunta se usa en un turno teórico y no se puede eliminar. | §2.5 |
| D4 | 404 | Materia especificada no existe. | §2.3, §2.4, §2.6, §3.3 |
| D5 | 404 | No existen turnos teóricos disponibles. | §3.1 (lista vacía) |
| D6 | 404 | Turno teórico especificada no existe. | §3.2–§3.6, §4.2, §4.5 |
| D7 | 409 | El turno teórico ya no se puede modificar: su ventana comenzó. | §3.4, §3.5 |
| D8 | 409 | El examen no está disponible en este momento. | §4.2 |
| D9 | 403 | El alumno no está habilitado para este examen. | §4.2 |
| D10 | 409 | El examen ya fue entregado. | §4.2, §4.3, §4.4 |
| D11 | 409 | La ventana del examen cerró. | §4.3, §4.4 |
| D12 | 404 | Cuestionario especificada no existe. | §4.3–§4.6 |
| D13 | 409 | Solo se puede registrar la inasistencia de un alumno que no rindió un turno finalizado. | §3.6 |
| D14 | 404 | No existen cuestionarios disponibles. | §4.7 (lista vacía) |
| D15 | 403 | Solo puede consultar sus propios cuestionarios. | §4.3–§4.7 (dependencia 51) |
| D16 | 400 | Debe indicar al menos un código de alumno. | §5.2 |
| D17 | 404 | No existen exámenes pendientes. | §4.1 (lista vacía) |
| D18 | 200 | Pregunta eliminado con éxito. | §2.5 (plantilla `Response.wasDeleted`) |
| D19 | 200 | Turno teórico eliminado con éxito. | §3.5 |
| D20 | 201 | Pregunta guardada con éxito. | §2.3, §2.4 |
| D21 | 201 | Preguntas guardadas con éxito. | §2.6 |
| D22 | 201 | Turno teórico guardado con éxito. | §3.3, §3.4 |
| D23 | 200 | Examen entregado con éxito. | §4.4 |
| D24 | 200 | Inasistencia registrada con éxito. | §3.6 |
| D25 | 200 | Respuestas guardadas. | §4.3 |

Los mensajes de validación de campo (400 arreglo) están en la tabla de cada endpoint y también se muestran literalmente, bajo su campo.

---

## 8. Modelo de datos nuevo y relación con el diagrama entidad-relación

`spring.jpa.hibernate.ddl-auto=none` (`application.properties:19`), las tablas y secuencias son SQL a mano, y en producción los scripts de inicialización **no corren** (`application-prod.properties:35`). Así que la dependencia 53 no es solo Java:

| Tabla | Columnas principales | Secuencia |
|---|---|---|
| `materias` | `id`, `nombre` único, `nota_minima` int, `coeficiente` numeric(3,2), `parte` | `materias_seq` desde 12 |
| `preguntas` | `id`, `id_materia` FK, `enunciado` varchar(500), `tipo_pregunta`, `dificultad`, `explicacion` varchar(1000) null, `origen`, `cod_instructor` FK `personas` | `preguntas_seq` desde 25 |
| `alternativas` | `id`, `id_pregunta` FK, `respuesta` varchar(200), `correcto` bool | `alternativas_seq` desde 101 |
| `turnos_teoricos` | `id`, `nombre`, `id_materia` FK, `tipo_examen`, `fecha_examen` date, `hora_inicio` varchar(5), `hora_fin` varchar(5), `id_grupo` FK, `cod_instructor` FK, `id_turno_origen` FK a sí misma null | `turnos_teoricos_seq` desde 6 |
| `preguntas_turno` | `id_turno_teorico` FK, `id_pregunta` FK, `orden` int, `puntaje_maximo` int; PK compuesta | — |
| `cuestionarios` | `id`, `id_turno_teorico` FK, `cod_alumno` FK, `estado`, `fecha_entrega` date null, `hora_entrega` varchar(5) null, `nota` numeric(4,2) null, `aprobado` bool null, `reduccion_por_rezagado` bool, `inasistencia_justificada` bool null; único `(id_turno_teorico, cod_alumno)` | `cuestionarios_seq` desde 4 |
| `calificaciones_teoricas` | `id_cuestionario` FK, `id_pregunta` FK, `orden` int, `respuesta_alumno` varchar(200) null, `correcto` bool, `puntaje_maximo` int, `puntaje_obtenido` int; PK compuesta | — |

El bloque de secuencias actual está en `schema_prod.sql:100-115` y los valores de arranque de arriba son los de la §9, para que la semilla del backend y los mocks no se pisen.

`inasistencia_justificada` vive en `cuestionarios` aunque un `NO_RINDIO` no tenga cuestionario: en ese caso la fila se crea al registrar la inasistencia (§3.6), con `estado: 'NO_RINDIO'`. Es la forma más simple de tener una fila por (alumno, turno) sin una tabla más.

| Entidad del diagrama | Contrato |
|---|---|
| Materia (**nueva**) | §1, `/api/materias` |
| Turno Teórico | §3, `/api/turnos-teoricos` (+ `idMateria`, `idTurnoOrigen`) |
| Pregunta Teórica | `preguntas[{idPregunta, orden, puntajeMaximo}]` del turno (`preguntas_turno`) |
| Pregunta · Alternativa | §2, `/api/preguntas` con `alternativas` anidadas; la materia se envía como `idMateria` |
| Cuestionario | §4, `/api/cuestionarios`, uno por alumno y turno teórico |
| Calificación Teórica | `calificaciones[]` del cuestionario |

---

## 9. Datos de los mocks

Los mocks parten de la semilla (`data_prod.sql`) más lo que agregaron M1 y M2 (`src/mocks/sigeda/datos.ts`, `crearDatos`) y se reinician por prueba con `reiniciarDatosMock()`, que `src/mocks/reiniciar.ts` llama y `src/test/setup.ts` ejecuta en cada `afterEach`. M4 agrega los handlers `preguntas.ts`, `turnos-teoricos.ts`, `cuestionarios.ts` y `estado-teorico.ts`, y cuatro secuencias: `pregunta` 25, `alternativa` 101, `turnoTeorico` 6, `cuestionario` 4.

Personas y grupos que se usan (ya existen): alumnos `111111` (grupo 1), `222222` (grupo 2), `555555` y `666666` (grupo 3), `777777` (grupo 4, En Chequeo), `999999` (grupo 6), `654321` (**sin grupo**, nunca aparece en un turno teórico); instructores `444444` Juan Torres (cuenta `instructor.perez`) y `888888` Maria Flores; grupo 5 vacío. Materias 1–11, con `notaMinima` 18 en la 3, 20 en la 4 y en la 6, 16 en el resto. Contraseña de todas las cuentas: `123`.

### 9.1 Preguntas — 24 filas, ids 1 a 24

| Ids | Materia | Tipos | Origen | En uso |
|---|---|---|---|---|
| 1, 2, 5 · 3 · 4 | 3 Adoctrinamiento de Vuelo (mínimo 18) | opción múltiple · verdadero o falso · completar | `MANUAL` | sí (turnos 1 y 3) |
| 6 · 7 · 8 | 3 | opción múltiple · verdadero o falso · completar | `MANUAL` | sí (turno 5) |
| 9, 10 | 3 | opción múltiple | **`IA`** | sí (turno 5) |
| 11, 12, 15 · 13 · 14 | 6 Procedimientos de Emergencias (mínimo 20) | opción múltiple · verdadero o falso · completar | `MANUAL` | sí (turno 2) |
| 16 | 6 | opción múltiple | `MANUAL` | **no** |
| 17, 18, 21 · 19 · 20 | 4 Límites de Operación (mínimo 20) | opción múltiple · verdadero o falso · completar | `MANUAL` | sí (turno 4) |
| 22 · 23 · 24 | 1 Aerodinámica Aplicada a Helicópteros (mínimo 16) | opción múltiple · verdadero o falso · completar | `MANUAL` | **no** |

Consecuencias buscadas:

- Materia 3 tiene **10** preguntas: pagina en 2 páginas con `size=6` y en 1 con `size=10`, y el filtro por materia cambia el total.
- Hay al menos una pregunta de cada tipo en las materias 3, 6, 4 y 1, así que cualquier turno puede armarse con los tres tipos.
- **`DELETE` responde 409 (D3)** para las ids 1–15 y 17–21, y `200` para 16, 22, 23 y 24. Hay cuatro preguntas borrables, una por si una prueba borra y no reinicia.
- Las dificultades se reparten `BAJA`/`MEDIA`/`ALTA` de modo que cada filtro devuelva al menos dos filas en la materia 3.
- Las ids 9 y 10 son `IA`, así que el filtro por origen y la columna Origen tienen las dos caras.
- **El 409 de `DELETE /api/materias/{id}` queda derivado:** las materias 1, 3, 4 y 6 tienen preguntas y responden 409; las 2, 5 y 7–11 se pueden eliminar. `MateriaMock.conPreguntas` desaparece.
- Las alternativas se crean en orden y ocupan las ids 1 a 71; la siguiente es 101, para que un id creado en una prueba no colisione con uno de la semilla.

### 9.2 Turnos teóricos — 5 filas, ids 1 a 5

Todas con `codInstructor: "444444"`, el único instructor que alcanza los grupos 1, 2 y 3 a través de `alumnos_turno`. Las fechas son relativas a `hoy`, el argumento de `crearDatos(hoy)`.

| Id | Estado | Materia | Grupo | Tipo | Fecha | Horario | Preguntas | Para |
|---|---|---|---|---|---|---|---|---|
| 1 | `FINALIZADO` | 3 | 3 (`555555`, `666666`) | `MENSUAL` | `hoy − 7` | 08:00–09:00 | 1–5, 4 puntos cada una | Resultados con un aprobado y un desaprobado; origen de la subsanación |
| 2 | `FINALIZADO` | 6 | 2 (`222222`) | `TEST` | `hoy − 5` | 10:00–10:30 | 11–15, 4 puntos | Un solo `NO_RINDIO`: inasistencia y rezagado |
| 3 | `EN_CURSO` | 3 | 1 (`111111`) | `SEMANAL` | `hoy` | derivado del reloj | 1–5, 4 puntos | Rendir examen, autoguardado y auto-entrega |
| 4 | `PROGRAMADO` | 4 | 3 | `QUINCENAL` | `hoy + 3` | 09:00–10:00 | 17–21, 4 puntos | Modificar y eliminar; pendiente que todavía no abre |
| 5 | `PROGRAMADO` | 3 | 3 | **`SUBSANACION`**, origen 1 | `hoy + 1` | 08:00–09:00 | 6–10, 4 puntos | Cadena de subsanación y `estado-teorico` |

- **El horario del turno 3 sale del reloj** al construir los datos: `horaInicio` = ahora − 5 min, `horaFin` = ahora + 20 min, recortado a `23:39`–`23:59` si ya pasaron las 23:39. Es la única forma de tener un examen abierto *ahora* sin congelar el reloj de toda la suite; una prueba que avance 20 minutos con `relojFalso()` cruza el cierre.
- `resultados` del turno 5 contiene **solo a `666666`**, porque es el único que desaprobó el turno 1. Es lo que prueba la regla de habilitados de §3.2.
- Ningún turno incluye a `654321` (sin grupo) ni al grupo 5 (vacío): un intento de programar para el grupo 5 devuelve el error `El grupo no tiene alumnos.`
- El grupo 3 es el único con dos alumnos, así que es el único que puede mostrar resultados mixtos.

### 9.3 Cuestionarios y estado teórico

| Id | Alumno | Turno | Estado | Nota | Detalle |
|---|---|---|---|---|---|
| 1 | `555555` | 1 | `ENTREGADO` | **20.00**, aprobado | Las 5 correctas; entrega `hoy − 7` 08:41 |
| 2 | `666666` | 1 | `ENTREGADO` | **12.00**, desaprobado (mínimo 18) | Correctas las preguntas 1, 2 y 4; entrega `hoy − 7` 08:52 |
| 3 | `111111` | 3 | `EN_CURSO` | `null` | Dos respuestas guardadas (preguntas 1 y 3); `calificaciones: []` |

Resumen del turno 1: `{"habilitados":2,"rindieron":2,"aprobados":1,"notaPromedio":16.00}`. Turno 2: `{"habilitados":1,"rindieron":0,"aprobados":0,"notaPromedio":null}` y `222222` con `estado: "NO_RINDIO"`, `inasistenciaJustificada: false`.

Con 4 puntos por pregunta las notas posibles son 0, 4, 8, 12, 16 y 20: las dos notas fijadas son exactas y no dependen de ningún redondeo.

`estado-teorico`:

| Alumno | `bloqueadoPorSubsanacion` | Contenido |
|---|---|---|
| `666666` | **`true`** | `motivo` con el turno 1, la nota 12.00 y el mínimo 18; `desaprobados: [2]`; `pendientes: [5]`; `causales: []` |
| `999999` | `false` | Todo vacío salvo `causales: [{"codigo":"INOPINADOS","descripcion":"3 inopinados desaprobados de forma consecutiva."}]` — una causal sin bloqueo |
| `111111`, `222222`, `555555`, `777777`, `654321` | `false` | `motivo: null`, los tres arreglos vacíos |
| cualquier otro código existente | `false` | igual |
| un código inexistente | — | 404 `"Persona especificada no existe."`; en la variante en lote, se omite |

Así el formulario de turno práctico tiene siempre exactamente un alumno bloqueado (`666666`) y el resto disponible.

### 9.4 Mock del servidor de IA que M4 agrega

Extiende la §7.2 de `contrato-api-aprendizaje.md`, que se deja como está. `POST /quizzes/generate` gana **un disparador**:

| Disparador | Respuesta | Para |
|---|---|---|
| `questionCount` = 12 | **201** con el cuestionario `c0e50000-0000-4000-8000-000000000002`: 4 preguntas, ids `9e500000-0000-4000-8000-000000000011` a `-0014` | El camino de la importación |

Las cuatro preguntas de ese cuestionario:

| Id | `type` | Particularidad |
|---|---|---|
| `…0011` | `multiple_choice` | `prompt` de **620 caracteres**: se importa recortado a 500 con E5 |
| `…0012` | `multiple_choice` | Las opciones `b` y `c` tienen **el mismo texto**: E6, no se puede importar sin corregir |
| `…0013` | `true_false` | `correctAnswer: "true"`, `options: null`: se sintetizan Verdadero y Falso |
| `…0014` | `fill_blank` | `prompt` con `_____`, `correctAnswer: "autorrotación"` |

Los demás disparadores de la §7.2 no cambian, así que el cuestionario de tres preguntas sigue sirviendo a M3 y el de cuatro es solo de M4.

### 9.5 Lo que no se fija

Se prueban con `server.use(...)` por prueba, porque las fijaciones por defecto tienen que sostener los caminos felices: el banco sin ninguna pregunta (D1), la lista de turnos teóricos vacía (D5), un alumno sin exámenes pendientes (D17), una materia sin preguntas (E12), un autoguardado que falla (E14) y un `estado-teorico` que no responde (E23).

---

## 10. Dependencias

Numeración de la spec (§10, §13.4, §14.5, §15.5 y §16.5). Todas son de `sigeda-back` salvo la 59.

**M4 no funciona contra el backend real hasta que existan la 6 y la 7.** El frontend lo dice en pantalla (aviso E1) y deshabilita sus escrituras mientras el número no figure en `VITE_DEPENDENCIAS_RESUELTAS`: `gestionarMaterias` espera la 5, `gestionarPreguntas`, `importarPreguntas`, `programarTurnoTeorico` y `rendirExamen` esperan la 6, y `bloqueoSubsanacion` espera la 7. Al desplegar una de estas correcciones, avisar para agregar su número.

| # | Cambio | Sección |
|---|---|---|
| 5 (M2) | Catálogo de materias, CRUD y `Manage Subjects` | §1 |
| 6 (M4) | La API de teoría completa: preguntas, turnos teóricos, cuestionarios y los cuatro permisos. La detallan las §§2–4 y la parten la 53 y la 54 | §2, §3, §4 |
| 7 (M4) | `GET /api/personas/{cod}/estado-teorico` | §5 |
| 19 | Mojibake del rol Comandante en la semilla, y ninguna cuenta con `id_rol = 5`: sin eso, `Manage Subjects` no se puede ejercer aunque exista | Permisos |
| 20 (M1) | Propiedad del alumno en el servidor; la amplía la 51 | Convenciones |
| 39 (M3) | El servidor de IA no autentica. **No bloquea** Importar desde IA | §6 |
| 48 (M3) | `sourceDocumentId` por pregunta | §6 |
| 50 (M3) | Mensajes de error del servidor de IA sin texto de librerías | §6 |
| 51 | **Seguridad:** resolver quién llama (`sub` → `Usuario` → `Persona.codigo`), quitar `codInstructor` y `codAlumno` de la firma y aplicar la propiedad en el servidor (D15) | Convenciones, §2, §3, §4, §5 |
| 52 | `GET /api/grupos/instructor/{cod}`: los grupos del instructor con `id` y `nombre`. Hoy un Instructor no puede listar grupos de ninguna forma | §3.3 |
| 53 | Esquema y semilla de teoría: 7 tablas, sus secuencias, sus FK y un camino de migración a producción | §8 |
| 54 | Los cuatro permisos como código en `Permiso.java`, `Permission.java` y `Role.java`. Hasta entonces **cualquier usuario autenticado alcanza todo lo de aquí** | Permisos |
| 55 | Cierre de la ventana del examen: perezoso en cada lectura (obligatorio) y, mejor, un trabajo programado. Hoy no hay ningún `@Scheduled` en el proyecto | §4.8 |
| 56 | `GET /api/estado-teorico?codAlumnos=` en lote; amplía la 7 | §5.2 |
| 57 | `POST` y `PUT /api/turnos` rechazan a un alumno bloqueado por subsanación | §5.1 |
| 58 | **Bug:** `GET /api/personas/{cod}/status` devuelve 404 para todo alumno que no esté `Apto`, descartando las categorías que ya había agregado, y está protegido con `Write` en lugar de `Read` | — (encontrado al dimensionar M4) |
| 59 | Opcional, en `sigeda_chat_status`: `maxPromptChars` y pista de dificultad en `POST /quizzes/generate` | §6 |
| 60 | Convenciones del módulo: **409** con texto plano para las reglas de estado (hoy `CONFLICT` no existe y `ActionExpiredException` devuelve 410), y el **arreglo** de `'campo': mensaje` para la validación (hay que declarar `BindingResult` en la firma) | Convenciones |

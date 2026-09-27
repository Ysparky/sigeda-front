# Contrato API — Instrucción en tierra: teoría, banco de preguntas y examen

**Versión:** 2 · 2026-09-25 · **revisión 2** del mismo día (hallazgos A1–E5 y recortes de alcance 1–5 de `.superpowers/notas/m4/revision-addendum.md`; la versión 1, del 2026-09-19, era una propuesta y queda reemplazada)
**Implementa:** `sigeda-back` (Spring Boot), branch `main` (leído en `ec2b0dd`)
**Consume:** `sigeda-web` M4. Los mocks MSW (`src/mocks/sigeda/`) implementan exactamente este documento.
**Para:** Victor — implementación en `sigeda-back`

Fuentes del dominio: PDI EA-510 2023, Título II cap. II y Título III cap. I (spec §3.4).
Fuentes técnicas: lectura del código de `sigeda-back` con evidencia archivo:línea (spec §16.1 y `.superpowers/notas/investigacion/m4-contrato-backend.md`), decisiones M4-1 a M4-23 (spec §16.2) y dependencias 51–60 (spec §16.5).

**Nada de este contrato existe todavía.** Un grep sobre `src/main` de `materia|pregunta|cuestionario|alternativa|examen|teoric|subsana` no devuelve una sola línea, y ninguna de las 18 tablas de `schema_prod.sql:117-296` es teórica. Así que, salvo la §1, **todo aquí es Nuevo** y no se etiqueta sección por sección: lo que se etiqueta es lo contrario, la regla que ya tiene precedente en el backend, para que el módulo nuevo no invente convenciones.

| Sección | Qué es | Dependencia |
|---|---|---|
| §1 Materias | Ya especificado y ya implementado en los mocks por M2. **No se redefine** | 5, 54 |
| §2 Banco de preguntas | Nuevo | 6, 53, 54 |
| §3 Turnos teóricos (incluye §3.0, el catálogo de grupos) | Nuevo | 6, 52, 53, 54 |
| §4 Rendición del examen | Nuevo | 6, 51, 53, 54, 55 |
| §5 Estado teórico del alumno | Nuevo | 7, 57 |

Lo que **no** está en este contrato y M5 hereda está en spec §16.6: el historial de exámenes del alumno, las inasistencias con la reducción del 50 %, las `causales[]` del estado teórico, la variante en lote del estado teórico y el cruce de horarios entre turnos teóricos.

### Qué cambió respecto de la versión 1

| v1 | v2 | Motivo |
|---|---|---|
| §1 Materias con su propia forma y semilla | Recapitulación de rutas y forma, con puntero a `contrato-api-matricula.md` §6 para validación, textos y semilla | M2 fijó los textos exactos (`"Materia eliminado con éxito."`, el 409, los mensajes de validación) que v1 no tenía |
| `codInstructor` "se toma del usuario autenticado"; alumno "solo el propio" | `codInstructor` y `codAlumno` viajan en el cuerpo o en la query | Ningún controlador de `sigeda-back` sabe quién llama (`@AuthenticationPrincipal` no aparece en ninguna parte; el JWT solo trae `sub`). Dependencia 51 |
| `cierraEn`, `entregadoEn` como instantes ISO-8601 con desfase | `fechaExamen` + `horaInicio` + `horaFin`; `fechaEntrega` + `horaEntrega` | El dominio usa `LocalDate` y horas `varchar`; lo que Spring emitiría para un instante con desfase es indeterminado |
| `Pregunta` sin explicación | `explicacion` (opcional, ≤ 1000) y `origen` (`MANUAL`/`IA`, lo fija el servidor) | La generación de IA siempre produce una explicación y no tenía dónde caer; `origen` hace auditable cuánto aportó la IA |
| "al cerrar la ventana el backend entrega automáticamente" | §4.7: cierre **perezoso** en cada lectura, más la dependencia 55 para el trabajo programado | No hay ningún `@Scheduled` en `sigeda-back`; sin mecanismo, la regla no era implementable |
| `POST /lote` como único detalle de la importación | §6 con el mapeo campo por campo desde `POST /quizzes/generate` | Los límites de las dos puntas no coinciden (2000 vs 500 caracteres, 500 vs 200 en las opciones, `'true'` vs `"Verdadero"`, sin materia ni dificultad) |
| Sin `mi-cuestionario` | `GET /api/turnos-teoricos/{id}/mi-cuestionario` | El alumno navega siempre por id de turno; así `/examenes/$id` y `/examenes/$id/resultado` se recargan sin un segundo espacio de ids |
| Sin fijaciones ni dependencias | §9 (datos de los mocks) y §10 (dependencias) | Es lo que los contratos de M2 y M3 tienen y lo que permite escribir los mocks sin adivinar |
| `409` sin advertencia | `409` con el precedente `410` dicho en voz alta, y sus tres puntos de lanzamiento | `CONFLICT` no aparece en el backend y `ActionExpiredException` devuelve 410, una vez con el texto exacto de D3 |

### Qué cambió en la revisión 2

| Cambio | Motivo |
|---|---|
| **§3.0 nueva**: catálogo de grupos propio del módulo, y `programa` como campo del formulario y del cuerpo de §3.3 | No existe ninguna ruta que devuelva grupos a un Instructor, y el catálogo de alumnos del frontend no puede suplirla: devuelve alumnos y descarta `idGrupo` tras usarlo como etiqueta |
| **`notaMinimaAplicada`** en §3.2, §4.1, §4.2 y §4.6, con la regla de Pre-Solo | Sin ella un Pre-Solo en una materia de mínimo 16 aprobaría con 16, contra el PDI (spec §3.4), y la interfaz mostraría el umbral equivocado |
| `calificaciones_teoricas` gana `enunciado` y `respuesta_correcta` (§8); §2.4 explica qué se conserva y qué se lee en vivo | §2.4 prometía un historial que el esquema no podía guardar, y a la vez permitía editar una pregunta en uso |
| Ventana mínima de **10 minutos** (§3.3) y una regla única de fecha futura para registrar y modificar | El aviso de los 5 minutos necesitaba una ventana que lo contenga; §3.3 y §3.4 pedían cosas distintas |
| `codInstructor`: **400** si falta o está mal formado, **404** D27 si no existe | Eran un solo mensaje para dos causas distintas |
| D26–D28 para tres textos que se afirmaban sin id; D12 y D15 dicen "examen", no "cuestionario" | El frontend solo muestra literalmente los mensajes con id, y la copia de M4 no debe mezclar el examen calificado con el cuestionario de práctica de M3 |
| §3.6 (inasistencias), `GET /api/cuestionarios` (historial), `causales[]`, §5.2 (lote) y la reducción del 50 % **salen del contrato** | Recortes de alcance 1–4; su único consumidor es M5 (spec §16.6). Con ellos se va el error de guardar `NO_RINDIO` en una columna cuyo enum no lo tiene |
| §9.2 ya no deriva el horario del reloj; lo abre un ayudante de pruebas | `reiniciarDatosMock()` corre en `afterEach` con temporizadores reales, antes de que exista el reloj falso |
| Duplicados dentro de un mismo `lote` se rechazan (§2.6); una alternativa de más de 200 caracteres se recorta en silencio (§6) | Dos huecos que la importación dejaba sin regla |
| Citas corregidas: `errors.ts:89/90/91/101`, `materias.ts:61-118`, `comun.ts:71-113`, `http.ts:138-145`/`:147-154`, `projections/CatalogoByPrograma.java`, `uuuu-MM-dd` | Eran slips de línea o de ruta; una de ellas citaba la regla contraria |

---

## Convenciones

- **Base y autenticación.** Prefijo `/api` sobre `http://localhost:8080`; `Authorization: Bearer <jwt>` en todo (`security/config/SecurityConfig.java:50-53`); CORS solo para `http://localhost:5173` (`:77-80`). Sin token válido → `401`.
- **Autorización.** `@PreAuthorize("hasRole('<Permiso>')")` por método; la autoridad es `"ROLE_" + permiso.nombre`. Los cuatro permisos de este contrato **no existen todavía** (dependencia 54): hasta que existan, cualquier usuario autenticado alcanza cualquier endpoint de aquí.
- **Quién llama.** Ningún controlador lo sabe. Mientras la dependencia 51 no exista:
  - las escrituras de §2 y §3 llevan `codInstructor` en el cuerpo, como ya lo hace `POST /api/turnos` en `ec2b0dd`;
  - los endpoints del alumno (§4) llevan `codAlumno` en el cuerpo o en la query.
  El frontend lo toma del `codPersona` de la sesión — **nunca de un parámetro de la URL** — y comprueba la propiedad en sus cargadores de ruta; **es una comprobación de interfaz, no de servidor** (la misma situación que la dependencia 20 para turnos y evaluaciones). Cuando la 51 llegue, los dos campos desaparecen de la firma y el servidor resuelve `sub` → `Usuario` → `Persona.codigo`.
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

  Cómo lo lee el frontend (`src/lib/api/errors.ts`): un cuerpo de **texto plano** por debajo de 500 se muestra tal cual (`:91`), y lo mismo un 403 de texto (`:89`); un **arreglo** de textos se reparte por campo (`:90`). Ojo: `:84` es la rama de los 5xx, donde el texto **no** se muestra y solo va a la consola.

  **[Dependencia 60]** Para que el 400 salga como arreglo hay que declarar `BindingResult` en la firma del handler y llamar a `Response.setErrorsFrom`. Un `@Valid` sin `BindingResult` produce en cambio `ErrorResponse{status:400,error:"Error al validar el modelo",message:null,messages:[…]}` (`GlobalExceptionHandler.java:80-92`) — pero `messages[]` lleva **las mismas cadenas** `'campo': mensaje` y `errors.ts:101` las reparte con el mismo parser, así que **para el cliente da igual cuál de las dos llegue**: es una preferencia de consistencia con el resto del módulo, no un requisito. Lo que sí importa: `utils/ConstraintErrors.java:38-44` **nunca ordena**, así que un campo puede traer varios mensajes en cualquier orden; el frontend muestra el primero de cada campo y los mocks emiten solo el primer mensaje aplicable, en el orden de las tablas de aquí.
- **`409` y su precedente.** Este contrato usa **409 con texto plano** para "la operación no es válida en el estado actual". Aviso: `grep -rn CONFLICT src/main/java` no devuelve nada y el caso equivalente del backend hoy es **410 Gone** (`ActionExpiredException` → `GlobalExceptionHandler.java:131-140`), lanzado en tres lugares: `maniobra/services/ManiobraService.java:129` con `"La maniobra no se pudo eliminar, está presente en un turno."` — **el análogo exacto del D3 de este contrato** —, `turno/services/TurnoService.java:138` y `turno/controllers/TurnoController.java:208`, ambos con `"No se puede modificar. El turno ya ha sido evaluado."` Al frontend le sirven las dos (`errors.ts:91` para el texto plano, `:83`/`:101`/`:102` para `ErrorResponse`), pero los mocks implementan 409; si se prefiere 410, avisar y se cambia en un solo lugar. **[Dependencia 60]**
- **Creación.** `Response.wasSaved` arma la clave del cuerpo como `nombreEntidad.toLowerCase()` y siempre dice "guardada", lo que daría la clave JSON `"turno teórico"` (con espacio y tilde) y "Preguntas guardada con éxito." Por eso las creaciones de este contrato son **respuestas manuales** con claves camelCase y concordancia correcta: `{"mensaje":…,"pregunta":…}`, `{"mensaje":…,"preguntas":[…]}`, `{"mensaje":…,"turnoTeorico":…}`, `{"mensaje":…,"cuestionario":…}`. Los borrados sí usan la plantilla tal cual, porque M2 ya entregó `"Materia eliminado con éxito."` y la consistencia pesa más que la gramática ahí.
- **Cómo se llama al examen.** La tabla y la ruta se llaman `cuestionarios` porque es la entidad del diagrama, pero **todo texto que ve una persona dice "examen"**: `Response.isNull` recibe `"Examen"` (D12) y D15 habla de exámenes. El "cuestionario" de la interfaz es el de práctica de M3 y los dos no deben leerse igual.
- **Fechas y horas.** Fechas `yyyy-MM-dd`; el backend las lee con `DateTimeFormatter.ofPattern("uuuu-MM-dd")` (`utils/CustomDateDeserializer.java:15`), que es **el mismo formato en el cable** y solo difiere en el manejo de eras. Horas `"HH:mm"` como en los turnos prácticos (`schema_prod.sql:200-201,274-275`). **Este contrato no tiene ningún instante ISO-8601**: la ventana del examen es `fechaExamen` + `horaInicio` + `horaFin`, la entrega es `fechaEntrega` + `horaEntrega`, y el frontend arma la cuenta atrás con el reloj del navegador (zona `America/Lima`). El servidor vuelve a comprobar la ventana en cada escritura y responde D11 si cerró.
- **Números.** `nota`, `notaPromedio` y `coeficiente` son números JSON con 2 decimales; `notaMinima`, `notaMinimaAplicada`, `puntajeMaximo` y `puntajeObtenido` son enteros. Aviso: en el lado práctico las notas se guardan como texto (`evaluaciones_practicas.promedio varchar(255)`, `CalculoNota.java:85`); aquí se piden como números y el frontend tolera ambos con `aNota` (`src/features/evaluaciones/api.ts:111-115`).
- **Paginación.** `utils/Page_Sort.java` (`page` def. `0`, `size` def. `6`, `direction` def. **`ASC` en todos los endpoints de este contrato**, `property` **uno**, sin tope de tamaño), con el `Page` de Spring serializado directo; el frontend lee `content`, `totalElements`, `totalPages`, `size` y `number`, pide `size=10` y envía `direction` cuando quiere otro orden. Los mensajes de error de paginado son los de `contrato-api-matricula.md` › Paginación. Ninguna propiedad ordenable de este contrato admite nulos, así que no hace falta definir dónde caen. Las **filas de lista son planas** (los nombres de materia y grupo como texto) y los **detalles anidan** (`materia: {id, nombre}`), igual que `TurnoRealizado` frente a `DetalleTurno`.
- **Enumeraciones.** `spring.jackson.deserialization.READ_UNKNOWN_ENUM_VALUES_AS_NULL=true` (`application.properties:35`): un valor inválido llega como `null`, así que **ausente e inválido no se distinguen** y cada enum tiene **un solo mensaje** que cubre los dos casos, como hizo materias.
- **Listas vacías.** 404 con texto; el frontend lo trata como lista vacía en cualquier endpoint de lista (`src/lib/api/http.ts:147-154` para un arreglo, `:138-145` para una página).
- **Mensajes visibles.** El frontend muestra literalmente los mensajes de la §7 y nada más.

---

## Permisos

| Permiso | Roles | Uso en este contrato |
|---|---|---|
| `Read` | todos | GET de materias (§1); §5 (alumno: solo el propio, dependencia 51) |
| `Manage Subjects` | Administrador Web, Comandante de Escuadrón | POST/PUT/DELETE de materias (§1) |
| `Manage Questions` | Administrador Web, Instructor | todo §2 |
| `Manage Exams` | Administrador Web, Instructor | todo §3, y el detalle de cualquier examen (§4.6) |
| `Take Exams` | Alumno | §4.1–§4.5 |

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

**Dos de los tres últimos son derivados y no se guardan.**

- `EstadoTurnoTeorico`: `PROGRAMADO` si `fechaExamen`+`horaInicio` está en el futuro, `FINALIZADO` si `fechaExamen`+`horaFin` está en el pasado, `EN_CURSO` entre ambos. El servidor lo calcula con su propio reloj y lo devuelve; el frontend lo muestra y, en la pantalla de rendición, además calcula el tiempo restante con el reloj del navegador.
- `EstadoRendicion`: el estado de un alumno frente a un turno. `NO_RINDIO` si **no tiene fila** en `cuestionarios`, `EN_CURSO` o `ENTREGADO` según el valor de `cuestionarios.estado`. **`NO_RINDIO` nunca se escribe en ninguna columna**: la única columna de estado es `cuestionarios.estado`, cuyo dominio es `EstadoCuestionario`.
- `EstadoCuestionario` es el único que se persiste.

`TipoExamen` **no** se valida contra la materia: el PDI asocia cada tipo periódico con asignaturas concretas, pero este contrato deja libre el par (spec M4-22).

---

## 1. Materias — ya especificado por M2

**División de trabajo:** esta sección recapitula rutas, permisos y forma porque el resto del contrato las usa; **la validación exacta, los textos de error y la semilla viven en `contrato-api-matricula.md` §6** y no se repiten aquí. La referencia va en un solo sentido: §6 de aquel documento no remite de vuelta a esta sección.

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

Lo único que M4 toca:

- El **409** de `DELETE` — texto `"La materia no se puede eliminar, tiene preguntas o turnos teóricos."` — pasa a ser **derivado**: se dispara si la materia tiene al menos una pregunta (§2) o al menos un turno teórico (§3). Hasta M4 era un booleano fijado a mano en los mocks (`MateriaMock.conPreguntas`), que desaparece.
- `notaMinima` **empieza a usarse**: es la base de `notaMinimaAplicada` en §3.2 y §4.6, y el número que la interfaz muestra al lado de la nota. Antes de M4 se guardaba y validaba sin que nadie lo leyera.
- `coeficiente` sigue sin consumidor: es la ponderación del NIT que calcula M5 (dependencia 8).

---

## 2. Banco de preguntas

```
GET    /api/preguntas?idMateria=&dificultad=&tipo=&origen=&texto=&page=&size=&direction=&property=   Manage Questions
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

El enunciado **no es único**: dos preguntas del banco pueden decir lo mismo, porque una misma idea se pregunta de formas equivalentes y nada lo prohíbe. La única regla de duplicados está dentro de un mismo `lote` (§2.6).

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

**404** D4 si `idMateria` no existe; **404** D27 si `codInstructor` no corresponde a ninguna persona. No son errores de campo: el patrón de la casa para un id anidado inexistente es 404, como pide la dependencia 34.

Validación → **400** arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `codInstructor` | obligatorio y de 6 dígitos (que exista es el 404 D27) | `El código del instructor es obligatorio.` |
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

Mismo cuerpo, mismas reglas y mismo `201` que §2.3. `origen` **no cambia nunca**: una pregunta importada desde IA que se corrige a mano sigue siendo `IA`. `404` D2 si la pregunta no existe, `404` D4 si la nueva `idMateria` no existe, `404` D27 si el `codInstructor` no existe.

**Las alternativas se actualizan en su lugar, no se borran y se reinsertan.** El arreglo `alternativas` del cuerpo no lleva ids, así que se empareja por posición con las alternativas que la pregunta ya tiene, ordenadas por `id`: la alternativa de la posición *i* conserva su `id` y solo cambia su `respuesta` y su `correcto`, una alternativa que el cuerpo ya no trae se borra y una posición nueva recibe un `id` nuevo. **No es un detalle interno:** §4.3 guarda la respuesta del alumno como el `id` de la alternativa en texto y §4.4 califica comparando contra ese `id`, de modo que renumerar las alternativas de una pregunta que está en un examen `EN_CURSO` le borraría la respuesta al alumno sin que nada lo avise.

**Se puede modificar una pregunta `enUso`, y lo que eso significa:**

| Quién la usa | Qué ve después de la modificación |
|---|---|
| Un turno teórico `PROGRAMADO` o `EN_CURSO` | El texto nuevo: `preguntas_turno` guarda una referencia, no una copia |
| Un examen `EN_CURSO` | El texto nuevo, la próxima vez que se lea (§4.2 lo arma desde la pregunta) |
| Un examen `ENTREGADO` | **El texto que tenía al entregarse**: `calificaciones_teoricas` guarda `enunciado` y `respuesta_correcta` en el momento de calificar (§8), así que un resultado ya emitido no cambia nunca |

La `explicacion`, en cambio, **se lee en vivo desde la pregunta** también en un examen entregado: no se copia. Es una aclaración didáctica, no parte de la calificación, y conviene que una corrección la mejore para todos.

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
| `preguntas[i].enunciado` | sin repetir dentro del mismo lote (mismo `enunciado` y mismo `tipoPregunta`, sin distinguir mayúsculas ni espacios extremos) | `La pregunta está repetida en este lote.` |

El duplicado se rechaza solo dentro del lote, no contra el banco: un modelo que genera dos veces la misma pregunta es un defecto de esa generación, mientras que una pregunta que ya existe en el banco puede ser una variante deliberada.

**404** D4 si alguna `idMateria` no existe; **404** D27 si `codInstructor` no existe.

---

## 3. Turnos teóricos

```
GET    /api/turnos-teoricos/grupos?codInstructor=&programa=                             Manage Exams
GET    /api/turnos-teoricos?idGrupo=&idMateria=&estado=&tipoExamen=&codInstructor=&fechaPre=&fechaPost=&page=&size=&direction=&property=   Manage Exams
GET    /api/turnos-teoricos/{id}                                                        Manage Exams
POST   /api/turnos-teoricos                                                             Manage Exams
PUT    /api/turnos-teoricos/{id}                                                        Manage Exams
DELETE /api/turnos-teoricos/{id}                                                        Manage Exams
```

### 3.0 `GET /api/turnos-teoricos/grupos` — el catálogo que el formulario necesita

**Por qué es un endpoint nuevo y no una reutilización.** Registrar un turno teórico necesita grupos con `id` y `nombre`, y hoy no hay ninguna ruta que se los dé a un Instructor:

| Ruta existente | Permiso | Qué devuelve | Por qué no sirve |
|---|---|---|---|
| `GET /api/grupos` (`GrupoController.java:56-57`) | `Manage Groups` | `Page<IndexGrupo>` = `{id, nombre, descripcion, programa}` | El Instructor no tiene `Manage Groups`, y no hay filtro por `programa` |
| `GET /api/grupos/programa/{nombre}` (`:123-125`) | `View All Groups` | `Page<CatalogoByPrograma>` | El Instructor tampoco lo tiene, y la proyección (`projections/CatalogoByPrograma.java:5-14`) trae `idGrupo` y `estado` **por alumno**, sin `nombre` de grupo ni fila de grupo |
| `GET /api/grupos/instructor/{cod}/programa/{nombre}` (`:154-156`) | `View My Group` | `Page<CatalogoByAlumnoTurno>` sobre filas de `alumnos_turno`, una por (alumno, turno) | Son alumnos con los que ya voló, no grupos; y la proyección declara `List<Alumno> getPersona()` contra un `Persona` único |

El catálogo de alumnos del frontend tampoco puede suplirlo: `listarAlumnos` (`src/features/catalogos/api.ts:86-118`) devuelve alumnos y `aOpcion` (`:73-75`) usa `idGrupo` para armar una etiqueta y lo descarta.

Parámetros: `programa` (obligatorio, `PDI` o `PDE`) y `codInstructor` (obligatorio mientras no exista la dependencia 51; omitirlo solo se permite al llamador que además tiene `Manage Groups`, y entonces devuelve todos los grupos del programa).

**200** — arreglo **no paginado**, ordenado por `nombre`. Solo grupos **con al menos un alumno**, para que el selector no pueda ofrecer un grupo que la validación de §3.3 va a rechazar:

```json
[
  { "id": 1, "nombre": "Grupo 1", "programa": "PDI", "cantAlumnos": 1 },
  { "id": 2, "nombre": "Grupo 2", "programa": "PDI", "cantAlumnos": 1 },
  { "id": 3, "nombre": "Grupo 3", "programa": "PDI", "cantAlumnos": 2 }
]
```

Lista vacía → **404** D28. **404** D27 si `codInstructor` no existe. **400** arreglo si falta `programa` → `Ingresar programa válido.`, o si falta `codInstructor` sin tener `Manage Groups` → `El código del instructor es obligatorio.`

**De dónde salen los grupos de un instructor.** No hay relación instructor↔grupo en el esquema (`grupos` no tiene columna de instructor; el único enlace es `turnos.cod_instructor` → `alumnos_turno` → `personas.id_grupo`). El servidor debe derivarlos por ese camino: los grupos de los alumnos que voló. **[Dependencia 52]** Si en el futuro `grupos` gana un instructor asignado, este endpoint no cambia de forma.

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
      "programa": "PDI",
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

**200** — detalle con preguntas, resultados y resumen. Antes de responder, el servidor cierra los exámenes vencidos de este turno (§4.7).

```json
{
  "id": 1,
  "nombre": "Mensual Adoctrinamiento de Vuelo",
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "tipoExamen": "MENSUAL",
  "notaMinimaAplicada": 18,
  "fechaExamen": "2026-09-18",
  "horaInicio": "08:00",
  "horaFin": "09:00",
  "estado": "FINALIZADO",
  "grupo": { "id": 3, "nombre": "Grupo 3", "programa": "PDI" },
  "instructor": { "codigo": "444444", "nombre": "Juan Torres Perez" },
  "turnoOrigen": null,
  "preguntas": [
    { "idPregunta": 1, "orden": 1, "enunciado": "…", "tipoPregunta": "OPCION_MULTIPLE", "dificultad": "MEDIA", "puntajeMaximo": 4 }
  ],
  "resultados": [
    { "codAlumno": "555555", "alumno": "Pedro Rodriguez Garcia", "estado": "ENTREGADO", "idCuestionario": 1, "nota": 20.00, "aprobado": true,  "bloqueadoPorSubsanacion": false },
    { "codAlumno": "666666", "alumno": "Ana Torres Martinez",    "estado": "ENTREGADO", "idCuestionario": 2, "nota": 12.00, "aprobado": false, "bloqueadoPorSubsanacion": true }
  ],
  "resumen": { "habilitados": 2, "rindieron": 2, "aprobados": 1, "notaPromedio": 16.00 }
}
```

- `notaMinimaAplicada` = `max(materia.notaMinima, tipoExamen === 'PRE_SOLO' ? 18 : 0)`. Es el umbral que usó `aprobado` y **el único número que la interfaz muestra como mínimo**: el frontend no aplica la excepción del Pre-Solo por su cuenta.
- `turnoOrigen` es `null` o `{"id":1,"nombre":"…","fechaExamen":"2026-09-18"}`.
- `preguntas` viene ordenado por `orden` (1..n), el orden fijado al crear el turno y el que ve el alumno.
- `resultados` lista a los **alumnos habilitados**, ordenados por apellido: todos los del grupo, salvo
  - `SUBSANACION`: solo los que **desaprobaron** el turno de origen;
  - `REZAGADO`: solo los que **no rindieron** el turno de origen.
  Un alumno sin grupo nunca aparece en ningún turno.
- `estado` de un resultado es `EstadoRendicion`, **derivado** (sin fila en `cuestionarios` → `NO_RINDIO`). `nota` y `aprobado` son `null` mientras el alumno no haya entregado.
- `bloqueadoPorSubsanacion` repite el dato de §5 para no obligar a una consulta por alumno desde esta pantalla.
- `notaPromedio` es el promedio de los que entregaron, o `null` si no entregó nadie.

**404** D6.

### 3.3 `POST /api/turnos-teoricos`

```json
{
  "codInstructor": "444444",
  "nombre": "Quincenal Límites de Operación",
  "programa": "PDI",
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

- **`programa`** se elige antes que el grupo y es lo que acota §3.0, igual que acota los selectores de instructor y de alumnos en el formulario de turno práctico. Viaja en el cuerpo y el servidor comprueba que coincide con el programa del grupo, de modo que un cuerpo armado a mano no pueda cruzarlos. Las materias **no** se filtran por programa: `materias` no tiene esa columna y las 11 del catálogo son el curso en tierra del PDI.
- El `orden` de cada pregunta es su posición en el arreglo y se guarda: no se envía ni se puede cambiar después sin modificar el turno.
- **No se valida el cruce de horarios** entre dos turnos teóricos del mismo grupo. No hay precedente: `HorasInicioFin` nunca se llama ni para los turnos prácticos (dependencia 15). Queda anotado en spec §16.6 para que M5 no suponga que M4 lo comprueba.

**201** `{"mensaje":"Turno teórico guardado con éxito.","turnoTeorico":{…forma de §3.2…}}` (D22).

**404** D4 si `idMateria` no existe; **404** D26 si `idGrupo` no existe; **404** D27 si `codInstructor` no existe; **404** D6 si `idTurnoOrigen` no existe; **404** D2 si alguna `idPregunta` no existe.

Validación → **400** arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `codInstructor` | obligatorio y de 6 dígitos (que exista es el 404 D27) | `El código del instructor es obligatorio.` |
| | el grupo debe ser uno de los que devuelve §3.0 para ese instructor, **salvo que el llamador tenga además `Manage Groups`**: a ese le basta que el grupo pertenezca al `programa` enviado, igual que §3.0 le devuelve todos los grupos del programa. `codInstructor` sigue siendo el de quien programa el turno y se guarda como tal | `El grupo no corresponde al instructor.` |
| `nombre` | obligatorio | `El nombre es obligatorio` |
| | 10 a 60 caracteres, no solo espacios | `El nombre debe tener entre 10 y 60 caracteres.` |
| `programa` | obligatorio y `PDI` o `PDE` | `Ingresar programa válido.` |
| | debe coincidir con el programa del grupo | `El programa no corresponde al grupo.` |
| `idMateria` | obligatoria | `La materia es obligatoria.` |
| `tipoExamen` | obligatorio y uno de los 11 valores | `Ingresar tipo de examen válido.` |
| `fechaExamen` | obligatoria, `yyyy-MM-dd` | `La fecha del examen es obligatoria.` |
| | **`fechaExamen` con `horaInicio` debe quedar en el futuro** (la misma regla en §3.3 y §3.4) | `El examen debe comenzar en el futuro.` |
| `horaInicio` · `horaFin` | obligatorias, formato `HH:mm` | `La hora de inicio es obligatoria.` · `La hora de fin es obligatoria.` |
| | `horaFin` al menos **10 minutos** después de `horaInicio` | `La ventana del examen debe durar al menos 10 minutos.` |
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

La ventana mínima de 10 minutos existe para que el aviso de "quedan 5 minutos" de la interfaz siempre tenga dónde dispararse.

La regla de las 24 horas del PDI (una subsanación se rinde dentro de las 24 h del examen desaprobado) **no se valida**: el frontend avisa y deja guardar (spec M4-20).

### 3.4 `PUT /api/turnos-teoricos/{id}`

Mismo cuerpo, **exactamente** las mismas reglas y mismo `201` que §3.3 — incluida la de que `fechaExamen` con `horaInicio` quede en el futuro, que por eso se enuncia una sola vez.

**404** D6. **409** D7 si el turno no está `PROGRAMADO` (su ventana ya comenzó o terminó).

### 3.5 `DELETE /api/turnos-teoricos/{id}`

**200** texto `"Turno teórico eliminado con éxito."` (D19). Borra sus `preguntas_turno`; no puede haber exámenes, porque solo se borra un turno `PROGRAMADO`.

**404** D6. **409** D7 si el turno no está `PROGRAMADO`.

---

## 4. Rendición del examen (alumno)

```
GET  /api/examenes/pendientes?codAlumno=                        Take Exams
POST /api/turnos-teoricos/{id}/iniciar                          Take Exams
PUT  /api/cuestionarios/{id}/respuestas                         Take Exams
POST /api/cuestionarios/{id}/entregar                           Take Exams
GET  /api/turnos-teoricos/{id}/mi-cuestionario?codAlumno=       Take Exams
GET  /api/cuestionarios/{id}                                    Take Exams (propio) · Manage Exams
```

`codAlumno` es obligatorio en las rutas que lo declaran y el frontend lo toma de la sesión, **nunca de la URL**; con la dependencia 51 desaparece y el servidor lo resuelve. Un `codAlumno` distinto del propio debe responder **403** D15 en cuanto la 51 exista; hoy no hay manera de comprobarlo y el frontend es el único guardián.

El historial del alumno (`GET /api/cuestionarios` con filtros) **no está en M4**: es de M5, con el legajo (spec §16.6). Lo único que el alumno consulta después de entregar es su propio examen, por §4.5.

### 4.1 `GET /api/examenes/pendientes`

Los turnos en los que el alumno está habilitado (§3.2), en estado `PROGRAMADO` o `EN_CURSO`, sin examen entregado. **Arreglo no paginado**, ordenado por `fechaExamen` y luego `horaInicio`; la lista es corta por construcción.

```json
[
  {
    "idTurnoTeorico": 3,
    "nombre": "Semanal Adoctrinamiento de Vuelo",
    "idMateria": 3,
    "materia": "Adoctrinamiento de Vuelo",
    "notaMinimaAplicada": 18,
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

- **Idempotente**: si el alumno ya tiene un examen `EN_CURSO` de este turno, lo devuelve con las respuestas guardadas en lugar de crear otro. Recargar la página retoma el examen.
- El **orden de las preguntas** es el `orden` del turno (§3.3) y se guarda en el examen al crearlo, así que nunca cambia entre recargas ni entre alumnos.
- La respuesta **nunca incluye `correcto`, `respuestaCorrecta` ni `explicacion`**.

**201** la primera vez, **200** las siguientes:

```json
{
  "id": 3,
  "idTurnoTeorico": 3,
  "turnoTeorico": "Semanal Adoctrinamiento de Vuelo",
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "tipoExamen": "SEMANAL",
  "notaMinimaAplicada": 18,
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

- **404** D6 si el turno no existe; **404** D27 si `codAlumno` no existe.
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

- **404** D12 si el examen no existe. **403** D15 si es de otro alumno (dependencia 51).
- **409** D10 si ya fue entregado. **409** D11 si la ventana cerró — el servidor cierra y califica el examen antes de responder (§4.7).
- Validación → **400** arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `codAlumno` | obligatorio | `El código del alumno es obligatorio.` |
| `respuestas` | presente (puede venir vacío) | `Las respuestas son obligatorias.` |
| `respuestas[i].idPregunta` | debe ser una pregunta del examen, sin repetir | `La pregunta no pertenece a este examen.` |
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
5. `notaMinimaAplicada` = `max(materia.notaMinima, tipoExamen === 'PRE_SOLO' ? 18 : 0)`, y **`aprobado` = `nota >= notaMinimaAplicada`**. El PDI fija 18 para el Pre-Solo (spec §3.4), así que un Pre-Solo en una materia de mínimo 16 **no** aprueba con 16. El valor se devuelve, no se deduce en el cliente.
6. Se copian a `calificaciones_teoricas` el `enunciado` y la `respuesta_correcta` de cada pregunta, para que el resultado no cambie si la pregunta se edita después (§2.4).
7. `fechaEntrega` y `horaEntrega` son la fecha y hora del servidor al entregar.

**Prevalece la primera nota.** Una subsanación es un examen aparte, con su propia fila: **no reemplaza ni corrige la nota del examen desaprobado**, que queda tal cual en su propio examen y en `estado-teorico.desaprobados`. Aprobar la subsanación levanta el bloqueo (§5.1) y nada más. Los promedios que decidan qué hacer con las dos notas son de M5 (dependencia 8).

**200** `{"mensaje":"Examen entregado con éxito.","cuestionario":{…forma de §4.6…}}` (D23). Devolver el detalle completo evita una segunda petición: el frontend ya tiene el resultado que va a mostrar.

Errores: **404** D12 · **403** D15 · **409** D10 si ya fue entregado · **409** D11 si la ventana cerró (en ese caso el examen **ya quedó entregado y calificado** por §4.7, así que el frontend muestra el resultado) · **400** arreglo con `El código del alumno es obligatorio.`

### 4.5 `GET /api/turnos-teoricos/{id}/mi-cuestionario`

El examen del alumno para ese turno, cualquiera sea su estado. Existe para que el alumno navegue siempre por id de turno, y es lo único que M4 necesita para volver a ver un resultado.

**200** — forma de §4.6. **404** D12 si el alumno no tiene examen en ese turno; **404** D6 si el turno no existe; **403** D15 para otro alumno (dependencia 51). Antes de responder se aplica §4.7.

### 4.6 `GET /api/cuestionarios/{id}`

**200**:

```json
{
  "id": 2,
  "turnoTeorico": { "id": 1, "nombre": "Mensual Adoctrinamiento de Vuelo", "estado": "FINALIZADO" },
  "materia": { "id": 3, "nombre": "Adoctrinamiento de Vuelo", "notaMinima": 18 },
  "tipoExamen": "MENSUAL",
  "notaMinimaAplicada": 18,
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

- `enunciado`, `respuestaAlumno` y `respuestaCorrecta` son **textos**, no ids: el resultado se lee, no se vuelve a responder. `enunciado` y `respuestaCorrecta` salen de `calificaciones_teoricas`, es decir del momento de la entrega; `explicacion` se lee **en vivo** desde la pregunta y puede ser `null` (§2.4).
- Una pregunta sin responder trae `respuestaAlumno: null`, `correcto: false` y `puntajeObtenido: 0`.
- **Mientras el turno no esté `FINALIZADO`, `calificaciones` va vacío** en las respuestas al propio alumno, para no revelar respuestas a quienes todavía rinden; `nota`, `aprobado` y `notaMinimaAplicada` sí llegan. Con `Manage Exams` el detalle llega completo en cualquier estado.
- Un examen `EN_CURSO` trae `nota: null`, `aprobado: null`, `fechaEntrega: null`, `horaEntrega: null` y `calificaciones: []`.

**404** D12. **403** D15 si es de otro alumno y el llamador no tiene `Manage Exams` (dependencia 51).

### 4.7 Cierre de la ventana

No hay ningún `@Scheduled`, `@EnableScheduling` ni `TaskScheduler` en `sigeda-back`, así que el cierre automático **no puede depender de un trabajo programado**. Regla del contrato:

> Antes de responder, `GET /api/examenes/pendientes`, `GET /api/turnos-teoricos/{id}`, `GET /api/turnos-teoricos/{id}/mi-cuestionario`, `GET /api/cuestionarios/{id}`, `PUT /api/cuestionarios/{id}/respuestas` y `POST /api/cuestionarios/{id}/entregar` **califican y cierran** todo examen `EN_CURSO` cuyo `fechaExamen`+`horaFin` ya pasó, con las respuestas que tenga guardadas, aplicando §4.4 puntos 1 a 6. `fechaEntrega`/`horaEntrega` son el `horaFin` del turno, no el momento de la lectura.

Así ningún lector ve un estado inconsistente y ningún alumno conserva un examen abierto por haber cerrado la pestaña. **[Dependencia 55]** La versión limpia es un trabajo programado cada minuto que haga lo mismo; el cierre perezoso se queda igual, porque sigue siendo correcto.

El frontend, además, cuenta el tiempo restante con el reloj del navegador: al llegar a cero deshabilita los campos, fuerza el autoguardado pendiente y llama a `entregar` una vez. Un **409 D11** en esa llamada es el caso esperado y no es un error para el usuario.

---

## 5. Estado teórico del alumno — dependencia 7

```
GET /api/personas/{cod}/estado-teorico      Read (alumno: solo el propio, dependencia 51)
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
      "fechaExamen": "2026-09-18", "nota": 12.00, "notaMinimaAplicada": 18 }
  ],
  "pendientes": [
    { "idTurnoTeorico": 5, "nombre": "Subsanación Adoctrinamiento de Vuelo", "tipoExamen": "SUBSANACION",
      "idMateria": 3, "materia": "Adoctrinamiento de Vuelo",
      "fechaExamen": "2026-09-26", "horaInicio": "08:00", "horaFin": "09:00" }
  ]
}
```

- `bloqueadoPorSubsanacion` es verdadero mientras exista un examen desaprobado **sin una subsanación aprobada posterior** de la misma materia. Mientras lo sea, el alumno **no debe programarse en turnos prácticos** (PDI, spec §3.4): el frontend lo marca en la fila del alumno con su motivo e impide guardar, y `POST`/`PUT /api/turnos` debe rechazarlo (dependencia 57).
- Aprobar la subsanación **levanta el bloqueo y no borra la nota desaprobada**, que sigue en su propio examen (§4.6) y en el legajo de M5 (§4.4, «prevalece la primera nota»). **Corrección, 27 sep 2026:** antes esta línea decía que la nota seguía en `desaprobados`, lo que contradecía la regla de más abajo («`desaprobados` son los exámenes desaprobados **sin subsanar**»). Manda el mock, que es el spec ejecutable: usa `desaprobadosSinSubsanar(cod)` y calcula `bloqueadoPorSubsanacion` como `desaprobados.length > 0`, o sea que **las dos cosas son la misma lista** y un examen ya subsanado sale de ella. La nota desaprobada se sigue viendo en su examen, no acá.
- `motivo` es `null` cuando no está bloqueado; es el texto que la interfaz muestra y por eso lo arma el servidor, con el nombre del turno, la nota con 2 decimales y el mínimo aplicado.
- `desaprobados` son los exámenes desaprobados sin subsanar; `pendientes` son los turnos `PROGRAMADO` o `EN_CURSO` de tipo `SUBSANACION` o `REZAGADO` en los que está habilitado.

**404** D27 si el código no existe. Una persona que **no** es alumno responde `200` con `bloqueadoPorSubsanacion: false`, `motivo: null` y los dos arreglos vacíos, para que el llamador no tenga que saber el tipo.

**Lo que esta sección no trae, y M5 sí.** Las `causales[]` de bajo rendimiento académico del PDI y la variante en lote (`GET /api/estado-teorico?codAlumnos=`, dependencia 56) están **fuera de M4** (spec §16.6): sus consumidores son Alertas y el legajo, necesitan historiales por materia que todavía no existen, y su vocabulario no coincide con el catálogo de 11 materias — las causales del PDI nombran "Emergencias Críticas", "No Críticas" e "Instrumentos", y el catálogo tiene una sola "Procedimientos de Emergencias" y ninguna "Instrumentos". M5 tiene que reconciliar las dos listas antes de poder calcularlas.

Consecuencia para M4: el formulario de turno práctico consulta **este** endpoint una vez por alumno ya agregado al formulario, no por cada opción del selector.

---

## 6. Importación desde IA — cómo se traduce el cuestionario generado

La única integración real de M4. `POST /quizzes/generate` en `sigeda_chat_status` (`contrato-api-aprendizaje.md` §2.1) devuelve un cuestionario de práctica; el instructor lo revisa en `/banco/importar` y lo que apruebe se escribe con `POST /api/preguntas/lote` (§2.6). **Nada se guarda en el banco antes de esa confirmación.**

| Campo de la IA | Campo del banco | Traducción |
|---|---|---|
| `type: "multiple_choice"` | `tipoPregunta: "OPCION_MULTIPLE"` | directa; las 4 `options` pasan a `alternativas` en su orden, y `correcto` es la que empata con `correctAnswer` (`"a"`–`"d"`) |
| `type: "true_false"` | `tipoPregunta: "VERDADERO_FALSO"` | se **sintetizan** dos alternativas, `"Verdadero"` y `"Falso"` en ese orden; `correcto` va en la primera si `correctAnswer` es `"true"`, en la segunda si es `"false"` |
| `type: "fill_blank"` | `tipoPregunta: "COMPLETAR"` | una sola alternativa con `correctAnswer` y `correcto: true`; el `prompt` ya contiene `_____`, que es lo que el banco exige |
| `prompt` (1–2000) | `enunciado` (10–500) | **no coinciden.** Más de 500 caracteres llega **recortado a 500** con el aviso E5; menos de 10 llega con el aviso E26. En los dos casos la fila **no se puede importar** hasta que el instructor la revise |
| `options[].text` (≤ 500) | `alternativas[].respuesta` (≤ 200) | **recortado a 200 en silencio**, sin aviso y sin bloquear la fila: cortar una alternativa no cambia cuál es la correcta, mientras que cortar un enunciado puede cambiar la pregunta |
| `options[].text` repetidos | — | señalados con E6; la fila no se puede importar hasta corregir los textos, porque el banco los exige distintos |
| `explanation` (1–1000) | `explicacion` (≤ 1000) | directa y editable; un `explanation` **`null`** se envía como `explicacion: null`. Es el motivo de que `explicacion` exista (spec M4-4) |
| `sourceExcerpt`, `sourceDocumentId` | — | **se descartan.** `sourceDocumentId` siempre llega `null` (`quiz.service.ts:87-90`), así que un fragmento sin documento sería una cita que no se puede comprobar |
| `correctAnswer` de `multiple_choice` | `alternativas[i].correcto` | si no empata con ningún `option.id`, la fila queda sin correcta marcada y no se puede importar |
| — | `idMateria` | **no lo produce la IA**: se elige una vez para el lote, con anulación por pregunta |
| — | `dificultad` | igual que `idMateria` |
| — | `origen` | lo fija el servidor en `IA` por usar `/lote` |
| `id`, `quizId`, `position`, `ownerId`, `modelName`, `createdAt` | — | no se envían |

Dos preguntas generadas idénticas se rechazan en el `lote` (§2.6), así que la pantalla las señala antes de enviar.

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
| D6 | 404 | Turno teórico especificada no existe. | §3.2–§3.5, §4.2, §4.5 |
| D7 | 409 | El turno teórico ya no se puede modificar: su ventana comenzó. | §3.4, §3.5 |
| D8 | 409 | El examen no está disponible en este momento. | §4.2 |
| D9 | 403 | El alumno no está habilitado para este examen. | §4.2 |
| D10 | 409 | El examen ya fue entregado. | §4.2, §4.3, §4.4 |
| D11 | 409 | La ventana del examen cerró. | §4.3, §4.4 |
| D12 | 404 | Examen especificada no existe. | §4.3–§4.6 (`Response.isNull("Examen")`, aunque la tabla sea `cuestionarios`) |
| D15 | 403 | Solo puede consultar sus propios exámenes. | §4.3–§4.6 (dependencia 51) |
| D17 | 404 | No existen exámenes pendientes. | §4.1 (lista vacía) |
| D18 | 200 | Pregunta eliminado con éxito. | §2.5 (plantilla `Response.wasDeleted`) |
| D19 | 200 | Turno teórico eliminado con éxito. | §3.5 |
| D20 | 201 | Pregunta guardada con éxito. | §2.3, §2.4 |
| D21 | 201 | Preguntas guardadas con éxito. | §2.6 |
| D22 | 201 | Turno teórico guardado con éxito. | §3.3, §3.4 |
| D23 | 200 | Examen entregado con éxito. | §4.4 |
| D25 | 200 | Respuestas guardadas. | §4.3 |
| D26 | 404 | Grupo especificada no existe. | §3.3 (`Response.isNull("Grupo")`) |
| D27 | 404 | Persona especificada no existe. | §2.3, §2.6, §3.0, §3.3, §4.2, §5.1 |
| D28 | 404 | No existen grupos disponibles. | §3.0 (lista vacía) |

**Ids retirados, no reutilizados:** D13 y D24 se fueron con las inasistencias, D14 con el historial del alumno y D16 con la variante en lote del estado teórico (spec §16.6).

Los mensajes de validación de campo (400 arreglo) están en la tabla de cada endpoint y también se muestran literalmente, bajo su campo.

---

## 8. Modelo de datos nuevo y relación con el diagrama entidad-relación

`spring.jpa.hibernate.ddl-auto=none` (`application.properties:19`), las tablas y secuencias son SQL a mano, y en producción los scripts de inicialización **no corren** (`application-prod.properties:35`). Así que la dependencia 53 no es solo Java:

| Tabla | Columnas principales | Secuencia |
|---|---|---|
| `materias` | `id`, `nombre` único, `nota_minima` int, `coeficiente` numeric(3,2), `parte` | `materias_seq` desde 12 |
| `preguntas` | `id`, `id_materia` FK, `enunciado` varchar(500), `tipo_pregunta`, `dificultad`, `explicacion` varchar(1000) null, `origen`, `cod_instructor` FK `personas` | `preguntas_seq` desde 25 |
| `alternativas` | `id`, `id_pregunta` FK, `respuesta` varchar(200), `correcto` bool | `alternativas_seq` desde 101 |
| `turnos_teoricos` | `id`, `nombre`, `id_materia` FK, `tipo_examen`, `fecha_examen` date, `hora_inicio` varchar(5), `hora_fin` varchar(5), `id_grupo` FK, `cod_instructor` FK, `id_turno_origen` FK a sí misma null | `turnos_teoricos_seq` desde 8 |
| `preguntas_turno` | `id_turno_teorico` FK, `id_pregunta` FK, `orden` int, `puntaje_maximo` int; PK compuesta | — |
| `cuestionarios` | `id`, `id_turno_teorico` FK, `cod_alumno` FK, `estado` (**solo `EN_CURSO` o `ENTREGADO`**), `fecha_entrega` date null, `hora_entrega` varchar(5) null, `nota` numeric(4,2) null, `nota_minima_aplicada` int, `aprobado` bool null; único `(id_turno_teorico, cod_alumno)` | `cuestionarios_seq` desde 6 |
| `calificaciones_teoricas` | `id_cuestionario` FK, `id_pregunta` FK, `orden` int, `enunciado` varchar(500), `respuesta_correcta` varchar(200), `respuesta_alumno` varchar(200) null, `correcto` bool, `puntaje_maximo` int, `puntaje_obtenido` int; PK compuesta | — |
| `respuestas_cuestionario` (**nueva, 27 sep 2026**) | `id_cuestionario` FK, `id_pregunta` FK, `orden` int, `respuesta` varchar(200) **null**; PK compuesta | — |

El bloque de secuencias actual está en `schema_prod.sql:100-115` y los valores de arranque de arriba son los de la §9, para que la semilla del backend y los mocks no se pisen.

Dos decisiones del esquema que conviene no perder:

- **`cuestionarios` solo tiene filas de alumnos que empezaron.** `NO_RINDIO` es un estado **derivado de la ausencia de fila** (§Enumeraciones) y nunca se escribe: `cuestionarios.estado` tiene el dominio de `EstadoCuestionario`, que no lo incluye. Una fila por (alumno, turno) para los que no rindieron llegaría con las inasistencias, que son de M5 (spec §16.6).
- **`calificaciones_teoricas` copia `enunciado` y `respuesta_correcta`.** Sin esas dos columnas, editar una pregunta reescribiría resultados ya emitidos (§2.4). `explicacion` no se copia: se lee en vivo, porque mejorarla debe beneficiar a todos.

- **`respuestas_cuestionario` existe porque un examen EN CURSO no tenía dónde guardarse, y es
  una tabla aparte a propósito.** Lo encontró la tanda C3: §4.3 define la respuesta cruda como
  **el id de la alternativa** (texto en `COMPLETAR`), mientras `calificaciones_teoricas.respuesta_alumno`
  guarda **el texto** de la respuesta; y `enunciado`, `respuesta_correcta`, `correcto`,
  `puntaje_maximo` y `puntaje_obtenido` son `not null`. Así que ni el orden congelado de §4.2 ni
  las respuestas guardadas de §4.3 eran representables.

  Se evaluó agregar una columna `respuesta_enviada` a `calificaciones_teoricas` y crear sus filas
  al iniciar. **Se descartó**, por dos razones concretas:
  1. Obligaría a escribir valores provisionales (`correcto = false`, `puntaje_obtenido = 0`) en la
     tabla cuyo único propósito es ser el registro inmutable de un resultado **ya emitido**. Y §4.6
     dice que una pregunta **sin responder** de un examen entregado devuelve exactamente
     `respuestaAlumno: null`, `correcto: false`, `puntajeObtenido: 0` — o sea que una fila sin
     calificar y una calificada-y-en-blanco quedarían **idénticas**, y el único modo de
     distinguirlas sería mirar el `estado` del padre. La tabla dejaría de poder leerse sola.
  2. La respuesta cruda y la calificada **son datos distintos**: un **id** de alternativa contra su
     **texto**. La regla de §2.4 de actualizar las alternativas en su lugar conservando el id
     existe justamente porque la respuesta del alumno es un id que tiene que seguir apuntando a la
     fila correcta. Meter las dos cosas en una tabla invita a la confusión que produjo este
     bloqueo.

  Semántica: `POST /api/turnos-teoricos/{id}/iniciar` inserta **una fila por pregunta del turno**,
  con el `orden` de `preguntas_turno` y `respuesta` nula — eso **congela el orden del examen**
  (§4.2) y a la vez es el almacén de respuestas. `PUT /api/cuestionarios/{id}/respuestas` reemplaza
  el conjunto completo: pone `respuesta` en los pares que llegan y **nula** el resto.
  `POST /api/cuestionarios/{id}/entregar` lee estas filas, califica y escribe
  `calificaciones_teoricas` **con sus `not null` intactos**; las filas en curso **se conservan**,
  porque son el registro a nivel de id, mientras §4.6 sirve el texto desde
  `calificaciones_teoricas`.

| Entidad del diagrama | Contrato |
|---|---|
| Materia (**nueva**) | §1, `/api/materias` |
| Turno Teórico | §3, `/api/turnos-teoricos` (+ `idMateria`, `idTurnoOrigen`) |
| Pregunta Teórica | `preguntas[{idPregunta, orden, puntajeMaximo}]` del turno (`preguntas_turno`) |
| Pregunta · Alternativa | §2, `/api/preguntas` con `alternativas` anidadas; la materia se envía como `idMateria` |
| Cuestionario | §4, `/api/cuestionarios`, uno por alumno y turno teórico |
| Calificación Teórica | `calificaciones[]` del examen |

---

## 9. Datos de los mocks

> **Reconciliación, 27 sep 2026.** Esta sección y la §8 habían quedado atrás respecto de los
> mocks: decían 5 turnos teóricos y `cuestionarios_seq` en 4, cuando el mock siembra **7
> turnos** (ids 1–7) y **5 cuestionarios** (ids 1–5), con las secuencias en **8** y **6**.
> Los turnos 6 y 7 y los cuestionarios 4 y 5 son la fixture de M5 —un examen desaprobado del
> alumno `999999` y su subsanación— sobre la que descansa la regla «prevalece la primera
> nota» en el legajo. **Manda el mock**, porque es el artefacto más nuevo, las 1105 pruebas
> del frontend corren contra él, y sembrar solo 5 turnos dejaría a `dev` sin poder reproducir
> las pantallas de M5. Los números de arriba ya están corregidos.

Los mocks parten de la semilla (`data_prod.sql`) más lo que agregaron M1 y M2 (`src/mocks/sigeda/datos.ts`, `crearDatos`) y se reinician por prueba con `reiniciarDatosMock()`, que `src/mocks/reiniciar.ts` llama y `src/test/setup.ts` ejecuta en cada `afterEach`. M4 agrega los handlers `preguntas.ts`, `turnos-teoricos.ts`, **`cuestionarios-teoria.ts`** (exportando `handlersCuestionariosTeoria`, porque `src/mocks/ia/cuestionarios.ts` ya existe y `handlers.ts` ya importa `handlersCuestionarios`) y `estado-teorico.ts`, y cuatro secuencias: `pregunta` 25, `alternativa` 101, `turnoTeorico` 6, `cuestionario` 4.

Personas y grupos que se usan: alumnos `111111` (grupo 1), `222222` (grupo 2), `555555` y `666666` (grupo 3), `777777` (grupo 4), `999999` (grupo 6); instructores `444444` Juan Torres (cuenta `instructor.perez`) y `888888` Maria Flores; grupo 5 sin alumnos. Materias 1–11, con `notaMinima` 18 en la 3, 20 en la 4 y en la 6, 16 en el resto. Contraseña de todas las cuentas: `123`.

**Dos de esos datos son invenciones del frontend, no de la semilla**: el estado `En Chequeo` de `777777` y la alumna `654321` Lucía Mendoza **sin grupo** los agregaron M1 y M2 (`docs/decisiones.md` › Datos de prueba); en `data_prod.sql` todos los alumnos son `Apto` y `654321` no existe. M4 los usa igual: `654321` es la que prueba que un alumno sin grupo nunca entra en un turno teórico.

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
- **`DELETE` responde 409 (D3)** para las ids 1–15 y 17–24, y `200` solo para la 16. **Corregido:** las preguntas 22, 23 y 24 **sí están en uso** — las usan los turnos 6 y 7 de §9.2 —, así que responden 409 y `enUso` es verdadero en las tres. Queda una sola pregunta borrable, la 16.
- Las dificultades se reparten `BAJA`/`MEDIA`/`ALTA` de modo que cada filtro devuelva al menos dos filas en la materia 3.
- Las ids 9 y 10 son `IA`, así que el filtro por origen y la columna Origen tienen las dos caras.
- **El 409 de `DELETE /api/materias/{id}` queda derivado:** las materias 1, 3, 4 y 6 tienen preguntas y responden 409; las 2, 5 y 7–11 se pueden eliminar. `MateriaMock.conPreguntas` desaparece.
- Las alternativas se crean en orden y ocupan las ids 1 a 71; la siguiente es 101, para que un id creado en una prueba no colisione con uno de la semilla.

### 9.2 Turnos teóricos — 7 filas, ids 1 a 7

Todas con `codInstructor: "444444"` y `programa: "PDI"`. Por el camino `turnos.cod_instructor` → `alumnos_turno` → `personas.id_grupo`, **444444 alcanza los grupos 1, 2 y 3**, y 888888 alcanza el 4 y el 6. Las fechas son relativas a `hoy`, el argumento de `crearDatos(hoy)`.

> **Aviso, 27 sep 2026 — la semilla contiene un par que su propio `POST` rechazaría.** Los turnos **6 y 7 son del grupo 6 con `codInstructor: "444444"`**, y 444444 no alcanza el grupo 6: un `POST` de §3.3 con ese par recibe `'codInstructor': El grupo no corresponde al instructor.`, salvo que el llamador tenga `Manage Groups`. La semilla se dejó así **a propósito**, para que el mock y el backend coincidan mientras se decide de qué lado se arregla: cambiar esos dos turnos a `888888`, o darle el grupo 6 a 444444. Es una línea en cualquiera de los dos lados.

| Id | Estado | Materia | Grupo | Tipo | Fecha | Horario | Preguntas | Para |
|---|---|---|---|---|---|---|---|---|
| 1 | `FINALIZADO` | 3 | 3 (`555555`, `666666`) | `MENSUAL` | `hoy − 7` | 08:00–09:00 | 1–5, 4 puntos cada una | Resultados con un aprobado y un desaprobado; origen de la subsanación |
| 2 | `FINALIZADO` | 6 | 2 (`222222`) | `TEST` | `hoy − 5` | 10:00–10:30 | 11–15, 4 puntos | Un turno finalizado sin ninguna entrega: `NO_RINDIO` derivado |
| 3 | **abierto por la prueba** | 3 | 1 (`111111`) | `SEMANAL` | `hoy` | `00:00`–`23:59` por defecto | 1–5, 4 puntos | Rendir examen, autoguardado y auto-entrega |
| 4 | `PROGRAMADO` | 4 | 3 | `QUINCENAL` | `hoy + 3` | 09:00–10:00 | 17–21, 4 puntos | Modificar y eliminar; pendiente que todavía no abre |
| 5 | `PROGRAMADO` | 3 | 3 | **`SUBSANACION`**, origen 1 | `hoy + 1` | 08:00–09:00 | 6–10, 4 puntos | Cadena de subsanación y `estado-teorico` |
| 6 | `FINALIZADO` | 1 (mín. 16) | 6 (`999999`) | `TEST` | `hoy − 12` | 08:00–09:00 | 22 · 10, 23 · 7, 24 · 3 | Fixture de M5: el examen desaprobado de la cadena «prevalece la primera nota» |
| 7 | `FINALIZADO` | 1 | 6 | **`SUBSANACION`**, origen 6 | `hoy − 11` | 08:00–09:00 | 22 · 10, 23 · 7, 24 · 3 | Fixture de M5: la subsanación **aprobada** que levanta el bloqueo sin borrar la nota |

**El horario del turno 3 no se deriva del reloj: lo abre un ayudante de pruebas.** `crearDatos` le da `00:00`–`23:59`, que lo deja `EN_CURSO` cualquier hora del día real, y M4 agrega a `src/test/tiempo.ts`:

```
abrirVentanaDeExamen({ transcurridos = 0, restantes = 25 })
```

que **se llama después de `relojFalso()`** y reescribe `horaInicio`/`horaFin` del turno 3 a partir del reloj falso: `horaInicio` = ahora − `transcurridos` minutos, `horaFin` = ahora + `restantes` minutos. Motivo: `reiniciarDatosMock()` corre en `afterEach` con temporizadores **reales**, así que una fijación calculada desde el reloj de pared se construye antes de que exista el reloj falso, y un cálculo cerca de medianoche podría dejar menos de cinco minutos de ventana. Con el ayudante no hace falta ningún recorte por medianoche y las pruebas del cierre (avanzar `restantes` minutos) y del aviso de los 5 minutos son deterministas.

Lo demás de la §9.2:

- `resultados` del turno 5 contiene **solo a `666666`**, porque es el único que desaprobó el turno 1. Es lo que prueba la regla de habilitados de §3.2.
- Ningún turno incluye a `654321` (sin grupo) ni al grupo 5 (sin alumnos): §3.0 no lo ofrece, y un cuerpo que lo envíe recibe `El grupo no tiene alumnos.`
- El grupo 3 es el único con dos alumnos, así que es el único que puede mostrar resultados mixtos.
- **Catálogo de grupos (§3.0):** `codInstructor=444444&programa=PDI` → grupos 1 (1 alumno), 2 (1) y 3 (2); `codInstructor=888888&programa=PDI` → grupos 4 (1) y 6 (1); sin `codInstructor` y con `Manage Groups` → 1, 2, 3, 4 y 6. `programa=PDE` → **404** D28, porque todos los grupos sembrados son PDI.

### 9.3 Exámenes y estado teórico

| Id | Alumno | Turno | Estado | Nota | Detalle |
|---|---|---|---|---|---|
| 1 | `555555` | 1 | `ENTREGADO` | **20.00**, aprobado | Las 5 correctas; entrega `hoy − 7` 08:41 |
| 2 | `666666` | 1 | `ENTREGADO` | **12.00**, desaprobado (mínimo aplicado 18) | Correctas las preguntas 1, 2 y 4; entrega `hoy − 7` 08:52 |
| 3 | `111111` | 3 | `EN_CURSO` | `null` | Dos respuestas guardadas (preguntas 1 y 3); `calificaciones: []` |
| 4 | `999999` | 6 | `ENTREGADO` | **10.00**, desaprobado (mínimo aplicado 16) | Correcta solo la 22; entrega `hoy − 12` 08:35 |
| 5 | `999999` | 7 | `ENTREGADO` | **17.00**, aprobado (mínimo aplicado 16) | Correctas la 22 y la 23; entrega `hoy − 11` 08:28 |

Resumen del turno 1: `{"habilitados":2,"rindieron":2,"aprobados":1,"notaPromedio":16.00}`. Turno 2: `{"habilitados":1,"rindieron":0,"aprobados":0,"notaPromedio":null}`, con `222222` en `NO_RINDIO` **por no tener fila**.

Con 4 puntos por pregunta las notas posibles son 0, 4, 8, 12, 16 y 20: las dos notas fijadas son exactas y no dependen de ningún redondeo. Ningún turno de las fijaciones es `PRE_SOLO`, así que `notaMinimaAplicada` es igual a `materia.notaMinima` en todas; **el caso Pre-Solo se prueba con un `server.use(...)`** que devuelva el turno 4 con `tipoExamen: "PRE_SOLO"` y `notaMinimaAplicada: 18` sobre una materia de mínimo 16.

`estado-teorico`:

| Alumno | `bloqueadoPorSubsanacion` | Contenido |
|---|---|---|
| `666666` | **`true`** | `motivo` con el turno 1, la nota 12.00 y el mínimo 18; `desaprobados: [2]`; `pendientes: [5]` |
| `111111`, `222222`, `555555`, `777777`, `654321` | `false` | `motivo: null` y los dos arreglos vacíos |
| `999999` | `false`, **y no por no tener desaprobados** | Desaprobó el turno 6 (10.00 / mínimo 16) **y aprobó su subsanación**, el turno 7 (17.00). Así que su examen 4 **sale de `desaprobados`** y el bloqueo se levanta: los dos arreglos quedan vacíos y `motivo` es `null`. La nota 10.00 sigue viéndose en su propio examen (§4.6) — es la cadena con que M5 prueba «prevalece la primera nota», y el único caso de la semilla que ejercita la rama «subsanación aprobada posterior» |
| cualquier otra persona existente, alumno o no | `false` | igual |
| un código inexistente | — | **404** D27 |

Así el formulario de turno práctico tiene siempre exactamente un alumno bloqueado (`666666`) y el resto disponible, y la fila de un alumno cuyo estado no se puede consultar se prueba con un `server.use(...)`.

### 9.4 Mock del servidor de IA que M4 agrega

Extiende la §7.2 de `contrato-api-aprendizaje.md`, que **no se modifica**. `POST /quizzes/generate` gana **un disparador**:

| Disparador | Respuesta | Para |
|---|---|---|
| `questionCount` = 12 | **201** con el cuestionario `c0e50000-0000-4000-8000-000000000002`: 5 preguntas, ids `9e500000-0000-4000-8000-000000000011` a `-0015` | El camino de la importación |

Las cinco preguntas de ese cuestionario:

| Id | `type` | Particularidad | Aviso |
|---|---|---|---|
| `…0011` | `multiple_choice` | `prompt` de **620 caracteres** | E5: se importa recortado a 500 y la fila hay que revisarla |
| `…0012` | `multiple_choice` | Las opciones `b` y `c` tienen **el mismo texto** | E6: no se puede importar sin corregir |
| `…0013` | `true_false` | `correctAnswer: "true"`, `options: null` | ninguno: se sintetizan Verdadero y Falso |
| `…0014` | `fill_blank` | `prompt` con `_____`, `correctAnswer: "autorrotación"` | ninguno |
| `…0015` | `multiple_choice` | `prompt` de **6 caracteres** y una opción de **240 caracteres** | E26 por el enunciado; la opción se recorta a 200 **en silencio** |

Los demás disparadores de la §7.2 no cambian, así que el cuestionario de tres preguntas sigue sirviendo a M3 y el de cinco es solo de M4.

### 9.5 Lo que no se fija

Se prueban con `server.use(...)` por prueba, porque las fijaciones por defecto tienen que sostener los caminos felices: el banco sin ninguna pregunta (D1), la lista de turnos teóricos vacía (D5), un alumno sin exámenes pendientes (D17), una materia sin preguntas (E12), un autoguardado que falla (E14), un `estado-teorico` que no responde (E23) y el examen `PRE_SOLO` de §9.3.

---

## 10. Dependencias

Numeración de la spec (§10, §13.4, §14.5, §15.5 y §16.5). Todas son de `sigeda-back` salvo la 59.

**M4 no funciona contra el backend real hasta que existan la 6 y la 7.** El frontend lo dice en pantalla (aviso E1) y deshabilita sus escrituras mientras el número no figure en `VITE_DEPENDENCIAS_RESUELTAS`: `gestionarMaterias` espera la 5, `gestionarPreguntas`, `importarPreguntas`, `programarTurnoTeorico` y `rendirExamen` esperan la 6, y `bloqueoSubsanacion` espera la 7. Al desplegar una de estas correcciones, avisar para agregar su número.

| # | Cambio | Sección |
|---|---|---|
| 5 (M2) | Catálogo de materias, CRUD y `Manage Subjects` | §1 |
| 6 (M4) | La API de teoría completa: preguntas, turnos teóricos, exámenes y los cuatro permisos. La detallan las §§2–4 y la parten la 53 y la 54 | §2, §3, §4 |
| 7 (M4) | `GET /api/personas/{cod}/estado-teorico` | §5 |
| 19 | Mojibake del rol Comandante en la semilla, y ninguna cuenta con `id_rol = 5`: sin eso, `Manage Subjects` no se puede ejercer aunque exista | Permisos |
| 20 (M1) | Propiedad del alumno en el servidor; la amplía la 51 | Convenciones |
| 39 (M3) | El servidor de IA no autentica. **No bloquea** Importar desde IA | §6 |
| 48 (M3) | `sourceDocumentId` por pregunta | §6 |
| 50 (M3) | Mensajes de error del servidor de IA sin texto de librerías | §6 |
| 51 | **Seguridad:** resolver quién llama (`sub` → `Usuario` → `Persona.codigo`), quitar `codInstructor` y `codAlumno` de la firma y aplicar la propiedad en el servidor (D15) | Convenciones, §2, §3, §4, §5 |
| 52 | `GET /api/turnos-teoricos/grupos?codInstructor=&programa=`: los grupos para los que un instructor puede programar, derivados de `turnos.cod_instructor` → `alumnos_turno` → `personas.id_grupo`. Endpoint **nuevo**, no una ampliación: ninguna de las tres rutas de `GrupoController` sirve (permiso, forma o falta de identidad de grupo) | §3.0 |
| 53 | Esquema y semilla de teoría: 7 tablas, sus secuencias, sus FK y un camino de migración a producción | §8 |
| 54 | Los cuatro permisos como código en `Permiso.java`, `Permission.java` y `Role.java`. Hasta entonces **cualquier usuario autenticado alcanza todo lo de aquí** | Permisos |
| 55 | Cierre de la ventana del examen: perezoso en cada lectura (obligatorio) y, mejor, un trabajo programado. Hoy no hay ningún `@Scheduled` en el proyecto | §4.7 |
| 56 | `GET /api/estado-teorico?codAlumnos=` en lote; amplía la 7. **Fuera de M4** (spec §16.6): la consume M5 | §5.1 (nota) |
| 57 | `POST` y `PUT /api/turnos` rechazan a un alumno bloqueado por subsanación | §5.1 |
| 58 | **Bug:** `GET /api/personas/{cod}/status` devuelve 404 para todo alumno que no esté `Apto`, descartando las categorías que ya había agregado, y está protegido con `Write` en lugar de `Read` | — (encontrado al dimensionar M4) |
| 59 | Opcional, en `sigeda_chat_status`: `maxPromptChars` y pista de dificultad en `POST /quizzes/generate` | §6 |
| 60 | Convenciones del módulo: **409** con texto plano para las reglas de estado (hoy `CONFLICT` no existe y `ActionExpiredException` devuelve 410 en tres lugares, uno con el texto exacto de D3). Para la validación, preferir el **arreglo** de `'campo': mensaje` (`Response.setErrorsFrom` con `BindingResult` en la firma) — preferencia de consistencia, no requisito del cliente, porque `errors.ts:101` ya lee `ErrorResponse.messages[]` igual. El defecto real es que `ConstraintErrors.formatErrors` nunca ordena | Convenciones |

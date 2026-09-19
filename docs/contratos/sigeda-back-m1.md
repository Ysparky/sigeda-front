# SIGEDA Backend REST Contract (branch `main`, read-only analysis)

Repository root: `/Volumes/ORICO/projects/personal/tesis-project/sigeda-back`. All file paths below are relative to this root. Branch confirmed `main` via `git branch --show-current`; no files were modified, no build/run was performed.

Global facts:
- Every controller in scope is mounted under base path **`/api`** via `@RequestMapping("/api")` (e.g. `src/main/java/com/sigeda/backend/turno/controllers/TurnoController.java:50`, `.../evaluacion/controllers/EvaluacionController.java:58`, `.../grupo/controllers/PersonaController.java:49`, `.../grupo/controllers/GrupoController.java:38`, `.../maniobra/controllers/{Fase,SubFase,Maniobra,Estandar}Controller.java`).
- All requests except `/auth/**` require a valid JWT (`.anyRequest().authenticated()`, `src/main/java/com/sigeda/backend/security/config/SecurityConfig.java:50-53`). Missing/invalid `Authorization: Bearer <token>` header → `401` JSON `{"status":401,"error":"Unauthorized","message":"No authorization token found"}` or `"Token is not valid"` (`src/main/java/com/sigeda/backend/security/config/JwtAuthorizationFilter.java:52,61,80-90`).
- Method-level authorization is `@PreAuthorize("hasRole('<Permiso constant>')")`. Authorities are granted as `"ROLE_" + Permission.getNombre()` (`src/main/java/com/sigeda/backend/security/services/UserDetailsServiceImpl.java:54-56`), so the constant strings from `Permiso.java` line up correctly with `hasRole(...)`. Any endpoint **without** an explicit `@PreAuthorize` still requires authentication (any role) but no specific permission — see Gaps §7.
- Programa enum: `PDI`, `PDE` only (`src/main/java/com/sigeda/backend/grupo/entities/Programa.java:3-4`). A global `Converter<String,Programa>` (`StringToProgramaConverter`, registered in `src/main/java/com/sigeda/backend/WebConfig.java:13-15`) applies to **every** `Programa`-typed `@RequestParam` and `@PathVariable` across the whole app: it upper-cases the input and calls `Programa.valueOf(...)`; on failure it **silently returns `PDI`** instead of erroring (`src/main/java/com/sigeda/backend/utils/StringToProgramaConverter.java:12-18`). This means `programa=xyz` or `/grupos/programa/xyz` never 400s — it silently behaves as `PDI`.
- Role→permission mapping is hard-coded in `src/main/java/com/sigeda/backend/security/entities/Role.java:9-37` (DB `roles.permisos` column exists in schema but is never read at runtime — see §7). Confirms the documented deliberate deviation: `Comandante` has `MANAGE_MANEUVERS`/`MANAGE_PHASES`/`MANAGE_SUBPHASES` (creates maniobras/fases/subfases) while `Operaciones` (Jefe de Operaciones) has `MANAGE_STANDARDS`/`MANAGE_SHIFTS`/`MANAGE_GROUPS` (assigns estándares, manages turnos/grupos).

---

## 1. Response conventions

Two **incompatible** response conventions coexist in this API (see §7 for the cross-cutting inconsistency). Which one an endpoint uses depends on whether the controller manually builds a `Response` object or lets exceptions bubble to `GlobalExceptionHandler`.

### 1.1 `utils/Response.java` (used by Turno, Evaluacion, Desaprobado, Persona, Grupo controllers)

All methods read/write an instance field `Map<String,Object> map` that each controller resets with `response.setMap(new HashMap<>())` at the top of the handler.

| Method | HTTP status | Body | Source |
|---|---|---|---|
| `findQueryError(DataAccessException)` | 500 | `{"error":"Error al realizar la consulta.","mensaje":"<e.getMessage()>: <e.getMostSpecificCause().getMessage()>"}` | Response.java:22-24,38-43 |
| `saveQueryError(DataAccessException)` | 500 | `{"error":"Error al realizar el registro.","mensaje":"..."}` | Response.java:26-28 |
| `updateQueryError(DataAccessException)` | 500 | `{"error":"Error al actualizar el registro","mensaje":"..."}` | Response.java:30-32 |
| `deleteQueryError(DataAccessException)` | 500 | `{"error":"Error al eliminar el registro","mensaje":"..."}` | Response.java:34-36 |
| `setCustomError(String error, Exception e)` | 400 | `{"error":"<error>","mensaje":"<e.getMessage()>"}` | Response.java:45-50 |
| `wasSaved(String nombreEntidad, Object entidad)` | **201** | `{"mensaje":"<nombreEntidad> guardada con éxito.","<nombreEntidad.toLowerCase()>": <entidad>}` | Response.java:52-57 |
| `wasDeleted(String nombreEntidad)` | 200 | **plain text** `"<nombreEntidad> eliminado con éxito."` | Response.java:63-66 |
| `isNull(String nombreEntidad)` | 404 | **plain text** `"<nombreEntidad> especificada no existe."` | Response.java:68-71 |
| `isEmpty(String nombreLista)` | 404 | **plain text** `"No existen <nombreLista> disponibles."` | Response.java:73-76 |
| `isForbidden(String msje)` | 403 | plain text `<msje>` | Response.java:78-80 |
| `hasModelError(String msje)` | 400 | plain text `<msje>` | Response.java:82-84 |
| `showData(Object entidad)` | 200 | `<entidad>` (raw JSON of whatever object is passed) | Response.java:86-88 |
| `setErrorsFrom(BindingResult)` | 400 | **raw JSON array** of strings `"'campo': mensaje"` (see `ConstraintErrors.getBindingResultErrors`, `utils/ConstraintErrors.java:18-24,38-44`) | Response.java:90-93 |

Note `wasSaved`'s literal key is the entity name lower-cased with Java `String.toLowerCase()`, which preserves accents: for Evaluación this key is **`"evaluación"`** (see §4).

### 1.2 `exception/GlobalExceptionHandler.java` (`@RestControllerAdvice`, used implicitly by every controller, and exclusively by Fase/SubFase/Maniobra/Estandar controllers)

All bodies are the `ErrorResponse` shape: `{"timestamp":"<ISO LocalDateTime>","status":<int>,"error":"<string>","message":<string|null>,"messages":<string[]|null>}` (`exception/ErrorResponse.java:6-22,65-67`).

| Exception | HTTP status | `error` | `message` | `messages` | Source |
|---|---|---|---|---|---|
| `MissingServletRequestParameterException` | 400 | "Parámetro faltante" | `"El parámetro '<name>' es obligatorio"` | null | GlobalExceptionHandler.java:26-36 |
| `MissingPathVariableException` | 400 | "Variable de ruta faltante" | `"La variable de ruta '<name>' es obligatoria"` | null | :39-49 |
| `MethodArgumentTypeMismatchException` | 400 | "Error en parámetros" | `"El parámetro '<name>' debe ser de tipo <Type>"` | null | :52-65 |
| `HttpMessageNotReadableException` (bad JSON) | 400 | "Error en el cuerpo de la petición" | "Formato JSON inválido o datos mal estructurados" | null | :68-77 |
| `MethodArgumentNotValidException` (i.e. `@Valid` failed **and controller has no `BindingResult` parameter**) | 400 | "Error al validar el modelo" | null | `["'campo': mensaje", ...]` (via `ConstraintErrors.getDtoErrors`) | :80-92 |
| `ResourceNotFoundException` (custom, thrown by services) | 404 | "Recurso no encontrado" | `<e.getMessage()>` | null | :95-104 |
| `IllegalArgumentException` (e.g. bad paging args from `PageWithSort`/`Page_Sort`) | 400 | "Atributo o configuración erronea" | `<e.getMessage()>` | null | :107-116 |
| `jakarta.validation.ValidationException` (manual `throw new ValidationException(...)`) | 400 | "Error al validar el modelo" | `<e.getMessage()>` | null | :119-128 |
| `ActionExpiredException` (custom) | **410 Gone** | "Fecha de modificación expiró" | `<e.getMessage()>` | null | :131-140 |
| `DataAccessException` | 500 | "Error al acceder a base de datos" | `<e.getMessage()>` | null | :143-152 |
| `AccessDeniedException` (role check failed) | 403 | "Acceso denegado" | "No tienes permisos para realizar esta acción" | null | :155-164 |
| `AuthenticationException` | 401 | "No autenticado" | "Debes iniciar sesión o tu token es inválido" | null | :167-176 |
| any other `Exception` | 500 | "Error inesperado" | `<e.getMessage()>` (may be `null`) | null | :180-189 |

**Important asymmetry**: whether a `@Valid` DTO failure returns Response.java's raw string array (§1.1) or GlobalExceptionHandler's `ErrorResponse` object (§1.2) depends entirely on whether the controller method declares a `BindingResult` parameter right after the `@Valid` argument. See §7.

### 1.3 Paged endpoints

Endpoints returning `Page<T>` (Spring Data `Page`) serialize via Spring's default `PagedModel`/`Page` Jackson serializer: `{"content":[...],"pageable":{...},"totalElements":N,"totalPages":N,"last":bool,"size":N,"number":N,"sort":{...},"first":bool,"numberOfElements":N,"empty":bool}`. Exact shape is Spring Boot's stock `Page` JSON (undetermined here whether a custom `PagedResourcesAssembler`/`@EnableSpringDataWebSupport(pageSerializationMode=VIA_DTO)` is configured — no such config was found in `application*.properties` or any `@Configuration` class, so the legacy direct `Page` JSON above is what ships).

### 1.4 Pagination/sorting parameter utilities

- `utils/Page_Sort.java` (used by Turno, Evaluacion, Persona, Grupo controllers): defaults `page=0`, `size=6`, `direction=ASC`, single `property` param. `createPageRequestWithSort` throws `IllegalArgumentException` for `customPage<0` ("Indice de paginado no debe ser menor a cero."), `customSize<0` ("Tamaño de paginado no debe ser menor a uno."), or bad direction ("Dirección debe ser 'desc' o 'asc'.") — Page_Sort.java:14-41. These controllers **catch** `IllegalArgumentException` themselves and turn it into `Response.setCustomError("Argumento incorrecto", e)` (400, §1.1 shape) rather than letting it hit `GlobalExceptionHandler`. They also catch `PropertyReferenceException`/`InvalidDataAccessApiUsageException` (bad sort property) → `Response.setCustomError("Argumento incorrecto", pageSort.wrongPropertyError(property, nombreLista))` where the message is `"No se encontró atributo '<property>' para ordenar <nombreLista>."` (Page_Sort.java:14-16).
- `utils/PageWithSort.java` (used by Fase/SubFase/Maniobra/Estandar controllers): defaults `page=0`, `size=6`, `direction=asc`, **array** `properties[]` param, validated against a per-controller `HashSet<String> validProperties` (`{"id","nombre"}`). Throws `IllegalArgumentException` for size `>10` ("Tamaño de página demasiado grande, máximo permitido es 10.") in addition to the same page/size/direction checks — PageWithSort.java:15-44. These controllers do **not** catch it — it propagates to `GlobalExceptionHandler` → `ErrorResponse` 400 shape (§1.2), NOT the Response.java shape.

---

## 2. Enums

| Enum | Values | Serialization | Source |
|---|---|---|---|
| `Programa` | `PDI`, `PDE` | JSON string = enum name (`@Enumerated(EnumType.STRING)` where persisted; plain enum elsewhere) | grupo/entities/Programa.java:3-4 |
| `Tipo` | `Alumno`("Alumno"), `PDI`("Instructor PDI"), `PDE`("Instructor PDE") | **Not itself serialized anywhere** — it exists only as a helper with `getNombre()`; `Persona.tipo` is a raw `String` column populated directly by whatever the client/seed sends, matching `Tipo.getNombre()` values exactly in the seed (`Alumno`, `Instructor PDI`) | grupo/entities/Tipo.java:3-20; confirmed against seed `personas.tipo` values, `data_prod.sql:60-68` |
| `Estado` (student status) | `Apto`("Apto"), `enChequeo`("En Chequeo"), `enObservacion`("En Observación"), `enFinal`("En Final"), `enComplementacion`("En Complementación"), `enDeliberacion`("En Deliberación"), `noApto`("No Apto") | `Persona.estado`/`EvaluacionPractica.estadoAlumno` are raw `String` columns holding `getNombre()` values (with accents/spaces) | grupo/entities/Estado.java:3-24 |
| `EstadoAeronave` | `Disponible`, `En_Mantenimiento`, `No_Disponible`, `Desconocido` | `Aeronave.getEstado()` computes this from the raw `estado` string column via accent/case-insensitive normalization (`EnumNormalizable.fromNombre`), and serializes as the **enum name** (e.g. `"Disponible"`, `"En_Mantenimiento"` — underscore, not the DB text) | turno/entities/EstadoAeronave.java:7-21; turno/entities/Aeronave.java:57-63; utils/EnumNormalizable.java |
| `Categoria` (evaluation category) | `Ponderada`("Ponderada"), `Chequeo`("Chequeo"), `chequeoSubFase`("Chequeo Sub Fase") — **note lowercase `c`**, `Complementacion`("Complementación") | Request DTOs (`EvaluacionCreate.categoria`, `EvaluacionUpdate.categoria`) deserialize the enum by **name**, case-sensitive — client must send exactly `"Ponderada"`, `"Chequeo"`, `"chequeoSubFase"` or `"Complementacion"`. `EvaluacionPractica.categoria` is persisted/serialized as the **raw String** `getNombre()` value (`"Ponderada"`, `"Chequeo"`, `"Chequeo Sub Fase"`, `"Complementación"`) — different casing/spelling from the enum name used in the request! `IndexEval.getCategoria()` (unused, dead projection) returns the enum. | evaluacion/entities/Categoria.java:3-41; EvaluacionPractica.java:83-89 |
| `Clasificacion` | `Malo`, `Regular`, `Bueno`, `Excelente` | Serializes as enum name. Query filter param `clasificacion` on `GET /evaluaciones/filter/persona/{cod}` is parsed via `Clasificacion.valueOf(source)` (case-sensitive, no normalization) inside `StringParse.toClasificacion`, swallowing `IllegalArgumentException` and returning `null` (i.e. filter silently ignored) on any non-exact match, including empty string default | evaluacion/entities/Clasificacion.java:3-21; utils/StringParse.java:11-18 |

---

## 3. Turnos (`TurnoController`)

Constants: `nombreEntidad = "Turno"`, `nombreLista = "turnos"` (TurnoController.java:68-69).

### 3.1 `GET /api/turnos` — list with filters
`@PreAuthorize("hasRole('" + Permiso.READ + "')")` → **`Read`** (TurnoController.java:76-77).

Query params (all optional, defaults shown):
- `idSubfase` (int, default `0`)
- `programa` (Programa, default `"pdi"`, parsed via the global case-insensitive converter — see §1)
- `fechaPre` (String, default `""`) — parsed via `StringParse.toLocalDate` (ISO `yyyy-MM-dd`); invalid/empty → `null`
- `fechaPost` (String, default `""`) — same
- `page` (int, default `0`), `size` (int, default `6`), `direction` (String, default `ASC`), `property` (String, default `"id"`)

Branching logic (`TurnoService.findAllByFilters`, turno/services/TurnoService.java:48-60):
- `idSubfase==0` and either date null → `findByPrograma(programa, pageable)`
- either date null (idSubfase != 0) → `findByProgramaAndIdSubFase`
- `idSubfase==0` (both dates present) → `findByProgramaAndFechaEvalBetween`
- both present → `findByProgramaAndIdSubFaseAndFechaEvalBetween`

Response: `Page<TurnoRealizado>` (200) or `404` plain text `"No existen turnos disponibles."` if page is empty (Response.isEmpty, TurnoController.java:106-109). Sort/paging errors → 400 via Response.setCustomError as described in §1.4.

**`TurnoRealizado` projection** (turno/projections/TurnoRealizado.java:7-22):
```json
{ "id": 0, "subfase": "string", "nombre": "string", "fechaEval": "yyyy-MM-dd", "programa": "PDI", "cantGrupo": 0, "cantManiobra": 0 }
```
⚠ `getCantGrupo()` does **not** match any property on the `Turno` entity (which has `cantAlumno`, not `cantGrupo` — turno/entities/Turno.java:42). See §7 — this endpoint's projection is very likely broken against the current entity model.

### 3.2 `GET /api/turnos/alumno` — turnos for one student
`@PreAuthorize("hasRole('" + Permiso.READ + "')")` → **`Read`** (TurnoController.java:112-113).

Query params: `codAlumno` (String, default `"000000"`), `page`, `size`, `direction`, `property` (same defaults as §3.1).

Calls `turnoDao.findByAlumnosTurno_CodAlumno` (ITurnoDao.java:23) → `Page<TurnoRealizado>` — same shape/mismatch as §3.1, same 404/`isEmpty` on empty page.

### 3.3 `GET /api/turnos/{fecha}/aeronave/{id}` — schedule-conflict lookup for one aircraft/date
`@PreAuthorize("hasRole('" + Permiso.MANAGE_SHIFTS + "')")` → **`Manage Shifts`** (TurnoController.java:145-146).

Path vars: `fecha` (`LocalDate`, default Spring ISO `yyyy-MM-dd` parsing — no custom formatter registered for path variables), `idAeronave` (int, note the path variable name is `id` but the method parameter is bound as `idAeronave`, which works because there is only one path variable to bind by type/position ambiguity resolution... actually Spring binds by **name match** between `{id}` and the parameter name `idAeronave`, which do **not** match; `@PathVariable` here has no explicit `value=` — see §7 for this potential binding bug).

Service: `TurnoService.findByFechaAndAeronave` (turno/services/TurnoService.java:68-75) calls `turnoDao.findByFechaEvalAndAeronave_Id(fecha, idAeronave)`; if empty, throws `ResourceNotFoundException("No existen turnos en conflicto.")` → propagates to `GlobalExceptionHandler` → 404 `ErrorResponse` (§1.2), **not** the plain-text Response.isEmpty shape (this controller method builds no `Response` object at all and does not catch the exception).

Success: 200, `List<TurnoByAeronave>` (turno/projections/TurnoByAeronave.java:7-16):
```json
[ { "id": 0, "nombre": "string", "fechaEval": "yyyy-MM-dd", "horaInicio": "HH:mm", "horaFin": "HH:mm", "aeronave": { "id": 0, "nombre": "string" } } ]
```
This is the only place `HorasInicioFin`-style overlap data (start/end times) is exposed, but note `turno/utils/HorasInicioFin.java` itself is **never called anywhere** in the codebase (`grep -rn "HorasInicioFin" src/main/java` returns only its own declaration) — see §7. The controller/service never actually compute overlap; they only fetch same-date/same-aircraft turnos and leave the overlap math to be done client-side (or nowhere).

### 3.4 `GET /api/turnos/{id}` — detail
`@PreAuthorize("hasRole('" + Permiso.READ + "')")` → **`Read`** (TurnoController.java:151-152).

Flow (TurnoController.java:153-172, TurnoService.java:77-91):
1. `turnoService.findDetalle(id)` → `ITurnoDao.findByIdIs(id)` typed as `DetalleTurno`.
2. If `null` → 404 plain text `"Turno especificada no existe."` (Response.isNull).
3. Otherwise iterates `turnoInDb.getGruposTurno()`, and for each `DetalleGrupo` calls `personaService.findByCod(item.getCodInstructor())` and sets `item.setInstructor(instructor.getNombre() + " " + instructor.getaPaterno())`.

**`DetalleTurno` projection** (turno/projections/DetalleTurno.java:9-35), extends `IndexTurno` (id, nombre, subfase, fechaEval, programa):
```json
{
  "id": 0, "nombre": "string", "subfase": "string", "fechaEval": "yyyy-MM-dd", "programa": "PDI",
  "fase": "string",
  "gruposTurno": [ { "codInstructor": "string", "instructor": "string", "grupo": { "id": 0, "nombre": "string", "programa": "PDI", "personas": [ {"codigo":"string","nombre":"string","aPaterno":"string","aMaterno":"string"} ] } } ],
  "maniobrasTurno": [ { "nota_min": "B", "maniobra": { "id": 0, "nombre": "string", "descripcion": "string" } } ]
}
```
⚠ **This endpoint is structurally broken against the current data model** — see §7, item 1. `getGruposTurno()`/`getCodInstructor()`/`getGrupo()` do not correspond to any property path on the `Turno` entity (which has flat `codInstructor`/`alumnosTurno`, no `Grupo` relation at all). `maniobrasTurno`/`fase` are fine (real `Turno` properties).

### 3.5 `POST /api/turnos` — create
`@PreAuthorize("hasRole('" + Permiso.MANAGE_SHIFTS + "')")` → **`Manage Shifts`** (TurnoController.java:174-175). No `BindingResult` parameter, so `@Valid` failures go through `GlobalExceptionHandler` → `ErrorResponse` (§1.2), **not** Response.setErrorsFrom.

**`TurnoCreate` DTO** (turno/dto/TurnoCreate.java):
| Field | Type | Validation | Exact message |
|---|---|---|---|
| `nombre` | String | `@NotBlank` (no message — provider default); `@Size(min=10,max=30)` | `"Nombre debe tener de {min} a {max} caracteres."` → interpolated `"Nombre debe tener de 10 a 30 caracteres."` |
| `fechaEval` | LocalDate (custom `CustomDateDeserializer`, format `uuuu-MM-dd`, returns `null` on parse failure) | `@NotNull` ; `@Future` | `"Ingresar fecha válida."` / `"La fecha del turno debe ser posterior a hoy."` |
| `programa` | Programa (Jackson enum-by-name, **case-sensitive**, unknown → `null` due to global `READ_UNKNOWN_ENUM_VALUES_AS_NULL=true`) | `@NotNull` | `"Ingresar programa válido."` |
| `idSubfase` | int | `@Positive` | `"La subfase es requerida."` |
| `codInstructor` | String | `@NotBlank` | `"Instructor debe ser asignado."` |
| `aeronave` | `Aeronave` (nested object, only `.id` is functionally used) | `@NotNull` (no `@Valid`) | `"La asignación de aeronave es requerida."` |
| `alumnosTurno` | `List<@Valid Alumno_TurnoSave>` | `@NotEmpty` | `"La asignación de alumnos es requerida"` |
| `maniobrasTurno` | `List<@Valid Maniobra_TurnoSave>` | `@NotEmpty` | `"La asignación de maniobras es requerida"` |

**`Alumno_TurnoSave`** (turno/dto/Alumno_TurnoSave.java):
| Field | Validation | Message |
|---|---|---|
| `codAlumno` | `@NotNull`; `@Size(min=6,max=6)` | `"Código de alumno es requerido."` |
| `horaInicio` | `@NotNull`; `@Pattern(regexp="^([01]\\d\|2[0-3]):[0-5]\\d$")` | `"La hora debe estar en formato HH:mm (09:00, 14:00)"` |
| `horaFin` | same pattern | same message |
| `idTurno` | int, no validation, **unused** in `ToEntity`/`UpdateToEntity` (overwritten by the passed-in `Turno`) | — |

⚠ This class has **no default constructor**, only `Alumno_TurnoSave(int idTurno, String codAlumno, String inicio, String fin)` — parameter names `inicio`/`fin` do **not** match the bean property names `horaInicio`/`horaFin` used by the getters/setters (turno/dto/Alumno_TurnoSave.java:29-34,52-66). See §7.

**`Maniobra_TurnoSave`** (turno/dto/Maniobra_TurnoSave.java):
| Field | Validation | Message |
|---|---|---|
| `idManiobra` | `@Positive` | `"La maniobra es requerida"` |
| `nota_min` (JSON key is literally `nota_min`, snake_case — no naming-strategy conversion configured) | `@NotNull`; `@Size(min=1,max=1)`; `@Pattern(regexp="(?i)^(D\|I\|R\|B\|E)$")` | `"Ingresar nota mínima de maniobra."` / `"Nota mínima debe utilizar sistema de calificación"` |
| `idTurno` | unused (same as above) | — |

Same no-default-constructor caveat applies (`Maniobra_TurnoSave(int idTurno, int idManiobra, String nota_min)`), though here the constructor param name `nota_min` **does** match the property, so this class is lower risk than `Alumno_TurnoSave`.

**Business logic beyond annotations** (TurnoController.java:176-192):
1. `subfaseService.findById(turnoDto.getIdSubfase())` → throws `ResourceNotFoundException("No existe información de subfase.")` if not found → propagates uncaught → 404 `ErrorResponse`.
2. `aeronaveDao.findById(...)` → `ResourceNotFoundException("No existe información de aeronave.")` if not found → 404 `ErrorResponse`.
3. If `aeronave.getEstado() != EstadoAeronave.Disponible` → `throw new ValidationException("Asignar aeronave disponible.")` → 400 `ErrorResponse` (§1.2, `error:"Error al validar el modelo"`).
4. **No schedule-overlap check is performed** — the two lines `// verificar alumnos con horas en conflicto` / `// verificar conflicto con alumnos en bd` (TurnoController.java:186-187) are comments only; `HorasInicioFin` is never invoked. Two students (or the same student twice) with overlapping `horaInicio`/`horaFin` on the same aircraft/date can both be saved without error.
5. Success: `ResponseEntity.ok(turnoSave)` — **plain 200**, not `Response.wasSaved` (no 201, no `{"mensaje":...}` wrapper) — see §7. Body is the raw `Turno` entity JSON:
```json
{ "id":0,"nombre":"string","fechaEval":"yyyy-MM-dd","horaInicio":null,"horaFin":null,"fase":"string","subfase":"string","idSubFase":0,"programa":"PDI","codInstructor":"string","cantAlumno":0,"cantManiobra":0,"aeronave":{"id":0,"nombre":"string","descripcion":"string","imagen":"string","estado":"Disponible"} }
```
Note `alumnosTurno`/`maniobrasTurno` are **not** in this response (`@JsonIgnore` on `Turno.alumnosTurno`/`Turno.maniobrasTurno`, turno/entities/Turno.java:49-57), and `horaInicio`/`horaFin` on `Turno` itself are always `null` (never set — commented out in `TurnoCreate.CreateToEntity`, lines 137-138). See §7 for the consequence (no way to read back what was just assigned).

### 3.6 `PUT /api/turnos/{id}` — update
`@PreAuthorize("hasRole('" + Permiso.MANAGE_SHIFTS + "')")` → **`Manage Shifts`** (TurnoController.java:194-195).

**`TurnoUpdate` DTO** (turno/dto/TurnoUpdate.java) — same fields/messages as `TurnoCreate` for `nombre`, `fechaEval`, `codInstructor`, `aeronave`, `alumnosTurno`, `maniobrasTurno`, **but has no `programa` and no `idSubfase` field** — program and subfase cannot be changed via update.

Business logic (`TurnoService.update`, turno/services/TurnoService.java:122-181):
1. Loads `Turno` by id or `ResourceNotFoundException("No existe información de turno.")` (404).
2. `if (!turnoInDb.permiteCambios()) throw new ActionExpiredException("No se puede modificar. El turno ya ha sido evaluado.")` — `permiteCambios()` is `LocalDate.now().isBefore(getFechaEval())` (turno/entities/Turno.java:185-187), i.e. it checks the turn's **date is still in the future**, not literally "has an evaluation been recorded" despite the message text. → **410 Gone**, `ErrorResponse{error:"Fecha de modificación expiró", message:"No se puede modificar. El turno ya ha sido evaluado."}`.
3. Aircraft lookup/availability check identical to create (steps 2–3 above).
4. Rebuilds `alumnosTurno`/`maniobrasTurno` lists by matching existing rows (`findByCodAlumnoAndTurno_Id`/`findByIdManiobraAndTurno_Id`) or creating new ones.
5. Success: `ResponseEntity.ok(turnoService.update(id, turnoDto))` — same plain-200/raw-entity shape as create (no `wasSaved`).

Same `ActionExpiredException` check (`permiteCambios`) is used identically on **`DELETE /api/turnos/{id}`** (TurnoController.java:200-222, `@PreAuthorize` → **`Manage Shifts`**): if the turno's date is not in the future, returns 410 before deleting. Otherwise deletes child `alumnosTurno`/`maniobrasTurno` rows then the `Turno`, and returns `response.wasDeleted("Turno")` → 200 plain text `"Turno eliminado con éxito."`; a `DataAccessException` during deletion → `Response.deleteQueryError` (500, §1.1).

### 3.7 Aeronave / EstadoAeronave — no listing endpoint exists
`Aeronave` entity (turno/entities/Aeronave.java): fields `id`, `nombre`, `descripcion`, `imagen`, `estado` (getter computes `EstadoAeronave` from stored string via `EnumNormalizable`). The `turnos` back-reference getter is **commented out** (`//public List<Turno> getTurnos()`, line 65-67) so it is never serialized regardless.

⚠ **There is no `AeronaveController` and no endpoint anywhere that lists all aeronaves.** `IAeronaveDao` (turno/dao/IAeronaveDao.java) is a plain `CrudRepository` used only internally by `TurnoController`/`TurnoService` to validate a single `aeronave.id` supplied in a `TurnoCreate`/`TurnoUpdate` body (TurnoController.java:180-184, TurnoService.java:140-144). The only aircraft data ever returned to a client is the nested `IdAndName` inside `TurnoByAeronave` (§3.3) or the full `Aeronave` embedded in a create/update `Turno` response (§3.5/3.6) — neither is a catalog a picker can page through. See §7.

---

## 4. Evaluaciones prácticas

### 4.1 `EvaluacionController`

Constants: `nombreEntidad = "Evaluación"`, `nombreLista = "evaluaciones"` (EvaluacionController.java:75-76).

#### `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}`
`@PreAuthorize` → **`Read`** (EvaluacionController.java:84-85). Returns `List<PuntajeSubfase>` (evaluacion/projections/PuntajeSubfase.java: `{"codigo":"string","promedio":"string"}`), 404 plain text `"No existen evaluaciones disponibles."` only if the service returns `null` (it never does in practice — `findByIdSubFaseAndCodPersonaAndCategoriaIn` returns an empty list, not null, so `isNull` branch is effectively dead here; an empty list serializes as `[]` with 200). Filters to categories `Ponderada`/`Chequeo Sub Fase` only (EvaluacionServiceImpl.java:33-36).

#### `GET /api/evaluaciones/subfase/{id}/persona/{cod}`
`@PreAuthorize` → **`Read`**. Returns `200 { "cabecera": <CabeceraReporte>, "maniobras": <List<IdAndName>>, "notas": <List<NotaReporte>> }` (EvaluacionController.java:117-122). `CabeceraReporte` (evaluacion/projections/CabeceraReporte.java): `{"fase":"string","subFase":"string","programa":"string","alumno":"string"}`. `NotaReporte` (evaluacion/projections/NotaReporte.java): `{"codigo":"string","categoria":"string","clasificacion":"string","promedio":"string","recomendacion":"string","calificaciones":[{"notaMin":"string","nota":"string"}]}`. 404 plain text `"No existen evaluaciones disponibles."` if `reporte == null`.

#### `GET /api/evaluaciones/filter/persona/{cod}` — list with filters
`@PreAuthorize` → **`Read`** (EvaluacionController.java:125-126). Query params: `idSubfase` (int, default 0), `nombre` (Programa, default `"pdi"`, case-insensitive global converter), `clasificacion` (String, default `""`, parsed per §2), `page`/`size`/`direction` (Page_Sort defaults), `property` (default `"codigo"`). Branching in `EvaluacionServiceImpl.findAllByFilters` (lines 89-100) mirrors §3.1's 4-way branch on `idSubfase`/`clasificacion` instead of dates. Response: `Page<EvalByAlumno>`, 404 `isEmpty("evaluaciones")` if empty.

`EvalByAlumno` projection (evaluacion/projections/EvalByAlumno.java:5-22):
```json
{ "codigo":"string","nombre":"string","fase":"string","evaluador":"string","fecha":"yyyy-MM-dd","alumno":"string","promedio":"string","clasificacion":"string" }
```

#### `GET /api/evaluaciones/persona/{cod}` — evaluations for one turno
`@PreAuthorize` → **`Read`**. Query params: `idTurno` (int, default 0), same paging defaults, `property` default `"codigo"`. Builds `codigo = cod + "-" + idTurno + "%"` and calls `findByCodigoLike` (SQL `LIKE`, EvaluacionController.java:178-180, IEvaluacionDao.java:33) → `Page<EvalByAlumno>`.

#### `GET /api/evaluaciones/{cod}` — detail
`@PreAuthorize` → **`Read`** (EvaluacionController.java:194-195). 404 plain text `"Evaluación especificada no existe."` if not found. Otherwise 200, full `EvaluacionPractica` entity JSON:
```json
{
  "codigo":"string","nombre":"string","fecha":"yyyy-MM-dd","programa":"PDI",
  "categoria":"string (raw Categoria.getNombre() value, e.g. 'Chequeo Sub Fase')",
  "clasificacion":"Malo|Regular|Bueno|Excelente|null",
  "promedio":"string|null","recomendacion":"string|null","archivoUrl":"string|null",
  "idSubFase":0,"fase":"string","subFase":"string","estadoAlumno":"string",
  "codEvalPrevia":"string|null",
  "codEvaluador": null,
  "evaluador":"string","codPersona":"string","alumno":"string",
  "calificaciones":[ { "codEvaluacion":"string","idManiobra":0,"notaMin":"string","nota":"string","causa":"string|null","observacion":"string|null","recomendacion":"string|null","maniobra":{"id":0,"nombre":"string","descripcion":"string"} } ]
}
```
⚠ `codEvaluador` is annotated `@Transient` (evaluacion/entities/EvaluacionPractica.java:41-42) — it is set in memory during `create`/`update` (so the create/update response body shows it), but is **never persisted**, so a subsequent `GET /evaluaciones/{cod}` (or a re-fetch after create) will always show `"codEvaluador": null`. `calificaciones[].evaluacionPractica` back-reference is excluded via `@JsonBackReference` (Calificacion.java:31), avoiding recursion.

#### `POST /api/evaluaciones/turno/{id}/persona/{cod}` — create
`@PreAuthorize("hasRole('" + Permiso.WRITE + "')")` → **`Write`** (EvaluacionController.java:212-213). Has a `BindingResult` parameter, so `@Valid` failures return `Response.setErrorsFrom` (§1.1: raw JSON array of `"'campo': mensaje"`, 400) rather than `GlobalExceptionHandler`'s `ErrorResponse`.

**`EvaluacionCreate` DTO** (evaluacion/dtos/EvaluacionCreate.java):
| Field | Validation | Message |
|---|---|---|
| `nombre` | `@NotBlank`; `@Size(min=10,max=30)` | `"Ingresar nombre de evaluación."` / `"Nombre debe tener de {min} a {max} caracteres."` |
| `categoria` | `@NotNull` | `"Ingresar categoria válida."` |
| `recomendacion` | `@Size(max=250)` | `"Recomendación debe tener un máximo de {max} caracteres."` |
| `url` | none | — |
| `codEvaluador` | none (conditionally checked in code, not bean validation) | — |
| `calificaciones` | `List<@Valid CalificacionCreate>`, `@NotNull` | `"Las calificaciones son requeridas"` |

**`CalificacionCreate`** (evaluacion/dtos/CalificacionCreate.java):
| Field | Validation | Message |
|---|---|---|
| `idManiobra` | `@Positive` | `"La maniobra es requerida"` |
| `nota` | `@NotBlank` | `"Ingresar calificación de maniobra."` |
| `causa` | `@Size(max=250)` | `"Causa debe tener un máximo de {max} caracteres."` |
| `observacion` | `@Size(max=250)` | `"Observación debe tener un máximo de {max} caracteres."` |
| `recomendacion` | `@Size(max=250)` | `"Recomendación debe tener un máximo de {max} caracteres."` |

⚠ There is **no** bean-validation or code-level rule that forces `causa`/`observacion`/`recomendacion` to be filled when a grade is "bajo el estándar" (`Dirbe.calificacionBajoEstandar`). This is purely optional free text regardless of grade — see §7.

**Business logic, in exact order** (EvaluacionController.java:212-314):
1. `bindingResult.hasErrors()` → 400 raw array (§1.1).
2. `evaluacionDto.evaluarCodInstructor()` = `!esPonderada_ChequeoSub() && codInstructorRequerido()`, where `codInstructorRequerido()` = `codEvaluador == null || codEvaluador.length() != 6` (`utils/CodigoPersona.java:5-7`). If true → `EvaluacionResponse.instructorRequerido` → **400** `{"mensaje":"Instructor requerido para evaluación no programada."}`.
3. `codigo = cod + "-" + id` (alumno code + turno id). If category is `Ponderada`/`chequeoSubFase` (`esPonderada_ChequeoSub`) **and** `evaluacionService.existsByCod(codigo)` → **403 Forbidden** `{"mensaje":"La evaluación ya ha sido registrada."}` (duplicate check only applies to these two non-repeatable categories).
4. Loads `alumnoInDb = personaService.findByCod(cod)`; `null` → 404 plain text `"Alumno especificada no existe."`.
5. `EvaluacionResponse.comprobarEstado(categoria.getNombre(), alumnoInDb.getEstado(), response)` (evaluacion/services/EvaluacionResponse.java:14-27) — puts a `"mensaje"` key into the response map (later returned with 400) if:
   - category is `Ponderada` and `!Estado.puedeSerEvaluado(estado)` → `"El alumno debe ser apto para realizar evaluaciones ponderadas."`
   - category is `Chequeo` and `!Estado.puedeRealizarChequeo(estado)` → `"El alumno no se encuentra en chequeo."`
   - category is `chequeoSubFase` and `!Estado.puedeSerEvaluado(estado)` → `"El alumno debe ser apto para realizar el chequeo de subfase."`
   - category is `Complementacion` and `!Estado.puedeRealizarCompl(estado)` → `"El alumno debe ser apto o realizar complementaciones de subfase."`
   → if any message was set, returns **400** `{"mensaje":"<msg>"}`.
6. Loads the `Turno` (with maniobras) via `turnoService.findByIdWithManiobra(id)`; if `turno.getManiobrasTurno().size() != evaluacionDto.getCalificaciones().size()` → `EvaluacionResponse.notasRequeridas` → **400** `{"mensaje":"Todas las notas son requeridas."}`.
7. For each calificación: `notaComp = notaMin + nota` (e.g. `"BR"`). `itemDto.formatoNota(notaMin, contD)` forces `nota="D"` if `notaMin=="D"` (a "D" standard forces a "D" grade — `contD` counter increments locally but the increment is lost because `contD` is a primitive `int` passed by value and reassigned inside the method without being returned — **`contD` never actually increases across iterations**, see §7). Uppercases the grade. Then:
   - `evaluarNotaIncorrecta`: if `!Dirbe.notaValida(nota)` (nota not one of D/I/R/B/E) → appends `idManiobra` to an error buffer.
   - `evaluarCalificacionIncorrecta(notaComp, ...)`: if `Dirbe.calificacionNoValida(notaComp)` → same buffer.
   - `Dirbe.asignarNotaBaja(notaComp, hayNotasBajas)`: sets `hayNotasBajas=true` once if `Dirbe.calificacionBajoEstandar(notaComp)` is ever true for any item.
   - `notas.calcularContador(notaComp)` accumulates counters (see §4.3 algorithm).
8. If any invalid-note/invalid-grade ids were collected → **400** `{"mensaje:":["Las notas con id: N N... no utilizan el sistema de calificación.", "La nota de las maniobras con id: N N... no son correctas."]}` (note the literal key has a **trailing colon**: `"mensaje:"`, EvaluacionController.java:263, `response.getMap().put("mensaje:", mensajes)` — a likely typo, see §7).
9. If category is NOT ponderada/chequeoSubFase: increments `alumnoInDb.getContEval()`, appends it to `codigo` (`codigo = codigo + "-" + contEval`), and sets `evaluadorInDb = personaService.findByCod(evaluacionDto.getCodEvaluador())` — **no null check**, will NPE if `codEvaluador` doesn't resolve to a real `Persona` (§7).
10. Builds the `EvaluacionPractica`: `codigo`, `fecha=now()`, `programa`/`idSubFase`/`fase`/`subFase`/`codInstructor`(implicitly via turno)/`estadoAlumno`/`codPersona`/`alumno` copied from `turno`/`alumnoInDb`; `evaluacionDto.asignarDetalles(...)` builds the `Calificacion` list; `evaluacionDto.ToEntity(evaluacion)` copies `nombre`/`categoria`/`recomendacion`/`archivoUrl`.
11. `if (!alumnoInDb.puedeSerEvaluado()) evaluacion.setClasificacion(hayNotasBajas ? Malo : Bueno)` — simple pass/fail classification used when the student is **not** in the apto/en-observación state (i.e. is mid Chequeo/Complementación flow).
12. `if (evaluacion.esPonderada() || evaluacion.esChequeoSubFase()) { notas.calcularResultado(evaluacion, contD); evaluadorInDb = personaService.findByCod(turno.getCodInstructor()); }` — **the evaluator is auto-set from the turno's assigned instructor**, not from the authenticated caller and not cross-checked against them; see §7 ("only the assigned instructor may evaluate" is data plumbing, not an authorization rule).
13. `if (!evaluacion.esComplementacion() && hayNotasBajas) alumnoInDb.setCodEvalDesaprobada(codigo)`.
14. Chains `codEvalPrevia` from the student's previous `codEvalRealizada`, then sets the student's `codEvalRealizada = codigo`.
15. `evaluacion.setCodEvaluador(evaluadorInDb.getCodigo())` / `setEvaluador(nombre + " " + aPaterno)` — **no null check on `evaluadorInDb`** (§7, item combines with step 9).
16. Saves the evaluation, then calls `resultadoController.saveAll(alumnoInDb, evaluacion, hayNotasBajas)` (§4.3) — `DataAccessException` here → `Response.saveQueryError` (500, §1.1).
17. Success → `response.wasSaved("Evaluación", evaluacion)` → **201** `{"mensaje":"Evaluación guardada con éxito.","evaluación": <EvaluacionPractica JSON>}` (note the accented lower-cased key literally `"evaluación"`).

#### Evaluation `codigo` construction (summary)
- Ponderada / chequeoSubFase: `"<codAlumno>-<idTurno>"` (unique; duplicate creation blocked).
- Chequeo / Complementacion: `"<codAlumno>-<idTurno>-<contEval>"` (repeatable; `contEval` is a per-student counter).
`CodigoEval.obtenerIdTurno` parses back the turno id by locating the dash at index 6 (`utils/CodigoEval.java:5-12`); `obtenerCodPersona` takes the first 6 chars (`:14-16`). This is why every `codigo`/`codAlumno` is treated as fixed 6 characters throughout (`Alumno_TurnoSave.codAlumno` `@Size(min=6,max=6)`, `CodigoPersona.evaluarInstructorRequerido` checks `length()!=6`).

#### `PUT /api/evaluaciones/{cod}` — update
`@PreAuthorize("hasRole('" + Permiso.MODIFY_EVALUATIONS + "')")` → **`Modify Evaluations`** (EvaluacionController.java:316-317) — note this is a **different** permission than create's `Write`; per `Role.java`, only `Administrador` and `Comandante` hold `MODIFY_EVALUATIONS`, so an `Instructor` who created an evaluation cannot edit/delete it.

**`EvaluacionUpdate` DTO** (evaluacion/dtos/EvaluacionUpdate.java): same `nombre`/`categoria`/`recomendacion`/`url`/`codEvaluador` fields/messages as create, **but `calificaciones` has no `@NotNull`** (only `List<@Valid CalificacionUpdate>` with per-item validation) — see §7 for the NPE risk this creates.

**`CalificacionUpdate`**: identical fields/messages to `CalificacionCreate`.

Business logic (EvaluacionController.java:316-400):
1. `bindingResult.hasErrors()` → 400 raw array.
2. `alumnoInDb = personaService.findByCod(cod.substring(0,6))` — **no null check** before using it (§7).
3. `if (!cod.equals(alumnoInDb.getCodEvalRealizada())) return EvaluacionResponse.ultimaEval` → **403** `{"mensaje":"Solo se puede modificar la ultima evaluación realiza por el alumno."}` — enforces "only the most recent evaluation for this student may be edited."
4. `evaluarCodInstructor()` check identical to create → 400 `{"mensaje":"Instructor requerido para evaluación no programada."}`.
5. Loads `evaluacionInDb` by `cod`; `null` → 404 plain text `"Evaluación especificada no existe."`.
6. Same `comprobarEstado` check as create (against `evaluacionInDb.getEstadoAlumno()`) → same 400 messages.
7. `if (evaluacionInDb.getCalificaciones().size() != evaluacionDto.getCalificaciones().size())` → `notasRequeridas` 400 — **`NullPointerException` if `evaluacionDto.getCalificaciones()` is `null`** (field has no `@NotNull`, see above) → falls through to `GlobalExceptionHandler`'s generic handler → **500** `{"error":"Error inesperado", ...}`.
8. Same per-item grade validation/counters/`hayNotasBajas` computation as create, applied against `itemInDb.getNotaMin()` (the maniobra's minimum grade is immutable, taken from the existing `Calificacion`, not from the request).
9. `evaluacionDto.ToEntity(evaluacionInDb)`; `setFecha(now())`.
10. Same `alumnoPuedeSerEvaluado()`/Malo-Bueno vs `calcularResultado` branching as create.
11. `if (!evaluacionDto.esPonderada_ChequeoSub() && evaluacionDto.codInstructorModificado(evaluacionInDb))` (i.e. `!codEvaluador.equals(evalInDb.getCodEvaluador())`) → re-resolves `evaluadorInDb` and updates `codEvaluador`/`evaluador` (only for repeatable categories where the evaluator is manually specified).
12. `if (!esComplementacion() && hayNotasBajas) alumnoInDb.setCodEvalDesaprobada(codigo)`.
13. Saves, calls `resultadoController.updateAll(...)` (§4.3); `DataAccessException` → `Response.updateQueryError` (500).
14. Success → `response.wasSaved("Evaluación", evaluacionService.findByCodigo(cod))` → **201** (re-fetches fresh from DB, so the response's `codEvaluador` will again be `null` per the `@Transient` note above).

#### `DELETE /api/evaluaciones/{cod}`
`@PreAuthorize` → **`Modify Evaluations`** (EvaluacionController.java:402-403). 404 if not found; 403 `ultimaEval` if `cod` isn't the student's current `codEvalRealizada`; otherwise decrements `contEval` for non-ponderada/chequeoSubFase categories, restores the student's `codEvalRealizada` to the deleted eval's `codEvalPrevia`, computes `hayNotasBajas = Dirbe.existenNotasBajas(calificaciones)`, deletes, calls `resultadoController.revertAll(...)` (§4.3), returns `response.wasDeleted("Evaluación")` → 200 plain text `"Evaluación eliminado con éxito."` (grammatically odd — "eliminado" not "eliminada" — literal text from `Response.wasDeleted`, gender-invariant template).

### 4.2 `ResultadoController` — **not a REST controller**

`@Component` (evaluacion/controllers/ResultadoController.java:23), **no `@RequestMapping`, no HTTP method annotations** — it exposes zero HTTP endpoints. It is an internal helper invoked directly by `EvaluacionController` (`saveAll`/`updateAll`/`revertAll`) to update the student's `estado`/counters and manage `Desaprobado`/`ChequeoFinal` side records after every create/update/delete of an evaluation. See §4.3 for exact state-transition logic. (This contradicts the task framing that assumed it has endpoints — it has none; flagged again in §7.)

### 4.3 State machine & grading algorithm

**`Persona` counters** (grupo/entities/Persona.java): `contChequeo`, `contEval`, `contMalo`, `contRegular`, plus `estado` (Estado.getNombre() string), `codEvalRealizada`, `codEvalDesaprobada`.

**Grading algorithm — `CalculoNota`** (evaluacion/utils/CalculoNota.java), invoked only for `Ponderada`/`chequeoSubFase` categories:
1. `calcularContador(notaComp)` tallies, per grade-pair (`notaMin`+`nota`): `"IR"→postR++`, `"RI"/"BI"→subI++`, `"RB"→postB++`, `"BR"→subR++`, `"BE"→postE++` (everything else ignored).
2. `calcularClasificacion()`:
   - `subI>0` → **Malo**
   - else `subR>=5` → **Malo**
   - else `subR==4` → **Regular**
   - else `subR>=1` → **Bueno**
   - else `postE>=5` → **Excelente**
   - else → **Bueno**
3. `calcularPtsBase()` by classification: `Malo=12`, `Regular=15`, `Bueno=17`, `Excelente=20` (evaluacion/utils/CalculoNota.java:49-60). (Note: this is an **integer** base score, not `17.50`.)
4. `calcularPtsDesc()`: if `Malo`, `0`; else `-0.5*subR + 0.6*(postR+postB)`.
5. `validarPuntaje(contD, total, cantDetalles)`: if `contD == cantDetalles` (every maniobra had a `"D"` minimum standard) **or** `total > 20` → force `"20.0"`; else `String.format("%.1f", total)`. As noted in §4.1 step 7, `contD` is never actually incremented across the loop due to the pass-by-value bug in `formatoNota`, so in practice `contD` stays `0` for the whole evaluation and this "all-D" shortcut path is **dead code** unless `cantDetalles` is also `0` (impossible, since `@NotNull` calificaciones list must match the turno's maniobra count) — see §7.
6. `evaluacion.setClasificacion(...)` / `evaluacion.setPromedio(<String>)`.

For **Chequeo**/**Complementacion**, no `CalculoNota` math runs; classification is the simple `hayNotasBajas ? Malo : Bueno` from step 11/10 above, and `promedio` stays `null`.

**`Dirbe` rules** (utils/Dirbe.java):
- `notaValida(nota)`: one of `D`,`I`,`R`,`B`,`E`.
- `calificacionNoValida(notaComp)`: one of `ID`,`IB`,`IE`,`RD`,`RE`,`BD`,`ED` (nonsensical minimum/actual grade combos, e.g. actual grade below a "D" minimum in the wrong direction).
- `calificacionBajoEstandar(notaComp)`: one of `RI`,`BI`,`BR` (actual grade below the maniobra's minimum standard).

**`ResultadoController.saveAll`** (create) state transitions (evaluacion/controllers/ResultadoController.java:33-96), using `Estado` constants `Apto`, `enChequeo`, `enObservacion`, `enFinal`, `enComplementacion`, `enDeliberacion`:
- Ponderada & student `esApto()`:
  - `esMala()` → `contMalo++`, saves a `Desaprobado`.
  - `esRegular()` & `TurnoDesaprobado.esRegularAlternado(alumno)` (true when `contRegular==0` or even) → `contRegular++`, saves a `Desaprobado`.
  - `TurnoDesaprobado.esChequeo(eval, alumno)` (criteria below) → `estado = enChequeo`.
- Ponderada & student `estaEnObservacion()`: if notas bajas & `contChequeo==1` → `enChequeo`; if notas bajas & `contChequeo==2` → `enDeliberacion`.
- Chequeo: `contChequeo++`; no notas bajas & `estaEnChequeo()` → `enObservacion`; no notas bajas & `estaEnFinal()` → saves `ChequeoFinal` snapshot, `estado=Apto`, resets all 4 counters to 0; notas bajas & (`contChequeo==2` or `estaEnFinal()`) → `enDeliberacion`.
- ChequeoSubFase: notas bajas → `enComplementacion`; no notas bajas → saves `ChequeoFinal`, `estado=Apto`, resets counters.
- Complementacion & `estaEnComplementacion()` → `estado=enFinal`.

`TurnoDesaprobado.esChequeo` (evaluacion/utils/TurnoDesaprobado.java:30-38) routes on `eval.esCriterio1()` (fase = "Adaptación" or "Operaciones HeliTransportadas") using `comprobarCriterio1(malos,regulares)`: `malos==3` or `malos==2&&regulares==2` or `malos==1&&regulares==4` or `regulares==6`; or `eval.esCriterio2()` (fase = "Operaciones AeroTácticas") using `comprobarCriterio2`: `malos==2` or `malos==1&&regulares==2` or `regulares==4`.

`updateAll`/`revertAll` mirror the same transitions in reverse/adjusted form when an evaluation is edited or deleted (ResultadoController.java:98-257) — key differences: `updateAll` first looks up any existing `Desaprobado` row for the (unchanged) `codigo` to decrement counters before re-applying, and deletes the `Desaprobado` if the edited grade is no longer Mala/Regular; `revertAll` fully undoes counters/estado and, if notas bajas existed, restores `alumnoInDb.codEvalDesaprobada` to the **previous** `Desaprobado` found via `findLastDesaprobado`.

### 4.4 `ResultadoController` side entities

**`Desaprobado`** (evaluacion/entities/Desaprobado.java): fields `codigo`(PK), `clasificacion`(enum), `subfase`, `fecha`, `programa`(enum), `idSubfase`; `persona` is `@JsonBackReference` (excluded from JSON). JSON shape when returned by `DesaprobadoController`:
```json
{ "codigo":"string","clasificacion":"Malo|Regular|Bueno|Excelente","subfase":"string","fecha":"yyyy-MM-dd","programa":"PDI|PDE","idSubfase":0 }
```

**`ChequeoFinal`** (evaluacion/entities/ChequeoFinal.java): `codigo`,`contChequeo`,`contEval`,`contMalo`,`contRegular`. **No controller exposes this entity at all** — it is purely internal bookkeeping used by `ResultadoController`/`IChequeoService` to snapshot/restore a student's counters around a Chequeo/ChequeoSubFase cycle.

### 4.5 `DesaprobadoController`

`nombreEntidad = "Desaprobado"` (`Desaprobado.class.getSimpleName()`), `nombreLista = "desaprobados"` (`Desaprobado.class.getAnnotation(Table.class).name()`, DesaprobadoController.java:31-32).

- `GET /api/desaprobados/persona/{codPersona}` — `@PreAuthorize` → **`View Disapproved`** (DesaprobadoController.java:38-39). `List<Desaprobado>`; 404 plain text `"No existen desaprobados disponibles."` if empty.
- `GET /api/desaprobados/alumno/{cod}/subfase/{id}` — ⚠ **no `@PreAuthorize`** (only requires authentication, any role) — line 56-57. Returns single `Desaprobado` (last one for that student+subfase) or 404 plain text `"Desaprobado especificada no existe."`.
- `GET /api/desaprobados/regular/alumno/{cod}/subfase/{id}` — ⚠ **no `@PreAuthorize`** — line 73-74. Last `Regular`-classified `Desaprobado` for that student+subfase.
- `DELETE /api/desaprobados/{cod}` — ⚠ **no `@PreAuthorize`** — line 91-92. 200 plain text `"Desaprobado eliminado con éxito."` on success (no existence check — `deleteByCodigo` on a non-existent id silently no-ops).
- `GET /api/desaprobados/exist/{cod}` — ⚠ **no `@PreAuthorize`** — line 104-105. Returns raw boolean `true`/`false`, 200.

See §7 — four of these five endpoints have no permission gate at all, unlike every sibling controller.

---

## 5. Catalogs

### 5.1 `SubFaseController` (maniobra/controllers/SubFaseController.java)

- `GET /api/subfases?page&size&direction&properties` — `@PreAuthorize` → **`Read`**. Uses `PageWithSort` (valid sort props `id`,`nombre`); errors go to `GlobalExceptionHandler` (§1.2), not Response.java. Returns `Page<IndexGeneral>` where `IndexGeneral` (projections/IndexGeneral.java): `{"id":0,"nombre":"string","descripcion":"string"}`. `SubfaseService.findAll` throws `ResourceNotFoundException("No existen subfases disponibles.")` on empty (404 `ErrorResponse`, not plain text).
- `GET /api/subfases/assign` — `@PreAuthorize` → **`Manage Subphases`**. Returns `List<IndexGeneral>` of subfases with `id_fase IS NULL` (`subfaseDao.findByFaseIsNull`) — i.e. subfases not yet attached to any Fase.
- `GET /api/subfases/assigned` — ⚠ **no `@PreAuthorize`** (any authenticated user). Returns `List<IdAndName>` (`{"id":0,"nombre":"string"}`) of subfases with `id_fase IS NOT NULL`.
- `GET /api/subfases/{id}` — `@PreAuthorize` → **`Read`**. Returns `DetalleSubfase` (maniobra/projections/DetalleSubfase.java): `{"id":0,"nombre":"string","descripcion":"string","maniobrasSubfase":[{"maniobra":{"id":0,"nombre":"string","descripcion":"string"}}]}`; `ResourceNotFoundException("No existe información de subfase.")` if not found.

### 5.2 `FaseController` GETs

- `GET /api/fases?page&size&direction&properties` — `@PreAuthorize` → **`Read`**. `Page<IndexGeneral>`.
- `GET /api/fases/{id}` — `@PreAuthorize` → **`Read`**. `DetalleFase` (maniobra/projections/DetalleFase.java): `{"id":0,"nombre":"string","descripcion":"string","subfases":[{"id":0,"nombre":"string","descripcion":"string"}]}`.
(POST/PUT require `Manage Phases`; DELETE returns 204 No Content — outside the requested scope but noted for completeness, maniobra/controllers/FaseController.java:54-71.)

### 5.3 `ManiobraController` GETs

- `GET /api/maniobras?page&size&direction&properties` — `@PreAuthorize` → **`Read`**. `Page<IndexGeneral>`.
- `GET /api/maniobras/subfase/{id}` — `@PreAuthorize` → **`Manage Shifts`** (used when building a Turno's maniobra picker). `List<IndexGeneral>` of maniobras attached to subfase `id`; `ResourceNotFoundException("No existen maniobras disponibles.")` if empty.
- `GET /api/maniobras/{id}` — `@PreAuthorize` → **`Read`**. `DetalleManiobra` (maniobra/projections/DetalleManiobra.java): `{"id":0,"nombre":"string","descripcion":"string","estandares":[{"id":0,"nombre":"string","descripcion":"string"}]}`; `ResourceNotFoundException("No existe información de maniobra")`.

### 5.4 `PersonaController` GETs used for pickers

`nombreEntidad = "Persona"`, `nombreLista = "personas"` (PersonaController.java:63-64).

- `GET /api/personas/instructor/{tipo}` — `@PreAuthorize` → **`Manage Shifts`** (PersonaController.java:102-103). `{tipo}` is passed **verbatim as a raw string** (no enum parsing/validation) into `personaDao.findAllByTipo(tipo)` — must match the literal DB value exactly, e.g. `"Instructor PDI"` (URL-encoded as `Instructor%20PDI`) per seed data (`data_prod.sql:63,67`) and per `Tipo.PDI.getNombre()`. Returns `List<NombreAlumno>` (projections/NombreAlumno.java): `{"codigo":"string","nombre":"string","aPaterno":"string","aMaterno":"string"}`; 404 plain text `"No existen personas disponibles."` if empty.
- `GET /api/personas/alumno/{tipo}` — `@PreAuthorize` → **`Manage Groups`** (line 120-121). Same `{tipo}` semantics but also filters `idGrupo IS NULL` (`findAllByTipoAndIdGrupoIsNull`) — i.e. students not yet assigned to a Grupo. Same `List<NombreAlumno>` shape.
- `GET /api/personas/{cod}/alumno` — `@PreAuthorize` → **`Read`** (line 174-175). Returns `DetallePersona` (grupo/projections/DetallePersona.java):
```json
{ "dni":"string","nombre":"string","APaterno":"string","AMaterno":"string","rango":"string","estado":"string","usuario":{"nombre":"string","correo":"string"} }
```
  ⚠ Note the getters are `getAPaterno()`/`getAMaterno()` (capital A) — see §7 for a likely property-name/case mismatch against the `Persona` entity's `aPaterno`/`aMaterno` fields (lower-case a). 404 plain text `"Persona especificada no existe."` if not found.
- `GET /api/personas/{cod}/status` — `@PreAuthorize` → **`Write`** (line 192-193). Uses `EstadoAlumno` projection (grupo/projections/EstadoAlumno.java) internally only (never itself serialized) to compute a `List<Categoria>` of *suggested* evaluation categories:
  - `estaEnComplementacion()` → adds `Complementacion`.
  - `puedeRealizarChequeo()` (en Chequeo or en Final) → adds `Chequeo`.
  - `puedeSerEvaluado()` (Apto or en Observación) → adds `Ponderada`, `chequeoSubFase`, `Complementacion`; **else** (none of the above conditions true) → returns **404** plain text `"No hay sugerencias disponibles."` (raw `ResponseEntity<String>`, not via `Response` class).
  - Success: 200, raw JSON array of the enum **names**, e.g. `["Complementacion","Chequeo","Ponderada","chequeoSubFase"]` (note again the mixed-case `chequeoSubFase`). 404 plain text `"Persona especificada no existe."` if the code itself doesn't resolve to a `Persona`.

(Not requested but present in the same controller: `GET /api/personas` (`Manage Users`), `GET /api/personas/{nom}` no `@PreAuthorize` — session/profile lookup by **username**, not code, unrelated to turnos/evaluaciones pickers, `GET /api/personas/{cod}/usuario` (`Manage Users`), plus POST/PUT/DELETE (`Manage Users`) — all out of scope for this contract.)

### 5.5 `GrupoController` GETs

`nombreEntidad = "Grupo"`, `nombreLista = "grupos"` (GrupoController.java:48-49).

- `GET /api/grupos/programa/{nombre}?page&size&direction&property` — `@PreAuthorize` → **`View All Groups`** (line 123-124). `{nombre}` is `Programa` (global converter, case-insensitive, defaults to `PDI` on bad input). Returns `Page<CatalogoByPrograma>` (projections/CatalogoByPrograma.java):
```json
{ "content":[ { "personas":[ {"codigo":"string","nombre":"string","aPaterno":"string","aMaterno":"string","idGrupo":0,"estado":"string"} ] } ], "totalElements":0, ... }
```
- `GET /api/grupos/instructor/{cod}/programa/{nombre}?page&size&direction&property` — `@PreAuthorize` → **`View My Group`** (line 154-155). Returns `Page<CatalogoByAlumnoTurno>` (projections/CatalogoByAlumnoTurno.java):
```json
{ "content":[ { "persona":[ {"codigo":"string","nombre":"string","aPaterno":"string","aMaterno":"string","idGrupo":0,"estado":"string"} ] } ], ... }
```
  ⚠ `getPersona()` is declared to return a `List<Alumno>` (projections/CatalogoByAlumnoTurno.java:9), but the backing property (`Alumno_Turno.persona`, turno/entities/Alumno_Turno.java:26) is a **single** `@OneToOne Persona`, not a collection — a projection type mismatch. See §7.
- `GET /api/alumnos/programa/{nombre}` — `@PreAuthorize` → **`Manage Shifts`** (line 105-106). Returns `List<GrupoByPrograma>` (grupo/projections/GrupoByPrograma.java): `{"id":0,"nombre":"string","programa":"PDI","personas":[{"codigo":"string","nombre":"string","aPaterno":"string","aMaterno":"string"}]}`; 404 `isEmpty("grupos")` if empty. This is the endpoint a Turno-creation UI would use to pick students by program/group.
- `GET /api/grupos?page&size&direction&property` — `@PreAuthorize` → **`Manage Groups`**. `Page<IndexGrupo>` (grupo/projections/IndexGrupo.java extends `IndexGeneral`): `{"id":0,"nombre":"string","descripcion":"string","programa":"PDI"}`.
- `GET /api/grupos/{id}` — `@PreAuthorize` → **`Manage Groups`**. Full `Grupo` entity JSON: `{"id":0,"nombre":"string","descripcion":"string","programa":"PDI","personas":[<full Persona JSON, minus grupo/desaprobados/usuario which are cleared to null/excluded>]}`. ⚠ Bug unrelated to projections: if `grupoInDb == null`, the controller calls `response.isNull(nombreEntidad)` but **does not `return` it** (GrupoController.java:99-100: `response.isNull(nombreEntidad);` with no `return`) — falls through to `return response.showData(grupoInDb)`, which is `ResponseEntity.ok(null)` → **200 with a `null` body**, not a 404. See §7.

### 5.6 `ProgramaController` — no active endpoints

`grupo/controllers/ProgramaController.java` is an empty `@RestController` shell — its entire body (an `/api/programas` index endpoint) is commented out (lines 9-33). **`GET /api/programas` does not exist.** The `Programa` catalog is only ever available as the hard-coded 2-value Java enum (`PDI`,`PDE`); there is no way to fetch it from the API. Related dead code: `ProgramaEntity`, `Programa_Persona`, `idPrograma_Persona`, `IProgramaDao`, `IPrograma_PersonaDao`, `IProgramaService`/`ProgramaServiceImpl`, `IPrograma_PersonaService`/`Programa_PersonaServiceImpl` are only referenced by each other and by the disabled controller — confirmed via `grep -rln` (no other referrers) — and there is no `programas`/`programa_persona` table in `schema_prod.sql` (only a `programa varchar(255) check (...)` column on `turnos`, `grupos`, `evaluaciones_practicas`, `personas`... — actually confirmed columns are on `turnos` and `grupos`; see schema_prod.sql:149,175,193,279).

### 5.7 `EstandarController` GETs

- `GET /api/estandares?page&size&direction&properties` — `@PreAuthorize` → **`Read`**. `Page<IndexGeneral>`.
- `GET /api/estandares/{id}` — `@PreAuthorize` → **`Read`**. `IndexGeneral` (flat, no nested detail) — note this is a different (flatter) shape than Fase/SubFase/Maniobra detail endpoints, which nest their children; Estandar's detail is identical to its index row shape.

### 5.8 `Tipo` enum and `{tipo}` path-variable parsing

`Tipo` (grupo/entities/Tipo.java): `Alumno("Alumno")`, `PDI("Instructor PDI")`, `PDE("Instructor PDE")`. **It is never used as a Spring MVC path-variable type anywhere** — every `{tipo}` path variable in `PersonaController` is typed `String` and passed straight through to a derived-query DAO method matching the raw `personas.tipo` column value (PersonaController.java:104,122; grupo/dao/IPersonaDao.java:30,33). Confirmed against seed data the actual stored values are `Alumno`, `Instructor PDI` (`Tipo.PDI.getNombre()`); no persona is seeded with `tipo='Instructor PDE'` although the enum supports it.

---

## 6. Seed data (`src/main/resources/data_prod.sql`, 204 lines)

### Fases (`fases`)
| id | nombre | descripcion |
|---|---|---|
| 1 | Adaptación | Fase inicial de familiarización con procedimientos básicos |
| 2 | Operaciones HeliTransportadas | Entrenamiento en operaciones con helicópteros |
| 3 | Operaciones AeroTácticas | Operaciones avanzadas y tácticas especiales |

### Subfases (`subfases`) — all under Fase 1 (Adaptación)
| id | nombre | id_fase | descripcion |
|---|---|---|---|
| 1 | Contacto | 1 | Familiarización con controles y procedimientos básicos |
| 2 | Navegación | 1 | Técnicas de navegación y orientación |
| 3 | Instrumentos | 1 | Manejo de instrumentos de vuelo |
| 4 | Campos Extraños | 1 | Operaciones en terrenos no preparados |
| 5 | Formación | 1 | Vuelo en formación y coordinación |

(Note: the seeded `turnos` table later associates subfase 4/"Campos Extraños" with Fase "Operaciones HeliTransportadas" and subfase 5/"Formación" with Fase "Operaciones AeroTácticas" as denormalized text — see `turnos` below — which does **not** match the `subfases.id_fase=1` FK for those rows; the `turnos.fase`/`turnos.subfase` columns are free-text snapshots, not FKs, so this is just stale/inconsistent seed text, not a schema violation.)

### Maniobras (`maniobras`) — 10 rows, generic names
IDs 1–10, `nombre = "Maniobra N"`, `descripcion = "Descripcion de Maniobra N"`.

### Maniobra ↔ Subfase (`maniobras_subfase`)
| id_subfase | id_maniobra |
|---|---|
| 2 (Navegación) | 1,2,3,4,5,6 |
| 4 (Campos Extraños) | 7,8 |
| 3 (Instrumentos) | 9,10 |

(Subfases 1/Contacto and 5/Formación have **no** maniobras assigned in seed data, yet `turnos` seed rows 1-3 and 7 reference subfase "Contacto"/"Formación" with 6 maniobras each — see below, an inconsistency between `maniobras_subfase` and the seeded `turnos`/`maniobras_turno`.)

### Estandares (`estandares`)
| id | nombre | id_maniobra |
|---|---|---|
| 1 | Estandar 11 | 1 |
| 2 | Estandar 22 | 2 |
| 3 | Estandar 23 | 2 |
| 4 | Estandar 34 | 3 |
| 5 | Estandar 45 | 4 |
| 6 | Estandar 46 | 4 |
| 7 | Estandar 47 | 4 |
| 8 | Estandar 48 | 4 |
| 9 | Estandar 59 | 5 |
| 10 | Estandar 60 | 9 |
| 11 | Estandar 61 | 9 |
| 12 | Estandar 62 | 10 |

### Grupos (`grupos`) — all programa `PDI`
| id | nombre | descripcion |
|---|---|---|
| 1 | Grupo 1 | Instrucción básica - Nuevos ingresantes |
| 2 | Grupo 2 | Instrucción avanzada - Fase final |
| 3 | Grupo 3 | Entrenamiento especializado - Nivel 1 |
| 4 | Grupo 4 | Entrenamiento avanzado - Nivel 2 |
| 5 | Grupo 5 | Instrucción intermedia - Fase media |
| 6 | Grupo 6 | Entrenamiento especializado - Nivel 2 |

(No `PDE` group is seeded.)

### Personas
| codigo | nombre apellidos | tipo | estado | idGrupo | rango | counters (chequeo/eval/malo/regular) |
|---|---|---|---|---|---|---|
| 111111 | Oscar Lopez Chaparro | Alumno | Apto | 1 | Cadete | 2/5/1/2 |
| 222222 | Juan Falconi Fernandez | Alumno | Apto | 2 | Alférez | 3/8/2/3 |
| 333333 | Carlos Vargas Rodriguez | *(null)* | Apto | *(null)* | Mayor | 0/0/0/0 |
| 444444 | Juan Torres Perez | Instructor PDI | Apto | *(null)* | Capitán | 0/0/0/0 |
| 555555 | Pedro Rodriguez Garcia | Alumno | Apto | 3 | Teniente | 2/5/1/2 |
| 666666 | Ana Torres Martinez | Alumno | Apto | 3 | Capitán | 1/4/0/1 |
| 777777 | Carlos Ramirez Sanchez | Alumno | Apto | 4 | Mayor | 4/10/3/2 |
| 888888 | Maria Flores Mendoza | Instructor PDI | Apto | *(null)* | Teniente | 2/6/1/1 |
| 999999 | Luis Diaz Castro | Alumno | Apto | 6 | Alférez | 3/7/2/2 |
| 000001 | Admin Sistema | *(null)* | Apto | *(null)* | Admin | 0/0/0/0 |

(Column order in the INSERT is `codigo, a_materno, a_paterno, dni, nombre, ...` — table above already re-ordered to "nombre apellidos" for readability; raw values e.g. row 1 = `codigo='111111', a_materno='Chaparro', a_paterno='Lopez', nombre='Oscar'`.)

### Roles (`roles`) — **mojibake present in `descripcion`**
| id | nombre | descripcion (intended Spanish, source has mojibake `Ã³`/`Ã³n` for `ó`/`ón`) |
|---|---|---|
| 1 | Alumno | Usuario en entrenamiento con acceso a evaluaciones y reportes personales |
| 2 | Administrador Web | Control total del sistema y **gesti[ó]n** de usuarios *(source: "gestiÃ³n")* |
| 3 | Jefe de Operaciones | **Supervisi[ó]n** de operaciones y gesti[ó]n de programas *(source: "SupervisiÃ³n", "gestiÃ³n")* |
| 4 | Instructor | **Evaluaci[ó]n** y seguimiento de alumnos *(source: "EvaluaciÃ³n")* |
| 5 | Comandante de Escuadr[ó]n | Gesti[ó]n de grupos y supervisi[ó]n de instructores *(role name itself: source "Comandante de EscuadrÃ³n"; description "GestiÃ³n de grupos y supervisiÃ³n de instructores")* |

(`fases`/`subfases`/`maniobras`/`aeronaves` text with accents, e.g. `Adaptación`, `Navegación`, `Instrumentos`, `Robinson R22` description, are stored correctly (UTF-8) in this same file — only the `roles` INSERT block exhibits mojibake, `data_prod.sql:71-76`.)

### Usuarios — seeded login credentials
All 10 users share the same BCrypt hash `$2a$10$kfSj6HFb/WgjLNpE1YDxw.N6/NmS1Zv76gGnyZNHQHd3geQA5CT3G` (per user memory: seeded original password is `123`, username = the `nombre` field, e.g. login username `jefe.operaciones`, `instructor.perez`, `alumno.lopez`, `admin.sistema`, etc.).
| username | correo | cod_persona | id_rol |
|---|---|---|---|
| jefe.operaciones | jefeoperaciones@sigeda.com | 333333 | 3 (Jefe de Operaciones) |
| instructor.perez | instructor@sigeda.com | 444444 | 4 (Instructor) |
| alumno.lopez | alumno1@sigeda.com | 111111 | 1 (Alumno) |
| alumno.falconi | alumno2@sigeda.com | 222222 | 1 |
| alumno.garcia | alumno3@sigeda.com | 555555 | 1 |
| alumno.torres | alumno4@sigeda.com | 666666 | 1 |
| alumno.ramirez | alumno5@sigeda.com | 777777 | 1 |
| instructor.mendoza | instructor2@sigeda.com | 888888 | 4 |
| alumno.castro | alumno6@sigeda.com | 999999 | 1 |
| admin.sistema | admin@sigeda.com | 000001 | 2 (Administrador Web) |

(No `Comandante de Escuadrón` (role id 5) user is seeded.)

### Aeronaves (`aeronaves`)
| id | nombre | estado |
|---|---|---|
| 1 | Robinson R22 | Disponible |
| 2 | Enstrom 280FX | En Mantenimiento |
| 3 | Schweizer S‑300C | No Disponible |

(Stored `estado` text uses spaces — `"En Mantenimiento"`, `"No Disponible"` — which `EstadoAeronave.fromNombre` normalizes (strip accents/case, replace) to match enum constants `En_Mantenimiento`/`No_Disponible`; the JSON the API actually emits for `getEstado()` is the **enum name with underscore**, e.g. `"En_Mantenimiento"`, not the DB text `"En Mantenimiento"` — see §2.)

### Turnos (`turnos`) — 7 rows, all programa PDI, `cod_instructor` **not set** (column omitted from the INSERT, so NULL for every seeded turno — the column is nullable per schema, `id_sub_fase integer not null` but `cod_instructor varchar(255)` with no NOT NULL, schema_prod.sql:271-286)
| id | fecha_eval | nombre | id_sub_fase | fase | subfase | cant_alumno | cant_maniobra |
|---|---|---|---|---|---|---|---|
| 1 | 2024-03-01 | Contacto Básico | 1 | Adaptación | Contacto | 1 | 6 |
| 2 | 2024-03-08 | Contacto Intermedio | 1 | Adaptación | Contacto | 1 | 6 |
| 3 | 2024-03-15 | Contacto Avanzado | 1 | Adaptación | Contacto | 1 | 6 |
| 4 | 2024-03-22 | Navegación Inicial | 2 | Adaptación | Navegación | 1 | 6 |
| 5 | 2024-03-29 | Instrumentos Avanzados | 3 | Adaptación | Instrumentos | 1 | 6 |
| 6 | 2024-04-05 | Campos Tácticos | 4 | Operaciones HeliTransportadas | Campos Extraños | 1 | 6 |
| 7 | 2024-04-12 | Navegación Avanzada | 5 | Operaciones AeroTácticas | Formación | 1 | 6 |

All dates are in the **past** relative to "today" in this environment (2026-09-19) — none of these seeded turnos would pass `TurnoUpdate`'s `@Future`-style `permiteCambios()` check, i.e. every seeded turno is already immutable/non-deletable via the API (see §3.6). `alumnos_turno`: one student per turno, all `13:00–14:30`: turno1↔111111, turno2↔222222, turno3↔555555, turno4↔666666, turno5↔777777, turno6↔999999, turno7↔999999 (student 999999 appears in both turno 6 and 7). `maniobras_turno`: turnos 1-4 and 7 use maniobras 1-6 all with `nota_min='B'` (even though `maniobras_subfase` only assigns maniobras 1-6 to subfase 2/Navegación, not to subfase 1/Contacto or 5/Formación used by turnos 1-3/7 — an inconsistency, mocks should not assume `maniobras_turno` content agrees with `maniobras_subfase`); turno 5 uses maniobras 9,10 (matches subfase 3/Instrumentos); turno 6 uses maniobras 7,8 (matches subfase 4/Campos Extraños).

### Evaluaciones prácticas & calificaciones — only for alumno 555555, turno 1
| codigo | categoria | clasificacion | cod_eval_previa | promedio | recomendacion |
|---|---|---|---|---|---|
| 555555-1 | Ponderada | Regular | *(null)* | 14.0 | Mejorar técnicas básicas |
| 555555-2 | Chequeo | Bueno | 555555-1 | *(null)* | Continuar con el entrenamiento |
| 555555-3 | Ponderada | Regular | 555555-2 | 15.0 | Reforzar procedimientos |
| 555555-3-5 | Ponderada | Regular | 555555-2 | 15.0 | Reforzar procedimientos |
| 555555-3-2 | Ponderada | Regular | 555555-2 | 15.0 | Reforzar procedimientos |

Each of `555555-1`, `555555-2`, `555555-3` has 6 `calificaciones` rows (maniobras 1-6, `nota_min='B'`, mixed `B`/`R` actual notes). Note `555555-3-5` and `555555-3-2` are malformed/duplicate-looking codes that don't fit the `"<cod>-<idTurno>"` (Ponderada) or `"<cod>-<idTurno>-<contEval>"` (Chequeo/Complementación) pattern consistently with a `Ponderada` category (a Ponderada code should have no third segment per §4.1); these two rows have **no matching `calificaciones` rows** in the seed (only `555555-1/2/3` got calificaciones inserted) — `GET /api/evaluaciones/555555-3-5` would 200 with `"calificaciones": []`. Treat these two as pre-existing malformed seed rows, not a pattern to imitate in mocks.

---

## 7. Gaps and inconsistencies

1. **`GET /api/turnos/{id}` detail is very likely broken.** `DetalleTurno.getGruposTurno()` (`turno/projections/DetalleTurno.java:13`) and its nested `DetalleGrupo{getCodInstructor(), getGrupo():NombreGrupo}` (`:17-26`) assume a `Turno → Grupo` relationship that no longer exists: the `Turno` entity has a flat `codInstructor` field and a `List<Alumno_Turno> alumnosTurno` (`turno/entities/Turno.java:41,52`), with **no** `grupo`/`gruposTurno` property or association at all. `TurnoController.detail()` (`turno/controllers/TurnoController.java:166-169`) and `TurnoService.findDetalle()` (`turno/services/TurnoService.java:83-88`) still call `getGruposTurno()`/`item.getGrupo().getPersonas()` against this non-existent property path. This is the "model moved to alumnosTurno + codInstructor but DetalleTurno wasn't updated" issue the task anticipated. I cannot run the app to see the exact resulting stack trace/status code, but structurally this getter cannot resolve against `Turno`, so the endpoint cannot return the documented shape as written.
2. **`GET /api/turnos` and `GET /api/turnos/alumno` likely have the same class of bug.** `TurnoRealizado.getCantGrupo()` (`turno/projections/TurnoRealizado.java:19`) has no matching property on `Turno`, which only has `cantAlumno` (`turno/entities/Turno.java:42`), not `cantGrupo`. Both list endpoints project `Page<TurnoRealizado>` directly off derived-query DAO methods (`ITurnoDao.java:23,26,28,30,32`), so this affects essentially the whole "list turnos" surface, not just the detail endpoint.
3. **No endpoint lists aeronaves.** `IAeronaveDao` (`turno/dao/IAeronaveDao.java`) is only used internally to validate a single `aeronave.id` on Turno create/update (`turno/controllers/TurnoController.java:180-184`, `turno/services/TurnoService.java:140-144`); there is no `AeronaveController` and grepping the whole tree for one returns nothing. A "turnos prácticos" create/edit form has no API to populate its aircraft picker (id/nombre/estado/imagen).
4. **Two incompatible error/response conventions coexist**, and even validation-error shape differs *within* the same convention depending on controller signature:
   - `Turno`/`Evaluacion`/`Persona`/`Grupo`/`Desaprobado` controllers use `utils/Response.java` → plain-text 404/200 bodies, `{"mensaje":...,"<entidad>":...}` 201, raw JSON array 400 for validation (only when the handler declares a `BindingResult` parameter, e.g. `EvaluacionController.create/update`, `evaluacion/controllers/EvaluacionController.java:214-215,318-319`).
   - `Fase`/`SubFase`/`Maniobra`/`Estandar` controllers (and `Turno`'s own `create`/`update`, which use `@Valid` **without** a `BindingResult`, `turno/controllers/TurnoController.java:176,196`) instead rely on `GlobalExceptionHandler` → structured `ErrorResponse` JSON (`timestamp/status/error/message/messages`) for the *same* class of `@Valid` failure, `404`s, etc.
   A frontend cannot use one generic error parser for the whole API; it must special-case by endpoint.
5. **`TurnoController.create()`/`update()` don't use the `wasSaved` convention at all** — they return `ResponseEntity.ok(turnoSave)` (200, raw `Turno` entity, `turno/controllers/TurnoController.java:191,197`), unlike `Evaluacion`/`Persona`/`Grupo` create/update which return 201 `{"mensaje":...,"<entidad>":...}`. Combined with `Turno.alumnosTurno`/`Turno.maniobrasTurno` being `@JsonIgnore` (`turno/entities/Turno.java:49,54`), **the create/update response never shows which students/maneuvers were actually saved** — and re-fetching via `GET /turnos/{id}` to check is the very endpoint that's broken (gap #1). A UI has no reliable way to confirm what was persisted right after a save.
6. **`Alumno_TurnoSave` has no default constructor**, and its sole constructor's parameter names (`inicio`, `fin`) don't match its own bean property names (`horaInicio`, `horaFin`) (`turno/dto/Alumno_TurnoSave.java:29-34` vs `:52-66`). Whether Jackson can deserialize `alumnosTurno[]` items from `{"codAlumno":"...","horaInicio":"...","horaFin":"..."}` JSON at all — and if so, under what field names — depends on whether the parameter-names Jackson module is active (Spring Boot 3.4.2's parent POM enables `-parameters` compilation by default, and `spring-boot-starter-json` ships `jackson-module-parameter-names`, so it plausibly works via constructor-based deserialization using **`inicio`/`fin`** as the expected JSON keys instead of `horaInicio`/`horaFin`). This is undetermined without running the app; it should be empirically verified (`POST /api/turnos` with a body using `horaInicio`/`horaFin` vs `inicio`/`fin`) before the frontend commits to either field name.
7. **No schedule/aircraft overlap validation is implemented.** `turno/utils/HorasInicioFin.java` exists with overlap-detection helpers (`dentroDeTurnoBd`, `terminaEnTurnoBd`, `iniciaEnTurnoBd`, `contieneTurnoBd`) but is **never called anywhere** in the codebase (`grep -rn "HorasInicioFin" src/main/java` matches only its own declaration). The comments in `TurnoController.create()` (`// verificar alumnos con horas en conflicto` / `// verificar conflicto con alumnos en bd`, lines 186-187) confirm this was intended but not implemented. `GET /turnos/{fecha}/aeronave/{id}` only returns same-date/same-aircraft turnos; it does not itself compute overlap.
8. **Four of five `DesaprobadoController` endpoints have no `@PreAuthorize` at all** (`evaluacion/controllers/DesaprobadoController.java:56-57,73-74,91-92,104-105` — only `indexByPersona` at line 38-39 is gated by `View Disapproved`). Any authenticated user of any role can read a specific student's last disapproval, delete any `Desaprobado` row by code, or check existence — this looks like a permission-annotation regression, not an intentional design choice, given every sibling controller consistently gates every method.
9. **`SubFaseController.notAvailable()` (`GET /subfases/assigned`) also has no `@PreAuthorize`** (`maniobra/controllers/SubFaseController.java:47-50`) while every other method in the same controller is gated — same class of regression as #8.
10. **`GrupoController.detail()` swallows its own null-check.** `if (grupoInDb == null) response.isNull(nombreEntidad);` is missing a `return` (`grupo/controllers/GrupoController.java:99-100`), so a non-existent group id returns **200 with a `null` JSON body** instead of the intended 404.
11. **`ProgramaController` has no live endpoints** — its whole body is commented out (`grupo/controllers/ProgramaController.java:9-33`). `GET /api/programas` does not exist; the `Programa` catalog is only the hard-coded 2-value enum. Related classes `ProgramaEntity`, `Programa_Persona`, `idPrograma_Persona`, `IProgramaDao`, `IPrograma_PersonaDao`, `IProgramaService`/`Impl`, `IPrograma_PersonaService`/`Impl` are dead code (no live referrer, no backing table in `schema_prod.sql`).
12. **`CatalogoByAlumnoTurno.getPersona()` is typed `List<Alumno>`** (`projections/CatalogoByAlumnoTurno.java:9`) but the backing entity property `Alumno_Turno.persona` (`turno/entities/Alumno_Turno.java:24-26`) is a single `@OneToOne Persona`, not a collection — a projection cardinality mismatch on the `GET /api/grupos/instructor/{cod}/programa/{nombre}` response. `GrupoServiceImpl.catalogoByCodInstructorAndPrograma` (`grupo/services/GrupoServiceImpl.java:78-85`) calls `Hibernate.initialize(i.getPersona())` on it, which works fine on a single lazy proxy, masking the mismatch at that call site — but the declared JSON shape (a list) vs. actual underlying data (one object) is inconsistent and needs empirical verification.
13. **`DetallePersona.getAPaterno()`/`getAMaterno()` (capital A)** (`grupo/projections/DetallePersona.java:11,13`) vs. the `Persona` entity's actual getters `getaPaterno()`/`getaMaterno()` (lower-case a, `grupo/entities/Persona.java:100-102,108-110`). Standard JavaBean/Jackson name-mangling rules would treat these as *different* property names (`APaterno` vs `aPaterno`) since two leading uppercase letters are left unmangled. Whether Spring Data's projection property resolution tolerates this case difference is undetermined without running; `GET /personas/{cod}/alumno` should be empirically checked for whether `aPaterno`/`aMaterno` actually populate.
14. **`Categoria.chequeoSubFase`'s mixed-case enum constant** (lower `c`, `evaluacion/entities/Categoria.java:6`) must be sent byte-for-byte as `"chequeoSubFase"` in `EvaluacionCreate`/`EvaluacionUpdate` JSON bodies — inconsistent with the `Ponderada`/`Chequeo`/`Complementacion` PascalCase siblings. Any frontend enum/select using a naive PascalCase-everywhere convention will silently deserialize this to `null` (per `READ_UNKNOWN_ENUM_VALUES_AS_NULL=true`, `application.properties:35`), which then fails `@NotNull` with `"Ingresar categoria válida."` rather than a clearer "bad enum" error.
15. **Two different `Programa` parsing behaviors exist side-by-side for the same enum**: query/path parameters go through the global, case-insensitive, silently-defaulting-to-`PDI` `StringToProgramaConverter` (`utils/StringToProgramaConverter.java:12-18`, registered `WebConfig.java:14`), while the `programa` field inside a `TurnoCreate`/`TurnoUpdate`/`EvaluacionCreate` JSON **body** goes through case-sensitive Jackson enum deserialization that turns anything not exactly `"PDI"`/`"PDE"` into `null` → `@NotNull` violation. A frontend must know which channel (query/path vs. body) it's using to know whether lower-case `"pdi"` is safe.
16. **Duplicate/typo'd response key `"mensaje:"` (with trailing colon)** on the manual note/maneuver validation-error branch of `EvaluacionController.create/update` (`evaluacion/controllers/EvaluacionController.java:263,369`: `response.getMap().put("mensaje:", mensajes);`) — differs from every other branch in the same controller, which use the key `"mensaje"` (no colon). A frontend keyed strictly on `"mensaje"` will miss this specific error payload.
17. **Multiple unguarded `null` dereferences (NPE risk → uncaught → 500 `"Error inesperado"`)**:
    - `EvaluacionController.update()` does not null-check `personaService.findByCod(cod.substring(0,6))` before calling `.getCodEvalRealizada()` on it (`evaluacion/controllers/EvaluacionController.java:325-327`).
    - `EvaluacionController.create()`/`update()` do not null-check `evaluadorInDb = personaService.findByCod(evaluacionDto.getCodEvaluador())` before calling `.getCodigo()`/`.getNombre()` on it for Chequeo/Complementación evaluations with a bad `codEvaluador` (`:272-273,304`, `:382-386`).
    - `EvaluacionUpdate.calificaciones` has no `@NotNull` (unlike `EvaluacionCreate.calificaciones`, `evaluacion/dtos/EvaluacionUpdate.java:27` vs `evaluacion/dtos/EvaluacionCreate.java:31`), so a PUT body omitting `calificaciones` NPEs at `evaluacionInDb.getCalificaciones().size() != evaluacionDto.getCalificaciones().size()` (`EvaluacionController.java:343`).
18. **No enforced business rule ties a "bajo el estándar" grade to requiring `causa`/`observacion`/`recomendacion`.** `CalificacionCreate`/`CalificacionUpdate` only bound these three fields with `@Size(max=250)` (all optional) — there is no conditional validator checking `Dirbe.calificacionBajoEstandar(notaMin+nota)` and then requiring non-blank `causa`/`observacion`/`recomendacion` (`evaluacion/dtos/CalificacionCreate.java`, `CalificacionUpdate.java`). If this is expected UX, it must be enforced client-side only; the backend accepts a bajo-estándar grade with all three fields blank.
19. **The "only the assigned instructor may evaluate" rule is not an authorization check.** For `Ponderada`/`chequeoSubFase` evaluations, the backend always sets the evaluator from `turno.getCodInstructor()` (`EvaluacionController.java:293,304`), regardless of which authenticated user (with `Write` permission) actually calls the endpoint — it never compares the caller's own `codPersona` to the turno's instructor. Any `Write`-permitted user can create the evaluation; the recorded "evaluador" is just auto-populated data, not an access-control gate.
20. **`contD` (count of maniobras whose minimum standard is `"D"`) never actually accumulates.** `CalificacionCreate/Update.formatoNota(String notaMin, int contD)` receives `contD` **by value** and does `contD++` locally without returning it or mutating a shared holder (`evaluacion/dtos/CalificacionCreate.java:76-81`); the caller's `byte contD` in `EvaluacionController.create/update` (`:242,346`) is never reassigned from the call result. The "all maniobras have a D standard → automatic 20.0" shortcut in `CalculoNota.validarPuntaje` (`utils/CalculoNota.java:79-86`, `contD == cantDetalle`) is effectively **dead** (comparison is always `0 == cantDetalles`, true only if there are zero maniobras, which can't happen given the earlier count-matching check).
21. **`ResultadoController` exposes zero HTTP endpoints.** It is a plain `@Component` (`evaluacion/controllers/ResultadoController.java:23`) invoked only from within `EvaluacionController`; there is no `/resultados/...` route despite the "Controller" name suggesting otherwise.
22. **Seed data mojibake**: `roles.descripcion`/`roles.nombre` (role id 5) contain UTF‑8-decoded-as-Latin‑1 mangled accented characters, e.g. `"gestiÃ³n"`, `"SupervisiÃ³n"`, `"EvaluaciÃ³n"`, `"Comandante de EscuadrÃ³n"` (`data_prod.sql:73-76`) — intended text is `gestión`, `Supervisión`, `Evaluación`, `Comandante de Escuadrón`. No other seeded table exhibits this (fases/subfases/maniobras/aeronaves text is clean UTF‑8).


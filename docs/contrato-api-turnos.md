# Contrato API — Turnos prácticos y evaluaciones prácticas

**Versión:** 1 · 2026-09-19
**Implementa:** `sigeda-back` (Spring Boot), branch `main`
**Consume:** `sigeda-web` (mientras no exista contra un backend corriendo, el frontend usa mocks MSW con exactamente estas formas)
**Para:** Victor — implementación/corrección en `sigeda-back`

Fuentes: auditoría de solo lectura del código con evidencia archivo:línea (`m1-contrato-backend.md`) y las decisiones de `m1-addendum.md` §13 (M1-1 a M1-12, dependencias de backend 12–21).

Cada sección lleva una etiqueta:
- **Sin cambios** — el backend ya se comporta así; no tocar.
- **Corrección** — el backend hoy está roto o incompleto para esta forma; hay que corregirlo.
- **Nuevo** — el endpoint no existe hoy.

---

## Convenciones

Iguales a las del resto de `sigeda-back` (mismo criterio que `contrato-api-teoria.md`), salvo donde se indique lo contrario:

- Prefijo `/api`. Autenticación `Authorization: Bearer <jwt>`. Sin token válido → `401` JSON `{"status":401,"error":"Unauthorized","message":"No authorization token found"}` o `"Token is not valid"`.
- Autorización por método con `@PreAuthorize("hasRole('<Permiso>')")`; las autoridades son `"ROLE_" + permiso.nombre`. El mapeo rol→permiso está hardcodeado en `Role.java` (la columna `roles.permisos` existe en BD pero no se lee en runtime).
- Campos en camelCase. Fechas `yyyy-MM-dd`, horas `HH:mm`.
- Listas paginadas con Spring `Page` nativo: `{"content":[...],"totalElements":N,"totalPages":N,"size":N,"number":N,"first":bool,"last":bool,"numberOfElements":N,"empty":bool,"pageable":{...},"sort":{...}}`. Parámetros `page` (def. `0`), `size` (def. `6`), `direction` (def. `ASC`), `property` (nombre del campo de orden; por defecto varía por endpoint, se indica en cada uno).
- **Este módulo no introduce una convención `409`** como sí hace `contrato-api-teoria.md`: el caso equivalente ("no se puede modificar en el estado actual") ya existe y funciona aquí como **`410 Gone`** (`ActionExpiredException`, turno con fecha pasada) — se conserva tal cual en vez de migrar a `409`.
- **Conviven dos envolturas de error incompatibles** (ver abajo). Los endpoints **nuevos o corregidos** de este contrato deben preferir la convención de `Response.java` (§A) para ser consistentes con el resto de `Turno`/`Evaluación`/`Persona`/`Grupo`. El frontend, de todos modos, debe aceptar **ambas** formas, porque los endpoints "Sin cambios" siguen usando lo que ya usan hoy (algunos §A, algunos §B).

### A. `utils/Response.java` (Turno, Evaluación, Persona, Grupo)

Cada controlador resetea `Map<String,Object> map` al inicio del handler.

| Método | HTTP | Cuerpo |
|---|---|---|
| `wasSaved(nombreEntidad, entidad)` | **201** | `{"mensaje":"<nombreEntidad> guardada con éxito.","<nombreEntidad.toLowerCase()>": <entidad>}` — nota: la plantilla usa siempre la concordancia femenina "guardada" (correcta para "Evaluación"); ver §1.5 para el ajuste que necesita "Turno" (masculino). |
| `wasDeleted(nombreEntidad)` | 200 | texto plano `"<nombreEntidad> eliminado con éxito."` |
| `isNull(nombreEntidad)` | 404 | texto plano `"<nombreEntidad> especificada no existe."` |
| `isEmpty(nombreLista)` | 404 | texto plano `"No existen <nombreLista> disponibles."` |
| `isForbidden(msje)` | 403 | texto plano `<msje>` |
| `hasModelError(msje)` | 400 | texto plano `<msje>` |
| `setCustomError(error, e)` | 400 | `{"error":"<error>","mensaje":"<e.getMessage()>"}` |
| `setErrorsFrom(bindingResult)` | 400 | **arreglo JSON crudo** de strings `"'campo': mensaje"` |
| `showData(entidad)` | 200 | `<entidad>` tal cual |
| `findQueryError` / `saveQueryError` / `updateQueryError` / `deleteQueryError` (`DataAccessException`) | 500 | `{"error":"Error al ...","mensaje":"<detalle>"}` |

Además, en `EvaluacionController` conviven respuestas **manuales** (no vía los métodos de arriba) con forma `{"mensaje": "<texto>"}` (400 o 403) para reglas de negocio puntuales — se detallan en cada caso.

### B. `GlobalExceptionHandler` → `ErrorResponse`

`{"timestamp":"<ISO LocalDateTime>","status":<int>,"error":"<string>","message":<string|null>,"messages":<string[]|null>}`.

| Causa | HTTP | `error` | `message` / `messages` |
|---|---|---|---|
| `@Valid` fallido sin `BindingResult` en la firma | 400 | "Error al validar el modelo" | `messages: ["'campo': mensaje", ...]` |
| `MissingServletRequestParameterException` | 400 | "Parámetro faltante" | `"El parámetro '<name>' es obligatorio"` |
| `MissingPathVariableException` | 400 | "Variable de ruta faltante" | `"La variable de ruta '<name>' es obligatoria"` |
| `MethodArgumentTypeMismatchException` | 400 | "Error en parámetros" | `"El parámetro '<name>' debe ser de tipo <Type>"` |
| JSON inválido | 400 | "Error en el cuerpo de la petición" | `"Formato JSON inválido o datos mal estructurados"` |
| `ResourceNotFoundException` | 404 | "Recurso no encontrado" | `<mensaje del servicio>` |
| `IllegalArgumentException` (paginado inválido) | 400 | "Atributo o configuración erronea" | `<mensaje>` |
| `ValidationException` manual | 400 | "Error al validar el modelo" | `<mensaje>` |
| `ActionExpiredException` | **410** | "Fecha de modificación expiró" | `<mensaje>` |
| `DataAccessException` | 500 | "Error al acceder a base de datos" | `<mensaje>` |
| `AccessDeniedException` | 403 | "Acceso denegado" | "No tienes permisos para realizar esta acción" |
| `AuthenticationException` | 401 | "No autenticado" | "Debes iniciar sesión o tu token es inválido" |
| Otra excepción | 500 | "Error inesperado" | `<mensaje o null>` |

### Paginación (`utils/Page_Sort.java`, usado por Turno/Evaluación/Persona/Grupo)

Defaults `page=0`, `size=6`, `direction=ASC`. Errores de paginado (índice negativo, tamaño negativo, dirección inválida, propiedad de orden inexistente) devuelven **400 vía Response §A** (`setCustomError`), no vía `ErrorResponse`:
- `"Indice de paginado no debe ser menor a cero."`
- `"Tamaño de paginado no debe ser menor a uno."`
- `"Dirección debe ser 'desc' o 'asc'."`
- `"No se encontró atributo '<property>' para ordenar <nombreLista>."`

---

## Permisos

| Permiso | Rol(es) confirmados | Uso en este contrato |
|---|---|---|
| `Read` | uso general de consulta (múltiples roles) | listas y detalles de turnos, evaluaciones, subfases/maniobras/fases/estandares, `GET /api/aeronaves` |
| `Write` | Instructor (entre otros) | crear evaluaciones, `GET /api/personas/{cod}/status` |
| `Modify Evaluations` | Administrador Web, Comandante de Escuadrón (**no** Instructor) | editar/eliminar evaluaciones |
| `Manage Shifts` | Jefe de Operaciones | CRUD de turnos, `GET /turnos/{fecha}/aeronave/{id}`, `GET /maniobras/subfase/{id}`, `GET /personas/instructor/{tipo}`, `GET /alumnos/programa/{nombre}` |
| `Manage Groups` | Jefe de Operaciones | `GET /personas/alumno/{tipo}`, `GET /grupos` |
| `View All Groups` | rol con acceso a todos los grupos | `GET /grupos/programa/{nombre}` |
| `View My Group` | Instructor | `GET /grupos/instructor/{cod}/programa/{nombre}` |
| `Manage Subphases` | Comandante de Escuadrón | fuera de alcance directo (creación de subfases) |

El mapeo completo rol↔permiso vive en `Role.java` (hardcodeado); es el desvío deliberado documentado: **Comandante** crea maniobras/fases/subfases, **Jefe de Operaciones** asigna estándares y gestiona turnos/grupos.

⚠ Nota de datos: los `roles.nombre`/`descripcion` del rol id 5 ("Comandante de Escuadrón") tienen mojibake en el seed (`data_prod.sql`) y no hay ningún usuario sembrado con ese rol — ver Dependencias, ítem 19.

---

## Enumeraciones

| Enum | Valores | Notas |
|---|---|---|
| `Programa` | `PDI`, `PDE` | En **query/path**, el converter global es case-insensitive y ante un valor inválido **devuelve `PDI` silenciosamente** (no 400). En el **body** JSON, Jackson es case-sensitive: cualquier valor que no sea exactamente `"PDI"`/`"PDE"` deserializa a `null` y dispara `@NotNull`. |
| `Tipo` (persona) | `"Alumno"`, `"Instructor PDI"`, `"Instructor PDE"` | No es un enum real de Spring MVC; `{tipo}` en `PersonaController` es `String` y debe coincidir byte a byte con la columna `personas.tipo`. El seed no tiene ninguna persona `"Instructor PDE"`. |
| `Estado` (alumno) | `Apto`, `enChequeo`→"En Chequeo", `enObservacion`→"En Observación", `enFinal`→"En Final", `enComplementacion`→"En Complementación", `enDeliberacion`→"En Deliberación", `noApto`→"No Apto" | Persistido/serializado como el string con tildes/espacios, no el nombre del enum. |
| `EstadoAeronave` | `Disponible`, `En_Mantenimiento`, `No_Disponible`, `Desconocido` | Se computa normalizando el texto de la columna `aeronaves.estado` (que en el seed usa espacios, p. ej. `"En Mantenimiento"`) y se serializa como el **nombre del enum con guion bajo** (`"En_Mantenimiento"`, no `"En Mantenimiento"`). |
| `Categoria` | Request: `Ponderada`, `Chequeo`, `chequeoSubFase` (⚠ c minúscula), `Complementacion`. Response (`EvaluacionPractica.categoria`): `"Ponderada"`, `"Chequeo"`, `"Chequeo Sub Fase"`, `"Complementación"` | **Dos grafías distintas** para lo mismo — ver tabla de mapeo abajo. Enviar cualquier otra variante deserializa a `null` → `"Ingresar categoria válida."` |
| `Clasificacion` | `Malo`, `Regular`, `Bueno`, `Excelente` | Puntaje base: Malo=12, Regular=15, Bueno=17, Excelente=20 (enteros, no 17.50). |

### Mapeo de `Categoria` (request → response)

| Enviar en el body (request) | Aparece en la respuesta (`EvaluacionPractica.categoria`) |
|---|---|
| `"Ponderada"` | `"Ponderada"` |
| `"Chequeo"` | `"Chequeo"` |
| `"chequeoSubFase"` | `"Chequeo Sub Fase"` |
| `"Complementacion"` | `"Complementación"` |

`GET /api/personas/{cod}/status` (§4.7) sugiere las categorías disponibles usando siempre la **grafía de request** (`"Complementacion"`, `"chequeoSubFase"`, etc.).

### Reglas DIRBE (`utils/Dirbe.java`) — nota mínima (`nota_min`) + nota real (`nota`)

| `nota_min` | Notas válidas para `nota` |
|---|---|
| `D` | `D` |
| `I` | `I`, `R` |
| `R` | `I`, `R`, `B` |
| `B` | `I`, `R`, `B`, `E` |
| `E` | `I`, `R`, `B`, `E` |

- **Combinación inválida** (`calificacionNoValida`): `ID`, `IB`, `IE`, `RD`, `RE`, `BD`, `ED`.
- **Bajo el estándar** (`calificacionBajoEstandar`): `RI`, `BI`, `BR` — dispara la exigencia de causa/observación/recomendación (§2.6/§2.7).

---

## 1. Turnos prácticos (`TurnoController`)

### 1.1 `GET /api/turnos` — **Corrección**

```
GET /api/turnos?idSubfase=&programa=&fechaPre=&fechaPost=&page=&size=&direction=&property=   Read
```

Query params (todos opcionales): `idSubfase` (int, def. `0`) · `programa` (Programa, def. `"pdi"`) · `fechaPre`/`fechaPost` (`yyyy-MM-dd`, def. `""` → `null` si vacío o inválido) · `page` (def. `0`) · `size` (def. `6`) · `direction` (def. `ASC`) · `property` (def. `"id"`).

Ramas de filtro (sin cambios): sin `idSubfase` y sin fechas → por programa; con `idSubfase` sin fechas → por programa+subfase; sin `idSubfase` con ambas fechas → por programa+rango de fecha; con `idSubfase` y ambas fechas → los tres a la vez.

200 — `Page<TurnoRealizado>`:
```json
{
  "content": [
    { "id": 1, "subfase": "Contacto", "nombre": "Contacto Básico", "fechaEval": "2024-03-01", "programa": "PDI", "cantAlumno": 1, "cantManiobra": 6 }
  ],
  "totalElements": 7, "totalPages": 2, "size": 6, "number": 0, "first": true, "last": false, "numberOfElements": 6, "empty": false
}
```

**Corrección**: `TurnoRealizado.cantGrupo` (inexistente en `Turno`) se reemplaza por `cantAlumno`, que sí existe en la entidad (`Turno.cantAlumno`). Todo lo demás de la proyección se mantiene.

404 texto plano `"No existen turnos disponibles."` si la página resulta vacía. 400 (Response §A) si `page`/`size`/`direction`/`property` son inválidos (mensajes de Page_Sort de Convenciones).

### 1.2 `GET /api/turnos/alumno` — **Corrección**

```
GET /api/turnos/alumno?codAlumno=&page=&size=&direction=&property=   Read
```

`codAlumno` (String, def. `"000000"`), mismo paginado que §1.1. Mismo `TurnoRealizado` corregido (`cantAlumno`) y mismo 404/400.

Ejemplo con seed: `codAlumno=999999` (Luis Diaz Castro) devuelve los turnos 6 y 7 (único alumno que aparece en dos turnos).

### 1.3 `GET /api/turnos/{fecha}/aeronave/{id}` — **Corrección**

```
GET /api/turnos/{fecha}/aeronave/{id}   Manage Shifts
```

Path vars: `fecha` (`yyyy-MM-dd`), `id` (int, id de aeronave).

**Corrección (binding)**: hoy el parámetro del método se llama `idAeronave` y no coincide por nombre con `{id}` de la ruta, y `@PathVariable` no declara `value="id"` explícitamente — anotar `@PathVariable("id") int idAeronave`.

**Corrección (respuesta vacía)**: hoy, si no hay turnos en conflicto, el servicio lanza `ResourceNotFoundException("No existen turnos en conflicto.")` → 404 `ErrorResponse`. Debe devolver **200 con arreglo vacío `[]`**, no 404 — este endpoint es una consulta de advertencia (M1-10), no un detalle que pueda "no existir".

200 — `List<TurnoByAeronave>`, sin cambios en la forma:
```json
[
  { "id": 1, "nombre": "Contacto Básico", "fechaEval": "2024-03-01", "horaInicio": "13:00", "horaFin": "14:30", "aeronave": { "id": 1, "nombre": "Robinson R22" } }
]
```

Uso: el frontend llama este endpoint al elegir fecha+aeronave en el formulario de turno para **advertir** (no bloquear) posibles solapes; la validación real y bloqueante ocurre en el servidor por alumno en `POST`/`PUT /api/turnos` (§1.5/§1.6, dependencia 15).

### 1.4 `GET /api/turnos/{id}` — **Corrección**

```
GET /api/turnos/{id}   Read
```

404 texto plano `"Turno especificada no existe."` si no existe (sin cambios).

**Corrección de forma**: hoy `DetalleTurno.getGruposTurno()`/`getCodInstructor()`/`getGrupo()` asumen una relación `Turno → Grupo` que ya no existe (`Turno` tiene `codInstructor` plano y `alumnosTurno`, sin ninguna asociación a `Grupo`). Se reemplaza por:

```json
{
  "id": 1,
  "nombre": "Contacto Básico",
  "idSubfase": 1,
  "subfase": "Contacto",
  "fechaEval": "2024-03-01",
  "programa": "PDI",
  "fase": "Adaptación",
  "codInstructor": "444444",
  "instructor": "Juan Torres",
  "aeronave": { "id": 1, "nombre": "Robinson R22", "estado": "Disponible" },
  "alumnosTurno": [
    { "codAlumno": "111111", "alumno": "Oscar Lopez", "horaInicio": "13:00", "horaFin": "14:30" }
  ],
  "maniobrasTurno": [
    { "nota_min": "B", "maniobra": { "id": 1, "nombre": "Maniobra 1", "descripcion": "Descripcion de Maniobra 1" } }
  ]
}
```

- `instructor` = `nombre + " " + apellido paterno` (mismo criterio ya usado hoy por `TurnoController.detail()` para construir este campo: `getNombre() + " " + getaPaterno()`). Se aplica el mismo criterio a `alumno` dentro de `alumnosTurno` por uniformidad.
- `aeronave` reutiliza el mismo objeto ya usado en la respuesta de create/update (§1.5), pero agregando `estado` (no solo `id`/`nombre`).
- `maniobrasTurno` y `fase` ya son correctos hoy (propiedades reales de `Turno`); no cambian.
- `idSubfase` es **nuevo** (dependencia 21): el id de la sub fase del turno, junto a su nombre `subfase`. Hoy el detalle solo trae el nombre y Modificar turno recupera el id buscándolo por nombre en `GET /api/subfases`; con este campo deja de depender de que los nombres de sub fase sean únicos.

⚠ Dato de seed: los 7 turnos sembrados tienen `cod_instructor` **NULL** (columna omitida en el INSERT) y tampoco tienen aeronave asignada — ambos solo se completan al hacer `POST`/`PUT /api/turnos`. El ejemplo de arriba asume que a este turno ya se le asignó el instructor `444444` (Juan Torres Perez) y la aeronave `1` (Robinson R22).

### 1.5 `POST /api/turnos` — **Corrección**

```
POST /api/turnos   Manage Shifts
```

**Cambio de convención de error**: hoy este método no declara `BindingResult`, así que los fallos de `@Valid` van por `GlobalExceptionHandler` (`ErrorResponse`, §B). Se agrega `BindingResult` (igual que ya hace `EvaluacionController.create/update`) para que los errores de `@Valid` **y** el nuevo error de solape de horario (ver más abajo) compartan el mismo arreglo 400 de `Response.setErrorsFrom` (§A) — esto alinea el endpoint con la preferencia declarada en Convenciones.

**`TurnoCreate`** (sin cambios en campos/mensajes):

| Campo | Tipo | Validación | Mensaje exacto |
|---|---|---|---|
| `nombre` | String | `@NotBlank`; `@Size(min=10,max=30)` | `"Nombre debe tener de 10 a 30 caracteres."` |
| `fechaEval` | `LocalDate` (`uuuu-MM-dd`) | `@NotNull`; `@Future` | `"Ingresar fecha válida."` / `"La fecha del turno debe ser posterior a hoy."` |
| `programa` | Programa | `@NotNull` | `"Ingresar programa válido."` |
| `idSubfase` | int | `@Positive` | `"La subfase es requerida."` |
| `codInstructor` | String | `@NotBlank` | `"Instructor debe ser asignado."` |
| `aeronave` | objeto `{id}` | `@NotNull` | `"La asignación de aeronave es requerida."` |
| `alumnosTurno` | `List<Alumno_TurnoSave>` | `@NotEmpty` | `"La asignación de alumnos es requerida"` |
| `maniobrasTurno` | `List<Maniobra_TurnoSave>` | `@NotEmpty` | `"La asignación de maniobras es requerida"` |

**`Alumno_TurnoSave`** — **Corrección** (dependencia 16): agregar constructor por defecto (hoy solo existe uno con parámetros `inicio`/`fin` que no coinciden con los getters/setters `horaInicio`/`horaFin`, dejando indefinido si Jackson deserializa por esos nombres). Las claves JSON del body deben ser:

| Campo JSON | Validación | Mensaje exacto |
|---|---|---|
| `codAlumno` | `@NotNull`; `@Size(min=6,max=6)` | `"Código de alumno es requerido."` |
| `horaInicio` | `@NotNull`; `@Pattern(^([01]\d\|2[0-3]):[0-5]\d$)` | `"La hora debe estar en formato HH:mm (09:00, 14:00)"` |
| `horaFin` | mismo patrón | mismo mensaje |

**`Maniobra_TurnoSave`** (sin cambios):

| Campo JSON | Validación | Mensaje exacto |
|---|---|---|
| `idManiobra` | `@Positive` | `"La maniobra es requerida"` |
| `nota_min` (snake_case literal en el JSON) | `@NotNull`; `@Size(1,1)`; `@Pattern` `(?i)^(D\|I\|R\|B\|E)$` | `"Ingresar nota mínima de maniobra."` / `"Nota mínima debe utilizar sistema de calificación"` |

**Reglas de negocio, en orden**:

1. `subfaseService.findById(idSubfase)` — no existe → 404 `ErrorResponse` "No existe información de subfase." (sin cambios).
2. `aeronaveDao.findById(aeronave.id)` — no existe → 404 `ErrorResponse` "No existe información de aeronave." (sin cambios).
3. `aeronave.estado != Disponible` → 400 `ErrorResponse` (`ValidationException`) "Asignar aeronave disponible." (sin cambios).
4. **[Nuevo — dependencia 15, corregido el 27 sep 2026]** Para cada alumno de `alumnosTurno`: comprobar que su `horaInicio`/`horaFin` no se solape (i) con otro turno ya guardado de **ese mismo alumno** en la **misma fecha**, **sea cual sea la aeronave** (usando `turno/utils/HorasInicioFin.java`), ni (ii) con otra entrada de `alumnosTurno` del mismo request para el mismo alumno. Cada conflicto agrega al arreglo 400 el elemento `"'alumnosTurno[i].codAlumno': El alumno <cod> tiene un horario que se cruza con otro turno del mismo día."` (uno por alumno en conflicto).

   > **Por qué cambió.** La versión anterior filtraba por **misma aeronave y fecha**, y con ese filtro **el caso que justifica la regla se escapa**: el mismo alumno en **dos aeronaves distintas** a la misma hora pasaba sin que nadie lo notara. La regla es del **alumno** —no puede estar en dos turnos a la vez—, así que no se filtra por aeronave. El solape de **aeronave** es otra cosa: sigue siendo un **aviso del frontend que deja guardar** (decisión M1-10), y el servidor **no** lo rechaza. El texto del mensaje también cambió, porque el anterior nombraba a la aeronave como la razón de un rechazo que es del alumno.
5. Si el `bindingResult` (validaciones de campo + el error de solape del paso 4) tiene errores → 400 `Response.setErrorsFrom` (arreglo crudo de strings).
6. Éxito → **201**:
```json
{ "mensaje": "Turno guardado con éxito.", "turno": { /* DetalleTurno, ver §1.4 */ } }
```

⚠ **Nota para Victor**: `Response.wasSaved(nombreEntidad, entidad)` concatena siempre `"<nombreEntidad> guardada con éxito."` (concordancia femenina, correcta para "Evaluación" pero incorrecta para "Turno", masculino). Para producir exactamente `"Turno guardado con éxito."` sin romper el uso ya existente en Evaluación/Persona/Grupo, sobrecargar el helper (p. ej. un parámetro de género) o construir el mapa de respuesta manualmente en este endpoint — no reusar `wasSaved("Turno", ...)` tal cual.

El cuerpo `turno` es el `DetalleTurno` completo (§1.4), no la entidad `Turno` cruda — así el frontend puede confirmar de una vez qué alumnos/maniobras quedaron guardados (hoy `alumnosTurno`/`maniobrasTurno` son `@JsonIgnore` en `Turno` y esto era imposible de verificar).

### 1.6 `PUT /api/turnos/{id}` — **Corrección**

```
PUT /api/turnos/{id}   Manage Shifts
```

**`TurnoUpdate`**: mismos campos/mensajes que `TurnoCreate` para `nombre`, `fechaEval`, `codInstructor`, `aeronave`, `alumnosTurno`, `maniobrasTurno` — **sin** `programa` ni `idSubfase` (no se pueden cambiar en un update). Mismas correcciones de `Alumno_TurnoSave` que §1.5.

**Reglas de negocio, en orden** (igual que create, con dos diferencias):

1. Turno no existe → 404 `ErrorResponse` "No existe información de turno." (sin cambios).
2. `!turnoInDb.permiteCambios()` (la fecha del turno ya no es futura) → **410 Gone**, `ErrorResponse{"error":"Fecha de modificación expiró","message":"No se puede modificar. El turno ya ha sido evaluado."}` (sin cambios; el texto del mensaje es engañoso pero se conserva tal cual — la condición real es solo de fecha, no de si hay evaluaciones).
3. Aeronave: mismo lookup/disponibilidad que create.
4. **[Nuevo — dependencia 15]** Mismo chequeo de solape que create, con una diferencia: al comparar contra turnos existentes en BD, **excluir los registros de `alumnos_turno` que pertenecen al propio turno** (`id` de la ruta), para no marcar como conflicto su propio horario ya guardado.
5. `bindingResult.hasErrors()` → 400 arreglo (igual que create).
6. Éxito → **201** `{ "mensaje": "Turno guardado con éxito.", "turno": <DetalleTurno> }` (mismo texto y mismo ajuste de género que §1.5).

### 1.7 `DELETE /api/turnos/{id}` — **Sin cambios**

```
DELETE /api/turnos/{id}   Manage Shifts
```

Mismo chequeo `permiteCambios()` → 410 igual que §1.6 paso 2. Éxito → 200 texto plano `"Turno eliminado con éxito."`. `DataAccessException` durante el borrado → 500 (`Response.deleteQueryError`, §A).

(La explicación de UI "El turno ya no se puede modificar porque su fecha pasó." de CA-TUR-11 es responsabilidad del frontend al interpretar el 410; no cambia el backend.)

### 1.8 `GET /api/aeronaves` — **Nuevo**

```
GET /api/aeronaves   Read
```

No paginado (catálogo pequeño, igual criterio que `GET /api/materias` del contrato de teoría). Prefiere la convención `Response.java` (§A): 404 texto plano `"No existen aeronaves disponibles."` si la tabla está vacía; 200 con el arreglo si hay datos.

**Orden: por `nombre` ascendente.** Igual criterio que `GET /api/materias`, que ordena por `parte` y luego por `nombre`: el catálogo alimenta un desplegable, así que el orden tiene que ser el alfabético y no el del id. El ejemplo de abajo va en orden de id sólo por legibilidad de la tabla `aeronaves`; **no** fija el orden de la respuesta. Nota de implementación: un orden por `id` no es demostrable con una prueba sobre H2, porque H2 devuelve el orden de la clave primaria incluso sin `ORDER BY` — el alfabético sí se distingue.

200:
```json
[
  { "id": 1, "nombre": "Robinson R22", "descripcion": "Helicóptero de entrenamiento básico", "imagen": null, "estado": "Disponible" },
  { "id": 2, "nombre": "Enstrom 280FX", "descripcion": "Helicóptero de instrucción intermedia", "imagen": null, "estado": "En_Mantenimiento" },
  { "id": 3, "nombre": "Schweizer S-300C", "descripcion": "Helicóptero de instrucción avanzada", "imagen": null, "estado": "No_Disponible" }
]
```

`id`/`nombre`/`estado` están confirmados por el seed (`aeronaves`: Robinson R22/Disponible, Enstrom 280FX/En Mantenimiento → `En_Mantenimiento`, Schweizer S-300C/No Disponible → `No_Disponible`). Los valores exactos de `descripcion`/`imagen` en el seed no fueron capturados por la auditoría; los de arriba son ilustrativos — columnas existen en `Aeronave` (`id`, `nombre`, `descripcion`, `imagen`, `estado`) y deben serializarse tal cual estén en BD. `estado` es siempre uno de los nombres del enum `EstadoAeronave` (con guion bajo), nunca el texto crudo de la columna.

Este endpoint alimenta el selector de aeronave del formulario de turno (§1.5/§1.6) y el filtro de `GET /turnos/{fecha}/aeronave/{id}` (§1.3).

---

## 2. Evaluaciones prácticas (`EvaluacionController`)

### 2.1 `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` — **Sin cambios**

```
GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}   Read
```

`List<PuntajeSubfase>` filtrado a categorías `Ponderada`/`Chequeo Sub Fase`. Ejemplo (`id=1` Contacto, `cod=555555`):
```json
[ { "codigo": "555555-1", "promedio": "14.0" }, { "codigo": "555555-3", "promedio": "15.0" } ]
```
(El servicio nunca devuelve `null`; una lista vacía serializa `200 []`, no 404, aunque `Response.isNull` exista en el código — rama muerta en la práctica.)

### 2.2 `GET /api/evaluaciones/subfase/{id}/persona/{cod}` — **Sin cambios**

```
GET /api/evaluaciones/subfase/{id}/persona/{cod}   Read
```

200:
```json
{
  "cabecera": { "fase": "Adaptación", "subFase": "Contacto", "programa": "PDI", "alumno": "Pedro Rodriguez" },
  "maniobras": [ { "id": 1, "nombre": "Maniobra 1" } ],
  "notas": [
    { "codigo": "555555-1", "categoria": "Ponderada", "clasificacion": "Regular", "promedio": "14.0", "recomendacion": "Mejorar técnicas básicas",
      "calificaciones": [ { "notaMin": "B", "nota": "R" } ] }
  ]
}
```
404 texto plano `"No existen evaluaciones disponibles."` si `reporte == null`.

### 2.3 `GET /api/evaluaciones/filter/persona/{cod}` — **Sin cambios**

```
GET /api/evaluaciones/filter/persona/{cod}?idSubfase=&nombre=&clasificacion=&page=&size=&direction=&property=   Read
```

`idSubfase` (int, def. `0`), `nombre` (Programa, def. `"pdi"`), `clasificacion` (String, def. `""`; parseo case-sensitive con `Clasificacion.valueOf` — cualquier valor no exacto se ignora silenciosamente, sin 400), paginado con `property` def. `"codigo"`. `Page<EvalByAlumno>`:
```json
{ "codigo": "555555-1", "nombre": "Contacto Básico", "fase": "Adaptación", "evaluador": "Juan Torres", "fecha": "2024-03-01", "alumno": "Pedro Rodriguez", "promedio": "14.0", "clasificacion": "Regular" }
```
404 (`isEmpty`, §A) si la página está vacía.

### 2.4 `GET /api/evaluaciones/persona/{cod}` — **Sin cambios**

```
GET /api/evaluaciones/persona/{cod}?idTurno=&page=&size=&direction=&property=   Read
```

`idTurno` (int, def. `0`); construye `codigo LIKE '<cod>-<idTurno>%'`. Mismo `Page<EvalByAlumno>` que §2.3. Ejemplo: `cod=555555&idTurno=1` devuelve `555555-1`.

Este endpoint es la forma de saber, para un alumno y turno dados, si ya existe una evaluación (usado por CA-EVA-02/M1-6 para ocultar "Registrar evaluación" una vez por alumno y turno — ver Dependencias, ítem umbral 10).

### 2.5 `GET /api/evaluaciones/{cod}` — **Sin cambios**

```
GET /api/evaluaciones/{cod}   Read
```

404 texto plano `"Evaluación especificada no existe."`. 200, ejemplo `cod=555555-1`:
```json
{
  "codigo": "555555-1", "nombre": "Ponderada Contacto Básico", "fecha": "2024-03-01", "programa": "PDI",
  "categoria": "Ponderada", "clasificacion": "Regular", "promedio": "14.0", "recomendacion": "Mejorar técnicas básicas",
  "archivoUrl": null, "idSubFase": 1, "fase": "Adaptación", "subFase": "Contacto", "estadoAlumno": "Apto",
  "codEvalPrevia": null, "codEvaluador": null, "evaluador": "Juan Torres", "codPersona": "555555", "alumno": "Pedro Rodriguez",
  "calificaciones": [
    { "codEvaluacion": "555555-1", "idManiobra": 1, "notaMin": "B", "nota": "R", "causa": null, "observacion": null, "recomendacion": null,
      "maniobra": { "id": 1, "nombre": "Maniobra 1", "descripcion": "Descripcion de Maniobra 1" } }
  ]
}
```
⚠ `codEvaluador` es `@Transient`: se ve poblado en la respuesta inmediata de un `create`/`update`, pero un `GET` posterior siempre lo muestra `null` (sin cambios, comportamiento a tolerar en el frontend).

### 2.6 `POST /api/evaluaciones/turno/{id}/persona/{cod}` — **Corrección**

```
POST /api/evaluaciones/turno/{id}/persona/{cod}   Write
```

Ya declara `BindingResult` → los fallos de `@Valid` devuelven 400 arreglo (`Response.setErrorsFrom`, §A) — esto no cambia.

**`EvaluacionCreate`** (sin cambios):

| Campo | Validación | Mensaje |
|---|---|---|
| `nombre` | `@NotBlank`; `@Size(10,30)` | `"Ingresar nombre de evaluación."` / `"Nombre debe tener de 10 a 30 caracteres."` |
| `categoria` | `@NotNull` | `"Ingresar categoria válida."` |
| `recomendacion` | `@Size(max=250)` | `"Recomendación debe tener un máximo de 250 caracteres."` |
| `url`, `codEvaluador` | sin validación bean | — |
| `calificaciones` | `List<CalificacionCreate>`, `@NotNull` | `"Las calificaciones son requeridas"` |

**`CalificacionCreate`**:

| Campo | Validación | Mensaje |
|---|---|---|
| `idManiobra` | `@Positive` | `"La maniobra es requerida"` |
| `nota` | `@NotBlank` | `"Ingresar calificación de maniobra."` |
| `causa` | `@Size(max=250)` (**+ condicional, ver abajo**) | `"Causa debe tener un máximo de 250 caracteres."` |
| `observacion` | `@Size(max=250)` (**+ condicional**) | `"Observación debe tener un máximo de 250 caracteres."` |
| `recomendacion` | `@Size(max=250)` (**+ condicional**) | `"Recomendación debe tener un máximo de 250 caracteres."` |

**Reglas de negocio, en orden**:

1. `bindingResult.hasErrors()` → 400 arreglo (sin cambios).
2. **[Nuevo — dependencia 14]** Si `categoria` es `Ponderada` o `chequeoSubFase`: cargar el turno `{id}` y comparar `turno.codInstructor` con el código de la persona autenticada (del JWT). Si no coincide → **403** `{"mensaje": "Solo el instructor asignado al turno puede registrar esta evaluación."}`.
3. `evaluarCodInstructor()` (sin cambios) → 400 `{"mensaje": "Instructor requerido para evaluación no programada."}`.
4. Categoría `Ponderada`/`chequeoSubFase` y ya existe `codigo = cod + "-" + id` → **403** `{"mensaje": "La evaluación ya ha sido registrada."}` (sin cambios; nótese que hay dos 403 distintos posibles en este endpoint, con mensajes distintos).
5. Alumno no existe → 404 texto plano `"Alumno especificada no existe."` (sin cambios).
6. `comprobarEstado` (sin cambios) → 400 `{"mensaje": "<uno de los 4 mensajes por categoría>"}`.
7. `turno.maniobrasTurno.size() != calificaciones.size()` → 400 `{"mensaje": "Todas las notas son requeridas."}` (sin cambios).
8. Por cada calificación: nota inválida o combinación inválida (Dirbe) → 400 **[Corrección de clave]** `{"mensaje": ["Las notas con id: N N... no utilizan el sistema de calificación.", "La nota de las maniobras con id: N N... no son correctas."]}` — la clave es `"mensaje"` **sin los dos puntos** (hoy el código escribe literalmente `"mensaje:"`, un typo).
9. **[Nuevo — dependencia 13]** Para cada calificación cuyo `notaMin+nota` sea `RI`, `BI` o `BR` (bajo estándar): `causa`, `observacion` y `recomendacion` son obligatorios (no vacíos/blank). Si falta alguno, se agrega al arreglo 400 (mismo formato que `setErrorsFrom`, uno por campo faltante):
   - `"'calificaciones[i].causa': La causa es requerida para calificaciones bajo el estándar."`
   - `"'calificaciones[i].observacion': La observación es requerida para calificaciones bajo el estándar."`
   - `"'calificaciones[i].recomendacion': La recomendación es requerida para calificaciones bajo el estándar."`

   (`i` es el índice 0-based dentro de `calificaciones`.) Si hay más de una calificación bajo estándar con campos faltantes, todos los mensajes van en el mismo arreglo 400.
10. Resto de la lógica (contador `contEval`, resolución de `codEvaluador` para Chequeo/Complementación, construcción de `EvaluacionPractica`, clasificación Malo/Bueno, `calcularResultado` para Ponderada/ChequeoSubFase, encadenado de `codEvalPrevia`) — **sin cambios**, salvo la corrección de `contD` (§3) y:
    - **Corrección**: si el evaluador no existe (`personaService.findByCod(...)` devuelve `null`, ya sea el `codEvaluador` de Chequeo/Complementación o el `codInstructor` del turno), devolver 404 texto plano `"Evaluador especificada no existe."` en vez de dejar que NPEe a un 500 — mismo criterio que `PUT` (§2.7, paso 10).
11. Éxito → **201** (sin cambios en la forma, incluida la tilde en la clave):
```json
{ "mensaje": "Evaluación guardada con éxito.", "evaluación": { /* EvaluacionPractica, ver §2.5 */ } }
```

### 2.7 `PUT /api/evaluaciones/{cod}` — **Corrección**

```
PUT /api/evaluaciones/{cod}   Modify Evaluations
```

Permiso distinto al de crear (`Modify Evaluations`, no `Write`): solo Administrador Web y Comandante de Escuadrón pueden editar/eliminar — un Instructor que creó la evaluación no puede modificarla. **No aplica** la restricción "solo el instructor del turno" de §2.6 paso 2, porque el rol Instructor no tiene este permiso.

**`EvaluacionUpdate`**: mismos campos que `EvaluacionCreate`. **Corrección**: agregar `@NotNull` a `calificaciones` con el mismo mensaje que create (`"Las calificaciones son requeridas"`) — hoy no lo tiene, lo que provoca un `NullPointerException` no controlado (→ 500 `"Error inesperado"`) si el body omite `calificaciones`.

**`CalificacionUpdate`**: mismos campos/mensajes que `CalificacionCreate`, incluida la validación condicional del paso 9 de abajo.

**Reglas de negocio, en orden**:

1. `bindingResult.hasErrors()` → 400 arreglo.
2. **Corrección**: `alumnoInDb = personaService.findByCod(cod.substring(0,6))` — si es `null` → 404 texto plano `"Alumno especificada no existe."` (hoy no hay chequeo y esto NPEa a un 500 genérico).
3. `!cod.equals(alumnoInDb.getCodEvalRealizada())` → **403** `{"mensaje": "Solo se puede modificar la ultima evaluación realiza por el alumno."}` (sin cambios; único gate de "última evaluación").
4. `evaluarCodInstructor()` → 400 `{"mensaje": "Instructor requerido para evaluación no programada."}` (sin cambios).
5. Evaluación `{cod}` no existe → 404 texto plano `"Evaluación especificada no existe."` (sin cambios).
6. `comprobarEstado` contra `evaluacionInDb.getEstadoAlumno()` → mismos 400 que create (sin cambios).
7. `evaluacionInDb.calificaciones.size() != evaluacionDto.calificaciones.size()` → 400 `{"mensaje": "Todas las notas son requeridas."}` (ya no puede NPEar, gracias al `@NotNull` agregado arriba).
8. Por calificación, validado contra `itemInDb.getNotaMin()` (inmutable): mismas reglas de nota/combinación que create → 400 **[Corrección de clave]** `{"mensaje": [...]}` (sin los dos puntos, igual que §2.6 paso 8).
9. **[Nuevo — dependencia 13]** Misma exigencia condicional de causa/observación/recomendación bajo estándar que §2.6 paso 9, con el mismo formato de arreglo (`"'calificaciones[i].causa': ..."`, etc.), evaluada contra `itemInDb.getNotaMin()` + la `nota` del request.
10. Resto de la lógica (re-resolución de `codEvaluador` si cambió para Chequeo/Complementación, clasificación, `resultadoController.updateAll`) — sin cambios, salvo:
    - **Corrección**: si `evaluadorInDb = personaService.findByCod(codEvaluador)` resulta `null`, devolver 404 texto plano `"Evaluador especificada no existe."` (propuesto, mismo patrón que `Response.isNull`) en vez de dejar que NPEe a un 500.
11. Éxito → **201** `{ "mensaje": "Evaluación guardada con éxito.", "evaluación": <EvaluacionPractica recién releída de BD> }` (sin cambios; `codEvaluador` vuelve a salir `null` por ser `@Transient`).

### 2.8 `DELETE /api/evaluaciones/{cod}` — **Sin cambios**

```
DELETE /api/evaluaciones/{cod}   Modify Evaluations
```

404 si no existe; 403 `{"mensaje": "Solo se puede modificar la ultima evaluación realiza por el alumno."}` si `cod` no es la `codEvalRealizada` vigente del alumno; éxito → 200 texto plano `"Evaluación eliminado con éxito."` (concordancia de género inconsistente, texto literal de `Response.wasDeleted`).

---

## 3. Algoritmo de calificación y máquina de estados — **Sin cambios** (salvo `contD`)

Se documenta para que el frontend pueda replicar/validar client-side, no para reimplementarlo.

**`CalculoNota`** (solo para `Ponderada`/`chequeoSubFase`):
1. Por cada `notaMin+nota`: `IR→postR++`, `RI`/`BI→subI++`, `RB→postB++`, `BR→subR++`, `BE→postE++`.
2. Clasificación: `subI>0` → Malo; si no `subR>=5` → Malo; `subR==4` → Regular; `subR>=1` → Bueno; `postE>=5` → Excelente; si no → Bueno.
3. Puntaje base por clasificación: Malo=12, Regular=15, Bueno=17, Excelente=20 (enteros).
4. Descuento: Malo→0; si no `-0.5*subR + 0.6*(postR+postB)`.
5. Si `contD == cantidad de calificaciones` (todas las maniobras exigían nota mínima `D`) o el total supera 20 → se fuerza `"20.0"`; si no, `String.format("%.1f", total)`.

**Corrección (dependencia 18)**: `contD` nunca se acumula hoy porque `formatoNota(String notaMin, int contD)` recibe el contador **por valor** y lo incrementa localmente sin devolverlo — el llamador nunca ve el incremento, así que el atajo "todas con estándar D → 20.0 automático" del paso 5 es código muerto en la práctica. Corregir para que `contD` sí se acumule a través de las iteraciones (devolviendo el valor incrementado o usando un contenedor mutable), tanto en `POST` (§2.6) como en `PUT` (§2.7).

Para **Chequeo**/**Complementación** no corre `CalculoNota`: la clasificación es simplemente Malo (si hay notas bajo estándar) o Bueno, y `promedio` queda `null`.

---

## 4. Catálogos y selectores

### 4.1 `GET /api/subfases` — **Sin cambios**

```
GET /api/subfases?page&size&direction&properties   Read
```
`Page<IndexGeneral>` (`{"id","nombre","descripcion"}`), orden válido solo por `id`/`nombre`. Errores de paginado van por `ErrorResponse` (§B), no por Response §A. Ejemplo (seed): 5 filas — Contacto, Navegación, Instrumentos, Campos Extraños, Formación.

### 4.2 `GET /api/maniobras/subfase/{id}` — **Sin cambios**

```
GET /api/maniobras/subfase/{id}   Manage Shifts
```
`List<IndexGeneral>`; 404 `ErrorResponse` "No existen maniobras disponibles." si vacío. Ejemplo `id=2` (Navegación) → maniobras 1–6 (`"Maniobra 1"`…`"Maniobra 6"`).

### 4.3 `GET /api/personas/instructor/{tipo}` — **Sin cambios**

```
GET /api/personas/instructor/{tipo}   Manage Shifts
```
`{tipo}` literal, ej. `Instructor%20PDI`. `List<NombreAlumno>` (`{"codigo","nombre","aPaterno","aMaterno"}`); 404 texto plano "No existen personas disponibles." si vacío. Ejemplo: `444444` Juan/Torres/Perez, `888888` Maria/Flores/Mendoza.

### 4.4 `GET /api/alumnos/programa/{nombre}` — **Sin cambios**

```
GET /api/alumnos/programa/{nombre}   Manage Shifts
```
`{nombre}` = `Programa` (converter global, cae a `PDI` si es inválido). `List<GrupoByPrograma>` (`{"id","nombre","programa","personas":[{"codigo","nombre","aPaterno","aMaterno"}]}`); 404 (`isEmpty`, §A) "No existen grupos disponibles." si vacío. Es la fuente del selector de alumnos del formulario de turno para Jefe de Operaciones (M1-9).

### 4.5 `GET /api/grupos/programa/{nombre}` — **Sin cambios**

```
GET /api/grupos/programa/{nombre}?page&size&direction&property   View All Groups
```
`Page<CatalogoByPrograma>`: `{"content":[{"personas":[{"codigo","nombre","aPaterno","aMaterno","idGrupo","estado"}]}],...}`. Selector de alumnos para Comandante/Admin (M1-9).

### 4.6 `GET /api/grupos/instructor/{cod}/programa/{nombre}` — **Corrección**

```
GET /api/grupos/instructor/{cod}/programa/{nombre}?page&size&direction&property   View My Group
```

**Corrección**: `CatalogoByAlumnoTurno.getPersona()` está tipado como `List<Alumno>` pero la propiedad que respalda (`Alumno_Turno.persona`) es un único `@OneToOne Persona` — hoy funciona "por accidente" (`Hibernate.initialize` sobre un proxy único no falla), pero la forma declarada no coincide con el dato real. Corregir la proyección/consulta para que **`persona` devuelva efectivamente la lista completa de alumnos** del/los grupo(s) de ese instructor y programa (no un solo objeto disfrazado de lista de un elemento):

```json
{ "content": [ { "persona": [ { "codigo": "111111", "nombre": "Oscar", "aPaterno": "Lopez", "aMaterno": "Chaparro", "idGrupo": 1, "estado": "Apto" } ] } ], "totalElements": 1, "...": "..." }
```

Se mantiene el nombre de campo `persona` (singular, aunque el valor sea un arreglo) para no romper el resto de la proyección — es el nombre ya declarado en `CatalogoByAlumnoTurno`. Este es el selector de alumnos para el rol Instructor (M1-9); no tiene un número de dependencia en `m1-addendum.md` §13.4 (ver Dependencias).

### 4.7 `GET /api/personas/{cod}/status` — **Sin cambios**

```
GET /api/personas/{cod}/status   Write
```
200 — arreglo crudo de nombres de enum en la **grafía de request** (no la de respuesta), ej. `["Complementacion","Chequeo","Ponderada","chequeoSubFase"]`. 404 texto plano "No hay sugerencias disponibles." si el estado del alumno no habilita ninguna categoría; 404 texto plano "Persona especificada no existe." si el código no resuelve. Alimenta el selector de categoría sugerida (M1-3, CA-EVA-11).

### 4.8 `GET /api/grupos/{id}` — **Corrección**

```
GET /api/grupos/{id}   Manage Groups
```
**Corrección (dependencia 18)**: si `grupoInDb == null`, el código llama `response.isNull("Grupo")` pero **no hace `return`**, y cae al `return response.showData(grupoInDb)` siguiente → hoy responde **200 con cuerpo `null`**. Corregir para que efectivamente retorne el 404 texto plano `"Grupo especificada no existe."` en ese caso. El resto (200 con la entidad `Grupo` completa, incluidas sus `personas`) no cambia.

---

## 5. Dependencias

Mapeo de cada ítem **Corrección**/**Nuevo** de este contrato al número de dependencia de backend de `m1-addendum.md` §13.4 (12–21), y a los números de la especificación paraguas indicados por la tarea (**1** = `GET /api/aeronaves`, **10** = lista de evaluaciones a través de los alumnos de un turno).

| # | Cambio | Sección de este contrato |
|---|---|---|
| 12 | `TurnoRealizado.cantAlumno`; `DetalleTurno` con `codInstructor`/`instructor`/`aeronave`/`alumnosTurno` | §1.1, §1.2, §1.4 |
| 13 | Causa/observación/recomendación obligatorias en calificaciones bajo estándar | §2.6 (paso 9), §2.7 (paso 9) |
| 14 | Solo el instructor asignado al turno registra Ponderada/Chequeo Sub Fase | §2.6 (paso 2) |
| 15 | Validación server-side de solape de horario (aeronave/alumno) | §1.3 (advertencia), §1.5 (paso 4), §1.6 (paso 4) |
| 16 | `Alumno_TurnoSave`: constructor por defecto, claves JSON `horaInicio`/`horaFin` | §1.5, §1.6 |
| 17 | `@PreAuthorize` en `DesaprobadoController` (4 endpoints) y `GET /subfases/assigned` | Fuera de alcance de este contrato (M5; no hay endpoints de Desaprobados aquí) |
| 18 | Typo `"mensaje:"` → `"mensaje"`; NPEs en `EvaluacionController.create` y `update` (evaluador inexistente); `contD` nunca se acumula; `GrupoController.detail` sin `return` | §2.6 (pasos 8, 10), §2.7 (pasos 2, 8, 10); §3; §4.8 |
| 19 | Mojibake del seed en `roles` (rompe el nombre/descr. de "Comandante de Escuadrón") | Convenciones/Permisos (nota); sin endpoint propio — es una corrección de dato de seed, no de código de ruta |
| 20 | Verificar en el servidor que el alumno solo acceda a lo propio: `GET /api/turnos/{id}`, `GET /api/turnos/alumno?codAlumno=` y `/api/evaluaciones/**` solo piden `Read`; la comprobación del frontend es únicamente de interfaz | §1.2, §1.4, §2.3, §2.4, §2.5 |
| 21 | `idSubfase` en `DetalleTurno` | §1.4 |
| 1 (paraguas) | `GET /api/aeronaves` (nuevo catálogo) | §1.8 |
| 10 (paraguas) | Lista de evaluaciones a través de los alumnos de un turno | §1.4 (para saber, por cada alumno de `alumnosTurno`, si ya tiene Ponderada/Chequeo Sub Fase registrada en este turno) + §2.4 (`GET /api/evaluaciones/persona/{cod}?idTurno={id}`, sin cambios, iterado una vez por alumno del turno — no hay un endpoint batch nuevo, se resuelve con el ya existente) |

Adicional (sin número en §13.4): la corrección de cardinalidad de `CatalogoByAlumnoTurno.persona` (§4.6) corresponde a la decisión **M1-9** de `m1-addendum.md`, no a una dependencia numerada explícitamente.

# Contrato API — Matrícula y programa

**Versión:** 1 · 2026-09-19
**Implementa:** `sigeda-back` (Spring Boot), branch `main` (leído en `ec2b0dd`)
**Consume:** `sigeda-web` M2. Los mocks MSW implementan exactamente este documento.
**Para:** Victor — implementación/corrección en `sigeda-back`

Fuentes: lectura del código de `sigeda-back` con evidencia archivo:línea (spec §14.1), decisiones M2-1 a M2-13 (spec §14.2) y dependencias de backend 22–38 (spec §14.5).

Cada sección lleva una etiqueta:
- **Sin cambios** — el backend ya se comporta así; no tocar. Se documenta la forma real porque el frontend la consume.
- **Corrección** — hoy está roto, incompleto o es inseguro; hay que corregirlo.
- **Nuevo** — el endpoint no existe hoy.

Dentro de un endpoint, cada regla que no existe lleva **[Nuevo — dependencia N]** y cada arreglo **[Corrección — dependencia N]**.

---

## Convenciones

- Prefijo `/api`, `Authorization: Bearer <jwt>`, `401` sin token válido: igual que `contrato-api-turnos.md`.
- **Envolturas de error.** §A (`utils/Response.java`) y §B (`GlobalExceptionHandler` → `ErrorResponse`) son exactamente las de `contrato-api-turnos.md` › Convenciones A y B; aquí cada endpoint indica cuál usa:
  - Matrícula (Persona, Usuario, Rol, Grupo): §A. Las validaciones nuevas de este contrato devuelven el **arreglo 400 de §A** (`["'campo': mensaje", …]`, `BindingResult` + `Response.setErrorsFrom`), igual que `EvaluacionController`.
  - Programa (Fase, SubFase, Maniobra, Estándar): §B. Los fallos de `@Valid` llegan como `ErrorResponse{status:400, error:"Error al validar el modelo", message:null, messages:["'campo': mensaje", …]}`.
  - Materias: §A, como el resto de `contrato-api-teoria.md`.
- **403.** Falta de permiso → siempre §B `{"error":"Acceso denegado","message":"No tienes permisos para realizar esta acción"}`. Regla de negocio → §A **texto plano** (p. ej. al eliminar una persona). El frontend distingue por la forma del cuerpo (M2-4).
- **Lista vacía.** §A → `404` texto plano `"No existen <lista> disponibles."`; §B → `404` `ErrorResponse{error:"Recurso no encontrado", message:"No existen <lista> disponibles."}`. En un **endpoint de lista** el frontend lo trata como lista vacía. Excepción: `GET /api/subfases/assign` responde `200 []`.
- **Varios mensajes por campo.** `ConstraintErrors.formatErrors` no ordena, así que un campo puede traer más de un mensaje, en cualquier orden. El frontend muestra el primero de cada campo; los mocks emiten solo el primer mensaje aplicable de cada campo, en el orden de las tablas de este documento.
- **Descripción vacía o `null`.** En un update de Fase, SubFase, Maniobra o Estándar, una `descripcion` vacía, solo con espacios o `null` **conserva** la anterior (sin cambios; dependencia 38). Al crear, se guarda tal como llega.
- **Página.** Spring `Page` serializado directo, como en `contrato-api-turnos.md`: `{"content":[…],"pageable":{…},"totalElements":N,"totalPages":N,"last":b,"size":N,"number":N,"sort":{…},"numberOfElements":N,"first":b,"empty":b}`. El frontend lee `content`, `totalElements`, `totalPages`, `size` y `number`; los mocks emiten además `first`, `last`, `numberOfElements` y `empty` (sin `pageable` ni `sort`).

### Paginación: dos utilidades distintas

| | `utils/Page_Sort.java` (§A) | `utils/PageWithSort.java` (§B) |
|---|---|---|
| Endpoints de este contrato | `GET /api/personas`, `GET /api/grupos` | `GET /api/fases`, `GET /api/maniobras` |
| Parámetros | `page` (def. `0`), `size` (def. `6`), `direction` (def. `ASC`), `property` (**uno**; default por endpoint) | `page` (def. `0`), `size` (def. `6`), `direction` (def. `ASC`), `properties` (**repetible**: `?properties=nombre`; def. `id`) |
| `size` | sin máximo | 1 a 10 |
| Orden válido | cualquier atributo de la entidad | solo `id` y `nombre` |
| `direction` | `asc`/`desc`, sin distinguir mayúsculas | igual |
| Errores | 400 §A `{"error":"Argumento incorrecto","mensaje":…}` con `"Indice de paginado no debe ser menor a cero."`, `"Tamaño de paginado no debe ser menor a uno."` (size < 0), `"Page size must not be less than one"` (size = 0, de Spring), `"Dirección debe ser 'desc' o 'asc'."`, `"No se encontró atributo '<property>' para ordenar <lista>."` | 400 §B `error:"Atributo o configuración erronea"` con `message`: `"Indice de paginado no debe ser menor a cero."`, `"Tamaño de paginado no debe ser menor a uno."`, `"Tamaño de página demasiado grande, máximo permitido es 10."`, `"Propiedad inválida: <p>"`, `"Especificar una propiedad para ordenar."`, `"Dirección debe ser 'desc' o 'asc'."` |

El frontend pide `size=10` en ambas.

---

## Permisos

Mapeo rol→permiso de `security/entities/Role.java:8-37` (el frontend lo replica en `src/lib/auth/permisos.ts`).

| Permiso | Roles | Uso en este contrato |
|---|---|---|
| `Manage Users` | Administrador Web | `GET/POST /api/personas`, `GET /api/personas/{cod}/usuario`, `PUT/DELETE /api/personas/{cod}` |
| `Manage Roles` | Administrador Web | `GET /api/roles`, `PUT /api/usuarios/{id}/rol` |
| `Update` | todos | `PUT /api/usuarios/{id}` (la dependencia 3 lo restringe) |
| `Manage Groups` | Administrador Web, Jefe de Operaciones | CRUD `/api/grupos`, `GET /api/personas/alumno/{tipo}` |
| `Read` | todos | GET de fases, subfases, maniobras y materias |
| `Manage Phases` | Administrador Web, Comandante de Escuadrón | `POST/PUT/DELETE /api/fases` |
| `Manage Subphases` | Administrador Web, Comandante de Escuadrón | `GET /api/subfases/assign` (no usado en M2) |
| `Manage Maneuvers` | Administrador Web, Comandante de Escuadrón | `POST/PUT/DELETE /api/maniobras` |
| `Manage Standards` | Administrador Web, Jefe de Operaciones | `PUT /api/maniobras/{id}/estandar` |
| `Manage Subjects` (nuevo, dependencia 5) | Administrador Web, Comandante de Escuadrón | `POST/PUT/DELETE /api/materias` |
| — (cualquier autenticado) | todos | `GET /api/personas/{username}` (la dependencia 25 lo limita) |

---

## Valores

| Dato | Valores | Notas |
|---|---|---|
| `tipo` (persona) | `"Alumno"`, `"Instructor PDI"`, `"Instructor PDE"` o `null` | `null` = personal sin tipo (seed: 333333 Jefe de Operaciones, 000001 Administrador). Se guarda tal cual; hoy no se valida. |
| Roles (seed) | `1` Alumno, `2` Administrador Web, `3` Jefe de Operaciones, `4` Instructor, `5` Comandante de Escuadrón | El nombre y las descripciones del seed tienen mojibake (dependencia 19); este documento usa el texto correcto. |
| `programa` (grupo) | `"PDI"`, `"PDE"` | En el body es sensible a mayúsculas; un valor inválido se deserializa como `null` (`READ_UNKNOWN_ENUM_VALUES_AS_NULL`, `application.properties:35`). |
| `estado` (persona) | `Apto`, `En Chequeo`, `En Observación`, `En Final`, `En Complementación`, `En Deliberación`, `No Apto` | Una persona nueva siempre nace `Apto`. |
| `parte` (materia) | `PRIMERA_PARTE`, `SEGUNDA_PARTE`, `CULTURA_AERONAUTICA` | Ver `contrato-api-teoria.md`. |

### Compatibilidad tipo–rol — [Nuevo — dependencias 23 y 28]

| `tipo` de la persona | Roles permitidos para su cuenta (id de rol) |
|---|---|
| `Alumno` | Alumno (1) |
| `Instructor PDI` · `Instructor PDE` | Instructor (4), Jefe de Operaciones (3), Comandante de Escuadrón (5) |
| `null` | Jefe de Operaciones (3), Comandante de Escuadrón (5), Administrador Web (2) |

El backend compara por **id de rol**, no por nombre, para que el mojibake del seed (dependencia 19) no rompa la regla. El frontend usa la misma tabla por nombre, como `permisos.ts`.

Motivo: `tipo` alimenta los selectores (`/personas/alumno/Alumno` para grupos, `/personas/instructor/{tipo}` para turnos). Una cuenta Alumno con tipo de instructor aparecería como instructor, y una cuenta Instructor sin tipo nunca podría asignarse a un turno. Se comprueba al crear la persona (§1.3), al cambiar su tipo (§1.4) y al asignar el rol (§2.2).

---

## 1. Personas (`PersonaController`)

### 1.1 `GET /api/personas` — **Corrección**

```
GET /api/personas?page=&size=&direction=&property=   Manage Users
```

`Page_Sort`; `property` def. `"codigo"`. El frontend ordena por `codigo` o `aPaterno`. No hay filtros.

200 — `Page<IndexPersona>`:
```json
{
  "content": [
    { "codigo": "000001", "nombre": "Admin", "aPaterno": "Sistema", "aMaterno": "Admin", "rango": "Admin", "tipo": null },
    { "codigo": "111111", "nombre": "Oscar", "aPaterno": "Lopez", "aMaterno": "Chaparro", "rango": "Cadete", "tipo": "Alumno" }
  ],
  "totalElements": 10, "totalPages": 5, "size": 2, "number": 0, "first": true, "last": false, "numberOfElements": 2, "empty": false
}
```

**[Corrección — dependencia 27]** Agregar `String getTipo()` a `IndexPersona`; hoy la fila no trae `tipo`. El frontend tolera su ausencia (muestra "—").

404 §A `"No existen personas disponibles."` si la página está vacía. 400 §A si el paginado es inválido (lista `personas`).

### 1.2 `GET /api/personas/{cod}/usuario` — **Corrección**

```
GET /api/personas/{cod}/usuario   Manage Users
```

Detalle de la persona y de su cuenta (pantalla `/personas/$cod`).

200:
```json
{
  "codigo": "111111",
  "nombre": "Oscar",
  "aPaterno": "Lopez",
  "aMaterno": "Chaparro",
  "dni": "12345678",
  "rango": "Cadete",
  "tipo": "Alumno",
  "estado": "Apto",
  "grupo": { "id": 1, "nombre": "Grupo 1" },
  "usuario": {
    "id": 3,
    "nombre": "alumno.lopez",
    "correo": "alumno1@sigeda.com",
    "rol": { "id": 1, "nombre": "Alumno", "descripcion": "Usuario en entrenamiento con acceso a evaluaciones y reportes personales" }
  }
}
```

- `usuario.nombre` es el **nombre de usuario**: es una proyección, no la entidad, por eso la clave es `nombre` y no `username`.
- **[Corrección — dependencia 26]** Son nuevos `estado`, `grupo` (`{id, nombre}` o `null` si no tiene grupo) y `usuario.id`. Hoy la proyección `DetalleUsuario` no los trae, y sin `usuario.id` no se pueden llamar §2.2 ni §2.3.
- **[Corrección — dependencia 26]** Una persona sin cuenta responde `"usuario": null`; hoy `PersonaServiceImpl.findDetalleUsuario` lanza NPE (500 §B "Error inesperado").
- `usuario.rol` es `null` si la cuenta no tiene rol (sin cambios). Es el caso de las cuentas creadas hoy por §1.3, que no pueden iniciar sesión.

404 §A `"Persona especificada no existe."`.

Tolerancia del frontend mientras no exista la dependencia 26: si falta `usuario.id`, lo toma de `GET /api/personas/{usuario.nombre}` (§1.7), que no devuelve la contraseña.

### 1.3 `POST /api/personas` — **Corrección**

```
POST /api/personas   Manage Users
```

Hoy el body es la entidad `Persona`: `usuario` se ignora (`@JsonIgnore`), el usuario se llama como el primer nombre, el correo se genera y la contraseña, aleatoria, se guarda **en texto plano** y sin rol. La cuenta nunca puede iniciar sesión (dependencia 22). Se reemplaza por un DTO con `@Valid` y `BindingResult`.

Request:
```json
{
  "codigo": "123ABC",
  "dni": "71234567",
  "nombre": "Rosa",
  "aPaterno": "Quispe",
  "aMaterno": "Huamán",
  "rango": "Cadete",
  "tipo": "Alumno",
  "usuario": {
    "username": "rosa.quispe",
    "correo": "rosa.quispe@sigeda.com",
    "password": "Cambio2026",
    "idRol": 1
  }
}
```

`aMaterno`, `rango` y `tipo` pueden venir `null`. Las claves `username` y `password` son las que `Usuario` ya usa en `/auth/login` y `PUT /api/usuarios/{id}`.

Precisiones de la tabla de abajo:
- **Obligatorio** = `@NotBlank` (o `@NotNull` en `usuario` e `idRol`): `null`, `""` y un texto solo de espacios se rechazan. El backend no recorta los textos; los guarda tal como llegan. El frontend los envía recortados.
- **`tipo`**: solo `null` significa "sin tipo". `""` o cualquier otro texto se rechaza con `Ingresar tipo de persona válido.`
- **`usuario.idRol`**: `null`, `0` o negativo → `El rol es requerido.` (`@NotNull` y `@Positive` con el mismo mensaje).
- **Compatibilidad tipo–rol**: se comprueba solo si `tipo` es válido y el rol existe. Si no, se informan únicamente los errores de `tipo` o de `idRol`.

**[Nuevo — dependencia 23]** Validación → 400 §A arreglo (todos los errores juntos):

| Campo (clave del mensaje) | Regla | Mensaje exacto |
|---|---|---|
| `codigo` | obligatorio | `El código es obligatorio.` |
| | `^[A-Za-z0-9]{6}$` | `El código debe tener 6 caracteres alfanuméricos.` |
| `dni` | obligatorio | `El DNI es obligatorio.` |
| | `^\d{8}$` | `El DNI debe tener 8 dígitos.` |
| `nombre` | obligatorio | `El nombre es obligatorio` (sin punto, igual que `NombreDescripcionDto`) |
| | máximo 50 | `El nombre no puede superar los 50 caracteres.` |
| `aPaterno` | obligatorio | `El apellido paterno es obligatorio.` |
| | máximo 50 | `El apellido paterno no puede superar los 50 caracteres.` |
| `aMaterno` | máximo 50 | `El apellido materno no puede superar los 50 caracteres.` |
| `rango` | máximo 30 | `El rango no puede superar los 30 caracteres.` |
| `tipo` | `null` o uno de los tres valores | `Ingresar tipo de persona válido.` |
| `usuario` | obligatorio | `Los datos de la cuenta son requeridos.` |
| `usuario.username` | obligatorio | `El nombre de usuario es obligatorio.` |
| | `^[a-z0-9._]{4,30}$` | `El nombre de usuario debe tener de 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.` |
| | no existe en `usuarios.nombre` | `El nombre de usuario ya está en uso.` |
| `usuario.correo` | obligatorio | `El correo es obligatorio.` |
| | formato de correo | `Ingresar correo válido.` |
| `usuario.password` | obligatorio | `La contraseña es obligatoria.` |
| | mínimo 8 | `La contraseña debe tener al menos 8 caracteres.` |
| `usuario.idRol` | `@Positive` | `El rol es requerido.` |
| | el rol existe | `El rol seleccionado no existe.` |
| | compatible con `tipo` (tabla de Valores) | `El rol no corresponde al tipo de persona.` |

Ejemplo: `["'usuario.username': El nombre de usuario ya está en uso.", "'dni': El DNI debe tener 8 dígitos."]`.

**Reglas, en orden:**

1. **[Nuevo — dependencia 23]** Validación de la tabla → 400 §A arreglo.
2. Código ya registrado → 400 §A texto plano `"El alumno ya ha sido registrado."` (sin cambios; el texto dice "alumno" también para instructores).
3. **[Corrección — dependencia 22]** En **una transacción**: se crea la persona con `estado = "Apto"` (sin cambios) y su usuario con `nombre = usuario.username`, `correo`, `contraseña = BCrypt(usuario.password)`, `rol = idRol` y la persona. `DataAccessException` → 500 §A `{"error":"Error al realizar el registro.","mensaje":…}` (sin cambios).
4. Éxito → **201**:
```json
{
  "mensaje": "Persona guardada con éxito.",
  "persona": {
    "codigo": "123ABC", "rango": "Cadete", "dni": "71234567", "nombre": "Rosa", "aPaterno": "Quispe", "aMaterno": "Huamán",
    "estado": "Apto", "tipo": "Alumno", "codEvalRealizada": null, "codEvalDesaprobada": null,
    "contChequeo": 0, "contEval": 0, "contMalo": 0, "contRegular": 0, "checked": false, "idGrupo": null, "desaprobados": null
  },
  "usuario": { "id": 11, "username": "rosa.quispe", "correo": "rosa.quispe@sigeda.com", "rol": { "id": 1, "nombre": "Alumno" } }
}
```

`persona` es la entidad tal como hoy. `usuario` es **nuevo** y nunca incluye la contraseña. El frontend usa `mensaje` y `persona.codigo`, y tolera la falta de `usuario` (respuesta de hoy).

### 1.4 `PUT /api/personas/{cod}` — **Sin cambios** (+ regla nueva)

```
PUT /api/personas/{cod}   Manage Users
```

Body — **siempre los dos campos**: el handler asigna ambos y el que falte queda `null`. Cualquier otro campo se ignora.
```json
{ "rango": "Teniente", "tipo": "Alumno" }
```

Reglas, en orden:
1. Persona no existe → 404 §A `"Persona especificada no existe."` (sin cambios).
2. **[Nuevo — dependencia 28]** Validación → 400 §A arreglo: `'tipo'` con `"Ingresar tipo de persona válido."` o, si el tipo no es compatible con el rol actual de la cuenta, `"El tipo no corresponde al rol de la cuenta."`; `'rango'` con `"El rango no puede superar los 30 caracteres."`. Una persona sin cuenta, o con `rol` null, no pasa por la comprobación de compatibilidad.
3. Éxito → **201** (sí, 201 también al modificar: `Response.wasSaved`) `{"mensaje":"Persona guardada con éxito.","persona":{…entidad…}}`.

### 1.5 `DELETE /api/personas/{cod}` — **Corrección**

```
DELETE /api/personas/{cod}   Manage Users
```

Reglas, en orden:
1. Persona no existe → 404 §A `"Persona especificada no existe."`.
2. Ya tiene una evaluación (`codEvalRealizada`) → 403 §A texto `"No se puede eliminar alumno, ya realizó una evaluación."` (sin cambios).
3. Figura como alumno en un turno → 403 §A texto `"El alumno no se pudo eliminar, está presente en un turno."` (sin cambios).
4. Figura como instructor de un turno → 403 §A texto `"El instructor no se pudo eliminar, está presente en un turno."` (sin cambios).
5. **[Corrección — dependencia 30]** Se eliminan en **una transacción** los refresh tokens del usuario, el usuario (si existe) y la persona. Hoy hay dos fallas. Una persona sin usuario da un NPE (500). Un usuario con refresh token da un error de FK (500), y el usuario queda sin persona y sin rol porque ya se guardó así antes del fallo.
6. Éxito → 200 §A texto plano `"Persona eliminado con éxito."` (texto literal de `Response.wasDeleted`).

### 1.6 `GET /api/personas/alumno/{tipo}` — **Sin cambios**

```
GET /api/personas/alumno/Alumno   Manage Groups
```

Alumnos **sin grupo**, para el formulario de grupo. 200 `List<NombreAlumno>`:
```json
[ { "codigo": "123ABC", "nombre": "Rosa", "aPaterno": "Quispe", "aMaterno": "Huamán" } ]
```
404 §A `"No existen personas disponibles."` si no hay ninguno. En el seed todos los alumnos tienen grupo, así que responde 404. `{tipo}` se compara literalmente con `personas.tipo`.

### 1.7 `GET /api/personas/{username}` — **Corrección** (sesión)

```
GET /api/personas/{username}   hoy: cualquier autenticado (el @PreAuthorize está comentado)
```

Desde M2 el frontend arma la sesión **solo** con este endpoint (M2-10) y deja de llamar `GET /api/usuarios/nombre/{nombre}`, que devuelve el hash.

200 — `DetalleSesion` (sin cambios; no trae contraseña):
```json
{
  "codigo": "000001",
  "nombre": "Admin",
  "aPaterno": "Sistema",
  "aMaterno": "Admin",
  "idGrupo": null,
  "usuario": { "nombre": "admin.sistema", "correo": "admin@sigeda.com", "id": 10, "rol": { "id": 2, "nombre": "Administrador Web" } }
}
```

`usuario.nombre` es el nombre de usuario. `usuario.rol` puede ser `null` (cuenta sin rol); el frontend lo trata como cuenta inválida: borra los tokens y vuelve al inicio de sesión con un aviso (spec M2-10). 404 §A `"Persona especificada no existe."` si el usuario no existe o no tiene persona.

**[Corrección — dependencia 25]** Solo el propio usuario o quien tenga `Manage Users`, p. ej. `@PreAuthorize("#nom == authentication.name or hasRole('Manage Users')")`. En otro caso → 403 §B "Acceso denegado". Hoy cualquier usuario autenticado lee nombre, grupo, correo y rol de cualquier otro.

---

## 2. Usuarios y roles (`UsuarioController`, `RolController`)

No hay lista de usuarios. La cuenta se gestiona desde el detalle de la persona (§1.2).

### 2.1 `GET /api/roles` — **Sin cambios**

```
GET /api/roles   Manage Roles
```

200 — lista no paginada `{id, nombre, descripcion}`, en el orden de la tabla:
```json
[
  { "id": 1, "nombre": "Alumno", "descripcion": "Usuario en entrenamiento con acceso a evaluaciones y reportes personales" },
  { "id": 2, "nombre": "Administrador Web", "descripcion": "Control total del sistema y gestión de usuarios" },
  { "id": 3, "nombre": "Jefe de Operaciones", "descripcion": "Supervisión de operaciones y gestión de programas" },
  { "id": 4, "nombre": "Instructor", "descripcion": "Evaluación y seguimiento de alumnos" },
  { "id": 5, "nombre": "Comandante de Escuadrón", "descripcion": "Gestión de grupos y supervisión de instructores" }
]
```
404 §A `"No existen roles disponibles."`. El seed real tiene mojibake en las descripciones y en el nombre del rol 5 (dependencia 19).

### 2.2 `PUT /api/usuarios/{id}/rol` — **Corrección**

```
PUT /api/usuarios/{id}/rol   Manage Roles
```

Body — solo el id del rol:
```json
{ "rol": { "id": 3 } }
```

Reglas, en orden:
1. `rol` ausente → 400 §A texto `"Selecciones roles a asignar."` (sin cambios; el typo es literal).
2. Usuario no existe → 404 §A `"Usuario especificada no existe."` (sin cambios).
3. **[Nuevo — dependencia 28]** Rol inexistente → 404 §A `"Rol especificada no existe."`; hoy es un 500 por FK.
4. **[Nuevo — dependencia 28]** Rol incompatible con el `tipo` de la persona → 400 §A texto `"El rol no corresponde al tipo de persona."`.
5. Éxito → **201** `{"mensaje":"Usuario guardada con éxito.","usuario":{…}}`. Hoy `usuario.rol` repite el `rol` del request, con `nombre` y `descripcion` en `null`, y `usuario.password` trae la contraseña guardada: el hash, o el texto plano de una cuenta creada hoy por §1.3. Es inofensivo para el frontend, que lee solo `mensaje` (spec M2-3). **[Corrección — dependencia 24]** `usuario` sin `password`: `{"id":1,"username":"jefe.operaciones","correo":"jefeoperaciones@sigeda.com","codPersona":"333333","rol":{"id":3,"nombre":"Jefe de Operaciones","descripcion":"…"}}`. El frontend usa solo `mensaje` y vuelve a leer §1.2.

### 2.3 `PUT /api/usuarios/{id}` — **Corrección** (restablecer contraseña)

```
PUT /api/usuarios/{id}   Update
```

Body — **siempre `username` y `password`**: el handler sobrescribe el nombre con lo que llega y cifra `password`.
```json
{ "username": "alumno.lopez", "password": "NuevaClave2026" }
```

Sobre la propia cuenta (Cambiar contraseña, M0) el body lleva además la contraseña actual:
```json
{ "username": "alumno.lopez", "password": "NuevaClave2026", "passwordActual": "123" }
```
Hoy `passwordActual` se ignora (no existe en `Usuario`).

Reglas, en orden:
1. **[Nuevo — dependencia 3, enmendada en M2]** `@PreAuthorize`: solo la propia cuenta o `Manage Users`. En otro caso → 403 §B, antes de buscar el usuario o validar: `{"timestamp":"…","status":403,"error":"Acceso denegado","message":"No tienes permisos para realizar esta acción","messages":null}`. Hoy basta `Update`, que tienen todos los roles.
2. Usuario no existe → 404 §A `"Usuario especificada no existe."` (sin cambios).
3. **[Nuevo — dependencias 3 y 29]** Validación → 400 §A arreglo:
   - `'username'`: las reglas y mensajes de §1.3; la unicidad excluye al propio usuario.
   - `'password'`: `"La contraseña es obligatoria."` o `"La contraseña debe tener al menos 8 caracteres."`.
   - `'passwordActual'`, **solo sobre la propia cuenta** (aunque se tenga `Manage Users`): `"La contraseña actual es obligatoria."` si falta, o `"La contraseña actual no es correcta."` si no coincide con el hash guardado. Con `Manage Users` sobre otra cuenta no se pide y se ignora.

   Hoy, sin `password`, responde 400 §B `"rawPassword cannot be null"`; sin `username`, deja la cuenta sin nombre.
4. Éxito → **201** `{"mensaje":"Usuario guardada con éxito.","usuario":{…}}`, **sin `password`** (dependencia 24). Hoy trae `password`; el frontend lee solo `mensaje` (spec M2-3).

### 2.4 `GET /api/usuarios/{id}`, `/api/usuarios/nombre/{nombre}`, `/api/usuarios/persona/{cod}` — **Corrección**

El frontend **no los consume** desde M2. Hoy no tienen `@PreAuthorize` y devuelven la entidad `Usuario` con `"password"`: el hash BCrypt, o la contraseña en texto plano en las cuentas creadas por §1.3. Además, `/nombre/{nombre}` responde 401 §B "No autenticado" para un nombre inexistente (`UsernameNotFoundException`).

**[Corrección — dependencias 2 y 24]** `@JsonProperty(access = WRITE_ONLY)` en `Usuario.contraseña`; esto también limpia las respuestas de §2.2 y §2.3. Además, `@PreAuthorize` que admita la propia cuenta o `Manage Users`.

---

## 3. Grupos (`GrupoController`)

### 3.1 `GET /api/grupos` — **Sin cambios**

```
GET /api/grupos?page=&size=&direction=&property=   Manage Groups
```

`Page_Sort`; `property` def. `"id"`. El frontend ordena por `nombre` o `programa`.

200 — `Page<IndexGrupo>`:
```json
{
  "content": [
    { "id": 1, "nombre": "Grupo 1", "descripcion": "Instrucción básica - Nuevos ingresantes", "programa": "PDI" },
    { "id": 2, "nombre": "Grupo 2", "descripcion": "Instrucción avanzada - Fase final", "programa": "PDI" }
  ],
  "totalElements": 6, "totalPages": 3, "size": 2, "number": 0, "first": true, "last": false, "numberOfElements": 2, "empty": false
}
```
404 §A `"No existen grupos disponibles."`. 400 §A si el paginado es inválido (lista `grupos`).

### 3.2 `GET /api/grupos/{id}` — **Corrección**

```
GET /api/grupos/{id}   Manage Groups
```

200 — entidad `Grupo` con sus personas (entidades completas):
```json
{
  "id": 3,
  "nombre": "Grupo 3",
  "descripcion": "Entrenamiento especializado - Nivel 1",
  "programa": "PDI",
  "personas": [
    { "codigo": "555555", "rango": "Teniente", "dni": "56789012", "nombre": "Pedro", "aPaterno": "Rodriguez", "aMaterno": "Garcia",
      "estado": "Apto", "tipo": "Alumno", "codEvalRealizada": null, "codEvalDesaprobada": null,
      "contChequeo": 2, "contEval": 5, "contMalo": 1, "contRegular": 2, "checked": false, "idGrupo": 3, "desaprobados": null },
    { "codigo": "666666", "rango": "Capitán", "dni": "67890123", "nombre": "Ana", "aPaterno": "Torres", "aMaterno": "Martinez",
      "estado": "Apto", "tipo": "Alumno", "codEvalRealizada": null, "codEvalDesaprobada": null,
      "contChequeo": 1, "contEval": 4, "contMalo": 0, "contRegular": 1, "checked": false, "idGrupo": 3, "desaprobados": null }
  ]
}
```
El frontend usa `id`, `nombre`, `descripcion`, `programa` y de cada persona `codigo`, `nombre`, `aPaterno`, `aMaterno` y `estado`.

**[Corrección — dependencia 18]** Un grupo inexistente hoy responde **200 sin cuerpo (vacío)**: a `response.isNull` le falta el `return` y el handler sigue hasta `ResponseEntity.ok(null)`, que no escribe cuerpo (`src/lib/api/http.ts` lo lee como `null`). Debe responder 404 §A `"Grupo especificada no existe."`. El frontend trata ambos casos como no encontrado.

### 3.3 `POST /api/grupos` — **Corrección**

```
POST /api/grupos   Manage Groups
```

Request:
```json
{
  "nombre": "Grupo 7",
  "descripcion": "Promoción 2027",
  "programa": "PDE",
  "personas": [ { "codigo": "123ABC" } ]
}
```
`personas` es opcional y cada elemento lleva solo `codigo`. **Toda** persona listada queda asignada al grupo, aunque estuviera en otro (sin cambios). Se ignora cualquier `id` enviado.

Reglas, en orden:
1. **[Nuevo — dependencia 31]** Validación → 400 §A arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `nombre` | obligatorio | `El nombre es obligatorio` |
| | 3 a 35 caracteres | `El nombre debe tener entre 3 y 35 caracteres.` |
| `descripcion` | máximo 255 | `La descripción no puede superar los 255 caracteres.` |
| `programa` | `PDI` o `PDE` | `Ingresar programa válido.` |

   Hoy no se valida nada, y un programa inválido se guarda `null`. Los mensajes de nombre y descripción son los de `NombreDescripcionDto`, para que todo el sistema diga lo mismo.
2. **[Corrección — dependencia 31]** Un `codigo` inexistente → 404 §A `"Persona especificada no existe."`, **sin guardar nada**. Hoy da un NPE (500) con el grupo ya creado y parte de las personas asignadas. Todo en una transacción.
3. Éxito → **201** `{"mensaje":"Grupo guardada con éxito.","grupo":{"id":7,"nombre":"Grupo 7","descripcion":"Promoción 2027","programa":"PDE","personas":[…]}}`. El frontend usa `mensaje` y `grupo.id`. Hoy `personas` repite los objetos del request tal como llegaron.

### 3.4 `PUT /api/grupos/{id}` — **Corrección**

```
PUT /api/grupos/{id}   Manage Groups
```

Request:
```json
{
  "nombre": "Grupo 3",
  "descripcion": "Entrenamiento especializado - Nivel 1",
  "personas": [
    { "codigo": "555555", "checked": true },
    { "codigo": "666666", "checked": false },
    { "codigo": "123ABC", "checked": true }
  ]
}
```

- `programa` se **ignora** (sin cambios): el programa de un grupo no cambia.
- `checked: true` asigna la persona a este grupo; `checked: false` la deja **sin grupo**, esté donde esté (sin cambios). El frontend envía todos los miembros actuales (marcados o no) y los alumnos nuevos marcados.
- Sin `personas`, los miembros no cambian.

Reglas, en orden: grupo inexistente → 404 §A `"Grupo especificada no existe."`; **[Nuevo — dependencia 31]** la validación de §3.3 salvo `programa`; **[Corrección — dependencia 31]** un código inexistente → 404 §A `"Persona especificada no existe."` sin guardar nada, en una transacción. Éxito → **201** `{"mensaje":"Grupo guardada con éxito.","grupo":{…forma de §3.2…}}`.

### 3.5 `DELETE /api/grupos/{id}` — **Sin cambios**

```
DELETE /api/grupos/{id}   Manage Groups
```

Deja sin grupo a sus personas (no las elimina) y borra el grupo. 404 §A `"Grupo especificada no existe."`; éxito → 200 §A texto `"Grupo eliminado con éxito."`.

---

## 4. Fases y subfases (`FaseController`, `SubFaseController`)

No hay CRUD propio de subfases: se crean, modifican y eliminan a través de la fase.

### 4.1 `GET /api/fases` — **Sin cambios**

```
GET /api/fases?page=&size=&direction=&properties=   Read
```

`PageWithSort`. 200 — `Page<IndexGeneral>`:
```json
{
  "content": [
    { "id": 1, "nombre": "Adaptación", "descripcion": "Fase inicial de familiarización con procedimientos básicos" },
    { "id": 2, "nombre": "Operaciones HeliTransportadas", "descripcion": "Entrenamiento en operaciones con helicópteros" },
    { "id": 3, "nombre": "Operaciones AeroTácticas", "descripcion": "Operaciones avanzadas y tácticas especiales" }
  ],
  "totalElements": 3, "totalPages": 1, "size": 10, "number": 0, "first": true, "last": true, "numberOfElements": 3, "empty": false
}
```
404 §B `"No existen fases disponibles."`. 400 §B si el paginado es inválido.

### 4.2 `GET /api/fases/{id}` — **Sin cambios**

```
GET /api/fases/{id}   Read
```

200 — `DetalleFase`:
```json
{
  "id": 1,
  "nombre": "Adaptación",
  "descripcion": "Fase inicial de familiarización con procedimientos básicos",
  "subfases": [
    { "id": 1, "nombre": "Contacto", "descripcion": "Familiarización con controles y procedimientos básicos" },
    { "id": 2, "nombre": "Navegación", "descripcion": "Técnicas de navegación y orientación" },
    { "id": 3, "nombre": "Instrumentos", "descripcion": "Manejo de instrumentos de vuelo" },
    { "id": 4, "nombre": "Campos Extraños", "descripcion": "Operaciones en terrenos no preparados" },
    { "id": 5, "nombre": "Formación", "descripcion": "Vuelo en formación y coordinación" }
  ]
}
```
`subfases` va ordenada por `id` (hoy el orden no está garantizado: falta `@OrderBy("id")`, dependencia 38). En el seed, las fases 2 y 3 responden `"subfases": []`. 404 §B `"No existe información de fase."`. Un id no numérico → 400 §B `error:"Error en parámetros"`, `message:"El parámetro 'id' debe ser de tipo int"`.

### 4.3 `POST /api/fases` — **Sin cambios**

```
POST /api/fases   Manage Phases
```

Request — `FaseSave`:
```json
{
  "nombre": "Operaciones Nocturnas",
  "descripcion": "Vuelo con visores nocturnos",
  "subfases": [ { "nombre": "Familiarización NVG", "descripcion": null } ]
}
```
El `id` de las subfases se ignora al crear: todas son nuevas.

Validación → 400 §B (`messages[]`):

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `nombre`, `subfases[i].nombre` | `@NotBlank` | `El nombre es obligatorio` (sin punto) |
| | `@Size(3, 35)` | `El nombre debe tener entre 3 y 35 caracteres.` |
| `descripcion`, `subfases[i].descripcion` | `@Size(max = 255)` | `La descripción no puede superar los 255 caracteres.` |
| `subfases` | `@NotEmpty` | `La asignación de subfases es requerida` (sin punto) |

Ejemplo: `{"status":400,"error":"Error al validar el modelo","message":null,"messages":["'subfases[0].nombre': El nombre debe tener entre 3 y 35 caracteres."]}`.

Éxito → **200** (no 201; sin `mensaje`), con la entidad `Fase`:
```json
{
  "id": 4,
  "nombre": "Operaciones Nocturnas",
  "descripcion": "Vuelo con visores nocturnos",
  "subfases": [ { "id": 6, "nombre": "Familiarización NVG", "descripcion": null, "idFase": null } ]
}
```
`idFase` sale `null` al crear (la columna no se refresca); el frontend no lo usa.

### 4.4 `PUT /api/fases/{id}` — **Corrección**

```
PUT /api/fases/{id}   Manage Phases
```

Request: igual que §4.3, pero cada subfase lleva `id`:
```json
{
  "nombre": "Adaptación",
  "descripcion": "Fase inicial de familiarización con procedimientos básicos",
  "subfases": [
    { "id": 1, "nombre": "Contacto", "descripcion": "" },
    { "id": 2, "nombre": "Navegación", "descripcion": "Técnicas de navegación y orientación" },
    { "id": 3, "nombre": "Instrumentos", "descripcion": "Manejo de instrumentos de vuelo" },
    { "id": 4, "nombre": "Campos Extraños", "descripcion": "Operaciones en terrenos no preparados" },
    { "id": 5, "nombre": "Formación", "descripcion": "Vuelo en formación y coordinación" },
    { "id": 0, "nombre": "Autorrotaciones", "descripcion": "Prácticas de autorrotación" }
  ]
}
```

- `id > 0` actualiza esa subfase; si pertenecía a otra fase, la mueve a esta (sin cambios; el frontend nunca envía ids ajenos). Un `id > 0` que no existe **crea** una subfase nueva, igual que `id` `0` (`FaseService.java:64-66`, `SubfaseSave.java:21-22`).
- Una subfase guardada que **no** viene en la lista **se elimina** (orphan removal), sin ninguna comprobación. `turnos`, `evaluaciones_practicas` y `maniobras_subfase` no tienen FK hacia `subfases`, así que esas filas quedan apuntando a una subfase inexistente.
- **[Nuevo — dependencia 37]** Si una subfase omitida tiene maniobras, turnos o evaluaciones → 410 §B (`ActionExpiredException`, mismo código que las demás negativas de borrado del módulo, §5.6) con `"La subfase <nombre> no se puede quitar, tiene maniobras, turnos o evaluaciones."`, sin guardar nada. El frontend no permite quitar subfases guardadas (M2-6).
- Una `descripcion` vacía conserva la anterior, en la fase y en cada subfase (sin cambios; dependencia 38).

Validación: la de §4.3. 404 §B `"No existe información de fase."`. Éxito → **200** con la entidad `Fase` (las subfases ya existentes traen su `idFase`; las nuevas, `null`).

### 4.5 `DELETE /api/fases/{id}` — **Corrección**

```
DELETE /api/fases/{id}   Manage Phases
```

Hoy el servicio primero ejecuta `deleteByManiobrasSubfaseIsNull()`, que borra **todas las subfases sin maniobras de todas las fases**. Con el seed, borrar cualquier fase elimina Contacto y Formación, que usan los turnos sembrados 1–3 y 7. Después borra la fase y, en cascada, sus subfases. La limpieza global corre **siempre**, también para un id inexistente, que luego responde 204 porque Spring Data JPA 3 lo ignora.

**[Corrección — dependencia 37]**
1. Fase inexistente → 404 §B `"No existe información de fase."`.
2. Alguna de sus subfases tiene maniobras, turnos o evaluaciones → 410 §B `"La fase no se puede eliminar, sus subfases tienen maniobras, turnos o evaluaciones."`.
3. Se borran la fase y sus subfases, **sin** la limpieza global.
4. Éxito → **204** sin cuerpo (sin cambios).

El frontend solo ofrece eliminar una fase sin subfases (M2-6).

### 4.6 `GET /api/subfases/{id}` — **Sin cambios**

```
GET /api/subfases/{id}   Read
```

200 — `DetalleSubfase`. Las maniobras vienen anidadas en `maniobrasSubfase[].maniobra`:
```json
{
  "id": 3,
  "nombre": "Instrumentos",
  "descripcion": "Manejo de instrumentos de vuelo",
  "maniobrasSubfase": [
    { "maniobra": { "id": 9, "nombre": "Maniobra 9", "descripcion": "Descripcion de Maniobra 9" } },
    { "maniobra": { "id": 10, "nombre": "Maniobra 10", "descripcion": "Descripcion de Maniobra 10" } }
  ]
}
```
`maniobrasSubfase` va ordenada por el `id` de la maniobra (hoy sin garantía; dependencia 38). En el seed, las subfases 1 (Contacto) y 5 (Formación) responden `"maniobrasSubfase": []`. 404 §B `"No existe información de subfase."`. El detalle de fase la usa para mostrar las maniobras de cada subfase.

### 4.7 `GET /api/subfases/assign` — **Sin cambios** (no usado en M2)

```
GET /api/subfases/assign   Manage Subphases
```

Subfases sin fase: 200 `[{ "id", "nombre", "descripcion" }]`, o **`200 []`** si no hay ninguna (no 404). En el seed responde `[]`. M2 no lo consume: nada en el backend desvincula una subfase de su fase y borrar una fase borra sus subfases, así que la lista no puede tener elementos creados desde la aplicación.

---

## 5. Maniobras y estándares (`ManiobraController`)

No hay CRUD propio de estándares: se editan a través de la maniobra (§5.5).

### 5.1 `GET /api/maniobras` — **Sin cambios**

```
GET /api/maniobras?page=&size=&direction=&properties=   Read
```

`PageWithSort`. 200 — `Page<IndexGeneral>` (`{id, nombre, descripcion}`); en el seed, `Maniobra 1` … `Maniobra 10` con descripción `"Descripcion de Maniobra N"`. 404 §B `"No existen maniobras disponibles."`. 400 §B si el paginado es inválido.

### 5.2 `GET /api/maniobras/{id}` — **Corrección**

```
GET /api/maniobras/{id}   Read
```

200:
```json
{
  "id": 9,
  "nombre": "Maniobra 9",
  "descripcion": "Descripcion de Maniobra 9",
  "estandares": [
    { "id": 10, "nombre": "Estandar 60", "descripcion": null },
    { "id": 11, "nombre": "Estandar 61", "descripcion": null }
  ],
  "subfases": [ { "id": 3, "nombre": "Instrumentos" } ]
}
```

- **[Corrección — dependencia 33]** `subfases` es nuevo: `List<IdAndName>` de las subfases enlazadas en `maniobras_subfase`, ordenadas por `id`. Hoy el detalle solo trae `estandares`, y no hay otra forma directa de saber las subfases de una maniobra.
- `estandares` va ordenada por `id` (hoy sin garantía; dependencia 38). En el seed, los estándares no tienen descripción (`null`), y las maniobras 6, 7 y 8 responden `"estandares": []`.
- 404 §B `"No existe información de maniobra"` (sin punto; sin cambios).

Mientras falte `subfases` (backend actual), el frontend no las deduce: el detalle indica que no están disponibles, y Modificar maniobra queda deshabilitada hasta las dependencias 32 y 33. La fase de cada subfase la toma el frontend del catálogo de fases (§4.1, §4.2).

### 5.3 `POST /api/maniobras` — **Corrección**

```
POST /api/maniobras   Manage Maneuvers
```

Request — `ManiobraSave`:
```json
{
  "nombre": "Autorrotación",
  "descripcion": "Aterrizaje sin potencia",
  "subfases": [ { "idSubfase": 2 }, { "idSubfase": 3 } ]
}
```

Validación → 400 §B: `nombre` y `descripcion` como en §4.3; `'subfases'` con `"La asignación de subfases es requerida"`; `'subfases[i].idSubfase'` con `"La subfase es requerida."` (`@Positive`).

**[Corrección — dependencia 34]**
- Un `idSubfase` inexistente → 404 §B `"No existe información de subfase."`, sin guardar nada. Hoy se guarda en silencio, porque la única FK de `maniobras_subfase` apunta a una tabla mal escrita (`maniobras_subfases`, `schema_prod.sql:328-331`). Hay que corregir también esa FK.
- Un `idSubfase` repetido se toma una sola vez; hoy choca con la clave compuesta y da 500.

Éxito → **200** (sin cambios) con solo `{"id": 11, "nombre": "Autorrotación", "descripcion": "Aterrizaje sin potencia"}`: las subfases y los estándares son `@JsonIgnore` en la entidad.

### 5.4 `PUT /api/maniobras/{id}` — **Corrección**

```
PUT /api/maniobras/{id}   Manage Maneuvers
```

Request: igual que §5.3.

**[Corrección — dependencia 32]** Hoy cada subfase se busca con `findByIdSubfase(idSubfase)` sobre **toda** la tabla de enlaces, sin filtrar por maniobra. Si la subfase tiene dos o más maniobras (en el seed, las subfases 2, 3 y 4), responde 500 §B "Error al acceder a base de datos". Si tiene exactamente una, se apropia del enlace de otra maniobra. Corrección: los enlaces de **esta** maniobra pasan a ser exactamente los de la lista (se agregan los que faltan y se borran los omitidos), con la validación de §5.3 (incluida la dependencia 34).

404 §B `"No existe información de maniobra."`. **[Corrección — dependencia 32]** Hoy el mensaje dice `"No existe información de fase."`. Éxito → **200** `{id, nombre, descripcion}`. Una `descripcion` vacía conserva la anterior (dependencia 38).

### 5.5 `PUT /api/maniobras/{id}/estandar` — **Sin cambios**

```
PUT /api/maniobras/{id}/estandar   Manage Standards
```

Request — `ManiobraDetail`, con la lista completa de estándares:
```json
{
  "estandares": [
    { "id": 10, "nombre": "Estandar 60", "descripcion": "Mantener altitud ±50 ft" },
    { "id": 11, "nombre": "Estandar 61", "descripcion": null },
    { "id": 0, "nombre": "Mantener rumbo ±5°", "descripcion": null }
  ]
}
```

- `id > 0` actualiza ese estándar; si pertenece a otra maniobra, lo mueve a esta (el frontend nunca envía ids ajenos). Un `id > 0` que no existe **crea** un estándar nuevo, igual que `id` `0` (`ManiobraService.java:86-88`, `EstandarSave.java:15-16`).
- Un estándar guardado que **no** viene en la lista **no se elimina ni se desvincula**: sigue apuntando a la maniobra y reaparece en §5.2 (`Maniobra.estandares` no tiene orphan removal). El frontend no ofrece quitar estándares guardados. **[Opcional — dependencia 36]** Activar orphan removal para que un omitido se elimine.
- Validación → 400 §B: `'estandares'` con `"La asignación de estandares es requerida"` (sin punto ni tilde; al menos uno); `'estandares[i].nombre'` y `'estandares[i].descripcion'` como en §4.3.
- 404 §B `"No existe información de maniobra."` (con punto). Éxito → **200** `{id, nombre, descripcion}`. Una `descripcion` vacía conserva la anterior.

### 5.6 `DELETE /api/maniobras/{id}` — **Corrección**

```
DELETE /api/maniobras/{id}   Manage Maneuvers
```

Hoy:
- Si la maniobra tiene estándares → 410 §B con `"La maniobra no se pudo eliminar, está presente en un turno."`. El mensaje no corresponde a la condición.
- Si no tiene estándares pero se usa en `maniobras_turno` o en `calificaciones` → 500 por FK.
- Si no existe → 404 con `"No existe información de fase."`.

**[Corrección — dependencia 35]**, en orden:
1. No existe → 404 §B `"No existe información de maniobra."`.
2. Tiene estándares → 410 §B `"La maniobra no se pudo eliminar, tiene estándares asignados."`.
3. Figura en `maniobras_turno` o en `calificaciones` → 410 §B `"La maniobra no se pudo eliminar, está presente en un turno."`.
4. Éxito → **204** sin cuerpo (sin cambios).

El frontend deshabilita Eliminar mientras la maniobra tenga estándares (M2-7) y muestra tal cual cualquier otro 410.

---

## 6. Materias — **Nuevo** (dependencia 5)

Rutas, permisos, forma y semilla: `contrato-api-teoria.md` §1 (no se repiten aquí). Este apartado fija lo que allí falta para que los mocks sean exactos.

- Convención §A: `GET /api/materias` responde un arreglo **no paginado**, ordenado por `parte` (en el orden del enum) y luego por `nombre`. Si no hay materias → 404 texto `"No existen materias disponibles."`, que el frontend trata como lista vacía.
- `GET /api/materias/{id}` → 200 materia; 404 texto `"Materia especificada no existe."`.
- `POST /api/materias` y `PUT /api/materias/{id}` usan el mismo body `{nombre, notaMinima, coeficiente, parte}`; un `id` en el body se ignora (en `PUT` manda el de la ruta). Ambos → **201** `{"mensaje":"Materia guardada con éxito.","materia":{"id":12,"nombre":"…","notaMinima":16,"coeficiente":0.05,"parte":"SEGUNDA_PARTE"}}`. `PUT` de una materia inexistente → 404 texto `"Materia especificada no existe."`.
- `DELETE /api/materias/{id}` → 200 texto `"Materia eliminado con éxito."` (texto literal de `Response.wasDeleted`); 404 como arriba. Si tiene preguntas o turnos teóricos → **409** texto `"La materia no se puede eliminar, tiene preguntas o turnos teóricos."`.
- `coeficiente` es un número JSON con hasta 2 decimales (`0.22`); `notaMinima` es un entero.

Validación → 400 §A arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `nombre` | obligatorio (`null`, `""` o solo espacios) | `El nombre es obligatorio` (sin punto, igual que `NombreDescripcionDto`) |
| | 3 a 60 caracteres | `El nombre debe tener entre 3 y 60 caracteres.` |
| | único (sin distinguir mayúsculas; en `PUT` excluye a la propia materia) | `Ya existe una materia con ese nombre.` |
| `notaMinima` | obligatorio (`null` o ausente) | `La nota mínima es obligatoria.` |
| | entero de 0 a 20; un valor con decimales se rechaza, no se trunca | `La nota mínima debe ser un entero entre 0 y 20.` |
| `coeficiente` | obligatorio (`null` o ausente) | `El coeficiente es obligatorio.` |
| | de 0 a 1, hasta 2 decimales | `El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.` |
| `parte` | obligatorio y uno de los tres valores | `Ingresar parte del curso válida.` (un solo mensaje: con `READ_UNKNOWN_ENUM_VALUES_AS_NULL` un valor inválido llega como `null`, así que ausente e inválido no se distinguen) |

Semilla (ids 1–11, todas `PRIMERA_PARTE`, en el orden de `contrato-api-teoria.md` §1): Aerodinámica Aplicada a Helicópteros 16/0.13 · Ingeniería del Helicóptero 16/0.16 · Adoctrinamiento de Vuelo 18/0.22 · Límites de Operación 20/0.10 · Procedimientos Normales 16/0.10 · Procedimientos de Emergencias 20/0.10 · Meteorología 16/0.04 · Prevención de Accidentes 16/0.04 · Normatividad FAP 16/0.04 · Regulaciones Aeronáuticas del Perú 16/0.04 · Fraseología Aeronáutica en Inglés 16/0.03.

---

## 7. Datos de los mocks

Los mocks parten del seed (`data_prod.sql`) y de los datos de M1 (`docs/decisiones.md` › Datos de prueba). Para los criterios de M2 agregan o fijan lo siguiente:

| Dato | Para | Detalle |
|---|---|---|
| Cuentas del seed | §1.2, CA-PER-06 | Las 10 cuentas del seed (ids 1–10) con su rol, más `comandante.aguirre` (id 11, persona 222444 Jorge Aguirre Salas, DNI `22244411`, rango `Mayor`, tipo `null`, rol 5), que solo existe en los mocks. Contraseña `123`. |
| Persona sin cuenta | CA-PER-06 (T9), CA-GRU-03, CA-PER-10 | `654321` Lucía Mendoza Ríos, DNI `76543210`, rango `Cadete`, tipo `Alumno`, sin grupo, sin usuario. Es el único alumno sin grupo, así que §1.6 no responde 404, y se puede eliminar (mensaje B3). |
| Cuenta sin rol | CA-PER-06 (T8), CA-PER-07 | `765432` Raúl Paredes Soto, DNI `75432109`, rango `Teniente`, tipo `null` (para no aparecer en los selectores de instructores de M1), sin grupo, usuario id 12 `raul.paredes` (`raul.paredes@sigeda.com`), `rol: null`. `/auth/login` responde 401 para esta cuenta, como el backend real; CA-SES-08 se prueba reemplazando la respuesta de §1.7 en el test. |
| Personas que no se pueden eliminar | CA-PER-10 | `555555` (tiene `codEvalRealizada`) → B4; `222222` (alumno del turno 2, sin evaluación) → B5; `444444` (instructor de los turnos 1–4) → B6. |
| Propia cuenta | CA-PER-12 | `admin.sistema` ↔ persona `000001`. |
| Materia con preguntas | CA-MAT-04 | La materia 3 (Adoctrinamiento de Vuelo) se marca con preguntas: su `DELETE` responde 409. |
| Ids siguientes | todos | Como las secuencias del seed: usuarios 13, grupos 7, fases 4, subfases 6, maniobras 11, estándares 13, materias 12. |

---

## 8. Dependencias

Numeración de la spec (§10, §13.4 y §14.5).

El frontend habilita cuatro acciones solo cuando su dependencia figura en la variable `VITE_DEPENDENCIAS_RESUELTAS` (spec M2-14): Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33) y Eliminar fase (37). Al desplegar una de estas correcciones, avisar para agregar su número.

| # | Cambio | Sección |
|---|---|---|
| 2 (M0) | Dejar de serializar el hash en `/api/usuarios/nombre/{nombre}`; la amplía la 24 | §2.4 |
| 3 (M0, enmendada en M2) | `PUT /api/usuarios/{id}` solo para la propia cuenta o `Manage Users`; sobre la propia cuenta, `passwordActual` obligatoria; `Manage Users` restablece otra cuenta sin ella | §2.3 |
| 4 | `Manage Groups` solo para Administrador Web: sigue abierta, pero no bloquea M2 (el frontend replica el backend) | Permisos |
| 5 | Catálogo de materias, CRUD y `Manage Subjects` | §6 |
| 18 | `GrupoController.detail` sin `return` (200 con `null`) | §3.2 |
| 19 | Mojibake en `roles` del seed | §2.1, Valores |
| 22 | **Seguridad:** la cuenta se crea con el request (username, correo, password cifrada con BCrypt, rol) en una transacción; hoy la contraseña queda en texto plano y sin rol | §1.3 |
| 23 | Validación de `POST /api/personas`, unicidad del usuario y compatibilidad tipo–rol | §1.3, Valores |
| 24 | **Seguridad:** `Usuario.contraseña` de solo escritura; `@PreAuthorize` en los GET de `/api/usuarios` | §2.2, §2.3, §2.4 |
| 25 | **Seguridad:** `GET /api/personas/{username}` solo para el propio usuario o `Manage Users` | §1.7 |
| 26 | `DetalleUsuario` con `usuario.id`, `estado` y `grupo`; `usuario: null` en lugar de NPE | §1.2 |
| 27 | `IndexPersona` con `tipo` | §1.1 |
| 28 | Compatibilidad tipo–rol al cambiar el tipo o el rol; 404 para un rol inexistente | §1.4, §2.2 |
| 29 | Validación de `username` y `password` en `PUT /api/usuarios/{id}` | §2.3 |
| 30 | `DELETE /api/personas/{cod}` transaccional: sin NPE ni error de FK por refresh token | §1.5 |
| 31 | Grupos: validación, 404 para una persona inexistente y transacción | §3.3, §3.4 |
| 32 | `PUT /api/maniobras/{id}` reemplaza solo los enlaces de la maniobra; mensaje de no encontrado | §5.4 |
| 33 | `GET /api/maniobras/{id}` con `subfases` | §5.2 |
| 34 | `idSubfase` inexistente → 404; FK de `maniobras_subfase` | §5.3, §5.4 |
| 35 | `DELETE /api/maniobras/{id}`: dos reglas con su propio mensaje | §5.6 |
| 36 | Orphan removal de estándares (opcional) | §5.5 |
| 37 | **Pérdida de datos:** sin limpieza global al borrar una fase; negativa 410 al quitar o borrar subfases en uso; FK de turnos, evaluaciones y enlaces hacia `subfases` | §4.4, §4.5 |
| 38 | `descripcion` vacía no borra; `StringToProgramaConverter` convierte a PDI cualquier valor; `usuarios.nombre` sin restricción única | Convenciones, §3, §1.3 |

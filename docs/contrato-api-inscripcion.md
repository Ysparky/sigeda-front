# Contrato API — Inscripción, matrícula y asistencia

**Versión:** 1 · 2026-10-23
**Implementa:** `sigeda-back` (Spring Boot), branch `feat/inscripcion-matricula-asistencia`
**Consume:** `sigeda-web` (tramo de entrada). Los mocks MSW implementan exactamente este documento.

Cubre el **tramo de entrada** del sistema: el embudo público (landing → catálogo → matrícula), la validación por el Coordinador Académico, el seguimiento del Postulante y la asistencia a los turnos prácticos. Es el complemento de `contrato-api-matricula.md` (gestión de personas/programa) y `contrato-api-turnos.md` (operación de vuelo).

Todas las secciones son **Nuevo**: estos endpoints no existían antes de esta rama.

---

## Convenciones

- Prefijo `/api`, `Authorization: Bearer <jwt>`, `401` sin token válido: igual que `contrato-api-turnos.md`.
- **Superficie pública.** `/api/public/**` es la **única** superficie anónima (`SecurityConfig.permitAll` + `JwtAuthorizationFilter` la omite). El resto exige token.
- **Envolturas.** Los datos se devuelven con `Response.showData` = **cuerpo JSON pelado** (objeto o arreglo, sin envoltorio). Las acciones devuelven `{ "mensaje": "…" }` (y campos extra donde se indica). Errores: §A de `contrato-api-turnos.md` (arreglo 400 de `BindingResult` vía `setErrorsFrom`; `409`/regla de negocio en **texto plano** vía `isConflict`; `404` texto plano vía `isNull`/`isEmpty`). `403` por falta de permiso → §B `{"error":"Acceso denegado","message":"No tienes permisos para realizar esta acción"}`.
- **Fechas** `LocalDate` → `"YYYY-MM-DD"`.

### Permisos (roles nuevos)

| Rol | id | Permisos del tramo de entrada |
|---|---|---|
| Coordinador Académico | 6 | `Manage Courses`, `Manage Enrollments`, `Manage Groups`, `Manage Attendance` (+ `Read`, `Update`) |
| Postulante | 7 | `View My Enrollment` (solo) |
| Instructor | 4 | `Manage Attendance` (además de los suyos) |

El **Postulante** se crea al matricularse: `username = correo`, rol 7, `persona.tipo = null`. Al validar la matrícula pasa a **Alumno** (rol 1, `tipo = "Alumno"`, `estado = "Apto"`).

---

## 1 · Catálogo público (landing)

Sin autenticación.

### `GET /api/public/cursos`

Cursos activos. `200` →

```json
[{ "id": 1, "nombre": "Piloto de Helicóptero", "descripcion": "…", "duracion": 220, "requisitos": "…" }]
```

Catálogo vacío → `404` texto plano `"No existen cursos disponibles."` (el frontend lo trata como lista vacía).

### `GET /api/public/cursos/{id}`

Detalle con sus horarios. `200` →

```json
{ "id": 1, "nombre": "…", "descripcion": "…", "duracion": 220, "requisitos": "…",
  "horarios": [{ "id": 1, "nombre": "Turno mañana", "detalle": "Lun, mié y vie 08:00–12:00" }] }
```

Curso inexistente o inactivo → `404` texto plano `"Curso especificada no existe."`

---

## 2 · Matrícula pública (el formulario ES el registro)

### `POST /api/public/matriculas` — `multipart/form-data`

Dos partes: `datos` (`application/json`) y `comprobante` (archivo).

`datos` (`MatriculaSave`, validado):

| Campo | Regla |
|---|---|
| `idCurso` | `@Positive` |
| `dni` | `\d{8}` |
| `nombres`, `aPaterno`, `aMaterno` | obligatorios |
| `correo` | `@Email`; será el `username` de la cuenta |
| `contacto` | opcional |
| `idHorario` | opcional (preferencia de cohorte) |
| `password` | `@Size(min=8)` |

`comprobante`: PDF, JPG o PNG, **≤ 5 MB**. Se guarda como `bytea` (facturación fuera de alcance: solo es un archivo a revisar).

**Éxito** `201` → `{ "mensaje": "Matrícula registrada con éxito.", "matriculaId": 10 }`. Crea, en una transacción, `Persona` + `Usuario` (rol Postulante, contraseña BCrypt) + `Matricula` en estado `PENDIENTE`.

**Errores** (en orden de evaluación):
- `datos` inválidos → `400` §A arreglo `["'dni': …", …]`.
- Comprobante ausente / > 5 MB / tipo no permitido → `400` texto plano del mensaje.
- Curso inexistente → `400` texto plano `"El curso seleccionado no existe."`
- DNI con matrícula viva (PENDIENTE/VALIDADA) en ese curso → `409` `"Ya existe una matrícula para este DNI en el curso."`
- Correo ya registrado → `409` `"El correo ya está registrado."`

Un índice único parcial `ux_matriculas_dni_curso_vivas (dni, id_curso) where estado in ('PENDIENTE','VALIDADA')` respalda la regla del DNI; una matrícula `RECHAZADA` deja el par libre.

---

## 3 · Bandeja del Coordinador — `Manage Enrollments`

### `GET /api/matriculas?estado=PENDIENTE|VALIDADA|RECHAZADA`

`estado` opcional (sin él, todas). `200` → arreglo de `MatriculaIndex` (sin el comprobante):

```json
[{ "id": 1, "idCurso": 1, "dni": "71111111", "nombres": "Rosa", "aPaterno": "Quispe",
   "aMaterno": "Huaman", "correo": "rosa@correo.com", "fecha": "2026-10-20", "estado": "PENDIENTE" }]
```

Bandeja vacía → `200 []`. Sin permiso → `403`.

### `GET /api/matriculas/{id}`

`200` → `MatriculaDetalle` = los campos de arriba + `contacto`, `idHorario`, `comprobanteTipo`, `motivoRechazo`, `codPersona`. Inexistente → `404` `"Matrícula especificada no existe."`

### `GET /api/matriculas/{id}/comprobante`

`200` con `Content-Type` del comprobante y el archivo como cuerpo binario. Sin comprobante → `404`. (El frontend lo descarga con el token y lo abre como object URL; no se puede `<img src>`.)

### `PUT /api/matriculas/{id}/validar`

Promueve al Postulante a **Alumno** (rol 1, `tipo="Alumno"`, `estado="Apto"`) y deja la matrícula `VALIDADA`. `200` → `{ "mensaje": "Matrícula validada con éxito." }`. Si no está `PENDIENTE` → `409` `"La matrícula ya fue procesada."`

### `PUT /api/matriculas/{id}/rechazar` — JSON `{ "motivo": "…" }`

`motivo` obligatorio. Deja la matrícula `RECHAZADA` con el motivo. `200` → `{ "mensaje": "Matrícula rechazada." }`. Validación → `400` §A. No `PENDIENTE` → `409`.

---

## 4 · Mi matrícula (Postulante) — `View My Enrollment`

### `GET /api/matriculas/mia`

La matrícula de la cuenta que llama (por `codPersona`). `200` → `MatriculaDetalle`. Sin matrícula → `404`.

### `PUT /api/matriculas/mia` — `multipart/form-data` (`comprobante`)

Re-envío tras un rechazo: adjunta un comprobante nuevo (mismas reglas de archivo) y la matrícula vuelve a `PENDIENTE`. `200` → `{ "mensaje": "Comprobante reenviado; tu matrícula volvió a estar pendiente." }`. Si ya está `VALIDADA` → `409` `"Una matrícula validada no se puede modificar."`

---

## 5 · Asistencia a turnos prácticos — `Manage Attendance`

La asistencia teórica se lleva aparte (`inasistencias_teoricas`, `contrato-api-teoria.md`). La clave de `asistencias` es `(tipo_turno, id_turno, cod_alumno)`; hoy `tipo_turno = "PRACTICO"`.

### `GET /api/turnos/{id}/asistencia`

El roster del turno con el estado de cada alumno. `200` →

```json
[{ "codAlumno": "A00001", "nombres": "Ana", "aPaterno": "Alfa", "aMaterno": "Uno", "estado": "PRESENTE" }]
```

`estado` ∈ `PRESENTE | AUSENTE | JUSTIFICADA`, o `null` si nadie lo marcó aún.

### `PUT /api/turnos/{id}/asistencia` — JSON `[{ "codAlumno": "A00001", "estado": "PRESENTE" }]`

Upsert idempotente por la clave compuesta: volver a marcar al mismo alumno actualiza su fila. `200` → `{ "mensaje": "Asistencia registrada con éxito." }`.

---

## 6 · Reporte de asistencia — `Create Reports` o `Manage Attendance`

### `GET /api/asistencia/reporte?grupo={id}` | `?curso={id}`

Por alumno del grupo (o de los grupos del curso). `200` →

```json
[{ "codAlumno": "R00001", "nombre": "Riesgo Uno, Rita", "sesiones": 10, "faltas": 4,
   "porcentajeInasistencia": 40, "condicion": "EN_RIESGO" }]
```

- `sesiones` = turnos prácticos con marca; `faltas` = `AUSENTE`.
- `porcentajeInasistencia` = `round(faltas·100 / sesiones)`; **cero sesiones → 0 %** (no divide por cero).
- `condicion` = `"EN_RIESGO"` sii el porcentaje **> 30 %**, si no `"REGULAR"`. Es una **etiqueta de solo lectura**: no toca `persona.estado`.

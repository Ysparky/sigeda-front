# Inscripción, Matrícula y Asistencias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir el tramo de entrada al sistema — landing pública con catálogo, matrícula self-service con validación manual del comprobante por el Coordinador Académico, y control de asistencia por sesión — integrado sobre el curso de Helicóptero existente.

**Architecture:** Backend Spring Boot con tres paquetes nuevos (`curso`, `matricula`, `asistencia`) que siguen el patrón `entities/dtos/dao/services/controllers` de `grupo`/`turno`; reusa la lógica de alta Persona+Usuario de `POST /api/personas`. Frontend React en `sigeda-web` con rutas **públicas** (landing + matrícula) junto a `login.tsx` y pantallas autenticadas nuevas en `src/features/{inscripcion,matriculas,asistencias}`. El landing NO es un sitio aparte (Astro/Next descartados en el diseño §10).

**Tech Stack:** Spring Boot 3 / Java 17 / PostgreSQL · React 19 + Vite + TanStack Router/Query + Tailwind · JUnit (unit/integration) · vitest + MSW · Playwright e2e.

**Spec:** `sigeda-web/docs/superpowers/specs/2026-10-23-inscripcion-matricula-asistencia-design.md`

## Global Constraints

- Gestor de paquetes: **pnpm** únicamente (nunca npm/npx).
- Suite back completa: `sh ./mvnw -o test` (sin filtro `-Dtest` para corridas completas); nunca pipe de `mvnw`/`psql` por `head`.
- Todo cambio de datos va en `src/main/resources/data_prod.sql` **y** en la migración incremental correspondiente (`migraciones/025…`), y las pruebas `Semilla*` exigen que converjan. DDL nuevo también en `schema_prod.sql`.
- Perfil dev **recrea la BD** al arrancar (`spring.sql.init.mode=always`). Reseed con TZ Lima: `sh scripts/reiniciar-demo.sh --solo-sigeda --si`.
- Commits Conventional, cortos, **sin** trailer `Co-Authored-By`. Trabajo en rama feature por repo; **no** push salvo que el usuario lo pida. No `pkill` amplio.
- Envolturas de error, paginación y mensajes exactos siguen `contrato-api-turnos.md` / `contrato-api-matricula.md` (§A `Response`, §B `ErrorResponse`). El frontend replica el mapeo rol→permiso en `src/lib/auth/permisos.ts`.
- Próxima migración disponible: **025**. Secuencias del seed: roles arrancan en 6, usuarios 13, grupos 7.

## Review Focus

Entradas/fallos que el spec implica pero que ninguna tarea exercita por defecto; cada línea lleva su test en la tarea dueña:

- **Postulante filtrándose como alumno asignable.** Una Persona pendiente con `tipo="Alumno"` y sin grupo aparecería en `GET /api/personas/alumno/Alumno` (selector de grupos). Debe quedar `tipo=null` hasta validar. → test en T7 y T9.
- **Comprobante inválido.** Archivo > 5 MB o tipo distinto de pdf/jpg/png en el `POST` público → 400, sin crear cuenta. → test en T7.
- **Matrícula duplicada.** Mismo `(dni, curso)` con una matrícula `PENDIENTE`/`VALIDADA` viva → 409, sin crear segunda cuenta. → test en T7.
- **Correo ya registrado.** `POST` público con un correo que ya es `usuarios.nombre` → 409 claro, no 500 por unicidad. → test en T7.
- **Reporte de asistencia sin sesiones.** Alumno con cero turnos → `%` no divide por cero; devuelve 0 %/"sin datos" y condición no-riesgo. → test en T15.

---

## Sub-módulo 1 — Fundaciones + Catálogo/Landing

### Task 1: Entidad `Curso` + esquema + FK `idCurso`

**Files:**
- Create: `sigeda-back/.../curso/entities/Curso.java`, `curso/dao/ICursoDao.java`
- Modify: `grupo/entities/Grupo.java` (+ `Integer idCurso` / `@ManyToOne Curso`), `maniobra/entities/Fase.java` (+ `idCurso`)
- Modify DDL: `schema_prod.sql` (tabla `cursos`, columnas `idCurso` en `grupos` y `fases`), `data_prod.sql` (1 curso + backfill), `migraciones/025-curso-helicoptero.sql`
- Test: `unit_test/EsquemaCursoTest.java`, y extender la prueba `Semilla*` que compara data_prod↔migraciones

**Interfaces:**
- Produces: `Curso{ int id; String nombre; String descripcion; int duracion; String requisitos; boolean activo; }`; tabla `cursos`; `grupos.idCurso`, `fases.idCurso` (FK → `cursos.id`).

- [ ] **Step 1 — test:** `EsquemaCursoTest`: tras cargar el seed, existe exactamente 1 curso (`Piloto de Helicóptero`, duracion=220) y **toda** fila de `grupos` y `fases` tiene `idCurso` = ese curso (no nulos).
- [ ] **Step 2 — run, expect FAIL** (`sh ./mvnw -o test -Dtest=EsquemaCursoTest`).
- [ ] **Step 3 — implementar:** entidad `Curso` (secuencia `cursos_seq` initialValue 2), FK en `Grupo`/`Fase`; DDL en `schema_prod.sql`; INSERT del curso + `UPDATE grupos/fases SET idCurso=1` en `data_prod.sql` y en `025-curso-helicoptero.sql` (idéntico).
- [ ] **Step 4 — run, expect PASS**; correr `Semilla*` para confirmar convergencia.
- [ ] **Step 5 — commit** (`feat(curso): entidad Curso e integración del programa de Helicóptero`).

### Task 2: Entidad `Horario` (franjas de cohorte)

**Files:** Create `curso/entities/Horario.java`, `curso/dao/IHorarioDao.java`; DDL en `schema_prod.sql` + `data_prod.sql` + `025…`; Test `EsquemaCursoTest` (extender).

**Interfaces:** Produces `Horario{ int id; int idCurso; String nombre; String detalle; boolean activo; }`; tabla `horarios`.

- [ ] **Step 1 — test:** el seed tiene ≥2 horarios activos del curso 1 (p. ej. "Mañana L-M-V", "Tarde Ma-J").
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** entidad + DDL + seed (data_prod y migración).
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(curso): horarios de cohorte`).

### Task 3: Roles `Coordinador Académico` y `Postulante` + permisos

**Files:**
- Modify: `security/entities/Permission.java` (nuevos `MANAGE_COURSES`, `MANAGE_ENROLLMENTS`, `MANAGE_ATTENDANCE`, `VIEW_MY_ENROLLMENT`), `security/entities/Role.java` (entradas `CoordinadorAcademico`, `Postulante`; añadir `MANAGE_ATTENDANCE` a `Instructor`; helpers `es*`), `security/entities/Rol.java` (`asignarPermisos`)
- Modify DDL: `schema_prod.sql`/`data_prod.sql`/`025…` (roles id 6 y 7)
- Modify: `sigeda-web/src/lib/auth/permisos.ts`
- Test: `unit_test/PermisosDeclaradosTest.java` (extender), `sigeda-web/src/lib/auth/permisos.test.ts` si existe

**Interfaces:** Produces roles id 6 `Coordinador Académico`, id 7 `Postulante`; permisos nuevos consumidos por T4, T8, T9, T14, T15.

- [ ] **Step 1 — test:** `PermisosDeclaradosTest`: `Coordinador Académico` tiene `MANAGE_COURSES, MANAGE_ENROLLMENTS, MANAGE_GROUPS, MANAGE_ATTENDANCE, CREATE_REPORTS, READ, VIEW_ALL_GROUPS`; `Postulante` tiene solo `VIEW_MY_ENROLLMENT`; `Instructor` gana `MANAGE_ATTENDANCE`.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** enums + seed de roles + `permisos.ts`.
- [ ] **Step 4 — run, expect PASS** (back) y `pnpm test` del archivo de permisos (web).
- [ ] **Step 5 — commit** (`feat(security): roles Coordinador Académico y Postulante`).

### Task 4: Endpoints públicos de catálogo

**Files:** Create `curso/controllers/CursoPublicoController.java`, `curso/dtos/CursoCatalogo.java`, `curso/dtos/CursoDetalle.java`, `curso/services/CursoService(+Impl).java`; permitir rutas `/api/public/**` sin auth en la config de seguridad (`security/...SecurityConfig`). Test `integration_test/CatalogoPublicoControllerTest.java`.

**Interfaces:**
- Produces: `GET /api/public/cursos` → `200 List<CursoCatalogo{id,nombre,descripcion,duracion,requisitos}>` (solo `activo`); `GET /api/public/cursos/{id}` → `200 CursoDetalle{…,horarios:[{id,nombre,detalle}]}`; 404 §A `"Curso especificado no existe."`. **Sin** `Authorization`.

- [ ] **Step 1 — test:** `GET /api/public/cursos` **sin token** → 200 con el curso de Helicóptero; `/{id}` → trae horarios activos; id inexistente → 404.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** controller+service+DTOs; abrir `/api/public/**` en la cadena de seguridad.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(curso): catálogo público de cursos`).

### Task 5: Web — shell de rutas públicas + landing

**Files:** Create `sigeda-web/src/features/inscripcion/` (componentes landing), `src/routes/index.tsx` o `src/routes/_publico.tsx` + `_publico/` (landing en `/`, `/cursos`), cliente `src/features/inscripcion/api.ts`, mocks MSW en el handler existente. Test `*.test.tsx` del landing + mock.

**Interfaces:** Consume `GET /api/public/cursos(/{id})` (T4). Produces rutas públicas `/` (landing con catálogo) y botón "Inscribirme" → `/matricula` (T11).

- [ ] **Step 1 — test:** render del landing muestra las tarjetas de curso (nombre, duración, requisitos) desde el mock; el botón "Inscribirme" enlaza a `/matricula`.
- [ ] **Step 2 — run, expect FAIL** (`pnpm test`).
- [ ] **Step 3 — implementar** landing + ruta pública; mover el `/` autenticado si colisiona (login como enlace). Añadir handler MSW de `/api/public/cursos`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(inscripcion): landing pública con catálogo`).

---

## Sub-módulo 2 — Matrícula + validación

### Task 6: Entidad `Matrícula` + esquema

**Files:** Create `matricula/entities/Matricula.java`, `matricula/entities/EstadoMatricula.java` (`PENDIENTE|VALIDADA|RECHAZADA`), `matricula/dao/IMatriculaDao.java`; DDL `matriculas` con `comprobante bytea`, `comprobante_tipo`, `motivo_rechazo`, FK `idCurso`, `idHorario`, `codPersona`; en `schema_prod.sql` (data_prod/migración no siembran filas de matrícula). Test `EsquemaMatriculaTest`.

**Interfaces:** Produces `Matricula{ int id; int idCurso; String dni,nombres,aPaterno,aMaterno,correo,contacto; Integer idHorario; LocalDate fecha; EstadoMatricula estado; byte[] comprobante; String comprobanteTipo; String motivoRechazo; String codPersona; }`; índice único parcial `(dni, idCurso) WHERE estado IN (PENDIENTE,VALIDADA)`.

- [ ] **Step 1 — test:** cargar esquema; insertar dos matrículas mismo `(dni,curso)` ambas `PENDIENTE` viola el índice único; una `RECHAZADA` + una `PENDIENTE` conviven.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** entidad + enum + DDL + índice único parcial.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(matricula): entidad y esquema de matrícula`).

### Task 7: `POST /api/public/matriculas` (alta self-service)

**Files:** Create `matricula/controllers/MatriculaPublicaController.java`, `matricula/dtos/MatriculaSave.java`, `matricula/services/MatriculaService(+Impl).java`; reusa el alta Persona+Usuario (extraer helper de `PersonaServiceImpl` si hace falta). Test `integration_test/MatriculaPublicaControllerTest.java`.

**Interfaces:**
- Consumes: generador de `codigo` de Persona (§9-F — implementar generación única 6-alfanum), BCrypt, `CursoDao`, `HorarioDao`.
- Produces: `POST /api/public/matriculas` **multipart** (`datos` JSON + `comprobante` file) **sin token** → `201 {mensaje, matriculaId}`. Crea en **una transacción**: `Persona{estado="Pendiente", tipo=null}` + `Usuario{nombre=correo, correo, BCrypt(password), rol=7}` + `Matricula{estado=PENDIENTE}`.

- [ ] **Step 1 — tests (Review Focus):** (a) alta feliz → 201, persona con `tipo=null`/`estado="Pendiente"`, usuario rol 7, matrícula PENDIENTE; (b) `GET /api/personas/alumno/Alumno` **no** devuelve al nuevo postulante; (c) comprobante > 5 MB o tipo `txt` → 400 sin crear nada; (d) `(dni,curso)` ya PENDIENTE → 409; (e) correo ya en `usuarios.nombre` → 409 (no 500).
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** controller multipart + validaciones (DNI 8, correo, password ≥8, tamaño/tipo archivo) + transacción + generación de `codigo`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(matricula): alta pública de matrícula con comprobante`).

### Task 8: Bandeja del Coordinador — listado y detalle

**Files:** Create `matricula/dtos/MatriculaIndex.java`, `MatriculaDetalle.java`; endpoints en `MatriculaController.java` (autenticado). Test `integration_test/MatriculaCoordinadorControllerTest.java`.

**Interfaces:**
- Produces: `GET /api/matriculas?estado=&page=&size=` (`MANAGE_ENROLLMENTS`) → `Page<MatriculaIndex>`; `GET /api/matriculas/{id}` → `MatriculaDetalle`; `GET /api/matriculas/{id}/comprobante` → bytes con su `Content-Type`.

- [ ] **Step 1 — test:** listar filtrando `estado=PENDIENTE`; detalle trae datos; comprobante devuelve los bytes/tipo; sin `MANAGE_ENROLLMENTS` → 403 §B.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** endpoints + `@PreAuthorize`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(matricula): bandeja del coordinador`).

### Task 9: `validar` y `rechazar`

**Files:** Modify `MatriculaController`/service; DTO `RechazoSave{motivo}`. Test `MatriculaCoordinadorControllerTest` (extender).

**Interfaces:**
- Produces: `PUT /api/matriculas/{id}/validar` (`MANAGE_ENROLLMENTS`) → promueve: `Persona.tipo="Alumno"`, `estado="Apto"`, `Usuario.rol=1`, `Matricula.estado=VALIDADA`; **no** asigna grupo. `PUT /api/matriculas/{id}/rechazar` body `{motivo}` → `estado=RECHAZADA`, guarda `motivoRechazo`.

- [ ] **Step 1 — tests:** tras validar, la persona **sí** aparece en `GET /api/personas/alumno/Alumno` (ahora es alumno sin grupo) y su cuenta puede iniciar sesión como Alumno; rechazar guarda motivo y deja `RECHAZADA`; validar una ya validada → 409/410.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** transiciones (reusa la mecánica de cambio de rol §2.2 del contrato).
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(matricula): validar y rechazar matrícula`).

### Task 10: Vista del postulante (`mia`) + re-envío

**Files:** Modify `MatriculaController`/service. Test `integration_test/MatriculaMiaControllerTest.java`.

**Interfaces:**
- Produces: `GET /api/matriculas/mia` (`VIEW_MY_ENROLLMENT`, por `authentication.name`=correo) → estado + motivoRechazo; `PUT /api/matriculas/mia` multipart → si `RECHAZADA`, re-sube comprobante/corrige y vuelve a `PENDIENTE`.

- [ ] **Step 1 — test:** el postulante lee su matrícula; `PUT` sobre una `RECHAZADA` la vuelve `PENDIENTE` con nuevo comprobante; `PUT` sobre `VALIDADA` → 409.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar.**
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(matricula): vista del postulante y re-envío`).

### Task 11: Web — formulario público + "mi matrícula"

**Files:** Create en `src/features/inscripcion/`: `formulario-matricula.tsx`, `mi-matricula.tsx`; ruta pública `/matricula` y ruta autenticada mínima para postulante; cliente API + MSW. Tests `*.test.tsx`.

**Interfaces:** Consume T4 (horarios), T7 (`POST`), T10 (`mia`, `PUT mia`).

- [ ] **Step 1 — tests:** el formulario valida (DNI 8, correo, password ≥8, archivo requerido), envía multipart y redirige a "mi matrícula: pendiente"; estado `rechazada` muestra el motivo y permite re-subir.
- [ ] **Step 2 — run, expect FAIL** (`pnpm test`).
- [ ] **Step 3 — implementar** formulario + vista + handlers MSW.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(inscripcion): formulario de matrícula y seguimiento`).

### Task 12: Web — bandeja del Coordinador

**Files:** Create `src/features/matriculas/` (lista + detalle con visor de comprobante + validar/rechazar); rutas autenticadas; menú/nav para el rol Coordinador. Tests `*.test.tsx` + MSW.

**Interfaces:** Consume T8, T9. El armado de grupos usa la pantalla de `src/features/grupos` existente (solo añadir, si falta, filtro por curso).

- [ ] **Step 1 — tests:** la bandeja lista pendientes, abre detalle con el comprobante, valida (desaparece de la lista) y rechaza con motivo; sin permiso, la ruta no es visible.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** pantallas + nav por permiso + handlers MSW.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(matriculas): bandeja del coordinador académico`).

---

## Sub-módulo 3 — Asistencias

### Task 13: Entidad `Asistencia` + esquema

**Files:** Create `asistencia/entities/Asistencia.java` (`@IdClass`), `asistencia/entities/idAsistencia.java`, `asistencia/entities/EstadoAsistencia.java` (`PRESENTE|AUSENTE|JUSTIFICADA`), `asistencia/dao/IAsistenciaDao.java`; DDL `asistencias` clave `(tipoTurno, idTurno, codAlumno)`; `schema_prod.sql`. Test `EsquemaAsistenciaTest`.

**Interfaces:** Produces `Asistencia{ String tipoTurno; int idTurno; String codAlumno; LocalDate fecha; EstadoAsistencia estado; }`; cubre **solo turnos prácticos** (la teoría se lee de `inasistencias_teoricas`).

- [ ] **Step 1 — test:** esquema carga; clave compuesta única.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** entidad + idClass + DDL.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(asistencia): entidad y esquema`).

### Task 14: Registro de asistencia por turno

**Files:** Create `asistencia/controllers/AsistenciaController.java`, `asistencia/dtos/AsistenciaSave.java`, `asistencia/services/AsistenciaService(+Impl).java`. Test `integration_test/AsistenciaControllerTest.java`.

**Interfaces:** Produces `GET /api/turnos/{id}/asistencia` → alumnos del turno con su estado (default AUSENTE/sin marca); `PUT /api/turnos/{id}/asistencia` (`MANAGE_ATTENDANCE`) body lista `[{codAlumno, estado}]` → upsert idempotente.

- [ ] **Step 1 — test:** marcar presencia de los alumnos de un turno práctico sembrado; PUT idempotente; sin `MANAGE_ATTENDANCE` → 403.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar.**
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(asistencia): registro por turno`).

### Task 15: Reportes de asistencia

**Files:** Modify `AsistenciaController`/service; DTO `ReporteAsistencia{codAlumno, nombre, sesiones, faltas, porcentajeInasistencia, condicion}`. Test `AsistenciaControllerTest` (extender).

**Interfaces:** Produces `GET /api/asistencia/reporte?grupo=|curso=` (`CREATE_REPORTS`/`MANAGE_ATTENDANCE`) → por alumno: % inasistencia (práctico) + lectura de `inasistencias_teoricas`, `faltas`, y `condicion="EN_RIESGO"` sii inasistencia **> 30 %** (etiqueta de solo lectura; **no** toca `persona.estado`).

- [ ] **Step 1 — tests:** alumno con 4/10 faltas → `40%`, condición `EN_RIESGO`; con 2/10 → no riesgo; **cero sesiones → 0 %, no divide por cero, no riesgo** (Review Focus).
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar** cálculo (guardas contra 0 sesiones).
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(asistencia): reportes y condición académica`).

### Task 16: Web — registro de asistencia (instructor)

**Files:** Create `src/features/asistencias/registro.tsx` + ruta autenticada; cliente + MSW. Tests `*.test.tsx`.

**Interfaces:** Consume T14.

- [ ] **Step 1 — test:** lista los alumnos del turno, permite marcar presente/ausente y guarda; visible solo con `MANAGE_ATTENDANCE`.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar.**
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(asistencias): registro por el instructor`).

### Task 17: Web — reportes de asistencia

**Files:** Create `src/features/asistencias/reporte.tsx` + ruta; cliente + MSW. Tests `*.test.tsx`.

**Interfaces:** Consume T15.

- [ ] **Step 1 — test:** muestra % y faltas por alumno y resalta condición `EN_RIESGO` (>30 %).
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implementar.**
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** (`feat(asistencias): reporte de % y condición`).

---

## Cierre

### Task 18: Contrato de API + convergencia de seed + suite completa

**Files:** Create `sigeda-web/docs/contrato-api-inscripcion.md` (catálogo público, matrícula, validación, asistencia — forma exacta de request/response y errores, estilo de los otros contratos). Verificar `data_prod.sql`↔`migraciones` y correr todo.

- [ ] **Step 1:** redactar `contrato-api-inscripcion.md` a partir de lo implementado (T4–T15).
- [ ] **Step 2:** reseed Lima (`sh scripts/reiniciar-demo.sh --solo-sigeda --si`) y **suite back completa** `sh ./mvnw -o test` → todo verde, incluidas `Semilla*`.
- [ ] **Step 3:** `pnpm test` en sigeda-web → todo verde.
- [ ] **Step 4 — commit** (`docs(inscripcion): contrato de API del tramo de entrada`).
- [ ] **Step 5:** revisión de rama completa (reviewer fresco) antes de considerar terminado.

## Self-Review (hecho)

- **Cobertura del spec:** Curso/Horario (T1–T2), roles (T3), catálogo+landing (T4–T5), matrícula pública+validación+re-envío (T6–T12), asistencia+reportes (T13–T17), contrato+seed (T18). ✔
- **Review Focus:** las 5 entradas tienen test en su tarea dueña (T7 ×4, T15 ×1). ✔
- **Consistencia de tipos:** `tipo=null` hasta validar (T7/T9), `Matricula`/`EstadoMatricula` y `Asistencia`/`EstadoAsistencia` usados igual en back y consumidos por los DTOs del front. ✔
- **Integración de riesgo:** auditoría de consumidores de `estado`/`tipo` cubierta por el test (b) de T7 y el test de T9. ✔

# Flujo integrado del demo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) para implementar este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Que un admitido se matricule automáticamente a la cohorte en inscripción de su convocatoria, modelando el ciclo de vida de la cohorte (`grupos.estado`), para cerrar el seam entrada→desarrollo en la rama de integración.

**Architecture:** La promoción postulante→Alumno ya existe en `MatriculaServiceImpl.registrarResultado` (ADMITIDO ⇒ `tipo="Alumno"`, `rol=Alumno`). Se añade: (1) `grupos` gana ciclo de vida (`estado` EN_INSCRIPCION/EN_PROGRESO/CERRADA + fechas), (2) `convocatorias` designa su cohorte (`id_grupo`), (3) al admitir, matricular a esa cohorte si está EN_INSCRIPCION. Simulador y nota académica intactos.

**Tech Stack:** Spring Boot 3.4.2 / Java 17 (sin Lombok), JPA, H2 en test / PostgreSQL en prod (ddl-auto=none, migraciones + schema_prod.sql). React 19 / TanStack Router+Query / MSW / vitest. Playwright e2e contra el stack real.

**Spec:** `docs/superpowers/specs/2026-10-31-flujo-integrado-demo-design.md`

## Global Constraints
- pnpm únicamente (nunca npm/npx).
- `mvnw` offline: `export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home` y `sh ./mvnw` (no ejecutable). Nunca pipe de `mvnw`/`psql` por `head`.
- **Solo commit — sin push ni merge.** Conventional Commits cortos, **sin** trailer `Co-Authored-By`.
- Terminología militar intencional (no quitar). No levantar el dev server del frontend (el e2e lo gestiona Playwright, que levanta/mata su propio Vite).
- Rama: `feat/integracion-demo` en ambos repos.
- La cohorte es solo `estado` + fechas: **no** se modelan horarios ni turnos mañana/tarde. Duración del curso 81–120 días (informativo para las fechas de seed).

## Review Focus
- **Admitir con cohorte NO EN_INSCRIPCION** (en progreso/cerrada): debe rechazarse (no se matricula a una cohorte que ya arrancó). → test en Tarea 2.
- **Convocatoria sin `id_grupo` (null)**: ADMITIDO promueve a Alumno sin grupo, sin error (compat hacia atrás, y matrícula directa sin convocatoria). → test en Tarea 2.
- **Orden de FK en schema_prod**: `convocatorias` se crea ANTES que `grupos`, así que la FK `convocatorias→grupos` NO puede ser inline; va diferida tras crear `grupos`. H2 es ciego a esto. → verificado por aplicar 035 en PG (Tarea 1) y revisión del esquema.
- **Idempotencia de la migración 035** (ALTERs repetibles sin error). → Tarea 1 la aplica dos veces en PG.
- **CHECK de `grupos.estado`** rechaza un estado inválido en PostgreSQL (H2 ciego al CHECK). → verificado al aplicar 035 en PG (Tarea 1).

---

### Tarea 1: Esquema de cohorte (migración 035 + schema_prod + convergencia)

**Files:**
- Create: `src/main/resources/migraciones/035-cohorte.sql`
- Modify: `src/main/resources/schema_prod.sql` (bloques `grupos` ~536 y `convocatorias` ~402; sección de constraints diferidas ~836)
- Test: `src/test/java/unit_test/EsquemaCohorteTest.java`

**Interfaces:**
- Produces: columnas `grupos.estado` (varchar, CHECK EN_INSCRIPCION/EN_PROGRESO/CERRADA), `grupos.fecha_inicio`, `grupos.fecha_fin` (date); `convocatorias.id_grupo` (integer, FK a grupos). Las consumen Tareas 2 (entidades) y 3 (seed).

- [ ] **Paso 1: Escribir `EsquemaCohorteTest`** (modelado en `EsquemaSimuladorTest`): lee `schema_prod.sql` y `migraciones/035-cohorte.sql` en minúsculas y asevera que AMBAS fuentes mencionan: `grupos` con `estado` y el CHECK `en_inscripcion`/`en_progreso`/`cerrada`, `fecha_inicio`, `fecha_fin`; y `convocatorias` con `id_grupo` y una FK `references grupos`.
- [ ] **Paso 2: Correr el test → FALLA** (`sh ./mvnw -o test -Dtest=EsquemaCohorteTest`). Expected: FAIL (ni la migración ni el esquema tienen las columnas).
- [ ] **Paso 3: Escribir `035-cohorte.sql`** idempotente (cabecera `\set ON_ERROR_STOP on`, `SET client_encoding`, `BEGIN;`/`COMMIT;` como 032): `alter table if exists public.grupos add column if not exists estado varchar(255)`; agregar CHECK de estado vía `drop constraint if exists`+`add constraint`; `add column if not exists fecha_inicio date`, `fecha_fin date`; `alter table if exists public.convocatorias add column if not exists id_grupo integer`; FK diferida `drop constraint if exists FK_convocatorias_grupos`+`add constraint ... foreign key (id_grupo) references grupos`.
- [ ] **Paso 4: Editar `schema_prod.sql`**: en `create table public.grupos` añadir `estado varchar(255) check (estado in ('EN_INSCRIPCION','EN_PROGRESO','CERRADA'))`, `fecha_inicio date`, `fecha_fin date`; en `create table public.convocatorias` añadir `id_grupo integer` (SIN FK inline); en la sección de constraints diferidas (tras crear `grupos`, ~836) añadir `alter table ... add constraint FK_convocatorias_grupos foreign key (id_grupo) references grupos`.
- [ ] **Paso 5: Correr `EsquemaCohorteTest` → PASA.**
- [ ] **Paso 6: Verificar 035 en PostgreSQL desechable** (Docker): levantar `postgres:16`, aplicar `schema_prod.sql` (o solo los CREATE de cursos+grupos+convocatorias) y luego `035-cohorte.sql` DOS veces con `-v ON_ERROR_STOP=1`. Expected: ambas aplicaciones exit 0 (idempotente); un `insert into grupos(...estado) values(...,'XXX')` es rechazado por el CHECK; un `insert into convocatorias(... id_grupo) values(..., 999)` es rechazado por la FK. Borrar el contenedor al terminar.
- [ ] **Paso 7: Correr la suite completa** (`sh ./mvnw -o test`) y **commit**.

---

### Tarea 2: Entidades, enum y enganche al admitir

**Files:**
- Create: `src/main/java/com/sigeda/backend/grupo/entities/EstadoCohorte.java`
- Modify: `src/main/java/com/sigeda/backend/grupo/entities/Grupo.java`; `src/main/java/com/sigeda/backend/convocatoria/entities/Convocatoria.java`; `src/main/java/com/sigeda/backend/matricula/services/MatriculaServiceImpl.java`
- Test: `src/test/java/integration_test/MatriculaAdmisionControllerTest.java` (extender); fixture `src/test/resources/matricula/admision.sql` (extender)

**Interfaces:**
- Consumes: columnas de Tarea 1 (vía H2 desde las entidades).
- Produces: enum `EstadoCohorte{EN_INSCRIPCION,EN_PROGRESO,CERRADA}`; `Grupo.getEstado()/setEstado(EstadoCohorte)`, `getFechaInicio/Fin`; `Convocatoria.getIdGrupo()/setIdGrupo(Integer)`. Regla de admisión en `registrarResultado`.

- [ ] **Paso 1: Escribir los tests de admisión** (extender `MatriculaAdmisionControllerTest`, estilo existente con `@Sql` y tokens de `Credenciales`). Tres casos, con fixture que siembre una convocatoria con cohorte `EN_INSCRIPCION`, otra sin `id_grupo`, y una cohorte `EN_PROGRESO`:
  - `admitirMatriculaEnConvocatoriaConCohorteEnInscripcionMatriculaAlGrupo`: tras `POST .../resultado` ADMITIDO, la persona queda `tipo=Alumno` y con `id_grupo` = esa cohorte (verificar vía endpoint de la persona/alumnos o consulta del detalle).
  - `admitirSinCohorteNoAsignaGrupoYNoFalla`: convocatoria con `id_grupo` null → 200/ok, persona Alumno sin grupo.
  - `admitirAUnaCohorteNoEnInscripcionEs409`: convocatoria cuyo `id_grupo` apunta a un grupo `EN_PROGRESO` → `ConflictException`/409 y la persona NO queda matriculada a ese grupo.
- [ ] **Paso 2: Correr los tests → FALLAN** (las entidades no tienen los campos; el servicio no engancha). Expected: FAIL de compilación/aserción.
- [ ] **Paso 3: Crear `EstadoCohorte`** (enum simple, estilo `EstadoConvocatoria`).
- [ ] **Paso 4: Añadir a `Grupo`** `@Enumerated(EnumType.STRING) EstadoCohorte estado`, `LocalDate fechaInicio`, `LocalDate fechaFin` con sus accesores (sin Lombok).
- [ ] **Paso 5: Añadir a `Convocatoria`** `Integer idGrupo` (escalar, como `idCurso`) con getter/setter.
- [ ] **Paso 6: Enganche en `MatriculaServiceImpl.registrarResultado`**, dentro del bloque `resultado == ADMITIDO`, tras la promoción: obtener `Convocatoria` por `m.getIdConvocatoria()` (vía `convocatoriaDao`, ya autowired); si `conv != null && conv.getIdGrupo() != null`: cargar el `Grupo` (vía `IGrupoService`/`IGrupoDao`, inyectar); si `grupo.getEstado() != EN_INSCRIPCION` lanzar `ConflictException("La cohorte destino no está abierta a inscripción.")`; si no, `persona.setGrupo(grupo)` (el escalar `idGrupo` de Persona es read-only; se asigna por la asociación) y guardar. Si no hay convocatoria o no tiene `idGrupo`, no asignar grupo.
- [ ] **Paso 7: Correr los tests → PASAN.**
- [ ] **Paso 8: Suite completa** (`sh ./mvnw -o test`) y **commit**.

---

### Tarea 3: Semilla del demo (cohorte 2026-I)

**Files:**
- Modify: `src/main/resources/data_prod.sql` (INSERT de `grupos` ~292; INSERT de `convocatorias` ~8; el UPDATE que fija `id_curso` de los grupos)
- Test: si existe `SemillaConvocatoriaTest`/semilla, extender una aserción mínima; si no, la verificación es el arranque (Paso 3).

**Interfaces:**
- Consumes: esquema de Tarea 1, entidades de Tarea 2.

- [ ] **Paso 1: Editar `data_prod.sql`**: añadir al INSERT de `grupos` las columnas `estado` (y `id_curso` si el INSERT no lo trae) — grupos 1–6 con `estado='EN_PROGRESO'`; añadir fila `(7, 'Promoción 2026-I', 'PDI', 'Cohorte en formación — Admisión 2026-I', id_curso=1, 'EN_INSCRIPCION', fecha_inicio/fin ~ventana)`. Mantener el reseteo de `grupos_seq` coherente (próxima > 7). Ajustar el UPDATE de `id_curso` para incluir al grupo 7 si aplica.
- [ ] **Paso 2: Apuntar la convocatoria 1 a la cohorte**: en su INSERT, añadir `id_grupo` a la lista de columnas y `7` al VALUES.
- [ ] **Paso 3: Verificar la semilla contra PostgreSQL desechable**: sobre el PG con `schema_prod`+`035`, aplicar `data_prod.sql` con `-v ON_ERROR_STOP=1`. Expected: exit 0; `select estado from grupos where id=7` → `EN_INSCRIPCION`; `select id_grupo from convocatorias where id=1` → `7`. Borrar el contenedor.
- [ ] **Paso 4:** si hay test de semilla, correrlo; **commit**.

---

### Tarea 4 (web): Mostrar la cohorte destino y su estado en la admisión

**Files:**
- Modify: el feature de convocatorias/admisión en `src/features/convocatorias/` (tipos/esquema `Convocatoria` para incluir `idGrupo`/cohorte; la vista de detalle de convocatoria y/o la bandeja de admisión del Coordinador)
- Modify: el mock `src/mocks/sigeda/` correspondiente a convocatorias/admisión
- Test: el `.test.tsx` del feature (extender)

**Interfaces:**
- Consumes: el backend ahora expone `idGrupo`/cohorte en la convocatoria y, tras admitir, el alumno tiene grupo.

- [ ] **Paso 1: Escribir el test** (vitest + MSW): en el detalle de la convocatoria (o la vista de admisión), se muestra la **cohorte destino** y su **estado** (EN_INSCRIPCION). Mock devuelve la convocatoria con su cohorte.
- [ ] **Paso 2: Correr → FALLA.**
- [ ] **Paso 3: Implementar**: extender el tipo/esquema `Convocatoria` (zod) con la cohorte/`idGrupo`; mostrarla en la UI; actualizar el mock. Alcance mínimo; si el backend no devuelve el nombre/estado de la cohorte en el detalle de convocatoria, añadir ese dato al DTO del backend (pequeño) o derivarlo — decidir aquí y dejar `Ruling:` si se desvía.
- [ ] **Paso 4: Correr → PASA.**
- [ ] **Paso 5:** `pnpm typecheck && pnpm lint`; tests del feature (por directorio, no la suite completa por la flakiness de workers). **Commit.**

---

### Tarea 5 (e2e): Flujo continuo contra el stack real

**Files:**
- Modify/Create: `e2e/` — extender `inscripcion.spec.ts` o crear `e2e/flujo-integrado.spec.ts`

**Interfaces:**
- Consumes: backend de la rama `feat/integracion-demo` (con Tareas 1–3) corriendo en 8080 sobre `sigeda_demo` migrada; seed con convocatoria 1 → cohorte 7.

- [ ] **Paso 1: Prerrequisito de entorno** (no es código): el backend del demo debe ser el de esta rama con el esquema/seed nuevos. Documentarlo en el spec; durante la ejecución, reconstruir/reiniciar el back del demo desde `feat/integracion-demo` y aplicar 035 + re-sembrar `sigeda_demo` (o levantar con la base recreada). Si no se puede reconstruir el back en esta sesión, marcar la Tarea 5 como **diferida** con ese motivo (es la única que depende de reconstruir el stack).
- [ ] **Paso 2: Escribir el spec** (estilo `inscripcion.spec.ts`, helpers `entrarComo`/`CUENTAS`): una persona se matricula a la convocatoria 2026-I (alta pública con DNI/correo únicos por corrida) → el Coordinador la admite → esa persona figura como **alumno de "Promoción 2026-I"** (verificar en la pantalla de alumnos/grupo o en su legajo) → el Jefe de Operaciones le planifica una **sesión de simulador** por su código.
- [ ] **Paso 3: Correr** `pnpm exec playwright test e2e/flujo-integrado.spec.ts`. Expected: PASA (Playwright levanta su propio Vite; globalSetup valida el back).
- [ ] **Paso 4: Commit** (incluye el spec; typecheck/lint si tocó TS).

---

## Notas de ejecución
- Backend se verifica con la suite `mvnw -o test`; web por **directorios** (`vitest run src/<dir>` o `--no-file-parallelism`), **no** la suite completa en paralelo (flakea por arranque de workers bajo carga en esta máquina).
- La migración/seed se verifican contra un PostgreSQL **desechable** por Docker (no tocar `sigeda_demo` salvo en la Tarea 5, y ahí recreándola).

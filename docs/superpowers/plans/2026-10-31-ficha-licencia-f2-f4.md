# Ficha de Licencia · F2–F4 — Ficha + horas + motor §16 — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Pasos con checkbox.

**Goal:** Una Ficha de Licencia (PP-H) por alumno con los datos del §15, el libro de horas por tipo (§61.245) y el motor de validación/alertas §16 (requisitos, vencimientos, bloqueos y estado derivado), más su pantalla de captura y resumen.

**Architecture:** Entidad `FichaLicencia` (una por alumno, clave `codAlumno`), persistida con migración + schema_prod (como la cohorte). Captura por `PUT`; lectura por `GET` que además calcula un **resumen §16 derivado** (nunca persistido). Permiso nuevo `Manage Licensing` (Coordinador). Web: página de ficha por alumno. Sin tocar la nota académica ni el simulador.

**Tech Stack:** Spring Boot 3.4.2 / Java 17 (sin Lombok, accesores a mano). JPA, H2 en test / PostgreSQL (ddl-auto=none). React 19 / TanStack / MSW / vitest.

**Spec:** `docs/superpowers/specs/2026-10-31-ficha-licencia-design.md` (fases F2, F3, F4).

## Global Constraints
- pnpm; `mvnw` offline con `export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home` y `sh ./mvnw`; nunca pipe por `head`.
- **Solo commit — sin push ni merge.** Conventional Commits sin `Co-Authored-By`. Terminología militar intencional. No levantar el dev server. Rama: `feat/ficha-licencia`. Migración verificable contra PostgreSQL desechable por Docker. TDD.
- Enums `@Enumerated(EnumType.STRING)`; FK escalar (codAlumno) estilo matrícula; DTOs de captura con validación `jakarta.validation`.

## Modelo: FichaLicencia (campos)
- Clave: `codAlumno` (varchar, único — una ficha por alumno).
- Personales: `fechaNacimiento` (date), `secundariaCompleta` (bool), `inglesNivel` (varchar), `inglesVigencia` (date), `medicoVigencia` (date).
- Licencia de alumno: `licenciaAlumnoEmision` (date).
- Horas (double): `horasTotal`, `horasDobleMando`, `horasSolo`, `horasSoloTravesia`, `horasNocturnas`, `horasInstrumentos`, `horasSimulador`; `travesia100nm` (bool), `nocturno10x10` (bool).
- Teoría DGAC: `examenTeoricoFecha` (date), `examenTeoricoNota` (integer).
- Declaración del instructor: `declaracionFecha` (date).
- Pericia: `periciaFecha` (date), `periciaResultado` (varchar: `APROBADA`/`DESAPROBADA`, nullable).
- Trámite: `pagoTeorico`, `pagoPractica`, `solicitudPresentada`, `licenciaEmitida` (bool).

## Review Focus
- Guardar dos veces la ficha de un alumno → la segunda ACTUALIZA, no crea una segunda (unicidad por `codAlumno`).
- Obtener la ficha de un alumno sin ficha → respuesta clara (ficha vacía o 404 definido), sin NPE.
- Motor §16 con campos null (ficha recién creada) → no NPE; los requisitos salen "no cumple", no error.
- Horas de simulador > 5 h → el requisito/el conteo aplica el tope de 5 h (no acredita el exceso).
- Pericia registrada sin examen teórico vigente dentro de 12 meses → bloqueo, no "lista".
- Permiso: capturar/leer la ficha exige `Manage Licensing`; un rol sin él → 403.

---

### Tarea 1: Permiso `Manage Licensing`

**Files:** Modify `security/entities/Permiso.java`, `Permission.java`, `Role.java` (añadir a Coordinador Académico); web `src/lib/auth/permisos.ts` (+ `PERMISOS_POR_ROL['Coordinador Académico']`). Tests: `unit_test/PermisosDeGruposTest.java` y `src/lib/auth/permisos.test.ts` si fijan los sets exactos.

- [ ] **Paso 1:** correr los tests de permisos que fijan los sets exactos → ver cuáles rompen al añadir el permiso (RED esperado en los que pinean el set del Coordinador).
- [ ] **Paso 2:** `Permiso.MANAGE_LICENSING = "Manage Licensing"`; `Permission.MANAGE_LICENSING(Permiso.MANAGE_LICENSING)`; añadir a `Role.CoordinadorAcademico` el EnumSet; web `PERMISOS` + `PERMISOS_POR_ROL['Coordinador Académico']`.
- [ ] **Paso 3:** actualizar los tests de permisos (back y web) al nuevo set esperado (ledger el ajuste).
- [ ] **Paso 4:** `sh ./mvnw -o test` + `pnpm test:run src/lib/auth` verdes. **Commit.**

---

### Tarea 2: Esquema `fichas_licencia` (migración 036 + schema_prod + convergencia)

**Files:** Create `src/main/resources/migraciones/036-ficha-licencia.sql`; Modify `schema_prod.sql`; Test `unit_test/EsquemaFichaLicenciaTest.java` (estilo `EsquemaCohorteTest`/`EsquemaSimuladorTest`).

- [ ] **Paso 1: Test de convergencia** (RED): schema_prod y 036 contienen la tabla `fichas_licencia` con las columnas clave (`cod_alumno`, las horas, `examen_teorico_*`, `pericia_*`, `medico_vigencia`, `declaracion_fecha`) y el índice único de `cod_alumno`.
- [ ] **Paso 2: Correr → FALLA.**
- [ ] **Paso 3:** `036-ficha-licencia.sql` idempotente (secuencia, tabla con todas las columnas, `create unique index ux_fichas_licencia_cod_alumno on fichas_licencia(cod_alumno)`, setval idempotente).
- [ ] **Paso 4:** schema_prod.sql: sección de la tabla + índice único.
- [ ] **Paso 5: Convergencia → PASA.**
- [ ] **Paso 6: Verificar 036 en PostgreSQL desechable** (Docker): aplicar sobre tablas vacías, idempotente (2 veces), y que el índice único rechaza un `cod_alumno` duplicado. Borrar el contenedor.
- [ ] **Paso 7: Suite + commit.**

---

### Tarea 3: Entidad + guardar/obtener la ficha

**Files:** Create `ficha/entities/FichaLicencia.java`, `ficha/entities/ResultadoPericia.java` (enum), `ficha/dao/IFichaLicenciaDao.java` (findByCodAlumno), `ficha/dtos/FichaSave.java`, `ficha/dtos/FichaDetalle.java`, `ficha/services/IFichaLicenciaService.java` + `Impl`, `ficha/controllers/FichaLicenciaController.java`. Test `integration_test/FichaLicenciaControllerTest.java` + fixture `src/test/resources/ficha/ficha.sql`.

**Interfaces:**
- Produces: `PUT /api/fichas-licencia/{codAlumno}` (upsert, `@Valid FichaSave`); `GET /api/fichas-licencia/{codAlumno}` (`FichaDetalle` con la ficha; el resumen §16 lo añade la Tarea 4). Permiso `Manage Licensing`.

- [ ] **Paso 1: Tests** (estilo `SesionSimuladorCalificacionControllerTest`, token Coordinador):
  - `guardarCreaLaFicha`: PUT con datos → 200/201; GET → trae los datos.
  - `guardarDosVecesActualiza`: dos PUT del mismo alumno → el GET trae los últimos, y no hay dos fichas (unicidad).
  - `obtenerDeAlumnoSinFichaDevuelveVacia` (define el contrato: 404 o ficha vacía; el plan elige y se ledger-ea).
  - `sinPermisoEs403`.
- [ ] **Paso 2: Correr → FALLA.**
- [ ] **Paso 3:** `ResultadoPericia` (APROBADA/DESAPROBADA); `FichaLicencia` entidad con los campos del modelo + accesores a mano + `@SequenceGenerator`; `IFichaLicenciaDao extends JpaRepository<FichaLicencia,Integer>` con `Optional<FichaLicencia> findByCodAlumno(String cod)`.
- [ ] **Paso 4:** `FichaSave` (DTO de captura, validaciones: nota 0–100, horas ≥0, resultado enum) y `FichaDetalle` (lo que devuelve el GET).
- [ ] **Paso 5:** `FichaLicenciaServiceImpl`: `guardar(cod, FichaSave)` hace upsert por `findByCodAlumno`; `detalle(cod)` arma `FichaDetalle`.
- [ ] **Paso 6:** `FichaLicenciaController` GET/PUT con `@PreAuthorize(MANAGE_LICENSING)`.
- [ ] **Paso 7: Correr → PASA. Suite + commit.**

---

### Tarea 4: Motor §16 (resumen derivado)

**Files:** Create `ficha/dtos/ResumenFicha.java` (record: `estado`, `requisitos` List<Requisito>, `alertas` List<String>, `bloqueos` List<String>), `ficha/dtos/Requisito.java` (record `clave`, `cumple`, `detalle`), `ficha/entities/EstadoFicha.java` (enum EN_PREPARACION/LISTA_PARA_PERICIA/PERICIA_APROBADA/LICENCIA_EMITIDA/OBSERVADA), `ficha/services/MotorFicha.java` (calcula el resumen desde la ficha + hoy). Modify `FichaDetalle`/servicio para incluir el resumen en el GET. Test `integration_test` o `unit_test/MotorFichaTest.java` (unit, sin Spring, de reglas puras).

**Interfaces:**
- Consumes: la `FichaLicencia` de la Tarea 3.
- Produces: `MotorFicha.resumen(FichaLicencia, LocalDate hoy) -> ResumenFicha`; incluido en `GET /api/fichas-licencia/{codAlumno}`.

- [ ] **Paso 1: Tests unitarios de reglas** (`MotorFichaTest`, sin Spring):
  - Horas insuficientes (total<40 o dobleMando<20 o solo<10 o travesia<5) → el requisito respectivo `cumple=false`.
  - Simulador >5 h → el conteo acreditable se topa en 5 h (el requisito de horas lo refleja).
  - Médico vencido respecto a `hoy` → alerta; teórico con fecha >1 año → alerta/bloqueo; declaración >30 días → alerta.
  - Pericia con fecha pero teórico no vigente dentro de 12 meses → bloqueo.
  - Estado derivado: todo cumple + teórico y declaración vigentes + sin bloqueos → `LISTA_PARA_PERICIA`; `periciaResultado=APROBADA` → `PERICIA_APROBADA`; `licenciaEmitida` → `LICENCIA_EMITIDA`; algún requisito falta → `OBSERVADA`; ficha vacía → `EN_PREPARACION`.
  - Ficha con todo null → sin NPE, requisitos "no cumple", estado `EN_PREPARACION`.
- [ ] **Paso 2: Correr → FALLA.**
- [ ] **Paso 3:** implementar `MotorFicha` con las constantes de la RAP 61 (40/20/10/5/3 h, 75%, 1 año, 30 días, 24 meses, tope simulador 5 h) y el estado derivado. Los puntos [V] del §17 (nocturno del PP, etc.) como constantes documentadas, no reglas que bloqueen de más.
- [ ] **Paso 4:** incluir `resumen` en `FichaDetalle` del GET (servicio usa `MotorFicha` con `LocalDate.now()`).
- [ ] **Paso 5: Correr → PASA. Suite + commit.**

---

### Tarea 5 (web): página de la Ficha de Licencia

**Files:** Create `src/features/ficha-licencia/{api,schemas,ficha-page}.tsx` + test; ruta `src/routes/_app/fichas-licencia/$cod.tsx` (o enlazada desde el legajo/consolidado del alumno); `src/lib/auth/pantallas.ts` (entrada + permiso Manage Licensing); mock `src/mocks/sigeda/ficha-licencia.ts` + registro en `handlers.ts`/`reiniciar.ts`.

- [ ] **Paso 1: Test** (vitest + MSW): el Coordinador abre la ficha de un alumno, captura datos (p. ej. horas, médico, examen) y guarda; la página muestra el **resumen §16** (requisitos verde/rojo, alertas, bloqueos, estado). Un alumno sin ficha muestra el formulario vacío con estado EN_PREPARACION.
- [ ] **Paso 2: Correr → FALLA.**
- [ ] **Paso 3:** implementar el feature (api con `fichaQuery`/`guardarFicha`, el formulario de captura con react-hook-form + zod, el panel de resumen) + mock (upsert + el mismo cálculo de resumen que el backend, para paridad) + ruta + pantalla/permiso.
- [ ] **Paso 4: Correr → PASA.**
- [ ] **Paso 5:** `pnpm typecheck && pnpm lint`; tests del feature por directorio. **Commit.**

---

## Notas de ejecución
- Backend con `mvnw -o test`; web por directorios. Migración/seed verificadas en PostgreSQL desechable por Docker.
- La ficha se vincula al alumno por `codAlumno`; se enlaza desde el consolidado de la cohorte (F1) o el legajo (link, fuera del alcance duro de este plan).

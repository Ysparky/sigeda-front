# Módulo de postulación (admisión) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalizar la admisión sobre el "tramo de entrada" existente: convocatorias, ciclo de observación/subsanación, y separar la validación documental del resultado de admisión (admitido/no admitido), promoviendo a alumno solo al admitir.

**Architecture:** Backend primero (`sigeda-back`, rama `feat/modulo-postulacion` desde `feat/dependencias-frontend`), luego web (`sigeda-web`, rama `feat/modulo-postulacion` desde `main`). Se **extiende** la `Matricula` existente (que ES la postulación); se añaden `Convocatoria` y `ResultadoAdmision`. No se duplica un módulo paralelo.

**Tech Stack:** Spring Boot 3 / Java 17 / PostgreSQL (H2 en test) · React 19 / TanStack Router+Query / zod / MSW / vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-modulo-postulacion-design.md` (léelo junto a este plan; §8 trae las decisiones resueltas).

## Global Constraints

- Backend: `export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home && sh ./mvnw -o test`. Nunca canalizar `mvnw`/`psql` por `head`.
- Web: **pnpm únicamente**. `pnpm test` (vitest run), `pnpm typecheck`, `pnpm lint`.
- Migraciones: `src/main/resources/migraciones/NNN-kebab.sql` desde **032** (última actual 031), con el preámbulo del repo (`\set ON_ERROR_STOP on`, `SET client_encoding TO 'UTF8';`, `begin;`/`commit;`, `setval` por secuencia creada) — lo valida `MigracionesTest`. Reflejar en `schema_prod.sql` (respetar orden de FK: la tabla con FK va DESPUÉS de la referenciada) y `data_prod.sql`; verificar en PostgreSQL real (Docker `sigeda-pg`/efímero; H2 es ciego a defectos de PG).
- Retrocompat: `idConvocatoria`/`observaciones` nullable; matrículas históricas intactas.
- Permisos: todo el filtro y las convocatorias bajo `Manage Enrollments` (Coordinador Académico, rol 6). Postulante (rol 7) `View My Enrollment`.
- Toda ruta nueva de los controladores cubiertos por `PermisosDeclaradosTest` debe declararse en su tabla.
- Commits: Conventional Commits, cortos, sin trailer Co-Authored-By.

## Review Focus

Entradas que el spec implica y conviene pinear; cada una con su test en la tarea dueña:
- **Postular a una convocatoria no PUBLICADA o fuera de [fechaInicio, fechaFin]** → 400/409, no se crea matrícula. (Tarea 1.3)
- **Duplicado vivo en la MISMA convocatoria** (estado PENDIENTE/OBSERVADA/VALIDADA) → 409; re-postular a OTRA convocatoria → permitido. (Tarea 1.3)
- **`registrarResultado` desde estado ≠ VALIDADA** → 409. (Tarea 1.4)
- **`vacantes` llenas al admitir** (admitidos == vacantes) → 409. (Tarea 1.4)
- **Subsanar (`PUT /mia`) desde NO_ADMITIDO o VALIDADA** → bloqueado; desde RECHAZADA/OBSERVADA → vuelve a PENDIENTE. (Tarea 1.4)
- **`validar` ya NO promueve**: tras validar, la persona sigue Postulante/Pendiente; solo ADMITIDO promueve. (Tarea 1.4)

---

# FASE 1 — Backend (`sigeda-back`)

Repo `/Volumes/ORICO/projects/personal/tesis-project/sigeda-back`, paquete `com.sigeda.backend.matricula` (y nuevo `com.sigeda.backend.convocatoria`).

### Task 1.1: Entidad `Convocatoria` + persistencia + semilla

**Files:**
- Create: `convocatoria/entities/Convocatoria.java`, `convocatoria/entities/EstadoConvocatoria.java` (enum BORRADOR/PUBLICADA/CERRADA/FINALIZADA), `convocatoria/dao/IConvocatoriaDao.java`
- Create: `src/main/resources/migraciones/032-convocatorias.sql`; modificar `schema_prod.sql` (tabla `convocatorias`, secuencia; FK a `cursos` → va DESPUÉS de `cursos`), `data_prod.sql` (una convocatoria PUBLICADA vigente para el curso 1)
- Test: `src/test/java/unit_test/SemillaConvocatoriaTest.java` (contenido de archivos), `src/test/java/integration_test/ConvocatoriaPersistenciaTest.java` (`@DataJpaTest`)

**Interfaces:**
- Produces: `Convocatoria { int id; Integer idCurso; String nombre; String descripcion; LocalDate fechaInicio; LocalDate fechaFin; int vacantes; String documentosRequeridos; EstadoConvocatoria estado; }`; `IConvocatoriaDao extends CrudRepository<Convocatoria,Integer>` con `List<Convocatoria> findByEstado(EstadoConvocatoria)`.
- Consumes: patrón de entidad/secuencia del repo (ver `Matricula`/migración 026), `CustomDateDeserializer` (uuuu-MM-dd).

- [ ] **Step 1:** `ConvocatoriaPersistenciaTest.guardaYRecupera()` — persistir y leer una convocatoria con todos sus campos; `SemillaConvocatoriaTest`: `schema_prod`+`032` declaran `convocatorias` con check de estado y `convocatorias_seq`, y `convocatorias` va después de `cursos`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Crear entidad + enum + DAO; migración 032 (preámbulo + tabla + secuencia + setval + FK a cursos); reflejar en `schema_prod.sql` en el orden correcto; sembrar la convocatoria de demo en `data_prod.sql`.
- [ ] **Step 4:** Correr `sh ./mvnw -o test -Dtest=ConvocatoriaPersistenciaTest,SemillaConvocatoriaTest,MigracionesTest` → PASS.
- [ ] **Step 5:** Commit `feat(convocatoria): entidad, persistencia y semilla`.

### Task 1.2: CRUD y publicación de convocatorias + catálogo público

**Files:**
- Create: `convocatoria/controllers/ConvocatoriaController.java`, `convocatoria/services/ConvocatoriaService.java`, `convocatoria/dtos/ConvocatoriaSave.java`, `convocatoria/dtos/CambioEstadoConvocatoria.java`, `convocatoria/projections/ConvocatoriaDetalle.java`/`ConvocatoriaIndex.java`
- Modify: `matricula/controllers/MatriculaPublicaController.java` (añadir `GET /api/public/convocatorias`, `GET /api/public/convocatorias/{id}`)
- Modify: `unit_test/PermisosDeclaradosTest.java` — añadir `ConvocatoriaController` a la tabla (todas sus rutas = `Manage Enrollments`)
- Test: `integration_test/ConvocatoriaControllerTest.java`

**Interfaces:**
- Produces: `GET/POST /api/convocatorias` (`Manage Enrollments`), `GET/PUT /api/convocatorias/{id}`, `PUT /api/convocatorias/{id}/estado` (body `CambioEstadoConvocatoria{estado}`). Público: `GET /api/public/convocatorias` → solo PUBLICADAS con hoy ∈ [inicio, fin]; `GET /api/public/convocatorias/{id}`. `ConvocatoriaService.publicables(): List<...>`, `save/update/cambiarEstado`.
- Consumes: `IConvocatoriaDao` (1.1), `Permiso.MANAGE_ENROLLMENTS`, patrón de `MatriculaController`/`MatriculaPublicaController`.

- [ ] **Step 1:** `ConvocatoriaControllerTest`: `crearYListar()`, `publicarYAparecerEnPublico()` (BORRADOR no sale en `/public/convocatorias`; PUBLICADA vigente sí), `vigenciaPorFechas()` (PUBLICADA fuera de fechas no sale), `requierePermiso()` (rol sin `Manage Enrollments` → 403 en `POST /api/convocatorias`, con seed de usuario no-coordinador si hiciera falta; si no, omitir y dejar ruling).
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar service + controller + DTOs + endpoints públicos; registrar las rutas en `PermisosDeclaradosTest`.
- [ ] **Step 4:** `sh ./mvnw -o test -Dtest=ConvocatoriaControllerTest,PermisosDeclaradosTest` → PASS.
- [ ] **Step 5:** Commit `feat(convocatoria): CRUD, publicación y catálogo público`.

### Task 1.3: Postulación contra convocatoria + estados nuevos + guard de duplicados

**Files:**
- Modify: `matricula/entities/EstadoMatricula.java` (añadir `OBSERVADA`, `NO_ADMITIDO`), `matricula/entities/Matricula.java` (campos `Integer idConvocatoria`, `String observaciones`)
- Modify: `matricula/dtos/MatriculaSave.java` (requerir `idConvocatoria`; `idCurso` se deriva, ya no se envía), `matricula/services/MatriculaServiceImpl.java` (`crear` deriva idCurso de la convocatoria, valida PUBLICADA+vigente; `dniYaPostulado(dni, idConvocatoria)` sobre vivas {PENDIENTE,OBSERVADA,VALIDADA})
- Modify: `migraciones/033-postulacion.sql` (añadir `id_convocatoria`, `observaciones` a `matriculas`; reemplazar índice `ux_matriculas_dni_curso_vivas` por `ux_matriculas_dni_convocatoria_vivas` sobre los 3 estados vivos; check de estado con los 5 valores), `schema_prod.sql`, `data_prod.sql`
- Modify: `unit_test/EsquemaMatriculaTest.java` (si fija el check de estados / el índice)
- Test: `integration_test/MatriculaPublicaControllerTest.java` (ampliar)

**Interfaces:**
- Produces: `EstadoMatricula{PENDIENTE,OBSERVADA,VALIDADA,RECHAZADA,NO_ADMITIDO}`; `MatriculaSave.idConvocatoria` (NotNull); `MatriculaServiceImpl.dniYaPostulado(String dni, int idConvocatoria): boolean`.
- Consumes: `IConvocatoriaDao` (1.1), `ConvocatoriaService.publicables`/vigencia (1.2).

- [ ] **Step 1:** Tests (cubren Review Focus de postulación): `postularAConvocatoriaPublicadaVigente_201()`; `convocatoriaNoPublicada_rechaza()`; `fueraDeFechas_rechaza()`; `duplicadoVivoMismaConvocatoria_409()`; `rePostularOtraConvocatoria_ok()`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Añadir estados + campos; `MatriculaSave` exige `idConvocatoria`; `crear` deriva idCurso y valida vigencia; guard por convocatoria; migración 033 + schema + semilla.
- [ ] **Step 4:** `sh ./mvnw -o test -Dtest=MatriculaPublicaControllerTest,EsquemaMatriculaTest,MigracionesTest` → PASS.
- [ ] **Step 5:** Commit `feat(matricula): postulación por convocatoria, estados OBSERVADA/NO_ADMITIDO y guard`.

### Task 1.4: Observación, dos compuertas y resultado de admisión

**Files:**
- Create: `matricula/entities/ResultadoAdmision.java`, `matricula/entities/Resultado.java` (enum ADMITIDO/NO_ADMITIDO), `matricula/dao/IResultadoAdmisionDao.java`, `matricula/dtos/ObservacionSave.java`, `matricula/dtos/ResultadoSave.java`
- Modify: `matricula/controllers/MatriculaController.java` (`PUT /{id}/observar`, `POST /{id}/resultado`; conservar `validar`/`rechazar`), `matricula/services/MatriculaServiceImpl.java` (`observar`, `registrarResultado`, `validar` sin promover, `reenviar` desde RECHAZADA/OBSERVADA), `matricula/dtos` de detalle (exponer `observaciones`, `resultado`)
- Modify: `migraciones/034-resultado-admision.sql`, `schema_prod.sql` (tabla `resultados_admision`, FK a `matriculas` → después de `matriculas`), `data_prod.sql`
- Modify: `integration_test/MatriculaValidacionControllerTest.java` (actualizar: validar ya no promueve), `integration_test/MatriculaMiaControllerTest.java` (reenviar desde OBSERVADA)
- Test: `integration_test/MatriculaAdmisionControllerTest.java` (nuevo)

**Interfaces:**
- Produces: `MatriculaServiceImpl.observar(int id, String observaciones)`, `.registrarResultado(int id, Resultado resultado, String observaciones, String responsable)`, `.validar(int id)` (sin promover). `PUT /api/matriculas/{id}/observar` (body `ObservacionSave{observaciones}`), `POST /api/matriculas/{id}/resultado` (body `ResultadoSave{resultado, observaciones}`), ambos `Manage Enrollments`. `ResultadoAdmision{int id; int idMatricula; Resultado resultado; LocalDate fechaResultado; String observaciones; String responsableRegistro;}`.
- Consumes: la promoción actual de `validar` (persona tipo/estado + usuario rol) se **mueve** a `registrarResultado` ADMITIDO; `Matricula.idConvocatoria` + conteo de admitidos para `vacantes` (1.1/1.3); `Permiso.MANAGE_ENROLLMENTS`.

- [ ] **Step 1:** Tests (cubren el resto del Review Focus): `observar_pasaAObservadaConObservaciones()`; `validarNoPromueve()` (tras validar, persona.tipo sigue null/Postulante y usuario rol 7); `resultadoAdmitido_promueveYMarca()` (ADMITIDO → persona Alumno/Apto, usuario rol 1); `resultadoDesdeNoValidada_409()`; `vacantesLlenas_409()`; `reenviarDesdeObservada_vuelvePendiente()`; `reenviarDesdeNoAdmitido_bloqueado()`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Crear `ResultadoAdmision`/enum/DAO/DTOs; mover la promoción de `validar`→`registrarResultado` ADMITIDO con tope de vacantes; `observar`; `validar` sin promover; `reenviar` desde RECHAZADA/OBSERVADA, bloqueado desde VALIDADA/NO_ADMITIDO; endpoints; migración 034; actualizar los tests de validación/mia existentes a la semántica nueva.
- [ ] **Step 4:** `sh ./mvnw -o test -Dtest=MatriculaAdmisionControllerTest,MatriculaValidacionControllerTest,MatriculaMiaControllerTest,MatriculaCoordinadorControllerTest` → PASS.
- [ ] **Step 5:** Commit `feat(matricula): observación, dos compuertas y resultado de admisión`.

### Task 1.5: Suite completa + verificación PostgreSQL

- [ ] **Step 1:** `sh ./mvnw -o test` → todo PASS, sin regresiones.
- [ ] **Step 2:** Verificar migraciones 032–034 + schema en PostgreSQL real (contenedor efímero): cargar `schema_prod` fresco (EXIT 0) y aplicar las migraciones sobre el esquema pre-feature (forward), confirmando columnas/tablas/constraints y el **orden de FK** (convocatorias tras cursos, resultados_admision tras matriculas).
- [ ] **Step 3:** Commit `test(matricula): suite completa y verificación PG del módulo de postulación`.

---

# FASE 2 — Web (`sigeda-web`)

Repo `/Volumes/ORICO/projects/personal/tesis-project/sigeda-web`. Ejecuta backend primero.

### Task 2.1: api + schemas (convocatoria, estados, observar, resultado)

**Files:**
- Create: `src/features/convocatorias/api.ts` (tipos + CRUD + estado), `src/features/convocatorias/schemas.ts`
- Modify: `src/features/inscripcion/api.ts` (catálogo de convocatorias públicas; `crearMatricula` manda `idConvocatoria`), `src/features/inscripcion/schemas.ts` (`esquemaMatricula` sobre convocatoria)
- Modify: `src/features/matriculas/api.ts` (estados OBSERVADA/NO_ADMITIDO; `observarMatricula`, `registrarResultado`; `MatriculaDetalle` gana `observaciones`, `resultado`, `convocatoria`), `src/features/matriculas/estado.ts` (etiquetas de los 2 estados nuevos)
- Modify: `src/features/inscripcion` mi-matrícula api (reenviar ahora manda datos + comprobante)
- Test: `src/features/convocatorias/schemas.test.ts`, `src/features/matriculas/api.test.ts` (parseo de estados/resultado)

**Interfaces:**
- Produces: `Convocatoria`/`ConvocatoriaDetalle` types; `EstadoConvocatoria`; `obtenerConvocatoriasPublicas()`, `crearConvocatoria`/`modificar`/`cambiarEstado`; `observarMatricula(id, {observaciones})`, `registrarResultado(id, {resultado, observaciones})`.
- Consumes: endpoints de FASE 1; `ApiError`/`normalizarError` (409 por vía genérica).

- [ ] Steps TDD estándar (test → FAIL → impl → PASS → commit `feat(web): tipos/esquemas de convocatoria y admisión`).

### Task 2.2: Admin de convocatorias (Coordinador)

**Files:** `src/features/convocatorias/{convocatorias-page,formulario-convocatoria,convocatoria-detalle-page}.tsx`; rutas `src/routes/_app/convocatorias/*`; entrada en `src/lib/auth/pantallas.ts` (`Manage Enrollments`); `convocatorias.test.tsx`.
- [ ] TDD: lista + alta/edición + publicar/cerrar/finalizar. Commit `feat(web): administración de convocatorias`.

### Task 2.3: Landing público por convocatoria + postulación

**Files:** modificar `src/features/inscripcion/{landing-page,matricula-page}.tsx` (catálogo de convocatorias PUBLICADAS con sus documentos requeridos; el formulario postula a una convocatoria; `?convocatoria=` en vez de `?curso=`); rutas; tests.
- [ ] TDD: landing lista convocatorias vigentes; postular con convocatoria. Commit `feat(web): postulación pública por convocatoria`.

### Task 2.4: Bandeja del Coordinador — observar / validar / rechazar / resultado

**Files:** modificar `src/features/matriculas/{bandeja-page,matricula-detalle-page}.tsx` (filtro por convocatoria+estado; acciones condicionales al estado: Observar, Validar, Rechazar, Registrar resultado admitido/no admitido); tests.
- [ ] TDD: cada acción visible solo en su estado; registrar resultado admitido/no admitido. Commit `feat(web): filtro del Coordinador con observación y resultado de admisión`.

### Task 2.5: Mi postulación — observaciones, subsanación, resultado

**Files:** modificar `src/features/inscripcion/mi-matricula-page.tsx` (ver observaciones; subsanar = editar datos + re-subir comprobante; ver resultado de admisión); schema/api de reenvío; tests.
- [ ] TDD: muestra observaciones; subsana datos+comprobante → vuelve a revisión; muestra resultado. Commit `feat(web): subsanación y resultado en Mi postulación`.

### Task 2.6: MSW mocks + suite

**Files:** `src/mocks/sigeda/convocatorias.ts` (nuevo), ampliar `src/mocks/sigeda/inscripcion.ts` (convocatorias públicas + estados + observar/resultado), `src/mocks/sigeda/datos.ts` (semilla: convocatoria + estados), registrar en `handlers.ts`; `conflicto` 409 helper (ya existe en comun.ts si se trajo; si no, añadir).
- [ ] TDD: handlers + suite completa `pnpm test` + `pnpm typecheck` + `pnpm lint` verdes. Commit `feat(web): mocks MSW del módulo de postulación`.

---

## Self-review

**1. Cobertura del spec:** §4.1 Convocatoria → 1.1/1.2/2.2/2.3; §4.2 estados+guard+observaciones → 1.3/1.4; §4.3 dos compuertas+observar+resultado+vacantes → 1.4/2.4; §4.4 ResultadoAdmision → 1.4; §4.5 endpoints → 1.2/1.3/1.4/2.1; §5 flujo → 2.3/2.4/2.5; §6 web → 2.2–2.5; §7 constraints → Global + 1.5 (PG). Sin huecos.
**2. Pasos:** cada tarea es test→FAIL→impl→PASS→commit; sin líneas sin decisión.
**3. Consistencia de tipos:** `EstadoMatricula` (5 valores) idéntico back/web; `Resultado` ADMITIDO/NO_ADMITIDO; endpoints `observar`/`resultado` iguales en 1.4 y 2.1/2.4; `idConvocatoria` en MatriculaSave (1.3) ↔ crearMatricula (2.1/2.3).
**4. Review Focus:** los 6 casos tienen test en su tarea dueña (1.3 postulación×3; 1.4 resultado/vacantes/subsanación/validar-no-promueve).
**5. Proporción:** plan al nivel de ejecución (firmas + nombres de test), sin cuerpos de implementación; extiende código existente, no lo reescribe.

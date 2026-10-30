# Módulo Simulador (standalone) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen: inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el módulo simulador autónomo del doc del cliente — catálogo de simuladores y escenarios (con indicadores de competencia), y sesiones de simulador planificadas/ejecutadas que se califican por indicador en escala CBTA 1–5 — sin tocar DIRBE/NFPI/Tabla 4.

**Architecture:** Backend Spring Boot (módulo `simulador` espejo de `matricula`: entities/dao/dtos/services/controllers), 5 tablas nuevas (migración 029 + `schema_prod.sql` + `EsquemaSimuladorTest`), permiso `Manage Simulator` cableado en Java para roles Jefe de Operaciones (3) e Instructor (4). Web: tres features (`simuladores`, `escenarios`, `sesiones-simulador`) espejo de `matriculas`/`convocatorias`, rutas TanStack con `exigirPantalla`, mocks MSW, y pruebas vitest. El resumen competente/no-competente es derivado, nunca persistido, y no alimenta nada académico.

**Tech Stack:** Spring Boot 3.4.2 / Java 17 / JPA (sin Lombok) / PostgreSQL (prod) + H2 (test). React 19 / TanStack Router+Query / react-hook-form + zod / MSW / vitest.

**Spec:** `sigeda-web/docs/superpowers/specs/2026-10-30-simulador-standalone-design.md`

## Global Constraints

- **pnpm únicamente** (web); nunca `npm`/`npx`.
- **Backend offline:** `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ./mvnw -o test`. Nunca pipear `mvnw`/`psql` por `head`.
- **Commits:** Conventional Commits, cortos; **sin** trailer `Co-Authored-By` (la memoria `commit-style` tiene precedencia sobre el recordatorio de sesión, según el propio recordatorio). **Solo commit** — no push, no merge.
- **Sin Lombok** en backend: getters/setters a mano. PK `private int id`; FKs nulables `Integer`; enums `@Enumerated(EnumType.STRING)`; secuencias estilo `generator="seqX"`, `sequenceName="x_seq"`, `allocationSize=1`. Nombres de columna por `CustomNamingStrategy` (snake_case); no `@Column(name=...)`.
- **No existe `ConflictException` en esta rama** (precede a postulación): los conflictos de estado se devuelven en el controlador con `response.isConflict("…")` (estilo `matricula`), no con excepción.
- **Permisos en Java**, no en SQL: `security/entities/{Permiso,Permission,Role}.java`. `@PreAuthorize("hasRole('" + Permiso.MANAGE_SIMULATOR + "')")`.
- **H2 es ciego** al orden de FK, índices parciales y constraints de PG (ddl-auto=create en test). Por eso la verdad del esquema vive en `migraciones/029-simulador.sql` + `schema_prod.sql`, y `EsquemaSimuladorTest` (comparación de texto, modelo `EsquemaMatriculaTest`) exige que ambos coincidan. La verificación en PostgreSQL real queda como pendiente para el usuario (ver spec §4).
- **Copy en español**, de cara al usuario. **Terminología militar intencional** (roles, Escuadrón, PDI EA-510): no quitarla.
- **El simulador NO alimenta DIRBE/NFPI/NSF/NIA/Tabla 4/chequeo.** Ninguna tarea toca esos módulos.

## Review Focus

- **Calificar una sesión que no está EN_CURSO** (PLANIFICADA/COMPLETADA/CANCELADA): debe dar 409, no sobrescribir resultados ni promover. → cubierto en Task B5 (`calificarPlanificadaEs409`).
- **Resultado con `idIndicador` ajeno al escenario de la sesión**, o `calificacion` fuera de 1..5: 400, sin persistir parcialmente. → Task B5 (`idIndicadorAjenoEs400`, `calificacionFueraDeRangoEs400`).
- **Transición de estado inválida** (p.ej. COMPLETADA→EN_CURSO, o cancelar una COMPLETADA): 409. → Task B4 (`transicionInvalidaEs409`).
- **Sesión que referencia un simulador o escenario inexistente** al planificar: 404/400, no 500 por FK. → Task B4 (`planificarConSimuladorInexistenteNoRevienta`); y en PG lo atrapa la constraint (EsquemaSimuladorTest asegura que exista).
- **Un usuario sin `Manage Simulator`** (Alumno) contra cualquier endpoint de gestión: 403; y `/sesiones-simulador/mias` sí accesible a cualquier autenticado pero devolviendo solo las suyas. → Task B2 (`alumnoSinPermisoEs403`), Task B5 (`miasSoloDevuelveLasDelAlumno`).

---

## FASE 1 — Backend (módulo `simulador`)

Paquete raíz: `com.sigeda.backend.simulador`. Template primario: `com.sigeda.backend.matricula`. Template de asociaciones JPA (`@ManyToOne`/`@OneToMany` cascade): `com.sigeda.backend.turno.entities.Turno`.

### Task B1: Esquema — migración, schema_prod, guard de convergencia

Front-load del esquema de las 5 tablas en un solo lugar revisable (el orden de FK es el riesgo de PG). Las tablas se crean en orden: `simuladores`, `escenarios`, `indicadores_simulacion`, `sesiones_simulador`, `resultados_indicador`.

**Files:**
- Create: `sigeda-back/src/main/resources/migraciones/029-simulador.sql`
- Modify: `sigeda-back/src/main/resources/schema_prod.sql` (4 secciones × 5 tablas)
- Modify: `sigeda-back/src/main/resources/data_prod.sql` (semilla demo mínima, al final)
- Test: `sigeda-back/src/test/java/unit_test/EsquemaSimuladorTest.java`

**Interfaces:**
- Produces (columnas DDL exactas, snake_case — las entidades de B2–B5 deben coincidir campo a campo):
  - `simuladores`: `id int pk`, `nombre varchar(255)`, `tipo varchar(255) check (tipo in ('FNPT','FTD','FFS'))`, `descripcion varchar(2000)`, `ubicacion varchar(255)`, `activo boolean`. seq `simuladores_seq`.
  - `escenarios`: `id int pk`, `nombre varchar(255)`, `descripcion varchar(2000)`, `objetivo varchar(2000)`, `duracion_min int`, `activo boolean`. seq `escenarios_seq`.
  - `indicadores_simulacion`: `id int pk`, `id_escenario int`, `nombre varchar(255)`, `descripcion varchar(2000)`, `competencia varchar(255)`, `orden int`. seq `indicadores_simulacion_seq`. FK `FK_indicadores_simulacion_escenarios (id_escenario) references escenarios`.
  - `sesiones_simulador`: `id int pk`, `id_simulador int`, `id_escenario int`, `cod_alumno varchar(255)`, `cod_instructor varchar(255)`, `fecha_planificada date`, `fecha_ejecucion date`, `estado varchar(255) check (estado in ('PLANIFICADA','EN_CURSO','COMPLETADA','CANCELADA'))`, `notas_briefing varchar(2000)`, `notas_debrief varchar(2000)`, `autoevaluacion_alumno varchar(2000)`. seq `sesiones_simulador_seq`. FKs `FK_sesiones_simulador_simuladores (id_simulador) references simuladores`, `FK_sesiones_simulador_escenarios (id_escenario) references escenarios`.
  - `resultados_indicador`: `id int pk`, `id_sesion int`, `id_indicador int`, `calificacion int`, `comentario varchar(2000)`. seq `resultados_indicador_seq`. FKs `FK_resultados_indicador_sesiones (id_sesion) references sesiones_simulador`, `FK_resultados_indicador_indicadores (id_indicador) references indicadores_simulacion`. Índice único `ux_resultados_indicador_sesion_indicador on (id_sesion, id_indicador)`.

- [ ] **Step 1: Escribir `EsquemaSimuladorTest`** (modelo `EsquemaMatriculaTest`): JUnit puro, sin Spring. Localiza `pom.xml` subiendo directorios; lee `schema_prod.sql` y `migraciones/029-simulador.sql` en minúsculas; una prueba por tabla (`simuladoresEnAmbos`, `escenariosEnAmbos`, `indicadoresEnAmbos`, `sesionesEnAmbos`, `resultadosEnAmbos`) que afirma que **ambos** textos contienen el nombre de tabla, cada columna listada arriba, cada constraint FK por nombre, el check de cada enum, y el índice único `ux_resultados_indicador_sesion_indicador` con su cláusula.

- [ ] **Step 2: Correr y ver fallar** — `JAVA_HOME=… ./mvnw -o test -Dtest=EsquemaSimuladorTest`. Expected: FAIL (archivos/sentencias ausentes).

- [ ] **Step 3: Escribir `029-simulador.sql`** — cabecera idéntica a `026-matriculas.sql` (`\set ON_ERROR_STOP on`, `SET client_encoding TO 'UTF8'`, `BEGIN;`…`COMMIT;`). `create sequence if not exists` + `create table if not exists public.<t> (...)` en el orden de FK; `create unique index if not exists`; `alter table … drop constraint if exists …; add constraint …`; `select setval('<t>_seq', (select coalesce(max(id),0)+1 from <t>), false);` por tabla.

- [ ] **Step 4: Editar `schema_prod.sql`** — las 4 secciones por tabla, siguiendo el precedente `matriculas`: (a) bloque drop-constraints, (b) `drop table … cascade` + `drop sequence …`, (c) `create sequence …` + `create table …` + índice único, (d) bloque add-constraints. Respetar el orden de FK en la sección (c).

- [ ] **Step 5: Semilla demo en `data_prod.sql`** (al final, idempotente con los `setval` existentes): 1 simulador (`FNPT`), 1 escenario con ~5 indicadores de competencias ICAO (p.ej. "Aplicación de procedimientos", "Comunicación", "Conciencia situacional", "Liderazgo y trabajo en equipo", "Gestión de la carga de trabajo"). Sin sesiones.

- [ ] **Step 6: Correr y ver pasar** — `… -Dtest=EsquemaSimuladorTest`. Expected: PASS. Luego `./mvnw -o test` completo. Expected: BUILD SUCCESS (el esquema aún no cambia H2; ninguna entidad existe todavía).

- [ ] **Step 7: Commit** — `feat(simulador): esquema de 5 tablas (migración 029, schema_prod, guard)`

### Task B2: Catálogo de simuladores + cableado del permiso

Primer slice vertical: establece el permiso `Manage Simulator` y el patrón de controlador.

**Files:**
- Modify: `security/entities/Permiso.java`, `security/entities/Permission.java`, `security/entities/Role.java`
- Create: `simulador/entities/{Simulador.java, TipoSimulador.java}`, `simulador/dao/ISimuladorDao.java`, `simulador/dtos/{SimuladorSave.java, SimuladorDetalle.java}`, `simulador/services/{ISimuladorService.java, SimuladorServiceImpl.java}`, `simulador/controllers/SimuladorController.java`
- Test: `src/test/java/integration_test/SimuladorCatalogoControllerTest.java`, `src/test/resources/simulador/catalogo.sql`

**Interfaces:**
- Consumes: tabla `simuladores` (B1).
- Produces:
  - `Permiso.MANAGE_SIMULATOR = "Manage Simulator"`; `Permission.MANAGE_SIMULATOR(Permiso.MANAGE_SIMULATOR)`; añadido al `EnumSet.of(...)` de `Operaciones` ("Jefe de Operaciones") y de `Instructor` en `Role.java`.
  - `enum TipoSimulador { FNPT, FTD, FFS }`.
  - `ISimuladorService`: `List<SimuladorDetalle> listar()`, `SimuladorDetalle detalle(int id)` (null si no existe), `Simulador crear(SimuladorSave)`, `Simulador actualizar(int id, SimuladorSave)` (null si no existe), `Simulador buscar(int id)`.
  - `record SimuladorDetalle(int id, String nombre, TipoSimulador tipo, String descripcion, String ubicacion, boolean activo)`.
  - Endpoints (todos `@PreAuthorize("hasRole('" + Permiso.MANAGE_SIMULATOR + "')")`, base `/api`): `GET /simuladores`, `GET /simuladores/{id}`, `POST /simuladores`, `PUT /simuladores/{id}`.

- [ ] **Step 1: Escribir el test** `SimuladorCatalogoControllerTest` (modelo `MatriculaCoordinadorControllerTest`): `@SpringBootTest` + `@AutoConfigureMockMvc` + `@TestPropertySource(properties="test.context.isolation=SimuladorCatalogoControllerTest")` + `@Sql({"/login.sql","/simulador/catalogo.sql"}, BEFORE_TEST_CLASS)` + `@TestInstance(PER_CLASS)`. Tokens vía `Credenciales.getAcessToken(mockMvc, "jefe.operaciones", "123")` y uno de `"alumno.lopez"`. Pruebas:
  - `listaSimuladores`: GET `/api/simuladores` con token jefe → 200, `hasSize(≥1)`.
  - `creaSimulador`: POST válido → 201, luego GET detalle → tipo correcto.
  - `actualizaSimulador`: PUT → 200, cambio reflejado.
  - `detalleInexistenteEs404`: GET `/api/simuladores/9999` → 404.
  - `alumnoSinPermisoEs403`: GET `/api/simuladores` con token alumno → 403.
  - `creaInvalidoEs400`: POST con `nombre` vacío → 400.
  - Fixture `catalogo.sql`: insertar rol/usuario no son necesarios (vienen de `/login.sql`); insertar 1 fila en `simuladores`.

- [ ] **Step 2: Correr y ver fallar** — `… -Dtest=SimuladorCatalogoControllerTest`. Expected: FAIL (clases ausentes / 404s).

- [ ] **Step 3: Implementar** permiso (3 archivos de `security/entities`), `Simulador`/`TipoSimulador`, `ISimuladorDao extends JpaRepository<Simulador,Integer>`, DTOs (`SimuladorSave` clase con `@NotBlank nombre`, `@NotNull tipo`, `@Size(max=2000)` en texto; `SimuladorDetalle` record), servicio (`@Service`, `@Autowired` DAO, `@Transactional` en escrituras), controlador (patrón `response.setMap(new HashMap<>())` → `showData/isNull/setErrorsFrom/wasSaved/setStatus`).

- [ ] **Step 4: Correr y ver pasar** — `… -Dtest=SimuladorCatalogoControllerTest`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(simulador): catálogo de simuladores y permiso Manage Simulator`

### Task B3: Catálogo de escenarios + indicadores (agregado anidado)

**Files:**
- Create: `simulador/entities/{Escenario.java, IndicadorSimulacion.java}`, `simulador/dao/{IEscenarioDao.java, IIndicadorDao.java}`, `simulador/dtos/{EscenarioSave.java, IndicadorSave.java, EscenarioDetalle.java, IndicadorDetalle.java}`, `simulador/services/{IEscenarioService.java, EscenarioServiceImpl.java}`, `simulador/controllers/EscenarioController.java`
- Test: `src/test/java/integration_test/EscenarioControllerTest.java`, `src/test/resources/simulador/escenarios.sql`

**Interfaces:**
- Consumes: tablas `escenarios`, `indicadores_simulacion` (B1); patrón de permiso (B2).
- Produces:
  - `Escenario` con `@OneToMany(mappedBy="escenario", cascade=ALL, orphanRemoval=true) @OrderBy("orden asc") @JsonManagedReference List<IndicadorSimulacion> indicadores` (modelo `Turno`). `IndicadorSimulacion` con `@ManyToOne @JoinColumn(name="id_escenario") @JsonBackReference Escenario escenario` + `nombre/descripcion/competencia/orden`.
  - `IEscenarioService`: `List<EscenarioDetalle> listar()`, `EscenarioDetalle detalle(int id)`, `Escenario crear(EscenarioSave)`, `Escenario actualizar(int id, EscenarioSave)` (reemplaza indicadores), `Escenario buscar(int id)`.
  - `record EscenarioDetalle(int id, String nombre, String descripcion, String objetivo, Integer duracionMin, boolean activo, List<IndicadorDetalle> indicadores)`; `record IndicadorDetalle(int id, String nombre, String descripcion, String competencia, int orden)`.
  - `EscenarioSave` (clase): `@NotBlank nombre`, textos `@Size(max=2000)`, `duracionMin @Positive` opcional, `List<@Valid IndicadorSave> indicadores`. `IndicadorSave`: `@NotBlank nombre`, `competencia`, `orden`.
  - Endpoints `@PreAuthorize(MANAGE_SIMULATOR)`: `GET /escenarios`, `GET /escenarios/{id}` (incluye indicadores), `POST /escenarios` (indicadores anidados), `PUT /escenarios/{id}` (reemplaza indicadores).

- [ ] **Step 1: Escribir el test** `EscenarioControllerTest` (misma plantilla y aislamiento). Pruebas: `creaEscenarioConIndicadores` (POST con 3 indicadores → 201; GET detalle → `indicadores` con `hasSize(3)` ordenados por `orden`); `actualizaReemplazaIndicadores` (PUT con lista distinta → el detalle refleja la nueva lista, sin huérfanos); `detalleInexistenteEs404`; `alumnoSinPermisoEs403`; `creaSinNombreEs400`.

- [ ] **Step 2: Correr y ver fallar.** Expected: FAIL.

- [ ] **Step 3: Implementar** entidades (agregado con cascade/orphanRemoval), DAOs, DTOs, servicio (al actualizar: limpiar la colección y re-poblar para que `orphanRemoval` borre los viejos — hacerlo dentro de `@Transactional`), controlador.

- [ ] **Step 4: Correr y ver pasar.** Expected: PASS.

- [ ] **Step 5: Commit** — `feat(simulador): catálogo de escenarios con indicadores de competencia`

### Task B4: Sesiones — planificar + ciclo de vida

**Files:**
- Create: `simulador/entities/{SesionSimulador.java, EstadoSesion.java}`, `simulador/dao/ISesionSimuladorDao.java`, `simulador/dtos/{SesionSave.java, EstadoSesionSave.java, SesionIndex.java}`, `simulador/services/{ISesionSimuladorService.java, SesionSimuladorServiceImpl.java}`, `simulador/controllers/SesionSimuladorController.java`
- Test: `src/test/java/integration_test/SesionSimuladorCicloControllerTest.java`, `src/test/resources/simulador/sesiones.sql`

**Interfaces:**
- Consumes: tabla `sesiones_simulador` (B1); `ISimuladorService.buscar`, `IEscenarioService.buscar` (B2/B3).
- Produces:
  - `SesionSimulador`: scalar `Integer idSimulador, idEscenario`; `String codAlumno, codInstructor`; `LocalDate fechaPlanificada, fechaEjecucion`; `@Enumerated(STRING) EstadoSesion estado`; textos `notasBriefing/notasDebrief/autoevaluacionAlumno` (`@Column(length=2000)`). Opcional: `@ManyToOne` read-only a `Persona`/`Simulador`/`Escenario` con `insertable=false, updatable=false, @ForeignKey(NO_CONSTRAINT), @NotFound(IGNORE)` para exponer nombres (modelo `Turno.instructor`).
  - `enum EstadoSesion { PLANIFICADA, EN_CURSO, COMPLETADA, CANCELADA }`.
  - `ISesionSimuladorService`: `List<SesionIndex> listar(EstadoSesion estado, String cod)`, `SesionSimulador buscar(int id)`, `SesionSimulador planificar(SesionSave)`, `void cambiarEstado(int id, EstadoSesion nuevo)`.
  - `record SesionIndex(int id, int idSimulador, String simuladorNombre, int idEscenario, String escenarioNombre, String codAlumno, LocalDate fechaPlanificada, EstadoSesion estado)`.
  - `SesionSave` (clase): `@NotNull idSimulador`, `@NotNull idEscenario`, `@NotBlank codAlumno`, `@NotBlank codInstructor`, `@NotNull fechaPlanificada`. `EstadoSesionSave`: `@NotNull estado`.
  - Endpoints `@PreAuthorize(MANAGE_SIMULATOR)`: `GET /sesiones-simulador?estado=&cod=`, `GET /sesiones-simulador/{id}` (detalle llega en B5; aquí basta index/buscar), `POST /sesiones-simulador` (planifica → PLANIFICADA), `PUT /sesiones-simulador/{id}/estado`.
  - **Transiciones válidas** (validadas en el controlador, estilo `matricula.rechazar`): desde PLANIFICADA → EN_CURSO | CANCELADA; desde EN_CURSO → CANCELADA (→ COMPLETADA solo vía calificar, B5). Cualquier otra → `response.isConflict("Transición de estado no permitida.")`.

- [ ] **Step 1: Escribir el test** `SesionSimuladorCicloControllerTest`. Fixture `sesiones.sql`: 1 simulador, 1 escenario, 1 sesión PLANIFICADA. Pruebas:
  - `planificaSesion`: POST válido (idSimulador/idEscenario sembrados, `codAlumno="111111"`) → 201; aparece en `GET ?estado=PLANIFICADA`.
  - `iniciaSesion`: PUT `/estado` `{EN_CURSO}` sobre la PLANIFICADA → 200.
  - `cancelaSesion`: PUT `/estado` `{CANCELADA}` → 200.
  - `transicionInvalidaEs409`: sembrar una COMPLETADA y PUT `{EN_CURSO}` → 409.
  - `planificarConSimuladorInexistenteNoRevienta`: POST con `idSimulador=9999` → 404 (o 400), **no 500**.
  - `alumnoSinPermisoEs403`: POST con token alumno → 403.

- [ ] **Step 2: Correr y ver fallar.** Expected: FAIL.

- [ ] **Step 3: Implementar.** El controlador, antes de cambiar estado: `buscar` → `isNull` si no existe; validar transición → `isConflict` si inválida. Al planificar: validar que `idSimulador`/`idEscenario` existen (`simuladorService.buscar`/`escenarioService.buscar` → `isNull`/`hasModelError` si no) antes de guardar.

- [ ] **Step 4: Correr y ver pasar.** Expected: PASS.

- [ ] **Step 5: Commit** — `feat(simulador): sesiones planificadas y ciclo de vida`

### Task B5: Sesiones — calificación por indicador + resumen

**Files:**
- Create: `simulador/entities/ResultadoIndicador.java`, `simulador/dao/IResultadoIndicadorDao.java`, `simulador/dtos/{CalificacionSave.java, ResultadoSave.java, SesionDetalle.java, ResultadoDetalle.java}`
- Modify: `simulador/entities/SesionSimulador.java` (añadir colección `resultados`), `simulador/services/{ISesionSimuladorService.java, SesionSimuladorServiceImpl.java}` (añadir `detalle`, `calificar`), `simulador/controllers/SesionSimuladorController.java` (añadir `GET /{id}`, `POST /{id}/calificacion`, `GET /mias`)
- Test: `src/test/java/integration_test/SesionSimuladorCalificacionControllerTest.java`, `src/test/resources/simulador/calificacion.sql`

**Interfaces:**
- Consumes: `sesiones_simulador`, `resultados_indicador`, `indicadores_simulacion` (B1); B4.
- Produces:
  - `SesionSimulador.resultados`: `@OneToMany(mappedBy="sesion", cascade=ALL, orphanRemoval=true) @JsonManagedReference List<ResultadoIndicador>`. `ResultadoIndicador`: `@ManyToOne @JoinColumn(name="id_sesion") @JsonBackReference SesionSimulador sesion` + scalar `Integer idIndicador`, `int calificacion`, `String comentario`.
  - `calificar(int id, CalificacionSave)`: exige `estado==EN_CURSO`; valida cada `resultado.idIndicador` ∈ indicadores del escenario de la sesión; setea resultados + notas; `estado=COMPLETADA`, `fechaEjecucion=LocalDate.now()`. (Guardas de estado/validación en el controlador; escritura atómica `@Transactional` en el servicio.)
  - `SesionDetalle detalle(int id)` (null si no existe) con `List<ResultadoDetalle> resultados` (incluye `indicadorNombre`, `competencia`) y `String resumen`: si `estado==COMPLETADA` → `"NO_COMPETENTE"` si algún `calificacion==1`, si no `"COMPETENTE"`; en otro caso `null`. **Derivado, nunca persistido.**
  - `record SesionDetalle(int id, int idSimulador, String simuladorNombre, int idEscenario, String escenarioNombre, String codAlumno, String codInstructor, LocalDate fechaPlanificada, LocalDate fechaEjecucion, EstadoSesion estado, String notasBriefing, String notasDebrief, String autoevaluacionAlumno, List<ResultadoDetalle> resultados, String resumen)`; `record ResultadoDetalle(int idIndicador, String indicadorNombre, String competencia, int calificacion, String comentario)`.
  - `CalificacionSave` (clase): `notasBriefing/notasDebrief/autoevaluacionAlumno` (`@Size(max=2000)`), `List<@Valid ResultadoSave> resultados`. `ResultadoSave`: `@NotNull idIndicador`, `@Min(1) @Max(5) int calificacion`, `comentario`.
  - `GET /sesiones-simulador/mias` (solo `@PreAuthorize("isAuthenticated()")` o sin anotación — cualquier autenticado): usa el `codPersona` del token (ver `MatriculaMiaController` para extraer el usuario actual) y devuelve `listar(null, codPersona)`.

- [ ] **Step 1: Escribir el test** `SesionSimuladorCalificacionControllerTest`. Fixture `calificacion.sql`: simulador, escenario con 2 indicadores (ids conocidos), sesión EN_CURSO para `codAlumno="111111"`, y una PLANIFICADA. Pruebas:
  - `calificaYCompleta`: POST `/{id}/calificacion` con 2 resultados válidos → 200; `GET /{id}` → `estado=COMPLETADA`, `fechaEjecucion` no nula, `resumen="COMPETENTE"`.
  - `calificacionConUnEnUnoEsNoCompetente`: un resultado con `calificacion=1` → detalle `resumen="NO_COMPETENTE"`.
  - `calificarPlanificadaEs409`: POST sobre la PLANIFICADA → 409.
  - `idIndicadorAjenoEs400`: resultado con `idIndicador` de otro escenario → 400, sin persistir.
  - `calificacionFueraDeRangoEs400`: `calificacion=6` → 400.
  - `miasSoloDevuelveLasDelAlumno`: `GET /mias` con token `alumno.lopez` (codPersona 111111) → 200, solo sus sesiones; con otro alumno → vacío.

- [ ] **Step 2: Correr y ver fallar.** Expected: FAIL.

- [ ] **Step 3: Implementar** `ResultadoIndicador`, colección en `SesionSimulador`, DTOs, `detalle`/`calificar` en servicio, endpoints en controlador (guardas de estado/validación arriba del servicio).

- [ ] **Step 4: Correr y ver pasar** — primero la clase, luego `./mvnw -o test` completo. Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit** — `feat(simulador): calificación CBTA por indicador y resumen de competencia`

---

## FASE 2 — Web (features `simuladores`, `escenarios`, `sesiones-simulador`)

Templates en la rama: `src/features/matriculas/*` y `src/features/inscripcion/*` (api/schemas/estado/pages/rutas/mocks/tests). `src/lib/api/sigeda`, `src/lib/auth/{permisos,pantallas,guardas}.ts`, `src/test/render.tsx`, `src/mocks/sigeda/*`.

### Task W1: Fundación + feature `simuladores`

**Files:**
- Modify: `src/lib/auth/permisos.ts` (permiso + grants), `src/lib/auth/pantallas.ts` (grupo + pantallas + icono)
- Create: `src/features/simuladores/{api.ts, schemas.ts, estado.ts, simuladores-page.tsx, simulador-detalle-page.tsx, formulario-simulador.tsx}`
- Create: `src/routes/_app/simuladores/{index.tsx, nueva.tsx, $id/index.tsx, $id/editar.tsx}`
- Create: `src/mocks/sigeda/simulador.ts`; Modify: `src/mocks/handlers.ts`, `src/mocks/reiniciar.ts`
- Test: `src/features/simuladores/simuladores-page.test.tsx`

**Interfaces:**
- Produces:
  - `permisos.ts`: añadir `'Manage Simulator'` (a `PERMISOS_INSCRIPCION` o nuevo `PERMISOS_SIMULADOR` dentro del spread de `PERMISOS`); en `PERMISOS_POR_ROL` otorgarlo a `'Jefe de Operaciones'` y `'Instructor'`.
  - `pantallas.ts`: nuevo `GrupoMenu` `'Simulador'` (+ `ORDEN_GRUPOS`); import de icono lucide (`MonitorPlay`); entradas `simuladores`/`simuladorNuevo`/`simulador`/`simuladorEditar` (`permiso:'Manage Simulator'`, la lista `enMenu:true`, el resto `enMenu:false` con `padre`). (Las entradas de escenarios y sesiones se añaden en W2/W3.)
  - `simulador.ts` mock: store en memoria con semilla (1 simulador), `reiniciarSimulador()`, `sembrarSimuladorMock(...)`, `handlersSimulador` para los 4 endpoints de `/api/simuladores` (usar `autorizar(request,'Manage Simulator')` de `comun.ts`). Registrar `...handlersSimulador` en `handlers.ts` y `reiniciarSimulador()` en `reiniciar.ts`.
  - `api.ts`: tipos `TipoSimulador`, `Simulador`, `CuerpoSimulador`; `esquemaSimulador` (zod parse); `clavesSimuladores`; `listar/obtener/crear/modificar`; `simuladoresQuery/simuladorQuery`.

- [ ] **Step 1: Escribir el test** `simuladores-page.test.tsx` (modelo `convocatorias-page.test.tsx`): `sinPermisoEsRestringido` (`iniciarComo('alumno.lopez')` → "Acceso restringido"); `listaYCrea` (`iniciarComo('jefe.operaciones')`, `renderApp('/simuladores')`, ve la semilla, navega a "Nuevo", completa y guarda, vuelve al detalle).

- [ ] **Step 2: Correr y ver fallar** — `pnpm test:run src/features/simuladores`. Expected: FAIL.

- [ ] **Step 3: Implementar** permisos, pantallas, mock, api/schemas/estado, páginas (lista con `PageHeader`+`Table`+`EmptyState`; detalle con `useSuspenseQuery`; formulario compartido crear/editar con `react-hook-form`+`zodResolver`+`aplicarErroresDeCampo`), rutas (`exigirPantalla(PANTALLAS.x, context.sesion.actual())`, `$id` con `ensureQueryData`).

- [ ] **Step 4: Correr y ver pasar** — `pnpm test:run src/features/simuladores`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(simulador): feature web de simuladores y permiso Manage Simulator`

### Task W2: Feature `escenarios` (+ editor de indicadores)

**Files:**
- Create: `src/features/escenarios/{api.ts, schemas.ts, escenarios-page.tsx, escenario-detalle-page.tsx, formulario-escenario.tsx}`
- Create: `src/routes/_app/escenarios/{index.tsx, nueva.tsx, $id/index.tsx, $id/editar.tsx}`
- Modify: `src/lib/auth/pantallas.ts` (entradas de escenarios), `src/mocks/sigeda/simulador.ts` (handlers + semilla de escenarios/indicadores), 
- Test: `src/features/escenarios/escenario-formulario.test.tsx`

**Interfaces:**
- Consumes: permiso/grupo (W1).
- Produces: `api.ts` con `Escenario`/`Indicador`/`CuerpoEscenario` (indicadores anidados); `schemas.ts` con `esquemaEscenario` incluyendo un **arreglo de indicadores** (useFieldArray-friendly: lista de `{nombre, competencia, orden}`); páginas (detalle muestra la grilla de indicadores); formulario con alta/baja de indicadores (`useFieldArray` de react-hook-form); handlers MSW `/api/escenarios` (incluye indicadores en el detalle; PUT reemplaza).

- [ ] **Step 1: Escribir el test** `escenario-formulario.test.tsx`: `jefe.operaciones` crea un escenario con 2 indicadores y los ve en el detalle; validación de nombre requerido.

- [ ] **Step 2: Correr y ver fallar.** Expected: FAIL.

- [ ] **Step 3: Implementar** feature, rutas, pantallas, handlers.

- [ ] **Step 4: Correr y ver pasar** — `pnpm test:run src/features/escenarios`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(simulador): feature web de escenarios con indicadores`

### Task W3: Feature `sesiones-simulador` (planificar, calificar, detalle, mis sesiones)

**Files:**
- Create: `src/features/sesiones-simulador/{api.ts, schemas.ts, estado.ts, sesiones-page.tsx, sesion-detalle-page.tsx, formulario-sesion.tsx, calificar-sesion-page.tsx, mis-sesiones-page.tsx}`
- Create: `src/routes/_app/sesiones-simulador/{index.tsx, nueva.tsx, $id/index.tsx, $id/calificar.tsx}`, `src/routes/_app/mis-sesiones.tsx` (o bajo un grupo de alumno existente)
- Modify: `src/lib/auth/pantallas.ts`, `src/mocks/sigeda/simulador.ts`
- Test: `src/features/sesiones-simulador/{sesiones-ciclo.test.tsx, calificar.test.tsx}`

**Interfaces:**
- Consumes: W1/W2; mocks de simuladores/escenarios para poblar selects.
- Produces:
  - `api.ts`: `EstadoSesion`, `Sesion`, `SesionDetalle` (con `resultados` y `resumen`), `CuerpoSesion`, `CuerpoCalificacion`; `listarSesiones(estado?)`, `obtenerSesion(id)`, `planificarSesion`, `cambiarEstadoSesion(id,estado)`, `calificarSesion(id,cuerpo)`, `misSesiones()`.
  - `estado.ts`: `ETIQUETA_ESTADO_SESION` (4 estados) + etiqueta de `resumen`.
  - `sesiones-page.tsx`: bandeja con filtro por estado (`validateSearch` zod, modelo `matriculas/index.tsx`), acciones Iniciar/Cancelar según estado.
  - `calificar-sesion-page.tsx`: carga el detalle de la sesión y los indicadores de su escenario; grilla con selector 1–5 (`NativeSelect`) + `Textarea` de comentario por indicador, y textareas de briefing/debrief/autoevaluación; submit → `calificarSesion`.
  - `sesion-detalle-page.tsx`: datos + grilla de resultados + badge de `resumen` (solo si COMPLETADA).
  - `mis-sesiones-page.tsx`: vista del alumno (`GET /mias`), sin requerir `Manage Simulator`.
  - Handlers MSW para `/api/sesiones-simulador*` (planificar/estado/calificación/mias) con la lógica de estado y el `resumen` derivado del lado mock.

- [ ] **Step 1: Escribir los tests.** `sesiones-ciclo.test.tsx`: `jefe.operaciones` planifica una sesión, la inicia, aparece como EN_CURSO; transición inválida no se ofrece. `calificar.test.tsx`: `instructor.perez` abre una sesión EN_CURSO, califica los indicadores (uno en 1), guarda → el detalle muestra resumen "No competente".

- [ ] **Step 2: Correr y ver fallar.** Expected: FAIL.

- [ ] **Step 3: Implementar** feature, rutas, pantallas, handlers.

- [ ] **Step 4: Correr y ver pasar** — `pnpm test:run src/features/sesiones-simulador`, luego el gate completo `pnpm verify` (tsc + oxlint + vitest + build). Expected: todo verde.

- [ ] **Step 5: Commit** — `feat(simulador): feature web de sesiones (planificar, calificar, mis sesiones)`

---

## Revisión final

Tras W3, revisión de toda la rama en ambos repos (revisor fresco, modelo más capaz) con `requesting-code-review`, enfocando el Review Focus de arriba y las `Ruling:` del ledger. Re-gradar por efecto; Critical/Important → un pase de arreglo con TDD; Minor → ledger. Verificación en PostgreSQL real de `029-simulador.sql` y e2e Playwright quedan como pendientes para el usuario (no hay PG local; no se levanta el dev server).

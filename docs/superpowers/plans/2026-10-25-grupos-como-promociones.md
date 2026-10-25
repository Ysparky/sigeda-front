# Grupos como promociones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al grupo un ciclo de vida (estado, fechas, cupo) e historial de pertenencia, de modo que un alumno solo entre a un grupo con inscripción abierta y, si entra a uno ya empezado, quede registrado como incorporación tardía — sin heredar la teoría previa ni alterar el puesto de mérito.

**Architecture:** El grupo pasa a ser la promoción (no se agrega tabla `ediciones`). `grupos` gana `estado`/`fecha_inicio`/`fecha_fin`/`cupo`; una tabla nueva `asignaciones_grupo` lleva el historial mientras `personas.id_grupo` se conserva como grupo vigente. Las reglas de estado viven en el servicio (no solo en el DTO ni en la web). Se implementa por fases: backend (contrato) → proyección IA (una marca) → web (consumo de ambos, va última).

**Tech Stack:** sigeda-back (Spring Boot 3 / Java 17 / JPA / PostgreSQL, pruebas JUnit + H2 y verificación en PG); sigeda-web (React 19 / TanStack Router+Query / zod / Tailwind / MSW / vitest); sigeda_chat_status (NestJS).

**Spec:** `sigeda-web/docs/superpowers/specs/2026-10-25-grupos-como-promociones-design.md`

## Global Constraints

- `EstadoGrupo` es `@Enumerated(EnumType.STRING)`, mismo estilo que `Programa`; columna `varchar(255) check (estado in ('PLANIFICADO','INSCRIPCION','EN_CURSO','CERRADO'))`.
- Fechas por API en formato `uuuu-MM-dd` vía `@JsonDeserialize(using = CustomDateDeserializer.class)` (el deserializador devuelve `null`, no lanza).
- Permiso de gestión = `Permiso.MANAGE_GROUPS` (`"Manage Groups"` → Administrador Web + Coordinador Académico). Historial también visible con `VIEW_ALL_GROUPS` (Admin + Comandante).
- Toda regla de estado va **en el servicio**; el backend rechaza aunque la llamada no pase por la web (anti-objetivo §2 de la spec).
- Convergencia obligatoria `data_prod.sql` ↔ `migraciones/*` ↔ `schema_prod.sql`, cubierta por un `Semilla*Test` (molde `028-coordinador.sql` + `SemillaCoordinadorTest`). No romper las semillas existentes.
- `personas.id_grupo` se conserva; cada cambio de `id_grupo` escribe una fila en `asignaciones_grupo` en la **misma transacción**. Invariante: a lo sumo una fila vigente (`fecha_baja is null`) por persona, y coincide con `personas.id_grupo`.
- Commits Conventional Commits, cortos, **sin** trailer Co-Authored-By. pnpm (nunca npm/npx) en sigeda-web.
- Verificar la migración y las consultas nuevas también en PostgreSQL: `sh scripts/reiniciar-demo.sh --solo-sigeda --si` sobre `sigeda-pg` (H2 ha ocultado defectos de PG). `mvnw` necesita `export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`.

## Review Focus

- **Alta directa a grupo `EN_CURSO` por API (sin web):** `POST/PUT /api/grupos` con un `checked=true` nuevo debe dar `409`, no asignar. Cubierto en Task 1.2.
- **Baja de un `EN_CURSO` por el `PUT /api/grupos` normal (checked=false):** debe dar `409` y exigir el endpoint de baja; no debe dejar al alumno sin grupo silenciosamente. Task 1.2.
- **Tardío que arrastra teoría previa:** un alumno con `tardia=true` no debe ver como pendientes/faltas ni subsanaciones los turnos teóricos con `fechaExamen < fecha_alta`. Task 1.4.
- **Turno práctico con un alumno cuyo grupo no está `EN_CURSO`:** debe rechazarse señalando a ese alumno (índice en `alumnosTurno[i]`). Task 1.5.
- **Transición de estado inválida (hacia atrás o sin precondición):** `PUT …/estado` a un estado anterior, o `iniciar` sin `fecha_inicio`/sin alumnos, debe dar `409`. Task 1.3.

---

## FASE 1 — Backend (`sigeda-back`)

### Task 1.1: Modelo de datos — `EstadoGrupo`, columnas de `grupos`, tabla `asignaciones_grupo`, esquema + semilla + migración 029

**Files:**
- Create: `src/main/java/com/sigeda/backend/grupo/entities/EstadoGrupo.java`
- Modify: `src/main/java/com/sigeda/backend/grupo/entities/Grupo.java` (agregar campos)
- Create: `src/main/java/com/sigeda/backend/grupo/entities/Asignacion_Grupo.java`
- Modify: `src/main/resources/schema_prod.sql` (columnas de `grupos`; tabla + secuencia + FKs de `asignaciones_grupo`)
- Modify: `src/main/resources/data_prod.sql` (estado/fechas/cupo de los 6 grupos; filas vigentes de `asignaciones_grupo`)
- Create: `src/main/resources/migraciones/029-grupos-como-promociones.sql`
- Test: `src/test/java/unit_test/SemillaGruposComoPromocionesTest.java`

**Interfaces:**
- Produces: `enum EstadoGrupo { PLANIFICADO, INSCRIPCION, EN_CURSO, CERRADO }`.
- Produces: `Grupo` gana `EstadoGrupo estado` (`@Enumerated(STRING)`, not null), `LocalDate fechaInicio`, `LocalDate fechaFin`, `Integer cupo`, con getters/setters.
- Produces: `Asignacion_Grupo { int id (seq asignaciones_grupo_seq), String codPersona, int idGrupo, LocalDate fechaAlta, LocalDate fechaBaja, boolean tardia, String motivo, String codAutoriza }`, `@Table(name="asignaciones_grupo")`.

- [ ] **Step 1: Escribir el test de semilla (falla)** — `SemillaGruposComoPromocionesTest` siguiendo `SemillaCoordinadorTest` (localiza raíz por `pom.xml`; lee SEED=`data_prod.sql`, ESQUEMA=`schema_prod.sql`, MIGRACION=`migraciones/029-grupos-como-promociones.sql`). Asserts:
  - ESQUEMA: `grupos` tiene `estado varchar(255) check (estado in ('PLANIFICADO','INSCRIPCION','EN_CURSO','CERRADO'))`, `fecha_inicio date`, `fecha_fin date`, `cupo integer`; existe `create sequence asignaciones_grupo_seq`; tabla `asignaciones_grupo` con sus columnas y FKs a `personas`/`grupos`.
  - SEED: Grupos 1,2,3,4,6 = `EN_CURSO` con `fecha_inicio` no nula y `fecha_fin = fecha_inicio + 81 días`, `cupo` nulo; Grupo 5 = `INSCRIPCION`, `fecha_inicio`/`fecha_fin` nulas. Una fila vigente de `asignaciones_grupo` (`fecha_baja is null`, `tardia=false`, `cod_autoriza='000001'`) por cada persona con `id_grupo` no nulo (111111,222222,555555,666666,777777,999999), y ninguna para el Grupo 5.
  - MIGRACION: ≥1 `on conflict do nothing` / `if not exists`, un `setval('asignaciones_grupo_seq'…`, y el `alter table grupos add column … if not exists`.
- [ ] **Step 2: Correr el test, verificar que falla** — `sh ./mvnw -o test -Dtest=SemillaGruposComoPromocionesTest` → FAIL.
- [ ] **Step 3: Crear `EstadoGrupo` y los campos de `Grupo`** — enum + 4 campos con sus accesores (molde: `Programa` en `Grupo.java:27-28`).
- [ ] **Step 4: Crear `Asignacion_Grupo`** — entity con `@GeneratedValue` sobre `asignaciones_grupo_seq` (molde de la secuencia de `Grupo.java:21-24`).
- [ ] **Step 5: `schema_prod.sql`** — agregar las 4 columnas a `grupos`; `create sequence asignaciones_grupo_seq start with N increment by 1;` (N = 1 + nº de filas sembradas); `create table asignaciones_grupo (...)` con FKs `FK_asig_personas`/`FK_asig_grupos`; incluir sus `drop` junto a los demás.
- [ ] **Step 6: `data_prod.sql`** — `update grupos set estado=…, fecha_inicio=…, fecha_fin=…` (fechas literales estables; `fecha_inicio` = fecha del primer turno de cada grupo calculada una vez y escrita como literal, §8 de la spec; Grupo 5 `INSCRIPCION`/null); `insert into asignaciones_grupo (...)` una fila vigente por alumno con grupo.
- [ ] **Step 7: `migraciones/029-grupos-como-promociones.sql`** — idempotente (`\set ON_ERROR_STOP on`, `begin;…commit;`): `alter table grupos add column if not exists …`; `create table if not exists asignaciones_grupo …`; mismos `update`/`insert … on conflict do nothing`; `select setval('asignaciones_grupo_seq', greatest(N, (select max(id)+1 …)), false);`.
- [ ] **Step 8: Correr el test, verificar que pasa** — `-Dtest=SemillaGruposComoPromocionesTest` → PASS.
- [ ] **Step 9: Verificar en PostgreSQL** — `sh scripts/reiniciar-demo.sh --solo-sigeda --si`; el backend arranca y `select estado,fecha_inicio,fecha_fin,cupo from grupos;` + `select count(*) from asignaciones_grupo where fecha_baja is null;` dan lo sembrado.
- [ ] **Step 10: Commit** — `feat(grupos): estado, fechas y cupo del grupo + tabla asignaciones_grupo (modelo, semilla, migración 029)`.

### Task 1.2: Reglas de asignación por estado en `RegistroDeGrupo` + `IAsignacion_GrupoDao`

**Files:**
- Create: `src/main/java/com/sigeda/backend/grupo/dao/IAsignacion_GrupoDao.java`
- Modify: `src/main/java/com/sigeda/backend/grupo/services/RegistroDeGrupo.java`
- Create: excepción `src/main/java/com/sigeda/backend/grupo/services/AsignacionInvalidaException.java` (lleva un mensaje para el `409`)
- Test: `src/test/java/unit_test/RegistroDeGrupoTest.java` (o integración si la convención lo pide)

**Interfaces:**
- Consumes: `Asignacion_Grupo`, `EstadoGrupo`, `Grupo` (Task 1.1).
- Produces: `IAsignacion_GrupoDao`: `Asignacion_Grupo findVigenteByCodPersona(String cod)` (fecha_baja null), `List<Asignacion_Grupo> findByIdGrupoOrderByFechaAltaAsc(int idGrupo)`.
- Produces: `RegistroDeGrupo.guardarConPersonas(Grupo, List<Persona>, Map<String,Boolean>)` mantiene la firma pero ahora valida estado y escribe historial; lanza `AsignacionInvalidaException` (→ `409`) cuando se viola una regla.
- Produces: helper `altaTardia(int idGrupo, String codPersona, String motivo, String codAutoriza)` y `baja(int idGrupo, String codPersona, String motivo, String codAutoriza)` usados por Task 1.3.

- [ ] **Step 1: Tests (fallan)** — en `RegistroDeGrupoTest`:
  - `alta_normal_solo_en_INSCRIPCION`: alta (`checked=true` para alguien nuevo) en grupo `INSCRIPCION` → persona queda con grupo + fila vigente `tardia=false`; en grupo `EN_CURSO` → `AsignacionInvalidaException`.
  - `alta_respeta_cupo`: con `cupo` lleno → excepción.
  - `baja_en_EN_CURSO_por_guardar_normal_se_rechaza`: `checked=false` para un integrante de grupo `EN_CURSO` → excepción (hay que usar el endpoint de baja).
  - `baja_en_INSCRIPCION_sin_motivo`: `checked=false` en `INSCRIPCION` → cierra fila (`fecha_baja=hoy`) y deja `id_grupo=null`.
  - `mover_de_grupo`: baja del viejo + alta en el nuevo, cada lado con sus reglas; invariante de una sola fila vigente.
- [ ] **Step 2: Correr, verificar que fallan.**
- [ ] **Step 3: Implementar `IAsignacion_GrupoDao`** (consultas derivadas).
- [ ] **Step 4: Implementar las reglas en `RegistroDeGrupo.guardarConPersonas`** — por cada persona: comparar estado actual vs pedido; aplicar alta/baja/mover según el estado del grupo; escribir `Asignacion_Grupo` en la misma `@Transactional` (ya existente, L42). Extraer `altaTardia`/`baja` reutilizables.
- [ ] **Step 5: Correr, verificar que pasan.**
- [ ] **Step 6: Commit** — `feat(grupos): reglas de alta/baja por estado y escritura de historial en asignaciones_grupo`.

### Task 1.3: Endpoints de incorporación tardía, baja, transición de estado; fechas/cupo en DTOs; historial y lectura

**Files:**
- Modify: `src/main/java/com/sigeda/backend/grupo/controllers/GrupoController.java` (3 endpoints nuevos + lectura)
- Modify: `src/main/java/com/sigeda/backend/grupo/dtos/GrupoSave.java` y `GrupoUpdate.java` (fechaInicio/fechaFin/cupo)
- Create: `src/main/java/com/sigeda/backend/grupo/dtos/IncorporacionTardiaSave.java`, `BajaDeGrupoSave.java`, `CambioDeEstadoSave.java`
- Modify: la proyección/DTO de index y el detalle de grupo para exponer `estado`, `fechaInicio`, `fechaFin`, `cupo`, `inscritos`
- Create: DTO `AsignacionDeHistorial` (fila de historial) + endpoint
- Modify: `src/main/java/com/sigeda/backend/grupo/services/*` (GrupoService para transición de estado)
- Test: `src/test/java/integration_test/GrupoPromocionControllerTest.java`

**Interfaces:**
- Consumes: `altaTardia`/`baja` de `RegistroDeGrupo`, `IAsignacion_GrupoDao` (Task 1.2).
- Produces (contrato que consume la web, Fase 2):
  - `POST /api/grupos/{id}/incorporaciones` `MANAGE_GROUPS` body `IncorporacionTardiaSave { String codPersona; @Size(min=10,max=500) @NotBlank String motivo }` → `409` si el grupo no está `EN_CURSO`, si la persona no es `tipo="Alumno"`, o si el cupo está lleno.
  - `POST /api/grupos/{id}/bajas` `MANAGE_GROUPS` body `BajaDeGrupoSave { String codPersona; @NotBlank String motivo }`.
  - `PUT /api/grupos/{id}/estado` `MANAGE_GROUPS` body `CambioDeEstadoSave { EstadoGrupo estado }` → valida hacia adelante; `iniciar` exige `fecha_inicio` + ≥1 alumno; `cerrar` fija `fecha_fin=hoy` si estaba vacía.
  - `GET /api/grupos` y `GET /api/grupos/{id}`: suman `estado`, `fechaInicio`, `fechaFin`, `cupo`, `inscritos` (nº de asignaciones vigentes).
  - `GET /api/grupos/{id}/historial` `MANAGE_GROUPS`|`VIEW_ALL_GROUPS` → `List<AsignacionDeHistorial { codPersona, alumno, fechaAlta, fechaBaja, tardia, motivo, codAutoriza, autoriza }>`.
  - `GrupoSave`/`GrupoUpdate` ganan `LocalDate fechaInicio`, `LocalDate fechaFin`, `Integer cupo` (con `@JsonDeserialize` en las fechas).

- [ ] **Step 1: Tests de integración (fallan)** — `GrupoPromocionControllerTest` (MockMvc, usuario con `MANAGE_GROUPS`): tardía feliz (201 + fila `tardia=true`); tardía en grupo no `EN_CURSO` (`409`); tardía con motivo <10 (`400`); baja (fila cerrada, `id_grupo=null`); transición `INSCRIPCION→EN_CURSO` sin `fecha_inicio` (`409`); transición hacia atrás (`409`); `GET /api/grupos/{id}` trae `estado/fechas/cupo/inscritos`; `GET …/historial` lista las filas.
- [ ] **Step 2: Correr, verificar que fallan.**
- [ ] **Step 3: Implementar** los 3 DTOs, los 3 endpoints, la transición de estado en el servicio, los campos nuevos en `GrupoSave`/`GrupoUpdate` (y su mapeo en `CreateToEntity`/`UpdateToEntity`), la lectura (`estado/fechas/cupo/inscritos`) en index/detail, y el endpoint de historial con su DTO.
- [ ] **Step 4: Correr, verificar que pasan.**
- [ ] **Step 5: Verificar en PostgreSQL** — recorrer tardía→baja→estado con `curl` contra `:8080` sobre `sigeda-pg`.
- [ ] **Step 6: Commit** — `feat(grupos): endpoints de incorporación tardía, baja y transición de estado; fechas/cupo e historial en la lectura`.

### Task 1.4: Teoría — el tardío no hereda exámenes previos a su `fecha_alta`

**Files:**
- Modify: `src/main/java/com/sigeda/backend/cuestionario/services/EstadoTeoricoServiceImpl.java` (`pendientesDe(Persona)`, ~L299)
- Modify: `src/main/java/com/sigeda/backend/cuestionario/services/CuestionarioServiceImpl.java` (`pendientesDe(String)`, ~L150)
- Modify: `src/main/java/com/sigeda/backend/cuestionario/services/HistorialTeoricoServiceImpl.java` (`subsanacionesDelGrupoDe(String)`, ~L84)
- Modify (si hace falta): `src/main/java/com/sigeda/backend/turnoteorico/dao/ITurnoTeoricoDao.java` (variante que recibe `fecha_alta` mínima) o filtrar en Java tras leer la `fecha_alta` vigente.
- Test: `src/test/java/.../TeoriaTardioTest.java`

**Interfaces:**
- Consumes: `IAsignacion_GrupoDao.findVigenteByCodPersona` → `fechaAlta` y `tardia` (Task 1.2); `TurnoTeorico.getFechaExamen()` (`LocalDate`).
- Produces: en los tres métodos, para una asignación vigente `tardia=true`, se descartan los `TurnoTeorico` con `fechaExamen < fechaAlta`. Para `tardia=false` el comportamiento no cambia.

- [ ] **Step 1: Tests (fallan)** — alumno tardío con `fecha_alta` posterior a un turno teórico del grupo: `EstadoTeoricoServiceImpl.pendientesDe` no lo cuenta pendiente/falta; `CuestionarioServiceImpl.pendientesDe` no abre ese cuestionario; `HistorialTeoricoServiceImpl` no ofrece esa subsanación. Un alumno no-tardío ve todo como hoy.
- [ ] **Step 2: Correr, verificar que fallan.**
- [ ] **Step 3: Implementar** — leer la asignación vigente; si `tardia`, filtrar por `fechaExamen >= fechaAlta` (en la consulta o en memoria, lo que sea reproducible en H2 y PG).
- [ ] **Step 4: Correr, verificar que pasan.**
- [ ] **Step 5: Commit** — `feat(grupos): el alumno de incorporación tardía no hereda la teoría previa a su ingreso`.

### Task 1.5: Turnos — teórico exige grupo `EN_CURSO`; práctico exige grupo `EN_CURSO` de cada alumno

**Files:**
- Modify: `src/main/java/com/sigeda/backend/turnoteorico/services/TurnoTeoricoServiceImpl.java` (`validarCruce`, ~L288)
- Modify: `src/main/java/com/sigeda/backend/turno/services/TurnoService.java` (`save`, loop de alumnos ~L320)
- Create: excepción/manejo para el caso práctico señalando el índice del alumno (mismo patrón que `AlumnoBloqueadoException`)
- Test: `src/test/java/.../TurnoEstadoGrupoTest.java`

**Interfaces:**
- Consumes: `Grupo.getEstado()` (Task 1.1); `Persona.getGrupo()`/`getIdGrupo()`; `EstadoGrupo.EN_CURSO`.
- Produces: turno teórico cuyo grupo no esté `EN_CURSO` → `rejectValue("idGrupo", …)` (`400`/validación, como el resto de `validarCruce`); turno práctico con algún alumno cuyo grupo no esté `EN_CURSO` → error de campo en `alumnosTurno[i].codAlumno`.

- [ ] **Step 1: Tests (fallan)** — teórico sobre grupo `INSCRIPCION` → rechazado; práctico con un alumno de grupo no `EN_CURSO` → rechazado señalando su índice; casos felices (grupo `EN_CURSO`) pasan.
- [ ] **Step 2: Correr, verificar que fallan.**
- [ ] **Step 3: Implementar** — en `validarCruce` reusar el `Grupo grupo` ya cargado (L290) y chequear estado; en `TurnoService.save` agregar un `verificarGrupoEnCurso(alumnosTurno)` espejo de `verificarQueNadieEstaBloqueado` (L320).
- [ ] **Step 4: Correr, verificar que pasan.**
- [ ] **Step 5: Commit** — `feat(grupos): solo se programan turnos sobre grupos EN_CURSO`.

### Task 1.6: Mérito y lectura de persona — marca de incorporación tardía (sin cambiar el puesto)

**Files:**
- Modify: `src/main/java/com/sigeda/backend/indices/dtos/FilaDeMerito.java` (agregar 2 campos)
- Modify: `src/main/java/com/sigeda/backend/indices/services/OrdenDeMeritoServiceImpl.java` (`filaDe`, ~L96)
- Modify: `src/main/java/com/sigeda/backend/indices/utils/OrdenDeMerito.java` (propagar los campos en `conPuesto`/`rankear` sin tocar el orden)
- Modify: el DTO del detalle de persona (`/api/personas/{cod}`) para sumar `incorporacionTardia`/`fechaIngreso`
- Test: `src/test/java/.../MeritoTardioTest.java`

**Interfaces:**
- Consumes: `IAsignacion_GrupoDao.findVigenteByCodPersona` → `tardia`, `fechaAlta`.
- Produces: `FilaDeMerito` gana `boolean incorporacionTardia`, `LocalDate fechaIngreso` (record: agregar a la lista de componentes y a `conPuesto`). El detalle de persona expone los mismos dos campos.

- [ ] **Step 1: Tests (fallan)** — un alumno tardío sale con `incorporacionTardia=true` y `fechaIngreso` en su `FilaDeMerito` **sin** cambiar su `puesto` respecto del cálculo actual; el detalle de persona lo expone.
- [ ] **Step 2: Correr, verificar que fallan.**
- [ ] **Step 3: Implementar** — leer la asignación vigente en `filaDe`; propagar los campos por `conPuesto`/`rankear`/`reordenar` (que `MERITO` y el orden no los usen); sumarlos al DTO de persona.
- [ ] **Step 4: Correr, verificar que pasan.**
- [ ] **Step 5: Commit** — `feat(grupos): marca de incorporación tardía en orden de mérito y detalle de persona`.

### Task 1.7: Suite backend completa + verificación en PostgreSQL

- [ ] **Step 1:** `export JAVA_HOME=…openjdk@17…` && `sh ./mvnw -o test` → toda la suite verde.
- [ ] **Step 2:** `sh scripts/reiniciar-demo.sh --solo-sigeda --si` y recorrido manual del contrato nuevo contra `sigeda-pg`.
- [ ] **Step 3: Commit** si hubo ajustes — `test(grupos): suite backend verde en H2 y verificada en PostgreSQL`.

---

## FASE 2 — Proyección IA (`sigeda_chat_status`)

### Task 2.1: Exponer la marca de incorporación tardía en la predicción por alumno

**Files:**
- Modify: `src/prediction/sigeda/sigeda.client.ts` (nuevo método que lee el detalle de persona)
- Modify: `src/prediction/dto/prediction-response.dto.ts` (`StudentPredictionDto`)
- Modify: `src/prediction/prediction.service.ts` (`getStudentPrediction`, armado del `base`)
- Test: `src/prediction/prediction.service.spec.ts` (o el spec existente del módulo)

**Interfaces:**
- Consumes: `GET /api/personas/{cod}` → `{ incorporacionTardia: boolean, fechaIngreso: string|null }` (Task 1.6).
- Produces: `SigedaClient.detalleDePersona(token: string, codigo: string): Promise<{ incorporacionTardia: boolean; fechaIngreso: string | null } | null>` → `GET /api/personas/${codigo}` (reusa `obtener<T>`; 404/403 → `null`).
- Produces: `StudentPredictionDto` gana `incorporacionTardia: boolean` y `fechaIngreso: string | null`.

- [ ] **Step 1: Test (falla)** — en `getStudentPrediction`, con un `detalleDePersona` mockeado que devuelve `tardia`, el DTO sale con `incorporacionTardia=true` y `fechaIngreso` puesto; el `riskLevel`/`riskScore` **no cambia**; con `null` del cliente, `incorporacionTardia=false`, `fechaIngreso=null`.
- [ ] **Step 2: Correr, verificar que falla** — `pnpm test -- prediction` (nota: `pnpm test` NO typechequea; correr `pnpm tsc` aparte).
- [ ] **Step 3: Implementar** — método en `SigedaClient`; en `getStudentPrediction` llamar una vez (es el detalle, no la lista → sin N+1) y poblar el `base`. La guarda `MIN_EVALUATIONS_FOR_PREDICTION` queda igual. *(Decisión: la marca va en el detalle; la tarjeta de lista queda como extensión opcional para no meter N llamadas a SIGEDA.)*
- [ ] **Step 4: Correr test + `pnpm tsc`, verificar que pasan.**
- [ ] **Step 5: Commit** — `feat(prediction): exponer incorporación tardía y fecha de ingreso en la predicción del alumno`.

## FASE 3 — Web (`sigeda-web`)

### Task 3.1: `api.ts` + `schemas.ts` de grupos — estado/fechas/cupo y las nuevas operaciones

**Files:**
- Modify: `src/features/grupos/api.ts`, `src/features/grupos/schemas.ts`
- Test: `src/features/grupos/api.test.ts`

**Interfaces:**
- Produces (tipos): `GrupoFila` y `GrupoDetalle` ganan `estado: EstadoGrupo`, `fechaInicio: string | null`, `fechaFin: string | null`, `cupo: number | null`, `inscritos: number`. `type EstadoGrupo = 'PLANIFICADO'|'INSCRIPCION'|'EN_CURSO'|'CERRADO'`. `AsignacionHistorial = { codPersona; alumno; fechaAlta; fechaBaja: string|null; tardia; motivo: string|null; autoriza }`.
- Produces (fns): `incorporacionTardia(id, { codPersona, motivo }): Promise<GrupoGuardado>` → `POST /api/grupos/${id}/incorporaciones`; `darDeBaja(id, { codPersona, motivo }): Promise<GrupoGuardado>` → `POST /api/grupos/${id}/bajas`; `cambiarEstado(id, estado): Promise<GrupoGuardado>` → `PUT /api/grupos/${id}/estado`; `obtenerHistorial(id): Promise<AsignacionHistorial[]>` → `GET /api/grupos/${id}/historial`. `consultasGrupos.historial(id)`.
- Produces: `GrupoSave`/form envía `fechaInicio`/`fechaFin`/`cupo` (ampliar `CuerpoGrupoNuevo`/`CuerpoGrupoModificado` y `esquemaGrupo`/`GRUPO_VACIO`).

- [ ] **Step 1: Test (falla)** — `api.test.ts` (MSW): `obtenerGrupo` parsea `estado/fechas/cupo/inscritos`; `incorporacionTardia`/`darDeBaja`/`cambiarEstado` pegan a la ruta correcta y devuelven `GrupoGuardado`; un `409` se convierte en `ApiError` con `erroresDeCampo`.
- [ ] **Step 2: Correr, verificar que falla** — `pnpm vitest run src/features/grupos/api.test.ts`.
- [ ] **Step 3: Implementar** los tipos, zod y fns.
- [ ] **Step 4: Correr + `pnpm tsc -b`, verificar que pasan.**
- [ ] **Step 5: Commit** — `feat(grupos): api web de estado/fechas/cupo, incorporación tardía, baja, transición e historial`.

### Task 3.2: Lista, detalle y formulario — estado, fechas, transiciones y acciones de `EN_CURSO`

**Files:**
- Modify: `src/features/grupos/columnas.tsx` (estado/fechas/inscritos en la lista)
- Modify: `src/features/grupos/grupo-page.tsx` (cabecera con estado/fechas/cupo)
- Modify: `src/features/grupos/components/formulario-grupo.tsx` (campos nuevos, botones de transición, acciones de EN_CURSO)
- Create: `src/features/grupos/components/dialogo-incorporacion-tardia.tsx`, `dialogo-baja.tsx`
- Test: `src/features/grupos/formulario-grupo.test.tsx`, `grupos-page.test.tsx`

**Interfaces:**
- Consumes: las fns de Task 3.1; `aplicarErroresDeCampo` / `AvisoDeError` para los `409`.
- Produces: el formulario, según `grupo.estado`: `INSCRIPCION` → selector de alumnos como hoy; `EN_CURSO` → sin selector, con **«Incorporación tardía»** (diálogo alumno+motivo, texto de excepción) y **«Dar de baja»** por integrante (diálogo motivo); `PLANIFICADO`/`CERRADO` → integrantes de solo lectura. Campos `fechaInicio`/`fechaFin`/`cupo`. Botones de transición con confirmación en `iniciar`/`cerrar`.

- [ ] **Step 1: Tests (fallan)** — lista muestra etiqueta de estado + «inscritos/cupo»; en `EN_CURSO` el formulario oculta el selector y muestra las dos acciones; el diálogo de tardía exige motivo (≥10) y al enviar llama `incorporacionTardia`; un `409` del backend se muestra en el `Alert`/campo.
- [ ] **Step 2: Correr, verificar que fallan.**
- [ ] **Step 3: Implementar** columnas, cabecera, formulario condicionado por estado, los dos diálogos y los botones de transición.
- [ ] **Step 4: Correr + `pnpm tsc -b`, verificar que pasan.**
- [ ] **Step 5: Commit** — `feat(grupos): ciclo de vida del grupo en la web (estado, fechas, incorporación tardía y baja)`.

### Task 3.3: Historial del grupo (vista)

**Files:**
- Create: `src/features/grupos/components/historial-grupo.tsx`
- Modify: `src/features/grupos/grupo-page.tsx` (pestaña/sección de historial)
- Test: `src/features/grupos/historial-grupo.test.tsx`

**Interfaces:**
- Consumes: `obtenerHistorial(id)` / `consultasGrupos.historial(id)` (Task 3.1).
- Produces: tabla con alta, baja, tardía (marca), motivo y quién autorizó.

- [ ] **Step 1: Test (falla)** — render con `AsignacionHistorial[]` mock muestra altas/bajas/tardías/motivos/autoriza.
- [ ] **Step 2: Correr, verificar que falla.**
- [ ] **Step 3: Implementar** la vista y su enganche en `grupo-page`.
- [ ] **Step 4: Correr, verificar que pasa.**
- [ ] **Step 5: Commit** — `feat(grupos): vista de historial de pertenencia del grupo`.

### Task 3.4: Etiqueta de incorporación tardía en mérito y proyección

**Files:**
- Modify: `src/features/reportes/api.ts` (`FilaDeMerito` + `incorporacionTardia`/`fechaIngreso`), `src/features/reportes/columnas.tsx` (badge en la celda `alumno`)
- Modify: `src/features/proyeccion/api.ts` (`ProyeccionAlumno` + campos y `proyeccionApi`), `src/features/proyeccion/proyeccion-alumno-page.tsx` (etiqueta en la cabecera/«Cifras clave»)
- Test: `src/features/reportes/columnas.test.tsx` (o el de la página), `src/features/proyeccion/*.test.tsx`

**Interfaces:**
- Consumes: `FilaDeMerito` del backend con `incorporacionTardia`/`fechaIngreso` (Task 1.6); `ProyeccionAlumno` de la IA con los mismos campos (Task 2.1).
- Produces: en ambas vistas, etiqueta «Incorporación tardía · desde dd/mm/aaaa» junto al nombre; el puesto de mérito y el riesgo **no cambian**.

- [ ] **Step 1: Tests (fallan)** — fila de mérito con `incorporacionTardia=true` muestra la etiqueta sin alterar el `puesto`; detalle de proyección muestra la etiqueta.
- [ ] **Step 2: Correr, verificar que fallan.**
- [ ] **Step 3: Implementar** los tipos, zod y el badge en ambas vistas.
- [ ] **Step 4: Correr + `pnpm tsc -b`, verificar que pasan.**
- [ ] **Step 5: Commit** — `feat(grupos): etiqueta de incorporación tardía en orden de mérito y proyección`.

### Task 3.5: Mock MSW al día + suite web completa

**Files:**
- Modify: `src/mocks/sigeda/grupos.ts` (estado/fechas/cupo; handlers de incorporaciones/bajas/estado/historial), `src/mocks/sigeda/datos.ts` (semilla: Grupo 5 `INSCRIPCION`, resto `EN_CURSO`, con fechas; filas de asignación), `src/mocks/sigeda/comun.ts` (helper `conflicto` → **409** con el mismo formato de `erroresDeCampo`)
- Modify: los mocks de reportes/proyección para incluir `incorporacionTardia`/`fechaIngreso`
- Test: toda la suite `pnpm vitest run`

**Interfaces:**
- Consumes: el contrato de Fases 1–3.
- Produces: `GrupoMock` gana `estado/fechaInicio/fechaFin/cupo`; handlers nuevos que replican las reglas de estado y devuelven `409` vía el helper `conflicto`; datos sembrados iguales a `data_prod.sql`.

- [ ] **Step 1:** agregar el helper `conflicto` (409) en `comun.ts` y los campos/handlers en el mock; ajustar la semilla mock.
- [ ] **Step 2:** `pnpm vitest run` → toda la suite verde; `pnpm tsc -b` limpio.
- [ ] **Step 3: Commit** — `test(grupos): mock MSW con ciclo de vida del grupo y suite web verde`.

### Task 3.6: Recorrido de extremo a extremo contra el backend real (opcional pero recomendado)

- [ ] **Step 1:** con `scripts/levantar-demo.sh` + `pnpm dev` (env local), recorrer: Grupo 5 `INSCRIPCION` → asignar un alumno recién validado → iniciar (`EN_CURSO`) → incorporación tardía de otro con motivo → ver historial y etiqueta en mérito. Captura para la demo.
- [ ] **Step 2: Commit** si hubo ajustes de e2e — `test(grupos): e2e del ciclo de promoción contra el backend real`.

---

## Self-review

- **Cobertura de la spec:** §3 ciclo de vida → T1.1/T1.3; §4.1 columnas → T1.1; §4.2 `asignaciones_grupo` → T1.1/T1.2; §4.3 semilla/migración → T1.1; §5.1 asignación por estado → T1.2; §5.2 tardía → T1.3; §5.3 baja → T1.3; §5.4 transición → T1.3; §5.5 teoría no heredada → T1.4; §5.6 turnos → T1.5; §5.7 lectura/mérito → T1.3/T1.6; §6 web → T3.1–T3.5; §7 proyección → T2.1 + T3.4. Sin huecos.
- **Dependencias cruzadas:** T2.1 depende de T1.6 (`/api/personas/{cod}` con los campos); T3.4 (proyección) depende de T2.1; el resto de la web solo del backend (Fase 1). Por eso el orden backend → IA → web.
- **Consistencia de nombres:** `incorporacionTardia`/`fechaIngreso` (back `FilaDeMerito`/detalle persona → IA `StudentPredictionDto` → web `FilaDeMerito`/`ProyeccionAlumno`); `EstadoGrupo` con los 4 valores idénticos en back/mock/web; `asignaciones_grupo` columnas idénticas entre entity/esquema/semilla.
- **Review Focus:** cada punto tiene su test en la task dueña (ver sección).
- **Proporción:** el plan describe decisiones e interfaces, sin cuerpos de código; los pasos dejan una sola cosa razonable por escribir.

# Evaluación práctica asistida por simulador — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la telemetría de un simulador de vuelo autocomplete, para que el instructor confirme y firme, las letras (I/R/B/E) por maniobra de la evaluación práctica, comparando lo volado contra tolerancias numéricas por maniobra — sin tocar las fórmulas NFPI/Tabla 4.

**Architecture:** Backend primero (`sigeda-back` posee el modelo, las tolerancias, la ingesta de telemetría y el motor determinista de autocalificación); web después (`sigeda-web` consume: selector de medio, admin de tolerancias, prellenado de la grilla de evaluación). El backend IA (`sigeda_chat_status`) **no se toca**.

**Tech Stack:** Spring Boot 3 / Java 17 / PostgreSQL (H2 en test) · React 19 / TanStack Router+Query / zod / Tailwind / MSW / vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-evaluacion-practica-simulador-design.md` (léelo junto a este plan).

## Global Constraints

- Backend: Java 17 / Spring Boot 3. Compilar/testear con `export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home && sh ./mvnw -o test` (offline). **Nunca** canalizar `mvnw` por `head`.
- Web: **pnpm únicamente** (nunca npm/npx). `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- Migraciones: `src/main/resources/migraciones/NNN-kebab.sql`, 3 dígitos consecutivos desde **029** (última actual 028). Cada cambio de DDL se refleja además en `src/main/resources/schema_prod.sql` y la semilla en `data_prod.sql`, y se **verifica en PostgreSQL real** (H2 es ciego a varios defectos de PG).
- **Retrocompatibilidad:** `Turno.medio` default `AERONAVE`; todos los turnos/evaluaciones existentes siguen funcionando sin cambios.
- Las notas DIRBE y `promedio` siguen siendo String; **no** se numerizan las notas existentes. `CalculoNota`, `PesosDelPdi`, `NotaDeSubfase`, `IndiceServiceImpl`, `OrdenDeMeritoServiceImpl` quedan **intactos**.
- El instructor es **firmante único**: la propuesta prellena, no crea la evaluación. **No** se añade ninguna ruta de calificación autónoma.
- Permisos: definir tolerancias ⇒ `MANAGE_STANDARDS` (Jefe de Operaciones); ingerir sesión ⇒ `WRITE` (el mismo que evalúa).
- Conflictos de máquina de estados ⇒ HTTP **409**.
- Commits: Conventional Commits, cortos, **sin** trailer Co-Authored-By.

## Review Focus

Entradas que el spec implica pero que ningún "happy path" ejercita; cada una tiene su test en la tarea dueña:
- **Medición de una `clave` que la maniobra no define** → 400 de validación, no se ignora en silencio. (Tarea 1.4)
- **Maniobra con parámetro definido pero sin medición en la sesión** → maniobra **sin proponer** (`null`), nunca "Excelente" por omisión ni "Insuficiente" por hueco de datos. (Tarea 1.4)
- **RUMBO cerca del borde 0/360°** → distancia angular `min(|d|,360-|d|)`, no `|a-b|`. (Tarea 1.4)
- **Re-ingesta tras evaluación firmada** → 409, no sobrescribe trabajo firmado. (Tarea 1.5)
- **Turno `AERONAVE` recibe ingesta de simulador** → 409. (Tarea 1.5)
- **Maniobra con `notaMin = 'D'`** (demostración, no calificable numéricamente) → no se propone letra. (Tarea 1.4)

---

# FASE 1 — Backend (`sigeda-back`)

Repo: `/Volumes/ORICO/projects/personal/tesis-project/sigeda-back`. Paquete raíz `com.sigeda.backend`.

### Task 1.1: `Medio` del turno

**Files:**
- Create: `src/main/java/com/sigeda/backend/turno/entities/Medio.java` (enum)
- Modify: `src/main/java/com/sigeda/backend/turno/entities/Turno.java` (nuevo campo `medio`, `dispositivo`)
- Modify: `src/main/java/com/sigeda/backend/turno/dtos/TurnoCreate.java`, `TurnoUpdate.java`, `DetalleTurno.java` (exponer `medio`, `dispositivo`)
- Modify: `src/main/java/com/sigeda/backend/turno/services/TurnoServiceImpl.java` (persistir `medio`; default `AERONAVE`; `aeronave` opcional si `SIMULADOR`)
- Create: `src/main/resources/migraciones/029-medio-del-turno.sql`
- Modify: `src/main/resources/schema_prod.sql` (columnas `medio`, `dispositivo` en `turnos`), `src/main/resources/data_prod.sql` (un turno de demo con `medio='SIMULADOR'`)
- Test: `src/test/java/com/sigeda/backend/turno/TurnoMedioTest.java`, `src/test/java/com/sigeda/backend/migraciones/SemillaMedioTest.java`

**Interfaces:**
- Produces: `enum Medio { AERONAVE, SIMULADOR }`; `Turno.getMedio()/setMedio(Medio)`, `Turno.getDispositivo()/setDispositivo(String)`; `TurnoCreate.medio` (opcional, default `AERONAVE`), `TurnoCreate.dispositivo` (opcional); `DetalleTurno` expone `medio`, `dispositivo`.
- Consumes: patrón del enum `Programa` (`turno`/`maniobra`), `CustomDateDeserializer`.

- [ ] **Step 1:** Escribe el test `TurnoMedioTest`: `guardarTurnoSimulador_persisteMedioYDispositivo()` (crea `TurnoCreate` con `medio=SIMULADOR`, `dispositivo="FNPT II H135"`, sin aeronave → el turno guardado tiene `medio=SIMULADOR` y `aeronave=null`) y `guardarTurnoSinMedio_defaultAeronave()` (TurnoCreate sin `medio` → `Medio.AERONAVE`).
- [ ] **Step 2:** Corre `sh ./mvnw -o test -Dtest=TurnoMedioTest` → FAIL (no compila: `Medio` no existe).
- [ ] **Step 3:** Crea el enum `Medio`, añade `@Enumerated(EnumType.STRING) private Medio medio` (default `AERONAVE` en `@PrePersist` o en el service) y `private String dispositivo` a `Turno`; añade los campos a los DTOs y mapea en `TurnoServiceImpl.save/update`; haz `aeronave` tolerante a null cuando `medio=SIMULADOR` (la columna `id_aeronave` ya es nullable).
- [ ] **Step 4:** Añade `migraciones/029-medio-del-turno.sql` (`ALTER TABLE turnos ADD COLUMN medio varchar(255) NOT NULL DEFAULT 'AERONAVE'; ALTER TABLE turnos ADD COLUMN dispositivo varchar(255);`) y refleja en `schema_prod.sql`. Escribe `SemillaMedioTest` que arranca el contexto y verifica que los turnos sembrados cargan con `medio` no nulo.
- [ ] **Step 5:** Corre `sh ./mvnw -o test -Dtest=TurnoMedioTest,SemillaMedioTest` → PASS.
- [ ] **Step 6:** Commit: `feat(turno): medio aeronave|simulador en el turno de vuelo`.

### Task 1.2: Tolerancias numéricas por maniobra (`ParametroManiobra`)

**Files:**
- Create: `src/main/java/com/sigeda/backend/maniobra/entities/ParametroManiobra.java` (entity), `TipoClave.java` (enum `LINEAL | ANGULAR`)
- Create: `src/main/java/com/sigeda/backend/maniobra/dtos/ParametroSave.java`, `ParametroDetail.java` (lista de `ParametroSave`)
- Create/Modify: `src/main/java/com/sigeda/backend/maniobra/dao/IParametroManiobraDao.java`; `ManiobraService`/`ManiobraServiceImpl` (`asignarParametros(int idManiobra, ParametroDetail)`, `findParametros(int idManiobra)`)
- Modify: `src/main/java/com/sigeda/backend/maniobra/controllers/ManiobraController.java` (`PUT /api/maniobras/{id}/parametros` con `@PreAuthorize MANAGE_STANDARDS`, `GET /api/maniobras/{id}/parametros`)
- Modify: `src/main/java/com/sigeda/backend/maniobra/entities/Maniobra.java` (`@OneToMany ... List<ParametroManiobra> parametros`)
- Create: `src/main/resources/migraciones/030-parametros-de-maniobra.sql`; modifica `schema_prod.sql`; semilla en `data_prod.sql` de la **terna** (hover, autorrotación, aproximación ILS) con sus parámetros
- Test: `src/test/java/com/sigeda/backend/maniobra/ParametroManiobraTest.java`

**Interfaces:**
- Produces: `ParametroManiobra { int id; int idManiobra; String clave; TipoClave tipo; String unidad; BigDecimal objetivo; BigDecimal tolExcelente; BigDecimal tolBueno; BigDecimal tolRegular; }` (desvío ≤ tolExcelente ⇒ E; ≤ tolBueno ⇒ B; ≤ tolRegular ⇒ R; mayor ⇒ I). `ManiobraService.asignarParametros(int, ParametroDetail)`, `findParametros(int): List<ParametroManiobra>`.
- Consumes: patrón de `ManiobraService.assignDetails` + `addEstandares` (Task-reference: §3 estándar actual), `maniobras_seq`/`estandares_seq`.

- [ ] **Step 1:** Test `ParametroManiobraTest`: `asignarParametros_persisteBandasYUnidad()` (asigna a la maniobra hover `{clave=ALTITUD, tipo=LINEAL, unidad=ft, objetivo=1000, tolExcelente=20, tolBueno=50, tolRegular=100}` → `findParametros` lo devuelve) y `asignarParametros_requierePermisoStandards()` (controller test: un rol sin `MANAGE_STANDARDS` → 403).
- [ ] **Step 2:** Corre el test → FAIL (no compila).
- [ ] **Step 3:** Crea `ParametroManiobra`, `TipoClave`, DTOs, DAO; implementa `asignarParametros`/`findParametros` (espejo de `assignDetails`); añade endpoints al `ManiobraController` con los `@PreAuthorize` indicados; añade la colección a `Maniobra`.
- [ ] **Step 4:** Añade `migraciones/030-parametros-de-maniobra.sql` (`create table parametros_maniobra (...)` con `parametros_maniobra_seq`), refleja en `schema_prod.sql`, y siembra en `data_prod.sql` la terna de maniobras con sus parámetros (hover: altitud/deriva/rumbo; autorrotación: rpm_rotor/regimen_descenso/velocidad; ILS: desvio_senda/altitud/rumbo/velocidad). Verifica tipos numéricos en PostgreSQL.
- [ ] **Step 5:** Corre `sh ./mvnw -o test -Dtest=ParametroManiobraTest` → PASS.
- [ ] **Step 6:** Commit: `feat(maniobra): tolerancias numéricas por parámetro`.

### Task 1.3: Modelo de telemetría (`SesionSimulador` + `MedicionManiobra`)

**Files:**
- Create: `src/main/java/com/sigeda/backend/simulador/entities/SesionSimulador.java`, `MedicionManiobra.java`
- Create: `src/main/java/com/sigeda/backend/simulador/dao/ISesionSimuladorDao.java`
- Create: `src/main/resources/migraciones/031-sesiones-de-simulador.sql`; modifica `schema_prod.sql`
- Test: `src/test/java/com/sigeda/backend/simulador/SesionSimuladorPersistenciaTest.java`

**Interfaces:**
- Produces: `SesionSimulador { int id; int idTurno; String codAlumno; LocalDate fecha; String dispositivo; String fuente; List<MedicionManiobra> mediciones; }` con **unique `(idTurno, codAlumno)`**; `MedicionManiobra { int id; int idSesion; int idManiobra; String clave; BigDecimal valorMedido; BigDecimal desvio; String letra; }`. DAO: `findByTurnoAndAlumno(int idTurno, String codAlumno): Optional<SesionSimulador>`, `deleteByTurnoAndAlumno(...)`.
- Consumes: convención de secuencias/entidades del repo.

- [ ] **Step 1:** Test `SesionSimuladorPersistenciaTest`: `guardaYRecuperaSesionConMediciones()` y `unicidadPorTurnoYAlumno()` (segunda inserción del mismo par viola el constraint → excepción de persistencia).
- [ ] **Step 2:** Corre → FAIL.
- [ ] **Step 3:** Crea las entidades (cascade `ALL` de sesión→mediciones), el DAO, y la migración 031 con el unique constraint `(id_turno, cod_alumno)`; refleja en `schema_prod.sql`.
- [ ] **Step 4:** Corre `sh ./mvnw -o test -Dtest=SesionSimuladorPersistenciaTest` → PASS (verifica el unique en PostgreSQL).
- [ ] **Step 5:** Commit: `feat(simulador): persistencia de sesiones y mediciones`.

### Task 1.4: Motor determinista de autocalificación

**Files:**
- Create: `src/main/java/com/sigeda/backend/simulador/utils/CalculoDesvio.java` (puro: desvío lineal/angular, banda→letra, peor-por-maniobra)
- Create: `src/main/java/com/sigeda/backend/simulador/services/AutocalificacionSimuladorService.java` + `Impl` (orquesta validación + persistencia + propuesta)
- Create: `src/main/java/com/sigeda/backend/simulador/exceptions/TelemetriaInvalidaException.java` (→ 400) y `IngestaNoPermitidaException.java` (→ 409)
- Test: `src/test/java/com/sigeda/backend/simulador/CalculoDesvioTest.java` (unitario, sin Spring), `AutocalificacionServiceTest.java`

**Interfaces:**
- Produces: `CalculoDesvio.desvio(ParametroManiobra p, BigDecimal medido): BigDecimal` (lineal `|m-objetivo|`; angular `min(|d|,360-|d|)`), `CalculoDesvio.letraDeParametro(ParametroManiobra, BigDecimal desvio): char`, `CalculoDesvio.letraDeManiobra(List<char> letrasDeParametros): Character` (peor; `null` si la lista está incompleta). `AutocalificacionSimuladorService.ingerir(SesionTelemetriaDto): SesionSimulador`, `.propuesta(int idTurno, String codAlumno): Map<Integer,Character>` (idManiobra→letra|null).
- Consumes: `ParametroManiobra` (1.2), `SesionSimulador`/`MedicionManiobra` (1.3), `Turno`/`Maniobra_Turno`/`Medio` (1.1), `TurnoService.findByIdWithManiobra`.

- [ ] **Step 1:** Test `CalculoDesvioTest` (cubre el Review Focus de cálculo): `desvioLineal()`, `desvioAngular_bordeNorte()` (medido 358, objetivo 2 → 4.0, **no** 356), `letraPorBanda_EBRI()` (cada banda → su letra), `peorDeManiobra()` (E+R+B → R), `maniobraIncompleta_devuelveNull()` (falta un parámetro definido → `null`).
- [ ] **Step 2:** Test `AutocalificacionServiceTest` (cubre el resto del Review Focus): `claveNoDefinida_lanza400()` (medición de clave que la maniobra no define → `TelemetriaInvalidaException`), `maniobraSinMedicion_quedaNull()` (propuesta parcial), `maniobraNotaMinD_noSePropone()` (notaMin='D' → no entra en la propuesta), `propuestaCubreTodasLasManiobrasDelTurno()` (devuelve entrada para cada `maniobrasTurno`, con null donde corresponde).
- [ ] **Step 3:** Corre ambos → FAIL.
- [ ] **Step 4:** Implementa `CalculoDesvio` (puro) y `AutocalificacionSimuladorServiceImpl` (ingesta: valida turno existe y `medio=SIMULADOR` — delega el 409 a 1.5, aquí valida telemetría: cada medición referencia una maniobra del turno con un parámetro definido, si no → `TelemetriaInvalidaException`; persiste; calcula letras).
- [ ] **Step 5:** Corre `sh ./mvnw -o test -Dtest=CalculoDesvioTest,AutocalificacionServiceTest` → PASS.
- [ ] **Step 6:** Commit: `feat(simulador): motor de autocalificación por tolerancias`.

### Task 1.5: Endpoints de ingesta y propuesta + máquina de estados

**Files:**
- Create: `src/main/java/com/sigeda/backend/simulador/controllers/SimuladorController.java`
- Create: `src/main/java/com/sigeda/backend/simulador/dtos/SesionTelemetriaDto.java`, `PropuestaEvaluacionDto.java`
- Modify: el `@ControllerAdvice`/`ExceptionHandler` del repo (mapear `TelemetriaInvalidaException`→400, `IngestaNoPermitidaException`→409)
- Modify: `AutocalificacionSimuladorServiceImpl` (reglas de estado: `medio=SIMULADOR`; rechazar si ya existe `EvaluacionPractica` para (turno, alumno))
- Test: `src/test/java/com/sigeda/backend/simulador/SimuladorControllerTest.java`

**Interfaces:**
- Produces: `POST /api/turnos/{id}/sesiones-simulador` (`@PreAuthorize WRITE`, cuerpo `SesionTelemetriaDto {int idTurno; String codAlumno; String dispositivo; String fuente; List<ManiobraMedidaDto> maniobras}` donde `ManiobraMedidaDto {int idManiobra; List<MedicionDto {String clave; BigDecimal valor; String unidad}> mediciones}`) → 201. `GET /api/turnos/{id}/persona/{cod}/propuesta-simulador` → `PropuestaEvaluacionDto { List<CalificacionPropuestaDto {int idManiobra; String maniobra; String notaMin; String notaPropuesta; String observacion}> }` (notaPropuesta puede ser null).
- Consumes: `AutocalificacionSimuladorService` (1.4), `EvaluacionService.existsByCod` (para detectar evaluación firmada), `CodigoEval` (clave `cod-idTurno`).

- [ ] **Step 1:** Test `SimuladorControllerTest` (cubre el Review Focus de estado): `ingestaTurnoAeronave_409()` (turno `medio=AERONAVE` → 409), `ingestaConEvaluacionFirmada_409()` (ya existe `EvaluacionPractica` para el par → 409), `ingestaValida_201()`, `propuesta_devuelveLetrasYNulls()` (incluye una maniobra sin medición → notaPropuesta null), `claveNoDefinida_400()`.
- [ ] **Step 2:** Corre → FAIL.
- [ ] **Step 3:** Implementa `SimuladorController`, los DTOs, las reglas de estado en el service (409 vía `IngestaNoPermitidaException`), y el mapeo de excepciones en el advice. La re-ingesta sin evaluación firmada **reemplaza** (`deleteByTurnoAndAlumno` + insert).
- [ ] **Step 4:** Corre `sh ./mvnw -o test -Dtest=SimuladorControllerTest` → PASS.
- [ ] **Step 5:** Commit: `feat(simulador): endpoints de ingesta y propuesta con reglas de estado`.

### Task 1.6: Suite completa + escenario de demo + verificación PostgreSQL

**Files:**
- Modify: `src/main/resources/data_prod.sql` (escenario: turno `SIMULADOR` con la terna + alumno de demo S92ZFX)
- Create: `src/test/resources/telemetria-demo.json` (archivo de telemetría de ejemplo con la forma del §5 del spec)
- Test: `src/test/java/com/sigeda/backend/simulador/EscenarioDemoSimuladorTest.java` (end-to-end de servicio: ingiere `telemetria-demo.json` → propuesta esperada)

- [ ] **Step 1:** Escribe `EscenarioDemoSimuladorTest`: carga `telemetria-demo.json`, ingiere contra el turno de demo, y asserta las letras propuestas por maniobra (incluida una null).
- [ ] **Step 2:** Corre `sh ./mvnw -o test` (suite completa) → todo PASS, sin regresiones en `evaluacion`/`indices`/`turno`.
- [ ] **Step 3:** Arranca contra PostgreSQL real y verifica que migraciones 029–031 + semilla cargan sin error (tipos numéricos, unique, default de `medio`).
- [ ] **Step 4:** Commit: `test(simulador): escenario de demo end-to-end y verificación PG`.

---

# FASE 2 — Web (`sigeda-web`)

Repo: `/Volumes/ORICO/projects/personal/tesis-project/sigeda-web`. Ejecuta backend primero; esta fase consume sus endpoints.

### Task 2.1: api.ts + schemas (medio, parámetros, sesión, propuesta)

**Files:**
- Modify: `src/features/turnos/api.ts` (`CuerpoTurno` y `TurnoDetalle` ganan `medio: 'AERONAVE'|'SIMULADOR'`, `dispositivo?: string | null`; `aeronave` ya es nullable), `src/features/turnos/schemas.ts` (`crearEsquemaTurno` añade `medio`, `dispositivo`; `aeronave` requerida solo si `medio==='AERONAVE'`; `turnoVacio`/`valoresDesdeTurno`/`aCuerpoTurno`)
- Modify: `src/features/maniobras/api.ts` (`ParametroDeManiobra` type, `CuerpoParametros`, `obtenerParametros`/`guardarParametros`), `src/features/maniobras/schemas.ts` (`esquemaParametros`)
- Create: `src/features/simulador/api.ts` (`SesionTelemetria`, `PropuestaEvaluacion`, `CalificacionPropuesta`, `ingerirSesion`, `obtenerPropuesta`, hooks de query/mutation)
- Test: `src/features/turnos/schemas.test.ts` (ampliar), `src/features/maniobras/schemas.test.ts`, `src/features/simulador/api.test.ts`

**Interfaces:**
- Produces: `type Medio = 'AERONAVE' | 'SIMULADOR'`; `ParametroDeManiobra = { id: number; clave: string; tipo: 'LINEAL'|'ANGULAR'; unidad: string; objetivo: number; tolExcelente: number; tolBueno: number; tolRegular: number }`; `CalificacionPropuesta = { idManiobra: number; maniobra: string; notaMin: NotaDirbe; notaPropuesta: NotaDirbe | null; observacion: string | null }`; `obtenerPropuesta(idTurno, codAlumno): Promise<PropuestaEvaluacion>` (GET), `ingerirSesion(idTurno, cuerpo): Promise<...>` (POST).
- Consumes: `NotaDirbe`/`NOTAS_DIRBE` de `src/lib/dominio/dirbe.ts`; `ApiError`/`normalizarError` (`src/lib/api/errors.ts`, maneja 409 por la vía genérica).

- [ ] **Step 1:** Tests: `schemas.test.ts` de turnos — `medioSimulador_noExigeAeronave()` y `medioAeronave_exigeAeronave()`; maniobras — `esquemaParametros_validaBandas()`; `simulador/api.test.ts` — parseo de `PropuestaEvaluacion` con un `notaPropuesta: null`.
- [ ] **Step 2:** Corre `pnpm test` sobre esos archivos → FAIL.
- [ ] **Step 3:** Implementa los tipos, esquemas y funciones de api; `crearEsquemaTurno` condiciona la aeronave a `medio` vía `superRefine`.
- [ ] **Step 4:** Corre `pnpm test` (esos) + `pnpm typecheck` → PASS.
- [ ] **Step 5:** Commit: `feat(web): tipos y esquemas de medio, parámetros y propuesta`.

### Task 2.2: Selector de medio en el formulario de turno

**Files:**
- Modify: `src/features/turnos/components/formulario-turno.tsx` (`NativeSelect` de `medio`; cuando `SIMULADOR`: oculta/ignora aeronave y muestra `dispositivo` como `Input`)
- Test: `src/features/turnos/components/formulario-turno.test.tsx` (ampliar)

**Interfaces:**
- Consumes: `ValoresTurno` ampliado (2.1), patrón `Controller` + `NativeSelect` existente en el form.

- [ ] **Step 1:** Test: `alElegirSimulador_ocultaAeronaveYpideDispositivo()` y `alElegirAeronave_muestraAeronave()`.
- [ ] **Step 2:** `pnpm test formulario-turno` → FAIL.
- [ ] **Step 3:** Añade el select de `medio` (default AERONAVE) y el condicional de aeronave/dispositivo.
- [ ] **Step 4:** `pnpm test formulario-turno` → PASS.
- [ ] **Step 5:** Commit: `feat(web): selector de medio en el formulario de turno`.

### Task 2.3: Admin de tolerancias por maniobra

**Files:**
- Create: `src/features/maniobras/parametros-page.tsx` (espejo de `estandares-page.tsx`, `useFieldArray('parametros')` con campos numéricos)
- Create: `src/routes/_app/programa/maniobras/$id/parametros.tsx` (ruta, guard `PANTALLAS.parametros` con permiso `Manage Standards`)
- Modify: `src/lib/auth/pantallas.ts` (entrada `parametros`), `src/features/maniobras/maniobra-page.tsx` (botón a parámetros con `usePuede('Manage Standards')`)
- Test: `src/features/maniobras/parametros-page.test.tsx`

**Interfaces:**
- Consumes: `guardarParametros`/`obtenerParametros`, `esquemaParametros` (2.1); patrón de `EstandaresPage` + `exigirPantalla`.

- [ ] **Step 1:** Test: `guardaParametrosNumericos()` (renderiza, llena una fila `{clave, tipo, unidad, objetivo, tolExcelente, tolBueno, tolRegular}`, envía) y `validaBandasRequeridas()`.
- [ ] **Step 2:** `pnpm test parametros-page` → FAIL.
- [ ] **Step 3:** Implementa la página, la ruta, la entrada de `PANTALLAS` y el botón en el detalle de maniobra.
- [ ] **Step 4:** `pnpm test parametros-page` + `pnpm typecheck` → PASS.
- [ ] **Step 5:** Commit: `feat(web): administración de tolerancias por maniobra`.

### Task 2.4: Carga de sesión + prellenado de la evaluación

**Files:**
- Modify: `src/features/evaluaciones/registrar-evaluacion-page.tsx` (si `turno.medio==='SIMULADOR'`: consulta `obtenerPropuesta`, inyecta `notaPropuesta` en el `nota` de cada `CalificacionInicial` y el `observacion` con el desvío; botón/aviso de "propuesta del simulador")
- Create: `src/features/simulador/components/cargar-sesion.tsx` (subir/pegar el JSON de telemetría → `ingerirSesion`), montado en el turno SIMULADOR
- Modify: `src/features/evaluaciones/schemas.ts` (`valoresDeEvaluacion` ya acepta `nota?` en `CalificacionInicial` — reutilizar ese seam; sin cambio de forma)
- Test: `src/features/evaluaciones/registrar-evaluacion-page.test.tsx` (ampliar), `src/features/simulador/components/cargar-sesion.test.tsx`

**Interfaces:**
- Consumes: `obtenerPropuesta`/`ingerirSesion` (2.1); el seam `valoresDeEvaluacion(calificaciones, { ... })` donde cada calificación lleva `nota`; `grilla-calificaciones.tsx` (el `ToggleGroup` ya refleja el `nota` prellenado).

- [ ] **Step 1:** Test: `prefillDesdePropuesta_marcaLasLetras()` (mock MSW de la propuesta → la grilla aparece con las letras propuestas y una maniobra en blanco), `instructorPuedeSobrescribir()` (cambiar una letra propuesta y enviar), `turnoAeronave_noConsultaPropuesta()`.
- [ ] **Step 2:** `pnpm test registrar-evaluacion-page cargar-sesion` → FAIL.
- [ ] **Step 3:** Implementa la consulta condicional de propuesta y la inyección en los valores iniciales; el componente `cargar-sesion`. El instructor edita y firma por el flujo existente `registrarEvaluacion` (sin ruta nueva de guardado).
- [ ] **Step 4:** `pnpm test` (esos) + `pnpm typecheck` → PASS.
- [ ] **Step 5:** Commit: `feat(web): prellenado de evaluación con la propuesta del simulador`.

### Task 2.5: Mocks MSW + suite

**Files:**
- Modify: `src/mocks/sigeda/turnos.ts` (medio/dispositivo en `detalleTurno` y en POST/PUT), `src/mocks/sigeda/maniobras.ts` (parámetros: `PUT/GET /api/maniobras/:id/parametros`), `src/mocks/sigeda/datos.ts` (semilla: turno SIMULADOR + terna con parámetros)
- Create: `src/mocks/sigeda/simulador.ts` (`handlersSimulador`: `POST /api/turnos/:id/sesiones-simulador`, `GET /api/turnos/:id/persona/:cod/propuesta-simulador`), registrar en `src/mocks/handlers.ts`
- Modify: `src/mocks/sigeda/comun.ts` (helper `conflicto(error, message)` → `errorResponse(409, ...)`)
- Test: `src/mocks/sigeda/simulador.test.ts` (los handlers devuelven propuesta y 409 en los casos de estado)

**Interfaces:**
- Consumes: patrón de handlers (`http`, `HttpResponse`, `API`, `autorizar`, `datos()`), `errorResponse` (`comun.ts`).

- [ ] **Step 1:** Test `simulador.test.ts`: `propuesta_devuelveLetrasYNull()`, `ingestaAeronave_409()`, `ingestaFirmada_409()`.
- [ ] **Step 2:** `pnpm test simulador` → FAIL.
- [ ] **Step 3:** Implementa los handlers, el helper `conflicto`, y amplía la semilla mock; registra en `handlers.ts`.
- [ ] **Step 4:** Corre `pnpm test` (suite completa), `pnpm lint`, `pnpm typecheck` → todo PASS sin regresiones.
- [ ] **Step 5:** Commit: `feat(web): mocks MSW del flujo de simulador`.

### Task 2.6 (opcional): e2e del flujo

**Files:**
- Create: `e2e/simulador.spec.ts` (Playwright): turno SIMULADOR → cargar telemetría → abrir evaluación prellenada → corregir una letra → firmar.

- [ ] **Step 1:** Escribe el e2e con MSW/fixtures del demo.
- [ ] **Step 2:** Corre la suite e2e → PASS.
- [ ] **Step 3:** Commit: `test(web): e2e evaluación asistida por simulador`.

---

## Self-review

**1. Cobertura del spec:** §4.1 medio → 1.1/2.2; §4.2 tolerancias → 1.2/2.3; §4.3 sesión+mediciones+re-ingesta → 1.3/1.5; §4.4 motor (desvío, bandas, peor, parcial, angular) → 1.4; §4.5 propuesta + firma + máquina de estados → 1.5/2.4; §5 contrato telemetría → 1.6 (`telemetria-demo.json`) + 2.4/2.5; §6 constraints → Global Constraints + 1.6 (PG); §8 decisiones → 1.1 (medio no toca Tabla 4), 1.2/1.6 (terna sembrada), 1.5 (instructor firmante único). Sin huecos.
**2. Pasos:** cada paso es test / correr / implementar-firma / correr / commit; sin "manejar edge cases" sueltos.
**3. Consistencia de tipos:** `Medio`, `ParametroManiobra` (bandas tolExcelente/tolBueno/tolRegular), `CalificacionPropuesta.notaPropuesta: NotaDirbe|null`, `Map<Integer,Character>` back ↔ `notaPropuesta` web; nombres de endpoints idénticos entre 1.5 y 2.1/2.5.
**4. Review Focus:** los 6 casos tienen test en su tarea dueña (1.4 cálculo y validación/null/D; 1.5 estado 409×2).
**5. Proporción:** plan detallado pero sin cuerpos de implementación (firmas + nombres de test + aserciones); más largo que el spec por ser el nivel de ejecución, no por transcribir código.

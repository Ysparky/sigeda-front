# Módulo Simulador (standalone) — Documento de diseño

**Fecha:** 2026-10-30
**Estado:** PROPUESTO — pendiente de aprobación del usuario antes de construir.
**Rama:** `feat/simulador-standalone` (sibling de `feat/modulo-postulacion`, en ambos repos).
**Supera a:** la versión DIRBE en `feat/evaluacion-simulador` (ver [[evaluacion-simulador-estado]]), que queda congelada sin merge.

## Intención y por qué

El doc del cliente (`~/Downloads/Postulacion y simulador (1).docx`) modela el simulador como un **módulo autónomo** con entidades propias — `Simulador`, `Escenario`, `Indicador_Simulacion`, `Resultado_Indicador`, `Sesion_Simulador` — y **sin calificación** que alimente la nota del alumno. Decisiones del usuario (AskUserQuestion, 30 oct):
- **Q1:** alinear el modelo a cómo funciona en la vida real (FSTD/FNPT: *briefing → ejecución (scenario-based) → debrief*; evaluación por competencias con escala CBTA 1–5 de ICAO/IATA).
- **Q2:** **módulo APARTE, SIN alimentar la nota DIRBE** (no toca NFPI, NSF, NIA, Tabla 4 ni el ciclo de chequeo).

Esto reemplaza la versión DIRBE anterior (que proponía la letra D/I/R/B desde telemetría y prellenaba la evaluación práctica del turno). Aquí el simulador NO produce una letra DIRBE ni se enlaza a un turno práctico: es un registro formativo independiente de sesiones de simulador evaluadas por competencias.

## Fundamento del mundo real (investigación)

- **CBTA/EBT (ICAO Doc 9868/9995, IATA, EASA AMC1 ORO.FC.231):** se evalúan **competencias** mediante **comportamientos observables (OB)**; cada competencia se gradúa **1–5**. **Grado 1 = NO competente** (no alcanza el mínimo); **grados 2–5 = competente** (alcanza o supera el mínimo). El nivel de "comportamiento observable" se detalla cuando se observa bajo desempeño.
- **Sesión de simulador (FSTD/FNPT):** estructura *briefing* (el instructor fija los criterios del escenario) → *ejecución* por escenarios → *debrief* (el alumno se auto-evalúa contra los criterios y se discute). Las grabaciones/telemetría son apoyo del debrief, no una nota automática.

El módulo adopta esta forma: un **escenario** agrupa **indicadores** (ítems observables); una **sesión** ejecuta un escenario con un alumno e instructor y produce un **resultado por indicador** (grado 1–5 + comentario). El resumen de la sesión es *competente / no competente* (hay algún indicador en 1 ⇒ no competente), puramente informativo.

## Alcance

### Objetivos
1. Catálogo de **simuladores** (dispositivos) administrable.
2. Catálogo de **escenarios** con sus **indicadores** (ítems de competencia observables).
3. **Planificar** una sesión (simulador + escenario + alumno + instructor + fecha), estados de ciclo de vida.
4. **Ejecutar/calificar** la sesión: grado CBTA 1–5 por indicador + comentario, notas de briefing/debrief.
5. **Consultar** el historial de sesiones de un alumno y el detalle de una sesión (grilla de competencias + resumen competente/no competente).

### No-objetivos
- NO alimenta DIRBE/NFPI/NSF/NIA/Tabla 4/chequeo (aislado del cálculo académico).
- NO ingiere telemetría automática del dispositivo real (eso fue la versión DIRBE; aquí la calificación es del instructor). Un adaptador de telemetría queda como follow-on fuera de v1.
- NO reutiliza la entidad `Maniobra` ni `ParametroManiobra`: el simulador tiene indicadores propios (puede, opcionalmente, referenciar una fase/competencia por texto, pero no el catálogo de maniobras).

### Anti-objetivos
- Que una mala sesión de simulador baje la nota del alumno o dispare un chequeo: explícitamente NO. Si alguien lo pide, es un cambio de alcance que vuelve a este documento.
- Acoplar el simulador al turno práctico (`medio=SIMULADOR` del turno): esa era la vía DIRBE, descartada.

## Modelo de datos (backend, PostgreSQL + entidades JPA)

Tablas nuevas, todas con prefijo conceptual "simulador", sin FK hacia el dominio académico salvo `cod_persona` (alumno/instructor, que ya existe en `personas`).

- **`simuladores`** — el dispositivo. `{ id (seq), nombre, tipo (FNPT|FTD|FFS), descripcion, ubicacion, activo }`.
- **`escenarios`** — plantilla de entrenamiento. `{ id, nombre, descripcion, objetivo, duracion_min (int), activo }`.
- **`indicadores_simulacion`** — ítem observable de un escenario. `{ id, id_escenario (FK), nombre, descripcion, competencia (texto; una de las 9 competencias ICAO/IATA o libre), orden }`. Un escenario tiene N indicadores.
- **`sesiones_simulador`** — sesión planificada/ejecutada. `{ id, id_simulador (FK), id_escenario (FK), cod_alumno (persona), cod_instructor (persona), fecha_planificada (date), fecha_ejecucion (date null), estado (PLANIFICADA|EN_CURSO|COMPLETADA|CANCELADA), notas_briefing (text null), notas_debrief (text null), autoevaluacion_alumno (text null) }`.
- **`resultados_indicador`** — grado por indicador en una sesión. `{ id, id_sesion (FK), id_indicador (FK), calificacion (int 1..5), comentario (text null) }`. Único `(id_sesion, id_indicador)`.

Orden de creación de tablas (FK) en `schema_prod.sql` y migraciones: `simuladores`, `escenarios`, `indicadores_simulacion` (tras escenarios), `sesiones_simulador` (tras simuladores+escenarios), `resultados_indicador` (tras sesiones+indicadores). Cada tabla con su `setval` de secuencia. **Verificar en PostgreSQL real** (H2 es ciego al orden de FK) — ver [[estado-sigeda-back]].

### Ciclo de vida de la sesión
`PLANIFICADA` → (iniciar) `EN_CURSO` → (completar con resultados) `COMPLETADA`; desde PLANIFICADA/EN_CURSO se puede `CANCELAR`. Calificar exige `EN_CURSO` (o permitir PLANIFICADA→COMPLETADA directo, decisión del builder; recomiendo exigir EN_CURSO para reflejar briefing→ejecución). `COMPLETADA`/`CANCELADA` son terminales.

### Resumen de competencia
Derivado (no almacenado): una sesión COMPLETADA es **"No competente"** si algún `resultado_indicador.calificacion == 1`, si no **"Competente"**. Se muestra en el detalle; no se persiste ni afecta nada académico.

## Roles y permisos
- Nuevo permiso **`Manage Simulator`**. Lo tienen **Jefe de Operaciones** (catálogo: simuladores/escenarios/indicadores + planificar sesiones) e **Instructor** (ejecutar/calificar sus sesiones + ver). *Decisión:* un solo permiso para todo el módulo mantiene simple la demo; si se quisiera separar "administrar catálogo" de "calificar", sería un segundo permiso (no en v1).
- El **Alumno** puede ver sus propias sesiones (permiso existente de lectura de su legajo, o endpoint `/mias`). *Decisión del builder.*

## Superficie API (REST, patrón SIGEDA `Response`/`GlobalExceptionHandler`)
- `GET/POST /api/simuladores`, `GET/PUT /api/simuladores/{id}` — catálogo de dispositivos.
- `GET/POST /api/escenarios`, `GET/PUT /api/escenarios/{id}` (incluye sus indicadores en el detalle); indicadores se gestionan anidados o con `POST/PUT/DELETE /api/escenarios/{id}/indicadores`.
- `GET /api/sesiones-simulador?estado=&cod=` (bandeja/filtro), `GET /api/sesiones-simulador/{id}` (detalle con grilla), `POST /api/sesiones-simulador` (planificar), `PUT /api/sesiones-simulador/{id}/estado`, `POST /api/sesiones-simulador/{id}/calificacion` (guardar resultados por indicador + notas), `GET /api/sesiones-simulador/mias` (alumno).
- Conflictos de estado → 409 vía `ConflictException` (ya creada en postulación; si la rama no la tiene, crearla). Validaciones → 400.

## Web (React/TanStack/zod/MSW)
- Feature `simuladores` (admin de dispositivos) y `escenarios` (admin de escenarios + indicadores), patrón de las páginas de estándares/convocatorias.
- Feature `sesiones-simulador`: bandeja (filtro por estado), planificar (formulario), ejecutar/calificar (grilla de indicadores con selector 1–5 + comentario, notas de briefing/debrief), detalle (grilla + resumen competente/no-competente).
- Vista del alumno: "Mis sesiones de simulador".
- Mocks MSW + tests por feature; gate final typecheck+lint+suite.

## Qué queda al builder
- Mapeo exacto de permisos a roles en el seed (`data_prod.sql` + migración de permisos, patrón de los roles 6/7 del tramo de entrada).
- Si "calificar" exige `EN_CURSO` o admite salto directo (recomendado: EN_CURSO).
- Catálogo semilla (1 simulador, 1 escenario con ~5 indicadores de competencias ICAO) para la demo.
- Textos/branding de las pantallas, consistentes con el resto de SIGEDA.

## Terminología militar
Se conserva la terminología de dominio (roles, rangos, Escuadrón, PDI EA-510) — es intencional, ver [[formacion-militar-intencional]].

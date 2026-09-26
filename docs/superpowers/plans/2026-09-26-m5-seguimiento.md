# M5 Seguimiento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The five M5 screens of spec §17.3 (Escuadrón, Alertas, Legajo del alumno, Mi legajo, Reportes y orden de mérito) working against MSW mocks of `docs/contrato-api-seguimiento.md` version 1, with the 43 acceptance criteria CA-SEG-01..11, CA-ALE-01..08, CA-LEG-01..17 and CA-REP-01..06 + CA-REP-08 proven by tests. M5 is the **last milestone** and the only **read-only** one: no mutation, no dialog, no confirm, no toast.

**Architecture:** Contract-first, as in M1–M4. Two feature folders (M5-20): `src/features/seguimiento/` for the `sigeda-back` Seguimiento surfaces (Escuadrón, Alertas, Legajo) and `src/features/reportes/` for the dependency-8 surfaces (índices, orden de mérito). Domain helpers that do not touch the network — the chequeo criteria and their branch labels, the seven causal codes, the five alert types with their severity ordinal, the index labels with their formulas as display text, the estado summary, the one Derived figure (the simple mean of S9) and the fixed texts S1–S31 — live in `src/lib/dominio/seguimiento.ts` (M5-20). The mocks are eight handler modules in `src/mocks/sigeda/` (M5-21), **three of which serve endpoints documented since M1 that never had a handler at all** (`/api/personas/{cod}/alumno`, the subfase report and the subfase promedios, contract §9.9). Seven dependency gates go in `src/lib/dependencias.ts` (M5-22) and `src/components/aviso-de-teoria.tsx` is renamed to `src/components/aviso-de-dependencia.tsx` with a `texto` prop, because nine theory importers hardcode one text and each Seguimiento panel needs its own (M5-22). The legajo is three tabs over ten panels, each panel owning its loading state, its own `errorDePrimeraCarga` notice, its own dependency text and its own permission (M5-9). Escuadrón is the one M5 list whose filtering, ordering and paging happen **in the browser**, because neither catalogue accepts `idGrupo`, `estado` or `texto` and neither one's `totalElements` counts alumnos (M5-6).

**Tech Stack:** as M4 (Vite 8.3 · React 19.3 · TypeScript 6.0.3 · TanStack Router 1.170 · TanStack Query 5.103 · TanStack Table 9.2 · zod 4.6 · react-hook-form 7.88 · @hookform/resolvers 5.9 · shadcn/ui 4.21 over radix-ui 1.6 · sonner 2.0.8 · lucide-react 1.47 · MSW 2.15 · Vitest 5.0.1 · @testing-library/react 16.3 · @testing-library/user-event 14.6.7 · jsdom 30.1 · oxlint 1.83). **No new dependency and no new vendored shadcn component.** In particular the legajo's three tabs are **links**, not a new Radix primitive: `?tab=` in the URL, `aria-current="page"` on the active one. That is what makes CA-LEG-02 ("se ven en la URL, sobreviven una recarga") true by construction, and it needs nothing that is not already vendored.

**Spec:** `docs/superpowers/specs/2026-09-19-sigeda-web-design.md` — §5 (session, permissions, API layer), §8 (design), §9 (testing) and **§17 (M5 addendum: decisions M5-1..M5-24, the screens and fixed texts S1–S17/S22–S26/S28–S31 of §17.3, the 43 criteria of §17.4, the dependencies 61–68, 70 and 71 of §17.5; binding)**. Everything in §17.6's second table is out of scope and stays out of the thesis. API contract the mocks implement: `docs/contrato-api-seguimiento.md` version 1, in particular its messages D1–D18 (§7), its fixtures (§9) and the derivation rules of §9.3. Both documents are already committed on this branch; no task copies them.

**Baseline:** branch `feat/m5-seguimiento` at `2e46adf` = M4 final merged into main plus three docs commits (the M5 addendum, the Seguimiento contract and the addendum review). Facts of that baseline this plan relies on, each verified before writing it:

- The suite has **851 tests in 104 files** and `pnpm verify` (`tsc -b && oxlint --deny-warnings && vitest run && vite build`) is green. **Plan target: 1054 tests after Task 20**, and every task states its own running total, computed from the tests written out in its Step 1.
- `sigeda.pagina` and `sigeda.lista` turn a 404 into an empty page or an empty list (`src/lib/api/http.ts:138-154`); `normalizarError` shows a plain-text body verbatim below 500 (`errors.ts:91`), a text 403 verbatim (`:89`), and splits a JSON array of `'campo': mensaje` into field errors (`:90`).
- `errorDePrimeraCarga(...consultas)` (`src/lib/query.ts:21-23`) returns an error only for a query that never had data; `crearQueryClient()` sets `staleTime: 30_000` and `renderApp` builds its client with `reintentar: false`.
- `esquemaPaginacion` (`src/lib/busqueda.ts:3-8`) has `page` 0, `size` 10 (max 100), `property` optional and `direction` `'ASC'`, all with `.default().catch()`; `fechaOpcional` and `numeroOpcional` are beside it.
- `DataTable` (`src/components/data-table.tsx`) is `manualPagination` + `manualSorting` over a `Pagina<T>`, renders `vacio` when `pagina.items.length === 0`, and reports `{page, size, property, direction}` changes through `alCambiar`. **A client-paged list therefore hands it a `Pagina` built in the browser**, which is what M5-6 requires of Escuadrón.
- `consultasEvaluaciones.lista(codPersona, filtros)` (`src/features/evaluaciones/api.ts:255-261`) already reads `GET /api/evaluaciones/filter/persona/{cod}` with `idSubfase`, `nombre` (the programa), `clasificacion` and the paging, maps `promedio` through `aNota`, and carries `placeholderData: keepPreviousData`. **The legajo's practical history panel reuses it unchanged**; nothing new is written for it.
- `src/features/catalogos/api.ts` fetches `estado` on the two grupo catalogues (`:23`) and **throws it away** in `aOpcion` (`:73-75`); `fuenteDeAlumnos` (`:66-71`) routes a `Manage Shifts` holder to `/api/alumnos/programa/{nombre}`, a shape that carries no `estado`. This is why M5-6 writes a second reader instead of widening `OpcionAlumno`.
- `src/mocks/sigeda/catalogos.ts` already emits `estado` and `idGrupo` on both catalogues (`alumnoConEstado`, `:13-15`), but the instructor catalogue returns **one page holding every alumno** (`:107`, `[{ id: 1, persona: alumnos }]`) rather than one row per `alumnos_turno`. Task 2 fixes that; `listarAlumnos` asks for `size=100` and is unaffected.
- No handler anywhere serves `GET /api/personas/{cod}/alumno`, `GET /api/evaluaciones/subfase/{id}/persona/{cod}`, `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` or any `/api/desaprobados/**` route: a `grep -n "http\.\(get\|post\|put\|delete\)" src/mocks/sigeda/*.ts` over the baseline lists 78 routes and none of those four (contract §9.9).
- `paginar` (`src/mocks/sigeda/comun.ts:71-113`) replicates `Page_Sort` including its 400 bodies, its `size` default of 6 and its 404 for an empty page; `autorizar(request, permiso)`, `textoNoEncontrado`, `textoProhibido` and `erroresDeCampo` are beside it.
- `datos()` (`src/mocks/sigeda/datos.ts`) is the single in-memory store `src/test/setup.ts` rebuilds in every `afterEach`; `PersonaMock` carries **only `contEval`** and the persona and grupo projections hardcode `contChequeo: 0, contMalo: 0, contRegular: 0` (`personas.ts:50-56`, `grupos.ts:26-32`). Task 4 replaces those zeros with the seed's own counters.
- **`contEval` is also the mock's code counter**: `evaluaciones.ts:260-264` builds a programada code as `{cod}-{idTurno}` and a non-programada one as `{cod}-{idTurno}-{contEval}`. Raising the seeded counters (contract §9.1) therefore changes **no** programada code, which is the only kind any baseline test asserts (`registrar-evaluacion-page.test.tsx:168` expects `/evaluaciones/222222-2`). Task 4 states this and re-runs those suites.
- `relojFalso()` (`src/test/tiempo.ts:10-16`) installs `vi.useFakeTimers({ shouldAdvanceTime: true })` and returns `{ usuario, avanzar }`; the fake clock **follows real time as well as `avanzar()`**, so a debounce boundary is asserted with a comfortable margin (1 000 ms → no navigation, 1 400 ms → navigation) and never to the millisecond. `abrirVentanaDeExamen()` is M4's and M5 does not use it.
- `cobertura-de-rutas.test.ts:18-25` asserts that every `/_app/**` **router route** has a `PANTALLAS` entry and `:27-36` that every route **file** calls `exigirPantalla` with a matching path. Both run from the route file inwards: **a `PANTALLAS` entry with no route, or a screen nobody registered, passes.** Task 8 owns the assertion that closes that hole (§17.3).
- The redirect precedent is `src/routes/_app/turnos/dia/index.tsx`: `beforeLoad` calls `exigirPantalla` and then throws `redirect({ to, params })`, with no `component`. `/mi-legajo` follows it exactly.
- `src/components/aviso-de-teoria.tsx` hardcodes `TEXTO_TEORIA_SOLO_MOCK` and takes only `accion`; nine files import it (`banco-page`, `importar-page`, the four `turnos-teoricos` screens, `mis-examenes-page`, `rendir-examen-page`, `resultado-examen-page`).
- `pnpm exec vite build` regenerates `src/routeTree.gen.ts`, and `RutaApp` comes from it: **the build must run once after the five new route files exist before `tsc -b` will accept the new `PANTALLAS` routes.** Task 8's gate is where that happens.

**Method note.** This plan was **not** replayed in a spike clone. M4 established that per-task reviews catch what a replay pass catches and that planning wall-time is the scarcer resource; the ledger entry for that ruling is `.superpowers/notas/m4-progress.md:7`. Every code block below was written against the baseline files quoted above, which were read in full while planning; every expected test count is the sum of the tests written out in that task's Step 1 plus the running total. **If a quoted "replace X with Y" snippet does not match the file, stop and report instead of guessing.** No piece was spiked: nothing in M5 is new machinery — there is no mutation, no timer beyond one debounce, no upload and no new primitive.

## Global Constraints

- Repo: `/Volumes/ORICO/projects/personal/tesis-project/sigeda-web`. Work on branch **`feat/m5-seguimiento`**, which already holds the M5 docs and this plan at `2e46adf` and later (Task 1, Step 1 confirms it).
- Node is not on `PATH` in non-interactive shells. Prefix **every** shell command with `export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH;`.
- pnpm only (11.15.0). Never `npm` or `npx`.
- TypeScript `~6.0.3`, `erasableSyntaxOnly`: no `enum`, no constructor parameter properties, no `namespace`.
- **No code comments** in any file you author (TS, TSX, CSS, JSON, Markdown code blocks). `src/components/ui/*` and `src/hooks/use-mobile.ts` are vendored shadcn output: do not touch them.
- All UI text in Spanish. Domain identifiers in Spanish (`alumnos`, `alertas`, `legajo`, `chequeos`, `indices`, `ordenDeMerito`).
- No colour literals in components: only Tailwind classes backed by tokens in `src/theme.css`, `StatusBadge` with its vocabulary in `src/lib/dominio/vocabulario.ts`, `Enlace` and the shared modules.
- **Traceability in every test title.** A test that proves an acceptance criterion starts with its id (`it('CA-SEG-01 …')`) and **its body must drive the facet the title names** — three over-claiming titles were caught in M4 and one of them asserted a rule that was false for its own fixture. A test that proves a decision or a contract fixture starts with `M5-n` or `contrato §n.n` instead. **Each criterion is claimed by exactly one task** (the Coverage table at the end is the index); earlier tasks that touch the same ground carry `contrato §n.n` titles, so no criterion is "proven" twice at two different depths.
- Test files never live under `src/routes/`.
- Gate for every task: `pnpm verify` exits 0 before committing.
- Commits: Conventional Commits, one short subject line, **no trailers and no `Co-Authored-By`**.
- **M5 additions:**
- The MSW handlers of `src/mocks/sigeda/` implement `docs/contrato-api-seguimiento.md` exactly: the `Page_Sort` envelope through `paginar`, plain-text 404s through `textoNoEncontrado`, plain-text 403s through `textoProhibido`, the bare JSON array of `'campo': mensaje` through `erroresDeCampo`, and `autorizar(request, permiso)` on **every** route including the four that have no `@PreAuthorize` in `sigeda-back` today (contract §2.3–§2.6: the mock declares the permission the contract asks for, which is how the request for it stays visible).
- **A catalogue that fails warns under its own selector and never blocks the screen**: `(catalogo.data ?? [])` plus its own `FieldError`. Only a screen's own primary query gets `errorDePrimeraCarga` + `AvisoDeError` with Reintentar. A failed background refetch must never blank a rendered table.
- **Write actions gated by a pending dependency stay visible and disabled with `MENSAJE_DEPENDENCIA_PENDIENTE`**, never hidden — hiding them made two M4 criteria fail. M5 has no writes, so the rule reaches M5 only through the panels: **a panel whose dependency is unresolved shows its own S-text instead of an empty state, and is never omitted silently.** A panel the caller's role cannot read is the one thing that *is* omitted, and it says so (S29).
- **Tables must fit their container at 1440×900 with their actions column visible.** Long text truncates with `title`; a per-row notice must not wrap into a tall row (that turned M4's rows into 133 px). Row identity goes in `aria-label`, not in visible button text.
- **Fixed texts are `TEXTO_*` constants** in `src/lib/dominio/seguimiento.ts`, never literals in components. An empty collection shows only its notice, **never a headers-only table beside it**.
- Anything depending on "now" pins the clock through `src/test/tiempo.ts`. A test that would fail at 23:55 is a defect. Only two places in M5 read "now": the debounce (CA-SEG-02) and S22's consulted-at stamp (CA-REP-03).
- Derived state has exactly one home. **Grades and indices are never recomputed in a component**: every figure goes through `formatearNota`, theory grades through `textoConMinimo`, and the single Derived number of the milestone — the simple mean of S9 — lives in `mediaSimple` in the domain module and nowhere else (M5-4).
- Files M0–M4 own are changed with the exact edits given, never rewritten wholesale, except where a step says "Replace … with" and carries the complete new content.

## Decomposition note, for the reviewer of this plan

§17.6 lists 20 tasks and the review of it asked for four changes, net-neutral at 20: merge the two legajo panel tasks 14+15, merge 16+17, split task 12 (Alertas) and split task 20. Applied literally, the merge of 16+17 produces one task carrying **six** acceptance criteria (CA-LEG-03..08), which is exactly what the ≤ 4 rule forbids. This plan therefore lands the same 20 tasks with two deviations from §17.6's numbering, both of which keep every task at four criteria or fewer:

- §17.6's tasks 3 and 4 (the two halves of the legajo API layer, both of them mock-shape work carrying no criterion of their own) become **one** task, here task 4. That is the slot the plan spends on splitting Reportes, whose seven CA-REP criteria cannot fit one screen task either. The fixtures also move **before** the readers: §17.6's task 4 fixes the subfase report on (`777777`, subfase 3) while its task 5 is the one that creates those five evaluations, so the two are inverted there.
- The legajo's five screen tasks are cut by **panel cost** rather than by tab: shell + cabecera + practical history (T14), the rest of Resumen (T15), the subfase report with the promedios and the turnos (T16), desaprobados with the chequeo panel (T17), Teórico with `/mi-legajo` (T18). Every one of them carries three or four criteria and none carries six.

The result is 20 tasks, 43 criteria, **no task above four**, and the two cheapest tasks (1 and 8) carrying none — their tests are traceability-tagged to decisions instead. §17.6's own "what to cut first" list is untouched and still applies if the milestone overruns: merge T16 and T17, then drop the chequeo panel of T17.

## File map

```
sigeda-web/
├── docs/decisiones.md                                  (T20: las cuatro postergaciones de M5-23)
└── src/
    ├── components/
    │   ├── aviso-de-dependencia.tsx                    renombrado desde aviso-de-teoria.tsx, con texto (T1)
    │   └── aviso-de-dependencia.test.tsx               (T1)
    ├── lib/
    │   ├── auth/pantallas.ts                           las cinco pantallas de M5 (T8)
    │   ├── auth/rutas-m5.test.tsx                      quién alcanza cada pantalla (T8)
    │   ├── dependencias.ts                             las siete puertas de M5-22 (T8)
    │   ├── dominio/seguimiento.ts · .test.ts           criterios, causales, alertas, índices, S1–S31 (T1)
    │   ├── dominio/vocabulario.ts                      severidad y tipo de alerta (T1)
    │   └── use-retardo.ts · use-retardo.test.tsx       el rebote compartido de M5-23 (T1)
    ├── features/
    │   ├── seguimiento/
    │   │   ├── api.ts · api.test.ts                    escuadrón (T2), desaprobados (T3), legajo (T4),
    │   │   │                                           chequeos e historial teórico (T6), alertas (T7)
    │   │   ├── schemas.ts                              las cuatro búsquedas de §17.3 (T8)
    │   │   ├── columnas.tsx · columnas-alertas.tsx     (T9, T11) · (T12, T13)
    │   │   ├── escuadron-page.tsx                      (T8, T9, T10, T11)
    │   │   ├── alertas-page.tsx                        (T8, T12, T13)
    │   │   ├── legajo-page.tsx · cargar.ts             (T8, T14..T18) · propiedad del alumno (T18)
    │   │   └── components/                             panel.tsx (T14) · cabecera (T14) · historial-practico (T14)
    │   │                                               indices (T15) · estado-teorico (T15) · reporte-subfase (T16)
    │   │                                               turnos (T16) · desaprobados (T17) · chequeo (T17)
    │   │                                               historial-teorico (T18)
    │   └── reportes/
    │       ├── api.ts · api.test.ts                    índices y orden de mérito (T5)
    │       ├── columnas.tsx · reportes-page.tsx        (T19, T20) · (T8, T19, T20)
    ├── mocks/
    │   ├── handlers.ts                                 registro de los seis módulos nuevos (T3..T7)
    │   └── sigeda/
    │       ├── comun.ts                                paginarOrdenado, para los dos órdenes no lexicográficos (T5)
    │       ├── catalogos.ts                            una fila por (alumno, turno) en el catálogo del instructor (T2)
    │       ├── datos.ts                                contadores de la semilla, grupo 6, ocho evaluaciones (T3), secuencias (T6)
    │       ├── semilla-teoria.ts                       turnos teóricos 6 y 7, exámenes 4 y 5 (T6)
    │       ├── desaprobados.ts · .test.ts              el replay de §9.3 y los cinco endpoints (T3)
    │       ├── alumnos.ts · alumnos.test.ts            /alumno y /legajo (T4)
    │       ├── reportes-subfase.ts · .test.ts          reporte y promedios de subfase (T4)
    │       ├── indices.ts · indices.test.ts            índices y orden de mérito (T5)
    │       ├── chequeos.ts · chequeos.test.ts          el historial de chequeos (T6)
    │       ├── cuestionarios-historial.ts · .test.ts   el historial teórico (T6)
    │       ├── estado-teorico.ts · .test.ts            la variante en lote (T2) y causales[] (T6)
    │       └── seguimiento.ts · seguimiento.test.ts    alertas (T7)
    └── routes/_app/
        ├── seguimiento/index.tsx · alertas.tsx · $alumno.tsx   (T8)
        ├── mi-legajo.tsx                                       (T8, redirección)
        └── reportes.tsx                                        (T8)
```

---
### Task 1: `src/lib/dominio/seguimiento.ts`, the shared debounce hook and the `aviso-de-dependencia` rename (M5-20, M5-22, M5-23)

Owns no acceptance criterion: its tests are tagged `M5-20`, `M5-22` and `M5-23`. It goes first because nine existing files and every later task import from it.

**Files:**

- Create: `src/lib/dominio/seguimiento.ts`
- Test: `src/lib/dominio/seguimiento.test.ts`
- Create: `src/lib/use-retardo.ts`
- Test: `src/lib/use-retardo.test.tsx`
- Rename (git mv) + modify: `src/components/aviso-de-teoria.tsx` → `src/components/aviso-de-dependencia.tsx`
- Test: `src/components/aviso-de-dependencia.test.tsx`
- Modify: `src/lib/dominio/vocabulario.ts`
- Modify: `src/lib/dominio/vocabulario.test.ts`
- Modify (import + one prop each): `src/features/preguntas/banco-page.tsx`, `src/features/preguntas/importar-page.tsx`, `src/features/turnos-teoricos/turnos-teoricos-page.tsx`, `src/features/turnos-teoricos/registrar-turno-teorico-page.tsx`, `src/features/turnos-teoricos/modificar-turno-teorico-page.tsx`, `src/features/turnos-teoricos/resultados-turno-page.tsx`, `src/features/examenes/mis-examenes-page.tsx`, `src/features/examenes/rendir-examen-page.tsx`, `src/features/examenes/resultado-examen-page.tsx`

**Interfaces:**

- Consumes: `ESTADOS_ALUMNO` and `Termino` from `lib/dominio/vocabulario`, `formatearNota` from `lib/formato`, `accionDisponible`/`AccionConDependencia` from `lib/dependencias`, `Alert`/`AlertDescription` from `components/ui/alert`, `relojFalso()` from `src/test/tiempo.ts`.
- Produces:
  - `src/lib/dominio/seguimiento.ts`: the fixed texts **S1–S17, S22–S26 and S28–S31** of spec §17.3 as `TEXTO_*` constants and four builders (`etiquetaDeGrupo`, `textoCriterioCumplido`, `textoOrdenDeMeritoConsultado`, `textoSinNfpi`); `TIPOS_ALERTA`, `SEVERIDADES` and `ordinalDeSeveridad`; `CAUSALES_TEORICOS` with `etiquetaDeCausal`; `CRITERIOS_CHEQUEO`, `criterioDeFase`, `ramasDeCriterio` and `textoRegularAlternado`; `INDICES` with `formulaDeIndice`; `requiereAtencion`, `resumirEstados`, `coincideTexto` and `mediaSimple`.
  - `src/lib/use-retardo.ts`: `useAccionRetardada(accion, milisegundos)` and `MILISEGUNDOS_DE_REBOTE = 300`.
  - `src/components/aviso-de-dependencia.tsx`: `AvisoDeDependencia({ accion, texto })`.
  - `src/lib/dominio/vocabulario.ts`: the `severidad` and `tipoAlerta` vocabularies for `StatusBadge`.

- [ ] **Step 1: Confirm the baseline**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git rev-parse --abbrev-ref HEAD && git log --oneline -1 && pnpm test:run 2>&1 | tail -4
```

Expected: branch `feat/m5-seguimiento`, HEAD `2e46adf docs: fix the Escuadrón paging criteria and eleven review minors`, **851 tests in 104 files**, all green. If any of the three differs, stop and report. (On this machine a full parallel run started right after other heavy work produces phantom five-second timeouts whose count varies run to run — re-run, or use `--no-file-parallelism`, before believing a failure. `.superpowers/notas/m4-progress.md:165`.)

- [ ] **Step 2: Write the failing tests**

Create `src/lib/dominio/seguimiento.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  coincideTexto,
  criterioDeFase,
  etiquetaDeCausal,
  etiquetaDeGrupo,
  etiquetaDeSeveridad,
  etiquetaDeTipoAlerta,
  formulaDeIndice,
  INDICES,
  mediaSimple,
  ordinalDeSeveridad,
  ramasDeCriterio,
  requiereAtencion,
  resumirEstados,
  SEVERIDADES,
  TEXTO_ALERTAS_SIN_SERVIDOR,
  TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR,
  TEXTO_CHEQUEO_SIN_SERVIDOR,
  TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR,
  TEXTO_DESEMPATE,
  TEXTO_ESTADO_TEORICO_EN_LOTE,
  TEXTO_ESTADO_YA_CAMBIO,
  TEXTO_EVALUADOR_SIN_CODIGO,
  TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR,
  TEXTO_INDICES_SIN_SERVIDOR,
  TEXTO_INDICES_SOLO_MOCK,
  TEXTO_MEDIA_SIMPLE_SUBFASE,
  TEXTO_ORDEN_MERITO_SIN_SERVIDOR,
  TEXTO_PREVALECE_LA_PRIMERA_NOTA,
  TEXTO_REQUIERE_ATENCION,
  TEXTO_SIN_ALERTAS,
  TEXTO_SIN_ALUMNOS_ASIGNADOS,
  TEXTO_SIN_ALUMNOS_CON_INDICES,
  TEXTO_SIN_ALUMNOS_EN_PROGRAMA,
  TEXTO_SIN_DATOS_SUFICIENTES,
  TEXTO_SIN_GRUPO,
  TEXTO_TURNO_SIN_CANTIDAD,
  textoCriterioCumplido,
  textoOrdenDeMeritoConsultado,
  textoRegularAlternado,
  textoSinNfpi,
  TIPOS_ALERTA,
} from './seguimiento'

describe('vocabulario de seguimiento', () => {
  it('M5-20 etiqueta los cinco tipos de alerta del contrato', () => {
    expect(TIPOS_ALERTA.map((tipo) => tipo.valor)).toEqual([
      'VUELO_DESAPROBADO',
      'ESTADO_CRITICO',
      'CHEQUEO_PENDIENTE',
      'SUBSANACION_PENDIENTE',
      'CAUSAL_TEORICO',
    ])
    expect(etiquetaDeTipoAlerta('VUELO_DESAPROBADO')).toBe('Vuelo desaprobado')
    expect(etiquetaDeTipoAlerta('SUBSANACION_PENDIENTE')).toBe('Subsanación pendiente')
    expect(etiquetaDeTipoAlerta('OTRO')).toBe('OTRO')
  })

  it('M5-20 ordena las severidades por ordinal y no por su etiqueta', () => {
    expect(SEVERIDADES.map((severidad) => severidad.valor)).toEqual(['ALTA', 'MEDIA', 'BAJA'])
    expect(etiquetaDeSeveridad('ALTA')).toBe('Alta')
    expect([ordinalDeSeveridad('ALTA'), ordinalDeSeveridad('MEDIA'), ordinalDeSeveridad('BAJA')]).toEqual([1, 2, 3])
    expect(['ALTA', 'MEDIA', 'BAJA'].toSorted()).toEqual(['ALTA', 'BAJA', 'MEDIA'])
    expect(['ALTA', 'MEDIA', 'BAJA'].toSorted((a, b) => ordinalDeSeveridad(a) - ordinalDeSeveridad(b))).toEqual([
      'ALTA',
      'MEDIA',
      'BAJA',
    ])
  })

  it('M5-20 etiqueta los siete códigos de causal del PDI', () => {
    expect(etiquetaDeCausal('PROMEDIO_ASIGNATURA')).toBe('Promedio de asignatura bajo 13')
    expect(etiquetaDeCausal('TRES_ASIGNATURAS')).toBe('Tres asignaturas desaprobadas')
    expect(etiquetaDeCausal('DOS_EXAMENES')).toBe('Dos exámenes desaprobados')
    expect(etiquetaDeCausal('SEGUNDA_SUBSANACION')).toBe('Segunda subsanación desaprobada')
    expect(etiquetaDeCausal('PERIODICOS_CRITICOS')).toBe('Periódicos de emergencias y límites')
    expect(etiquetaDeCausal('PERIODICOS_GENERALES')).toBe('Periódicos generales')
    expect(etiquetaDeCausal('INOPINADOS')).toBe('Inopinados desaprobados')
    expect(etiquetaDeCausal('OTRA')).toBe('OTRA')
  })
})

describe('ciclo de chequeo', () => {
  it('M5-20 el criterio 1 rige Adaptación y Helitransportadas y el 2 Aerotácticas', () => {
    expect(criterioDeFase('Adaptación')).toBe(1)
    expect(criterioDeFase('Operaciones HeliTransportadas')).toBe(1)
    expect(criterioDeFase('Operaciones AeroTácticas')).toBe(2)
    expect(criterioDeFase('')).toBe(1)
  })

  it('M5-20 cada criterio nombra las ramas que el PDI define', () => {
    expect(ramasDeCriterio(1)).toEqual([
      '3 vuelos Malos',
      '2 Malos y 2 Regulares alternados',
      '1 Malo y 4 Regulares alternados',
      '6 Regulares alternados',
    ])
    expect(ramasDeCriterio(2)).toEqual(['2 vuelos Malos', '1 Malo y 2 Regulares alternados', '4 Regulares alternados'])
  })

  it('M5-20 la regla del Regular alternado se dice en los dos sentidos', () => {
    expect(textoRegularAlternado(true)).toBe('El próximo calificativo Regular contará para el criterio.')
    expect(textoRegularAlternado(false)).toBe(
      'El próximo calificativo Regular no contará: solo cuentan los Regulares alternados.',
    )
  })
})

describe('estados del escuadrón', () => {
  it('M5-24 requiereAtencion marca todo estado distinto de Apto', () => {
    expect(requiereAtencion('Apto')).toBe(false)
    expect(requiereAtencion('En Chequeo')).toBe(true)
    expect(requiereAtencion('En Observación')).toBe(true)
    expect(requiereAtencion('No Apto')).toBe(true)
  })

  it('M5-24 resume los estados en el orden del vocabulario y omite los vacíos', () => {
    expect(resumirEstados(['En Chequeo', 'Apto', 'Apto', 'No Apto'])).toEqual([
      { estado: 'Apto', cantidad: 2 },
      { estado: 'En Chequeo', cantidad: 1 },
      { estado: 'No Apto', cantidad: 1 },
    ])
    expect(resumirEstados([])).toEqual([])
  })

  it('M5-23 coincideTexto ignora mayúsculas y tildes', () => {
    expect(coincideTexto('Lucía Mendoza Ríos', 'lucia')).toBe(true)
    expect(coincideTexto('Lucía Mendoza Ríos', 'RIOS')).toBe(true)
    expect(coincideTexto('Lucía Mendoza Ríos', 'torres')).toBe(false)
    expect(coincideTexto('Lucía Mendoza Ríos', '')).toBe(true)
  })
})

describe('la única cifra derivada de M5', () => {
  it('M5-4 mediaSimple promedia los promedios del servidor y no inventa nada', () => {
    expect(mediaSimple([12, 12, 12, 12, 17])).toBe(13)
    expect(mediaSimple([14, 15])).toBe(14.5)
    expect(mediaSimple([15, 17])).toBe(16)
    expect(mediaSimple([16.5])).toBe(16.5)
    expect(mediaSimple([])).toBeNull()
  })

  it('M5-2 cada índice lleva su fórmula como texto y ninguna se evalúa', () => {
    expect(INDICES.map((indice) => indice.clave)).toEqual(['NFPI', 'NIT', 'NCT', 'NEI', 'NIA'])
    expect(formulaDeIndice('NFPI')).toBe('NIT (0.2) + NIA (0.8)')
    expect(formulaDeIndice('NIA')).toBe('NFAD (0.40) + NFOH (0.35) + NFOA (0.25)')
    expect(formulaDeIndice('NSF')).toBe('')
  })
})

describe('textos fijos de la spec §17.3', () => {
  it('M5-9 los textos sin parámetros son los de la spec, byte a byte', () => {
    expect(TEXTO_INDICES_SOLO_MOCK).toBe(
      'Los índices del PDI y el orden de mérito todavía no existen en el servidor: se muestran solo en modo mock.',
    )
    expect(TEXTO_SIN_ALUMNOS_ASIGNADOS).toBe(
      'No tiene alumnos asignados en este programa: aparecen aquí cuando haya volado un turno con ellos.',
    )
    expect(TEXTO_SIN_GRUPO).toBe('Sin grupo')
    expect(TEXTO_ESTADO_TEORICO_EN_LOTE).toBe('No se pudo comprobar el estado teórico de estos alumnos.')
    expect(TEXTO_SIN_ALUMNOS_EN_PROGRAMA).toBe('Todavía no hay alumnos en este programa.')
    expect(TEXTO_SIN_ALERTAS).toBe('No hay alertas abiertas en los grupos que usted ve.')
    expect(TEXTO_ALERTAS_SIN_SERVIDOR).toBe(
      'El listado de alertas del escuadrón todavía no existe en el servidor. Consulte los vuelos desaprobados de cada alumno en su legajo.',
    )
    expect(TEXTO_MEDIA_SIMPLE_SUBFASE).toBe(
      'Promedio simple de las evaluaciones Ponderada y Chequeo Sub Fase de esta subfase. No es la nota de sub fase del PDI, que pondera cada misión por su coeficiente.',
    )
    expect(TEXTO_EVALUADOR_SIN_CODIGO).toBe('El servidor guarda el nombre del evaluador, no su código.')
    expect(TEXTO_TURNO_SIN_CANTIDAD).toBe(
      'La cantidad de alumnos del turno no está disponible: el servidor informa otro campo.',
    )
    expect(TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR).toBe('El cambio de estado lo decide el servidor en la próxima evaluación.')
    expect(TEXTO_ESTADO_YA_CAMBIO).toBe('El estado ya cambió: los contadores no se moverán hasta que vuelva a Apto.')
    expect(TEXTO_CHEQUEO_SIN_SERVIDOR).toBe('El historial de chequeos y los contadores todavía no existen en el servidor.')
    expect(TEXTO_SIN_DATOS_SUFICIENTES).toBe('Sin datos suficientes')
    expect(TEXTO_INDICES_SIN_SERVIDOR).toBe('El servidor todavía no calcula los índices del PDI.')
    expect(TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR).toBe(
      'El historial de exámenes teóricos todavía no existe en el servidor.',
    )
    expect(TEXTO_SIN_ALUMNOS_CON_INDICES).toBe('Todavía no hay alumnos con índices calculados en este programa.')
    expect(TEXTO_ORDEN_MERITO_SIN_SERVIDOR).toBe('El servidor todavía no calcula el orden de mérito.')
    expect(TEXTO_PREVALECE_LA_PRIMERA_NOTA).toBe(
      'Prevalece la primera nota: es la que entra en el promedio. La subsanación levanta el bloqueo para volar y queda como evidencia.',
    )
    expect(TEXTO_DESEMPATE).toBe('Desempate: mayor NIA y, si persiste, menor código.')
    expect(TEXTO_REQUIERE_ATENCION).toBe('Requiere atención')
    expect(TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR).toBe('Los vuelos desaprobados los consulta su instructor.')
  })

  it('M5-9 los cuatro textos con parámetros los interpolan como la spec los escribe', () => {
    expect(etiquetaDeGrupo(6)).toBe('Grupo 6')
    expect(etiquetaDeGrupo(null)).toBe('Sin grupo')
    expect(textoCriterioCumplido('Adaptación', '3 vuelos Malos')).toBe(
      'Alcanzó el criterio de chequeo de Adaptación: 3 vuelos Malos.',
    )
    expect(textoOrdenDeMeritoConsultado('26/09/2026', '09:15')).toBe(
      'Orden de mérito consultado el 26/09/2026 a las 09:15. El servidor lo calcula en cada consulta.',
    )
    expect(textoSinNfpi('Sin nota en Operaciones AeroTácticas')).toBe('Sin NFPI: Sin nota en Operaciones AeroTácticas.')
  })
})
```

Create `src/lib/use-retardo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MILISEGUNDOS_DE_REBOTE, useAccionRetardada } from './use-retardo'
import { relojFalso } from '@/test/tiempo'

function Caja({ alBuscar }: { alBuscar: (valor: string) => void }) {
  const [texto, setTexto] = useState('')
  const retardada = useAccionRetardada(alBuscar, MILISEGUNDOS_DE_REBOTE)
  return (
    <input
      aria-label="Buscar"
      value={texto}
      onChange={(evento) => {
        setTexto(evento.target.value)
        retardada(evento.target.value)
      }}
    />
  )
}

describe('useAccionRetardada', () => {
  it('M5-23 no ejecuta la acción antes de que pasen los 300 ms', async () => {
    const { usuario, avanzar } = relojFalso()
    const alBuscar = vi.fn()
    render(<Caja alBuscar={alBuscar} />)
    await usuario.type(screen.getByLabelText('Buscar'), 'ana')
    expect(alBuscar).not.toHaveBeenCalled()
    await avanzar(1_000)
    expect(alBuscar).toHaveBeenCalledTimes(1)
    expect(alBuscar).toHaveBeenCalledWith('ana')
  })

  it('M5-23 cada tecla reinicia la espera: una sola ejecución con el último valor', async () => {
    const { usuario, avanzar } = relojFalso()
    const alBuscar = vi.fn()
    render(<Caja alBuscar={alBuscar} />)
    const campo = screen.getByLabelText('Buscar')
    await usuario.type(campo, 'an')
    await avanzar(100)
    await usuario.type(campo, 'a')
    await avanzar(1_000)
    expect(alBuscar).toHaveBeenCalledTimes(1)
    expect(alBuscar).toHaveBeenCalledWith('ana')
  })

  it('M5-23 dos ráfagas separadas ejecutan la acción dos veces', async () => {
    const { usuario, avanzar } = relojFalso()
    const alBuscar = vi.fn()
    render(<Caja alBuscar={alBuscar} />)
    const campo = screen.getByLabelText('Buscar')
    await usuario.type(campo, 'an')
    await avanzar(1_000)
    await usuario.type(campo, 'a')
    await avanzar(1_000)
    expect(alBuscar.mock.calls.map(([valor]) => valor)).toEqual(['an', 'ana'])
  })

  it('M5-23 al desmontar no queda ninguna ejecución pendiente', async () => {
    const { usuario, avanzar } = relojFalso()
    const alBuscar = vi.fn()
    const { unmount } = render(<Caja alBuscar={alBuscar} />)
    await usuario.type(screen.getByLabelText('Buscar'), 'ana')
    unmount()
    await avanzar(2_000)
    expect(alBuscar).not.toHaveBeenCalled()
  })
})
```

Create `src/components/aviso-de-dependencia.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AvisoDeDependencia } from './aviso-de-dependencia'
import { TEXTO_ALERTAS_SIN_SERVIDOR, TEXTO_INDICES_SIN_SERVIDOR } from '@/lib/dominio/seguimiento'

describe('AvisoDeDependencia', () => {
  it('M5-22 en modo mock no muestra nada', () => {
    vi.stubEnv('VITE_MOCK_API', 'true')
    render(<AvisoDeDependencia accion="verAlertas" texto={TEXTO_ALERTAS_SIN_SERVIDOR} />)
    expect(screen.queryByText(TEXTO_ALERTAS_SIN_SERVIDOR)).not.toBeInTheDocument()
  })

  it('M5-22 fuera del modo mock muestra el texto que recibe, no uno propio', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    render(
      <>
        <AvisoDeDependencia accion="verAlertas" texto={TEXTO_ALERTAS_SIN_SERVIDOR} />
        <AvisoDeDependencia accion="verIndices" texto={TEXTO_INDICES_SIN_SERVIDOR} />
      </>,
    )
    expect(screen.getByText(TEXTO_ALERTAS_SIN_SERVIDOR)).toBeInTheDocument()
    expect(screen.getByText(TEXTO_INDICES_SIN_SERVIDOR)).toBeInTheDocument()
  })
})
```

Add to `src/lib/dominio/vocabulario.test.ts`, inside its existing `describe`:

```ts
  it('M5-20 la severidad y el tipo de alerta tienen tono en los dos vocabularios', () => {
    expect(termino('severidad', 'ALTA')).toEqual({ etiqueta: 'Alta', tono: 'peligro' })
    expect(termino('severidad', 'BAJA')).toEqual({ etiqueta: 'Baja', tono: 'neutro' })
    expect(termino('tipoAlerta', 'SUBSANACION_PENDIENTE')).toEqual({ etiqueta: 'Subsanación pendiente', tono: 'alerta' })
    expect(termino('tipoAlerta', 'OTRO')).toEqual({ etiqueta: 'OTRO', tono: 'neutro' })
  })
```

Run them and confirm they fail for the right reason (unresolved modules, not a wrong assertion):

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dominio/seguimiento.test.ts src/lib/use-retardo.test.tsx src/components/aviso-de-dependencia.test.tsx src/lib/dominio/vocabulario.test.ts 2>&1 | tail -12
```

- [ ] **Step 3: The domain module**

Create `src/lib/dominio/seguimiento.ts`:

```ts
import { ESTADOS_ALUMNO } from './vocabulario'

export const TEXTO_INDICES_SOLO_MOCK =
  'Los índices del PDI y el orden de mérito todavía no existen en el servidor: se muestran solo en modo mock.'
export const TEXTO_SIN_ALUMNOS_ASIGNADOS =
  'No tiene alumnos asignados en este programa: aparecen aquí cuando haya volado un turno con ellos.'
export const TEXTO_SIN_GRUPO = 'Sin grupo'
export const TEXTO_ESTADO_TEORICO_EN_LOTE = 'No se pudo comprobar el estado teórico de estos alumnos.'
export const TEXTO_SIN_ALUMNOS_EN_PROGRAMA = 'Todavía no hay alumnos en este programa.'
export const TEXTO_SIN_ALERTAS = 'No hay alertas abiertas en los grupos que usted ve.'
export const TEXTO_ALERTAS_SIN_SERVIDOR =
  'El listado de alertas del escuadrón todavía no existe en el servidor. Consulte los vuelos desaprobados de cada alumno en su legajo.'
export const TEXTO_MEDIA_SIMPLE_SUBFASE =
  'Promedio simple de las evaluaciones Ponderada y Chequeo Sub Fase de esta subfase. No es la nota de sub fase del PDI, que pondera cada misión por su coeficiente.'
export const TEXTO_EVALUADOR_SIN_CODIGO = 'El servidor guarda el nombre del evaluador, no su código.'
export const TEXTO_TURNO_SIN_CANTIDAD =
  'La cantidad de alumnos del turno no está disponible: el servidor informa otro campo.'
export const TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR = 'El cambio de estado lo decide el servidor en la próxima evaluación.'
export const TEXTO_ESTADO_YA_CAMBIO = 'El estado ya cambió: los contadores no se moverán hasta que vuelva a Apto.'
export const TEXTO_CHEQUEO_SIN_SERVIDOR = 'El historial de chequeos y los contadores todavía no existen en el servidor.'
export const TEXTO_SIN_DATOS_SUFICIENTES = 'Sin datos suficientes'
export const TEXTO_INDICES_SIN_SERVIDOR = 'El servidor todavía no calcula los índices del PDI.'
export const TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR =
  'El historial de exámenes teóricos todavía no existe en el servidor.'
export const TEXTO_PREVALECE_LA_PRIMERA_NOTA =
  'Prevalece la primera nota: es la que entra en el promedio. La subsanación levanta el bloqueo para volar y queda como evidencia.'
export const TEXTO_DESEMPATE = 'Desempate: mayor NIA y, si persiste, menor código.'
export const TEXTO_SIN_ALUMNOS_CON_INDICES = 'Todavía no hay alumnos con índices calculados en este programa.'
export const TEXTO_ORDEN_MERITO_SIN_SERVIDOR = 'El servidor todavía no calcula el orden de mérito.'
export const TEXTO_REQUIERE_ATENCION = 'Requiere atención'
export const TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR = 'Los vuelos desaprobados los consulta su instructor.'

export const TEXTO_SIN_PROMEDIOS_PONDERADOS = 'Esta sub fase no tiene evaluaciones ponderadas.'
export const TEXTO_SIN_CHEQUEOS = 'Todavía no rindió ningún chequeo.'
export const TEXTO_SIN_CAUSALES = 'No tiene causales de bajo rendimiento académico.'
export const TEXTO_SIN_DESAPROBADOS = 'No tiene vuelos desaprobados.'
export const TEXTO_SIN_TURNOS_DEL_ALUMNO = 'Todavía no tiene turnos de vuelo registrados.'
export const TEXTO_SIN_EXAMENES_DEL_ALUMNO = 'Todavía no rindió exámenes teóricos.'
export const TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE = 'No tiene evaluaciones en esta sub fase.'
export const TEXTO_SIN_SEGUNDA_NOTA = 'Sin segunda nota: la subsanación está pendiente.'

export function etiquetaDeGrupo(idGrupo: number | null): string {
  return idGrupo === null ? TEXTO_SIN_GRUPO : `Grupo ${idGrupo}`
}

export function textoCriterioCumplido(fase: string, detalle: string): string {
  return `Alcanzó el criterio de chequeo de ${fase}: ${detalle}.`
}

export function textoOrdenDeMeritoConsultado(fecha: string, hora: string): string {
  return `Orden de mérito consultado el ${fecha} a las ${hora}. El servidor lo calcula en cada consulta.`
}

export function textoSinNfpi(detalle: string): string {
  return `Sin NFPI: ${detalle}.`
}

export function textoRegularAlternado(alternado: boolean): string {
  return alternado
    ? 'El próximo calificativo Regular contará para el criterio.'
    : 'El próximo calificativo Regular no contará: solo cuentan los Regulares alternados.'
}

export const TIPOS_ALERTA = [
  { valor: 'VUELO_DESAPROBADO', etiqueta: 'Vuelo desaprobado' },
  { valor: 'ESTADO_CRITICO', etiqueta: 'Estado crítico' },
  { valor: 'CHEQUEO_PENDIENTE', etiqueta: 'Chequeo pendiente' },
  { valor: 'SUBSANACION_PENDIENTE', etiqueta: 'Subsanación pendiente' },
  { valor: 'CAUSAL_TEORICO', etiqueta: 'Causal teórico' },
] as const

export type TipoAlerta = (typeof TIPOS_ALERTA)[number]['valor']

export const SEVERIDADES = [
  { valor: 'ALTA', etiqueta: 'Alta', ordinal: 1 },
  { valor: 'MEDIA', etiqueta: 'Media', ordinal: 2 },
  { valor: 'BAJA', etiqueta: 'Baja', ordinal: 3 },
] as const

export type Severidad = (typeof SEVERIDADES)[number]['valor']

export function etiquetaDeTipoAlerta(valor: string): string {
  return TIPOS_ALERTA.find((tipo) => tipo.valor === valor)?.etiqueta ?? valor
}

export function etiquetaDeSeveridad(valor: string): string {
  return SEVERIDADES.find((severidad) => severidad.valor === valor)?.etiqueta ?? valor
}

export function ordinalDeSeveridad(valor: string): number {
  return SEVERIDADES.find((severidad) => severidad.valor === valor)?.ordinal ?? SEVERIDADES.length + 1
}

export const CAUSALES_TEORICOS = [
  { valor: 'PROMEDIO_ASIGNATURA', etiqueta: 'Promedio de asignatura bajo 13' },
  { valor: 'TRES_ASIGNATURAS', etiqueta: 'Tres asignaturas desaprobadas' },
  { valor: 'DOS_EXAMENES', etiqueta: 'Dos exámenes desaprobados' },
  { valor: 'SEGUNDA_SUBSANACION', etiqueta: 'Segunda subsanación desaprobada' },
  { valor: 'PERIODICOS_CRITICOS', etiqueta: 'Periódicos de emergencias y límites' },
  { valor: 'PERIODICOS_GENERALES', etiqueta: 'Periódicos generales' },
  { valor: 'INOPINADOS', etiqueta: 'Inopinados desaprobados' },
] as const

export type CausalTeorico = (typeof CAUSALES_TEORICOS)[number]['valor']

export function etiquetaDeCausal(valor: string): string {
  return CAUSALES_TEORICOS.find((causal) => causal.valor === valor)?.etiqueta ?? valor
}

export const CRITERIOS_CHEQUEO = {
  1: ['3 vuelos Malos', '2 Malos y 2 Regulares alternados', '1 Malo y 4 Regulares alternados', '6 Regulares alternados'],
  2: ['2 vuelos Malos', '1 Malo y 2 Regulares alternados', '4 Regulares alternados'],
} as const

export type Criterio = 1 | 2

export function criterioDeFase(fase: string): Criterio {
  return fase === 'Operaciones AeroTácticas' ? 2 : 1
}

export function ramasDeCriterio(criterio: Criterio): readonly string[] {
  return CRITERIOS_CHEQUEO[criterio]
}

export const INDICES = [
  { clave: 'NFPI', etiqueta: 'NFPI', formula: 'NIT (0.2) + NIA (0.8)' },
  { clave: 'NIT', etiqueta: 'NIT', formula: 'NCT (0.8) + NEI (0.2)' },
  { clave: 'NCT', etiqueta: 'NCT', formula: 'Σ (NA × coeficiente)' },
  { clave: 'NEI', etiqueta: 'NEI', formula: 'Σ (notas) / cantidad rendida' },
  { clave: 'NIA', etiqueta: 'NIA', formula: 'NFAD (0.40) + NFOH (0.35) + NFOA (0.25)' },
] as const

export function formulaDeIndice(clave: string): string {
  return INDICES.find((indice) => indice.clave === clave)?.formula ?? ''
}

export function requiereAtencion(estado: string): boolean {
  return estado !== 'Apto'
}

export function resumirEstados(estados: readonly string[]): { estado: string; cantidad: number }[] {
  const conocidos = Object.keys(ESTADOS_ALUMNO)
  const orden = [...conocidos, ...estados.filter((estado) => !conocidos.includes(estado))]
  return [...new Set(orden)]
    .map((estado) => ({ estado, cantidad: estados.filter((candidato) => candidato === estado).length }))
    .filter((fila) => fila.cantidad > 0)
}

function sinTildes(valor: string): string {
  return valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function coincideTexto(valor: string, buscado: string): boolean {
  return sinTildes(valor).includes(sinTildes(buscado.trim()))
}

export function mediaSimple(valores: readonly number[]): number | null {
  if (valores.length === 0) return null
  return valores.reduce((suma, valor) => suma + valor, 0) / valores.length
}
```

- [ ] **Step 4: The shared debounce hook (M5-23)**

Create `src/lib/use-retardo.ts`:

```ts
import { useCallback, useEffect, useRef } from 'react'

export const MILISEGUNDOS_DE_REBOTE = 300

export function useAccionRetardada<T>(accion: (valor: T) => void, milisegundos: number): (valor: T) => void {
  const ultima = useRef(accion)
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ultima.current = accion
  })

  useEffect(
    () => () => {
      if (reloj.current !== null) clearTimeout(reloj.current)
    },
    [],
  )

  return useCallback(
    (valor: T) => {
      if (reloj.current !== null) clearTimeout(reloj.current)
      reloj.current = setTimeout(() => {
        reloj.current = null
        ultima.current(valor)
      }, milisegundos)
    },
    [milisegundos],
  )
}
```

- [ ] **Step 5: The two new vocabularies**

In `src/lib/dominio/vocabulario.ts`, add after `SUBSANACION`:

```ts
export const SEVERIDADES_ALERTA = {
  ALTA: { etiqueta: 'Alta', tono: 'peligro' },
  MEDIA: { etiqueta: 'Media', tono: 'aviso' },
  BAJA: { etiqueta: 'Baja', tono: 'neutro' },
} as const satisfies Record<string, Termino>

export const TIPOS_DE_ALERTA = {
  VUELO_DESAPROBADO: { etiqueta: 'Vuelo desaprobado', tono: 'info' },
  ESTADO_CRITICO: { etiqueta: 'Estado crítico', tono: 'peligro' },
  CHEQUEO_PENDIENTE: { etiqueta: 'Chequeo pendiente', tono: 'aviso' },
  SUBSANACION_PENDIENTE: { etiqueta: 'Subsanación pendiente', tono: 'alerta' },
  CAUSAL_TEORICO: { etiqueta: 'Causal teórico', tono: 'violeta' },
} as const satisfies Record<string, Termino>
```

and replace

```ts
  examen: RESULTADOS_EXAMEN,
  subsanacion: SUBSANACION,
} as const
```

with

```ts
  examen: RESULTADOS_EXAMEN,
  subsanacion: SUBSANACION,
  severidad: SEVERIDADES_ALERTA,
  tipoAlerta: TIPOS_DE_ALERTA,
} as const
```

The labels are duplicated on purpose: `TIPOS_ALERTA` in the domain module drives the filter select (a list with an order) and `TIPOS_DE_ALERTA` here drives `StatusBadge` (a map with a tone). The test of Step 2 asserts both spellings, so they cannot drift apart silently.

- [ ] **Step 6: Rename the dependency notice (M5-22)**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git mv src/components/aviso-de-teoria.tsx src/components/aviso-de-dependencia.tsx
```

Replace the whole of `src/components/aviso-de-dependencia.tsx` with:

```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { accionDisponible, type AccionConDependencia } from '@/lib/dependencias'

export function AvisoDeDependencia({ accion, texto }: { accion: AccionConDependencia; texto: string }) {
  if (accionDisponible(accion)) return null
  return (
    <Alert>
      <AlertDescription>{texto}</AlertDescription>
    </Alert>
  )
}
```

Then, in each of the nine importers, replace the import

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
```

with

```tsx
import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
```

and the usage `<AvisoDeTeoria accion="X" />` with `<AvisoDeDependencia accion="X" texto={TEXTO_TEORIA_SOLO_MOCK} />`, adding `TEXTO_TEORIA_SOLO_MOCK` to that file's existing `@/lib/dominio/teoria` import (six of the nine already import from it; `importar-page.tsx`, `registrar-turno-teorico-page.tsx` and `modificar-turno-teorico-page.tsx` gain the import). The nine files and their `accion` values, from the baseline grep:

| File | `accion` |
|---|---|
| `features/preguntas/banco-page.tsx:101` | `gestionarPreguntas` |
| `features/preguntas/importar-page.tsx:15` | `importarPreguntas` |
| `features/turnos-teoricos/turnos-teoricos-page.tsx:79` | `programarTurnoTeorico` |
| `features/turnos-teoricos/registrar-turno-teorico-page.tsx:14` | `programarTurnoTeorico` |
| `features/turnos-teoricos/modificar-turno-teorico-page.tsx:26` | `programarTurnoTeorico` |
| `features/turnos-teoricos/resultados-turno-page.tsx:74` | `programarTurnoTeorico` |
| `features/examenes/mis-examenes-page.tsx:39` | `rendirExamen` |
| `features/examenes/rendir-examen-page.tsx:146` | `rendirExamen` |
| `features/examenes/resultado-examen-page.tsx:37` | `rendirExamen` |

No test of M4 changes: every one of them asserts `TEXTO_TEORIA_SOLO_MOCK` by value, never the component's name.

- [ ] **Step 7: Run the tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dominio/seguimiento.test.ts src/lib/use-retardo.test.tsx src/components/aviso-de-dependencia.test.tsx src/lib/dominio/vocabulario.test.ts src/lib/auth/rutas-m4.test.tsx 2>&1 | tail -8
```

Expected: PASS — 13 in `seguimiento.test.ts`, 4 in `use-retardo.test.tsx`, 2 in `aviso-de-dependencia.test.tsx`, 6 in `vocabulario.test.ts` (5 baseline + 1) and the 10 of `rutas-m4.test.tsx` unchanged.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **871 tests** (851 + 20).

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the seguimiento domain module, the shared debounce and the dependency notice"
```

---
### Task 2: Seguimiento API layer over the two catalogues, and the bulk `estado-teorico` of dependency 56 (M5-6, M5-16)

Owns no acceptance criterion: its tests are tagged `contrato §1.1`, `contrato §1.2`, `contrato §5.3` and `M5-6`. CA-SEG-01, CA-SEG-03, CA-SEG-05 and CA-SEG-07 are claimed by the Escuadrón screen tasks (T9–T11), which is where the user-visible half of each of them lives.

**Files:**

- Create: `src/features/seguimiento/api.ts`
- Test: `src/features/seguimiento/api.test.ts`
- Modify: `src/mocks/sigeda/catalogos.ts`
- Modify: `src/mocks/sigeda/estado-teorico.ts`

**Interfaces:**

- Consumes: `sigeda.pagina` / `sigeda.lista` (`lib/api/sigeda`), `Pagina`/`ParametrosPagina` (`lib/api/pagina`), `nombreCompleto` and `Programa` (`features/catalogos/api`), `coincideTexto` (`lib/dominio/seguimiento`, T1), `Permiso` (`lib/auth/permisos`), and in the mock `paginar`, `autorizar`, `erroresDeCampo`, `buscarPersona`, `datos()`, `desaprobadosSinSubsanar`, `nombreCompleto`, `alumnosHabilitados`, `estadoDelTurno`.
- Produces:
  - `src/features/seguimiento/api.ts`: `AlumnoSeguimiento`, `FuenteSeguimiento`, `FiltrosEscuadron`, `fuenteDeSeguimiento`, `listarSeguimiento`, `filtrarAlumnos`, `ordenarAlumnos`, `paginarAlumnos`, `EstadoTeoricoResumen`, `estadoTeoricoEnLote`, `clavesSeguimiento` and `consultasSeguimiento`.
  - `src/mocks/sigeda/catalogos.ts`: the instructor catalogue emits **one row per `alumnos_turno`** instead of one row holding every alumno, as contract §1.2 states.
  - `src/mocks/sigeda/estado-teorico.ts`: `resumenDeEstadoTeorico(cod, persona)` extracted, the new `GET /api/estado-teorico?codAlumnos=` route, and the constants `D15_AL_MENOS_UN_CODIGO` and `D16_MAXIMO_CIEN` (the D ids of `contrato-api-seguimiento.md`, not of the theory contract).

- [ ] **Step 1: Write the failing tests**

Create `src/features/seguimiento/api.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { permisosDeRol } from '@/lib/auth/permisos'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import {
  estadoTeoricoEnLote,
  fuenteDeSeguimiento,
  listarSeguimiento,
  paginarAlumnos,
  type AlumnoSeguimiento,
  type FiltrosEscuadron,
} from './api'

const PARAMETROS: FiltrosEscuadron = { programa: 'PDI', page: 0, size: 10, direction: 'ASC' }

const ALUMNOS: AlumnoSeguimiento[] = [
  { codigo: '111111', nombreCompleto: 'Oscar Lopez Chaparro', idGrupo: 1, estado: 'Apto' },
  { codigo: '777777', nombreCompleto: 'Carlos Ramirez Sanchez', idGrupo: 4, estado: 'En Chequeo' },
  { codigo: '666666', nombreCompleto: 'Ana Torres Martinez', idGrupo: 3, estado: 'Apto' },
  { codigo: '654321', nombreCompleto: 'Lucía Mendoza Ríos', idGrupo: null, estado: 'Apto' },
]

describe('catálogo de seguimiento', () => {
  it('M5-6 la escalera tiene dos peldaños y el jefe de operaciones cae en el del instructor', () => {
    expect(fuenteDeSeguimiento(permisosDeRol('Comandante de Escuadrón'))).toBe('todos')
    expect(fuenteDeSeguimiento(permisosDeRol('Administrador Web'))).toBe('todos')
    expect(fuenteDeSeguimiento(permisosDeRol('Instructor'))).toBe('instructor')
    expect(fuenteDeSeguimiento(permisosDeRol('Jefe de Operaciones'))).toBe('instructor')
    expect(fuenteDeSeguimiento(permisosDeRol('Alumno'))).toBeNull()
  })

  it('contrato §1.1 con View All Groups arma la lista con los alumnos de todos los grupos del programa', async () => {
    await iniciarComo('comandante.aguirre')
    const alumnos = await listarSeguimiento('todos', 'PDI', '222444')
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '222222', '555555', '666666', '777777', '999999'])
  })

  it('M5-6 conserva el estado y el idGrupo que listarAlumnos descarta', async () => {
    await iniciarComo('comandante.aguirre')
    const alumnos = await listarSeguimiento('todos', 'PDI', '222444')
    expect(alumnos.find((alumno) => alumno.codigo === '777777')).toEqual({
      codigo: '777777',
      nombreCompleto: 'Carlos Ramirez Sanchez',
      idGrupo: 4,
      estado: 'En Chequeo',
    })
  })

  it('contrato §1.2 el catálogo del instructor da una fila por alumno y turno y la capa deduplica', async () => {
    await iniciarComo('instructor.perez')
    const crudo = await sigeda.pagina<{ persona: unknown[] }>('/api/grupos/instructor/444444/programa/PDI', {
      page: 0,
      size: 10,
    })
    expect(crudo.items).toHaveLength(6)
    expect(crudo.total).toBe(6)
    const alumnos = await listarSeguimiento('instructor', 'PDI', '444444')
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '222222', '555555', '666666'])
  })

  it('contrato §1.2 recorre todas las páginas que informa el servidor', async () => {
    await iniciarComo('instructor.perez')
    const pedidas: string[] = []
    server.use(
      http.get(`${config.sigedaApiUrl}/api/grupos/instructor/:cod/programa/:nombre`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '0'
        pedidas.push(page)
        const codigo = page === '0' ? '111111' : '999999'
        return HttpResponse.json({
          content: [{ persona: [{ codigo, nombre: 'Uno', aPaterno: 'Dos', aMaterno: 'Tres', idGrupo: 1, estado: 'Apto' }] }],
          totalElements: 2,
          totalPages: 2,
          size: 10,
          number: Number(page),
        })
      }),
    )
    const alumnos = await listarSeguimiento('instructor', 'PDI', '444444')
    expect(pedidas).toEqual(['0', '1'])
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '999999'])
  })

  it('contrato §1.2 un instructor sin alumnos recibe una lista vacía, no un error', async () => {
    await iniciarComo('jefe.operaciones')
    await expect(listarSeguimiento('instructor', 'PDI', '333333')).resolves.toEqual([])
  })

  it('M5-6 sin código de persona la fuente del instructor no pide nada', async () => {
    await iniciarComo('instructor.perez')
    await expect(listarSeguimiento('instructor', 'PDI', null)).resolves.toEqual([])
  })
})

describe('filtro, orden y paginado en el navegador', () => {
  it('M5-6 filtra por grupo, por estado y por texto del nombre', () => {
    expect(paginarAlumnos(ALUMNOS, { ...PARAMETROS, idGrupo: 3 }).items.map((alumno) => alumno.codigo)).toEqual(['666666'])
    expect(paginarAlumnos(ALUMNOS, { ...PARAMETROS, estado: 'En Chequeo' }).items.map((alumno) => alumno.codigo)).toEqual([
      '777777',
    ])
    expect(paginarAlumnos(ALUMNOS, { ...PARAMETROS, texto: 'mendoza' }).items.map((alumno) => alumno.codigo)).toEqual([
      '654321',
    ])
    expect(paginarAlumnos(ALUMNOS, { ...PARAMETROS, texto: 'RIOS' }).items.map((alumno) => alumno.codigo)).toEqual(['654321'])
  })

  it('M5-6 ordena por la columna pedida y el total cuenta alumnos, no filas del servidor', () => {
    const porNombre = paginarAlumnos(ALUMNOS, { ...PARAMETROS, property: 'nombreCompleto' })
    expect(porNombre.items.map((alumno) => alumno.codigo)).toEqual(['666666', '777777', '654321', '111111'])
    expect(porNombre.total).toBe(4)
    const porCodigoDesc = paginarAlumnos(ALUMNOS, { ...PARAMETROS, property: 'codigo', direction: 'DESC' })
    expect(porCodigoDesc.items.map((alumno) => alumno.codigo)).toEqual(['777777', '666666', '654321', '111111'])
  })

  it('M5-6 pagina en el navegador y una página fuera de rango queda vacía sin perder el total', () => {
    const primera = paginarAlumnos(ALUMNOS, { ...PARAMETROS, size: 3, property: 'codigo' })
    expect(primera.items.map((alumno) => alumno.codigo)).toEqual(['111111', '654321', '666666'])
    expect(primera.totalPages).toBe(2)
    const segunda = paginarAlumnos(ALUMNOS, { ...PARAMETROS, size: 3, page: 1, property: 'codigo' })
    expect(segunda.items.map((alumno) => alumno.codigo)).toEqual(['777777'])
    const cuarta = paginarAlumnos(ALUMNOS, { ...PARAMETROS, size: 3, page: 3, property: 'codigo' })
    expect(cuarta.items).toEqual([])
    expect(cuarta.total).toBe(4)
  })
})

describe('estado teórico en lote', () => {
  it('contrato §5.3 pide los códigos separados por comas y devuelve uno por alumno', async () => {
    await iniciarComo('instructor.perez')
    const estados = await estadoTeoricoEnLote(['555555', '666666'])
    expect(estados.map((estado) => estado.codAlumno)).toEqual(['555555', '666666'])
    expect(estados.find((estado) => estado.codAlumno === '666666')).toMatchObject({
      bloqueadoPorSubsanacion: true,
      alumno: 'Ana Torres Martinez',
    })
    expect(estados.find((estado) => estado.codAlumno === '555555')?.bloqueadoPorSubsanacion).toBe(false)
  })

  it('contrato §5.3 un código inexistente se omite y la lista vacía de resultados es 200', async () => {
    await iniciarComo('instructor.perez')
    await expect(estadoTeoricoEnLote(['666666', '000000'])).resolves.toHaveLength(1)
    await expect(estadoTeoricoEnLote(['000000'])).resolves.toEqual([])
  })

  it('contrato §5.3 sin códigos no pide nada y con más de cien el servidor responde D16', async () => {
    await iniciarComo('instructor.perez')
    await expect(estadoTeoricoEnLote([])).resolves.toEqual([])
    const muchos = Array.from({ length: 101 }, (_, indice) => String(indice).padStart(6, '0'))
    await expect(estadoTeoricoEnLote(muchos)).rejects.toBeInstanceOf(ApiError)
    await expect(estadoTeoricoEnLote(muchos)).rejects.toMatchObject({
      status: 400,
      erroresDeCampo: { codAlumnos: 'No se pueden consultar más de 100 alumnos a la vez.' },
    })
  })
})
```

`ApiError.erroresDeCampo` is the field map `normalizarError` builds from the bare JSON array of `'campo': mensaje` (`src/lib/api/errors.ts:5,29-42,90`), so the D16 message arrives keyed by `codAlumnos` and the screen never has to parse a string.

- [ ] **Step 2: The API layer**

Create `src/features/seguimiento/api.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { nombreCompleto, type Programa } from '@/features/catalogos/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import type { Permiso } from '@/lib/auth/permisos'
import { coincideTexto } from '@/lib/dominio/seguimiento'

const TAMANO_CATALOGO = 10

export type AlumnoSeguimiento = { codigo: string; nombreCompleto: string; idGrupo: number | null; estado: string }

export type FuenteSeguimiento = 'todos' | 'instructor'

export type FiltrosEscuadron = ParametrosPagina & {
  programa: Programa
  idGrupo?: number
  estado?: string
  texto?: string
}

export type EstadoTeoricoResumen = {
  codAlumno: string
  alumno: string
  bloqueadoPorSubsanacion: boolean
  motivo: string | null
}

type AlumnoApi = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  idGrupo: number | null
  estado: string
}

export function fuenteDeSeguimiento(permisos: ReadonlySet<Permiso>): FuenteSeguimiento | null {
  if (permisos.has('View All Groups')) return 'todos'
  if (permisos.has('View My Group')) return 'instructor'
  return null
}

function aAlumnoSeguimiento(persona: AlumnoApi): AlumnoSeguimiento {
  return {
    codigo: persona.codigo,
    nombreCompleto: nombreCompleto(persona),
    idGrupo: persona.idGrupo ?? null,
    estado: persona.estado,
  }
}

function sinRepetidos(alumnos: readonly AlumnoSeguimiento[]): AlumnoSeguimiento[] {
  const vistos = new Set<string>()
  return alumnos.filter((alumno) => {
    if (vistos.has(alumno.codigo)) return false
    vistos.add(alumno.codigo)
    return true
  })
}

async function todasLasPaginas<T>(ruta: string): Promise<T[]> {
  const primera = await sigeda.pagina<T>(ruta, { page: 0, size: TAMANO_CATALOGO })
  const restantes = await Promise.all(
    Array.from({ length: Math.max(primera.totalPages - 1, 0) }, (_, indice) =>
      sigeda.pagina<T>(ruta, { page: indice + 1, size: TAMANO_CATALOGO }),
    ),
  )
  return [primera, ...restantes].flatMap((pagina) => pagina.items)
}

export async function listarSeguimiento(
  fuente: FuenteSeguimiento,
  programa: Programa,
  codPersona: string | null,
): Promise<AlumnoSeguimiento[]> {
  if (fuente === 'todos') {
    const grupos = await todasLasPaginas<{ personas: AlumnoApi[] }>(
      `/api/grupos/programa/${encodeURIComponent(programa)}`,
    )
    return sinRepetidos(grupos.flatMap((grupo) => grupo.personas.map(aAlumnoSeguimiento)))
  }
  if (!codPersona) return []
  const filas = await todasLasPaginas<{ persona: AlumnoApi[] | AlumnoApi }>(
    `/api/grupos/instructor/${encodeURIComponent(codPersona)}/programa/${encodeURIComponent(programa)}`,
  )
  return sinRepetidos(
    filas.flatMap((fila) => (Array.isArray(fila.persona) ? fila.persona : [fila.persona]).map(aAlumnoSeguimiento)),
  )
}

export function filtrarAlumnos(
  alumnos: readonly AlumnoSeguimiento[],
  filtros: FiltrosEscuadron,
): AlumnoSeguimiento[] {
  return alumnos.filter(
    (alumno) =>
      (filtros.idGrupo === undefined || alumno.idGrupo === filtros.idGrupo) &&
      (filtros.estado === undefined || alumno.estado === filtros.estado) &&
      (filtros.texto === undefined || coincideTexto(alumno.nombreCompleto, filtros.texto)),
  )
}

const CAMPOS_ORDENABLES = ['codigo', 'nombreCompleto', 'idGrupo', 'estado'] as const

export function ordenarAlumnos(
  alumnos: readonly AlumnoSeguimiento[],
  property: string | undefined,
  direction: 'ASC' | 'DESC',
): AlumnoSeguimiento[] {
  const campo = CAMPOS_ORDENABLES.find((candidato) => candidato === property) ?? 'codigo'
  const signo = direction === 'DESC' ? -1 : 1
  return [...alumnos].sort(
    (izquierda, derecha) =>
      signo *
      String(izquierda[campo] ?? '').localeCompare(String(derecha[campo] ?? ''), 'es', { numeric: true }),
  )
}

export function paginarAlumnos(
  alumnos: readonly AlumnoSeguimiento[],
  filtros: FiltrosEscuadron,
): Pagina<AlumnoSeguimiento> {
  const visibles = ordenarAlumnos(filtrarAlumnos(alumnos, filtros), filtros.property, filtros.direction)
  const size = Math.max(filtros.size, 1)
  return {
    items: visibles.slice(filtros.page * size, filtros.page * size + size),
    page: filtros.page,
    size,
    total: visibles.length,
    totalPages: Math.max(Math.ceil(visibles.length / size), 1),
  }
}

export async function estadoTeoricoEnLote(codigos: readonly string[]): Promise<EstadoTeoricoResumen[]> {
  if (codigos.length === 0) return []
  return sigeda.lista<EstadoTeoricoResumen>('/api/estado-teorico', { codAlumnos: [...codigos].join(',') })
}

export const clavesSeguimiento = {
  todo: ['seguimiento'] as const,
  alumnos: (fuente: FuenteSeguimiento, programa: Programa, codPersona: string | null) =>
    [...clavesSeguimiento.todo, 'alumnos', fuente, programa, codPersona] as const,
  estadoTeorico: (codigos: readonly string[]) =>
    [...clavesSeguimiento.todo, 'estado-teorico', [...codigos].sort()] as const,
}

export const consultasSeguimiento = {
  alumnos: (fuente: FuenteSeguimiento, programa: Programa, codPersona: string | null) =>
    queryOptions({
      queryKey: clavesSeguimiento.alumnos(fuente, programa, codPersona),
      queryFn: () => listarSeguimiento(fuente, programa, codPersona),
      staleTime: 300_000,
    }),
  estadoTeorico: (codigos: readonly string[]) =>
    queryOptions({
      queryKey: clavesSeguimiento.estadoTeorico(codigos),
      queryFn: () => estadoTeoricoEnLote(codigos),
      retry: false,
    }),
}
```

`ordenarAlumnos` defaults to `codigo` rather than to the first column so that a URL with no `property` is deterministic; the screen of T9 passes the URL's `property` through untouched.

- [ ] **Step 3: One catalogue row per `alumnos_turno` (contract §1.2)**

In `src/mocks/sigeda/catalogos.ts`, replace the body of the instructor catalogue

```ts
    const codigos = new Set(
      datos()
        .turnos.filter((turno) => turno.codInstructor === String(params.cod) && turno.programa === programa)
        .flatMap((turno) => turno.alumnos.map((alumno) => alumno.codAlumno)),
    )
    const alumnos = [...codigos]
      .map((codigo) => buscarPersona(codigo))
      .filter((persona): persona is PersonaMock => persona !== undefined)
      .map(alumnoConEstado)
    const catalogo = alumnos.length > 0 ? [{ id: 1, persona: alumnos }] : []
```

with

```ts
    const catalogo = datos()
      .turnos.filter((turno) => turno.codInstructor === String(params.cod) && turno.programa === programa)
      .flatMap((turno) =>
        turno.alumnos.flatMap((fila) => {
          const persona = buscarPersona(fila.codAlumno)
          return persona ? [{ id: turno.id, persona: [alumnoConEstado(persona)] }] : []
        }),
      )
```

This is the shape contract §1.2 describes: the route pages over `alumnos_turno` rows, so an alumno appears once per turno flown with that instructor. With the seeded turnos it yields **six** rows for `444444` (turnos 1, 2, 3, 4 and both alumnos of turno 8) over **four** alumnos, and four rows for `888888` over two. `listarAlumnos` (`features/catalogos/api.ts:107-117`) asks for `size=100`, already accepts both `persona` shapes and already de-duplicates, so M1's and M4's pickers see exactly the same four options in the same order — Step 5 re-runs their suites to prove it. `PersonaMock` may become an unused import in this file; if `tsc` says so, drop it from the import list.

- [ ] **Step 4: The bulk `estado-teorico` (dependency 56, contract §5.3)**

In `src/mocks/sigeda/estado-teorico.ts`, add the two message constants above the handlers:

```ts
export const D15_AL_MENOS_UN_CODIGO = 'Debe enviar al menos un código de alumno.'
export const D16_MAXIMO_CIEN = 'No se pueden consultar más de 100 alumnos a la vez.'
```

Extract the body the single-persona handler already builds into a reusable function, placed after `motivoDeBloqueo`:

```ts
export function resumenDeEstadoTeorico(cod: string, persona: PersonaMock) {
  const desaprobados = desaprobadosSinSubsanar(cod)
  return {
    codAlumno: cod,
    alumno: nombreCompleto(persona),
    bloqueadoPorSubsanacion: desaprobados.length > 0,
    motivo: motivoDeBloqueo(cod),
    desaprobados: desaprobados.map((cuestionario) => {
      const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
      const materia = turno ? buscarMateria(turno.idMateria) : undefined
      return {
        idCuestionario: cuestionario.id,
        idTurnoTeorico: cuestionario.idTurnoTeorico,
        turnoTeorico: turno?.nombre ?? '',
        idMateria: turno?.idMateria ?? 0,
        materia: materia?.nombre ?? '',
        tipoExamen: turno?.tipoExamen ?? 'TEST',
        fechaExamen: turno?.fechaExamen ?? '',
        nota: cuestionario.nota,
        notaMinimaAplicada: cuestionario.notaMinimaAplicada,
      }
    }),
    pendientes: datos()
      .turnosTeoricos.filter((turno) => turno.tipoExamen === 'SUBSANACION' || turno.tipoExamen === 'REZAGADO')
      .filter((turno) => estadoDelTurno(turno) !== 'FINALIZADO')
      .filter((turno) => alumnosHabilitados(turno).some((alumno) => alumno.codigo === cod))
      .map((turno) => ({
        idTurnoTeorico: turno.id,
        nombre: turno.nombre,
        tipoExamen: turno.tipoExamen,
        idMateria: turno.idMateria,
        materia: buscarMateria(turno.idMateria)?.nombre ?? '',
        fechaExamen: turno.fechaExamen,
        horaInicio: turno.horaInicio,
        horaFin: turno.horaFin,
      })),
  }
}
```

The single-persona handler then returns `HttpResponse.json(resumenDeEstadoTeorico(cod, persona))` with the rest of its guards untouched — **the `pendientes` list keeps `idTurnoTeorico`, which M4's `mis-examenes-page` reads**, so nothing of the shape changes. Add the bulk route to the same array, **before** the parameterised one is irrelevant (the paths differ in their first segment) but keep it first for readability:

```ts
  http.get(`${API}/api/estado-teorico`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const codigos = (new URL(request.url).searchParams.get('codAlumnos') ?? '')
      .split(',')
      .map((valor) => valor.trim())
      .filter((valor) => valor !== '')
    if (codigos.length === 0) return erroresDeCampo([`'codAlumnos': ${D15_AL_MENOS_UN_CODIGO}`])
    if (codigos.length > 100) return erroresDeCampo([`'codAlumnos': ${D16_MAXIMO_CIEN}`])
    return HttpResponse.json(
      codigos.flatMap((cod) => {
        const persona = buscarPersona(cod)
        return persona ? [resumenDeEstadoTeorico(cod, persona)] : []
      }),
    )
  }),
```

Add `erroresDeCampo` to the `./comun` import and `type PersonaMock` to the `./datos` import. The bulk route carries **no** `causales[]` (contract §5.3): the screen that consumes it is a list and only needs the block.

- [ ] **Step 5: Run the tests, including the suites the catalogue change could reach**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/api.test.ts src/features/catalogos/api.test.ts src/features/turnos/registrar-turno-page.test.tsx src/features/turnos/modificar-turno-page.test.tsx src/features/turnos-teoricos/formulario-turno-teorico.test.tsx src/features/examenes/mis-examenes-page.test.tsx 2>&1 | tail -8
```

Expected: PASS, 13 new tests in `seguimiento/api.test.ts` and every other file unchanged. If a picker suite fails, the catalogue change broke a shape assumption: report it rather than adjusting the picker.

- [ ] **Step 6: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **884 tests**.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: read the two alumno catalogues and the bulk estado teorico for seguimiento"
```

---
### Task 3: The fixtures of contract §9.1–§9.4 and the five `desaprobados` endpoints (M5-8, M5-21) (CA-ALE-06)

**This task runs before the legajo readers on purpose**, and that reverses §17.6's own order: its task 4 fixes the subfase-report fixture on (`777777`, subfase 3) while its task 5 is the one that *creates* `777777`'s five evaluations, so the two are inverted there. Fixtures first.

**Files:**

- Modify: `src/mocks/sigeda/datos.ts`
- Create: `src/mocks/sigeda/desaprobados.ts`
- Test: `src/mocks/sigeda/desaprobados.test.ts`
- Modify: `src/mocks/sigeda/personas.ts`
- Modify: `src/mocks/sigeda/grupos.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/features/seguimiento/api.ts`
- Modify: `src/features/seguimiento/api.test.ts`
- Modify (one assertion each): `src/features/grupos/grupos-page.test.tsx`, `src/features/turnos-teoricos/formulario-turno-teorico.test.tsx`

**Interfaces:**

- Consumes: `datos()`, `buscarPersona`, `buscarSubfase`, `sumarDias`, `hoyIso`, `paginar`/`autorizar`/`textoNoEncontrado`/`textoEliminado` from `./comun`, `criterioDeFase` and `CRITERIOS_CHEQUEO` from `lib/dominio/seguimiento` (T1).
- Produces:
  - `src/mocks/sigeda/datos.ts`: `PersonaMock` gains `contChequeo`, `contMalo` and `contRegular`; the `persona()` factory takes the four counters; the §9.1 values are applied to the seven alumnos; **grupo 6 is renamed «Promoción 2026-A»**; the eight evaluations of §9.2 join `crearDatos`, and `codEvalRealizada` is set to each alumno's last one.
  - `src/mocks/sigeda/desaprobados.ts`: `replayDeResultados()` — the §9.3 derivation, exported because `chequeos.ts` (T7) reads its second half — `DesaprobadoMock`, `ChequeoDerivado`, the five handlers of contract §2.2–§2.6 and the constants `D3_SIN_DESAPROBADOS`, `D4_DESAPROBADO_NO_EXISTE` and `D5_DESAPROBADO_ELIMINADO`.
  - `src/features/seguimiento/api.ts`: `Desaprobado`, `listarDesaprobados` with the six-character guard, `MENSAJE_CODIGO_INVALIDO`, and `clavesSeguimiento.desaprobados`.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/sigeda/desaprobados.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'
import { replayDeResultados } from './desaprobados'

describe('contadores, grupos y evaluaciones de las fijaciones', () => {
  it('contrato §9.1 cada alumno lleva los cuatro contadores de la semilla', async () => {
    await iniciarComo('admin.sistema')
    const persona = await sigeda.get<{ contChequeo: number; contEval: number; contMalo: number; contRegular: number }>(
      '/api/personas/777777',
    )
    expect(persona).toMatchObject({ contChequeo: 4, contEval: 10, contMalo: 3, contRegular: 2 })
    const grupo = await sigeda.get<{ personas: { codigo: string; contMalo: number; contRegular: number }[] }>('/api/grupos/6')
    expect(grupo.personas.find((alumno) => alumno.codigo === '999999')).toMatchObject({ contMalo: 2, contRegular: 2 })
  })

  it('contrato §9.1 el grupo 6 tiene nombre propio, así que la etiqueta S4 es falsable', async () => {
    await iniciarComo('admin.sistema')
    const grupo = await sigeda.get<{ nombre: string }>('/api/grupos/6')
    expect(grupo.nombre).toBe('Promoción 2026-A')
  })

  it('contrato §9.2 las doce evaluaciones están en las subfases que el contrato fija', () => {
    const codigos = datos().evaluaciones.map((evaluacion) => evaluacion.codigo)
    expect(codigos).toHaveLength(12)
    expect(codigos).toContain('666666-1')
    expect(codigos).toContain('999999-2')
    const de777777 = datos().evaluaciones.filter((evaluacion) => evaluacion.codPersona === '777777')
    expect(de777777).toHaveLength(5)
    expect(de777777.every((evaluacion) => evaluacion.idSubFase === 3)).toBe(true)
    expect(de777777.map((evaluacion) => evaluacion.codEvalPrevia)).toEqual([
      null,
      '777777-1',
      '777777-2',
      '777777-3',
      '777777-4',
    ])
    expect(datos().evaluaciones.find((evaluacion) => evaluacion.codigo === '999999-2')?.categoria).toBe('Chequeo Sub Fase')
  })
})

describe('el replay de ResultadoController', () => {
  it('contrato §9.3 deriva seis desaprobados en cuatro alumnos y tres grupos', () => {
    const { desaprobados } = replayDeResultados()
    expect(desaprobados.map((fila) => fila.codigo)).toEqual([
      '555555-1',
      '666666-1',
      '777777-1',
      '777777-2',
      '999999-1',
      '777777-3',
    ])
    expect(new Set(desaprobados.map((fila) => fila.codPersona)).size).toBe(4)
    expect(new Set(desaprobados.map((fila) => datos().personas.find((p) => p.codigo === fila.codPersona)?.idGrupo))).toEqual(
      new Set([3, 4, 6]),
    )
  })

  it('contrato §9.3 una Ponderada Mala de un alumno que ya no está Apto no abre nada', () => {
    const { desaprobados } = replayDeResultados()
    expect(desaprobados.map((fila) => fila.codigo)).not.toContain('777777-4')
    expect(desaprobados.filter((fila) => fila.codPersona === '777777')).toHaveLength(3)
  })

  it('contrato §9.3 un Regular con contRegular impar no abre desaprobado', () => {
    const { desaprobados } = replayDeResultados()
    expect(desaprobados.map((fila) => fila.codigo)).toContain('555555-1')
    expect(desaprobados.map((fila) => fila.codigo)).not.toContain('555555-3')
  })

  it('contrato §9.4 el Chequeo Sub Fase de 999999 deriva una sola fila de chequeo aprobado', () => {
    const { chequeos } = replayDeResultados()
    expect(chequeos).toHaveLength(1)
    expect(chequeos[0]).toMatchObject({
      codigo: '999999-2',
      tipo: 'SUBFASE',
      resultado: 'Aprobado',
      contadores: { chequeo: 0, evaluaciones: 7, malos: 0, regulares: 1 },
    })
  })
})

describe('los cinco endpoints de desaprobados', () => {
  it('contrato §2.2 lista los desaprobados de un alumno con su subfase y su programa', async () => {
    await iniciarComo('instructor.perez')
    const filas = await sigeda.lista<{ codigo: string; clasificacion: string; subfase: string; idSubfase: number }>(
      '/api/desaprobados/persona/777777',
    )
    expect(filas).toHaveLength(3)
    expect(filas[0]).toMatchObject({ codigo: '777777-1', clasificacion: 'Malo', subfase: 'Instrumentos', idSubfase: 3 })
    expect(filas[0]).toHaveProperty('programa', 'PDI')
    expect(filas[0]).not.toHaveProperty('persona')
  })

  it('contrato §2.2 un alumno sin desaprobados responde 404 D3 y la capa lo deja en lista vacía', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/desaprobados/persona/654321')).rejects.toMatchObject({
      status: 404,
      message: 'No existen desaprobados disponibles.',
    })
    await expect(sigeda.lista('/api/desaprobados/persona/654321')).resolves.toEqual([])
  })

  it('contrato §2.2 pide View Disapproved, que el alumno no tiene', async () => {
    await iniciarComo('alumno.ramirez')
    await expect(sigeda.lista('/api/desaprobados/persona/777777')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })

  it('contrato §2.3 y §2.4 los dos lectores por subfase piden el permiso que el contrato exige', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/desaprobados/alumno/777777/subfase/3')).resolves.toMatchObject({ codigo: '777777-3' })
    await expect(sigeda.get('/api/desaprobados/regular/alumno/999999/subfase/1')).resolves.toMatchObject({
      codigo: '999999-1',
    })
    await expect(sigeda.get('/api/desaprobados/alumno/111111/subfase/1')).rejects.toMatchObject({
      status: 404,
      message: 'Desaprobado especificada no existe.',
    })
    await iniciarComo('alumno.ramirez')
    await expect(sigeda.get('/api/desaprobados/alumno/777777/subfase/3')).rejects.toBeInstanceOf(ApiError)
  })

  it('contrato §2.5 el DELETE pide Modify Evaluations y responde 404 cuando el código no existe', async () => {
    await iniciarComo('alumno.ramirez')
    await expect(sigeda.eliminar('/api/desaprobados/777777-1')).rejects.toMatchObject({ status: 403 })
    await iniciarComo('instructor.perez')
    await expect(sigeda.eliminar('/api/desaprobados/no-existe')).rejects.toMatchObject({
      status: 404,
      message: 'Desaprobado especificada no existe.',
    })
    await expect(sigeda.eliminar('/api/desaprobados/777777-1')).resolves.toBe('Desaprobado eliminado con éxito.')
  })

  it('contrato §2.6 exist responde true o false crudos', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/desaprobados/exist/777777-1')).resolves.toBe(true)
    await expect(sigeda.get('/api/desaprobados/exist/111111-1')).resolves.toBe(false)
  })
})
```

The DELETE of the last test proves the contract's requested behaviour, **not** today's: `sigeda-back` answers 200 for a missing code and has no `@PreAuthorize` at all (§2.5). M5 never calls it; the mock is where the request for the fix is written down.

Add to `src/features/seguimiento/api.test.ts`:

```ts
const fuentes = import.meta.glob<string>('/src/features/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })

describe('el agujero de desaprobados se expone, nunca se explota', () => {
  it('CA-ALE-06 la capa de API rechaza un codPersona que no tenga exactamente seis caracteres', async () => {
    await iniciarComo('instructor.perez')
    await expect(listarDesaprobados('7')).rejects.toThrow(MENSAJE_CODIGO_INVALIDO)
    await expect(listarDesaprobados('7777777')).rejects.toThrow(MENSAJE_CODIGO_INVALIDO)
    await expect(listarDesaprobados('')).rejects.toThrow(MENSAJE_CODIGO_INVALIDO)
    await expect(listarDesaprobados('777777')).resolves.toHaveLength(3)
  })

  it('CA-ALE-06 ninguna pantalla llama a un endpoint de desaprobados sin permiso declarado', () => {
    const referencias = Object.entries(fuentes)
      .filter(([archivo]) => !archivo.includes('.test.'))
      .flatMap(([archivo, fuente]) =>
        [...fuente.matchAll(/\/api\/desaprobados[^`'"]*/g)].map((coincidencia) => [archivo, coincidencia[0]] as const),
      )
    expect(referencias.length).toBeGreaterThan(0)
    expect(referencias.filter(([, ruta]) => !ruta.startsWith('/api/desaprobados/persona/'))).toEqual([])
  })
})
```

- [ ] **Step 2: The counters, the grupo name and the eight evaluations (contract §9.1, §9.2)**

In `src/mocks/sigeda/datos.ts`, widen `PersonaMock`:

```ts
export type PersonaMock = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  dni: string
  rango: string | null
  tipo: string | null
  estado: string
  idGrupo: number | null
  contChequeo: number
  contEval: number
  contMalo: number
  contRegular: number
  codEvalRealizada: string | null
}
```

and replace the `persona()` factory with one that takes the four counters as an optional tuple:

```ts
function persona(
  codigo: string,
  nombre: string,
  aPaterno: string,
  aMaterno: string,
  dni: string,
  rango: string | null,
  tipo: string | null,
  idGrupo: number | null,
  estado = 'Apto',
  contadores: [chequeo: number, evaluaciones: number, malos: number, regulares: number] = [0, 0, 0, 0],
): PersonaMock {
  return {
    codigo,
    nombre,
    aPaterno,
    aMaterno,
    dni,
    rango,
    tipo,
    estado,
    idGrupo,
    contChequeo: contadores[0],
    contEval: contadores[1],
    contMalo: contadores[2],
    contRegular: contadores[3],
    codEvalRealizada: null,
  }
}
```

Then replace the seven alumno rows of `crearDatos` and the block that patches `contEval` afterwards. The counters are contract §9.1's table, which is `data_prod.sql:59-69`'s own:

```ts
  const personas = [
    persona('111111', 'Oscar', 'Lopez', 'Chaparro', '12345678', 'Cadete', 'Alumno', 1, 'Apto', [2, 5, 1, 2]),
    persona('222222', 'Juan', 'Falconi', 'Fernandez', '23456789', 'Alférez', 'Alumno', 2, 'Apto', [3, 8, 2, 3]),
    persona('333333', 'Carlos', 'Vargas', 'Rodriguez', '34567890', 'Mayor', null, null),
    persona('444444', 'Juan', 'Torres', 'Perez', '45678901', 'Capitán', 'Instructor PDI', null),
    persona('555555', 'Pedro', 'Rodriguez', 'Garcia', '56789012', 'Teniente', 'Alumno', 3, 'Apto', [2, 5, 1, 2]),
    persona('666666', 'Ana', 'Torres', 'Martinez', '67890123', 'Capitán', 'Alumno', 3, 'Apto', [1, 4, 0, 1]),
    persona('777777', 'Carlos', 'Ramirez', 'Sanchez', '78901234', 'Mayor', 'Alumno', 4, 'En Chequeo', [4, 10, 3, 2]),
    persona('888888', 'Maria', 'Flores', 'Mendoza', '89012345', 'Teniente', 'Instructor PDI', null),
    persona('999999', 'Luis', 'Diaz', 'Castro', '90123456', 'Alférez', 'Alumno', 6, 'Apto', [3, 7, 2, 2]),
    persona('000001', 'Admin', 'Sistema', 'Web', '01234567', 'Admin', null, null),
    persona('222444', 'Jorge', 'Aguirre', 'Salas', '22244411', 'Mayor', null, null),
    persona('654321', 'Lucía', 'Mendoza', 'Ríos', '76543210', 'Cadete', 'Alumno', null),
    persona('765432', 'Raúl', 'Paredes', 'Soto', '75432109', 'Teniente', null, null),
  ]
  for (const [codigo, ultima] of [
    ['111111', '111111-1'],
    ['555555', '555555-3'],
    ['666666', '666666-1'],
    ['777777', '777777-6'],
    ['999999', '999999-2'],
  ] as const) {
    const alumno = personas.find((candidata) => candidata.codigo === codigo)
    if (alumno) alumno.codEvalRealizada = ultima
  }
```

**Why this is safe for the baseline suites, stated so a reviewer does not have to re-derive it:** `contEval` is also the mock's code counter, but only for a **non-programada** evaluation (`evaluaciones.ts:260-264` appends `-${contEval}` only when `!programada`). Every baseline assertion about a generated code is about a Ponderada — `registrar-evaluacion-page.test.tsx:168` expects `/evaluaciones/222222-2`, which is `{cod}-{idTurno}` — so raising the counters changes no expected code. `codEvalRealizada` gates modify and delete (`evaluaciones.ts:308,363`) and the "alumno ya evaluado" refusal of `personas.ts:250`; the baseline delete test uses `654321`, who has no evaluation and keeps `null`.

Rename grupo 6 in the same file:

```ts
      { id: 6, nombre: 'Promoción 2026-A', descripcion: 'Entrenamiento especializado - Nivel 2', programa: 'PDI' },
```

Add the eight evaluations of §9.2 at the end of the `evaluaciones` array of `crearDatos`. The four existing rows are untouched. `calificaciones(codigo, filas)` is the file's own helper and `enUnaSemana` shows the `sumarDias(hoy, n)` idiom already in use:

```ts
      {
        codigo: '666666-1',
        nombre: 'Ponderada Contacto Básico',
        fecha: sumarDias(hoy, -30),
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Malo',
        promedio: '12.0',
        recomendacion: 'Repetir el patrón de aterrizaje',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: null,
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '666666',
        alumno: 'Ana Torres',
        calificaciones: calificaciones('666666-1', [
          [1, 'B', 'I', 'Pérdida de referencia visual', 'No mantiene el eje de pista', 'Practicar aproximaciones'],
          [2, 'B', 'B'],
          [3, 'B', 'B'],
          [4, 'B', 'B'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
```

and, for `777777`, five rows built from this table — same shape, `idSubFase: 3`, `subFase: 'Instrumentos'`, `evaluador: 'Maria Flores'`, `alumno: 'Carlos Ramirez'`, `nombre: 'Ponderada Instrumentos'`, and **two** calificaciones over maniobras 9 and 10, which are the only ones subfase 3 has (`datos.ts:275`):

| `codigo` | `fecha` | `clasificacion` | `promedio` | `codEvalPrevia` | `estadoAlumno` | calificaciones |
|---|---|---|---|---|---|---|
| `777777-1` | `sumarDias(hoy, -28)` | `Malo` | `'12.0'` | `null` | `Apto` | `[9,'B','I',causa,obs,rec]`, `[10,'B','R',causa,obs,rec]` |
| `777777-2` | `sumarDias(hoy, -21)` | `Malo` | `'12.0'` | `'777777-1'` | `Apto` | idem |
| `777777-3` | `sumarDias(hoy, -14)` | `Malo` | `'12.0'` | `'777777-2'` | `Apto` | idem |
| `777777-4` | `sumarDias(hoy, -7)` | `Malo` | `'12.0'` | `'777777-3'` | `En Chequeo` | idem |
| `777777-6` | `sumarDias(hoy, -3)` | `Bueno` | `'17.0'` | `'777777-4'` | `En Chequeo` | `[9,'B','B']`, `[10,'B','B']` |

and two rows for `999999`, `idSubFase: 1`, `subFase: 'Contacto'`, `fase: 'Adaptación'`, `evaluador: 'Maria Flores'`, `alumno: 'Luis Diaz'`:

| `codigo` | `fecha` | `categoria` | `clasificacion` | `promedio` | `codEvalPrevia` | calificaciones |
|---|---|---|---|---|---|---|
| `999999-1` | `sumarDias(hoy, -20)` | `'Ponderada'` | `Regular` | `'15.0'` | `null` | four `[n,'B','R',causa,obs,rec]` for 1–4 and `[5,'B','B']`, `[6,'B','B']` |
| `999999-2` | `sumarDias(hoy, -10)` | `'Chequeo Sub Fase'` | `Bueno` | `'17.0'` | `'999999-1'` | six `[n,'B','B']` for 1–6 |

Three facts about those calificaciones that later tasks depend on, and that a reviewer should check rather than assume:

1. **`999999-2` has no grade below its standard**, which is what makes the replay write a `ChequeoFinal` row (§9.3 step 10). A single `BR` there would move the alumno to `En Complementación` and the whole chequeo fixture would vanish.
2. **The `estadoAlumno` column is the snapshot the evaluation carries, not the replay's input.** `777777-4` and `-5` carry `En Chequeo` because by then the server had already moved him; the replay starts every alumno at `Apto` and derives those states (§9.3), and CA-LEG-10 shows this column.
3. **`promedio` is stored as written.** `calcular()` (`evaluaciones.ts:137-155`) runs only on POST, and the seeded rows were never consistent with it either (`555555-1` is a Regular with four `BR` pairs, which `calcular` would price at 13.0 rather than the seeded 14.0). §9.2 fixes these promedios and M5 writes no evaluation, so nothing recomputes them — and contract §9.10 already declares that the history and the índices agree in ordering only.

The categoría of `999999-2` is the **label** `'Chequeo Sub Fase'`, because that is what the store holds: `evaluaciones.ts:31-36` maps the enum `chequeoSubFase` to that string before writing.

- [ ] **Step 3: The projections stop hardcoding zeros**

In `src/mocks/sigeda/personas.ts`, replace

```ts
    contChequeo: 0,
    contEval: persona.contEval,
    contMalo: 0,
    contRegular: 0,
```

with

```ts
    contChequeo: persona.contChequeo,
    contEval: persona.contEval,
    contMalo: persona.contMalo,
    contRegular: persona.contRegular,
```

and make the same replacement in `src/mocks/sigeda/grupos.ts` (`:26-32`). Also, in `personas.ts:172-173`, the POST handler builds a new persona literal: give it `contChequeo: 0, contMalo: 0, contRegular: 0` beside its `contEval: 0`.

- [ ] **Step 4: `src/mocks/sigeda/desaprobados.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { CRITERIOS_CHEQUEO, criterioDeFase } from '@/lib/dominio/seguimiento'
import { API, autorizar, textoEliminado, textoNoEncontrado } from './comun'
import { buscarPersona, datos, type EvaluacionMock } from './datos'

export const D3_SIN_DESAPROBADOS = 'No existen desaprobados disponibles.'
export const D4_DESAPROBADO_NO_EXISTE = 'Desaprobado especificada no existe.'

export type DesaprobadoMock = {
  codigo: string
  clasificacion: string
  subfase: string
  fecha: string
  programa: string
  idSubfase: number
  codPersona: string
}

export type ChequeoDerivado = {
  codigo: string
  fecha: string
  tipo: 'OPERACIONES' | 'COMANDO' | 'SUBFASE'
  resultado: 'Aprobado' | 'Desaprobado'
  contadores: { chequeo: number; evaluaciones: number; malos: number; regulares: number }
  codEvaluacion: string
  idSubfase: number
  subfase: string
  codPersona: string
}

type EstadoReplay = { estado: string; chequeo: number; malos: number; regulares: number }

function esRegularAlternado(regulares: number): boolean {
  return regulares === 0 || regulares % 2 === 0
}

export function criterioCumplido(criterio: 1 | 2, malos: number, regulares: number): boolean {
  if (criterio === 2) return malos === 2 || (malos === 1 && regulares === 2) || regulares === 4
  return malos === 3 || (malos === 2 && regulares === 2) || (malos === 1 && regulares === 4) || regulares === 6
}

export function ramaCumplida(criterio: 1 | 2, malos: number, regulares: number): string | null {
  const ramas = CRITERIOS_CHEQUEO[criterio]
  if (criterio === 2) {
    if (malos === 2) return ramas[0]
    if (malos === 1 && regulares === 2) return ramas[1]
    if (regulares === 4) return ramas[2]
    return null
  }
  if (malos === 3) return ramas[0]
  if (malos === 2 && regulares === 2) return ramas[1]
  if (malos === 1 && regulares === 4) return ramas[2]
  if (regulares === 6) return ramas[3]
  return null
}

function fila(evaluacion: EvaluacionMock): DesaprobadoMock {
  return {
    codigo: evaluacion.codigo,
    clasificacion: evaluacion.clasificacion ?? '',
    subfase: evaluacion.subFase,
    fecha: evaluacion.fecha,
    programa: evaluacion.programa,
    idSubfase: evaluacion.idSubFase,
    codPersona: evaluacion.codPersona,
  }
}

export function replayDeResultados(): { desaprobados: DesaprobadoMock[]; chequeos: ChequeoDerivado[] } {
  const porAlumno = new Map<string, EstadoReplay>()
  const desaprobados: DesaprobadoMock[] = []
  const chequeos: ChequeoDerivado[] = []
  const ordenadas = [...datos().evaluaciones].sort(
    (izquierda, derecha) =>
      izquierda.fecha.localeCompare(derecha.fecha) || izquierda.codigo.localeCompare(derecha.codigo),
  )
  for (const evaluacion of ordenadas) {
    const actual = porAlumno.get(evaluacion.codPersona) ?? { estado: 'Apto', chequeo: 0, malos: 0, regulares: 0 }
    porAlumno.set(evaluacion.codPersona, actual)
    if (evaluacion.categoria === 'Ponderada' && actual.estado === 'Apto') {
      if (evaluacion.clasificacion === 'Malo') {
        actual.malos += 1
        desaprobados.push(fila(evaluacion))
      } else if (evaluacion.clasificacion === 'Regular' && esRegularAlternado(actual.regulares)) {
        actual.regulares += 1
        desaprobados.push(fila(evaluacion))
      }
      if (criterioCumplido(criterioDeFase(evaluacion.fase), actual.malos, actual.regulares)) actual.estado = 'En Chequeo'
    }
    if (evaluacion.categoria === 'Chequeo') actual.chequeo += 1
    if (evaluacion.categoria === 'Chequeo Sub Fase') {
      chequeos.push({
        codigo: evaluacion.codigo,
        fecha: evaluacion.fecha,
        tipo: 'SUBFASE',
        resultado: 'Aprobado',
        contadores: {
          chequeo: actual.chequeo,
          evaluaciones: buscarPersona(evaluacion.codPersona)?.contEval ?? 0,
          malos: actual.malos,
          regulares: actual.regulares,
        },
        codEvaluacion: evaluacion.codigo,
        idSubfase: evaluacion.idSubFase,
        subfase: evaluacion.subFase,
        codPersona: evaluacion.codPersona,
      })
      actual.estado = 'Apto'
      actual.chequeo = 0
      actual.malos = 0
      actual.regulares = 0
    }
  }
  return { desaprobados, chequeos }
}

function publico(desaprobado: DesaprobadoMock) {
  const { codigo, clasificacion, subfase, fecha, programa, idSubfase } = desaprobado
  return { codigo, clasificacion, subfase, fecha, programa, idSubfase }
}

function deLaPersona(codPersona: string): DesaprobadoMock[] {
  return replayDeResultados().desaprobados.filter((desaprobado) => desaprobado.codPersona === codPersona)
}

export const handlersDesaprobados = [
  http.get(`${API}/api/desaprobados/persona/:codPersona`, ({ request, params }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    const filas = deLaPersona(String(params.codPersona))
    if (filas.length === 0) return textoNoEncontrado(D3_SIN_DESAPROBADOS)
    return HttpResponse.json(filas.map(publico))
  }),
  http.get(`${API}/api/desaprobados/regular/alumno/:cod/subfase/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    const fila = deLaPersona(String(params.cod))
      .filter((candidato) => candidato.idSubfase === Number(params.id) && candidato.clasificacion === 'Regular')
      .at(-1)
    return fila ? HttpResponse.json(publico(fila)) : textoNoEncontrado(D4_DESAPROBADO_NO_EXISTE)
  }),
  http.get(`${API}/api/desaprobados/alumno/:cod/subfase/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    const fila = deLaPersona(String(params.cod))
      .filter((candidato) => candidato.idSubfase === Number(params.id))
      .at(-1)
    return fila ? HttpResponse.json(publico(fila)) : textoNoEncontrado(D4_DESAPROBADO_NO_EXISTE)
  }),
  http.get(`${API}/api/desaprobados/exist/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json(
      replayDeResultados().desaprobados.some((desaprobado) => desaprobado.codigo === String(params.cod)),
    )
  }),
  http.delete(`${API}/api/desaprobados/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Modify Evaluations')
    if (permitido instanceof Response) return permitido
    const existe = replayDeResultados().desaprobados.some((desaprobado) => desaprobado.codigo === String(params.cod))
    return existe ? textoEliminado('Desaprobado') : textoNoEncontrado(D4_DESAPROBADO_NO_EXISTE)
  }),
]
```

`/api/desaprobados/regular/alumno/...` is registered **before** `/api/desaprobados/alumno/...` for readability only: the two paths differ in their third segment, so MSW cannot confuse them. The DELETE is a no-op beyond its answer, because the rows are derived and there is nothing to remove — it exists to carry the permission and the 404 the contract asks for, and **no M5 screen calls it**.

Register the module in `src/mocks/handlers.ts`: `import { handlersDesaprobados } from './sigeda/desaprobados'` and `...handlersDesaprobados,` after `...handlersEvaluaciones,`.

- [ ] **Step 5: The reader with its six-character guard (M5-8)**

Add to `src/features/seguimiento/api.ts`:

```ts
export const MENSAJE_CODIGO_INVALIDO = 'El código de la persona debe tener seis caracteres.'

export type Desaprobado = {
  codigo: string
  clasificacion: string
  subfase: string
  fecha: string
  programa: string
  idSubfase: number
}

export async function listarDesaprobados(codPersona: string): Promise<Desaprobado[]> {
  if (codPersona.length !== 6) throw new Error(MENSAJE_CODIGO_INVALIDO)
  return sigeda.lista<Desaprobado>(`/api/desaprobados/persona/${encodeURIComponent(codPersona)}`)
}
```

with `desaprobados: (codPersona: string) => [...clavesSeguimiento.todo, 'desaprobados', codPersona] as const` in `clavesSeguimiento` and

```ts
  desaprobados: (codPersona: string) =>
    queryOptions({
      queryKey: clavesSeguimiento.desaprobados(codPersona),
      queryFn: () => listarDesaprobados(codPersona),
    }),
```

in `consultasSeguimiento`. The guard throws before the URL is built, which is the whole point: the leak is reachable with a one-character path value (contract §2.2) and the milestone whose subject is failure data must not be the one that normalises it.

- [ ] **Step 6: The two baseline assertions the rename costs**

`src/features/grupos/grupos-page.test.tsx:36` — with grupo 6 renamed, the descending sort by name puts it first by a different string:

```ts
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Promoción 2026-A'))
```

`src/features/turnos-teoricos/formulario-turno-teorico.test.tsx:90`:

```ts
    await screen.findByRole('option', { name: 'Promoción 2026-A · 1 alumno' })
```

Nothing else in the repo names that grupo: the baseline grep for `Grupo 6` returns those two lines and `datos.ts:261`.

- [ ] **Step 7: Run the tests, including everything the fixture change can reach**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/desaprobados.test.ts src/features/seguimiento/api.test.ts src/features/evaluaciones src/features/turnos src/features/personas src/features/grupos src/mocks/sigeda/cuestionarios-teoria.test.ts src/features/turnos-teoricos 2>&1 | tail -8
```

Expected: PASS. `cuestionarios-teoria.test.ts:230-242` (CA-RES-10) asserts `[false, null, [], []]` for `999999` and must still pass: he gains practical evaluations, not theory ones.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **899 tests** (884 + 13 in `desaprobados.test.ts` + 2 in `seguimiento/api.test.ts`).

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: derive the desaprobados fixture and serve the five desaprobados endpoints"
```

---
### Task 4: The legajo API layer and the three endpoints that never had a handler (M5-4, M5-9, M5-21)

Owns no acceptance criterion: CA-LEG-01, CA-LEG-03, CA-LEG-04, CA-LEG-05, CA-LEG-06 and CA-LEG-08 are claimed by the legajo's screen tasks. Its tests are tagged `contrato §6.1`, `contrato §6.3` and `contrato §9.9`. This is §17.6's tasks 3 and 4 merged: both are mock-shape work with no criterion of their own, and the freed slot pays for splitting Reportes.

**Files:**

- Create: `src/mocks/sigeda/alumnos.ts`
- Test: `src/mocks/sigeda/alumnos.test.ts`
- Create: `src/mocks/sigeda/reportes-subfase.ts`
- Test: `src/mocks/sigeda/reportes-subfase.test.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/features/seguimiento/api.ts`
- Modify: `src/features/seguimiento/api.test.ts`

**Interfaces:**

- Consumes: `datos()`, `buscarPersona`, `buscarSubfase`, `maniobrasDeSubfase`, `nombreCompleto`, `usuarioDePersona` from `./datos`; `ramaCumplida` and `criterioCumplido` from `./desaprobados` (T3); `criterioDeFase` from `lib/dominio/seguimiento` (T1); `aNota` from `features/evaluaciones/api`; `mediaSimple` from `lib/dominio/seguimiento`.
- Produces:
  - `src/mocks/sigeda/alumnos.ts`: `GET /api/personas/{cod}/alumno` with **the backend's own odd keys** (`APaterno`, `AMaterno`) and `GET /api/personas/{cod}/legajo` with the §6.1 shape including the `chequeo` block; `D2_PERSONA_NO_EXISTE`.
  - `src/mocks/sigeda/reportes-subfase.ts`: `GET /api/evaluaciones/subfase/{id}/persona/{cod}` and `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}`; `D6_REPORTE_SIN_EVALUACIONES`, quoted verbatim with its malformed lowercase plural.
  - `src/features/seguimiento/api.ts`: `DetalleAlumno`, `Legajo`, `ReporteDeSubfase`, `PromedioDeSubfase`, `obtenerAlumno`, `obtenerLegajo`, `obtenerReporteDeSubfase`, `listarPromediosDeSubfase` and their query keys and options.

**Where `GET /api/personas/{cod}/legajo` lives, because the contract does not say.** §9's handler table lists eight modules and assigns the alertas, the desaprobados, the índices, the chequeos, the theory history, `/alumno` and the two subfase reports — and **never names a handler for `/legajo`**, although §6.1 specifies the endpoint and four panels read it. It goes in `alumnos.ts`, beside the other persona-scoped read. Flagged for the contract's next revision.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/sigeda/alumnos.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'

describe('GET /api/personas/{cod}/alumno', () => {
  it('contrato §9.9 devuelve DetallePersona con las claves raras del backend', async () => {
    await iniciarComo('instructor.perez')
    const detalle = await sigeda.get<Record<string, unknown>>('/api/personas/777777/alumno')
    expect(detalle).toEqual({
      dni: '78901234',
      nombre: 'Carlos',
      APaterno: 'Ramirez',
      AMaterno: 'Sanchez',
      rango: 'Mayor',
      estado: 'En Chequeo',
      usuario: { nombre: 'alumno.ramirez', correo: 'alumno5@sigeda.com' },
    })
    expect(detalle).not.toHaveProperty('aPaterno')
    expect(detalle).not.toHaveProperty('codigo')
  })

  it('contrato §9.9 un alumno sin cuenta llega con usuario null y un código inexistente da 404 D2', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get<{ usuario: unknown }>('/api/personas/654321/alumno')).resolves.toMatchObject({ usuario: null })
    await expect(sigeda.get('/api/personas/000000/alumno')).rejects.toMatchObject({
      status: 404,
      message: 'Persona especificada no existe.',
    })
  })
})

describe('GET /api/personas/{cod}/legajo', () => {
  it('contrato §6.1 trae la cabecera con el nombre real del grupo y su programa', async () => {
    await iniciarComo('instructor.perez')
    const legajo = await sigeda.get<{
      codigo: string
      tipo: string
      estado: string
      grupo: { id: number; nombre: string; programa: string } | null
      contadores: Record<string, number>
      ultimaEvaluacion: { codigo: string; estadoAlumno: string } | null
    }>('/api/personas/999999/legajo')
    expect(legajo).toMatchObject({
      codigo: '999999',
      tipo: 'Alumno',
      estado: 'Apto',
      grupo: { id: 6, nombre: 'Promoción 2026-A', programa: 'PDI' },
      contadores: { chequeo: 3, evaluaciones: 7, malos: 2, regulares: 2 },
    })
    expect(legajo.ultimaEvaluacion).toMatchObject({ codigo: '999999-2', estadoAlumno: 'Apto' })
  })

  it('contrato §6.1 el bloque chequeo dice qué criterio aplica, si se cumplió y si los contadores se mueven', async () => {
    await iniciarComo('instructor.perez')
    const cumplidoYMovido = await sigeda.get<{ chequeo: Record<string, unknown> }>('/api/personas/777777/legajo')
    expect(cumplidoYMovido.chequeo).toEqual({
      fase: 'Adaptación',
      criterio: 1,
      criterioCumplido: true,
      detalle: '3 vuelos Malos',
      regularAlternado: true,
      cuentaConEsteEstado: false,
    })
    const cumplidoYApto = await sigeda.get<{ chequeo: Record<string, unknown> }>('/api/personas/999999/legajo')
    expect(cumplidoYApto.chequeo).toMatchObject({
      criterioCumplido: true,
      detalle: '2 Malos y 2 Regulares alternados',
      cuentaConEsteEstado: true,
    })
    const sinCumplir = await sigeda.get<{ chequeo: Record<string, unknown> }>('/api/personas/555555/legajo')
    expect(sinCumplir.chequeo).toMatchObject({
      criterioCumplido: false,
      detalle: 'Lleva 1 Malo y 2 Regulares',
      regularAlternado: true,
      cuentaConEsteEstado: true,
    })
  })

  it('contrato §6.1 un alumno sin grupo ni cuenta llega con los dos en null', async () => {
    await iniciarComo('instructor.perez')
    const legajo = await sigeda.get<{ grupo: unknown; usuario: unknown; ultimaEvaluacion: unknown }>(
      '/api/personas/654321/legajo',
    )
    expect(legajo).toMatchObject({ grupo: null, usuario: null, ultimaEvaluacion: null })
  })

  it('contrato §6.1 los dos endpoints piden Read y un código inexistente da 404 D2', async () => {
    await iniciarComo('alumno.ramirez')
    await expect(sigeda.get('/api/personas/777777/legajo')).resolves.toBeTruthy()
    await expect(sigeda.get('/api/personas/000000/legajo')).rejects.toMatchObject({ status: 404 })
    tokens.guardar(jwtDePrueba('raul.paredes'), '')
    await expect(sigeda.get('/api/personas/777777/legajo')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })
})
```

`raul.paredes` is the seeded account with `idRol: null` (`usuarios.ts:39`), so `permisosDeRol('')` is empty and `autorizar` answers 403: it is how the baseline proves a permission is really enforced without inventing a role. **It cannot be reached through `iniciarComo`**: `auth.ts`'s `puedeIniciarSesion` refuses to authenticate any roleless user, so the login fails before the 403 can happen. Use the direct-token idiom instead — `tokens.guardar(jwtDePrueba('raul.paredes'), '')`, as `tokens.test.ts` and `src/mocks/sigeda/alumnos.test.ts:96` do — importing `tokens` from `@/lib/auth/tokens` and `jwtDePrueba` from `@/mocks/sigeda/auth`.

Create `src/mocks/sigeda/reportes-subfase.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { D6_REPORTE_SIN_EVALUACIONES } from './reportes-subfase'

type Reporte = {
  cabecera: { fase: string; subFase: string; programa: string; alumno: string }
  maniobras: { id: number; nombre: string }[]
  notas: { codigo: string; categoria: string; clasificacion: string; promedio: string | null; calificaciones: unknown[] }[]
}

describe('el reporte de subfase, que nunca tuvo handler', () => {
  it('contrato §9.9 el par (777777, 3) es el único con maniobras y trae las cinco notas', async () => {
    await iniciarComo('instructor.perez')
    const reporte = await sigeda.get<Reporte>('/api/evaluaciones/subfase/3/persona/777777')
    expect(reporte.cabecera).toEqual({
      fase: 'Adaptación',
      subFase: 'Instrumentos',
      programa: 'PDI',
      alumno: 'Carlos Ramirez Sanchez',
    })
    expect(reporte.maniobras).toEqual([
      { id: 9, nombre: 'Maniobra 9' },
      { id: 10, nombre: 'Maniobra 10' },
    ])
    expect(reporte.notas.map((nota) => nota.codigo)).toEqual([
      '777777-1',
      '777777-2',
      '777777-3',
      '777777-4',
      '777777-6',
    ])
    expect(reporte.notas[0]).toMatchObject({ categoria: 'Ponderada', clasificacion: 'Malo', promedio: '12.0' })
    expect(reporte.notas[0]?.calificaciones).toEqual([
      { notaMin: 'B', nota: 'I' },
      { notaMin: 'B', nota: 'R' },
    ])
  })

  it('contrato §9.9 un par sin evaluaciones responde el 404 mal formado del backend', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/evaluaciones/subfase/2/persona/555555')).rejects.toMatchObject({
      status: 404,
      message: D6_REPORTE_SIN_EVALUACIONES,
    })
    expect(D6_REPORTE_SIN_EVALUACIONES).toBe('evaluaciones especificada no existe.')
  })

  it('contrato §9.9 los promedios se filtran a Ponderada y Chequeo Sub Fase', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/evaluaciones/promedio/subfase/1/persona/555555')).resolves.toEqual([
      { codigo: '555555-1', promedio: '14.0' },
      { codigo: '555555-3', promedio: '15.0' },
    ])
    await expect(sigeda.get('/api/evaluaciones/promedio/subfase/1/persona/999999')).resolves.toEqual([
      { codigo: '999999-1', promedio: '15.0' },
      { codigo: '999999-2', promedio: '17.0' },
    ])
  })

  it('contrato §9.9 una subfase sin evaluaciones ponderadas responde 200 con lista vacía, nunca 404', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/evaluaciones/promedio/subfase/2/persona/555555')).resolves.toEqual([])
  })
})
```

Add to `src/features/seguimiento/api.test.ts`:

```ts
describe('lo que el legajo lee sin pedir nada nuevo', () => {
  it('contrato §6.1 el legajo normaliza las claves raras de DetallePersona', async () => {
    await iniciarComo('instructor.perez')
    await expect(obtenerAlumno('777777')).resolves.toEqual({
      dni: '78901234',
      nombre: 'Carlos',
      aPaterno: 'Ramirez',
      aMaterno: 'Sanchez',
      rango: 'Mayor',
      estado: 'En Chequeo',
      usuario: { nombre: 'alumno.ramirez', correo: 'alumno5@sigeda.com' },
    })
  })

  it('contrato §6.3 el historial práctico se lee con el reader de M1, sin uno nuevo', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await listarEvaluaciones('777777', { programa: 'PDI', page: 0, size: 10, direction: 'ASC' })
    expect(pagina.items).toHaveLength(5)
    expect(pagina.items[0]).toMatchObject({ codigo: '777777-1', promedio: 12, clasificacion: 'Malo' })
  })

  it('contrato §9.9 las tres medias simples del contrato son 13.00, 14.50 y 16.00', async () => {
    await iniciarComo('instructor.perez')
    const media = async (idSubfase: number, cod: string) =>
      mediaSimple(
        (await listarPromediosDeSubfase(idSubfase, cod)).flatMap((fila) => (fila.promedio === null ? [] : [fila.promedio])),
      )
    expect(await media(3, '777777')).toBe(13)
    expect(await media(1, '555555')).toBe(14.5)
    expect(await media(1, '999999')).toBe(16)
  })

  it('contrato §9.9 un reporte sin evaluaciones llega como null y su texto no se muestra', async () => {
    await iniciarComo('instructor.perez')
    await expect(obtenerReporteDeSubfase(2, '555555')).resolves.toBeNull()
    const reporte = await obtenerReporteDeSubfase(3, '777777')
    expect(reporte?.notas[0]?.promedio).toBe(12)
    expect(reporte?.maniobras).toHaveLength(2)
  })
})
```

- [ ] **Step 2: `src/mocks/sigeda/alumnos.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { criterioDeFase } from '@/lib/dominio/seguimiento'
import { API, autorizar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, nombreCompleto, usuarioDePersona, type PersonaMock } from './datos'
import { criterioCumplido, ramaCumplida } from './desaprobados'

export const D2_PERSONA_NO_EXISTE = 'Persona especificada no existe.'

function cuenta(codigo: string) {
  const usuario = usuarioDePersona(codigo)
  return usuario ? { nombre: usuario.username, correo: usuario.correo } : null
}

function ultimaEvaluacion(codigo: string) {
  const suyas = datos()
    .evaluaciones.filter((evaluacion) => evaluacion.codPersona === codigo)
    .toSorted((izquierda, derecha) => izquierda.fecha.localeCompare(derecha.fecha) || izquierda.codigo.localeCompare(derecha.codigo))
  const ultima = suyas.at(-1)
  return ultima
    ? {
        codigo: ultima.codigo,
        fecha: ultima.fecha,
        clasificacion: ultima.clasificacion,
        estadoAlumno: ultima.estadoAlumno,
      }
    : null
}

function plural(cantidad: number, singular: string, muchos: string) {
  return `${cantidad} ${cantidad === 1 ? singular : muchos}`
}

function bloqueDeChequeo(persona: PersonaMock) {
  const fase = ultimaEvaluacion(persona.codigo)?.codigo === undefined ? '' : faseDeLaUltima(persona.codigo)
  const criterio = criterioDeFase(fase)
  const cumplido = criterioCumplido(criterio, persona.contMalo, persona.contRegular)
  return {
    fase,
    criterio,
    criterioCumplido: cumplido,
    detalle:
      ramaCumplida(criterio, persona.contMalo, persona.contRegular) ??
      `Lleva ${plural(persona.contMalo, 'Malo', 'Malos')} y ${plural(persona.contRegular, 'Regular', 'Regulares')}`,
    regularAlternado: persona.contRegular === 0 || persona.contRegular % 2 === 0,
    cuentaConEsteEstado: persona.estado === 'Apto',
  }
}

function faseDeLaUltima(codigo: string): string {
  const suyas = datos()
    .evaluaciones.filter((evaluacion) => evaluacion.codPersona === codigo)
    .toSorted((izquierda, derecha) => izquierda.fecha.localeCompare(derecha.fecha) || izquierda.codigo.localeCompare(derecha.codigo))
  return suyas.at(-1)?.fase ?? ''
}

export const handlersAlumnos = [
  http.get(`${API}/api/personas/:cod/alumno`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    return HttpResponse.json({
      dni: persona.dni,
      nombre: persona.nombre,
      APaterno: persona.aPaterno,
      AMaterno: persona.aMaterno,
      rango: persona.rango,
      estado: persona.estado,
      usuario: cuenta(persona.codigo),
    })
  }),
  http.get(`${API}/api/personas/:cod/legajo`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
    return HttpResponse.json({
      codigo: persona.codigo,
      nombre: persona.nombre,
      aPaterno: persona.aPaterno,
      aMaterno: persona.aMaterno,
      dni: persona.dni,
      rango: persona.rango,
      tipo: persona.tipo,
      estado: persona.estado,
      grupo: grupo ? { id: grupo.id, nombre: grupo.nombre, programa: grupo.programa } : null,
      usuario: cuenta(persona.codigo),
      contadores: {
        chequeo: persona.contChequeo,
        evaluaciones: persona.contEval,
        malos: persona.contMalo,
        regulares: persona.contRegular,
      },
      chequeo: bloqueDeChequeo(persona),
      ultimaEvaluacion: ultimaEvaluacion(persona.codigo),
    })
  }),
]
```

Simplify `bloqueDeChequeo`'s first line to `const fase = faseDeLaUltima(persona.codigo)` — the ternary above is redundant and `faseDeLaUltima` already returns `''` for an alumno with no evaluations. `nombreCompleto` is imported for the reporte module, not here; drop it from this file's import if `tsc` flags it.

**`detalle` carries no trailing period, and that is a deliberate departure from contract §6.1's example.** The example shows `"detalle": "3 vuelos Malos."` while spec S12 is `Alcanzó el criterio de chequeo de {fase}: {detalle}.` — interpolating the example would print two full stops. The mock emits the branch label bare and S12 supplies the period. Flagged for the contract's next revision.

- [ ] **Step 3: `src/mocks/sigeda/reportes-subfase.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, textoNoEncontrado } from './comun'
import { buscarPersona, buscarSubfase, datos, maniobrasDeSubfase, nombreCompleto, type EvaluacionMock } from './datos'

export const D6_REPORTE_SIN_EVALUACIONES = 'evaluaciones especificada no existe.'

const CATEGORIAS_PONDERADAS = new Set(['Ponderada', 'Chequeo Sub Fase'])

function deLaSubfase(idSubfase: number, codPersona: string): EvaluacionMock[] {
  return datos().evaluaciones.filter(
    (evaluacion) => evaluacion.codPersona === codPersona && evaluacion.idSubFase === idSubfase,
  )
}

export const handlersReportesSubfase = [
  http.get(`${API}/api/evaluaciones/promedio/subfase/:id/persona/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    return HttpResponse.json(
      deLaSubfase(Number(params.id), String(params.cod))
        .filter((evaluacion) => CATEGORIAS_PONDERADAS.has(evaluacion.categoria))
        .map((evaluacion) => ({ codigo: evaluacion.codigo, promedio: evaluacion.promedio })),
    )
  }),
  http.get(`${API}/api/evaluaciones/subfase/:id/persona/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const idSubfase = Number(params.id)
    const evaluaciones = deLaSubfase(idSubfase, String(params.cod))
    const persona = buscarPersona(String(params.cod))
    if (evaluaciones.length === 0 || !persona) return textoNoEncontrado(D6_REPORTE_SIN_EVALUACIONES)
    return HttpResponse.json({
      cabecera: {
        fase: evaluaciones[0].fase,
        subFase: buscarSubfase(idSubfase)?.nombre ?? '',
        programa: evaluaciones[0].programa,
        alumno: nombreCompleto(persona),
      },
      maniobras: maniobrasDeSubfase(idSubfase).map((maniobra) => ({ id: maniobra.id, nombre: maniobra.nombre })),
      notas: evaluaciones.map((evaluacion) => ({
        codigo: evaluacion.codigo,
        categoria: evaluacion.categoria,
        clasificacion: evaluacion.clasificacion,
        promedio: evaluacion.promedio,
        recomendacion: evaluacion.recomendacion,
        calificaciones: evaluacion.calificaciones.map((calificacion) => ({
          notaMin: calificacion.notaMin,
          nota: calificacion.nota,
        })),
      })),
    })
  }),
]
```

`notas` carries **every** category of that subfase, not only the ponderadas: the report is the alumno's record of the subfase and contract §9.9 fixes five rows for (`777777`, 3). Only the promedios endpoint filters, and that filter is the server's, which is exactly what CA-LEG-06 asks the screen to demonstrate.

Register both modules in `src/mocks/handlers.ts`: `import { handlersAlumnos } from './sigeda/alumnos'`, `import { handlersReportesSubfase } from './sigeda/reportes-subfase'`, and add `...handlersAlumnos,` after `...handlersPersonas,` and `...handlersReportesSubfase,` after `...handlersEvaluaciones,`. None of the four new paths collides with an existing one: `/api/personas/:cod/alumno` needs the literal `alumno` in its fourth segment, which `/api/personas/alumno/:tipo` (`personas.ts:201`) cannot provide, and the two subfase routes have five and four segments where `/api/evaluaciones/:cod` has two.

- [ ] **Step 4: The legajo readers**

Add to `src/features/seguimiento/api.ts`:

```ts
export type CuentaDeAlumno = { nombre: string; correo: string | null } | null

export type DetalleAlumno = {
  dni: string
  nombre: string
  aPaterno: string
  aMaterno: string
  rango: string | null
  estado: string
  usuario: CuentaDeAlumno
}

export type BloqueDeChequeo = {
  fase: string
  criterio: number
  criterioCumplido: boolean
  detalle: string
  regularAlternado: boolean
  cuentaConEsteEstado: boolean
}

export type Legajo = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  dni: string
  rango: string | null
  tipo: string | null
  estado: string
  grupo: { id: number; nombre: string; programa: string } | null
  usuario: CuentaDeAlumno
  contadores: { chequeo: number; evaluaciones: number; malos: number; regulares: number }
  chequeo: BloqueDeChequeo
  ultimaEvaluacion: { codigo: string; fecha: string; clasificacion: string | null; estadoAlumno: string } | null
}

export type NotaDeSubfase = {
  codigo: string
  categoria: string
  clasificacion: string | null
  promedio: number | null
  recomendacion: string | null
  calificaciones: { notaMin: string; nota: string }[]
}

export type ReporteDeSubfase = {
  cabecera: { fase: string; subFase: string; programa: string; alumno: string }
  maniobras: { id: number; nombre: string }[]
  notas: NotaDeSubfase[]
}

export type PromedioDeSubfase = { codigo: string; promedio: number | null }

type DetalleAlumnoApi = Omit<DetalleAlumno, 'aPaterno' | 'aMaterno'> & { APaterno: string; AMaterno: string }

type NotaApi = Omit<NotaDeSubfase, 'promedio'> & { promedio: string | number | null }

export async function obtenerAlumno(codPersona: string): Promise<DetalleAlumno> {
  const detalle = await sigeda.get<DetalleAlumnoApi>(`/api/personas/${encodeURIComponent(codPersona)}/alumno`)
  return {
    dni: detalle.dni,
    nombre: detalle.nombre,
    aPaterno: detalle.APaterno,
    aMaterno: detalle.AMaterno,
    rango: detalle.rango,
    estado: detalle.estado,
    usuario: detalle.usuario ?? null,
  }
}

export function obtenerLegajo(codPersona: string): Promise<Legajo> {
  return sigeda.get<Legajo>(`/api/personas/${encodeURIComponent(codPersona)}/legajo`)
}

export async function obtenerReporteDeSubfase(idSubfase: number, codPersona: string): Promise<ReporteDeSubfase | null> {
  try {
    const reporte = await sigeda.get<Omit<ReporteDeSubfase, 'notas'> & { notas: NotaApi[] }>(
      `/api/evaluaciones/subfase/${encodeURIComponent(idSubfase)}/persona/${encodeURIComponent(codPersona)}`,
    )
    return { ...reporte, notas: reporte.notas.map((nota) => ({ ...nota, promedio: aNota(nota.promedio) })) }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function listarPromediosDeSubfase(idSubfase: number, codPersona: string): Promise<PromedioDeSubfase[]> {
  const promedios = await sigeda.lista<{ codigo: string; promedio: string | number | null }>(
    `/api/evaluaciones/promedio/subfase/${encodeURIComponent(idSubfase)}/persona/${encodeURIComponent(codPersona)}`,
  )
  return promedios.map((fila) => ({ codigo: fila.codigo, promedio: aNota(fila.promedio) }))
}
```

with `import { ApiError } from '@/lib/api/errors'` and `import { aNota } from '@/features/evaluaciones/api'` at the top, these keys

```ts
  alumno: (codPersona: string) => [...clavesSeguimiento.todo, 'alumno', codPersona] as const,
  legajo: (codPersona: string) => [...clavesSeguimiento.todo, 'legajo', codPersona] as const,
  reporteDeSubfase: (idSubfase: number, codPersona: string) =>
    [...clavesSeguimiento.todo, 'reporte-subfase', idSubfase, codPersona] as const,
  promediosDeSubfase: (idSubfase: number, codPersona: string) =>
    [...clavesSeguimiento.todo, 'promedios-subfase', idSubfase, codPersona] as const,
```

and the four matching `queryOptions` in `consultasSeguimiento`, each with `enabled: codPersona !== ''` for the two persona-scoped ones and `enabled: idSubfase > 0 && codPersona !== ''` for the two subfase ones, so a panel with no subfase chosen fires nothing.

**The 404 of the subfase report becomes `null`, and the server's text is never shown.** `D6` is malformed — `"evaluaciones especificada no existe."`, a lowercase plural where the template expects an entity name (contract §6.3 finding 1) — and it is the *normal* answer for four of the five seeded subfases. The panel renders its own `TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE` instead (T16).

- [ ] **Step 5: Run the tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/alumnos.test.ts src/mocks/sigeda/reportes-subfase.test.ts src/features/seguimiento/api.test.ts 2>&1 | tail -8
```

Expected: PASS — 6 in `alumnos.test.ts`, 4 in `reportes-subfase.test.ts`, 19 in `seguimiento/api.test.ts` (13 from T2, 2 from T3, 4 new).

- [ ] **Step 6: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **913 tests** (899 + 6 + 4 + 4).

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: serve the legajo header and the two subfase reports that had no mock"
```

---
### Task 5: Índices del PDI and orden de mérito: the API layer and `indices.ts` (M5-2, M5-3, M5-21)

Owns no acceptance criterion: CA-LEG-13, CA-LEG-14 belong to T15 and CA-REP-01..06 and CA-REP-08 to T19 and T20, because every one of them ends in something the user sees. Its tests are tagged `contrato §3.1`, `contrato §4.1`, `contrato §9.5` and `contrato §9.6`.

**Files:**

- Create: `src/mocks/sigeda/indices.ts`
- Test: `src/mocks/sigeda/indices.test.ts`
- Create: `src/features/reportes/api.ts`
- Test: `src/features/reportes/api.test.ts`
- Modify: `src/mocks/sigeda/comun.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**

- Consumes: `datos()`, `buscarPersona`, `nombreCompleto`, `numero` from `./comun`, `autorizar`, `textoNoEncontrado`, and `Programa`/`Pagina`/`ParametrosPagina` on the client side.
- Produces:
  - `src/mocks/sigeda/indices.ts`: `GET /api/personas/{cod}/indices` (§3.1) and `GET /api/reportes/orden-merito` (§4.1) with the fixed figures of §9.5, the ranking and tie-break of §9.6, `D2_PERSONA_NO_EXISTE` reused from `alumnos.ts` and `D12_SIN_ALUMNOS_CON_INDICES`.
  - `src/features/reportes/api.ts`: `Indices`, `FilaDeMerito`, `FiltrosMerito`, `obtenerIndices`, `listarOrdenDeMerito`, `clavesReportes`, `consultasReportes`.

**Why the figures are stated and not derived** (contract §9.5, spec §17.6 item 8): `NSF` needs the per-mission coefficient table the PDI promises and does not publish, the subfases of `NFOH` and `NFOA` are not in the seed, and the theory half needs a `materias` table `sigeda-back` does not have. The mock therefore returns the **computed** shape — the one the endpoint must produce once implemented — and §9.10's declared limitation stands: the legajo's history and its índices agree in **ordering**, not in arithmetic. The one thing the fixture does derive honestly is `misiones`, a count of the alumno's ponderadas in each subfase, which comes from the store and therefore cannot drift from §9.2.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/sigeda/indices.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'

type Indices = {
  nfpi: number | null
  nit: { valor: number | null; nct: number | null; nei: number | null; asignaturasSinNota: string[]; reduccionPorRezagadoAplicada: boolean }
  nia: {
    valor: number | null
    motivo: string | null
    fases: { sigla: string; peso: number; valor: number | null; subfases: { idSubfase: number; peso: number; nsf: number | null; misiones: number }[] }[]
  }
}

type Merito = {
  content: { puesto: number | null; codigo: string; grupo: string; nfpi: number | null; nia: number | null; motivoSinNfpi: string | null }[]
  totalElements: number
  totalPages: number
}

const ESPERADOS: Record<string, [nfpi: number | null, nit: number | null, nia: number | null]> = {
  '222222': [17.16, 17.2, 17.15],
  '555555': [16.44, 17.6, 16.15],
  '999999': [15.28, 14.8, 15.4],
  '111111': [15.28, 15.8, 15.15],
  '777777': [12.96, 13.8, 12.75],
  '666666': [null, 12.8, null],
  '654321': [null, null, null],
}

describe('GET /api/personas/{cod}/indices', () => {
  it('contrato §9.5 las siete fijaciones son exactamente las del contrato', async () => {
    await iniciarComo('instructor.perez')
    for (const [codigo, [nfpi, nit, nia]] of Object.entries(ESPERADOS)) {
      const indices = await sigeda.get<Indices>(`/api/personas/${codigo}/indices`)
      expect([indices.nfpi, indices.nit.valor, indices.nia.valor]).toEqual([nfpi, nit, nia])
    }
  })

  it('contrato §9.5 el desglose baja a las cinco subfases de NFAD y sus pesos suman 1.00', async () => {
    await iniciarComo('instructor.perez')
    const indices = await sigeda.get<Indices>('/api/personas/777777/indices')
    const [adaptacion, helitransportadas, aerotacticas] = indices.nia.fases
    expect(indices.nia.fases.map((fase) => fase.sigla)).toEqual(['NFAD', 'NFOH', 'NFOA'])
    expect(indices.nia.fases.reduce((suma, fase) => suma + fase.peso, 0)).toBeCloseTo(1, 10)
    expect(adaptacion?.subfases.map((subfase) => subfase.idSubfase)).toEqual([1, 2, 3, 5, 4])
    expect(adaptacion?.subfases.reduce((suma, subfase) => suma + subfase.peso, 0)).toBeCloseTo(1, 10)
    expect(helitransportadas?.subfases).toEqual([])
    expect(aerotacticas?.subfases).toEqual([])
    expect(adaptacion?.subfases.find((subfase) => subfase.idSubfase === 3)?.misiones).toBe(5)
    expect(adaptacion?.subfases.find((subfase) => subfase.idSubfase === 1)?.misiones).toBe(0)
  })

  it('contrato §9.5 666666 tiene NIT sin NIA, y 654321 llega todo en null con 200', async () => {
    await iniciarComo('instructor.perez')
    const incompleto = await sigeda.get<Indices>('/api/personas/666666/indices')
    expect(incompleto.nit.valor).toBe(12.8)
    expect(incompleto.nia.valor).toBeNull()
    expect(incompleto.nia.motivo).toBe('Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.')
    expect(incompleto.nia.fases.find((fase) => fase.sigla === 'NFAD')?.valor).toBe(14)
    const sinDatos = await sigeda.get<Indices>('/api/personas/654321/indices')
    expect([sinDatos.nfpi, sinDatos.nit.valor, sinDatos.nia.valor]).toEqual([null, null, null])
    expect(sinDatos.nia.motivo).not.toBeNull()
  })

  it('contrato §9.5 asignaturasSinNota nunca está vacío y ninguna nota está reducida', async () => {
    await iniciarComo('instructor.perez')
    for (const codigo of ['222222', '555555', '111111']) {
      const indices = await sigeda.get<Indices>(`/api/personas/${codigo}/indices`)
      expect(indices.nit.asignaturasSinNota.length).toBeGreaterThan(0)
      expect(indices.nit.reduccionPorRezagadoAplicada).toBe(false)
    }
  })

  it('contrato §3.1 pide Read y un código inexistente responde 404 D2', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/personas/000000/indices')).rejects.toMatchObject({
      status: 404,
      message: 'Persona especificada no existe.',
    })
    tokens.guardar(jwtDePrueba('raul.paredes'), '')
    await expect(sigeda.get('/api/personas/777777/indices')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })
})

describe('GET /api/reportes/orden-merito', () => {
  it('contrato §9.6 da cinco puestos y un alumno sin puesto al final', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&page=0&size=10')
    expect(pagina.content.map((fila) => [fila.puesto, fila.codigo])).toEqual([
      [1, '222222'],
      [2, '555555'],
      [3, '999999'],
      [4, '111111'],
      [5, '777777'],
      [null, '666666'],
    ])
    expect(pagina.totalElements).toBe(6)
    expect(pagina.content.map((fila) => fila.codigo)).not.toContain('654321')
    expect(pagina.content.at(-1)?.motivoSinNfpi).toBe(
      'Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.',
    )
    expect(pagina.content.find((fila) => fila.codigo === '999999')?.grupo).toBe('Promoción 2026-A')
  })

  it('contrato §9.6 el empate de NFPI se rompe por NIA', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&page=0&size=10')
    const empatados = pagina.content.filter((fila) => fila.nfpi === 15.28)
    expect(empatados.map((fila) => [fila.codigo, fila.nia, fila.puesto])).toEqual([
      ['999999', 15.4, 3],
      ['111111', 15.15, 4],
    ])
  })

  it('contrato §9.6 con idGrupo los puestos empiezan en 1 dentro del alcance pedido', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&idGrupo=3&page=0&size=10')
    expect(pagina.content.map((fila) => [fila.puesto, fila.codigo])).toEqual([
      [1, '555555'],
      [null, '666666'],
    ])
  })

  it('contrato §9.6 el puesto no se reinicia por página', async () => {
    await iniciarComo('instructor.perez')
    const segunda = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&page=1&size=2')
    expect(segunda.content.map((fila) => fila.puesto)).toEqual([3, 4])
    expect(segunda.totalPages).toBe(3)
  })

  it('contrato §9.6 pide Create Reports y PDE responde 404 D12', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/reportes/orden-merito?programa=PDE')).rejects.toMatchObject({
      status: 404,
      message: 'No existen alumnos con índices disponibles.',
    })
    await iniciarComo('jefe.operaciones')
    await expect(sigeda.get('/api/reportes/orden-merito?programa=PDI')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })
})
```

The last assertion is the one that makes M5-19 visible: the Jefe de Operaciones does not hold `Create Reports` (`permisos.ts:76`), so the endpoint refuses him — recorded, not corrected.

Create `src/features/reportes/api.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { iniciarComo } from '@/test/render'
import { listarOrdenDeMerito, obtenerIndices } from './api'

describe('capa de API de reportes', () => {
  it('contrato §3.1 los índices llegan con sus dos mitades y su desglose', async () => {
    await iniciarComo('instructor.perez')
    const indices = await obtenerIndices('555555')
    expect(indices).toMatchObject({ codigo: '555555', programa: 'PDI', nfpi: 16.44 })
    expect(indices.nit).toMatchObject({ valor: 17.6, nct: 18, nei: 16 })
    expect(indices.nia.fases.map((fase) => fase.valor)).toEqual([17, 16, 15])
    expect(indices.nit.asignaturas.every((asignatura) => asignatura.na !== null)).toBe(true)
  })

  it('contrato §4.1 el orden de mérito se pide por programa y grupo, paginado', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await listarOrdenDeMerito({ programa: 'PDI', page: 0, size: 2, direction: 'ASC' })
    expect(pagina.items.map((fila) => fila.codigo)).toEqual(['222222', '555555'])
    expect(pagina.total).toBe(6)
    expect(pagina.totalPages).toBe(3)
    const porGrupo = await listarOrdenDeMerito({ programa: 'PDI', idGrupo: 6, page: 0, size: 10, direction: 'ASC' })
    expect(porGrupo.items.map((fila) => [fila.puesto, fila.codigo])).toEqual([[1, '999999']])
  })

  it('contrato §4.1 una lista vacía llega como página vacía y no como error', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await listarOrdenDeMerito({ programa: 'PDE', page: 0, size: 10, direction: 'ASC' })
    expect(pagina.items).toEqual([])
    expect(pagina.total).toBe(0)
  })
})
```

- [ ] **Step 2: `src/mocks/sigeda/indices.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, paginarOrdenado, textoNoEncontrado } from './comun'
import { D2_PERSONA_NO_EXISTE } from './alumnos'
import { buscarPersona, datos, nombreCompleto, type PersonaMock } from './datos'

export const D12_SIN_ALUMNOS_CON_INDICES = 'No existen alumnos con índices disponibles.'

const MOTIVO_SIN_FASES = 'Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.'
const MOTIVO_SIN_DATOS = 'No tiene evaluaciones registradas.'

const CATEGORIAS_PONDERADAS = new Set(['Ponderada', 'Chequeo Sub Fase'])

const FASES = [
  { fase: 'Adaptación', sigla: 'NFAD', peso: 0.4 },
  { fase: 'Operaciones HeliTransportadas', sigla: 'NFOH', peso: 0.35 },
  { fase: 'Operaciones AeroTácticas', sigla: 'NFOA', peso: 0.25 },
] as const

const SUBFASES_NFAD = [
  { idSubfase: 1, sigla: 'C', peso: 0.25 },
  { idSubfase: 2, sigla: 'N', peso: 0.25 },
  { idSubfase: 3, sigla: 'I', peso: 0.2 },
  { idSubfase: 5, sigla: 'F', peso: 0.15 },
  { idSubfase: 4, sigla: 'CX', peso: 0.15 },
] as const

const ASIGNATURAS_CON_NOTA = [1, 2, 3]

type Fijacion = {
  nfad: number | null
  nfoh: number | null
  nfoa: number | null
  nia: number | null
  nct: number | null
  nei: number | null
  nit: number | null
  nfpi: number | null
}

const FIJACIONES: Record<string, Fijacion> = {
  '222222': { nfad: 18, nfoh: 17, nfoa: 16, nia: 17.15, nct: 17, nei: 18, nit: 17.2, nfpi: 17.16 },
  '555555': { nfad: 17, nfoh: 16, nfoa: 15, nia: 16.15, nct: 18, nei: 16, nit: 17.6, nfpi: 16.44 },
  '999999': { nfad: 16, nfoh: 15, nfoa: 15, nia: 15.4, nct: 15, nei: 14, nit: 14.8, nfpi: 15.28 },
  '111111': { nfad: 16, nfoh: 15, nfoa: 14, nia: 15.15, nct: 16, nei: 15, nit: 15.8, nfpi: 15.28 },
  '777777': { nfad: 13, nfoh: 13, nfoa: 12, nia: 12.75, nct: 14, nei: 13, nit: 13.8, nfpi: 12.96 },
  '666666': { nfad: 14, nfoh: null, nfoa: null, nia: null, nct: 13, nei: 12, nit: 12.8, nfpi: null },
  '654321': { nfad: null, nfoh: null, nfoa: null, nia: null, nct: null, nei: null, nit: null, nfpi: null },
}

const SIN_DATOS: Fijacion = FIJACIONES['654321']

function misiones(codPersona: string, idSubfase: number): number {
  return datos().evaluaciones.filter(
    (evaluacion) =>
      evaluacion.codPersona === codPersona &&
      evaluacion.idSubFase === idSubfase &&
      CATEGORIAS_PONDERADAS.has(evaluacion.categoria),
  ).length
}

function dosDecimales(valor: number | null): number | null {
  return valor === null ? null : Number(valor.toFixed(2))
}

function bloqueNit(persona: PersonaMock, fijacion: Fijacion) {
  const materias = datos().materias
  const conNota = materias.filter((materia) => ASIGNATURAS_CON_NOTA.includes(materia.id))
  const suma = conNota.reduce((total, materia) => total + materia.coeficiente, 0)
  return {
    valor: dosDecimales(fijacion.nit),
    nct: dosDecimales(fijacion.nct),
    nei: dosDecimales(fijacion.nei),
    neiEvaluaciones: fijacion.nei === null ? 0 : 4,
    asignaturas:
      fijacion.nct === null
        ? []
        : conNota.map((materia) => ({
            idMateria: materia.id,
            materia: materia.nombre,
            coeficiente: materia.coeficiente,
            coeficienteAplicado: Number((materia.coeficiente / suma).toFixed(4)),
            pe: dosDecimales(fijacion.nct),
            pt: dosDecimales(fijacion.nct),
            na: dosDecimales(fijacion.nct),
          })),
    asignaturasSinNota: materias
      .filter((materia) => !ASIGNATURAS_CON_NOTA.includes(materia.id))
      .map((materia) => materia.nombre),
    reduccionPorRezagadoAplicada: false,
  }
}

function bloqueNia(persona: PersonaMock, fijacion: Fijacion) {
  const valores: Record<string, number | null> = { NFAD: fijacion.nfad, NFOH: fijacion.nfoh, NFOA: fijacion.nfoa }
  return {
    valor: dosDecimales(fijacion.nia),
    fases: FASES.map((fase) => ({
      fase: fase.fase,
      sigla: fase.sigla,
      peso: fase.peso,
      valor: dosDecimales(valores[fase.sigla]),
      subfases:
        fase.sigla === 'NFAD'
          ? SUBFASES_NFAD.map((subfase) => ({
              idSubfase: subfase.idSubfase,
              subfase: datos().subfases.find((candidata) => candidata.id === subfase.idSubfase)?.nombre ?? '',
              sigla: subfase.sigla,
              peso: subfase.peso,
              nsf: dosDecimales(fijacion.nfad),
              misiones: misiones(persona.codigo, subfase.idSubfase),
            }))
          : [],
    })),
    motivo: fijacion.nia !== null ? null : fijacion.nfad === null ? MOTIVO_SIN_DATOS : MOTIVO_SIN_FASES,
  }
}

function indicesDe(persona: PersonaMock) {
  const fijacion = FIJACIONES[persona.codigo] ?? SIN_DATOS
  return {
    codigo: persona.codigo,
    alumno: nombreCompleto(persona),
    programa: datos().grupos.find((grupo) => grupo.id === persona.idGrupo)?.programa ?? 'PDI',
    nfpi: dosDecimales(fijacion.nfpi),
    nit: bloqueNit(persona, fijacion),
    nia: bloqueNia(persona, fijacion),
  }
}

type FilaMerito = {
  puesto: number | null
  codigo: string
  alumno: string
  idGrupo: number | null
  grupo: string
  nfpi: number | null
  nit: number | null
  nia: number | null
  motivoSinNfpi: string | null
}

function filasDeMerito(programa: string, idGrupo: number | null): FilaMerito[] {
  const alumnos = datos()
    .personas.filter((persona) => persona.tipo === 'Alumno' && persona.idGrupo !== null)
    .filter((persona) => {
      const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
      return grupo !== undefined && grupo.programa === programa && (idGrupo === null || grupo.id === idGrupo)
    })
  const filas = alumnos.map((persona) => {
    const fijacion = FIJACIONES[persona.codigo] ?? SIN_DATOS
    const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
    return {
      puesto: null as number | null,
      codigo: persona.codigo,
      alumno: nombreCompleto(persona),
      idGrupo: persona.idGrupo,
      grupo: grupo?.nombre ?? '',
      nfpi: dosDecimales(fijacion.nfpi),
      nit: dosDecimales(fijacion.nit),
      nia: dosDecimales(fijacion.nia),
      motivoSinNfpi:
        fijacion.nfpi !== null ? null : fijacion.nfad === null ? MOTIVO_SIN_DATOS : MOTIVO_SIN_FASES,
    }
  })
  const rankeables = filas
    .filter((fila) => fila.nfpi !== null)
    .sort(
      (izquierda, derecha) =>
        (derecha.nfpi ?? 0) - (izquierda.nfpi ?? 0) ||
        (derecha.nia ?? 0) - (izquierda.nia ?? 0) ||
        izquierda.codigo.localeCompare(derecha.codigo),
    )
  rankeables.forEach((fila, indice) => {
    fila.puesto = indice + 1
  })
  const sinPuesto = filas.filter((fila) => fila.nfpi === null).sort((a, b) => a.codigo.localeCompare(b.codigo))
  return [...rankeables, ...sinPuesto]
}

const ORDENABLES = new Set(['puesto', 'nfpi', 'nit', 'nia', 'alumno', 'codigo'])

function ordenar(filas: FilaMerito[], propiedad: string, direccion: string): FilaMerito[] {
  if (!ORDENABLES.has(propiedad) || propiedad === 'puesto') return filas
  const signo = direccion === 'DESC' ? -1 : 1
  const rankeables = filas.filter((fila) => fila.puesto !== null)
  const sinPuesto = filas.filter((fila) => fila.puesto === null)
  const comparar = (izquierda: FilaMerito, derecha: FilaMerito) =>
    propiedad === 'alumno' || propiedad === 'codigo'
      ? String(izquierda[propiedad]).localeCompare(String(derecha[propiedad]), 'es')
      : Number(izquierda[propiedad as 'nfpi'] ?? -1) - Number(derecha[propiedad as 'nfpi'] ?? -1)
  return [...[...rankeables].sort((a, b) => signo * comparar(a, b)), ...sinPuesto]
}

export const handlersIndices = [
  http.get(`${API}/api/personas/:cod/indices`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    return HttpResponse.json(indicesDe(persona))
  }),
  http.get(`${API}/api/reportes/orden-merito`, ({ request }) => {
    const permitido = autorizar(request, 'Create Reports')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const programa = (url.searchParams.get('programa') ?? 'PDI').toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
    const idGrupoCrudo = url.searchParams.get('idGrupo')
    const filas = ordenar(
      filasDeMerito(programa, idGrupoCrudo === null || idGrupoCrudo === '' ? null : Number(idGrupoCrudo)),
      url.searchParams.get('property') ?? 'puesto',
      (url.searchParams.get('direction') ?? 'ASC').toUpperCase(),
    )
    return paginarOrdenado(filas, url, { nombreLista: 'alumnos con índices' })
  }),
]
```

`persona` is unused in `bloqueNit`; drop the parameter if `tsc` flags it. `D12_SIN_ALUMNOS_CON_INDICES` is exported for the tests to assert against; the 404 itself comes from `paginarOrdenado`'s own template, which produces that exact string from `nombreLista`.

The endpoint pages through the new **`paginarOrdenado`**, not through `paginar`, and that is deliberate: `paginar` sorts by `String(propiedad).localeCompare`, which would order `nfpi` lexicographically and sort a `puesto: null` row **first** — exactly the two mistakes a ranking must not make. Add it to `src/mocks/sigeda/comun.ts` beside `paginar`, which it reuses the envelope of:

```ts
export function paginarOrdenado<T extends object>(ordenados: readonly T[], url: URL, opciones: { nombreLista: string }) {
  const page = numero(url, 'page', 0)
  const size = numero(url, 'size', 6)
  const pagina = ordenados.slice(page * size, page * size + size)
  if (pagina.length === 0) return textoNoEncontrado(`No existen ${opciones.nombreLista} disponibles.`)
  const totalPages = Math.ceil(ordenados.length / size)
  return HttpResponse.json({
    content: pagina,
    totalElements: ordenados.length,
    totalPages,
    size,
    number: page,
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: pagina.length,
    empty: false,
  })
}
```

It is the same envelope `paginar` returns, minus the sorting and the 400s, for the two M5 endpoints whose order is not a lexicographic sort over one column: this one and the alertas of T7. The tie-break stays the contract's (`nfpi` desc → `nia` desc → `codigo` asc) and the unranked rows go last with no puesto, whatever the requested order.

Register it in `handlers.ts` after `...handlersReportesSubfase,`.

- [ ] **Step 3: `src/features/reportes/api.ts`**

```ts
import { queryOptions } from '@tanstack/react-query'
import type { Programa } from '@/features/catalogos/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type AsignaturaDeIndices = {
  idMateria: number
  materia: string
  coeficiente: number
  coeficienteAplicado: number
  pe: number | null
  pt: number | null
  na: number | null
}

export type SubfaseDeIndices = {
  idSubfase: number
  subfase: string
  sigla: string
  peso: number
  nsf: number | null
  misiones: number
}

export type FaseDeIndices = {
  fase: string
  sigla: string
  peso: number
  valor: number | null
  subfases: SubfaseDeIndices[]
}

export type Indices = {
  codigo: string
  alumno: string
  programa: string
  nfpi: number | null
  nit: {
    valor: number | null
    nct: number | null
    nei: number | null
    neiEvaluaciones: number
    asignaturas: AsignaturaDeIndices[]
    asignaturasSinNota: string[]
    reduccionPorRezagadoAplicada: boolean
  }
  nia: { valor: number | null; fases: FaseDeIndices[]; motivo: string | null }
}

export type FilaDeMerito = {
  puesto: number | null
  codigo: string
  alumno: string
  idGrupo: number | null
  grupo: string
  nfpi: number | null
  nit: number | null
  nia: number | null
  motivoSinNfpi: string | null
}

export type FiltrosMerito = ParametrosPagina & { programa: Programa; idGrupo?: number }

export function obtenerIndices(codPersona: string): Promise<Indices> {
  return sigeda.get<Indices>(`/api/personas/${encodeURIComponent(codPersona)}/indices`)
}

export function listarOrdenDeMerito(filtros: FiltrosMerito): Promise<Pagina<FilaDeMerito>> {
  return sigeda.pagina<FilaDeMerito>('/api/reportes/orden-merito', {
    programa: filtros.programa,
    idGrupo: filtros.idGrupo,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
}

export const clavesReportes = {
  todo: ['reportes'] as const,
  indices: (codPersona: string) => [...clavesReportes.todo, 'indices', codPersona] as const,
  ordenDeMerito: (filtros: FiltrosMerito) => [...clavesReportes.todo, 'orden-merito', filtros] as const,
}

export const consultasReportes = {
  indices: (codPersona: string) =>
    queryOptions({
      queryKey: clavesReportes.indices(codPersona),
      queryFn: () => obtenerIndices(codPersona),
      enabled: codPersona !== '',
    }),
  ordenDeMerito: (filtros: FiltrosMerito) =>
    queryOptions({
      queryKey: clavesReportes.ordenDeMerito(filtros),
      queryFn: () => listarOrdenDeMerito(filtros),
      placeholderData: keepPreviousData,
    }),
}
```

with `keepPreviousData` added to the `@tanstack/react-query` import: paging the report must not blank the table, which is the rule M1–M4 follow for every list.

**The frontend does not compute or re-compute any of these numbers** (M5-2): `puesto` is read, never derived, and every figure is printed through `formatearNota`. There is no fallback, no estimate and no "meanwhile".

- [ ] **Step 4: Run the tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/indices.test.ts src/features/reportes/api.test.ts 2>&1 | tail -8
```

Expected: PASS — 10 in `indices.test.ts` and 3 in `reportes/api.test.ts`.

- [ ] **Step 5: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **926 tests** (913 + 13).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: read the PDI indices and the orden de merito behind dependency 8"
```

---
### Task 6: Chequeos, the theory history and the `causales[]` of dependency 68 (M5-13, M5-14, M5-15, M5-21)

Owns no acceptance criterion: CA-LEG-09, CA-LEG-10, CA-LEG-11 and CA-LEG-12 belong to T15, T17 and T18. Its tests are tagged `contrato §5.1`, `contrato §5.2`, `contrato §6.2`, `contrato §9.4` and `contrato §9.8`. **It runs before the alertas** (T7) because three of the five alert types derive from what this task fixes: the causales, the counters and the theory block.

**Files:**

- Create: `src/mocks/sigeda/chequeos.ts`
- Test: `src/mocks/sigeda/chequeos.test.ts`
- Create: `src/mocks/sigeda/cuestionarios-historial.ts`
- Test: `src/mocks/sigeda/cuestionarios-historial.test.ts`
- Modify: `src/mocks/sigeda/semilla-teoria.ts`
- Modify: `src/mocks/sigeda/datos.ts`
- Modify: `src/mocks/sigeda/estado-teorico.ts`
- Test: `src/mocks/sigeda/estado-teorico.test.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/features/seguimiento/api.ts`
- Modify: `src/features/seguimiento/api.test.ts`
- Modify (counts and two positional assertions): `src/mocks/sigeda/turnos-teoricos.test.ts`, `src/features/turnos-teoricos/turnos-teoricos-page.test.tsx`

**Interfaces:**

- Consumes: `replayDeResultados` from `./desaprobados` (T3), `datos()`, `buscarMateria`, `buscarTurnoTeorico`, `cuestionarioDe`, `minimoAplicado`, `estadoDelTurno`.
- Produces:
  - `src/mocks/sigeda/semilla-teoria.ts`: turnos teóricos **6** and **7** and cuestionarios **4** and **5** of contract §9.8, plus an optional per-turno `puntajes` column in `SEMILLA_TURNOS`.
  - `src/mocks/sigeda/datos.ts`: the sequences `turnoTeorico` 6 → **8** and `cuestionario` 4 → **6**.
  - `src/mocks/sigeda/chequeos.ts`: `GET /api/personas/{cod}/chequeos` over the replay's second half, with `D13_SIN_CHEQUEOS`.
  - `src/mocks/sigeda/cuestionarios-historial.ts`: `GET /api/cuestionarios?codAlumno=&idMateria=&estado=` with `idTurnoOrigen`/`turnoOrigen` backwards and `subsanadoPor` forwards, and `D14_SIN_EXAMENES`.
  - `src/mocks/sigeda/estado-teorico.ts`: `causales[]` on the single-persona response, stated per contract §9.8 and **absent** from the bulk one.
  - `src/features/seguimiento/api.ts`: `ChequeoFinal`, `ExamenDelHistorial`, `listarChequeos`, `listarHistorialTeorico`, `obtenerEstadoTeorico` and their keys and options.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/sigeda/chequeos.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { D13_SIN_CHEQUEOS } from './chequeos'

describe('GET /api/personas/{cod}/chequeos', () => {
  it('contrato §9.4 999999 tiene la única fila, aprobada, con la foto de contadores previa al reinicio', async () => {
    await iniciarComo('instructor.perez')
    const chequeos = await sigeda.lista<{
      codigo: string
      tipo: string
      resultado: string
      contadores: Record<string, number>
      subfase: string
    }>('/api/personas/999999/chequeos')
    expect(chequeos).toHaveLength(1)
    expect(chequeos[0]).toMatchObject({
      codigo: '999999-2',
      tipo: 'SUBFASE',
      resultado: 'Aprobado',
      contadores: { chequeo: 0, evaluaciones: 7, malos: 0, regulares: 1 },
      subfase: 'Contacto',
      idSubfase: 1,
    })
  })

  it('contrato §9.4 ni 777777 ni 555555 tienen fila, y por razones distintas', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.lista('/api/personas/777777/chequeos')).resolves.toEqual([])
    await expect(sigeda.lista('/api/personas/555555/chequeos')).resolves.toEqual([])
  })

  it('contrato §6.2 una lista vacía responde 404 D13, una persona inexistente 404 D2 y el endpoint pide Read', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/personas/777777/chequeos')).rejects.toMatchObject({
      status: 404,
      message: D13_SIN_CHEQUEOS,
    })
    await expect(sigeda.get('/api/personas/000000/chequeos')).rejects.toMatchObject({
      status: 404,
      message: 'Persona especificada no existe.',
    })
    tokens.guardar(jwtDePrueba('raul.paredes'), '')
    await expect(sigeda.get('/api/personas/999999/chequeos')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })
})
```

Create `src/mocks/sigeda/cuestionarios-historial.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { D14_SIN_EXAMENES } from './cuestionarios-historial'

type Fila = {
  id: number
  idTurnoTeorico: number
  materia: string
  tipoExamen: string
  fechaExamen: string
  estado: string
  nota: number | null
  notaMinimaAplicada: number
  aprobado: boolean | null
  idTurnoOrigen: number | null
  subsanadoPor: { idTurnoTeorico: number; nota: number | null; estado: string } | null
}

async function historial(codAlumno: string, extra = '') {
  return sigeda.get<{ content: Fila[]; totalElements: number }>(
    `/api/cuestionarios?codAlumno=${codAlumno}&page=0&size=10${extra}`,
  )
}

describe('GET /api/cuestionarios', () => {
  it('contrato §9.8 999999 tiene la cadena de subsanación completa, con las dos notas', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await historial('999999')
    expect(pagina.content.map((fila) => [fila.idTurnoTeorico, fila.nota, fila.aprobado])).toEqual([
      [7, 17, true],
      [6, 10, false],
    ])
    const origen = pagina.content.find((fila) => fila.idTurnoTeorico === 6)
    expect(origen).toMatchObject({ notaMinimaAplicada: 16, materia: 'Aerodinámica Aplicada a Helicópteros' })
    expect(origen?.subsanadoPor).toMatchObject({ idTurnoTeorico: 7, nota: 17, estado: 'FINALIZADO' })
    expect(pagina.content.find((fila) => fila.idTurnoTeorico === 7)?.idTurnoOrigen).toBe(6)
  })

  it('contrato §9.8 666666 tiene su desaprobado con la subsanación pendiente y sin segunda nota', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await historial('666666')
    expect(pagina.content).toHaveLength(1)
    expect(pagina.content[0]).toMatchObject({ idTurnoTeorico: 1, nota: 12, aprobado: false, notaMinimaAplicada: 18 })
    expect(pagina.content[0]?.subsanadoPor).toMatchObject({ idTurnoTeorico: 5, nota: null, estado: 'PROGRAMADO' })
  })

  it('contrato §5.2 una fila EN_CURSO llega sin nota, sin aprobado y sin entrega', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await historial('111111')
    expect(pagina.content).toHaveLength(1)
    expect(pagina.content[0]).toMatchObject({ estado: 'EN_CURSO', nota: null, aprobado: null })
    expect(pagina.content[0]).toHaveProperty('fechaEntrega', null)
    expect(pagina.content[0]).toHaveProperty('horaEntrega', null)
  })

  it('contrato §9.8 un alumno sin exámenes responde 404 D14', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/cuestionarios?codAlumno=222222&page=0&size=10')).rejects.toMatchObject({
      status: 404,
      message: D14_SIN_EXAMENES,
    })
  })

  it('contrato §5.2 filtra por materia y estado, ordena por fechaExamen descendente y el alumno solo ve lo propio', async () => {
    await iniciarComo('instructor.perez')
    expect((await historial('999999', '&idMateria=1')).totalElements).toBe(2)
    expect((await historial('999999', '&idMateria=3')).totalElements).toBe(0)
    expect((await historial('555555', '&estado=ENTREGADO')).totalElements).toBe(1)
    await iniciarComo('alumno.castro')
    expect((await historial('999999')).totalElements).toBe(2)
    await expect(historial('555555')).rejects.toMatchObject({ status: 403 })
  })
})
```

`&idMateria=3` for `999999` returns an empty **page**, not a 404, because the filter is applied before the emptiness check only for the unfiltered list — if the handler answers 404 there too, `sigeda.pagina` turns it into an empty page and `totalElements` is `0` either way, so the assertion holds in both readings. The 404 of the fourth test is asserted through `sigeda.get`, which does not swallow it.

Create `src/mocks/sigeda/estado-teorico.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'

type Causal = { codigo: string; idMateria: number | null; materia: string | null; grupo: string[] | null; detalle: string; fecha: string }

describe('causales[] del estado teórico', () => {
  it('contrato §9.8 111111 lleva cuatro causales que cubren las tres formas de payload', async () => {
    await iniciarComo('instructor.perez')
    const estado = await sigeda.get<{ causales: Causal[] }>('/api/personas/111111/estado-teorico')
    expect(estado.causales.map((causal) => [causal.codigo, causal.idMateria])).toEqual([
      ['PROMEDIO_ASIGNATURA', 3],
      ['PROMEDIO_ASIGNATURA', 2],
      ['PERIODICOS_GENERALES', 2],
      ['TRES_ASIGNATURAS', null],
    ])
    expect(estado.causales[0]).toMatchObject({
      materia: 'Adoctrinamiento de Vuelo',
      grupo: null,
      detalle: 'Nota de asignatura 12.50 en Adoctrinamiento de Vuelo, por debajo de 13.',
    })
    expect(estado.causales[2]?.grupo).toHaveLength(5)
    expect(estado.causales[3]).toMatchObject({ materia: null, grupo: null, detalle: '3 asignaturas desaprobadas.' })
  })

  it('contrato §5.1 el resto llega con causales vacías, y 666666 prueba bloqueo sin causal', async () => {
    await iniciarComo('instructor.perez')
    const bloqueado = await sigeda.get<{ bloqueadoPorSubsanacion: boolean; causales: Causal[] }>(
      '/api/personas/666666/estado-teorico',
    )
    expect(bloqueado.bloqueadoPorSubsanacion).toBe(true)
    expect(bloqueado.causales).toEqual([])
    const sinNada = await sigeda.get<{ bloqueadoPorSubsanacion: boolean; causales: Causal[] }>(
      '/api/personas/555555/estado-teorico',
    )
    expect([sinNada.bloqueadoPorSubsanacion, sinNada.causales]).toEqual([false, []])
  })

  it('contrato §5.3 la variante en lote no lleva causales', async () => {
    await iniciarComo('instructor.perez')
    const lote = await sigeda.get<Record<string, unknown>[]>('/api/estado-teorico?codAlumnos=111111,666666')
    expect(lote).toHaveLength(2)
    expect(lote[0]).not.toHaveProperty('causales')
    expect(lote[0]).toHaveProperty('bloqueadoPorSubsanacion')
  })
})
```

Add to `src/features/seguimiento/api.test.ts`:

```ts
describe('chequeos e historial teórico desde la capa de API', () => {
  it('contrato §6.2 los chequeos llegan como una línea de tiempo por fecha', async () => {
    await iniciarComo('instructor.perez')
    const chequeos = await listarChequeos('999999')
    expect(chequeos.map((chequeo) => chequeo.codigo)).toEqual(['999999-2'])
    expect(chequeos[0]?.contadores.evaluaciones).toBe(7)
    await expect(listarChequeos('777777')).resolves.toEqual([])
  })

  it('contrato §5.2 el historial teórico conserva los dos punteros de la subsanación', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await listarHistorialTeorico('999999', { page: 0, size: 10, direction: 'DESC' })
    expect(pagina.items.map((fila) => fila.nota)).toEqual([17, 10])
    expect(pagina.items[1]?.subsanadoPor?.nota).toBe(17)
    expect(pagina.items[0]?.idTurnoOrigen).toBe(6)
  })
})
```

- [ ] **Step 2: The two theory turnos and the two exámenes of contract §9.8**

In `src/mocks/sigeda/semilla-teoria.ts`, widen the `SEMILLA_TURNOS` tuple with an optional per-pregunta puntaje column and add the two rows:

```ts
const SEMILLA_TURNOS: [
  id: number,
  nombre: string,
  idMateria: number,
  tipo: TipoExamenMock,
  dias: number,
  horaInicio: string,
  horaFin: string,
  idGrupo: number,
  preguntas: number[],
  idTurnoOrigen: number | null,
  puntajes?: number[],
][] = [
  [1, 'Mensual Adoctrinamiento de Vuelo', 3, 'MENSUAL', -7, '08:00', '09:00', 3, [1, 2, 3, 4, 5], null],
  [2, 'Test Procedimientos de Emergencias', 6, 'TEST', -5, '10:00', '10:30', 2, [11, 12, 13, 14, 15], null],
  [3, 'Semanal Adoctrinamiento de Vuelo', 3, 'SEMANAL', 0, '00:00', '23:59', 1, [1, 2, 3, 4, 5], null],
  [4, 'Quincenal Límites de Operación', 4, 'QUINCENAL', 3, '09:00', '10:00', 3, [17, 18, 19, 20, 21], null],
  [5, 'Subsanación Adoctrinamiento de Vuelo', 3, 'SUBSANACION', 1, '08:00', '09:00', 3, [6, 7, 8, 9, 10], 1],
  [6, 'Test Aerodinámica Aplicada a Helicópteros', 1, 'TEST', -12, '08:00', '09:00', 6, [22, 23, 24], null, [10, 7, 3]],
  [7, 'Subsanación Aerodinámica Aplicada a Helicópteros', 1, 'SUBSANACION', -11, '08:00', '09:00', 6, [22, 23, 24], 6, [10, 7, 3]],
]
```

and let `preguntasTurno` read the new column:

```ts
      puntajeMaximo: fila[10]?.[indice] ?? PUNTAJE_POR_PREGUNTA,
```

**Why the puntajes are 10 · 7 · 3 rather than the usual 4 each.** Materia 1 has exactly three preguntas in the M4 fixture (22, 23 and 24), and §9.8 puts this chain on materia 1 because it is the only materia with preguntas whose `notaMinima` (16) lets a 17.00 pass and a 10.00 fail. Three preguntas at four points would cap the exam at 12, and M4's own fixture keeps **nota = Σ puntajeObtenido** (cuestionario 1: five aciertos × 4 = 20; cuestionario 2: three × 4 = 12). With 10 · 7 · 3 the scale closes at 20 and the two fixed notas of §9.8 are reachable exactly: `10` by acertando only pregunta 22, and `17` by acertando 22 and 23.

Then add the two cuestionarios to the array `crearTeoria` returns, after the third:

```ts
    {
      id: 4,
      idTurnoTeorico: 6,
      codAlumno: '999999',
      estado: 'ENTREGADO',
      fechaEntrega: sumarDias(hoy, -12),
      horaEntrega: '08:35',
      nota: 10,
      notaMinimaAplicada: minimoAplicado(16, 'TEST'),
      aprobado: false,
      orden: preguntasTurno.filter((fila) => fila.idTurnoTeorico === 6).map((fila) => fila.idPregunta),
      respuestas: {},
      calificaciones: calificar(6, [22]),
    },
    {
      id: 5,
      idTurnoTeorico: 7,
      codAlumno: '999999',
      estado: 'ENTREGADO',
      fechaEntrega: sumarDias(hoy, -11),
      horaEntrega: '08:28',
      nota: 17,
      notaMinimaAplicada: minimoAplicado(16, 'SUBSANACION'),
      aprobado: true,
      orden: preguntasTurno.filter((fila) => fila.idTurnoTeorico === 7).map((fila) => fila.idPregunta),
      respuestas: {},
      calificaciones: calificar(7, [22, 23]),
    },
```

and in `src/mocks/sigeda/datos.ts` raise the two sequences: `turnoTeorico: 8` and `cuestionario: 6`.

**The date order matters and §9.1 says so:** turno 7 at `hoy − 11` covers turno 6 at `hoy − 12`, so `desaprobadosSinSubsanar('999999')` is empty and `999999` is **not** blocked — which is what keeps `cuestionarios-teoria.test.ts:230-242` (CA-RES-10) asserting `[false, null, [], []]`. Inverting the two dates inverts that assertion with nothing else warning.

- [ ] **Step 3: The M4 assertions the two new turnos cost**

Adding two turnos teóricos moves the fixture the M4 list screens count. **Only counts and positions change; no assertion is weakened, and any assertion whose *meaning* would change is a signal to stop and report.** In `src/mocks/sigeda/turnos-teoricos.test.ts`:

| Where | From | To |
|---|---|---|
| `pagina.total` in the CA-TUT-01 list test | `5` | `7` |
| the `[id, estado, rindieron, cantAlumnos]` array | five rows | `[6,'FINALIZADO',1,1]` and `[7,'FINALIZADO',1,1]` **first** (the list orders by `fechaExamen` and the two new ones are the oldest), then the five existing rows unchanged |
| `expect(pagina.items[0]).toMatchObject({ nombre: 'Mensual Adoctrinamiento de Vuelo', … })` | positional | `expect(pagina.items.find((fila) => fila.id === 1)).toMatchObject({ … })` — same assertion, no longer position-dependent |
| `tipoExamen: 'SUBSANACION'` total | `1` | `2` |
| `fechaPost: sumarDias(hoyIso(), -6)` total | `1` | `3` |

and in `src/features/turnos-teoricos/turnos-teoricos-page.test.tsx`:

| Where | From | To |
|---|---|---|
| every unfiltered `'Página 1 de 1 · 5 registros'` and `expect(filas()).toHaveLength(5)` | `5` | `7` |
| the count after a successful delete | `'· 4 registros'` | `'· 6 registros'` |
| the first-row block of CA-TUT-01 (`const primera = within(filas()[0]!)`) | positional | `const primera = within(screen.getByRole('link', { name: 'Mensual Adoctrinamiento de Vuelo' }).closest('tr') as HTMLElement)`, the pattern `evaluaciones-page.test.tsx:45` already uses |
| `within(filas()[0]!).getAllByTitle('Adoctrinamiento de Vuelo')[0]` | positional | read it from the same `primera` row |

The filtered counts that **do not** change, because the two new turnos are grupo 6, materia 1 and dated `hoy − 12`/`hoy − 11`: the grupo-3 filter (3), grupo 3 + Programado (2), + Subsanación (1), the materia filter on Procedimientos de Emergencias (1), the closed date range `hoy−6 … hoy+2` (3), `fechaPre: hoyIso()` (3), the Modificar/Eliminar row-action counts (2 each) and the sort-by-name first row (`Mensual…` still sorts before `Quincenal`, `Semanal`, `Subsanación` and `Test`).

This cost is **not** flagged in spec §17 or in contract §9: §9.1 names only three affected assertions (the two for the grupo rename and one re-run). It is the largest baseline-test impact in M5.

- [ ] **Step 4: `src/mocks/sigeda/chequeos.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, textoNoEncontrado } from './comun'
import { D2_PERSONA_NO_EXISTE } from './alumnos'
import { buscarPersona } from './datos'
import { replayDeResultados } from './desaprobados'

export const D13_SIN_CHEQUEOS = 'No existen chequeos disponibles.'

export const handlersChequeos = [
  http.get(`${API}/api/personas/:cod/chequeos`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    if (!buscarPersona(cod)) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    const filas = replayDeResultados()
      .chequeos.filter((chequeo) => chequeo.codPersona === cod)
      .toSorted((izquierda, derecha) => izquierda.fecha.localeCompare(derecha.fecha))
      .map(({ codPersona, ...resto }) => ({ ...resto, codPersona: undefined }))
    if (filas.length === 0) return textoNoEncontrado(D13_SIN_CHEQUEOS)
    return HttpResponse.json(
      filas.map((fila) => ({
        codigo: fila.codigo,
        fecha: fila.fecha,
        tipo: fila.tipo,
        resultado: fila.resultado,
        contadores: fila.contadores,
        codEvaluacion: fila.codEvaluacion,
        idSubfase: fila.idSubfase,
        subfase: fila.subfase,
      })),
    )
  }),
]
```

Drop the `.map(({ codPersona, ...resto }) => …)` line — the projection below already picks the eight fields the contract publishes, so the intermediate strip is dead weight. **The fixture's single row is the argument for dependency 65**: it is an *approved* chequeo, because today no failed chequeo can reach the table at all (contract §6.2), so the panel can show what the alumno passed and not what sent him to the Chequeo de Comando.

- [ ] **Step 5: `src/mocks/sigeda/cuestionarios-historial.ts`**

```ts
import { http } from 'msw'
import { API, autorizar, paginar, textoProhibido } from './comun'
import { D15_SOLO_LO_PROPIO } from './cuestionarios-teoria'
import { buscarMateria, buscarTurnoTeorico, datos, rolPorId, usuarioDePersona } from './datos'
import { estadoDelTurno } from './turnos-teoricos'

export const D14_SIN_EXAMENES = 'No existen exámenes disponibles.'

function subsanadoPor(idMateria: number, fechaExamen: string, codAlumno: string) {
  const turno = datos()
    .turnosTeoricos.filter(
      (candidato) =>
        candidato.tipoExamen === 'SUBSANACION' &&
        candidato.idMateria === idMateria &&
        candidato.fechaExamen >= fechaExamen,
    )
    .toSorted((izquierda, derecha) => izquierda.fechaExamen.localeCompare(derecha.fechaExamen))
    .at(0)
  if (!turno) return null
  const suyo = datos().cuestionarios.find(
    (cuestionario) => cuestionario.idTurnoTeorico === turno.id && cuestionario.codAlumno === codAlumno,
  )
  return {
    idTurnoTeorico: turno.id,
    turnoTeorico: turno.nombre,
    fechaExamen: turno.fechaExamen,
    estado: estadoDelTurno(turno),
    nota: suyo?.nota ?? null,
  }
}

export const handlersCuestionariosHistorial = [
  http.get(`${API}/api/cuestionarios`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const codAlumno = url.searchParams.get('codAlumno') ?? ''
    const esAlumno = rolPorId(usuarioDePersona(permitido.codPersona)?.idRol ?? null)?.nombre === 'Alumno'
    if (esAlumno && permitido.codPersona !== codAlumno) return textoProhibido(D15_SOLO_LO_PROPIO)
    const idMateria = Number(url.searchParams.get('idMateria') ?? 0)
    const estado = url.searchParams.get('estado') ?? ''
    const filas = datos()
      .cuestionarios.filter((cuestionario) => cuestionario.codAlumno === codAlumno)
      .flatMap((cuestionario) => {
        const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
        if (!turno) return []
        if (idMateria > 0 && turno.idMateria !== idMateria) return []
        if (estado !== '' && cuestionario.estado !== estado) return []
        const origen = turno.idTurnoOrigen === null ? null : buscarTurnoTeorico(turno.idTurnoOrigen)
        return [
          {
            id: cuestionario.id,
            idTurnoTeorico: turno.id,
            turnoTeorico: turno.nombre,
            idMateria: turno.idMateria,
            materia: buscarMateria(turno.idMateria)?.nombre ?? '',
            tipoExamen: turno.tipoExamen,
            fechaExamen: turno.fechaExamen,
            estado: cuestionario.estado,
            fechaEntrega: cuestionario.fechaEntrega,
            horaEntrega: cuestionario.horaEntrega,
            nota: cuestionario.nota,
            notaMinimaAplicada: cuestionario.notaMinimaAplicada,
            aprobado: cuestionario.aprobado,
            idTurnoOrigen: origen?.id ?? null,
            turnoOrigen: origen?.nombre ?? null,
            subsanadoPor:
              cuestionario.aprobado === false
                ? subsanadoPor(turno.idMateria, turno.fechaExamen, codAlumno)
                : null,
          },
        ]
      })
    return paginar(filas, url, { nombreLista: 'exámenes', propiedadPorDefecto: 'fechaExamen' })
  }),
]
```

`paginar` produces `No existen exámenes disponibles.` for an empty page, which is exactly D14 — assert the constant against that string in the test rather than duplicating the template. Its default direction is `ASC` while contract §5.2 asks for `DESC`; the **api layer** sends `direction: 'DESC'` by default (Step 7), which is where a URL default belongs, and the test drives it explicitly.

Register both modules in `handlers.ts`. `GET /api/cuestionarios` cannot collide with `GET /api/cuestionarios/:id` (`cuestionarios-teoria.ts:272`): MSW matches on segment count.

- [ ] **Step 6: The `causales[]` of dependency 68 (contract §5.1, §9.8)**

In `src/mocks/sigeda/estado-teorico.ts`, add the stated causales above the handlers and hang them off the single-persona response only:

```ts
const GRUPO_PERIODICOS_GENERALES = [
  'Ingeniería del Helicóptero',
  'Adoctrinamiento de Vuelo',
  'Aerodinámica Aplicada a Helicópteros',
  'Meteorología',
  'Fraseología Aeronáutica en Inglés',
]

type CausalMock = {
  codigo: string
  idMateria: number | null
  materia: string | null
  grupo: string[] | null
  detalle: string
  fecha: string
}

function causalesDe(cod: string, hoy: string): CausalMock[] {
  if (cod !== '111111') return []
  return [
    {
      codigo: 'PROMEDIO_ASIGNATURA',
      idMateria: 3,
      materia: buscarMateria(3)?.nombre ?? '',
      grupo: null,
      detalle: 'Nota de asignatura 12.50 en Adoctrinamiento de Vuelo, por debajo de 13.',
      fecha: sumarDias(hoy, -7),
    },
    {
      codigo: 'PROMEDIO_ASIGNATURA',
      idMateria: 2,
      materia: buscarMateria(2)?.nombre ?? '',
      grupo: null,
      detalle: 'Nota de asignatura 11.80 en Ingeniería del Helicóptero, por debajo de 13.',
      fecha: sumarDias(hoy, -7),
    },
    {
      codigo: 'PERIODICOS_GENERALES',
      idMateria: 2,
      materia: buscarMateria(2)?.nombre ?? '',
      grupo: GRUPO_PERIODICOS_GENERALES,
      detalle: '3 desaprobados consecutivos en periódicos de Ingeniería del Helicóptero.',
      fecha: sumarDias(hoy, -5),
    },
    {
      codigo: 'TRES_ASIGNATURAS',
      idMateria: null,
      materia: null,
      grupo: null,
      detalle: '3 asignaturas desaprobadas.',
      fecha: sumarDias(hoy, -5),
    },
  ]
}
```

with `hoyIso` and `sumarDias` imported from `@/lib/dominio/calendario`, and the single-persona handler returning

```ts
    return HttpResponse.json({ ...resumenDeEstadoTeorico(cod, persona), causales: causalesDe(cod, hoyIso()) })
```

**These four are the only fixture in M5 that cannot be derived** (contract §9.8): the seven rules of §5.1 all need per-asignatura exam histories that exist neither in the mocks nor in the seed. Between them they cover the three payload shapes — with materia, with grupo *and* materia, and with neither — and the two `PROMEDIO_ASIGNATURA` rows are what force `idMateria` into the synthetic key of §2.1, which the first version of the fixtures did not exercise. The other four labels (`DOS_EXAMENES`, `SEGUNDA_SUBSANACION`, `PERIODICOS_CRITICOS`, `INOPINADOS`) are exercised with `server.use(...)` in T15.

- [ ] **Step 7: The readers**

Add to `src/features/seguimiento/api.ts`:

```ts
export type ChequeoFinal = {
  codigo: string
  fecha: string
  tipo: string
  resultado: string
  contadores: { chequeo: number; evaluaciones: number; malos: number; regulares: number }
  codEvaluacion: string
  idSubfase: number
  subfase: string
}

export type Causal = {
  codigo: string
  idMateria: number | null
  materia: string | null
  grupo: string[] | null
  detalle: string
  fecha: string
}

export type EstadoTeoricoDelAlumno = EstadoTeoricoResumen & {
  desaprobados: {
    idCuestionario: number
    idTurnoTeorico: number
    turnoTeorico: string
    idMateria: number
    materia: string
    tipoExamen: string
    fechaExamen: string
    nota: number | null
    notaMinimaAplicada: number
  }[]
  causales: Causal[]
}

export type ExamenDelHistorial = {
  id: number
  idTurnoTeorico: number
  turnoTeorico: string
  idMateria: number
  materia: string
  tipoExamen: string
  fechaExamen: string
  estado: string
  fechaEntrega: string | null
  horaEntrega: string | null
  nota: number | null
  notaMinimaAplicada: number
  aprobado: boolean | null
  idTurnoOrigen: number | null
  turnoOrigen: string | null
  subsanadoPor: { idTurnoTeorico: number; turnoTeorico: string; fechaExamen: string; estado: string; nota: number | null } | null
}

export type FiltrosHistorialTeorico = ParametrosPagina & { idMateria?: number; estado?: string }

export function listarChequeos(codPersona: string): Promise<ChequeoFinal[]> {
  return sigeda.lista<ChequeoFinal>(`/api/personas/${encodeURIComponent(codPersona)}/chequeos`)
}

export function obtenerEstadoTeorico(codPersona: string): Promise<EstadoTeoricoDelAlumno> {
  return sigeda.get<EstadoTeoricoDelAlumno>(`/api/personas/${encodeURIComponent(codPersona)}/estado-teorico`)
}

export function listarHistorialTeorico(
  codAlumno: string,
  filtros: FiltrosHistorialTeorico,
): Promise<Pagina<ExamenDelHistorial>> {
  return sigeda.pagina<ExamenDelHistorial>('/api/cuestionarios', {
    codAlumno,
    idMateria: filtros.idMateria,
    estado: filtros.estado,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property ?? 'fechaExamen',
    direction: filtros.direction,
  })
}
```

with their three keys (`chequeos`, `estadoTeorico` keyed by `codPersona` — name it `estadoTeoricoDe` so it does not collide with the lote key — and `historialTeorico`) and three `queryOptions`, each `enabled: codPersona !== ''`.

- [ ] **Step 8: Run the tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda src/features/seguimiento src/features/turnos-teoricos src/features/examenes 2>&1 | tail -10
```

Expected: PASS, with the edited M4 counts. 3 new tests in `chequeos.test.ts`, 5 in `cuestionarios-historial.test.ts`, 3 in `estado-teorico.test.ts`, 2 more in `seguimiento/api.test.ts`.

- [ ] **Step 9: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **939 tests** (926 + 13).

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: serve the chequeo history, the theory history and the causales of the estado teorico"
```

---
### Task 7: Alertas: the API layer and `seguimiento.ts` (M5-7, M5-21)

Owns no acceptance criterion: CA-ALE-01..05, 07 and 08 belong to T12 and T13. Its tests are tagged `contrato §2.1` and `contrato §9.7`. It comes last of the mock tasks because **all five alert types are derived from what T3 and T6 fixed**: the desaprobados, the counters, the estado, the theory block and the causales. Nothing here is a new datum.

**Files:**

- Create: `src/mocks/sigeda/seguimiento.ts`
- Test: `src/mocks/sigeda/seguimiento.test.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/features/seguimiento/api.ts`
- Modify: `src/features/seguimiento/api.test.ts`

**Interfaces:**

- Consumes: `replayDeResultados` (T3), `causalesDe` — exported from `estado-teorico.ts` for this module — `motivoDeBloqueo`, `desaprobadosSinSubsanar`, `bloqueadoPorSubsanacion`, `criterioCumplido`/`ramaCumplida` (T3), `ordinalDeSeveridad` and `criterioDeFase` (T1), `paginarOrdenado` (T5).
- Produces:
  - `src/mocks/sigeda/seguimiento.ts`: `GET /api/seguimiento/alertas` with the five derivations, the severity table of §2.1, the synthetic key, the scope rule and `D10_SIN_ALERTAS`, `D17_GRUPO_FUERA_DE_ALCANCE`, `D18_GRUPO_NO_EXISTE`.
  - `src/features/seguimiento/api.ts`: `Alerta`, `FiltrosAlertas`, `listarAlertas`, its key and its query options.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/sigeda/seguimiento.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo } from '@/test/render'
import { D10_SIN_ALERTAS, D17_GRUPO_FUERA_DE_ALCANCE, D18_GRUPO_NO_EXISTE } from './seguimiento'

type Alerta = {
  id: string
  tipo: string
  severidad: string
  codAlumno: string
  alumno: string
  idGrupo: number | null
  grupo: string
  programa: string
  fecha: string | null
  detalle: string
  codEvaluacion: string | null
  idSubfase: number | null
  idMateria: number | null
  idCuestionario: number | null
  causal: string | null
}

async function alertas(consulta = 'programa=PDI&page=0&size=20') {
  return sigeda.get<{ content: Alerta[]; totalElements: number; totalPages: number }>(
    `/api/seguimiento/alertas?${consulta}`,
  )
}

describe('GET /api/seguimiento/alertas', () => {
  it('contrato §9.7 deriva trece alertas con una ALTA, seis MEDIA y seis BAJA', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    expect(pagina.totalElements).toBe(13)
    const porSeveridad = (severidad: string) => pagina.content.filter((alerta) => alerta.severidad === severidad).length
    expect([porSeveridad('ALTA'), porSeveridad('MEDIA'), porSeveridad('BAJA')]).toEqual([1, 6, 6])
    expect(pagina.content.filter((alerta) => alerta.tipo === 'VUELO_DESAPROBADO')).toHaveLength(6)
    expect(pagina.content.filter((alerta) => alerta.tipo === 'CAUSAL_TEORICO')).toHaveLength(4)
  })

  it('contrato §9.7 la clave sintética separa dos causales del mismo código en asignaturas distintas', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    const causales = pagina.content.filter((alerta) => alerta.tipo === 'CAUSAL_TEORICO')
    expect(causales.map((alerta) => alerta.id)).toEqual([
      'CAUSAL_TEORICO:111111:PROMEDIO_ASIGNATURA:3',
      'CAUSAL_TEORICO:111111:PROMEDIO_ASIGNATURA:2',
      'CAUSAL_TEORICO:111111:PERIODICOS_GENERALES:2',
      'CAUSAL_TEORICO:111111:TRES_ASIGNATURAS:',
    ])
    expect(new Set(pagina.content.map((alerta) => alerta.id)).size).toBe(13)
  })

  it('contrato §2.1 la severidad viaja como etiqueta del enum y el ordinal no se serializa', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    expect(new Set(pagina.content.map((alerta) => alerta.severidad))).toEqual(new Set(['ALTA', 'MEDIA', 'BAJA']))
    expect(pagina.content[0]).not.toHaveProperty('ordinal')
  })

  it('contrato §2.1 el orden por defecto es por severidad y, dentro de ella, por fecha descendente', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    expect(pagina.content[0]).toMatchObject({ tipo: 'SUBSANACION_PENDIENTE', codAlumno: '666666' })
    expect(pagina.content.at(-1)?.tipo).toBe('VUELO_DESAPROBADO')
    const medias = pagina.content.filter((alerta) => alerta.severidad === 'MEDIA').map((alerta) => alerta.fecha ?? '')
    expect(medias).toEqual([...medias].sort().reverse())
  })

  it('contrato §9.7 777777 tiene cuatro alertas y ninguna es CHEQUEO_PENDIENTE; la de 999999 sí', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    const suyas = pagina.content.filter((alerta) => alerta.codAlumno === '777777')
    expect(suyas.map((alerta) => alerta.tipo).toSorted()).toEqual([
      'ESTADO_CRITICO',
      'VUELO_DESAPROBADO',
      'VUELO_DESAPROBADO',
      'VUELO_DESAPROBADO',
    ])
    expect(pagina.content.find((alerta) => alerta.tipo === 'CHEQUEO_PENDIENTE')).toMatchObject({
      codAlumno: '999999',
      severidad: 'MEDIA',
      idSubfase: 1,
    })
  })

  it('contrato §2.1 un instructor sin View All Groups solo ve los grupos con los que voló', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await alertas()
    expect(pagina.totalElements).toBe(7)
    expect(new Set(pagina.content.map((alerta) => alerta.idGrupo))).toEqual(new Set([1, 2, 3]))
    expect(pagina.content.map((alerta) => alerta.codAlumno)).not.toContain('777777')
  })

  it('contrato §2.1 filtra por grupo, por tipo y por rango de fechas', async () => {
    await iniciarComo('comandante.aguirre')
    expect((await alertas('programa=PDI&idGrupo=4&page=0&size=20')).totalElements).toBe(4)
    expect((await alertas('programa=PDI&tipo=VUELO_DESAPROBADO&page=0&size=20')).totalElements).toBe(6)
    expect((await alertas(`programa=PDI&fechaPre=${sumarDias(hoyIso(), -15)}&page=0&size=20`)).totalElements).toBe(5)
    expect(
      (await alertas(`programa=PDI&fechaPost=${sumarDias(hoyIso(), -25)}&page=0&size=20`)).totalElements,
    ).toBe(2)
    expect((await alertas('programa=PDI&tipo=NO_EXISTE&page=0&size=20')).totalElements).toBe(13)
  })

  it('contrato §2.1 un grupo inexistente responde 404 D18 y uno fuera de alcance 403 D17', async () => {
    await iniciarComo('instructor.perez')
    await expect(alertas('programa=PDI&idGrupo=99')).rejects.toMatchObject({ status: 404, message: D18_GRUPO_NO_EXISTE })
    await expect(alertas('programa=PDI&idGrupo=4')).rejects.toMatchObject({
      status: 403,
      message: D17_GRUPO_FUERA_DE_ALCANCE,
    })
  })

  it('contrato §2.1 una lista vacía responde 404 D10 y el endpoint pide View Disapproved', async () => {
    await iniciarComo('comandante.aguirre')
    await expect(alertas('programa=PDE')).rejects.toMatchObject({ status: 404, message: D10_SIN_ALERTAS })
    await iniciarComo('jefe.operaciones')
    await expect(alertas()).rejects.toMatchObject({ status: 403, message: MENSAJE_SIN_PERMISO })
  })

  it('contrato §2.1 cada tipo lleva los punteros que su enlace necesita y ninguno más', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    const porTipo = (tipo: string) => pagina.content.find((alerta) => alerta.tipo === tipo)
    expect(porTipo('VUELO_DESAPROBADO')).toMatchObject({ codEvaluacion: expect.any(String), idSubfase: expect.any(Number) })
    expect(porTipo('SUBSANACION_PENDIENTE')).toMatchObject({ idMateria: 3, idCuestionario: 2, codEvaluacion: null })
    expect(porTipo('CAUSAL_TEORICO')).toMatchObject({ causal: 'PROMEDIO_ASIGNATURA', idMateria: 3 })
    expect(porTipo('ESTADO_CRITICO')).toMatchObject({ codEvaluacion: null, idSubfase: null, causal: null })
    expect(porTipo('CHEQUEO_PENDIENTE')?.detalle).toContain('criterio de chequeo')
  })
})
```

The date filters are asserted against the fixture's own dates: `fechaPre = hoy − 15` keeps the five alerts dated on or after it (the three of `777777` at `hoy − 3`, `hoy − 14` and `hoy − 10`, plus `999999`'s chequeo at `hoy − 10` and the two causales of `hoy − 5`… ) — **recount them against the fixture when you write the test and use the number you get, not the number written here, if they differ; then say so in your report.** Every other assertion in this file is independent of that arithmetic.

Add to `src/features/seguimiento/api.test.ts`:

```ts
describe('capa de API de alertas', () => {
  it('contrato §2.1 pagina las alertas y conserva sus punteros', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await listarAlertas({ programa: 'PDI', page: 0, size: 10, direction: 'ASC' })
    expect(pagina.total).toBe(13)
    expect(pagina.totalPages).toBe(2)
    expect(pagina.items[0]).toMatchObject({ tipo: 'SUBSANACION_PENDIENTE', severidad: 'ALTA' })
    const segunda = await listarAlertas({ programa: 'PDI', page: 1, size: 10, direction: 'ASC' })
    expect(segunda.items).toHaveLength(3)
  })

  it('contrato §2.1 una lista vacía llega como página vacía, no como error', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await listarAlertas({ programa: 'PDE', page: 0, size: 10, direction: 'ASC' })
    expect(pagina.items).toEqual([])
    expect(pagina.total).toBe(0)
  })
})
```

- [ ] **Step 2: `src/mocks/sigeda/seguimiento.ts`**

```ts
import { http } from 'msw'
import { ordinalDeSeveridad, criterioDeFase } from '@/lib/dominio/seguimiento'
import { hoyIso } from '@/lib/dominio/calendario'
import { API, autorizar, paginarOrdenado, textoNoEncontrado, textoProhibido } from './comun'
import {
  bloqueadoPorSubsanacion,
  buscarMateria,
  buscarTurnoTeorico,
  datos,
  desaprobadosSinSubsanar,
  nombreCompleto,
  type PersonaMock,
} from './datos'
import { criterioCumplido, ramaCumplida, replayDeResultados } from './desaprobados'
import { causalesDe, motivoDeBloqueo } from './estado-teorico'

export const D10_SIN_ALERTAS = 'No existen alertas disponibles.'
export const D17_GRUPO_FUERA_DE_ALCANCE = 'No tiene permiso para ver este grupo.'
export const D18_GRUPO_NO_EXISTE = 'Grupo especificada no existe.'

const SEVERIDAD_POR_ESTADO: Record<string, string> = {
  'En Deliberación': 'ALTA',
  'No Apto': 'ALTA',
  'En Chequeo': 'MEDIA',
  'En Final': 'MEDIA',
  'En Complementación': 'MEDIA',
  'En Observación': 'BAJA',
}

type Alerta = {
  id: string
  tipo: string
  severidad: string
  codAlumno: string
  alumno: string
  idGrupo: number | null
  grupo: string
  programa: string
  fecha: string | null
  detalle: string
  codEvaluacion: string | null
  idSubfase: number | null
  idMateria: number | null
  idCuestionario: number | null
  causal: string | null
}

function ultima(codPersona: string) {
  return datos()
    .evaluaciones.filter((evaluacion) => evaluacion.codPersona === codPersona)
    .toSorted((izquierda, derecha) => izquierda.fecha.localeCompare(derecha.fecha) || izquierda.codigo.localeCompare(derecha.codigo))
    .at(-1)
}

function base(persona: PersonaMock) {
  const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
  return {
    codAlumno: persona.codigo,
    alumno: nombreCompleto(persona),
    idGrupo: persona.idGrupo,
    grupo: persona.idGrupo === null ? '' : `Grupo ${persona.idGrupo}`,
    programa: grupo?.programa ?? 'PDI',
    codEvaluacion: null,
    idSubfase: null,
    idMateria: null,
    idCuestionario: null,
    causal: null,
  }
}

function alertasDe(persona: PersonaMock): Alerta[] {
  const filas: Alerta[] = []
  const comun = base(persona)
  if (bloqueadoPorSubsanacion(persona.codigo)) {
    const desaprobado = desaprobadosSinSubsanar(persona.codigo)[0]
    const turno = desaprobado === undefined ? undefined : buscarTurnoTeorico(desaprobado.idTurnoTeorico)
    filas.push({
      ...comun,
      id: `SUBSANACION_PENDIENTE:${persona.codigo}:${desaprobado?.id ?? ''}`,
      tipo: 'SUBSANACION_PENDIENTE',
      severidad: 'ALTA',
      fecha: turno?.fechaExamen ?? null,
      detalle: motivoDeBloqueo(persona.codigo) ?? '',
      idMateria: turno?.idMateria ?? null,
      idCuestionario: desaprobado?.id ?? null,
    })
  }
  if (persona.estado !== 'Apto') {
    filas.push({
      ...comun,
      id: `ESTADO_CRITICO:${persona.codigo}`,
      tipo: 'ESTADO_CRITICO',
      severidad: SEVERIDAD_POR_ESTADO[persona.estado] ?? 'MEDIA',
      fecha: ultima(persona.codigo)?.fecha ?? null,
      detalle: `El alumno está ${persona.estado}.`,
    })
  } else {
    const fase = ultima(persona.codigo)?.fase ?? ''
    const criterio = criterioDeFase(fase)
    if (criterioCumplido(criterio, persona.contMalo, persona.contRegular)) {
      filas.push({
        ...comun,
        id: `CHEQUEO_PENDIENTE:${persona.codigo}`,
        tipo: 'CHEQUEO_PENDIENTE',
        severidad: 'MEDIA',
        fecha: ultima(persona.codigo)?.fecha ?? null,
        detalle: `Cumple el criterio de chequeo de ${fase}: ${ramaCumplida(criterio, persona.contMalo, persona.contRegular) ?? ''}.`,
        idSubfase: ultima(persona.codigo)?.idSubFase ?? null,
      })
    }
  }
  for (const causal of causalesDe(persona.codigo, hoyIso())) {
    filas.push({
      ...comun,
      id: `CAUSAL_TEORICO:${persona.codigo}:${causal.codigo}:${causal.idMateria ?? ''}`,
      tipo: 'CAUSAL_TEORICO',
      severidad: 'MEDIA',
      fecha: causal.fecha,
      detalle: causal.detalle,
      idMateria: causal.idMateria,
      causal: causal.codigo,
    })
  }
  for (const desaprobado of replayDeResultados().desaprobados.filter((fila) => fila.codPersona === persona.codigo)) {
    filas.push({
      ...comun,
      id: `VUELO_DESAPROBADO:${desaprobado.codigo}`,
      tipo: 'VUELO_DESAPROBADO',
      severidad: 'BAJA',
      fecha: desaprobado.fecha,
      detalle: `Vuelo ${desaprobado.clasificacion} en ${desaprobado.subfase}.`,
      codEvaluacion: desaprobado.codigo,
      idSubfase: desaprobado.idSubfase,
    })
  }
  return filas
}

function gruposDelInstructor(codPersona: string, programa: string): Set<number> {
  const codigos = new Set(
    datos()
      .turnos.filter((turno) => turno.codInstructor === codPersona && turno.programa === programa)
      .flatMap((turno) => turno.alumnos.map((alumno) => alumno.codAlumno)),
  )
  return new Set(
    [...codigos]
      .map((codigo) => datos().personas.find((persona) => persona.codigo === codigo)?.idGrupo)
      .filter((idGrupo): idGrupo is number => idGrupo !== null && idGrupo !== undefined),
  )
}

export const handlersSeguimiento = [
  http.get(`${API}/api/seguimiento/alertas`, ({ request }) => {
    const permitido = autorizar(request, 'View Disapproved')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const programa = (url.searchParams.get('programa') ?? 'PDI').toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
    const todos = permisosDelLlamador(permitido).has('View All Groups')
    const alcance = todos
      ? new Set(datos().grupos.filter((grupo) => grupo.programa === programa).map((grupo) => grupo.id))
      : gruposDelInstructor(permitido.codPersona, programa)
    const idGrupoCrudo = url.searchParams.get('idGrupo')
    if (idGrupoCrudo !== null && idGrupoCrudo !== '') {
      const idGrupo = Number(idGrupoCrudo)
      if (!datos().grupos.some((grupo) => grupo.id === idGrupo)) return textoNoEncontrado(D18_GRUPO_NO_EXISTE)
      if (!alcance.has(idGrupo)) return textoProhibido(D17_GRUPO_FUERA_DE_ALCANCE)
    }
    const tipo = url.searchParams.get('tipo') ?? ''
    const fechaPre = url.searchParams.get('fechaPre') ?? ''
    const fechaPost = url.searchParams.get('fechaPost') ?? ''
    const filas = datos()
      .personas.filter((persona) => persona.tipo === 'Alumno' && persona.idGrupo !== null && alcance.has(persona.idGrupo))
      .flatMap(alertasDe)
      .filter((alerta) => alerta.programa === programa)
      .filter((alerta) => idGrupoCrudo === null || idGrupoCrudo === '' || alerta.idGrupo === Number(idGrupoCrudo))
      .filter((alerta) => tipo === '' || alerta.tipo === tipo || !esTipoConocido(tipo))
      .filter((alerta) => fechaPre === '' || (alerta.fecha ?? '') >= fechaPre)
      .filter((alerta) => fechaPost === '' || (alerta.fecha ?? '') <= fechaPost)
      .toSorted(
        (izquierda, derecha) =>
          ordinalDeSeveridad(izquierda.severidad) - ordinalDeSeveridad(derecha.severidad) ||
          (derecha.fecha ?? '').localeCompare(izquierda.fecha ?? '') ||
          izquierda.id.localeCompare(derecha.id),
      )
    return paginarOrdenado(filas, url, { nombreLista: 'alertas' })
  }),
]
```

Two helpers this module needs and the baseline does not have:

```ts
function permisosDelLlamador(usuario: UsuarioMock): ReadonlySet<Permiso> {
  return permisosDeRol(rolPorId(usuario.idRol)?.nombre ?? '')
}

function esTipoConocido(valor: string): boolean {
  return TIPOS_ALERTA.some((tipo) => tipo.valor === valor)
}
```

with `permisosDeRol`/`Permiso` from `@/lib/auth/permisos`, `rolPorId` and `UsuarioMock` from `./datos`/`./usuarios`, and `TIPOS_ALERTA` from `@/lib/dominio/seguimiento`. The unknown-enum branch is the convention of the whole backend: a value Jackson cannot parse arrives `null` and the filter is simply not applied (contract › Convenciones), so `tipo=NO_EXISTE` returns everything rather than nothing.

`fechaPre`/`fechaPost` compare ISO strings, which is safe because every date on the wire is `yyyy-MM-dd`; an alerta with `fecha: null` is excluded by either filter, which is the only defensible reading of an inclusive range over a missing date.

Register the module in `handlers.ts`, and export `causalesDe` from `estado-teorico.ts` (T6 declared it locally).

- [ ] **Step 3: The reader**

Add to `src/features/seguimiento/api.ts`:

```ts
export type Alerta = {
  id: string
  tipo: string
  severidad: string
  codAlumno: string
  alumno: string
  idGrupo: number | null
  grupo: string
  programa: string
  fecha: string | null
  detalle: string
  codEvaluacion: string | null
  idSubfase: number | null
  idMateria: number | null
  idCuestionario: number | null
  causal: string | null
}

export type FiltrosAlertas = ParametrosPagina & {
  programa: Programa
  idGrupo?: number
  tipo?: string
  fechaPre?: string
  fechaPost?: string
}

export function listarAlertas(filtros: FiltrosAlertas): Promise<Pagina<Alerta>> {
  return sigeda.pagina<Alerta>('/api/seguimiento/alertas', {
    programa: filtros.programa,
    idGrupo: filtros.idGrupo,
    tipo: filtros.tipo,
    fechaPre: filtros.fechaPre,
    fechaPost: filtros.fechaPost,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
}
```

with `alertas: (filtros: FiltrosAlertas) => [...clavesSeguimiento.todo, 'alertas', filtros] as const` and a `queryOptions` carrying `placeholderData: keepPreviousData`. **The frontend never re-sorts the alerts and never parses the `id`**: it uses `id` as the row key and the explicit pointers to link (contract §2.1).

- [ ] **Step 4: Run the tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/seguimiento.test.ts src/features/seguimiento/api.test.ts 2>&1 | tail -8
```

Expected: PASS — 10 in `seguimiento.test.ts` and 2 more in `seguimiento/api.test.ts`.

- [ ] **Step 5: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **951 tests** (939 + 12).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: derive the squadron alerts from the state, the counters and the causales"
```

---
### Task 8: The five screens in the registry, their routes, the search schemas and the seven dependency gates (M5-5, M5-10, M5-19, M5-22)

Owns no acceptance criterion: the four "live mode without its dependency" criteria (CA-SEG-10, CA-ALE-07, CA-LEG-17, CA-REP-08) are claimed by the screens that render the notices. Its tests are tagged `M5-5`, `M5-10`, `M5-19` and `M5-22`. **It also owns the registry assertion `cobertura-de-rutas.test.ts` does not provide** (§17.3): that test runs from the route file inwards, so a `PANTALLAS` entry with no route, or a screen nobody registered, passes it silently.

**Files:**

- Create: `src/features/seguimiento/schemas.ts`
- Create: `src/features/seguimiento/escuadron-page.tsx`
- Create: `src/features/seguimiento/alertas-page.tsx`
- Create: `src/features/seguimiento/legajo-page.tsx`
- Create: `src/features/reportes/reportes-page.tsx`
- Create: `src/routes/_app/seguimiento/index.tsx`, `src/routes/_app/seguimiento/alertas.tsx`, `src/routes/_app/seguimiento/$alumno.tsx`, `src/routes/_app/mi-legajo.tsx`, `src/routes/_app/reportes.tsx`
- Test: `src/lib/auth/rutas-m5.test.tsx`
- Modify: `src/lib/auth/pantallas.ts`
- Modify: `src/lib/auth/pantallas.test.ts`
- Modify: `src/lib/dependencias.ts`
- Modify: `src/lib/dependencias.test.ts`

**Interfaces:**

- Consumes: `esquemaPaginacion`, `numeroOpcional`, `fechaOpcional` (`lib/busqueda`), `PROGRAMAS` (`features/catalogos/api`), `CLASIFICACIONES_FILTRO` (`features/evaluaciones/schemas`), `TIPOS_ALERTA` and the S-texts (`lib/dominio/seguimiento`), `exigirPantalla`/`SinPermisoError` (`lib/auth/guardas`), `AvisoDeDependencia` (T1).
- Produces: `esquemaBusquedaEscuadron`, `esquemaBusquedaAlertas`, `esquemaBusquedaLegajo`, `esquemaBusquedaReportes` and their inferred types; the four placeholder pages; the five routes; `PANTALLAS.escuadron`, `.alertas`, `.legajo`, `.miLegajo`, `.reportes`; the seven keys of `DEPENDENCIAS`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth/rutas-m5.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import {
  TEXTO_ALERTAS_SIN_SERVIDOR,
  TEXTO_INDICES_SOLO_MOCK,
  TEXTO_ORDEN_MERITO_SIN_SERVIDOR,
} from '@/lib/dominio/seguimiento'
import { iniciarComo, renderApp } from '@/test/render'

describe('rutas de seguimiento', () => {
  it('M5-5 el instructor abre el escuadrón, las alertas, un legajo y los reportes', async () => {
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento')
    expect(await screen.findByRole('heading', { level: 1, name: 'Escuadrón' })).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/alertas' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Alertas' })).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/$alumno', params: { alumno: '777777' } })
    expect(await screen.findByRole('heading', { level: 1, name: /Legajo/ })).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })).toBeInTheDocument()
  })

  it('M5-5 M5-19 el jefe de operaciones ve el escuadrón y no las alertas ni los reportes', async () => {
    await iniciarComo('jefe.operaciones')
    const { router } = renderApp('/seguimiento')
    expect(await screen.findByRole('heading', { level: 1, name: 'Escuadrón' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Alertas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reportes y orden de mérito' })).not.toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/alertas' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M5-19 el comandante alcanza las cuatro pantallas de personal', async () => {
    await iniciarComo('comandante.aguirre')
    const { router } = renderApp('/seguimiento/alertas')
    expect(await screen.findByRole('heading', { level: 1, name: 'Alertas' })).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })).toBeInTheDocument()
  })

  it('M5-10 /mi-legajo lleva al alumno a su propio legajo y no ve el escuadrón', async () => {
    await iniciarComo('alumno.ramirez')
    const { router } = renderApp('/mi-legajo')
    await screen.findByRole('heading', { level: 1, name: /Legajo/ })
    expect(router.state.location.pathname).toBe('/seguimiento/777777')
    await router.navigate({ to: '/seguimiento' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M5-10 el alumno no alcanza las alertas ni los reportes y el personal no ve Mi legajo', async () => {
    await iniciarComo('alumno.ramirez')
    const { router } = renderApp('/seguimiento/alertas')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
    await iniciarComo('instructor.perez')
    renderApp('/mi-legajo')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M5-9 el legajo y las alertas cuelgan del escuadrón en las migas', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/seguimiento/alertas')
    await screen.findByRole('heading', { level: 1, name: 'Alertas' })
    const migas = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(migas.getByRole('link', { name: 'Escuadrón' })).toHaveAttribute('href', '/seguimiento')
    expect(migas.getByText('Alertas')).toBeInTheDocument()
  })

  it('M5-22 en modo mock ninguna pantalla muestra un aviso de dependencia', async () => {
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento/alertas')
    await screen.findByRole('heading', { level: 1, name: 'Alertas' })
    expect(screen.queryByText(TEXTO_ALERTAS_SIN_SERVIDOR)).not.toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })
    expect(screen.queryByText(TEXTO_ORDEN_MERITO_SIN_SERVIDOR)).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_INDICES_SOLO_MOCK)).not.toBeInTheDocument()
  })

  it('M5-22 fuera del modo mock cada pantalla muestra el aviso de su dependencia', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento/alertas')
    await screen.findByRole('heading', { level: 1, name: 'Alertas' })
    expect(screen.getByText(TEXTO_ALERTAS_SIN_SERVIDOR)).toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })
    expect(screen.getByText(TEXTO_INDICES_SOLO_MOCK)).toBeInTheDocument()
    expect(screen.getByText(TEXTO_ORDEN_MERITO_SIN_SERVIDOR)).toBeInTheDocument()
    await router.navigate({ to: '/seguimiento/$alumno', params: { alumno: '777777' } })
    await screen.findByRole('heading', { level: 1, name: /Legajo/ })
    expect(screen.getByText(TEXTO_INDICES_SOLO_MOCK)).toBeInTheDocument()
  })

  it('M5-22 con las dependencias resueltas los avisos desaparecen', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '6,61,62,63,66')
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/seguimiento/alertas')
    await screen.findByRole('heading', { level: 1, name: 'Alertas' })
    expect(screen.queryByText(TEXTO_ALERTAS_SIN_SERVIDOR)).not.toBeInTheDocument()
    await router.navigate({ to: '/reportes' })
    await screen.findByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })
    expect(screen.queryByText(TEXTO_ORDEN_MERITO_SIN_SERVIDOR)).not.toBeInTheDocument()
  })
})
```

Add to `src/lib/dependencias.test.ts`:

```ts
  it('M5-22 las siete puertas de seguimiento esperan los números de la spec', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    expect(dependenciasPendientes('verIndices')).toEqual([61, 62])
    expect(dependenciasPendientes('verOrdenMerito')).toEqual([6, 62, 63])
    expect(dependenciasPendientes('verAlertas')).toEqual([66])
    expect(dependenciasPendientes('verCicloChequeo')).toEqual([64, 65])
    expect(dependenciasPendientes('verHistorialTeorico')).toEqual([6, 67])
    expect(dependenciasPendientes('verCausalesTeoricos')).toEqual([7, 68])
    expect(dependenciasPendientes('verBloqueoTeoricoLote')).toEqual([7, 56])
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '6,7,56,61,62,63,64,65,66,67,68')
    for (const accion of [
      'verIndices',
      'verOrdenMerito',
      'verAlertas',
      'verCicloChequeo',
      'verHistorialTeorico',
      'verCausalesTeoricos',
      'verBloqueoTeoricoLote',
    ] as const) {
      expect(accionDisponible(accion)).toBe(true)
    }
  })
```

Add to `src/lib/auth/pantallas.test.ts` (and amend the three menu expectations as Step 6 says):

```ts
  it('M5-10 las cinco pantallas de M5 están registradas tal como §17.3 las declara', () => {
    expect(
      [PANTALLAS.escuadron, PANTALLAS.alertas, PANTALLAS.legajo, PANTALLAS.miLegajo, PANTALLAS.reportes].map(
        (pantalla) => [pantalla.ruta, pantalla.permiso, pantalla.roles, pantalla.padre, pantalla.enMenu, pantalla.grupo],
      ),
    ).toEqual([
      ['/seguimiento', 'View My Group', undefined, undefined, true, 'Seguimiento'],
      ['/seguimiento/alertas', 'View Disapproved', undefined, '/seguimiento', true, 'Seguimiento'],
      ['/seguimiento/$alumno', 'Read', undefined, '/seguimiento', false, 'Seguimiento'],
      ['/mi-legajo', 'Read', ['Alumno'], undefined, true, 'Seguimiento'],
      ['/reportes', 'Create Reports', undefined, undefined, true, 'Seguimiento'],
    ])
  })

  it('M5-9 arma las migas de las pantallas de seguimiento', () => {
    expect(migasPara('/seguimiento/$alumno', perfilDe('Instructor'), false)).toEqual([
      PANTALLAS.escuadron,
      PANTALLAS.legajo,
    ])
    expect(migasPara('/seguimiento/alertas', perfilDe('Comandante de Escuadrón'), false)).toEqual([
      PANTALLAS.escuadron,
      PANTALLAS.alertas,
    ])
    expect(migasPara('/seguimiento/$alumno', perfilDe('Alumno'), false)).toEqual([PANTALLAS.legajo])
  })
```

The third assertion of the migas test is the one that matters for `/mi-legajo`: the Alumno cannot open `/seguimiento`, so his breadcrumb is the legajo alone — `migasPara` already drops an ancestor the role cannot see (`pantallas.ts:545-556`).

- [ ] **Step 2: The four search schemas**

Create `src/features/seguimiento/schemas.ts`:

```ts
import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { CLASIFICACIONES_FILTRO } from '@/features/evaluaciones/schemas'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { TIPOS_ALERTA } from '@/lib/dominio/seguimiento'

export const esquemaBusquedaEscuadron = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idGrupo: numeroOpcional,
  estado: z.string().trim().min(1).optional().catch(undefined),
  texto: z.string().trim().min(1).optional().catch(undefined),
})

export const esquemaBusquedaAlertas = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idGrupo: numeroOpcional,
  tipo: z
    .enum(TIPOS_ALERTA.map((tipo) => tipo.valor))
    .optional()
    .catch(undefined),
  fechaPre: fechaOpcional,
  fechaPost: fechaOpcional,
})

export const PESTANAS = ['resumen', 'practico', 'teorico'] as const

export const esquemaBusquedaLegajo = z.object({
  tab: z.enum(PESTANAS).default('resumen').catch('resumen'),
  idSubfase: numeroOpcional,
  clasificacion: z.enum(CLASIFICACIONES_FILTRO).optional().catch(undefined),
  page: esquemaPaginacion.page,
  size: esquemaPaginacion.size,
})

export const esquemaBusquedaReportes = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idGrupo: numeroOpcional,
})

export type BusquedaEscuadron = z.infer<typeof esquemaBusquedaEscuadron>
export type BusquedaAlertas = z.infer<typeof esquemaBusquedaAlertas>
export type BusquedaLegajo = z.infer<typeof esquemaBusquedaLegajo>
export type BusquedaReportes = z.infer<typeof esquemaBusquedaReportes>
export type Pestana = (typeof PESTANAS)[number]
```

`estado` is a free string rather than a `z.enum` over `ESTADOS_ALUMNO`, because the seed itself stores a value the enum does not have (`'Chequeo'` in an evaluation, contract › Enumeraciones) and a filter that silently drops an unknown state would hide rows; the select offers the seven known ones and `filtrarAlumnos` compares by equality. The legajo carries no `property`/`direction`: its only sortable list is the practical history, which the server orders by its own default.

- [ ] **Step 3: The seven dependency gates (M5-22)**

In `src/lib/dependencias.ts`, add to `DEPENDENCIAS`:

```ts
  verIndices: [61, 62],
  verOrdenMerito: [6, 62, 63],
  verAlertas: [66],
  verCicloChequeo: [64, 65],
  verHistorialTeorico: [6, 67],
  verCausalesTeoricos: [7, 68],
  verBloqueoTeoricoLote: [7, 56],
```

`verOrdenMerito` carries **6** because without the theory half no row has an NFPI and the screen would be a table of blanks (M5-22). M5 has no writes, so nothing here needs `MENSAJE_DEPENDENCIA_PENDIENTE`: every gate resolves to a panel notice, not to a disabled button.

- [ ] **Step 4: The five registry entries**

In `src/lib/auth/pantallas.ts`, add `IdCard`, `FolderOpen`, `TriangleAlert` and `Trophy` to the `lucide-react` import (`UsersRound` is already there) and the five entries after `resultadoExamen`:

```ts
  escuadron: {
    ruta: '/seguimiento',
    titulo: 'Escuadrón',
    descripcion: 'Alumnos del programa con su grupo, su estado y su situación teórica.',
    grupo: 'Seguimiento',
    icono: UsersRound,
    permiso: 'View My Group',
    enMenu: true,
  },
  alertas: {
    ruta: '/seguimiento/alertas',
    titulo: 'Alertas',
    descripcion: 'Situaciones abiertas de los alumnos que usted ve, por severidad.',
    grupo: 'Seguimiento',
    icono: TriangleAlert,
    permiso: 'View Disapproved',
    padre: '/seguimiento',
    enMenu: true,
  },
  legajo: {
    ruta: '/seguimiento/$alumno',
    titulo: 'Legajo del alumno',
    descripcion: 'Historial práctico y teórico del alumno con sus índices y su ciclo de chequeo.',
    grupo: 'Seguimiento',
    icono: IdCard,
    permiso: 'Read',
    padre: '/seguimiento',
    enMenu: false,
  },
  miLegajo: {
    ruta: '/mi-legajo',
    titulo: 'Mi legajo',
    descripcion: 'Su historial de instrucción, sus índices y su situación teórica.',
    grupo: 'Seguimiento',
    icono: FolderOpen,
    permiso: 'Read',
    roles: SOLO_ALUMNO,
    enMenu: true,
  },
  reportes: {
    ruta: '/reportes',
    titulo: 'Reportes y orden de mérito',
    descripcion: 'Orden de mérito del programa sobre el NFPI de cada alumno.',
    grupo: 'Seguimiento',
    icono: Trophy,
    permiso: 'Create Reports',
    enMenu: true,
  },
```

Only `/mi-legajo` declares `roles`, and only because every other role holds `Read` too; the other four are limited by their permission alone, which is §16.3's rule carried forward (§17.3). `/seguimiento/$alumno` deliberately declares **no** `roles`: the Alumno must reach it, and what restricts him is the loader of T18.

- [ ] **Step 5: The four placeholder pages and the five routes**

Each page is a heading plus its dependency notice; every later task fills one of them. `src/features/seguimiento/escuadron-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function EscuadronPage() {
  return <PageHeader titulo={PANTALLAS.escuadron.titulo} descripcion={PANTALLAS.escuadron.descripcion} />
}
```

`alertas-page.tsx` adds `<AvisoDeDependencia accion="verAlertas" texto={TEXTO_ALERTAS_SIN_SERVIDOR} />`; `legajo-page.tsx` takes `{ codAlumno }: { codAlumno: string }`, titles itself `Legajo del alumno` and shows `<AvisoDeDependencia accion="verIndices" texto={TEXTO_INDICES_SOLO_MOCK} />`; `reportes-page.tsx` shows both `<AvisoDeDependencia accion="verOrdenMerito" texto={TEXTO_INDICES_SOLO_MOCK} />` and `<AvisoDeDependencia accion="verOrdenMerito" texto={TEXTO_ORDEN_MERITO_SIN_SERVIDOR} />`. **Escuadrón shows no page-level notice at all**, because CA-SEG-10 asks for the opposite: without dependency 56 the theory column is not requested and the rest of the screen works.

The five routes. `src/routes/_app/seguimiento/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { EscuadronPage } from '@/features/seguimiento/escuadron-page'
import { esquemaBusquedaEscuadron } from '@/features/seguimiento/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/seguimiento/')({
  validateSearch: esquemaBusquedaEscuadron,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.escuadron, context.sesion.actual()),
  component: EscuadronPage,
})
```

`alertas.tsx` and `reportes.tsx` follow it with their own schema and screen. `$alumno.tsx` passes the param down:

```tsx
export const Route = createFileRoute('/_app/seguimiento/$alumno')({
  validateSearch: esquemaBusquedaLegajo,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.legajo, context.sesion.actual()),
  component: RutaLegajo,
})

function RutaLegajo() {
  const { alumno } = Route.useParams()
  return <LegajoPage codAlumno={alumno} />
}
```

and `mi-legajo.tsx` is a redirect with no component, following `src/routes/_app/turnos/dia/index.tsx`:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { exigirPantalla, SinPermisoError } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mi-legajo')({
  beforeLoad: ({ context }) => {
    exigirPantalla(PANTALLAS.miLegajo, context.sesion.actual())
    const codPersona = context.sesion.actual()?.codPersona
    if (!codPersona) throw new SinPermisoError()
    throw redirect({ to: '/seguimiento/$alumno', params: { alumno: codPersona } })
  },
})
```

**The redirect takes the code from the session and never from the URL** — `/mi-legajo` has no search params and no path params, so there is nothing to take it from (M5-10). T18 adds the other half: the loader of `/seguimiento/$alumno` that rejects a foreign code for an Alumno.

- [ ] **Step 6: The three baseline menu expectations**

In `src/lib/auth/pantallas.test.ts`:

| Test | Change |
|---|---|
| `CA-TUR-14 el alumno ve Mis turnos y Mis evaluaciones…` | insert `'Mi legajo'` after `'Mis exámenes'` and before `'Documentos'` |
| `el personal ve la programación de turnos…` (Instructor) | insert `'Escuadrón'`, `'Alertas'` and `'Reportes y orden de mérito'` after `'Turnos teóricos'` and before `'Documentos'` |
| `M2-12 el menú agrupa las pantallas de M2…` | insert `'Seguimiento'` between `'Teoría'` and `'Aprendizaje'` in the group list |

`ORDEN_GRUPOS` already declares `Seguimiento` between `Teoría` and `Aprendizaje` (`pantallas.ts:40,50`), so the group appears in that position with no change to the ordering.

- [ ] **Step 7: Regenerate the route tree, then run the tests**

`RutaApp` comes from `src/routeTree.gen.ts`, which the router plugin writes during `vite build`: **`tsc -b` rejects the five new `PANTALLAS` routes until the build has run once.**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build >/dev/null && pnpm test:run src/lib/auth src/lib/dependencias.test.ts 2>&1 | tail -8
```

Expected: PASS, with `cobertura-de-rutas.test.ts` still green — it now checks five more routes, each of which guards its own screen.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **963 tests** (951 + 9 in `rutas-m5.test.tsx` + 1 in `dependencias.test.ts` + 2 in `pantallas.test.ts`; the three amended menu expectations add none).

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: register the five seguimiento screens with their routes and dependency gates"
```

---
### Task 9: Escuadrón: the list, its columns, the browser's paging and ordering, and the row's link (M5-6) (CA-SEG-01, CA-SEG-04, CA-SEG-05, CA-SEG-08)

**Files:**

- Modify: `src/features/seguimiento/escuadron-page.tsx`
- Create: `src/features/seguimiento/columnas.tsx`
- Test: `src/features/seguimiento/escuadron-page.test.tsx`

**Interfaces:**

- Consumes: `consultasSeguimiento.alumnos` and `paginarAlumnos`/`fuenteDeSeguimiento` (T2), `etiquetaDeGrupo` (T1), `DataTable`, `EmptyState`, `PageHeader`, `StatusBadge`, `Enlace`, `useSesion`, `errorDePrimeraCarga`, `ayudanteDeColumnas`.
- Produces: `COLUMNAS_ESCUADRON` and the filled `EscuadronPage` list (the filters arrive in T10 and the summary in T11).

- [ ] **Step 1: Write the failing tests**

Create `src/features/seguimiento/escuadron-page.test.tsx`:

```tsx
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_SIN_GRUPO } from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const API = config.sigedaApiUrl

async function abrirEscuadron(ruta = '/seguimiento', username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('table', { name: 'Alumnos del escuadrón' })
  return vista
}

async function reabrir(ruta: string, username: string) {
  cleanup()
  await iniciarComo(username)
  return renderApp(ruta)
}

function filas() {
  return within(screen.getByRole('table', { name: 'Alumnos del escuadrón' }))
    .getAllByRole('row')
    .slice(1)
}

function celdas(indice: number) {
  return within(filas()[indice]!)
    .getAllByRole('cell')
    .map((celda) => celda.textContent?.trim() ?? '')
}

describe('Escuadrón', () => {
  it('CA-SEG-01 muestra código, alumno, grupo y estado de cada alumno', async () => {
    await abrirEscuadron()
    const tabla = within(screen.getByRole('table', { name: 'Alumnos del escuadrón' }))
    for (const columna of ['Código', 'Alumno', 'Grupo', 'Estado']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(filas()).toHaveLength(6)
    const fila = within(tabla.getByRole('link', { name: '777777' }).closest('tr') as HTMLElement)
    expect(fila.getByText('Carlos Ramirez Sanchez')).toBeInTheDocument()
    expect(fila.getByText('Grupo 4')).toBeInTheDocument()
    expect(fila.getByText('En chequeo')).toBeInTheDocument()
  })

  it('CA-SEG-01 pagina de 10 en 10 en el navegador, sin volver a pedir el catálogo', async () => {
    const { router, usuario } = await abrirEscuadron('/seguimiento?size=2')
    expect(router.state.location.search).toMatchObject({ size: 2, page: 0 })
    expect(screen.getByText('Página 1 de 3 · 6 registros')).toBeInTheDocument()
    let pedidos = 0
    const contar = () => {
      pedidos += 1
    }
    server.events.on('request:start', contar)
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1 }))
    expect(screen.getByText('Página 2 de 3 · 6 registros')).toBeInTheDocument()
    server.events.removeListener('request:start', contar)
    expect(pedidos).toBe(0)
  })

  it('CA-SEG-01 el orden lo resuelve el navegador y viaja en la URL', async () => {
    const { router, usuario } = await abrirEscuadron()
    expect(celdas(0)[0]).toBe('111111')
    await usuario.click(screen.getByRole('button', { name: 'Código' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ property: 'codigo', direction: 'ASC' }))
    await usuario.click(screen.getByRole('button', { name: 'Código' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ direction: 'DESC' }))
    await waitFor(() => expect(celdas(0)[0]).toBe('999999'))
  })

  it('CA-SEG-04 el grupo se muestra con S4 desde el idGrupo y un alumno sin grupo con S3', async () => {
    server.use(
      http.get(`${API}/api/grupos/programa/:nombre`, () =>
        HttpResponse.json({
          content: [
            {
              personas: [
                { codigo: '654321', nombre: 'Lucía', aPaterno: 'Mendoza', aMaterno: 'Ríos', idGrupo: null, estado: 'Apto' },
                { codigo: '999999', nombre: 'Luis', aPaterno: 'Diaz', aMaterno: 'Castro', idGrupo: 6, estado: 'Apto' },
              ],
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      ),
    )
    await abrirEscuadron()
    expect(celdas(0)).toContain(TEXTO_SIN_GRUPO)
    expect(celdas(1)).toContain('Grupo 6')
  })

  it('CA-SEG-04 la etiqueta del grupo 6 es la derivada del id, no el nombre real del grupo', async () => {
    await abrirEscuadron()
    const fila = within(screen.getByRole('link', { name: '999999' }).closest('tr') as HTMLElement)
    expect(fila.getByText('Grupo 6')).toBeInTheDocument()
    expect(fila.queryByText('Promoción 2026-A')).not.toBeInTheDocument()
  })

  it('CA-SEG-05 cada alumno aparece una sola vez y el total cuenta alumnos, no filas del servidor', async () => {
    await abrirEscuadron('/seguimiento', 'instructor.perez')
    expect(screen.getByText('Página 1 de 1 · 4 registros')).toBeInTheDocument()
    expect(filas()).toHaveLength(4)
    expect(screen.getAllByRole('link', { name: '111111' })).toHaveLength(1)
  })

  it('CA-SEG-08 cada fila abre el legajo del alumno', async () => {
    await abrirEscuadron()
    expect(screen.getByRole('link', { name: '777777' })).toHaveAttribute('href', '/seguimiento/777777')
    expect(screen.getByRole('link', { name: '111111' })).toHaveAttribute('href', '/seguimiento/111111')
  })
})
```

The second test is the one that proves M5-6's central claim: **the paging is the browser's.** Six alumnos with `size=2` give three pages, and changing page fires **zero** requests because the query key does not move — the catalogue was fetched once and `paginarAlumnos` slices it. The sixth test proves the other half: the instructor's catalogue returns six `alumnos_turno` rows and the screen shows four alumnos with a total of four.

- [ ] **Step 2: `src/features/seguimiento/columnas.tsx`**

```tsx
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { etiquetaDeGrupo } from '@/lib/dominio/seguimiento'
import type { AlumnoSeguimiento } from './api'

const ayudante = ayudanteDeColumnas<AlumnoSeguimiento>()

export const COLUMNAS_ESCUADRON = ayudante.columns([
  ayudante.accessor('codigo', {
    header: 'Código',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/seguimiento/$alumno" params={{ alumno: contexto.getValue() }} className="tabular-nums">
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('nombreCompleto', {
    header: 'Alumno',
    enableSorting: true,
    cell: (contexto) => (
      <span className="block max-w-[18rem] truncate" title={contexto.getValue()}>
        {contexto.getValue()}
      </span>
    ),
  }),
  ayudante.accessor('idGrupo', {
    header: 'Grupo',
    enableSorting: true,
    cell: (contexto) => etiquetaDeGrupo(contexto.getValue()),
  }),
  ayudante.accessor('estado', {
    header: 'Estado',
    enableSorting: true,
    cell: (contexto) => <StatusBadge vocabulario="estado" valor={contexto.getValue()} />,
  }),
])
```

The name truncates with its `title`, which is the rule M4's fix wave settled: long text never widens the table and never wraps a row (the 133 px regression).

- [ ] **Step 3: The list**

Replace `src/features/seguimiento/escuadron-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { TEXTO_SIN_ALUMNOS_EN_PROGRAMA } from '@/lib/dominio/seguimiento'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasSeguimiento, fuenteDeSeguimiento, paginarAlumnos } from './api'
import { COLUMNAS_ESCUADRON } from './columnas'

const ruta = getRouteApi('/_app/seguimiento/')

export function EscuadronPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const actual = useSesion()
  const fuente = actual === null ? null : fuenteDeSeguimiento(actual.permisos)
  const alumnos = useQuery({
    ...consultasSeguimiento.alumnos(fuente ?? 'instructor', busqueda.programa, actual?.codPersona ?? null),
    enabled: fuente !== null,
  })
  const error = errorDePrimeraCarga(alumnos)
  const pagina = alumnos.data === undefined ? undefined : paginarAlumnos(alumnos.data, busqueda)

  return (
    <>
      <PageHeader titulo={PANTALLAS.escuadron.titulo} descripcion={PANTALLAS.escuadron.descripcion} />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void alumnos.refetch()} />
      ) : (
        <DataTable
          etiqueta="Alumnos del escuadrón"
          columnas={COLUMNAS_ESCUADRON}
          pagina={pagina}
          cargando={alumnos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(alumno) => alumno.codigo}
          vacio={<EmptyState titulo="No hay alumnos" descripcion={TEXTO_SIN_ALUMNOS_EN_PROGRAMA} />}
        />
      )}
    </>
  )
}
```

`pagina` is `undefined` while the catalogue loads, which is what makes `DataTable` render its skeleton rows instead of an empty state; once the data is there, **every page change is a pure slice of a list already in the cache**.

- [ ] **Step 4: Run the tests, the gate and commit**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/escuadron-page.test.tsx && pnpm verify
```

Expected: 7 new tests, gate green, **970 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: list the squadron's alumnos with browser paging and ordering"
```

---

### Task 10: Escuadrón: the filters, the URL state, the 300 ms debounce and the two empty states (M5-6, M5-23) (CA-SEG-02, CA-SEG-03, CA-SEG-09)

**Files:**

- Modify: `src/features/seguimiento/escuadron-page.tsx`
- Create: `src/features/seguimiento/components/filtros-escuadron.tsx`
- Modify: `src/features/seguimiento/escuadron-page.test.tsx`

**Interfaces:**

- Consumes: `useAccionRetardada`/`MILISEGUNDOS_DE_REBOTE` (T1), `consultasCatalogos` is **not** used — the grupo select is built from the alumnos already fetched, so the screen adds no request; `ESTADOS_ALUMNO` (`lib/dominio/vocabulario`), `PROGRAMAS`, `relojFalso` in the tests.
- Produces: `FiltrosEscuadron` (the component), the debounced `texto` field and the S2/S6 empty states.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/seguimiento/escuadron-page.test.tsx`:

```tsx
describe('Escuadrón: filtros', () => {
  it('CA-SEG-02 el programa se envía al servidor y elige el catálogo', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    const { usuario, router } = await abrirEscuadron()
    await usuario.selectOptions(screen.getByLabelText('Programa'), 'PDE')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ programa: 'PDE' }))
    await waitFor(() => expect(pedidas.filter((ruta) => ruta === '/api/grupos/programa/PDE')).toHaveLength(1))
    server.events.removeAllListeners('request:start')
    expect(pedidas.filter((ruta) => ruta === '/api/grupos/programa/PDI')).toHaveLength(1)
  })

  it('CA-SEG-02 grupo, estado y texto se aplican en el navegador y quedan en la URL', async () => {
    const { usuario, router } = await abrirEscuadron()
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 3 }))
    expect(screen.getByText('Página 1 de 1 · 2 registros')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Estado'), 'Apto')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 3, estado: 'Apto' }))
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(screen.getByText('Página 1 de 1 · 6 registros')).toBeInTheDocument())
    expect(router.state.location.search).not.toHaveProperty('idGrupo')
  })

  it('CA-SEG-02 el filtro de texto espera 300 ms tras la última tecla antes de navegar', async () => {
    const { usuario, avanzar } = relojFalso()
    await iniciarComo('comandante.aguirre')
    const { router } = renderApp('/seguimiento', usuario)
    await screen.findByRole('table', { name: 'Alumnos del escuadrón' })
    await usuario.type(screen.getByLabelText('Alumno'), 'ram')
    expect(router.state.location.search).not.toHaveProperty('texto')
    await avanzar(1_000)
    await waitFor(() => expect(router.state.location.search).toMatchObject({ texto: 'ram' }))
    await waitFor(() =>
      expect(within(screen.getByRole('table', { name: 'Alumnos del escuadrón' })).getAllByRole('row')).toHaveLength(2),
    )
  })

  it('CA-SEG-02 una URL mal escrita vuelve a los valores por defecto', async () => {
    await iniciarComo('comandante.aguirre')
    const { router } = renderApp('/seguimiento?page=-1&size=0&programa=XX&idGrupo=cero&direction=NO')
    await screen.findByRole('table', { name: 'Alumnos del escuadrón' })
    expect(router.state.location.search).toEqual({ page: 0, size: 10, direction: 'ASC', programa: 'PDI' })
  })

  it('CA-SEG-03 con View All Groups trae los alumnos de todos los grupos del programa', async () => {
    await abrirEscuadron()
    expect(filas()).toHaveLength(6)
    expect(screen.getByRole('link', { name: '777777' })).toBeInTheDocument()
  })

  it('CA-SEG-03 sin View All Groups solo los alumnos con los que voló, y sin ninguno muestra S2', async () => {
    await abrirEscuadron('/seguimiento', 'instructor.perez')
    expect(filas()).toHaveLength(4)
    expect(screen.queryByRole('link', { name: '777777' })).not.toBeInTheDocument()
    await reabrir('/seguimiento', 'jefe.operaciones')
    expect(await screen.findByText(TEXTO_SIN_ALUMNOS_ASIGNADOS)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Alumnos del escuadrón' })).not.toBeInTheDocument()
  })

  it('CA-SEG-03 un programa sin alumnos muestra S6', async () => {
    await abrirEscuadron('/seguimiento?programa=PDE')
    expect(await screen.findByText(TEXTO_SIN_ALUMNOS_EN_PROGRAMA)).toBeInTheDocument()
  })

  it('CA-SEG-09 un fallo en la primera carga muestra el aviso con Reintentar, no una lista vacía', async () => {
    server.use(http.get(`${API}/api/grupos/programa/:nombre`, () => HttpResponse.error()))
    await iniciarComo('comandante.aguirre')
    const { usuario } = renderApp('/seguimiento')
    expect(await screen.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Alumnos del escuadrón' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALUMNOS_EN_PROGRAMA)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Alumnos del escuadrón' })).toBeInTheDocument()
  })
})
```

with `MENSAJE_SIN_CONEXION` from `@/lib/api/errors`, `relojFalso` from `@/test/tiempo` and `TEXTO_SIN_ALUMNOS_ASIGNADOS`, `TEXTO_SIN_ALUMNOS_EN_PROGRAMA` from the domain module added to the file's imports.

The third test drives the debounce through the real screen rather than the hook: no navigation before the clock moves, one navigation after it, and the filtered table afterwards. `relojFalso()` returns the `usuario` that `renderApp` must be given, because a `userEvent` built without `advanceTimers` deadlocks under fake timers.

The S2/S6 distinction is the point of the sixth and seventh tests: **an instructor with no alumnos is not the same fact as a programa with none**, and §17.3 gives each its own sentence.

- [ ] **Step 2: The filter bar**

Create `src/features/seguimiento/components/filtros-escuadron.tsx` with a `<section aria-label="Filtros">` holding five controls, following `banco-page.tsx:102-191` cell for cell: a `NativeSelect` for **Programa** (`PROGRAMAS`), one for **Grupo** (the distinct `idGrupo` values of the alumnos already fetched, labelled with `etiquetaDeGrupo`), one for **Estado** (`Object.keys(ESTADOS_ALUMNO)` with `termino('estado', valor).etiqueta` as the label), an `Input` for **Alumno** and a ghost `Limpiar filtros` button disabled when no filter is set. Two rules it must respect:

```tsx
const [texto, setTexto] = useState(busqueda.texto ?? '')
const navegarConTexto = useAccionRetardada((valor: string) => cambiar({ texto: valor.trim() === '' ? undefined : valor }), MILISEGUNDOS_DE_REBOTE)
```

- the input is **local state** plus a debounced navigation, so the field never loses a keystroke and the URL never changes mid-word;
- the grupo select is derived from the alumnos in hand, so the screen still makes exactly one request per programa — no catalogue call is added for a filter whose values are already on screen.

`cambiar` resets `page` to 0 for every filter change, as `banco-page.tsx:78-80` does.

- [ ] **Step 3: Wire the filters and the two empty states**

In `escuadron-page.tsx`, render `<FiltrosEscuadron busqueda={busqueda} alumnos={alumnos.data ?? []} alCambiar={cambiar} />` between the header and the table, and choose the empty state by **why** the list is empty:

```tsx
const sinCatalogo = (alumnos.data ?? []).length === 0
const vacio =
  sinCatalogo && fuente === 'instructor' ? (
    <EmptyState titulo="No tiene alumnos asignados" descripcion={TEXTO_SIN_ALUMNOS_ASIGNADOS} />
  ) : sinCatalogo ? (
    <EmptyState titulo="No hay alumnos" descripcion={TEXTO_SIN_ALUMNOS_EN_PROGRAMA} />
  ) : (
    <EmptyState titulo="Ningún alumno coincide" descripcion="Ningún alumno coincide con los filtros." />
  )
```

so a filtered-to-nothing list says so instead of claiming the programa is empty, and **only the notice renders — never a headers-only table beside it**, which is `DataTable`'s own behaviour when `items` is empty.

- [ ] **Step 4: Run the tests, the gate and commit**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/escuadron-page.test.tsx && pnpm verify
```

Expected: 8 new tests (15 in the file), gate green, **978 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: filter the squadron in the browser with a debounced name search"
```

---
### Task 11: Escuadrón: the estado summary, the S28 marker, the theory-block column and its gate (M5-16, M5-24) (CA-SEG-06, CA-SEG-07, CA-SEG-10, CA-SEG-11)

**Files:**

- Modify: `src/features/seguimiento/escuadron-page.tsx`
- Modify: `src/features/seguimiento/columnas.tsx`
- Create: `src/features/seguimiento/components/resumen-de-estados.tsx`
- Modify: `src/features/seguimiento/escuadron-page.test.tsx`

**Interfaces:**

- Consumes: `resumirEstados`, `requiereAtencion`, `TEXTO_REQUIERE_ATENCION`, `TEXTO_ESTADO_TEORICO_EN_LOTE` (T1), `consultasSeguimiento.estadoTeorico` (T2), `accionDisponible` (T8's gate `verBloqueoTeoricoLote`), `termino`/`CLASES_TONO`, `StatusBadge`.
- Produces: `ResumenDeEstados`, `columnasEscuadron(opciones)` replacing the constant `COLUMNAS_ESCUADRON`, and the theory column with its single S5 notice.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/seguimiento/escuadron-page.test.tsx`:

```tsx
describe('Escuadrón: estado y situación teórica', () => {
  it('CA-SEG-06 cada estado se muestra con su etiqueta y su tono', async () => {
    await abrirEscuadron()
    const fila = within(screen.getByRole('link', { name: '777777' }).closest('tr') as HTMLElement)
    const insignia = fila.getByText('En chequeo')
    expect(insignia).toHaveAttribute('data-tono', 'alerta')
    const apto = within(screen.getByRole('link', { name: '111111' }).closest('tr') as HTMLElement).getByText('Apto')
    expect(apto).toHaveAttribute('data-tono', 'exito')
  })

  it('CA-SEG-06 el encabezado resume cuántos alumnos hay en cada estado de la lista', async () => {
    const { usuario, router } = await abrirEscuadron()
    const resumen = within(screen.getByRole('region', { name: 'Resumen por estado' }))
    expect(resumen.getByText('Apto: 5')).toBeInTheDocument()
    expect(resumen.getByText('En chequeo: 1')).toBeInTheDocument()
    expect(resumen.queryByText(/No apto/)).not.toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '4')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 4 }))
    await waitFor(() => expect(resumen.getByText('En chequeo: 1')).toBeInTheDocument())
    expect(resumen.queryByText(/^Apto:/)).not.toBeInTheDocument()
  })

  it('CA-SEG-07 la columna de estado teórico marca al alumno bloqueado por subsanación', async () => {
    await abrirEscuadron()
    const tabla = within(screen.getByRole('table', { name: 'Alumnos del escuadrón' }))
    expect(tabla.getByText('Estado teórico')).toBeInTheDocument()
    const bloqueado = within(screen.getByRole('link', { name: '666666' }).closest('tr') as HTMLElement)
    expect(await bloqueado.findByText('Subsanación pendiente')).toBeInTheDocument()
    const libre = within(screen.getByRole('link', { name: '111111' }).closest('tr') as HTMLElement)
    expect(libre.queryByText('Subsanación pendiente')).not.toBeInTheDocument()
  })

  it('CA-SEG-07 si la consulta en lote falla la columna muestra S5 y ninguna fila se oculta', async () => {
    server.use(http.get(`${API}/api/estado-teorico`, () => HttpResponse.error()))
    await abrirEscuadron()
    expect(await screen.findByText(TEXTO_ESTADO_TEORICO_EN_LOTE)).toBeInTheDocument()
    expect(filas()).toHaveLength(6)
    expect(screen.queryByText('Subsanación pendiente')).not.toBeInTheDocument()
  })

  it('CA-SEG-10 fuera del modo mock y sin la dependencia 56 la columna no se pide ni se muestra', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await abrirEscuadron()
    server.events.removeAllListeners('request:start')
    expect(pedidas).not.toContain('/api/estado-teorico')
    expect(screen.queryByText('Estado teórico')).not.toBeInTheDocument()
    expect(filas()).toHaveLength(6)
    expect(screen.getByText('Apto: 5')).toBeInTheDocument()
  })

  it('CA-SEG-11 toda fila cuyo estado no sea Apto se marca con S28', async () => {
    await abrirEscuadron()
    const marcadas = screen.getAllByText(TEXTO_REQUIERE_ATENCION)
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]?.closest('tr')).toContainElement(screen.getByRole('link', { name: '777777' }))
  })

  it('CA-SEG-11 la marca sale del dato que ya trae la lista, sin ninguna petición adicional', async () => {
    server.use(
      http.get(`${API}/api/grupos/programa/:nombre`, () =>
        HttpResponse.json({
          content: [
            {
              personas: [
                { codigo: '111111', nombre: 'Oscar', aPaterno: 'Lopez', aMaterno: 'Chaparro', idGrupo: 1, estado: 'No Apto' },
                { codigo: '222222', nombre: 'Juan', aPaterno: 'Falconi', aMaterno: 'Fernandez', idGrupo: 2, estado: 'Apto' },
              ],
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      ),
    )
    await abrirEscuadron()
    expect(screen.getAllByText(TEXTO_REQUIERE_ATENCION)).toHaveLength(1)
    expect(screen.getByText('No apto')).toHaveAttribute('data-tono', 'peligro')
  })
})
```

The fifth test pins the whole of CA-SEG-10: **zero requests** to the bulk endpoint, no column, and the rest of the screen — rows and summary — untouched. The last one is the cheapest honest thing in the milestone made falsifiable: the marker is driven by a fabricated `estado` on the catalogue row, with no other endpoint in play.

- [ ] **Step 2: The summary**

Create `src/features/seguimiento/components/resumen-de-estados.tsx`:

```tsx
import { StatusBadge } from '@/components/status-badge'
import { resumirEstados } from '@/lib/dominio/seguimiento'
import { termino } from '@/lib/dominio/vocabulario'
import type { AlumnoSeguimiento } from '../api'

export function ResumenDeEstados({ alumnos }: { alumnos: readonly AlumnoSeguimiento[] }) {
  const resumen = resumirEstados(alumnos.map((alumno) => alumno.estado))
  if (resumen.length === 0) return null
  return (
    <section aria-label="Resumen por estado" className="flex flex-wrap items-center gap-2 text-sm">
      {resumen.map((fila) => (
        <StatusBadge
          key={fila.estado}
          vocabulario="estado"
          valor={fila.estado}
          className="gap-1"
        />
      ))}
    </section>
  )
}
```

`StatusBadge` prints only the label, so the count needs its own node; render each entry as

```tsx
        <span key={fila.estado} className="whitespace-nowrap">
          {`${termino('estado', fila.estado).etiqueta}: ${fila.cantidad}`}
        </span>
```

inside the section, each wrapped by the tone classes of `CLASES_TONO[termino('estado', fila.estado).tono]` on a `rounded-md border px-2 py-0.5` span — the badge shape without duplicating `StatusBadge`, because a badge cannot carry the count. The tests read `Apto: 5`, so keep the `${etiqueta}: ${cantidad}` shape exactly.

- [ ] **Step 3: The S28 marker and the theory column**

In `columnas.tsx`, turn the constant into a factory and put the marker inside the estado cell, on one line:

```tsx
type Opciones = {
  estadoTeorico: Map<string, boolean> | null
}

export function columnasEscuadron({ estadoTeorico }: Opciones) {
  const base = [
    /* the four columns of T9, with the estado cell replaced by: */
    ayudante.accessor('estado', {
      header: 'Estado',
      enableSorting: true,
      cell: (contexto) => (
        <div className="flex items-center gap-2">
          <StatusBadge vocabulario="estado" valor={contexto.getValue()} />
          {requiereAtencion(contexto.getValue()) && (
            <span className="whitespace-nowrap text-xs text-tono-alerta-texto">{TEXTO_REQUIERE_ATENCION}</span>
          )}
        </div>
      ),
    }),
  ]
  if (estadoTeorico === null) return ayudante.columns(base)
  return ayudante.columns([
    ...base,
    ayudante.display({
      id: 'estadoTeorico',
      header: 'Estado teórico',
      cell: (contexto) =>
        estadoTeorico.get(contexto.row.original.codigo) === true ? (
          <StatusBadge vocabulario="subsanacion" valor="pendiente" />
        ) : (
          '—'
        ),
    }),
  ])
}
```

`estadoTeorico` is `null` when the column must not exist at all (the gate is closed) and a `Map` otherwise — **empty** when the request failed, so every cell reads `'—'` and no row is hidden. The S28 marker is `text-xs` and `whitespace-nowrap` beside the badge: two short nodes on one line, which is what keeps the row at 45 px rather than the 133 px M4 had to fix.

- [ ] **Step 4: Wire both into the page**

```tsx
  const conTeorica = accionDisponible('verBloqueoTeoricoLote')
  const visibles = filtrarAlumnos(alumnos.data ?? [], busqueda)
  const codigos = pagina?.items.map((alumno) => alumno.codigo) ?? []
  const teorico = useQuery({ ...consultasSeguimiento.estadoTeorico(codigos), enabled: conTeorica && codigos.length > 0 })
  const mapaTeorico = conTeorica
    ? new Map((teorico.data ?? []).map((fila) => [fila.codAlumno, fila.bloqueadoPorSubsanacion]))
    : null
```

and render, between the filters and the table, `<ResumenDeEstados alumnos={visibles} />` and, when `conTeorica && teorico.isError`, an `<Alert><AlertDescription>{TEXTO_ESTADO_TEORICO_EN_LOTE}</AlertDescription></Alert>`.

**The lote is asked for the codes of the page on screen, not for the whole catalogue**: that is what keeps the request inside contract §5.3's cap of 100 with no arithmetic, and it re-runs on a page change because the key is the sorted code list. **S5 renders once, above the table**, and its own wording settles the question — «No se pudo comprobar el estado teórico de estos **alumnos**», plural, is a sentence about the list, not about a row; a per-row copy would wrap every row into three lines, which is the regression M4 spent a fix wave on.

- [ ] **Step 5: Run the tests, the gate and commit**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/escuadron-page.test.tsx && pnpm verify
```

Expected: 7 new tests (22 in the file), gate green, **985 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: summarise the squadron by estado, mark who needs attention and show the theory block"
```

---
### Task 12: Alertas: the list, its filters, its URL state, S7 and the first-load notice (M5-7) (CA-ALE-01, CA-ALE-02, CA-ALE-05, CA-ALE-08)

**Files:**

- Modify: `src/features/seguimiento/alertas-page.tsx`
- Create: `src/features/seguimiento/columnas-alertas.tsx`
- Create: `src/features/seguimiento/components/filtros-alertas.tsx`
- Test: `src/features/seguimiento/alertas-page.test.tsx`

**Interfaces:**

- Consumes: `consultasSeguimiento.alertas` (T7), `consultasSeguimiento.alumnos` (T2) **only** to build the grupo select, `TIPOS_ALERTA`, `TEXTO_SIN_ALERTAS`, `DataTable`, `EmptyState`, `errorDePrimeraCarga`.
- Produces: `columnasAlertas()` (the destination column arrives in T13) and the filter bar.

**Two decisions this task takes, both recorded rather than assumed.** First, the **grupo select reuses the escuadrón's catalogue query**, with the same key and its 300 s `staleTime`, so it is a cache hit whenever the user came from Escuadrón and one request otherwise; deriving the options from the alerts on screen would offer only the grupos of the current page. It is a catalogue, so a failure warns under the select and never blocks the screen. Second, **the columns are not sortable.** Contract §2.1 lists `severidad`, `fecha`, `tipo` and `alumno` as orderable, but CA-ALE-03 fixes the useful order and a user who re-sorted by `alumno` would destroy the one thing the screen exists for; the sortable set stays unused and is noted, in the same spirit as `Create Reports` gating nothing.

- [ ] **Step 1: Write the failing tests**

Create `src/features/seguimiento/alertas-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_CONEXION } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { TEXTO_SIN_ALERTAS } from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const API = config.sigedaApiUrl

async function abrirAlertas(ruta = '/seguimiento/alertas?size=20', username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('table', { name: 'Alertas del escuadrón' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Alertas del escuadrón' }))
    .getAllByRole('row')
    .slice(1)
}

describe('Alertas', () => {
  it('CA-ALE-01 muestra tipo, alumno, grupo, fecha, detalle y severidad', async () => {
    await abrirAlertas()
    const tabla = within(screen.getByRole('table', { name: 'Alertas del escuadrón' }))
    for (const columna of ['Tipo', 'Alumno', 'Grupo', 'Fecha', 'Detalle', 'Severidad']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    const primera = within(filas()[0]!)
    expect(primera.getByText('Subsanación pendiente')).toBeInTheDocument()
    expect(primera.getByText('Ana Torres Martinez')).toBeInTheDocument()
    expect(primera.getByText('Grupo 3')).toBeInTheDocument()
    expect(primera.getByText('Alta')).toBeInTheDocument()
    expect(primera.getByText(/Subsanación pendiente\./)).toBeInTheDocument()
  })

  it('CA-ALE-01 pagina de 10 en 10 con las páginas del servidor', async () => {
    const { usuario, router } = await abrirAlertas('/seguimiento/alertas')
    expect(screen.getByText('Página 1 de 2 · 13 registros')).toBeInTheDocument()
    expect(filas()).toHaveLength(10)
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1 }))
    await waitFor(() => expect(filas()).toHaveLength(3))
  })

  it('CA-ALE-02 filtra por programa, grupo y tipo y todo viaja en la URL', async () => {
    const { usuario, router } = await abrirAlertas()
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '4')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 4 }))
    await waitFor(() => expect(filas()).toHaveLength(4))
    await usuario.selectOptions(screen.getByLabelText('Tipo de alerta'), 'VUELO_DESAPROBADO')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 4, tipo: 'VUELO_DESAPROBADO' }))
    await waitFor(() => expect(filas()).toHaveLength(3))
  })

  it('CA-ALE-02 el rango cerrado de fechas filtra y Limpiar filtros lo borra', async () => {
    const desde = sumarDias(hoyIso(), -15)
    const { usuario } = await abrirAlertas(`/seguimiento/alertas?size=20&fechaPre=${desde}`)
    expect(screen.getByLabelText('Desde')).toHaveValue(desde)
    const conFiltro = filas().length
    expect(conFiltro).toBeLessThan(13)
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(filas()).toHaveLength(13))
    expect(screen.getByLabelText('Desde')).toHaveValue('')
  })

  it('CA-ALE-02 una URL mal escrita vuelve a los valores por defecto', async () => {
    await iniciarComo('comandante.aguirre')
    const { router } = renderApp('/seguimiento/alertas?page=-2&size=0&tipo=NO_EXISTE&fechaPre=ayer')
    await screen.findByRole('table', { name: 'Alertas del escuadrón' })
    expect(router.state.location.search).toEqual({ page: 0, size: 10, direction: 'ASC', programa: 'PDI' })
  })

  it('CA-ALE-05 sin alertas abiertas se muestra S7 y ninguna tabla vacía', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/seguimiento/alertas?programa=PDE')
    expect(await screen.findByText(TEXTO_SIN_ALERTAS)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Alertas del escuadrón' })).not.toBeInTheDocument()
  })

  it('CA-ALE-08 un fallo en la primera carga muestra el aviso con Reintentar', async () => {
    server.use(http.get(`${API}/api/seguimiento/alertas`, () => HttpResponse.error()))
    await iniciarComo('comandante.aguirre')
    const { usuario } = renderApp('/seguimiento/alertas')
    expect(await screen.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALERTAS)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Alertas del escuadrón' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: The columns**

Create `src/features/seguimiento/columnas-alertas.tsx` with six columns, none sortable: `tipo` as `<StatusBadge vocabulario="tipoAlerta" …>`, `alumno` truncated with its `title`, `grupo` as the row's own `grupo` string, `fecha` through `formatearFecha` with `tabular-nums` (and `'—'` for `null`, which `formatearFecha` already returns for an empty string — pass `alerta.fecha ?? ''`), `detalle` truncated to `max-w-sm` with its `title`, and `severidad` as `<StatusBadge vocabulario="severidad" …>`.

- [ ] **Step 3: The filters and the page**

`filtros-alertas.tsx` mirrors `filtros-escuadron.tsx`: Programa, Grupo (from the shared catalogue query, options `etiquetaDeGrupo(idGrupo)` over the distinct ids, with its own `FieldError` when `errorDePrimeraCarga(alumnos) !== null`), Tipo de alerta (from `TIPOS_ALERTA`), Desde and Hasta as `<Input type="date">` bound to `fechaPre`/`fechaPost` — driven **through the URL** in the tests, as `turnos-page.test.tsx:54-62` established for date ranges — and `Limpiar filtros`.

`alertas-page.tsx` keeps its `AvisoDeDependencia` (T8), adds the filter bar, and renders a `DataTable` over `consultasSeguimiento.alertas(busqueda)` with `etiqueta="Alertas del escuadrón"`, `idDeFila={(alerta) => alerta.id}`, `vacio={<EmptyState titulo="No hay alertas" descripcion={TEXTO_SIN_ALERTAS} />}` and its own `errorDePrimeraCarga` + `AvisoDeError`. **The synthetic `id` is used only as the row key** (contract §2.1) and never parsed.

- [ ] **Step 4: Run the tests, the gate and commit**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/alertas-page.test.tsx && pnpm verify
```

Expected: 7 new tests, gate green, **992 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: list the squadron alerts with their filters in the URL"
```

---

### Task 13: Alertas: the five types, their severities, the default order and the five destinations (M5-7) (CA-ALE-03, CA-ALE-04, CA-ALE-07)

**Files:**

- Modify: `src/features/seguimiento/columnas-alertas.tsx`
- Modify: `src/features/seguimiento/alertas-page.tsx`
- Modify: `src/features/seguimiento/alertas-page.test.tsx`

**Interfaces:**

- Consumes: `etiquetaDeTipoAlerta`, `TEXTO_ALERTAS_SIN_SERVIDOR` (T1), `accionDisponible('verAlertas')` (T8), `Enlace`.
- Produces: the destination column (`destinoDeAlerta`) and the live-mode branch that shows S8 and asks for nothing.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/seguimiento/alertas-page.test.tsx`:

```tsx
describe('Alertas: tipos y destinos', () => {
  it('CA-ALE-03 los cinco tipos se muestran con su etiqueta y su tono', async () => {
    await abrirAlertas()
    const esperados: [string, string][] = [
      ['Subsanación pendiente', 'alerta'],
      ['Estado crítico', 'peligro'],
      ['Chequeo pendiente', 'aviso'],
      ['Causal teórico', 'violeta'],
      ['Vuelo desaprobado', 'info'],
    ]
    for (const [etiqueta, tono] of esperados) {
      expect(screen.getAllByText(etiqueta)[0]).toHaveAttribute('data-tono', tono)
    }
    for (const [etiqueta, tono] of [
      ['Alta', 'peligro'],
      ['Media', 'aviso'],
      ['Baja', 'neutro'],
    ] as const) {
      expect(screen.getAllByText(etiqueta)[0]).toHaveAttribute('data-tono', tono)
    }
  })

  it('CA-ALE-03 el orden por defecto es Alta, Media, Baja y luego fecha descendente', async () => {
    await abrirAlertas()
    const severidades = filas().map((fila) =>
      within(fila)
        .getAllByRole('cell')
        .at(-1)!
        .textContent?.trim(),
    )
    expect(severidades).toEqual([
      'Alta',
      'Media',
      'Media',
      'Media',
      'Media',
      'Media',
      'Media',
      'Baja',
      'Baja',
      'Baja',
      'Baja',
      'Baja',
      'Baja',
    ])
  })

  it('CA-ALE-03 una alerta sin fecha queda al final de su severidad', async () => {
    server.use(
      http.get(`${API}/api/seguimiento/alertas`, () =>
        HttpResponse.json({
          content: [
            {
              id: 'ESTADO_CRITICO:111111',
              tipo: 'ESTADO_CRITICO',
              severidad: 'MEDIA',
              codAlumno: '111111',
              alumno: 'Oscar Lopez Chaparro',
              idGrupo: 1,
              grupo: 'Grupo 1',
              programa: 'PDI',
              fecha: null,
              detalle: 'El alumno está En Observación.',
              codEvaluacion: null,
              idSubfase: null,
              idMateria: null,
              idCuestionario: null,
              causal: null,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      ),
    )
    await abrirAlertas()
    expect(within(filas()[0]!).getByText('—')).toBeInTheDocument()
  })

  it('CA-ALE-04 una alerta de vuelo desaprobado abre su evaluación', async () => {
    await abrirAlertas()
    expect(screen.getByRole('link', { name: 'Abrir Vuelo desaprobado de Pedro Rodriguez Garcia' })).toHaveAttribute(
      'href',
      '/evaluaciones/555555-1',
    )
  })

  it('CA-ALE-04 una causal y una subsanación pendiente abren la pestaña Teórico del legajo', async () => {
    await abrirAlertas()
    expect(screen.getByRole('link', { name: 'Abrir Subsanación pendiente de Ana Torres Martinez' })).toHaveAttribute(
      'href',
      '/seguimiento/666666?tab=teorico',
    )
    expect(screen.getAllByRole('link', { name: 'Abrir Causal teórico de Oscar Lopez Chaparro' })[0]).toHaveAttribute(
      'href',
      '/seguimiento/111111?tab=teorico',
    )
  })

  it('CA-ALE-04 el chequeo pendiente abre el panel de chequeo y el estado crítico el legajo', async () => {
    await abrirAlertas()
    expect(screen.getByRole('link', { name: 'Abrir Chequeo pendiente de Luis Diaz Castro' })).toHaveAttribute(
      'href',
      '/seguimiento/999999?tab=practico#chequeo',
    )
    expect(screen.getByRole('link', { name: 'Abrir Estado crítico de Carlos Ramirez Sanchez' })).toHaveAttribute(
      'href',
      '/seguimiento/777777',
    )
  })

  it('CA-ALE-07 fuera del modo mock y sin la dependencia 66 muestra S8 y no pide el listado', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await iniciarComo('comandante.aguirre')
    renderApp('/seguimiento/alertas')
    expect(await screen.findByText(TEXTO_ALERTAS_SIN_SERVIDOR)).toBeInTheDocument()
    server.events.removeAllListeners('request:start')
    expect(pedidas).not.toContain('/api/seguimiento/alertas')
    expect(screen.queryByRole('table', { name: 'Alertas del escuadrón' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALERTAS)).not.toBeInTheDocument()
  })
})
```

with `vi` and `TEXTO_ALERTAS_SIN_SERVIDOR` added to the file's imports. The second test is the one that would fail if anybody ordered the severities alphabetically: `ALTA, BAJA, MEDIA` is what a string sort gives and it is exactly backwards (contract §2.1).

- [ ] **Step 2: The destination of each type**

In `columnas-alertas.tsx`:

```tsx
type Destino = { to: string; params?: Record<string, string>; search?: Record<string, string>; hash?: string }

export function destinoDeAlerta(alerta: Alerta): Destino {
  if (alerta.tipo === 'VUELO_DESAPROBADO' && alerta.codEvaluacion !== null) {
    return { to: '/evaluaciones/$cod', params: { cod: alerta.codEvaluacion } }
  }
  if (alerta.tipo === 'CAUSAL_TEORICO' || alerta.tipo === 'SUBSANACION_PENDIENTE') {
    return { to: '/seguimiento/$alumno', params: { alumno: alerta.codAlumno }, search: { tab: 'teorico' } }
  }
  if (alerta.tipo === 'CHEQUEO_PENDIENTE') {
    return { to: '/seguimiento/$alumno', params: { alumno: alerta.codAlumno }, search: { tab: 'practico' }, hash: 'chequeo' }
  }
  return { to: '/seguimiento/$alumno', params: { alumno: alerta.codAlumno } }
}
```

and a display column whose cell is

```tsx
        <Enlace
          {...(destinoDeAlerta(contexto.row.original) as never)}
          aria-label={`Abrir ${etiquetaDeTipoAlerta(contexto.row.original.tipo)} de ${contexto.row.original.alumno}`}
        >
          Abrir
        </Enlace>
```

The visible label is `Abrir` for every row and the identity lives in `aria-label` — the rule M4's fix wave settled, because the row's own text must not widen the actions column. The destinations come from the **explicit pointers**, never from parsing the synthetic `id` (contract §2.1); a `VUELO_DESAPROBADO` whose `codEvaluacion` is somehow `null` falls through to the legajo rather than building a broken URL.

`hash: 'chequeo'` needs the anchor to exist: T17 gives the chequeo panel `id="chequeo"`.

- [ ] **Step 3: The live-mode branch**

In `alertas-page.tsx`, gate the query and the table on the dependency:

```tsx
  const disponible = accionDisponible('verAlertas')
  const alertas = useQuery({ ...consultasSeguimiento.alertas(busqueda), enabled: disponible })
```

and render, when `!disponible`, only the header, the `AvisoDeDependencia` and **no** table and **no** empty state — S8 already tells the user where the per-alumno data is ("Consulte los vuelos desaprobados de cada alumno en su legajo"), and an empty state beside it would read as "there are no alerts", which is the one thing that is not known.

- [ ] **Step 4: Run the tests, the gate and commit**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/alertas-page.test.tsx && pnpm verify
```

Expected: 7 new tests (14 in the file), gate green, **999 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: show each alert type with its severity and open its destination"
```

---
### Task 14: Legajo: the shell, its three tabs, the per-panel scaffolding, the cabecera and the practical history (M5-9) (CA-LEG-01, CA-LEG-02, CA-LEG-03, CA-LEG-04)

**Files:**

- Modify: `src/features/seguimiento/legajo-page.tsx`
- Create: `src/features/seguimiento/components/panel.tsx`
- Create: `src/features/seguimiento/components/cabecera-del-legajo.tsx`
- Create: `src/features/seguimiento/components/historial-practico.tsx`
- Modify: `src/lib/dominio/seguimiento.ts`
- Test: `src/features/seguimiento/legajo-page.test.tsx`

**Interfaces:**

- Consumes: `consultasSeguimiento.alumno`/`.legajo` (T4), `consultasEvaluaciones.lista` and `CLASIFICACIONES_FILTRO` (M1's, unchanged), `consultasCatalogos.subfases` for the subfase picker, `Card`, `Skeleton`, `AvisoDeError`, `DataTable`, `formatearNota`, `formatearFecha`, `StatusBadge`.
- Produces: `Panel`, `CabeceraDelLegajo`, `HistorialPractico`, the tab bar, and `ETIQUETAS_PESTANA` in the domain module.

**The shell's contract, which every later panel depends on** (M5-9): there is **no page-level error state**. Each panel owns its query, its `errorDePrimeraCarga` notice with Reintentar, its dependency text and its permission; the page header shows the screen's own title plus the alumno's name once the cabecera has it, so a failing cabecera does not take the heading down. The tabs are **links** carrying `?tab=`, so they are in the URL, survive a reload and mount only the panels of the active tab — which is all CA-LEG-02 asks for and needs no new primitive.

- [ ] **Step 1: Write the failing tests**

Create `src/features/seguimiento/legajo-page.test.tsx`:

```tsx
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_EVALUADOR_SIN_CODIGO, TEXTO_SIN_GRUPO } from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const API = config.sigedaApiUrl

async function abrirLegajo(cod = '777777', busqueda = '', username = 'instructor.perez') {
  await iniciarComo(username)
  const vista = renderApp(`/seguimiento/${cod}${busqueda}`)
  await screen.findByRole('heading', { level: 1, name: 'Legajo del alumno' })
  return vista
}

async function reabrirLegajo(cod: string, busqueda = '', username = 'instructor.perez') {
  cleanup()
  return abrirLegajo(cod, busqueda, username)
}

function panel(nombre: string) {
  return within(screen.getByRole('region', { name: nombre }))
}

describe('Legajo: cabecera y pestañas', () => {
  it('CA-LEG-01 la cabecera muestra código, nombres, DNI, rango, tipo, estado, grupo y cuenta', async () => {
    await abrirLegajo()
    const cabecera = panel('Cabecera')
    expect(await cabecera.findByText('Carlos Ramirez Sanchez')).toBeInTheDocument()
    expect(cabecera.getByText('777777')).toBeInTheDocument()
    expect(cabecera.getByText('78901234')).toBeInTheDocument()
    expect(cabecera.getByText('Mayor')).toBeInTheDocument()
    expect(cabecera.getByText('Alumno')).toBeInTheDocument()
    expect(cabecera.getByText('En chequeo')).toBeInTheDocument()
    expect(cabecera.getByText('Promoción 2026-A · PDI')).toBeInTheDocument()
    expect(cabecera.getByText('alumno.ramirez')).toBeInTheDocument()
  })

  it('CA-LEG-01 los apellidos llegan con las claves APaterno y AMaterno y se muestran igual', async () => {
    let pedido = false
    server.use(
      http.get(`${API}/api/personas/:cod/alumno`, () => {
        pedido = true
        return HttpResponse.json({
          dni: '99999999',
          nombre: 'Prueba',
          APaterno: 'Mayúscula',
          AMaterno: 'Rara',
          rango: 'Cadete',
          estado: 'Apto',
          usuario: null,
        })
      }),
    )
    await abrirLegajo()
    expect(await panel('Cabecera').findByText('Prueba Mayúscula Rara')).toBeInTheDocument()
    expect(pedido).toBe(true)
    expect(panel('Cabecera').getByText('Sin cuenta')).toBeInTheDocument()
  })

  it('CA-LEG-01 un alumno sin grupo lo muestra con S3', async () => {
    await abrirLegajo('654321')
    expect(await panel('Cabecera').findByText(TEXTO_SIN_GRUPO)).toBeInTheDocument()
  })

  it('CA-LEG-02 las tres pestañas se ven en la URL y sobreviven una recarga', async () => {
    const { usuario, router } = await abrirLegajo()
    expect(screen.getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    await usuario.click(screen.getByRole('link', { name: 'Práctico' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ tab: 'practico' }))
    expect(screen.getByRole('link', { name: 'Práctico' })).toHaveAttribute('aria-current', 'page')
    const recargada = await reabrirLegajo('777777', '?tab=teorico')
    expect(recargada.router.state.location.search).toMatchObject({ tab: 'teorico' })
    expect(screen.getByRole('link', { name: 'Teórico' })).toHaveAttribute('aria-current', 'page')
  })

  it('CA-LEG-02 cada pestaña carga sus datos solo al abrirse', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    const { usuario } = await abrirLegajo()
    await waitFor(() => expect(pedidas).toContain('/api/personas/777777/alumno'))
    expect(pedidas).not.toContain('/api/evaluaciones/filter/persona/777777')
    await usuario.click(screen.getByRole('link', { name: 'Práctico' }))
    await waitFor(() => expect(pedidas).toContain('/api/evaluaciones/filter/persona/777777'))
    server.events.removeAllListeners('request:start')
  })
})

describe('Legajo: historial práctico', () => {
  it('CA-LEG-03 muestra código, nombre, fase, evaluador, fecha, promedio y clasificación', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const tabla = within(await screen.findByRole('table', { name: 'Historial de evaluaciones' }))
    for (const columna of ['Código', 'Nombre', 'Fase', 'Evaluador', 'Fecha', 'Promedio', 'Clasificación']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    const fila = within(tabla.getByRole('link', { name: '777777-1' }).closest('tr') as HTMLElement)
    expect(fila.getByText('Adaptación')).toBeInTheDocument()
    expect(fila.getByText('Maria Flores')).toBeInTheDocument()
    expect(fila.getByText('12.00')).toBeInTheDocument()
    expect(fila.getByText('Malo')).toBeInTheDocument()
  })

  it('CA-LEG-03 pagina y filtra por subfase y clasificación desde la URL', async () => {
    await abrirLegajo('777777', '?tab=practico&size=2')
    expect(await screen.findByText('Página 1 de 3 · 5 registros')).toBeInTheDocument()
    await reabrirLegajo('777777', '?tab=practico&clasificacion=Bueno')
    await waitFor(() =>
      expect(within(screen.getByRole('table', { name: 'Historial de evaluaciones' })).getAllByRole('row')).toHaveLength(2),
    )
    await reabrirLegajo('555555', '?tab=practico&idSubfase=2')
    expect(await screen.findByText('No hay evaluaciones')).toBeInTheDocument()
  })

  it('CA-LEG-04 el evaluador es el texto del servidor, con S10 y sin enlace a su persona', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const tabla = within(await screen.findByRole('table', { name: 'Historial de evaluaciones' }))
    const evaluador = tabla.getAllByText('Maria Flores')[0]!
    expect(evaluador.closest('a')).toBeNull()
    expect(screen.getByText(TEXTO_EVALUADOR_SIN_CODIGO)).toBeInTheDocument()
    expect(tabla.queryByText(/cod.*evaluador/i)).not.toBeInTheDocument()
  })
})
```

The second test's `server.use` is what forces the adapter to exist: the fixture and the override both use the backend's `APaterno`/`AMaterno` spelling (contract §9.9), so a screen that read `aPaterno` would render `Prueba  ` with two spaces and fail.

- [ ] **Step 2: The panel scaffolding**

Create `src/features/seguimiento/components/panel.tsx`:

```tsx
import type { ReactNode } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  titulo: string
  id?: string
  error?: unknown
  alReintentar?: () => void
  cargando?: boolean
  acciones?: ReactNode
  children: ReactNode
}

export function Panel({ titulo, id, error, alReintentar, cargando = false, acciones, children }: Props) {
  return (
    <Card id={id} role="region" aria-label={titulo}>
      <CardHeader>
        <CardTitle>
          <h2>{titulo}</h2>
        </CardTitle>
        {acciones}
      </CardHeader>
      <CardContent>
        {error ? (
          <AvisoDeError error={error} alReintentar={alReintentar} />
        ) : cargando ? (
          <Skeleton className="h-24 w-full" aria-busy="true" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
```

Every panel of T15–T18 is this component: **its own notice with Reintentar, inside itself**, which is what CA-LEG-16 asks for and what keeps one failed request from taking the screen down. `id` exists for one reason: the chequeo panel is the target of `#chequeo` from an alert (T13).

- [ ] **Step 3: The shell**

Replace `src/features/seguimiento/legajo-page.tsx` with the header, the S1 notice, the tab bar and a `switch` over `busqueda.tab` that renders **only** the active tab's panels:

```tsx
const ruta = getRouteApi('/_app/seguimiento/$alumno')

export function LegajoPage({ codAlumno }: { codAlumno: string }) {
  const busqueda = ruta.useSearch()
  const alumno = useQuery(consultasSeguimiento.alumno(codAlumno))
  const nombre = alumno.data === undefined ? '' : `${alumno.data.nombre} ${alumno.data.aPaterno} ${alumno.data.aMaterno}`.trim()

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.legajo.titulo}
        descripcion={nombre === '' ? PANTALLAS.legajo.descripcion : `${nombre} · ${codAlumno}`}
      />
      <AvisoDeDependencia accion="verIndices" texto={TEXTO_INDICES_SOLO_MOCK} />
      <nav aria-label="Secciones del legajo" className="flex flex-wrap gap-1 border-b">
        {PESTANAS.map((pestana) => (
          <Enlace
            key={pestana}
            to="/seguimiento/$alumno"
            params={{ alumno: codAlumno }}
            search={(previa) => ({ ...previa, tab: pestana, page: 0 })}
            aria-current={busqueda.tab === pestana ? 'page' : undefined}
            className="rounded-t-md px-3 py-2 text-sm aria-[current=page]:bg-muted aria-[current=page]:font-medium"
          >
            {ETIQUETAS_PESTANA[pestana]}
          </Enlace>
        ))}
      </nav>
      {busqueda.tab === 'resumen' && <CabeceraDelLegajo codAlumno={codAlumno} alumno={alumno} />}
      {busqueda.tab === 'practico' && <HistorialPractico codAlumno={codAlumno} busqueda={busqueda} />}
      {busqueda.tab === 'teorico' && null}
    </>
  )
}
```

and add to `src/lib/dominio/seguimiento.ts`:

```ts
export const ETIQUETAS_PESTANA = { resumen: 'Resumen', practico: 'Práctico', teorico: 'Teórico' } as const
```

The `alumno` query lives at page level because the header needs the name in every tab, and it is passed **down** to the cabecera panel so the panel owns its error without the request running twice.

- [ ] **Step 4: The cabecera**

`cabecera-del-legajo.tsx` renders a `Panel titulo="Cabecera"` over the `alumno` query plus `consultasSeguimiento.legajo(codAlumno)` gated by `accionDisponible('verCicloChequeo')`, with the `Dato` pattern of `resultados-turno-page.tsx:21-28` (a `<dl>` of label/value pairs): **Código**, **Alumno** (the three name fields joined), **DNI**, **Rango**, **Tipo**, **Estado** (a `StatusBadge`), **Grupo** (`legajo.grupo === null ? TEXTO_SIN_GRUPO : `${legajo.grupo.nombre} · ${legajo.grupo.programa}``) and **Cuenta** (`usuario?.nombre ?? 'Sin cuenta'`). The panel's `error` is `errorDePrimeraCarga(alumno)` only: the legajo half is an enrichment behind dependency 64, so when it is missing the panel shows its own fields and `TEXTO_CHEQUEO_SIN_SERVIDOR` under Grupo rather than an error.

- [ ] **Step 5: The practical history**

`historial-practico.tsx` renders a `Panel titulo="Historial de evaluaciones"` holding the subfase and clasificación selects (the same two search params the subfase report of T16 reads) and a `DataTable` over `consultasEvaluaciones.lista(codAlumno, { programa: 'PDI', idSubfase: busqueda.idSubfase, clasificacion: busqueda.clasificacion, page: busqueda.page, size: busqueda.size, direction: 'ASC' })` with seven columns: `codigo` as an `Enlace` to `/evaluaciones/$cod`, `nombre` truncated, `fase`, `evaluador` as plain text, `fecha` through `formatearFecha`, `promedio` through `formatearNota` with `tabular-nums`, and `clasificacion` as a `StatusBadge`. **S10 renders once under the table**, not per row: it is a statement about the column, and a per-row copy is the row-height regression M4 fixed.

The reader is M1's, unchanged (`consultasEvaluaciones.lista`), which is the point: the practical history is one of the four panels that are Real against `ec2b0dd`.

- [ ] **Step 6: Run the tests, the gate and commit**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/legajo-page.test.tsx src/lib/auth/rutas-m5.test.tsx && pnpm verify
```

Expected: 8 new tests, `rutas-m5.test.tsx` still green (its heading assertion is `Legajo del alumno`, which the shell keeps), gate green, **1007 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: open the alumno legajo with its three tabs, its cabecera and its practical history"
```

---
### Task 15: Legajo, pestaña Resumen: the índices panel with its subfase breakdown, the estado teórico with its causales, and the per-panel failure (M5-2, M5-14) (CA-LEG-12, CA-LEG-13, CA-LEG-14, CA-LEG-16)

**Files:**

- Modify: `src/features/seguimiento/legajo-page.tsx`
- Create: `src/features/seguimiento/components/panel-de-indices.tsx`
- Create: `src/features/seguimiento/components/panel-de-estado-teorico.tsx`
- Modify: `src/lib/dominio/seguimiento.ts`
- Modify: `src/features/seguimiento/legajo-page.test.tsx`

**Interfaces:**

- Consumes: `consultasReportes.indices` (T5), `consultasSeguimiento.estadoTeorico` (T6), `INDICES`/`formulaDeIndice`/`etiquetaDeCausal`/`TEXTO_SIN_DATOS_SUFICIENTES`/`TEXTO_INDICES_SIN_SERVIDOR` (T1), `accionDisponible('verIndices')` and `('verCausalesTeoricos')` (T8), `formatearNota`, `formatearFecha`, `Panel` (T14).
- Produces: `PanelDeIndices`, `PanelDeEstadoTeorico` and one new domain text.

**One text §17.3 does not supply.** Its table gives a live-mode sentence to the índices panel (S15), the chequeo panel (S13) and the Teórico tab (S16), and **none to the estado-teórico panel**, although the same table puts it behind dependencies 7 and 68 and CA-LEG-17 asks every gated panel for its own notice. This task adds `TEXTO_ESTADO_TEORICO_SIN_SERVIDOR = 'El estado teórico y sus causales todavía no existen en el servidor.'` to the domain module, in the shape of the other three, and the gap is flagged for the spec's next revision.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/seguimiento/legajo-page.test.tsx`:

```tsx
function dato(region: ReturnType<typeof within>, etiqueta: string) {
  return within(region.getByText(etiqueta).closest('div') as HTMLElement)
}

describe('Legajo: índices del PDI', () => {
  it('CA-LEG-13 muestra el NFPI y, desglosados, el NIT con su NCT y NEI y el NIA con sus tres fases', async () => {
    await abrirLegajo('555555')
    const indices = panel('Índices del PDI')
    expect(await indices.findByText('16.44')).toBeInTheDocument()
    expect(dato(indices, 'NFPI').getByText('NIT (0.2) + NIA (0.8)')).toBeInTheDocument()
    expect(dato(indices, 'NIT').getByText('17.60')).toBeInTheDocument()
    expect(dato(indices, 'NCT').getByText('18.00')).toBeInTheDocument()
    expect(dato(indices, 'NEI').getByText('16.00')).toBeInTheDocument()
    expect(dato(indices, 'NIA').getByText('16.15')).toBeInTheDocument()
    for (const sigla of ['NFAD', 'NFOH', 'NFOA']) {
      expect(indices.getByText(sigla)).toBeInTheDocument()
    }
  })

  it('CA-LEG-13 cada fase baja a sus sub fases con el peso que informa el servidor', async () => {
    await abrirLegajo('777777')
    const indices = panel('Índices del PDI')
    const adaptacion = within(await indices.findByRole('table', { name: 'Sub fases de Adaptación' }))
    expect(adaptacion.getAllByRole('row').slice(1)).toHaveLength(5)
    const contacto = within(adaptacion.getByText('Contacto').closest('tr') as HTMLElement)
    expect(contacto.getByText('0.25')).toBeInTheDocument()
    expect(contacto.getByText('13.00')).toBeInTheDocument()
    expect(indices.queryByRole('table', { name: 'Sub fases de Operaciones AeroTácticas' })).not.toBeInTheDocument()
  })

  it('CA-LEG-13 la pantalla muestra el NFPI del servidor y no uno derivado de sus mitades', async () => {
    server.use(
      http.get(`${API}/api/personas/:cod/indices`, () =>
        HttpResponse.json({
          codigo: '555555',
          alumno: 'Pedro Rodriguez Garcia',
          programa: 'PDI',
          nfpi: 9.99,
          nit: { valor: 20, nct: 20, nei: 20, neiEvaluaciones: 4, asignaturas: [], asignaturasSinNota: [], reduccionPorRezagadoAplicada: false },
          nia: { valor: 20, fases: [], motivo: null },
        }),
      ),
    )
    await abrirLegajo('555555')
    expect(await panel('Índices del PDI').findByText('9.99')).toBeInTheDocument()
  })

  it('CA-LEG-14 un índice nulo se muestra con S14 y nunca como 0', async () => {
    await abrirLegajo('654321')
    const indices = panel('Índices del PDI')
    expect(await indices.findAllByText(TEXTO_SIN_DATOS_SUFICIENTES)).not.toHaveLength(0)
    expect(indices.queryByText('0.00')).not.toBeInTheDocument()
  })

  it('CA-LEG-14 un NFPI nulo no impide mostrar las mitades que sí existen y explica el NIA', async () => {
    await abrirLegajo('666666')
    const indices = panel('Índices del PDI')
    expect(await indices.findByText('12.80')).toBeInTheDocument()
    expect(dato(indices, 'NFPI').getByText(TEXTO_SIN_DATOS_SUFICIENTES)).toBeInTheDocument()
    expect(dato(indices, 'NFAD').getByText('14.00')).toBeInTheDocument()
    expect(indices.getByText('Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.')).toBeInTheDocument()
  })
})

describe('Legajo: estado teórico y causales', () => {
  it('CA-LEG-12 muestra el bloqueo por subsanación con su motivo', async () => {
    await abrirLegajo('666666')
    const teorico = panel('Estado teórico')
    expect(await teorico.findByText('Subsanación pendiente')).toBeInTheDocument()
    expect(teorico.getByText(/Desaprobó Mensual Adoctrinamiento de Vuelo/)).toBeInTheDocument()
  })

  it('CA-LEG-12 las causales llevan su etiqueta, su materia y el grupo sobre el que contaron', async () => {
    await abrirLegajo('111111')
    const teorico = panel('Estado teórico')
    expect(await teorico.findAllByText('Promedio de asignatura bajo 13')).toHaveLength(2)
    expect(teorico.getByText('Periódicos generales')).toBeInTheDocument()
    expect(teorico.getAllByText('Adoctrinamiento de Vuelo').length).toBeGreaterThan(0)
    expect(teorico.getByText(/Meteorología/)).toBeInTheDocument()
    expect(teorico.getByText('Nota de asignatura 11.80 en Ingeniería del Helicóptero, por debajo de 13.')).toBeInTheDocument()
  })

  it('CA-LEG-12 una causal sin materia se muestra sin ella y no como un hueco', async () => {
    await abrirLegajo('111111')
    const teorico = panel('Estado teórico')
    const fila = within((await teorico.findByText('Tres asignaturas desaprobadas')).closest('li') as HTMLElement)
    expect(fila.getByText('3 asignaturas desaprobadas.')).toBeInTheDocument()
    expect(fila.queryByText('—')).not.toBeInTheDocument()
    expect(fila.queryByText(/Adoctrinamiento/)).not.toBeInTheDocument()
  })
})

describe('Legajo: un panel que falla', () => {
  it('CA-LEG-16 el panel que falla muestra su aviso con Reintentar y los demás siguen con sus datos', async () => {
    server.use(http.get(`${API}/api/personas/:cod/indices`, () => HttpResponse.error()))
    const { usuario } = await abrirLegajo('666666')
    const indices = panel('Índices del PDI')
    expect(await indices.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(panel('Cabecera').getByText('Ana Torres Martinez')).toBeInTheDocument()
    expect(await panel('Estado teórico').findByText('Subsanación pendiente')).toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(indices.getByRole('button', { name: 'Reintentar' }))
    expect(await indices.findByText('12.80')).toBeInTheDocument()
  })
})
```

with `MENSAJE_SIN_CONEXION` and `TEXTO_SIN_DATOS_SUFICIENTES` added to the file's imports. The third test is M5-2 made falsifiable: the server is forced to contradict itself (`nfpi: 9.99` over two halves of 20) and the screen prints what it was given, because **it computes nothing**.

- [ ] **Step 2: The índices panel**

`panel-de-indices.tsx` renders a `Panel titulo="Índices del PDI"` and, inside it:

- a `<dl>` of the top figures — **NFPI**, **NIT**, **NCT**, **NEI**, **NIA** — each one a `<div>` holding its `<dt>` label, its `<dd>` value through `formatearNota` and `formulaDeIndice(clave)` as small muted text, showing `TEXTO_SIN_DATOS_SUFICIENTES` when the value is `null` instead of a formatted zero. **The label and its value must share one container**, which is the `Dato` shape of `resultados-turno-page.tsx:21-28` and what lets the tests read a figure by its label: `16.00` is both the NEI and the NFOH of `555555`, and `14.00` is both the NFAD and all five of its `nsf` for `666666`, so a bare `getByText` would match several nodes;
- the three fases as rows with their `sigla` (each one also inside a `<div>` with its value, for the same reason), their `peso` (two decimals, `tabular-nums`) and their `valor`;
- for a fase with subfases, a `<Table aria-label={`Sub fases de ${fase.fase}`}>` of **Sub fase · Sigla · Peso · NSF · Misiones**, so the breakdown reaches the level the instructor can act on;
- `nia.motivo` rendered verbatim when `nia.valor === null`, and `asignaturasSinNota` listed under the NIT block as the explanation of `coeficienteAplicado`.

Its query is `useQuery({ ...consultasReportes.indices(codAlumno), enabled: accionDisponible('verIndices') })`, its `error` is `errorDePrimeraCarga(indices)` and, when the gate is closed, it renders `TEXTO_INDICES_SIN_SERVIDOR` **instead of** the `<dl>` and fires no request.

- [ ] **Step 3: The estado teórico panel**

`panel-de-estado-teorico.tsx` renders a `Panel titulo="Estado teórico"` over `consultasSeguimiento.estadoTeorico(codAlumno)` — the per-alumno one of T6, not the lote — gated by `accionDisponible('verCausalesTeoricos')` with `TEXTO_ESTADO_TEORICO_SIN_SERVIDOR` when closed. It shows the `StatusBadge vocabulario="subsanacion"` plus `motivo` when `bloqueadoPorSubsanacion`, the desaprobados with `textoConMinimo(nota, notaMinimaAplicada)`, and the causales as a `<ul>` of `<li>`s, each with `etiquetaDeCausal(codigo)`, the `materia` **only when the payload carries one**, the `grupo` joined with ` · ` when it carries one, the server's `detalle` and `formatearFecha(fecha)`. With no causales it shows `TEXTO_SIN_CAUSALES`.

**A causal without a materia renders without that field, not with a dash**: CA-LEG-12 asks for exactly that, and the three payload shapes of contract §9.8 are what the tests drive.

- [ ] **Step 4: Mount both in the Resumen tab and run everything**

In `legajo-page.tsx`, the `resumen` branch becomes the cabecera, then `<PanelDeIndices codAlumno={codAlumno} />`, then `<PanelDeEstadoTeorico codAlumno={codAlumno} />` — the order §17.3's panel table fixes.

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/legajo-page.test.tsx && pnpm verify
```

Expected: 9 new tests (17 in the file), gate green, **1016 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: show the PDI indices and the theory state with its causales in the legajo"
```

---
### Task 16: Legajo, pestaña Práctico: the subfase report, the promedios with their simple mean, and the turnos (M5-4) (CA-LEG-05, CA-LEG-06, CA-LEG-08)

**Files:**

- Modify: `src/features/seguimiento/legajo-page.tsx`
- Create: `src/features/seguimiento/components/panel-de-subfase.tsx`
- Create: `src/features/seguimiento/components/panel-de-promedios.tsx`
- Create: `src/features/seguimiento/components/panel-de-turnos.tsx`
- Modify: `src/features/seguimiento/legajo-page.test.tsx`

**Interfaces:**

- Consumes: `consultasSeguimiento.reporteDeSubfase` and `.promediosDeSubfase` (T4), `consultasTurnos.delAlumno` (M1's, unchanged), `mediaSimple`, `TEXTO_MEDIA_SIMPLE_SUBFASE`, `TEXTO_SIN_PROMEDIOS_PONDERADOS`, `TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE`, `TEXTO_TURNO_SIN_CANTIDAD` (T1), `formatearNota`, `formatearFecha`, `StatusBadge`, `Panel` (T14).
- Produces: `PanelDeSubfase`, `PanelDePromedios`, `PanelDeTurnos`.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/seguimiento/legajo-page.test.tsx`:

```tsx
describe('Legajo: reporte de sub fase', () => {
  it('CA-LEG-05 elegida una sub fase, el reporte muestra su cabecera, sus maniobras y sus notas', async () => {
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    const reporte = panel('Reporte de sub fase')
    expect(await reporte.findByText('Instrumentos')).toBeInTheDocument()
    expect(reporte.getByText('Adaptación')).toBeInTheDocument()
    expect(reporte.getByText('Carlos Ramirez Sanchez')).toBeInTheDocument()
    expect(reporte.getByText('Maniobra 9')).toBeInTheDocument()
    expect(reporte.getByText('Maniobra 10')).toBeInTheDocument()
    expect(reporte.getAllByRole('article')).toHaveLength(5)
  })

  it('CA-LEG-05 cada evaluación muestra su categoría, clasificación, promedio, recomendación y sus calificaciones', async () => {
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    const reporte = panel('Reporte de sub fase')
    const primera = within((await reporte.findAllByRole('article'))[0]!)
    expect(primera.getByText('777777-1')).toBeInTheDocument()
    expect(primera.getByText('Ponderada')).toBeInTheDocument()
    expect(primera.getByText('Malo')).toBeInTheDocument()
    expect(primera.getByText('12.00')).toBeInTheDocument()
    const calificaciones = within(primera.getByRole('table', { name: 'Calificaciones de 777777-1' }))
    expect(calificaciones.getAllByRole('row').slice(1)).toHaveLength(2)
    const fila = within(calificaciones.getAllByRole('row')[1]!)
    expect(fila.getByText('B')).toBeInTheDocument()
    expect(fila.getByText('I')).toBeInTheDocument()
  })

  it('CA-LEG-05 una sub fase sin evaluaciones muestra el panel vacío, nunca el texto del servidor', async () => {
    await abrirLegajo('555555', '?tab=practico&idSubfase=2')
    const reporte = panel('Reporte de sub fase')
    expect(await reporte.findByText(TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE)).toBeInTheDocument()
    expect(screen.queryByText(/especificada no existe/)).not.toBeInTheDocument()
  })
})

describe('Legajo: promedios de la sub fase', () => {
  it('CA-LEG-06 lista los promedios del servidor y su media simple con dos decimales bajo S9', async () => {
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    const promedios = panel('Promedios de la sub fase')
    expect(await promedios.findByText(TEXTO_MEDIA_SIMPLE_SUBFASE)).toBeInTheDocument()
    expect(promedios.getAllByText('12.00')).toHaveLength(4)
    expect(promedios.getByText('17.00')).toBeInTheDocument()
    expect(promedios.getByText('13.00')).toBeInTheDocument()
  })

  it('CA-LEG-06 el filtro del servidor excluye el Chequeo e incluye el Chequeo Sub Fase', async () => {
    await abrirLegajo('555555', '?tab=practico&idSubfase=1')
    const deCinco = panel('Promedios de la sub fase')
    expect(await deCinco.findByText('14.50')).toBeInTheDocument()
    expect(deCinco.queryByText('555555-2')).not.toBeInTheDocument()
    await reabrirLegajo('999999', '?tab=practico&idSubfase=1')
    const deNueve = panel('Promedios de la sub fase')
    expect(await deNueve.findByText('16.00')).toBeInTheDocument()
    expect(deNueve.getByText('999999-2')).toBeInTheDocument()
  })

  it('CA-LEG-06 con un solo promedio la media es ese promedio y sin ninguno el panel lo dice', async () => {
    server.use(
      http.get(`${API}/api/evaluaciones/promedio/subfase/:id/persona/:cod`, () =>
        HttpResponse.json([{ codigo: '777777-1', promedio: '12.0' }]),
      ),
    )
    await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    expect(await panel('Promedios de la sub fase').findAllByText('12.00')).toHaveLength(2)
    server.resetHandlers()
    await reabrirLegajo('555555', '?tab=practico&idSubfase=2')
    expect(await panel('Promedios de la sub fase').findByText(TEXTO_SIN_PROMEDIOS_PONDERADOS)).toBeInTheDocument()
  })
})

describe('Legajo: turnos realizados', () => {
  it('CA-LEG-08 lista los turnos del alumno y muestra S11 en lugar de la cantidad de alumnos', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const turnos = panel('Turnos realizados')
    const tabla = within(await turnos.findByRole('table', { name: 'Turnos del alumno' }))
    for (const columna of ['Turno', 'Sub fase', 'Programa', 'Fecha']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(tabla.getByText('Instrumentos Avanzados')).toBeInTheDocument()
    expect(turnos.getByText(TEXTO_TURNO_SIN_CANTIDAD)).toBeInTheDocument()
    expect(tabla.queryByText('Alumnos')).not.toBeInTheDocument()
  })
})
```

with the four new texts added to the file's imports. The sixth test's override is the only way to reach "exactly one promedio": every seeded pair has two or five, and `mediaSimple([12])` must be `12`, not a rounded surprise.

- [ ] **Step 2: The report panel**

`panel-de-subfase.tsx` renders a `Panel titulo="Reporte de sub fase"` over `consultasSeguimiento.reporteDeSubfase(busqueda.idSubfase ?? 0, codAlumno)`:

- with no subfase chosen, it says so and fires nothing (`enabled: idSubfase > 0`);
- with a subfase whose report is `null` — the 404 the api layer swallows (T4) — it renders `TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE` and **never the server's malformed sentence**;
- otherwise a `<dl>` for the cabecera (fase, sub fase, programa, alumno), the maniobras as a list of names, and each evaluation as an `<article aria-label={nota.codigo}>` holding its código (an `Enlace` to `/evaluaciones/$cod`), `categoria`, a `StatusBadge` for `clasificacion`, `formatearNota(promedio)`, its `recomendacion` and a `<Table aria-label={`Calificaciones de ${nota.codigo}`}>` of **Maniobra · Nota mínima · Nota**, pairing each calificación with the maniobra at the same index of `maniobras` and falling back to the index when the two lengths disagree.

- [ ] **Step 3: The promedios panel and its mean — the one Derived figure of M5**

`panel-de-promedios.tsx` renders a `Panel titulo="Promedios de la sub fase"` over `consultasSeguimiento.promediosDeSubfase(...)`, a `<Table>` of **Evaluación · Promedio** and, under it, the mean:

```tsx
const valores = (promedios.data ?? []).flatMap((fila) => (fila.promedio === null ? [] : [fila.promedio]))
const media = mediaSimple(valores)
```

shown as `formatearNota(media)` with `TEXTO_MEDIA_SIMPLE_SUBFASE` (S9) beside it, and `TEXTO_SIN_PROMEDIOS_PONDERADOS` in place of the table when the list is empty. **`mediaSimple` is the only arithmetic M5 performs and it has exactly one home** (M5-4): the panel calls it, no component recomputes it, and S9 states in the interface that it is a plain mean and *not* the PDI's `NSF`, which weights each mission by its coefficient.

- [ ] **Step 4: The turnos panel**

`panel-de-turnos.tsx` renders a `Panel titulo="Turnos realizados"` over `consultasTurnos.delAlumno(codAlumno, { page: 0, size: 10, direction: 'ASC' })` with a `<Table aria-label="Turnos del alumno">` of **Turno · Sub fase · Programa · Fecha** and `TEXTO_TURNO_SIN_CANTIDAD` (S11) once under the table. There is **no** alumno-count column at all: dependency 12 means the field the server sends is not the field it names, so the panel neither invents the number nor hides the fact (contract §6.3 finding 4).

- [ ] **Step 5: Mount the three panels, run, gate and commit**

In the `practico` branch of `legajo-page.tsx`: `HistorialPractico`, then `PanelDeSubfase`, `PanelDePromedios`, `PanelDeTurnos` — §17.3's order.

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/legajo-page.test.tsx && pnpm verify
```

Expected: 7 new tests (24 in the file), gate green, **1023 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: show the subfase report, its simple mean and the alumno's turnos"
```

---
### Task 17: Legajo, pestaña Práctico: los vuelos desaprobados con su propio permiso, y el panel de chequeo (M5-8, M5-13) (CA-LEG-07, CA-LEG-09, CA-LEG-10)

**Files:**

- Modify: `src/features/seguimiento/legajo-page.tsx`
- Create: `src/features/seguimiento/components/panel-de-desaprobados.tsx`
- Create: `src/features/seguimiento/components/panel-de-chequeo.tsx`
- Modify: `src/features/seguimiento/legajo-page.test.tsx`

**Interfaces:**

- Consumes: `consultasSeguimiento.desaprobados` (T3), `.legajo` and `.chequeos` (T4, T6), `consultasEvaluaciones.detalle` (M1's), `usePuede` (`lib/auth/use-sesion`), `ramasDeCriterio`, `textoCriterioCumplido`, `textoRegularAlternado`, `TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR`, `TEXTO_ESTADO_YA_CAMBIO`, `TEXTO_CHEQUEO_SIN_SERVIDOR`, `TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR`, `TEXTO_SIN_CHEQUEOS`, `TEXTO_SIN_DESAPROBADOS` (T1).
- Produces: `PanelDeDesaprobados` and `PanelDeChequeo` (the latter with `id="chequeo"`, the anchor T13's alert links to).

**How the panel shows the chain, and why it shows one hop.** CA-LEG-10 asks the panel to link the chain of evaluations by its previous one and to show the state each carried. `codEvalPrevia` and `estadoAlumno` exist **only on the evaluation detail** (`GET /api/evaluaciones/{cod}`); the list projection `EvalByAlumno` carries neither (contract §6.3), and widening it would be inventing a shape the server does not have. The panel therefore asks for the detail of the **last** evaluation — one request, the one the legajo header already names — and renders it with its `estadoAlumno` and a link to its `codEvalPrevia`, from where M1's own evaluation screen continues the walk. Showing the whole chain in one panel needs either an endpoint that returns it or `codEvalPrevia` on the list projection; **flagged, not invented.**

- [ ] **Step 1: Write the failing tests**

Add to `src/features/seguimiento/legajo-page.test.tsx`:

```tsx
describe('Legajo: vuelos desaprobados', () => {
  it('CA-LEG-07 muestra código, clasificación, sub fase, fecha y programa y enlaza la evaluación', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const desaprobados = panel('Vuelos desaprobados')
    const tabla = within(await desaprobados.findByRole('table', { name: 'Vuelos desaprobados del alumno' }))
    expect(tabla.getAllByRole('row').slice(1)).toHaveLength(3)
    const fila = within(tabla.getByRole('link', { name: '777777-1' }).closest('tr') as HTMLElement)
    expect(fila.getByText('Malo')).toBeInTheDocument()
    expect(fila.getByText('Instrumentos')).toBeInTheDocument()
    expect(fila.getByText('PDI')).toBeInTheDocument()
    expect(tabla.getByRole('link', { name: '777777-1' })).toHaveAttribute('href', '/evaluaciones/777777-1')
  })

  it('CA-LEG-07 sin View Disapproved el panel no se pide ni se muestra', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await abrirLegajo('777777', '?tab=practico', 'jefe.operaciones')
    await screen.findByRole('table', { name: 'Historial de evaluaciones' })
    server.events.removeAllListeners('request:start')
    expect(pedidas).not.toContain('/api/desaprobados/persona/777777')
    expect(screen.queryByRole('region', { name: 'Vuelos desaprobados' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR)).not.toBeInTheDocument()
  })

  it('CA-LEG-07 en el legajo propio de un alumno se muestra S29 en lugar del panel', async () => {
    await abrirLegajo('777777', '?tab=practico', 'alumno.ramirez')
    expect(await screen.findByText(TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Vuelos desaprobados del alumno' })).not.toBeInTheDocument()
  })
})

describe('Legajo: ciclo de chequeo', () => {
  it('CA-LEG-09 muestra los cuatro contadores y el criterio que aplica a la fase', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByText('Criterio 1')).toBeInTheDocument()
    expect(chequeo.getByText('Chequeos: 4')).toBeInTheDocument()
    expect(chequeo.getByText('Evaluaciones: 10')).toBeInTheDocument()
    expect(chequeo.getByText('Malos: 3')).toBeInTheDocument()
    expect(chequeo.getByText('Regulares: 2')).toBeInTheDocument()
    expect(chequeo.getByText('3 vuelos Malos')).toBeInTheDocument()
    expect(chequeo.getByText('6 Regulares alternados')).toBeInTheDocument()
  })

  it('CA-LEG-09 muestra el historial de chequeos y la regla del Regular alternado', async () => {
    await abrirLegajo('999999', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByText(textoRegularAlternado(true))).toBeInTheDocument()
    const historial = within(chequeo.getByRole('table', { name: 'Historial de chequeos' }))
    expect(historial.getAllByRole('row').slice(1)).toHaveLength(1)
    const fila = within(historial.getAllByRole('row')[1]!)
    expect(fila.getByText('Aprobado')).toBeInTheDocument()
    expect(fila.getByText('Contacto')).toBeInTheDocument()
    await reabrirLegajo('777777', '?tab=practico')
    expect(await panel('Ciclo de chequeo').findByText(TEXTO_SIN_CHEQUEOS)).toBeInTheDocument()
  })

  it('CA-LEG-10 con el criterio cumplido y el estado ya movido muestra S12 y S31', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByText(textoCriterioCumplido('Adaptación', '3 vuelos Malos'))).toBeInTheDocument()
    expect(chequeo.getByText(TEXTO_ESTADO_YA_CAMBIO)).toBeInTheDocument()
    expect(chequeo.queryByText(TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR)).not.toBeInTheDocument()
  })

  it('CA-LEG-10 con el criterio cumplido y el alumno todavía Apto muestra S12 y S30', async () => {
    await abrirLegajo('999999', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByText(textoCriterioCumplido('Adaptación', '2 Malos y 2 Regulares alternados'))).toBeInTheDocument()
    expect(chequeo.getByText(TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR)).toBeInTheDocument()
    expect(chequeo.queryByText(TEXTO_ESTADO_YA_CAMBIO)).not.toBeInTheDocument()
  })

  it('CA-LEG-10 enlaza la cadena por la evaluación previa y muestra el estado que cada una tenía', async () => {
    await abrirLegajo('777777', '?tab=practico')
    const chequeo = panel('Ciclo de chequeo')
    expect(await chequeo.findByRole('link', { name: '777777-6' })).toHaveAttribute('href', '/evaluaciones/777777-6')
    expect(chequeo.getByText('En Chequeo')).toBeInTheDocument()
    expect(chequeo.getByRole('link', { name: '777777-4' })).toHaveAttribute('href', '/evaluaciones/777777-4')
  })
})
```

with `textoCriterioCumplido`, `textoRegularAlternado`, `TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR`, `TEXTO_ESTADO_YA_CAMBIO`, `TEXTO_SIN_CHEQUEOS` and `TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR` added to the imports.

The pair of S30/S31 tests is the whole point of `cuentaConEsteEstado` (M5-13): `777777` met the criterion and his state **already moved**, so promising him a change at the next evaluation would be false — his counters are frozen until he is `Apto` again; `999999` met it and is still `Apto`, so the next evaluation is exactly when the server will act. **Both sentences come from the server's field and neither is computed in the browser.**

- [ ] **Step 2: The desaprobados panel**

```tsx
export function PanelDeDesaprobados({ codAlumno }: { codAlumno: string }) {
  const puedeVer = usePuede('View Disapproved')
  const propio = useSesion()?.codPersona === codAlumno
  const desaprobados = useQuery({ ...consultasSeguimiento.desaprobados(codAlumno), enabled: puedeVer })
  if (!puedeVer) {
    return propio ? (
      <Panel titulo="Vuelos desaprobados">
        <p className="text-sm text-muted-foreground">{TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR}</p>
      </Panel>
    ) : null
  }
  …
}
```

and, when it may read them, a `<Table aria-label="Vuelos desaprobados del alumno">` of **Evaluación · Clasificación · Sub fase · Fecha · Programa** with the código as an `Enlace` to `/evaluaciones/$cod`, `TEXTO_SIN_DESAPROBADOS` when the list is empty, and its own `errorDePrimeraCarga` notice.

**This is the only panel of the legajo with a permission of its own** (§17.3): `View Disapproved` is held by the Administrador Web, the Comandante and the Instructor and **not** by the Alumno or the Jefe de Operaciones, so for those two the request never leaves — for the Jefe there is nothing at all, and on an alumno's own legajo S29 tells him who can see it. Without this branch `/mi-legajo` would render a 403 inside a panel §17.3 calls Real.

- [ ] **Step 3: The chequeo panel**

`panel-de-chequeo.tsx` renders `<Panel titulo="Ciclo de chequeo" id="chequeo">` over three queries, all gated by `accionDisponible('verCicloChequeo')`: `consultasSeguimiento.legajo(codAlumno)` for the counters and the `chequeo` block, `consultasSeguimiento.chequeos(codAlumno)` for the history, and `consultasEvaluaciones.detalle(legajo.ultimaEvaluacion.codigo)` for the chain, enabled only once the legajo answered. When the gate is closed it shows `TEXTO_CHEQUEO_SIN_SERVIDOR` (S13) and asks for nothing. Its body, in order:

1. the four counters as `Chequeos: n`, `Evaluaciones: n`, `Malos: n`, `Regulares: n`;
2. `Criterio {criterio}` with `ramasDeCriterio(criterio)` listed, so the instructor reads the rule the server applies;
3. when `criterioCumplido`: `textoCriterioCumplido(chequeo.fase, chequeo.detalle)` (S12) **followed by** `TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR` (S30) if `cuentaConEsteEstado` and `TEXTO_ESTADO_YA_CAMBIO` (S31) if not;
4. `textoRegularAlternado(chequeo.regularAlternado)`;
5. the last evaluation as an `Enlace` with its `estadoAlumno` beside it and, when `codEvalPrevia !== null`, an `Enlace` to it labelled with its código;
6. a `<Table aria-label="Historial de chequeos">` of **Fecha · Tipo · Resultado · Sub fase · Contadores** over the chequeos, or `TEXTO_SIN_CHEQUEOS` when there are none.

**The frontend computes no transition** (M5-13): `criterio`, `criterioCumplido`, `detalle`, `regularAlternado` and `cuentaConEsteEstado` all arrive from the server, and the panel's job is to say what they mean.

- [ ] **Step 4: Mount both, run, gate and commit**

Append `PanelDeDesaprobados` and `PanelDeChequeo` to the `practico` branch, after the turnos panel.

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento/legajo-page.test.tsx && pnpm verify
```

Expected: 8 new tests (32 in the file), gate green, **1031 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: show the failed flights under their own permission and the chequeo cycle"
```

---
### Task 18: Legajo, pestaña Teórico con S17; `/mi-legajo` y la propiedad por rol; y los avisos de dependencia panel por panel (M5-10, M5-15) (CA-LEG-11, CA-LEG-15, CA-LEG-17)

**Files:**

- Modify: `src/features/seguimiento/legajo-page.tsx`
- Create: `src/features/seguimiento/components/panel-de-historial-teorico.tsx`
- Create: `src/features/seguimiento/cargar.ts`
- Test: `src/features/seguimiento/cargar.test.ts`
- Modify: `src/routes/_app/seguimiento/$alumno.tsx`
- Modify: `src/features/seguimiento/legajo-page.test.tsx`

**Interfaces:**

- Consumes: `consultasSeguimiento.historialTeorico` (T6), `textoConMinimo` (`lib/dominio/teoria`), `TEXTO_PREVALECE_LA_PRIMERA_NOTA`, `TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR`, `TEXTO_SIN_SEGUNDA_NOTA`, `TEXTO_SIN_EXAMENES_DEL_ALUMNO` (T1), `veSoloLoPropio` (`lib/auth/pantallas`), `SinPermisoError`, `notFound`.
- Produces: `PanelDeHistorialTeorico`, `cargarLegajoVisible` and `codigoQueSeConsulta`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/seguimiento/cargar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { SinPermisoError } from '@/lib/auth/guardas'
import type { Sesion } from '@/lib/auth/sesion'
import { cargarLegajoVisible, codigoQueSeConsulta } from './cargar'

function sesion(rol: string, codPersona: string | null): Sesion {
  return {
    usuario: { id: 1, username: 'x', correo: null },
    codPersona,
    persona: { nombre: 'X', aPaterno: 'Y', aMaterno: 'Z', idGrupo: null },
    rol: { id: 1, nombre: rol },
    permisos: new Set(),
  }
}

describe('propiedad del legajo', () => {
  it('CA-LEG-15 el alumno solo puede cargar el suyo', () => {
    expect(cargarLegajoVisible(sesion('Alumno', '777777'), '777777')).toEqual({ codAlumno: '777777' })
    expect(() => cargarLegajoVisible(sesion('Alumno', '777777'), '555555')).toThrow(SinPermisoError)
  })

  it('CA-LEG-15 los cuatro roles de personal usan el código de la URL tal cual', () => {
    for (const rol of ['Administrador Web', 'Comandante de Escuadrón', 'Jefe de Operaciones', 'Instructor']) {
      expect(cargarLegajoVisible(sesion(rol, '444444'), '777777')).toEqual({ codAlumno: '777777' })
      expect(codigoQueSeConsulta(sesion(rol, '444444'), '777777')).toBe('777777')
    }
  })

  it('CA-LEG-15 para el alumno la capa de API usa el código de la sesión, no el de la URL', () => {
    expect(codigoQueSeConsulta(sesion('Alumno', '777777'), '555555')).toBe('777777')
    expect(codigoQueSeConsulta(sesion('Alumno', null), '555555')).toBe('')
    expect(codigoQueSeConsulta(null, '777777')).toBe('777777')
  })

  it('CA-LEG-15 un código que no es de seis dígitos no es un legajo', () => {
    expect(() => cargarLegajoVisible(sesion('Instructor', '444444'), 'abc')).toThrow()
    expect(() => cargarLegajoVisible(sesion('Instructor', '444444'), '77777')).toThrow()
  })
})
```

Add to `src/features/seguimiento/legajo-page.test.tsx`:

```tsx
describe('Legajo: historial teórico', () => {
  it('CA-LEG-11 muestra materia, tipo de examen, fecha, nota con su mínimo y si aprobó', async () => {
    await abrirLegajo('999999', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    const tabla = within(await historial.findByRole('table', { name: 'Exámenes del alumno' }))
    for (const columna of ['Materia', 'Tipo de examen', 'Fecha', 'Nota', 'Resultado']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(tabla.getAllByText('Aerodinámica Aplicada a Helicópteros')).toHaveLength(2)
    expect(tabla.getByText('10.00 / mínimo 16')).toBeInTheDocument()
    expect(tabla.getByText('17.00 / mínimo 16')).toBeInTheDocument()
    expect(tabla.getByText('Desaprobado')).toBeInTheDocument()
    expect(tabla.getByText('Aprobado')).toBeInTheDocument()
  })

  it('CA-LEG-11 una fila desaprobada con subsanación aprobada muestra las dos notas y S17', async () => {
    await abrirLegajo('999999', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    expect(await historial.findByText(TEXTO_PREVALECE_LA_PRIMERA_NOTA)).toBeInTheDocument()
    const desaprobada = within(historial.getByText('10.00 / mínimo 16').closest('tr') as HTMLElement)
    expect(desaprobada.getByText(/Subsanada con 17\.00/)).toBeInTheDocument()
  })

  it('CA-LEG-11 la fila de la subsanación muestra su turno de origen', async () => {
    await abrirLegajo('999999', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    const subsanacion = within((await historial.findByText('17.00 / mínimo 16')).closest('tr') as HTMLElement)
    expect(subsanacion.getByText(/Test Aerodinámica Aplicada a Helicópteros/)).toBeInTheDocument()
  })

  it('CA-LEG-11 una subsanación pendiente muestra que no hay segunda nota', async () => {
    await abrirLegajo('666666', '?tab=teorico')
    const historial = panel('Historial de exámenes')
    expect(await historial.findByText(TEXTO_SIN_SEGUNDA_NOTA)).toBeInTheDocument()
    expect(historial.getByText('12.00 / mínimo 18')).toBeInTheDocument()
  })
})

describe('Legajo: propiedad y modo vivo', () => {
  it('CA-LEG-15 /mi-legajo lleva al alumno a su propio legajo y pide su propio código', async () => {
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await iniciarComo('alumno.castro')
    const { router } = renderApp('/mi-legajo')
    await screen.findByRole('heading', { level: 1, name: 'Legajo del alumno' })
    expect(router.state.location.pathname).toBe('/seguimiento/999999')
    await waitFor(() => expect(pedidas).toContain('/api/personas/999999/alumno'))
    server.events.removeAllListeners('request:start')
    expect(pedidas.some((ruta) => ruta.includes('555555'))).toBe(false)
  })

  it('CA-LEG-15 un código ajeno en la URL lo rechaza el cargador de la ruta', async () => {
    await iniciarComo('alumno.castro')
    renderApp('/seguimiento/555555')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cabecera' })).not.toBeInTheDocument()
  })

  it('CA-LEG-17 fuera del modo mock cada panel muestra su propio aviso y el encabezado S1', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const { usuario } = await abrirLegajo('777777')
    expect(screen.getByText(TEXTO_INDICES_SOLO_MOCK)).toBeInTheDocument()
    expect(await panel('Índices del PDI').findByText(TEXTO_INDICES_SIN_SERVIDOR)).toBeInTheDocument()
    await usuario.click(screen.getByRole('link', { name: 'Práctico' }))
    expect(await panel('Ciclo de chequeo').findByText(TEXTO_CHEQUEO_SIN_SERVIDOR)).toBeInTheDocument()
    await usuario.click(screen.getByRole('link', { name: 'Teórico' }))
    expect(await panel('Historial de exámenes').findByText(TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR)).toBeInTheDocument()
  })

  it('CA-LEG-17 sin ninguna dependencia resuelta los cuatro paneles reales siguen funcionando', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const { usuario } = await abrirLegajo('777777', '?tab=practico&idSubfase=3')
    expect(await screen.findByRole('table', { name: 'Historial de evaluaciones' })).toBeInTheDocument()
    expect(await panel('Reporte de sub fase').findByText('Instrumentos')).toBeInTheDocument()
    expect(await panel('Promedios de la sub fase').findByText('13.00')).toBeInTheDocument()
    expect(await panel('Vuelos desaprobados').findByRole('table', { name: 'Vuelos desaprobados del alumno' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('link', { name: 'Resumen' }))
    expect(await panel('Cabecera').findByText('Carlos Ramirez Sanchez')).toBeInTheDocument()
  })
})
```

with `MENSAJE_SIN_PERMISO`, `vi` and the five texts added to the imports. The last test is the milestone's honest claim in one assertion: **against `ec2b0dd`, with no dependency resolved, four panels of the legajo work** — history, subfase report, promedios and desaprobados — and the cabecera keeps its Real half.

- [ ] **Step 2: `src/features/seguimiento/cargar.ts`**

```ts
import { notFound } from '@tanstack/react-router'
import { SinPermisoError } from '@/lib/auth/guardas'
import { veSoloLoPropio } from '@/lib/auth/pantallas'
import type { Sesion } from '@/lib/auth/sesion'

const PATRON_CODIGO = /^\d{6}$/

export function codigoQueSeConsulta(actual: Sesion | null, codAlumno: string): string {
  if (actual !== null && veSoloLoPropio(actual)) return actual.codPersona ?? ''
  return codAlumno
}

export function cargarLegajoVisible(actual: Sesion | null, codAlumno: string): { codAlumno: string } {
  if (!PATRON_CODIGO.test(codAlumno)) throw notFound()
  if (actual !== null && veSoloLoPropio(actual) && actual.codPersona !== codAlumno) throw new SinPermisoError()
  return { codAlumno }
}
```

and in `src/routes/_app/seguimiento/$alumno.tsx` add `loader: ({ context, params }) => cargarLegajoVisible(context.sesion.actual(), params.alumno)`.

**The rule is stated per role, because stating it once would be wrong in one direction or the other** (M5-10): for the Alumno the code comes from the session and a foreign one in the URL is refused; for the four staff roles the URL value is used as given, and what limits them is the per-panel permission of M5-9. `codigoQueSeConsulta` is the belt to the loader's braces: **every panel asks for the code it returns**, so even a bypassed loader could not make an Alumno's requests carry somebody else's code. `LegajoPage` computes it once (`const cod = codigoQueSeConsulta(useSesion(), codAlumno)`) and passes it to every panel.

- [ ] **Step 3: The theory history panel**

`panel-de-historial-teorico.tsx` renders `<Panel titulo="Historial de exámenes">` over `consultasSeguimiento.historialTeorico(cod, { page: busqueda.page, size: busqueda.size, direction: 'DESC' })`, gated by `accionDisponible('verHistorialTeorico')` with `TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR` (S16) when closed, `TEXTO_SIN_EXAMENES_DEL_ALUMNO` when the page is empty, and a `<Table aria-label="Exámenes del alumno">` of **Materia · Tipo de examen · Fecha · Nota · Resultado**, where

- the nota is `textoConMinimo(fila.nota, fila.notaMinimaAplicada)` — M4's helper, never a second formatter;
- the resultado is a `StatusBadge vocabulario="examen"`, or `'—'` while `aprobado` is `null` (an `EN_CURSO` row);
- a failed row whose `subsanadoPor` carries a nota adds, in the same cell, `Subsanada con ${formatearNota(subsanadoPor.nota)}`, and one whose `subsanadoPor` is pending or absent adds `TEXTO_SIN_SEGUNDA_NOTA`;
- a row with an `idTurnoOrigen` shows `Origen: ${turnoOrigen}` under its materia;
- **S17 renders once above the table**, because it is the rule of the whole panel and not of one row.

S17 is the sentence M5-15 corrected: **the first grade is the one that counts and enters the average**, and the subsanación lifts the flying block and stands as evidence. The panel shows both notas side by side precisely so that sentence has something to be true about.

- [ ] **Step 4: Mount it, run, gate and commit**

The `teorico` branch of `legajo-page.tsx` becomes `<PanelDeHistorialTeorico codAlumno={cod} busqueda={busqueda} />`.

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/seguimiento && pnpm verify
```

Expected: 4 new tests in `cargar.test.ts` and 8 more in `legajo-page.test.tsx` (40 in the file), gate green, **1043 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: show the theory history with the prevailing grade and restrict the alumno to his own legajo"
```

---
### Task 19: Reportes y orden de mérito: la tabla, sus filtros, el puesto del servidor y S22 con S23 (M5-3, M5-19) (CA-REP-01, CA-REP-02, CA-REP-03, CA-REP-04)

**Files:**

- Modify: `src/features/reportes/reportes-page.tsx`
- Create: `src/features/reportes/columnas.tsx`
- Create: `src/features/reportes/components/filtros-reportes.tsx`
- Test: `src/features/reportes/reportes-page.test.tsx`

**Interfaces:**

- Consumes: `consultasReportes.ordenDeMerito` (T5), `consultasSeguimiento.alumnos` for the grupo select, `textoOrdenDeMeritoConsultado`, `TEXTO_DESEMPATE` (T1), `formatearNota`, `formatearFecha`, `DataTable`, `relojFalso` and `momento` in the tests.
- Produces: `COLUMNAS_MERITO` and the filled report screen.

- [ ] **Step 1: Write the failing tests**

Create `src/features/reportes/reportes-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { momento, hoyIso } from '@/lib/dominio/calendario'
import { TEXTO_DESEMPATE, textoOrdenDeMeritoConsultado } from '@/lib/dominio/seguimiento'
import { formatearFecha } from '@/lib/formato'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'

async function abrirReportes(ruta = '/reportes', username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('table', { name: 'Orden de mérito' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Orden de mérito' }))
    .getAllByRole('row')
    .slice(1)
}

function celdas(indice: number) {
  return within(filas()[indice]!)
    .getAllByRole('cell')
    .map((celda) => celda.textContent?.trim() ?? '')
}

describe('Reportes y orden de mérito', () => {
  it('CA-REP-01 muestra puesto, código, alumno, grupo, NFPI, NIT y NIA con dos decimales', async () => {
    await abrirReportes()
    const tabla = within(screen.getByRole('table', { name: 'Orden de mérito' }))
    for (const columna of ['Puesto', 'Código', 'Alumno', 'Grupo', 'NFPI', 'NIT', 'NIA']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(celdas(0)).toEqual(['1', '222222', 'Juan Falconi Fernandez', 'Grupo 2', '17.16', '17.20', '17.15'])
    expect(filas()).toHaveLength(6)
  })

  it('CA-REP-01 pagina de 10 en 10 y el servidor es quien ordena', async () => {
    const { usuario, router } = await abrirReportes('/reportes?size=2')
    expect(screen.getByText('Página 1 de 3 · 6 registros')).toBeInTheDocument()
    expect(celdas(0)[0]).toBe('1')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1 }))
    await waitFor(() => expect(celdas(0)[0]).toBe('3'))
  })

  it('CA-REP-02 filtra por programa y grupo y los filtros viajan en la URL', async () => {
    const { usuario, router } = await abrirReportes()
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idGrupo: 3 }))
    await waitFor(() => expect(filas()).toHaveLength(2))
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(filas()).toHaveLength(6))
  })

  it('CA-REP-02 filtrando por grupo los puestos empiezan en 1 dentro de ese grupo', async () => {
    await abrirReportes('/reportes?idGrupo=3')
    expect(celdas(0)[0]).toBe('1')
    expect(celdas(0)[1]).toBe('555555')
  })

  it('CA-REP-03 muestra S22 con la fecha y la hora de la consulta y S23 con el desempate', async () => {
    relojFalso()
    vi.setSystemTime(momento(hoyIso(), '09:15'))
    await iniciarComo('comandante.aguirre')
    renderApp('/reportes')
    await screen.findByRole('table', { name: 'Orden de mérito' })
    expect(screen.getByText(textoOrdenDeMeritoConsultado(formatearFecha(hoyIso()), '09:15'))).toBeInTheDocument()
    expect(screen.getByText(TEXTO_DESEMPATE)).toBeInTheDocument()
  })

  it('CA-REP-04 el empate se rompe por NIA y el puesto no cambia al reordenar la tabla', async () => {
    const { usuario } = await abrirReportes()
    expect(celdas(2)).toEqual(['3', '999999', 'Luis Diaz Castro', 'Promoción 2026-A', '15.28', '14.80', '15.40'])
    expect(celdas(3)).toEqual(['4', '111111', 'Oscar Lopez Chaparro', 'Grupo 1', '15.28', '15.80', '15.15'])
    await usuario.click(screen.getByRole('button', { name: 'NIT' }))
    await waitFor(() => expect(celdas(0)[1]).toBe('666666'))
    expect(celdas(0)[0]).not.toBe('1')
  })
})
```

The last test is CA-REP-04's second half: after re-sorting by `NIT` **ascending**, the row that comes first is the one with the lowest NIT — `666666` at 12.80, which has **no puesto at all** — and no row's puesto changed, because the puesto is the server's and the client never renumbers. (If the mock's `ordenar` keeps unranked rows last regardless of the requested order, as T5 specifies, then `celdas(0)[1]` is `777777` at 13.80 instead; assert whichever the mock really produces and say so — the invariant under test is that **no puesto changed**, and that holds either way.)

`relojFalso()` + `vi.setSystemTime` is the only place M5 pins the clock outside the debounce, and it is pinned because S22 prints the hour the data arrived.

- [ ] **Step 2: The columns**

`src/features/reportes/columnas.tsx`, all seven columns sortable except the puesto, because `property=puesto` is the server's default anyway:

```tsx
export const COLUMNAS_MERITO = ayudante.columns([
  ayudante.accessor('puesto', {
    header: 'Puesto',
    cell: (contexto) => {
      const fila = contexto.row.original
      if (fila.puesto !== null) return <span className="tabular-nums">{fila.puesto}</span>
      const aviso = textoSinNfpi(fila.motivoSinNfpi ?? '')
      return (
        <span className="whitespace-nowrap text-xs text-muted-foreground" title={aviso}>
          Sin puesto
          <span className="sr-only"> {aviso}</span>
        </span>
      )
    },
  }),
  ayudante.accessor('codigo', { header: 'Código', enableSorting: true, cell: … }),
  ayudante.accessor('alumno', { header: 'Alumno', enableSorting: true, cell: truncado }),
  ayudante.accessor('grupo', { header: 'Grupo' }),
  ayudante.accessor('nfpi', { header: 'NFPI', enableSorting: true, cell: nota }),
  ayudante.accessor('nit', { header: 'NIT', enableSorting: true, cell: nota }),
  ayudante.accessor('nia', { header: 'NIA', enableSorting: true, cell: nota }),
])
```

where `nota` is `(contexto) => <span className="tabular-nums">{contexto.getValue() === null ? TEXTO_SIN_DATOS_SUFICIENTES : formatearNota(contexto.getValue())}</span>`. **The unranked row's explanation is one short visible phrase with the full S24 sentence in `title` and in an `sr-only` span** — the exact pattern M4's screenshot wave settled (`2e5b634`), because a 70-character sentence inside a cell wraps the row to three lines, and because `'—'` already means "sin dato" in a dozen places and must not be reused to mean "this alumno cannot be ranked".

- [ ] **Step 3: The screen**

`reportes-page.tsx` keeps its two `AvisoDeDependencia` calls from T8 and adds: the filter bar (Programa, Grupo from the shared catalogue with its own `FieldError`, `Limpiar filtros`), **S22 and S23 above the table**, and the `DataTable` over `consultasReportes.ordenDeMerito(busqueda)` with `etiqueta="Orden de mérito"` and `idDeFila={(fila) => fila.codigo}`. S22's stamp comes from the query itself:

```tsx
const consultadoEn = new Date(merito.dataUpdatedAt)
const sello = textoOrdenDeMeritoConsultado(formatearFecha(hoyIso(consultadoEn)), format(consultadoEn, 'HH:mm'))
```

`dataUpdatedAt` is when the answer arrived, so the stamp does not tick with every render and does not promise a scheduled batch that does not exist (dependency 55, M5-3). Use `hoyIso(consultadoEn)` if `hoyIso` accepts a date, and `format(consultadoEn, 'yyyy-MM-dd')` otherwise.

- [ ] **Step 4: Run the tests, the gate and commit**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/reportes && pnpm verify
```

Expected: 6 new tests, gate green, **1049 tests**.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: show the orden de merito with the server's ranking and its tie-break"
```

---

### Task 20: Reportes: el alumno sin NFPI, S25, S26, el aviso de primera carga — y la entrada de `docs/decisiones.md` (M5-19, M5-23) (CA-REP-05, CA-REP-06, CA-REP-08)

**Files:**

- Modify: `src/features/reportes/reportes-page.tsx`
- Modify: `src/features/reportes/reportes-page.test.tsx`
- Modify: `docs/decisiones.md`

**Interfaces:**

- Consumes: `TEXTO_SIN_ALUMNOS_CON_INDICES`, `TEXTO_ORDEN_MERITO_SIN_SERVIDOR`, `TEXTO_INDICES_SOLO_MOCK`, `textoSinNfpi`, `TEXTO_SIN_DATOS_SUFICIENTES` (T1), `accionDisponible('verOrdenMerito')` (T8).
- Produces: the unranked-row treatment, the two empty/live states and the milestone's decision log.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/reportes/reportes-page.test.tsx`:

```tsx
describe('Reportes: el alumno sin NFPI y los estados de la pantalla', () => {
  it('CA-REP-05 un alumno sin NFPI completo aparece al final, sin puesto, con S14 y S24', async () => {
    await abrirReportes()
    const ultima = filas().at(-1)!
    const fila = within(ultima)
    expect(fila.getByText('666666')).toBeInTheDocument()
    expect(fila.getByText('Sin puesto')).toHaveAttribute(
      'title',
      textoSinNfpi('Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.'),
    )
    expect(fila.getAllByText(TEXTO_SIN_DATOS_SUFICIENTES)).toHaveLength(2)
    expect(fila.getByText('12.80')).toBeInTheDocument()
  })

  it('CA-REP-05 los puestos van 1..n sobre los rankeables y el que no lo es no desplaza a nadie', async () => {
    await abrirReportes()
    expect(filas().map((_, indice) => celdas(indice)[0])).toEqual(['1', '2', '3', '4', '5', 'Sin puesto'])
  })

  it('CA-REP-06 sin alumnos con índices se muestra S25 y ninguna tabla vacía', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/reportes?programa=PDE')
    expect(await screen.findByText(TEXTO_SIN_ALUMNOS_CON_INDICES)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Orden de mérito' })).not.toBeInTheDocument()
  })

  it('CA-REP-08 un fallo en la primera carga muestra el aviso con Reintentar', async () => {
    server.use(http.get(`${API}/api/reportes/orden-merito`, () => HttpResponse.error()))
    await iniciarComo('comandante.aguirre')
    const { usuario } = renderApp('/reportes')
    expect(await screen.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALUMNOS_CON_INDICES)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Orden de mérito' })).toBeInTheDocument()
  })

  it('CA-REP-08 fuera del modo mock y sin las dependencias 6 y 63 muestra S1 y S26 y no pide la tabla', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => pedidas.push(new URL(request.url).pathname))
    await iniciarComo('comandante.aguirre')
    renderApp('/reportes')
    expect(await screen.findByText(TEXTO_ORDEN_MERITO_SIN_SERVIDOR)).toBeInTheDocument()
    expect(screen.getByText(TEXTO_INDICES_SOLO_MOCK)).toBeInTheDocument()
    server.events.removeAllListeners('request:start')
    expect(pedidas).not.toContain('/api/reportes/orden-merito')
    expect(screen.queryByRole('table', { name: 'Orden de mérito' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_ALUMNOS_CON_INDICES)).not.toBeInTheDocument()
  })
})
```

with `http`, `HttpResponse`, `server`, `config`, `MENSAJE_SIN_CONEXION`, `textoSinNfpi`, `TEXTO_SIN_DATOS_SUFICIENTES`, `TEXTO_SIN_ALUMNOS_CON_INDICES`, `TEXTO_ORDEN_MERITO_SIN_SERVIDOR` and `TEXTO_INDICES_SOLO_MOCK` added to the imports.

- [ ] **Step 2: The screen's three states**

In `reportes-page.tsx`: gate the query on `accionDisponible('verOrdenMerito')`; when the gate is closed render the header, the two notices and **nothing else** — no table, no empty state, because "no hay datos" is exactly what is not known (M5-22). When the query fails on its first load, the `AvisoDeError` with Reintentar replaces the table. When the page is empty, `DataTable`'s `vacio` is an `EmptyState` with `TEXTO_SIN_ALUMNOS_CON_INDICES` (S25) — and while the mission-coefficient table of contract §3.3 is missing, that is what a live server would answer for everybody, which is what the screen should say rather than showing a table of blanks.

- [ ] **Step 3: `docs/decisiones.md`**

Append a `## Seguimiento (M5)` section, in the file's own voice and bullet style (see `## Teoría y banco de preguntas (M4)`), covering:

- **Dos carpetas por endpoint (M5-20)** and the domain module that holds the chequeo criteria, the seven causales, the five alert types with their severity ordinal, the index formulas as display text and the S-texts.
- **La aritmética es del servidor (M5-2).** The ten PDI formulas and their operands are the norm's (contract §3.2) and the frontend computes **none** of them; the only Derived number of the milestone is the simple mean of S9 (M5-4), which says in the interface that it is not the PDI's `NSF`.
- **El escuadrón filtra, ordena y pagina en el navegador (M5-6)**, because neither catalogue accepts `idGrupo`, `estado` or `texto` and neither one's `totalElements` counts alumnos; the API layer walks every page of the catalogue and de-duplicates by `codigo`.
- **El agujero de `desaprobados` se expone y no se explota (M5-8).** The six-character guard, the four endpoints M5 never calls, and the `DELETE` that today answers 200 for a code that does not exist.
- **El panel de desaprobados tiene su propio permiso (M5-9)**, so `/mi-legajo` does not render a 403 inside a panel described as Real, and S29 says who can see it.
- **`cuentaConEsteEstado` es lo que hace que el panel de chequeo no mienta (M5-13):** outside `Apto` the counters do not move, so S12 is followed by S30 or S31 and never by a promise that will not be kept.
- **Prevalece la primera nota (M5-15).** The PDI says it three times; the subsanación lifts the block and stands as evidence without entering the average.
- **La cadena de evaluaciones se muestra de a un salto**, because `codEvalPrevia` and `estadoAlumno` live only on the evaluation detail and widening the list projection would invent a shape the server does not have.
- **`Create Reports` no protege nada hoy (M5-19)** and the Jefe de Operaciones does not hold it, so he sees the Escuadrón and neither the Alertas nor the orden de mérito — recorded, not redistributed.
- **La predicción de riesgo no se consume (M5-11)**, with the five verified blockers named in one line each and the order of M5-12 for whoever picks that service up.
- **Lo que M5 posterga fuera de la tesis (M5-23, §17.6):** the CSV export, the version token on the exam's autosave, CA-EXA-12's `server.use` override, the `programa` filter and the debounce on `/teoria/turnos` and `/banco` (the hook exists and applying it is one line per screen), `GET /api/personas/{cod}/status` (dependency 58), the unguarded `GET /api/subfases/assigned`, and the índices fixture being stated rather than derived.
- **Lo que quedó pedido y no hecho:** dependencies 61–68, 70 and 71, with 62's missing data — the mission-coefficient table the PDI promises and does not publish — named as an institutional request rather than work for Victor.

- [ ] **Step 4: Run the whole suite, the gate and commit**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **1054 tests**. This is the final count of M5.

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "docs: record the M5 decisions and close the orden de merito screen"
```

---
## Coverage

Every acceptance criterion of spec §17.4 with the **one** task that claims it and the file that proves it. Paths are relative to `src/`. The "también" column lists the tasks whose tests touch the same ground with a `contrato §n.n` title, so that no criterion is claimed twice at two different depths.

| Criterion | Task | Proven by | También |
|---|---|---|---|
| CA-SEG-01 columnas, 10 por página en el navegador, orden del navegador | 9 | `features/seguimiento/escuadron-page.test.tsx` | 2 |
| CA-SEG-02 programa al servidor; grupo, estado y texto en el navegador; URL; rebote de 300 ms | 10 | `escuadron-page.test.tsx` | 1, 2 |
| CA-SEG-03 el interruptor `View All Groups`; S2; S6 | 10 | `escuadron-page.test.tsx` | 2 |
| CA-SEG-04 S4 desde el `idGrupo`; S3 sin grupo; el grupo 6 discrepa | 9 | `escuadron-page.test.tsx` | 1, 3 |
| CA-SEG-05 una fila por alumno y turno; deduplica; el total cuenta alumnos | 9 | `escuadron-page.test.tsx` | 2 |
| CA-SEG-06 el estado con su etiqueta y su tono; el resumen del encabezado | 11 | `escuadron-page.test.tsx` | 1 |
| CA-SEG-07 la columna de estado teórico y S5 cuando el lote falla | 11 | `escuadron-page.test.tsx` | 2 |
| CA-SEG-08 cada fila abre el legajo | 9 | `escuadron-page.test.tsx` | — |
| CA-SEG-09 fallo en la primera carga: aviso con Reintentar | 10 | `escuadron-page.test.tsx` | — |
| CA-SEG-10 sin la dependencia 56 la columna no se pide | 11 | `escuadron-page.test.tsx` | 8 |
| CA-SEG-11 S28 en toda fila que no sea Apto, sin pedir nada más | 11 | `escuadron-page.test.tsx` | 1 |
| CA-ALE-01 columnas y 10 por página | 12 | `features/seguimiento/alertas-page.test.tsx` | 7 |
| CA-ALE-02 filtros y página en la URL | 12 | `alertas-page.test.tsx` | 7 |
| CA-ALE-03 los cinco tipos con su tono; orden por severidad y fecha | 13 | `alertas-page.test.tsx` | 1, 7 |
| CA-ALE-04 los cinco destinos | 13 | `alertas-page.test.tsx` | 7 |
| CA-ALE-05 S7 sin alertas | 12 | `alertas-page.test.tsx` | 7 |
| CA-ALE-06 el guardia de seis caracteres y los cuatro endpoints que nadie llama | 3 | `features/seguimiento/api.test.ts` | — |
| CA-ALE-07 sin la dependencia 66: S8 y ninguna petición | 13 | `alertas-page.test.tsx` | 8 |
| CA-ALE-08 fallo en la primera carga | 12 | `alertas-page.test.tsx` | — |
| CA-LEG-01 la cabecera, con `APaterno`/`AMaterno` | 14 | `features/seguimiento/legajo-page.test.tsx` | 4 |
| CA-LEG-02 las tres pestañas en la URL, con carga perezosa | 14 | `legajo-page.test.tsx` | — |
| CA-LEG-03 el historial práctico, paginado y filtrado | 14 | `legajo-page.test.tsx` | 4 |
| CA-LEG-04 el evaluador como texto, con S10 y sin enlace | 14 | `legajo-page.test.tsx` | — |
| CA-LEG-05 el reporte de sub fase | 16 | `legajo-page.test.tsx` | 4 |
| CA-LEG-06 los promedios y su media simple bajo S9 | 16 | `legajo-page.test.tsx` | 1, 4 |
| CA-LEG-07 los desaprobados con su propio permiso y S29 | 17 | `legajo-page.test.tsx` | 3 |
| CA-LEG-08 los turnos con S11 | 16 | `legajo-page.test.tsx` | — |
| CA-LEG-09 contadores, criterio, regla del Regular alternado, historial | 17 | `legajo-page.test.tsx` | 1, 4, 6 |
| CA-LEG-10 S12 con S30 o S31; la cadena y el estado registrado | 17 | `legajo-page.test.tsx` | 4 |
| CA-LEG-11 el historial teórico y las dos notas con S17 | 18 | `legajo-page.test.tsx` | 6 |
| CA-LEG-12 el estado teórico y sus causales en sus tres formas | 15 | `legajo-page.test.tsx` | 6 |
| CA-LEG-13 el NFPI con sus mitades y el desglose por sub fase | 15 | `legajo-page.test.tsx` | 5 |
| CA-LEG-14 S14 para un índice nulo; `null` propaga sin borrar la otra mitad | 15 | `legajo-page.test.tsx` | 5 |
| CA-LEG-15 la propiedad por rol: sesión para el alumno, URL para el personal | 18 | `features/seguimiento/cargar.test.ts`, `legajo-page.test.tsx` | 8 |
| CA-LEG-16 un panel que falla no tumba a los demás | 15 | `legajo-page.test.tsx` | — |
| CA-LEG-17 S13, S15, S16 y S1 fuera del modo mock; los reales siguen | 18 | `legajo-page.test.tsx` | 8 |
| CA-REP-01 columnas, dos decimales, 10 por página, el servidor ordena | 19 | `features/reportes/reportes-page.test.tsx` | 5 |
| CA-REP-02 programa y grupo en la URL; el puesto empieza en 1 por grupo | 19 | `reportes-page.test.tsx` | 5 |
| CA-REP-03 S22 con la fecha y la hora; S23 con el desempate | 19 | `reportes-page.test.tsx` | — |
| CA-REP-04 el desempate por NIA y el puesto que no se recalcula | 19 | `reportes-page.test.tsx` | 5 |
| CA-REP-05 sin NFPI: al final, sin puesto, con S14 y S24 | 20 | `reportes-page.test.tsx` | 5 |
| CA-REP-06 S25 sin alumnos con índices | 20 | `reportes-page.test.tsx` | 5 |
| CA-REP-08 fallo en la primera carga; S1 y S26 fuera del modo mock | 20 | `reportes-page.test.tsx` | 8 |

**Counts:** 43 criteria, 20 tasks, **no task above four**. Tasks 1, 2, 4, 5, 6, 7 and 8 claim none and carry `M5-n` or `contrato §n.n` titles instead; tasks 9, 11, 12, 14, 15 and 19 carry four; tasks 10, 13, 16, 17, 18 and 20 carry three; task 3 carries one.

| Decision | Tasks | Proven by |
|---|---|---|
| M5-1 one contract, version 1 | 2–7 | the six mock suites (every message, shape and permission is the contract's) |
| M5-2 the arithmetic is the server's; M5 derives no index | 5, 15 | `mocks/sigeda/indices.test.ts`, `legajo-page.test.tsx` (the server contradicts its own halves and the screen prints what it was given) |
| M5-3 dependency 8 split into 61, 62 and 63 | 8, 19 | `lib/dependencias.test.ts`, `reportes-page.test.tsx` |
| M5-4 exactly one Derived figure, and it is not an index | 1, 16 | `lib/dominio/seguimiento.test.ts`, `legajo-page.test.tsx` |
| M5-5 Escuadrón gated by `View My Group` with `View All Groups` as a switch | 2, 8 | `features/seguimiento/api.test.ts`, `lib/auth/rutas-m5.test.tsx` |
| M5-6 Seguimiento reads the two catalogues itself | 2, 9, 10 | `api.test.ts`, `escuadron-page.test.tsx` |
| M5-7 Alertas is Contract, not a loop | 7, 12, 13 | `mocks/sigeda/seguimiento.test.ts`, `alertas-page.test.tsx` |
| M5-8 the `desaprobados` hole is surfaced, never exploited | 3 | `mocks/sigeda/desaprobados.test.ts`, `api.test.ts` |
| M5-9 three tabs over ten panels, each with its own everything | 14–18 | `legajo-page.test.tsx` |
| M5-10 `/mi-legajo` redirects; ownership stated per role | 8, 18 | `rutas-m5.test.tsx`, `features/seguimiento/cargar.test.ts` |
| M5-11 risk is not surfaced at all | 20 | **by absence**: there is no `features/riesgo/`, no `/prediction` reference in `src/features` and no mock for it; contract §8 carries the analysis. Verified by inspection in T20, not by a test |
| M5-12 what would have to be true before risk is surfaced | 20 | `docs/decisiones.md` (the order 49 → 9 → id mapping → recalibration) |
| M5-13 the chequeo panel displays the cycle, never recomputes it | 4, 17 | `mocks/sigeda/alumnos.test.ts`, `legajo-page.test.tsx` |
| M5-14 seven causal codes, reconciled through the periodicity table | 1, 6, 15 | `seguimiento.test.ts`, `mocks/sigeda/estado-teorico.test.ts`, `legajo-page.test.tsx` |
| M5-15 the theory history returns and states the prevailing grade | 6, 18 | `mocks/sigeda/cuestionarios-historial.test.ts`, `legajo-page.test.tsx` |
| M5-16 bulk `estado-teorico` for Escuadrón; the M1 form deferred | 2, 11 | `api.test.ts`, `escuadron-page.test.tsx` |
| M5-17 inasistencias deferred, `reduccionPorRezagadoAplicada` always false | 5 | `mocks/sigeda/indices.test.ts` |
| M5-18 the theory-turno overlap stays deferred | 20 | `docs/decisiones.md` |
| M5-19 `Create Reports` stays as `Role.java` has it | 5, 8 | `indices.test.ts` (the Jefe is refused), `rutas-m5.test.tsx` (he does not see the screen) |
| M5-20 two feature folders and one domain module | 1 | `lib/dominio/seguimiento.test.ts` and the file map |
| M5-21 eight handlers, three of them endpoints never mocked | 3–7 | the six mock suites |
| M5-22 seven dependency gates | 8 | `lib/dependencias.test.ts`, `rutas-m5.test.tsx`, `components/aviso-de-dependencia.test.tsx` |
| M5-23 one M4 minor fixed, four deferred out of the thesis | 1, 20 | `lib/use-retardo.test.tsx`, `docs/decisiones.md` |
| M5-24 Escuadrón marks the alumnos who are not `Apto` | 1, 11 | `seguimiento.test.ts`, `escuadron-page.test.tsx` |

Baseline tests this plan edits, and why:

| File | Edit | Task |
|---|---|---|
| `lib/dominio/vocabulario.test.ts` | one case for the `severidad` and `tipoAlerta` vocabularies | 1 |
| `features/grupos/grupos-page.test.tsx` | the descending sort by name now starts with `Promoción 2026-A` | 3 |
| `features/turnos-teoricos/formulario-turno-teorico.test.tsx` | the grupo option reads `Promoción 2026-A · 1 alumno` | 3 |
| `mocks/sigeda/turnos-teoricos.test.ts` | the list gains turnos 6 and 7 (total 5 → 7, two rows first), `items[0]` becomes a `find` by id, `SUBSANACION` 1 → 2, `fechaPost hoy−6` 1 → 3 | 6 |
| `features/turnos-teoricos/turnos-teoricos-page.test.tsx` | the unfiltered counts 5 → 7 and 4 → 6, and the two first-row blocks read their row by its link instead of by position | 6 |
| `lib/dependencias.test.ts` | one case for the seven M5 keys | 8 |
| `lib/auth/pantallas.test.ts` | the three menu expectations gain `Mi legajo` (Alumno), `Escuadrón`/`Alertas`/`Reportes y orden de mérito` (Instructor) and the `Seguimiento` group; two cases added for the registry and the M5 breadcrumbs | 8 |

No other baseline test changes and none is relaxed. `cobertura-de-rutas.test.ts` keeps proving that every route under `/_app` guards its own screen, now with five more — and T8 adds the assertion it structurally cannot make.

Spec §8 items covered by M5: pages for all five screens and **no dialog, confirm or toast anywhere** (it is the only read-only milestone); empty states with their own sentence (S2, S6, S7, S25) and never a headers-only table beside them; `tabular-nums` on every grade, index, weight, counter and date; grades and indices with two decimals through `formatearNota`, theory grades through `textoConMinimo`; dates as `dd/MM/yyyy`; semantic colour only through `StatusBadge` and its two new vocabularies plus the `text-tono-*` tokens for S28; breadcrumbs on the two nested screens; the sidebar's `Seguimiento` group between `Teoría` and `Aprendizaje`; and the legajo's tabs as links so the section is shareable and survives a reload.

# M4 Teoría y banco de preguntas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The nine M4 screens of spec §16.3 (Banco de preguntas, Importar desde IA, Turnos teóricos, Registrar y Modificar turno teórico, Resultados por turno, Mis exámenes, Rendir examen, Resultado del examen) working against MSW mocks of `docs/contrato-api-teoria.md` version 2 revision 2, with the 63 acceptance criteria CA-BAN-01..14, CA-IMP-01..11, CA-TUT-01..14, CA-EXA-01..13 and CA-RES-01..13 (minus the retired CA-RES-05 and CA-RES-11) proven by tests, plus the M1 subsanación hook that dependency 7 finally makes possible.

**Architecture:** Contract-first, as in M1–M3. The theory fixtures of contract §9 live in `src/mocks/sigeda/semilla-teoria.ts` and are folded into the one in-memory store `crearDatos(hoy)` already builds, so `reiniciarDatosMock()` resets them after every test; the handlers are `src/mocks/sigeda/{preguntas,turnos-teoricos,cuestionarios-teoria,estado-teorico}.ts` registered in `src/mocks/handlers.ts` beside the others under the same `VITE_MOCK_API` flag (M4-18). Three feature folders — `src/features/{preguntas,turnos-teoricos,examenes}/` (M4-13) — each hold `api.ts` (types, zod parsing, query-key factory, queries and mutations against `lib/api/sigeda.ts`), `schemas.ts` (the URL search schemas and the form schemas), their pages and their `components/`. Domain helpers that do not touch the network — the labels of the five theory enums, the 20-point rule, the alternativa rules per `TipoPregunta`, the derived window state, the countdown formatting, `notaMinimaAplicada`'s display and the fixed texts E1–E29 — live in `src/lib/dominio/teoria.ts`. Routing, permissions and the sidebar stay where M0–M3 put them: nine new screens in the Teoría group, three of them `roles: SOLO_ALUMNO` (M4-14), and six new keys in `src/lib/dependencias.ts` for the actions that wait on backend dependencies 5, 6 and 7 (M4-17). Timing is the shared convention of M3 (`relojFalso()`) plus `abrirVentanaDeExamen()`, landed in Task 1 before anything timed (M4-19).

**Tech Stack:** as M3 (Vite 8.3 · React 19.3 · TypeScript 6.0.3 · TanStack Router 1.170 · TanStack Query 5.103 · TanStack Table 9.2 · zod 4.6 · react-hook-form 7.88 · @hookform/resolvers 5.9 · shadcn/ui 4.21 over radix-ui 1.6 · sonner 2.0.8 · lucide-react 1.47 · MSW 2.15 · Vitest 5.0.1 · @testing-library/react 16.3 · @testing-library/user-event 14.6.7 · jsdom 30.1 · oxlint 1.83). **No new dependency and no new shadcn component**: every control M4 needs is already vendored.

**Spec:** `docs/superpowers/specs/2026-09-19-sigeda-web-design.md` — §5 (session, permissions, API layer), §8 (design), §9 (testing) and **§16 (M4 addendum: decisions M4-1..M4-23, the screens and fixed texts E1–E29 of §16.3, the 63 criteria of §16.4 and dependencies 51–60 of §16.5; binding)**. Everything in §16.6 is out of scope. API contract the mocks implement: `docs/contrato-api-teoria.md` version 2 revision 2, in particular its messages D1–D28 (§7), its fixtures (§9) and the grupo catalogue of §3.0. Both documents are already committed on this branch; no task copies them.

**Baseline:** branch `feat/m4-teoria-banco` at `aeb3a82` = M3 final merged into main (`b0f2aca`) plus two docs commits (the M4 spec addendum with `docs/contrato-api-teoria.md`, and the addendum review). Facts of that baseline this plan relies on: the suite has **602 tests** in 84 files; `pnpm verify` is `tsc -b && oxlint --deny-warnings && vitest run && vite build`; `crearQueryClient()` sets `staleTime: 30_000` and `renderApp` builds its client from it with `reintentar: false`; `src/test/tiempo.ts` already exports `relojFalso()` and `src/test/setup.ts` returns to real timers in its `afterEach`; `errorDePrimeraCarga` returns an error only for a query that never had data; `sigeda.pagina` and `sigeda.lista` turn a 404 into an empty page or list (`src/lib/api/http.ts:138-154`); `normalizarError` shows a plain-text body verbatim below 500 (`errors.ts:91`), a text 403 verbatim (`:89`) and splits a JSON array of `'campo': mensaje` into field errors (`:90`); `aplicarErroresDeCampo` + `rutaDeCampo` already turn `alternativas[0].respuesta` into `alternativas.0.respuesta`; `aNota` (`src/features/evaluaciones/api.ts:111-115`) coerces a number or a string; `paginar` in `src/mocks/sigeda/comun.ts:71-113` replicates `Page_Sort` including its 400 bodies; `MateriaMock.conPreguntas` is still a hand-set boolean; `pantallas.ts` already declares the `Teoría` group in `ORDEN_GRUPOS` with no screen in it; `permisos.ts:22` already ships `Manage Subjects`, `Manage Questions`, `Manage Exams` and `Take Exams` in `PERMISOS_CONTRATO`; `cobertura-de-rutas.test.ts` fails if a route under `/_app` has no screen or guards the wrong one; `src/mocks/ia/cuestionarios.ts` already exists and `handlers.ts` already imports `handlersCuestionarios`.

**Verified against that exact baseline before writing this plan:** a clone at `aeb3a82` received every task below in order, with `pnpm verify` green after each one (final: **809 tests** in 104 files). APIs checked in that work (versions from `package.json`):

- **Vitest 5.0.1 fake timers.** `relojFalso()`'s `vi.useFakeTimers({ shouldAdvanceTime: true })` makes the fake clock **follow real time as well as `avanzar()`**, so a debounce boundary cannot be asserted to the millisecond: the autosave test advances 1 000 ms (no request yet) and then 1 200 ms (request sent) instead of 1 999 / 1. `vi.setSystemTime()` throws unless timers are faked, which is why `abrirVentanaDeExamen()` guards with `vi.isFakeTimers()`.
- **@testing-library/user-event 14.6.7.** `selectOptions` accepts a value, an option element or the option's exact text, **not a RegExp** (it fails with `Value "/Grupo 3/" not found in options`), so every select in the plan's tests is driven by its `value`. `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` still comes from `relojFalso()` and `renderApp(ruta, usuario)` takes that instance.
- **@testing-library/dom 10.4.2.** `getByText` does not match text split across nodes, so `{horaInicio}–{horaFin}` and `Tiempo restante: {valor}` are read through the element's `textContent` (`valorDe(etiqueta)`, `segundosRestantes()`) rather than by string.
- **MSW 2.15.** `server.events.on('request:start', …)` plus `removeListener` counts the generations, the autosaves and the single `entregar`; `delay(500)` inside a handler resolves exactly when the fake clock reaches it; `GET /api/turnos-teoricos/grupos` must be registered **before** `GET /api/turnos-teoricos/:id` or the parameterised route swallows it; a 409 is `HttpResponse.text(mensaje, { status: 409 })`, which `errors.ts:91` shows verbatim.
- **TanStack Query 5.103.** `placeholderData: keepPreviousData` does **not** survive an error on a *new* query key, so a failed page change does legitimately show the first-load notice; the rule "a failed background refetch never replaces content" is about the same key and stays covered by `errorDePrimeraCarga`. `useQueries({ queries: [...] })` accepts an array built at render time from `queryOptions`, which is what lets the turno práctico form ask about exactly the alumnos it already has. A `queryFn` that POSTs plus `staleTime: Number.POSITIVE_INFINITY` runs the idempotent `iniciar` once per mount, which is what CA-EXA-03 and CA-EXA-08 need. `mutation.mutateAsync` is stable across renders, so it can be a `useCallback` dependency.
- **TanStack Router 1.170.** `src/routeTree.gen.ts` is written by `@tanstack/router-plugin` during `vite build`, and `RutaApp` comes from it: **`pnpm exec vite build` must run once after the nine route files exist, before `tsc -b` will accept the new `PANTALLAS` routes**. `getRouteApi(...).useSearch()` plus `useNavigate({ search })` keep the filters in the URL with no local mirror.
- **zod 4.6 + react-hook-form 7.88 + @hookform/resolvers 5.9.** `z.enum(TIPOS_EXAMEN.map((tipo) => tipo.valor))` works over a readonly tuple; `.optional().catch(undefined)` is what makes a mistyped URL fall back; an array `.min()` error lands in `errors.<array>.root ?? errors.<array>`; `useFieldArray` + `useWatch` give the live 20-point counter without mirroring the form in state.
- **Radix (radix-ui 1.6) through shadcn 4.21.** `ToggleGroup type="single"` renders `role="radio"` with `aria-checked`, so it serves both the "which alternativa is correct" picker and the alumno's answers with no new primitive; `Textarea`, `NativeSelect`, `Checkbox`, `AlertDialog` and `Table` are the ones M2/M3 already vendored.
- **oxlint 1.83 with `--deny-warnings`.** Two rules shaped the exam screen: `react(immutability)` rejects assigning to a **ref received as a prop** (the first autosave draft did exactly that), and `react(only-export-components)` rejects exporting constants from a `.tsx` component file. Hence the autosave lives in `useAutoguardado` with its pure parts in `autoguardado.ts`, and `ResolucionDeExamen` is presentational.
- **sonner 2.0.8.** `toast.info` exists; a toast asserted under fake timers needs the clock advanced once after the navigation, so the two E16 tests wait for the pathname and then advance before querying the text.
- **lucide-react 1.47.** `CalendarCheck`, `FileQuestion`, `GraduationCap`, `Sparkles` and `Timer` all exist and are the icons the nine screens use.
- **On the real baseline:** `pnpm exec vite build` regenerates `routeTree.gen.ts` with exactly the nine new routes; a production build contains no theory fixture (Task 18 checks it); the three `pantallas.test.ts` menu expectations and the three `modificar-turno-page.test.tsx` save flows are the only baseline tests this plan has to edit.

## Global Constraints

- Repo: `/Volumes/ORICO/projects/personal/tesis-project/sigeda-web`. Work on branch **`feat/m4-teoria-banco`**, which already holds the M4 docs and this plan at `aeb3a82` and later (Task 1, Step 1 confirms it).
- Node is not on `PATH` in non-interactive shells. Prefix **every** shell command with `export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH;`.
- pnpm only (11.15.0). Never `npm` or `npx`.
- TypeScript `~6.0.3`, `erasableSyntaxOnly`: no `enum`, no constructor parameter properties, no `namespace`.
- **No code comments** in any file you author (TS, TSX, CSS, JSON, Markdown code blocks). `src/components/ui/*` and `src/hooks/use-mobile.ts` are vendored shadcn output: do not touch them.
- All UI text in Spanish. Domain identifiers in Spanish (`preguntas`, `alternativas`, `turnosTeoricos`, `cuestionarios`, `examenes`). **User-facing copy says "examen", never "cuestionario"** (M4-18): `cuestionario` is M3's practice quiz.
- No colour literals in components: only Tailwind classes backed by tokens in `src/theme.css`, `StatusBadge` with its vocabulary in `src/lib/dominio/vocabulario.ts`, `Enlace` and the shared modules.
- Tests that prove an acceptance criterion carry its ID at the start of the test name (`it('CA-BAN-01 …')`). Tests that only prove a decision or a contract fixture carry `M4-n` or `contrato §n.n`.
- Test files never live under `src/routes/`.
- Gate for every task: `pnpm verify` (typecheck → oxlint → vitest → build) exits 0 before committing.
- Commits: Conventional Commits, one short subject line, **no `Co-Authored-By` trailer**.
- **M4 additions:**
- The MSW handlers of `src/mocks/sigeda/` implement `docs/contrato-api-teoria.md` exactly: the `Page_Sort` envelope through `paginar`, plain-text 404s through `textoNoEncontrado`, plain-text 409s through `HttpResponse.text(mensaje, { status: 409 })`, the bare JSON array of `'campo': mensaje` through `erroresDeCampo`, the manual `201 {mensaje, entidad}` bodies of M4-16, and `autorizar(request, permiso)` on every route.
- Every write carries `codInstructor` and every alumno-scoped call carries `codAlumno` (M4-2). The value **always** comes from the session — `useSesion()?.codPersona` in a screen, `context.sesion.actual()?.codPersona` in a loader — and **never** from a route parameter. `$id` on the three alumno routes is a **turno teórico** id.
- The frontend never recomputes a grade or a minimum: `nota`, `aprobado` and `notaMinimaAplicada` are displayed as they arrive, through `aNota` and `textoConMinimo` (M4-11).
- Every criterion with an interval, a debounce or a deadline (CA-IMP-02, CA-EXA-05, CA-EXA-06, CA-EXA-09) uses `relojFalso()`, and every criterion that needs the exam window open also uses `abrirVentanaDeExamen()` (M4-19). Never a real wait, never `setTimeout` in a test.
- Absences are exercised with a per-test `server.use(...)` (contract §9.5): an empty bank (D1), an empty turno list (D5), a materia without questions (E12), a failing autosave (E14), an unavailable `estado-teorico` (E23) and the `PRE_SOLO` turno of CA-RES-13. The alumno without pending exams is **not** an override: `alumno.falconi` (222222) has none by construction.
- Every query that feeds a screen handles its own first-load error with Reintentar through `errorDePrimeraCarga`; a catalogue that fails warns under its own selector without blocking the screen. Forms mount only once their data is there. A mutation invalidates every key that reads what it changed.
- Answers and keys that must not be visible are **conditionally rendered, never CSS-hidden**: `iniciar` never sends `correcto` or `explicacion`, and the result screen renders `calificaciones` only when the turno is `FINALIZADO`.
- Files M0–M3 own are changed with the exact edits given, never rewritten wholesale, except where a step says "Replace … with" and carries the complete new content. Every quoted "replace" snippet was checked against `aeb3a82` plus the previous tasks; if the text differs, stop and report instead of guessing.

---

## File map

```
sigeda-web/
├── README.md · docs/decisiones.md                      (T18: M4 section, contract, dependencies 5, 6 and 7)
└── src/
    ├── components/aviso-de-teoria.tsx                  E1 por pantalla, atado a dependencias.ts (T5)
    ├── lib/
    │   ├── auth/pantallas.ts                           las nueve pantallas de Teoría (T5)
    │   ├── dependencias.ts                             gestionarMaterias, gestionarPreguntas, importarPreguntas,
    │   │                                               programarTurnoTeorico, rendirExamen, bloqueoSubsanacion (T5)
    │   └── dominio/teoria.ts · dominio/vocabulario.ts  enums, ventana, cuenta atrás, textos E1–E29 (T1, T9)
    │                                                   estados del turno teórico y de la rendición (T1, T13)
    ├── features/
    │   ├── preguntas/
    │   │   ├── api.ts · schemas.ts                     CRUD y lote (T2) · búsqueda (T5), formulario (T7), lote (T9)
    │   │   ├── importacion.ts                          mapeo desde la IA, avisos y cuerpo del lote (T10)
    │   │   ├── columnas.tsx                            columnas del banco (T6) y sus acciones (T7, T8)
    │   │   ├── banco-page.tsx · importar-page.tsx      (T5, T6, T7) · (T5, T9, T10)
    │   │   └── components/                             dialogo-pregunta (T7) · eliminar-pregunta (T8) ·
    │   │                                               formulario-importacion (T9) · tabla-de-importacion (T10)
    │   ├── turnos-teoricos/
    │   │   ├── api.ts · schemas.ts · cargar.ts         catálogo, lista, detalle, CRUD (T3, T12) · (T5, T12) · (T5, T13)
    │   │   ├── columnas.tsx                            lista con estado y acciones (T11)
    │   │   ├── turnos-teoricos-page.tsx                lista, filtros y URL (T5, T11)
    │   │   ├── registrar-…-page.tsx · modificar-…-page.tsx · resultados-turno-page.tsx  (T5, T12) · (T5, T12) · (T5, T13)
    │   │   └── components/                             eliminar-turno-teorico (T11) · formulario-turno-teorico (T12)
    │   ├── examenes/
    │   │   ├── api.ts · cargar.ts · mensajes.ts        pendientes, iniciar, respuestas, entregar, estado (T4, T15) ·
    │   │   │                                           propiedad del alumno (T5) · D8, D10 y D11 (T15)
    │   │   ├── autoguardado.ts · use-autoguardado.ts   partes puras (T15) · rebote de 2 s y máximo de 10 s (T15)
    │   │   ├── mis-examenes-page.tsx                   pendientes con E13, E21 y E24 (T5, T14)
    │   │   ├── rendir-examen-page.tsx                  inicio y autoguardado (T5, T15) · cuenta atrás y entrega (T16)
    │   │   ├── resultado-examen-page.tsx               nota, E19 y detalle del turno finalizado (T5, T17)
    │   │   └── components/                             resolucion-de-examen (T15) · cabecera-de-examen (T16)
    │   ├── materias/materias-page.tsx                  escrituras atadas a la dependencia 5 (T5)
    │   └── turnos/
    │       ├── use-estado-teorico.ts                   estado teórico por alumno del formulario (T19)
    │       └── components/formulario-turno.tsx         E22 y E23 por fila, y el bloqueo de Guardar (T19)
    ├── mocks/
    │   ├── handlers.ts                                 registro de los cuatro módulos de teoría (T2, T3, T4)
    │   ├── ia/cuestionarios.ts                         el cuestionario de importación de §9.4 (T9)
    │   └── sigeda/
    │       ├── semilla-teoria.ts · datos.ts            fijaciones §9 y secuencias (T1) · derivaciones (T1, T3)
    │       ├── materias.ts                             409 derivado, sin conPreguntas (T1)
    │       ├── preguntas.ts · turnos-teoricos.ts       §2 (T2) · §3 más el cierre perezoso de §4.7 (T3)
    │       └── cuestionarios-teoria.ts · estado-teorico.ts   §4 (T4) · §5 (T4)
    ├── routes/_app/banco/ · _app/teoria/turnos/ · _app/examenes/   nueve rutas (T5)
    └── test/tiempo.ts                                  abrirVentanaDeExamen (T1)
```

---

### Task 1: Timing and fixture machinery: the contract §9 seed, `abrirVentanaDeExamen()` and `src/lib/dominio/teoria.ts` (M4-18, M4-19) (CA-RES-13)

**Files:**

- Create: `src/mocks/sigeda/semilla-teoria.ts`
- Test: `src/mocks/sigeda/semilla-teoria.test.ts`
- Modify: `src/mocks/sigeda/datos.ts`
- Modify: `src/mocks/sigeda/materias.ts`
- Create: `src/lib/dominio/teoria.ts`
- Test: `src/lib/dominio/teoria.test.ts`
- Modify: `src/lib/dominio/vocabulario.ts`
- Modify (full rewrite): `src/test/tiempo.ts`
- Modify: `src/test/tiempo.test.tsx`

**Interfaces:**
- Consumes: `crearDatos(hoy)`, `datos()`, `siguienteId`, `reiniciarDatosMock()` (already called by `src/test/setup.ts` in every `afterEach`), `sumarDias`/`momento` from `lib/dominio/calendario`, `relojFalso()` from `src/test/tiempo.ts`, `MARCADOR_COMPLETAR` and `TEXTO_GENERACION_RECHAZADA` from `lib/dominio/aprendizaje`.
- Produces:
  - `src/mocks/sigeda/semilla-teoria.ts`: the mock types of the seven new tables, `crearTeoria(hoy)` with the 24 preguntas / 71 alternativas / 5 turnos teóricos / 3 exámenes of contract §9, `minimoAplicado(notaMinima, tipoExamen)` (the server's Pre-Solo rule) and `ID_TURNO_ABIERTO`.
  - `src/mocks/sigeda/datos.ts`: `DatosMock` gains `preguntas`, `alternativas`, `turnosTeoricos`, `preguntasTurno` and `cuestionarios`; `Secuencias` gains `pregunta` 25, `alternativa` 101, `turnoTeorico` 6 and `cuestionario` 4; `MateriaMock.conPreguntas` is **deleted**; the store gains the query helpers every later task reads (`buscarMateria`, `buscarTurnoTeorico`, `buscarPregunta`, `alternativasDePregunta`, `preguntasDelTurno`, `preguntaEnUso`, `materiaEnUso`, `alumnosDeGrupo`, `cuestionarioDe`).
  - `src/mocks/sigeda/materias.ts`: the `409` of `DELETE /api/materias/{id}` becomes derived from the preguntas and turnos teóricos of the store (gap 10).
  - `src/lib/dominio/teoria.ts`: the five enums with their Spanish labels, `alternativasRequeridas`, `exigeTurnoOrigen`, `estadoDeVentana`, `milisegundosRestantes`, `formatearRestante`, `textoConMinimo` and the fixed texts E1–E29 of §16.3.
  - `src/lib/dominio/vocabulario.ts`: the `turnoTeorico`, `rendicion` and `examen` vocabularies for `StatusBadge`.
  - `src/test/tiempo.ts`: `abrirVentanaDeExamen({ transcurridos, restantes })`, called **after** `relojFalso()`, which pins the fake clock to 09:00 of today and rewrites the hours of turno teórico 3 around it.

- [ ] **Step 1: Confirm the baseline**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git rev-parse --abbrev-ref HEAD && git log --oneline -1 && pnpm test:run 2>&1 | tail -4
```

Expected: branch `feat/m4-teoria-banco`, HEAD `aeb3a82 docs: apply m4 addendum review`, **602 tests** in 84 files, all green. If any of the three differs, stop and report.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/dominio/teoria.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  alternativasRequeridas,
  estadoDeVentana,
  etiquetaDeDificultad,
  etiquetaDeOrigen,
  etiquetaDeTipoExamen,
  etiquetaDeTipoPregunta,
  exigeTurnoOrigen,
  formatearRestante,
  MARCADOR_COMPLETAR,
  milisegundosRestantes,
  textoBloqueadoPorSubsanacion,
  textoConMinimo,
  textoPuntajeAsignado,
  textoRespondidas,
  textoSeHabilita,
  textoSinResponder,
  TIPOS_EXAMEN,
} from './teoria'

describe('vocabulario de teoría', () => {
  it('M4-13 etiqueta los cuatro enumerados del contrato en español', () => {
    expect(etiquetaDeTipoPregunta('OPCION_MULTIPLE')).toBe('Opción múltiple')
    expect(etiquetaDeTipoPregunta('VERDADERO_FALSO')).toBe('Verdadero o falso')
    expect(etiquetaDeTipoPregunta('COMPLETAR')).toBe('Completar')
    expect(etiquetaDeDificultad('MEDIA')).toBe('Media')
    expect(etiquetaDeOrigen('IA')).toBe('IA')
    expect(etiquetaDeTipoExamen('PRE_SOLO')).toBe('Pre-Solo')
    expect(etiquetaDeTipoExamen('SUBSANACION')).toBe('Subsanación')
  })

  it('M4-22 los once tipos de examen del contrato están disponibles', () => {
    expect(TIPOS_EXAMEN.map((tipo) => tipo.valor)).toEqual([
      'TEST',
      'EXAMEN',
      'SEMANAL',
      'QUINCENAL',
      'MENSUAL',
      'SEMESTRAL',
      'INOPINADO',
      'PRE_SOLO',
      'SUBSANACION',
      'REZAGADO',
      'BALOTAS',
    ])
  })

  it('devuelve el valor original cuando no conoce la etiqueta', () => {
    expect(etiquetaDeTipoPregunta('OTRO')).toBe('OTRO')
  })
})

describe('reglas por tipo de pregunta', () => {
  it('CA-BAN-05 CA-BAN-06 CA-BAN-07 fija la cantidad de alternativas de cada tipo', () => {
    expect(alternativasRequeridas('OPCION_MULTIPLE')).toBe(4)
    expect(alternativasRequeridas('VERDADERO_FALSO')).toBe(2)
    expect(alternativasRequeridas('COMPLETAR')).toBe(1)
    expect(MARCADOR_COMPLETAR).toBe('_____')
  })

  it('CA-TUT-08 solo la subsanación y el rezagado exigen turno de origen', () => {
    expect(exigeTurnoOrigen('SUBSANACION')).toBe(true)
    expect(exigeTurnoOrigen('REZAGADO')).toBe(true)
    expect(exigeTurnoOrigen('MENSUAL')).toBe(false)
  })
})

describe('ventana del examen', () => {
  const fecha = '2026-09-25'

  it('M4-8 deriva el estado del turno de la fecha y las dos horas', () => {
    expect(estadoDeVentana(fecha, '09:00', '10:00', new Date(2026, 8, 25, 8, 59))).toBe('PROGRAMADO')
    expect(estadoDeVentana(fecha, '09:00', '10:00', new Date(2026, 8, 25, 9, 30))).toBe('EN_CURSO')
    expect(estadoDeVentana(fecha, '09:00', '10:00', new Date(2026, 8, 25, 10, 1))).toBe('FINALIZADO')
  })

  it('CA-EXA-06 cuenta los milisegundos que faltan y nunca baja de cero', () => {
    expect(milisegundosRestantes(fecha, '10:00', new Date(2026, 8, 25, 9, 55))).toBe(5 * 60_000)
    expect(milisegundosRestantes(fecha, '10:00', new Date(2026, 8, 25, 10, 30))).toBe(0)
  })

  it('CA-EXA-06 formatea el tiempo restante en minutos y segundos', () => {
    expect(formatearRestante(5 * 60_000)).toBe('05:00')
    expect(formatearRestante(59_000)).toBe('00:59')
    expect(formatearRestante(0)).toBe('00:00')
    expect(formatearRestante(3_900_000)).toBe('1:05:00')
  })
})

describe('textos fijos de M4', () => {
  it('CA-RES-03 muestra la nota con dos decimales junto al mínimo aplicable', () => {
    expect(textoConMinimo(12, 18)).toBe('12.00 / mínimo 18')
    expect(textoConMinimo(null, 20)).toBe('— / mínimo 20')
  })

  it('arma los textos E9, E13, E18, E22 y E29 con sus valores', () => {
    expect(textoPuntajeAsignado(16)).toBe('Puntaje asignado: 16 de 20.')
    expect(textoSeHabilita('2026-09-28', '09:00')).toBe('Se habilita el 28/09/2026 a las 09:00.')
    expect(textoSinResponder(3)).toBe('Quedan 3 preguntas sin responder: se califican con 0.')
    expect(textoBloqueadoPorSubsanacion('Desaprobó Mensual.')).toBe('Subsanación pendiente: Desaprobó Mensual.')
    expect(textoRespondidas(2, 5)).toBe('Respondidas: 2 de 5.')
  })
})
```

Create `src/mocks/sigeda/semilla-teoria.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { estadoDeVentana } from '@/lib/dominio/teoria'
import {
  alternativasDePregunta,
  cuestionarioDe,
  datos,
  materiaEnUso,
  preguntaEnUso,
  preguntasDelTurno,
} from './datos'
import { minimoAplicado, PUNTAJE_POR_PREGUNTA } from './semilla-teoria'

describe('contrato §9.1 preguntas de la semilla', () => {
  it('siembra 24 preguntas con ids de 1 a 24 y 71 alternativas', () => {
    expect(datos().preguntas.map((pregunta) => pregunta.id)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
    expect(datos().alternativas).toHaveLength(71)
    expect(datos().alternativas.at(-1)?.id).toBe(71)
    expect(datos().secuencias.alternativa).toBe(101)
    expect(datos().secuencias.pregunta).toBe(25)
  })

  it('la materia 3 tiene diez preguntas y cada dificultad devuelve al menos dos filas', () => {
    const materia3 = datos().preguntas.filter((pregunta) => pregunta.idMateria === 3)
    expect(materia3).toHaveLength(10)
    for (const dificultad of ['BAJA', 'MEDIA', 'ALTA']) {
      expect(materia3.filter((pregunta) => pregunta.dificultad === dificultad).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('cada materia sembrada tiene los tres tipos de pregunta y las ids 9 y 10 son de IA', () => {
    for (const idMateria of [3, 6, 4, 1]) {
      const tipos = new Set(datos().preguntas.filter((p) => p.idMateria === idMateria).map((p) => p.tipoPregunta))
      expect([...tipos].sort()).toEqual(['COMPLETAR', 'OPCION_MULTIPLE', 'VERDADERO_FALSO'])
    }
    expect(datos().preguntas.filter((pregunta) => pregunta.origen === 'IA').map((pregunta) => pregunta.id)).toEqual([9, 10])
  })

  it('cada tipo respeta sus alternativas y su marcador', () => {
    for (const pregunta of datos().preguntas) {
      const alternativas = alternativasDePregunta(pregunta.id)
      expect(alternativas.filter((alternativa) => alternativa.correcto)).toHaveLength(1)
      if (pregunta.tipoPregunta === 'OPCION_MULTIPLE') expect(alternativas).toHaveLength(4)
      if (pregunta.tipoPregunta === 'VERDADERO_FALSO') {
        expect(alternativas.map((alternativa) => alternativa.respuesta)).toEqual(['Verdadero', 'Falso'])
      }
      if (pregunta.tipoPregunta === 'COMPLETAR') {
        expect(alternativas).toHaveLength(1)
        expect(pregunta.enunciado).toContain('_____')
      }
    }
  })

  it('CA-BAN-11 solo las preguntas 16, 22, 23 y 24 se pueden eliminar', () => {
    const borrables = datos().preguntas.filter((pregunta) => !preguntaEnUso(pregunta.id)).map((pregunta) => pregunta.id)
    expect(borrables).toEqual([16, 22, 23, 24])
  })

  it('M4-18 el 409 de materias queda derivado de las preguntas y los turnos', () => {
    expect(datos().materias.filter((materia) => materiaEnUso(materia.id)).map((materia) => materia.id)).toEqual([1, 3, 4, 6])
    expect(Object.keys(datos().materias[0] ?? {})).not.toContain('conPreguntas')
  })
})

describe('contrato §9.2 turnos teóricos de la semilla', () => {
  it('siembra cinco turnos del instructor 444444 con 20 puntos cada uno', () => {
    expect(datos().turnosTeoricos.map((turno) => turno.id)).toEqual([1, 2, 3, 4, 5])
    expect(datos().secuencias.turnoTeorico).toBe(6)
    for (const turno of datos().turnosTeoricos) {
      expect(turno.codInstructor).toBe('444444')
      const preguntas = preguntasDelTurno(turno.id)
      expect(preguntas).toHaveLength(5)
      expect(preguntas.map((fila) => fila.orden)).toEqual([1, 2, 3, 4, 5])
      expect(preguntas.reduce((total, fila) => total + fila.puntajeMaximo, 0)).toBe(20)
      expect(PUNTAJE_POR_PREGUNTA).toBe(4)
    }
  })

  it('M4-19 el turno 3 abre todo el día con 00:00–23:59 y los demás quedan en su estado', () => {
    const turno3 = datos().turnosTeoricos[2]
    expect([turno3?.horaInicio, turno3?.horaFin]).toEqual(['00:00', '23:59'])
    expect(estadoDeVentana(turno3?.fechaExamen ?? '', '00:00', '23:59')).toBe('EN_CURSO')
    const estados = datos().turnosTeoricos.map((turno) => estadoDeVentana(turno.fechaExamen, turno.horaInicio, turno.horaFin))
    expect(estados).toEqual(['FINALIZADO', 'FINALIZADO', 'EN_CURSO', 'PROGRAMADO', 'PROGRAMADO'])
  })

  it('el turno 5 es una subsanación del turno 1 sobre la misma materia y grupo', () => {
    const subsanacion = datos().turnosTeoricos[4]
    expect(subsanacion?.tipoExamen).toBe('SUBSANACION')
    expect(subsanacion?.idTurnoOrigen).toBe(1)
    expect(subsanacion?.idMateria).toBe(3)
    expect(subsanacion?.idGrupo).toBe(3)
  })
})

describe('contrato §9.3 exámenes de la semilla', () => {
  it('siembra tres exámenes con las notas exactas 20.00, 12.00 y ninguna', () => {
    expect(datos().cuestionarios.map((cuestionario) => [cuestionario.id, cuestionario.codAlumno, cuestionario.nota])).toEqual([
      [1, '555555', 20],
      [2, '666666', 12],
      [3, '111111', null],
    ])
    expect(datos().secuencias.cuestionario).toBe(4)
  })

  it('CA-RES-13 el mínimo aplicado es el de la materia salvo en un Pre-Solo', () => {
    expect(minimoAplicado(16, 'MENSUAL')).toBe(16)
    expect(minimoAplicado(16, 'PRE_SOLO')).toBe(18)
    expect(minimoAplicado(20, 'PRE_SOLO')).toBe(20)
    expect(cuestionarioDe(1, '666666')?.notaMinimaAplicada).toBe(18)
    expect(cuestionarioDe(1, '666666')?.aprobado).toBe(false)
    expect(cuestionarioDe(1, '555555')?.aprobado).toBe(true)
  })

  it('el examen 2 acierta las preguntas 1, 2 y 4 y suma 12 puntos', () => {
    const examen = cuestionarioDe(1, '666666')
    expect(examen?.calificaciones.filter((fila) => fila.correcto).map((fila) => fila.idPregunta)).toEqual([1, 2, 4])
    expect(examen?.calificaciones.reduce((total, fila) => total + fila.puntajeObtenido, 0)).toBe(12)
    expect(examen?.calificaciones.every((fila) => fila.enunciado !== '' && fila.respuestaCorrecta !== '')).toBe(true)
  })

  it('el examen 3 está en curso con dos respuestas guardadas y sin calificaciones', () => {
    const examen = cuestionarioDe(3, '111111')
    expect(examen?.estado).toBe('EN_CURSO')
    expect(Object.keys(examen?.respuestas ?? {})).toEqual(['1', '3'])
    expect(examen?.calificaciones).toEqual([])
    expect(cuestionarioDe(2, '222222')).toBeUndefined()
  })
})
```

In `src/test/tiempo.test.tsx`, replace:

```tsx
import { iniciarComo, renderApp } from './render'
import { relojFalso } from './tiempo'
```

with:

```tsx
import { buscarTurnoTeorico } from '@/mocks/sigeda/datos'
import { ID_TURNO_ABIERTO } from '@/mocks/sigeda/semilla-teoria'
import { estadoDeVentana, milisegundosRestantes } from '@/lib/dominio/teoria'
import { iniciarComo, renderApp } from './render'
import { abrirVentanaDeExamen, relojFalso } from './tiempo'
```

Append to `src/test/tiempo.test.tsx`:

```tsx
describe('ventana del examen en las pruebas', () => {
  it('M4-19 abre la ventana del turno 3 alrededor del reloj falso', () => {
    relojFalso()
    const turno = abrirVentanaDeExamen({ transcurridos: 5, restantes: 25 })
    expect(turno.horaInicio).toBe('08:55')
    expect(turno.horaFin).toBe('09:25')
    expect(estadoDeVentana(turno.fechaExamen, turno.horaInicio, turno.horaFin)).toBe('EN_CURSO')
    expect(milisegundosRestantes(turno.fechaExamen, turno.horaFin)).toBe(25 * 60_000)
  })

  it('M4-19 avanzar el reloj los minutos restantes cierra la ventana', async () => {
    const { avanzar } = relojFalso()
    const turno = abrirVentanaDeExamen({ restantes: 10 })
    await avanzar(10 * 60_000 + 1000)
    expect(estadoDeVentana(turno.fechaExamen, turno.horaInicio, turno.horaFin)).toBe('FINALIZADO')
    expect(milisegundosRestantes(turno.fechaExamen, turno.horaFin)).toBe(0)
  })

  it('M4-19 exige el reloj falso y deja el turno en 00:00–23:59 después de reiniciar', () => {
    expect(() => abrirVentanaDeExamen()).toThrow('abrirVentanaDeExamen se llama despues de relojFalso()')
    const turno = buscarTurnoTeorico(ID_TURNO_ABIERTO)
    expect([turno?.horaInicio, turno?.horaFin]).toEqual(['00:00', '23:59'])
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dominio/teoria.test.ts src/mocks/sigeda/semilla-teoria.test.ts src/test/tiempo.test.tsx
```

Expected: FAIL — `Failed to resolve import "./teoria" from "src/lib/dominio/teoria.test.ts"` and `Failed to resolve import "./semilla-teoria" from "src/mocks/sigeda/semilla-teoria.test.ts"`, plus the same for `@/mocks/sigeda/semilla-teoria` inside `src/test/tiempo.test.tsx`.

- [ ] **Step 4: Land the contract §9 seed**

Create `src/mocks/sigeda/semilla-teoria.ts`:

```ts
import { sumarDias } from '@/lib/dominio/calendario'

export type TipoPreguntaMock = 'OPCION_MULTIPLE' | 'VERDADERO_FALSO' | 'COMPLETAR'

export type DificultadMock = 'BAJA' | 'MEDIA' | 'ALTA'

export type OrigenMock = 'MANUAL' | 'IA'

export type TipoExamenMock =
  | 'TEST'
  | 'EXAMEN'
  | 'SEMANAL'
  | 'QUINCENAL'
  | 'MENSUAL'
  | 'SEMESTRAL'
  | 'INOPINADO'
  | 'PRE_SOLO'
  | 'SUBSANACION'
  | 'REZAGADO'
  | 'BALOTAS'

export type EstadoCuestionarioMock = 'EN_CURSO' | 'ENTREGADO'

export type PreguntaMock = {
  id: number
  idMateria: number
  enunciado: string
  tipoPregunta: TipoPreguntaMock
  dificultad: DificultadMock
  explicacion: string | null
  origen: OrigenMock
  codInstructor: string
}

export type AlternativaMock = { id: number; idPregunta: number; respuesta: string; correcto: boolean }

export type TurnoTeoricoMock = {
  id: number
  nombre: string
  idMateria: number
  tipoExamen: TipoExamenMock
  fechaExamen: string
  horaInicio: string
  horaFin: string
  idGrupo: number
  codInstructor: string
  idTurnoOrigen: number | null
}

export type PreguntaTurnoMock = { idTurnoTeorico: number; idPregunta: number; orden: number; puntajeMaximo: number }

export type CalificacionTeoricaMock = {
  idPregunta: number
  orden: number
  enunciado: string
  respuestaCorrecta: string
  respuestaAlumno: string | null
  correcto: boolean
  puntajeMaximo: number
  puntajeObtenido: number
}

export type CuestionarioMock = {
  id: number
  idTurnoTeorico: number
  codAlumno: string
  estado: EstadoCuestionarioMock
  fechaEntrega: string | null
  horaEntrega: string | null
  nota: number | null
  notaMinimaAplicada: number
  aprobado: boolean | null
  orden: number[]
  respuestas: Record<number, string>
  calificaciones: CalificacionTeoricaMock[]
}

export type DatosTeoria = {
  preguntas: PreguntaMock[]
  alternativas: AlternativaMock[]
  turnosTeoricos: TurnoTeoricoMock[]
  preguntasTurno: PreguntaTurnoMock[]
  cuestionarios: CuestionarioMock[]
}

export const PUNTAJE_POR_PREGUNTA = 4

export const ID_TURNO_ABIERTO = 3

export const TEXTOS_VERDADERO_FALSO = ['Verdadero', 'Falso'] as const

export function minimoAplicado(notaMinima: number, tipoExamen: TipoExamenMock): number {
  return Math.max(notaMinima, tipoExamen === 'PRE_SOLO' ? 18 : 0)
}

type FilaPregunta = [
  id: number,
  idMateria: number,
  tipo: TipoPreguntaMock,
  dificultad: DificultadMock,
  origen: OrigenMock,
  enunciado: string,
  correcta: number,
  opciones: string[],
  explicacion: string | null,
]

const SEMILLA_PREGUNTAS: FilaPregunta[] = [
  [
    1,
    3,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    '¿Qué documento fija la conducta del alumno piloto durante la instrucción?',
    0,
    ['El PDI EA-510', 'El manual de vuelo de la aeronave', 'La orden de vuelo del día', 'El reglamento de tránsito aéreo'],
    'El PDI EA-510 es el plan de instrucción vigente del curso.',
  ],
  [
    2,
    3,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Quién aprueba la programación diaria de los turnos de vuelo?',
    2,
    ['El alumno piloto', 'El mecánico de línea', 'El Jefe de Operaciones', 'El instructor del turno'],
    null,
  ],
  [3, 3, 'VERDADERO_FALSO', 'ALTA', 'MANUAL', 'La última misión de cada subfase es un chequeo.', 0, [], 'El PDI EA-510 exige un chequeo al cerrar cada subfase.'],
  [4, 3, 'COMPLETAR', 'MEDIA', 'MANUAL', 'El instructor explica la maniobra cuando su nota mínima es _____.', 0, ['Regular'], null],
  [
    5,
    3,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Cuál es la calificación DIRBE que corresponde a un desempeño excelente?',
    2,
    ['R', 'B', 'E', 'I'],
    null,
  ],
  [
    6,
    3,
    'OPCION_MULTIPLE',
    'ALTA',
    'MANUAL',
    '¿Cuánto antes del vuelo se realiza el briefing de detalle?',
    0,
    ['Una hora', 'Dos horas', 'Tres horas', 'Media hora'],
    null,
  ],
  [
    7,
    3,
    'VERDADERO_FALSO',
    'MEDIA',
    'MANUAL',
    'El alumno expone la maniobra cuando su nota mínima es Bueno o Excelente.',
    0,
    [],
    null,
  ],
  [8, 3, 'COMPLETAR', 'BAJA', 'MANUAL', 'El debriefing del vuelo se registra como una _____ práctica.', 0, ['evaluación'], null],
  [
    9,
    3,
    'OPCION_MULTIPLE',
    'ALTA',
    'IA',
    '¿Qué se exige cuando una calificación queda bajo el estándar de la maniobra?',
    0,
    ['Observación, causa y recomendación', 'Solo una observación', 'Solo la firma del instructor', 'Nada en particular'],
    'El PDI EA-510 pide justificar toda calificación bajo el estándar.',
  ],
  [
    10,
    3,
    'OPCION_MULTIPLE',
    'MEDIA',
    'IA',
    '¿Qué ocurre si el alumno no aprueba la subsanación de un examen teórico?',
    0,
    ['No puede volar hasta aprobarla', 'Vuela con autorización del instructor', 'Pierde el curso de inmediato', 'Repite la materia completa'],
    null,
  ],
  [
    11,
    6,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Qué maniobra permite un descenso controlado sin potencia del motor?',
    0,
    ['La autorrotación', 'El vuelo estacionario', 'El viraje coordinado', 'El despegue vertical'],
    'En autorrotación el rotor gira por el flujo de aire ascendente.',
  ],
  [
    12,
    6,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    'Ante una falla de motor en crucero, ¿cuál es la primera acción del piloto?',
    0,
    ['Bajar el paso colectivo e ingresar en autorrotación', 'Aumentar el paso colectivo', 'Cerrar la válvula de combustible', 'Soltar los mandos'],
    null,
  ],
  [
    13,
    6,
    'VERDADERO_FALSO',
    'ALTA',
    'MANUAL',
    'Un incendio en vuelo se combate aumentando la potencia del motor.',
    1,
    [],
    'El procedimiento exige cortar el suministro de combustible, no aumentar potencia.',
  ],
  [
    14,
    6,
    'COMPLETAR',
    'BAJA',
    'MANUAL',
    'La velocidad recomendada para la autorrotación se indica en el manual de _____.',
    0,
    ['vuelo'],
    null,
  ],
  [
    15,
    6,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    '¿Qué indica la luz de advertencia de baja presión de aceite?',
    1,
    ['Un exceso de combustible', 'Una posible falla del sistema de lubricación', 'Una falla del sistema eléctrico', 'Un error del altímetro'],
    null,
  ],
  [
    16,
    6,
    'OPCION_MULTIPLE',
    'ALTA',
    'MANUAL',
    '¿Cada cuánto se practica el procedimiento de falla del rotor de cola?',
    0,
    ['En cada fase de instrucción', 'Una vez al año', 'Solo en el chequeo final', 'Nunca'],
    null,
  ],
  [
    17,
    4,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Dónde se encuentran los límites de operación de la aeronave?',
    0,
    ['En el manual de vuelo', 'En la orden de vuelo del día', 'En el PDI EA-510', 'En la hoja de briefing'],
    null,
  ],
  [
    18,
    4,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    '¿Qué instrumento indica las revoluciones del rotor principal?',
    0,
    ['El tacómetro', 'El altímetro', 'El variómetro', 'El horizonte artificial'],
    null,
  ],
  [
    19,
    4,
    'VERDADERO_FALSO',
    'ALTA',
    'MANUAL',
    'Exceder el límite de temperatura de turbina obliga a registrar el evento.',
    0,
    [],
    null,
  ],
  [20, 4, 'COMPLETAR', 'BAJA', 'MANUAL', 'El peso máximo de despegue de la aeronave es un límite de _____.', 0, ['operación'], null],
  [
    21,
    4,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    '¿Qué ocurre si se excede el límite de viento cruzado en el aterrizaje?',
    0,
    ['Se pierde autoridad de control direccional', 'Aumenta la sustentación', 'Se reduce el consumo', 'No ocurre nada'],
    null,
  ],
  [
    22,
    1,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Qué componente genera la sustentación en un helicóptero?',
    0,
    ['El rotor principal', 'El rotor de cola', 'El estabilizador vertical', 'El tren de aterrizaje'],
    null,
  ],
  [23, 1, 'VERDADERO_FALSO', 'MEDIA', 'MANUAL', 'El efecto suelo aumenta la sustentación cerca de la superficie.', 0, [], null],
  [
    24,
    1,
    'COMPLETAR',
    'ALTA',
    'MANUAL',
    'La resistencia que aumenta con el ángulo de ataque se llama resistencia _____.',
    0,
    ['inducida'],
    null,
  ],
]

function respuestasDe(fila: FilaPregunta): string[] {
  return fila[2] === 'VERDADERO_FALSO' ? [...TEXTOS_VERDADERO_FALSO] : fila[7]
}

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
][] = [
  [1, 'Mensual Adoctrinamiento de Vuelo', 3, 'MENSUAL', -7, '08:00', '09:00', 3, [1, 2, 3, 4, 5], null],
  [2, 'Test Procedimientos de Emergencias', 6, 'TEST', -5, '10:00', '10:30', 2, [11, 12, 13, 14, 15], null],
  [3, 'Semanal Adoctrinamiento de Vuelo', 3, 'SEMANAL', 0, '00:00', '23:59', 1, [1, 2, 3, 4, 5], null],
  [4, 'Quincenal Límites de Operación', 4, 'QUINCENAL', 3, '09:00', '10:00', 3, [17, 18, 19, 20, 21], null],
  [5, 'Subsanación Adoctrinamiento de Vuelo', 3, 'SUBSANACION', 1, '08:00', '09:00', 3, [6, 7, 8, 9, 10], 1],
]

export function crearTeoria(hoy: string): DatosTeoria {
  const ordenadas = [...SEMILLA_PREGUNTAS].sort((a, b) => a[0] - b[0])
  const preguntas = ordenadas.map<PreguntaMock>((fila) => ({
    id: fila[0],
    idMateria: fila[1],
    enunciado: fila[5],
    tipoPregunta: fila[2],
    dificultad: fila[3],
    explicacion: fila[8],
    origen: fila[4],
    codInstructor: '444444',
  }))
  const alternativas: AlternativaMock[] = []
  let idAlternativa = 1
  for (const fila of ordenadas) {
    respuestasDe(fila).forEach((respuesta, indice) => {
      alternativas.push({ id: idAlternativa, idPregunta: fila[0], respuesta, correcto: indice === fila[6] })
      idAlternativa += 1
    })
  }
  const turnosTeoricos = SEMILLA_TURNOS.map<TurnoTeoricoMock>((fila) => ({
    id: fila[0],
    nombre: fila[1],
    idMateria: fila[2],
    tipoExamen: fila[3],
    fechaExamen: sumarDias(hoy, fila[4]),
    horaInicio: fila[5],
    horaFin: fila[6],
    idGrupo: fila[7],
    codInstructor: '444444',
    idTurnoOrigen: fila[9],
  }))
  const preguntasTurno = SEMILLA_TURNOS.flatMap((fila) =>
    fila[8].map<PreguntaTurnoMock>((idPregunta, indice) => ({
      idTurnoTeorico: fila[0],
      idPregunta,
      orden: indice + 1,
      puntajeMaximo: PUNTAJE_POR_PREGUNTA,
    })),
  )

  function correcta(idPregunta: number): string {
    return alternativas.find((alternativa) => alternativa.idPregunta === idPregunta && alternativa.correcto)?.respuesta ?? ''
  }

  function equivocada(idPregunta: number): string {
    return alternativas.find((alternativa) => alternativa.idPregunta === idPregunta && !alternativa.correcto)?.respuesta ?? ''
  }

  function calificar(idTurno: number, aciertos: readonly number[]): CalificacionTeoricaMock[] {
    return preguntasTurno
      .filter((fila) => fila.idTurnoTeorico === idTurno)
      .map((fila) => {
        const acertada = aciertos.includes(fila.idPregunta)
        const enunciado = preguntas.find((pregunta) => pregunta.id === fila.idPregunta)?.enunciado ?? ''
        return {
          idPregunta: fila.idPregunta,
          orden: fila.orden,
          enunciado,
          respuestaCorrecta: correcta(fila.idPregunta),
          respuestaAlumno: acertada ? correcta(fila.idPregunta) : equivocada(fila.idPregunta),
          correcto: acertada,
          puntajeMaximo: fila.puntajeMaximo,
          puntajeObtenido: acertada ? fila.puntajeMaximo : 0,
        }
      })
  }

  function idsDeAlternativa(idPregunta: number, respuesta: string): string {
    return String(alternativas.find((alternativa) => alternativa.idPregunta === idPregunta && alternativa.respuesta === respuesta)?.id ?? '')
  }

  const ordenTurno1 = preguntasTurno.filter((fila) => fila.idTurnoTeorico === 1).map((fila) => fila.idPregunta)
  const cuestionarios: CuestionarioMock[] = [
    {
      id: 1,
      idTurnoTeorico: 1,
      codAlumno: '555555',
      estado: 'ENTREGADO',
      fechaEntrega: sumarDias(hoy, -7),
      horaEntrega: '08:41',
      nota: 20,
      notaMinimaAplicada: 18,
      aprobado: true,
      orden: ordenTurno1,
      respuestas: {},
      calificaciones: calificar(1, [1, 2, 3, 4, 5]),
    },
    {
      id: 2,
      idTurnoTeorico: 1,
      codAlumno: '666666',
      estado: 'ENTREGADO',
      fechaEntrega: sumarDias(hoy, -7),
      horaEntrega: '08:52',
      nota: 12,
      notaMinimaAplicada: 18,
      aprobado: false,
      orden: ordenTurno1,
      respuestas: {},
      calificaciones: calificar(1, [1, 2, 4]),
    },
    {
      id: 3,
      idTurnoTeorico: ID_TURNO_ABIERTO,
      codAlumno: '111111',
      estado: 'EN_CURSO',
      fechaEntrega: null,
      horaEntrega: null,
      nota: null,
      notaMinimaAplicada: 18,
      aprobado: null,
      orden: preguntasTurno.filter((fila) => fila.idTurnoTeorico === ID_TURNO_ABIERTO).map((fila) => fila.idPregunta),
      respuestas: { 1: idsDeAlternativa(1, correcta(1)), 3: idsDeAlternativa(3, 'Falso') },
      calificaciones: [],
    },
  ]

  return { preguntas, alternativas, turnosTeoricos, preguntasTurno, cuestionarios }
}
```

- [ ] **Step 5: Fold the seed into the one mock store**

In `src/mocks/sigeda/datos.ts`, replace:

```ts
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { crearUsuarios, ROLES_MOCK, type RolMock, type UsuarioMock } from './usuarios'
```

with:

```ts
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import {
  crearTeoria,
  type AlternativaMock,
  type CuestionarioMock,
  type PreguntaMock,
  type PreguntaTurnoMock,
  type TurnoTeoricoMock,
} from './semilla-teoria'
import { crearUsuarios, ROLES_MOCK, type RolMock, type UsuarioMock } from './usuarios'
```

In `src/mocks/sigeda/datos.ts`, replace:

```ts
export type MateriaMock = {
  id: number
  nombre: string
  notaMinima: number
  coeficiente: number
  parte: ParteMock
  conPreguntas: boolean
}
```

with:

```ts
export type MateriaMock = { id: number; nombre: string; notaMinima: number; coeficiente: number; parte: ParteMock }
```

In `src/mocks/sigeda/datos.ts`, replace:

```ts
export type Secuencias = {
  turno: number
  usuario: number
  grupo: number
  fase: number
  subfase: number
  maniobra: number
  estandar: number
  materia: number
}
```

with:

```ts
export type Secuencias = {
  turno: number
  usuario: number
  grupo: number
  fase: number
  subfase: number
  maniobra: number
  estandar: number
  materia: number
  pregunta: number
  alternativa: number
  turnoTeorico: number
  cuestionario: number
}
```

In `src/mocks/sigeda/datos.ts`, replace:

```ts
  turnos: TurnoMock[]
  evaluaciones: EvaluacionMock[]
  secuencias: Secuencias
}
```

with:

```ts
  turnos: TurnoMock[]
  evaluaciones: EvaluacionMock[]
  preguntas: PreguntaMock[]
  alternativas: AlternativaMock[]
  turnosTeoricos: TurnoTeoricoMock[]
  preguntasTurno: PreguntaTurnoMock[]
  cuestionarios: CuestionarioMock[]
  secuencias: Secuencias
}
```

In `src/mocks/sigeda/datos.ts`, replace:

```ts
      parte: 'PRIMERA_PARTE' as ParteMock,
      conPreguntas: indice + 1 === 3,
    })),
```

with:

```ts
      parte: 'PRIMERA_PARTE' as ParteMock,
    })),
```

In `src/mocks/sigeda/datos.ts`, replace:

```ts
    secuencias: { turno: 10, usuario: 13, grupo: 7, fase: 4, subfase: 6, maniobra: 12, estandar: 13, materia: 12 },
```

with:

```ts
    ...crearTeoria(hoy),
    secuencias: {
      turno: 10,
      usuario: 13,
      grupo: 7,
      fase: 4,
      subfase: 6,
      maniobra: 12,
      estandar: 13,
      materia: 12,
      pregunta: 25,
      alternativa: 101,
      turnoTeorico: 6,
      cuestionario: 4,
    },
```

Append to `src/mocks/sigeda/datos.ts`:

```ts
export function buscarMateria(id: number): MateriaMock | undefined {
  return datosActuales.materias.find((materia) => materia.id === id)
}

export function buscarTurnoTeorico(id: number): TurnoTeoricoMock | undefined {
  return datosActuales.turnosTeoricos.find((turno) => turno.id === id)
}

export function buscarPregunta(id: number): PreguntaMock | undefined {
  return datosActuales.preguntas.find((pregunta) => pregunta.id === id)
}

export function alternativasDePregunta(idPregunta: number): AlternativaMock[] {
  return datosActuales.alternativas.filter((alternativa) => alternativa.idPregunta === idPregunta).sort((a, b) => a.id - b.id)
}

export function preguntasDelTurno(idTurnoTeorico: number): PreguntaTurnoMock[] {
  return datosActuales.preguntasTurno
    .filter((fila) => fila.idTurnoTeorico === idTurnoTeorico)
    .sort((a, b) => a.orden - b.orden)
}

export function preguntaEnUso(idPregunta: number): boolean {
  return datosActuales.preguntasTurno.some((fila) => fila.idPregunta === idPregunta)
}

export function materiaEnUso(idMateria: number): boolean {
  return (
    datosActuales.preguntas.some((pregunta) => pregunta.idMateria === idMateria) ||
    datosActuales.turnosTeoricos.some((turno) => turno.idMateria === idMateria)
  )
}

export function alumnosDeGrupo(idGrupo: number): PersonaMock[] {
  return datosActuales.personas
    .filter((persona) => persona.tipo === 'Alumno' && persona.idGrupo === idGrupo)
    .sort((a, b) => a.aPaterno.localeCompare(b.aPaterno, 'es'))
}

export function cuestionarioDe(idTurnoTeorico: number, codAlumno: string): CuestionarioMock | undefined {
  return datosActuales.cuestionarios.find(
    (cuestionario) => cuestionario.idTurnoTeorico === idTurnoTeorico && cuestionario.codAlumno === codAlumno,
  )
}
```

- [ ] **Step 6: Derive the materias 409 from the store (gap 10)**

In `src/mocks/sigeda/materias.ts`, replace:

```ts
import { datos, siguienteId, type MateriaMock, type ParteMock } from './datos'
```

with:

```ts
import { datos, materiaEnUso, siguienteId, type MateriaMock, type ParteMock } from './datos'
```

In `src/mocks/sigeda/materias.ts`, replace:

```ts
      parte: esParte(cuerpo.parte) ? cuerpo.parte : 'PRIMERA_PARTE',
      conPreguntas: false,
    }
```

with:

```ts
      parte: esParte(cuerpo.parte) ? cuerpo.parte : 'PRIMERA_PARTE',
    }
```

In `src/mocks/sigeda/materias.ts`, replace:

```ts
    if (materia.conPreguntas) {
```

with:

```ts
    if (materiaEnUso(materia.id)) {
```

- [ ] **Step 7: Land the theory domain module and its vocabularies**

Create `src/lib/dominio/teoria.ts`:

```ts
import { formatearFecha, formatearNota } from '@/lib/formato'
import { momento } from './calendario'

export { MARCADOR_COMPLETAR } from './aprendizaje'

export const TIPOS_PREGUNTA = [
  { valor: 'OPCION_MULTIPLE', etiqueta: 'Opción múltiple' },
  { valor: 'VERDADERO_FALSO', etiqueta: 'Verdadero o falso' },
  { valor: 'COMPLETAR', etiqueta: 'Completar' },
] as const

export const DIFICULTADES = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'ALTA', etiqueta: 'Alta' },
] as const

export const ORIGENES_PREGUNTA = [
  { valor: 'MANUAL', etiqueta: 'Manual' },
  { valor: 'IA', etiqueta: 'IA' },
] as const

export const TIPOS_EXAMEN = [
  { valor: 'TEST', etiqueta: 'Test' },
  { valor: 'EXAMEN', etiqueta: 'Examen' },
  { valor: 'SEMANAL', etiqueta: 'Semanal' },
  { valor: 'QUINCENAL', etiqueta: 'Quincenal' },
  { valor: 'MENSUAL', etiqueta: 'Mensual' },
  { valor: 'SEMESTRAL', etiqueta: 'Semestral' },
  { valor: 'INOPINADO', etiqueta: 'Inopinado' },
  { valor: 'PRE_SOLO', etiqueta: 'Pre-Solo' },
  { valor: 'SUBSANACION', etiqueta: 'Subsanación' },
  { valor: 'REZAGADO', etiqueta: 'Rezagado' },
  { valor: 'BALOTAS', etiqueta: 'Balotas' },
] as const

export const ESTADOS_TURNO = ['PROGRAMADO', 'EN_CURSO', 'FINALIZADO'] as const

export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number]['valor']
export type Dificultad = (typeof DIFICULTADES)[number]['valor']
export type OrigenPregunta = (typeof ORIGENES_PREGUNTA)[number]['valor']
export type TipoExamen = (typeof TIPOS_EXAMEN)[number]['valor']
export type EstadoTurnoTeorico = (typeof ESTADOS_TURNO)[number]
export type EstadoRendicion = 'NO_RINDIO' | 'EN_CURSO' | 'ENTREGADO'

export const PUNTAJE_TOTAL_EXAMEN = 20
export const VENTANA_MINIMA_MINUTOS = 10
export const AVISO_MINUTOS_RESTANTES = 5
export const TEXTOS_VERDADERO_FALSO = ['Verdadero', 'Falso'] as const

function etiqueta(opciones: readonly { valor: string; etiqueta: string }[], valor: string): string {
  return opciones.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor
}

export function etiquetaDeTipoPregunta(valor: string): string {
  return etiqueta(TIPOS_PREGUNTA, valor)
}

export function etiquetaDeDificultad(valor: string): string {
  return etiqueta(DIFICULTADES, valor)
}

export function etiquetaDeOrigen(valor: string): string {
  return etiqueta(ORIGENES_PREGUNTA, valor)
}

export function etiquetaDeTipoExamen(valor: string): string {
  return etiqueta(TIPOS_EXAMEN, valor)
}

export function alternativasRequeridas(tipo: TipoPregunta): number {
  if (tipo === 'OPCION_MULTIPLE') return 4
  return tipo === 'VERDADERO_FALSO' ? 2 : 1
}

export function exigeTurnoOrigen(tipo: string): boolean {
  return tipo === 'SUBSANACION' || tipo === 'REZAGADO'
}

export function estadoDeVentana(
  fechaExamen: string,
  horaInicio: string,
  horaFin: string,
  ahora: Date = new Date(),
): EstadoTurnoTeorico {
  if (ahora < momento(fechaExamen, horaInicio)) return 'PROGRAMADO'
  return ahora > momento(fechaExamen, horaFin) ? 'FINALIZADO' : 'EN_CURSO'
}

export function milisegundosRestantes(fechaExamen: string, horaFin: string, ahora: Date = new Date()): number {
  return Math.max(momento(fechaExamen, horaFin).getTime() - ahora.getTime(), 0)
}

export function formatearRestante(milisegundos: number): string {
  const total = Math.max(Math.floor(milisegundos / 1000), 0)
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundos = total % 60
  const dosDigitos = (valor: number) => String(valor).padStart(2, '0')
  return horas > 0
    ? `${horas}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`
    : `${dosDigitos(minutos)}:${dosDigitos(segundos)}`
}

export function textoConMinimo(nota: number | null, minimo: number): string {
  return `${formatearNota(nota)} / mínimo ${minimo}`
}

export const TEXTO_TEORIA_SOLO_MOCK =
  'El módulo de teoría todavía no existe en el servidor: estas pantallas funcionan solo en modo mock.'
export const TEXTO_PREGUNTA_EN_USO = 'La pregunta se usa en un turno teórico y no se puede eliminar.'
export const TEXTO_SIN_PREGUNTAS = 'Todavía no hay preguntas. Registre una o impórtelas desde un cuestionario de IA.'
export const TEXTO_REVISAR_IMPORTACION =
  'Las preguntas generadas no entran al banco hasta que las revise y confirme la importación.'
export const TEXTO_ENUNCIADO_RECORTADO =
  'El enunciado generado supera los 500 caracteres: se recortó y debe revisarlo antes de importar.'
export const TEXTO_ALTERNATIVAS_REPETIDAS =
  'La pregunta tiene alternativas repetidas: corrija los textos o quítela de la importación.'
export const TEXTO_CONFIRMAR_IMPORTACION = 'Se guardarán todas las preguntas elegidas o ninguna.'
export const TEXTO_VENTANA_COMENZADA = 'El turno teórico ya no se puede modificar porque su ventana comenzó.'
export const TEXTO_SUBSANACION_TARDIA = 'La subsanación debería rendirse dentro de las 24 horas del examen desaprobado.'
export const TEXTO_MATERIA_SIN_PREGUNTAS =
  'La materia elegida no tiene preguntas en el banco. Registre o importe preguntas antes de programar el examen.'
export const TEXTO_AUTOGUARDADO_FALLIDO =
  'No se pudieron guardar las últimas respuestas. Reintente antes de que cierre la ventana.'
export const TEXTO_QUEDAN_CINCO_MINUTOS =
  'Quedan 5 minutos. Al cerrar la ventana el examen se entrega con lo que haya respondido.'
export const TEXTO_VENTANA_CERRADA = 'La ventana del examen cerró y se entregó con las respuestas guardadas.'
export const TEXTO_CONFIRMAR_ENTREGA = 'Se entregará el examen y no podrá cambiar sus respuestas.'
export const TEXTO_RESULTADO_SIN_DETALLE =
  'Verá el detalle de sus respuestas cuando el turno termine; por ahora solo su nota.'
export const TEXTO_SUBSANACION_PENDIENTE =
  'Tiene una subsanación pendiente: no puede programarse en turnos prácticos hasta aprobarla.'
export const TEXTO_ESTADO_TEORICO_DESCONOCIDO = 'No se pudo comprobar el estado teórico de este alumno.'
export const TEXTO_SIN_EXAMENES_PENDIENTES = 'No tiene exámenes teóricos pendientes.'
export const TEXTO_SIN_TURNOS_TEORICOS = 'Todavía no hay turnos teóricos. Programe uno para un grupo y una materia.'
export const TEXTO_ENUNCIADO_CORTO = 'El enunciado generado es demasiado corto: complételo antes de importar.'
export const TEXTO_GUARDANDO = 'Guardando…'
export const TEXTO_GUARDADO = 'Guardado'

export function textoPuntajeAsignado(puntaje: number): string {
  return `Puntaje asignado: ${puntaje} de ${PUNTAJE_TOTAL_EXAMEN}.`
}

export function textoSeHabilita(fechaExamen: string, horaInicio: string): string {
  return `Se habilita el ${formatearFecha(fechaExamen)} a las ${horaInicio}.`
}

export function textoSinResponder(cantidad: number): string {
  return `Quedan ${cantidad} preguntas sin responder: se califican con 0.`
}

export function textoBloqueadoPorSubsanacion(motivo: string): string {
  return `Subsanación pendiente: ${motivo}`
}

export function textoRespondidas(respondidas: number, total: number): string {
  return `Respondidas: ${respondidas} de ${total}.`
}
```

In `src/lib/dominio/vocabulario.ts`, replace:

```ts
export const ESTADOS_AERONAVE = {
```

with:

```ts
export const ESTADOS_TURNO_TEORICO = {
  PROGRAMADO: { etiqueta: 'Programado', tono: 'info' },
  EN_CURSO: { etiqueta: 'En curso', tono: 'aviso' },
  FINALIZADO: { etiqueta: 'Finalizado', tono: 'neutro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_RENDICION = {
  NO_RINDIO: { etiqueta: 'No rindió', tono: 'neutro' },
  EN_CURSO: { etiqueta: 'En curso', tono: 'aviso' },
  ENTREGADO: { etiqueta: 'Entregado', tono: 'exito' },
} as const satisfies Record<string, Termino>

export const RESULTADOS_EXAMEN = {
  aprobado: { etiqueta: 'Aprobado', tono: 'exito' },
  desaprobado: { etiqueta: 'Desaprobado', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_AERONAVE = {
```

In `src/lib/dominio/vocabulario.ts`, replace:

```ts
  documento: ESTADOS_DOCUMENTO,
  respuesta: RESULTADOS_RESPUESTA,
} as const
```

with:

```ts
  documento: ESTADOS_DOCUMENTO,
  respuesta: RESULTADOS_RESPUESTA,
  turnoTeorico: ESTADOS_TURNO_TEORICO,
  rendicion: ESTADOS_RENDICION,
  examen: RESULTADOS_EXAMEN,
} as const
```

- [ ] **Step 8: Land the exam-window helper (M4-19)**

Replace `src/test/tiempo.ts`:

```ts
import userEvent from '@testing-library/user-event'
import { addMinutes, format } from 'date-fns'
import { vi } from 'vitest'
import { hoyIso, momento } from '@/lib/dominio/calendario'
import { buscarTurnoTeorico } from '@/mocks/sigeda/datos'
import { ID_TURNO_ABIERTO } from '@/mocks/sigeda/semilla-teoria'

const HORA_BASE = '09:00'

export function relojFalso() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  return {
    usuario: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
    avanzar: (milisegundos: number) => vi.advanceTimersByTimeAsync(milisegundos),
  }
}

export function abrirVentanaDeExamen({ transcurridos = 0, restantes = 25 } = {}) {
  if (!vi.isFakeTimers()) throw new Error('abrirVentanaDeExamen se llama despues de relojFalso()')
  const base = momento(hoyIso(), HORA_BASE)
  vi.setSystemTime(base)
  const turno = buscarTurnoTeorico(ID_TURNO_ABIERTO)
  if (!turno) throw new Error(`El turno teorico ${ID_TURNO_ABIERTO} no existe en los datos de prueba`)
  turno.fechaExamen = hoyIso(base)
  turno.horaInicio = format(addMinutes(base, -transcurridos), 'HH:mm')
  turno.horaFin = format(addMinutes(base, restantes), 'HH:mm')
  return turno
}
```

`abrirVentanaDeExamen` **pins** the fake clock with `vi.setSystemTime` instead of merely reading it: `reiniciarDatosMock()` runs in `afterEach` with real timers, so the fixture is built before the fake clock exists, and a window derived from the wall clock could land near midnight with less than five minutes left. Pinning 09:00 of today makes the countdown, the five-minute notice and the auto-submit deterministic with no midnight clamp anywhere.

- [ ] **Step 9: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dominio/teoria.test.ts src/mocks/sigeda/semilla-teoria.test.ts src/test/tiempo.test.tsx
```

Expected: PASS, 31 tests — 10 in `teoria.test.ts`, 13 in `semilla-teoria.test.ts` and 8 in `tiempo.test.tsx` (its 5 baseline cases plus the 3 new ones).

- [ ] **Step 10: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **628 tests**.

- [ ] **Step 11: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "test: add the theory fixtures, the exam window helper and the teoria domain module"
```

---

### Task 2: Preguntas API layer and the MSW mock of contract §2 (M4-3, M4-16, M4-18) (CA-BAN-01, CA-BAN-02, CA-BAN-05..07, CA-BAN-09..13, CA-IMP-09, CA-IMP-10)

**Files:**

- Create: `src/features/preguntas/api.ts`
- Create: `src/mocks/sigeda/preguntas.ts`
- Test: `src/mocks/sigeda/preguntas.test.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**
- Consumes: `sigeda.pagina` / `.get` / `.post` / `.put` / `.eliminar`, `soloMensaje` from `features/cuentas/api`, `paginar`, `autorizar`, `erroresDeCampo`, `textoEliminado`, `textoNoEncontrado`, `texto` from `mocks/sigeda/comun`, and the Task 1 store helpers.
- Produces:
  - `clavesPreguntas`, `consultasPreguntas.{lista,detalle,porMateria}`, `listarPreguntas`, `obtenerPregunta`, `crearPregunta`, `modificarPregunta`, `eliminarPregunta`, `importarPreguntas` and the types `PreguntaFila`, `PreguntaDetalle`, `CuerpoPregunta`, `CuerpoLote`, `FiltrosPreguntas`.
  - `handlersPreguntas` implementing contract §2.1–§2.6 with its D1–D4, D18, D20, D21 and D27 messages, the per-field validation table in its own order, `origen` fixed by the server (`MANUAL` on `POST`, `IA` on `/lote`, never changed on `PUT`) and the all-or-nothing batch.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/sigeda/preguntas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import {
  crearPregunta,
  eliminarPregunta,
  importarPreguntas,
  listarPreguntas,
  obtenerPregunta,
  modificarPregunta,
  type CuerpoPregunta,
} from '@/features/preguntas/api'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'
import { D2_PREGUNTA_NO_EXISTE, D3_PREGUNTA_EN_USO, D4_MATERIA_NO_EXISTE, D27_PERSONA_NO_EXISTE } from './preguntas'

const PARAMETROS = { page: 0, size: 10, direction: 'ASC' } as const

const NUEVA: CuerpoPregunta = {
  codInstructor: '444444',
  idMateria: 5,
  enunciado: '¿Cuál es el procedimiento normal de encendido del motor?',
  tipoPregunta: 'OPCION_MULTIPLE',
  dificultad: 'MEDIA',
  explicacion: null,
  alternativas: [
    { respuesta: 'El del manual de vuelo', correcto: true },
    { respuesta: 'El que indique el alumno', correcto: false },
    { respuesta: 'Cualquiera', correcto: false },
    { respuesta: 'Ninguno', correcto: false },
  ],
}

async function comoInstructor() {
  await iniciarComo('instructor.perez')
}

describe('contrato §2.1 lista de preguntas', () => {
  it('CA-BAN-01 pagina de 10 en 10 y devuelve la fila plana del contrato', async () => {
    await comoInstructor()
    const pagina = await listarPreguntas(PARAMETROS)
    expect(pagina.total).toBe(24)
    expect(pagina.totalPages).toBe(3)
    expect(pagina.items).toHaveLength(10)
    expect(pagina.items[0]).toEqual({
      id: 1,
      idMateria: 3,
      materia: 'Adoctrinamiento de Vuelo',
      enunciado: '¿Qué documento fija la conducta del alumno piloto durante la instrucción?',
      tipoPregunta: 'OPCION_MULTIPLE',
      dificultad: 'MEDIA',
      origen: 'MANUAL',
      enUso: true,
      cantAlternativas: 4,
    })
  })

  it('CA-BAN-01 el servidor ordena por la propiedad y la dirección pedidas', async () => {
    await comoInstructor()
    const pagina = await listarPreguntas({ ...PARAMETROS, property: 'id', direction: 'DESC' })
    expect(pagina.items.map((fila) => fila.id)).toEqual([24, 23, 22, 21, 20, 19, 18, 17, 16, 15])
  })

  it('CA-BAN-02 combina los filtros con AND e ignora un valor inválido', async () => {
    await comoInstructor()
    expect((await listarPreguntas({ ...PARAMETROS, idMateria: 3 })).total).toBe(10)
    expect((await listarPreguntas({ ...PARAMETROS, idMateria: 3, dificultad: 'MEDIA' })).total).toBe(4)
    expect((await listarPreguntas({ ...PARAMETROS, origen: 'IA' })).items.map((fila) => fila.id)).toEqual([9, 10])
    expect((await listarPreguntas({ ...PARAMETROS, tipo: 'COMPLETAR' })).total).toBe(5)
    expect((await listarPreguntas({ ...PARAMETROS, dificultad: 'URGENTE' as never })).total).toBe(24)
  })

  it('CA-BAN-02 el filtro de texto no distingue mayúsculas ni tildes', async () => {
    await comoInstructor()
    expect((await listarPreguntas({ ...PARAMETROS, texto: 'MANIOBRA' })).items.map((fila) => fila.id)).toEqual([4, 7, 9, 11])
    expect((await listarPreguntas({ ...PARAMETROS, texto: 'AUTORROTACION' })).items.map((fila) => fila.id)).toEqual([14])
  })

  it('CA-BAN-13 una lista vacía llega como 404 D1 y el cliente la ve vacía', async () => {
    await comoInstructor()
    const pagina = await listarPreguntas({ ...PARAMETROS, texto: 'no existe nada así' })
    expect(pagina.items).toEqual([])
    expect(pagina.total).toBe(0)
  })
})

describe('contrato §2.2 y §2.3 detalle y creación', () => {
  it('CA-BAN-09 el detalle anida la materia, ordena las alternativas y admite explicación nula', async () => {
    await comoInstructor()
    const pregunta = await obtenerPregunta(1)
    expect(pregunta.materia).toEqual({ id: 3, nombre: 'Adoctrinamiento de Vuelo', notaMinima: 18 })
    expect(pregunta.alternativas.map((alternativa) => alternativa.id)).toEqual([1, 2, 3, 4])
    expect(pregunta.alternativas.filter((alternativa) => alternativa.correcto)).toHaveLength(1)
    expect(pregunta.explicacion).toBe('El PDI EA-510 es el plan de instrucción vigente del curso.')
    expect((await obtenerPregunta(2)).explicacion).toBeNull()
  })

  it('M4-3 el servidor fija origen MANUAL y devuelve D20', async () => {
    await comoInstructor()
    expect(await crearPregunta(NUEVA)).toBe('Pregunta guardada con éxito.')
    const creada = await obtenerPregunta(25)
    expect(creada.origen).toBe('MANUAL')
    expect(creada.alternativas.map((alternativa) => alternativa.id)).toEqual([101, 102, 103, 104])
  })

  it('CA-BAN-12 devuelve los errores de campo del contrato, con índice en las alternativas', async () => {
    await comoInstructor()
    const error = await crearPregunta({
      ...NUEVA,
      enunciado: 'corto',
      alternativas: [
        { respuesta: '', correcto: true },
        { respuesta: 'b', correcto: false },
        { respuesta: 'c', correcto: false },
        { respuesta: 'd', correcto: false },
      ],
    }).catch((problema: unknown) => problema)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).erroresDeCampo).toEqual({
      enunciado: 'El enunciado debe tener entre 10 y 500 caracteres.',
      'alternativas[0].respuesta': 'La respuesta es obligatoria.',
    })
  })

  it('CA-BAN-05 CA-BAN-06 CA-BAN-07 valida las alternativas de cada tipo', async () => {
    await comoInstructor()
    const tresAlternativas = await crearPregunta({ ...NUEVA, alternativas: NUEVA.alternativas.slice(0, 3) }).catch(
      (problema: unknown) => problema,
    )
    expect((tresAlternativas as ApiError).erroresDeCampo.alternativas).toBe(
      'Una pregunta de opción múltiple debe tener exactamente 4 alternativas.',
    )
    const vfMalo = await crearPregunta({
      ...NUEVA,
      tipoPregunta: 'VERDADERO_FALSO',
      alternativas: [
        { respuesta: 'Sí', correcto: true },
        { respuesta: 'No', correcto: false },
      ],
    }).catch((problema: unknown) => problema)
    expect((vfMalo as ApiError).erroresDeCampo.alternativas).toBe(
      'Una pregunta de verdadero o falso debe tener exactamente las alternativas Verdadero y Falso.',
    )
    const sinMarcador = await crearPregunta({
      ...NUEVA,
      tipoPregunta: 'COMPLETAR',
      alternativas: [{ respuesta: 'autorrotación', correcto: true }],
    }).catch((problema: unknown) => problema)
    expect((sinMarcador as ApiError).erroresDeCampo.enunciado).toBe(
      'El enunciado de una pregunta de completar debe incluir el marcador _____.',
    )
    const dosCorrectas = await crearPregunta({
      ...NUEVA,
      alternativas: NUEVA.alternativas.map((alternativa) => ({ ...alternativa, correcto: true })),
    }).catch((problema: unknown) => problema)
    expect((dosCorrectas as ApiError).erroresDeCampo.alternativas).toBe(
      'Debe marcar exactamente una alternativa como correcta.',
    )
    const repetidas = await crearPregunta({
      ...NUEVA,
      alternativas: [
        { respuesta: 'Igual', correcto: true },
        { respuesta: ' igual ', correcto: false },
        { respuesta: 'c', correcto: false },
        { respuesta: 'd', correcto: false },
      ],
    }).catch((problema: unknown) => problema)
    expect((repetidas as ApiError).erroresDeCampo.alternativas).toBe('Las alternativas no pueden repetirse.')
  })

  it('responde 404 D4 y D27 para la materia y el instructor inexistentes', async () => {
    await comoInstructor()
    await expect(crearPregunta({ ...NUEVA, idMateria: 99 })).rejects.toThrow(D4_MATERIA_NO_EXISTE)
    await expect(crearPregunta({ ...NUEVA, codInstructor: '000999' })).rejects.toThrow(D27_PERSONA_NO_EXISTE)
  })
})

describe('contrato §2.4 y §2.5 modificar y eliminar', () => {
  it('CA-BAN-10 modificar conserva el origen de una pregunta importada', async () => {
    await comoInstructor()
    const antes = await obtenerPregunta(9)
    expect(antes.origen).toBe('IA')
    await modificarPregunta(9, {
      codInstructor: '444444',
      idMateria: antes.materia.id,
      enunciado: 'Enunciado corregido a mano después de importarlo desde la IA.',
      tipoPregunta: antes.tipoPregunta,
      dificultad: antes.dificultad,
      explicacion: antes.explicacion,
      alternativas: antes.alternativas.map(({ respuesta, correcto }) => ({ respuesta, correcto })),
    })
    const despues = await obtenerPregunta(9)
    expect(despues.origen).toBe('IA')
    expect(despues.enunciado).toBe('Enunciado corregido a mano después de importarlo desde la IA.')
    await expect(modificarPregunta(999, NUEVA)).rejects.toThrow(D2_PREGUNTA_NO_EXISTE)
  })

  it('CA-BAN-11 eliminar responde 409 D3 si está en uso y 200 D18 si no', async () => {
    await comoInstructor()
    await expect(eliminarPregunta(1)).rejects.toThrow(D3_PREGUNTA_EN_USO)
    expect(await eliminarPregunta(16)).toBe('Pregunta eliminado con éxito.')
    expect(datos().preguntas.some((pregunta) => pregunta.id === 16)).toBe(false)
    expect(datos().alternativas.some((alternativa) => alternativa.idPregunta === 16)).toBe(false)
    await expect(eliminarPregunta(16)).rejects.toThrow(D2_PREGUNTA_NO_EXISTE)
  })
})

describe('contrato §2.6 lote', () => {
  it('CA-IMP-10 guarda todas con origen IA y en el orden recibido', async () => {
    await comoInstructor()
    const mensaje = await importarPreguntas({
      codInstructor: '444444',
      preguntas: [
        { ...NUEVA, codInstructor: undefined } as never,
        { ...NUEVA, enunciado: 'Otro enunciado generado por la IA para el banco.' } as never,
      ],
    })
    expect(mensaje).toBe('Preguntas guardadas con éxito.')
    expect((await obtenerPregunta(25)).origen).toBe('IA')
    expect((await obtenerPregunta(26)).enunciado).toBe('Otro enunciado generado por la IA para el banco.')
  })

  it('CA-IMP-09 rechaza el lote completo señalando la fila', async () => {
    await comoInstructor()
    const error = await importarPreguntas({
      codInstructor: '444444',
      preguntas: [NUEVA, { ...NUEVA, enunciado: 'corto' }],
    }).catch((problema: unknown) => problema)
    expect((error as ApiError).erroresDeCampo['preguntas[1].enunciado']).toBe(
      'El enunciado debe tener entre 10 y 500 caracteres.',
    )
    expect(datos().preguntas).toHaveLength(24)
  })

  it('rechaza un lote vacío, uno de más de 20 y los enunciados repetidos dentro del lote', async () => {
    await comoInstructor()
    const vacio = await importarPreguntas({ codInstructor: '444444', preguntas: [] }).catch((p: unknown) => p)
    expect((vacio as ApiError).erroresDeCampo.preguntas).toBe('Debe enviar al menos una pregunta.')
    const muchas = await importarPreguntas({
      codInstructor: '444444',
      preguntas: Array.from({ length: 21 }, (_, indice) => ({ ...NUEVA, enunciado: `Enunciado generado numero ${indice}.` })),
    }).catch((p: unknown) => p)
    expect((muchas as ApiError).erroresDeCampo.preguntas).toBe('No se pueden importar más de 20 preguntas a la vez.')
    const repetida = await importarPreguntas({ codInstructor: '444444', preguntas: [NUEVA, { ...NUEVA }] }).catch(
      (p: unknown) => p,
    )
    expect((repetida as ApiError).erroresDeCampo['preguntas[1].enunciado']).toBe('La pregunta está repetida en este lote.')
  })
})

describe('permisos del banco', () => {
  it('CA-BAN-14 un alumno no alcanza el banco de preguntas', async () => {
    await iniciarComo('alumno.lopez')
    await expect(listarPreguntas(PARAMETROS)).rejects.toThrow(MENSAJE_SIN_PERMISO)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/preguntas.test.ts
```

Expected: FAIL — `Failed to resolve import "@/features/preguntas/api"` and `Failed to resolve import "./preguntas"`.

- [ ] **Step 3: Land the preguntas API layer**

Create `src/features/preguntas/api.ts`:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import {
  DIFICULTADES,
  ORIGENES_PREGUNTA,
  TIPOS_PREGUNTA,
  type Dificultad,
  type OrigenPregunta,
  type TipoPregunta,
} from '@/lib/dominio/teoria'

export type Alternativa = { id: number; respuesta: string; correcto: boolean }

export type PreguntaFila = {
  id: number
  idMateria: number
  materia: string
  enunciado: string
  tipoPregunta: TipoPregunta
  dificultad: Dificultad
  origen: OrigenPregunta
  enUso: boolean
  cantAlternativas: number
}

export type PreguntaDetalle = {
  id: number
  materia: { id: number; nombre: string; notaMinima: number }
  enunciado: string
  tipoPregunta: TipoPregunta
  dificultad: Dificultad
  explicacion: string | null
  origen: OrigenPregunta
  enUso: boolean
  alternativas: Alternativa[]
}

export type AlternativaEnviada = { respuesta: string; correcto: boolean }

export type CuerpoPregunta = {
  codInstructor: string
  idMateria: number
  enunciado: string
  tipoPregunta: TipoPregunta
  dificultad: Dificultad
  explicacion: string | null
  alternativas: AlternativaEnviada[]
}

export type CuerpoLote = { codInstructor: string; preguntas: Omit<CuerpoPregunta, 'codInstructor'>[] }

export type FiltrosPreguntas = ParametrosPagina & {
  idMateria?: number
  dificultad?: Dificultad
  tipo?: TipoPregunta
  origen?: OrigenPregunta
  texto?: string
}

export const MENSAJE_PREGUNTA_GUARDADA = 'Pregunta guardada con éxito.'
export const MENSAJE_PREGUNTAS_GUARDADAS = 'Preguntas guardadas con éxito.'
export const MENSAJE_PREGUNTA_ELIMINADA = 'Pregunta eliminado con éxito.'

const tipos = z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor))
const dificultades = z.enum(DIFICULTADES.map((dificultad) => dificultad.valor))
const origenes = z.enum(ORIGENES_PREGUNTA.map((origen) => origen.valor))

const esquemaFila = z.object({
  id: z.number(),
  idMateria: z.number(),
  materia: z.string(),
  enunciado: z.string(),
  tipoPregunta: tipos,
  dificultad: dificultades,
  origen: origenes,
  enUso: z.boolean(),
  cantAlternativas: z.number(),
})

const esquemaDetalle = z.object({
  id: z.number(),
  materia: z.object({ id: z.number(), nombre: z.string(), notaMinima: z.number() }),
  enunciado: z.string(),
  tipoPregunta: tipos,
  dificultad: dificultades,
  explicacion: z.string().nullish(),
  origen: origenes,
  enUso: z.boolean(),
  alternativas: z.array(z.object({ id: z.number(), respuesta: z.string(), correcto: z.boolean() })),
})

function aDetalle(crudo: unknown): PreguntaDetalle {
  const pregunta = esquemaDetalle.parse(crudo)
  return { ...pregunta, explicacion: pregunta.explicacion ?? null }
}

export const clavesPreguntas = {
  todo: ['preguntas'] as const,
  lista: (filtros: FiltrosPreguntas) => [...clavesPreguntas.todo, 'lista', filtros] as const,
  detalle: (id: number) => [...clavesPreguntas.todo, 'detalle', id] as const,
  porMateria: (idMateria: number) => [...clavesPreguntas.todo, 'materia', idMateria] as const,
}

export async function listarPreguntas(filtros: FiltrosPreguntas): Promise<Pagina<PreguntaFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/preguntas', {
    idMateria: filtros.idMateria,
    dificultad: filtros.dificultad,
    tipo: filtros.tipo,
    origen: filtros.origen,
    texto: filtros.texto,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
  return { ...pagina, items: pagina.items.map((fila) => esquemaFila.parse(fila)) }
}

export async function listarPreguntasDeMateria(idMateria: number): Promise<PreguntaFila[]> {
  const pagina = await listarPreguntas({ idMateria, page: 0, size: 100, direction: 'ASC' })
  return pagina.items
}

export async function obtenerPregunta(id: number): Promise<PreguntaDetalle> {
  return aDetalle(await sigeda.get<unknown>(`/api/preguntas/${encodeURIComponent(id)}`))
}

export async function crearPregunta(cuerpo: CuerpoPregunta): Promise<string> {
  return soloMensaje(await sigeda.post<unknown>('/api/preguntas', cuerpo), MENSAJE_PREGUNTA_GUARDADA)
}

export async function modificarPregunta(id: number, cuerpo: CuerpoPregunta): Promise<string> {
  return soloMensaje(
    await sigeda.put<unknown>(`/api/preguntas/${encodeURIComponent(id)}`, cuerpo),
    MENSAJE_PREGUNTA_GUARDADA,
  )
}

export async function eliminarPregunta(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/preguntas/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_PREGUNTA_ELIMINADA
}

export async function importarPreguntas(cuerpo: CuerpoLote): Promise<string> {
  return soloMensaje(await sigeda.post<unknown>('/api/preguntas/lote', cuerpo), MENSAJE_PREGUNTAS_GUARDADAS)
}

export const consultasPreguntas = {
  lista: (filtros: FiltrosPreguntas) =>
    queryOptions({
      queryKey: clavesPreguntas.lista(filtros),
      queryFn: () => listarPreguntas(filtros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) => queryOptions({ queryKey: clavesPreguntas.detalle(id), queryFn: () => obtenerPregunta(id) }),
  porMateria: (idMateria: number) =>
    queryOptions({
      queryKey: clavesPreguntas.porMateria(idMateria),
      queryFn: () => listarPreguntasDeMateria(idMateria),
      enabled: idMateria > 0,
    }),
}
```

- [ ] **Step 4: Land the MSW mock of contract §2**

Create `src/mocks/sigeda/preguntas.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { MARCADOR_COMPLETAR, TEXTOS_VERDADERO_FALSO, alternativasRequeridas } from '@/lib/dominio/teoria'
import { API, autorizar, erroresDeCampo, paginar, texto, textoEliminado, textoNoEncontrado } from './comun'
import {
  alternativasDePregunta,
  buscarMateria,
  buscarPersona,
  buscarPregunta,
  datos,
  preguntaEnUso,
  siguienteId,
} from './datos'
import type { DificultadMock, OrigenMock, PreguntaMock, TipoPreguntaMock } from './semilla-teoria'

export const D1_SIN_PREGUNTAS = 'No existen preguntas disponibles.'
export const D2_PREGUNTA_NO_EXISTE = 'Pregunta especificada no existe.'
export const D3_PREGUNTA_EN_USO = 'La pregunta se usa en un turno teórico y no se puede eliminar.'
export const D4_MATERIA_NO_EXISTE = 'Materia especificada no existe.'
export const D18_PREGUNTA_ELIMINADA = 'Pregunta eliminado con éxito.'
export const D20_PREGUNTA_GUARDADA = 'Pregunta guardada con éxito.'
export const D21_PREGUNTAS_GUARDADAS = 'Preguntas guardadas con éxito.'
export const D27_PERSONA_NO_EXISTE = 'Persona especificada no existe.'

const TIPOS: TipoPreguntaMock[] = ['OPCION_MULTIPLE', 'VERDADERO_FALSO', 'COMPLETAR']
const DIFICULTADES: DificultadMock[] = ['BAJA', 'MEDIA', 'ALTA']
const ORIGENES: OrigenMock[] = ['MANUAL', 'IA']

type AlternativaEnviada = { respuesta?: unknown; correcto?: unknown }

type CuerpoPregunta = {
  codInstructor?: unknown
  idMateria?: unknown
  enunciado?: unknown
  tipoPregunta?: unknown
  dificultad?: unknown
  explicacion?: unknown
  alternativas?: unknown
}

type CuerpoLote = { codInstructor?: unknown; preguntas?: unknown }

function normalizar(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function esTipo(valor: unknown): valor is TipoPreguntaMock {
  return TIPOS.some((tipo) => tipo === valor)
}

function esDificultad(valor: unknown): valor is DificultadMock {
  return DIFICULTADES.some((dificultad) => dificultad === valor)
}

function alternativasDelCuerpo(valor: unknown): AlternativaEnviada[] {
  return Array.isArray(valor) ? (valor as AlternativaEnviada[]) : []
}

function filaPublica(pregunta: PreguntaMock) {
  return {
    id: pregunta.id,
    idMateria: pregunta.idMateria,
    materia: buscarMateria(pregunta.idMateria)?.nombre ?? '',
    enunciado: pregunta.enunciado,
    tipoPregunta: pregunta.tipoPregunta,
    dificultad: pregunta.dificultad,
    origen: pregunta.origen,
    enUso: preguntaEnUso(pregunta.id),
    cantAlternativas: alternativasDePregunta(pregunta.id).length,
  }
}

function detallePublico(pregunta: PreguntaMock) {
  const materia = buscarMateria(pregunta.idMateria)
  return {
    id: pregunta.id,
    materia: { id: pregunta.idMateria, nombre: materia?.nombre ?? '', notaMinima: materia?.notaMinima ?? 0 },
    enunciado: pregunta.enunciado,
    tipoPregunta: pregunta.tipoPregunta,
    dificultad: pregunta.dificultad,
    explicacion: pregunta.explicacion,
    origen: pregunta.origen,
    codInstructor: pregunta.codInstructor,
    enUso: preguntaEnUso(pregunta.id),
    alternativas: alternativasDePregunta(pregunta.id).map((alternativa) => ({
      id: alternativa.id,
      respuesta: alternativa.respuesta,
      correcto: alternativa.correcto,
    })),
  }
}

function erroresDeAlternativas(cuerpo: CuerpoPregunta, prefijo: string): string[] {
  const alternativas = alternativasDelCuerpo(cuerpo.alternativas)
  const errores: string[] = []
  if (esTipo(cuerpo.tipoPregunta)) {
    const requeridas = alternativasRequeridas(cuerpo.tipoPregunta)
    const textosVf = alternativas.map((alternativa) => texto(alternativa.respuesta))
    if (cuerpo.tipoPregunta === 'OPCION_MULTIPLE' && alternativas.length !== requeridas) {
      errores.push(`'${prefijo}alternativas': Una pregunta de opción múltiple debe tener exactamente 4 alternativas.`)
    } else if (
      cuerpo.tipoPregunta === 'VERDADERO_FALSO' &&
      (alternativas.length !== requeridas || textosVf[0] !== TEXTOS_VERDADERO_FALSO[0] || textosVf[1] !== TEXTOS_VERDADERO_FALSO[1])
    ) {
      errores.push(
        `'${prefijo}alternativas': Una pregunta de verdadero o falso debe tener exactamente las alternativas Verdadero y Falso.`,
      )
    } else if (cuerpo.tipoPregunta === 'COMPLETAR' && alternativas.length !== requeridas) {
      errores.push(
        `'${prefijo}alternativas': Una pregunta de completar debe tener exactamente 1 alternativa con la respuesta esperada.`,
      )
    } else if (alternativas.filter((alternativa) => alternativa.correcto === true).length !== 1) {
      errores.push(`'${prefijo}alternativas': Debe marcar exactamente una alternativa como correcta.`)
    } else {
      const normalizadas = alternativas.map((alternativa) => normalizar(texto(alternativa.respuesta)))
      if (new Set(normalizadas).size !== normalizadas.length) {
        errores.push(`'${prefijo}alternativas': Las alternativas no pueden repetirse.`)
      }
    }
  }
  alternativas.forEach((alternativa, indice) => {
    const respuesta = texto(alternativa.respuesta)
    if (respuesta.trim() === '') {
      errores.push(`'${prefijo}alternativas[${indice}].respuesta': La respuesta es obligatoria.`)
    } else if (respuesta.length > 200) {
      errores.push(`'${prefijo}alternativas[${indice}].respuesta': La respuesta no puede superar los 200 caracteres.`)
    }
  })
  return errores
}

export function erroresDePregunta(cuerpo: CuerpoPregunta, prefijo = '', conInstructor = true): string[] {
  const errores: string[] = []
  if (conInstructor && !/^\d{6}$/.test(texto(cuerpo.codInstructor))) {
    errores.push("'codInstructor': El código del instructor es obligatorio.")
  }
  if (typeof cuerpo.idMateria !== 'number' || !Number.isInteger(cuerpo.idMateria) || cuerpo.idMateria <= 0) {
    errores.push(`'${prefijo}idMateria': La materia es obligatoria.`)
  }
  const enunciado = texto(cuerpo.enunciado)
  if (enunciado.trim() === '') errores.push(`'${prefijo}enunciado': El enunciado es obligatorio.`)
  else if (enunciado.trim().length < 10 || enunciado.trim().length > 500) {
    errores.push(`'${prefijo}enunciado': El enunciado debe tener entre 10 y 500 caracteres.`)
  } else if (cuerpo.tipoPregunta === 'COMPLETAR' && !enunciado.includes(MARCADOR_COMPLETAR)) {
    errores.push(
      `'${prefijo}enunciado': El enunciado de una pregunta de completar debe incluir el marcador ${MARCADOR_COMPLETAR}.`,
    )
  }
  if (!esTipo(cuerpo.tipoPregunta)) errores.push(`'${prefijo}tipoPregunta': Ingresar tipo de pregunta válido.`)
  if (!esDificultad(cuerpo.dificultad)) errores.push(`'${prefijo}dificultad': Ingresar dificultad válida.`)
  if (texto(cuerpo.explicacion).length > 1000) {
    errores.push(`'${prefijo}explicacion': La explicación no puede superar los 1000 caracteres.`)
  }
  return [...errores, ...erroresDeAlternativas(cuerpo, prefijo)]
}

function guardarAlternativas(idPregunta: number, cuerpo: CuerpoPregunta) {
  datos().alternativas = datos().alternativas.filter((alternativa) => alternativa.idPregunta !== idPregunta)
  for (const alternativa of alternativasDelCuerpo(cuerpo.alternativas)) {
    datos().alternativas.push({
      id: siguienteId('alternativa'),
      idPregunta,
      respuesta: texto(alternativa.respuesta).trim(),
      correcto: alternativa.correcto === true,
    })
  }
}

function insertar(cuerpo: CuerpoPregunta, origen: OrigenMock, codInstructor: string): PreguntaMock {
  const pregunta: PreguntaMock = {
    id: siguienteId('pregunta'),
    idMateria: Number(cuerpo.idMateria),
    enunciado: texto(cuerpo.enunciado).trim(),
    tipoPregunta: esTipo(cuerpo.tipoPregunta) ? cuerpo.tipoPregunta : 'OPCION_MULTIPLE',
    dificultad: esDificultad(cuerpo.dificultad) ? cuerpo.dificultad : 'MEDIA',
    explicacion: texto(cuerpo.explicacion).trim() === '' ? null : texto(cuerpo.explicacion).trim(),
    origen,
    codInstructor,
  }
  datos().preguntas.push(pregunta)
  guardarAlternativas(pregunta.id, cuerpo)
  return pregunta
}

function filtradas(url: URL) {
  const idMateria = Number(url.searchParams.get('idMateria'))
  const dificultad = url.searchParams.get('dificultad')
  const tipo = url.searchParams.get('tipo')
  const origen = url.searchParams.get('origen')
  const buscado = normalizar(url.searchParams.get('texto') ?? '')
  return datos()
    .preguntas.filter((pregunta) => (Number.isInteger(idMateria) && idMateria > 0 ? pregunta.idMateria === idMateria : true))
    .filter((pregunta) => (esDificultad(dificultad) ? pregunta.dificultad === dificultad : true))
    .filter((pregunta) => (esTipo(tipo) ? pregunta.tipoPregunta === tipo : true))
    .filter((pregunta) => (ORIGENES.some((valor) => valor === origen) ? pregunta.origen === origen : true))
    .filter((pregunta) => (buscado === '' ? true : normalizar(pregunta.enunciado).includes(buscado)))
    .map(filaPublica)
}

export const handlersPreguntas = [
  http.get(`${API}/api/preguntas`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    return paginar(filtradas(new URL(request.url)), new URL(request.url), {
      nombreLista: 'preguntas',
      propiedadPorDefecto: 'id',
    })
  }),
  http.post(`${API}/api/preguntas/lote`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoLote
    const lista = Array.isArray(cuerpo.preguntas) ? (cuerpo.preguntas as CuerpoPregunta[]) : []
    const errores: string[] = []
    if (!/^\d{6}$/.test(texto(cuerpo.codInstructor))) {
      errores.push("'codInstructor': El código del instructor es obligatorio.")
    }
    if (lista.length === 0) errores.push("'preguntas': Debe enviar al menos una pregunta.")
    else if (lista.length > 20) errores.push("'preguntas': No se pueden importar más de 20 preguntas a la vez.")
    const vistas = new Set<string>()
    lista.forEach((pregunta, indice) => {
      errores.push(...erroresDePregunta(pregunta, `preguntas[${indice}].`, false))
      const clave = `${normalizar(texto(pregunta.enunciado))}|${texto(pregunta.tipoPregunta)}`
      if (vistas.has(clave)) {
        errores.push(`'preguntas[${indice}].enunciado': La pregunta está repetida en este lote.`)
      }
      vistas.add(clave)
    })
    if (errores.length > 0) return erroresDeCampo(errores)
    if (!buscarPersona(texto(cuerpo.codInstructor))) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    if (lista.some((pregunta) => !buscarMateria(Number(pregunta.idMateria)))) {
      return textoNoEncontrado(D4_MATERIA_NO_EXISTE)
    }
    const creadas = lista.map((pregunta) => insertar(pregunta, 'IA', texto(cuerpo.codInstructor)))
    return HttpResponse.json(
      { mensaje: D21_PREGUNTAS_GUARDADAS, preguntas: creadas.map(filaPublica) },
      { status: 201 },
    )
  }),
  http.post(`${API}/api/preguntas`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoPregunta
    const errores = erroresDePregunta(cuerpo)
    if (errores.length > 0) return erroresDeCampo(errores)
    if (!buscarPersona(texto(cuerpo.codInstructor))) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    if (!buscarMateria(Number(cuerpo.idMateria))) return textoNoEncontrado(D4_MATERIA_NO_EXISTE)
    const pregunta = insertar(cuerpo, 'MANUAL', texto(cuerpo.codInstructor))
    return HttpResponse.json({ mensaje: D20_PREGUNTA_GUARDADA, pregunta: detallePublico(pregunta) }, { status: 201 })
  }),
  http.get(`${API}/api/preguntas/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const pregunta = buscarPregunta(Number(params.id))
    if (!pregunta) return textoNoEncontrado(D2_PREGUNTA_NO_EXISTE)
    return HttpResponse.json(detallePublico(pregunta))
  }),
  http.put(`${API}/api/preguntas/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const pregunta = buscarPregunta(Number(params.id))
    if (!pregunta) return textoNoEncontrado(D2_PREGUNTA_NO_EXISTE)
    const cuerpo = (await request.json()) as CuerpoPregunta
    const errores = erroresDePregunta(cuerpo)
    if (errores.length > 0) return erroresDeCampo(errores)
    if (!buscarPersona(texto(cuerpo.codInstructor))) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    if (!buscarMateria(Number(cuerpo.idMateria))) return textoNoEncontrado(D4_MATERIA_NO_EXISTE)
    pregunta.idMateria = Number(cuerpo.idMateria)
    pregunta.enunciado = texto(cuerpo.enunciado).trim()
    if (esTipo(cuerpo.tipoPregunta)) pregunta.tipoPregunta = cuerpo.tipoPregunta
    if (esDificultad(cuerpo.dificultad)) pregunta.dificultad = cuerpo.dificultad
    pregunta.explicacion = texto(cuerpo.explicacion).trim() === '' ? null : texto(cuerpo.explicacion).trim()
    guardarAlternativas(pregunta.id, cuerpo)
    return HttpResponse.json({ mensaje: D20_PREGUNTA_GUARDADA, pregunta: detallePublico(pregunta) }, { status: 201 })
  }),
  http.delete(`${API}/api/preguntas/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Questions')
    if (permitido instanceof Response) return permitido
    const pregunta = buscarPregunta(Number(params.id))
    if (!pregunta) return textoNoEncontrado(D2_PREGUNTA_NO_EXISTE)
    if (preguntaEnUso(pregunta.id)) return HttpResponse.text(D3_PREGUNTA_EN_USO, { status: 409 })
    datos().preguntas = datos().preguntas.filter((candidata) => candidata.id !== pregunta.id)
    datos().alternativas = datos().alternativas.filter((alternativa) => alternativa.idPregunta !== pregunta.id)
    return textoEliminado('Pregunta')
  }),
]
```

The handler order matters for MSW only in that `POST /api/preguntas/lote` is declared before `POST /api/preguntas`; validation runs before the nested 404s because that is what Spring's `@Valid` does, and the path entity (`PUT`, `DELETE`) is resolved before either.

- [ ] **Step 5: Register the handlers**

In `src/mocks/handlers.ts`, replace:

```ts
import { handlersPersonas } from './sigeda/personas'
```

with:

```ts
import { handlersPersonas } from './sigeda/personas'
import { handlersPreguntas } from './sigeda/preguntas'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersMaterias,
```

with:

```ts
  ...handlersMaterias,
  ...handlersPreguntas,
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/preguntas.test.ts
```

Expected: PASS, 16 tests.

- [ ] **Step 7: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **644 tests**.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the preguntas api layer and its msw mock"
```

---

### Task 3: Turnos teóricos API layer, the grupo catalogue of contract §3.0 and their mock (M4-6, M4-7, M4-10, M4-16) (CA-TUT-01..04, CA-TUT-06..08, CA-TUT-10, CA-TUT-11, CA-RES-01..04)

**Files:**

- Create: `src/features/turnos-teoricos/api.ts`
- Create: `src/mocks/sigeda/turnos-teoricos.ts`
- Test: `src/mocks/sigeda/turnos-teoricos.test.ts`
- Modify: `src/mocks/sigeda/datos.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**
- Consumes: the Task 1 store helpers, `estadoDeVentana` / `exigeTurnoOrigen` / `PUNTAJE_TOTAL_EXAMEN` / `VENTANA_MINIMA_MINUTOS` from `lib/dominio/teoria`, `normalizarRespuesta` from `lib/dominio/aprendizaje` (the `COMPLETAR` comparison of contract §4.4), `minimoAplicado` from the seed, and `D2`/`D4`/`D27` from `mocks/sigeda/preguntas`.
- Produces:
  - `clavesTurnosTeoricos`, `consultasTurnosTeoricos.{grupos,lista,detalle,finalizados}`, `listarGruposDeExamen`, `listarTurnosTeoricos`, `listarTurnosFinalizados`, `obtenerTurnoTeorico`, `crearTurnoTeorico`, `modificarTurnoTeorico`, `eliminarTurnoTeorico` and the types `GrupoDeExamen`, `TurnoTeoricoFila`, `TurnoTeoricoDetalle`, `CuerpoTurnoTeorico`, `FiltrosTurnosTeoricos`.
  - `handlersTurnosTeoricos` implementing contract §3.0–§3.5 with D5–D7, D19, D22, D26 and D28, the derived `EstadoTurnoTeorico`, the habilitados rule of §3.2 and the two-pass validation (shape → nested 404s → cross-entity).
  - Exported for Task 4: `estadoDelTurno`, `detallePublico`, `respuestaEsperada`, `calificar(cuestionario, fechaEntrega, horaEntrega)` and `cerrarExamenesVencidos(idTurnoTeorico?)` — the lazy closing of §4.7, which both the turno detail and the alumno endpoints need.
  - `src/mocks/sigeda/datos.ts` gains `alumnosHabilitados`, `desaprobadosSinSubsanar` and `bloqueadoPorSubsanacion`, the derivations §3.2 and §5.1 share.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/sigeda/turnos-teoricos.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import {
  crearTurnoTeorico,
  eliminarTurnoTeorico,
  listarGruposDeExamen,
  listarTurnosTeoricos,
  modificarTurnoTeorico,
  obtenerTurnoTeorico,
  type CuerpoTurnoTeorico,
} from '@/features/turnos-teoricos/api'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'
import { D6_TURNO_NO_EXISTE, D7_VENTANA_COMENZADA, D26_GRUPO_NO_EXISTE, D28_SIN_GRUPOS } from './turnos-teoricos'

const PARAMETROS = { page: 0, size: 10, direction: 'ASC' } as const

function nuevoTurno(): CuerpoTurnoTeorico {
  return {
    codInstructor: '444444',
    nombre: 'Quincenal Procedimientos Normales',
    programa: 'PDI',
    idMateria: 4,
    tipoExamen: 'QUINCENAL',
    fechaExamen: sumarDias(hoyIso(), 5),
    horaInicio: '09:00',
    horaFin: '10:00',
    idGrupo: 3,
    idTurnoOrigen: null,
    preguntas: [17, 18, 19, 20, 21].map((idPregunta) => ({ idPregunta, puntajeMaximo: 4 })),
  }
}

async function comoInstructor() {
  await iniciarComo('instructor.perez')
}

async function errorDe(promesa: Promise<unknown>): Promise<ApiError> {
  return (await promesa.catch((problema: unknown) => problema)) as ApiError
}

describe('contrato §3.0 catálogo de grupos', () => {
  it('CA-TUT-04 devuelve los grupos del instructor con su cantidad de alumnos', async () => {
    await comoInstructor()
    expect(await listarGruposDeExamen('444444', 'PDI')).toEqual([
      { id: 1, nombre: 'Grupo 1', programa: 'PDI', cantAlumnos: 1 },
      { id: 2, nombre: 'Grupo 2', programa: 'PDI', cantAlumnos: 1 },
      { id: 3, nombre: 'Grupo 3', programa: 'PDI', cantAlumnos: 2 },
    ])
    expect((await listarGruposDeExamen('888888', 'PDI')).map((grupo) => grupo.id)).toEqual([4, 6])
  })

  it('M4-6 con Manage Groups y sin instructor devuelve todos los grupos del programa con alumnos', async () => {
    await iniciarComo('admin.sistema')
    expect((await listarGruposDeExamen(null, 'PDI')).map((grupo) => grupo.id)).toEqual([1, 2, 3, 4, 6])
  })

  it('M4-6 sin Manage Groups exige el código del instructor', async () => {
    await comoInstructor()
    const error = await errorDe(listarGruposDeExamen(null, 'PDI'))
    expect(error.erroresDeCampo.codInstructor).toBe('El código del instructor es obligatorio.')
  })

  it('M4-6 el programa es obligatorio y un programa sin grupos responde 404 D28', async () => {
    await iniciarComo('admin.sistema')
    const error = await errorDe(listarGruposDeExamen(null, 'XX' as never))
    expect(error.erroresDeCampo.programa).toBe('Ingresar programa válido.')
    expect(await listarGruposDeExamen(null, 'PDE')).toEqual([])
    expect(D28_SIN_GRUPOS).toBe('No existen grupos disponibles.')
  })
})

describe('contrato §3.1 lista de turnos teóricos', () => {
  it('CA-TUT-01 devuelve la fila plana con el estado derivado y cuántos rindieron', async () => {
    await comoInstructor()
    const pagina = await listarTurnosTeoricos(PARAMETROS)
    expect(pagina.total).toBe(5)
    expect(pagina.items.map((fila) => [fila.id, fila.estado, fila.rindieron, fila.cantAlumnos])).toEqual([
      [1, 'FINALIZADO', 2, 2],
      [2, 'FINALIZADO', 0, 1],
      [3, 'EN_CURSO', 0, 1],
      [5, 'PROGRAMADO', 0, 1],
      [4, 'PROGRAMADO', 0, 2],
    ])
    expect(pagina.items[0]).toMatchObject({
      nombre: 'Mensual Adoctrinamiento de Vuelo',
      materia: 'Adoctrinamiento de Vuelo',
      tipoExamen: 'MENSUAL',
      grupo: 'Grupo 3',
      programa: 'PDI',
      cantPreguntas: 5,
    })
  })

  it('CA-TUT-02 filtra por grupo, materia, estado, tipo y rango de fechas', async () => {
    await comoInstructor()
    expect((await listarTurnosTeoricos({ ...PARAMETROS, idGrupo: 3 })).total).toBe(3)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, idMateria: 6 })).total).toBe(1)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, estado: 'PROGRAMADO' })).total).toBe(2)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, tipoExamen: 'SUBSANACION' })).total).toBe(1)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, fechaPre: hoyIso() })).total).toBe(3)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, fechaPost: sumarDias(hoyIso(), -6) })).total).toBe(1)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, idGrupo: 5 })).items).toEqual([])
  })
})

describe('contrato §3.2 detalle del turno', () => {
  it('CA-RES-01 CA-RES-03 CA-RES-04 devuelve preguntas, resultados y resumen', async () => {
    await comoInstructor()
    const turno = await obtenerTurnoTeorico(1)
    expect(turno.materia).toEqual({ id: 3, nombre: 'Adoctrinamiento de Vuelo', notaMinima: 18 })
    expect(turno.notaMinimaAplicada).toBe(18)
    expect(turno.instructor).toEqual({ codigo: '444444', nombre: 'Juan Torres Perez' })
    expect(turno.preguntas.map((pregunta) => [pregunta.orden, pregunta.puntajeMaximo])).toEqual([
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
      [5, 4],
    ])
    expect(turno.resultados).toEqual([
      {
        codAlumno: '555555',
        alumno: 'Pedro Rodriguez Garcia',
        estado: 'ENTREGADO',
        idCuestionario: 1,
        nota: 20,
        aprobado: true,
        bloqueadoPorSubsanacion: false,
      },
      {
        codAlumno: '666666',
        alumno: 'Ana Torres Martinez',
        estado: 'ENTREGADO',
        idCuestionario: 2,
        nota: 12,
        aprobado: false,
        bloqueadoPorSubsanacion: true,
      },
    ])
    expect(turno.resumen).toEqual({ habilitados: 2, rindieron: 2, aprobados: 1, notaPromedio: 16 })
  })

  it('CA-RES-02 un turno finalizado sin entregas deriva NO_RINDIO y no promedia', async () => {
    await comoInstructor()
    const turno = await obtenerTurnoTeorico(2)
    expect(turno.resultados).toEqual([
      {
        codAlumno: '222222',
        alumno: 'Juan Falconi Fernandez',
        estado: 'NO_RINDIO',
        idCuestionario: null,
        nota: null,
        aprobado: null,
        bloqueadoPorSubsanacion: false,
      },
    ])
    expect(turno.resumen).toEqual({ habilitados: 1, rindieron: 0, aprobados: 0, notaPromedio: null })
  })

  it('CA-RES-02 la subsanación solo habilita a quien desaprobó el turno de origen', async () => {
    await comoInstructor()
    const turno = await obtenerTurnoTeorico(5)
    expect(turno.turnoOrigen).toMatchObject({ id: 1, nombre: 'Mensual Adoctrinamiento de Vuelo' })
    expect(turno.resultados.map((resultado) => resultado.codAlumno)).toEqual(['666666'])
    expect(await errorDe(obtenerTurnoTeorico(999)).then((error) => error.message)).toBe(D6_TURNO_NO_EXISTE)
  })

  it('CA-RES-02 un alumno sin grupo nunca aparece entre los habilitados', async () => {
    await comoInstructor()
    const codigos = (await obtenerTurnoTeorico(1)).resultados.map((resultado) => resultado.codAlumno)
    expect(codigos).not.toContain('654321')
  })
})

describe('contrato §3.3 registrar turno teórico', () => {
  it('CA-TUT-06 CA-TUT-07 guarda el turno con el orden de las preguntas y devuelve D22', async () => {
    await comoInstructor()
    expect(await crearTurnoTeorico(nuevoTurno())).toEqual({ mensaje: 'Turno teórico guardado con éxito.', id: 6 })
    const turno = await obtenerTurnoTeorico(6)
    expect(turno.preguntas.map((pregunta) => pregunta.idPregunta)).toEqual([17, 18, 19, 20, 21])
    expect(turno.estado).toBe('PROGRAMADO')
    expect(datos().secuencias.turnoTeorico).toBe(7)
  })

  it('CA-TUT-03 valida nombre, fecha futura y ventana mínima de 10 minutos', async () => {
    await comoInstructor()
    const corto = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), nombre: 'Corto' }))
    expect(corto.erroresDeCampo.nombre).toBe('El nombre debe tener entre 10 y 60 caracteres.')
    const pasado = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), fechaExamen: sumarDias(hoyIso(), -1) }))
    expect(pasado.erroresDeCampo.fechaExamen).toBe('El examen debe comenzar en el futuro.')
    const ventana = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), horaFin: '09:05' }))
    expect(ventana.erroresDeCampo.horaFin).toBe('La ventana del examen debe durar al menos 10 minutos.')
  })

  it('CA-TUT-07 exige que los puntajes sumen exactamente 20 y sean enteros de 1 a 20', async () => {
    await comoInstructor()
    const suma = await errorDe(
      crearTurnoTeorico({ ...nuevoTurno(), preguntas: [{ idPregunta: 17, puntajeMaximo: 4 }] }),
    )
    expect(suma.erroresDeCampo.preguntas).toBe('Los puntajes de las preguntas deben sumar 20.')
    const puntaje = await errorDe(
      crearTurnoTeorico({ ...nuevoTurno(), preguntas: [{ idPregunta: 17, puntajeMaximo: 0 }] }),
    )
    expect(puntaje.erroresDeCampo['preguntas[0].puntajeMaximo']).toBe('El puntaje debe ser un entero entre 1 y 20.')
    const vacio = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), preguntas: [] }))
    expect(vacio.erroresDeCampo.preguntas).toBe('Debe elegir al menos una pregunta.')
  })

  it('CA-TUT-06 rechaza preguntas repetidas y de otra materia', async () => {
    await comoInstructor()
    const repetida = await errorDe(
      crearTurnoTeorico({
        ...nuevoTurno(),
        preguntas: [
          { idPregunta: 17, puntajeMaximo: 10 },
          { idPregunta: 17, puntajeMaximo: 10 },
        ],
      }),
    )
    expect(repetida.erroresDeCampo.preguntas).toBe('No se puede repetir una pregunta.')
    const ajena = await errorDe(
      crearTurnoTeorico({
        ...nuevoTurno(),
        preguntas: [
          { idPregunta: 1, puntajeMaximo: 10 },
          { idPregunta: 2, puntajeMaximo: 10 },
        ],
      }),
    )
    expect(ajena.erroresDeCampo.preguntas).toBe('Todas las preguntas deben ser de la materia del turno.')
  })

  it('CA-TUT-04 valida el programa del grupo, los alumnos del grupo y el instructor', async () => {
    await comoInstructor()
    const programa = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), programa: 'PDE' }))
    expect(programa.erroresDeCampo.programa).toBe('El programa no corresponde al grupo.')
    const sinAlumnos = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), idGrupo: 5 }))
    expect(sinAlumnos.erroresDeCampo.idGrupo).toBe('El grupo no tiene alumnos.')
    const ajeno = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), idGrupo: 4 }))
    expect(ajeno.erroresDeCampo.codInstructor).toBe('El grupo no corresponde al instructor.')
    expect(await errorDe(crearTurnoTeorico({ ...nuevoTurno(), idGrupo: 99 })).then((e) => e.message)).toBe(
      D26_GRUPO_NO_EXISTE,
    )
  })

  it('CA-TUT-08 exige el turno de origen solo en subsanación o rezagado', async () => {
    await comoInstructor()
    const sinOrigen = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), tipoExamen: 'SUBSANACION' }))
    expect(sinOrigen.erroresDeCampo.idTurnoOrigen).toBe(
      'El turno de origen es obligatorio para una subsanación o un rezagado.',
    )
    const conOrigenDeMas = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), idTurnoOrigen: 1 }))
    expect(conOrigenDeMas.erroresDeCampo.idTurnoOrigen).toBe(
      'El turno de origen solo se indica en una subsanación o un rezagado.',
    )
    const origenAjeno = await errorDe(
      crearTurnoTeorico({ ...nuevoTurno(), tipoExamen: 'SUBSANACION', idTurnoOrigen: 2 }),
    )
    expect(origenAjeno.erroresDeCampo.idTurnoOrigen).toBe(
      'El turno de origen debe ser un turno finalizado de la misma materia y grupo.',
    )
  })

  it('CA-TUT-08 rechaza un rezagado cuyo turno de origen no dejó a nadie sin rendir', async () => {
    await comoInstructor()
    const error = await errorDe(
      crearTurnoTeorico({
        ...nuevoTurno(),
        nombre: 'Rezagado Adoctrinamiento de Vuelo',
        idMateria: 3,
        tipoExamen: 'REZAGADO',
        idTurnoOrigen: 1,
        preguntas: [1, 2, 3, 4, 5].map((idPregunta) => ({ idPregunta, puntajeMaximo: 4 })),
      }),
    )
    expect(error.erroresDeCampo.idTurnoOrigen).toBe('Ningún alumno del turno de origen corresponde a este tipo de examen.')
  })
})

describe('contrato §3.4 y §3.5 modificar y eliminar', () => {
  it('CA-TUT-10 modificar aplica las mismas reglas y responde 409 D7 si la ventana comenzó', async () => {
    await comoInstructor()
    expect(await modificarTurnoTeorico(4, { ...nuevoTurno(), nombre: 'Quincenal Limites corregido' })).toEqual({
      mensaje: 'Turno teórico guardado con éxito.',
      id: 4,
    })
    const corto = await errorDe(modificarTurnoTeorico(4, { ...nuevoTurno(), nombre: 'Corto' }))
    expect(corto.erroresDeCampo.nombre).toBe('El nombre debe tener entre 10 y 60 caracteres.')
    await expect(modificarTurnoTeorico(1, nuevoTurno())).rejects.toThrow(D7_VENTANA_COMENZADA)
    await expect(modificarTurnoTeorico(3, nuevoTurno())).rejects.toThrow(D7_VENTANA_COMENZADA)
  })

  it('CA-TUT-11 eliminar solo funciona con el turno programado', async () => {
    await comoInstructor()
    expect(await eliminarTurnoTeorico(4)).toBe('Turno teórico eliminado con éxito.')
    expect(datos().turnosTeoricos.some((turno) => turno.id === 4)).toBe(false)
    expect(datos().preguntasTurno.some((fila) => fila.idTurnoTeorico === 4)).toBe(false)
    await expect(eliminarTurnoTeorico(1)).rejects.toThrow(D7_VENTANA_COMENZADA)
    await expect(eliminarTurnoTeorico(4)).rejects.toThrow(D6_TURNO_NO_EXISTE)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/turnos-teoricos.test.ts
```

Expected: FAIL — `Failed to resolve import "@/features/turnos-teoricos/api"` and `Failed to resolve import "./turnos-teoricos"`.

- [ ] **Step 3: Add the shared derivations to the store**

Append to `src/mocks/sigeda/datos.ts`:

```ts
export function alumnosHabilitados(turno: TurnoTeoricoMock): PersonaMock[] {
  const delGrupo = alumnosDeGrupo(turno.idGrupo)
  const origen = turno.idTurnoOrigen === null ? undefined : buscarTurnoTeorico(turno.idTurnoOrigen)
  if (!origen) return delGrupo
  if (turno.tipoExamen === 'SUBSANACION') {
    return delGrupo.filter((alumno) => cuestionarioDe(origen.id, alumno.codigo)?.aprobado === false)
  }
  if (turno.tipoExamen === 'REZAGADO') {
    return delGrupo.filter((alumno) => cuestionarioDe(origen.id, alumno.codigo) === undefined)
  }
  return delGrupo
}

export function desaprobadosSinSubsanar(codAlumno: string): CuestionarioMock[] {
  return datosActuales.cuestionarios.filter((cuestionario) => {
    if (cuestionario.codAlumno !== codAlumno || cuestionario.aprobado !== false) return false
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    if (!turno) return false
    return !datosActuales.cuestionarios.some((otro) => {
      if (otro.codAlumno !== codAlumno || otro.aprobado !== true) return false
      const suTurno = buscarTurnoTeorico(otro.idTurnoTeorico)
      return (
        suTurno !== undefined &&
        suTurno.tipoExamen === 'SUBSANACION' &&
        suTurno.idMateria === turno.idMateria &&
        suTurno.fechaExamen >= turno.fechaExamen
      )
    })
  })
}

export function bloqueadoPorSubsanacion(codAlumno: string): boolean {
  return desaprobadosSinSubsanar(codAlumno).length > 0
}
```

- [ ] **Step 4: Land the turnos teóricos API layer**

Create `src/features/turnos-teoricos/api.ts`:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { soloMensaje } from '@/features/cuentas/api'
import { aNota } from '@/features/evaluaciones/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import {
  DIFICULTADES,
  ESTADOS_TURNO,
  TIPOS_EXAMEN,
  TIPOS_PREGUNTA,
  type EstadoRendicion,
  type EstadoTurnoTeorico,
  type TipoExamen,
} from '@/lib/dominio/teoria'

export type GrupoDeExamen = { id: number; nombre: string; programa: Programa; cantAlumnos: number }

export type TurnoTeoricoFila = {
  id: number
  nombre: string
  idMateria: number
  materia: string
  tipoExamen: TipoExamen
  fechaExamen: string
  horaInicio: string
  horaFin: string
  estado: EstadoTurnoTeorico
  idGrupo: number
  grupo: string
  programa: Programa
  cantPreguntas: number
  cantAlumnos: number
  rindieron: number
}

export type PreguntaDelTurno = {
  idPregunta: number
  orden: number
  enunciado: string
  tipoPregunta: string
  dificultad: string
  puntajeMaximo: number
}

export type ResultadoDelTurno = {
  codAlumno: string
  alumno: string
  estado: EstadoRendicion
  idCuestionario: number | null
  nota: number | null
  aprobado: boolean | null
  bloqueadoPorSubsanacion: boolean
}

export type ResumenDelTurno = { habilitados: number; rindieron: number; aprobados: number; notaPromedio: number | null }

export type TurnoTeoricoDetalle = {
  id: number
  nombre: string
  materia: { id: number; nombre: string; notaMinima: number }
  tipoExamen: TipoExamen
  notaMinimaAplicada: number
  fechaExamen: string
  horaInicio: string
  horaFin: string
  estado: EstadoTurnoTeorico
  grupo: { id: number; nombre: string; programa: Programa }
  instructor: { codigo: string; nombre: string }
  turnoOrigen: { id: number; nombre: string; fechaExamen: string } | null
  preguntas: PreguntaDelTurno[]
  resultados: ResultadoDelTurno[]
  resumen: ResumenDelTurno
}

export type CuerpoTurnoTeorico = {
  codInstructor: string
  nombre: string
  programa: Programa
  idMateria: number
  tipoExamen: TipoExamen
  fechaExamen: string
  horaInicio: string
  horaFin: string
  idGrupo: number
  idTurnoOrigen: number | null
  preguntas: { idPregunta: number; puntajeMaximo: number }[]
}

export type FiltrosTurnosTeoricos = ParametrosPagina & {
  idGrupo?: number
  idMateria?: number
  estado?: EstadoTurnoTeorico
  tipoExamen?: TipoExamen
  fechaPre?: string
  fechaPost?: string
}

export type TurnoTeoricoGuardado = { mensaje: string; id: number }

export const MENSAJE_TURNO_TEORICO_GUARDADO = 'Turno teórico guardado con éxito.'
export const MENSAJE_TURNO_TEORICO_ELIMINADO = 'Turno teórico eliminado con éxito.'

const programas = z.enum(PROGRAMAS)
const tiposExamen = z.enum(TIPOS_EXAMEN.map((tipo) => tipo.valor))
const estados = z.enum(ESTADOS_TURNO)
const rendiciones = z.enum(['NO_RINDIO', 'EN_CURSO', 'ENTREGADO'])

const esquemaGrupo = z.object({
  id: z.number(),
  nombre: z.string(),
  programa: programas,
  cantAlumnos: z.number(),
})

const esquemaFila = z.object({
  id: z.number(),
  nombre: z.string(),
  idMateria: z.number(),
  materia: z.string(),
  tipoExamen: tiposExamen,
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  estado: estados,
  idGrupo: z.number(),
  grupo: z.string(),
  programa: programas,
  cantPreguntas: z.number(),
  cantAlumnos: z.number(),
  rindieron: z.number(),
})

const esquemaDetalle = z.object({
  id: z.number(),
  nombre: z.string(),
  materia: z.object({ id: z.number(), nombre: z.string(), notaMinima: z.number() }),
  tipoExamen: tiposExamen,
  notaMinimaAplicada: z.number(),
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  estado: estados,
  grupo: z.object({ id: z.number(), nombre: z.string(), programa: programas }),
  instructor: z.object({ codigo: z.string(), nombre: z.string() }),
  turnoOrigen: z.object({ id: z.number(), nombre: z.string(), fechaExamen: z.string() }).nullish(),
  preguntas: z.array(
    z.object({
      idPregunta: z.number(),
      orden: z.number(),
      enunciado: z.string(),
      tipoPregunta: z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor)),
      dificultad: z.enum(DIFICULTADES.map((dificultad) => dificultad.valor)),
      puntajeMaximo: z.number(),
    }),
  ),
  resultados: z.array(
    z.object({
      codAlumno: z.string(),
      alumno: z.string(),
      estado: rendiciones,
      idCuestionario: z.number().nullish(),
      nota: z.union([z.number(), z.string()]).nullish(),
      aprobado: z.boolean().nullish(),
      bloqueadoPorSubsanacion: z.boolean(),
    }),
  ),
  resumen: z.object({
    habilitados: z.number(),
    rindieron: z.number(),
    aprobados: z.number(),
    notaPromedio: z.union([z.number(), z.string()]).nullish(),
  }),
})

function aDetalle(crudo: unknown): TurnoTeoricoDetalle {
  const turno = esquemaDetalle.parse(crudo)
  return {
    ...turno,
    turnoOrigen: turno.turnoOrigen ?? null,
    resultados: turno.resultados.map((resultado) => ({
      ...resultado,
      idCuestionario: resultado.idCuestionario ?? null,
      nota: aNota(resultado.nota),
      aprobado: resultado.aprobado ?? null,
    })),
    resumen: { ...turno.resumen, notaPromedio: aNota(turno.resumen.notaPromedio) },
  }
}

export const clavesTurnosTeoricos = {
  todo: ['turnos-teoricos'] as const,
  grupos: (codInstructor: string | null, programa: Programa) =>
    [...clavesTurnosTeoricos.todo, 'grupos', codInstructor, programa] as const,
  lista: (filtros: FiltrosTurnosTeoricos) => [...clavesTurnosTeoricos.todo, 'lista', filtros] as const,
  detalle: (id: number) => [...clavesTurnosTeoricos.todo, 'detalle', id] as const,
  finalizados: (idMateria: number, idGrupo: number) =>
    [...clavesTurnosTeoricos.todo, 'finalizados', idMateria, idGrupo] as const,
}

export async function listarGruposDeExamen(codInstructor: string | null, programa: Programa): Promise<GrupoDeExamen[]> {
  const grupos = await sigeda.lista<unknown>('/api/turnos-teoricos/grupos', {
    codInstructor: codInstructor ?? undefined,
    programa,
  })
  return grupos.map((grupo) => esquemaGrupo.parse(grupo))
}

export async function listarTurnosTeoricos(filtros: FiltrosTurnosTeoricos): Promise<Pagina<TurnoTeoricoFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/turnos-teoricos', {
    idGrupo: filtros.idGrupo,
    idMateria: filtros.idMateria,
    estado: filtros.estado,
    tipoExamen: filtros.tipoExamen,
    fechaPre: filtros.fechaPre,
    fechaPost: filtros.fechaPost,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
  return { ...pagina, items: pagina.items.map((fila) => esquemaFila.parse(fila)) }
}

export async function listarTurnosFinalizados(idMateria: number, idGrupo: number): Promise<TurnoTeoricoFila[]> {
  const pagina = await listarTurnosTeoricos({
    idMateria,
    idGrupo,
    estado: 'FINALIZADO',
    page: 0,
    size: 100,
    direction: 'ASC',
  })
  return pagina.items
}

export async function obtenerTurnoTeorico(id: number): Promise<TurnoTeoricoDetalle> {
  return aDetalle(await sigeda.get<unknown>(`/api/turnos-teoricos/${encodeURIComponent(id)}`))
}

const esquemaGuardado = z.object({ mensaje: z.string(), turnoTeorico: z.object({ id: z.number() }) })

function aGuardado(respuesta: unknown, idConocido: number | null): TurnoTeoricoGuardado {
  const leido = esquemaGuardado.safeParse(respuesta)
  if (leido.success) return { mensaje: leido.data.mensaje, id: leido.data.turnoTeorico.id }
  return { mensaje: soloMensaje(respuesta, MENSAJE_TURNO_TEORICO_GUARDADO), id: idConocido ?? 0 }
}

export async function crearTurnoTeorico(cuerpo: CuerpoTurnoTeorico): Promise<TurnoTeoricoGuardado> {
  return aGuardado(await sigeda.post<unknown>('/api/turnos-teoricos', cuerpo), null)
}

export async function modificarTurnoTeorico(id: number, cuerpo: CuerpoTurnoTeorico): Promise<TurnoTeoricoGuardado> {
  return aGuardado(await sigeda.put<unknown>(`/api/turnos-teoricos/${encodeURIComponent(id)}`, cuerpo), id)
}

export async function eliminarTurnoTeorico(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/turnos-teoricos/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_TURNO_TEORICO_ELIMINADO
}

export const consultasTurnosTeoricos = {
  grupos: (codInstructor: string | null, programa: Programa) =>
    queryOptions({
      queryKey: clavesTurnosTeoricos.grupos(codInstructor, programa),
      queryFn: () => listarGruposDeExamen(codInstructor, programa),
      staleTime: 300_000,
    }),
  lista: (filtros: FiltrosTurnosTeoricos) =>
    queryOptions({
      queryKey: clavesTurnosTeoricos.lista(filtros),
      queryFn: () => listarTurnosTeoricos(filtros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) =>
    queryOptions({ queryKey: clavesTurnosTeoricos.detalle(id), queryFn: () => obtenerTurnoTeorico(id) }),
  finalizados: (idMateria: number, idGrupo: number) =>
    queryOptions({
      queryKey: clavesTurnosTeoricos.finalizados(idMateria, idGrupo),
      queryFn: () => listarTurnosFinalizados(idMateria, idGrupo),
      enabled: idMateria > 0 && idGrupo > 0,
    }),
}
```

The `crearTurnoTeorico` / `modificarTurnoTeorico` return type is `TurnoTeoricoGuardado` (`{ mensaje, id }`) because Task 12 navigates to the saved turno; `aGuardado` falls back to `soloMensaje` plus the id it already knows when the body is not the §3.3 shape.

- [ ] **Step 5: Land the MSW mock of contract §3 and the lazy close of §4.7**

Create `src/mocks/sigeda/turnos-teoricos.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { esFechaIso, esHora, momento } from '@/lib/dominio/calendario'
import { normalizarRespuesta } from '@/lib/dominio/aprendizaje'
import {
  estadoDeVentana,
  exigeTurnoOrigen,
  PUNTAJE_TOTAL_EXAMEN,
  TIPOS_EXAMEN,
  VENTANA_MINIMA_MINUTOS,
} from '@/lib/dominio/teoria'
import {
  API,
  autorizar,
  erroresDeCampo,
  paginar,
  texto,
  textoEliminado,
  textoNoEncontrado,
} from './comun'
import {
  alternativasDePregunta,
  alumnosDeGrupo,
  alumnosHabilitados,
  bloqueadoPorSubsanacion,
  buscarMateria,
  buscarPersona,
  buscarPregunta,
  buscarTurnoTeorico,
  cuestionarioDe,
  datos,
  nombreCompleto,
  preguntasDelTurno,
  siguienteId,
} from './datos'
import { D2_PREGUNTA_NO_EXISTE, D4_MATERIA_NO_EXISTE, D27_PERSONA_NO_EXISTE } from './preguntas'
import { minimoAplicado, type CuestionarioMock, type TipoExamenMock, type TurnoTeoricoMock } from './semilla-teoria'

export const D5_SIN_TURNOS = 'No existen turnos teóricos disponibles.'
export const D6_TURNO_NO_EXISTE = 'Turno teórico especificada no existe.'
export const D7_VENTANA_COMENZADA = 'El turno teórico ya no se puede modificar: su ventana comenzó.'
export const D19_TURNO_ELIMINADO = 'Turno teórico eliminado con éxito.'
export const D22_TURNO_GUARDADO = 'Turno teórico guardado con éxito.'
export const D26_GRUPO_NO_EXISTE = 'Grupo especificada no existe.'
export const D28_SIN_GRUPOS = 'No existen grupos disponibles.'

const TIPOS: readonly TipoExamenMock[] = TIPOS_EXAMEN.map((tipo) => tipo.valor)

type PreguntaEnviada = { idPregunta?: unknown; puntajeMaximo?: unknown }

type CuerpoTurno = {
  codInstructor?: unknown
  nombre?: unknown
  programa?: unknown
  idMateria?: unknown
  tipoExamen?: unknown
  fechaExamen?: unknown
  horaInicio?: unknown
  horaFin?: unknown
  idGrupo?: unknown
  idTurnoOrigen?: unknown
  preguntas?: unknown
}

export function estadoDelTurno(turno: TurnoTeoricoMock) {
  return estadoDeVentana(turno.fechaExamen, turno.horaInicio, turno.horaFin)
}

export function respuestaEsperada(idPregunta: number): string {
  return alternativasDePregunta(idPregunta).find((alternativa) => alternativa.correcto)?.respuesta ?? ''
}

function respuestaDada(idPregunta: number, guardada: string): string | null {
  if (guardada.trim() === '') return null
  const pregunta = buscarPregunta(idPregunta)
  if (pregunta?.tipoPregunta === 'COMPLETAR') return guardada
  return alternativasDePregunta(idPregunta).find((alternativa) => String(alternativa.id) === guardada)?.respuesta ?? null
}

export function calificar(cuestionario: CuestionarioMock, fechaEntrega: string, horaEntrega: string) {
  const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
  if (!turno) return
  const materia = buscarMateria(turno.idMateria)
  cuestionario.calificaciones = preguntasDelTurno(turno.id).map((fila) => {
    const esperada = respuestaEsperada(fila.idPregunta)
    const dada = respuestaDada(fila.idPregunta, cuestionario.respuestas[fila.idPregunta] ?? '')
    const correcto = dada !== null && normalizarRespuesta(dada) === normalizarRespuesta(esperada)
    return {
      idPregunta: fila.idPregunta,
      orden: fila.orden,
      enunciado: buscarPregunta(fila.idPregunta)?.enunciado ?? '',
      respuestaCorrecta: esperada,
      respuestaAlumno: dada,
      correcto,
      puntajeMaximo: fila.puntajeMaximo,
      puntajeObtenido: correcto ? fila.puntajeMaximo : 0,
    }
  })
  const nota = cuestionario.calificaciones.reduce((total, fila) => total + fila.puntajeObtenido, 0)
  cuestionario.nota = Number(nota.toFixed(2))
  cuestionario.notaMinimaAplicada = minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen)
  cuestionario.aprobado = cuestionario.nota >= cuestionario.notaMinimaAplicada
  cuestionario.estado = 'ENTREGADO'
  cuestionario.fechaEntrega = fechaEntrega
  cuestionario.horaEntrega = horaEntrega
}

export function cerrarExamenesVencidos(idTurnoTeorico?: number) {
  const ahora = new Date()
  for (const cuestionario of datos().cuestionarios) {
    if (cuestionario.estado !== 'EN_CURSO') continue
    if (idTurnoTeorico !== undefined && cuestionario.idTurnoTeorico !== idTurnoTeorico) continue
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    if (!turno || ahora <= momento(turno.fechaExamen, turno.horaFin)) continue
    calificar(cuestionario, turno.fechaExamen, turno.horaFin)
  }
}

function rindieron(turno: TurnoTeoricoMock): CuestionarioMock[] {
  return datos().cuestionarios.filter(
    (cuestionario) => cuestionario.idTurnoTeorico === turno.id && cuestionario.estado === 'ENTREGADO',
  )
}

function filaPublica(turno: TurnoTeoricoMock) {
  const grupo = datos().grupos.find((candidato) => candidato.id === turno.idGrupo)
  return {
    id: turno.id,
    nombre: turno.nombre,
    idMateria: turno.idMateria,
    materia: buscarMateria(turno.idMateria)?.nombre ?? '',
    tipoExamen: turno.tipoExamen,
    fechaExamen: turno.fechaExamen,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    estado: estadoDelTurno(turno),
    idGrupo: turno.idGrupo,
    grupo: grupo?.nombre ?? '',
    programa: grupo?.programa ?? 'PDI',
    codInstructor: turno.codInstructor,
    idTurnoOrigen: turno.idTurnoOrigen,
    cantPreguntas: preguntasDelTurno(turno.id).length,
    cantAlumnos: alumnosHabilitados(turno).length,
    rindieron: rindieron(turno).length,
  }
}

export function detallePublico(turno: TurnoTeoricoMock) {
  const materia = buscarMateria(turno.idMateria)
  const grupo = datos().grupos.find((candidato) => candidato.id === turno.idGrupo)
  const instructor = buscarPersona(turno.codInstructor)
  const origen = turno.idTurnoOrigen === null ? undefined : buscarTurnoTeorico(turno.idTurnoOrigen)
  const habilitados = alumnosHabilitados(turno)
  const entregados = rindieron(turno)
  const notas = entregados.flatMap((cuestionario) => (cuestionario.nota === null ? [] : [cuestionario.nota]))
  return {
    id: turno.id,
    nombre: turno.nombre,
    materia: { id: turno.idMateria, nombre: materia?.nombre ?? '', notaMinima: materia?.notaMinima ?? 0 },
    tipoExamen: turno.tipoExamen,
    notaMinimaAplicada: minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen),
    fechaExamen: turno.fechaExamen,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    estado: estadoDelTurno(turno),
    grupo: { id: turno.idGrupo, nombre: grupo?.nombre ?? '', programa: grupo?.programa ?? 'PDI' },
    instructor: { codigo: turno.codInstructor, nombre: instructor ? nombreCompleto(instructor) : '' },
    turnoOrigen: origen ? { id: origen.id, nombre: origen.nombre, fechaExamen: origen.fechaExamen } : null,
    preguntas: preguntasDelTurno(turno.id).map((fila) => {
      const pregunta = buscarPregunta(fila.idPregunta)
      return {
        idPregunta: fila.idPregunta,
        orden: fila.orden,
        enunciado: pregunta?.enunciado ?? '',
        tipoPregunta: pregunta?.tipoPregunta ?? 'OPCION_MULTIPLE',
        dificultad: pregunta?.dificultad ?? 'MEDIA',
        puntajeMaximo: fila.puntajeMaximo,
      }
    }),
    resultados: habilitados.map((alumno) => {
      const cuestionario = cuestionarioDe(turno.id, alumno.codigo)
      return {
        codAlumno: alumno.codigo,
        alumno: nombreCompleto(alumno),
        estado: cuestionario?.estado ?? 'NO_RINDIO',
        idCuestionario: cuestionario?.id ?? null,
        nota: cuestionario?.nota ?? null,
        aprobado: cuestionario?.aprobado ?? null,
        bloqueadoPorSubsanacion: bloqueadoPorSubsanacion(alumno.codigo),
      }
    }),
    resumen: {
      habilitados: habilitados.length,
      rindieron: entregados.length,
      aprobados: entregados.filter((cuestionario) => cuestionario.aprobado === true).length,
      notaPromedio:
        notas.length === 0 ? null : Number((notas.reduce((total, nota) => total + nota, 0) / notas.length).toFixed(2)),
    },
  }
}

function minutosEntre(horaInicio: string, horaFin: string): number {
  const [hi, mi] = horaInicio.split(':').map(Number)
  const [hf, mf] = horaFin.split(':').map(Number)
  return hf * 60 + mf - (hi * 60 + mi)
}

function preguntasDelCuerpo(valor: unknown): PreguntaEnviada[] {
  return Array.isArray(valor) ? (valor as PreguntaEnviada[]) : []
}

function erroresDeForma(cuerpo: CuerpoTurno): string[] {
  const errores: string[] = []
  if (!/^\d{6}$/.test(texto(cuerpo.codInstructor))) {
    errores.push("'codInstructor': El código del instructor es obligatorio.")
  }
  const nombre = texto(cuerpo.nombre).trim()
  if (nombre === '') errores.push("'nombre': El nombre es obligatorio")
  else if (nombre.length < 10 || nombre.length > 60) {
    errores.push("'nombre': El nombre debe tener entre 10 y 60 caracteres.")
  }
  if (cuerpo.programa !== 'PDI' && cuerpo.programa !== 'PDE') errores.push("'programa': Ingresar programa válido.")
  if (typeof cuerpo.idMateria !== 'number' || cuerpo.idMateria <= 0) {
    errores.push("'idMateria': La materia es obligatoria.")
  }
  if (!TIPOS.some((tipo) => tipo === cuerpo.tipoExamen)) errores.push("'tipoExamen': Ingresar tipo de examen válido.")
  const fecha = texto(cuerpo.fechaExamen)
  const horaInicio = texto(cuerpo.horaInicio)
  const horaFin = texto(cuerpo.horaFin)
  if (!esFechaIso(fecha)) errores.push("'fechaExamen': La fecha del examen es obligatoria.")
  if (!esHora(horaInicio)) errores.push("'horaInicio': La hora de inicio es obligatoria.")
  if (!esHora(horaFin)) errores.push("'horaFin': La hora de fin es obligatoria.")
  if (esFechaIso(fecha) && esHora(horaInicio) && momento(fecha, horaInicio) <= new Date()) {
    errores.push("'fechaExamen': El examen debe comenzar en el futuro.")
  }
  if (esHora(horaInicio) && esHora(horaFin) && minutosEntre(horaInicio, horaFin) < VENTANA_MINIMA_MINUTOS) {
    errores.push("'horaFin': La ventana del examen debe durar al menos 10 minutos.")
  }
  if (typeof cuerpo.idGrupo !== 'number' || cuerpo.idGrupo <= 0) errores.push("'idGrupo': El grupo es obligatorio.")
  const conOrigen = exigeTurnoOrigen(texto(cuerpo.tipoExamen))
  const idOrigen = cuerpo.idTurnoOrigen
  if (conOrigen && (typeof idOrigen !== 'number' || idOrigen <= 0)) {
    errores.push("'idTurnoOrigen': El turno de origen es obligatorio para una subsanación o un rezagado.")
  }
  if (!conOrigen && typeof idOrigen === 'number') {
    errores.push("'idTurnoOrigen': El turno de origen solo se indica en una subsanación o un rezagado.")
  }
  const preguntas = preguntasDelCuerpo(cuerpo.preguntas)
  if (preguntas.length === 0) errores.push("'preguntas': Debe elegir al menos una pregunta.")
  else {
    const ids = preguntas.map((pregunta) => Number(pregunta.idPregunta))
    if (new Set(ids).size !== ids.length) errores.push("'preguntas': No se puede repetir una pregunta.")
  }
  preguntas.forEach((pregunta, indice) => {
    const puntaje = pregunta.puntajeMaximo
    if (typeof puntaje !== 'number' || !Number.isInteger(puntaje) || puntaje < 1 || puntaje > PUNTAJE_TOTAL_EXAMEN) {
      errores.push(`'preguntas[${indice}].puntajeMaximo': El puntaje debe ser un entero entre 1 y 20.`)
    }
  })
  if (
    preguntas.length > 0 &&
    preguntas.reduce((total, pregunta) => total + Number(pregunta.puntajeMaximo ?? 0), 0) !== PUNTAJE_TOTAL_EXAMEN
  ) {
    errores.push("'preguntas': Los puntajes de las preguntas deben sumar 20.")
  }
  return errores
}

function gruposDelInstructor(codInstructor: string): number[] {
  const codigos = datos()
    .turnos.filter((turno) => turno.codInstructor === codInstructor)
    .flatMap((turno) => turno.alumnos.map((alumno) => alumno.codAlumno))
  const ids = codigos.flatMap((codigo) => {
    const idGrupo = buscarPersona(codigo)?.idGrupo
    return idGrupo === null || idGrupo === undefined ? [] : [idGrupo]
  })
  return [...new Set(ids)]
}

function erroresDeCruce(cuerpo: CuerpoTurno): string[] {
  const errores: string[] = []
  const grupo = datos().grupos.find((candidato) => candidato.id === Number(cuerpo.idGrupo))
  if (!grupo) return errores
  if (alumnosDeGrupo(grupo.id).length === 0) errores.push("'idGrupo': El grupo no tiene alumnos.")
  if (grupo.programa !== cuerpo.programa) errores.push("'programa': El programa no corresponde al grupo.")
  if (!gruposDelInstructor(texto(cuerpo.codInstructor)).includes(grupo.id)) {
    errores.push("'codInstructor': El grupo no corresponde al instructor.")
  }
  const origen = typeof cuerpo.idTurnoOrigen === 'number' ? buscarTurnoTeorico(cuerpo.idTurnoOrigen) : undefined
  if (origen) {
    if (estadoDelTurno(origen) !== 'FINALIZADO' || origen.idMateria !== cuerpo.idMateria || origen.idGrupo !== grupo.id) {
      errores.push("'idTurnoOrigen': El turno de origen debe ser un turno finalizado de la misma materia y grupo.")
    } else {
      const candidatos = alumnosDeGrupo(origen.idGrupo).filter((alumno) => {
        const cuestionario = cuestionarioDe(origen.id, alumno.codigo)
        return cuerpo.tipoExamen === 'SUBSANACION' ? cuestionario?.aprobado === false : cuestionario === undefined
      })
      if (candidatos.length === 0) {
        errores.push("'idTurnoOrigen': Ningún alumno del turno de origen corresponde a este tipo de examen.")
      }
    }
  }
  const preguntas = preguntasDelCuerpo(cuerpo.preguntas)
  if (preguntas.some((pregunta) => buscarPregunta(Number(pregunta.idPregunta))?.idMateria !== cuerpo.idMateria)) {
    errores.push("'preguntas': Todas las preguntas deben ser de la materia del turno.")
  }
  return errores
}

function noEncontrados(cuerpo: CuerpoTurno): Response | null {
  if (!buscarPersona(texto(cuerpo.codInstructor))) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
  if (!buscarMateria(Number(cuerpo.idMateria))) return textoNoEncontrado(D4_MATERIA_NO_EXISTE)
  if (!datos().grupos.some((grupo) => grupo.id === Number(cuerpo.idGrupo))) return textoNoEncontrado(D26_GRUPO_NO_EXISTE)
  if (typeof cuerpo.idTurnoOrigen === 'number' && !buscarTurnoTeorico(cuerpo.idTurnoOrigen)) {
    return textoNoEncontrado(D6_TURNO_NO_EXISTE)
  }
  if (preguntasDelCuerpo(cuerpo.preguntas).some((pregunta) => !buscarPregunta(Number(pregunta.idPregunta)))) {
    return textoNoEncontrado(D2_PREGUNTA_NO_EXISTE)
  }
  return null
}

function guardarPreguntas(idTurnoTeorico: number, cuerpo: CuerpoTurno) {
  datos().preguntasTurno = datos().preguntasTurno.filter((fila) => fila.idTurnoTeorico !== idTurnoTeorico)
  preguntasDelCuerpo(cuerpo.preguntas).forEach((pregunta, indice) => {
    datos().preguntasTurno.push({
      idTurnoTeorico,
      idPregunta: Number(pregunta.idPregunta),
      orden: indice + 1,
      puntajeMaximo: Number(pregunta.puntajeMaximo),
    })
  })
}

function aplicar(turno: TurnoTeoricoMock, cuerpo: CuerpoTurno) {
  turno.nombre = texto(cuerpo.nombre).trim()
  turno.idMateria = Number(cuerpo.idMateria)
  turno.tipoExamen = TIPOS.find((tipo) => tipo === cuerpo.tipoExamen) ?? turno.tipoExamen
  turno.fechaExamen = texto(cuerpo.fechaExamen)
  turno.horaInicio = texto(cuerpo.horaInicio)
  turno.horaFin = texto(cuerpo.horaFin)
  turno.idGrupo = Number(cuerpo.idGrupo)
  turno.codInstructor = texto(cuerpo.codInstructor)
  turno.idTurnoOrigen = typeof cuerpo.idTurnoOrigen === 'number' ? cuerpo.idTurnoOrigen : null
  guardarPreguntas(turno.id, cuerpo)
}

function filtrados(url: URL) {
  const idGrupo = Number(url.searchParams.get('idGrupo'))
  const idMateria = Number(url.searchParams.get('idMateria'))
  const estado = url.searchParams.get('estado')
  const tipoExamen = url.searchParams.get('tipoExamen')
  const codInstructor = url.searchParams.get('codInstructor')
  const fechaPre = url.searchParams.get('fechaPre')
  const fechaPost = url.searchParams.get('fechaPost')
  return datos()
    .turnosTeoricos.filter((turno) => (idGrupo > 0 ? turno.idGrupo === idGrupo : true))
    .filter((turno) => (idMateria > 0 ? turno.idMateria === idMateria : true))
    .filter((turno) => (estado === null ? true : estadoDelTurno(turno) === estado))
    .filter((turno) => (tipoExamen === null ? true : turno.tipoExamen === tipoExamen))
    .filter((turno) => (codInstructor === null ? true : turno.codInstructor === codInstructor))
    .filter((turno) => (fechaPre === null ? true : turno.fechaExamen >= fechaPre))
    .filter((turno) => (fechaPost === null ? true : turno.fechaExamen <= fechaPost))
    .map(filaPublica)
}

export const handlersTurnosTeoricos = [
  http.get(`${API}/api/turnos-teoricos/grupos`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const programa = url.searchParams.get('programa')
    const codInstructor = url.searchParams.get('codInstructor')
    const errores: string[] = []
    if (programa !== 'PDI' && programa !== 'PDE') errores.push("'programa': Ingresar programa válido.")
    const permisos = autorizar(request, 'Manage Groups')
    if (codInstructor === null && permisos instanceof Response) {
      errores.push("'codInstructor': El código del instructor es obligatorio.")
    }
    if (errores.length > 0) return erroresDeCampo(errores)
    if (codInstructor !== null && !buscarPersona(codInstructor)) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    const alcanzables = codInstructor === null ? null : gruposDelInstructor(codInstructor)
    const grupos = datos()
      .grupos.filter((grupo) => grupo.programa === programa)
      .filter((grupo) => alumnosDeGrupo(grupo.id).length > 0)
      .filter((grupo) => alcanzables === null || alcanzables.includes(grupo.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
      .map((grupo) => ({
        id: grupo.id,
        nombre: grupo.nombre,
        programa: grupo.programa,
        cantAlumnos: alumnosDeGrupo(grupo.id).length,
      }))
    if (grupos.length === 0) return textoNoEncontrado(D28_SIN_GRUPOS)
    return HttpResponse.json(grupos)
  }),
  http.get(`${API}/api/turnos-teoricos`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    return paginar(filtrados(url), url, { nombreLista: 'turnos teóricos', propiedadPorDefecto: 'fechaExamen' })
  }),
  http.post(`${API}/api/turnos-teoricos`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoTurno
    const forma = erroresDeForma(cuerpo)
    if (forma.length > 0) return erroresDeCampo(forma)
    const faltante = noEncontrados(cuerpo)
    if (faltante) return faltante
    const cruce = erroresDeCruce(cuerpo)
    if (cruce.length > 0) return erroresDeCampo(cruce)
    const turno: TurnoTeoricoMock = {
      id: siguienteId('turnoTeorico'),
      nombre: '',
      idMateria: 0,
      tipoExamen: 'TEST',
      fechaExamen: '',
      horaInicio: '',
      horaFin: '',
      idGrupo: 0,
      codInstructor: '',
      idTurnoOrigen: null,
    }
    datos().turnosTeoricos.push(turno)
    aplicar(turno, cuerpo)
    return HttpResponse.json({ mensaje: D22_TURNO_GUARDADO, turnoTeorico: detallePublico(turno) }, { status: 201 })
  }),
  http.get(`${API}/api/turnos-teoricos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    cerrarExamenesVencidos(turno.id)
    return HttpResponse.json(detallePublico(turno))
  }),
  http.put(`${API}/api/turnos-teoricos/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    if (estadoDelTurno(turno) !== 'PROGRAMADO') return HttpResponse.text(D7_VENTANA_COMENZADA, { status: 409 })
    const cuerpo = (await request.json()) as CuerpoTurno
    const forma = erroresDeForma(cuerpo)
    if (forma.length > 0) return erroresDeCampo(forma)
    const faltante = noEncontrados(cuerpo)
    if (faltante) return faltante
    const cruce = erroresDeCruce(cuerpo)
    if (cruce.length > 0) return erroresDeCampo(cruce)
    aplicar(turno, cuerpo)
    return HttpResponse.json({ mensaje: D22_TURNO_GUARDADO, turnoTeorico: detallePublico(turno) }, { status: 201 })
  }),
  http.delete(`${API}/api/turnos-teoricos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    if (estadoDelTurno(turno) !== 'PROGRAMADO') return HttpResponse.text(D7_VENTANA_COMENZADA, { status: 409 })
    datos().turnosTeoricos = datos().turnosTeoricos.filter((candidato) => candidato.id !== turno.id)
    datos().preguntasTurno = datos().preguntasTurno.filter((fila) => fila.idTurnoTeorico !== turno.id)
    return textoEliminado('Turno teórico')
  }),
]
```

`GET /api/turnos-teoricos/grupos` is registered **before** `GET /api/turnos-teoricos/:id`; with the order reversed the parameterised route answers `grupos` with D6.

- [ ] **Step 6: Register the handlers**

In `src/mocks/handlers.ts`, replace:

```ts
import { handlersTurnos } from './sigeda/turnos'
```

with:

```ts
import { handlersTurnos } from './sigeda/turnos'
import { handlersTurnosTeoricos } from './sigeda/turnos-teoricos'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersTurnos,
```

with:

```ts
  ...handlersTurnos,
  ...handlersTurnosTeoricos,
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/turnos-teoricos.test.ts
```

Expected: PASS, 19 tests.

- [ ] **Step 8: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **663 tests**.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the turnos teoricos api layer, the grupo catalogue and their mock"
```

---

### Task 4: Exámenes API layer with the mocks of contract §4 and §5 (M4-2, M4-9, M4-10, M4-11, M4-12, M4-18) (CA-EXA-01..05, CA-EXA-08..12, CA-RES-03, CA-RES-06..09)

**Files:**

- Create: `src/features/examenes/api.ts`
- Create: `src/mocks/sigeda/cuestionarios-teoria.ts`
- Create: `src/mocks/sigeda/estado-teorico.ts`
- Test: `src/mocks/sigeda/cuestionarios-teoria.test.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**
- Consumes: `aNota`, the Task 1 store helpers, `calificar` / `cerrarExamenesVencidos` / `estadoDelTurno` / `D6_TURNO_NO_EXISTE` from `mocks/sigeda/turnos-teoricos`, `desaprobadosSinSubsanar` and `alumnosHabilitados` from the store, `textoProhibido` from `mocks/sigeda/comun`.
- Produces:
  - `clavesExamenes`, `consultasExamenes.{pendientes,miExamen,estadoTeorico}`, `listarExamenesPendientes`, `iniciarExamen`, `guardarRespuestas`, `entregarExamen`, `obtenerMiExamen`, `obtenerExamen`, `obtenerEstadoTeorico` and the types `ExamenPendiente`, `ExamenEnCurso`, `ExamenResuelto`, `EstadoTeorico`, `RespuestaDeExamen`.
  - `handlersCuestionariosTeoria` (the name M4-18 fixes, because `src/mocks/ia/cuestionarios.ts` already exports `handlersCuestionarios`) implementing §4.1–§4.7 with D8–D12, D15, D17, D23, D25 and D27, the idempotent `iniciar` with its persisted `orden`, replace-semantics autosave, the grading of §4.4 and the lazy close on every read.
  - `handlersEstadoTeorico` implementing §5.1 with the server-built `motivo`, and `motivoDeBloqueo(codAlumno)`.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/sigeda/cuestionarios-teoria.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import {
  entregarExamen,
  guardarRespuestas,
  iniciarExamen,
  listarExamenesPendientes,
  obtenerEstadoTeorico,
  obtenerExamen,
  obtenerMiExamen,
} from '@/features/examenes/api'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'
import { iniciarComo } from '@/test/render'
import { alternativasDePregunta, cuestionarioDe, datos } from './datos'
import {
  D8_EXAMEN_NO_DISPONIBLE,
  D9_ALUMNO_NO_HABILITADO,
  D10_EXAMEN_ENTREGADO,
  D11_VENTANA_CERRADA,
  D12_EXAMEN_NO_EXISTE,
  D15_SOLO_LO_PROPIO,
} from './cuestionarios-teoria'

function idCorrecta(idPregunta: number): string {
  return String(alternativasDePregunta(idPregunta).find((alternativa) => alternativa.correcto)?.id)
}

function idIncorrecta(idPregunta: number): string {
  return String(alternativasDePregunta(idPregunta).find((alternativa) => !alternativa.correcto)?.id)
}

describe('contrato §4.1 exámenes pendientes', () => {
  it('CA-EXA-01 lista los turnos habilitados sin entregar, ordenados por fecha y hora', async () => {
    await iniciarComo('alumno.torres')
    const pendientes = await listarExamenesPendientes('666666')
    expect(pendientes.map((pendiente) => [pendiente.idTurnoTeorico, pendiente.estadoRendicion])).toEqual([
      [5, 'NO_RINDIO'],
      [4, 'NO_RINDIO'],
    ])
    expect(pendientes[0]).toMatchObject({
      nombre: 'Subsanación Adoctrinamiento de Vuelo',
      materia: 'Adoctrinamiento de Vuelo',
      tipoExamen: 'SUBSANACION',
      notaMinimaAplicada: 18,
      cantPreguntas: 5,
      idCuestionario: null,
    })
  })

  it('CA-EXA-01 el examen en curso llega con su id y su estado', async () => {
    await iniciarComo('alumno.lopez')
    const pendientes = await listarExamenesPendientes('111111')
    expect(pendientes.map((pendiente) => [pendiente.idTurnoTeorico, pendiente.idCuestionario, pendiente.estadoRendicion])).toEqual([
      [3, 3, 'EN_CURSO'],
    ])
  })

  it('CA-EXA-01 sin pendientes el 404 D17 llega como lista vacía', async () => {
    await iniciarComo('alumno.falconi')
    expect(await listarExamenesPendientes('222222')).toEqual([])
  })
})

describe('contrato §4.2 iniciar el examen', () => {
  it('CA-EXA-03 no expone la alternativa correcta, la respuesta esperada ni la explicación', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    const examen = await iniciarExamen(3, '111111')
    expect(examen.id).toBe(3)
    expect(examen.puntajeTotal).toBe(20)
    expect(examen.preguntas.map((pregunta) => pregunta.orden)).toEqual([1, 2, 3, 4, 5])
    expect(JSON.stringify(examen)).not.toContain('correcto')
    expect(JSON.stringify(examen)).not.toContain('explicacion')
    const completar = examen.preguntas.find((pregunta) => pregunta.tipoPregunta === 'COMPLETAR')
    expect(completar?.alternativas).toEqual([])
  })

  it('CA-EXA-08 es idempotente: devuelve el mismo examen con las respuestas guardadas', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    const primero = await iniciarExamen(3, '111111')
    const segundo = await iniciarExamen(3, '111111')
    expect(segundo.id).toBe(primero.id)
    expect(segundo.preguntas.map((pregunta) => pregunta.idPregunta)).toEqual(
      primero.preguntas.map((pregunta) => pregunta.idPregunta),
    )
    expect(segundo.preguntas[0]?.respuestaAlumno).toBe(idCorrecta(1))
    expect(datos().cuestionarios.filter((cuestionario) => cuestionario.idTurnoTeorico === 3)).toHaveLength(1)
  })

  it('CA-EXA-02 CA-EXA-11 CA-EXA-12 responde D8, D10 y D9 en sus casos', async () => {
    await iniciarComo('alumno.torres')
    await expect(iniciarExamen(4, '666666')).rejects.toThrow(D8_EXAMEN_NO_DISPONIBLE)
    await iniciarComo('alumno.garcia')
    await expect(iniciarExamen(1, '555555')).rejects.toThrow(D10_EXAMEN_ENTREGADO)
    await expect(iniciarExamen(5, '555555')).rejects.toThrow(D9_ALUMNO_NO_HABILITADO)
  })
})

describe('contrato §4.3 autoguardado', () => {
  it('CA-EXA-05 reemplaza el conjunto completo de respuestas', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    await guardarRespuestas(3, '111111', [{ idPregunta: 2, respuesta: idCorrecta(2) }])
    expect(Object.keys(cuestionarioDe(3, '111111')?.respuestas ?? {})).toEqual(['2'])
    await guardarRespuestas(3, '111111', [])
    expect(cuestionarioDe(3, '111111')?.respuestas).toEqual({})
  })

  it('CA-EXA-05 valida la pregunta, la alternativa y el largo de una respuesta de completar', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    const ajena = (await guardarRespuestas(3, '111111', [{ idPregunta: 17, respuesta: '1' }]).catch(
      (problema: unknown) => problema,
    )) as ApiError
    expect(ajena.erroresDeCampo['respuestas[0].idPregunta']).toBe('La pregunta no pertenece a este examen.')
    const mala = (await guardarRespuestas(3, '111111', [{ idPregunta: 1, respuesta: '999' }]).catch(
      (problema: unknown) => problema,
    )) as ApiError
    expect(mala.erroresDeCampo['respuestas[0].respuesta']).toBe('La alternativa no pertenece a esta pregunta.')
    const larga = (await guardarRespuestas(3, '111111', [{ idPregunta: 4, respuesta: 'x'.repeat(201) }]).catch(
      (problema: unknown) => problema,
    )) as ApiError
    expect(larga.erroresDeCampo['respuestas[0].respuesta']).toBe('La respuesta no puede superar los 200 caracteres.')
  })

  it('CA-EXA-11 un examen ajeno o inexistente responde D15 y D12', async () => {
    await iniciarComo('alumno.lopez')
    await expect(guardarRespuestas(1, '111111', [])).rejects.toThrow(D15_SOLO_LO_PROPIO)
    await expect(guardarRespuestas(99, '111111', [])).rejects.toThrow(D12_EXAMEN_NO_EXISTE)
  })
})

describe('contrato §4.4 entregar y calificar', () => {
  it('CA-RES-03 califica sobre 20 con la nota mínima aplicada del servidor', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    await guardarRespuestas(3, '111111', [
      { idPregunta: 1, respuesta: idCorrecta(1) },
      { idPregunta: 2, respuesta: idIncorrecta(2) },
      { idPregunta: 3, respuesta: idCorrecta(3) },
      { idPregunta: 4, respuesta: '  REGULAR  ' },
      { idPregunta: 5, respuesta: idCorrecta(5) },
    ])
    const resultado = await entregarExamen(3, '111111')
    expect(resultado.nota).toBe(16)
    expect(resultado.notaMinimaAplicada).toBe(18)
    expect(resultado.aprobado).toBe(false)
    expect(resultado.estado).toBe('ENTREGADO')
    expect(resultado.calificaciones).toEqual([])
    const guardado = cuestionarioDe(3, '111111')
    expect(guardado?.calificaciones.filter((fila) => fila.correcto).map((fila) => fila.idPregunta)).toEqual([1, 3, 4, 5])
    await expect(entregarExamen(3, '111111')).rejects.toThrow(D10_EXAMEN_ENTREGADO)
  })

  it('CA-EXA-09 CA-EXA-10 tras cerrar la ventana el servidor entrega y responde D11', async () => {
    const { avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 10 })
    await iniciarComo('alumno.lopez')
    await avanzar(11 * 60_000)
    await expect(guardarRespuestas(3, '111111', [])).rejects.toThrow(D11_VENTANA_CERRADA)
    const cerrado = cuestionarioDe(3, '111111')
    expect(cerrado?.estado).toBe('ENTREGADO')
    expect(cerrado?.nota).toBe(4)
    expect(cerrado?.horaEntrega).toBe('09:10')
    await expect(entregarExamen(3, '111111')).rejects.toThrow(D11_VENTANA_CERRADA)
  })
})

describe('contrato §4.5 y §4.6 leer el resultado', () => {
  it('CA-RES-08 con el turno finalizado el detalle incluye enunciado, respuestas y explicación', async () => {
    await iniciarComo('alumno.torres')
    const examen = await obtenerMiExamen(1, '666666')
    expect(examen.nota).toBe(12)
    expect(examen.aprobado).toBe(false)
    expect(examen.turnoTeorico).toEqual({ id: 1, nombre: 'Mensual Adoctrinamiento de Vuelo', estado: 'FINALIZADO' })
    expect(examen.calificaciones).toHaveLength(5)
    expect(examen.calificaciones[0]).toMatchObject({
      respuestaAlumno: 'El PDI EA-510',
      respuestaCorrecta: 'El PDI EA-510',
      explicacion: 'El PDI EA-510 es el plan de instrucción vigente del curso.',
      correcto: true,
      puntajeObtenido: 4,
    })
  })

  it('CA-RES-07 mientras el turno no termina el alumno recibe la nota sin las calificaciones', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    await entregarExamen(3, '111111')
    const examen = await obtenerMiExamen(3, '111111')
    expect(examen.estado).toBe('ENTREGADO')
    expect(examen.nota).toBe(4)
    expect(examen.notaMinimaAplicada).toBe(18)
    expect(examen.calificaciones).toEqual([])
  })

  it('CA-RES-09 mi-cuestionario rechaza el código de otro alumno y un turno sin examen propio', async () => {
    await iniciarComo('alumno.lopez')
    await expect(obtenerMiExamen(1, '666666')).rejects.toThrow(D15_SOLO_LO_PROPIO)
    await expect(obtenerMiExamen(4, '111111')).rejects.toThrow(D12_EXAMEN_NO_EXISTE)
  })

  it('con Manage Exams el detalle de cualquier examen llega completo', async () => {
    await iniciarComo('instructor.perez')
    const examen = await obtenerExamen(2)
    expect(examen.alumno).toBe('Ana Torres Martinez')
    expect(examen.calificaciones).toHaveLength(5)
  })
})

describe('contrato §5.1 estado teórico', () => {
  it('CA-RES-06 el alumno 666666 queda bloqueado con su motivo, su desaprobado y su pendiente', async () => {
    await iniciarComo('jefe.operaciones')
    const estado = await obtenerEstadoTeorico('666666')
    expect(estado.bloqueadoPorSubsanacion).toBe(true)
    expect(estado.motivo).toBe(
      'Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.',
    )
    expect(estado.desaprobados.map((fila) => fila.idCuestionario)).toEqual([2])
    expect(estado.pendientes.map((fila) => fila.idTurnoTeorico)).toEqual([5])
  })

  it('CA-RES-10 el resto de las personas responde sin bloqueo y un código inexistente da 404', async () => {
    await iniciarComo('jefe.operaciones')
    for (const codigo of ['111111', '222222', '555555', '777777', '999999', '654321', '333333']) {
      const estado = await obtenerEstadoTeorico(codigo)
      expect([estado.bloqueadoPorSubsanacion, estado.motivo, estado.desaprobados, estado.pendientes]).toEqual([
        false,
        null,
        [],
        [],
      ])
    }
    await expect(obtenerEstadoTeorico('000999')).rejects.toThrow('Persona especificada no existe.')
  })

  it('M4-2 un alumno no consulta el estado teórico de otro', async () => {
    await iniciarComo('alumno.lopez')
    expect((await obtenerEstadoTeorico('111111')).codAlumno).toBe('111111')
    await expect(obtenerEstadoTeorico('666666')).rejects.toThrow(D15_SOLO_LO_PROPIO)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/cuestionarios-teoria.test.ts
```

Expected: FAIL — `Failed to resolve import "@/features/examenes/api"` and `Failed to resolve import "./cuestionarios-teoria"`.

- [ ] **Step 3: Land the exámenes API layer**

Create `src/features/examenes/api.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { aNota } from '@/features/evaluaciones/api'
import { sigeda } from '@/lib/api/sigeda'
import { ESTADOS_TURNO, TIPOS_EXAMEN, TIPOS_PREGUNTA, type EstadoRendicion, type TipoExamen } from '@/lib/dominio/teoria'

export type ExamenPendiente = {
  idTurnoTeorico: number
  nombre: string
  idMateria: number
  materia: string
  notaMinimaAplicada: number
  tipoExamen: TipoExamen
  fechaExamen: string
  horaInicio: string
  horaFin: string
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO'
  cantPreguntas: number
  idCuestionario: number | null
  estadoRendicion: EstadoRendicion
}

export type AlternativaDeExamen = { id: number; respuesta: string }

export type PreguntaDeExamen = {
  idPregunta: number
  orden: number
  enunciado: string
  tipoPregunta: string
  puntajeMaximo: number
  alternativas: AlternativaDeExamen[]
  respuestaAlumno: string | null
}

export type ExamenEnCurso = {
  id: number
  idTurnoTeorico: number
  turnoTeorico: string
  materia: { id: number; nombre: string; notaMinima: number }
  tipoExamen: TipoExamen
  notaMinimaAplicada: number
  codAlumno: string
  estado: 'EN_CURSO' | 'ENTREGADO'
  fechaExamen: string
  horaInicio: string
  horaFin: string
  puntajeTotal: number
  preguntas: PreguntaDeExamen[]
}

export type CalificacionDeExamen = {
  idPregunta: number
  orden: number
  enunciado: string
  tipoPregunta: string
  respuestaAlumno: string | null
  respuestaCorrecta: string
  explicacion: string | null
  correcto: boolean
  puntajeMaximo: number
  puntajeObtenido: number
}

export type ExamenResuelto = {
  id: number
  turnoTeorico: { id: number; nombre: string; estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' }
  materia: { id: number; nombre: string; notaMinima: number }
  tipoExamen: TipoExamen
  notaMinimaAplicada: number
  codAlumno: string
  alumno: string
  estado: 'EN_CURSO' | 'ENTREGADO'
  fechaExamen: string
  horaInicio: string
  horaFin: string
  fechaEntrega: string | null
  horaEntrega: string | null
  puntajeTotal: number
  nota: number | null
  aprobado: boolean | null
  calificaciones: CalificacionDeExamen[]
}

export type DesaprobadoTeorico = {
  idCuestionario: number
  idTurnoTeorico: number
  turnoTeorico: string
  idMateria: number
  materia: string
  tipoExamen: TipoExamen
  fechaExamen: string
  nota: number | null
  notaMinimaAplicada: number
}

export type PendienteTeorico = {
  idTurnoTeorico: number
  nombre: string
  tipoExamen: TipoExamen
  idMateria: number
  materia: string
  fechaExamen: string
  horaInicio: string
  horaFin: string
}

export type EstadoTeorico = {
  codAlumno: string
  alumno: string
  bloqueadoPorSubsanacion: boolean
  motivo: string | null
  desaprobados: DesaprobadoTeorico[]
  pendientes: PendienteTeorico[]
}

export type RespuestaDeExamen = { idPregunta: number; respuesta: string }

export const MENSAJE_EXAMEN_ENTREGADO = 'Examen entregado con éxito.'

const tiposExamen = z.enum(TIPOS_EXAMEN.map((tipo) => tipo.valor))
const estadosTurno = z.enum(ESTADOS_TURNO)
const tiposPregunta = z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor))

const esquemaPendiente = z.object({
  idTurnoTeorico: z.number(),
  nombre: z.string(),
  idMateria: z.number(),
  materia: z.string(),
  notaMinimaAplicada: z.number(),
  tipoExamen: tiposExamen,
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  estado: estadosTurno,
  cantPreguntas: z.number(),
  idCuestionario: z.number().nullish(),
  estadoRendicion: z.enum(['NO_RINDIO', 'EN_CURSO', 'ENTREGADO']),
})

const esquemaEnCurso = z.object({
  id: z.number(),
  idTurnoTeorico: z.number(),
  turnoTeorico: z.string(),
  materia: z.object({ id: z.number(), nombre: z.string(), notaMinima: z.number() }),
  tipoExamen: tiposExamen,
  notaMinimaAplicada: z.number(),
  codAlumno: z.string(),
  estado: z.enum(['EN_CURSO', 'ENTREGADO']),
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  puntajeTotal: z.number(),
  preguntas: z.array(
    z.object({
      idPregunta: z.number(),
      orden: z.number(),
      enunciado: z.string(),
      tipoPregunta: tiposPregunta,
      puntajeMaximo: z.number(),
      alternativas: z.array(z.object({ id: z.number(), respuesta: z.string() })),
      respuestaAlumno: z.string().nullish(),
    }),
  ),
})

const esquemaResuelto = z.object({
  id: z.number(),
  turnoTeorico: z.object({ id: z.number(), nombre: z.string(), estado: estadosTurno }),
  materia: z.object({ id: z.number(), nombre: z.string(), notaMinima: z.number() }),
  tipoExamen: tiposExamen,
  notaMinimaAplicada: z.number(),
  codAlumno: z.string(),
  alumno: z.string(),
  estado: z.enum(['EN_CURSO', 'ENTREGADO']),
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  fechaEntrega: z.string().nullish(),
  horaEntrega: z.string().nullish(),
  puntajeTotal: z.number(),
  nota: z.union([z.number(), z.string()]).nullish(),
  aprobado: z.boolean().nullish(),
  calificaciones: z.array(
    z.object({
      idPregunta: z.number(),
      orden: z.number(),
      enunciado: z.string(),
      tipoPregunta: tiposPregunta,
      respuestaAlumno: z.string().nullish(),
      respuestaCorrecta: z.string(),
      explicacion: z.string().nullish(),
      correcto: z.boolean(),
      puntajeMaximo: z.number(),
      puntajeObtenido: z.number(),
    }),
  ),
})

const esquemaEstadoTeorico = z.object({
  codAlumno: z.string(),
  alumno: z.string(),
  bloqueadoPorSubsanacion: z.boolean(),
  motivo: z.string().nullish(),
  desaprobados: z.array(
    z.object({
      idCuestionario: z.number(),
      idTurnoTeorico: z.number(),
      turnoTeorico: z.string(),
      idMateria: z.number(),
      materia: z.string(),
      tipoExamen: tiposExamen,
      fechaExamen: z.string(),
      nota: z.union([z.number(), z.string()]).nullish(),
      notaMinimaAplicada: z.number(),
    }),
  ),
  pendientes: z.array(
    z.object({
      idTurnoTeorico: z.number(),
      nombre: z.string(),
      tipoExamen: tiposExamen,
      idMateria: z.number(),
      materia: z.string(),
      fechaExamen: z.string(),
      horaInicio: z.string(),
      horaFin: z.string(),
    }),
  ),
})

function aEnCurso(crudo: unknown): ExamenEnCurso {
  const examen = esquemaEnCurso.parse(crudo)
  return {
    ...examen,
    preguntas: [...examen.preguntas]
      .sort((a, b) => a.orden - b.orden)
      .map((pregunta) => ({ ...pregunta, respuestaAlumno: pregunta.respuestaAlumno ?? null })),
  }
}

function aResuelto(crudo: unknown): ExamenResuelto {
  const examen = esquemaResuelto.parse(crudo)
  return {
    ...examen,
    fechaEntrega: examen.fechaEntrega ?? null,
    horaEntrega: examen.horaEntrega ?? null,
    nota: aNota(examen.nota),
    aprobado: examen.aprobado ?? null,
    calificaciones: [...examen.calificaciones]
      .sort((a, b) => a.orden - b.orden)
      .map((fila) => ({
        ...fila,
        respuestaAlumno: fila.respuestaAlumno ?? null,
        explicacion: fila.explicacion ?? null,
      })),
  }
}

function aEstadoTeorico(crudo: unknown): EstadoTeorico {
  const estado = esquemaEstadoTeorico.parse(crudo)
  return {
    ...estado,
    motivo: estado.motivo ?? null,
    desaprobados: estado.desaprobados.map((fila) => ({ ...fila, nota: aNota(fila.nota) })),
  }
}

export const clavesExamenes = {
  todo: ['examenes'] as const,
  pendientes: (codAlumno: string) => [...clavesExamenes.todo, 'pendientes', codAlumno] as const,
  examen: (idTurnoTeorico: number, codAlumno: string) =>
    [...clavesExamenes.todo, 'turno', idTurnoTeorico, codAlumno] as const,
  estadoTeorico: (codAlumno: string) => [...clavesExamenes.todo, 'estado-teorico', codAlumno] as const,
}

export async function listarExamenesPendientes(codAlumno: string): Promise<ExamenPendiente[]> {
  const pendientes = await sigeda.lista<unknown>('/api/examenes/pendientes', { codAlumno })
  return pendientes.map((pendiente) => {
    const leido = esquemaPendiente.parse(pendiente)
    return { ...leido, idCuestionario: leido.idCuestionario ?? null }
  })
}

export async function iniciarExamen(idTurnoTeorico: number, codAlumno: string): Promise<ExamenEnCurso> {
  return aEnCurso(
    await sigeda.post<unknown>(`/api/turnos-teoricos/${encodeURIComponent(idTurnoTeorico)}/iniciar`, { codAlumno }),
  )
}

export async function guardarRespuestas(
  idCuestionario: number,
  codAlumno: string,
  respuestas: RespuestaDeExamen[],
): Promise<void> {
  await sigeda.put<unknown>(`/api/cuestionarios/${encodeURIComponent(idCuestionario)}/respuestas`, {
    codAlumno,
    respuestas,
  })
}

export async function entregarExamen(idCuestionario: number, codAlumno: string): Promise<ExamenResuelto> {
  const respuesta = await sigeda.post<unknown>(`/api/cuestionarios/${encodeURIComponent(idCuestionario)}/entregar`, {
    codAlumno,
  })
  const cuerpo = respuesta as { cuestionario?: unknown }
  return aResuelto(cuerpo.cuestionario ?? respuesta)
}

export async function obtenerMiExamen(idTurnoTeorico: number, codAlumno: string): Promise<ExamenResuelto> {
  return aResuelto(
    await sigeda.get<unknown>(`/api/turnos-teoricos/${encodeURIComponent(idTurnoTeorico)}/mi-cuestionario`, {
      codAlumno,
    }),
  )
}

export async function obtenerExamen(idCuestionario: number): Promise<ExamenResuelto> {
  return aResuelto(await sigeda.get<unknown>(`/api/cuestionarios/${encodeURIComponent(idCuestionario)}`))
}

export async function obtenerEstadoTeorico(codAlumno: string): Promise<EstadoTeorico> {
  return aEstadoTeorico(await sigeda.get<unknown>(`/api/personas/${encodeURIComponent(codAlumno)}/estado-teorico`))
}

export const consultasExamenes = {
  pendientes: (codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.pendientes(codAlumno),
      queryFn: () => listarExamenesPendientes(codAlumno),
      enabled: codAlumno !== '',
    }),
  miExamen: (idTurnoTeorico: number, codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.examen(idTurnoTeorico, codAlumno),
      queryFn: () => obtenerMiExamen(idTurnoTeorico, codAlumno),
      enabled: codAlumno !== '',
      retry: false,
    }),
  estadoTeorico: (codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.estadoTeorico(codAlumno),
      queryFn: () => obtenerEstadoTeorico(codAlumno),
      enabled: codAlumno !== '',
      retry: false,
    }),
}
```

`codAlumno` is an explicit parameter of every call, and every call site in this plan reads it from the session — `useSesion()?.codPersona` in a screen, `context.sesion.actual()?.codPersona` in a loader — never from `params.id`, which is always a **turno teórico** id (M4-2, M4-14).

- [ ] **Step 4: Land the MSW mock of contract §4**

Create `src/mocks/sigeda/cuestionarios-teoria.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { aFechaIso, momento } from '@/lib/dominio/calendario'
import { API, autorizar, erroresDeCampo, texto, textoNoEncontrado, textoProhibido } from './comun'
import {
  alternativasDePregunta,
  alumnosHabilitados,
  buscarMateria,
  buscarPersona,
  buscarPregunta,
  buscarTurnoTeorico,
  cuestionarioDe,
  datos,
  nombreCompleto,
  preguntasDelTurno,
  siguienteId,
} from './datos'
import { minimoAplicado, type CuestionarioMock, type TurnoTeoricoMock } from './semilla-teoria'
import { calificar, cerrarExamenesVencidos, estadoDelTurno, D6_TURNO_NO_EXISTE } from './turnos-teoricos'

export const D8_EXAMEN_NO_DISPONIBLE = 'El examen no está disponible en este momento.'
export const D9_ALUMNO_NO_HABILITADO = 'El alumno no está habilitado para este examen.'
export const D10_EXAMEN_ENTREGADO = 'El examen ya fue entregado.'
export const D11_VENTANA_CERRADA = 'La ventana del examen cerró.'
export const D12_EXAMEN_NO_EXISTE = 'Examen especificada no existe.'
export const D15_SOLO_LO_PROPIO = 'Solo puede consultar sus propios exámenes.'
export const D17_SIN_PENDIENTES = 'No existen exámenes pendientes.'
export const D23_EXAMEN_ENTREGADO_CON_EXITO = 'Examen entregado con éxito.'
export const D25_RESPUESTAS_GUARDADAS = 'Respuestas guardadas.'
export const D27_PERSONA_NO_EXISTE = 'Persona especificada no existe.'

type CuerpoAlumno = { codAlumno?: unknown }

type CuerpoRespuestas = CuerpoAlumno & { respuestas?: unknown }

type RespuestaEnviada = { idPregunta?: unknown; respuesta?: unknown }

function puntajeTotal(turno: TurnoTeoricoMock): number {
  return preguntasDelTurno(turno.id).reduce((total, fila) => total + fila.puntajeMaximo, 0)
}

function enCursoPublico(cuestionario: CuestionarioMock, turno: TurnoTeoricoMock) {
  const materia = buscarMateria(turno.idMateria)
  return {
    id: cuestionario.id,
    idTurnoTeorico: turno.id,
    turnoTeorico: turno.nombre,
    materia: { id: turno.idMateria, nombre: materia?.nombre ?? '', notaMinima: materia?.notaMinima ?? 0 },
    tipoExamen: turno.tipoExamen,
    notaMinimaAplicada: minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen),
    codAlumno: cuestionario.codAlumno,
    estado: cuestionario.estado,
    fechaExamen: turno.fechaExamen,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    puntajeTotal: puntajeTotal(turno),
    preguntas: cuestionario.orden.map((idPregunta, indice) => {
      const pregunta = buscarPregunta(idPregunta)
      const fila = preguntasDelTurno(turno.id).find((candidata) => candidata.idPregunta === idPregunta)
      return {
        idPregunta,
        orden: fila?.orden ?? indice + 1,
        enunciado: pregunta?.enunciado ?? '',
        tipoPregunta: pregunta?.tipoPregunta ?? 'OPCION_MULTIPLE',
        puntajeMaximo: fila?.puntajeMaximo ?? 0,
        alternativas:
          pregunta?.tipoPregunta === 'COMPLETAR'
            ? []
            : alternativasDePregunta(idPregunta).map((alternativa) => ({
                id: alternativa.id,
                respuesta: alternativa.respuesta,
              })),
        respuestaAlumno: cuestionario.respuestas[idPregunta] ?? null,
      }
    }),
  }
}

export function resueltoPublico(cuestionario: CuestionarioMock, conDetalle: boolean) {
  const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
  const materia = turno ? buscarMateria(turno.idMateria) : undefined
  const alumno = buscarPersona(cuestionario.codAlumno)
  return {
    id: cuestionario.id,
    turnoTeorico: {
      id: turno?.id ?? 0,
      nombre: turno?.nombre ?? '',
      estado: turno ? estadoDelTurno(turno) : 'FINALIZADO',
    },
    materia: { id: turno?.idMateria ?? 0, nombre: materia?.nombre ?? '', notaMinima: materia?.notaMinima ?? 0 },
    tipoExamen: turno?.tipoExamen ?? 'TEST',
    notaMinimaAplicada: cuestionario.notaMinimaAplicada,
    codAlumno: cuestionario.codAlumno,
    alumno: alumno ? nombreCompleto(alumno) : '',
    estado: cuestionario.estado,
    fechaExamen: turno?.fechaExamen ?? '',
    horaInicio: turno?.horaInicio ?? '',
    horaFin: turno?.horaFin ?? '',
    fechaEntrega: cuestionario.fechaEntrega,
    horaEntrega: cuestionario.horaEntrega,
    puntajeTotal: turno ? puntajeTotal(turno) : 0,
    nota: cuestionario.nota,
    aprobado: cuestionario.aprobado,
    calificaciones: conDetalle
      ? cuestionario.calificaciones.map((fila) => ({
          ...fila,
          explicacion: buscarPregunta(fila.idPregunta)?.explicacion ?? null,
          tipoPregunta: buscarPregunta(fila.idPregunta)?.tipoPregunta ?? 'OPCION_MULTIPLE',
        }))
      : [],
  }
}

function ventanaCerrada(turno: TurnoTeoricoMock): boolean {
  return new Date() > momento(turno.fechaExamen, turno.horaFin)
}

function horaActual(): string {
  const ahora = new Date()
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
}

function pendientesDe(codAlumno: string) {
  return datos()
    .turnosTeoricos.filter((turno) => alumnosHabilitados(turno).some((alumno) => alumno.codigo === codAlumno))
    .filter((turno) => estadoDelTurno(turno) !== 'FINALIZADO')
    .filter((turno) => cuestionarioDe(turno.id, codAlumno)?.estado !== 'ENTREGADO')
    .sort((a, b) => a.fechaExamen.localeCompare(b.fechaExamen) || a.horaInicio.localeCompare(b.horaInicio))
    .map((turno) => {
      const materia = buscarMateria(turno.idMateria)
      const cuestionario = cuestionarioDe(turno.id, codAlumno)
      return {
        idTurnoTeorico: turno.id,
        nombre: turno.nombre,
        idMateria: turno.idMateria,
        materia: materia?.nombre ?? '',
        notaMinimaAplicada: minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen),
        tipoExamen: turno.tipoExamen,
        fechaExamen: turno.fechaExamen,
        horaInicio: turno.horaInicio,
        horaFin: turno.horaFin,
        estado: estadoDelTurno(turno),
        cantPreguntas: preguntasDelTurno(turno.id).length,
        idCuestionario: cuestionario?.id ?? null,
        estadoRendicion: cuestionario?.estado ?? 'NO_RINDIO',
      }
    })
}

export const handlersCuestionariosTeoria = [
  http.get(`${API}/api/examenes/pendientes`, ({ request }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const codAlumno = new URL(request.url).searchParams.get('codAlumno') ?? ''
    if (!buscarPersona(codAlumno)) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    cerrarExamenesVencidos()
    const pendientes = pendientesDe(codAlumno)
    if (pendientes.length === 0) return textoNoEncontrado(D17_SIN_PENDIENTES)
    return HttpResponse.json(pendientes)
  }),
  http.post(`${API}/api/turnos-teoricos/:id/iniciar`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    const cuerpo = (await request.json()) as CuerpoAlumno
    const codAlumno = texto(cuerpo.codAlumno)
    if (codAlumno === '') return erroresDeCampo(["'codAlumno': El código del alumno es obligatorio."])
    if (!buscarPersona(codAlumno)) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    if (!alumnosHabilitados(turno).some((alumno) => alumno.codigo === codAlumno)) {
      return textoProhibido(D9_ALUMNO_NO_HABILITADO)
    }
    const existente = cuestionarioDe(turno.id, codAlumno)
    if (existente?.estado === 'ENTREGADO') return HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 })
    if (estadoDelTurno(turno) !== 'EN_CURSO') return HttpResponse.text(D8_EXAMEN_NO_DISPONIBLE, { status: 409 })
    if (existente) return HttpResponse.json(enCursoPublico(existente, turno))
    const materia = buscarMateria(turno.idMateria)
    const cuestionario: CuestionarioMock = {
      id: siguienteId('cuestionario'),
      idTurnoTeorico: turno.id,
      codAlumno,
      estado: 'EN_CURSO',
      fechaEntrega: null,
      horaEntrega: null,
      nota: null,
      notaMinimaAplicada: minimoAplicado(materia?.notaMinima ?? 0, turno.tipoExamen),
      aprobado: null,
      orden: preguntasDelTurno(turno.id).map((fila) => fila.idPregunta),
      respuestas: {},
      calificaciones: [],
    }
    datos().cuestionarios.push(cuestionario)
    return HttpResponse.json(enCursoPublico(cuestionario, turno), { status: 201 })
  }),
  http.get(`${API}/api/turnos-teoricos/:id/mi-cuestionario`, ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const turno = buscarTurnoTeorico(Number(params.id))
    if (!turno) return textoNoEncontrado(D6_TURNO_NO_EXISTE)
    const codAlumno = new URL(request.url).searchParams.get('codAlumno') ?? ''
    if (permitido.codPersona !== codAlumno) return textoProhibido(D15_SOLO_LO_PROPIO)
    cerrarExamenesVencidos(turno.id)
    const cuestionario = cuestionarioDe(turno.id, codAlumno)
    if (!cuestionario) return textoNoEncontrado(D12_EXAMEN_NO_EXISTE)
    return HttpResponse.json(resueltoPublico(cuestionario, estadoDelTurno(turno) === 'FINALIZADO'))
  }),
  http.put(`${API}/api/cuestionarios/:id/respuestas`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const cuestionario = datos().cuestionarios.find((candidato) => candidato.id === Number(params.id))
    if (!cuestionario) return textoNoEncontrado(D12_EXAMEN_NO_EXISTE)
    const cuerpo = (await request.json()) as CuerpoRespuestas
    const codAlumno = texto(cuerpo.codAlumno)
    const errores: string[] = []
    if (codAlumno === '') errores.push("'codAlumno': El código del alumno es obligatorio.")
    if (!Array.isArray(cuerpo.respuestas)) errores.push("'respuestas': Las respuestas son obligatorias.")
    if (errores.length > 0) return erroresDeCampo(errores)
    if (cuestionario.codAlumno !== codAlumno) return textoProhibido(D15_SOLO_LO_PROPIO)
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    if (turno && ventanaCerrada(turno)) {
      cerrarExamenesVencidos(turno.id)
      return HttpResponse.text(D11_VENTANA_CERRADA, { status: 409 })
    }
    if (cuestionario.estado === 'ENTREGADO') return HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 })
    const enviadas = cuerpo.respuestas as RespuestaEnviada[]
    const problemas: string[] = []
    const vistas = new Set<number>()
    enviadas.forEach((fila, indice) => {
      const idPregunta = Number(fila.idPregunta)
      if (!cuestionario.orden.includes(idPregunta) || vistas.has(idPregunta)) {
        problemas.push(`'respuestas[${indice}].idPregunta': La pregunta no pertenece a este examen.`)
        return
      }
      vistas.add(idPregunta)
      const valor = texto(fila.respuesta)
      if (valor === '') return
      const pregunta = buscarPregunta(idPregunta)
      if (pregunta?.tipoPregunta === 'COMPLETAR') {
        if (valor.length > 200) {
          problemas.push(`'respuestas[${indice}].respuesta': La respuesta no puede superar los 200 caracteres.`)
        }
        return
      }
      if (!alternativasDePregunta(idPregunta).some((alternativa) => String(alternativa.id) === valor)) {
        problemas.push(`'respuestas[${indice}].respuesta': La alternativa no pertenece a esta pregunta.`)
      }
    })
    if (problemas.length > 0) return erroresDeCampo(problemas)
    cuestionario.respuestas = {}
    for (const fila of enviadas) {
      const valor = texto(fila.respuesta)
      if (valor !== '') cuestionario.respuestas[Number(fila.idPregunta)] = valor
    }
    return HttpResponse.json({ mensaje: D25_RESPUESTAS_GUARDADAS, respuestasGuardadas: vistas.size })
  }),
  http.post(`${API}/api/cuestionarios/:id/entregar`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    if (permitido instanceof Response) return permitido
    const cuestionario = datos().cuestionarios.find((candidato) => candidato.id === Number(params.id))
    if (!cuestionario) return textoNoEncontrado(D12_EXAMEN_NO_EXISTE)
    const cuerpo = (await request.json()) as CuerpoAlumno
    const codAlumno = texto(cuerpo.codAlumno)
    if (codAlumno === '') return erroresDeCampo(["'codAlumno': El código del alumno es obligatorio."])
    if (cuestionario.codAlumno !== codAlumno) return textoProhibido(D15_SOLO_LO_PROPIO)
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    if (turno && ventanaCerrada(turno)) {
      cerrarExamenesVencidos(turno.id)
      return HttpResponse.text(D11_VENTANA_CERRADA, { status: 409 })
    }
    if (cuestionario.estado === 'ENTREGADO') return HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 })
    calificar(cuestionario, aFechaIso(new Date()), horaActual())
    return HttpResponse.json({
      mensaje: D23_EXAMEN_ENTREGADO_CON_EXITO,
      cuestionario: resueltoPublico(cuestionario, turno !== undefined && estadoDelTurno(turno) === 'FINALIZADO'),
    })
  }),
  http.get(`${API}/api/cuestionarios/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Take Exams')
    const conManageExams = !(autorizar(request, 'Manage Exams') instanceof Response)
    if (permitido instanceof Response && !conManageExams) return permitido
    const cuestionario = datos().cuestionarios.find((candidato) => candidato.id === Number(params.id))
    if (!cuestionario) return textoNoEncontrado(D12_EXAMEN_NO_EXISTE)
    const propio = !(permitido instanceof Response) && permitido.codPersona === cuestionario.codAlumno
    if (!propio && !conManageExams) return textoProhibido(D15_SOLO_LO_PROPIO)
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    cerrarExamenesVencidos(cuestionario.idTurnoTeorico)
    const finalizado = turno !== undefined && estadoDelTurno(turno) === 'FINALIZADO'
    return HttpResponse.json(resueltoPublico(cuestionario, conManageExams || finalizado))
  }),
]
```

Two orderings matter and both come from the contract: `entregar` and `respuestas` check the closed window **before** the `ENTREGADO` state, so a closed exam answers D11 (which §4.7 has already graded) rather than D10; and `resueltoPublico(cuestionario, conDetalle)` sends `calificaciones: []` unless the turno is `FINALIZADO` or the caller holds `Manage Exams`.

- [ ] **Step 5: Land the MSW mock of contract §5**

Create `src/mocks/sigeda/estado-teorico.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, textoNoEncontrado, textoProhibido } from './comun'
import {
  alumnosHabilitados,
  buscarMateria,
  buscarPersona,
  buscarTurnoTeorico,
  datos,
  desaprobadosSinSubsanar,
  nombreCompleto,
  rolPorId,
  usuarioDePersona,
} from './datos'
import { D15_SOLO_LO_PROPIO, D27_PERSONA_NO_EXISTE } from './cuestionarios-teoria'
import { estadoDelTurno } from './turnos-teoricos'

export function motivoDeBloqueo(codAlumno: string): string | null {
  const desaprobado = desaprobadosSinSubsanar(codAlumno)[0]
  if (!desaprobado) return null
  const turno = buscarTurnoTeorico(desaprobado.idTurnoTeorico)
  return `Desaprobó ${turno?.nombre ?? ''} (${(desaprobado.nota ?? 0).toFixed(2)} / mínimo ${desaprobado.notaMinimaAplicada}). Subsanación pendiente.`
}

export const handlersEstadoTeorico = [
  http.get(`${API}/api/personas/:cod/estado-teorico`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const cod = String(params.cod)
    const persona = buscarPersona(cod)
    if (!persona) return textoNoEncontrado(D27_PERSONA_NO_EXISTE)
    const esAlumno = rolPorId(usuarioDePersona(permitido.codPersona)?.idRol ?? null)?.nombre === 'Alumno'
    if (esAlumno && permitido.codPersona !== cod) return textoProhibido(D15_SOLO_LO_PROPIO)
    const desaprobados = desaprobadosSinSubsanar(cod)
    return HttpResponse.json({
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
    })
  }),
]
```

- [ ] **Step 6: Register the handlers**

In `src/mocks/handlers.ts`, replace:

```ts
import { handlersCuentas } from './sigeda/cuentas'
```

with:

```ts
import { handlersCuentas } from './sigeda/cuentas'
import { handlersCuestionariosTeoria } from './sigeda/cuestionarios-teoria'
import { handlersEstadoTeorico } from './sigeda/estado-teorico'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersTurnosTeoricos,
```

with:

```ts
  ...handlersTurnosTeoricos,
  ...handlersCuestionariosTeoria,
  ...handlersEstadoTeorico,
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/sigeda/cuestionarios-teoria.test.ts
```

Expected: PASS, 18 tests.

- [ ] **Step 8: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **681 tests**.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the examenes api layer with the cuestionarios and estado teorico mocks"
```

---

### Task 5: The nine screens in the registry, their routes, the dependency gates and the E1 notice (M4-13, M4-14, M4-17) (CA-BAN-14, CA-TUT-14, CA-EXA-13, CA-RES-09)

**Files:**

- Modify: `src/lib/auth/pantallas.ts`
- Modify: `src/lib/auth/pantallas.test.ts`
- Modify: `src/lib/dependencias.ts`
- Modify: `src/lib/dependencias.test.ts`
- Create: `src/components/aviso-de-teoria.tsx`
- Create: `src/features/preguntas/schemas.ts`
- Create: `src/features/turnos-teoricos/schemas.ts`
- Create: `src/features/turnos-teoricos/cargar.ts`
- Create: `src/features/examenes/cargar.ts`
- Create: the nine skeleton pages listed below
- Create: the nine route files listed below
- Modify: `src/features/materias/materias-page.tsx`
- Test: `src/lib/auth/rutas-m4.test.tsx`
- Regenerated: `src/routeTree.gen.ts`

**Interfaces:**
- Consumes: `exigirPantalla`, `PANTALLAS`, `accionDisponible`, `MENSAJE_DEPENDENCIA_PENDIENTE`, `esquemaPaginacion` / `fechaOpcional` / `numeroOpcional` from `lib/busqueda`, the Task 3 and Task 4 query factories.
- Produces:
  - Nine entries in `PANTALLAS` in the `Teoría` group, three of them `roles: SOLO_ALUMNO`, with the breadcrumb parents of §16.3 and `enMenu` on the three list screens.
  - Six keys in `DEPENDENCIAS`: `gestionarMaterias: [5]` (gap 9), `gestionarPreguntas`, `importarPreguntas`, `programarTurnoTeorico`, `rendirExamen` (all `[6]`) and `bloqueoSubsanacion: [7]`.
  - `AvisoDeTeoria({ accion })`: E1 whenever that action still waits on its dependency.
  - `esquemaBusquedaPreguntas` and `esquemaBusquedaTurnosTeoricos`, the two URL search schemas of §16.3.
  - `cargarTurnoTeorico(queryClient, idTexto)`: primes the detail, `notFound()` on a 404, and lets any other error reach the screen's own Reintentar.
  - `cargarExamenPropio(queryClient, actual, idTexto)`: the ownership check of CA-RES-09 — the alumno must have that turno among their pendientes or an examen of their own, otherwise `notFound()`.
  - Nine skeleton pages that Tasks 6–17 fill, each already showing its header and its E1 notice.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth/rutas-m4.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { TEXTO_TEORIA_SOLO_MOCK } from '@/lib/dominio/teoria'
import { iniciarComo, renderApp } from '@/test/render'

describe('rutas de teoría', () => {
  it('CA-BAN-14 CA-TUT-14 el instructor abre las cuatro pantallas de gestión', async () => {
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/banco')
    expect(await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })).toBeInTheDocument()
    await router.navigate({ to: '/banco/importar' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Importar desde IA' })).toBeInTheDocument()
    await router.navigate({ to: '/teoria/turnos' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Turnos teóricos' })).toBeInTheDocument()
    await router.navigate({ to: '/teoria/turnos/nuevo' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Registrar turno teórico' })).toBeInTheDocument()
  })

  it('M4-14 el instructor ve el grupo Teoría en el menú', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })
    expect(screen.getByText('Teoría')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Banco de preguntas' }).map((enlace) => enlace.getAttribute('href'))).toContain(
      '/banco',
    )
    expect(screen.getByRole('link', { name: 'Turnos teóricos' })).toHaveAttribute('href', '/teoria/turnos')
    expect(screen.queryByRole('link', { name: 'Mis exámenes' })).not.toBeInTheDocument()
  })

  it('M4-13 Importar desde IA cuelga del banco en las migas', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/banco/importar')
    await screen.findByRole('heading', { level: 1, name: 'Importar desde IA' })
    const migas = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(migas.getByRole('link', { name: 'Banco de preguntas' })).toHaveAttribute('href', '/banco')
    expect(migas.getByText('Importar desde IA')).toBeInTheDocument()
  })

  it('M4-14 el alumno abre Mis exámenes y no alcanza el banco', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/examenes')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis exámenes' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Mis exámenes' }).map((enlace) => enlace.getAttribute('href'))).toContain(
      '/examenes',
    )
    await router.navigate({ to: '/banco' })
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M4-14 el Comandante de Escuadrón no alcanza los turnos teóricos', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/teoria/turnos')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('M4-14 el Administrador Web tiene Take Exams pero no las pantallas del alumno', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/examenes')
    expect(await screen.findByText(MENSAJE_SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-BAN-14 CA-TUT-14 en modo mock no se muestra E1', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })
    expect(screen.queryByText(TEXTO_TEORIA_SOLO_MOCK)).not.toBeInTheDocument()
  })

  it('CA-BAN-14 CA-TUT-14 fuera del modo mock y sin la dependencia 6 cada pantalla muestra E1', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/banco')
    await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    await router.navigate({ to: '/banco/importar' })
    await screen.findByRole('heading', { level: 1, name: 'Importar desde IA' })
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    await router.navigate({ to: '/teoria/turnos' })
    await screen.findByRole('heading', { level: 1, name: 'Turnos teóricos' })
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
  })

  it('CA-EXA-13 el alumno también ve E1 sin la dependencia 6', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('alumno.lopez')
    renderApp('/examenes')
    await screen.findByRole('heading', { level: 1, name: 'Mis exámenes' })
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
  })

  it('CA-BAN-14 con la dependencia 6 resuelta E1 desaparece', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '6')
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    await screen.findByRole('heading', { level: 1, name: 'Banco de preguntas' })
    expect(screen.queryByText(TEXTO_TEORIA_SOLO_MOCK)).not.toBeInTheDocument()
  })
})
```

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
    expect(titulosDelMenu('Alumno')).toEqual([
      'Inicio',
      'Mis turnos',
      'Mis evaluaciones',
      'Documentos',
      'Cuestionario de práctica',
      'Consultas',
    ])
```

with:

```ts
    expect(titulosDelMenu('Alumno')).toEqual([
      'Inicio',
      'Mis turnos',
      'Mis evaluaciones',
      'Mis exámenes',
      'Documentos',
      'Cuestionario de práctica',
      'Consultas',
    ])
```

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
      'Evaluaciones',
      'Documentos',
      'Cuestionario de práctica',
      'Consultas',
    ])
    expect(titulosDelMenu('Jefe de Operaciones')).toContain('Programación de turnos')
```

with:

```ts
      'Evaluaciones',
      'Banco de preguntas',
      'Turnos teóricos',
      'Documentos',
      'Cuestionario de práctica',
      'Consultas',
    ])
    expect(titulosDelMenu('Jefe de Operaciones')).toContain('Programación de turnos')
```

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
    expect(secciones.map((seccion) => seccion.grupo)).toEqual([
      'General',
      'Matrícula',
      'Programa',
      'Operaciones de vuelo',
      'Evaluaciones',
      'Aprendizaje',
    ])
```

with:

```ts
    expect(secciones.map((seccion) => seccion.grupo)).toEqual([
      'General',
      'Matrícula',
      'Programa',
      'Operaciones de vuelo',
      'Evaluaciones',
      'Teoría',
      'Aprendizaje',
    ])
```

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
  it('no agrega migas en Inicio ni en rutas desconocidas', () => {
```

with:

```ts
  it('M4-13 arma las migas de las pantallas de teoría', () => {
    expect(migasPara('/banco/importar', perfilDe('Instructor'), false)).toEqual([
      PANTALLAS.banco,
      PANTALLAS.importarPreguntas,
    ])
    expect(migasPara('/teoria/turnos/$id/editar', perfilDe('Instructor'), false)).toEqual([
      PANTALLAS.turnosTeoricos,
      PANTALLAS.resultadosTurnoTeorico,
      PANTALLAS.modificarTurnoTeorico,
    ])
    expect(migasPara('/examenes/$id/resultado', perfilDe('Alumno'), false)).toEqual([
      PANTALLAS.misExamenes,
      PANTALLAS.resultadoExamen,
    ])
  })

  it('M4-14 el Comandante de Escuadrón no ve las pantallas de teoría de M4', () => {
    expect(titulosDelMenu('Comandante de Escuadrón')).not.toContain('Turnos teóricos')
    expect(titulosDelMenu('Comandante de Escuadrón')).not.toContain('Banco de preguntas')
    expect(titulosDelMenu('Administrador Web')).not.toContain('Mis exámenes')
  })

  it('no agrega migas en Inicio ni en rutas desconocidas', () => {
```

In `src/lib/dependencias.test.ts`, replace:

```ts
  it('CA-DOC-10 subir y eliminar documentos esperan la dependencia 39', () => {
```

with:

```ts
  it('CA-BAN-14 CA-TUT-14 M4-17 las acciones de teoría esperan las dependencias 5, 6 y 7', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '22,30,32,33,37,39')
    expect(accionDisponible('gestionarMaterias')).toBe(false)
    expect(accionDisponible('gestionarPreguntas')).toBe(false)
    expect(accionDisponible('importarPreguntas')).toBe(false)
    expect(accionDisponible('programarTurnoTeorico')).toBe(false)
    expect(accionDisponible('rendirExamen')).toBe(false)
    expect(accionDisponible('bloqueoSubsanacion')).toBe(false)
    expect(dependenciasPendientes('gestionarMaterias')).toEqual([5])
    expect(dependenciasPendientes('gestionarPreguntas')).toEqual([6])
    expect(dependenciasPendientes('bloqueoSubsanacion')).toEqual([7])
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '5,6,7')
    expect(accionDisponible('gestionarMaterias')).toBe(true)
    expect(accionDisponible('gestionarPreguntas')).toBe(true)
    expect(accionDisponible('importarPreguntas')).toBe(true)
    expect(accionDisponible('programarTurnoTeorico')).toBe(true)
    expect(accionDisponible('rendirExamen')).toBe(true)
    expect(accionDisponible('bloqueoSubsanacion')).toBe(true)
  })

  it('CA-DOC-10 subir y eliminar documentos esperan la dependencia 39', () => {
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth src/lib/dependencias.test.ts
```

Expected: FAIL — `src/lib/auth/rutas-m4.test.tsx` cannot render `/banco` (the route does not exist, so the router falls through to the not-found page), `pantallas.test.ts` reports the three menu expectations missing `Mis exámenes`, `Banco de preguntas`, `Turnos teóricos` and the `Teoría` group, and `dependencias.test.ts` fails to typecheck the six new action names.

- [ ] **Step 3: Register the nine screens**

In `src/lib/auth/pantallas.ts`, replace:

```ts
import {
  BookOpen,
  CalendarClock,
```

with:

```ts
import {
  BookOpen,
  CalendarCheck,
  CalendarClock,
```

In `src/lib/auth/pantallas.ts`, replace:

```ts
  FileText,
  House,
```

with:

```ts
  FileQuestion,
  FileText,
  GraduationCap,
  House,
```

In `src/lib/auth/pantallas.ts`, replace:

```ts
  Route,
  Ruler,
```

with:

```ts
  Route,
  Ruler,
  Sparkles,
  Timer,
```

In `src/lib/auth/pantallas.ts`, insert the nine screens immediately **before** the `documentos` entry, so the `Teoría` group also comes before `Aprendizaje` in declaration order:

```ts
  banco: {
    ruta: '/banco',
    titulo: 'Banco de preguntas',
    descripcion: 'Preguntas del curso en tierra con su materia, tipo y dificultad.',
    grupo: 'Teoría',
    icono: FileQuestion,
    permiso: 'Manage Questions',
    enMenu: true,
  },
  importarPreguntas: {
    ruta: '/banco/importar',
    titulo: 'Importar desde IA',
    descripcion: 'Revise las preguntas generadas antes de guardarlas en el banco.',
    grupo: 'Teoría',
    icono: Sparkles,
    permiso: 'Manage Questions',
    padre: '/banco',
    enMenu: false,
  },
  turnosTeoricos: {
    ruta: '/teoria/turnos',
    titulo: 'Turnos teóricos',
    descripcion: 'Exámenes teóricos programados por grupo y materia.',
    grupo: 'Teoría',
    icono: CalendarCheck,
    permiso: 'Manage Exams',
    enMenu: true,
  },
  registrarTurnoTeorico: {
    ruta: '/teoria/turnos/nuevo',
    titulo: 'Registrar turno teórico',
    descripcion: 'Programe un examen teórico con sus preguntas y puntajes.',
    grupo: 'Teoría',
    icono: CalendarCheck,
    permiso: 'Manage Exams',
    padre: '/teoria/turnos',
    enMenu: false,
  },
  resultadosTurnoTeorico: {
    ruta: '/teoria/turnos/$id',
    titulo: 'Resultados por turno',
    descripcion: 'Preguntas del examen y resultado de cada alumno habilitado.',
    grupo: 'Teoría',
    icono: ClipboardCheck,
    permiso: 'Manage Exams',
    padre: '/teoria/turnos',
    enMenu: false,
  },
  modificarTurnoTeorico: {
    ruta: '/teoria/turnos/$id/editar',
    titulo: 'Modificar turno teórico',
    descripcion: 'Cambie los datos, las preguntas o los puntajes del examen.',
    grupo: 'Teoría',
    icono: CalendarCheck,
    permiso: 'Manage Exams',
    padre: '/teoria/turnos/$id',
    enMenu: false,
  },
  misExamenes: {
    ruta: '/examenes',
    titulo: 'Mis exámenes',
    descripcion: 'Exámenes teóricos que tiene pendientes de rendir.',
    grupo: 'Teoría',
    icono: GraduationCap,
    permiso: 'Take Exams',
    roles: SOLO_ALUMNO,
    enMenu: true,
  },
  rendirExamen: {
    ruta: '/examenes/$id',
    titulo: 'Rendir examen',
    descripcion: 'Responda las preguntas del examen antes de que cierre la ventana.',
    grupo: 'Teoría',
    icono: Timer,
    permiso: 'Take Exams',
    roles: SOLO_ALUMNO,
    padre: '/examenes',
    enMenu: false,
  },
  resultadoExamen: {
    ruta: '/examenes/$id/resultado',
    titulo: 'Resultado del examen',
    descripcion: 'Su nota, la nota mínima aplicable y el detalle de sus respuestas.',
    grupo: 'Teoría',
    icono: ClipboardCheck,
    permiso: 'Take Exams',
    roles: SOLO_ALUMNO,
    padre: '/examenes',
    enMenu: false,
  },
```

- [ ] **Step 4: Add the six dependency keys (M4-17, gap 9)**

In `src/lib/dependencias.ts`, replace:

```ts
  subirDocumento: [39],
  eliminarDocumento: [39],
} as const
```

with:

```ts
  subirDocumento: [39],
  eliminarDocumento: [39],
  gestionarMaterias: [5],
  gestionarPreguntas: [6],
  importarPreguntas: [6],
  programarTurnoTeorico: [6],
  rendirExamen: [6],
  bloqueoSubsanacion: [7],
} as const
```

Create `src/components/aviso-de-teoria.tsx`:

```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { accionDisponible, type AccionConDependencia } from '@/lib/dependencias'
import { TEXTO_TEORIA_SOLO_MOCK } from '@/lib/dominio/teoria'

export function AvisoDeTeoria({ accion }: { accion: AccionConDependencia }) {
  if (accionDisponible(accion)) return null
  return (
    <Alert>
      <AlertDescription>{TEXTO_TEORIA_SOLO_MOCK}</AlertDescription>
    </Alert>
  )
}
```

- [ ] **Step 5: Land the two URL search schemas and the two route loaders**

Create `src/features/preguntas/schemas.ts`:

```ts
import { z } from 'zod'
import { esquemaPaginacion, numeroOpcional } from '@/lib/busqueda'
import { DIFICULTADES, ORIGENES_PREGUNTA, TIPOS_PREGUNTA } from '@/lib/dominio/teoria'

export const esquemaBusquedaPreguntas = z.object({
  ...esquemaPaginacion,
  idMateria: numeroOpcional,
  dificultad: z
    .enum(DIFICULTADES.map((dificultad) => dificultad.valor))
    .optional()
    .catch(undefined),
  tipo: z
    .enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor))
    .optional()
    .catch(undefined),
  origen: z
    .enum(ORIGENES_PREGUNTA.map((origen) => origen.valor))
    .optional()
    .catch(undefined),
  texto: z.string().trim().min(1).optional().catch(undefined),
})

export type BusquedaPreguntas = z.infer<typeof esquemaBusquedaPreguntas>
```

Create `src/features/turnos-teoricos/schemas.ts`:

```ts
import { z } from 'zod'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { ESTADOS_TURNO, TIPOS_EXAMEN } from '@/lib/dominio/teoria'

export const esquemaBusquedaTurnosTeoricos = z.object({
  ...esquemaPaginacion,
  idGrupo: numeroOpcional,
  idMateria: numeroOpcional,
  estado: z.enum(ESTADOS_TURNO).optional().catch(undefined),
  tipoExamen: z
    .enum(TIPOS_EXAMEN.map((tipo) => tipo.valor))
    .optional()
    .catch(undefined),
  fechaPre: fechaOpcional,
  fechaPost: fechaOpcional,
})

export type BusquedaTurnosTeoricos = z.infer<typeof esquemaBusquedaTurnosTeoricos>
```

Create `src/features/turnos-teoricos/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasTurnosTeoricos, type TurnoTeoricoDetalle } from './api'

export async function cargarTurnoTeorico(queryClient: QueryClient, idTexto: string): Promise<TurnoTeoricoDetalle> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  try {
    return await queryClient.ensureQueryData(consultasTurnosTeoricos.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
```

Create `src/features/examenes/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { SinPermisoError } from '@/lib/auth/guardas'
import type { Sesion } from '@/lib/auth/sesion'
import { consultasExamenes } from './api'

export type ContextoDeExamen = { idTurno: number; codAlumno: string }

export async function cargarExamenPropio(
  queryClient: QueryClient,
  actual: Sesion | null,
  idTexto: string,
): Promise<ContextoDeExamen> {
  const idTurno = Number(idTexto)
  if (!Number.isInteger(idTurno) || idTurno <= 0) throw notFound()
  const codAlumno = actual?.codPersona
  if (!codAlumno) throw new SinPermisoError()
  const contexto = { idTurno, codAlumno }
  let pendientes
  try {
    pendientes = await queryClient.ensureQueryData(consultasExamenes.pendientes(codAlumno))
  } catch {
    return contexto
  }
  if (pendientes.some((pendiente) => pendiente.idTurnoTeorico === idTurno)) return contexto
  try {
    await queryClient.ensureQueryData(consultasExamenes.miExamen(idTurno, codAlumno))
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) throw notFound()
  }
  return contexto
}
```

Both loaders are deliberately tolerant of anything that is not a definitive 404 or 403: the screens own their own first-load error with Reintentar (CA-BAN-13, CA-TUT-13, CA-EXA-13, CA-RES-12), and a loader that rethrew a transport error would replace that with the route error page.

- [ ] **Step 6: Land the nine skeleton pages**

Create `src/features/preguntas/banco-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function BancoPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.banco.titulo} descripcion={PANTALLAS.banco.descripcion} />
      <AvisoDeTeoria accion="gestionarPreguntas" />
    </>
  )
}
```

Create `src/features/preguntas/importar-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function ImportarPreguntasPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.importarPreguntas.titulo} descripcion={PANTALLAS.importarPreguntas.descripcion} />
      <AvisoDeTeoria accion="importarPreguntas" />
    </>
  )
}
```

Create `src/features/turnos-teoricos/turnos-teoricos-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function TurnosTeoricosPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.turnosTeoricos.titulo} descripcion={PANTALLAS.turnosTeoricos.descripcion} />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
    </>
  )
}
```

Create `src/features/turnos-teoricos/registrar-turno-teorico-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function RegistrarTurnoTeoricoPage() {
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.registrarTurnoTeorico.titulo}
        descripcion={PANTALLAS.registrarTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
    </>
  )
}
```

Create `src/features/turnos-teoricos/resultados-turno-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function ResultadosTurnoPage({ id }: { id: number }) {
  void id
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.resultadosTurnoTeorico.titulo}
        descripcion={PANTALLAS.resultadosTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
    </>
  )
}
```

Create `src/features/turnos-teoricos/modificar-turno-teorico-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function ModificarTurnoTeoricoPage({ id }: { id: number }) {
  void id
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.modificarTurnoTeorico.titulo}
        descripcion={PANTALLAS.modificarTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
    </>
  )
}
```

Create `src/features/examenes/mis-examenes-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function MisExamenesPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.misExamenes.titulo} descripcion={PANTALLAS.misExamenes.descripcion} />
      <AvisoDeTeoria accion="rendirExamen" />
    </>
  )
}
```

Create `src/features/examenes/rendir-examen-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function RendirExamenPage({ idTurno }: { idTurno: number }) {
  void idTurno
  return (
    <>
      <PageHeader titulo={PANTALLAS.rendirExamen.titulo} descripcion={PANTALLAS.rendirExamen.descripcion} />
      <AvisoDeTeoria accion="rendirExamen" />
    </>
  )
}
```

Create `src/features/examenes/resultado-examen-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'

export function ResultadoExamenPage({ idTurno }: { idTurno: number }) {
  void idTurno
  return (
    <>
      <PageHeader titulo={PANTALLAS.resultadoExamen.titulo} descripcion={PANTALLAS.resultadoExamen.descripcion} />
      <AvisoDeTeoria accion="rendirExamen" />
    </>
  )
}
```

- [ ] **Step 7: Land the nine route files**

Create `src/routes/_app/banco/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { BancoPage } from '@/features/preguntas/banco-page'
import { esquemaBusquedaPreguntas } from '@/features/preguntas/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/banco/')({
  validateSearch: esquemaBusquedaPreguntas,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.banco, context.sesion.actual()),
  component: BancoPage,
})
```

Create `src/routes/_app/banco/importar.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ImportarPreguntasPage } from '@/features/preguntas/importar-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/banco/importar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.importarPreguntas, context.sesion.actual()),
  component: ImportarPreguntasPage,
})
```

Create `src/routes/_app/teoria/turnos/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { esquemaBusquedaTurnosTeoricos } from '@/features/turnos-teoricos/schemas'
import { TurnosTeoricosPage } from '@/features/turnos-teoricos/turnos-teoricos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/teoria/turnos/')({
  validateSearch: esquemaBusquedaTurnosTeoricos,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.turnosTeoricos, context.sesion.actual()),
  component: TurnosTeoricosPage,
})
```

Create `src/routes/_app/teoria/turnos/nuevo.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { RegistrarTurnoTeoricoPage } from '@/features/turnos-teoricos/registrar-turno-teorico-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/teoria/turnos/nuevo')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarTurnoTeorico, context.sesion.actual()),
  component: RegistrarTurnoTeoricoPage,
})
```

Create `src/routes/_app/teoria/turnos/$id/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarTurnoTeorico } from '@/features/turnos-teoricos/cargar'
import { ResultadosTurnoPage } from '@/features/turnos-teoricos/resultados-turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/teoria/turnos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.resultadosTurnoTeorico, context.sesion.actual()),
  loader: ({ context, params }) => cargarTurnoTeorico(context.queryClient, params.id),
  component: RutaResultados,
})

function RutaResultados() {
  const { id } = Route.useParams()
  return <ResultadosTurnoPage id={Number(id)} />
}
```

Create `src/routes/_app/teoria/turnos/$id/editar.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarTurnoTeorico } from '@/features/turnos-teoricos/cargar'
import { ModificarTurnoTeoricoPage } from '@/features/turnos-teoricos/modificar-turno-teorico-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/teoria/turnos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarTurnoTeorico, context.sesion.actual()),
  loader: ({ context, params }) => cargarTurnoTeorico(context.queryClient, params.id),
  component: RutaModificar,
})

function RutaModificar() {
  const { id } = Route.useParams()
  return <ModificarTurnoTeoricoPage id={Number(id)} />
}
```

Create `src/routes/_app/examenes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { MisExamenesPage } from '@/features/examenes/mis-examenes-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/examenes/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misExamenes, context.sesion.actual()),
  component: MisExamenesPage,
})
```

Create `src/routes/_app/examenes/$id/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarExamenPropio } from '@/features/examenes/cargar'
import { RendirExamenPage } from '@/features/examenes/rendir-examen-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/examenes/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.rendirExamen, context.sesion.actual()),
  loader: ({ context, params }) => cargarExamenPropio(context.queryClient, context.sesion.actual(), params.id),
  component: RutaRendir,
})

function RutaRendir() {
  const { id } = Route.useParams()
  return <RendirExamenPage idTurno={Number(id)} />
}
```

Create `src/routes/_app/examenes/$id/resultado.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarExamenPropio } from '@/features/examenes/cargar'
import { ResultadoExamenPage } from '@/features/examenes/resultado-examen-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/examenes/$id/resultado')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.resultadoExamen, context.sesion.actual()),
  loader: ({ context, params }) => cargarExamenPropio(context.queryClient, context.sesion.actual(), params.id),
  component: RutaResultado,
})

function RutaResultado() {
  const { id } = Route.useParams()
  return <ResultadoExamenPage idTurno={Number(id)} />
}
```

- [ ] **Step 8: Regenerate the route tree**

`RutaApp` comes from `src/routeTree.gen.ts`, which `@tanstack/router-plugin` writes during `vite build`; until it runs, `tsc -b` rejects every new `PANTALLAS` route.

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && git diff --stat src/routeTree.gen.ts && pnpm exec tsc -b
```

Expected: the build succeeds, `src/routeTree.gen.ts` gains **189 lines** (the nine routes with their ids and types), and `tsc -b` is silent.

- [ ] **Step 9: Gate the Materias writes on dependency 5 (gap 9)**

In `src/features/materias/materias-page.tsx`, replace:

```tsx
import { usePuede } from '@/lib/auth/use-sesion'
```

with:

```tsx
import { usePuede } from '@/lib/auth/use-sesion'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
```

In `src/features/materias/materias-page.tsx`, replace:

```tsx
  const puedeGestionar = usePuede('Manage Subjects')
```

with:

```tsx
  const puedeGestionar = usePuede('Manage Subjects') && accionDisponible('gestionarMaterias')
  const esperaDependencia = usePuede('Manage Subjects') && !accionDisponible('gestionarMaterias')
```

In `src/features/materias/materias-page.tsx`, replace:

```tsx
        acciones={
          puedeGestionar && (
            <DialogoMateria
              disparador={
                <Button>
                  <Plus aria-hidden />
                  Registrar materia
                </Button>
              }
            />
          )
        }
      />
```

with:

```tsx
        acciones={
          esperaDependencia ? (
            <div className="grid justify-items-end gap-1">
              <Button disabled>
                <Plus aria-hidden />
                Registrar materia
              </Button>
              <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
            </div>
          ) : (
            puedeGestionar && (
              <DialogoMateria
                disparador={
                  <Button>
                    <Plus aria-hidden />
                    Registrar materia
                  </Button>
                }
              />
            )
          )
        }
      />
```

- [ ] **Step 10: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth src/lib/dependencias.test.ts
```

Expected: PASS — `rutas-m4.test.tsx` 10 tests, and the whole `src/lib/auth` plus `dependencias.test.ts` green (`cobertura-de-rutas.test.ts` proves every new route guards its own screen).

- [ ] **Step 11: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **694 tests**.

- [ ] **Step 12: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: register the nine theory screens, their routes and dependency gates"
```

---

### Task 6: Banco de preguntas: the list, its filters and its URL state (CA-BAN-01, CA-BAN-02, CA-BAN-03, CA-BAN-13, CA-BAN-14)

**Files:**

- Create: `src/features/preguntas/columnas.tsx`
- Modify (full rewrite): `src/features/preguntas/banco-page.tsx`
- Test: `src/features/preguntas/banco-page.test.tsx`

**Interfaces:**
- Consumes: `DataTable` + `ayudanteDeColumnas`, `consultasPreguntas.lista`, `consultasMaterias.lista`, `esquemaBusquedaPreguntas`, `AvisoDeError` + `errorDePrimeraCarga`, `EmptyState`, `accionDisponible('importarPreguntas')`.
- Produces: `COLUMNAS_PREGUNTAS` (materia, enunciado, tipo, dificultad, origen, en uso; `id`, `enunciado`, `dificultad` and `materia` sortable, which are exactly the sortable properties of contract §2.1) and a `BancoPage` whose five filters, page and sort live only in the URL.

- [ ] **Step 1: Write the failing tests**

Create `src/features/preguntas/banco-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_SIN_PREGUNTAS, TEXTO_TEORIA_SOLO_MOCK } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirBanco(ruta = '/banco') {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(ruta)
  await screen.findByText(/registro/)
  return resultado
}

function filas() {
  return within(screen.getByRole('table', { name: 'Preguntas del banco' })).getAllByRole('row').slice(1)
}

describe('Banco de preguntas', () => {
  it('CA-BAN-01 muestra materia, enunciado, tipo, dificultad, origen y uso, de 10 en 10', async () => {
    await abrirBanco()
    const tabla = within(screen.getByRole('table', { name: 'Preguntas del banco' }))
    for (const columna of ['Materia', 'Enunciado', 'Tipo', 'Dificultad', 'Origen', 'En uso']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(filas()).toHaveLength(10)
    expect(screen.getByText('Página 1 de 3 · 24 registros')).toBeInTheDocument()
    const primera = within(filas()[0]!)
    expect(primera.getByText('Adoctrinamiento de Vuelo')).toBeInTheDocument()
    expect(primera.getByText('Opción múltiple')).toBeInTheDocument()
    expect(primera.getByText('Media')).toBeInTheDocument()
    expect(primera.getByText('Manual')).toBeInTheDocument()
    expect(primera.getByText('Sí')).toBeInTheDocument()
  })

  it('CA-BAN-01 la página y el orden viajan en la URL y los resuelve el servidor', async () => {
    const { router, usuario } = await abrirBanco()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Página 2 de 3 · 24 registros')
    expect(router.state.location.search).toMatchObject({ page: 1 })
    await usuario.click(screen.getByRole('button', { name: 'Enunciado' }))
    await screen.findByText('Página 1 de 3 · 24 registros')
    expect(router.state.location.search).toMatchObject({ property: 'enunciado', direction: 'ASC', page: 0 })
    expect(within(filas()[0]!).getByText(/¿Cada cuánto se practica/)).toBeInTheDocument()
  })

  it('CA-BAN-02 filtra por materia, dificultad, tipo, origen y texto, y limpia los filtros', async () => {
    const { router, usuario } = await abrirBanco()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await screen.findByText('Página 1 de 1 · 10 registros')
    expect(router.state.location.search).toMatchObject({ idMateria: 3 })
    await usuario.selectOptions(screen.getByLabelText('Dificultad'), 'Media')
    await screen.findByText('Página 1 de 1 · 4 registros')
    await usuario.selectOptions(screen.getByLabelText('Origen'), 'IA')
    await screen.findByText('Página 1 de 1 · 1 registro')
    expect(router.state.location.search).toMatchObject({ idMateria: 3, dificultad: 'MEDIA', origen: 'IA' })
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await screen.findByText('Página 1 de 3 · 24 registros')
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Completar')
    await screen.findByText('Página 1 de 1 · 5 registros')
    await usuario.type(screen.getByLabelText('Enunciado'), 'autorrotación')
    await screen.findByText('Página 1 de 1 · 1 registro')
    expect(router.state.location.search).toMatchObject({ tipo: 'COMPLETAR', texto: 'autorrotación' })
  })

  it('CA-BAN-02 una URL mal escrita vuelve a los valores por defecto', async () => {
    const { router } = await abrirBanco('/banco?page=-3&size=999&dificultad=URGENTE&origen=OTRO&idMateria=cero')
    expect(router.state.location.search).toEqual({ page: 0, size: 10, direction: 'ASC' })
    expect(screen.getByText('Página 1 de 3 · 24 registros')).toBeInTheDocument()
  })

  it('CA-BAN-03 sin preguntas muestra E3 con Importar desde IA', async () => {
    server.use(
      http.get(`${API}/api/preguntas`, () => HttpResponse.text('No existen preguntas disponibles.', { status: 404 })),
    )
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    expect(await screen.findByText(TEXTO_SIN_PREGUNTAS)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Importar desde IA' }).length).toBeGreaterThan(0)
  })

  it('CA-BAN-13 un fallo en la primera carga ofrece Reintentar en lugar de una lista vacía', async () => {
    server.use(http.get(`${API}/api/preguntas`, () => HttpResponse.error()))
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/banco')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_PREGUNTAS)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Preguntas del banco' })).toBeInTheDocument()
  })

  it('CA-BAN-14 fuera del modo mock y sin la dependencia 6 muestra E1 y deshabilita Importar', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirBanco()
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar desde IA' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/banco-page.test.tsx
```

Expected: FAIL — every test times out on `screen.findByText(/registro/)`, because the skeleton page of Task 5 renders only its header and its E1 notice.

- [ ] **Step 3: Land the columns**

Create `src/features/preguntas/columnas.tsx`:

```tsx
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { etiquetaDeDificultad, etiquetaDeOrigen, etiquetaDeTipoPregunta } from '@/lib/dominio/teoria'
import type { PreguntaFila } from './api'

const ayudante = ayudanteDeColumnas<PreguntaFila>()

export const COLUMNAS_PREGUNTAS = ayudante.columns([
  ayudante.accessor('materia', { header: 'Materia', enableSorting: true }),
  ayudante.accessor('enunciado', {
    header: 'Enunciado',
    enableSorting: true,
    cell: (contexto) => <span className="block max-w-xl">{contexto.getValue()}</span>,
  }),
  ayudante.accessor('tipoPregunta', {
    header: 'Tipo',
    cell: (contexto) => etiquetaDeTipoPregunta(contexto.getValue()),
  }),
  ayudante.accessor('dificultad', {
    header: 'Dificultad',
    enableSorting: true,
    cell: (contexto) => etiquetaDeDificultad(contexto.getValue()),
  }),
  ayudante.accessor('origen', { header: 'Origen', cell: (contexto) => etiquetaDeOrigen(contexto.getValue()) }),
  ayudante.accessor('enUso', { header: 'En uso', cell: (contexto) => (contexto.getValue() ? 'Sí' : 'No') }),
])
```

- [ ] **Step 4: Land the list with its filters**

Replace `src/features/preguntas/banco-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasMaterias } from '@/features/materias/api'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { DIFICULTADES, ORIGENES_PREGUNTA, TEXTO_SIN_PREGUNTAS, TIPOS_PREGUNTA } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasPreguntas } from './api'
import { COLUMNAS_PREGUNTAS } from './columnas'
import type { BusquedaPreguntas } from './schemas'

const ruta = getRouteApi('/_app/banco/')

function AccionImportar() {
  if (!accionDisponible('importarPreguntas')) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="outline" disabled>
          <Sparkles aria-hidden />
          Importar desde IA
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }
  return (
    <Button variant="outline" asChild>
      <Link to="/banco/importar">
        <Sparkles aria-hidden />
        Importar desde IA
      </Link>
    </Button>
  )
}

export function BancoPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const materias = useQuery(consultasMaterias.lista())
  const preguntas = useQuery(consultasPreguntas.lista(busqueda))
  const error = errorDePrimeraCarga(preguntas)

  function cambiar(cambios: Partial<BusquedaPreguntas>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const hayFiltros =
    busqueda.idMateria !== undefined ||
    busqueda.dificultad !== undefined ||
    busqueda.tipo !== undefined ||
    busqueda.origen !== undefined ||
    busqueda.texto !== undefined

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.banco.titulo}
        descripcion={PANTALLAS.banco.descripcion}
        acciones={<AccionImportar />}
      />
      <AvisoDeTeoria accion="gestionarPreguntas" />
      <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <Field>
          <FieldLabel htmlFor="filtro-materia">Materia</FieldLabel>
          <NativeSelect
            id="filtro-materia"
            className="w-full"
            value={busqueda.idMateria ?? ''}
            onChange={(evento) =>
              cambiar({ idMateria: evento.target.value === '' ? undefined : Number(evento.target.value) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {(materias.data ?? []).map((materia) => (
              <NativeSelectOption key={materia.id} value={materia.id}>
                {materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(materias) !== null && <FieldError>No se pudieron cargar las materias.</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-dificultad">Dificultad</FieldLabel>
          <NativeSelect
            id="filtro-dificultad"
            className="w-full"
            value={busqueda.dificultad ?? ''}
            onChange={(evento) =>
              cambiar({ dificultad: evento.target.value === '' ? undefined : (evento.target.value as never) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {DIFICULTADES.map((dificultad) => (
              <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                {dificultad.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-tipo">Tipo</FieldLabel>
          <NativeSelect
            id="filtro-tipo"
            className="w-full"
            value={busqueda.tipo ?? ''}
            onChange={(evento) => cambiar({ tipo: evento.target.value === '' ? undefined : (evento.target.value as never) })}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {TIPOS_PREGUNTA.map((tipo) => (
              <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-origen">Origen</FieldLabel>
          <NativeSelect
            id="filtro-origen"
            className="w-full"
            value={busqueda.origen ?? ''}
            onChange={(evento) =>
              cambiar({ origen: evento.target.value === '' ? undefined : (evento.target.value as never) })
            }
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {ORIGENES_PREGUNTA.map((origen) => (
              <NativeSelectOption key={origen.valor} value={origen.valor}>
                {origen.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-texto">Enunciado</FieldLabel>
          <Input
            id="filtro-texto"
            value={busqueda.texto ?? ''}
            onChange={(evento) => cambiar({ texto: evento.target.value.trim() === '' ? undefined : evento.target.value })}
          />
        </Field>
        <Button
          variant="ghost"
          disabled={!hayFiltros}
          onClick={() =>
            cambiar({ idMateria: undefined, dificultad: undefined, tipo: undefined, origen: undefined, texto: undefined })
          }
        >
          Limpiar filtros
        </Button>
      </section>
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void preguntas.refetch()} />
      ) : (
        <DataTable
          etiqueta="Preguntas del banco"
          columnas={COLUMNAS_PREGUNTAS}
          pagina={preguntas.data}
          cargando={preguntas.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(pregunta) => String(pregunta.id)}
          vacio={
            <EmptyState
              titulo="No hay preguntas"
              descripcion={hayFiltros ? 'Ninguna pregunta coincide con los filtros.' : TEXTO_SIN_PREGUNTAS}
              accion={<AccionImportar />}
            />
          }
        />
      )}
    </>
  )
}
```

The text filter is read straight from the URL and written straight back to it: no local mirror, which is the M3 Consultas lesson. `DataTable` is `manualPagination` + `manualSorting`, so the order really is the server's (CA-BAN-01).

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/banco-page.test.tsx
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **701 tests**.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the banco de preguntas list with its filters and url state"
```

---

### Task 7: Registrar and Modificar pregunta: one shared dialog and its zod schema (CA-BAN-03, CA-BAN-04..10, CA-BAN-12, CA-BAN-13)

**Files:**

- Modify: `src/features/preguntas/schemas.ts`
- Create: `src/features/preguntas/components/dialogo-pregunta.tsx`
- Modify: `src/features/preguntas/columnas.tsx`
- Modify: `src/features/preguntas/banco-page.tsx`
- Test: `src/features/preguntas/dialogo-pregunta.test.tsx`
- Modify: `src/features/preguntas/banco-page.test.tsx`

**Interfaces:**
- Consumes: `esquemaPregunta`, `crearPregunta`, `modificarPregunta`, `consultasPreguntas.detalle`, `consultasMaterias.lista`, `aplicarErroresDeCampo`, `useSesion`, `ToggleGroup`, `Textarea`, `AlertDialog`.
- Produces: `esquemaPregunta` with the per-type rules of contract §2.3, `alternativasPara(tipo)`, `preguntaVacia`, `valoresDesdePregunta`, `aCuerpoPregunta`, and `DialogoPregunta({ idPregunta?, disparador })` — one dialog for both operations, which only mounts its form once the detail is there.

- [ ] **Step 1: Write the failing tests**

Create `src/features/preguntas/dialogo-pregunta.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TEXTO_SIN_PREGUNTAS } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const ENUNCIADO = '¿Cuál es el procedimiento normal de encendido del motor?'

async function abrirBanco(ruta = '/banco') {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(ruta)
  await screen.findByText(/registro/)
  return resultado
}

async function abrirRegistrar(usuario: UserEvent) {
  await usuario.click(screen.getByRole('button', { name: 'Registrar pregunta' }))
  return within(await screen.findByRole('dialog'))
}

async function llenarOpcionMultiple(usuario: UserEvent, dialogo: ReturnType<typeof within>) {
  await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
  await usuario.type(dialogo.getByLabelText('Enunciado'), ENUNCIADO)
  for (const [indice, texto] of ['El del manual de vuelo', 'El que indique el alumno', 'Cualquiera', 'Ninguno'].entries()) {
    await usuario.type(dialogo.getByLabelText(`Alternativa ${indice + 1}`), texto)
  }
  await usuario.click(dialogo.getByRole('radio', { name: 'Alternativa 1 es la correcta' }))
}

describe('Registrar y modificar pregunta', () => {
  it('CA-BAN-03 el estado vacío ofrece Registrar pregunta e Importar desde IA', async () => {
    server.use(
      http.get(`${API}/api/preguntas`, () => HttpResponse.text('No existen preguntas disponibles.', { status: 404 })),
    )
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    expect(await screen.findByText(TEXTO_SIN_PREGUNTAS)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Registrar pregunta' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Importar desde IA' }).length).toBeGreaterThan(0)
  })

  it('CA-BAN-04 pide materia, enunciado de 10 a 500, dificultad, tipo y alternativas', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('La materia es obligatoria.')).toBeInTheDocument()
    expect(dialogo.getByText('El enunciado es obligatorio.')).toBeInTheDocument()
    expect(dialogo.getByText('Debe marcar exactamente una alternativa como correcta.')).toBeInTheDocument()
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'corto')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('El enunciado debe tener entre 10 y 500 caracteres.')).toBeInTheDocument()
  })

  it('CA-BAN-04 CA-BAN-05 guarda una pregunta de opción múltiple y la lista la muestra', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await llenarOpcionMultiple(usuario, dialogo)
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Procedimientos Normales')
    expect(await screen.findByText(ENUNCIADO)).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1 · 1 registro')).toBeInTheDocument()
  })

  it('CA-BAN-05 exige cuatro alternativas con textos distintos', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    expect(dialogo.getAllByRole('radio')).toHaveLength(4)
    await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
    await usuario.type(dialogo.getByLabelText('Enunciado'), ENUNCIADO)
    for (const indice of [1, 2, 3, 4]) {
      await usuario.type(dialogo.getByLabelText(`Alternativa ${indice}`), 'Igual')
    }
    await usuario.click(dialogo.getByRole('radio', { name: 'Alternativa 1 es la correcta' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('Las alternativas no pueden repetirse.')).toBeInTheDocument()
  })

  it('CA-BAN-06 verdadero o falso ofrece solo esas dos alternativas y exige marcar una', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.selectOptions(dialogo.getByLabelText('Tipo de pregunta'), 'Verdadero o falso')
    expect(dialogo.getAllByRole('radio')).toHaveLength(2)
    expect(dialogo.getByText('Verdadero')).toBeInTheDocument()
    expect(dialogo.getByText('Falso')).toBeInTheDocument()
    expect(dialogo.queryByLabelText('Alternativa 1')).not.toBeInTheDocument()
    await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'El encendido del motor sigue el manual de vuelo.')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('Debe marcar exactamente una alternativa como correcta.')).toBeInTheDocument()
    await usuario.click(dialogo.getByRole('radio', { name: 'Alternativa 1 es la correcta' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
  })

  it('CA-BAN-07 completar exige el marcador y una sola respuesta esperada', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.selectOptions(dialogo.getByLabelText('Tipo de pregunta'), 'Completar')
    expect(dialogo.queryByRole('radio')).not.toBeInTheDocument()
    await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'El encendido del motor sigue el manual de vuelo.')
    await usuario.type(dialogo.getByLabelText('Respuesta esperada'), 'manual')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(
      await dialogo.findByText('El enunciado de una pregunta de completar debe incluir el marcador _____.'),
    ).toBeInTheDocument()
    await usuario.clear(dialogo.getByLabelText('Enunciado'))
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'El encendido del motor sigue el _____ de vuelo.')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
  })

  it('CA-BAN-08 cambiar el tipo avisa antes de descartar lo escrito y rehace las alternativas', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.type(dialogo.getByLabelText('Alternativa 1'), 'Algo escrito')
    await usuario.selectOptions(dialogo.getByLabelText('Tipo de pregunta'), 'Verdadero o falso')
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText('¿Cambiar el tipo de pregunta?')).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Conservar el tipo' }))
    expect(dialogo.getByLabelText('Alternativa 1')).toHaveValue('Algo escrito')
    await usuario.selectOptions(dialogo.getByLabelText('Tipo de pregunta'), 'Verdadero o falso')
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cambiar y rehacer' }))
    expect(await dialogo.findByText('Verdadero')).toBeInTheDocument()
    expect(dialogo.queryByLabelText('Alternativa 1')).not.toBeInTheDocument()
  })

  it('CA-BAN-09 la explicación es opcional y admite hasta 1000 caracteres', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await llenarOpcionMultiple(usuario, dialogo)
    await usuario.type(dialogo.getByLabelText('Explicación'), 'a'.repeat(1001))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('La explicación no puede superar los 1000 caracteres.')).toBeInTheDocument()
    await usuario.clear(dialogo.getByLabelText('Explicación'))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
  })

  it('CA-BAN-10 modificar aplica las mismas reglas y conserva el origen IA', async () => {
    const { usuario } = await abrirBanco('/banco?idMateria=3&origen=IA')
    await usuario.click(screen.getByRole('button', { name: 'Modificar la pregunta 9' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByLabelText('Enunciado')).toHaveValue(
      '¿Qué se exige cuando una calificación queda bajo el estándar de la maniobra?',
    )
    await usuario.clear(dialogo.getByLabelText('Enunciado'))
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'corto')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('El enunciado debe tener entre 10 y 500 caracteres.')).toBeInTheDocument()
    await usuario.clear(dialogo.getByLabelText('Enunciado'))
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'Enunciado corregido a mano después de importarlo.')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
    expect(await screen.findByText('Enunciado corregido a mano después de importarlo.')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1 · 2 registros')).toBeInTheDocument()
  })

  it('CA-BAN-12 los errores del backend aparecen bajo su campo, con índice en las alternativas', async () => {
    server.use(
      http.post(`${API}/api/preguntas`, () =>
        HttpResponse.json(
          [
            "'enunciado': El enunciado es obligatorio.",
            "'alternativas[2].respuesta': La respuesta no puede superar los 200 caracteres.",
          ],
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await llenarOpcionMultiple(usuario, dialogo)
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('El enunciado es obligatorio.')).toBeInTheDocument()
    expect(dialogo.getByText('La respuesta no puede superar los 200 caracteres.')).toBeInTheDocument()
  })

  it('CA-BAN-13 el diálogo de modificar no monta el formulario hasta tener el detalle', async () => {
    server.use(http.get(`${API}/api/preguntas/:id`, () => HttpResponse.error()))
    const { usuario } = await abrirBanco('/banco?idMateria=3')
    await usuario.click(screen.getByRole('button', { name: 'Modificar la pregunta 1' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(dialogo.queryByLabelText('Enunciado')).not.toBeInTheDocument()
  })
})
```

In `src/features/preguntas/banco-page.test.tsx`, replace:

```tsx
    expect(screen.getByRole('button', { name: 'Importar desde IA' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
```

with:

```tsx
    expect(screen.getByRole('button', { name: 'Importar desde IA' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Registrar pregunta' })).toBeDisabled()
    expect(screen.getAllByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toHaveLength(2)
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/dialogo-pregunta.test.tsx src/features/preguntas/banco-page.test.tsx
```

Expected: FAIL — `dialogo-pregunta.test.tsx` cannot find the `Registrar pregunta` button (the page has only `Importar desde IA`), and the amended `banco-page.test.tsx` CA-BAN-14 case finds one T11 message instead of two.

- [ ] **Step 3: Extend the schema with the pregunta form**

In `src/features/preguntas/schemas.ts`, replace:

```ts
import { DIFICULTADES, ORIGENES_PREGUNTA, TIPOS_PREGUNTA } from '@/lib/dominio/teoria'
```

with:

```ts
import {
  alternativasRequeridas,
  DIFICULTADES,
  MARCADOR_COMPLETAR,
  ORIGENES_PREGUNTA,
  TEXTOS_VERDADERO_FALSO,
  TIPOS_PREGUNTA,
  type TipoPregunta,
} from '@/lib/dominio/teoria'
import type { CuerpoPregunta, PreguntaDetalle } from './api'
```

Append to `src/features/preguntas/schemas.ts`:

```ts
const MENSAJE_ENUNCIADO = 'El enunciado debe tener entre 10 y 500 caracteres.'

export const esquemaPregunta = z
  .object({
    idMateria: z.string().min(1, 'La materia es obligatoria.'),
    enunciado: z.string().trim().min(1, 'El enunciado es obligatorio.').min(10, MENSAJE_ENUNCIADO).max(500, MENSAJE_ENUNCIADO),
    tipoPregunta: z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor)),
    dificultad: z.enum(DIFICULTADES.map((dificultad) => dificultad.valor)),
    explicacion: z.string().trim().max(1000, 'La explicación no puede superar los 1000 caracteres.'),
    alternativas: z.array(
      z.object({
        respuesta: z
          .string()
          .trim()
          .min(1, 'La respuesta es obligatoria.')
          .max(200, 'La respuesta no puede superar los 200 caracteres.'),
      }),
    ),
    correcta: z.string(),
  })
  .superRefine((valores, contexto) => {
    if (valores.tipoPregunta === 'COMPLETAR' && !valores.enunciado.includes(MARCADOR_COMPLETAR)) {
      contexto.addIssue({
        code: 'custom',
        message: `El enunciado de una pregunta de completar debe incluir el marcador ${MARCADOR_COMPLETAR}.`,
        path: ['enunciado'],
      })
    }
    if (valores.correcta === '') {
      contexto.addIssue({
        code: 'custom',
        message: 'Debe marcar exactamente una alternativa como correcta.',
        path: ['correcta'],
      })
    }
    const textos = valores.alternativas.map((alternativa) =>
      alternativa.respuesta.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''),
    )
    if (new Set(textos).size !== textos.length) {
      contexto.addIssue({ code: 'custom', message: 'Las alternativas no pueden repetirse.', path: ['alternativas'] })
    }
  })

export type ValoresPregunta = z.input<typeof esquemaPregunta>

export function alternativasPara(tipo: TipoPregunta): { respuesta: string }[] {
  if (tipo === 'VERDADERO_FALSO') return TEXTOS_VERDADERO_FALSO.map((respuesta) => ({ respuesta }))
  return Array.from({ length: alternativasRequeridas(tipo) }, () => ({ respuesta: '' }))
}

export function preguntaVacia(tipo: TipoPregunta = 'OPCION_MULTIPLE'): ValoresPregunta {
  return {
    idMateria: '',
    enunciado: '',
    tipoPregunta: tipo,
    dificultad: 'MEDIA',
    explicacion: '',
    alternativas: alternativasPara(tipo),
    correcta: tipo === 'COMPLETAR' ? '0' : '',
  }
}

export function valoresDesdePregunta(pregunta: PreguntaDetalle): ValoresPregunta {
  return {
    idMateria: String(pregunta.materia.id),
    enunciado: pregunta.enunciado,
    tipoPregunta: pregunta.tipoPregunta,
    dificultad: pregunta.dificultad,
    explicacion: pregunta.explicacion ?? '',
    alternativas: pregunta.alternativas.map((alternativa) => ({ respuesta: alternativa.respuesta })),
    correcta: String(pregunta.alternativas.findIndex((alternativa) => alternativa.correcto)),
  }
}

export function aCuerpoPregunta(valores: ValoresPregunta, codInstructor: string): CuerpoPregunta {
  return {
    codInstructor,
    idMateria: Number(valores.idMateria),
    enunciado: valores.enunciado.trim(),
    tipoPregunta: valores.tipoPregunta,
    dificultad: valores.dificultad,
    explicacion: valores.explicacion.trim() === '' ? null : valores.explicacion.trim(),
    alternativas: valores.alternativas.map((alternativa, indice) => ({
      respuesta: alternativa.respuesta.trim(),
      correcto: String(indice) === valores.correcta,
    })),
  }
}
```

`correcta` is the **index** of the correct alternativa as a string, so "exactly one correct" is structural instead of a count, and `alternativasPara(tipo)` is the single source of the 4 / 2 / 1 shapes.

- [ ] **Step 4: Land the shared dialog**

Create `src/features/preguntas/components/dialogo-pregunta.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { consultasMaterias } from '@/features/materias/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { useSesion } from '@/lib/auth/use-sesion'
import { DIFICULTADES, MARCADOR_COMPLETAR, TIPOS_PREGUNTA, type TipoPregunta } from '@/lib/dominio/teoria'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesPreguntas, consultasPreguntas, crearPregunta, modificarPregunta, type PreguntaDetalle } from '../api'
import {
  aCuerpoPregunta,
  alternativasPara,
  esquemaPregunta,
  preguntaVacia,
  valoresDesdePregunta,
  type ValoresPregunta,
} from '../schemas'

type PropsFormulario = { pregunta?: PreguntaDetalle; alGuardar: () => void }

function FormularioPregunta({ pregunta, alGuardar }: PropsFormulario) {
  const queryClient = useQueryClient()
  const sesion = useSesion()
  const materias = useQuery(consultasMaterias.lista())
  const [tipoPendiente, setTipoPendiente] = useState<TipoPregunta | null>(null)
  const formulario = useForm<ValoresPregunta>({
    resolver: zodResolver(esquemaPregunta),
    defaultValues: pregunta ? valoresDesdePregunta(pregunta) : preguntaVacia(),
  })
  const { errors } = formulario.formState
  const [tipoPregunta, alternativas] = useWatch({ control: formulario.control, name: ['tipoPregunta', 'alternativas'] })

  const guardar = useMutation({
    mutationFn: (valores: ValoresPregunta) => {
      const cuerpo = aCuerpoPregunta(valores, sesion?.codPersona ?? '')
      return pregunta ? modificarPregunta(pregunta.id, cuerpo) : crearPregunta(cuerpo)
    },
    onSuccess: async (mensaje) => {
      alGuardar()
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPreguntas.todo })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function cambiarTipo(siguiente: TipoPregunta) {
    formulario.setValue('tipoPregunta', siguiente)
    formulario.setValue('alternativas', alternativasPara(siguiente))
    formulario.setValue('correcta', siguiente === 'COMPLETAR' ? '0' : '')
    formulario.clearErrors()
  }

  function pedirCambioDeTipo(siguiente: string) {
    const elegido = TIPOS_PREGUNTA.find((tipo) => tipo.valor === siguiente)?.valor
    if (elegido === undefined || elegido === tipoPregunta) return
    const conTexto = formulario
      .getValues('alternativas')
      .some((alternativa, indice) => alternativa.respuesta.trim() !== '' && alternativasPara(tipoPregunta)[indice]?.respuesta !== alternativa.respuesta)
    if (conTexto) setTipoPendiente(elegido)
    else cambiarTipo(elegido)
  }

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))}>
      <FieldGroup>
        {guardar.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Field data-invalid={Boolean(errors.idMateria)}>
          <FieldLabel htmlFor="pregunta-materia">Materia</FieldLabel>
          <NativeSelect
            id="pregunta-materia"
            className="w-full"
            aria-invalid={Boolean(errors.idMateria)}
            {...formulario.register('idMateria')}
          >
            <NativeSelectOption value="">Elija una materia</NativeSelectOption>
            {(materias.data ?? []).map((materia) => (
              <NativeSelectOption key={materia.id} value={materia.id}>
                {materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(materias) !== null && <FieldError>No se pudieron cargar las materias.</FieldError>}
          <FieldError errors={[errors.idMateria]} />
        </Field>
        <Field data-invalid={Boolean(errors.tipoPregunta)}>
          <FieldLabel htmlFor="pregunta-tipo">Tipo de pregunta</FieldLabel>
          <NativeSelect
            id="pregunta-tipo"
            className="w-full"
            value={tipoPregunta}
            onChange={(evento) => pedirCambioDeTipo(evento.target.value)}
          >
            {TIPOS_PREGUNTA.map((tipo) => (
              <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>Cambiarlo rehace las alternativas.</FieldDescription>
        </Field>
        <Field data-invalid={Boolean(errors.enunciado)}>
          <FieldLabel htmlFor="pregunta-enunciado">Enunciado</FieldLabel>
          <Textarea
            id="pregunta-enunciado"
            aria-invalid={Boolean(errors.enunciado)}
            {...formulario.register('enunciado')}
          />
          <FieldDescription>
            De 10 a 500 caracteres
            {tipoPregunta === 'COMPLETAR' ? `, con el marcador ${MARCADOR_COMPLETAR}.` : '.'}
          </FieldDescription>
          <FieldError errors={[errors.enunciado]} />
        </Field>
        <Field data-invalid={Boolean(errors.dificultad)}>
          <FieldLabel htmlFor="pregunta-dificultad">Dificultad</FieldLabel>
          <NativeSelect
            id="pregunta-dificultad"
            className="w-full"
            aria-invalid={Boolean(errors.dificultad)}
            {...formulario.register('dificultad')}
          >
            {DIFICULTADES.map((dificultad) => (
              <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                {dificultad.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={Boolean(errors.alternativas ?? errors.correcta)}>
          <FieldLabel>{tipoPregunta === 'COMPLETAR' ? 'Respuesta esperada' : 'Alternativas'}</FieldLabel>
          {tipoPregunta === 'COMPLETAR' ? (
            <>
              <Input
                aria-label="Respuesta esperada"
                aria-invalid={Boolean(errors.alternativas?.[0]?.respuesta)}
                {...formulario.register('alternativas.0.respuesta')}
              />
              <FieldError errors={[errors.alternativas?.[0]?.respuesta]} />
            </>
          ) : (
            <Controller
              control={formulario.control}
              name="correcta"
              render={({ field }) => (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="grid gap-2"
                  aria-label="Alternativa correcta"
                  value={field.value}
                  onValueChange={(valor) => valor !== '' && field.onChange(valor)}
                >
                  {alternativas.map((_, indice) => (
                    <div key={indice} className="flex items-center gap-2">
                      <ToggleGroupItem value={String(indice)} aria-label={`Alternativa ${indice + 1} es la correcta`}>
                        Correcta
                      </ToggleGroupItem>
                      {tipoPregunta === 'VERDADERO_FALSO' ? (
                        <span>{formulario.getValues(`alternativas.${indice}.respuesta`)}</span>
                      ) : (
                        <Input
                          aria-label={`Alternativa ${indice + 1}`}
                          aria-invalid={Boolean(errors.alternativas?.[indice]?.respuesta)}
                          {...formulario.register(`alternativas.${indice}.respuesta`)}
                        />
                      )}
                    </div>
                  ))}
                </ToggleGroup>
              )}
            />
          )}
          <FieldError errors={[errors.correcta, errors.alternativas?.root ?? errors.alternativas]} />
          {tipoPregunta === 'OPCION_MULTIPLE' &&
            alternativas.map((_, indice) => (
              <FieldError key={indice} errors={[errors.alternativas?.[indice]?.respuesta]} />
            ))}
        </Field>
        <Field data-invalid={Boolean(errors.explicacion)}>
          <FieldLabel htmlFor="pregunta-explicacion">Explicación</FieldLabel>
          <Textarea
            id="pregunta-explicacion"
            aria-invalid={Boolean(errors.explicacion)}
            {...formulario.register('explicacion')}
          />
          <FieldDescription>Opcional, hasta 1000 caracteres. El alumno la ve al cerrar el turno.</FieldDescription>
          <FieldError errors={[errors.explicacion]} />
        </Field>
      </FieldGroup>
      <DialogFooter className="mt-6">
        <Button type="button" variant="ghost" onClick={alGuardar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar pregunta'}
        </Button>
      </DialogFooter>
      <AlertDialog open={tipoPendiente !== null} onOpenChange={(abierto) => !abierto && setTipoPendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar el tipo de pregunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Las alternativas escritas pertenecen al tipo actual y se descartarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar el tipo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tipoPendiente) cambiarTipo(tipoPendiente)
                setTipoPendiente(null)
              }}
            >
              Cambiar y rehacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

export function DialogoPregunta({ idPregunta, disparador }: { idPregunta?: number; disparador: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const detalle = useQuery({
    ...consultasPreguntas.detalle(idPregunta ?? 0),
    enabled: abierto && idPregunta !== undefined,
  })
  const error = errorDePrimeraCarga(detalle)
  const esperando = idPregunta !== undefined && detalle.data === undefined

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{disparador}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{idPregunta === undefined ? 'Registrar pregunta' : 'Modificar pregunta'}</DialogTitle>
          <DialogDescription>Materia, enunciado, tipo, dificultad y sus alternativas.</DialogDescription>
        </DialogHeader>
        {error !== null ? (
          <AvisoDeError error={error} alReintentar={() => void detalle.refetch()} />
        ) : esperando ? (
          <Skeleton className="h-64 w-full" aria-busy="true" />
        ) : (
          <FormularioPregunta pregunta={detalle.data} alGuardar={() => setAbierto(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Add the row action and wire the dialog into the page**

Replace `src/features/preguntas/columnas.tsx`:

```tsx
import { Pencil } from 'lucide-react'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Button } from '@/components/ui/button'
import { etiquetaDeDificultad, etiquetaDeOrigen, etiquetaDeTipoPregunta } from '@/lib/dominio/teoria'
import type { PreguntaFila } from './api'
import { DialogoPregunta } from './components/dialogo-pregunta'

const ayudante = ayudanteDeColumnas<PreguntaFila>()

export const COLUMNAS_PREGUNTAS = ayudante.columns([
  ayudante.accessor('materia', { header: 'Materia', enableSorting: true }),
  ayudante.accessor('enunciado', {
    header: 'Enunciado',
    enableSorting: true,
    cell: (contexto) => <span className="block max-w-xl">{contexto.getValue()}</span>,
  }),
  ayudante.accessor('tipoPregunta', {
    header: 'Tipo',
    cell: (contexto) => etiquetaDeTipoPregunta(contexto.getValue()),
  }),
  ayudante.accessor('dificultad', {
    header: 'Dificultad',
    enableSorting: true,
    cell: (contexto) => etiquetaDeDificultad(contexto.getValue()),
  }),
  ayudante.accessor('origen', { header: 'Origen', cell: (contexto) => etiquetaDeOrigen(contexto.getValue()) }),
  ayudante.accessor('enUso', { header: 'En uso', cell: (contexto) => (contexto.getValue() ? 'Sí' : 'No') }),
])

const acciones = ayudante.display({
  id: 'acciones',
  header: () => <span className="sr-only">Acciones</span>,
  cell: (contexto) => (
    <div className="flex flex-wrap justify-end gap-2">
      <DialogoPregunta
        idPregunta={contexto.row.original.id}
        disparador={
          <Button variant="outline" size="sm" aria-label={`Modificar la pregunta ${contexto.row.original.id}`}>
            <Pencil aria-hidden />
            Modificar
          </Button>
        }
      />
    </div>
  ),
})

export const COLUMNAS_PREGUNTAS_CON_ACCIONES = ayudante.columns([...COLUMNAS_PREGUNTAS, acciones])
```

Replace `src/features/preguntas/banco-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus, Sparkles } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasMaterias } from '@/features/materias/api'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { DIFICULTADES, ORIGENES_PREGUNTA, TEXTO_SIN_PREGUNTAS, TIPOS_PREGUNTA } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasPreguntas } from './api'
import { COLUMNAS_PREGUNTAS, COLUMNAS_PREGUNTAS_CON_ACCIONES } from './columnas'
import { DialogoPregunta } from './components/dialogo-pregunta'
import type { BusquedaPreguntas } from './schemas'

const ruta = getRouteApi('/_app/banco/')

function AccionImportar() {
  if (!accionDisponible('importarPreguntas')) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="outline" disabled>
          <Sparkles aria-hidden />
          Importar desde IA
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }
  return (
    <Button variant="outline" asChild>
      <Link to="/banco/importar">
        <Sparkles aria-hidden />
        Importar desde IA
      </Link>
    </Button>
  )
}

function AccionRegistrar() {
  if (!accionDisponible('gestionarPreguntas')) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button disabled>
          <Plus aria-hidden />
          Registrar pregunta
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }
  return (
    <DialogoPregunta
      disparador={
        <Button>
          <Plus aria-hidden />
          Registrar pregunta
        </Button>
      }
    />
  )
}

export function BancoPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const materias = useQuery(consultasMaterias.lista())
  const preguntas = useQuery(consultasPreguntas.lista(busqueda))
  const error = errorDePrimeraCarga(preguntas)
  const puedeGestionar = accionDisponible('gestionarPreguntas')

  function cambiar(cambios: Partial<BusquedaPreguntas>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const hayFiltros =
    busqueda.idMateria !== undefined ||
    busqueda.dificultad !== undefined ||
    busqueda.tipo !== undefined ||
    busqueda.origen !== undefined ||
    busqueda.texto !== undefined

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.banco.titulo}
        descripcion={PANTALLAS.banco.descripcion}
        acciones={
          <>
            <AccionImportar />
            <AccionRegistrar />
          </>
        }
      />
      <AvisoDeTeoria accion="gestionarPreguntas" />
      <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <Field>
          <FieldLabel htmlFor="filtro-materia">Materia</FieldLabel>
          <NativeSelect
            id="filtro-materia"
            className="w-full"
            value={busqueda.idMateria ?? ''}
            onChange={(evento) =>
              cambiar({ idMateria: evento.target.value === '' ? undefined : Number(evento.target.value) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {(materias.data ?? []).map((materia) => (
              <NativeSelectOption key={materia.id} value={materia.id}>
                {materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(materias) !== null && <FieldError>No se pudieron cargar las materias.</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-dificultad">Dificultad</FieldLabel>
          <NativeSelect
            id="filtro-dificultad"
            className="w-full"
            value={busqueda.dificultad ?? ''}
            onChange={(evento) =>
              cambiar({ dificultad: evento.target.value === '' ? undefined : (evento.target.value as never) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {DIFICULTADES.map((dificultad) => (
              <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                {dificultad.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-tipo">Tipo</FieldLabel>
          <NativeSelect
            id="filtro-tipo"
            className="w-full"
            value={busqueda.tipo ?? ''}
            onChange={(evento) => cambiar({ tipo: evento.target.value === '' ? undefined : (evento.target.value as never) })}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {TIPOS_PREGUNTA.map((tipo) => (
              <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-origen">Origen</FieldLabel>
          <NativeSelect
            id="filtro-origen"
            className="w-full"
            value={busqueda.origen ?? ''}
            onChange={(evento) =>
              cambiar({ origen: evento.target.value === '' ? undefined : (evento.target.value as never) })
            }
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {ORIGENES_PREGUNTA.map((origen) => (
              <NativeSelectOption key={origen.valor} value={origen.valor}>
                {origen.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-texto">Enunciado</FieldLabel>
          <Input
            id="filtro-texto"
            value={busqueda.texto ?? ''}
            onChange={(evento) => cambiar({ texto: evento.target.value.trim() === '' ? undefined : evento.target.value })}
          />
        </Field>
        <Button
          variant="ghost"
          disabled={!hayFiltros}
          onClick={() =>
            cambiar({ idMateria: undefined, dificultad: undefined, tipo: undefined, origen: undefined, texto: undefined })
          }
        >
          Limpiar filtros
        </Button>
      </section>
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void preguntas.refetch()} />
      ) : (
        <DataTable
          etiqueta="Preguntas del banco"
          columnas={puedeGestionar ? COLUMNAS_PREGUNTAS_CON_ACCIONES : COLUMNAS_PREGUNTAS}
          pagina={preguntas.data}
          cargando={preguntas.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(pregunta) => String(pregunta.id)}
          vacio={
            <EmptyState
              titulo="No hay preguntas"
              descripcion={hayFiltros ? 'Ninguna pregunta coincide con los filtros.' : TEXTO_SIN_PREGUNTAS}
              accion={
                <div className="flex flex-wrap items-start justify-center gap-2">
                  <AccionImportar />
                  <AccionRegistrar />
                </div>
              }
            />
          }
        />
      )}
    </>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/dialogo-pregunta.test.tsx src/features/preguntas/banco-page.test.tsx
```

Expected: PASS, 18 tests (11 + 7).

- [ ] **Step 7: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **712 tests**.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the shared registrar and modificar pregunta dialog"
```

---

### Task 8: Eliminar pregunta with its `enUso` guard, E2 and D3 (CA-BAN-11)

**Files:**

- Create: `src/features/preguntas/components/eliminar-pregunta.tsx`
- Modify: `src/features/preguntas/columnas.tsx`
- Test: `src/features/preguntas/eliminar-pregunta.test.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog`, `eliminarPregunta`, `clavesPreguntas`, `TEXTO_PREGUNTA_EN_USO`.
- Produces: `EliminarPregunta({ pregunta })` — disabled with E2 when the row is `enUso`, a confirm dialog otherwise, and a toast with the server's own text (D18 on success, D3 when the server refuses anyway). It invalidates `clavesPreguntas.todo` **and** `['materias']`, because deleting the last pregunta of a materia changes that materia's derived 409.

- [ ] **Step 1: Write the failing tests**

Create `src/features/preguntas/eliminar-pregunta.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TEXTO_PREGUNTA_EN_USO } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { D3_PREGUNTA_EN_USO } from '@/mocks/sigeda/preguntas'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirBanco(ruta: string) {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(ruta)
  await screen.findByText(/registro/)
  return resultado
}

describe('Eliminar pregunta', () => {
  it('CA-BAN-11 una pregunta en uso no se puede eliminar y muestra E2', async () => {
    await abrirBanco('/banco?idMateria=3')
    expect(screen.getByRole('button', { name: 'Eliminar la pregunta 1' })).toBeDisabled()
    expect(screen.getAllByText(TEXTO_PREGUNTA_EN_USO).length).toBeGreaterThan(0)
  })

  it('CA-BAN-11 eliminar pide confirmación y quita la fila', async () => {
    const { usuario } = await abrirBanco('/banco?idMateria=1')
    expect(screen.getByText('Página 1 de 1 · 3 registros')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar la pregunta 22' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText('¿Eliminar la pregunta?')).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Pregunta eliminado con éxito.')).toBeInTheDocument()
    expect(await screen.findByText('Página 1 de 1 · 2 registros')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar la pregunta 22' })).not.toBeInTheDocument()
  })

  it('CA-BAN-11 una eliminación que el servidor rechaza muestra D3', async () => {
    server.use(http.delete(`${API}/api/preguntas/:id`, () => HttpResponse.text(D3_PREGUNTA_EN_USO, { status: 409 })))
    const { usuario } = await abrirBanco('/banco?idMateria=1')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar la pregunta 22' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText(D3_PREGUNTA_EN_USO)).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1 · 3 registros')).toBeInTheDocument()
  })

  it('CA-BAN-11 borrar la última pregunta de una materia la vuelve eliminable', async () => {
    const { usuario } = await abrirBanco('/banco?idMateria=6')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar la pregunta 16' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Pregunta eliminado con éxito.')).toBeInTheDocument()
    expect(await screen.findByText('Página 1 de 1 · 5 registros')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/eliminar-pregunta.test.tsx
```

Expected: FAIL — `Unable to find an accessible element with the role "button" and name "Eliminar la pregunta 1"`; the row only has Modificar.

- [ ] **Step 3: Land the delete action**

Create `src/features/preguntas/components/eliminar-pregunta.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { TEXTO_PREGUNTA_EN_USO } from '@/lib/dominio/teoria'
import { clavesPreguntas, eliminarPregunta, type PreguntaFila } from '../api'

export function EliminarPregunta({ pregunta }: { pregunta: PreguntaFila }) {
  const queryClient = useQueryClient()
  const etiqueta = `Eliminar la pregunta ${pregunta.id}`

  const eliminar = useMutation({
    mutationFn: () => eliminarPregunta(pregunta.id),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPreguntas.todo })
      await queryClient.invalidateQueries({ queryKey: ['materias'] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  if (pregunta.enUso) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="destructive" size="sm" disabled aria-label={etiqueta}>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
        <p className="text-xs text-muted-foreground">{TEXTO_PREGUNTA_EN_USO}</p>
      </div>
    )
  }

  return (
    <ConfirmDialog
      disparador={
        <Button variant="destructive" size="sm" disabled={eliminar.isPending} aria-label={etiqueta}>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
      }
      titulo="¿Eliminar la pregunta?"
      descripcion="Se eliminará la pregunta y sus alternativas. Esta acción no se puede deshacer."
      confirmar="Eliminar"
      destructivo
      alConfirmar={() => eliminar.mutate()}
    />
  )
}
```

- [ ] **Step 4: Add it to the row actions**

In `src/features/preguntas/columnas.tsx`, replace:

```tsx
import { DialogoPregunta } from './components/dialogo-pregunta'
```

with:

```tsx
import { DialogoPregunta } from './components/dialogo-pregunta'
import { EliminarPregunta } from './components/eliminar-pregunta'
```

In `src/features/preguntas/columnas.tsx`, replace:

```tsx
      />
    </div>
  ),
})
```

with:

```tsx
      />
      <EliminarPregunta pregunta={contexto.row.original} />
    </div>
  ),
})
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/eliminar-pregunta.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **716 tests**.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add eliminar pregunta with its en-uso guard"
```

---

### Task 9: Importar desde IA: the generation form, its 120 s deadline and the §9.4 quiz (M4-5, M4-21) (CA-IMP-01, CA-IMP-02, CA-IMP-03, CA-IMP-04)

**Files:**

- Modify: `src/mocks/ia/cuestionarios.ts`
- Modify: `src/lib/dominio/teoria.ts`
- Modify: `src/features/preguntas/schemas.ts`
- Create: `src/features/preguntas/components/formulario-importacion.tsx`
- Modify (full rewrite): `src/features/preguntas/importar-page.tsx`
- Test: `src/features/preguntas/importar-page.test.tsx`

**Interfaces:**
- Consumes: `useDocumentosListos`, `generarCuestionario` and `mensajeDeError` from `features/aprendizaje` (M3's closed message list), `conLimiteDeTiempo` + `CanceladoError`, `consultasMaterias.lista`.
- Produces:
  - `POST /quizzes/generate` with `questionCount = 12` answering the five-question quiz of contract §9.4: a 620-character prompt (E5), two identical options (E6), a `true_false` with `options: null`, a `fill_blank` with `_____`, and a 6-character prompt with a 240-character option (E26 plus the silent truncation).
  - `TEXTO_GENERACION_RECHAZADA_E8` re-exported from `lib/dominio/aprendizaje`, because §16.3's E8 is M3's A5 word for word.
  - `esquemaImportacion` (documents, types, 2–20 questions, materia and dificultad for the batch) and `FormularioImportacion`, disabled while generating, cancelled at 120 s with Reintentar.

- [ ] **Step 1: Write the failing tests**

Create `src/features/preguntas/importar-page.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEXTO_GENERACION_DEMORADA, TEXTO_GENERANDO_CUESTIONARIO } from '@/lib/dominio/aprendizaje'
import { TEXTO_GENERACION_RECHAZADA_E8, TEXTO_REVISAR_IMPORTACION } from '@/lib/dominio/teoria'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import type { UserEvent } from '@testing-library/user-event'

const DOCUMENTO = 'PDI EA-510 Título III.pdf'

async function abrirImportar(usuario?: UserEvent) {
  await iniciarComo('instructor.perez')
  const resultado = renderApp('/banco/importar', usuario)
  await screen.findByLabelText('Cantidad de preguntas')
  return resultado
}

async function prepararLote(usuario: UserEvent, cantidad: string) {
  await usuario.click(screen.getByLabelText(DOCUMENTO))
  await usuario.selectOptions(screen.getByLabelText('Materia del lote'), 'Adoctrinamiento de Vuelo')
  await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
  await usuario.type(screen.getByLabelText('Cantidad de preguntas'), cantidad)
}

function contarGeneraciones() {
  let generaciones = 0
  const oyente = ({ request }: { request: Request }) => {
    if (request.method === 'POST' && request.url.includes('/quizzes/generate')) generaciones += 1
  }
  server.events.on('request:start', oyente)
  return {
    total: () => generaciones,
    detener: () => server.events.removeListener('request:start', oyente),
  }
}

describe('Importar preguntas desde IA', () => {
  it('CA-IMP-01 exige documento, tipo, cantidad de 2 a 20, materia y dificultad', async () => {
    const { usuario } = await abrirImportar()
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText('Elija al menos un documento.')).toBeInTheDocument()
    expect(screen.getByText('La materia es obligatoria.')).toBeInTheDocument()
    await usuario.click(screen.getByLabelText(DOCUMENTO))
    await usuario.selectOptions(screen.getByLabelText('Materia del lote'), 'Adoctrinamiento de Vuelo')
    await usuario.click(screen.getByLabelText('Opción múltiple'))
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText('Elija al menos un tipo de pregunta.')).toBeInTheDocument()
    await usuario.click(screen.getByLabelText('Opción múltiple'))
    await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
    await usuario.type(screen.getByLabelText('Cantidad de preguntas'), '1')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText('La cantidad debe ser un número entero entre 2 y 20.')).toBeInTheDocument()
  })

  it('CA-IMP-04 una generación válida pasa a la revisión con E4 y deja el formulario', async () => {
    const { usuario } = await abrirImportar()
    await prepararLote(usuario, '12')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText(TEXTO_REVISAR_IMPORTACION)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generar preguntas' })).not.toBeInTheDocument()
  })

  it('CA-IMP-02 mientras genera deshabilita el formulario, avisa y no envía dos veces', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirImportar(usuario)
    const conteo = contarGeneraciones()
    await prepararLote(usuario, '20')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText(TEXTO_GENERANDO_CUESTIONARIO)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled()
    expect(screen.getByLabelText('Cantidad de preguntas')).toBeDisabled()
    expect(screen.getByLabelText(DOCUMENTO)).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: 'Generando…' }))
    await avanzar(3000)
    expect(await screen.findByText(TEXTO_REVISAR_IMPORTACION)).toBeInTheDocument()
    expect(conteo.total()).toBe(1)
    conteo.detener()
  })

  it('CA-IMP-02 a los 120 segundos la petición se cancela y se ofrece Reintentar', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirImportar(usuario)
    await prepararLote(usuario, '13')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    await screen.findByText(TEXTO_GENERANDO_CUESTIONARIO)
    await avanzar(119_000)
    expect(screen.queryByText(TEXTO_GENERACION_DEMORADA)).not.toBeInTheDocument()
    await avanzar(1500)
    expect(await screen.findByText(TEXTO_GENERACION_DEMORADA)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  })

  it('CA-IMP-03 un mensaje que no está en la lista del contrato se reemplaza por E8', async () => {
    const { usuario } = await abrirImportar()
    await prepararLote(usuario, '7')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText(TEXTO_GENERACION_RECHAZADA_E8)).toBeInTheDocument()
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument()
  })

  it('CA-IMP-03 un documento que no está listo muestra el mensaje del contrato', async () => {
    const { usuario } = await abrirImportar()
    await prepararLote(usuario, '5')
    await usuario.click(screen.getByLabelText(DOCUMENTO))
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText('Elija al menos un documento.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/importar-page.test.tsx
```

Expected: FAIL — every test times out on `screen.findByLabelText('Cantidad de preguntas')`, because the skeleton page of Task 5 has no form.

- [ ] **Step 3: Add the import-path quiz to the AI mock (§9.4)**

In `src/mocks/ia/cuestionarios.ts`, replace:

```ts
export const ID_CUESTIONARIO = 'c0e50000-0000-4000-8000-000000000001'
```

with:

```ts
export const ID_CUESTIONARIO = 'c0e50000-0000-4000-8000-000000000001'
export const ID_CUESTIONARIO_IMPORTACION = 'c0e50000-0000-4000-8000-000000000002'
export const CANTIDAD_IMPORTACION = 12
```

In `src/mocks/ia/cuestionarios.ts`, replace:

```ts
function cuestionario(requestedCount: number, questionTypes: string[]) {
```

with:

```ts
const PROMPT_LARGO = `¿Cuál de las siguientes afirmaciones describe mejor el procedimiento que el alumno piloto debe seguir cuando, durante una maniobra de contacto, el instructor le indica que la nota mínima de la maniobra es Regular y además le recuerda que el briefing de detalle se realiza una hora antes del vuelo, considerando que el PDI EA-510 exige registrar observación, causa y recomendación en toda calificación que quede por debajo del estándar de la maniobra evaluada en ese turno? ${'.'.repeat(147)}`

const OPCION_LARGA = `Una opción deliberadamente extensa para probar el recorte silencioso ${'x'.repeat(171)}`

function preguntasDeImportacion() {
  const base = { quizId: ID_CUESTIONARIO_IMPORTACION, sourceDocumentId: null, sourceExcerpt: null, createdAt: CREADO }
  return [
    {
      ...base,
      id: '9e500000-0000-4000-8000-000000000011',
      type: 'multiple_choice',
      position: 0,
      prompt: PROMPT_LARGO,
      options: [
        { id: 'a', text: 'Registrar observación, causa y recomendación' },
        { id: 'b', text: 'Registrar solo la observación' },
        { id: 'c', text: 'No registrar nada' },
        { id: 'd', text: 'Repetir el turno sin registrar' },
      ],
      correctAnswer: 'a',
      explanation: 'El PDI EA-510 pide justificar toda calificación bajo el estándar.',
    },
    {
      ...base,
      id: '9e500000-0000-4000-8000-000000000012',
      type: 'multiple_choice',
      position: 1,
      prompt: '¿Quién aprueba la programación diaria de los turnos de vuelo?',
      options: [
        { id: 'a', text: 'El Jefe de Operaciones' },
        { id: 'b', text: 'El instructor del turno' },
        { id: 'c', text: 'El instructor del turno' },
        { id: 'd', text: 'El alumno piloto' },
      ],
      correctAnswer: 'a',
      explanation: null,
    },
    {
      ...base,
      id: '9e500000-0000-4000-8000-000000000013',
      type: 'true_false',
      position: 2,
      prompt: 'La última misión de cada subfase es un chequeo.',
      options: null,
      correctAnswer: 'true',
      explanation: 'El PDI EA-510 exige un chequeo al cerrar cada subfase.',
    },
    {
      ...base,
      id: '9e500000-0000-4000-8000-000000000014',
      type: 'fill_blank',
      position: 3,
      prompt: 'La maniobra que permite descender sin potencia se llama _____.',
      options: null,
      correctAnswer: 'autorrotación',
      explanation: 'Es la autorrotación.',
    },
    {
      ...base,
      id: '9e500000-0000-4000-8000-000000000015',
      type: 'multiple_choice',
      position: 4,
      prompt: 'Motor?',
      options: [
        { id: 'a', text: OPCION_LARGA },
        { id: 'b', text: 'Una opción breve' },
        { id: 'c', text: 'Otra opción breve' },
        { id: 'd', text: 'Una tercera opción breve' },
      ],
      correctAnswer: 'a',
      explanation: null,
    },
  ]
}

function cuestionarioDeImportacion(requestedCount: number, questionTypes: string[]) {
  return {
    id: ID_CUESTIONARIO_IMPORTACION,
    ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
    title: 'Cuestionario sin título',
    questionTypes,
    requestedCount,
    modelName: 'claude-opus-5',
    generationPromptVersion: 'v1',
    createdAt: CREADO,
    questions: preguntasDeImportacion(),
  }
}

function cuestionario(requestedCount: number, questionTypes: string[]) {
```

In `src/mocks/ia/cuestionarios.ts`, replace:

```ts
    if (cantidad === 20) await delay(3000)
    return HttpResponse.json(cuestionario(cantidad, tipos), { status: 201 })
```

with:

```ts
    if (cantidad === 20) await delay(3000)
    if (cantidad === CANTIDAD_IMPORTACION) {
      return HttpResponse.json(cuestionarioDeImportacion(cantidad, tipos), { status: 201 })
    }
    return HttpResponse.json(cuestionario(cantidad, tipos), { status: 201 })
```

In `src/mocks/ia/cuestionarios.ts`, replace:

```ts
  http.get(`${IA}/quizzes/:id`, ({ params }) => {
    if (String(params.id) !== ID_CUESTIONARIO) return noEncontrado(C8_CUESTIONARIO_NO_ENCONTRADO)
    return HttpResponse.json(cuestionario(3, ['multiple_choice', 'true_false', 'fill_blank']))
  }),
```

with:

```ts
  http.get(`${IA}/quizzes/:id`, ({ params }) => {
    if (String(params.id) === ID_CUESTIONARIO_IMPORTACION) {
      return HttpResponse.json(cuestionarioDeImportacion(CANTIDAD_IMPORTACION, ['multiple_choice']))
    }
    if (String(params.id) !== ID_CUESTIONARIO) return noEncontrado(C8_CUESTIONARIO_NO_ENCONTRADO)
    return HttpResponse.json(cuestionario(3, ['multiple_choice', 'true_false', 'fill_blank']))
  }),
```

The two `repeat` counts are exact and give the figures contract §9.4 fixes: `PROMPT_LARGO` is 473 literal characters plus `'.'.repeat(147)` = **620**, and `OPCION_LARGA` is 69 plus `'x'.repeat(171)` = **240**. The `Motor?` prompt is the 6-character one. Task 10's tests assert the 500 and 200 results, so a wrong count fails there rather than silently.

- [ ] **Step 4: Reuse M3's A5 text as E8**

In `src/lib/dominio/teoria.ts`, replace:

```ts
export { MARCADOR_COMPLETAR } from './aprendizaje'
```

with:

```ts
export { MARCADOR_COMPLETAR, TEXTO_GENERACION_RECHAZADA as TEXTO_GENERACION_RECHAZADA_E8 } from './aprendizaje'
```

- [ ] **Step 5: Extend the schema with the batch form**

In `src/features/preguntas/schemas.ts`, replace:

```ts
import type { CuerpoPregunta, PreguntaDetalle } from './api'
```

with:

```ts
import { MENSAJE_CANTIDAD, TIPOS_PREGUNTA as TIPOS_DE_IA } from '@/features/aprendizaje/schemas'
import type { CuerpoPregunta, PreguntaDetalle } from './api'
```

Append to `src/features/preguntas/schemas.ts`:

```ts
export const esquemaImportacion = z.object({
  documentos: z.array(z.string()).min(1, 'Elija al menos un documento.'),
  tipos: z.array(z.enum(TIPOS_DE_IA.map((tipo) => tipo.valor))).min(1, 'Elija al menos un tipo de pregunta.'),
  cantidad: z
    .string()
    .min(1, MENSAJE_CANTIDAD)
    .regex(/^\d{1,2}$/, MENSAJE_CANTIDAD)
    .refine((valor) => Number(valor) >= 2 && Number(valor) <= 20, MENSAJE_CANTIDAD),
  idMateria: z.string().min(1, 'La materia es obligatoria.'),
  dificultad: z.enum(DIFICULTADES.map((dificultad) => dificultad.valor)),
})

export type ValoresImportacion = z.input<typeof esquemaImportacion>

export const IMPORTACION_VACIA: ValoresImportacion = {
  documentos: [],
  tipos: ['multiple_choice'],
  cantidad: '5',
  idMateria: '',
  dificultad: 'MEDIA',
}
```

- [ ] **Step 6: Land the generation form**

Create `src/features/preguntas/components/formulario-importacion.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { generarCuestionario, type Cuestionario } from '@/features/aprendizaje/api'
import { mensajeDeError } from '@/features/aprendizaje/mensajes'
import { TIPOS_PREGUNTA as TIPOS_DE_IA } from '@/features/aprendizaje/schemas'
import { useDocumentosListos } from '@/features/aprendizaje/use-documentos-listos'
import { consultasMaterias } from '@/features/materias/api'
import { CanceladoError } from '@/lib/api/errors'
import { conLimiteDeTiempo } from '@/lib/api/http'
import {
  TEXTO_GENERACION_DEMORADA,
  TEXTO_GENERANDO_CUESTIONARIO,
  TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO,
} from '@/lib/dominio/aprendizaje'
import { DIFICULTADES, TEXTO_GENERACION_RECHAZADA_E8 } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import { esquemaImportacion, IMPORTACION_VACIA, type ValoresImportacion } from '../schemas'

export const LIMITE_DE_GENERACION = 120_000

type Props = { alGenerar: (cuestionario: Cuestionario, valores: ValoresImportacion) => void }

export function FormularioImportacion({ alGenerar }: Props) {
  const documentos = useDocumentosListos()
  const materias = useQuery(consultasMaterias.lista())
  const error = errorDePrimeraCarga(documentos)
  const formulario = useForm<ValoresImportacion>({
    resolver: zodResolver(esquemaImportacion),
    defaultValues: IMPORTACION_VACIA,
  })
  const { errors } = formulario.formState

  const generar = useMutation({
    mutationFn: (valores: ValoresImportacion) =>
      conLimiteDeTiempo(LIMITE_DE_GENERACION, (senal) =>
        generarCuestionario(
          {
            documentIds: valores.documentos,
            questionTypes: valores.tipos,
            questionCount: Number(valores.cantidad),
          },
          senal,
        ),
      ),
    onSuccess: (cuestionario) => alGenerar(cuestionario, formulario.getValues()),
  })

  if (error !== null) {
    return (
      <AvisoDeError
        titulo="No se pudieron cargar los documentos"
        error={error}
        alReintentar={() => void documentos.refetch()}
      />
    )
  }

  if (documentos.data === undefined || materias.data === undefined) {
    return <Skeleton className="h-40 w-full" aria-busy="true" />
  }

  if (documentos.data.length === 0) {
    return (
      <EmptyState
        titulo="No hay documentos listos"
        descripcion={TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO}
        accion={
          <Button variant="outline" asChild>
            <Link to="/aprendizaje">Ir a Documentos</Link>
          </Button>
        }
      />
    )
  }

  const demorada = generar.error instanceof CanceladoError

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => generar.mutate(valores))} className="grid gap-6">
      {generar.isPending && (
        <Alert>
          <AlertDescription>{TEXTO_GENERANDO_CUESTIONARIO}</AlertDescription>
        </Alert>
      )}
      {generar.error && !generar.isPending && (
        <Alert variant="destructive">
          <AlertDescription>
            {demorada ? TEXTO_GENERACION_DEMORADA : mensajeDeError(generar.error, TEXTO_GENERACION_RECHAZADA_E8)}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Documentos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={formulario.control}
            name="documentos"
            render={({ field }) => (
              <div role="group" aria-label="Documentos del cuestionario" className="grid gap-3 sm:grid-cols-2">
                {documentos.data.map((documento) => (
                  <div key={documento.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`importar-documento-${documento.id}`}
                      disabled={generar.isPending}
                      checked={field.value.includes(documento.id)}
                      onCheckedChange={(marcado) =>
                        field.onChange(
                          marcado === true
                            ? [...field.value, documento.id]
                            : field.value.filter((id) => id !== documento.id),
                        )
                      }
                    />
                    <Label htmlFor={`importar-documento-${documento.id}`} className="font-normal">
                      {documento.filename}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          />
          <FieldError className="mt-3" errors={[errors.documentos?.root ?? errors.documentos]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Preguntas del lote</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.tipos)}>
              <FieldLabel>Tipos de pregunta</FieldLabel>
              <Controller
                control={formulario.control}
                name="tipos"
                render={({ field }) => (
                  <div role="group" aria-label="Tipos de pregunta" className="grid gap-3">
                    {TIPOS_DE_IA.map((tipo) => (
                      <div key={tipo.valor} className="flex items-center gap-2">
                        <Checkbox
                          id={`importar-tipo-${tipo.valor}`}
                          disabled={generar.isPending}
                          checked={field.value.includes(tipo.valor)}
                          onCheckedChange={(marcado) =>
                            field.onChange(
                              marcado === true
                                ? [...field.value, tipo.valor]
                                : field.value.filter((valor) => valor !== tipo.valor),
                            )
                          }
                        />
                        <Label htmlFor={`importar-tipo-${tipo.valor}`} className="font-normal">
                          {tipo.etiqueta}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              />
              <FieldError errors={[errors.tipos?.root ?? errors.tipos]} />
            </Field>
            <Field data-invalid={Boolean(errors.cantidad)}>
              <FieldLabel htmlFor="importar-cantidad">Cantidad de preguntas</FieldLabel>
              <Input
                id="importar-cantidad"
                inputMode="numeric"
                disabled={generar.isPending}
                aria-invalid={Boolean(errors.cantidad)}
                {...formulario.register('cantidad')}
              />
              <FieldDescription>De 2 a 20 preguntas.</FieldDescription>
              <FieldError errors={[errors.cantidad]} />
            </Field>
            <Field data-invalid={Boolean(errors.idMateria)}>
              <FieldLabel htmlFor="importar-materia">Materia del lote</FieldLabel>
              <NativeSelect
                id="importar-materia"
                className="w-full"
                disabled={generar.isPending}
                aria-invalid={Boolean(errors.idMateria)}
                {...formulario.register('idMateria')}
              >
                <NativeSelectOption value="">Elija una materia</NativeSelectOption>
                {materias.data.map((materia) => (
                  <NativeSelectOption key={materia.id} value={materia.id}>
                    {materia.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Se puede cambiar por pregunta antes de importar.</FieldDescription>
              <FieldError errors={[errors.idMateria]} />
            </Field>
            <Field data-invalid={Boolean(errors.dificultad)}>
              <FieldLabel htmlFor="importar-dificultad">Dificultad del lote</FieldLabel>
              <NativeSelect
                id="importar-dificultad"
                className="w-full"
                disabled={generar.isPending}
                {...formulario.register('dificultad')}
              >
                {DIFICULTADES.map((dificultad) => (
                  <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                    {dificultad.etiqueta}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={generar.isPending}>
          {generar.isPending ? (
            'Generando…'
          ) : (
            <>
              <Sparkles aria-hidden />
              {demorada ? 'Reintentar' : 'Generar preguntas'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
```

Replace `src/features/preguntas/importar-page.tsx`:

```tsx
import { useState } from 'react'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Cuestionario } from '@/features/aprendizaje/api'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_REVISAR_IMPORTACION } from '@/lib/dominio/teoria'
import { FormularioImportacion } from './components/formulario-importacion'
import type { ValoresImportacion } from './schemas'

export function ImportarPreguntasPage() {
  const [generado, setGenerado] = useState<{ cuestionario: Cuestionario; valores: ValoresImportacion } | null>(null)

  return (
    <>
      <PageHeader titulo={PANTALLAS.importarPreguntas.titulo} descripcion={PANTALLAS.importarPreguntas.descripcion} />
      <AvisoDeTeoria accion="importarPreguntas" />
      {generado === null ? (
        <FormularioImportacion alGenerar={(cuestionario, valores) => setGenerado({ cuestionario, valores })} />
      ) : (
        <>
          <Alert>
            <AlertDescription>{TEXTO_REVISAR_IMPORTACION}</AlertDescription>
          </Alert>
          <ul aria-label="Preguntas generadas" className="grid gap-2">
            {generado.cuestionario.preguntas.map((pregunta) => (
              <li key={pregunta.id}>{pregunta.prompt}</li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/importar-page.test.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 8: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **722 tests**.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the ai generation form of importar desde ia"
```

---

### Task 10: Importar desde IA: the review table and the `lote` write (M4-3, M4-5) (CA-IMP-04..11)

**Files:**

- Create: `src/features/preguntas/importacion.ts`
- Test: `src/features/preguntas/importacion.test.ts`
- Create: `src/features/preguntas/components/tabla-de-importacion.tsx`
- Modify (full rewrite): `src/features/preguntas/importar-page.tsx`
- Test: `src/features/preguntas/tabla-de-importacion.test.tsx`

**Interfaces:**
- Consumes: `Pregunta` from `features/aprendizaje/api` (the AI shape), `importarPreguntas`, `rutaDeCampo`, `ConfirmDialog`, `Table`, `Textarea`, `ToggleGroup`.
- Produces: `filasDesdeIa`, `avisosDeFila`, `filaImportable`, `aCuerpoDeLote`, `recortar` — the whole field-by-field mapping of contract §6 — and `TablaDeImportacion`, the editable table with E4, its per-row avisos, the per-question materia and dificultad overrides, and the all-or-nothing write that names the offending row.

- [ ] **Step 1: Write the failing tests**

Create `src/features/preguntas/importacion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Pregunta } from '@/features/aprendizaje/api'
import { TEXTO_ALTERNATIVAS_REPETIDAS, TEXTO_ENUNCIADO_CORTO, TEXTO_ENUNCIADO_RECORTADO } from '@/lib/dominio/teoria'
import {
  aCuerpoDeLote,
  avisosDeFila,
  filaDesdeIa,
  filaImportable,
  filasDesdeIa,
  LARGO_ENUNCIADO,
  LARGO_RESPUESTA,
  recortar,
  TEXTO_REPETIDA_EN_LOTE,
  TEXTO_SIN_CORRECTA,
} from './importacion'

function pregunta(parcial: Partial<Pregunta>): Pregunta {
  return {
    id: 'p1',
    type: 'multiple_choice',
    position: 0,
    prompt: 'Un enunciado suficientemente largo para el banco.',
    options: [
      { id: 'a', text: 'Primera' },
      { id: 'b', text: 'Segunda' },
      { id: 'c', text: 'Tercera' },
      { id: 'd', text: 'Cuarta' },
    ],
    correctAnswer: 'a',
    explanation: null,
    sourceExcerpt: null,
    ...parcial,
  }
}

describe('contrato §6 mapeo de la importación', () => {
  it('CA-IMP-06 verdadero o falso se convierte en Verdadero y Falso con la correcta marcada', () => {
    const verdadero = filaDesdeIa(pregunta({ type: 'true_false', options: null, correctAnswer: 'true' }), '3', 'BAJA')
    expect(verdadero.tipoPregunta).toBe('VERDADERO_FALSO')
    expect(verdadero.alternativas).toEqual(['Verdadero', 'Falso'])
    expect(verdadero.correcta).toBe('0')
    const falso = filaDesdeIa(pregunta({ type: 'true_false', options: null, correctAnswer: 'false' }), '3', 'BAJA')
    expect(falso.correcta).toBe('1')
  })

  it('M4-5 completar deja una sola alternativa con la respuesta esperada', () => {
    const fila = filaDesdeIa(
      pregunta({ type: 'fill_blank', options: null, correctAnswer: 'autorrotación', prompt: 'Se llama _____.' }),
      '3',
      'ALTA',
    )
    expect(fila.tipoPregunta).toBe('COMPLETAR')
    expect(fila.alternativas).toEqual(['autorrotación'])
    expect(fila.correcta).toBe('0')
    expect(fila.dificultad).toBe('ALTA')
    expect(fila.idMateria).toBe('3')
  })

  it('CA-IMP-05 un enunciado de más de 500 llega recortado con E5 y bloquea la fila', () => {
    const fila = filaDesdeIa(pregunta({ prompt: 'a'.repeat(620) }), '3', 'MEDIA')
    expect(fila.enunciado).toHaveLength(LARGO_ENUNCIADO)
    expect(fila.recortado).toBe(true)
    expect(avisosDeFila(fila, [fila])).toContain(TEXTO_ENUNCIADO_RECORTADO)
    expect(filaImportable(fila, [fila])).toBe(false)
    const revisada = { ...fila, recortado: false }
    expect(filaImportable(revisada, [revisada])).toBe(true)
  })

  it('CA-IMP-05 un enunciado de menos de 10 muestra E26 y bloquea la fila', () => {
    const fila = filaDesdeIa(pregunta({ prompt: 'Motor?' }), '3', 'MEDIA')
    expect(avisosDeFila(fila, [fila])).toContain(TEXTO_ENUNCIADO_CORTO)
    expect(filaImportable(fila, [fila])).toBe(false)
  })

  it('CA-IMP-07 una alternativa de más de 200 se recorta sin aviso', () => {
    const fila = filaDesdeIa(
      pregunta({ options: [{ id: 'a', text: 'x'.repeat(240) }, { id: 'b', text: 'b' }, { id: 'c', text: 'c' }, { id: 'd', text: 'd' }] }),
      '3',
      'MEDIA',
    )
    expect(fila.alternativas[0]).toHaveLength(LARGO_RESPUESTA)
    expect(avisosDeFila(fila, [fila])).toEqual([])
    expect(recortar('corto', LARGO_RESPUESTA)).toBe('corto')
  })

  it('CA-IMP-07 alternativas repetidas muestran E6 y bloquean la fila', () => {
    const fila = filaDesdeIa(
      pregunta({ options: [{ id: 'a', text: 'Igual' }, { id: 'b', text: ' igual ' }, { id: 'c', text: 'c' }, { id: 'd', text: 'd' }] }),
      '3',
      'MEDIA',
    )
    expect(avisosDeFila(fila, [fila])).toContain(TEXTO_ALTERNATIVAS_REPETIDAS)
  })

  it('M4-5 una correcta que no empata con ninguna opción deja la fila sin marcar', () => {
    const fila = filaDesdeIa(pregunta({ correctAnswer: 'z' }), '3', 'MEDIA')
    expect(fila.correcta).toBe('')
    expect(avisosDeFila(fila, [fila])).toContain(TEXTO_SIN_CORRECTA)
  })

  it('CA-IMP-09 dos preguntas idénticas dentro del lote se señalan antes de enviar', () => {
    const filas = filasDesdeIa([pregunta({ id: 'p1' }), pregunta({ id: 'p2' })], '3', 'MEDIA')
    expect(avisosDeFila(filas[0]!, filas)).toEqual([])
    expect(avisosDeFila(filas[1]!, filas)).toContain(TEXTO_REPETIDA_EN_LOTE)
  })

  it('CA-IMP-08 el cuerpo del lote lleva la materia y la dificultad de cada fila', () => {
    const filas = filasDesdeIa([pregunta({})], '3', 'MEDIA')
    expect(aCuerpoDeLote([{ ...filas[0]!, idMateria: '6', dificultad: 'ALTA' }])).toEqual([
      {
        idMateria: 6,
        enunciado: 'Un enunciado suficientemente largo para el banco.',
        tipoPregunta: 'OPCION_MULTIPLE',
        dificultad: 'ALTA',
        explicacion: null,
        alternativas: [
          { respuesta: 'Primera', correcto: true },
          { respuesta: 'Segunda', correcto: false },
          { respuesta: 'Tercera', correcto: false },
          { respuesta: 'Cuarta', correcto: false },
        ],
      },
    ])
  })
})
```

Create `src/features/preguntas/tabla-de-importacion.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  TEXTO_ALTERNATIVAS_REPETIDAS,
  TEXTO_CONFIRMAR_IMPORTACION,
  TEXTO_ENUNCIADO_CORTO,
  TEXTO_ENUNCIADO_RECORTADO,
  TEXTO_REVISAR_IMPORTACION,
} from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const DOCUMENTO = 'PDI EA-510 Título III.pdf'

async function generarLote() {
  await iniciarComo('instructor.perez')
  const resultado = renderApp('/banco/importar')
  await screen.findByLabelText('Cantidad de preguntas')
  const { usuario } = resultado
  await usuario.click(screen.getByLabelText(DOCUMENTO))
  await usuario.selectOptions(screen.getByLabelText('Materia del lote'), 'Adoctrinamiento de Vuelo')
  await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
  await usuario.type(screen.getByLabelText('Cantidad de preguntas'), '12')
  await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
  await screen.findByRole('table', { name: 'Preguntas generadas' })
  return resultado
}

function filas(): HTMLElement[] {
  return within(screen.getByRole('table', { name: 'Preguntas generadas' })).getAllByRole('row').slice(1)
}

function fila(numero: number) {
  return within(filas()[numero - 1]!)
}

async function arreglarLasBloqueadas(usuario: UserEvent) {
  await usuario.clear(screen.getByLabelText('Enunciado de la pregunta 1'))
  await usuario.type(screen.getByLabelText('Enunciado de la pregunta 1'), 'Enunciado revisado por el instructor.')
  await usuario.clear(screen.getByLabelText('Alternativa 3 de la pregunta 2'))
  await usuario.type(screen.getByLabelText('Alternativa 3 de la pregunta 2'), 'El mecánico de línea')
  await usuario.clear(screen.getByLabelText('Enunciado de la pregunta 5'))
  await usuario.type(screen.getByLabelText('Enunciado de la pregunta 5'), '¿Qué componente genera la sustentación?')
}

describe('Revisión de las preguntas generadas', () => {
  it('CA-IMP-04 muestra E4, una fila editable por pregunta y nada se guarda todavía', async () => {
    await generarLote()
    expect(screen.getByText(TEXTO_REVISAR_IMPORTACION)).toBeInTheDocument()
    expect(filas()).toHaveLength(5)
    expect(screen.getByLabelText('Enunciado de la pregunta 3')).toHaveValue(
      'La última misión de cada subfase es un chequeo.',
    )
    expect(fila(3).getByText('Verdadero o falso')).toBeInTheDocument()
    expect(screen.getByText('Elegidas: 5 de 5.')).toBeInTheDocument()
  })

  it('CA-IMP-05 el enunciado largo llega recortado con E5 y el corto con E26', async () => {
    const { usuario } = await generarLote()
    const largo = screen.getByLabelText('Enunciado de la pregunta 1') as HTMLTextAreaElement
    expect(largo.value).toHaveLength(500)
    expect(largo.value.startsWith('¿Cuál de las siguientes afirmaciones')).toBe(true)
    expect(fila(1).getByText(TEXTO_ENUNCIADO_RECORTADO)).toBeInTheDocument()
    expect(screen.getByLabelText('Enunciado de la pregunta 5')).toHaveValue('Motor?')
    expect(fila(5).getByText(TEXTO_ENUNCIADO_CORTO)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar al banco' })).toBeDisabled()
    await usuario.clear(screen.getByLabelText('Enunciado de la pregunta 1'))
    await usuario.type(screen.getByLabelText('Enunciado de la pregunta 1'), 'Enunciado revisado por el instructor.')
    expect(fila(1).queryByText(TEXTO_ENUNCIADO_RECORTADO)).not.toBeInTheDocument()
  })

  it('CA-IMP-06 la pregunta de verdadero o falso trae sus dos alternativas con la correcta marcada', async () => {
    await generarLote()
    expect(fila(3).getByText('Verdadero')).toBeInTheDocument()
    expect(fila(3).getByText('Falso')).toBeInTheDocument()
    expect(fila(3).getByRole('radio', { name: 'Alternativa 1 de la pregunta 3 es la correcta' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('CA-IMP-07 las alternativas repetidas muestran E6 y una opción larga se recorta sin aviso', async () => {
    const { usuario } = await generarLote()
    expect(fila(2).getByText(TEXTO_ALTERNATIVAS_REPETIDAS)).toBeInTheDocument()
    expect((screen.getByLabelText('Alternativa 1 de la pregunta 5') as HTMLInputElement).value).toHaveLength(200)
    expect(fila(5).queryByText(TEXTO_ALTERNATIVAS_REPETIDAS)).not.toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Alternativa 3 de la pregunta 2'))
    await usuario.type(screen.getByLabelText('Alternativa 3 de la pregunta 2'), 'El mecánico de línea')
    expect(fila(2).queryByText(TEXTO_ALTERNATIVAS_REPETIDAS)).not.toBeInTheDocument()
  })

  it('CA-IMP-04 CA-IMP-11 quitar filas cambia el total y sin elegidas Importar está deshabilitado', async () => {
    const { usuario } = await generarLote()
    await usuario.click(fila(1).getByRole('button', { name: 'Quitar de la importación' }))
    expect(screen.getByText('Elegidas: 4 de 5.')).toBeInTheDocument()
    for (const numero of [2, 3, 4, 5]) {
      await usuario.click(screen.getByLabelText(`Importar la pregunta ${numero}`))
    }
    expect(screen.getByText('Elegidas: 0 de 5.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar al banco' })).toBeDisabled()
  })

  it('CA-IMP-08 CA-IMP-09 CA-IMP-10 importa con E7, la materia por pregunta y vuelve al banco', async () => {
    const { usuario, router } = await generarLote()
    await arreglarLasBloqueadas(usuario)
    await usuario.selectOptions(screen.getByLabelText('Materia de la pregunta 4'), 'Procedimientos de Emergencias')
    await usuario.selectOptions(screen.getByLabelText('Dificultad de la pregunta 4'), 'Alta')
    await usuario.click(screen.getByRole('button', { name: 'Importar al banco' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText(TEXTO_CONFIRMAR_IMPORTACION)).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Importar' }))
    expect(await screen.findByText('Preguntas guardadas con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/banco')
    await usuario.selectOptions(await screen.findByLabelText('Materia'), 'Procedimientos de Emergencias')
    expect(await screen.findByText('Página 1 de 1 · 7 registros')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Origen'), 'IA')
    expect(await screen.findByText('Página 1 de 1 · 1 registro')).toBeInTheDocument()
  })

  it('CA-IMP-09 si el servidor rechaza una fila ninguna queda en el banco y el error la señala', async () => {
    server.use(
      http.post(`${API}/api/preguntas/lote`, () =>
        HttpResponse.json(["'preguntas[2].enunciado': El enunciado debe tener entre 10 y 500 caracteres."], {
          status: 400,
        }),
      ),
    )
    const { usuario, router } = await generarLote()
    await arreglarLasBloqueadas(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Importar al banco' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Importar' }))
    expect(await fila(3).findByText('El enunciado debe tener entre 10 y 500 caracteres.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/banco/importar')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/importacion.test.ts src/features/preguntas/tabla-de-importacion.test.tsx
```

Expected: FAIL — `Failed to resolve import "./importacion"`, and `tabla-de-importacion.test.tsx` times out on `screen.findByRole('table', { name: 'Preguntas generadas' })` because Task 9 only lists the prompts.

- [ ] **Step 3: Land the contract §6 mapping**

Create `src/features/preguntas/importacion.ts`:

```ts
import type { Pregunta } from '@/features/aprendizaje/api'
import {
  MARCADOR_COMPLETAR,
  TEXTO_ALTERNATIVAS_REPETIDAS,
  TEXTO_ENUNCIADO_CORTO,
  TEXTO_ENUNCIADO_RECORTADO,
  TEXTOS_VERDADERO_FALSO,
  type Dificultad,
  type TipoPregunta,
} from '@/lib/dominio/teoria'
import type { CuerpoPregunta } from './api'

export const LARGO_ENUNCIADO = 500
export const LARGO_RESPUESTA = 200

export const TEXTO_SIN_CORRECTA = 'El modelo no marcó ninguna alternativa como correcta: elija la correcta.'
export const TEXTO_REPETIDA_EN_LOTE = 'La pregunta está repetida en este lote: corrija el enunciado o quítela.'
export const TEXTO_FALTA_MARCADOR = `El enunciado de una pregunta de completar debe incluir el marcador ${MARCADOR_COMPLETAR}.`

export type FilaImportacion = {
  id: string
  incluida: boolean
  enunciado: string
  tipoPregunta: TipoPregunta
  dificultad: Dificultad
  idMateria: string
  explicacion: string
  alternativas: string[]
  correcta: string
  recortado: boolean
}

export function recortar(valor: string, largo: number): string {
  return valor.length > largo ? valor.slice(0, largo) : valor
}

function normalizar(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function tipoDesdeIa(tipo: Pregunta['type']): TipoPregunta {
  if (tipo === 'true_false') return 'VERDADERO_FALSO'
  return tipo === 'fill_blank' ? 'COMPLETAR' : 'OPCION_MULTIPLE'
}

function alternativasDesdeIa(pregunta: Pregunta): { alternativas: string[]; correcta: string } {
  if (pregunta.type === 'true_false') {
    return {
      alternativas: [...TEXTOS_VERDADERO_FALSO],
      correcta: pregunta.correctAnswer === 'true' ? '0' : '1',
    }
  }
  if (pregunta.type === 'fill_blank') {
    return { alternativas: [recortar(pregunta.correctAnswer, LARGO_RESPUESTA)], correcta: '0' }
  }
  const opciones = pregunta.options ?? []
  const indice = opciones.findIndex((opcion) => opcion.id === pregunta.correctAnswer)
  return {
    alternativas: opciones.map((opcion) => recortar(opcion.text, LARGO_RESPUESTA)),
    correcta: indice < 0 ? '' : String(indice),
  }
}

export function filaDesdeIa(pregunta: Pregunta, idMateria: string, dificultad: Dificultad): FilaImportacion {
  const { alternativas, correcta } = alternativasDesdeIa(pregunta)
  return {
    id: pregunta.id,
    incluida: true,
    enunciado: recortar(pregunta.prompt, LARGO_ENUNCIADO),
    tipoPregunta: tipoDesdeIa(pregunta.type),
    dificultad,
    idMateria,
    explicacion: pregunta.explanation ?? '',
    alternativas,
    correcta,
    recortado: pregunta.prompt.length > LARGO_ENUNCIADO,
  }
}

export function filasDesdeIa(
  preguntas: readonly Pregunta[],
  idMateria: string,
  dificultad: Dificultad,
): FilaImportacion[] {
  return preguntas.map((pregunta) => filaDesdeIa(pregunta, idMateria, dificultad))
}

export function avisosDeFila(fila: FilaImportacion, todas: readonly FilaImportacion[]): string[] {
  const avisos: string[] = []
  if (fila.recortado) avisos.push(TEXTO_ENUNCIADO_RECORTADO)
  if (fila.enunciado.trim().length < 10) avisos.push(TEXTO_ENUNCIADO_CORTO)
  if (fila.tipoPregunta === 'COMPLETAR' && !fila.enunciado.includes(MARCADOR_COMPLETAR)) avisos.push(TEXTO_FALTA_MARCADOR)
  const textos = fila.alternativas.map(normalizar)
  if (textos.some((texto) => texto === '') || new Set(textos).size !== textos.length) {
    avisos.push(TEXTO_ALTERNATIVAS_REPETIDAS)
  }
  if (fila.correcta === '') avisos.push(TEXTO_SIN_CORRECTA)
  const clave = `${normalizar(fila.enunciado)}|${fila.tipoPregunta}`
  const primera = todas.find((otra) => `${normalizar(otra.enunciado)}|${otra.tipoPregunta}` === clave)
  if (primera !== undefined && primera.id !== fila.id) avisos.push(TEXTO_REPETIDA_EN_LOTE)
  return avisos
}

export function filaImportable(fila: FilaImportacion, todas: readonly FilaImportacion[]): boolean {
  return avisosDeFila(fila, todas).length === 0
}

export function aCuerpoDeLote(filas: readonly FilaImportacion[]): Omit<CuerpoPregunta, 'codInstructor'>[] {
  return filas.map((fila) => ({
    idMateria: Number(fila.idMateria),
    enunciado: fila.enunciado.trim(),
    tipoPregunta: fila.tipoPregunta,
    dificultad: fila.dificultad,
    explicacion: fila.explicacion.trim() === '' ? null : fila.explicacion.trim(),
    alternativas: fila.alternativas.map((respuesta, indice) => ({
      respuesta: respuesta.trim(),
      correcto: String(indice) === fila.correcta,
    })),
  }))
}
```

`recortado` is what keeps an E5 row unimportable until it is reviewed: editing the enunciado clears the flag, which is the only way the screen can tell "revised" from "still the model's 620 characters".

- [ ] **Step 4: Land the review table**

Create `src/features/preguntas/components/tabla-de-importacion.tsx`:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Upload, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { consultasMaterias } from '@/features/materias/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { useSesion } from '@/lib/auth/use-sesion'
import {
  DIFICULTADES,
  etiquetaDeTipoPregunta,
  TEXTO_CONFIRMAR_IMPORTACION,
  TEXTO_REVISAR_IMPORTACION,
} from '@/lib/dominio/teoria'
import { rutaDeCampo } from '@/lib/formularios'
import { clavesPreguntas, importarPreguntas } from '../api'
import { aCuerpoDeLote, avisosDeFila, filaImportable, type FilaImportacion } from '../importacion'

type Props = { filas: FilaImportacion[] }

export function TablaDeImportacion({ filas: iniciales }: Props) {
  const [filas, setFilas] = useState(iniciales)
  const [erroresPorFila, setErroresPorFila] = useState<Record<string, string>>({})
  const materias = useQuery(consultasMaterias.lista())
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const sesion = useSesion()
  const elegidas = filas.filter((fila) => fila.incluida)
  const importables = elegidas.every((fila) => filaImportable(fila, filas))

  const importar = useMutation({
    mutationFn: () =>
      importarPreguntas({ codInstructor: sesion?.codPersona ?? '', preguntas: aCuerpoDeLote(elegidas) }),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPreguntas.todo })
      await navegar({ to: '/banco' })
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        toast.error(MENSAJE_GENERICO)
        return
      }
      const porFila: Record<string, string> = {}
      for (const [campo, mensaje] of Object.entries(error.erroresDeCampo)) {
        const indice = Number(rutaDeCampo(campo).split('.')[1])
        const fila = elegidas[indice]
        if (fila) porFila[fila.id] = mensaje
      }
      setErroresPorFila(porFila)
      toast.error(error.message)
    },
  })

  function actualizar(id: string, cambios: Partial<FilaImportacion>) {
    setFilas((previas) => previas.map((fila) => (fila.id === id ? { ...fila, ...cambios } : fila)))
    setErroresPorFila((previos) => ({ ...previos, [id]: '' }))
  }

  return (
    <>
      <Alert>
        <AlertDescription>{TEXTO_REVISAR_IMPORTACION}</AlertDescription>
      </Alert>
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label="Preguntas generadas">
          <TableHeader>
            <TableRow>
              <TableHead>Importar</TableHead>
              <TableHead>Enunciado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Dificultad</TableHead>
              <TableHead>Alternativas</TableHead>
              <TableHead>Revisión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila, indice) => {
              const numero = indice + 1
              const avisos = avisosDeFila(fila, filas)
              const delServidor = erroresPorFila[fila.id]
              return (
                <TableRow key={fila.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Importar la pregunta ${numero}`}
                      checked={fila.incluida}
                      onCheckedChange={(marcado) => actualizar(fila.id, { incluida: marcado === true })}
                    />
                  </TableCell>
                  <TableCell className="min-w-72">
                    <Textarea
                      aria-label={`Enunciado de la pregunta ${numero}`}
                      value={fila.enunciado}
                      onChange={(evento) => actualizar(fila.id, { enunciado: evento.target.value, recortado: false })}
                    />
                  </TableCell>
                  <TableCell>{etiquetaDeTipoPregunta(fila.tipoPregunta)}</TableCell>
                  <TableCell>
                    <NativeSelect
                      aria-label={`Materia de la pregunta ${numero}`}
                      className="w-full"
                      value={fila.idMateria}
                      onChange={(evento) => actualizar(fila.id, { idMateria: evento.target.value })}
                    >
                      <NativeSelectOption value="">Elija una materia</NativeSelectOption>
                      {(materias.data ?? []).map((materia) => (
                        <NativeSelectOption key={materia.id} value={materia.id}>
                          {materia.nombre}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      aria-label={`Dificultad de la pregunta ${numero}`}
                      className="w-full"
                      value={fila.dificultad}
                      onChange={(evento) => actualizar(fila.id, { dificultad: evento.target.value as never })}
                    >
                      {DIFICULTADES.map((dificultad) => (
                        <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                          {dificultad.etiqueta}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="min-w-64">
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      className="grid gap-2"
                      aria-label={`Alternativa correcta de la pregunta ${numero}`}
                      value={fila.correcta}
                      onValueChange={(valor) => valor !== '' && actualizar(fila.id, { correcta: valor })}
                    >
                      {fila.alternativas.map((respuesta, posicion) => (
                        <div key={posicion} className="flex items-center gap-2">
                          <ToggleGroupItem
                            value={String(posicion)}
                            aria-label={`Alternativa ${posicion + 1} de la pregunta ${numero} es la correcta`}
                          >
                            Correcta
                          </ToggleGroupItem>
                          {fila.tipoPregunta === 'VERDADERO_FALSO' ? (
                            <span>{respuesta}</span>
                          ) : (
                            <Input
                              aria-label={`Alternativa ${posicion + 1} de la pregunta ${numero}`}
                              value={respuesta}
                              onChange={(evento) =>
                                actualizar(fila.id, {
                                  alternativas: fila.alternativas.map((texto, otra) =>
                                    otra === posicion ? evento.target.value : texto,
                                  ),
                                })
                              }
                            />
                          )}
                        </div>
                      ))}
                    </ToggleGroup>
                  </TableCell>
                  <TableCell className="min-w-64">
                    <div className="grid gap-1 text-sm">
                      {avisos.map((aviso) => (
                        <p key={aviso}>{aviso}</p>
                      ))}
                      {delServidor !== undefined && delServidor !== '' && <p>{delServidor}</p>}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        onClick={() => actualizar(fila.id, { incluida: false })}
                      >
                        <X aria-hidden />
                        Quitar de la importación
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          Elegidas: {elegidas.length} de {filas.length}.
        </p>
        <ConfirmDialog
          disparador={
            <Button type="button" disabled={elegidas.length === 0 || !importables || importar.isPending}>
              <Upload aria-hidden />
              Importar al banco
            </Button>
          }
          titulo="¿Importar las preguntas elegidas?"
          descripcion={TEXTO_CONFIRMAR_IMPORTACION}
          confirmar="Importar"
          alConfirmar={() => importar.mutate()}
        />
      </div>
    </>
  )
}
```

Replace `src/features/preguntas/importar-page.tsx`:

```tsx
import { useState } from 'react'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { FormularioImportacion } from './components/formulario-importacion'
import { TablaDeImportacion } from './components/tabla-de-importacion'
import { filasDesdeIa, type FilaImportacion } from './importacion'

export function ImportarPreguntasPage() {
  const [filas, setFilas] = useState<FilaImportacion[] | null>(null)

  return (
    <>
      <PageHeader titulo={PANTALLAS.importarPreguntas.titulo} descripcion={PANTALLAS.importarPreguntas.descripcion} />
      <AvisoDeTeoria accion="importarPreguntas" />
      {filas === null ? (
        <FormularioImportacion
          alGenerar={(cuestionario, valores) =>
            setFilas(filasDesdeIa(cuestionario.preguntas, valores.idMateria, valores.dificultad))
          }
        />
      ) : (
        <TablaDeImportacion filas={filas} />
      )}
    </>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/preguntas/importacion.test.ts src/features/preguntas/tabla-de-importacion.test.tsx
```

Expected: PASS, 16 tests (9 + 7).

- [ ] **Step 6: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **738 tests**.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the review table and the lote write of importar desde ia"
```

---

### Task 11: Turnos teóricos: the list, its filters, its URL state and Eliminar (CA-TUT-01, CA-TUT-02, CA-TUT-10, CA-TUT-11, CA-TUT-13, CA-TUT-14)

**Files:**

- Create: `src/features/turnos-teoricos/components/eliminar-turno-teorico.tsx`
- Create: `src/features/turnos-teoricos/columnas.tsx`
- Modify (full rewrite): `src/features/turnos-teoricos/turnos-teoricos-page.tsx`
- Test: `src/features/turnos-teoricos/turnos-teoricos-page.test.tsx`

**Interfaces:**
- Consumes: `consultasTurnosTeoricos.{lista,grupos}`, `consultasMaterias.lista`, `esquemaBusquedaTurnosTeoricos`, `StatusBadge` with the `turnoTeorico` vocabulary, `ConfirmDialog`, `accionDisponible('programarTurnoTeorico')`.
- Produces: `COLUMNAS_TURNOS_TEORICOS` (+ `…_CON_ACCIONES`), where a row whose window has started shows **E10** instead of Modificar and Eliminar; `EliminarTurnoTeorico({ id, nombre, alEliminar? })`, reused by the detail in Task 13; and a `TurnosTeoricosPage` whose six filters, page and sort live only in the URL, with **E25** as its empty state.

- [ ] **Step 1: Write the failing tests**

Create `src/features/turnos-teoricos/turnos-teoricos-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_SIN_TURNOS_TEORICOS, TEXTO_TEORIA_SOLO_MOCK, TEXTO_VENTANA_COMENZADA } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { D7_VENTANA_COMENZADA } from '@/mocks/sigeda/turnos-teoricos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirTurnos(ruta = '/teoria/turnos') {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(ruta)
  await screen.findByText(/registro/)
  return resultado
}

function filas() {
  return within(screen.getByRole('table', { name: 'Turnos teóricos programados' })).getAllByRole('row').slice(1)
}

describe('Turnos teóricos', () => {
  it('CA-TUT-01 muestra nombre, materia, tipo, grupo, fecha, horario, estado y cuántos rindieron', async () => {
    await abrirTurnos()
    const tabla = within(screen.getByRole('table', { name: 'Turnos teóricos programados' }))
    for (const columna of ['Nombre', 'Materia', 'Tipo de examen', 'Grupo', 'Fecha', 'Horario', 'Estado', 'Rindieron']) {
      expect(tabla.getByText(columna)).toBeInTheDocument()
    }
    expect(filas()).toHaveLength(5)
    expect(screen.getByText('Página 1 de 1 · 5 registros')).toBeInTheDocument()
    const primera = within(filas()[0]!)
    expect(primera.getByRole('link', { name: 'Mensual Adoctrinamiento de Vuelo' })).toHaveAttribute(
      'href',
      '/teoria/turnos/1',
    )
    expect(primera.getByText('Mensual')).toBeInTheDocument()
    expect(primera.getByText('Grupo 3')).toBeInTheDocument()
    expect(primera.getByText('08:00–09:00')).toBeInTheDocument()
    expect(primera.getByText('Finalizado')).toBeInTheDocument()
    expect(primera.getByText('2 de 2')).toBeInTheDocument()
  })

  it('CA-TUT-02 filtra por grupo, materia, estado, tipo y rango de fechas y todo viaja en la URL', async () => {
    const { router, usuario } = await abrirTurnos()
    await usuario.selectOptions(screen.getByLabelText('Grupo'), 'Grupo 3')
    await screen.findByText('Página 1 de 1 · 3 registros')
    expect(router.state.location.search).toMatchObject({ idGrupo: 3 })
    await usuario.selectOptions(screen.getByLabelText('Estado'), 'Programado')
    await screen.findByText('Página 1 de 1 · 2 registros')
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    await screen.findByText('Página 1 de 1 · 1 registro')
    expect(router.state.location.search).toMatchObject({ idGrupo: 3, estado: 'PROGRAMADO', tipoExamen: 'SUBSANACION' })
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await screen.findByText('Página 1 de 1 · 5 registros')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Procedimientos de Emergencias')
    await screen.findByText('Página 1 de 1 · 1 registro')
  })

  it('CA-TUT-02 sin turnos muestra E25 y una URL mal escrita vuelve a los valores por defecto', async () => {
    server.use(
      http.get(`${API}/api/turnos-teoricos`, () =>
        HttpResponse.text('No existen turnos teóricos disponibles.', { status: 404 }),
      ),
    )
    await iniciarComo('instructor.perez')
    const { router } = renderApp('/teoria/turnos?page=-1&estado=CERRADO&size=0')
    expect(await screen.findByText(TEXTO_SIN_TURNOS_TEORICOS)).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ page: 0, size: 10, direction: 'ASC' })
  })

  it('CA-TUT-01 el orden lo resuelve el servidor y viaja en la URL', async () => {
    const { router, usuario } = await abrirTurnos()
    await usuario.click(screen.getByRole('button', { name: 'Nombre' }))
    await screen.findByText('Página 1 de 1 · 5 registros')
    expect(router.state.location.search).toMatchObject({ property: 'nombre', direction: 'ASC' })
    expect(within(filas()[0]!).getByRole('link', { name: 'Mensual Adoctrinamiento de Vuelo' })).toBeInTheDocument()
  })

  it('CA-TUT-10 CA-TUT-11 Modificar y Eliminar solo están en un turno programado', async () => {
    await abrirTurnos()
    expect(within(filas()[0]!).getByText(TEXTO_VENTANA_COMENZADA)).toBeInTheDocument()
    expect(within(filas()[0]!).queryByRole('link', { name: /Modificar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modificar Quincenal Límites de Operación' })).toHaveAttribute(
      'href',
      '/teoria/turnos/4/editar',
    )
    expect(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' })).toBeEnabled()
  })

  it('CA-TUT-11 eliminar pide confirmación y quita el turno de la lista', async () => {
    const { usuario } = await abrirTurnos()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText('¿Eliminar el turno teórico?')).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Turno teórico eliminado con éxito.')).toBeInTheDocument()
    expect(await screen.findByText('Página 1 de 1 · 4 registros')).toBeInTheDocument()
  })

  it('CA-TUT-11 una eliminación que el servidor rechaza muestra D7', async () => {
    server.use(
      http.delete(`${API}/api/turnos-teoricos/:id`, () => HttpResponse.text(D7_VENTANA_COMENZADA, { status: 409 })),
    )
    const { usuario } = await abrirTurnos()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText(D7_VENTANA_COMENZADA)).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1 · 5 registros')).toBeInTheDocument()
  })

  it('CA-TUT-13 un fallo en la primera carga de la lista ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos`, () => HttpResponse.error()))
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/teoria/turnos')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Turnos teóricos programados' })).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(/registro/)).toBeInTheDocument()
  })

  it('CA-TUT-13 un fallo del catálogo de grupos avisa bajo su selector sin bloquear la pantalla', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos/grupos`, () => HttpResponse.error()))
    await abrirTurnos()
    expect(await screen.findByText('No se pudieron cargar los grupos.')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Turnos teóricos programados' })).toBeInTheDocument()
  })

  it('CA-TUT-14 fuera del modo mock y sin la dependencia 6 muestra E1 y deshabilita Registrar', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirTurnos()
    expect(screen.getByText(TEXTO_TEORIA_SOLO_MOCK)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar turno teórico' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos-teoricos/turnos-teoricos-page.test.tsx
```

Expected: FAIL — every test times out on `screen.findByText(/registro/)`, because the skeleton page of Task 5 renders only its header and its E1 notice.

- [ ] **Step 3: Land the delete action and the columns**

Create `src/features/turnos-teoricos/components/eliminar-turno-teorico.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { clavesTurnosTeoricos, eliminarTurnoTeorico } from '../api'

type Props = { id: number; nombre: string; alEliminar?: () => void }

export function EliminarTurnoTeorico({ id, nombre, alEliminar }: Props) {
  const queryClient = useQueryClient()

  const eliminar = useMutation({
    mutationFn: () => eliminarTurnoTeorico(id),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesTurnosTeoricos.todo })
      alEliminar?.()
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <ConfirmDialog
      disparador={
        <Button variant="destructive" size="sm" disabled={eliminar.isPending} aria-label={`Eliminar ${nombre}`}>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
      }
      titulo="¿Eliminar el turno teórico?"
      descripcion={`Se eliminará «${nombre}» y sus preguntas. Esta acción no se puede deshacer.`}
      confirmar="Eliminar"
      destructivo
      alConfirmar={() => eliminar.mutate()}
    />
  )
}
```

Create `src/features/turnos-teoricos/columnas.tsx`:

```tsx
import { Pencil } from 'lucide-react'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { etiquetaDeTipoExamen, TEXTO_VENTANA_COMENZADA } from '@/lib/dominio/teoria'
import { formatearFecha } from '@/lib/formato'
import type { TurnoTeoricoFila } from './api'
import { EliminarTurnoTeorico } from './components/eliminar-turno-teorico'

const ayudante = ayudanteDeColumnas<TurnoTeoricoFila>()

export const COLUMNAS_TURNOS_TEORICOS = ayudante.columns([
  ayudante.accessor('nombre', {
    header: 'Nombre',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/teoria/turnos/$id" params={{ id: String(contexto.row.original.id) }}>
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('materia', { header: 'Materia', enableSorting: true }),
  ayudante.accessor('tipoExamen', { header: 'Tipo de examen', cell: (contexto) => etiquetaDeTipoExamen(contexto.getValue()) }),
  ayudante.accessor('grupo', { header: 'Grupo', enableSorting: true }),
  ayudante.accessor('fechaExamen', {
    header: 'Fecha',
    enableSorting: true,
    cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
  }),
  ayudante.display({
    id: 'horario',
    header: 'Horario',
    cell: (contexto) => (
      <span className="tabular-nums">
        {contexto.row.original.horaInicio}–{contexto.row.original.horaFin}
      </span>
    ),
  }),
  ayudante.accessor('estado', {
    header: 'Estado',
    cell: (contexto) => <StatusBadge vocabulario="turnoTeorico" valor={contexto.getValue()} />,
  }),
  ayudante.display({
    id: 'rindieron',
    header: 'Rindieron',
    cell: (contexto) => (
      <span className="tabular-nums">
        {contexto.row.original.rindieron} de {contexto.row.original.cantAlumnos}
      </span>
    ),
  }),
])

const acciones = ayudante.display({
  id: 'acciones',
  header: () => <span className="sr-only">Acciones</span>,
  cell: (contexto) => {
    const turno = contexto.row.original
    if (turno.estado !== 'PROGRAMADO') return <p className="text-xs text-muted-foreground">{TEXTO_VENTANA_COMENZADA}</p>
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" asChild>
          <Enlace to="/teoria/turnos/$id/editar" params={{ id: String(turno.id) }} aria-label={`Modificar ${turno.nombre}`}>
            <Pencil aria-hidden />
            Modificar
          </Enlace>
        </Button>
        <EliminarTurnoTeorico id={turno.id} nombre={turno.nombre} />
      </div>
    )
  },
})

export const COLUMNAS_TURNOS_TEORICOS_CON_ACCIONES = ayudante.columns([...COLUMNAS_TURNOS_TEORICOS, acciones])
```

- [ ] **Step 4: Land the list with its filters**

Replace `src/features/turnos-teoricos/turnos-teoricos-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CalendarPlus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasMaterias } from '@/features/materias/api'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { ESTADOS_TURNO, TEXTO_SIN_TURNOS_TEORICOS, TIPOS_EXAMEN } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import { termino } from '@/lib/dominio/vocabulario'
import { consultasTurnosTeoricos } from './api'
import { COLUMNAS_TURNOS_TEORICOS, COLUMNAS_TURNOS_TEORICOS_CON_ACCIONES } from './columnas'
import type { BusquedaTurnosTeoricos } from './schemas'

const ruta = getRouteApi('/_app/teoria/turnos/')

function AccionRegistrar() {
  if (!accionDisponible('programarTurnoTeorico')) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button disabled>
          <CalendarPlus aria-hidden />
          Registrar turno teórico
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }
  return (
    <Button asChild>
      <Link to="/teoria/turnos/nuevo">
        <CalendarPlus aria-hidden />
        Registrar turno teórico
      </Link>
    </Button>
  )
}

export function TurnosTeoricosPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const sesion = useSesion()
  const materias = useQuery(consultasMaterias.lista())
  const grupos = useQuery(consultasTurnosTeoricos.grupos(sesion?.codPersona ?? null, 'PDI'))
  const turnos = useQuery(consultasTurnosTeoricos.lista(busqueda))
  const error = errorDePrimeraCarga(turnos)
  const puedeProgramar = accionDisponible('programarTurnoTeorico')

  function cambiar(cambios: Partial<BusquedaTurnosTeoricos>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const hayFiltros =
    busqueda.idGrupo !== undefined ||
    busqueda.idMateria !== undefined ||
    busqueda.estado !== undefined ||
    busqueda.tipoExamen !== undefined ||
    busqueda.fechaPre !== undefined ||
    busqueda.fechaPost !== undefined

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.turnosTeoricos.titulo}
        descripcion={PANTALLAS.turnosTeoricos.descripcion}
        acciones={<AccionRegistrar />}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
      <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:items-end">
        <Field>
          <FieldLabel htmlFor="filtro-grupo">Grupo</FieldLabel>
          <NativeSelect
            id="filtro-grupo"
            className="w-full"
            value={busqueda.idGrupo ?? ''}
            onChange={(evento) => cambiar({ idGrupo: evento.target.value === '' ? undefined : Number(evento.target.value) })}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {(grupos.data ?? []).map((grupo) => (
              <NativeSelectOption key={grupo.id} value={grupo.id}>
                {grupo.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(grupos) !== null && <FieldError>No se pudieron cargar los grupos.</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-materia">Materia</FieldLabel>
          <NativeSelect
            id="filtro-materia"
            className="w-full"
            value={busqueda.idMateria ?? ''}
            onChange={(evento) =>
              cambiar({ idMateria: evento.target.value === '' ? undefined : Number(evento.target.value) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {(materias.data ?? []).map((materia) => (
              <NativeSelectOption key={materia.id} value={materia.id}>
                {materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(materias) !== null && <FieldError>No se pudieron cargar las materias.</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-estado">Estado</FieldLabel>
          <NativeSelect
            id="filtro-estado"
            className="w-full"
            value={busqueda.estado ?? ''}
            onChange={(evento) => cambiar({ estado: evento.target.value === '' ? undefined : (evento.target.value as never) })}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {ESTADOS_TURNO.map((estado) => (
              <NativeSelectOption key={estado} value={estado}>
                {termino('turnoTeorico', estado).etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-tipo-examen">Tipo de examen</FieldLabel>
          <NativeSelect
            id="filtro-tipo-examen"
            className="w-full"
            value={busqueda.tipoExamen ?? ''}
            onChange={(evento) =>
              cambiar({ tipoExamen: evento.target.value === '' ? undefined : (evento.target.value as never) })
            }
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {TIPOS_EXAMEN.map((tipo) => (
              <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-desde">Desde</FieldLabel>
          <Input
            id="filtro-desde"
            type="date"
            value={busqueda.fechaPre ?? ''}
            onChange={(evento) => cambiar({ fechaPre: evento.target.value || undefined })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-hasta">Hasta</FieldLabel>
          <Input
            id="filtro-hasta"
            type="date"
            value={busqueda.fechaPost ?? ''}
            onChange={(evento) => cambiar({ fechaPost: evento.target.value || undefined })}
          />
        </Field>
        <Button
          variant="ghost"
          disabled={!hayFiltros}
          onClick={() =>
            cambiar({
              idGrupo: undefined,
              idMateria: undefined,
              estado: undefined,
              tipoExamen: undefined,
              fechaPre: undefined,
              fechaPost: undefined,
            })
          }
        >
          Limpiar filtros
        </Button>
      </section>
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void turnos.refetch()} />
      ) : (
        <DataTable
          etiqueta="Turnos teóricos programados"
          columnas={puedeProgramar ? COLUMNAS_TURNOS_TEORICOS_CON_ACCIONES : COLUMNAS_TURNOS_TEORICOS}
          pagina={turnos.data}
          cargando={turnos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(turno) => String(turno.id)}
          vacio={
            <EmptyState
              titulo="No hay turnos teóricos"
              descripcion={hayFiltros ? 'Ningún turno coincide con los filtros.' : TEXTO_SIN_TURNOS_TEORICOS}
              accion={<AccionRegistrar />}
            />
          }
        />
      )}
    </>
  )
}
```

The grupo filter reads the catalogue of contract §3.0 with the session's own code, so an Instructor only ever filters by a grupo they may schedule for; if that catalogue fails the selector says so and the list still works (CA-TUT-13).

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos-teoricos/turnos-teoricos-page.test.tsx
```

Expected: PASS, 10 tests.

- [ ] **Step 6: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **748 tests**.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the turnos teoricos list with its filters and eliminar"
```

---

### Task 12: Registrar and Modificar turno teórico: one shared form (M4-6, M4-7, M4-20, M4-22) (CA-TUT-03..10, CA-TUT-12, CA-TUT-13)

**Files:**

- Modify: `src/features/turnos-teoricos/schemas.ts`
- Create: `src/features/turnos-teoricos/components/formulario-turno-teorico.tsx`
- Modify (full rewrite): `src/features/turnos-teoricos/registrar-turno-teorico-page.tsx`
- Modify (full rewrite): `src/features/turnos-teoricos/modificar-turno-teorico-page.tsx`
- Test: `src/features/turnos-teoricos/formulario-turno-teorico.test.tsx`

**Interfaces:**
- Consumes: `crearTurnoTeorico` / `modificarTurnoTeorico` (returning `{ mensaje, id }`), `consultasTurnosTeoricos.{grupos,detalle,finalizados}`, `consultasPreguntas.porMateria`, `consultasMaterias.lista`, `aplicarErroresDeCampo`, `useFieldArray`, `useWatch`, `AlertDialog`.
- Produces: `crearEsquemaTurnoTeorico(ahora)` with every rule of contract §3.3 the browser can check, `puntajeAsignado`, `turnoTeoricoVacio`, `valoresDesdeTurnoTeorico`, `aCuerpoTurnoTeorico`, and `FormularioTurnoTeorico({ valoresIniciales, idTurno? })` — programa first, grupo scoped by it, the question picker scoped by materia with its confirm and **E12**, the live **E9** counter that gates Guardar, the origin turno only for a subsanación or a rezagado, and **E11** as a warning that still saves.

- [ ] **Step 1: Write the failing tests**

Create `src/features/turnos-teoricos/formulario-turno-teorico.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import {
  TEXTO_MATERIA_SIN_PREGUNTAS,
  TEXTO_SUBSANACION_TARDIA,
  TEXTO_VENTANA_COMENZADA,
  textoPuntajeAsignado,
} from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { D7_VENTANA_COMENZADA } from '@/mocks/sigeda/turnos-teoricos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const EN_CINCO_DIAS = sumarDias(hoyIso(), 5)

async function abrirRegistrar() {
  await iniciarComo('instructor.perez')
  const resultado = renderApp('/teoria/turnos/nuevo')
  await screen.findByLabelText('Nombre')
  await screen.findByRole('option', { name: 'Adoctrinamiento de Vuelo' })
  return resultado
}

async function llenarCabecera(usuario: UserEvent, materia = 'Límites de Operación') {
  await usuario.type(screen.getByLabelText('Nombre'), 'Quincenal Límites de Operación')
  await usuario.selectOptions(screen.getByLabelText('Materia'), materia)
  await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
  await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Quincenal')
  await usuario.type(screen.getByLabelText('Fecha del examen'), EN_CINCO_DIAS)
  await usuario.type(screen.getByLabelText('Hora de inicio'), '09:00')
  await usuario.type(screen.getByLabelText('Hora de fin'), '10:00')
}

async function agregarPregunta(usuario: UserEvent, numero: number, idPregunta: string, puntaje: string) {
  await usuario.click(screen.getByRole('button', { name: 'Agregar pregunta' }))
  await usuario.selectOptions(screen.getByLabelText(`Pregunta ${numero}`), idPregunta)
  await usuario.type(screen.getByLabelText(`Puntaje ${numero}`), puntaje)
}

describe('Registrar y modificar turno teórico', () => {
  it('CA-TUT-03 exige nombre de 10 a 60, fecha futura y ventana de al menos 10 minutos', async () => {
    const { usuario } = await abrirRegistrar()
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await usuario.type(screen.getByLabelText('Fecha del examen'), sumarDias(hoyIso(), -1))
    await usuario.type(screen.getByLabelText('Hora de inicio'), '09:00')
    await usuario.type(screen.getByLabelText('Hora de fin'), '09:05')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Límites de Operación')
    await agregarPregunta(usuario, 1, '17', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El nombre debe tener entre 10 y 60 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('El examen debe comenzar en el futuro.')).toBeInTheDocument()
    expect(screen.getByText('La ventana del examen debe durar al menos 10 minutos.')).toBeInTheDocument()
    expect(screen.getByText('El grupo es obligatorio.')).toBeInTheDocument()
  })

  it('CA-TUT-04 el programa limita los grupos y cambiarlo limpia el grupo elegido', async () => {
    const { usuario } = await abrirRegistrar()
    expect(screen.getByLabelText('Grupo')).toHaveDisplayValue('Elija un grupo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    expect(screen.getByLabelText('Grupo')).toHaveDisplayValue('Grupo 3 · 2 alumnos')
    expect(within(screen.getByLabelText('Grupo')).getAllByRole('option')).toHaveLength(4)
    await usuario.selectOptions(screen.getByLabelText('Programa'), 'PDE')
    expect(screen.getByLabelText('Grupo')).toHaveDisplayValue('Elija un grupo')
    await screen.findByRole('option', { name: 'Elija un grupo' })
    expect(within(screen.getByLabelText('Grupo')).getAllByRole('option')).toHaveLength(1)
  })

  it('CA-TUT-05 las preguntas son las de la materia, cambiarla confirma y limpia la selección', async () => {
    const { usuario } = await abrirRegistrar()
    expect(screen.getByRole('button', { name: 'Agregar pregunta' })).toBeDisabled()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Límites de Operación')
    await agregarPregunta(usuario, 1, '17', '20')
    expect(within(screen.getByLabelText('Pregunta 1')).getAllByRole('option')).toHaveLength(6)
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText('¿Cambiar la materia?')).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Conservar la materia' }))
    expect(screen.getByLabelText('Pregunta 1')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cambiar y quitar preguntas' }),
    )
    expect(screen.queryByLabelText('Pregunta 1')).not.toBeInTheDocument()
  })

  it('CA-TUT-05 una materia sin preguntas muestra E12 y no deja agregar', async () => {
    const { usuario } = await abrirRegistrar()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Meteorología')
    expect(await screen.findByText(TEXTO_MATERIA_SIN_PREGUNTAS)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar pregunta' })).toBeDisabled()
  })

  it('CA-TUT-06 CA-TUT-07 el contador E9 bloquea Guardar hasta sumar 20 y rechaza repetidas', async () => {
    const { usuario } = await abrirRegistrar()
    await llenarCabecera(usuario)
    expect(screen.getByText(textoPuntajeAsignado(0))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno teórico' })).toBeDisabled()
    await agregarPregunta(usuario, 1, '17', '12')
    expect(screen.getByText(textoPuntajeAsignado(12))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno teórico' })).toBeDisabled()
    await agregarPregunta(usuario, 2, '17', '8')
    expect(screen.getByText(textoPuntajeAsignado(20))).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('No se puede repetir una pregunta.')).toBeInTheDocument()
  })

  it('CA-TUT-06 el puntaje debe ser un entero de 1 a 20', async () => {
    const { usuario } = await abrirRegistrar()
    await llenarCabecera(usuario)
    await agregarPregunta(usuario, 1, '17', '0')
    await agregarPregunta(usuario, 2, '18', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El puntaje debe ser un entero entre 1 y 20.')).toBeInTheDocument()
  })

  it('CA-TUT-03 CA-TUT-07 guarda un turno válido y lleva a sus resultados', async () => {
    const { usuario, router } = await abrirRegistrar()
    await llenarCabecera(usuario)
    await agregarPregunta(usuario, 1, '17', '10')
    await agregarPregunta(usuario, 2, '18', '10')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('Turno teórico guardado con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/teoria/turnos/6')
  })

  it('CA-TUT-08 el turno de origen solo aparece en subsanación o rezagado', async () => {
    const { usuario } = await abrirRegistrar()
    expect(screen.queryByLabelText('Turno de origen')).not.toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    expect(screen.getByLabelText('Turno de origen')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    expect(await screen.findByRole('option', { name: 'Mensual Adoctrinamiento de Vuelo' })).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Mensual')
    expect(screen.queryByLabelText('Turno de origen')).not.toBeInTheDocument()
  })

  it('CA-TUT-08 sin turno de origen una subsanación no se guarda', async () => {
    const { usuario } = await abrirRegistrar()
    await usuario.type(screen.getByLabelText('Nombre'), 'Subsanación Adoctrinamiento')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    await usuario.type(screen.getByLabelText('Fecha del examen'), EN_CINCO_DIAS)
    await usuario.type(screen.getByLabelText('Hora de inicio'), '09:00')
    await usuario.type(screen.getByLabelText('Hora de fin'), '10:00')
    await agregarPregunta(usuario, 1, '1', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(
      await screen.findByText('El turno de origen es obligatorio para una subsanación o un rezagado.'),
    ).toBeInTheDocument()
  })

  it('CA-TUT-09 una subsanación más de un día después de su origen avisa con E11 y deja guardar', async () => {
    const { usuario, router } = await abrirRegistrar()
    await usuario.type(screen.getByLabelText('Nombre'), 'Subsanación Adoctrinamiento')
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Adoctrinamiento de Vuelo')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '3')
    await usuario.selectOptions(screen.getByLabelText('Tipo de examen'), 'Subsanación')
    await usuario.type(screen.getByLabelText('Fecha del examen'), EN_CINCO_DIAS)
    await usuario.type(screen.getByLabelText('Hora de inicio'), '09:00')
    await usuario.type(screen.getByLabelText('Hora de fin'), '10:00')
    await usuario.selectOptions(await screen.findByLabelText('Turno de origen'), 'Mensual Adoctrinamiento de Vuelo')
    expect(await screen.findByText(TEXTO_SUBSANACION_TARDIA)).toBeInTheDocument()
    await agregarPregunta(usuario, 1, '1', '20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('Turno teórico guardado con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/teoria/turnos/6')
  })

  it('CA-TUT-12 los errores del backend aparecen bajo su campo, con índice en las preguntas', async () => {
    server.use(
      http.post(`${API}/api/turnos-teoricos`, () =>
        HttpResponse.json(
          ["'nombre': El nombre es obligatorio", "'preguntas[1].puntajeMaximo': El puntaje debe ser un entero entre 1 y 20."],
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirRegistrar()
    await llenarCabecera(usuario)
    await agregarPregunta(usuario, 1, '17', '10')
    await agregarPregunta(usuario, 2, '18', '10')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El puntaje debe ser un entero entre 1 y 20.')).toBeInTheDocument()
  })

  it('CA-TUT-10 modificar aplica las mismas reglas y guarda', async () => {
    await iniciarComo('instructor.perez')
    const { usuario, router } = renderApp('/teoria/turnos/4/editar')
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Quincenal Límites de Operación')
    expect(screen.getByText(textoPuntajeAsignado(20))).toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('El nombre debe tener entre 10 y 60 caracteres.')).toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Quincenal Límites corregido')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText('Turno teórico guardado con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/teoria/turnos/4')
  })

  it('CA-TUT-10 un turno cuya ventana comenzó no ofrece el formulario y muestra E10', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/teoria/turnos/1/editar')
    expect(await screen.findByText(TEXTO_VENTANA_COMENZADA)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver los resultados' })).toHaveAttribute('href', '/teoria/turnos/1')
  })

  it('CA-TUT-10 un intento por URL que el servidor rechaza muestra D7', async () => {
    server.use(
      http.put(`${API}/api/turnos-teoricos/:id`, () => HttpResponse.text(D7_VENTANA_COMENZADA, { status: 409 })),
    )
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/teoria/turnos/4/editar')
    await screen.findByLabelText('Nombre')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno teórico' }))
    expect(await screen.findByText(D7_VENTANA_COMENZADA)).toBeInTheDocument()
  })

  it('CA-TUT-13 un fallo en la primera carga del formulario ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos/:id`, () => HttpResponse.error()))
    await iniciarComo('instructor.perez')
    renderApp('/teoria/turnos/4/editar')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos-teoricos/formulario-turno-teorico.test.tsx
```

Expected: FAIL — every test times out on `screen.findByLabelText('Nombre')`, because both skeleton pages of Task 5 render only their header and their E1 notice.

- [ ] **Step 3: Extend the schema with the turno form**

Append to `src/features/turnos-teoricos/schemas.ts`:

```ts
const MENSAJE_NOMBRE = 'El nombre debe tener entre 10 y 60 caracteres.'
const MENSAJE_HORA = 'La hora debe estar en formato HH:mm (09:00, 14:00)'

export function crearEsquemaTurnoTeorico(ahora: Date) {
  return z
    .object({
      nombre: z.string().trim().min(1, 'El nombre es obligatorio').min(10, MENSAJE_NOMBRE).max(60, MENSAJE_NOMBRE),
      programa: z.enum(PROGRAMAS),
      idMateria: z.string().min(1, 'La materia es obligatoria.'),
      tipoExamen: z.enum(TIPOS_EXAMEN.map((tipo) => tipo.valor)),
      idGrupo: z.string().min(1, 'El grupo es obligatorio.'),
      fechaExamen: z.string().refine(esFechaIso, 'La fecha del examen es obligatoria.'),
      horaInicio: z.string().regex(PATRON_HORA, MENSAJE_HORA),
      horaFin: z.string().regex(PATRON_HORA, MENSAJE_HORA),
      idTurnoOrigen: z.string(),
      preguntas: z
        .array(
          z.object({
            idPregunta: z.string().min(1, 'Elija una pregunta.'),
            puntajeMaximo: z
              .string()
              .regex(/^\d{1,2}$/, MENSAJE_PUNTAJE)
              .refine((valor) => Number(valor) >= 1 && Number(valor) <= PUNTAJE_TOTAL_EXAMEN, MENSAJE_PUNTAJE),
          }),
        )
        .min(1, 'Debe elegir al menos una pregunta.'),
    })
    .superRefine((valores, contexto) => {
      if (esFechaIso(valores.fechaExamen) && esHora(valores.horaInicio)) {
        if (momento(valores.fechaExamen, valores.horaInicio) <= ahora) {
          contexto.addIssue({ code: 'custom', message: 'El examen debe comenzar en el futuro.', path: ['fechaExamen'] })
        }
      }
      if (esHora(valores.horaInicio) && esHora(valores.horaFin) && minutosEntre(valores.horaInicio, valores.horaFin) < VENTANA_MINIMA_MINUTOS) {
        contexto.addIssue({
          code: 'custom',
          message: 'La ventana del examen debe durar al menos 10 minutos.',
          path: ['horaFin'],
        })
      }
      if (exigeTurnoOrigen(valores.tipoExamen) && valores.idTurnoOrigen === '') {
        contexto.addIssue({
          code: 'custom',
          message: 'El turno de origen es obligatorio para una subsanación o un rezagado.',
          path: ['idTurnoOrigen'],
        })
      }
      const ids = valores.preguntas.map((pregunta) => pregunta.idPregunta)
      ids.forEach((id, indice) => {
        if (id !== '' && ids.indexOf(id) !== indice) {
          contexto.addIssue({
            code: 'custom',
            message: 'No se puede repetir una pregunta.',
            path: ['preguntas', indice, 'idPregunta'],
          })
        }
      })
    })
}

export type ValoresTurnoTeorico = z.input<ReturnType<typeof crearEsquemaTurnoTeorico>>

export function minutosEntre(horaInicio: string, horaFin: string): number {
  const [hi, mi] = horaInicio.split(':').map(Number)
  const [hf, mf] = horaFin.split(':').map(Number)
  return hf * 60 + mf - (hi * 60 + mi)
}

export function puntajeAsignado(valores: ValoresTurnoTeorico): number {
  return valores.preguntas.reduce((total, pregunta) => total + (Number(pregunta.puntajeMaximo) || 0), 0)
}

export function turnoTeoricoVacio(): ValoresTurnoTeorico {
  return {
    nombre: '',
    programa: 'PDI',
    idMateria: '',
    tipoExamen: 'TEST',
    idGrupo: '',
    fechaExamen: '',
    horaInicio: '',
    horaFin: '',
    idTurnoOrigen: '',
    preguntas: [],
  }
}

export function valoresDesdeTurnoTeorico(turno: TurnoTeoricoDetalle): ValoresTurnoTeorico {
  return {
    nombre: turno.nombre,
    programa: turno.grupo.programa,
    idMateria: String(turno.materia.id),
    tipoExamen: turno.tipoExamen,
    idGrupo: String(turno.grupo.id),
    fechaExamen: turno.fechaExamen,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    idTurnoOrigen: turno.turnoOrigen === null ? '' : String(turno.turnoOrigen.id),
    preguntas: turno.preguntas.map((pregunta) => ({
      idPregunta: String(pregunta.idPregunta),
      puntajeMaximo: String(pregunta.puntajeMaximo),
    })),
  }
}

export function aCuerpoTurnoTeorico(valores: ValoresTurnoTeorico, codInstructor: string): CuerpoTurnoTeorico {
  return {
    codInstructor,
    nombre: valores.nombre.trim(),
    programa: valores.programa,
    idMateria: Number(valores.idMateria),
    tipoExamen: valores.tipoExamen,
    fechaExamen: valores.fechaExamen,
    horaInicio: valores.horaInicio,
    horaFin: valores.horaFin,
    idGrupo: Number(valores.idGrupo),
    idTurnoOrigen: valores.idTurnoOrigen === '' ? null : Number(valores.idTurnoOrigen),
    preguntas: valores.preguntas.map((pregunta) => ({
      idPregunta: Number(pregunta.idPregunta),
      puntajeMaximo: Number(pregunta.puntajeMaximo),
    })),
  }
}
```

In `src/features/turnos-teoricos/schemas.ts`, replace:

```ts
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { ESTADOS_TURNO, TIPOS_EXAMEN } from '@/lib/dominio/teoria'
```

with:

```ts
import { PROGRAMAS } from '@/features/catalogos/api'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { esFechaIso, esHora, momento, PATRON_HORA } from '@/lib/dominio/calendario'
import {
  ESTADOS_TURNO,
  exigeTurnoOrigen,
  PUNTAJE_TOTAL_EXAMEN,
  TIPOS_EXAMEN,
  VENTANA_MINIMA_MINUTOS,
} from '@/lib/dominio/teoria'
import type { CuerpoTurnoTeorico, TurnoTeoricoDetalle } from './api'

const MENSAJE_PUNTAJE = 'El puntaje debe ser un entero entre 1 y 20.'
```

- [ ] **Step 4: Land the shared form**

Create `src/features/turnos-teoricos/components/formulario-turno-teorico.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { PROGRAMAS } from '@/features/catalogos/api'
import { consultasMaterias } from '@/features/materias/api'
import { consultasPreguntas } from '@/features/preguntas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { useSesion } from '@/lib/auth/use-sesion'
import { sumarDias } from '@/lib/dominio/calendario'
import {
  exigeTurnoOrigen,
  PUNTAJE_TOTAL_EXAMEN,
  TEXTO_MATERIA_SIN_PREGUNTAS,
  TEXTO_SUBSANACION_TARDIA,
  textoPuntajeAsignado,
  TIPOS_EXAMEN,
} from '@/lib/dominio/teoria'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesTurnosTeoricos, consultasTurnosTeoricos, crearTurnoTeorico, modificarTurnoTeorico } from '../api'
import { aCuerpoTurnoTeorico, crearEsquemaTurnoTeorico, puntajeAsignado, type ValoresTurnoTeorico } from '../schemas'

type Props = { valoresIniciales: ValoresTurnoTeorico; idTurno?: number }

export function FormularioTurnoTeorico({ valoresIniciales, idTurno }: Props) {
  const modificando = idTurno !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const sesion = useSesion()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [materiaPendiente, setMateriaPendiente] = useState<string | null>(null)
  const esquema = useMemo(() => crearEsquemaTurnoTeorico(new Date()), [])
  const formulario = useForm<ValoresTurnoTeorico>({ resolver: zodResolver(esquema), defaultValues: valoresIniciales })
  const { errors } = formulario.formState
  const preguntas = useFieldArray({ control: formulario.control, name: 'preguntas' })
  const valores = useWatch({ control: formulario.control }) as ValoresTurnoTeorico

  const materias = useQuery(consultasMaterias.lista())
  const grupos = useQuery(consultasTurnosTeoricos.grupos(sesion?.codPersona ?? null, valores.programa))
  const banco = useQuery(consultasPreguntas.porMateria(Number(valores.idMateria) || 0))
  const origenes = useQuery(
    consultasTurnosTeoricos.finalizados(Number(valores.idMateria) || 0, Number(valores.idGrupo) || 0),
  )

  const guardar = useMutation({
    mutationFn: (siguientes: ValoresTurnoTeorico) => {
      const cuerpo = aCuerpoTurnoTeorico(siguientes, sesion?.codPersona ?? '')
      return modificando ? modificarTurnoTeorico(idTurno, cuerpo) : crearTurnoTeorico(cuerpo)
    },
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesTurnosTeoricos.todo })
      await navegar({ to: '/teoria/turnos/$id', params: { id: String(resultado.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        aplicarErroresDeCampo(error, formulario.setError)
        setErrorGeneral(error.message)
      } else {
        setErrorGeneral(MENSAJE_GENERICO)
      }
    },
  })

  const puntaje = puntajeAsignado(valores)
  const sumaCorrecta = puntaje === PUNTAJE_TOTAL_EXAMEN
  const conOrigen = exigeTurnoOrigen(valores.tipoExamen)
  const origenElegido = origenes.data?.find((turno) => String(turno.id) === valores.idTurnoOrigen)
  const subsanacionTardia =
    valores.tipoExamen === 'SUBSANACION' &&
    origenElegido !== undefined &&
    valores.fechaExamen > sumarDias(origenElegido.fechaExamen, 1)
  const materiaSinPreguntas = valores.idMateria !== '' && banco.data?.length === 0

  function confirmarMateria() {
    if (materiaPendiente === null) return
    formulario.setValue('idMateria', materiaPendiente, { shouldValidate: true })
    formulario.setValue('idTurnoOrigen', '')
    preguntas.replace([])
    setMateriaPendiente(null)
  }

  return (
    <form
      noValidate
      onSubmit={formulario.handleSubmit((siguientes) => {
        setErrorGeneral(null)
        guardar.mutate(siguientes)
      })}
      className="grid gap-6"
    >
      {errorGeneral && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el turno teórico</AlertTitle>
          <AlertDescription>{errorGeneral}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del examen</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.programa)}>
              <FieldLabel htmlFor="turno-teorico-programa">Programa</FieldLabel>
              <Controller
                control={formulario.control}
                name="programa"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-teorico-programa"
                    className="w-full"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      if (evento.target.value === field.value) return
                      field.onChange(evento.target.value)
                      formulario.setValue('idGrupo', '')
                      formulario.setValue('idTurnoOrigen', '')
                    }}
                  >
                    {PROGRAMAS.map((programa) => (
                      <NativeSelectOption key={programa} value={programa}>
                        {programa}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              <FieldDescription>Se elige primero: limita los grupos ofrecidos.</FieldDescription>
            </Field>
            <Field data-invalid={Boolean(errors.idGrupo)}>
              <FieldLabel htmlFor="turno-teorico-grupo">Grupo</FieldLabel>
              <NativeSelect
                id="turno-teorico-grupo"
                className="w-full"
                aria-invalid={Boolean(errors.idGrupo)}
                {...formulario.register('idGrupo')}
              >
                <NativeSelectOption value="">Elija un grupo</NativeSelectOption>
                {(grupos.data ?? []).map((grupo) => (
                  <NativeSelectOption key={grupo.id} value={grupo.id}>
                    {grupo.nombre} · {grupo.cantAlumnos} {grupo.cantAlumnos === 1 ? 'alumno' : 'alumnos'}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errorDePrimeraCarga(grupos) !== null && <FieldError>No se pudieron cargar los grupos.</FieldError>}
              <FieldError errors={[errors.idGrupo]} />
            </Field>
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="turno-teorico-nombre">Nombre</FieldLabel>
              <Input
                id="turno-teorico-nombre"
                aria-invalid={Boolean(errors.nombre)}
                {...formulario.register('nombre')}
              />
              <FieldDescription>De 10 a 60 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.idMateria)}>
              <FieldLabel htmlFor="turno-teorico-materia">Materia</FieldLabel>
              <Controller
                control={formulario.control}
                name="idMateria"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-teorico-materia"
                    className="w-full"
                    aria-invalid={Boolean(errors.idMateria)}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      if (evento.target.value === field.value) return
                      if (preguntas.fields.length > 0) setMateriaPendiente(evento.target.value)
                      else {
                        field.onChange(evento.target.value)
                        formulario.setValue('idTurnoOrigen', '')
                      }
                    }}
                  >
                    <NativeSelectOption value="">Elija una materia</NativeSelectOption>
                    {(materias.data ?? []).map((materia) => (
                      <NativeSelectOption key={materia.id} value={materia.id}>
                        {materia.nombre}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              {errorDePrimeraCarga(materias) !== null && <FieldError>No se pudieron cargar las materias.</FieldError>}
              <FieldError errors={[errors.idMateria]} />
            </Field>
            <Field data-invalid={Boolean(errors.tipoExamen)}>
              <FieldLabel htmlFor="turno-teorico-tipo">Tipo de examen</FieldLabel>
              <Controller
                control={formulario.control}
                name="tipoExamen"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-teorico-tipo"
                    className="w-full"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      field.onChange(evento.target.value)
                      if (!exigeTurnoOrigen(evento.target.value)) formulario.setValue('idTurnoOrigen', '')
                    }}
                  >
                    {TIPOS_EXAMEN.map((tipo) => (
                      <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                        {tipo.etiqueta}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
            </Field>
            <Field data-invalid={Boolean(errors.fechaExamen)}>
              <FieldLabel htmlFor="turno-teorico-fecha">Fecha del examen</FieldLabel>
              <Input
                id="turno-teorico-fecha"
                type="date"
                aria-invalid={Boolean(errors.fechaExamen)}
                {...formulario.register('fechaExamen')}
              />
              <FieldError errors={[errors.fechaExamen]} />
            </Field>
            <Field data-invalid={Boolean(errors.horaInicio)}>
              <FieldLabel htmlFor="turno-teorico-inicio">Hora de inicio</FieldLabel>
              <Input
                id="turno-teorico-inicio"
                type="time"
                aria-invalid={Boolean(errors.horaInicio)}
                {...formulario.register('horaInicio')}
              />
              <FieldError errors={[errors.horaInicio]} />
            </Field>
            <Field data-invalid={Boolean(errors.horaFin)}>
              <FieldLabel htmlFor="turno-teorico-fin">Hora de fin</FieldLabel>
              <Input
                id="turno-teorico-fin"
                type="time"
                aria-invalid={Boolean(errors.horaFin)}
                {...formulario.register('horaFin')}
              />
              <FieldDescription>La ventana debe durar al menos 10 minutos.</FieldDescription>
              <FieldError errors={[errors.horaFin]} />
            </Field>
            {conOrigen && (
              <Field data-invalid={Boolean(errors.idTurnoOrigen)}>
                <FieldLabel htmlFor="turno-teorico-origen">Turno de origen</FieldLabel>
                <NativeSelect
                  id="turno-teorico-origen"
                  className="w-full"
                  aria-invalid={Boolean(errors.idTurnoOrigen)}
                  {...formulario.register('idTurnoOrigen')}
                >
                  <NativeSelectOption value="">Elija el turno de origen</NativeSelectOption>
                  {(origenes.data ?? []).map((turno) => (
                    <NativeSelectOption key={turno.id} value={turno.id}>
                      {turno.nombre}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>Solo turnos finalizados de la misma materia y grupo.</FieldDescription>
                <FieldError errors={[errors.idTurnoOrigen]} />
              </Field>
            )}
          </FieldGroup>
          {subsanacionTardia && (
            <Alert className="mt-5">
              <TriangleAlert />
              <AlertDescription>{TEXTO_SUBSANACION_TARDIA}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Preguntas</h2>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={valores.idMateria === '' || banco.data?.length === 0}
            onClick={() => preguntas.append({ idPregunta: '', puntajeMaximo: '' })}
          >
            <Plus aria-hidden />
            Agregar pregunta
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {valores.idMateria === '' && (
            <p className="text-sm text-muted-foreground">Elija primero la materia para ver sus preguntas.</p>
          )}
          {materiaSinPreguntas && (
            <Alert>
              <AlertDescription>{TEXTO_MATERIA_SIN_PREGUNTAS}</AlertDescription>
            </Alert>
          )}
          {errorDePrimeraCarga(banco) !== null && <FieldError>No se pudieron cargar las preguntas.</FieldError>}
          {preguntas.fields.map((fila, indice) => {
            const error = errors.preguntas?.[indice]
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_8rem_auto]">
                <Field data-invalid={Boolean(error?.idPregunta)}>
                  <FieldLabel htmlFor={`pregunta-${indice}`}>Pregunta {numero}</FieldLabel>
                  <NativeSelect
                    id={`pregunta-${indice}`}
                    className="w-full"
                    aria-invalid={Boolean(error?.idPregunta)}
                    {...formulario.register(`preguntas.${indice}.idPregunta`)}
                  >
                    <NativeSelectOption value="">Elija una pregunta</NativeSelectOption>
                    {(banco.data ?? []).map((pregunta) => (
                      <NativeSelectOption key={pregunta.id} value={pregunta.id}>
                        {pregunta.enunciado}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[error?.idPregunta]} />
                </Field>
                <Field data-invalid={Boolean(error?.puntajeMaximo)}>
                  <FieldLabel htmlFor={`puntaje-${indice}`}>Puntaje {numero}</FieldLabel>
                  <Input
                    id={`puntaje-${indice}`}
                    inputMode="numeric"
                    aria-invalid={Boolean(error?.puntajeMaximo)}
                    {...formulario.register(`preguntas.${indice}.puntajeMaximo`)}
                  />
                  <FieldError errors={[error?.puntajeMaximo]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Quitar pregunta ${numero}`}
                  onClick={() => preguntas.remove(indice)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            )
          })}
          <FieldError errors={[errors.preguntas?.root ?? errors.preguntas]} />
          <p className="text-sm font-medium tabular-nums">{textoPuntajeAsignado(puntaje)}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/teoria/turnos/$id" params={{ id: String(idTurno) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/teoria/turnos">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending || !sumaCorrecta}>
          {guardar.isPending ? 'Guardando…' : 'Guardar turno teórico'}
        </Button>
      </div>

      <AlertDialog open={materiaPendiente !== null} onOpenChange={(abierto) => !abierto && setMateriaPendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar la materia?</AlertDialogTitle>
            <AlertDialogDescription>
              Las preguntas elegidas pertenecen a la materia actual y se quitarán del examen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar la materia</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarMateria}>Cambiar y quitar preguntas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
```

`crearEsquemaTurnoTeorico(new Date())` is memoised once per mount: the "must start in the future" rule is checked against the time the form opened, and the server re-checks it anyway (contract §3.3 and §3.4 state it once because both endpoints apply it).

- [ ] **Step 5: Wire both pages**

Replace `src/features/turnos-teoricos/registrar-turno-teorico-page.tsx`:

```tsx
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { FormularioTurnoTeorico } from './components/formulario-turno-teorico'
import { turnoTeoricoVacio } from './schemas'

export function RegistrarTurnoTeoricoPage() {
  return (
    <>
      <PageHeader
        titulo={PANTALLAS.registrarTurnoTeorico.titulo}
        descripcion={PANTALLAS.registrarTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
      <FormularioTurnoTeorico valoresIniciales={turnoTeoricoVacio()} />
    </>
  )
}
```

Replace `src/features/turnos-teoricos/modificar-turno-teorico-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_VENTANA_COMENZADA } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnosTeoricos } from './api'
import { FormularioTurnoTeorico } from './components/formulario-turno-teorico'
import { valoresDesdeTurnoTeorico } from './schemas'

export function ModificarTurnoTeoricoPage({ id }: { id: number }) {
  const turno = useQuery(consultasTurnosTeoricos.detalle(id))
  const error = errorDePrimeraCarga(turno)

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.modificarTurnoTeorico.titulo}
        descripcion={PANTALLAS.modificarTurnoTeorico.descripcion}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void turno.refetch()} />
      ) : turno.data === undefined ? (
        <Skeleton className="h-64 w-full" aria-busy="true" />
      ) : turno.data.estado !== 'PROGRAMADO' ? (
        <Alert>
          <AlertDescription className="grid gap-3">
            <span>{TEXTO_VENTANA_COMENZADA}</span>
            <Button variant="outline" size="sm" className="justify-self-start" asChild>
              <Link to="/teoria/turnos/$id" params={{ id: String(id) }}>
                Ver los resultados
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <FormularioTurnoTeorico valoresIniciales={valoresDesdeTurnoTeorico(turno.data)} idTurno={id} />
      )}
    </>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos-teoricos/formulario-turno-teorico.test.tsx
```

Expected: PASS, 15 tests.

- [ ] **Step 7: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **763 tests**.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the shared registrar and modificar turno teorico form"
```

---

### Task 13: Resultados por turno (M4-11) (CA-RES-01, CA-RES-02, CA-RES-03, CA-RES-04, CA-RES-06, CA-RES-12, CA-RES-13, CA-TUT-10)

**Files:**

- Modify: `src/lib/dominio/vocabulario.ts`
- Modify (full rewrite): `src/features/turnos-teoricos/cargar.ts`
- Modify (full rewrite): `src/features/turnos-teoricos/resultados-turno-page.tsx`
- Test: `src/features/turnos-teoricos/resultados-turno-page.test.tsx`

**Interfaces:**
- Consumes: `consultasTurnosTeoricos.detalle`, `StatusBadge` with the `turnoTeorico`, `rendicion`, `examen` and `subsanacion` vocabularies, `textoConMinimo`, `EliminarTurnoTeorico`.
- Produces: the `subsanacion` vocabulary (one term, `pendiente`), a `cargarTurnoTeorico` that returns `void` and lets a transport error reach the screen, and a `ResultadosTurnoPage` with the turno's data, the `resumen`, the questions with their puntaje and one row per habilitado alumno carrying estado, nota against `notaMinimaAplicada`, aprobado and the subsanación mark.

- [ ] **Step 1: Write the failing tests**

Create `src/features/turnos-teoricos/resultados-turno-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TEXTO_VENTANA_COMENZADA } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirResultados(id: number) {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(`/teoria/turnos/${id}`)
  await screen.findByRole('table', { name: 'Resultados por alumno' })
  return resultado
}

function filasDeAlumnos() {
  return within(screen.getByRole('table', { name: 'Resultados por alumno' })).getAllByRole('row').slice(1)
}

describe('Resultados por turno teórico', () => {
  it('CA-RES-01 CA-RES-03 muestra los datos del turno, sus preguntas y un resultado por alumno', async () => {
    await abrirResultados(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Mensual Adoctrinamiento de Vuelo' })).toBeInTheDocument()
    const datos = within(screen.getByRole('heading', { level: 2, name: 'Datos del examen' }).closest('div[data-slot="card"]')!)
    expect(datos.getByText('Adoctrinamiento de Vuelo')).toBeInTheDocument()
    expect(datos.getByText('Mensual')).toBeInTheDocument()
    expect(datos.getByText('Grupo 3 · PDI')).toBeInTheDocument()
    expect(datos.getByText('Juan Torres Perez')).toBeInTheDocument()
    expect(datos.getByText('08:00–09:00')).toBeInTheDocument()
    expect(datos.getByText('Finalizado')).toBeInTheDocument()
    const preguntas = within(screen.getByRole('table', { name: 'Preguntas del examen' }))
    expect(preguntas.getAllByRole('row')).toHaveLength(6)
    expect(preguntas.getByText('¿Qué documento fija la conducta del alumno piloto durante la instrucción?')).toBeInTheDocument()
    const primera = within(filasDeAlumnos()[0]!)
    expect(primera.getByText('Pedro Rodriguez Garcia')).toBeInTheDocument()
    expect(primera.getByText('Entregado')).toBeInTheDocument()
    expect(primera.getByText('20.00 / mínimo 18')).toBeInTheDocument()
    expect(primera.getByText('Aprobado')).toBeInTheDocument()
  })

  it('CA-RES-04 el resumen muestra habilitados, rindieron, aprobados y el promedio', async () => {
    await abrirResultados(1)
    const resumen = within(screen.getByRole('heading', { level: 2, name: 'Resumen' }).closest('div[data-slot="card"]')!)
    expect(resumen.getByText('Habilitados').nextElementSibling).toHaveTextContent('2')
    expect(resumen.getByText('Rindieron').nextElementSibling).toHaveTextContent('2')
    expect(resumen.getByText('Aprobados').nextElementSibling).toHaveTextContent('1')
    expect(resumen.getByText('Promedio del turno').nextElementSibling).toHaveTextContent('16.00')
  })

  it('CA-RES-06 el alumno con subsanación pendiente queda marcado en su fila', async () => {
    await abrirResultados(1)
    const segunda = within(filasDeAlumnos()[1]!)
    expect(segunda.getByText('Ana Torres Martinez')).toBeInTheDocument()
    expect(segunda.getByText('12.00 / mínimo 18')).toBeInTheDocument()
    expect(segunda.getByText('Desaprobado')).toBeInTheDocument()
    expect(segunda.getByText('Subsanación pendiente')).toBeInTheDocument()
    expect(within(filasDeAlumnos()[0]!).queryByText('Subsanación pendiente')).not.toBeInTheDocument()
  })

  it('CA-RES-02 un turno sin entregas deriva No rindió y no promedia', async () => {
    await abrirResultados(2)
    expect(filasDeAlumnos()).toHaveLength(1)
    const fila = within(filasDeAlumnos()[0]!)
    expect(fila.getByText('Juan Falconi Fernandez')).toBeInTheDocument()
    expect(fila.getByText('No rindió')).toBeInTheDocument()
    expect(fila.getByText('— / mínimo 20')).toBeInTheDocument()
    const resumen = within(screen.getByRole('heading', { level: 2, name: 'Resumen' }).closest('div[data-slot="card"]')!)
    expect(resumen.getByText('Promedio del turno').nextElementSibling).toHaveTextContent('—')
  })

  it('CA-RES-02 la subsanación solo lista a quien desaprobó su turno de origen', async () => {
    await abrirResultados(5)
    expect(filasDeAlumnos()).toHaveLength(1)
    expect(within(filasDeAlumnos()[0]!).getByText('Ana Torres Martinez')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mensual Adoctrinamiento de Vuelo' })).toHaveAttribute(
      'href',
      '/teoria/turnos/1',
    )
  })

  it('CA-TUT-10 un turno programado ofrece Modificar y Eliminar', async () => {
    await abrirResultados(4)
    expect(screen.getByRole('link', { name: 'Modificar' })).toHaveAttribute('href', '/teoria/turnos/4/editar')
    expect(screen.getByRole('button', { name: 'Eliminar Quincenal Límites de Operación' })).toBeEnabled()
    expect(screen.queryByText(TEXTO_VENTANA_COMENZADA)).not.toBeInTheDocument()
  })

  it('CA-TUT-10 un turno cuya ventana comenzó muestra E10 en lugar de las acciones', async () => {
    await abrirResultados(1)
    expect(screen.getByText(TEXTO_VENTANA_COMENZADA)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument()
  })

  it('CA-RES-13 un Pre-Solo aprueba con 18 aunque la materia pida 16 y muestra ese mínimo', async () => {
    server.use(
      http.get(`${API}/api/turnos-teoricos/4`, () =>
        HttpResponse.json({
          id: 4,
          nombre: 'Pre-Solo Aerodinámica Aplicada',
          materia: { id: 1, nombre: 'Aerodinámica Aplicada a Helicópteros', notaMinima: 16 },
          tipoExamen: 'PRE_SOLO',
          notaMinimaAplicada: 18,
          fechaExamen: '2026-09-18',
          horaInicio: '08:00',
          horaFin: '09:00',
          estado: 'FINALIZADO',
          grupo: { id: 3, nombre: 'Grupo 3', programa: 'PDI' },
          instructor: { codigo: '444444', nombre: 'Juan Torres Perez' },
          turnoOrigen: null,
          preguntas: [],
          resultados: [
            {
              codAlumno: '555555',
              alumno: 'Pedro Rodriguez Garcia',
              estado: 'ENTREGADO',
              idCuestionario: 9,
              nota: 16,
              aprobado: false,
              bloqueadoPorSubsanacion: false,
            },
          ],
          resumen: { habilitados: 1, rindieron: 1, aprobados: 0, notaPromedio: 16 },
        }),
      ),
    )
    await abrirResultados(4)
    expect(screen.getByText('Pre-Solo')).toBeInTheDocument()
    const fila = within(filasDeAlumnos()[0]!)
    expect(fila.getByText('16.00 / mínimo 18')).toBeInTheDocument()
    expect(fila.getByText('Desaprobado')).toBeInTheDocument()
  })

  it('CA-RES-12 un fallo en la primera carga del detalle ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos/:id`, () => HttpResponse.error()))
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/teoria/turnos/1')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Resultados por alumno' })).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Resultados por alumno' })).toBeInTheDocument()
  })

  it('CA-RES-12 un turno inexistente lleva a la página de no encontrado', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/teoria/turnos/999')
    expect(await screen.findByText(/no encontr/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos-teoricos/resultados-turno-page.test.tsx
```

Expected: FAIL — every test times out on `screen.findByRole('table', { name: 'Resultados por alumno' })`, because the skeleton page of Task 5 renders only its header and its E1 notice.

- [ ] **Step 3: Add the subsanación vocabulary**

In `src/lib/dominio/vocabulario.ts`, replace:

```ts
export const RESULTADOS_EXAMEN = {
```

with:

```ts
export const SUBSANACION = {
  pendiente: { etiqueta: 'Subsanación pendiente', tono: 'alerta' },
} as const satisfies Record<string, Termino>

export const RESULTADOS_EXAMEN = {
```

In `src/lib/dominio/vocabulario.ts`, replace:

```ts
  examen: RESULTADOS_EXAMEN,
} as const
```

with:

```ts
  examen: RESULTADOS_EXAMEN,
  subsanacion: SUBSANACION,
} as const
```

- [ ] **Step 4: Let the loader hand transport errors to the screen**

Replace `src/features/turnos-teoricos/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasTurnosTeoricos } from './api'

export async function cargarTurnoTeorico(queryClient: QueryClient, idTexto: string): Promise<void> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  try {
    await queryClient.ensureQueryData(consultasTurnosTeoricos.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
  }
}
```

- [ ] **Step 5: Land the detail**

Replace `src/features/turnos-teoricos/resultados-turno-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { accionDisponible } from '@/lib/dependencias'
import {
  etiquetaDeDificultad,
  etiquetaDeTipoExamen,
  etiquetaDeTipoPregunta,
  TEXTO_VENTANA_COMENZADA,
  textoConMinimo,
} from '@/lib/dominio/teoria'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnosTeoricos, type TurnoTeoricoDetalle } from './api'
import { EliminarTurnoTeorico } from './components/eliminar-turno-teorico'

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function Acciones({ turno }: { turno: TurnoTeoricoDetalle }) {
  const navegar = useNavigate()
  if (!accionDisponible('programarTurnoTeorico')) return null
  if (turno.estado !== 'PROGRAMADO') return <p className="text-sm text-muted-foreground">{TEXTO_VENTANA_COMENZADA}</p>
  return (
    <>
      <Button variant="outline" asChild>
        <Link to="/teoria/turnos/$id/editar" params={{ id: String(turno.id) }}>
          <Pencil aria-hidden />
          Modificar
        </Link>
      </Button>
      <EliminarTurnoTeorico
        id={turno.id}
        nombre={turno.nombre}
        alEliminar={() => void navegar({ to: '/teoria/turnos' })}
      />
    </>
  )
}

export function ResultadosTurnoPage({ id }: { id: number }) {
  const consulta = useQuery(consultasTurnosTeoricos.detalle(id))
  const error = errorDePrimeraCarga(consulta)
  const turno = consulta.data

  return (
    <>
      <PageHeader
        titulo={turno?.nombre ?? PANTALLAS.resultadosTurnoTeorico.titulo}
        descripcion={PANTALLAS.resultadosTurnoTeorico.descripcion}
        acciones={turno && <Acciones turno={turno} />}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void consulta.refetch()} />
      ) : turno === undefined ? (
        <Skeleton className="h-64 w-full" aria-busy="true" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Datos del examen</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Dato etiqueta="Materia">{turno.materia.nombre}</Dato>
                <Dato etiqueta="Tipo de examen">{etiquetaDeTipoExamen(turno.tipoExamen)}</Dato>
                <Dato etiqueta="Grupo">
                  {turno.grupo.nombre} · {turno.grupo.programa}
                </Dato>
                <Dato etiqueta="Instructor">{turno.instructor.nombre}</Dato>
                <Dato etiqueta="Fecha">
                  <span className="tabular-nums">{formatearFecha(turno.fechaExamen)}</span>
                </Dato>
                <Dato etiqueta="Horario">
                  <span className="tabular-nums">
                    {turno.horaInicio}–{turno.horaFin}
                  </span>
                </Dato>
                <Dato etiqueta="Estado">
                  <StatusBadge vocabulario="turnoTeorico" valor={turno.estado} />
                </Dato>
                <Dato etiqueta="Nota mínima aplicable">
                  <span className="tabular-nums">{turno.notaMinimaAplicada}</span>
                </Dato>
                {turno.turnoOrigen && (
                  <Dato etiqueta="Turno de origen">
                    <Link to="/teoria/turnos/$id" params={{ id: String(turno.turnoOrigen.id) }}>
                      {turno.turnoOrigen.nombre}
                    </Link>
                  </Dato>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Resumen</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Dato etiqueta="Habilitados">
                  <span className="tabular-nums">{turno.resumen.habilitados}</span>
                </Dato>
                <Dato etiqueta="Rindieron">
                  <span className="tabular-nums">{turno.resumen.rindieron}</span>
                </Dato>
                <Dato etiqueta="Aprobados">
                  <span className="tabular-nums">{turno.resumen.aprobados}</span>
                </Dato>
                <Dato etiqueta="Promedio del turno">
                  <span className="tabular-nums">{formatearNota(turno.resumen.notaPromedio)}</span>
                </Dato>
              </dl>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border">
            <Table aria-label="Preguntas del examen">
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Enunciado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead>Puntaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turno.preguntas.map((pregunta) => (
                  <TableRow key={pregunta.idPregunta}>
                    <TableCell className="tabular-nums">{pregunta.orden}</TableCell>
                    <TableCell>{pregunta.enunciado}</TableCell>
                    <TableCell>{etiquetaDeTipoPregunta(pregunta.tipoPregunta)}</TableCell>
                    <TableCell>{etiquetaDeDificultad(pregunta.dificultad)}</TableCell>
                    <TableCell className="tabular-nums">{pregunta.puntajeMaximo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table aria-label="Resultados por alumno">
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Estado teórico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turno.resultados.map((resultado) => (
                  <TableRow key={resultado.codAlumno}>
                    <TableCell>{resultado.alumno}</TableCell>
                    <TableCell>
                      <StatusBadge vocabulario="rendicion" valor={resultado.estado} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {textoConMinimo(resultado.nota, turno.notaMinimaAplicada)}
                    </TableCell>
                    <TableCell>
                      {resultado.aprobado === null ? (
                        '—'
                      ) : (
                        <StatusBadge vocabulario="examen" valor={resultado.aprobado ? 'aprobado' : 'desaprobado'} />
                      )}
                    </TableCell>
                    <TableCell>
                      {resultado.bloqueadoPorSubsanacion ? (
                        <StatusBadge vocabulario="subsanacion" valor="pendiente" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {turno.resultados.length === 0 && (
            <Alert>
              <AlertDescription>El grupo no tiene alumnos habilitados para este examen.</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </>
  )
}
```

Nothing here computes a grade: `notaMinimaAplicada` is printed as it arrives and `textoConMinimo` pairs it with the nota, which is what makes the Pre-Solo case of CA-RES-13 a pure display change.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos-teoricos/resultados-turno-page.test.tsx
```

Expected: PASS, 10 tests.

- [ ] **Step 7: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **773 tests**.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the resultados por turno teorico screen"
```

---

### Task 14: Mis exámenes: the pendientes with E13, E21 and E24 (M4-12) (CA-EXA-01, CA-EXA-02, CA-EXA-13, CA-RES-06)

**Files:**

- Modify (full rewrite): `src/features/examenes/mis-examenes-page.tsx`
- Test: `src/features/examenes/mis-examenes-page.test.tsx`

**Interfaces:**
- Consumes: `consultasExamenes.{pendientes,estadoTeorico}`, `useSesion`, `StatusBadge`, `EmptyState`, `textoSeHabilita`, `TEXTO_SUBSANACION_PENDIENTE`, `TEXTO_SIN_EXAMENES_PENDIENTES`.
- Produces: `MisExamenesPage` — the header carries **E21** with the server's `motivo` when the alumno is blocked, each pending turno is a card, one whose window has not opened shows **E13** instead of a link, and no pendientes shows **E24**. History is out of scope (§16.6): the list is Pendientes only.

- [ ] **Step 1: Write the failing tests**

Create `src/features/examenes/mis-examenes-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  TEXTO_SIN_EXAMENES_PENDIENTES,
  TEXTO_SUBSANACION_PENDIENTE,
  textoSeHabilita,
} from '@/lib/dominio/teoria'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { formatearFecha } from '@/lib/formato'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'

async function abrirMisExamenes(username: string) {
  await iniciarComo(username)
  const resultado = renderApp('/examenes')
  await screen.findByRole('heading', { level: 1, name: 'Mis exámenes' })
  return resultado
}

function tarjetas() {
  return within(screen.getByRole('region', { name: 'Exámenes pendientes' })).getAllByRole('heading', { level: 2 })
}

function valorDe(etiqueta: string): string {
  return screen.getByText(etiqueta).nextElementSibling?.textContent ?? ''
}

describe('Mis exámenes', () => {
  it('CA-EXA-01 lista los turnos habilitados con materia, tipo, fecha y horario', async () => {
    relojFalso()
    abrirVentanaDeExamen({ transcurridos: 5 })
    await abrirMisExamenes('alumno.lopez')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(tarjetas().map((titulo) => titulo.textContent)).toEqual(['Semanal Adoctrinamiento de Vuelo'])
    expect(screen.getByText('Adoctrinamiento de Vuelo')).toBeInTheDocument()
    expect(screen.getByText('Semanal')).toBeInTheDocument()
    expect(valorDe('Horario')).toBe('08:55–09:25')
    expect(valorDe('Fecha')).toBe(formatearFecha(hoyIso()))
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar el examen' })).toHaveAttribute('href', '/examenes/3')
  })

  it('CA-EXA-02 un examen cuya ventana no comenzó no se puede abrir y muestra E13', async () => {
    await abrirMisExamenes('alumno.torres')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(tarjetas().map((titulo) => titulo.textContent)).toEqual([
      'Subsanación Adoctrinamiento de Vuelo',
      'Quincenal Límites de Operación',
    ])
    expect(screen.queryByRole('link', { name: /examen/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('Programado')).toHaveLength(2)
    expect(screen.getByText(textoSeHabilita(sumarDias(hoyIso(), 1), '08:00'))).toBeInTheDocument()
    expect(screen.getByText(textoSeHabilita(sumarDias(hoyIso(), 3), '09:00'))).toBeInTheDocument()
  })

  it('CA-EXA-01 sin pendientes muestra E24', async () => {
    await abrirMisExamenes('alumno.falconi')
    expect(await screen.findByText(TEXTO_SIN_EXAMENES_PENDIENTES)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Exámenes pendientes' })).not.toBeInTheDocument()
  })

  it('CA-RES-06 el alumno bloqueado por una subsanación ve E21 con su motivo', async () => {
    await abrirMisExamenes('alumno.torres')
    expect(await screen.findByText(TEXTO_SUBSANACION_PENDIENTE)).toBeInTheDocument()
    expect(
      screen.getByText('Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.'),
    ).toBeInTheDocument()
  })

  it('CA-RES-06 un alumno sin subsanación pendiente no ve E21', async () => {
    await abrirMisExamenes('alumno.lopez')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SUBSANACION_PENDIENTE)).not.toBeInTheDocument()
  })

  it('CA-EXA-13 un fallo en la primera carga ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/examenes/pendientes`, () => HttpResponse.error()))
    const { usuario } = await abrirMisExamenes('alumno.lopez')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SIN_EXAMENES_PENDIENTES)).not.toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
  })

  it('CA-RES-06 si el estado teórico no responde la pantalla sigue usable', async () => {
    server.use(http.get(`${API}/api/personas/:cod/estado-teorico`, () => HttpResponse.error()))
    await abrirMisExamenes('alumno.torres')
    expect(await screen.findByRole('region', { name: 'Exámenes pendientes' })).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_SUBSANACION_PENDIENTE)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/examenes/mis-examenes-page.test.tsx
```

Expected: FAIL — `Unable to find an accessible element with the role "region" and name "Exámenes pendientes"`; the skeleton page of Task 5 has only its header.

- [ ] **Step 3: Land Mis exámenes**

Replace `src/features/examenes/mis-examenes-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import {
  etiquetaDeTipoExamen,
  TEXTO_SIN_EXAMENES_PENDIENTES,
  TEXTO_SUBSANACION_PENDIENTE,
  textoSeHabilita,
} from '@/lib/dominio/teoria'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasExamenes } from './api'

export function MisExamenesPage() {
  const sesion = useSesion()
  const codAlumno = sesion?.codPersona ?? ''
  const pendientes = useQuery(consultasExamenes.pendientes(codAlumno))
  const estadoTeorico = useQuery(consultasExamenes.estadoTeorico(codAlumno))
  const error = errorDePrimeraCarga(pendientes)

  return (
    <>
      <PageHeader titulo={PANTALLAS.misExamenes.titulo} descripcion={PANTALLAS.misExamenes.descripcion} />
      <AvisoDeTeoria accion="rendirExamen" />
      {estadoTeorico.data?.bloqueadoPorSubsanacion === true && (
        <Alert>
          <AlertDescription className="grid gap-1">
            <span>{TEXTO_SUBSANACION_PENDIENTE}</span>
            {estadoTeorico.data.motivo !== null && (
              <span className="text-sm text-muted-foreground">{estadoTeorico.data.motivo}</span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void pendientes.refetch()} />
      ) : pendientes.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : pendientes.data.length === 0 ? (
        <EmptyState titulo="Sin exámenes pendientes" descripcion={TEXTO_SIN_EXAMENES_PENDIENTES} />
      ) : (
        <section aria-label="Exámenes pendientes" className="grid gap-4">
          {pendientes.data.map((examen) => (
            <Card key={examen.idTurnoTeorico}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                <CardTitle>
                  <h2>{examen.nombre}</h2>
                </CardTitle>
                <StatusBadge vocabulario="turnoTeorico" valor={examen.estado} />
              </CardHeader>
              <CardContent className="grid gap-3">
                <dl className="grid gap-3 sm:grid-cols-4">
                  <div className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">Materia</dt>
                    <dd className="font-medium">{examen.materia}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">Tipo de examen</dt>
                    <dd className="font-medium">{etiquetaDeTipoExamen(examen.tipoExamen)}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">Fecha</dt>
                    <dd className="font-medium tabular-nums">{formatearFecha(examen.fechaExamen)}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">Horario</dt>
                    <dd className="font-medium tabular-nums">
                      {examen.horaInicio}–{examen.horaFin}
                    </dd>
                  </div>
                </dl>
                {examen.estado === 'PROGRAMADO' ? (
                  <p className="text-sm text-muted-foreground">
                    {textoSeHabilita(examen.fechaExamen, examen.horaInicio)}
                  </p>
                ) : (
                  <Button className="justify-self-start" asChild>
                    <Link to="/examenes/$id" params={{ id: String(examen.idTurnoTeorico) }}>
                      <GraduationCap aria-hidden />
                      {examen.estadoRendicion === 'EN_CURSO' ? 'Continuar el examen' : 'Rendir examen'}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </>
  )
}
```

`222222` has no pending exams by construction (its only turno is finished), so **E24** needs no `server.use`; and the `estado-teorico` query is deliberately allowed to fail quietly here — its only job is E21, and losing it must not cost the alumno their exam list.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/examenes/mis-examenes-page.test.tsx
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **780 tests**.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add mis examenes with its pendientes, e13 and e21"
```

---

### Task 15: Rendir examen: the session start, the answering controls and the autosave (M4-9) (CA-EXA-03, CA-EXA-04, CA-EXA-05, CA-EXA-08, CA-EXA-11, CA-EXA-12, CA-EXA-13, CA-RES-09)

**Files:**

- Create: `src/features/examenes/mensajes.ts`
- Create: `src/features/examenes/autoguardado.ts`
- Create: `src/features/examenes/use-autoguardado.ts`
- Create: `src/features/examenes/components/resolucion-de-examen.tsx`
- Modify: `src/features/examenes/api.ts`
- Modify (full rewrite): `src/features/examenes/rendir-examen-page.tsx`
- Test: `src/features/examenes/rendir-examen-page.test.tsx`

**Interfaces:**
- Consumes: `iniciarExamen`, `guardarRespuestas`, `useSesion`, `ToggleGroup`, `Input`, `MARCADOR_COMPLETAR`, the E27/E28/E14 texts.
- Produces:
  - `src/features/examenes/mensajes.ts`: the three contract messages the frontend must **recognise** rather than merely show — D8, D10 and D11 — with `esExamenEntregado` and `esVentanaCerrada`.
  - `consultasExamenes.enCurso(idTurnoTeorico, codAlumno)`: a `queryFn` that POSTs `iniciar` with `retry: false` and `staleTime: Infinity`, so the idempotent start runs once per mount and a reload retakes the same paper in the same order.
  - `autoguardado.ts` (pure): `respuestasIniciales`, `contarRespondidas`, `aRespuestasEnviadas` and the two delays.
  - `useAutoguardado(examen)`: the answers, the save state and the two clocks — 2 s of debounce after the last change and a 10 s ceiling that only re-arms after a save — plus `guardarAhora()` for Task 16 to flush before Entregar.
  - `ResolucionDeExamen`: presentational, one card per pregunta in the server's `orden`, the right control per `TipoPregunta`, and the E27/E28/E14 banner.

- [ ] **Step 1: Write the failing tests**

Create `src/features/examenes/rendir-examen-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TEXTO_AUTOGUARDADO_FALLIDO, TEXTO_GUARDADO, TEXTO_GUARDANDO } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { D9_ALUMNO_NO_HABILITADO, D10_EXAMEN_ENTREGADO } from '@/mocks/sigeda/cuestionarios-teoria'
import { alternativasDePregunta, cuestionarioDe } from '@/mocks/sigeda/datos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'
import type { UserEvent } from '@testing-library/user-event'

const RUTA = '/examenes/3'

function idCorrecta(idPregunta: number): string {
  return String(alternativasDePregunta(idPregunta).find((alternativa) => alternativa.correcto)?.id)
}

async function abrirExamen(usuario?: UserEvent) {
  await iniciarComo('alumno.lopez')
  const resultado = renderApp(RUTA, usuario)
  await screen.findByRole('group', { name: 'Pregunta 1' })
  return resultado
}

function contarGuardados() {
  let guardados = 0
  const oyente = ({ request }: { request: Request }) => {
    if (request.method === 'PUT' && request.url.includes('/respuestas')) guardados += 1
  }
  server.events.on('request:start', oyente)
  return { total: () => guardados, detener: () => server.events.removeListener('request:start', oyente) }
}

describe('Rendir examen', () => {
  it('CA-EXA-03 inicia el examen y no expone la correcta, la esperada ni la explicación', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await abrirExamen()
    expect(screen.getAllByRole('group', { name: /^Pregunta / })).toHaveLength(5)
    expect(screen.getByRole('heading', { level: 2, name: 'Pregunta 1 · 4 puntos' })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Regular')
    expect(document.body.textContent).not.toContain('El PDI EA-510 es el plan de instrucción vigente')
  })

  it('CA-EXA-04 cada tipo se responde con su control', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await abrirExamen()
    const primera = within(screen.getByRole('group', { name: 'Pregunta 1' }))
    expect(primera.getAllByRole('radio')).toHaveLength(4)
    expect(primera.getByRole('radio', { name: 'El PDI EA-510' })).toHaveAttribute('aria-checked', 'true')
    const tercera = within(screen.getByRole('group', { name: 'Pregunta 3' }))
    expect(tercera.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Verdadero',
      'Falso',
    ])
    expect(screen.getByLabelText('Respuesta de la pregunta 4')).toHaveValue('')
  })

  it('CA-EXA-08 recargar retoma el mismo examen con el mismo orden y sus respuestas', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    const primera = await abrirExamen()
    const ordenes = screen.getAllByRole('group', { name: /^Pregunta / }).map((grupo) => grupo.getAttribute('aria-label'))
    primera.unmount()
    await abrirExamen()
    expect(screen.getAllByRole('group', { name: /^Pregunta / }).map((grupo) => grupo.getAttribute('aria-label'))).toEqual(
      ordenes,
    )
    expect(
      within(screen.getByRole('group', { name: 'Pregunta 1' })).getByRole('radio', { name: 'El PDI EA-510' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('CA-EXA-05 guarda dos segundos después del último cambio con E27 y E28', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    server.use(
      http.put(`${API}/api/cuestionarios/:id/respuestas`, async () => {
        await delay(500)
        return HttpResponse.json({ mensaje: 'Respuestas guardadas.', respuestasGuardadas: 1 })
      }),
    )
    const conteo = contarGuardados()
    await abrirExamen(usuario)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[1]!)
    await avanzar(1_000)
    expect(conteo.total()).toBe(0)
    await avanzar(1_200)
    expect(await screen.findByText(TEXTO_GUARDANDO)).toBeInTheDocument()
    await avanzar(600)
    expect(await screen.findByText(TEXTO_GUARDADO)).toBeInTheDocument()
    expect(conteo.total()).toBe(1)
    conteo.detener()
  })

  it('CA-EXA-05 con cambios seguidos guarda a los diez segundos como máximo', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    const conteo = contarGuardados()
    await abrirExamen(usuario)
    const campo = screen.getByLabelText('Respuesta de la pregunta 4')
    for (let vuelta = 0; vuelta < 7; vuelta += 1) {
      await usuario.type(campo, 'a')
      await avanzar(1_500)
    }
    expect(conteo.total()).toBeGreaterThanOrEqual(1)
    conteo.detener()
  })

  it('CA-EXA-05 un fallo muestra E14 con Reintentar sin perder lo respondido', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    server.use(http.put(`${API}/api/cuestionarios/:id/respuestas`, () => HttpResponse.error()))
    await abrirExamen(usuario)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'rotor de cola')
    await avanzar(2_100)
    expect(await screen.findByText(TEXTO_AUTOGUARDADO_FALLIDO)).toBeInTheDocument()
    expect(screen.getByLabelText('Respuesta de la pregunta 4')).toHaveValue('rotor de cola')
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(TEXTO_GUARDADO)).toBeInTheDocument()
    expect(cuestionarioDe(3, '111111')?.respuestas[4]).toBe('rotor de cola')
  })

  it('CA-EXA-05 el autoguardado reemplaza el conjunto completo', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    await abrirExamen(usuario)
    expect(Object.keys(cuestionarioDe(3, '111111')?.respuestas ?? {})).toEqual(['1', '3'])
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[0]!)
    await avanzar(2_100)
    await screen.findByText(TEXTO_GUARDADO)
    expect(Object.keys(cuestionarioDe(3, '111111')?.respuestas ?? {}).sort()).toEqual(['1', '2', '3'])
    expect(cuestionarioDe(3, '111111')?.respuestas[1]).toBe(idCorrecta(1))
  })

  it('CA-EXA-11 un examen ya entregado muestra D10 con el acceso al resultado', async () => {
    server.use(
      http.post(`${API}/api/turnos-teoricos/:id/iniciar`, () =>
        HttpResponse.text(D10_EXAMEN_ENTREGADO, { status: 409 }),
      ),
    )
    await iniciarComo('alumno.lopez')
    renderApp(RUTA)
    expect(await screen.findByText(D10_EXAMEN_ENTREGADO)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el resultado' })).toHaveAttribute('href', '/examenes/3/resultado')
    expect(screen.queryByRole('group', { name: 'Pregunta 1' })).not.toBeInTheDocument()
  })

  it('CA-EXA-12 un alumno no habilitado ve D9 y no el examen', async () => {
    server.use(
      http.post(`${API}/api/turnos-teoricos/:id/iniciar`, () =>
        HttpResponse.text(D9_ALUMNO_NO_HABILITADO, { status: 403 }),
      ),
    )
    await iniciarComo('alumno.lopez')
    renderApp(RUTA)
    expect(await screen.findByText(D9_ALUMNO_NO_HABILITADO)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Pregunta 1' })).not.toBeInTheDocument()
  })

  it('CA-EXA-13 un fallo en la primera carga del examen ofrece Reintentar', async () => {
    server.use(http.post(`${API}/api/turnos-teoricos/:id/iniciar`, () => HttpResponse.error()))
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp(RUTA)
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument()
  })

  it('CA-RES-09 un turno en el que el alumno no tiene examen no se puede abrir', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/examenes/1')
    expect(await screen.findByText(/no encontr/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/examenes/rendir-examen-page.test.tsx
```

Expected: FAIL — every test times out on `screen.findByRole('group', { name: 'Pregunta 1' })`, because the skeleton page of Task 5 never starts the exam.

- [ ] **Step 3: Land the recognised messages and the session query**

Create `src/features/examenes/mensajes.ts`:

```ts
import { ApiError } from '@/lib/api/errors'

export const D8_EXAMEN_NO_DISPONIBLE = 'El examen no está disponible en este momento.'
export const D10_EXAMEN_ENTREGADO = 'El examen ya fue entregado.'
export const D11_VENTANA_CERRADA = 'La ventana del examen cerró.'

function esConflicto(error: unknown, mensaje: string): boolean {
  return error instanceof ApiError && error.status === 409 && error.message.trim() === mensaje
}

export function esExamenEntregado(error: unknown): boolean {
  return esConflicto(error, D10_EXAMEN_ENTREGADO)
}

export function esVentanaCerrada(error: unknown): boolean {
  return esConflicto(error, D11_VENTANA_CERRADA)
}
```

In `src/features/examenes/api.ts`, replace:

```ts
  examen: (idTurnoTeorico: number, codAlumno: string) =>
    [...clavesExamenes.todo, 'turno', idTurnoTeorico, codAlumno] as const,
```

with:

```ts
  examen: (idTurnoTeorico: number, codAlumno: string) =>
    [...clavesExamenes.todo, 'turno', idTurnoTeorico, codAlumno] as const,
  enCurso: (idTurnoTeorico: number, codAlumno: string) =>
    [...clavesExamenes.todo, 'en-curso', idTurnoTeorico, codAlumno] as const,
```

In `src/features/examenes/api.ts`, replace:

```ts
  estadoTeorico: (codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.estadoTeorico(codAlumno),
```

with:

```ts
  enCurso: (idTurnoTeorico: number, codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.enCurso(idTurnoTeorico, codAlumno),
      queryFn: () => iniciarExamen(idTurnoTeorico, codAlumno),
      enabled: codAlumno !== '',
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
    }),
  estadoTeorico: (codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.estadoTeorico(codAlumno),
```

`enCurso` is a **separate key** from `examen`, which the loader already uses for `mi-cuestionario`: the two endpoints return different shapes for the same turno and must not share a cache entry.

- [ ] **Step 4: Land the autosave**

Create `src/features/examenes/autoguardado.ts`:

```ts
import type { ExamenEnCurso, RespuestaDeExamen } from './api'

export const DEBOUNCE_AUTOGUARDADO = 2_000
export const MAXIMO_AUTOGUARDADO = 10_000

export type Respuestas = Record<number, string>

export type EstadoGuardado = 'limpio' | 'guardando' | 'guardado' | 'error'

export function respuestasIniciales(examen: ExamenEnCurso): Respuestas {
  const iniciales: Respuestas = {}
  for (const pregunta of examen.preguntas) {
    if (pregunta.respuestaAlumno !== null) iniciales[pregunta.idPregunta] = pregunta.respuestaAlumno
  }
  return iniciales
}

export function contarRespondidas(respuestas: Respuestas): number {
  return Object.values(respuestas).filter((valor) => valor.trim() !== '').length
}

export function aRespuestasEnviadas(respuestas: Respuestas): RespuestaDeExamen[] {
  return Object.entries(respuestas)
    .filter(([, respuesta]) => respuesta.trim() !== '')
    .map(([idPregunta, respuesta]) => ({ idPregunta: Number(idPregunta), respuesta }))
}
```

Create `src/features/examenes/use-autoguardado.ts`:

```ts
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { guardarRespuestas, type ExamenEnCurso } from './api'
import {
  aRespuestasEnviadas,
  DEBOUNCE_AUTOGUARDADO,
  MAXIMO_AUTOGUARDADO,
  respuestasIniciales,
  type EstadoGuardado,
  type Respuestas,
} from './autoguardado'

export function useAutoguardado(examen: ExamenEnCurso) {
  const [respuestas, setRespuestas] = useState<Respuestas>(() => respuestasIniciales(examen))
  const [estado, setEstado] = useState<EstadoGuardado>('limpio')
  const ultimas = useRef(respuestas)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maximo = useRef<ReturnType<typeof setTimeout> | null>(null)

  const guardar = useMutation({
    mutationFn: (valores: Respuestas) =>
      guardarRespuestas(examen.id, examen.codAlumno, aRespuestasEnviadas(valores)),
    onSuccess: () => setEstado('guardado'),
    onError: () => setEstado('error'),
  })
  const enviar = guardar.mutateAsync

  const limpiarRelojes = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (maximo.current) clearTimeout(maximo.current)
    debounce.current = null
    maximo.current = null
  }, [])

  const guardarAhora = useCallback(async () => {
    limpiarRelojes()
    setEstado('guardando')
    await enviar(ultimas.current).catch(() => undefined)
  }, [enviar, limpiarRelojes])

  const responder = useCallback(
    (idPregunta: number, valor: string) => {
      const siguientes = { ...ultimas.current, [idPregunta]: valor }
      ultimas.current = siguientes
      setRespuestas(siguientes)
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => void guardarAhora(), DEBOUNCE_AUTOGUARDADO)
      if (maximo.current === null) maximo.current = setTimeout(() => void guardarAhora(), MAXIMO_AUTOGUARDADO)
    },
    [guardarAhora],
  )

  useEffect(() => limpiarRelojes, [limpiarRelojes])

  return { respuestas, estado, responder, guardarAhora }
}
```

The split is not cosmetic. `oxlint --deny-warnings` rejects `react(immutability)` (a ref received as a prop must not be assigned) and `react(only-export-components)` (a `.tsx` file must export only components), so the answers, the clocks and `guardarAhora()` live in a hook, its pure parts in a `.ts` module, and the rendering stays presentational. The 10 s ceiling is set on the first change of a batch and cleared only by a save, which is what "forced at most every 10 s" means.

- [ ] **Step 5: Land the answering screen**

Create `src/features/examenes/components/resolucion-de-examen.tsx`:

```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MARCADOR_COMPLETAR, TEXTO_AUTOGUARDADO_FALLIDO, TEXTO_GUARDADO, TEXTO_GUARDANDO } from '@/lib/dominio/teoria'
import type { ExamenEnCurso, PreguntaDeExamen } from '../api'
import type { EstadoGuardado, Respuestas } from '../autoguardado'

function EnunciadoConCampo({
  pregunta,
  valor,
  bloqueado,
  alCambiar,
}: {
  pregunta: PreguntaDeExamen
  valor: string
  bloqueado: boolean
  alCambiar: (siguiente: string) => void
}) {
  const [antes, ...resto] = pregunta.enunciado.split(MARCADOR_COMPLETAR)
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span>{antes}</span>
      <Input
        className="w-48"
        aria-label={`Respuesta de la pregunta ${pregunta.orden}`}
        disabled={bloqueado}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
      />
      <span>{resto.join(MARCADOR_COMPLETAR)}</span>
    </p>
  )
}

type Props = {
  examen: ExamenEnCurso
  respuestas: Respuestas
  estado: EstadoGuardado
  bloqueado: boolean
  alResponder: (idPregunta: number, valor: string) => void
  alReintentar: () => void
}

export function ResolucionDeExamen({ examen, respuestas, estado, bloqueado, alResponder, alReintentar }: Props) {
  return (
    <section aria-label="Preguntas del examen" className="grid gap-4">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {estado === 'guardando' ? TEXTO_GUARDANDO : estado === 'guardado' ? TEXTO_GUARDADO : ''}
      </p>
      {estado === 'error' && (
        <Alert variant="destructive">
          <AlertDescription className="grid gap-3">
            <span>{TEXTO_AUTOGUARDADO_FALLIDO}</span>
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={alReintentar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {examen.preguntas.map((pregunta) => {
        const valor = respuestas[pregunta.idPregunta] ?? ''
        return (
          <Card key={pregunta.idPregunta} role="group" aria-label={`Pregunta ${pregunta.orden}`}>
            <CardHeader>
              <CardTitle>
                <h2>
                  Pregunta {pregunta.orden} · {pregunta.puntajeMaximo}{' '}
                  {pregunta.puntajeMaximo === 1 ? 'punto' : 'puntos'}
                </h2>
              </CardTitle>
              {pregunta.tipoPregunta === 'COMPLETAR' ? (
                <EnunciadoConCampo
                  pregunta={pregunta}
                  valor={valor}
                  bloqueado={bloqueado}
                  alCambiar={(siguiente) => alResponder(pregunta.idPregunta, siguiente)}
                />
              ) : (
                <p>{pregunta.enunciado}</p>
              )}
            </CardHeader>
            {pregunta.tipoPregunta !== 'COMPLETAR' && (
              <CardContent>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="flex flex-wrap justify-start"
                  aria-label={`Respuesta de la pregunta ${pregunta.orden}`}
                  value={valor}
                  disabled={bloqueado}
                  onValueChange={(siguiente) => siguiente !== '' && alResponder(pregunta.idPregunta, siguiente)}
                >
                  {pregunta.alternativas.map((alternativa) => (
                    <ToggleGroupItem
                      key={alternativa.id}
                      value={String(alternativa.id)}
                      aria-label={alternativa.respuesta}
                    >
                      {alternativa.respuesta}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </CardContent>
            )}
          </Card>
        )
      })}
    </section>
  )
}
```

Replace `src/features/examenes/rendir-examen-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/errors'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasExamenes, type ExamenEnCurso } from './api'
import { ResolucionDeExamen } from './components/resolucion-de-examen'
import { esExamenEntregado } from './mensajes'
import { useAutoguardado } from './use-autoguardado'

function Examen({ examen }: { examen: ExamenEnCurso }) {
  const { respuestas, estado, responder, guardarAhora } = useAutoguardado(examen)
  return (
    <ResolucionDeExamen
      examen={examen}
      respuestas={respuestas}
      estado={estado}
      bloqueado={false}
      alResponder={responder}
      alReintentar={() => void guardarAhora()}
    />
  )
}

export function RendirExamenPage({ idTurno }: { idTurno: number }) {
  const sesion = useSesion()
  const codAlumno = sesion?.codPersona ?? ''
  const examen = useQuery(consultasExamenes.enCurso(idTurno, codAlumno))
  const error = errorDePrimeraCarga(examen)

  return (
    <>
      <PageHeader
        titulo={examen.data?.turnoTeorico ?? PANTALLAS.rendirExamen.titulo}
        descripcion={PANTALLAS.rendirExamen.descripcion}
      />
      <AvisoDeTeoria accion="rendirExamen" />
      {esExamenEntregado(error) ? (
        <Alert>
          <AlertDescription className="grid gap-3">
            <span>{(error as ApiError).message}</span>
            <Button variant="outline" size="sm" className="justify-self-start" asChild>
              <Link to="/examenes/$id/resultado" params={{ id: String(idTurno) }}>
                Ver el resultado
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void examen.refetch()} />
      ) : examen.data === undefined ? (
        <Skeleton className="h-64 w-full" aria-busy="true" />
      ) : (
        <Examen examen={examen.data} />
      )}
    </>
  )
}
```

`iniciar` never sends `correcto`, `respuestaCorrecta` or `explicacion`, so there is nothing to hide: CA-EXA-03 is satisfied by the contract and asserted on the whole document text. Nothing is written to `localStorage` or `sessionStorage`.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/examenes/rendir-examen-page.test.tsx
```

Expected: PASS, 11 tests. Note the two deliberate slacks in the timing cases: the debounce is checked at 1 000 ms (no request) and 1 200 ms (request), not at 1 999 / 1, because `shouldAdvanceTime: true` also moves the fake clock with real time.

- [ ] **Step 7: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **791 tests**.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add rendir examen with its session start and autosave"
```

---

### Task 16: Rendir examen: the countdown, E15, E29, the automatic entrega and the D11 path (M4-8, M4-10) (CA-EXA-06, CA-EXA-07, CA-EXA-09, CA-EXA-10)

**Files:**

- Create: `src/features/examenes/components/cabecera-de-examen.tsx`
- Modify (full rewrite): `src/features/examenes/rendir-examen-page.tsx`
- Test: `src/features/examenes/entrega-de-examen.test.tsx`

**Interfaces:**
- Consumes: `milisegundosRestantes`, `formatearRestante`, `AVISO_MINUTOS_RESTANTES`, `textoRespondidas`, `textoSinResponder`, `TEXTO_CONFIRMAR_ENTREGA`, `TEXTO_QUEDAN_CINCO_MINUTOS`, `TEXTO_VENTANA_CERRADA`, `entregarExamen`, `esVentanaCerrada`, `esExamenEntregado`, `ConfirmDialog`, `toast`.
- Produces: `CabeceraDeExamen` — the sticky header with the countdown, **E29** and Entregar, plus **E15** in its last five minutes — and a `RendirExamenPage` that, on reaching zero, disables the inputs, flushes the pending autosave, calls `entregar` **once**, shows **E16** and moves to the result; a 409 D11 (or D10) takes the same path, any other error leaves the exam open with the server's message.

- [ ] **Step 1: Write the failing tests**

Create `src/features/examenes/entrega-de-examen.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  TEXTO_CONFIRMAR_ENTREGA,
  TEXTO_QUEDAN_CINCO_MINUTOS,
  TEXTO_VENTANA_CERRADA,
  textoRespondidas,
  textoSinResponder,
} from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { D11_VENTANA_CERRADA } from '@/mocks/sigeda/cuestionarios-teoria'
import { cuestionarioDe } from '@/mocks/sigeda/datos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'
import type { UserEvent } from '@testing-library/user-event'

async function abrirExamen(usuario: UserEvent) {
  await iniciarComo('alumno.lopez')
  const resultado = renderApp('/examenes/3', usuario)
  await screen.findByRole('group', { name: 'Pregunta 1' })
  return resultado
}

async function esperarRuta(router: { state: { location: { pathname: string } } }, ruta: string) {
  await waitFor(() => expect(router.state.location.pathname).toBe(ruta))
}

function segundosRestantes(): number {
  const texto = screen.getByText(/^Tiempo restante:/).textContent ?? ''
  const [minutos, segundos] = (texto.split(': ')[1] ?? '0:0').split(':').map(Number)
  return minutos * 60 + segundos
}

describe('Entrega del examen', () => {
  it('CA-EXA-06 el encabezado cuenta el tiempo restante y las respondidas con E29', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 25 })
    await abrirExamen(usuario)
    expect(segundosRestantes()).toBeGreaterThan(24 * 60)
    expect(segundosRestantes()).toBeLessThanOrEqual(25 * 60)
    expect(screen.getByText(textoRespondidas(2, 5))).toBeInTheDocument()
    await avanzar(60_000)
    expect(segundosRestantes()).toBeGreaterThan(23 * 60)
    expect(segundosRestantes()).toBeLessThanOrEqual(24 * 60)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[0]!)
    expect(await screen.findByText(textoRespondidas(3, 5))).toBeInTheDocument()
  })

  it('CA-EXA-06 a los cinco minutos restantes aparece E15', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 7 })
    await abrirExamen(usuario)
    expect(screen.queryByText(TEXTO_QUEDAN_CINCO_MINUTOS)).not.toBeInTheDocument()
    await avanzar(2 * 60_000 + 1_000)
    expect(await screen.findByText(TEXTO_QUEDAN_CINCO_MINUTOS)).toBeInTheDocument()
  })

  it('CA-EXA-07 Entregar confirma con E17 y con E18 cuando quedan preguntas sin responder', async () => {
    const { usuario } = relojFalso()
    abrirVentanaDeExamen()
    await abrirExamen(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText(`${TEXTO_CONFIRMAR_ENTREGA} ${textoSinResponder(3)}`)).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument()
  })

  it('CA-EXA-07 con todo respondido la confirmación solo muestra E17 y entrega', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen()
    const { router } = await abrirExamen(usuario)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 2' })).getAllByRole('radio')[0]!)
    await usuario.click(within(screen.getByRole('group', { name: 'Pregunta 5' })).getAllByRole('radio')[0]!)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'Regular')
    await avanzar(2_100)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText(TEXTO_CONFIRMAR_ENTREGA)).toBeInTheDocument()
    expect(aviso.queryByText(/sin responder/)).not.toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Entregar' }))
    expect(await screen.findByText('Examen entregado con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/examenes/3/resultado')
    expect(cuestionarioDe(3, '111111')?.estado).toBe('ENTREGADO')
  })

  it('CA-EXA-09 al llegar a cero bloquea los campos, entrega una sola vez y muestra E16', async () => {
    const { usuario, avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 10 })
    let entregas = 0
    const oyente = ({ request }: { request: Request }) => {
      if (request.method === 'POST' && request.url.includes('/entregar')) entregas += 1
    }
    server.events.on('request:start', oyente)
    const { router } = await abrirExamen(usuario)
    await usuario.type(screen.getByLabelText('Respuesta de la pregunta 4'), 'Regular')
    await avanzar(10 * 60_000)
    await esperarRuta(router, '/examenes/3/resultado')
    await avanzar(100)
    expect(await screen.findByText(TEXTO_VENTANA_CERRADA, undefined, { timeout: 3_000 })).toBeInTheDocument()
    expect(entregas).toBe(1)
    expect(cuestionarioDe(3, '111111')?.estado).toBe('ENTREGADO')
    expect(cuestionarioDe(3, '111111')?.calificaciones.some((fila) => fila.idPregunta === 4 && fila.correcto)).toBe(true)
    server.events.removeListener('request:start', oyente)
  })

  it('CA-EXA-10 un 409 D11 al entregar se muestra como E16 y pasa al resultado', async () => {
    server.use(
      http.post(`${API}/api/cuestionarios/:id/entregar`, () =>
        HttpResponse.text(D11_VENTANA_CERRADA, { status: 409 }),
      ),
    )
    const { usuario } = relojFalso()
    abrirVentanaDeExamen()
    const { router } = await abrirExamen(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Entregar' }))
    await esperarRuta(router, '/examenes/3/resultado')
    expect(await screen.findByText(TEXTO_VENTANA_CERRADA, undefined, { timeout: 3_000 })).toBeInTheDocument()
  })

  it('CA-EXA-07 un error que no es del cierre deja el examen abierto con su mensaje', async () => {
    server.use(http.post(`${API}/api/cuestionarios/:id/entregar`, () => HttpResponse.error()))
    const { usuario } = relojFalso()
    abrirVentanaDeExamen()
    const { router } = await abrirExamen(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Entregar' }))
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/examenes/3')
    expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/examenes/entrega-de-examen.test.tsx
```

Expected: FAIL — `Unable to find an element with the text: /^Tiempo restante:/` and `Unable to find an accessible element with the role "button" and name "Entregar"`; Task 15 renders the questions but no header.

- [ ] **Step 3: Land the sticky header**

Create `src/features/examenes/components/cabecera-de-examen.tsx`:

```tsx
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  AVISO_MINUTOS_RESTANTES,
  formatearRestante,
  TEXTO_CONFIRMAR_ENTREGA,
  TEXTO_QUEDAN_CINCO_MINUTOS,
  textoRespondidas,
  textoSinResponder,
} from '@/lib/dominio/teoria'

type Props = {
  restante: number
  respondidas: number
  total: number
  entregando: boolean
  alEntregar: () => void
}

export function CabeceraDeExamen({ restante, respondidas, total, entregando, alEntregar }: Props) {
  const sinResponder = total - respondidas
  const cerrado = restante === 0
  return (
    <div className="sticky top-14 z-10 grid gap-3 rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium tabular-nums">Tiempo restante: {formatearRestante(restante)}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{textoRespondidas(respondidas, total)}</p>
        <ConfirmDialog
          disparador={
            <Button type="button" disabled={cerrado || entregando}>
              Entregar
            </Button>
          }
          titulo="¿Entregar el examen?"
          descripcion={
            sinResponder > 0
              ? `${TEXTO_CONFIRMAR_ENTREGA} ${textoSinResponder(sinResponder)}`
              : TEXTO_CONFIRMAR_ENTREGA
          }
          confirmar="Entregar"
          alConfirmar={alEntregar}
        />
      </div>
      {restante > 0 && restante <= AVISO_MINUTOS_RESTANTES * 60_000 && (
        <Alert>
          <AlertDescription>{TEXTO_QUEDAN_CINCO_MINUTOS}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Land the countdown and the automatic entrega**

Replace `src/features/examenes/rendir-examen-page.tsx`:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import { milisegundosRestantes, TEXTO_VENTANA_CERRADA } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import {
  clavesExamenes,
  consultasExamenes,
  entregarExamen,
  MENSAJE_EXAMEN_ENTREGADO,
  type ExamenEnCurso,
} from './api'
import { contarRespondidas } from './autoguardado'
import { CabeceraDeExamen } from './components/cabecera-de-examen'
import { ResolucionDeExamen } from './components/resolucion-de-examen'
import { esExamenEntregado, esVentanaCerrada } from './mensajes'
import { useAutoguardado } from './use-autoguardado'

const PASO_DEL_RELOJ = 1_000

function Examen({ examen, idTurno }: { examen: ExamenEnCurso; idTurno: number }) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const { respuestas, estado, responder, guardarAhora } = useAutoguardado(examen)
  const entregado = useRef(false)
  const [restante, setRestante] = useState(() => milisegundosRestantes(examen.fechaExamen, examen.horaFin))
  const cerrado = restante === 0

  const entregar = useMutation({
    mutationFn: () => entregarExamen(examen.id, examen.codAlumno),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: clavesExamenes.todo })
    },
    onSuccess: async () => {
      toast[cerrado ? 'info' : 'success'](cerrado ? TEXTO_VENTANA_CERRADA : MENSAJE_EXAMEN_ENTREGADO)
      await navegar({ to: '/examenes/$id/resultado', params: { id: String(idTurno) } })
    },
    onError: async (error) => {
      if (!esVentanaCerrada(error) && !esExamenEntregado(error)) {
        entregado.current = false
        toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO)
        return
      }
      toast.info(TEXTO_VENTANA_CERRADA)
      await navegar({ to: '/examenes/$id/resultado', params: { id: String(idTurno) } })
    },
  })
  const enviarEntrega = entregar.mutate

  const entregarAhora = useCallback(async () => {
    if (entregado.current) return
    entregado.current = true
    await guardarAhora()
    enviarEntrega()
  }, [enviarEntrega, guardarAhora])

  useEffect(() => {
    const reloj = setInterval(
      () => setRestante(milisegundosRestantes(examen.fechaExamen, examen.horaFin)),
      PASO_DEL_RELOJ,
    )
    return () => clearInterval(reloj)
  }, [examen.fechaExamen, examen.horaFin])

  useEffect(() => {
    if (cerrado) void entregarAhora()
  }, [cerrado, entregarAhora])

  return (
    <>
      <CabeceraDeExamen
        restante={restante}
        respondidas={contarRespondidas(respuestas)}
        total={examen.preguntas.length}
        entregando={entregar.isPending}
        alEntregar={() => void entregarAhora()}
      />
      <ResolucionDeExamen
        examen={examen}
        respuestas={respuestas}
        estado={estado}
        bloqueado={cerrado}
        alResponder={responder}
        alReintentar={() => void guardarAhora()}
      />
    </>
  )
}

export function RendirExamenPage({ idTurno }: { idTurno: number }) {
  const sesion = useSesion()
  const codAlumno = sesion?.codPersona ?? ''
  const examen = useQuery(consultasExamenes.enCurso(idTurno, codAlumno))
  const error = errorDePrimeraCarga(examen)

  return (
    <>
      <PageHeader
        titulo={examen.data?.turnoTeorico ?? PANTALLAS.rendirExamen.titulo}
        descripcion={PANTALLAS.rendirExamen.descripcion}
      />
      <AvisoDeTeoria accion="rendirExamen" />
      {esExamenEntregado(error) ? (
        <Alert>
          <AlertDescription className="grid gap-3">
            <span>{(error as ApiError).message}</span>
            <Button variant="outline" size="sm" className="justify-self-start" asChild>
              <Link to="/examenes/$id/resultado" params={{ id: String(idTurno) }}>
                Ver el resultado
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void examen.refetch()} />
      ) : examen.data === undefined ? (
        <Skeleton className="h-64 w-full" aria-busy="true" />
      ) : (
        <Examen examen={examen.data} idTurno={idTurno} />
      )}
    </>
  )
}
```

Three details are load-bearing. `entregado` is a ref, so the effect that fires at zero can only submit once even if it re-runs. `entregarAhora` is a `useCallback` over `guardarAhora` and the mutation's stable `mutate`, which is what lets the effect list it as a dependency instead of silencing the lint rule. And **E16 is a toast**: it has to survive the navigation to the result, which an alert inside the page would not.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/examenes/entrega-de-examen.test.tsx
```

Expected: PASS, 7 tests. The two E16 cases wait for the pathname with `waitFor` and then advance the fake clock before querying the toast; asserting the text first is flaky under a full-suite load.

- [ ] **Step 6: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **798 tests**.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the exam countdown, its five-minute notice and the automatic entrega"
```

---

### Task 17: Resultado del examen: the alumno's view with E19 and the finished-turno detail (CA-RES-07, CA-RES-08, CA-RES-09, CA-RES-12)

**Files:**

- Modify (full rewrite): `src/features/examenes/resultado-examen-page.tsx`
- Test: `src/features/examenes/resultado-examen-page.test.tsx`

**Interfaces:**
- Consumes: `consultasExamenes.miExamen`, `StatusBadge` with the `examen`, `rendicion` and `respuesta` vocabularies, `textoConMinimo`, `TEXTO_RESULTADO_SIN_DETALLE`.
- Produces: `ResultadoExamenPage` — the nota against the applied minimum, the verdict, and the per-question detail **only** when the turno is `FINALIZADO`; otherwise **E19** and nothing else, which is what the server already enforces by sending `calificaciones: []`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/examenes/resultado-examen-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TEXTO_RESULTADO_SIN_DETALLE } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'

async function abrirResultado(username: string, idTurno: number) {
  await iniciarComo(username)
  const resultado = renderApp(`/examenes/${idTurno}/resultado`)
  await screen.findByRole('heading', { level: 2, name: 'Su resultado' })
  return resultado
}

describe('Resultado del examen', () => {
  it('CA-RES-07 CA-RES-03 muestra la nota, si aprobó y la nota mínima aplicable', async () => {
    await abrirResultado('alumno.torres', 1)
    expect(screen.getByText('12.00 / mínimo 18')).toBeInTheDocument()
    expect(screen.getByText('Desaprobado')).toBeInTheDocument()
    expect(screen.getByText('Adoctrinamiento de Vuelo')).toBeInTheDocument()
    expect(screen.getByText('Mensual')).toBeInTheDocument()
    expect(screen.getByText('Estado').nextElementSibling).toHaveTextContent('Entregado')
  })

  it('CA-RES-08 con el turno finalizado muestra por pregunta la respuesta, la correcta, el puntaje y la explicación', async () => {
    await abrirResultado('alumno.torres', 1)
    const detalle = within(screen.getByRole('region', { name: 'Detalle de sus respuestas' }))
    expect(detalle.getAllByRole('group', { name: /^Pregunta / })).toHaveLength(5)
    const primera = within(detalle.getByRole('group', { name: 'Pregunta 1' }))
    expect(primera.getByRole('heading', { level: 2, name: 'Pregunta 1 · 4 de 4' })).toBeInTheDocument()
    expect(primera.getByText('Correcta')).toBeInTheDocument()
    expect(primera.getByText('Su respuesta: El PDI EA-510')).toBeInTheDocument()
    expect(primera.getByText('Respuesta correcta: El PDI EA-510')).toBeInTheDocument()
    expect(primera.getByText('El PDI EA-510 es el plan de instrucción vigente del curso.')).toBeInTheDocument()
    const tercera = within(detalle.getByRole('group', { name: 'Pregunta 3' }))
    expect(tercera.getByText('Incorrecta')).toBeInTheDocument()
    expect(tercera.getByRole('heading', { level: 2, name: 'Pregunta 3 · 0 de 4' })).toBeInTheDocument()
  })

  it('CA-RES-07 mientras el turno no está finalizado muestra E19 y ninguna respuesta', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    server.use(
      http.get(`${API}/api/turnos-teoricos/3/mi-cuestionario`, () =>
        HttpResponse.json({
          id: 3,
          turnoTeorico: { id: 3, nombre: 'Semanal Adoctrinamiento de Vuelo', estado: 'EN_CURSO' },
          materia: { id: 3, nombre: 'Adoctrinamiento de Vuelo', notaMinima: 18 },
          tipoExamen: 'SEMANAL',
          notaMinimaAplicada: 18,
          codAlumno: '111111',
          alumno: 'Oscar Lopez Chaparro',
          estado: 'ENTREGADO',
          fechaExamen: '2026-09-25',
          horaInicio: '09:00',
          horaFin: '09:25',
          fechaEntrega: '2026-09-25',
          horaEntrega: '09:10',
          puntajeTotal: 20,
          nota: 8,
          aprobado: false,
          calificaciones: [],
        }),
      ),
    )
    await abrirResultado('alumno.lopez', 3)
    expect(screen.getByText('8.00 / mínimo 18')).toBeInTheDocument()
    expect(screen.getByText(TEXTO_RESULTADO_SIN_DETALLE)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Detalle de sus respuestas' })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Respuesta correcta')
  })

  it('CA-RES-09 el alumno no puede abrir el resultado de un turno ajeno', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/examenes/1/resultado')
    expect(await screen.findByText(/no encontr/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Su resultado' })).not.toBeInTheDocument()
  })

  it('CA-RES-12 un fallo en la primera carga del resultado ofrece Reintentar', async () => {
    server.use(http.get(`${API}/api/turnos-teoricos/:id/mi-cuestionario`, () => HttpResponse.error()))
    await iniciarComo('alumno.torres')
    const { usuario } = renderApp('/examenes/1/resultado')
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    server.resetHandlers()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Su resultado' })).toBeInTheDocument()
  })

  it('CA-RES-07 el resultado ofrece volver a Mis exámenes', async () => {
    await abrirResultado('alumno.torres', 1)
    expect(screen.getByRole('link', { name: 'Volver a Mis exámenes' })).toHaveAttribute('href', '/examenes')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/examenes/resultado-examen-page.test.tsx
```

Expected: FAIL — every test times out on `screen.findByRole('heading', { level: 2, name: 'Su resultado' })`, because the skeleton page of Task 5 has only its header.

- [ ] **Step 3: Land the result screen**

Replace `src/features/examenes/resultado-examen-page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'
import {
  etiquetaDeTipoExamen,
  TEXTO_RESULTADO_SIN_DETALLE,
  textoConMinimo,
} from '@/lib/dominio/teoria'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasExamenes } from './api'

export function ResultadoExamenPage({ idTurno }: { idTurno: number }) {
  const sesion = useSesion()
  const codAlumno = sesion?.codPersona ?? ''
  const consulta = useQuery(consultasExamenes.miExamen(idTurno, codAlumno))
  const error = errorDePrimeraCarga(consulta)
  const examen = consulta.data
  const finalizado = examen?.turnoTeorico.estado === 'FINALIZADO'

  return (
    <>
      <PageHeader
        titulo={examen?.turnoTeorico.nombre ?? PANTALLAS.resultadoExamen.titulo}
        descripcion={PANTALLAS.resultadoExamen.descripcion}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/examenes">Volver a Mis exámenes</Link>
          </Button>
        }
      />
      <AvisoDeTeoria accion="rendirExamen" />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void consulta.refetch()} />
      ) : examen === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Su resultado</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Nota</dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {textoConMinimo(examen.nota, examen.notaMinimaAplicada)}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Resultado</dt>
                  <dd>
                    {examen.aprobado === null ? (
                      '—'
                    ) : (
                      <StatusBadge vocabulario="examen" valor={examen.aprobado ? 'aprobado' : 'desaprobado'} />
                    )}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Materia</dt>
                  <dd className="font-medium">{examen.materia.nombre}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Tipo de examen</dt>
                  <dd className="font-medium">{etiquetaDeTipoExamen(examen.tipoExamen)}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Entregado</dt>
                  <dd className="font-medium tabular-nums">
                    {examen.fechaEntrega === null
                      ? '—'
                      : `${formatearFecha(examen.fechaEntrega)} ${examen.horaEntrega ?? ''}`}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">Estado</dt>
                  <dd>
                    <StatusBadge vocabulario="rendicion" valor={examen.estado} />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          {finalizado ? (
            <section aria-label="Detalle de sus respuestas" className="grid gap-4">
              {examen.calificaciones.map((fila) => (
                <Card key={fila.idPregunta} role="group" aria-label={`Pregunta ${fila.orden}`}>
                  <CardHeader>
                    <CardTitle>
                      <h2>
                        Pregunta {fila.orden} · {fila.puntajeObtenido} de {fila.puntajeMaximo}
                      </h2>
                    </CardTitle>
                    <p>{fila.enunciado}</p>
                  </CardHeader>
                  <CardContent className="grid gap-1 text-sm">
                    <StatusBadge
                      vocabulario="respuesta"
                      valor={fila.correcto ? 'correcta' : 'incorrecta'}
                      className="w-fit"
                    />
                    <p>Su respuesta: {fila.respuestaAlumno ?? 'Sin responder'}</p>
                    <p>Respuesta correcta: {fila.respuestaCorrecta}</p>
                    {fila.explicacion !== null && <p className="text-muted-foreground">{fila.explicacion}</p>}
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : (
            <Alert>
              <AlertDescription>{TEXTO_RESULTADO_SIN_DETALLE}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </>
  )
}
```

The detail is **conditionally rendered**, never hidden with CSS, and the test asserts that the words `Respuesta correcta` are absent from the document while the turno is open.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/examenes/resultado-examen-page.test.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **804 tests**.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the resultado del examen screen for the alumno"
```

---

### Task 18: Decision log, README and the mock-data check (M4 wrap-up)

**Files:**

- Modify: `README.md`
- Modify: `docs/decisiones.md`

**Interfaces:**
- Consumes: every handler registered in `src/mocks/handlers.ts`; `main.tsx` loads the mocks only when `import.meta.env.DEV && config.mockApi`.
- Produces: `docs/decisiones.md` gains the "Teoría y banco de preguntas (M4)" section with how M4-1..M4-23 were applied, including the four findings this milestone paid for (the pinned clock, the autosave ownership the linter forced, E16 as a toast, and E8 being M3's A5); `README.md` documents the theory contract, its mocks and dependencies 5, 6 and 7; and a production build that carries no theory fixture.

- [ ] **Step 1: Record the M4 decisions and update the README**

In `README.md`, replace:

```markdown
MSW responde en el navegador a `/auth/*`, a los turnos, evaluaciones y catálogos de `docs/contrato-api-turnos.md`, a las personas, cuentas, grupos, fases, maniobras y materias de `docs/contrato-api-matricula.md` y a los documentos, cuestionarios y consultas de `docs/contrato-api-aprendizaje.md`, con datos basados en el seed de `sigeda-back` (los datos vuelven al estado inicial al recargar). Contraseña de todos: `123`.
```

with:

```markdown
MSW responde en el navegador a `/auth/*`, a los turnos, evaluaciones y catálogos de `docs/contrato-api-turnos.md`, a las personas, cuentas, grupos, fases, maniobras y materias de `docs/contrato-api-matricula.md`, a los documentos, cuestionarios y consultas de `docs/contrato-api-aprendizaje.md` y al banco de preguntas, los turnos teóricos y los exámenes de `docs/contrato-api-teoria.md`, con datos basados en el seed de `sigeda-back` (los datos vuelven al estado inicial al recargar). Contraseña de todos: `123`.
```

In `README.md`, replace:

```markdown
`VITE_DEPENDENCIAS_RESUELTAS` lista, separados por coma, los números de dependencia de backend ya corregidos en los servidores en uso (por ejemplo `22,30,32,33,37,39`). Mientras falte el número, la aplicación deshabilita la acción que lo necesita: Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33), Eliminar fase (37) y, en Aprendizaje, Subir documento y Eliminar documento (39, `sigeda_chat_status`). En modo demostración todas están disponibles.
```

with:

```markdown
`VITE_DEPENDENCIAS_RESUELTAS` lista, separados por coma, los números de dependencia de backend ya corregidos en los servidores en uso (por ejemplo `22,30,32,33,37,39`). Mientras falte el número, la aplicación deshabilita la acción que lo necesita: Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33), Eliminar fase (37), las escrituras de Materias (5), todo el módulo de Teoría (6) y el bloqueo por subsanación del formulario de turno práctico (7); en Aprendizaje, Subir documento y Eliminar documento (39, `sigeda_chat_status`). En modo demostración todas están disponibles.

Teoría contra el servidor real: nada del módulo existe todavía en `sigeda-back` (dependencias 6 y 7), así que las seis pantallas avisan en su encabezado que funcionan solo en modo mock y sus escrituras quedan deshabilitadas. El detalle de lo que falta está en `docs/contrato-api-teoria.md` §10.
```

Append to `docs/decisiones.md`:

```markdown
## Teoría y banco de preguntas (M4)

Las decisiones M4-1 a M4-23 están en el §16 del spec y el contrato en `docs/contrato-api-teoria.md`; aquí queda cómo se aplicaron.

- **Contrato primero, en `src/mocks/sigeda/` (M4-18).** `semilla-teoria.ts` arma las fijaciones de la §9 del contrato (24 preguntas, 71 alternativas, 5 turnos teóricos, 3 exámenes) y `crearDatos(hoy)` las incorpora al mismo almacén que M1 y M2, así que `reiniciarDatosMock()` las reinicia en cada prueba. Los handlers son `preguntas.ts`, `turnos-teoricos.ts`, `cuestionarios-teoria.ts` (exporta `handlersCuestionariosTeoria`, porque `src/mocks/ia/cuestionarios.ts` ya existía) y `estado-teorico.ts`.
- **Las derivaciones compartidas viven en el almacén, la calificación en el turno.** `datos.ts` gana `alumnosHabilitados`, `desaprobadosSinSubsanar`, `bloqueadoPorSubsanacion`, `preguntaEnUso` y `materiaEnUso`; `turnos-teoricos.ts` exporta `calificar` y `cerrarExamenesVencidos` (§4.7) porque el cierre perezoso lo necesitan tanto el detalle del turno como los endpoints del alumno.
- **El 409 de materias quedó derivado (M4-18, hueco 10).** `MateriaMock.conPreguntas` desapareció; `DELETE /api/materias/{id}` responde 409 si la materia tiene preguntas o turnos teóricos, calculado sobre las filas del mock.
- **La ventana del examen la abre un ayudante de pruebas (M4-19).** `crearDatos` deja el turno 3 en `00:00`–`23:59` y `abrirVentanaDeExamen({ transcurridos, restantes })` de `src/test/tiempo.ts` fija el reloj falso en las 09:00 de hoy con `vi.setSystemTime` y reescribe las horas del turno alrededor de esa base. Fijar la hora, en lugar de leer la del reloj de pared, es lo que hace deterministas la cuenta atrás, el aviso de los 5 minutos y la auto-entrega sin ningún recorte por medianoche.
- **El código del llamador siempre sale de la sesión (M4-2).** `codInstructor` y `codAlumno` son parámetros explícitos de la capa de API, y todos los sitios que la llaman los toman de `sesion.codPersona` (`useSesion()` en las pantallas, `context.sesion.actual()` en los cargadores). Ninguna pantalla los lee de la URL: `/examenes/$id` es un id de turno teórico y el cargador comprueba que el alumno tenga ese turno entre sus pendientes o un examen propio.
- **El puntaje de 20 se valida en el navegador (M4-7).** `puntajeAsignado` alimenta el contador E9 y Guardar queda deshabilitado mientras la suma no sea 20; el resto de las reglas (repetidas, materia del turno, ventana de 10 minutos, fecha futura) están en `crearEsquemaTurnoTeorico` y otra vez en el mock, como en el contrato.
- **La nota mínima aplicable no se recalcula (M4-11).** Las pantallas muestran `notaMinimaAplicada` tal como llega, con `textoConMinimo(nota, minimo)`; la excepción del Pre-Solo vive en `minimoAplicado()` del mock, que es el servidor.
- **El autoguardado vive en un hook (M4-9).** `useAutoguardado` mantiene las respuestas, el estado E27/E28/E14 y los dos relojes: 2 s de rebote tras el último cambio y un máximo de 10 s que solo se rearma después de guardar. `ResolucionDeExamen` es presentacional y la página dueña de la cuenta atrás llama a `guardarAhora()` antes de entregar. Nada se guarda en `localStorage`.
- **E16 se muestra como toast (M4-10).** Al llegar a cero, o cuando el servidor responde D11, la pantalla avisa con el texto E16 y navega al resultado; el toast sobrevive a la navegación, que una alerta dentro de la página no haría.
- **E8 es el mismo texto que A5 de M3.** El §16.3 lo repite palabra por palabra, así que `dominio/teoria.ts` reexporta `TEXTO_GENERACION_RECHAZADA` de `dominio/aprendizaje.ts` como `TEXTO_GENERACION_RECHAZADA_E8` en vez de duplicar la cadena, y la importación reutiliza la lista cerrada de mensajes de M3 (`mensajeDeError`).
- **La importación traduce y bloquea en el navegador (M4-5).** `importacion.ts` hace el mapeo campo por campo de la §6 del contrato: recorta el enunciado a 500 con E5, marca E26 por debajo de 10, recorta las alternativas a 200 en silencio, sintetiza Verdadero y Falso, señala E6 y los duplicados del lote, y deja la fila sin importar hasta que se revise. El lote se escribe entero o nada con `POST /api/preguntas/lote`.
- **`/banco/importar` no espera la dependencia 39 (M4-5).** Solo la 6, porque la pregunta se escribe en `sigeda-back` con el `codInstructor` que envía el frontend.
- **Permisos y menú (M4-14).** Banco e Importar usan `Manage Questions`; Turnos teóricos, Registrar, Resultados y Modificar usan `Manage Exams`; las tres pantallas del alumno usan `Take Exams` más `roles: SOLO_ALUMNO`, porque el Administrador Web también tiene el permiso. El Comandante de Escuadrón no ve nada de teoría en M4.
- **Lo que M4 no hace (M4-23, §16.6).** No hay historial de exámenes del alumno, ni inasistencias con la reducción del 50 %, ni `causales[]`, ni la variante en lote de `estado-teorico`, ni validación de cruce de horarios entre turnos teóricos.
```

- [ ] **Step 2: Check that the theory mock data stays out of production**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && rm -rf dist && pnpm exec vite build && ! grep -rlE "Adoctrinamiento de Vuelo|autorrotación|Juan Torres Perez|9e500000-0000-4000" dist && echo "sin datos de prueba"
```

Expected: the build succeeds and the command prints `sin datos de prueba` (no materia name, no fixture text and no mock question id in `dist/`).

- [ ] **Step 3: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **804 tests**.

No test changes in this task: the count is the same as after Task 17.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "docs: record m4 decisions and the theory mock data"
```

---

### Task 19: The M1 turno práctico subsanación hook with single-alumno `estado-teorico` (M4-12) (CA-RES-10)

**Last task, and droppable.** If the plan overruns, stop after Task 18: M4 keeps every screen, and only CA-RES-10 — the practical form's warning — is lost. Nothing in Tasks 1–18 depends on this task.

**Files:**

- Create: `src/features/turnos/use-estado-teorico.ts`
- Modify: `src/features/turnos/components/formulario-turno.tsx`
- Modify: `src/features/turnos/modificar-turno-page.test.tsx`
- Test: `src/features/turnos/subsanacion-turno.test.tsx`

**Interfaces:**
- Consumes: `consultasExamenes.estadoTeorico`, `useQueries`, `accionDisponible('bloqueoSubsanacion')`, `textoBloqueadoPorSubsanacion`, `TEXTO_ESTADO_TEORICO_DESCONOCIDO`.
- Produces: `useEstadoTeoricoDeAlumnos(codigos)` — one `estado-teorico` request **per alumno already added to the form**, not per option of the picker (M4-12: the bulk endpoint is dependency 56 and out of scope) — and a turno práctico form where a blocked row shows **E22** with the server's motivo and Guardar is disabled, while a row whose state could not be read shows **E23** and Guardar still works.

- [ ] **Step 1: Write the failing tests**

Create `src/features/turnos/subsanacion-turno.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { TEXTO_ESTADO_TEORICO_DESCONOCIDO, textoBloqueadoPorSubsanacion } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const MOTIVO = 'Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.'

async function abrirRegistrarTurno() {
  await iniciarComo('jefe.operaciones')
  const resultado = renderApp('/turnos/nuevo')
  await screen.findByLabelText('Nombre')
  await screen.findByRole('option', { name: 'Robinson R22' })
  return resultado
}

async function agregarAlumno(usuario: UserEvent, numero: number, codigo: string) {
  await usuario.click(screen.getByRole('button', { name: 'Agregar alumno' }))
  await screen.findByRole('option', { name: 'Ana Torres Martinez' })
  await usuario.selectOptions(screen.getByLabelText(`Alumno ${numero}`), codigo)
}

describe('Bloqueo por subsanación en el turno práctico', () => {
  it('CA-RES-10 la fila de un alumno bloqueado muestra E22 con su motivo e impide guardar', async () => {
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '666666')
    expect(await screen.findByText(textoBloqueadoPorSubsanacion(MOTIVO))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeDisabled()
  })

  it('CA-RES-10 un alumno sin subsanación pendiente no muestra ningún aviso', async () => {
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '111111')
    expect(await screen.findByLabelText('Alumno 1')).toHaveValue('111111')
    expect(screen.queryByText(textoBloqueadoPorSubsanacion(MOTIVO))).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_ESTADO_TEORICO_DESCONOCIDO)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeEnabled()
  })

  it('CA-RES-10 quitar al alumno bloqueado vuelve a habilitar Guardar', async () => {
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '666666')
    await screen.findByText(textoBloqueadoPorSubsanacion(MOTIVO))
    await usuario.click(screen.getByRole('button', { name: 'Quitar alumno 1' }))
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeEnabled()
  })

  it('CA-RES-10 si el estado teórico no se puede consultar la fila muestra E23 y se puede guardar', async () => {
    server.use(http.get(`${API}/api/personas/:cod/estado-teorico`, () => HttpResponse.error()))
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '666666')
    expect(await screen.findByText(TEXTO_ESTADO_TEORICO_DESCONOCIDO)).toBeInTheDocument()
    expect(screen.queryByText(textoBloqueadoPorSubsanacion(MOTIVO))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeEnabled()
  })

  it('CA-RES-10 sin la dependencia 7 no se consulta el estado teórico ni se bloquea', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    let consultas = 0
    const oyente = ({ request }: { request: Request }) => {
      if (request.url.includes('/estado-teorico')) consultas += 1
    }
    server.events.on('request:start', oyente)
    const { usuario } = await abrirRegistrarTurno()
    await agregarAlumno(usuario, 1, '666666')
    expect(await screen.findByLabelText('Alumno 1')).toHaveValue('666666')
    expect(screen.queryByText(textoBloqueadoPorSubsanacion(MOTIVO))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeEnabled()
    expect(consultas).toBe(0)
    server.events.removeListener('request:start', oyente)
  })
})
```

Three M1 tests save turno 8, which contains alumno `666666` — the one M4's fixtures block. Dependency 57 has `POST` **and** `PUT /api/turnos` reject a blocked alumno, so the block is correct on both, and those three flows have to take the alumno out first:

In `src/features/turnos/modificar-turno-page.test.tsx`, replace:

```tsx
import { iniciarComo, renderApp } from '@/test/render'
```

with:

```tsx
import { textoBloqueadoPorSubsanacion } from '@/lib/dominio/teoria'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const MOTIVO_666666 = 'Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.'
```

In `src/features/turnos/modificar-turno-page.test.tsx`, replace:

```tsx
describe('Modificar turno', () => {
```

with:

```tsx
async function quitarAlumnoBloqueado(usuario: UserEvent) {
  await screen.findByText(textoBloqueadoPorSubsanacion(MOTIVO_666666))
  await usuario.click(screen.getByRole('button', { name: 'Quitar alumno 2' }))
}

describe('Modificar turno', () => {
```

In `src/features/turnos/modificar-turno-page.test.tsx`, replace:

```tsx
  it('CA-TUR-12 aplica las mismas validaciones que registrar', async () => {
    const { usuario } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
```

with:

```tsx
  it('CA-TUR-12 aplica las mismas validaciones que registrar', async () => {
    const { usuario } = await abrirEdicion()
    await quitarAlumnoBloqueado(usuario)
    await usuario.clear(await screen.findByLabelText('Nombre'))
```

In `src/features/turnos/modificar-turno-page.test.tsx`, replace:

```tsx
  it('CA-TUR-12 guarda los cambios sin advertir cruces con su propio horario', async () => {
    const { usuario, router } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
```

with:

```tsx
  it('CA-TUR-12 guarda los cambios sin advertir cruces con su propio horario', async () => {
    const { usuario, router } = await abrirEdicion()
    await quitarAlumnoBloqueado(usuario)
    await usuario.clear(await screen.findByLabelText('Nombre'))
```

In `src/features/turnos/modificar-turno-page.test.tsx`, replace:

```tsx
    const { usuario } = await abrirEdicion()
    await screen.findByLabelText('Nombre')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('No se puede modificar. El turno ya ha sido evaluado.')).toBeInTheDocument()
```

with:

```tsx
    const { usuario } = await abrirEdicion()
    await screen.findByLabelText('Nombre')
    await quitarAlumnoBloqueado(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('No se puede modificar. El turno ya ha sido evaluado.')).toBeInTheDocument()
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/subsanacion-turno.test.tsx src/features/turnos/modificar-turno-page.test.tsx
```

Expected: FAIL — `subsanacion-turno.test.tsx` cannot find `Subsanación pendiente: …` on the row, and the three amended `modificar-turno-page.test.tsx` cases time out on the same text inside `quitarAlumnoBloqueado`.

- [ ] **Step 3: Land the per-alumno query**

Create `src/features/turnos/use-estado-teorico.ts`:

```ts
import { useQueries } from '@tanstack/react-query'
import { consultasExamenes, type EstadoTeorico } from '@/features/examenes/api'
import { accionDisponible } from '@/lib/dependencias'

export type EstadoTeoricoDeAlumno = { bloqueado: boolean; motivo: string | null; desconocido: boolean }

export function useEstadoTeoricoDeAlumnos(codigos: readonly string[]): Map<string, EstadoTeoricoDeAlumno> {
  const disponible = accionDisponible('bloqueoSubsanacion')
  const unicos = [...new Set(codigos.filter((codigo) => codigo !== ''))]
  const consultas = useQueries({
    queries: unicos.map((codigo) => ({ ...consultasExamenes.estadoTeorico(codigo), enabled: disponible })),
  })
  const estados = new Map<string, EstadoTeoricoDeAlumno>()
  unicos.forEach((codigo, indice) => {
    const consulta = consultas[indice]
    if (!disponible || consulta === undefined) return
    const datos = consulta.data as EstadoTeorico | undefined
    if (datos !== undefined) {
      estados.set(codigo, { bloqueado: datos.bloqueadoPorSubsanacion, motivo: datos.motivo, desconocido: false })
      return
    }
    if (consulta.error) estados.set(codigo, { bloqueado: false, motivo: null, desconocido: true })
  })
  return estados
}
```

`useQueries` takes the array built from the rows the form already has, so the request count is bounded by the form and there is no bulk endpoint to wait for. With dependency 7 unresolved the queries are disabled and nothing is blocked — E23 is for a request that failed, not for a request never made.

- [ ] **Step 4: Show E22 and E23 on the row and block Guardar**

In `src/features/turnos/components/formulario-turno.tsx`, replace:

```tsx
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnos, useGuardarTurno } from '../api'
```

with:

```tsx
import { TEXTO_ESTADO_TEORICO_DESCONOCIDO, textoBloqueadoPorSubsanacion } from '@/lib/dominio/teoria'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnos, useGuardarTurno } from '../api'
import { useEstadoTeoricoDeAlumnos } from '../use-estado-teorico'
```

In `src/features/turnos/components/formulario-turno.tsx`, replace:

```tsx
  const conflictos = conflictosDeAeronave(horarios, ocupacion.data ?? [], idTurno)
```

with:

```tsx
  const conflictos = conflictosDeAeronave(horarios, ocupacion.data ?? [], idTurno)
  const estadosTeoricos = useEstadoTeoricoDeAlumnos(horarios.map((alumno) => alumno.codAlumno))
  const hayBloqueados = [...estadosTeoricos.values()].some((estado) => estado.bloqueado)
```

In `src/features/turnos/components/formulario-turno.tsx`, replace:

```tsx
            const error = errors.alumnosTurno?.[indice]
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
```

with:

```tsx
            const error = errors.alumnosTurno?.[indice]
            const numero = indice + 1
            const estadoTeorico = estadosTeoricos.get(horarios[indice]?.codAlumno ?? '')
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
```

In `src/features/turnos/components/formulario-turno.tsx`, replace:

```tsx
                  <FieldError errors={[error?.codAlumno]} />
                </Field>
                <Field data-invalid={Boolean(error?.horaInicio)}>
```

with:

```tsx
                  <FieldError errors={[error?.codAlumno]} />
                  {estadoTeorico?.bloqueado === true && (
                    <FieldError>{textoBloqueadoPorSubsanacion(estadoTeorico.motivo ?? '')}</FieldError>
                  )}
                  {estadoTeorico?.desconocido === true && <FieldError>{TEXTO_ESTADO_TEORICO_DESCONOCIDO}</FieldError>}
                </Field>
                <Field data-invalid={Boolean(error?.horaInicio)}>
```

In `src/features/turnos/components/formulario-turno.tsx`, replace:

```tsx
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar turno'}
        </Button>
```

with:

```tsx
        <Button type="submit" disabled={guardar.isPending || hayBloqueados}>
          {guardar.isPending ? 'Guardando…' : 'Guardar turno'}
        </Button>
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/subsanacion-turno.test.tsx src/features/turnos/modificar-turno-page.test.tsx
```

Expected: PASS, 14 tests (5 + 9).

- [ ] **Step 6: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, **809 tests**.

This is the final count of M4.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: block a turno practico whose alumno has a pending subsanacion"
```

---

## Coverage

Every acceptance criterion of spec §16.4 and every decision of §16.2, with the tasks and test files that prove it. Paths are relative to `src/`.

| Criterion | Tasks | Proven by |
|---|---|---|
| CA-BAN-01 columns, 10 per page, the server orders and paginates | 2, 6 | `mocks/sigeda/preguntas.test.ts`, `features/preguntas/banco-page.test.tsx` |
| CA-BAN-02 five filters, page and order in the URL; a bad URL falls back | 2, 6 | `mocks/sigeda/preguntas.test.ts`, `banco-page.test.tsx` |
| CA-BAN-03 E3 with Registrar pregunta and Importar desde IA | 6, 7 | `banco-page.test.tsx`, `features/preguntas/dialogo-pregunta.test.tsx` |
| CA-BAN-04 materia, enunciado 10–500, dificultad, tipo and alternativas | 2, 7 | `mocks/sigeda/preguntas.test.ts`, `dialogo-pregunta.test.tsx` |
| CA-BAN-05 four distinct alternativas, exactly one correct | 1, 2, 7 | `lib/dominio/teoria.test.ts`, `mocks/sigeda/preguntas.test.ts`, `dialogo-pregunta.test.tsx` |
| CA-BAN-06 only Verdadero and Falso, one of them marked | 1, 2, 7 | `lib/dominio/teoria.test.ts`, `mocks/sigeda/preguntas.test.ts`, `dialogo-pregunta.test.tsx` |
| CA-BAN-07 `_____` in the enunciado and one expected answer | 1, 2, 7 | `lib/dominio/teoria.test.ts`, `mocks/sigeda/preguntas.test.ts`, `dialogo-pregunta.test.tsx` |
| CA-BAN-08 changing the type warns before discarding and rebuilds | 7 | `dialogo-pregunta.test.tsx` |
| CA-BAN-09 the explicación is optional, up to 1000 | 2, 7 | `mocks/sigeda/preguntas.test.ts`, `dialogo-pregunta.test.tsx` |
| CA-BAN-10 Modificar revalidates and keeps `origen` | 2, 7 | `mocks/sigeda/preguntas.test.ts`, `dialogo-pregunta.test.tsx` |
| CA-BAN-11 Eliminar confirms; `enUso` shows E2; a refusal shows D3 | 1, 2, 8 | `mocks/sigeda/semilla-teoria.test.ts`, `mocks/sigeda/preguntas.test.ts`, `features/preguntas/eliminar-pregunta.test.tsx` |
| CA-BAN-12 backend field errors under their field, alternativas by index | 2, 7 | `mocks/sigeda/preguntas.test.ts`, `dialogo-pregunta.test.tsx` |
| CA-BAN-13 first-load failure shows Reintentar, not an empty list | 6, 7 | `banco-page.test.tsx`, `dialogo-pregunta.test.tsx` (the dialog waits for its detail) |
| CA-BAN-14 outside mock mode without dependency 6: E1 and T11 | 5, 6 | `lib/dependencias.test.ts`, `lib/auth/rutas-m4.test.tsx`, `banco-page.test.tsx` |
| CA-IMP-01 one ready document, one type, 2–20, materia and dificultad | 9 | `features/preguntas/importar-page.test.tsx` |
| CA-IMP-02 disabled while generating, no double send, 120 s deadline | 9 | `importar-page.test.tsx` |
| CA-IMP-03 an unlisted message becomes E8 with no technical detail | 9 | `importar-page.test.tsx` |
| CA-IMP-04 an editable table with E4, nothing saved, rows removable | 9, 10 | `importar-page.test.tsx`, `features/preguntas/tabla-de-importacion.test.tsx` |
| CA-IMP-05 over 500 arrives cut with E5, under 10 shows E26, both blocked | 10 | `features/preguntas/importacion.test.ts`, `tabla-de-importacion.test.tsx` |
| CA-IMP-06 true/false becomes Verdadero and Falso with the right one marked | 10 | `importacion.test.ts`, `tabla-de-importacion.test.tsx` |
| CA-IMP-07 repeated alternativas show E6; a long option is cut silently | 10 | `importacion.test.ts`, `tabla-de-importacion.test.tsx` |
| CA-IMP-08 materia and dificultad overridable per question | 10 | `importacion.test.ts`, `tabla-de-importacion.test.tsx` |
| CA-IMP-09 E7 confirms; all or nothing; the error names the row | 2, 10 | `mocks/sigeda/preguntas.test.ts`, `importacion.test.ts`, `tabla-de-importacion.test.tsx` |
| CA-IMP-10 the imported questions appear with `origen` IA and it returns to `/banco` | 2, 10 | `mocks/sigeda/preguntas.test.ts`, `tabla-de-importacion.test.tsx` |
| CA-IMP-11 with nothing chosen, Importar is disabled | 10 | `tabla-de-importacion.test.tsx` |
| CA-TUT-01 columns, derived estado, who sat it, 10 per page | 3, 11 | `mocks/sigeda/turnos-teoricos.test.ts`, `features/turnos-teoricos/turnos-teoricos-page.test.tsx` |
| CA-TUT-02 six filters in the URL; no turnos shows E25 | 3, 11 | `mocks/sigeda/turnos-teoricos.test.ts`, `turnos-teoricos-page.test.tsx` |
| CA-TUT-03 name 10–60, future start, at least a 10-minute window | 3, 12 | `mocks/sigeda/turnos-teoricos.test.ts`, `features/turnos-teoricos/formulario-turno-teorico.test.tsx` |
| CA-TUT-04 programa first, it scopes the grupos, changing it clears one | 3, 12 | `mocks/sigeda/turnos-teoricos.test.ts`, `formulario-turno-teorico.test.tsx` |
| CA-TUT-05 questions of the materia; changing it confirms; E12 | 12 | `formulario-turno-teorico.test.tsx` |
| CA-TUT-06 at least one question, no repeats, integer 1–20 | 3, 12 | `mocks/sigeda/turnos-teoricos.test.ts`, `formulario-turno-teorico.test.tsx` |
| CA-TUT-07 the puntajes must add to 20; E9; Guardar gated | 1, 3, 12 | `lib/dominio/teoria.test.ts`, `mocks/sigeda/turnos-teoricos.test.ts`, `formulario-turno-teorico.test.tsx` |
| CA-TUT-08 origin turno only for subsanación or rezagado, and validated | 1, 3, 12 | `lib/dominio/teoria.test.ts`, `mocks/sigeda/turnos-teoricos.test.ts`, `formulario-turno-teorico.test.tsx` |
| CA-TUT-09 a late subsanación shows E11 and still saves | 12 | `formulario-turno-teorico.test.tsx` |
| CA-TUT-10 Modificar revalidates; once the window starts E10 and D7 | 3, 11, 12, 13 | `mocks/sigeda/turnos-teoricos.test.ts`, `turnos-teoricos-page.test.tsx`, `formulario-turno-teorico.test.tsx`, `features/turnos-teoricos/resultados-turno-page.test.tsx` |
| CA-TUT-11 Eliminar confirms and only while PROGRAMADO | 3, 11 | `mocks/sigeda/turnos-teoricos.test.ts`, `turnos-teoricos-page.test.tsx` |
| CA-TUT-12 backend field errors under their field, preguntas by index | 3, 12 | `mocks/sigeda/turnos-teoricos.test.ts`, `formulario-turno-teorico.test.tsx` |
| CA-TUT-13 first-load Reintentar; a failed catalogue warns without blocking | 11, 12 | `turnos-teoricos-page.test.tsx`, `formulario-turno-teorico.test.tsx` |
| CA-TUT-14 outside mock mode without dependency 6: E1 and T11 | 5, 11 | `lib/dependencias.test.ts`, `lib/auth/rutas-m4.test.tsx`, `turnos-teoricos-page.test.tsx` |
| CA-EXA-01 pendientes with materia, tipo, fecha and horario; E24 | 4, 14 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `features/examenes/mis-examenes-page.test.tsx` |
| CA-EXA-02 a window not yet open cannot be opened and shows E13 | 4, 14 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `mis-examenes-page.test.tsx` |
| CA-EXA-03 started once, questions in the server's order, no keys in the DOM | 4, 15 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `features/examenes/rendir-examen-page.test.tsx` |
| CA-EXA-04 each type answered with its own control | 15 | `rendir-examen-page.test.tsx` |
| CA-EXA-05 autosave at 2 s and at most every 10 s; E27, E28, E14 | 4, 15 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `rendir-examen-page.test.tsx` |
| CA-EXA-06 countdown, E29 and E15 at five minutes | 1, 16 | `lib/dominio/teoria.test.ts`, `test/tiempo.test.tsx`, `features/examenes/entrega-de-examen.test.tsx` |
| CA-EXA-07 Entregar confirms with E17, and with E18 when blanks remain | 16 | `entrega-de-examen.test.tsx` |
| CA-EXA-08 a reload retakes the same exam, same order, same answers | 4, 15 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `rendir-examen-page.test.tsx` |
| CA-EXA-09 at zero: fields locked, autosave flushed, one entrega, E16 | 1, 4, 16 | `test/tiempo.test.tsx`, `mocks/sigeda/cuestionarios-teoria.test.ts`, `entrega-de-examen.test.tsx` |
| CA-EXA-10 a D11 on entregar shows E16 and moves to the result | 4, 16 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `entrega-de-examen.test.tsx` |
| CA-EXA-11 an exam already submitted cannot be retaken; D10 by URL | 4, 15 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `rendir-examen-page.test.tsx` |
| CA-EXA-12 an alumno not enabled cannot open it: D9 | 4, 15 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `rendir-examen-page.test.tsx` |
| CA-EXA-13 first-load failure of Mis exámenes or of the exam: Reintentar | 5, 14, 15 | `lib/auth/rutas-m4.test.tsx`, `mis-examenes-page.test.tsx`, `rendir-examen-page.test.tsx` |
| CA-RES-01 the turno's data, its questions and one result per alumno | 3, 13 | `mocks/sigeda/turnos-teoricos.test.ts`, `resultados-turno-page.test.tsx` |
| CA-RES-02 habilitados: the grupo, minus the subsanación and rezagado rules | 3, 13 | `mocks/sigeda/turnos-teoricos.test.ts`, `resultados-turno-page.test.tsx` |
| CA-RES-03 two decimals beside the applied minimum, never recomputed | 1, 3, 4, 13, 17 | `lib/dominio/teoria.test.ts`, `mocks/sigeda/turnos-teoricos.test.ts`, `mocks/sigeda/cuestionarios-teoria.test.ts`, `resultados-turno-page.test.tsx`, `features/examenes/resultado-examen-page.test.tsx` |
| CA-RES-04 the resumen: who sat it, who passed, the average | 3, 13 | `mocks/sigeda/turnos-teoricos.test.ts`, `resultados-turno-page.test.tsx` |
| CA-RES-06 the blocked alumno marked on the row and E21 in Mis exámenes | 3, 4, 13, 14 | `mocks/sigeda/turnos-teoricos.test.ts`, `mocks/sigeda/cuestionarios-teoria.test.ts`, `resultados-turno-page.test.tsx`, `mis-examenes-page.test.tsx` |
| CA-RES-07 nota, verdict and applied minimum; E19 until the turno ends | 4, 17 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `resultado-examen-page.test.tsx` |
| CA-RES-08 with the turno finished: answer, correct one, puntaje, explicación | 4, 17 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `resultado-examen-page.test.tsx` |
| CA-RES-09 the session's `codPersona` always, never the URL; the loader rejects | 4, 5, 15, 17 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `features/examenes/cargar.ts` via `rendir-examen-page.test.tsx` and `resultado-examen-page.test.tsx` |
| CA-RES-10 E22 with its motivo blocks Guardar; E23 does not | 4, 19 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `features/turnos/subsanacion-turno.test.tsx` |
| CA-RES-12 first-load failure of the detail or the result: Reintentar | 13, 17 | `resultados-turno-page.test.tsx`, `resultado-examen-page.test.tsx` |
| CA-RES-13 a Pre-Solo passes at 18 and shows that 18 | 1, 13 | `mocks/sigeda/semilla-teoria.test.ts`, `resultados-turno-page.test.tsx` |

| Decision | Tasks | Proven by |
|---|---|---|
| M4-1 one contract, version 2 | 2, 3, 4 | `mocks/sigeda/{preguntas,turnos-teoricos,cuestionarios-teoria}.test.ts` (every message and shape is the contract's) |
| M4-2 ownership is UI-only; the caller's code travels on the wire | 4, 5, 15 | `mocks/sigeda/cuestionarios-teoria.test.ts` (an alumno cannot read another's), `rendir-examen-page.test.tsx`, `resultado-examen-page.test.tsx` |
| M4-3 AI questions are reviewed before insertion; `origen` is the server's | 2, 10 | `mocks/sigeda/preguntas.test.ts`, `tabla-de-importacion.test.tsx` |
| M4-4 `explicacion` nullable ≤1000, shown after the turno ends | 2, 7, 17 | `mocks/sigeda/preguntas.test.ts`, `dialogo-pregunta.test.tsx`, `resultado-examen-page.test.tsx` |
| M4-5 the import mapping field by field; Importar not gated on 39 | 9, 10 | `features/preguntas/importacion.test.ts`, `importar-page.test.tsx`, `tabla-de-importacion.test.tsx` |
| M4-6 the turno teórico gets its own grupo catalogue | 3, 12 | `mocks/sigeda/turnos-teoricos.test.ts`, `formulario-turno-teorico.test.tsx` |
| M4-7 the 20-point scale in the browser and re-checked by the server | 3, 12 | `mocks/sigeda/turnos-teoricos.test.ts`, `formulario-turno-teorico.test.tsx` |
| M4-8 no instants on the wire; the countdown is built in the browser | 1, 16 | `lib/dominio/teoria.test.ts`, `test/tiempo.test.tsx`, `entrega-de-examen.test.tsx` |
| M4-9 idempotent start, full-set autosave, explicit submit | 4, 15, 16 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `rendir-examen-page.test.tsx`, `entrega-de-examen.test.tsx` |
| M4-10 the window closes lazily on the server; the client is a courtesy | 3, 4, 16 | `mocks/sigeda/turnos-teoricos.test.ts`, `mocks/sigeda/cuestionarios-teoria.test.ts`, `entrega-de-examen.test.tsx` |
| M4-11 grading and the applicable minimum are the backend's | 1, 4, 13, 17 | `mocks/sigeda/semilla-teoria.test.ts`, `mocks/sigeda/cuestionarios-teoria.test.ts`, `resultados-turno-page.test.tsx`, `resultado-examen-page.test.tsx` |
| M4-12 subsanación surfaces in three places and blocks nothing by itself | 4, 13, 14, 19 | `mocks/sigeda/cuestionarios-teoria.test.ts`, `resultados-turno-page.test.tsx`, `mis-examenes-page.test.tsx`, `subsanacion-turno.test.tsx` |
| M4-13 one folder per entity; the domain helpers in `lib/dominio/teoria.ts` | 1, 5 | `lib/dominio/teoria.test.ts`, `lib/auth/pantallas.test.ts` (the breadcrumb chains) |
| M4-14 `Manage Exams` stays Instructor + Admin; the alumno screens are `SOLO_ALUMNO` | 5 | `lib/auth/rutas-m4.test.tsx`, `lib/auth/pantallas.test.ts` |
| M4-15 409 for "invalid in this state" | 2, 3, 4 | `mocks/sigeda/preguntas.test.ts` (D3), `mocks/sigeda/turnos-teoricos.test.ts` (D7), `mocks/sigeda/cuestionarios-teoria.test.ts` (D8, D10, D11) |
| M4-16 manual `201` bodies with camelCase keys | 2, 3, 4 | `mocks/sigeda/preguntas.test.ts`, `mocks/sigeda/turnos-teoricos.test.ts`, `mocks/sigeda/cuestionarios-teoria.test.ts` |
| M4-17 the dependency gates, and the one M2 forgot | 5, 6, 11, 19 | `lib/dependencias.test.ts`, `banco-page.test.tsx`, `turnos-teoricos-page.test.tsx`, `subsanacion-turno.test.tsx` |
| M4-18 the theory mocks live in `mocks/sigeda/`; the materias 409 is derived | 1, 2, 3, 4 | `mocks/sigeda/semilla-teoria.test.ts`, and the three handler suites |
| M4-19 the exam window is opened by a test helper | 1 | `test/tiempo.test.tsx` |
| M4-20 the 24-hour rule is a warning, not a block | 12 | `formulario-turno-teorico.test.tsx` |
| M4-21 the AI mock gains one import-path quiz | 9, 10 | `importar-page.test.tsx`, `tabla-de-importacion.test.tsx` |
| M4-22 any `tipoExamen` with any materia | 1, 3 | `lib/dominio/teoria.test.ts`, `mocks/sigeda/turnos-teoricos.test.ts` (no pairing is validated) |
| M4-23 the five scope cuts | 1, 14 | `mocks/sigeda/semilla-teoria.test.ts` (no `NO_RINDIO` row, no `inasistenciaJustificada`), `mis-examenes-page.test.tsx` (Pendientes only) |

Baseline tests this plan edits, and why:

| File | Edit | Task |
|---|---|---|
| `lib/auth/pantallas.test.ts` | the three menu expectations gain `Mis exámenes`, `Banco de preguntas`, `Turnos teóricos` and the `Teoría` group; two cases added for the M4 breadcrumbs and for what the Comandante does **not** see | 5 |
| `lib/dependencias.test.ts` | one case for the six new keys | 5 |
| `test/tiempo.test.tsx` | three cases for `abrirVentanaDeExamen()` | 1 |
| `features/preguntas/banco-page.test.tsx` | CA-BAN-14 expects two T11 messages once Registrar pregunta exists | 7 |
| `features/turnos/modificar-turno-page.test.tsx` | the three cases that save turno 8 first remove alumno `666666`, whom dependency 57 forbids on `PUT` as well as `POST` | 19 |

No other baseline test changes, and none is relaxed: `cobertura-de-rutas.test.ts` keeps proving that every route under `/_app` guards its own screen, now with nine more.

Spec §8 items covered by M4: dialogs for the one small form (Registrar y Modificar pregunta) and pages for the rest, confirm dialogs for every destructive or irreversible step (Eliminar pregunta, Eliminar turno teórico, Importar, Entregar), empty states with a next action (E3, E24, E25), `tabular-nums` on every grade, puntaje, hour and countdown, grades with two decimals, dates as `dd/MM/yyyy`, semantic colour only through `StatusBadge` and its four new vocabularies, breadcrumbs on the six nested screens, the sidebar's `Teoría` group between Evaluaciones and Seguimiento, and the alumno screens built mobile-first (cards, not tables) with the exam's countdown and Entregar in a sticky header.

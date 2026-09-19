# M1 Turno y evaluación práctica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every M1 screen of spec §6 (Programación de turnos, Registrar/Modificar turno, Detalle de turno con línea de tiempo, Orden de vuelo del día, Hoja de briefing, Mis turnos, Evaluaciones, Registrar/Detalle/Modificar evaluación, Mis evaluaciones) working against MSW mocks of `docs/contrato-api-turnos.md`, with acceptance criteria CA-TUR-01..16 and CA-EVA-01..13 proven by tests.

**Architecture:** Contract-first, like the theory module: MSW handlers in `src/mocks/sigeda/` implement the turnos/evaluaciones contract over one in-memory store that every test resets; `src/features/{catalogos,turnos,evaluaciones}/api.ts` hold query-key factories, `queryOptions`, mutations and adapters that also accept today's backend shapes. Domain rules (DIRBE options, below-standard, categories, calendar, briefing, overlap, latest evaluation) are pure functions in `src/lib/dominio/`. Lists use a reusable TanStack Table v9 `DataTable` whose page, size and sort live in the URL; details load through route loaders (404 → not-found page, alumno ownership → "No tiene permisos"); the screen registry gains role restrictions and parents that drive breadcrumbs.

**Tech Stack:** as M0 (Vite 8 · React 19 · TypeScript 6.0 · TanStack Router 1.170 · TanStack Query 5 · zod 4.6 · react-hook-form 7.88 · shadcn/ui 4.21 · MSW 2 · Vitest 5) plus `@tanstack/react-table` 9.2 and the shadcn components `breadcrumb`, `native-select`, `toggle-group` (with `toggle`) and `textarea`.

**Spec:** `docs/superpowers/specs/2026-09-19-sigeda-web-design.md` — §6 (M1 screens), §7 (CA-TUR-*, CA-EVA-*), §8 (design), and **§13 (M1 addendum: decisions M1-1..M1-12 and amended criteria; binding)**. API contract the mocks implement: `docs/contrato-api-turnos.md`. Backend reality with evidence (seed data, enum spellings, grading algorithm): `docs/contratos/sigeda-back-m1.md`. These documents are committed before Task 1; no task copies them.

**Baseline:** branch `feat/m1-turnos-evaluaciones` at `f102565` = M0 final (`111c5cf`, including the M0 final-review fix wave) plus one docs commit that appended the M1 addendum as spec §13 and added `docs/contratos/sigeda-back-m1.md` and `docs/contrato-api-turnos.md`. Facts of that baseline this plan relies on: `normalizarError` already hides `message` on status ≥ 500 and honours NestJS bodies only when `'statusCode' in cuerpo`; `tokens.renovar()` returns `ResultadoRenovacion` (`renovado` / `rechazado` / `no-disponible`); `destinoSeguro` resolves against `window.location.origin`; `formatearFecha(iso: string)` and `formatearNota(nota: number | null | undefined)` return `'—'` for empty or invalid input; `main.tsx` starts MSW only when `import.meta.env.DEV && config.mockApi`; `vite.config.ts` exports `({ mode }) => …` with `publicDir: mode === 'mock' ? 'public-mock' : 'public'`, and the MSW worker lives in `public-mock/`. The baseline suite has 101 tests.

**Verified against that exact baseline before writing this plan:** a clone at `f102565` received every task below in order, with `pnpm verify` green after each one (final: 288 tests); then the plan text itself was replayed mechanically into a second fresh clone at `f102565`, green after every task and file-identical to the first, and each "run to see it fail" step was re-run against the state just before its task. APIs checked in that work:
- `@tanstack/react-table` **9.2.4** (not v8): `useTable({ features, columns, data, … })`, `tableFeatures({ rowSortingFeature, rowPaginationFeature })`, `createColumnHelper<typeof features, T>()` with `helper.columns/accessor/display`, `table.FlexRender`, `manualPagination`/`manualSorting`/`rowCount`/`getRowId`/`defaultColumn`/`enableSortingRemoval`, controlled `state` + `onPaginationChange`/`onSortingChange` receiving an `Updater`, `getCanNextPage`/`nextPage`/`previousPage`/`getPageCount`, `column.getCanSort`/`getIsSorted`/`getToggleSortingHandler`. Exporting `tableFeatures(...)` from a `.tsx` file trips oxlint `react/only-export-components`, hence `src/components/columnas-tabla.ts`.
- react-hook-form 7.88 `useFieldArray` + `@hookform/resolvers/zod` with zod 4.6: an array `.min()` error lands in `errors.<array>.message` (the plan reads `root ?? array`); `superRefine` issues are reported even when other fields fail; `z.string().trim().min(1).min(10)` reports both issues and the form shows the first.
- TanStack Router 1.170: `validateSearch` with zod `.default().catch()` gives a non-optional output and an optional input, so `<Link to="/turnos">` compiles without `search`; `getRouteApi('/_app/turnos/').useSearch()/useNavigate()`; `navigate({ search: (previa) => ({ ...previa, page: 0 }) })`; a loader that throws `notFound()` renders `defaultNotFoundComponent`; `useMatches().at(-1)?.fullPath` is `'/turnos/'` (trailing slash) for index routes; `<Link to={pantalla.ruta} params={coincidencia.params}>` compiles; search values are JSON-parsed (`?idSubfase=4` → number, `?alumno=555555` → number, `?desde=2024-03-01` → string).
- Radix ToggleGroup through shadcn `toggle-group`: `type="single"` renders `role="radiogroup"` with `role="radio"` items and `aria-checked`; clicking the selected item emits `''`, which the grid ignores.
- shadcn 4.21.0 `native-select` (`NativeSelect` puts `className` on a wrapper and every other prop on the `<select>`), `breadcrumb` (`BreadcrumbPage` renders `role="link" aria-disabled aria-current="page"`; the `nav` `aria-label` is overridable), `textarea`, `toggle-group`.
- user-event 14 types into `type="date"` (`'2026-09-25'`) and `type="time"` (`'13:30'`) inputs; `selectOptions` on native selects; `date-fns` 4 `format`/`parse`/`addDays`/`isValid` for `yyyy-MM-dd` and "today" in local time.
- MSW 2 matches `/api/turnos/alumno` only if it is registered before `/api/turnos/:id`.
- TanStack Router `createLink(EnlaceExterno)` wrapped as `export const Enlace: LinkComponent<typeof EnlaceExterno> = (props) => …` keeps typed `to`/`params` and passes oxlint (a bare `export const Enlace = createLink(…)` trips `react/only-export-components`).
- For the guard-coverage test: `crearRouter(new QueryClient()).routesById` lists every route with its `fullPath`, and `import.meta.glob<string>('/src/routes/_app/**/*.tsx', { query: '?raw', import: 'default', eager: true })` gives each route file's source under Vitest.
- On the real baseline: `normalizarError`'s 5xx branch, the three-way `ResultadoRenovacion`, the URL-based `destinoSeguro` (`new URL('/x/..//evil.com', origin).pathname` is `//evil.com`), the null-safe `formatearNota`, and the DEV-only mock loading were read and exercised; a production build contains no M1 fixture.

## Global Constraints

- Repo: `/Volumes/ORICO/projects/personal/tesis-project/sigeda-web`. Work on branch **`feat/m1-turnos-evaluaciones`**, which was created from `main` after `feat/m0-fundacion` merged and already holds the M1 docs at `f102565` (Task 1, Step 1 confirms it).
- Node is not on `PATH` in non-interactive shells. Prefix **every** shell command with `export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH;`.
- pnpm only (11.15.0). Never `npm` or `npx`. The shadcn CLI runs as `pnpm dlx shadcn@4.21.0 …` with `</dev/null` so it never waits on a prompt.
- TypeScript `~6.0.2` (the Vite template pin), not 7. `erasableSyntaxOnly` is on: no `enum`, no constructor parameter properties, no `namespace`.
- **No code comments** in any file you author (TS, TSX, CSS, JSON). `src/components/ui/*` and `src/hooks/use-mobile.ts` are vendored shadcn output: keep them exactly as the CLI generates them.
- All UI text in Spanish. Domain identifiers in Spanish (`sesion`, `permisos`, `pantallas`, `turno`).
- No colour literals in components: only Tailwind classes backed by tokens in `src/theme.css`.
- Tests that prove an acceptance criterion carry its ID at the start of the test name (`it('CA-SES-01 …')`).
- Test files never live under `src/routes/`.
- Gate for every task: `pnpm verify` (typecheck → oxlint → vitest → build) exits 0 before committing.
- Commits: Conventional Commits, one short subject line, **no `Co-Authored-By` trailer**.
- Seeded password for every mock and seed user: `123`. Usernames: `jefe.operaciones`, `instructor.perez`, `instructor.mendoza` (added in Task 4), `alumno.lopez`, `comandante.aguirre`, `admin.sistema`.
- **M1 additions:**
- MSW handlers implement `docs/contrato-api-turnos.md` exactly (paths, permissions, status codes, bodies, messages). Adapters in `src/features/*/api.ts` also accept today's backend shapes (spec §13 M1-1).
- The mock store (`src/mocks/sigeda/datos.ts`) is reset after every test by `reiniciarMocks()`. Future fixture dates are computed from `hoyIso()`; no test hard-codes a date that must be in the future.
- Pickers in forms and filters use shadcn `native-select`, not Radix Select.
- `@tanstack/react-table` is v9: `useTable`, never v8's `useReactTable`/`getCoreRowModel`.
- New routes regenerate `src/routeTree.gen.ts` with `pnpm exec vite build` **before** `tsc` can see them; the generated file is committed.
- Route files stay thin: guard (`exigirPantalla`), `validateSearch`, `loader`, and a wrapper that turns params into page props. Pages read search params through `getRouteApi`.
- Files that M0 owns (`src/test/setup.ts`, `src/mocks/sigeda/usuarios.ts`, `src/lib/auth/guardas.ts`, `src/lib/auth/tokens.ts`, `src/lib/auth/sesion.ts`, `src/components/app-sidebar.tsx`, `src/components/app-shell.tsx`, `src/features/inicio/inicio-page.tsx`, `src/lib/dominio/vocabulario.ts`, `src/lib/dominio/tonos.ts`, `src/lib/api/pagina.ts`, their test files, `README.md`, `docs/decisiones.md`) are changed with the exact edits given, never rewritten wholesale. The only full rewrites of M0 files are `src/lib/api/errors.ts` (Task 1) and `src/lib/auth/pantallas.ts` + `pantallas.test.ts` (Task 7), whose complete new content keeps every M0 rule and test. Every quoted "replace" snippet was checked against `f102565`; if the text differs, stop and report instead of guessing.
- **The spec §8 design review is still open** (the user has not approved the M0 look). Keep every visual decision in `src/theme.css` tokens and shared components — `StatusBadge`, `PageHeader`, `EmptyState`, `DataTable`, `Enlace`/`EnlaceExterno` (Task 8) and `CLASES_ETIQUETA_DEBRIEFING` (Task 3) — so review feedback stays cheap. Pages add layout utilities only; no page-specific colours, no one-off text-link or emphasis styles.

---

## File map

```
sigeda-web/
├── README.md · docs/decisiones.md                   (T17: M1 section, mock users)
└── src/
    ├── components/
    │   ├── columnas-tabla.ts        table features + column helper (T8)
    │   ├── data-table.tsx           server-driven table, URL page/sort (T8)
    │   ├── enlace.tsx               Enlace / EnlaceExterno: the one text-link style (T8)
    │   ├── migas.tsx                breadcrumbs from the registry (T7)
    │   ├── app-shell.tsx            mounts <Migas /> (T7, edit)
    │   └── ui/                      + breadcrumb (T7), native-select (T8), toggle-group, toggle, textarea (T15)
    ├── lib/
    │   ├── api/errors.ts            5xx rule kept; ErrorResponse 4xx, {mensaje}, {"mensaje:"}, 410 (T1)
    │   ├── api/pagina.ts            + ParametrosPagina (T5, append)
    │   ├── auth/tokens.ts           non-JSON refresh → no-disponible (T2, edit)
    │   ├── auth/guardas.ts          '//' destinations rejected (T2, edit); pantallaVisible(perfil) (T7, edit)
    │   ├── auth/sesion.ts           restore keeps the refresh token on 0/5xx profile failures (T2, edit)
    │   ├── auth/pantallas.ts        roles, padre, Perfil, migasPara, veSoloLoPropio (T7)
    │   ├── formularios.ts           backend field errors → react-hook-form (T1)
    │   ├── busqueda.ts              shared zod search fragments (T8)
    │   └── dominio/
    │       ├── dirbe.ts             options per nota mínima, below/above standard (T3)
    │       ├── categorias.ts        both Categoria spellings (T3)
    │       ├── calendario.ts        yyyy-MM-dd, today, HH:mm (T3)
    │       ├── turno.ts             permiteCambios, overlap, aircraft conflicts (T3)
    │       ├── briefing.ts          who explains, mission stages (T3)
    │       ├── evaluacion.ts        latest evaluation, evaluation ↔ turno (T3)
    │       ├── tonos.ts             + CLASES_ETIQUETA_DEBRIEFING (T3, append)
    │       └── vocabulario.ts       + ESTADOS_AERONAVE (T3, edit)
    ├── features/
    │   ├── catalogos/api.ts         subfases, maniobras, aeronaves, instructores, alumnos by role (T4)
    │   ├── turnos/
    │   │   ├── api.ts               keys, queries, mutations, adapters (T5)
    │   │   ├── schemas.ts           list search (T8) + form schema (T10)
    │   │   ├── cargar.ts            detail loader: 404 + alumno ownership (T9)
    │   │   ├── columnas.tsx         list columns (T8)
    │   │   ├── orden-de-vuelo.ts    group by aircraft, sort by hour (T12)
    │   │   ├── components/          linea-de-tiempo (T9), formulario-turno (T10)
    │   │   └── *-page.tsx           turnos, mis-turnos (T8), turno (T9), registrar (T10), modificar (T11), orden-de-vuelo, hoja-de-briefing (T12)
    │   └── evaluaciones/
    │       ├── api.ts               keys, queries, mutations, adapters, numeric promedio (T6)
    │       ├── schemas.ts           list search (T13) + form schema (T15)
    │       ├── cargar.ts            detail loader (T14)
    │       ├── components/          filtros, tabla (T13), grilla-calificaciones, formulario (T15)
    │       └── *-page.tsx           evaluaciones, mis-evaluaciones (T13), evaluacion (T14), registrar (T15), modificar (T16)
    ├── mocks/
    │   ├── handlers.ts              + catálogos (T4), turnos (T5), evaluaciones (T6)
    │   ├── reiniciar.ts             reiniciarMocks() (T4)
    │   └── sigeda/                  datos, comun, catalogos (T4), turnos (T5), evaluaciones (T6); usuarios + instructor.mendoza (T4)
    ├── routes/_app/                 turnos/{index,nuevo,dia/index,dia/$fecha,$id/index,$id/editar,$id/briefing/$alumno,$id/evaluar/$alumno}, mis-turnos, evaluaciones/{index,$cod/index,$cod/editar}, mis-evaluaciones (T7; loaders and search added by later tasks)
    ├── lib/auth/cobertura-de-rutas.test.ts   every /_app route registered and guarded (T7)
    └── test/setup.ts                reiniciarMocks() after each test (T4, edit)
```

---

### Task 1: Error normaliser for turno and evaluation responses (M1-2)

**Files:**
- Modify (full rewrite): `src/lib/api/errors.ts`
- Create: `src/lib/formularios.ts`
- Test: `src/lib/api/errors.test.ts` (append), `src/lib/formularios.test.ts`

**Interfaces:**
- Consumes: M0's `ApiError`, `normalizarError(status: number, cuerpo: unknown): ApiError`, `parsearErroresDeCampo(lineas)`, `MENSAJE_SIN_CONEXION`, `MENSAJE_SIN_PERMISO`, `MENSAJE_GENERICO`, `MENSAJE_REVISAR_CAMPOS` — all kept with the same names and signatures.
- Produces:
  - `normalizarError` keeps every M0 rule and learns the M1 shapes. The complete rule set, in order:
    1. **Status ≥ 500 (M0 fix-wave rule, kept):** the user never sees `message`, `messages`, `mensaje` or a plain-text body; they go to `console.error`. The user sees `error` when it is a non-empty string, else `MENSAJE_GENERICO`.
    2. **Below 500, business-rule bodies without `error`:** `{ mensaje: string }`, `{ mensaje: string[] }` and `{ "mensaje:": string[] }` (the backend's typo'd key) show the message, joined with a space, even on 403 (CA-EVA-13).
    3. **403:** any other body → `MENSAJE_SIN_PERMISO`.
    4. **Raw string array:** field errors (unchanged).
    5. **Plain text:** shown as the message (below 500 only).
    6. **`{ error, mensaje }`:** shows `error`; `mensaje` goes to the console (unchanged).
    7. **NestJS `{ statusCode, message }`:** shows `message` (unchanged).
    8. **Spring `ErrorResponse` below 500:** `messages[]` → field errors + `MENSAJE_REVISAR_CAMPOS`; else `message` (including the 410 of an expired turno); else `error`.
  - `rutaDeCampo(campo: string, renombrar?: Readonly<Record<string, string>>): string` — `'alumnosTurno[0].horaInicio'` → `'alumnosTurno.0.horaInicio'`, renaming path segments (e.g. `{ aeronave: 'idAeronave', nota_min: 'notaMin' }`).
  - `aplicarErroresDeCampo<T extends FieldValues>(error: ApiError, setError: UseFormSetError<T>, renombrar?): boolean` — calls `setError(ruta, { type: 'server', message })` per field error; returns whether any was applied.

- [ ] **Step 1: Confirm the branch**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git branch --show-current && git log --oneline -1
```

Expected: `feat/m1-turnos-evaluaciones` at `f102565 docs: add m1 spec addendum and turnos api contract` (M0 final `111c5cf` plus the M1 docs). If the branch or commit differs, stop and report.

- [ ] **Step 2: Write the failing tests**

Append to `src/lib/api/errors.test.ts` (its imports already include `vi`, `MENSAJE_GENERICO`, `MENSAJE_REVISAR_CAMPOS` and `normalizarError`):

```ts
describe('normalizarError con las respuestas de turnos y evaluaciones', () => {
  it('CA-TUR-13 convierte los messages de ErrorResponse en errores de campo', () => {
    const error = normalizarError(400, {
      timestamp: '2026-09-19T10:00:00',
      status: 400,
      error: 'Error al validar el modelo',
      message: null,
      messages: [
        "'fechaEval': La fecha del turno debe ser posterior a hoy.",
        "'alumnosTurno[0].horaInicio': La hora debe estar en formato HH:mm (09:00, 14:00)",
      ],
    })
    expect(error.message).toBe(MENSAJE_REVISAR_CAMPOS)
    expect(error.erroresDeCampo).toEqual({
      fechaEval: 'La fecha del turno debe ser posterior a hoy.',
      'alumnosTurno[0].horaInicio': 'La hora debe estar en formato HH:mm (09:00, 14:00)',
    })
  })

  it('en un 4xx con forma ErrorResponse muestra "message", también en el 410 de un turno vencido', () => {
    const vencido = normalizarError(410, {
      timestamp: '2026-09-19T10:00:00',
      status: 410,
      error: 'Fecha de modificación expiró',
      message: 'No se puede modificar. El turno ya ha sido evaluado.',
      messages: null,
    })
    expect(vencido.status).toBe(410)
    expect(vencido.message).toBe('No se puede modificar. El turno ya ha sido evaluado.')
    expect(
      normalizarError(404, { status: 404, error: 'Recurso no encontrado', message: 'No existe información de subfase.' })
        .message,
    ).toBe('No existe información de subfase.')
  })

  it('en un 4xx con forma ErrorResponse sin "message" muestra "error"', () => {
    expect(
      normalizarError(400, { status: 400, error: 'Error al validar el modelo', message: null, messages: null }).message,
    ).toBe('Error al validar el modelo')
  })

  it('CA-EVA-13 muestra el mensaje de una regla de negocio, incluso con 403', () => {
    expect(normalizarError(400, { mensaje: 'El alumno debe ser apto para realizar evaluaciones ponderadas.' }).message).toBe(
      'El alumno debe ser apto para realizar evaluaciones ponderadas.',
    )
    expect(normalizarError(403, { mensaje: 'La evaluación ya ha sido registrada.' }).message).toBe(
      'La evaluación ya ha sido registrada.',
    )
  })

  it('CA-EVA-13 une la lista de mensajes de notas incorrectas, con o sin los dos puntos en la clave', () => {
    const mensajes = [
      'Las notas con id: 3 no utilizan el sistema de calificación.',
      'La nota de las maniobras con id: 5 no son correctas.',
    ]
    const esperado = 'Las notas con id: 3 no utilizan el sistema de calificación. La nota de las maniobras con id: 5 no son correctas.'
    expect(normalizarError(400, { 'mensaje:': mensajes }).message).toBe(esperado)
    expect(normalizarError(400, { mensaje: mensajes }).message).toBe(esperado)
  })

  it('sigue ocultando el mensaje técnico cuando la respuesta trae error y mensaje', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(normalizarError(400, { error: 'Argumento incorrecto', mensaje: 'Dirección debe ser asc' }).message).toBe(
      'Argumento incorrecto',
    )
  })

  it('en un 5xx con forma ErrorResponse no muestra message, messages ni SQL', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = normalizarError(500, {
      timestamp: '2026-09-19T10:00:00',
      status: 500,
      error: 'Error inesperado',
      message: 'could not execute statement; SQL [update personas set estado=?]',
      messages: ["'estado': SQL [update personas]"],
    })
    expect(error.message).toBe('Error inesperado')
    expect(error.erroresDeCampo).toEqual({})
    expect(consola).toHaveBeenCalledWith('could not execute statement; SQL [update personas set estado=?]')
  })

  it('en un 5xx no muestra el mensaje de una regla ni un texto plano', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(normalizarError(503, { mensaje: 'SQL [select * from turnos]' }).message).toBe(MENSAJE_GENERICO)
    expect(normalizarError(500, 'java.sql.SQLException: SQL [insert into turnos]').message).toBe(MENSAJE_GENERICO)
    expect(consola).toHaveBeenCalledWith('java.sql.SQLException: SQL [insert into turnos]')
  })
})
```

`src/lib/formularios.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { aplicarErroresDeCampo, rutaDeCampo } from './formularios'

describe('rutaDeCampo', () => {
  it('convierte los índices del backend en rutas de react-hook-form', () => {
    expect(rutaDeCampo('alumnosTurno[0].horaInicio')).toBe('alumnosTurno.0.horaInicio')
    expect(rutaDeCampo('calificaciones[2].causa')).toBe('calificaciones.2.causa')
  })

  it('renombra los segmentos que el formulario llama distinto', () => {
    expect(rutaDeCampo('maniobrasTurno[1].nota_min', { nota_min: 'notaMin' })).toBe('maniobrasTurno.1.notaMin')
    expect(rutaDeCampo('aeronave', { aeronave: 'idAeronave' })).toBe('idAeronave')
  })
})

describe('aplicarErroresDeCampo', () => {
  it('CA-TUR-13 marca cada campo con el mensaje del backend', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Revise los campos marcados.', {
      nombre: 'Nombre debe tener de 10 a 30 caracteres.',
      'alumnosTurno[0].codAlumno': 'Código de alumno es requerido.',
    })
    expect(aplicarErroresDeCampo(error, setError)).toBe(true)
    expect(setError).toHaveBeenCalledWith('nombre', { type: 'server', message: 'Nombre debe tener de 10 a 30 caracteres.' })
    expect(setError).toHaveBeenCalledWith('alumnosTurno.0.codAlumno', {
      type: 'server',
      message: 'Código de alumno es requerido.',
    })
  })

  it('no marca nada cuando el error no trae campos', () => {
    const setError = vi.fn()
    expect(aplicarErroresDeCampo(new ApiError(400, 'Asignar aeronave disponible.'), setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/api/errors.test.ts src/lib/formularios.test.ts
```

Expected: FAIL — `Failed to resolve import "./formularios"`. In `errors.test.ts`, six of the eight new cases fail: `CA-TUR-13 convierte los messages…`, both `en un 4xx con forma ErrorResponse…`, both `CA-EVA-13` cases, and `en un 5xx no muestra el mensaje de una regla ni un texto plano`. The `error`+`mensaje` case and `en un 5xx con forma ErrorResponse…` already pass with M0's normaliser, and M0's own ten tests still pass.

- [ ] **Step 4: Rewrite the normaliser**

Replace `src/lib/api/errors.ts` with:

```ts
export type ErroresDeCampo = Record<string, string>

export class ApiError extends Error {
  readonly status: number
  readonly erroresDeCampo: ErroresDeCampo

  constructor(status: number, mensaje: string, erroresDeCampo: ErroresDeCampo = {}) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.erroresDeCampo = erroresDeCampo
  }
}

export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor.'
export const MENSAJE_SIN_PERMISO = 'No tiene permisos para esta acción.'
export const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intente nuevamente.'
export const MENSAJE_REVISAR_CAMPOS = 'Revise los campos marcados.'

const PATRON_CAMPO = /^'([^']+)':\s*(.+)$/

export function parsearErroresDeCampo(lineas: readonly string[]) {
  const campos: ErroresDeCampo = {}
  const otros: string[] = []
  for (const linea of lineas) {
    const coincidencia = PATRON_CAMPO.exec(linea)
    if (coincidencia) {
      const [, campo, mensaje] = coincidencia
      campos[campo] ??= mensaje
    } else {
      otros.push(linea)
    }
  }
  return { campos, otros }
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function esListaDeTextos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((elemento) => typeof elemento === 'string')
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim() !== ''
}

function desdeLineas(status: number, lineas: readonly string[]) {
  const { campos, otros } = parsearErroresDeCampo(lineas)
  return new ApiError(status, otros[0] ?? MENSAJE_REVISAR_CAMPOS, campos)
}

function mensajeDeRegla(cuerpo: Record<string, unknown>): string | null {
  if ('error' in cuerpo) return null
  const valor = cuerpo.mensaje ?? cuerpo['mensaje:']
  if (esTexto(valor)) return valor.trim()
  if (esListaDeTextos(valor) && valor.length > 0) return valor.join(' ')
  return null
}

function errorDelServidor(status: number, cuerpo: unknown): ApiError {
  if (esTexto(cuerpo)) {
    console.error(cuerpo)
    return new ApiError(status, MENSAJE_GENERICO)
  }
  if (esRegistro(cuerpo)) {
    if ('mensaje' in cuerpo) console.error(cuerpo.mensaje)
    if ('message' in cuerpo) console.error(cuerpo.message)
    if (esTexto(cuerpo.error)) return new ApiError(status, cuerpo.error)
  }
  return new ApiError(status, MENSAJE_GENERICO)
}

export function normalizarError(status: number, cuerpo: unknown): ApiError {
  if (status >= 500) return errorDelServidor(status, cuerpo)
  if (esRegistro(cuerpo)) {
    const regla = mensajeDeRegla(cuerpo)
    if (regla) return new ApiError(status, regla)
  }
  if (status === 403) return new ApiError(status, MENSAJE_SIN_PERMISO)
  if (esListaDeTextos(cuerpo)) return desdeLineas(status, cuerpo)
  if (esTexto(cuerpo)) return new ApiError(status, cuerpo.trim())
  if (esRegistro(cuerpo)) {
    if (typeof cuerpo.error === 'string' && typeof cuerpo.mensaje === 'string') {
      console.error(cuerpo.mensaje)
      return new ApiError(status, cuerpo.error)
    }
    if ('statusCode' in cuerpo) {
      if (esTexto(cuerpo.message)) return new ApiError(status, cuerpo.message)
      if (esListaDeTextos(cuerpo.message)) return new ApiError(status, cuerpo.message.join('. '))
    }
    if (esListaDeTextos(cuerpo.messages) && cuerpo.messages.length > 0) return desdeLineas(status, cuerpo.messages)
    if (esTexto(cuerpo.message)) return new ApiError(status, cuerpo.message.trim())
    if (esTexto(cuerpo.error)) return new ApiError(status, cuerpo.error.trim())
  }
  return new ApiError(status, MENSAJE_GENERICO)
}
```

- [ ] **Step 5: Add the form helper**

`src/lib/formularios.ts`:

```ts
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '@/lib/api/errors'

export function rutaDeCampo(campo: string, renombrar: Readonly<Record<string, string>> = {}): string {
  return campo
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segmento) => renombrar[segmento] ?? segmento)
    .join('.')
}

export function aplicarErroresDeCampo<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  renombrar: Readonly<Record<string, string>> = {},
): boolean {
  const entradas = Object.entries(error.erroresDeCampo)
  for (const [campo, mensaje] of entradas) {
    setError(rutaDeCampo(campo, renombrar) as Path<T>, { type: 'server', message: mensaje })
  }
  return entradas.length > 0
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/api src/lib/formularios.test.ts
```

Expected: PASS — `errors.test.ts` 18 tests (10 from M0 + 8), `formularios.test.ts` 4, plus M0's `http.test.ts` and `pagina.test.ts` unchanged (`cambiar-contrasena-page.test.tsx` keeps passing: its 500 `{ error, mensaje }` still shows `error`).

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 113 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: normalise turno and evaluation error responses"
```

---

### Task 2: Session hardening carried over from the M0 review

**Files:**
- Modify: `src/lib/auth/tokens.ts`, `src/lib/auth/guardas.ts`, `src/lib/auth/sesion.ts`
- Test: `src/lib/auth/tokens.test.ts` (append), `src/lib/auth/guardas.test.ts` (append), `src/lib/auth/sesion.test.ts` (two tests inside `describe('sesion')`)

**Interfaces:**
- Consumes: M0's `ResultadoRenovacion = { estado: 'renovado'; token } | { estado: 'rechazado' } | { estado: 'no-disponible' }` (in `http.ts`), `tokens.renovar(): Promise<ResultadoRenovacion>`, `destinoSeguro(destino: string | undefined): string`, `sesion.restaurar(): Promise<Sesion | null>`, `ApiError` (already imported in `sesion.ts`).
- Produces (signatures unchanged, behaviour tightened):
  - `tokens.renovar()`: a 2xx refresh response whose body is not JSON resolves `{ estado: 'no-disponible' }` instead of rejecting, so the refresh token survives.
  - `destinoSeguro()`: returns `'/'` when the resolved `url.pathname` starts with `//` (e.g. `/x/..//evil.com` normalises to `//evil.com`, a protocol-relative URL once used as `href`).
  - `sesion.restaurar()`: when loading the profile (`GET /api/usuarios/nombre/{username}`) fails, it clears the tokens only for `ApiError` 401, 403 or 404; with status 0 (network) or ≥ 500 it keeps the refresh token so a later reload can still restore the session.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/auth/tokens.test.ts`:

```ts
describe('tokens ante respuestas inesperadas de /auth/refresh', () => {
  it('CA-SES-02 una respuesta 200 que no es JSON cuenta como no disponible y conserva el refresh token', async () => {
    server.use(http.post(`${config.sigedaApiUrl}/auth/refresh`, () => HttpResponse.text('<html>proxy</html>')))
    tokens.guardar('viejo', 'refresh-1')
    await expect(tokens.renovar()).resolves.toEqual({ estado: 'no-disponible' })
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe('refresh-1')
  })
})
```

Append to `src/lib/auth/guardas.test.ts`:

```ts
describe('destinoSeguro con rutas que se normalizan a otro origen', () => {
  it('descarta una ruta cuyo pathname resuelto empieza con //', () => {
    expect(destinoSeguro('/x/..//evil.com')).toBe('/')
    expect(destinoSeguro('/turnos/../..//evil.com/a')).toBe('/')
  })
})
```

In `src/lib/auth/sesion.test.ts`, add these two tests inside `describe('sesion', …)`, right before its closing `})` (the file already imports `http`, `HttpResponse`, `config`, `server`, `CLAVE_REFRESH` and `tokens`):

```ts
  it('CA-SES-02 conserva el refresh token si el perfil no carga por una falla del servidor o de red', async () => {
    await sesion.iniciar('comandante.aguirre', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(http.get(`${config.sigedaApiUrl}/api/usuarios/nombre/:nombre`, () => new HttpResponse(null, { status: 503 })))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe(refresh)
    server.use(http.get(`${config.sigedaApiUrl}/api/usuarios/nombre/:nombre`, () => HttpResponse.error()))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe(refresh)
  })

  it('borra el refresh token si el perfil responde 404', async () => {
    await sesion.iniciar('comandante.aguirre', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/usuarios/nombre/:nombre`, () =>
        HttpResponse.text('Usuario especificada no existe.', { status: 404 }),
      ),
    )
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBeNull()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth
```

Expected: FAIL, 3 tests — the non-JSON refresh case rejects with `SyntaxError: Unexpected token '<'`, `destinoSeguro('/x/..//evil.com')` returns `'//evil.com'`, and the 503 profile case finds the refresh token cleared (`expected null to be 'refresh:comandante.aguirre:1'`). The 404 profile case already passes.

- [ ] **Step 3: Read the refresh body inside the guard**

In `src/lib/auth/tokens.ts`, replace

```ts
  const datos = (await respuesta.json()) as { accessToken?: unknown }
```

with

```ts
  let datos: { accessToken?: unknown }
  try {
    datos = (await respuesta.json()) as { accessToken?: unknown }
  } catch {
    return { estado: 'no-disponible' }
  }
```

- [ ] **Step 4: Reject protocol-relative destinations**

In `src/lib/auth/guardas.ts`, replace

```ts
  if (url.origin !== window.location.origin) return '/'
```

with

```ts
  if (url.origin !== window.location.origin) return '/'
  if (url.pathname.startsWith('//')) return '/'
```

- [ ] **Step 5: Keep the refresh token when the profile is temporarily unavailable**

In `src/lib/auth/sesion.ts`, replace

```ts
export const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos.'
```

with

```ts
export const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos.'

const CUENTA_INVALIDA = new Set([401, 403, 404])
```

and inside `restaurar()` replace

```ts
    } catch {
      tokens.limpiar()
      return null
    }
```

with

```ts
    } catch (error) {
      if (error instanceof ApiError && CUENTA_INVALIDA.has(error.status)) tokens.limpiar()
      return null
    }
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth src/app.test.tsx
```

Expected: PASS — tokens 10, guardas 9, sesión 12, plus M0's other auth and navigation tests.

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 117 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "fix(auth): harden refresh parsing, redirect paths and session restore"
```

---

### Task 3: Domain rules — DIRBE, categorías, calendario, turno, briefing, evaluación, debriefing labels

**Files:**
- Create: `src/lib/dominio/dirbe.ts`, `src/lib/dominio/categorias.ts`, `src/lib/dominio/calendario.ts`, `src/lib/dominio/turno.ts`, `src/lib/dominio/briefing.ts`, `src/lib/dominio/evaluacion.ts`
- Modify: `src/lib/dominio/vocabulario.ts` (aircraft states), `src/lib/dominio/tonos.ts` (append the debriefing label classes)
- Test: `src/lib/dominio/dirbe.test.ts`, `categorias.test.ts`, `calendario.test.ts`, `turno.test.ts`, `briefing.test.ts`, `evaluacion.test.ts`, `tonos.test.ts`, `vocabulario.test.ts` (append)

**Interfaces:**
- Consumes: `date-fns` (`addDays`, `format`, `isValid`, `parse`); M0's `Termino`, `termino`, `VOCABULARIOS` in `vocabulario.ts`.
- Produces:
  - `dirbe.ts`: `NOTAS_DIRBE = ['D','I','R','B','E'] as const`, `type NotaDirbe`, `esNotaDirbe(v: unknown): v is NotaDirbe`, `opcionesDeNota(notaMinima: NotaDirbe): readonly NotaDirbe[]` (M1-4: D→[D]; I→[I,R]; R→[I,R,B]; B,E→[I,R,B,E]), `esCalificacionValida(notaMinima: NotaDirbe, nota: string): boolean`, `esBajoEstandar(notaMin: string, nota: string): boolean` (RI, BI, BR), `esSobreEstandar(notaMin, nota)` (IR, RB, BE), `type ConteoEstandar = { bajo; sobre; sinCalificar }`, `contarRespectoAlEstandar(calificaciones: readonly { notaMin: string; nota: string }[]): ConteoEstandar`.
  - `categorias.ts`: `CATEGORIAS = ['Ponderada','Chequeo','chequeoSubFase','Complementacion'] as const`, `type Categoria`, `esCategoria(v): v is Categoria`, `etiquetaCategoria(c): string` (response spelling), `categoriaDesde(texto: string): Categoria | null` (accepts both spellings, M1-3), `esCategoriaProgramada(c)` (Ponderada, chequeoSubFase), `requiereEvaluador(c)` (Chequeo, Complementacion).
  - `calendario.ts`: `PATRON_HORA`, `aFechaIso(fecha: Date)`, `hoyIso(ahora?: Date)`, `momento(fecha: string, hora: string): Date`, `esFechaIso(valor)`, `sumarDias(fecha: string, dias: number): string`, `esPosteriorAHoy(fecha, ahora?)`, `esHora(valor)`, `restarHoras(hora: string, horas: number): string` (wraps around midnight).
  - `turno.ts`: `MOTIVO_TURNO_VENCIDO = 'El turno ya no se puede modificar porque su fecha pasó.'`, `type Intervalo = { horaInicio; horaFin }`, `type Ocupacion = Intervalo & { idTurno: number; nombre: string }`, `type Conflicto = { indice: number; ocupacion: Ocupacion }`, `permiteCambios(fechaEval, ahora?)` (M1-7: only while the date is after today), `seSuperponen(a, b)`, `conflictosDeAeronave(horarios: readonly Intervalo[], ocupaciones: readonly Ocupacion[], idTurnoPropio?: number): Conflicto[]` (M1-10).
  - `briefing.ts`: `EXPLICA_INSTRUCTOR = 'Explica: Instructor'`, `EXPONE_ALUMNO = 'Expone: Alumno'`, `responsableDeManiobra(notaMinima: NotaDirbe)`, `type EtapaMision = { clave: 'briefing-diario' | 'briefing-detalle' | 'vuelo' | 'debriefing'; titulo; detalle; hecha }`, `etapasDeMision(vuelo: { fechaEval; horaInicio; horaFin }, evaluada: boolean, ahora?: Date): EtapaMision[]`.
  - `evaluacion.ts`: `MOTIVO_NO_ES_ULTIMA = 'Solo la última evaluación del alumno puede modificarse o eliminarse.'`, `ultimaEvaluacion(evaluaciones: readonly { codigo; fecha }[]): string | null` (latest by fecha, then turno id, then correlativo of the code), `codigoDeTurno(codAlumno, idTurno)`, `perteneceAlTurno(codigo, codAlumno, idTurno)` (`111111-1` and `111111-1-2` belong to turno 1; `111111-12` does not).
  - `vocabulario.ts`: `ESTADOS_AERONAVE` keyed by the enum names `Disponible`, `En_Mantenimiento`, `No_Disponible`, `Desconocido`, and vocabulary `'aeronave'` usable in `termino()` and `<StatusBadge vocabulario="aeronave" />`.
  - `tonos.ts`: `CLASES_ETIQUETA_DEBRIEFING = { observacion: 'text-tono-peligro-texto', causa: 'text-tono-info-texto', recomendacion: '' } as const` — the single home of spec §8's red/blue/default convention; the grading grid (Task 15) and the evaluation detail (Task 14) read it instead of spelling colour classes. The spec §8 design review is still open, so every visual choice stays in `theme.css` tokens and shared modules like this one.

- [ ] **Step 1: Write the failing tests**

`src/lib/dominio/dirbe.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  contarRespectoAlEstandar,
  esBajoEstandar,
  esCalificacionValida,
  esNotaDirbe,
  esSobreEstandar,
  opcionesDeNota,
} from './dirbe'

describe('DIRBE', () => {
  it('CA-EVA-04 ofrece solo las calificaciones válidas para cada nota mínima', () => {
    expect(opcionesDeNota('D')).toEqual(['D'])
    expect(opcionesDeNota('I')).toEqual(['I', 'R'])
    expect(opcionesDeNota('R')).toEqual(['I', 'R', 'B'])
    expect(opcionesDeNota('B')).toEqual(['I', 'R', 'B', 'E'])
    expect(opcionesDeNota('E')).toEqual(['I', 'R', 'B', 'E'])
  })

  it('CA-EVA-04 rechaza las combinaciones que el backend marca como no válidas', () => {
    for (const [minima, nota] of [
      ['I', 'D'],
      ['I', 'B'],
      ['I', 'E'],
      ['R', 'D'],
      ['R', 'E'],
      ['B', 'D'],
      ['E', 'D'],
      ['D', 'B'],
    ] as const) {
      expect(esCalificacionValida(minima, nota)).toBe(false)
    }
    expect(esCalificacionValida('B', 'E')).toBe(true)
  })

  it('CA-EVA-05 considera bajo el estándar solo RI, BI y BR', () => {
    expect(esBajoEstandar('R', 'I')).toBe(true)
    expect(esBajoEstandar('B', 'I')).toBe(true)
    expect(esBajoEstandar('B', 'R')).toBe(true)
    expect(esBajoEstandar('E', 'B')).toBe(false)
    expect(esBajoEstandar('B', 'B')).toBe(false)
  })

  it('considera sobre el estándar IR, RB y BE', () => {
    expect(esSobreEstandar('I', 'R')).toBe(true)
    expect(esSobreEstandar('R', 'B')).toBe(true)
    expect(esSobreEstandar('B', 'E')).toBe(true)
    expect(esSobreEstandar('B', 'B')).toBe(false)
  })

  it('cuenta las maniobras bajo y sobre el estándar y las que faltan calificar', () => {
    expect(
      contarRespectoAlEstandar([
        { notaMin: 'B', nota: 'R' },
        { notaMin: 'B', nota: 'E' },
        { notaMin: 'R', nota: 'R' },
        { notaMin: 'I', nota: '' },
      ]),
    ).toEqual({ bajo: 1, sobre: 1, sinCalificar: 1 })
  })

  it('reconoce las notas DIRBE', () => {
    expect(esNotaDirbe('B')).toBe(true)
    expect(esNotaDirbe('b')).toBe(false)
    expect(esNotaDirbe(3)).toBe(false)
  })
})
```

`src/lib/dominio/categorias.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { categoriaDesde, esCategoriaProgramada, etiquetaCategoria, requiereEvaluador } from './categorias'

describe('categorías de evaluación', () => {
  it('CA-EVA-11 entiende la grafía de la petición y la de la respuesta', () => {
    expect(categoriaDesde('chequeoSubFase')).toBe('chequeoSubFase')
    expect(categoriaDesde('Chequeo Sub Fase')).toBe('chequeoSubFase')
    expect(categoriaDesde('Complementacion')).toBe('Complementacion')
    expect(categoriaDesde('Complementación')).toBe('Complementacion')
    expect(categoriaDesde('Ponderada')).toBe('Ponderada')
    expect(categoriaDesde('Otra')).toBeNull()
  })

  it('muestra la grafía de la respuesta', () => {
    expect(etiquetaCategoria('chequeoSubFase')).toBe('Chequeo Sub Fase')
    expect(etiquetaCategoria('Complementacion')).toBe('Complementación')
  })

  it('CA-EVA-11 pide el código del evaluador solo en Chequeo y Complementación', () => {
    expect(esCategoriaProgramada('Ponderada')).toBe(true)
    expect(esCategoriaProgramada('chequeoSubFase')).toBe(true)
    expect(requiereEvaluador('Chequeo')).toBe(true)
    expect(requiereEvaluador('Complementacion')).toBe(true)
    expect(requiereEvaluador('Ponderada')).toBe(false)
  })
})
```

`src/lib/dominio/calendario.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { esFechaIso, esHora, esPosteriorAHoy, hoyIso, momento, restarHoras, sumarDias } from './calendario'

const AHORA = new Date(2026, 8, 19, 10, 30)

describe('calendario', () => {
  it('da la fecha de hoy en formato del backend', () => {
    expect(hoyIso(AHORA)).toBe('2026-09-19')
  })

  it('CA-TUR-02 solo considera válidas las fechas posteriores a hoy', () => {
    expect(esPosteriorAHoy('2026-09-20', AHORA)).toBe(true)
    expect(esPosteriorAHoy('2026-09-19', AHORA)).toBe(false)
    expect(esPosteriorAHoy('2024-03-01', AHORA)).toBe(false)
  })

  it('valida fechas y horas', () => {
    expect(esFechaIso('2026-02-28')).toBe(true)
    expect(esFechaIso('2026-02-30')).toBe(false)
    expect(esFechaIso('28/02/2026')).toBe(false)
    expect(esHora('09:00')).toBe(true)
    expect(esHora('24:00')).toBe(false)
    expect(esHora('9:00')).toBe(false)
  })

  it('suma días y resta horas', () => {
    expect(sumarDias('2026-09-30', 1)).toBe('2026-10-01')
    expect(sumarDias('2026-09-19', -1)).toBe('2026-09-18')
    expect(restarHoras('13:00', 2)).toBe('11:00')
    expect(restarHoras('00:30', 1)).toBe('23:30')
  })

  it('combina fecha y hora', () => {
    expect(momento('2026-09-19', '13:45')).toEqual(new Date(2026, 8, 19, 13, 45))
  })
})
```

`src/lib/dominio/turno.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { conflictosDeAeronave, permiteCambios, seSuperponen } from './turno'

const AHORA = new Date(2026, 8, 19, 10, 30)

describe('reglas del turno', () => {
  it('CA-TUR-11 permite modificar y eliminar solo mientras la fecha sea posterior a hoy', () => {
    expect(permiteCambios('2026-09-20', AHORA)).toBe(true)
    expect(permiteCambios('2026-09-19', AHORA)).toBe(false)
    expect(permiteCambios('2024-03-01', AHORA)).toBe(false)
  })

  it('CA-TUR-07 detecta horarios que se superponen', () => {
    expect(seSuperponen({ horaInicio: '13:00', horaFin: '14:30' }, { horaInicio: '14:00', horaFin: '15:00' })).toBe(true)
    expect(seSuperponen({ horaInicio: '13:00', horaFin: '14:30' }, { horaInicio: '12:00', horaFin: '13:30' })).toBe(true)
    expect(seSuperponen({ horaInicio: '13:00', horaFin: '14:30' }, { horaInicio: '13:15', horaFin: '14:00' })).toBe(true)
  })

  it('CA-TUR-07 no considera superpuestos los horarios contiguos', () => {
    expect(seSuperponen({ horaInicio: '13:00', horaFin: '14:30' }, { horaInicio: '14:30', horaFin: '16:00' })).toBe(false)
    expect(seSuperponen({ horaInicio: '09:00', horaFin: '10:00' }, { horaInicio: '11:00', horaFin: '12:00' })).toBe(false)
  })
})

describe('conflictosDeAeronave', () => {
  const ocupaciones = [
    { idTurno: 8, nombre: 'Navegación Nocturna', horaInicio: '09:00', horaFin: '12:30' },
    { idTurno: 9, nombre: 'Instrumentos Básicos', horaInicio: '07:30', horaFin: '08:30' },
  ]

  it('CA-TUR-07 informa cada horario que choca con otro turno de la aeronave', () => {
    expect(
      conflictosDeAeronave(
        [
          { horaInicio: '08:00', horaFin: '09:30' },
          { horaInicio: '13:00', horaFin: '14:00' },
        ],
        ocupaciones,
      ),
    ).toEqual([
      { indice: 0, ocupacion: ocupaciones[0] },
      { indice: 0, ocupacion: ocupaciones[1] },
    ])
  })

  it('CA-TUR-07 ignora el propio turno al modificarlo y los horarios incompletos', () => {
    expect(conflictosDeAeronave([{ horaInicio: '09:00', horaFin: '10:00' }], ocupaciones, 8)).toEqual([])
    expect(conflictosDeAeronave([{ horaInicio: '09:00', horaFin: '' }], ocupaciones)).toEqual([])
  })
})
```

`src/lib/dominio/briefing.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { etapasDeMision, EXPLICA_INSTRUCTOR, EXPONE_ALUMNO, responsableDeManiobra } from './briefing'

const VUELO = { fechaEval: '2026-09-25', horaInicio: '13:00', horaFin: '14:30' }

describe('hoja de briefing', () => {
  it('CA-TUR-16 el instructor explica las maniobras con nota mínima D, I o R', () => {
    expect(responsableDeManiobra('D')).toBe(EXPLICA_INSTRUCTOR)
    expect(responsableDeManiobra('I')).toBe(EXPLICA_INSTRUCTOR)
    expect(responsableDeManiobra('R')).toBe(EXPLICA_INSTRUCTOR)
  })

  it('CA-TUR-16 el alumno expone las maniobras con nota mínima B o E', () => {
    expect(responsableDeManiobra('B')).toBe(EXPONE_ALUMNO)
    expect(responsableDeManiobra('E')).toBe(EXPONE_ALUMNO)
  })
})

describe('etapasDeMision', () => {
  it('CA-TUR-10 ubica las cuatro etapas respecto de la hora de vuelo', () => {
    const etapas = etapasDeMision(VUELO, false, new Date(2026, 8, 19))
    expect(etapas.map((etapa) => [etapa.titulo, etapa.detalle])).toEqual([
      ['Briefing diario', 'T−2 h · 11:00'],
      ['Briefing de detalle', 'T−1 h · 12:00'],
      ['Vuelo', '13:00 – 14:30'],
      ['Debriefing', 'Evaluación pendiente'],
    ])
    expect(etapas.every((etapa) => !etapa.hecha)).toBe(true)
  })

  it('CA-TUR-10 marca las etapas cumplidas según la hora actual', () => {
    const etapas = etapasDeMision(VUELO, false, new Date(2026, 8, 25, 12, 15))
    expect(etapas.map((etapa) => etapa.hecha)).toEqual([true, true, false, false])
  })

  it('CA-TUR-10 el debriefing se cumple cuando existe la evaluación', () => {
    const etapas = etapasDeMision(VUELO, true, new Date(2026, 8, 19))
    expect(etapas.map((etapa) => etapa.hecha)).toEqual([true, true, true, true])
    expect(etapas[3]?.detalle).toBe('Evaluación registrada')
  })
})
```

`src/lib/dominio/evaluacion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { perteneceAlTurno, ultimaEvaluacion } from './evaluacion'

describe('evaluaciones del alumno', () => {
  it('CA-EVA-12 reconoce la última evaluación por fecha, turno y correlativo', () => {
    expect(
      ultimaEvaluacion([
        { codigo: '555555-1', fecha: '2024-03-01' },
        { codigo: '555555-3', fecha: '2024-03-15' },
        { codigo: '555555-2', fecha: '2024-03-08' },
      ]),
    ).toBe('555555-3')
    expect(
      ultimaEvaluacion([
        { codigo: '555555-9', fecha: '2026-09-19' },
        { codigo: '555555-10-2', fecha: '2026-09-19' },
        { codigo: '555555-10-1', fecha: '2026-09-19' },
      ]),
    ).toBe('555555-10-2')
    expect(ultimaEvaluacion([])).toBeNull()
  })

  it('CA-EVA-02 relaciona las evaluaciones con su turno sin confundir turnos de prefijo parecido', () => {
    expect(perteneceAlTurno('111111-1', '111111', 1)).toBe(true)
    expect(perteneceAlTurno('111111-1-2', '111111', 1)).toBe(true)
    expect(perteneceAlTurno('111111-12', '111111', 1)).toBe(false)
  })
})
```

`src/lib/dominio/tonos.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CLASES_ETIQUETA_DEBRIEFING } from './tonos'

describe('etiquetas del debriefing', () => {
  it('siguen la convención de la institución: observación en rojo, causa en azul, recomendación sin color', () => {
    expect(CLASES_ETIQUETA_DEBRIEFING).toEqual({
      observacion: 'text-tono-peligro-texto',
      causa: 'text-tono-info-texto',
      recomendacion: '',
    })
  })
})
```

In `src/lib/dominio/vocabulario.test.ts`, replace the import line

```ts
import { CALIFICATIVOS, CLASIFICACIONES, ESTADOS_ALUMNO, termino } from './vocabulario'
```

with

```ts
import { CALIFICATIVOS, CLASIFICACIONES, ESTADOS_AERONAVE, ESTADOS_ALUMNO, termino } from './vocabulario'
```

and append:

```ts
describe('estados de aeronave', () => {
  it('cubre los nombres del enum EstadoAeronave del backend', () => {
    expect(Object.keys(ESTADOS_AERONAVE)).toEqual(['Disponible', 'En_Mantenimiento', 'No_Disponible', 'Desconocido'])
    expect(termino('aeronave', 'En_Mantenimiento').etiqueta).toBe('En mantenimiento')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dominio
```

Expected: FAIL — cannot resolve `./dirbe`, `./categorias`, `./calendario`, `./turno`, `./briefing`, `./evaluacion`; `tonos.test.ts` finds `CLASES_ETIQUETA_DEBRIEFING` undefined; `vocabulario.test.ts` fails on the missing `ESTADOS_AERONAVE` export.

- [ ] **Step 3: Implement DIRBE and categories**

`src/lib/dominio/dirbe.ts`:

```ts
export const NOTAS_DIRBE = ['D', 'I', 'R', 'B', 'E'] as const

export type NotaDirbe = (typeof NOTAS_DIRBE)[number]

const OPCIONES_POR_NOTA_MINIMA: Record<NotaDirbe, readonly NotaDirbe[]> = {
  D: ['D'],
  I: ['I', 'R'],
  R: ['I', 'R', 'B'],
  B: ['I', 'R', 'B', 'E'],
  E: ['I', 'R', 'B', 'E'],
}

const BAJO_EL_ESTANDAR = new Set(['RI', 'BI', 'BR'])
const SOBRE_EL_ESTANDAR = new Set(['IR', 'RB', 'BE'])

export function esNotaDirbe(valor: unknown): valor is NotaDirbe {
  return typeof valor === 'string' && (NOTAS_DIRBE as readonly string[]).includes(valor)
}

export function opcionesDeNota(notaMinima: NotaDirbe): readonly NotaDirbe[] {
  return OPCIONES_POR_NOTA_MINIMA[notaMinima]
}

export function esCalificacionValida(notaMinima: NotaDirbe, nota: string): boolean {
  return (OPCIONES_POR_NOTA_MINIMA[notaMinima] as readonly string[]).includes(nota)
}

export function esBajoEstandar(notaMinima: string, nota: string): boolean {
  return BAJO_EL_ESTANDAR.has(`${notaMinima}${nota}`)
}

export function esSobreEstandar(notaMinima: string, nota: string): boolean {
  return SOBRE_EL_ESTANDAR.has(`${notaMinima}${nota}`)
}

export type ConteoEstandar = { bajo: number; sobre: number; sinCalificar: number }

export function contarRespectoAlEstandar(calificaciones: readonly { notaMin: string; nota: string }[]): ConteoEstandar {
  return calificaciones.reduce<ConteoEstandar>(
    (conteo, { notaMin, nota }) => ({
      bajo: conteo.bajo + (esBajoEstandar(notaMin, nota) ? 1 : 0),
      sobre: conteo.sobre + (esSobreEstandar(notaMin, nota) ? 1 : 0),
      sinCalificar: conteo.sinCalificar + (nota === '' ? 1 : 0),
    }),
    { bajo: 0, sobre: 0, sinCalificar: 0 },
  )
}
```

`src/lib/dominio/categorias.ts`:

```ts
export const CATEGORIAS = ['Ponderada', 'Chequeo', 'chequeoSubFase', 'Complementacion'] as const

export type Categoria = (typeof CATEGORIAS)[number]

const ETIQUETAS: Record<Categoria, string> = {
  Ponderada: 'Ponderada',
  Chequeo: 'Chequeo',
  chequeoSubFase: 'Chequeo Sub Fase',
  Complementacion: 'Complementación',
}

export function esCategoria(valor: unknown): valor is Categoria {
  return typeof valor === 'string' && (CATEGORIAS as readonly string[]).includes(valor)
}

export function etiquetaCategoria(categoria: Categoria): string {
  return ETIQUETAS[categoria]
}

export function categoriaDesde(texto: string): Categoria | null {
  if (esCategoria(texto)) return texto
  return CATEGORIAS.find((categoria) => ETIQUETAS[categoria] === texto) ?? null
}

export function esCategoriaProgramada(categoria: Categoria): boolean {
  return categoria === 'Ponderada' || categoria === 'chequeoSubFase'
}

export function requiereEvaluador(categoria: Categoria): boolean {
  return !esCategoriaProgramada(categoria)
}
```

- [ ] **Step 4: Implement calendar, turno and briefing rules**

`src/lib/dominio/calendario.ts`:

```ts
import { addDays, format, isValid, parse } from 'date-fns'

export const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/

export function aFechaIso(fecha: Date): string {
  return format(fecha, 'yyyy-MM-dd')
}

export function hoyIso(ahora: Date = new Date()): string {
  return aFechaIso(ahora)
}

export function momento(fecha: string, hora: string): Date {
  return parse(`${fecha} ${hora}`, 'yyyy-MM-dd HH:mm', new Date(0))
}

export function esFechaIso(valor: string): boolean {
  return PATRON_FECHA.test(valor) && isValid(parse(valor, 'yyyy-MM-dd', new Date(0)))
}

export function sumarDias(fecha: string, dias: number): string {
  return aFechaIso(addDays(parse(fecha, 'yyyy-MM-dd', new Date(0)), dias))
}

export function esPosteriorAHoy(fecha: string, ahora: Date = new Date()): boolean {
  return fecha > hoyIso(ahora)
}

export function esHora(valor: string): boolean {
  return PATRON_HORA.test(valor)
}

export function restarHoras(hora: string, horas: number): string {
  const [h, m] = hora.split(':').map(Number)
  const minutos = (((h * 60 + m - horas * 60) % 1440) + 1440) % 1440
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}
```

`src/lib/dominio/turno.ts`:

```ts
import { esHora, esPosteriorAHoy } from './calendario'

export const MOTIVO_TURNO_VENCIDO = 'El turno ya no se puede modificar porque su fecha pasó.'

export type Intervalo = { horaInicio: string; horaFin: string }

export type Ocupacion = Intervalo & { idTurno: number; nombre: string }

export type Conflicto = { indice: number; ocupacion: Ocupacion }

export function permiteCambios(fechaEval: string, ahora: Date = new Date()): boolean {
  return esPosteriorAHoy(fechaEval, ahora)
}

export function seSuperponen(a: Intervalo, b: Intervalo): boolean {
  return a.horaInicio < b.horaFin && b.horaInicio < a.horaFin
}

export function conflictosDeAeronave(
  horarios: readonly Intervalo[],
  ocupaciones: readonly Ocupacion[],
  idTurnoPropio?: number,
): Conflicto[] {
  return horarios.flatMap((horario, indice) => {
    if (!esHora(horario.horaInicio) || !esHora(horario.horaFin) || horario.horaFin <= horario.horaInicio) return []
    return ocupaciones
      .filter((ocupacion) => ocupacion.idTurno !== idTurnoPropio && seSuperponen(horario, ocupacion))
      .map((ocupacion) => ({ indice, ocupacion }))
  })
}
```

`src/lib/dominio/briefing.ts`:

```ts
import { momento, restarHoras } from './calendario'
import type { NotaDirbe } from './dirbe'

export const EXPLICA_INSTRUCTOR = 'Explica: Instructor'
export const EXPONE_ALUMNO = 'Expone: Alumno'

export type Responsable = typeof EXPLICA_INSTRUCTOR | typeof EXPONE_ALUMNO

export function responsableDeManiobra(notaMinima: NotaDirbe): Responsable {
  return notaMinima === 'B' || notaMinima === 'E' ? EXPONE_ALUMNO : EXPLICA_INSTRUCTOR
}

export type ClaveEtapa = 'briefing-diario' | 'briefing-detalle' | 'vuelo' | 'debriefing'

export type EtapaMision = { clave: ClaveEtapa; titulo: string; detalle: string; hecha: boolean }

export type VueloProgramado = { fechaEval: string; horaInicio: string; horaFin: string }

export function etapasDeMision(vuelo: VueloProgramado, evaluada: boolean, ahora: Date = new Date()): EtapaMision[] {
  const briefingDiario = restarHoras(vuelo.horaInicio, 2)
  const briefingDetalle = restarHoras(vuelo.horaInicio, 1)
  const ocurrio = (hora: string) => evaluada || ahora >= momento(vuelo.fechaEval, hora)
  return [
    {
      clave: 'briefing-diario',
      titulo: 'Briefing diario',
      detalle: `T−2 h · ${briefingDiario}`,
      hecha: ocurrio(briefingDiario),
    },
    {
      clave: 'briefing-detalle',
      titulo: 'Briefing de detalle',
      detalle: `T−1 h · ${briefingDetalle}`,
      hecha: ocurrio(briefingDetalle),
    },
    {
      clave: 'vuelo',
      titulo: 'Vuelo',
      detalle: `${vuelo.horaInicio} – ${vuelo.horaFin}`,
      hecha: ocurrio(vuelo.horaFin),
    },
    {
      clave: 'debriefing',
      titulo: 'Debriefing',
      detalle: evaluada ? 'Evaluación registrada' : 'Evaluación pendiente',
      hecha: evaluada,
    },
  ]
}
```

`src/lib/dominio/evaluacion.ts`:

```ts
export const MOTIVO_NO_ES_ULTIMA = 'Solo la última evaluación del alumno puede modificarse o eliminarse.'

export type EvaluacionFechada = { codigo: string; fecha: string }

function clave(evaluacion: EvaluacionFechada): [string, number, number] {
  const [, turno, correlativo] = evaluacion.codigo.split('-')
  return [evaluacion.fecha, Number(turno ?? 0), Number(correlativo ?? 0)]
}

function comparar(a: EvaluacionFechada, b: EvaluacionFechada): number {
  const [fechaA, turnoA, correlativoA] = clave(a)
  const [fechaB, turnoB, correlativoB] = clave(b)
  if (fechaA !== fechaB) return fechaA < fechaB ? -1 : 1
  if (turnoA !== turnoB) return turnoA - turnoB
  return correlativoA - correlativoB
}

export function ultimaEvaluacion(evaluaciones: readonly EvaluacionFechada[]): string | null {
  if (evaluaciones.length === 0) return null
  return [...evaluaciones].sort(comparar).at(-1)?.codigo ?? null
}

export function codigoDeTurno(codAlumno: string, idTurno: number): string {
  return `${codAlumno}-${idTurno}`
}

export function perteneceAlTurno(codigo: string, codAlumno: string, idTurno: number): boolean {
  const base = codigoDeTurno(codAlumno, idTurno)
  return codigo === base || codigo.startsWith(`${base}-`)
}
```

- [ ] **Step 5: Add the aircraft states and the debriefing label classes**

In `src/lib/dominio/vocabulario.ts`, insert this block immediately before the line `export type Calificativo = keyof typeof CALIFICATIVOS`:

```ts
export const ESTADOS_AERONAVE = {
  Disponible: { etiqueta: 'Disponible', tono: 'exito' },
  En_Mantenimiento: { etiqueta: 'En mantenimiento', tono: 'aviso' },
  No_Disponible: { etiqueta: 'No disponible', tono: 'alerta' },
  Desconocido: { etiqueta: 'Desconocido', tono: 'neutro' },
} as const satisfies Record<string, Termino>

```

and in the `VOCABULARIOS` object replace

```ts
  estado: ESTADOS_ALUMNO,
} as const
```

with

```ts
  estado: ESTADOS_ALUMNO,
  aeronave: ESTADOS_AERONAVE,
} as const
```

Append to `src/lib/dominio/tonos.ts`:

```ts

export const CLASES_ETIQUETA_DEBRIEFING = {
  observacion: 'text-tono-peligro-texto',
  causa: 'text-tono-info-texto',
  recomendacion: '',
} as const
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dominio
```

Expected: PASS — dirbe 6, categorías 3, calendario 5, turno 5, briefing 5, evaluación 2, tonos 1, vocabulario 6.

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 145 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add dirbe, category, calendar and mission rules"
```

---

### Task 4: Mock store, catalog handlers and catalog queries (M1-9)

**Files:**
- Create: `src/mocks/sigeda/datos.ts`, `src/mocks/sigeda/comun.ts`, `src/mocks/sigeda/catalogos.ts`, `src/mocks/reiniciar.ts`, `src/features/catalogos/api.ts`
- Modify: `src/mocks/handlers.ts` (full rewrite), `src/test/setup.ts` (reset), `src/mocks/sigeda/usuarios.ts` (add `instructor.mendoza`)
- Test: `src/features/catalogos/api.test.ts`

**Interfaces:**
- Consumes: `usuarioAutenticado(request)` from `src/mocks/sigeda/auth.ts` (M0), `reiniciarAuthMock()` (M0), `permisosDeRol` (M0), `config` (M0), `sigeda.pagina/lista` (M0), `hoyIso`, `sumarDias` (Task 3), `iniciarComo` from `@/test/render` (M0).
- Produces:
  - Mock store `datos.ts`: types `PersonaMock`, `GrupoMock`, `SubfaseMock`, `ManiobraMock`, `AeronaveMock`, `AlumnoTurnoMock`, `ManiobraTurnoMock`, `TurnoMock`, `CalificacionMock`, `EvaluacionMock`, `DatosMock`, `ProgramaMock`; `crearDatos(hoy?: string): DatosMock`, `datos(): DatosMock`, `reiniciarDatosMock()`, `buscarPersona(codigo)`, `nombreCorto(persona)` (`'Juan Torres'`). Fixtures: the seed personas (plus `222444` Jorge Aguirre, the mock Comandante), grupos 1–6, subfases 1–5, maniobras 1–10 with the seed `maniobras_subfase` (Contacto and Formación have none), aeronaves 1–3 (`Disponible`, `En_Mantenimiento`, `No_Disponible`), seed turnos 1–7 (past; instructor `444444` for 1–4 and `888888` for 5–7, aeronave 1), turno 8 "Navegación Nocturna" and turno 9 "Instrumentos Básicos" dated `hoy + 7` on aeronave 1 (111111 09:00–10:30 and 666666 11:00–12:30 with notas mínimas R, B, E, I; 777777 07:30–08:30), alumno 777777 "En Chequeo", evaluaciones `111111-1` (Bueno 16.5, with causa/observación/recomendación on maniobra 3), `555555-1`, `555555-2`, `555555-3` (latest of 555555). Next turno id is 10.
  - `comun.ts`: `API`, `errorResponse(status, error, message, messages?)`, `autorizar(request, permiso): UsuarioMock | Response` (401 without token, 403 `ErrorResponse` without the permission), `textoNoEncontrado(mensaje)`, `numero(url, clave, porDefecto)`, `paginar(elementos, url, { nombreLista, propiedadPorDefecto, proyectar? })` (Spring `Page` JSON, `property`/`direction` sorting, 404 text on an empty page, 400 `{error, mensaje}` on a bad sort property).
  - `handlersCatalogos`: `GET /api/subfases` (max size 10), `/api/maniobras/subfase/:id`, `/api/aeronaves`, `/api/personas/instructor/:tipo`, `/api/alumnos/programa/:nombre`, `/api/grupos/programa/:nombre`, `/api/grupos/instructor/:cod/programa/:nombre`, `/api/personas/:cod/status` — per contract §1.8 and §4.
  - `reiniciarMocks()` from `src/mocks/reiniciar.ts` (auth + store), called after every test.
  - `src/features/catalogos/api.ts`: `PROGRAMAS`, `type Programa`, `Subfase`, `Maniobra`, `Aeronave`, `PersonaResumida = { codigo; nombreCompleto }`, `OpcionAlumno = PersonaResumida & { grupo: string | null }`, `type FuenteAlumnos = 'todos' | 'programacion' | 'instructor'`, `nombreCompleto(persona)`, `clavesCatalogos`, `listarSubfases()`, `listarManiobrasDeSubfase(id)`, `listarAeronaves()`, `listarInstructores(programa)`, `fuenteDeAlumnos(permisos): FuenteAlumnos | null` (View All Groups → `'todos'`, Manage Shifts → `'programacion'`, View My Group → `'instructor'`), `listarAlumnos(fuente, programa, codPersona)`, `agruparPorGrupo(alumnos): [string, OpcionAlumno[]][]`, `consultasCatalogos.{subfases, maniobras(id), aeronaves, instructores(programa), alumnos(fuente, programa, codPersona)}` (`queryOptions`).
  - Mock user `instructor.mendoza` (id 8, codPersona `888888`, rol Instructor).

- [ ] **Step 1: Add the mock user from the seed**

In `src/mocks/sigeda/usuarios.ts`, insert this entry right before the `'alumno.lopez': {` entry of `USUARIOS_MOCK`:

```ts
  'instructor.mendoza': {
    id: 8,
    username: 'instructor.mendoza',
    correo: 'instructor2@sigeda.com',
    codPersona: '888888',
    rol: { id: 4, nombre: 'Instructor', descripcion: 'Evaluación y seguimiento de alumnos' },
  },
```

- [ ] **Step 2: Write the mock store**

`src/mocks/sigeda/datos.ts`:

```ts
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'

export type ProgramaMock = 'PDI' | 'PDE'

export type PersonaMock = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  tipo: string | null
  estado: string
  idGrupo: number | null
  contEval: number
  codEvalRealizada: string | null
}

export type GrupoMock = { id: number; nombre: string; programa: ProgramaMock }

export type SubfaseMock = { id: number; nombre: string; descripcion: string; fase: string }

export type ManiobraMock = { id: number; nombre: string; descripcion: string }

export type AeronaveMock = { id: number; nombre: string; descripcion: string; imagen: string | null; estado: string }

export type AlumnoTurnoMock = { codAlumno: string; horaInicio: string; horaFin: string }

export type ManiobraTurnoMock = { idManiobra: number; notaMin: string }

export type TurnoMock = {
  id: number
  nombre: string
  fechaEval: string
  programa: ProgramaMock
  idSubfase: number
  subfase: string
  fase: string
  codInstructor: string | null
  idAeronave: number | null
  alumnos: AlumnoTurnoMock[]
  maniobras: ManiobraTurnoMock[]
}

export type CalificacionMock = {
  codEvaluacion: string
  idManiobra: number
  notaMin: string
  nota: string
  causa: string | null
  observacion: string | null
  recomendacion: string | null
  maniobra: ManiobraMock
}

export type EvaluacionMock = {
  codigo: string
  nombre: string
  fecha: string
  programa: ProgramaMock
  categoria: string
  clasificacion: string | null
  promedio: string | null
  recomendacion: string | null
  archivoUrl: string | null
  idSubFase: number
  fase: string
  subFase: string
  estadoAlumno: string
  codEvalPrevia: string | null
  codEvaluador: string | null
  evaluador: string
  codPersona: string
  alumno: string
  calificaciones: CalificacionMock[]
}

export type DatosMock = {
  personas: PersonaMock[]
  grupos: GrupoMock[]
  subfases: SubfaseMock[]
  maniobras: ManiobraMock[]
  maniobrasPorSubfase: Record<number, number[]>
  aeronaves: AeronaveMock[]
  turnos: TurnoMock[]
  evaluaciones: EvaluacionMock[]
  siguienteIdTurno: number
}

function persona(
  codigo: string,
  nombre: string,
  aPaterno: string,
  aMaterno: string,
  tipo: string | null,
  idGrupo: number | null,
  estado = 'Apto',
): PersonaMock {
  return { codigo, nombre, aPaterno, aMaterno, tipo, estado, idGrupo, contEval: 0, codEvalRealizada: null }
}

const MANIOBRAS: ManiobraMock[] = Array.from({ length: 10 }, (_, indice) => ({
  id: indice + 1,
  nombre: `Maniobra ${indice + 1}`,
  descripcion: `Descripcion de Maniobra ${indice + 1}`,
}))

function maniobra(id: number): ManiobraMock {
  const encontrada = MANIOBRAS.find((candidata) => candidata.id === id)
  if (!encontrada) throw new Error(`Maniobra ${id} inexistente en los datos de prueba`)
  return { ...encontrada }
}

function calificaciones(codigo: string, filas: [number, string, string, string?, string?, string?][]): CalificacionMock[] {
  return filas.map(([idManiobra, notaMin, nota, causa, observacion, recomendacion]) => ({
    codEvaluacion: codigo,
    idManiobra,
    notaMin,
    nota,
    causa: causa ?? null,
    observacion: observacion ?? null,
    recomendacion: recomendacion ?? null,
    maniobra: maniobra(idManiobra),
  }))
}

function turnoSemilla(
  id: number,
  fechaEval: string,
  nombre: string,
  idSubfase: number,
  fase: string,
  subfase: string,
  codInstructor: string,
  codAlumno: string,
  maniobras: number[],
): TurnoMock {
  return {
    id,
    nombre,
    fechaEval,
    programa: 'PDI',
    idSubfase,
    subfase,
    fase,
    codInstructor,
    idAeronave: 1,
    alumnos: [{ codAlumno, horaInicio: '13:00', horaFin: '14:30' }],
    maniobras: maniobras.map((idManiobra) => ({ idManiobra, notaMin: 'B' })),
  }
}

export function crearDatos(hoy: string = hoyIso()): DatosMock {
  const enUnaSemana = sumarDias(hoy, 7)
  const personas = [
    persona('111111', 'Oscar', 'Lopez', 'Chaparro', 'Alumno', 1),
    persona('222222', 'Juan', 'Falconi', 'Fernandez', 'Alumno', 2),
    persona('333333', 'Carlos', 'Vargas', 'Rodriguez', null, null),
    persona('444444', 'Juan', 'Torres', 'Perez', 'Instructor PDI', null),
    persona('555555', 'Pedro', 'Rodriguez', 'Garcia', 'Alumno', 3),
    persona('666666', 'Ana', 'Torres', 'Martinez', 'Alumno', 3),
    persona('777777', 'Carlos', 'Ramirez', 'Sanchez', 'Alumno', 4, 'En Chequeo'),
    persona('888888', 'Maria', 'Flores', 'Mendoza', 'Instructor PDI', null),
    persona('999999', 'Luis', 'Diaz', 'Castro', 'Alumno', 6),
    persona('000001', 'Admin', 'Sistema', 'Web', null, null),
    persona('222444', 'Jorge', 'Aguirre', 'Salas', null, null),
  ]
  const alumno111 = personas.find((candidata) => candidata.codigo === '111111')
  const alumno555 = personas.find((candidata) => candidata.codigo === '555555')
  if (alumno111) Object.assign(alumno111, { contEval: 1, codEvalRealizada: '111111-1' })
  if (alumno555) Object.assign(alumno555, { contEval: 3, codEvalRealizada: '555555-3' })

  return {
    personas,
    grupos: [
      { id: 1, nombre: 'Grupo 1', programa: 'PDI' },
      { id: 2, nombre: 'Grupo 2', programa: 'PDI' },
      { id: 3, nombre: 'Grupo 3', programa: 'PDI' },
      { id: 4, nombre: 'Grupo 4', programa: 'PDI' },
      { id: 5, nombre: 'Grupo 5', programa: 'PDI' },
      { id: 6, nombre: 'Grupo 6', programa: 'PDI' },
    ],
    subfases: [
      { id: 1, nombre: 'Contacto', descripcion: 'Familiarización con controles y procedimientos básicos', fase: 'Adaptación' },
      { id: 2, nombre: 'Navegación', descripcion: 'Técnicas de navegación y orientación', fase: 'Adaptación' },
      { id: 3, nombre: 'Instrumentos', descripcion: 'Manejo de instrumentos de vuelo', fase: 'Adaptación' },
      { id: 4, nombre: 'Campos Extraños', descripcion: 'Operaciones en terrenos no preparados', fase: 'Adaptación' },
      { id: 5, nombre: 'Formación', descripcion: 'Vuelo en formación y coordinación', fase: 'Adaptación' },
    ],
    maniobras: MANIOBRAS.map((item) => ({ ...item })),
    maniobrasPorSubfase: { 1: [], 2: [1, 2, 3, 4, 5, 6], 3: [9, 10], 4: [7, 8], 5: [] },
    aeronaves: [
      { id: 1, nombre: 'Robinson R22', descripcion: 'Helicóptero de entrenamiento básico', imagen: null, estado: 'Disponible' },
      { id: 2, nombre: 'Enstrom 280FX', descripcion: 'Helicóptero de instrucción intermedia', imagen: null, estado: 'En_Mantenimiento' },
      { id: 3, nombre: 'Schweizer S-300C', descripcion: 'Helicóptero de instrucción avanzada', imagen: null, estado: 'No_Disponible' },
    ],
    turnos: [
      turnoSemilla(1, '2024-03-01', 'Contacto Básico', 1, 'Adaptación', 'Contacto', '444444', '111111', [1, 2, 3, 4, 5, 6]),
      turnoSemilla(2, '2024-03-08', 'Contacto Intermedio', 1, 'Adaptación', 'Contacto', '444444', '222222', [1, 2, 3, 4, 5, 6]),
      turnoSemilla(3, '2024-03-15', 'Contacto Avanzado', 1, 'Adaptación', 'Contacto', '444444', '555555', [1, 2, 3, 4, 5, 6]),
      turnoSemilla(4, '2024-03-22', 'Navegación Inicial', 2, 'Adaptación', 'Navegación', '444444', '666666', [1, 2, 3, 4, 5, 6]),
      turnoSemilla(5, '2024-03-29', 'Instrumentos Avanzados', 3, 'Adaptación', 'Instrumentos', '888888', '777777', [9, 10]),
      turnoSemilla(6, '2024-04-05', 'Campos Tácticos', 4, 'Operaciones HeliTransportadas', 'Campos Extraños', '888888', '999999', [7, 8]),
      turnoSemilla(7, '2024-04-12', 'Navegación Avanzada', 5, 'Operaciones AeroTácticas', 'Formación', '888888', '999999', [1, 2, 3, 4, 5, 6]),
      {
        id: 8,
        nombre: 'Navegación Nocturna',
        fechaEval: enUnaSemana,
        programa: 'PDI',
        idSubfase: 2,
        subfase: 'Navegación',
        fase: 'Adaptación',
        codInstructor: '444444',
        idAeronave: 1,
        alumnos: [
          { codAlumno: '111111', horaInicio: '09:00', horaFin: '10:30' },
          { codAlumno: '666666', horaInicio: '11:00', horaFin: '12:30' },
        ],
        maniobras: [
          { idManiobra: 1, notaMin: 'R' },
          { idManiobra: 2, notaMin: 'B' },
          { idManiobra: 3, notaMin: 'E' },
          { idManiobra: 4, notaMin: 'I' },
        ],
      },
      {
        id: 9,
        nombre: 'Instrumentos Básicos',
        fechaEval: enUnaSemana,
        programa: 'PDI',
        idSubfase: 3,
        subfase: 'Instrumentos',
        fase: 'Adaptación',
        codInstructor: '888888',
        idAeronave: 1,
        alumnos: [{ codAlumno: '777777', horaInicio: '07:30', horaFin: '08:30' }],
        maniobras: [
          { idManiobra: 9, notaMin: 'B' },
          { idManiobra: 10, notaMin: 'R' },
        ],
      },
    ],
    evaluaciones: [
      {
        codigo: '111111-1',
        nombre: 'Ponderada Contacto Básico',
        fecha: '2024-03-01',
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Bueno',
        promedio: '16.5',
        recomendacion: 'Mantener la coordinación en los virajes',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: null,
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '111111',
        alumno: 'Oscar Lopez',
        calificaciones: calificaciones('111111-1', [
          [1, 'B', 'B'],
          [2, 'B', 'B'],
          [3, 'B', 'R', 'Falta de coordinación en pedales', 'Pierde altura en el viraje', 'Practicar virajes coordinados'],
          [4, 'B', 'B'],
          [5, 'B', 'E'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '555555-1',
        nombre: 'Ponderada Contacto Básico',
        fecha: '2024-03-01',
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Regular',
        promedio: '14.0',
        recomendacion: 'Mejorar técnicas básicas',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: null,
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '555555',
        alumno: 'Pedro Rodriguez',
        calificaciones: calificaciones('555555-1', [
          [1, 'B', 'R'],
          [2, 'B', 'R'],
          [3, 'B', 'R'],
          [4, 'B', 'R'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '555555-2',
        nombre: 'Chequeo Contacto Intermedio',
        fecha: '2024-03-08',
        programa: 'PDI',
        categoria: 'Chequeo',
        clasificacion: 'Bueno',
        promedio: null,
        recomendacion: 'Continuar con el entrenamiento',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'En Chequeo',
        codEvalPrevia: '555555-1',
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '555555',
        alumno: 'Pedro Rodriguez',
        calificaciones: calificaciones('555555-2', [
          [1, 'B', 'B'],
          [2, 'B', 'B'],
          [3, 'B', 'B'],
          [4, 'B', 'B'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '555555-3',
        nombre: 'Ponderada Contacto Avanzado',
        fecha: '2024-03-15',
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Regular',
        promedio: '15.0',
        recomendacion: 'Reforzar procedimientos',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: '555555-2',
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '555555',
        alumno: 'Pedro Rodriguez',
        calificaciones: calificaciones('555555-3', [
          [1, 'B', 'R'],
          [2, 'B', 'R'],
          [3, 'B', 'R'],
          [4, 'B', 'R'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
    ],
    siguienteIdTurno: 10,
  }
}

let datosActuales = crearDatos()

export function datos(): DatosMock {
  return datosActuales
}

export function reiniciarDatosMock() {
  datosActuales = crearDatos()
}

export function buscarPersona(codigo: string): PersonaMock | undefined {
  return datosActuales.personas.find((persona) => persona.codigo === codigo)
}

export function nombreCorto(persona: PersonaMock): string {
  return `${persona.nombre} ${persona.aPaterno}`
}
```

`src/mocks/sigeda/comun.ts`:

```ts
import { HttpResponse } from 'msw'
import { permisosDeRol, type Permiso } from '@/lib/auth/permisos'
import { config } from '@/lib/config'
import { usuarioAutenticado } from './auth'
import type { UsuarioMock } from './usuarios'

export const API = config.sigedaApiUrl

export function errorResponse(status: number, error: string, message: string | null, messages: string[] | null = null) {
  return HttpResponse.json(
    { timestamp: '2026-09-19T10:00:00', status, error, message, messages },
    { status },
  )
}

export function autorizar(request: Request, permiso: Permiso): UsuarioMock | Response {
  const usuario = usuarioAutenticado(request)
  if (!usuario) {
    return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 })
  }
  if (!permisosDeRol(usuario.rol.nombre).has(permiso)) {
    return errorResponse(403, 'Acceso denegado', 'No tienes permisos para realizar esta acción')
  }
  return usuario
}

export function textoNoEncontrado(mensaje: string) {
  return HttpResponse.text(mensaje, { status: 404 })
}

export function numero(url: URL, clave: string, porDefecto: number): number {
  const valor = Number(url.searchParams.get(clave) ?? porDefecto)
  return Number.isFinite(valor) ? valor : porDefecto
}

export function paginar<T extends object>(
  elementos: readonly T[],
  url: URL,
  opciones: { nombreLista: string; propiedadPorDefecto: string; proyectar?: (elemento: T) => unknown },
) {
  const page = numero(url, 'page', 0)
  const size = numero(url, 'size', 6)
  const direccion = (url.searchParams.get('direction') ?? 'ASC').toUpperCase()
  const propiedad = url.searchParams.get('property') ?? opciones.propiedadPorDefecto
  if (page < 0 || size < 1 || (direccion !== 'ASC' && direccion !== 'DESC')) {
    return HttpResponse.json({ error: 'Argumento incorrecto', mensaje: 'Paginado inválido.' }, { status: 400 })
  }
  if (elementos.length > 0 && !(propiedad in elementos[0])) {
    return HttpResponse.json(
      {
        error: 'Argumento incorrecto',
        mensaje: `No se encontró atributo '${propiedad}' para ordenar ${opciones.nombreLista}.`,
      },
      { status: 400 },
    )
  }
  const ordenados = [...elementos].sort((a, b) => {
    const izquierda = String((a as Record<string, unknown>)[propiedad] ?? '')
    const derecha = String((b as Record<string, unknown>)[propiedad] ?? '')
    const comparacion = izquierda.localeCompare(derecha, 'es', { numeric: true })
    return direccion === 'DESC' ? -comparacion : comparacion
  })
  const pagina = ordenados.slice(page * size, page * size + size)
  if (pagina.length === 0) return textoNoEncontrado(`No existen ${opciones.nombreLista} disponibles.`)
  const content = opciones.proyectar ? pagina.map(opciones.proyectar) : pagina
  const totalPages = Math.ceil(ordenados.length / size)
  return HttpResponse.json({
    content,
    totalElements: ordenados.length,
    totalPages,
    size,
    number: page,
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: content.length,
    empty: false,
  })
}
```

- [ ] **Step 3: Write the catalog handlers and the combined reset**

`src/mocks/sigeda/catalogos.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, errorResponse, numero, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, type PersonaMock, type ProgramaMock } from './datos'

function programaDeRuta(valor: unknown): ProgramaMock {
  return String(valor).toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
}

function nombreAlumno(persona: PersonaMock) {
  return { codigo: persona.codigo, nombre: persona.nombre, aPaterno: persona.aPaterno, aMaterno: persona.aMaterno }
}

function alumnoConEstado(persona: PersonaMock) {
  return { ...nombreAlumno(persona), idGrupo: persona.idGrupo, estado: persona.estado }
}

function alumnosDelGrupo(idGrupo: number) {
  return datos().personas.filter((persona) => persona.tipo === 'Alumno' && persona.idGrupo === idGrupo)
}

function sugerencias(estado: string): string[] {
  if (estado === 'En Complementación') return ['Complementacion']
  if (estado === 'En Chequeo' || estado === 'En Final') return ['Chequeo']
  if (estado === 'Apto' || estado === 'En Observación') return ['Ponderada', 'chequeoSubFase', 'Complementacion']
  return []
}

export const handlersCatalogos = [
  http.get(`${API}/api/subfases`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const page = numero(url, 'page', 0)
    const size = numero(url, 'size', 6)
    if (size > 10) {
      return errorResponse(400, 'Atributo o configuración erronea', 'Tamaño de página demasiado grande, máximo permitido es 10.')
    }
    const todas = datos().subfases.map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion }))
    const content = todas.slice(page * size, page * size + size)
    if (content.length === 0) return errorResponse(404, 'Recurso no encontrado', 'No existen subfases disponibles.')
    return HttpResponse.json({
      content,
      totalElements: todas.length,
      totalPages: Math.ceil(todas.length / size),
      size,
      number: page,
    })
  }),
  http.get(`${API}/api/maniobras/subfase/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const ids = datos().maniobrasPorSubfase[Number(params.id)] ?? []
    if (ids.length === 0) return errorResponse(404, 'Recurso no encontrado', 'No existen maniobras disponibles.')
    return HttpResponse.json(datos().maniobras.filter((maniobra) => ids.includes(maniobra.id)))
  }),
  http.get(`${API}/api/aeronaves`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const aeronaves = datos().aeronaves
    if (aeronaves.length === 0) return textoNoEncontrado('No existen aeronaves disponibles.')
    return HttpResponse.json(aeronaves)
  }),
  http.get(`${API}/api/personas/instructor/:tipo`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const instructores = datos().personas.filter((persona) => persona.tipo === String(params.tipo))
    if (instructores.length === 0) return textoNoEncontrado('No existen personas disponibles.')
    return HttpResponse.json(instructores.map(nombreAlumno))
  }),
  http.get(`${API}/api/alumnos/programa/:nombre`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const programa = programaDeRuta(params.nombre)
    const grupos = datos()
      .grupos.filter((grupo) => grupo.programa === programa)
      .map((grupo) => ({ ...grupo, personas: alumnosDelGrupo(grupo.id).map(nombreAlumno) }))
      .filter((grupo) => grupo.personas.length > 0)
    if (grupos.length === 0) return textoNoEncontrado('No existen grupos disponibles.')
    return HttpResponse.json(grupos)
  }),
  http.get(`${API}/api/grupos/programa/:nombre`, ({ request, params }) => {
    const permitido = autorizar(request, 'View All Groups')
    if (permitido instanceof Response) return permitido
    const programa = programaDeRuta(params.nombre)
    const catalogo = datos()
      .grupos.filter((grupo) => grupo.programa === programa)
      .map((grupo) => ({ id: grupo.id, personas: alumnosDelGrupo(grupo.id).map(alumnoConEstado) }))
    return paginar(catalogo, new URL(request.url), {
      nombreLista: 'grupos',
      propiedadPorDefecto: 'id',
      proyectar: ({ personas }) => ({ personas }),
    })
  }),
  http.get(`${API}/api/grupos/instructor/:cod/programa/:nombre`, ({ request, params }) => {
    const permitido = autorizar(request, 'View My Group')
    if (permitido instanceof Response) return permitido
    const programa = programaDeRuta(params.nombre)
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
    return paginar(catalogo, new URL(request.url), {
      nombreLista: 'grupos',
      propiedadPorDefecto: 'id',
      proyectar: ({ persona }) => ({ persona }),
    })
  }),
  http.get(`${API}/api/personas/:cod/status`, ({ request, params }) => {
    const permitido = autorizar(request, 'Write')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    const categorias = sugerencias(persona.estado)
    if (categorias.length === 0) return textoNoEncontrado('No hay sugerencias disponibles.')
    return HttpResponse.json(categorias)
  }),
]
```

`src/mocks/reiniciar.ts`:

```ts
import { reiniciarAuthMock } from './sigeda/auth'
import { reiniciarDatosMock } from './sigeda/datos'

export function reiniciarMocks() {
  reiniciarAuthMock()
  reiniciarDatosMock()
}
```

Replace `src/mocks/handlers.ts` with:

```ts
import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'

export const handlers: RequestHandler[] = [...handlersAuth, ...handlersCatalogos]
```

In `src/test/setup.ts`, replace the import

```ts
import { reiniciarAuthMock } from '@/mocks/sigeda/auth'
```

with

```ts
import { reiniciarMocks } from '@/mocks/reiniciar'
```

and inside the `afterEach` block replace the line `  reiniciarAuthMock()` with `  reiniciarMocks()`.

- [ ] **Step 4: Write the failing tests**

`src/features/catalogos/api.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { permisosDeRol } from '@/lib/auth/permisos'
import { iniciarComo } from '@/test/render'
import {
  agruparPorGrupo,
  fuenteDeAlumnos,
  listarAeronaves,
  listarAlumnos,
  listarInstructores,
  listarManiobrasDeSubfase,
  listarSubfases,
} from './api'

describe('catálogos para turnos y evaluaciones', () => {
  it('lista las sub fases del programa', async () => {
    await iniciarComo('jefe.operaciones')
    const subfases = await listarSubfases()
    expect(subfases.map((subfase) => subfase.nombre)).toEqual([
      'Contacto',
      'Navegación',
      'Instrumentos',
      'Campos Extraños',
      'Formación',
    ])
  })

  it('CA-TUR-05 lista las maniobras de una sub fase y trata el 404 como lista vacía', async () => {
    await iniciarComo('jefe.operaciones')
    expect((await listarManiobrasDeSubfase(4)).map((maniobra) => maniobra.nombre)).toEqual(['Maniobra 7', 'Maniobra 8'])
    await expect(listarManiobrasDeSubfase(1)).resolves.toEqual([])
  })

  it('CA-TUR-08 trae el estado de cada aeronave', async () => {
    await iniciarComo('jefe.operaciones')
    expect(await listarAeronaves()).toEqual([
      { id: 1, nombre: 'Robinson R22', estado: 'Disponible' },
      { id: 2, nombre: 'Enstrom 280FX', estado: 'En_Mantenimiento' },
      { id: 3, nombre: 'Schweizer S-300C', estado: 'No_Disponible' },
    ])
  })

  it('lista los instructores del programa', async () => {
    await iniciarComo('jefe.operaciones')
    expect(await listarInstructores('PDI')).toEqual([
      { codigo: '444444', nombreCompleto: 'Juan Torres Perez' },
      { codigo: '888888', nombreCompleto: 'Maria Flores Mendoza' },
    ])
    await expect(listarInstructores('PDE')).resolves.toEqual([])
  })
})

describe('M1-9 selector de alumnos por rol', () => {
  it('elige la fuente según los permisos del rol', () => {
    expect(fuenteDeAlumnos(permisosDeRol('Administrador Web'))).toBe('todos')
    expect(fuenteDeAlumnos(permisosDeRol('Comandante de Escuadrón'))).toBe('todos')
    expect(fuenteDeAlumnos(permisosDeRol('Jefe de Operaciones'))).toBe('programacion')
    expect(fuenteDeAlumnos(permisosDeRol('Instructor'))).toBe('instructor')
    expect(fuenteDeAlumnos(permisosDeRol('Alumno'))).toBeNull()
  })

  it('Comandante y Administrador ven a los alumnos de todos los grupos', async () => {
    await iniciarComo('admin.sistema')
    const alumnos = await listarAlumnos('todos', 'PDI', null)
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '222222', '555555', '666666', '777777', '999999'])
    expect(alumnos[0]).toEqual({ codigo: '111111', nombreCompleto: 'Oscar Lopez Chaparro', grupo: 'Grupo 1' })
  })

  it('Jefe de Operaciones ve a los alumnos agrupados por grupo', async () => {
    await iniciarComo('jefe.operaciones')
    const alumnos = await listarAlumnos('programacion', 'PDI', null)
    expect(alumnos.find((alumno) => alumno.codigo === '666666')).toEqual({
      codigo: '666666',
      nombreCompleto: 'Ana Torres Martinez',
      grupo: 'Grupo 3',
    })
  })

  it('el Instructor ve a los alumnos de sus turnos', async () => {
    await iniciarComo('instructor.mendoza')
    const alumnos = await listarAlumnos('instructor', 'PDI', '888888')
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['777777', '999999'])
  })
})

describe('agruparPorGrupo', () => {
  it('agrupa las opciones por su grupo y deja aparte a los alumnos sin grupo', () => {
    expect(
      agruparPorGrupo([
        { codigo: '111111', nombreCompleto: 'Oscar Lopez Chaparro', grupo: 'Grupo 1' },
        { codigo: '555555', nombreCompleto: 'Pedro Rodriguez Garcia', grupo: 'Grupo 3' },
        { codigo: '666666', nombreCompleto: 'Ana Torres Martinez', grupo: 'Grupo 3' },
        { codigo: '123456', nombreCompleto: 'Sin Grupo Asignado', grupo: null },
      ]).map(([grupo, alumnos]) => [grupo, alumnos.map((alumno) => alumno.codigo)]),
    ).toEqual([
      ['Grupo 1', ['111111']],
      ['Grupo 3', ['555555', '666666']],
      ['Sin grupo', ['123456']],
    ])
  })
})
```

- [ ] **Step 5: Run the tests to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/catalogos
```

Expected: FAIL — `Failed to resolve import "./api"`.

- [ ] **Step 6: Implement the catalog queries**

`src/features/catalogos/api.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { sigeda } from '@/lib/api/sigeda'
import type { Permiso } from '@/lib/auth/permisos'

export const PROGRAMAS = ['PDI', 'PDE'] as const

export type Programa = (typeof PROGRAMAS)[number]

export type Subfase = { id: number; nombre: string; descripcion: string }

export type Maniobra = { id: number; nombre: string; descripcion: string }

export type Aeronave = { id: number; nombre: string; estado: string }

export type PersonaResumida = { codigo: string; nombreCompleto: string }

export type OpcionAlumno = PersonaResumida & { grupo: string | null }

export type FuenteAlumnos = 'todos' | 'programacion' | 'instructor'

type NombreAlumno = { codigo: string; nombre: string; aPaterno: string; aMaterno: string }

type AlumnoConGrupo = NombreAlumno & { idGrupo: number | null; estado: string }

type GrupoByPrograma = { id: number; nombre: string; programa: string; personas: NombreAlumno[] }

export function nombreCompleto(persona: Pick<NombreAlumno, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  return [persona.nombre, persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
}

export const clavesCatalogos = {
  todo: ['catalogos'] as const,
  subfases: () => [...clavesCatalogos.todo, 'subfases'] as const,
  maniobras: (idSubfase: number) => [...clavesCatalogos.todo, 'maniobras', idSubfase] as const,
  aeronaves: () => [...clavesCatalogos.todo, 'aeronaves'] as const,
  instructores: (programa: Programa) => [...clavesCatalogos.todo, 'instructores', programa] as const,
  alumnos: (fuente: FuenteAlumnos, programa: Programa, codPersona: string | null) =>
    [...clavesCatalogos.todo, 'alumnos', fuente, programa, codPersona] as const,
}

export async function listarSubfases(): Promise<Subfase[]> {
  const primera = await sigeda.pagina<Subfase>('/api/subfases', { page: 0, size: 10 })
  const restantes = await Promise.all(
    Array.from({ length: Math.max(primera.totalPages - 1, 0) }, (_, indice) =>
      sigeda.pagina<Subfase>('/api/subfases', { page: indice + 1, size: 10 }),
    ),
  )
  return [primera, ...restantes].flatMap((pagina) => pagina.items)
}

export function listarManiobrasDeSubfase(idSubfase: number): Promise<Maniobra[]> {
  return sigeda.lista<Maniobra>(`/api/maniobras/subfase/${idSubfase}`)
}

export async function listarAeronaves(): Promise<Aeronave[]> {
  const aeronaves = await sigeda.lista<Aeronave>('/api/aeronaves')
  return aeronaves.map(({ id, nombre, estado }) => ({ id, nombre, estado }))
}

export async function listarInstructores(programa: Programa): Promise<PersonaResumida[]> {
  const tipo = encodeURIComponent(`Instructor ${programa}`)
  const instructores = await sigeda.lista<NombreAlumno>(`/api/personas/instructor/${tipo}`)
  return instructores.map((persona) => ({ codigo: persona.codigo, nombreCompleto: nombreCompleto(persona) }))
}

export function fuenteDeAlumnos(permisos: ReadonlySet<Permiso>): FuenteAlumnos | null {
  if (permisos.has('View All Groups')) return 'todos'
  if (permisos.has('Manage Shifts')) return 'programacion'
  if (permisos.has('View My Group')) return 'instructor'
  return null
}

function aOpcion(persona: NombreAlumno, grupo: string | null): OpcionAlumno {
  return { codigo: persona.codigo, nombreCompleto: nombreCompleto(persona), grupo }
}

function sinRepetidos(opciones: OpcionAlumno[]): OpcionAlumno[] {
  const vistos = new Set<string>()
  return opciones.filter((opcion) => {
    if (vistos.has(opcion.codigo)) return false
    vistos.add(opcion.codigo)
    return true
  })
}

export async function listarAlumnos(
  fuente: FuenteAlumnos,
  programa: Programa,
  codPersona: string | null,
): Promise<OpcionAlumno[]> {
  if (fuente === 'programacion') {
    const grupos = await sigeda.lista<GrupoByPrograma>(`/api/alumnos/programa/${programa}`)
    return sinRepetidos(grupos.flatMap((grupo) => grupo.personas.map((persona) => aOpcion(persona, grupo.nombre))))
  }
  if (fuente === 'todos') {
    const pagina = await sigeda.pagina<{ personas: AlumnoConGrupo[] }>(`/api/grupos/programa/${programa}`, {
      page: 0,
      size: 100,
    })
    return sinRepetidos(
      pagina.items.flatMap((grupo) =>
        grupo.personas.map((persona) => aOpcion(persona, persona.idGrupo === null ? null : `Grupo ${persona.idGrupo}`)),
      ),
    )
  }
  if (!codPersona) return []
  const pagina = await sigeda.pagina<{ persona: AlumnoConGrupo[] | AlumnoConGrupo }>(
    `/api/grupos/instructor/${codPersona}/programa/${programa}`,
    { page: 0, size: 100 },
  )
  return sinRepetidos(
    pagina.items.flatMap((item) =>
      (Array.isArray(item.persona) ? item.persona : [item.persona]).map((persona) =>
        aOpcion(persona, persona.idGrupo === null ? null : `Grupo ${persona.idGrupo}`),
      ),
    ),
  )
}

export function agruparPorGrupo(alumnos: readonly OpcionAlumno[]): [string, OpcionAlumno[]][] {
  const grupos = new Map<string, OpcionAlumno[]>()
  for (const alumno of alumnos) {
    const grupo = alumno.grupo ?? 'Sin grupo'
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), alumno])
  }
  return [...grupos.entries()]
}

export const consultasCatalogos = {
  subfases: () => queryOptions({ queryKey: clavesCatalogos.subfases(), queryFn: listarSubfases, staleTime: 300_000 }),
  maniobras: (idSubfase: number) =>
    queryOptions({
      queryKey: clavesCatalogos.maniobras(idSubfase),
      queryFn: () => listarManiobrasDeSubfase(idSubfase),
      enabled: idSubfase > 0,
      staleTime: 300_000,
    }),
  aeronaves: () => queryOptions({ queryKey: clavesCatalogos.aeronaves(), queryFn: listarAeronaves }),
  instructores: (programa: Programa) =>
    queryOptions({
      queryKey: clavesCatalogos.instructores(programa),
      queryFn: () => listarInstructores(programa),
      staleTime: 300_000,
    }),
  alumnos: (fuente: FuenteAlumnos, programa: Programa, codPersona: string | null) =>
    queryOptions({
      queryKey: clavesCatalogos.alumnos(fuente, programa, codPersona),
      queryFn: () => listarAlumnos(fuente, programa, codPersona),
      staleTime: 300_000,
    }),
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/catalogos
```

Expected: PASS, 9 tests.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 154 tests (M0's auth and session tests still pass with the combined reset).

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add catalog mocks and role-based alumno pickers"
```

---

### Task 5: Turno contract mocks and turno API (M1-1)

**Files:**
- Create: `src/mocks/sigeda/turnos.ts`, `src/features/turnos/api.ts`
- Modify: `src/lib/api/pagina.ts` (append), `src/mocks/handlers.ts` (full rewrite)
- Test: `src/features/turnos/api.test.ts`

**Interfaces:**
- Consumes: `datos()`, `buscarPersona`, `nombreCorto`, types from `datos.ts`; `API`, `autorizar`, `errorResponse`, `paginar`, `textoNoEncontrado` (Task 4); `esFechaIso`, `esHora`, `esPosteriorAHoy`, `permiteCambios`, `seSuperponen`, `esNotaDirbe`, `NotaDirbe` (Task 3); `PROGRAMAS`, `Programa` (Task 4); `sigeda`, `Pagina`, `ApiError`, `MENSAJE_GENERICO` (M0).
- Produces:
  - `pagina.ts`: `type DireccionOrden = 'ASC' | 'DESC'`, `type ParametrosPagina = { page: number; size: number; property?: string; direction: DireccionOrden }`.
  - `handlersTurnos` (contract §1): `GET /api/turnos` (filters `programa`, `idSubfase`, `fechaPre`+`fechaPost`), `GET /api/turnos/alumno?codAlumno`, `GET /api/turnos/:fecha/aeronave/:id` (200 `[]` when free), `GET /api/turnos/:id` (`DetalleTurno`), `POST`/`PUT /api/turnos` (field errors as a raw 400 array including the dependency-15 overlap error `'alumnosTurno[i].codAlumno': El alumno <cod> tiene un horario que se cruza con otro turno de la aeronave.`; 404/400 `ErrorResponse` for subfase/aeronave; 201 `{ mensaje: 'Turno guardado con éxito.', turno: DetalleTurno }`), `DELETE /api/turnos/:id` (410 `ErrorResponse` when the date is not in the future; 200 text `Turno eliminado con éxito.`). `detalleTurno(turno)` exported for reuse.
  - `src/features/turnos/api.ts`: types `TurnoResumen`, `AlumnoDelTurno`, `ManiobraDelTurno = { notaMin: NotaDirbe; maniobra: { id; nombre; descripcion } }`, `AeronaveDelTurno`, `TurnoDetalle = { id; nombre; subfase; fase; fechaEval; programa; codInstructor: string | null; instructor: string | null; aeronave: AeronaveDelTurno | null; alumnos: AlumnoDelTurno[]; maniobras: ManiobraDelTurno[] }`, `OcupacionAeronave = { idTurno; nombre; horaInicio; horaFin }`, `FiltrosTurnos = ParametrosPagina & { programa: Programa; idSubfase?; desde?; hasta? }`, `CuerpoTurno` (request body with `aeronave: { id }`, `alumnosTurno[]`, `maniobrasTurno[{ idManiobra, nota_min }]`), `TurnoGuardado = { mensaje; id }`; `MENSAJE_TURNO_GUARDADO`, `MENSAJE_TURNO_ELIMINADO`; adapters `aTurnoResumen` (accepts `cantGrupo`), `aTurnoDetalle` (tolerates missing `alumnosTurno`/`aeronave`), `aTurnoGuardado` (201 `{mensaje, turno}` or 200 raw entity); `clavesTurnos.{todo, lista, delAlumno, detalle, ocupacion, dia}`; `listarTurnos`, `listarTurnosDelAlumno`, `obtenerTurno`, `listarOcupacionAeronave`, `listarTurnosDelDia(fecha)` (both programas, then each detail), `crearTurno`, `modificarTurno(id, cuerpo)` (never sends `programa`/`idSubfase`), `eliminarTurno(id): Promise<string>`; `consultasTurnos.{lista, delAlumno, detalle, ocupacion, dia}`; hooks `useGuardarTurno(id?)`, `useEliminarTurno()` (both invalidate `clavesTurnos.todo`).

- [ ] **Step 1: Add the page parameters type**

Append to `src/lib/api/pagina.ts`:

```ts

export type DireccionOrden = 'ASC' | 'DESC'

export type ParametrosPagina = { page: number; size: number; property?: string; direction: DireccionOrden }
```

- [ ] **Step 2: Write the turno handlers**

`src/mocks/sigeda/turnos.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { esFechaIso, esHora, esPosteriorAHoy } from '@/lib/dominio/calendario'
import { permiteCambios, seSuperponen } from '@/lib/dominio/turno'
import { API, autorizar, errorResponse, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, nombreCorto, type AlumnoTurnoMock, type ProgramaMock, type TurnoMock } from './datos'

type CuerpoTurno = {
  nombre?: unknown
  fechaEval?: unknown
  programa?: unknown
  idSubfase?: unknown
  codInstructor?: unknown
  aeronave?: { id?: unknown } | null
  alumnosTurno?: { codAlumno?: unknown; horaInicio?: unknown; horaFin?: unknown }[]
  maniobrasTurno?: { idManiobra?: unknown; nota_min?: unknown }[]
}

const MENSAJE_HORA = 'La hora debe estar en formato HH:mm (09:00, 14:00)'

function programaDeConsulta(valor: string | null): ProgramaMock {
  return (valor ?? 'pdi').toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function resumen(turno: TurnoMock) {
  return {
    id: turno.id,
    subfase: turno.subfase,
    nombre: turno.nombre,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    cantAlumno: turno.alumnos.length,
    cantManiobra: turno.maniobras.length,
  }
}

export function detalleTurno(turno: TurnoMock) {
  const instructor = turno.codInstructor ? buscarPersona(turno.codInstructor) : undefined
  const aeronave = datos().aeronaves.find((candidata) => candidata.id === turno.idAeronave)
  return {
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    fase: turno.fase,
    codInstructor: turno.codInstructor,
    instructor: instructor ? nombreCorto(instructor) : null,
    aeronave: aeronave ? { id: aeronave.id, nombre: aeronave.nombre, estado: aeronave.estado } : null,
    alumnosTurno: turno.alumnos.map((alumno) => {
      const persona = buscarPersona(alumno.codAlumno)
      return { ...alumno, alumno: persona ? nombreCorto(persona) : alumno.codAlumno }
    }),
    maniobrasTurno: turno.maniobras.map((item) => ({
      nota_min: item.notaMin,
      maniobra: datos().maniobras.find((maniobra) => maniobra.id === item.idManiobra) ?? {
        id: item.idManiobra,
        nombre: `Maniobra ${item.idManiobra}`,
        descripcion: '',
      },
    })),
  }
}

function filtrar(url: URL): TurnoMock[] {
  const programa = programaDeConsulta(url.searchParams.get('programa'))
  const idSubfase = Number(url.searchParams.get('idSubfase') ?? 0)
  const fechaPre = url.searchParams.get('fechaPre') ?? ''
  const fechaPost = url.searchParams.get('fechaPost') ?? ''
  const conFechas = esFechaIso(fechaPre) && esFechaIso(fechaPost)
  return datos().turnos.filter(
    (turno) =>
      turno.programa === programa &&
      (idSubfase === 0 || turno.idSubfase === idSubfase) &&
      (!conFechas || (turno.fechaEval >= fechaPre && turno.fechaEval <= fechaPost)),
  )
}

function validarCampos(cuerpo: CuerpoTurno, conProgramaYSubfase: boolean): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': no debe estar vacío")
  else if (nombre.length < 10 || nombre.length > 30) errores.push("'nombre': Nombre debe tener de 10 a 30 caracteres.")
  const fechaEval = texto(cuerpo.fechaEval)
  if (!esFechaIso(fechaEval)) errores.push("'fechaEval': Ingresar fecha válida.")
  else if (!esPosteriorAHoy(fechaEval)) errores.push("'fechaEval': La fecha del turno debe ser posterior a hoy.")
  if (conProgramaYSubfase) {
    if (cuerpo.programa !== 'PDI' && cuerpo.programa !== 'PDE') errores.push("'programa': Ingresar programa válido.")
    if (!(Number(cuerpo.idSubfase) > 0)) errores.push("'idSubfase': La subfase es requerida.")
  }
  if (texto(cuerpo.codInstructor).trim() === '') errores.push("'codInstructor': Instructor debe ser asignado.")
  if (!cuerpo.aeronave) errores.push("'aeronave': La asignación de aeronave es requerida.")
  const alumnos = cuerpo.alumnosTurno ?? []
  if (alumnos.length === 0) errores.push("'alumnosTurno': La asignación de alumnos es requerida")
  alumnos.forEach((alumno, indice) => {
    if (texto(alumno.codAlumno).length !== 6) errores.push(`'alumnosTurno[${indice}].codAlumno': Código de alumno es requerido.`)
    if (!esHora(texto(alumno.horaInicio))) errores.push(`'alumnosTurno[${indice}].horaInicio': ${MENSAJE_HORA}`)
    if (!esHora(texto(alumno.horaFin))) errores.push(`'alumnosTurno[${indice}].horaFin': ${MENSAJE_HORA}`)
  })
  const maniobras = cuerpo.maniobrasTurno ?? []
  if (maniobras.length === 0) errores.push("'maniobrasTurno': La asignación de maniobras es requerida")
  maniobras.forEach((maniobra, indice) => {
    if (!(Number(maniobra.idManiobra) > 0)) errores.push(`'maniobrasTurno[${indice}].idManiobra': La maniobra es requerida`)
    if (!/^(D|I|R|B|E)$/i.test(texto(maniobra.nota_min))) {
      errores.push(`'maniobrasTurno[${indice}].nota_min': Nota mínima debe utilizar sistema de calificación`)
    }
  })
  return errores
}

function erroresDeSolape(alumnos: AlumnoTurnoMock[], fechaEval: string, idAeronave: number, idPropio: number | null) {
  const ocupados = datos()
    .turnos.filter((turno) => turno.id !== idPropio && turno.fechaEval === fechaEval && turno.idAeronave === idAeronave)
    .flatMap((turno) => turno.alumnos)
  return alumnos
    .map((alumno, indice) =>
      ocupados.some((ocupado) => seSuperponen(alumno, ocupado))
        ? `'alumnosTurno[${indice}].codAlumno': El alumno ${alumno.codAlumno} tiene un horario que se cruza con otro turno de la aeronave.`
        : null,
    )
    .filter((mensaje): mensaje is string => mensaje !== null)
}

function aAlumnos(cuerpo: CuerpoTurno): AlumnoTurnoMock[] {
  return (cuerpo.alumnosTurno ?? []).map((alumno) => ({
    codAlumno: texto(alumno.codAlumno),
    horaInicio: texto(alumno.horaInicio),
    horaFin: texto(alumno.horaFin),
  }))
}

function guardado(turno: TurnoMock) {
  return HttpResponse.json({ mensaje: 'Turno guardado con éxito.', turno: detalleTurno(turno) }, { status: 201 })
}

function validarGuardado(cuerpo: CuerpoTurno, idSubfase: number | null, idPropio: number | null): Response | null {
  const errores = validarCampos(cuerpo, idPropio === null)
  if (idSubfase !== null && idSubfase > 0 && !datos().subfases.some((subfase) => subfase.id === idSubfase)) {
    return errorResponse(404, 'Recurso no encontrado', 'No existe información de subfase.')
  }
  if (cuerpo.aeronave) {
    const aeronave = datos().aeronaves.find((candidata) => candidata.id === Number(cuerpo.aeronave?.id))
    if (!aeronave) return errorResponse(404, 'Recurso no encontrado', 'No existe información de aeronave.')
    if (aeronave.estado !== 'Disponible') return errorResponse(400, 'Error al validar el modelo', 'Asignar aeronave disponible.')
    if (errores.length === 0) {
      errores.push(...erroresDeSolape(aAlumnos(cuerpo), texto(cuerpo.fechaEval), aeronave.id, idPropio))
    }
  }
  return errores.length > 0 ? HttpResponse.json(errores, { status: 400 }) : null
}

function aplicar(turno: TurnoMock, cuerpo: CuerpoTurno) {
  turno.nombre = texto(cuerpo.nombre)
  turno.fechaEval = texto(cuerpo.fechaEval)
  turno.codInstructor = texto(cuerpo.codInstructor)
  turno.idAeronave = Number(cuerpo.aeronave?.id)
  turno.alumnos = aAlumnos(cuerpo)
  turno.maniobras = (cuerpo.maniobrasTurno ?? []).map((maniobra) => ({
    idManiobra: Number(maniobra.idManiobra),
    notaMin: texto(maniobra.nota_min).toUpperCase(),
  }))
}

function turnoVencido() {
  return errorResponse(410, 'Fecha de modificación expiró', 'No se puede modificar. El turno ya ha sido evaluado.')
}

export const handlersTurnos = [
  http.get(`${API}/api/turnos`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    return paginar(filtrar(url), url, {
      nombreLista: 'turnos',
      propiedadPorDefecto: 'id',
      proyectar: resumen,
    })
  }),
  http.get(`${API}/api/turnos/alumno`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const codAlumno = url.searchParams.get('codAlumno') ?? '000000'
    const turnos = datos().turnos.filter((turno) => turno.alumnos.some((alumno) => alumno.codAlumno === codAlumno))
    return paginar(turnos, url, { nombreLista: 'turnos', propiedadPorDefecto: 'id', proyectar: resumen })
  }),
  http.get(`${API}/api/turnos/:fecha/aeronave/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const aeronave = datos().aeronaves.find((candidata) => candidata.id === Number(params.id))
    const ocupaciones = datos()
      .turnos.filter(
        (turno) =>
          turno.fechaEval === String(params.fecha) && turno.idAeronave === Number(params.id) && turno.alumnos.length > 0,
      )
      .map((turno) => ({
        id: turno.id,
        nombre: turno.nombre,
        fechaEval: turno.fechaEval,
        horaInicio: turno.alumnos.map((alumno) => alumno.horaInicio).sort()[0],
        horaFin: turno.alumnos.map((alumno) => alumno.horaFin).sort().at(-1),
        aeronave: aeronave ? { id: aeronave.id, nombre: aeronave.nombre } : null,
      }))
    return HttpResponse.json(ocupaciones)
  }),
  http.get(`${API}/api/turnos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const turno = datos().turnos.find((candidato) => candidato.id === Number(params.id))
    if (!turno) return textoNoEncontrado('Turno especificada no existe.')
    return HttpResponse.json(detalleTurno(turno))
  }),
  http.post(`${API}/api/turnos`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoTurno
    const idSubfase = Number(cuerpo.idSubfase)
    const rechazo = validarGuardado(cuerpo, idSubfase, null)
    if (rechazo) return rechazo
    const subfase = datos().subfases.find((candidata) => candidata.id === idSubfase)
    const turno: TurnoMock = {
      id: datos().siguienteIdTurno,
      nombre: '',
      fechaEval: '',
      programa: cuerpo.programa === 'PDE' ? 'PDE' : 'PDI',
      idSubfase,
      subfase: subfase?.nombre ?? '',
      fase: subfase?.fase ?? '',
      codInstructor: null,
      idAeronave: null,
      alumnos: [],
      maniobras: [],
    }
    aplicar(turno, cuerpo)
    datos().siguienteIdTurno += 1
    datos().turnos.push(turno)
    return guardado(turno)
  }),
  http.put(`${API}/api/turnos/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const turno = datos().turnos.find((candidato) => candidato.id === Number(params.id))
    if (!turno) return errorResponse(404, 'Recurso no encontrado', 'No existe información de turno.')
    if (!permiteCambios(turno.fechaEval)) return turnoVencido()
    const cuerpo = (await request.json()) as CuerpoTurno
    const rechazo = validarGuardado(cuerpo, null, turno.id)
    if (rechazo) return rechazo
    aplicar(turno, cuerpo)
    return guardado(turno)
  }),
  http.delete(`${API}/api/turnos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const turno = datos().turnos.find((candidato) => candidato.id === Number(params.id))
    if (!turno) return errorResponse(404, 'Recurso no encontrado', 'No existe información de turno.')
    if (!permiteCambios(turno.fechaEval)) return turnoVencido()
    datos().turnos = datos().turnos.filter((candidato) => candidato.id !== turno.id)
    return HttpResponse.text('Turno eliminado con éxito.')
  }),
]
```

Replace `src/mocks/handlers.ts` with:

```ts
import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersTurnos } from './sigeda/turnos'

export const handlers: RequestHandler[] = [...handlersAuth, ...handlersCatalogos, ...handlersTurnos]
```

- [ ] **Step 3: Write the failing tests**

`src/features/turnos/api.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import {
  aTurnoDetalle,
  aTurnoResumen,
  crearTurno,
  eliminarTurno,
  listarOcupacionAeronave,
  listarTurnos,
  listarTurnosDelAlumno,
  modificarTurno,
  obtenerTurno,
  type CuerpoTurno,
} from './api'

const API = config.sigedaApiUrl
const EN_UNA_SEMANA = sumarDias(hoyIso(), 7)
const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }

function cuerpoValido(cambios: Partial<CuerpoTurno> = {}): CuerpoTurno {
  return {
    nombre: 'Navegación Diurna',
    fechaEval: sumarDias(hoyIso(), 10),
    programa: 'PDI',
    idSubfase: 2,
    codInstructor: '444444',
    aeronave: { id: 1 },
    alumnosTurno: [{ codAlumno: '222222', horaInicio: '08:00', horaFin: '09:30' }],
    maniobrasTurno: [{ idManiobra: 1, nota_min: 'B' }],
    ...cambios,
  }
}

describe('api de turnos', () => {
  it('CA-TUR-01 filtra por programa, sub fase y rango de fechas', async () => {
    await iniciarComo('jefe.operaciones')
    const porSubfase = await listarTurnos({ ...PAGINA, programa: 'PDI', idSubfase: 4 })
    expect(porSubfase.items).toEqual([
      {
        id: 6,
        nombre: 'Campos Tácticos',
        subfase: 'Campos Extraños',
        fechaEval: '2024-04-05',
        programa: 'PDI',
        cantAlumno: 1,
        cantManiobra: 2,
      },
    ])
    const porFechas = await listarTurnos({ ...PAGINA, programa: 'PDI', desde: '2024-03-01', hasta: '2024-03-15' })
    expect(porFechas.items.map((turno) => turno.id)).toEqual([1, 2, 3])
    await expect(listarTurnos({ ...PAGINA, programa: 'PDE' })).resolves.toMatchObject({ items: [], total: 0 })
  })

  it('pagina y ordena en el servidor', async () => {
    await iniciarComo('jefe.operaciones')
    const pagina = await listarTurnos({ page: 1, size: 6, direction: 'DESC', property: 'id', programa: 'PDI' })
    expect(pagina).toMatchObject({ page: 1, size: 6, total: 9, totalPages: 2 })
    expect(pagina.items.map((turno) => turno.id)).toEqual([3, 2, 1])
  })

  it('CA-TUR-14 lista solo los turnos del alumno', async () => {
    await iniciarComo('alumno.lopez')
    const pagina = await listarTurnosDelAlumno('111111', PAGINA)
    expect(pagina.items.map((turno) => turno.id)).toEqual([1, 8])
  })

  it('CA-TUR-10 trae el detalle con instructor, aeronave, horarios y notas mínimas', async () => {
    await iniciarComo('jefe.operaciones')
    const turno = await obtenerTurno(8)
    expect(turno).toMatchObject({
      nombre: 'Navegación Nocturna',
      fase: 'Adaptación',
      codInstructor: '444444',
      instructor: 'Juan Torres',
      aeronave: { id: 1, nombre: 'Robinson R22', estado: 'Disponible' },
      alumnos: [
        { codAlumno: '111111', alumno: 'Oscar Lopez', horaInicio: '09:00', horaFin: '10:30' },
        { codAlumno: '666666', alumno: 'Ana Torres', horaInicio: '11:00', horaFin: '12:30' },
      ],
    })
    expect(turno.maniobras.map((item) => [item.maniobra.nombre, item.notaMin])).toEqual([
      ['Maniobra 1', 'R'],
      ['Maniobra 2', 'B'],
      ['Maniobra 3', 'E'],
      ['Maniobra 4', 'I'],
    ])
  })

  it('tolera la forma actual del backend en la lista y en el detalle', () => {
    expect(
      aTurnoResumen({ id: 1, nombre: 'Contacto Básico', subfase: 'Contacto', fechaEval: '2024-03-01', programa: 'PDI', cantGrupo: 2, cantManiobra: 6 })
        .cantAlumno,
    ).toBe(2)
    expect(
      aTurnoDetalle({ id: 1, nombre: 'Contacto Básico', subfase: 'Contacto', fechaEval: '2024-03-01', programa: 'PDI' }),
    ).toMatchObject({ alumnos: [], maniobras: [], aeronave: null, codInstructor: null })
  })

  it('CA-TUR-07 informa los horarios ocupados de la aeronave ese día', async () => {
    await iniciarComo('jefe.operaciones')
    expect(await listarOcupacionAeronave(EN_UNA_SEMANA, 1)).toEqual([
      { idTurno: 8, nombre: 'Navegación Nocturna', horaInicio: '09:00', horaFin: '12:30' },
      { idTurno: 9, nombre: 'Instrumentos Básicos', horaInicio: '07:30', horaFin: '08:30' },
    ])
    await expect(listarOcupacionAeronave(EN_UNA_SEMANA, 2)).resolves.toEqual([])
  })

  it('M1-1 registra un turno y entiende la respuesta 201 del contrato', async () => {
    await iniciarComo('jefe.operaciones')
    await expect(crearTurno(cuerpoValido())).resolves.toEqual({ mensaje: 'Turno guardado con éxito.', id: 10 })
    await expect(obtenerTurno(10)).resolves.toMatchObject({ nombre: 'Navegación Diurna', subfase: 'Navegación' })
  })

  it('M1-1 tolera la respuesta 200 con la entidad cruda del backend actual', async () => {
    server.use(http.post(`${API}/api/turnos`, () => HttpResponse.json({ id: 42, nombre: 'Navegación Diurna', cantAlumno: 1 })))
    await iniciarComo('jefe.operaciones')
    await expect(crearTurno(cuerpoValido())).resolves.toEqual({ mensaje: 'Turno guardado con éxito.', id: 42 })
  })

  it('modificar no envía programa ni sub fase', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${API}/api/turnos/:id`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ mensaje: 'Turno guardado con éxito.', turno: { id: 8 } }, { status: 201 })
      }),
    )
    await iniciarComo('jefe.operaciones')
    await modificarTurno(8, cuerpoValido())
    expect(recibido).not.toHaveProperty('programa')
    expect(recibido).not.toHaveProperty('idSubfase')
    expect(recibido).toMatchObject({ nombre: 'Navegación Diurna', aeronave: { id: 1 } })
  })

  it('CA-TUR-11 el backend rechaza eliminar un turno cuya fecha pasó', async () => {
    await iniciarComo('jefe.operaciones')
    await expect(eliminarTurno(1)).rejects.toMatchObject({
      status: 410,
      message: 'No se puede modificar. El turno ya ha sido evaluado.',
    })
    await expect(eliminarTurno(8)).resolves.toBe('Turno eliminado con éxito.')
  })
})
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos
```

Expected: FAIL — `Failed to resolve import "./api"`.

- [ ] **Step 5: Implement the turno API**

`src/features/turnos/api.ts`:

```ts
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import { esFechaIso } from '@/lib/dominio/calendario'
import { esNotaDirbe, type NotaDirbe } from '@/lib/dominio/dirbe'

export type TurnoResumen = {
  id: number
  nombre: string
  subfase: string
  fechaEval: string
  programa: string
  cantAlumno: number
  cantManiobra: number
}

export type AlumnoDelTurno = { codAlumno: string; alumno: string; horaInicio: string; horaFin: string }

export type ManiobraDelTurno = { notaMin: NotaDirbe; maniobra: { id: number; nombre: string; descripcion: string } }

export type AeronaveDelTurno = { id: number; nombre: string; estado: string }

export type TurnoDetalle = {
  id: number
  nombre: string
  subfase: string
  fase: string
  fechaEval: string
  programa: string
  codInstructor: string | null
  instructor: string | null
  aeronave: AeronaveDelTurno | null
  alumnos: AlumnoDelTurno[]
  maniobras: ManiobraDelTurno[]
}

export type OcupacionAeronave = { idTurno: number; nombre: string; horaInicio: string; horaFin: string }

export type FiltrosTurnos = ParametrosPagina & { programa: Programa; idSubfase?: number; desde?: string; hasta?: string }

export type CuerpoTurno = {
  nombre: string
  fechaEval: string
  programa?: Programa
  idSubfase?: number
  codInstructor: string
  aeronave: { id: number }
  alumnosTurno: { codAlumno: string; horaInicio: string; horaFin: string }[]
  maniobrasTurno: { idManiobra: number; nota_min: NotaDirbe }[]
}

export type TurnoGuardado = { mensaje: string; id: number }

type TurnoRealizadoApi = Omit<TurnoResumen, 'cantAlumno'> & { cantAlumno?: number; cantGrupo?: number }

type DetalleTurnoApi = {
  id: number
  nombre: string
  subfase: string
  fechaEval: string
  programa: string
  fase?: string | null
  codInstructor?: string | null
  instructor?: string | null
  aeronave?: { id: number; nombre: string; estado?: string | null } | null
  alumnosTurno?: { codAlumno: string; alumno?: string | null; horaInicio: string; horaFin: string }[] | null
  maniobrasTurno?: { nota_min: string; maniobra: { id: number; nombre: string; descripcion?: string | null } }[] | null
}

type OcupacionApi = { id: number; nombre: string; horaInicio: string | null; horaFin: string | null }

export const MENSAJE_TURNO_GUARDADO = 'Turno guardado con éxito.'
export const MENSAJE_TURNO_ELIMINADO = 'Turno eliminado con éxito.'

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

export function aTurnoResumen(turno: TurnoRealizadoApi): TurnoResumen {
  return {
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    cantAlumno: turno.cantAlumno ?? turno.cantGrupo ?? 0,
    cantManiobra: turno.cantManiobra,
  }
}

export function aTurnoDetalle(turno: DetalleTurnoApi): TurnoDetalle {
  return {
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    fase: turno.fase ?? '',
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    codInstructor: turno.codInstructor ?? null,
    instructor: turno.instructor ?? null,
    aeronave: turno.aeronave
      ? { id: turno.aeronave.id, nombre: turno.aeronave.nombre, estado: turno.aeronave.estado ?? 'Desconocido' }
      : null,
    alumnos: (turno.alumnosTurno ?? []).map((alumno) => ({
      codAlumno: alumno.codAlumno,
      alumno: alumno.alumno ?? alumno.codAlumno,
      horaInicio: alumno.horaInicio,
      horaFin: alumno.horaFin,
    })),
    maniobras: (turno.maniobrasTurno ?? []).flatMap((item) => {
      const notaMin = item.nota_min.toUpperCase()
      if (!esNotaDirbe(notaMin)) return []
      return [
        {
          notaMin,
          maniobra: { id: item.maniobra.id, nombre: item.maniobra.nombre, descripcion: item.maniobra.descripcion ?? '' },
        },
      ]
    }),
  }
}

export function aTurnoGuardado(respuesta: unknown): TurnoGuardado {
  if (esRegistro(respuesta)) {
    const turno = respuesta.turno
    if (typeof respuesta.mensaje === 'string' && esRegistro(turno) && typeof turno.id === 'number') {
      return { mensaje: respuesta.mensaje, id: turno.id }
    }
    if (typeof respuesta.id === 'number') return { mensaje: MENSAJE_TURNO_GUARDADO, id: respuesta.id }
  }
  throw new ApiError(500, MENSAJE_GENERICO)
}

export const clavesTurnos = {
  todo: ['turnos'] as const,
  lista: (filtros: FiltrosTurnos) => [...clavesTurnos.todo, 'lista', filtros] as const,
  delAlumno: (codAlumno: string, parametros: ParametrosPagina) =>
    [...clavesTurnos.todo, 'alumno', codAlumno, parametros] as const,
  detalle: (id: number) => [...clavesTurnos.todo, 'detalle', id] as const,
  ocupacion: (fecha: string, idAeronave: number) => [...clavesTurnos.todo, 'ocupacion', fecha, idAeronave] as const,
  dia: (fecha: string) => [...clavesTurnos.todo, 'dia', fecha] as const,
}

export async function listarTurnos(filtros: FiltrosTurnos): Promise<Pagina<TurnoResumen>> {
  const pagina = await sigeda.pagina<TurnoRealizadoApi>('/api/turnos', {
    programa: filtros.programa,
    idSubfase: filtros.idSubfase,
    fechaPre: filtros.desde,
    fechaPost: filtros.hasta,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
  return { ...pagina, items: pagina.items.map(aTurnoResumen) }
}

export async function listarTurnosDelAlumno(
  codAlumno: string,
  parametros: ParametrosPagina,
): Promise<Pagina<TurnoResumen>> {
  const pagina = await sigeda.pagina<TurnoRealizadoApi>('/api/turnos/alumno', { codAlumno, ...parametros })
  return { ...pagina, items: pagina.items.map(aTurnoResumen) }
}

export async function obtenerTurno(id: number): Promise<TurnoDetalle> {
  return aTurnoDetalle(await sigeda.get<DetalleTurnoApi>(`/api/turnos/${id}`))
}

export async function listarOcupacionAeronave(fecha: string, idAeronave: number): Promise<OcupacionAeronave[]> {
  const ocupaciones = await sigeda.lista<OcupacionApi>(`/api/turnos/${fecha}/aeronave/${idAeronave}`)
  return ocupaciones.flatMap((ocupacion) =>
    ocupacion.horaInicio && ocupacion.horaFin
      ? [{ idTurno: ocupacion.id, nombre: ocupacion.nombre, horaInicio: ocupacion.horaInicio, horaFin: ocupacion.horaFin }]
      : [],
  )
}

export async function listarTurnosDelDia(fecha: string): Promise<TurnoDetalle[]> {
  const paginas = await Promise.all(
    PROGRAMAS.map((programa) =>
      sigeda.pagina<TurnoRealizadoApi>('/api/turnos', { programa, fechaPre: fecha, fechaPost: fecha, page: 0, size: 100 }),
    ),
  )
  const ids = paginas.flatMap((pagina) => pagina.items.map((turno) => turno.id))
  return Promise.all(ids.map(obtenerTurno))
}

export async function crearTurno(cuerpo: CuerpoTurno): Promise<TurnoGuardado> {
  return aTurnoGuardado(await sigeda.post<unknown>('/api/turnos', cuerpo))
}

export async function modificarTurno(id: number, cuerpo: CuerpoTurno): Promise<TurnoGuardado> {
  const { nombre, fechaEval, codInstructor, aeronave, alumnosTurno, maniobrasTurno } = cuerpo
  return aTurnoGuardado(
    await sigeda.put<unknown>(`/api/turnos/${id}`, {
      nombre,
      fechaEval,
      codInstructor,
      aeronave,
      alumnosTurno,
      maniobrasTurno,
    }),
  )
}

export async function eliminarTurno(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/turnos/${id}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_TURNO_ELIMINADO
}

export const consultasTurnos = {
  lista: (filtros: FiltrosTurnos) =>
    queryOptions({
      queryKey: clavesTurnos.lista(filtros),
      queryFn: () => listarTurnos(filtros),
      placeholderData: keepPreviousData,
    }),
  delAlumno: (codAlumno: string, parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesTurnos.delAlumno(codAlumno, parametros),
      queryFn: () => listarTurnosDelAlumno(codAlumno, parametros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) => queryOptions({ queryKey: clavesTurnos.detalle(id), queryFn: () => obtenerTurno(id) }),
  ocupacion: (fecha: string, idAeronave: number) =>
    queryOptions({
      queryKey: clavesTurnos.ocupacion(fecha, idAeronave),
      queryFn: () => listarOcupacionAeronave(fecha, idAeronave),
      enabled: esFechaIso(fecha) && idAeronave > 0,
    }),
  dia: (fecha: string) => queryOptions({ queryKey: clavesTurnos.dia(fecha), queryFn: () => listarTurnosDelDia(fecha) }),
}

export function useGuardarTurno(id?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: CuerpoTurno) => (id === undefined ? crearTurno(cuerpo) : modificarTurno(id, cuerpo)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesTurnos.todo }),
  })
}

export function useEliminarTurno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: eliminarTurno,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesTurnos.todo }),
  })
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos
```

Expected: PASS, 10 tests.

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 164 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add turno api over the contract mocks"
```

---

### Task 6: Evaluation contract mocks and evaluation API (M1-3, M1-8)

**Files:**
- Create: `src/mocks/sigeda/evaluaciones.ts`, `src/features/evaluaciones/api.ts`
- Modify: `src/mocks/handlers.ts` (full rewrite)
- Test: `src/features/evaluaciones/api.test.ts`

**Interfaces:**
- Consumes: mock store and helpers (Task 4); `esBajoEstandar`, `hoyIso`, `categoriaDesde`, `esCategoria`, `Categoria`, `esNotaDirbe`, `NotaDirbe`, `perteneceAlTurno`, `ultimaEvaluacion` (Task 3); `Clasificacion` (M0 vocabulario); `clavesTurnos` (Task 5); `Programa` (Task 4); `ParametrosPagina` (Task 5).
- Produces:
  - `handlersEvaluaciones` (contract §2, rule order of §2.6/§2.7): `GET /api/evaluaciones/filter/persona/:cod` (`idSubfase`, `nombre` = programa, `clasificacion`), `GET /api/evaluaciones/persona/:cod?idTurno` (`codigo LIKE cod-idTurno%`), `GET /api/evaluaciones/:cod`, `POST /api/evaluaciones/turno/:id/persona/:cod` (Write; 400 field array → 403 `{mensaje}` instructor rule (dep. 14) → 400 evaluator required → 403 already registered → 404 alumno → 400 estado → 400 count → 400 `{mensaje: [...]}` DIRBE → 400 array below-standard (dep. 13) → 201 `{ mensaje, 'evaluación' }` with `CalculoNota`), `PUT /api/evaluaciones/:cod` and `DELETE /api/evaluaciones/:cod` (Modify Evaluations; 403 `{mensaje: 'Solo se puede modificar la ultima evaluación realiza por el alumno.'}` unless it is the alumno's latest).
  - `src/features/evaluaciones/api.ts`: types `EvaluacionResumen` (`promedio: number | null`), `CalificacionDetalle = { idManiobra; maniobra; notaMin: NotaDirbe; nota; causa; observacion; recomendacion }`, `EvaluacionDetalle` (with `categoria: Categoria | null`, `categoriaTexto` and `promedio: number | null`), `FiltrosEvaluaciones = ParametrosPagina & { programa; idSubfase?; clasificacion? }`, `CuerpoEvaluacion = { nombre; categoria: Categoria; recomendacion: string | null; url: string | null; codEvaluador: string | null; calificaciones: { idManiobra; nota: NotaDirbe; causa; observacion; recomendacion }[] }`, `EvaluacionGuardada = { mensaje; codigo; promedio: number | null; clasificacion: string | null }`; `MENSAJE_EVALUACION_GUARDADA`, `MENSAJE_EVALUACION_ELIMINADA`; adapters `aNota(valor: unknown): number | null` (the backend sends `promedio` as a string such as `"14.0"`; the UI works with numbers and formats them with M0's `formatearNota(nota: number | null | undefined)`), `aEvaluacionResumen`, `aEvaluacionDetalle`, `aEvaluacionGuardada` (key `evaluación` or `evaluacion`, or a raw entity); `clavesEvaluaciones.{todo, lista, delTurno, ultima, detalle, sugerencias}`; `listarEvaluaciones(codPersona, filtros)`, `listarEvaluacionesDelTurno(codPersona, idTurno)` (exact turno match), `obtenerUltimaEvaluacion(codPersona, programa): Promise<string | null>`, `obtenerEvaluacion(codigo)`, `sugerirCategorias(codPersona): Promise<Categoria[]>`, `registrarEvaluacion(idTurno, codPersona, cuerpo)`, `modificarEvaluacion(codigo, cuerpo)`, `eliminarEvaluacion(codigo): Promise<string>`; `consultasEvaluaciones.{lista, delTurno, ultima, detalle, sugerencias}`; hooks `useRegistrarEvaluacion(idTurno, codPersona)`, `useModificarEvaluacion(codigo)`, `useEliminarEvaluacion()` (all invalidate `clavesEvaluaciones.todo` and `clavesTurnos.todo`).

- [ ] **Step 1: Write the evaluation handlers**

`src/mocks/sigeda/evaluaciones.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { hoyIso } from '@/lib/dominio/calendario'
import { esBajoEstandar } from '@/lib/dominio/dirbe'
import { API, autorizar, paginar, textoNoEncontrado } from './comun'
import {
  buscarPersona,
  datos,
  nombreCorto,
  type CalificacionMock,
  type EvaluacionMock,
  type ProgramaMock,
} from './datos'

type CalificacionEntrante = {
  idManiobra?: unknown
  nota?: unknown
  causa?: unknown
  observacion?: unknown
  recomendacion?: unknown
}

type CuerpoEvaluacion = {
  nombre?: unknown
  categoria?: unknown
  recomendacion?: unknown
  url?: unknown
  codEvaluador?: unknown
  calificaciones?: CalificacionEntrante[] | null
}

const CATEGORIAS: Record<string, string> = {
  Ponderada: 'Ponderada',
  Chequeo: 'Chequeo',
  chequeoSubFase: 'Chequeo Sub Fase',
  Complementacion: 'Complementación',
}

const CLASIFICACIONES = ['Malo', 'Regular', 'Bueno', 'Excelente']
const INVALIDAS = new Set(['ID', 'IB', 'IE', 'RD', 'RE', 'BD', 'ED'])
const MENSAJE_ULTIMA = 'Solo se puede modificar la ultima evaluación realiza por el alumno.'

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function opcional(valor: unknown): string | null {
  const limpio = texto(valor).trim()
  return limpio === '' ? null : limpio
}

function mensaje(status: number, contenido: string | string[]) {
  return HttpResponse.json({ mensaje: contenido }, { status })
}

function resumen(evaluacion: EvaluacionMock) {
  return {
    codigo: evaluacion.codigo,
    nombre: evaluacion.nombre,
    fase: evaluacion.fase,
    evaluador: evaluacion.evaluador,
    fecha: evaluacion.fecha,
    alumno: evaluacion.alumno,
    promedio: evaluacion.promedio,
    clasificacion: evaluacion.clasificacion,
  }
}

function esProgramada(categoria: string) {
  return categoria === 'Ponderada' || categoria === 'chequeoSubFase'
}

function validarCampos(cuerpo: CuerpoEvaluacion): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': Ingresar nombre de evaluación.")
  else if (nombre.length < 10 || nombre.length > 30) errores.push("'nombre': Nombre debe tener de 10 a 30 caracteres.")
  if (!(texto(cuerpo.categoria) in CATEGORIAS)) errores.push("'categoria': Ingresar categoria válida.")
  if (texto(cuerpo.recomendacion).length > 250) {
    errores.push("'recomendacion': Recomendación debe tener un máximo de 250 caracteres.")
  }
  if (!Array.isArray(cuerpo.calificaciones)) errores.push("'calificaciones': Las calificaciones son requeridas")
  for (const [indice, calificacion] of (cuerpo.calificaciones ?? []).entries()) {
    if (!(Number(calificacion.idManiobra) > 0)) errores.push(`'calificaciones[${indice}].idManiobra': La maniobra es requerida`)
    if (texto(calificacion.nota).trim() === '') {
      errores.push(`'calificaciones[${indice}].nota': Ingresar calificación de maniobra.`)
    }
    for (const [campo, etiqueta] of [
      ['causa', 'Causa'],
      ['observacion', 'Observación'],
      ['recomendacion', 'Recomendación'],
    ] as const) {
      if (texto(calificacion[campo]).length > 250) {
        errores.push(`'calificaciones[${indice}].${campo}': ${etiqueta} debe tener un máximo de 250 caracteres.`)
      }
    }
  }
  return errores
}

function comprobarEstado(categoria: string, estado: string): string | null {
  const apto = estado === 'Apto' || estado === 'En Observación'
  if (categoria === 'Ponderada' && !apto) return 'El alumno debe ser apto para realizar evaluaciones ponderadas.'
  if (categoria === 'Chequeo' && estado !== 'En Chequeo' && estado !== 'En Final') return 'El alumno no se encuentra en chequeo.'
  if (categoria === 'chequeoSubFase' && !apto) return 'El alumno debe ser apto para realizar el chequeo de subfase.'
  if (categoria === 'Complementacion' && !apto && estado !== 'En Complementación') {
    return 'El alumno debe ser apto o realizar complementaciones de subfase.'
  }
  return null
}

function erroresDeNotas(pares: { idManiobra: number; notaMin: string; nota: string }[]): string[] {
  const noDirbe = pares.filter((par) => !/^[DIRBE]$/.test(par.nota)).map((par) => par.idManiobra)
  const incorrectas = pares.filter((par) => INVALIDAS.has(`${par.notaMin}${par.nota}`)).map((par) => par.idManiobra)
  const mensajes: string[] = []
  if (noDirbe.length > 0) mensajes.push(`Las notas con id: ${noDirbe.join(' ')} no utilizan el sistema de calificación.`)
  if (incorrectas.length > 0) mensajes.push(`La nota de las maniobras con id: ${incorrectas.join(' ')} no son correctas.`)
  return mensajes
}

function erroresBajoEstandar(cuerpo: CuerpoEvaluacion, notasMinimas: string[]): string[] {
  return (cuerpo.calificaciones ?? []).flatMap((calificacion, indice) => {
    if (!esBajoEstandar(notasMinimas[indice] ?? '', texto(calificacion.nota).toUpperCase())) return []
    const faltantes: string[] = []
    if (texto(calificacion.causa).trim() === '') {
      faltantes.push(`'calificaciones[${indice}].causa': La causa es requerida para calificaciones bajo el estándar.`)
    }
    if (texto(calificacion.observacion).trim() === '') {
      faltantes.push(
        `'calificaciones[${indice}].observacion': La observación es requerida para calificaciones bajo el estándar.`,
      )
    }
    if (texto(calificacion.recomendacion).trim() === '') {
      faltantes.push(
        `'calificaciones[${indice}].recomendacion': La recomendación es requerida para calificaciones bajo el estándar.`,
      )
    }
    return faltantes
  })
}

function calcular(categoria: string, pares: string[]): { clasificacion: string; promedio: string | null } {
  const bajas = pares.some((par) => esBajoEstandar(par[0] ?? '', par[1] ?? ''))
  if (!esProgramada(categoria)) return { clasificacion: bajas ? 'Malo' : 'Bueno', promedio: null }
  const cuenta = (valores: string[]) => pares.filter((par) => valores.includes(par)).length
  const subI = cuenta(['RI', 'BI'])
  const subR = cuenta(['BR'])
  const postR = cuenta(['IR'])
  const postB = cuenta(['RB'])
  const postE = cuenta(['BE'])
  let clasificacion = 'Bueno'
  if (subI > 0 || subR >= 5) clasificacion = 'Malo'
  else if (subR === 4) clasificacion = 'Regular'
  else if (subR >= 1) clasificacion = 'Bueno'
  else if (postE >= 5) clasificacion = 'Excelente'
  const base = { Malo: 12, Regular: 15, Bueno: 17, Excelente: 20 }[clasificacion] ?? 12
  const total = clasificacion === 'Malo' ? base : base - 0.5 * subR + 0.6 * (postR + postB)
  const todasD = pares.every((par) => par === 'DD')
  return { clasificacion, promedio: todasD || total > 20 ? '20.0' : total.toFixed(1) }
}

function calificacionesDesde(
  codigo: string,
  cuerpo: CuerpoEvaluacion,
  notasMinimas: string[],
  idsManiobra: number[],
): CalificacionMock[] {
  return (cuerpo.calificaciones ?? []).map((calificacion, indice) => {
    const idManiobra = idsManiobra[indice] ?? Number(calificacion.idManiobra)
    const notaMin = notasMinimas[indice] ?? ''
    return {
      codEvaluacion: codigo,
      idManiobra,
      notaMin,
      nota: notaMin === 'D' ? 'D' : texto(calificacion.nota).toUpperCase(),
      causa: opcional(calificacion.causa),
      observacion: opcional(calificacion.observacion),
      recomendacion: opcional(calificacion.recomendacion),
      maniobra: datos().maniobras.find((maniobra) => maniobra.id === idManiobra) ?? {
        id: idManiobra,
        nombre: `Maniobra ${idManiobra}`,
        descripcion: '',
      },
    }
  })
}

function guardada(evaluacion: EvaluacionMock, codEvaluador: string | null) {
  return HttpResponse.json(
    { mensaje: 'Evaluación guardada con éxito.', 'evaluación': { ...evaluacion, codEvaluador } },
    { status: 201 },
  )
}

export const handlersEvaluaciones = [
  http.get(`${API}/api/evaluaciones/filter/persona/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const programa: ProgramaMock = (url.searchParams.get('nombre') ?? 'pdi').toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
    const idSubfase = Number(url.searchParams.get('idSubfase') ?? 0)
    const clasificacion = url.searchParams.get('clasificacion') ?? ''
    const filtradas = datos().evaluaciones.filter(
      (evaluacion) =>
        evaluacion.codPersona === String(params.cod) &&
        evaluacion.programa === programa &&
        (idSubfase === 0 || evaluacion.idSubFase === idSubfase) &&
        (!CLASIFICACIONES.includes(clasificacion) || evaluacion.clasificacion === clasificacion),
    )
    return paginar(filtradas, url, { nombreLista: 'evaluaciones', propiedadPorDefecto: 'codigo', proyectar: resumen })
  }),
  http.get(`${API}/api/evaluaciones/persona/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const prefijo = `${String(params.cod)}-${url.searchParams.get('idTurno') ?? '0'}`
    const filtradas = datos().evaluaciones.filter((evaluacion) => evaluacion.codigo.startsWith(prefijo))
    return paginar(filtradas, url, { nombreLista: 'evaluaciones', propiedadPorDefecto: 'codigo', proyectar: resumen })
  }),
  http.get(`${API}/api/evaluaciones/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const evaluacion = datos().evaluaciones.find((candidata) => candidata.codigo === String(params.cod))
    if (!evaluacion) return textoNoEncontrado('Evaluación especificada no existe.')
    return HttpResponse.json(evaluacion)
  }),
  http.post(`${API}/api/evaluaciones/turno/:id/persona/:cod`, async ({ request, params }) => {
    const usuario = autorizar(request, 'Write')
    if (usuario instanceof Response) return usuario
    const cuerpo = (await request.json()) as CuerpoEvaluacion
    const errores = validarCampos(cuerpo)
    if (errores.length > 0) return HttpResponse.json(errores, { status: 400 })
    const categoria = texto(cuerpo.categoria)
    const idTurno = Number(params.id)
    const codAlumno = String(params.cod)
    const turno = datos().turnos.find((candidato) => candidato.id === idTurno)
    const programada = esProgramada(categoria)
    if (programada && turno?.codInstructor !== usuario.codPersona) {
      return mensaje(403, 'Solo el instructor asignado al turno puede registrar esta evaluación.')
    }
    const codEvaluador = texto(cuerpo.codEvaluador)
    if (!programada && codEvaluador.length !== 6) return mensaje(400, 'Instructor requerido para evaluación no programada.')
    if (programada && datos().evaluaciones.some((evaluacion) => evaluacion.codigo === `${codAlumno}-${idTurno}`)) {
      return mensaje(403, 'La evaluación ya ha sido registrada.')
    }
    const alumno = buscarPersona(codAlumno)
    if (!alumno) return textoNoEncontrado('Alumno especificada no existe.')
    const rechazoEstado = comprobarEstado(categoria, alumno.estado)
    if (rechazoEstado) return mensaje(400, rechazoEstado)
    if (!turno) return textoNoEncontrado('Turno especificada no existe.')
    const calificaciones = cuerpo.calificaciones ?? []
    if (turno.maniobras.length !== calificaciones.length) return mensaje(400, 'Todas las notas son requeridas.')
    const notasMinimas = turno.maniobras.map((item) => item.notaMin)
    const pares = calificaciones.map((calificacion, indice) => ({
      idManiobra: Number(calificacion.idManiobra),
      notaMin: notasMinimas[indice] ?? '',
      nota: notasMinimas[indice] === 'D' ? 'D' : texto(calificacion.nota).toUpperCase(),
    }))
    const erroresNotas = erroresDeNotas(pares)
    if (erroresNotas.length > 0) return mensaje(400, erroresNotas)
    const faltantes = erroresBajoEstandar(cuerpo, notasMinimas)
    if (faltantes.length > 0) return HttpResponse.json(faltantes, { status: 400 })
    const evaluador = buscarPersona(programada ? (turno.codInstructor ?? '') : codEvaluador)
    if (!evaluador) return textoNoEncontrado('Evaluador especificada no existe.')
    let codigo = `${codAlumno}-${idTurno}`
    if (!programada) {
      alumno.contEval += 1
      codigo = `${codigo}-${alumno.contEval}`
    }
    const resultado = calcular(
      categoria,
      pares.map((par) => `${par.notaMin}${par.nota}`),
    )
    const evaluacion: EvaluacionMock = {
      codigo,
      nombre: texto(cuerpo.nombre),
      fecha: hoyIso(),
      programa: turno.programa,
      categoria: CATEGORIAS[categoria] ?? categoria,
      clasificacion: resultado.clasificacion,
      promedio: resultado.promedio,
      recomendacion: opcional(cuerpo.recomendacion),
      archivoUrl: opcional(cuerpo.url),
      idSubFase: turno.idSubfase,
      fase: turno.fase,
      subFase: turno.subfase,
      estadoAlumno: alumno.estado,
      codEvalPrevia: alumno.codEvalRealizada,
      codEvaluador: null,
      evaluador: nombreCorto(evaluador),
      codPersona: codAlumno,
      alumno: nombreCorto(alumno),
      calificaciones: calificacionesDesde(
        codigo,
        cuerpo,
        notasMinimas,
        turno.maniobras.map((item) => item.idManiobra),
      ),
    }
    alumno.codEvalRealizada = codigo
    datos().evaluaciones.push(evaluacion)
    return guardada(evaluacion, evaluador.codigo)
  }),
  http.put(`${API}/api/evaluaciones/:cod`, async ({ request, params }) => {
    const usuario = autorizar(request, 'Modify Evaluations')
    if (usuario instanceof Response) return usuario
    const cuerpo = (await request.json()) as CuerpoEvaluacion
    const errores = validarCampos(cuerpo)
    if (errores.length > 0) return HttpResponse.json(errores, { status: 400 })
    const codigo = String(params.cod)
    const alumno = buscarPersona(codigo.slice(0, 6))
    if (!alumno) return textoNoEncontrado('Alumno especificada no existe.')
    if (alumno.codEvalRealizada !== codigo) return mensaje(403, MENSAJE_ULTIMA)
    const categoria = texto(cuerpo.categoria)
    const codEvaluador = texto(cuerpo.codEvaluador)
    if (!esProgramada(categoria) && codEvaluador.length !== 6) {
      return mensaje(400, 'Instructor requerido para evaluación no programada.')
    }
    const evaluacion = datos().evaluaciones.find((candidata) => candidata.codigo === codigo)
    if (!evaluacion) return textoNoEncontrado('Evaluación especificada no existe.')
    const rechazoEstado = comprobarEstado(categoria, evaluacion.estadoAlumno)
    if (rechazoEstado) return mensaje(400, rechazoEstado)
    const calificaciones = cuerpo.calificaciones ?? []
    if (evaluacion.calificaciones.length !== calificaciones.length) return mensaje(400, 'Todas las notas son requeridas.')
    const notasMinimas = evaluacion.calificaciones.map((calificacion) => calificacion.notaMin)
    const pares = calificaciones.map((calificacion, indice) => ({
      idManiobra: Number(calificacion.idManiobra),
      notaMin: notasMinimas[indice] ?? '',
      nota: notasMinimas[indice] === 'D' ? 'D' : texto(calificacion.nota).toUpperCase(),
    }))
    const erroresNotas = erroresDeNotas(pares)
    if (erroresNotas.length > 0) return mensaje(400, erroresNotas)
    const faltantes = erroresBajoEstandar(cuerpo, notasMinimas)
    if (faltantes.length > 0) return HttpResponse.json(faltantes, { status: 400 })
    if (!esProgramada(categoria)) {
      const evaluador = buscarPersona(codEvaluador)
      if (!evaluador) return textoNoEncontrado('Evaluador especificada no existe.')
      evaluacion.evaluador = nombreCorto(evaluador)
    }
    const resultado = calcular(
      categoria,
      pares.map((par) => `${par.notaMin}${par.nota}`),
    )
    Object.assign(evaluacion, {
      nombre: texto(cuerpo.nombre),
      categoria: CATEGORIAS[categoria] ?? categoria,
      recomendacion: opcional(cuerpo.recomendacion),
      archivoUrl: opcional(cuerpo.url),
      fecha: hoyIso(),
      clasificacion: resultado.clasificacion,
      promedio: resultado.promedio,
      calificaciones: calificacionesDesde(
        codigo,
        cuerpo,
        notasMinimas,
        evaluacion.calificaciones.map((calificacion) => calificacion.idManiobra),
      ),
    })
    return guardada(evaluacion, null)
  }),
  http.delete(`${API}/api/evaluaciones/:cod`, ({ request, params }) => {
    const usuario = autorizar(request, 'Modify Evaluations')
    if (usuario instanceof Response) return usuario
    const codigo = String(params.cod)
    const evaluacion = datos().evaluaciones.find((candidata) => candidata.codigo === codigo)
    if (!evaluacion) return textoNoEncontrado('Evaluación especificada no existe.')
    const alumno = buscarPersona(evaluacion.codPersona)
    if (!alumno || alumno.codEvalRealizada !== codigo) return mensaje(403, MENSAJE_ULTIMA)
    alumno.codEvalRealizada = evaluacion.codEvalPrevia
    datos().evaluaciones = datos().evaluaciones.filter((candidata) => candidata.codigo !== codigo)
    return HttpResponse.text('Evaluación eliminado con éxito.')
  }),
]
```

Replace `src/mocks/handlers.ts` with:

```ts
import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersTurnos } from './sigeda/turnos'

export const handlers: RequestHandler[] = [
  ...handlersAuth,
  ...handlersCatalogos,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

- [ ] **Step 2: Write the failing tests**

`src/features/evaluaciones/api.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import {
  aEvaluacionGuardada,
  aNota,
  eliminarEvaluacion,
  listarEvaluaciones,
  listarEvaluacionesDelTurno,
  modificarEvaluacion,
  obtenerEvaluacion,
  obtenerUltimaEvaluacion,
  registrarEvaluacion,
  sugerirCategorias,
  type CuerpoEvaluacion,
} from './api'

const API = config.sigedaApiUrl
const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }

function cuerpoPonderada(cambios: Partial<CuerpoEvaluacion> = {}): CuerpoEvaluacion {
  return {
    nombre: 'Ponderada Contacto Medio',
    categoria: 'Ponderada',
    recomendacion: 'Seguir practicando',
    url: null,
    codEvaluador: null,
    calificaciones: [1, 2, 3, 4, 5, 6].map((idManiobra) => ({
      idManiobra,
      nota: 'B' as const,
      causa: null,
      observacion: null,
      recomendacion: null,
    })),
    ...cambios,
  }
}

describe('api de evaluaciones', () => {
  it('CA-EVA-01 lista las evaluaciones de un alumno con sus filtros', async () => {
    await iniciarComo('comandante.aguirre')
    const todas = await listarEvaluaciones('555555', { ...PAGINA, programa: 'PDI' })
    expect(todas.items.map((evaluacion) => evaluacion.codigo)).toEqual(['555555-1', '555555-2', '555555-3'])
    expect(todas.items[0]).toEqual({
      codigo: '555555-1',
      nombre: 'Ponderada Contacto Básico',
      fase: 'Adaptación',
      evaluador: 'Juan Torres',
      fecha: '2024-03-01',
      alumno: 'Pedro Rodriguez',
      promedio: 14,
      clasificacion: 'Regular',
    })
    const regulares = await listarEvaluaciones('555555', { ...PAGINA, programa: 'PDI', clasificacion: 'Bueno' })
    expect(regulares.items.map((evaluacion) => evaluacion.codigo)).toEqual(['555555-2'])
    await expect(listarEvaluaciones('555555', { ...PAGINA, programa: 'PDI', idSubfase: 2 })).resolves.toMatchObject({
      items: [],
    })
  })

  it('CA-EVA-02 encuentra la evaluación de un alumno en un turno sin confundir turnos parecidos', async () => {
    server.use(
      http.get(`${API}/api/evaluaciones/persona/:cod`, () =>
        HttpResponse.json({
          content: [
            { codigo: '111111-1', nombre: 'a', fase: '', evaluador: '', fecha: '2024-03-01', alumno: '', promedio: null, clasificacion: null },
            { codigo: '111111-12', nombre: 'b', fase: '', evaluador: '', fecha: '2024-03-02', alumno: '', promedio: null, clasificacion: null },
          ],
          number: 0,
          size: 50,
          totalElements: 2,
          totalPages: 1,
        }),
      ),
    )
    await iniciarComo('instructor.perez')
    expect((await listarEvaluacionesDelTurno('111111', 1)).map((evaluacion) => evaluacion.codigo)).toEqual(['111111-1'])
  })

  it('CA-EVA-12 identifica la última evaluación del alumno', async () => {
    await iniciarComo('comandante.aguirre')
    await expect(obtenerUltimaEvaluacion('555555', 'PDI')).resolves.toBe('555555-3')
  })

  it('CA-EVA-08 trae el detalle con la categoría normalizada y cada calificación', async () => {
    await iniciarComo('comandante.aguirre')
    const evaluacion = await obtenerEvaluacion('111111-1')
    expect(evaluacion).toMatchObject({ categoria: 'Ponderada', clasificacion: 'Bueno', promedio: 16.5 })
    expect(evaluacion.calificaciones[2]).toEqual({
      idManiobra: 3,
      maniobra: 'Maniobra 3',
      notaMin: 'B',
      nota: 'R',
      causa: 'Falta de coordinación en pedales',
      observacion: 'Pierde altura en el viraje',
      recomendacion: 'Practicar virajes coordinados',
    })
  })

  it('CA-EVA-11 sugiere categorías según el estado del alumno', async () => {
    await iniciarComo('instructor.perez')
    await expect(sugerirCategorias('111111')).resolves.toEqual(['Ponderada', 'chequeoSubFase', 'Complementacion'])
    await expect(sugerirCategorias('777777')).resolves.toEqual(['Chequeo'])
  })

  it('CA-EVA-07 devuelve el promedio y la clasificación calculados por el backend', async () => {
    await iniciarComo('instructor.perez')
    await expect(registrarEvaluacion(2, '222222', cuerpoPonderada())).resolves.toEqual({
      mensaje: 'Evaluación guardada con éxito.',
      codigo: '222222-2',
      promedio: 17,
      clasificacion: 'Bueno',
    })
  })

  it('CA-EVA-13 muestra las reglas del backend con su mensaje', async () => {
    await iniciarComo('instructor.perez')
    await expect(registrarEvaluacion(1, '111111', cuerpoPonderada())).rejects.toMatchObject({
      status: 403,
      message: 'La evaluación ya ha sido registrada.',
    })
    await expect(registrarEvaluacion(5, '777777', cuerpoPonderada())).rejects.toMatchObject({
      status: 403,
      message: 'Solo el instructor asignado al turno puede registrar esta evaluación.',
    })
    await iniciarComo('instructor.mendoza')
    await expect(
      registrarEvaluacion(5, '777777', cuerpoPonderada({ calificaciones: cuerpoPonderada().calificaciones.slice(0, 2) })),
    ).rejects.toMatchObject({ status: 400, message: 'El alumno debe ser apto para realizar evaluaciones ponderadas.' })
  })

  it('convierte el promedio del backend en número y lo deja nulo cuando no hay', () => {
    expect(aNota('14.0')).toBe(14)
    expect(aNota(15)).toBe(15)
    expect(aNota(null)).toBeNull()
    expect(aNota('')).toBeNull()
    expect(aNota('n/a')).toBeNull()
  })

  it('tolera la clave sin tilde en la respuesta guardada', () => {
    expect(
      aEvaluacionGuardada({ mensaje: 'Evaluación guardada con éxito.', evaluacion: { codigo: '222222-2', promedio: null, clasificacion: 'Bueno' } }),
    ).toEqual({ mensaje: 'Evaluación guardada con éxito.', codigo: '222222-2', promedio: null, clasificacion: 'Bueno' })
  })

  it('CA-EVA-12 el backend solo permite modificar y eliminar la última evaluación', async () => {
    await iniciarComo('comandante.aguirre')
    await expect(modificarEvaluacion('555555-1', cuerpoPonderada())).rejects.toMatchObject({
      status: 403,
      message: 'Solo se puede modificar la ultima evaluación realiza por el alumno.',
    })
    await expect(eliminarEvaluacion('555555-3')).resolves.toBe('Evaluación eliminado con éxito.')
    await expect(obtenerUltimaEvaluacion('555555', 'PDI')).resolves.toBe('555555-2')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/evaluaciones
```

Expected: FAIL — `Failed to resolve import "./api"`.

- [ ] **Step 4: Implement the evaluation API**

`src/features/evaluaciones/api.ts`:

```ts
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Programa } from '@/features/catalogos/api'
import { clavesTurnos } from '@/features/turnos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import { categoriaDesde, esCategoria, type Categoria } from '@/lib/dominio/categorias'
import { esNotaDirbe, type NotaDirbe } from '@/lib/dominio/dirbe'
import { perteneceAlTurno, ultimaEvaluacion } from '@/lib/dominio/evaluacion'
import type { Clasificacion } from '@/lib/dominio/vocabulario'

export type EvaluacionResumen = {
  codigo: string
  nombre: string
  fase: string
  evaluador: string
  fecha: string
  alumno: string
  promedio: number | null
  clasificacion: string | null
}

export type CalificacionDetalle = {
  idManiobra: number
  maniobra: string
  notaMin: NotaDirbe
  nota: string
  causa: string | null
  observacion: string | null
  recomendacion: string | null
}

export type EvaluacionDetalle = {
  codigo: string
  nombre: string
  fecha: string
  programa: string
  categoria: Categoria | null
  categoriaTexto: string
  clasificacion: string | null
  promedio: number | null
  recomendacion: string | null
  archivoUrl: string | null
  fase: string
  subFase: string
  estadoAlumno: string
  codEvalPrevia: string | null
  evaluador: string
  codPersona: string
  alumno: string
  calificaciones: CalificacionDetalle[]
}

export type FiltrosEvaluaciones = ParametrosPagina & {
  programa: Programa
  idSubfase?: number
  clasificacion?: Clasificacion
}

export type CuerpoEvaluacion = {
  nombre: string
  categoria: Categoria
  recomendacion: string | null
  url: string | null
  codEvaluador: string | null
  calificaciones: {
    idManiobra: number
    nota: NotaDirbe
    causa: string | null
    observacion: string | null
    recomendacion: string | null
  }[]
}

export type EvaluacionGuardada = {
  mensaje: string
  codigo: string
  promedio: number | null
  clasificacion: string | null
}

type NotaApi = string | number | null

type EvaluacionResumenApi = Omit<EvaluacionResumen, 'promedio'> & { promedio: NotaApi }

type EvaluacionApi = Omit<EvaluacionDetalle, 'categoria' | 'categoriaTexto' | 'calificaciones' | 'promedio'> & {
  categoria: string
  promedio: NotaApi
  calificaciones: {
    idManiobra: number
    notaMin: string
    nota: string
    causa: string | null
    observacion: string | null
    recomendacion: string | null
    maniobra?: { id: number; nombre: string } | null
  }[]
}

export const MENSAJE_EVALUACION_GUARDADA = 'Evaluación guardada con éxito.'
export const MENSAJE_EVALUACION_ELIMINADA = 'Evaluación eliminado con éxito.'

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function textoONulo(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null
}

export function aNota(valor: unknown): number | null {
  if (typeof valor !== 'number' && (typeof valor !== 'string' || valor.trim() === '')) return null
  const nota = Number(valor)
  return Number.isFinite(nota) ? nota : null
}

export function aEvaluacionResumen(evaluacion: EvaluacionResumenApi): EvaluacionResumen {
  return { ...evaluacion, promedio: aNota(evaluacion.promedio), clasificacion: evaluacion.clasificacion ?? null }
}

export function aEvaluacionDetalle(evaluacion: EvaluacionApi): EvaluacionDetalle {
  return {
    codigo: evaluacion.codigo,
    nombre: evaluacion.nombre,
    fecha: evaluacion.fecha,
    programa: evaluacion.programa,
    categoria: categoriaDesde(evaluacion.categoria),
    categoriaTexto: evaluacion.categoria,
    clasificacion: evaluacion.clasificacion ?? null,
    promedio: aNota(evaluacion.promedio),
    recomendacion: evaluacion.recomendacion ?? null,
    archivoUrl: evaluacion.archivoUrl ?? null,
    fase: evaluacion.fase,
    subFase: evaluacion.subFase,
    estadoAlumno: evaluacion.estadoAlumno,
    codEvalPrevia: evaluacion.codEvalPrevia ?? null,
    evaluador: evaluacion.evaluador,
    codPersona: evaluacion.codPersona,
    alumno: evaluacion.alumno,
    calificaciones: evaluacion.calificaciones.flatMap((calificacion) => {
      const notaMin = calificacion.notaMin.toUpperCase()
      if (!esNotaDirbe(notaMin)) return []
      return [
        {
          idManiobra: calificacion.idManiobra,
          maniobra: calificacion.maniobra?.nombre ?? `Maniobra ${calificacion.idManiobra}`,
          notaMin,
          nota: calificacion.nota,
          causa: calificacion.causa ?? null,
          observacion: calificacion.observacion ?? null,
          recomendacion: calificacion.recomendacion ?? null,
        },
      ]
    }),
  }
}

export function aEvaluacionGuardada(respuesta: unknown): EvaluacionGuardada {
  if (esRegistro(respuesta)) {
    const evaluacion = respuesta['evaluación'] ?? respuesta.evaluacion
    if (typeof respuesta.mensaje === 'string' && esRegistro(evaluacion) && typeof evaluacion.codigo === 'string') {
      return {
        mensaje: respuesta.mensaje,
        codigo: evaluacion.codigo,
        promedio: aNota(evaluacion.promedio),
        clasificacion: textoONulo(evaluacion.clasificacion),
      }
    }
    if (typeof respuesta.codigo === 'string') {
      return {
        mensaje: MENSAJE_EVALUACION_GUARDADA,
        codigo: respuesta.codigo,
        promedio: aNota(respuesta.promedio),
        clasificacion: textoONulo(respuesta.clasificacion),
      }
    }
  }
  throw new ApiError(500, MENSAJE_GENERICO)
}

export const clavesEvaluaciones = {
  todo: ['evaluaciones'] as const,
  lista: (codPersona: string, filtros: FiltrosEvaluaciones) =>
    [...clavesEvaluaciones.todo, 'lista', codPersona, filtros] as const,
  delTurno: (codPersona: string, idTurno: number) => [...clavesEvaluaciones.todo, 'turno', codPersona, idTurno] as const,
  ultima: (codPersona: string, programa: string) => [...clavesEvaluaciones.todo, 'ultima', codPersona, programa] as const,
  detalle: (codigo: string) => [...clavesEvaluaciones.todo, 'detalle', codigo] as const,
  sugerencias: (codPersona: string) => [...clavesEvaluaciones.todo, 'sugerencias', codPersona] as const,
}

export async function listarEvaluaciones(
  codPersona: string,
  filtros: FiltrosEvaluaciones,
): Promise<Pagina<EvaluacionResumen>> {
  const pagina = await sigeda.pagina<EvaluacionResumenApi>(`/api/evaluaciones/filter/persona/${codPersona}`, {
    idSubfase: filtros.idSubfase,
    nombre: filtros.programa,
    clasificacion: filtros.clasificacion,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
  return { ...pagina, items: pagina.items.map(aEvaluacionResumen) }
}

export async function listarEvaluacionesDelTurno(codPersona: string, idTurno: number): Promise<EvaluacionResumen[]> {
  const pagina = await sigeda.pagina<EvaluacionResumenApi>(`/api/evaluaciones/persona/${codPersona}`, {
    idTurno,
    page: 0,
    size: 50,
  })
  return pagina.items
    .filter((evaluacion) => perteneceAlTurno(evaluacion.codigo, codPersona, idTurno))
    .map(aEvaluacionResumen)
}

export async function obtenerUltimaEvaluacion(codPersona: string, programa: string): Promise<string | null> {
  const pagina = await sigeda.pagina<EvaluacionResumenApi>(`/api/evaluaciones/filter/persona/${codPersona}`, {
    nombre: programa,
    page: 0,
    size: 500,
  })
  return ultimaEvaluacion(pagina.items)
}

export async function obtenerEvaluacion(codigo: string): Promise<EvaluacionDetalle> {
  return aEvaluacionDetalle(await sigeda.get<EvaluacionApi>(`/api/evaluaciones/${codigo}`))
}

export async function sugerirCategorias(codPersona: string): Promise<Categoria[]> {
  const sugeridas = await sigeda.lista<string>(`/api/personas/${codPersona}/status`)
  return sugeridas.filter(esCategoria)
}

export async function registrarEvaluacion(
  idTurno: number,
  codPersona: string,
  cuerpo: CuerpoEvaluacion,
): Promise<EvaluacionGuardada> {
  return aEvaluacionGuardada(await sigeda.post<unknown>(`/api/evaluaciones/turno/${idTurno}/persona/${codPersona}`, cuerpo))
}

export async function modificarEvaluacion(codigo: string, cuerpo: CuerpoEvaluacion): Promise<EvaluacionGuardada> {
  return aEvaluacionGuardada(await sigeda.put<unknown>(`/api/evaluaciones/${codigo}`, cuerpo))
}

export async function eliminarEvaluacion(codigo: string): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/evaluaciones/${codigo}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_EVALUACION_ELIMINADA
}

export const consultasEvaluaciones = {
  lista: (codPersona: string, filtros: FiltrosEvaluaciones) =>
    queryOptions({
      queryKey: clavesEvaluaciones.lista(codPersona, filtros),
      queryFn: () => listarEvaluaciones(codPersona, filtros),
      placeholderData: keepPreviousData,
    }),
  delTurno: (codPersona: string, idTurno: number) =>
    queryOptions({
      queryKey: clavesEvaluaciones.delTurno(codPersona, idTurno),
      queryFn: () => listarEvaluacionesDelTurno(codPersona, idTurno),
    }),
  ultima: (codPersona: string, programa: string) =>
    queryOptions({
      queryKey: clavesEvaluaciones.ultima(codPersona, programa),
      queryFn: () => obtenerUltimaEvaluacion(codPersona, programa),
    }),
  detalle: (codigo: string) =>
    queryOptions({ queryKey: clavesEvaluaciones.detalle(codigo), queryFn: () => obtenerEvaluacion(codigo) }),
  sugerencias: (codPersona: string) =>
    queryOptions({ queryKey: clavesEvaluaciones.sugerencias(codPersona), queryFn: () => sugerirCategorias(codPersona) }),
}

function useInvalidarEvaluaciones() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: clavesEvaluaciones.todo }),
      queryClient.invalidateQueries({ queryKey: clavesTurnos.todo }),
    ])
}

export function useRegistrarEvaluacion(idTurno: number, codPersona: string) {
  const invalidar = useInvalidarEvaluaciones()
  return useMutation({
    mutationFn: (cuerpo: CuerpoEvaluacion) => registrarEvaluacion(idTurno, codPersona, cuerpo),
    onSuccess: invalidar,
  })
}

export function useModificarEvaluacion(codigo: string) {
  const invalidar = useInvalidarEvaluaciones()
  return useMutation({
    mutationFn: (cuerpo: CuerpoEvaluacion) => modificarEvaluacion(codigo, cuerpo),
    onSuccess: invalidar,
  })
}

export function useEliminarEvaluacion() {
  const invalidar = useInvalidarEvaluaciones()
  return useMutation({ mutationFn: eliminarEvaluacion, onSuccess: invalidar })
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/evaluaciones
```

Expected: PASS, 10 tests.

- [ ] **Step 6: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 174 tests.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add evaluation api over the contract mocks"
```

---

### Task 7: Screen registry, M1 routes and breadcrumbs (M1-12, CA-TUR-14, CA-EVA-10)

**Files:**
- Generated by shadcn: `src/components/ui/breadcrumb.tsx`
- Modify (full rewrite): `src/lib/auth/pantallas.ts`, `src/lib/auth/pantallas.test.ts`
- Modify: `src/lib/auth/guardas.ts`, `src/components/app-sidebar.tsx`, `src/features/inicio/inicio-page.tsx`, `src/components/app-shell.tsx`
- Create: `src/components/migas.tsx`; placeholder pages `src/features/turnos/{turnos,registrar-turno,turno,modificar-turno,orden-de-vuelo,hoja-de-briefing,mis-turnos}-page.tsx`, `src/features/evaluaciones/{evaluaciones,evaluacion,modificar-evaluacion,registrar-evaluacion,mis-evaluaciones}-page.tsx`; routes `src/routes/_app/turnos/index.tsx`, `turnos/nuevo.tsx`, `turnos/dia/index.tsx`, `turnos/dia/$fecha.tsx`, `turnos/$id/index.tsx`, `turnos/$id/editar.tsx`, `turnos/$id/briefing/$alumno.tsx`, `turnos/$id/evaluar/$alumno.tsx`, `mis-turnos.tsx`, `evaluaciones/index.tsx`, `evaluaciones/$cod/index.tsx`, `evaluaciones/$cod/editar.tsx`, `mis-evaluaciones.tsx`
- Regenerated: `src/routeTree.gen.ts`
- Test: `src/lib/auth/pantallas.test.ts`, `src/components/migas.test.tsx`, `src/lib/auth/rutas-m1.test.tsx`, `src/lib/auth/cobertura-de-rutas.test.ts`

**Interfaces:**
- Consumes: M0's `exigirPantalla`, `SinPermisoError`, `useSesion`, `puede`, `PageHeader`, `AppShell`; `hoyIso` (Task 3).
- Produces:
  - `type Perfil = { permisos: ReadonlySet<Permiso>; rol: { nombre: string } }` (a `Sesion` is a `Perfil`).
  - `Pantalla` gains `roles?: readonly string[]` (only these roles) and `padre?: RutaApp` (breadcrumb parent).
  - **Signature change:** `pantallaVisible(pantalla, perfil: Perfil, esDesarrollo)`, `menuPara(perfil: Perfil, esDesarrollo, pantallas?)`, `accesosPara(perfil: Perfil, esDesarrollo, pantallas?)` (M0 passed `permisos`; the three call sites are updated here). `accesosPara` skips routes with parameters.
  - `veSoloLoPropio(perfil): boolean` (the Alumno role), `pantallaPorRuta(ruta, pantallas?)`, `migasPara(ruta, perfil, esDesarrollo, pantallas?): Pantalla[]` (ancestors the role can open, then the current screen; `[]` on Inicio).
  - `PANTALLAS` keys: `turnos` (`/turnos`), `ordenDeVuelo` (`/turnos/dia`, redirects to today), `ordenDeVueloDelDia` (`/turnos/dia/$fecha`), `registrarTurno`, `turno` (`/turnos/$id`), `modificarTurno`, `hojaDeBriefing`, `registrarEvaluacion` (`/turnos/$id/evaluar/$alumno`, `Write`), `misTurnos` (Alumno only), `evaluaciones` (staff only), `evaluacion` (`/evaluaciones/$cod`), `modificarEvaluacion` (`Modify Evaluations`), `misEvaluaciones` (Alumno only). Menu groups "Operaciones de vuelo" and "Evaluaciones".
  - `<Migas className? />`: `nav` named "Migas de pan" in the header; hidden on Inicio.
  - Guard coverage (`cobertura-de-rutas.test.ts`): every route under `/_app` in the router has a `PANTALLAS` entry, and every file in `src/routes/_app/**` calls `exigirPantalla(PANTALLAS.<clave>, …)` with the entry whose `ruta` matches the file's path, so no M1 route can ship unguarded or guarded by the wrong screen. Later route edits (loaders, `validateSearch`) keep this test green.
  - Placeholder pages with the final prop names used by later tasks: `TurnoPage({ id: number })`, `ModificarTurnoPage({ id })`, `OrdenDeVueloPage({ fecha: string })`, `HojaDeBriefingPage({ id, codAlumno })`, `RegistrarEvaluacionPage({ id, codAlumno })`, `EvaluacionPage({ codigo })`, `ModificarEvaluacionPage({ codigo })`, and parameterless `TurnosPage`, `RegistrarTurnoPage`, `MisTurnosPage`, `EvaluacionesPage`, `MisEvaluacionesPage`.

- [ ] **Step 1: Add the breadcrumb component**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm dlx shadcn@4.21.0 add breadcrumb -y </dev/null
```

Expected: `Created 1 file: src/components/ui/breadcrumb.tsx`.

- [ ] **Step 2: Write the placeholder pages**

Each later task replaces its page. They exist now so the routes and the registry compile.

`src/features/turnos/turnos-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function TurnosPage() {
  return <PageHeader titulo="Programación de turnos" />
}
```

`src/features/turnos/registrar-turno-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarTurnoPage() {
  return <PageHeader titulo="Registrar turno" />
}
```

`src/features/turnos/turno-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function TurnoPage({ id }: Props) {
  return <PageHeader titulo="Detalle de turno" descripcion={`${id}`} />
}
```

`src/features/turnos/modificar-turno-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarTurnoPage({ id }: Props) {
  return <PageHeader titulo="Modificar turno" descripcion={`${id}`} />
}
```

`src/features/turnos/orden-de-vuelo-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { fecha: string }

export function OrdenDeVueloPage({ fecha }: Props) {
  return <PageHeader titulo="Orden de vuelo del día" descripcion={`${fecha}`} />
}
```

`src/features/turnos/hoja-de-briefing-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number; codAlumno: string }

export function HojaDeBriefingPage({ id, codAlumno }: Props) {
  return <PageHeader titulo="Hoja de briefing" descripcion={`${id} · ${codAlumno}`} />
}
```

`src/features/turnos/mis-turnos-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function MisTurnosPage() {
  return <PageHeader titulo="Mis turnos" />
}
```

`src/features/evaluaciones/evaluaciones-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function EvaluacionesPage() {
  return <PageHeader titulo="Evaluaciones" />
}
```

`src/features/evaluaciones/evaluacion-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { codigo: string }

export function EvaluacionPage({ codigo }: Props) {
  return <PageHeader titulo="Detalle de evaluación" descripcion={`${codigo}`} />
}
```

`src/features/evaluaciones/modificar-evaluacion-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { codigo: string }

export function ModificarEvaluacionPage({ codigo }: Props) {
  return <PageHeader titulo="Modificar evaluación" descripcion={`${codigo}`} />
}
```

`src/features/evaluaciones/registrar-evaluacion-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number; codAlumno: string }

export function RegistrarEvaluacionPage({ id, codAlumno }: Props) {
  return <PageHeader titulo="Registrar evaluación" descripcion={`${id} · ${codAlumno}`} />
}
```

`src/features/evaluaciones/mis-evaluaciones-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function MisEvaluacionesPage() {
  return <PageHeader titulo="Mis evaluaciones" />
}
```

- [ ] **Step 3: Write the route files**

`src/routes/_app/turnos/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { TurnosPage } from '@/features/turnos/turnos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.turnos, context.sesion.actual()),
  component: TurnosPage,
})
```

`src/routes/_app/turnos/nuevo.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { RegistrarTurnoPage } from '@/features/turnos/registrar-turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/nuevo')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarTurno, context.sesion.actual()),
  component: RegistrarTurnoPage,
})
```

`src/routes/_app/turnos/dia/index.tsx`:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { hoyIso } from '@/lib/dominio/calendario'

export const Route = createFileRoute('/_app/turnos/dia/')({
  beforeLoad: ({ context }) => {
    exigirPantalla(PANTALLAS.ordenDeVuelo, context.sesion.actual())
    throw redirect({ to: '/turnos/dia/$fecha', params: { fecha: hoyIso() } })
  },
})
```

`src/routes/_app/turnos/dia/$fecha.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { OrdenDeVueloPage } from '@/features/turnos/orden-de-vuelo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/dia/$fecha')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.ordenDeVueloDelDia, context.sesion.actual()),
  component: RutaOrdenDeVuelo,
})

function RutaOrdenDeVuelo() {
  const { fecha } = Route.useParams()
  return <OrdenDeVueloPage fecha={fecha} />
}
```

`src/routes/_app/turnos/$id/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { TurnoPage } from '@/features/turnos/turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.turno, context.sesion.actual()),
  component: RutaTurno,
})

function RutaTurno() {
  const { id } = Route.useParams()
  return <TurnoPage id={Number(id)} />
}
```

`src/routes/_app/turnos/$id/editar.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ModificarTurnoPage } from '@/features/turnos/modificar-turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarTurno, context.sesion.actual()),
  component: RutaModificarTurno,
})

function RutaModificarTurno() {
  const { id } = Route.useParams()
  return <ModificarTurnoPage id={Number(id)} />
}
```

`src/routes/_app/turnos/$id/briefing/$alumno.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { HojaDeBriefingPage } from '@/features/turnos/hoja-de-briefing-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/briefing/$alumno')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.hojaDeBriefing, context.sesion.actual()),
  component: RutaHojaDeBriefing,
})

function RutaHojaDeBriefing() {
  const { id, alumno } = Route.useParams()
  return <HojaDeBriefingPage id={Number(id)} codAlumno={alumno} />
}
```

`src/routes/_app/turnos/$id/evaluar/$alumno.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { RegistrarEvaluacionPage } from '@/features/evaluaciones/registrar-evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/evaluar/$alumno')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarEvaluacion, context.sesion.actual()),
  component: RutaRegistrarEvaluacion,
})

function RutaRegistrarEvaluacion() {
  const { id, alumno } = Route.useParams()
  return <RegistrarEvaluacionPage id={Number(id)} codAlumno={alumno} />
}
```

`src/routes/_app/mis-turnos.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { MisTurnosPage } from '@/features/turnos/mis-turnos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mis-turnos')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misTurnos, context.sesion.actual()),
  component: MisTurnosPage,
})
```

`src/routes/_app/evaluaciones/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { EvaluacionesPage } from '@/features/evaluaciones/evaluaciones-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.evaluaciones, context.sesion.actual()),
  component: EvaluacionesPage,
})
```

`src/routes/_app/evaluaciones/$cod/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { EvaluacionPage } from '@/features/evaluaciones/evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/$cod/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.evaluacion, context.sesion.actual()),
  component: RutaEvaluacion,
})

function RutaEvaluacion() {
  const { cod } = Route.useParams()
  return <EvaluacionPage codigo={cod} />
}
```

`src/routes/_app/evaluaciones/$cod/editar.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ModificarEvaluacionPage } from '@/features/evaluaciones/modificar-evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/$cod/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarEvaluacion, context.sesion.actual()),
  component: RutaModificarEvaluacion,
})

function RutaModificarEvaluacion() {
  const { cod } = Route.useParams()
  return <ModificarEvaluacionPage codigo={cod} />
}
```

`src/routes/_app/mis-evaluaciones.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { MisEvaluacionesPage } from '@/features/evaluaciones/mis-evaluaciones-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mis-evaluaciones')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misEvaluaciones, context.sesion.actual()),
  component: MisEvaluacionesPage,
})
```

- [ ] **Step 4: Rewrite the registry**

Replace `src/lib/auth/pantallas.ts` with (keeps M0's `inicio`, `cuenta` and `guia` entries unchanged; if M0 added any other entry, keep it too):

```ts
import {
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  House,
  KeyRound,
  Palette,
  Plane,
  PlaneTakeoff,
  type LucideIcon,
} from 'lucide-react'
import type { FileRouteTypes } from '@/routeTree.gen'
import { puede, type Permiso } from './permisos'

export type RutaApp = FileRouteTypes['to']

export type GrupoMenu =
  | 'General'
  | 'Matrícula'
  | 'Programa'
  | 'Operaciones de vuelo'
  | 'Evaluaciones'
  | 'Teoría'
  | 'Seguimiento'
  | 'Aprendizaje'

export const ORDEN_GRUPOS: readonly GrupoMenu[] = [
  'General',
  'Matrícula',
  'Programa',
  'Operaciones de vuelo',
  'Evaluaciones',
  'Teoría',
  'Seguimiento',
  'Aprendizaje',
]

export type Perfil = { permisos: ReadonlySet<Permiso>; rol: { nombre: string } }

export type Pantalla = {
  ruta: RutaApp
  titulo: string
  descripcion: string
  grupo: GrupoMenu
  icono: LucideIcon
  permiso?: Permiso
  roles?: readonly string[]
  padre?: RutaApp
  enMenu: boolean
  soloDesarrollo?: boolean
}

const PERSONAL = ['Administrador Web', 'Comandante de Escuadrón', 'Jefe de Operaciones', 'Instructor'] as const
const SOLO_ALUMNO = ['Alumno'] as const

export const PANTALLAS = {
  inicio: {
    ruta: '/',
    titulo: 'Inicio',
    descripcion: 'Resumen de su actividad en SIGEDA.',
    grupo: 'General',
    icono: House,
    enMenu: true,
  },
  cuenta: {
    ruta: '/cuenta',
    titulo: 'Cambiar contraseña',
    descripcion: 'Actualice la contraseña con la que ingresa a SIGEDA.',
    grupo: 'General',
    icono: KeyRound,
    permiso: 'Update',
    enMenu: false,
  },
  guia: {
    ruta: '/guia',
    titulo: 'Guía de estilo',
    descripcion: 'Referencia visual de componentes y estados del dominio.',
    grupo: 'General',
    icono: Palette,
    enMenu: true,
    soloDesarrollo: true,
  },
  turnos: {
    ruta: '/turnos',
    titulo: 'Programación de turnos',
    descripcion: 'Turnos de vuelo por sub fase, programa y fecha.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  ordenDeVuelo: {
    ruta: '/turnos/dia',
    titulo: 'Orden de vuelo del día',
    descripcion: 'Vuelos del día agrupados por aeronave y ordenados por hora.',
    grupo: 'Operaciones de vuelo',
    icono: PlaneTakeoff,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  ordenDeVueloDelDia: {
    ruta: '/turnos/dia/$fecha',
    titulo: 'Orden de vuelo del día',
    descripcion: 'Vuelos del día agrupados por aeronave y ordenados por hora.',
    grupo: 'Operaciones de vuelo',
    icono: PlaneTakeoff,
    permiso: 'Read',
    roles: PERSONAL,
    padre: '/turnos',
    enMenu: false,
  },
  registrarTurno: {
    ruta: '/turnos/nuevo',
    titulo: 'Registrar turno',
    descripcion: 'Programe un turno de vuelo con sus alumnos y maniobras.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Manage Shifts',
    padre: '/turnos',
    enMenu: false,
  },
  turno: {
    ruta: '/turnos/$id',
    titulo: 'Detalle de turno',
    descripcion: 'Datos del turno y ciclo de la misión por alumno.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Read',
    padre: '/turnos',
    enMenu: false,
  },
  modificarTurno: {
    ruta: '/turnos/$id/editar',
    titulo: 'Modificar turno',
    descripcion: 'Cambie los datos, alumnos o maniobras del turno.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Manage Shifts',
    padre: '/turnos/$id',
    enMenu: false,
  },
  hojaDeBriefing: {
    ruta: '/turnos/$id/briefing/$alumno',
    titulo: 'Hoja de briefing',
    descripcion: 'Quién explica cada maniobra en el briefing de detalle.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Read',
    padre: '/turnos/$id',
    enMenu: false,
  },
  registrarEvaluacion: {
    ruta: '/turnos/$id/evaluar/$alumno',
    titulo: 'Registrar evaluación',
    descripcion: 'Califique cada maniobra del turno.',
    grupo: 'Evaluaciones',
    icono: ClipboardList,
    permiso: 'Write',
    padre: '/turnos/$id',
    enMenu: false,
  },
  misTurnos: {
    ruta: '/mis-turnos',
    titulo: 'Mis turnos',
    descripcion: 'Sus turnos de vuelo programados.',
    grupo: 'Operaciones de vuelo',
    icono: Plane,
    permiso: 'Read',
    roles: SOLO_ALUMNO,
    enMenu: true,
  },
  evaluaciones: {
    ruta: '/evaluaciones',
    titulo: 'Evaluaciones',
    descripcion: 'Evaluaciones prácticas de cada alumno.',
    grupo: 'Evaluaciones',
    icono: ClipboardList,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  evaluacion: {
    ruta: '/evaluaciones/$cod',
    titulo: 'Detalle de evaluación',
    descripcion: 'Calificación de cada maniobra de la evaluación.',
    grupo: 'Evaluaciones',
    icono: ClipboardList,
    permiso: 'Read',
    padre: '/evaluaciones',
    enMenu: false,
  },
  modificarEvaluacion: {
    ruta: '/evaluaciones/$cod/editar',
    titulo: 'Modificar evaluación',
    descripcion: 'Corrija la última evaluación del alumno.',
    grupo: 'Evaluaciones',
    icono: ClipboardList,
    permiso: 'Modify Evaluations',
    padre: '/evaluaciones/$cod',
    enMenu: false,
  },
  misEvaluaciones: {
    ruta: '/mis-evaluaciones',
    titulo: 'Mis evaluaciones',
    descripcion: 'Sus evaluaciones prácticas y su clasificación.',
    grupo: 'Evaluaciones',
    icono: ClipboardCheck,
    permiso: 'Read',
    roles: SOLO_ALUMNO,
    enMenu: true,
  },
} satisfies Record<string, Pantalla>

const TODAS: readonly Pantalla[] = Object.values(PANTALLAS)

export type SeccionMenu = { grupo: GrupoMenu; pantallas: Pantalla[] }

export function pantallaVisible(pantalla: Pantalla, perfil: Perfil, esDesarrollo: boolean) {
  return (
    (!pantalla.soloDesarrollo || esDesarrollo) &&
    puede(perfil.permisos, pantalla.permiso) &&
    (pantalla.roles === undefined || pantalla.roles.includes(perfil.rol.nombre))
  )
}

export function menuPara(perfil: Perfil, esDesarrollo: boolean, pantallas: readonly Pantalla[] = TODAS): SeccionMenu[] {
  const visibles = pantallas.filter((pantalla) => pantalla.enMenu && pantallaVisible(pantalla, perfil, esDesarrollo))
  return ORDEN_GRUPOS.map((grupo) => ({ grupo, pantallas: visibles.filter((pantalla) => pantalla.grupo === grupo) })).filter(
    (seccion) => seccion.pantallas.length > 0,
  )
}

export function accesosPara(perfil: Perfil, esDesarrollo: boolean, pantallas: readonly Pantalla[] = TODAS): Pantalla[] {
  return pantallas.filter(
    (pantalla) => pantalla.ruta !== '/' && !pantalla.ruta.includes('$') && pantallaVisible(pantalla, perfil, esDesarrollo),
  )
}

export function veSoloLoPropio(perfil: Perfil): boolean {
  return perfil.rol.nombre === 'Alumno'
}

export function pantallaPorRuta(ruta: string, pantallas: readonly Pantalla[] = TODAS): Pantalla | undefined {
  return pantallas.find((pantalla) => pantalla.ruta === ruta)
}

export function migasPara(
  ruta: string,
  perfil: Perfil,
  esDesarrollo: boolean,
  pantallas: readonly Pantalla[] = TODAS,
): Pantalla[] {
  const actual = pantallaPorRuta(ruta, pantallas)
  if (!actual || actual.ruta === '/') return []
  const ancestros: Pantalla[] = []
  let padre = actual.padre ? pantallaPorRuta(actual.padre, pantallas) : undefined
  while (padre) {
    if (pantallaVisible(padre, perfil, esDesarrollo)) ancestros.unshift(padre)
    padre = padre.padre ? pantallaPorRuta(padre.padre, pantallas) : undefined
  }
  return [...ancestros, actual]
}
```

Update the three M0 call sites to pass the session (a `Perfil`) instead of its permissions:

- `src/lib/auth/guardas.ts`: replace `!pantallaVisible(pantalla, actual.permisos, esDesarrollo)` with `!pantallaVisible(pantalla, actual, esDesarrollo)`.
- `src/components/app-sidebar.tsx`: replace `menuPara(actual.permisos, import.meta.env.DEV)` with `menuPara(actual, import.meta.env.DEV)`.
- `src/features/inicio/inicio-page.tsx`: replace `accesosPara(actual.permisos, import.meta.env.DEV)` with `accesosPara(actual, import.meta.env.DEV)`.

- [ ] **Step 5: Add the breadcrumbs to the header**

`src/components/migas.tsx`:

```tsx
import { Link, useMatches } from '@tanstack/react-router'
import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { migasPara } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'

function rutaDeCoincidencia(fullPath: string) {
  return fullPath.length > 1 ? fullPath.replace(/\/$/, '') : fullPath
}

export function Migas({ className }: { className?: string }) {
  const actual = useSesion()
  const coincidencia = useMatches().at(-1)
  if (!actual || !coincidencia) return null
  const cadena = migasPara(rutaDeCoincidencia(coincidencia.fullPath), actual, import.meta.env.DEV)
  if (cadena.length === 0) return null
  const params = coincidencia.params

  return (
    <Breadcrumb aria-label="Migas de pan" className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Inicio</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {cadena.map((pantalla, indice) => (
          <Fragment key={pantalla.ruta}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {indice === cadena.length - 1 ? (
                <BreadcrumbPage>{pantalla.titulo}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={pantalla.ruta} params={params}>
                    {pantalla.titulo}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

In `src/components/app-shell.tsx`, add `import { Migas } from './migas'` after the `MenuUsuario` import, and replace

```tsx
          <span className="font-semibold tracking-tight md:hidden">SIGEDA</span>
```

with

```tsx
          <span className="font-semibold tracking-tight sm:hidden">SIGEDA</span>
          <Migas className="hidden min-w-0 sm:block" />
```

- [ ] **Step 6: Generate the route tree and typecheck**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && grep -c "'/turnos/\$id/evaluar/\$alumno'" src/routeTree.gen.ts && pnpm exec tsc -b
```

Expected: the build succeeds, the count is ≥ 1 and `tsc -b` prints nothing.

- [ ] **Step 7: Write the tests**

Replace `src/lib/auth/pantallas.test.ts` with (M0's cases kept, adapted to `Perfil`):

```ts
import { House } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { permisosDeRol } from './permisos'
import {
  accesosPara,
  menuPara,
  migasPara,
  PANTALLAS,
  veSoloLoPropio,
  type Pantalla,
  type Perfil,
  type RutaApp,
} from './pantallas'

const ruta = (valor: string) => valor as RutaApp

function perfilDe(rol: string): Perfil {
  return { permisos: permisosDeRol(rol), rol: { nombre: rol } }
}

const inicio: Pantalla = { ruta: ruta('/'), titulo: 'Inicio', descripcion: '', grupo: 'General', icono: House, enMenu: true }
const usuarios: Pantalla = {
  ruta: ruta('/usuarios'),
  titulo: 'Usuarios',
  descripcion: '',
  grupo: 'Matrícula',
  icono: House,
  permiso: 'Manage Roles',
  enMenu: true,
}
const guia: Pantalla = {
  ruta: ruta('/guia'),
  titulo: 'Guía',
  descripcion: '',
  grupo: 'General',
  icono: House,
  enMenu: true,
  soloDesarrollo: true,
}
const cuenta: Pantalla = {
  ruta: ruta('/cuenta'),
  titulo: 'Cuenta',
  descripcion: '',
  grupo: 'General',
  icono: House,
  permiso: 'Update',
  enMenu: false,
}
const todas = [inicio, usuarios, guia, cuenta]

function titulosDelMenu(rol: string) {
  return menuPara(perfilDe(rol), false).flatMap((seccion) => seccion.pantallas.map((pantalla) => pantalla.titulo))
}

describe('menuPara', () => {
  it('CA-SES-04 oculta del menú lo que el rol no puede ver', () => {
    expect(menuPara(perfilDe('Alumno'), false, todas)).toEqual([{ grupo: 'General', pantallas: [inicio] }])
    expect(menuPara(perfilDe('Administrador Web'), false, todas)).toEqual([
      { grupo: 'General', pantallas: [inicio] },
      { grupo: 'Matrícula', pantallas: [usuarios] },
    ])
  })

  it('muestra las pantallas de desarrollo solo en desarrollo', () => {
    expect(menuPara(perfilDe('Alumno'), true, todas)[0]?.pantallas).toEqual([inicio, guia])
  })

  it('CA-TUR-14 el alumno ve Mis turnos y Mis evaluaciones, no la programación general', () => {
    expect(titulosDelMenu('Alumno')).toEqual(['Inicio', 'Mis turnos', 'Mis evaluaciones'])
  })

  it('el personal ve la programación de turnos, la orden de vuelo y las evaluaciones', () => {
    expect(titulosDelMenu('Instructor')).toEqual([
      'Inicio',
      'Programación de turnos',
      'Orden de vuelo del día',
      'Evaluaciones',
    ])
    expect(titulosDelMenu('Jefe de Operaciones')).toContain('Programación de turnos')
  })
})

describe('accesosPara', () => {
  it('excluye Inicio e incluye pantallas permitidas fuera del menú', () => {
    expect(accesosPara(perfilDe('Alumno'), false, todas)).toEqual([cuenta])
  })

  it('no ofrece accesos a pantallas que necesitan parámetros', () => {
    const rutas = accesosPara(perfilDe('Administrador Web'), false).map((pantalla) => pantalla.ruta)
    expect(rutas).toContain('/turnos/nuevo')
    expect(rutas.some((valor) => valor.includes('$'))).toBe(false)
  })
})

describe('migasPara', () => {
  it('M1-12 arma la cadena desde la sección hasta la pantalla actual', () => {
    expect(migasPara('/turnos/$id/briefing/$alumno', perfilDe('Jefe de Operaciones'), false)).toEqual([
      PANTALLAS.turnos,
      PANTALLAS.turno,
      PANTALLAS.hojaDeBriefing,
    ])
  })

  it('M1-12 omite las secciones que el rol no puede abrir', () => {
    expect(migasPara('/turnos/$id', perfilDe('Alumno'), false)).toEqual([PANTALLAS.turno])
  })

  it('no agrega migas en Inicio ni en rutas desconocidas', () => {
    expect(migasPara('/', perfilDe('Alumno'), false)).toEqual([])
    expect(migasPara('/no-existe', perfilDe('Alumno'), false)).toEqual([])
  })
})

describe('veSoloLoPropio', () => {
  it('CA-TUR-14 y CA-EVA-10 restringe al alumno a sus propios datos', () => {
    expect(veSoloLoPropio(perfilDe('Alumno'))).toBe(true)
    expect(veSoloLoPropio(perfilDe('Instructor'))).toBe(false)
  })
})
```

`src/components/migas.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function migas() {
  return within(await screen.findByRole('navigation', { name: 'Migas de pan' }))
}

describe('migas de pan', () => {
  it('M1-12 muestra el camino hasta la hoja de briefing con enlaces a cada nivel', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/8/briefing/111111')
    const nav = await migas()
    expect(await nav.findByText('Hoja de briefing')).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(nav.getByRole('link', { name: 'Programación de turnos' })).toHaveAttribute('href', '/turnos')
    expect(nav.getByRole('link', { name: 'Detalle de turno' })).toHaveAttribute('href', '/turnos/8')
  })

  it('M1-12 el alumno no ve la sección de programación en sus migas', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos/8')
    const nav = await migas()
    expect(await nav.findByText('Detalle de turno')).toHaveAttribute('aria-current', 'page')
    expect(nav.queryByRole('link', { name: 'Programación de turnos' })).not.toBeInTheDocument()
  })

  it('no muestra migas en Inicio', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/')
    await screen.findByRole('heading', { name: 'Inicio' })
    expect(screen.queryByRole('navigation', { name: 'Migas de pan' })).not.toBeInTheDocument()
  })
})
```

`src/lib/auth/rutas-m1.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { hoyIso } from '@/lib/dominio/calendario'
import { iniciarComo, renderApp } from '@/test/render'

describe('rutas de turnos y evaluaciones', () => {
  it('CA-TUR-14 el alumno no puede abrir la programación general de turnos', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-EVA-10 el alumno no puede abrir la lista general de evaluaciones', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/evaluaciones')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('Mis turnos es solo para alumnos', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/mis-turnos')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-SES-04 registrar un turno exige Manage Shifts', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/turnos/nuevo')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('la orden de vuelo sin fecha abre la de hoy', async () => {
    await iniciarComo('jefe.operaciones')
    const { router } = renderApp('/turnos/dia')
    await screen.findByRole('heading', { name: 'Orden de vuelo del día' })
    expect(router.state.location.pathname).toBe(`/turnos/dia/${hoyIso()}`)
  })
})
```

`src/lib/auth/cobertura-de-rutas.test.ts`:

```ts
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { crearRouter } from '@/router'
import { PANTALLAS, pantallaPorRuta } from './pantallas'

const fuentes = import.meta.glob<string>('/src/routes/_app/**/*.tsx', { query: '?raw', import: 'default', eager: true })

function rutaDeArchivo(archivo: string) {
  const ruta = archivo.replace('/src/routes/_app', '').replace(/\.tsx$/, '').replace(/\/?index$/, '')
  return ruta === '' ? '/' : ruta
}

function rutaDeCoincidencia(fullPath: string) {
  return fullPath.length > 1 ? fullPath.replace(/\/$/, '') : fullPath
}

describe('cobertura de guardas', () => {
  it('cada ruta dentro de /_app tiene su pantalla registrada', () => {
    const router = crearRouter(new QueryClient())
    const rutas = Object.values(router.routesById)
      .filter((ruta) => ruta.id.startsWith('/_app/'))
      .map((ruta) => rutaDeCoincidencia(ruta.fullPath))
    expect(rutas.length).toBeGreaterThan(10)
    expect(rutas.filter((ruta) => pantallaPorRuta(ruta) === undefined)).toEqual([])
  })

  it('cada archivo de ruta exige la pantalla que le corresponde', () => {
    const archivos = Object.entries(fuentes)
    expect(archivos.length).toBeGreaterThan(10)
    const sinGuarda = archivos.flatMap(([archivo, fuente]) => {
      const clave = /exigirPantalla\(PANTALLAS\.(\w+)/.exec(fuente)?.[1]
      const pantalla = clave ? (PANTALLAS as Record<string, { ruta: string }>)[clave] : undefined
      return pantalla?.ruta === rutaDeArchivo(archivo) ? [] : [archivo]
    })
    expect(sinGuarda).toEqual([])
  })
})
```

- [ ] **Step 8: Run the tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth src/components/migas.test.tsx src/components/app-shell.test.tsx src/features/inicio
```

Expected: PASS — pantallas 10, migas 3, rutas-m1 5, cobertura-de-rutas 2, plus M0's guardas, permisos, sesión, tokens, shell and Inicio tests. The implementation came first because the route tree cannot be generated without it; if a test fails, fix the implementation, not the test.

To see the coverage test bite, temporarily change `PANTALLAS.modificarTurno` to `PANTALLAS.turno` in `src/routes/_app/turnos/$id/editar.tsx` and rerun `pnpm test:run src/lib/auth/cobertura-de-rutas.test.ts`: it fails listing that file. Restore the line.

- [ ] **Step 9: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 191 tests.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: register turno and evaluation screens with breadcrumbs"
```

---

### Task 8: DataTable, Programación de turnos and Mis turnos (CA-TUR-01, CA-TUR-14)

**Files:**
- Dependency: `@tanstack/react-table@^9.2.4`
- Generated by shadcn: `src/components/ui/native-select.tsx`
- Create: `src/lib/busqueda.ts`, `src/components/columnas-tabla.ts`, `src/components/data-table.tsx`, `src/components/enlace.tsx`, `src/features/turnos/schemas.ts`, `src/features/turnos/columnas.tsx`
- Modify (full rewrite): `src/features/turnos/turnos-page.tsx`, `src/features/turnos/mis-turnos-page.tsx`, `src/routes/_app/turnos/index.tsx`, `src/routes/_app/mis-turnos.tsx`
- Regenerated: `src/routeTree.gen.ts`
- Test: `src/components/data-table.test.tsx`, `src/features/turnos/turnos-page.test.tsx`

**Interfaces:**
- Consumes: `Pagina`, `ParametrosPagina` (M0/Task 5); `consultasTurnos.lista/delAlumno`, `TurnoResumen` (Task 5); `consultasCatalogos.subfases`, `PROGRAMAS` (Task 4); M0's `EmptyState`, `PageHeader`, `formatearFecha(iso: string): string` (`'—'` for an empty or invalid date), `usePuede`, `useSesion`, shadcn `Table*`, `Skeleton`, `Button`, `Field*`, `Input`, `Alert`.
- Produces:
  - `busqueda.ts`: `esquemaPaginacion` (`page` default 0, `size` default 10 (max 100), `property?`, `direction` default `'ASC'`; every key `.catch`es bad input), `fechaOpcional`, `numeroOpcional`.
  - `columnas-tabla.ts`: `caracteristicasTabla` (`tableFeatures({ rowSortingFeature, rowPaginationFeature })`), `type CaracteristicasTabla`, `type ColumnasTabla<T>`, `ayudanteDeColumnas<T>()` (a `createColumnHelper`).
  - `<DataTable etiqueta columnas pagina cargando parametros alCambiar vacio idDeFila />`: manual pagination and sorting; only columns with `enableSorting: true` sort; `alCambiar(Partial<ParametrosPagina>)` receives `{ page, size }` or `{ property, direction, page: 0 }`; renders `vacio` when the page has no rows and skeleton rows before the first page arrives; footer text `Página N de M · T registros`.
  - `turnos/schemas.ts` (this task's version): `esquemaBusquedaTurnos` (`programa` default `'PDI'`, `idSubfase?`, `desde?`, `hasta?` + pagination), `type BusquedaTurnos`, `esquemaBusquedaPaginada`. Task 10 rewrites this file and keeps these exports.
  - `enlace.tsx`: `EnlaceExterno` (a plain `<a>` with the app's text-link style) and `Enlace` (the same style as a typed router link, built with TanStack Router's documented `createLink` + `LinkComponent` pattern). Every text link inside tables and detail cards in M1 uses one of these two, so the link style lives in one place while the §8 design review is open.
  - `COLUMNAS_TURNOS` (Nombre → link to detail, Sub fase, Programa, Fecha de evaluación, Alumnos, Maniobras; sortable: nombre, fechaEval) and `COLUMNAS_MIS_TURNOS`.
  - Real `TurnosPage` (filters Programa, Sub fase, Desde, Hasta and "Limpiar filtros" in the URL; actions "Orden de vuelo del día" and, with `Manage Shifts`, "Registrar turno") and `MisTurnosPage` (session `codPersona`).

- [ ] **Step 1: Add the dependency and the native select**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm add @tanstack/react-table@^9.2.4 && pnpm dlx shadcn@4.21.0 add native-select -y </dev/null && grep -n '"@tanstack/react-table"' package.json
```

Expected: `Done in …`, `Created 1 file: src/components/ui/native-select.tsx`, and `"@tanstack/react-table": "^9.2.4"` in `package.json`.

- [ ] **Step 2: Write the failing DataTable test**

`src/components/data-table.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { ayudanteDeColumnas } from './columnas-tabla'
import { DataTable } from './data-table'

type Fila = { id: number; nombre: string; fecha: string }

const ayudante = ayudanteDeColumnas<Fila>()
const COLUMNAS = ayudante.columns([
  ayudante.accessor('nombre', { header: 'Nombre', enableSorting: true }),
  ayudante.accessor('fecha', { header: 'Fecha' }),
])

const PAGINA: Pagina<Fila> = {
  items: [
    { id: 1, nombre: 'Contacto Básico', fecha: '2024-03-01' },
    { id: 2, nombre: 'Contacto Intermedio', fecha: '2024-03-08' },
  ],
  page: 0,
  size: 2,
  total: 3,
  totalPages: 2,
}

function Prueba({ alCambiar, pagina = PAGINA }: { alCambiar: (cambios: Partial<ParametrosPagina>) => void; pagina?: Pagina<Fila> }) {
  const [parametros, setParametros] = useState<ParametrosPagina>({ page: 0, size: 2, direction: 'ASC' })
  return (
    <DataTable
      etiqueta="Turnos"
      columnas={COLUMNAS}
      pagina={pagina}
      cargando={false}
      parametros={parametros}
      alCambiar={(cambios) => {
        alCambiar(cambios)
        setParametros((previos) => ({ ...previos, ...cambios }))
      }}
      vacio={<p>Sin turnos</p>}
      idDeFila={(fila) => String(fila.id)}
    />
  )
}

describe('DataTable', () => {
  it('muestra las filas y el resumen de la paginación del servidor', () => {
    render(<Prueba alCambiar={vi.fn()} />)
    const tabla = screen.getByRole('table', { name: 'Turnos' })
    expect(within(tabla).getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('Página 1 de 2 · 3 registros')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })

  it('pide la página siguiente', async () => {
    const alCambiar = vi.fn()
    render(<Prueba alCambiar={alCambiar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(alCambiar).toHaveBeenCalledWith({ page: 1, size: 2 })
  })

  it('ordena solo por las columnas habilitadas y alterna la dirección', async () => {
    const alCambiar = vi.fn()
    render(<Prueba alCambiar={alCambiar} />)
    expect(screen.queryByRole('button', { name: /Fecha/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(alCambiar).toHaveBeenLastCalledWith({ property: 'nombre', direction: 'ASC', page: 0 })
    expect(screen.getByRole('columnheader', { name: /Nombre/ })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(alCambiar).toHaveBeenLastCalledWith({ property: 'nombre', direction: 'DESC', page: 0 })
  })

  it('muestra el estado vacío cuando no hay filas', () => {
    render(<Prueba alCambiar={vi.fn()} pagina={{ items: [], page: 0, size: 2, total: 0, totalPages: 0 }} />)
    expect(screen.getByText('Sin turnos')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/components/data-table.test.tsx
```

Expected: FAIL — `Failed to resolve import "./columnas-tabla"` or `"./data-table"` (Vite reports whichever it resolves first; neither module exists yet).

- [ ] **Step 4: Implement the search fragments and the DataTable**

`src/lib/busqueda.ts`:

```ts
import { z } from 'zod'

export const esquemaPaginacion = {
  page: z.number().int().min(0).default(0).catch(0),
  size: z.number().int().min(1).max(100).default(10).catch(10),
  property: z.string().optional().catch(undefined),
  direction: z.enum(['ASC', 'DESC']).default('ASC').catch('ASC'),
}

export const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)

export const numeroOpcional = z.number().int().positive().optional().catch(undefined)
```

`src/components/columnas-tabla.ts`:

```ts
import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnHelper,
  type RowData,
} from '@tanstack/react-table'

export const caracteristicasTabla = tableFeatures({ rowSortingFeature, rowPaginationFeature })

export type CaracteristicasTabla = typeof caracteristicasTabla

export type ColumnasTabla<TDatos extends RowData> = ReturnType<ColumnHelper<CaracteristicasTabla, TDatos>['columns']>

export function ayudanteDeColumnas<TDatos extends RowData>() {
  return createColumnHelper<CaracteristicasTabla, TDatos>()
}
```

`src/components/data-table.tsx`:

```tsx
import { useTable, type PaginationState, type RowData, type SortingState, type Updater } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { caracteristicasTabla, type ColumnasTabla } from './columnas-tabla'

type Props<TDatos extends RowData> = {
  etiqueta: string
  columnas: ColumnasTabla<TDatos>
  pagina: Pagina<TDatos> | undefined
  cargando: boolean
  parametros: ParametrosPagina
  alCambiar: (cambios: Partial<ParametrosPagina>) => void
  vacio: ReactNode
  idDeFila: (fila: TDatos) => string
}

const SIN_FILAS: never[] = []

function resolver<T>(actualizador: Updater<T>, previo: T): T {
  return typeof actualizador === 'function' ? (actualizador as (anterior: T) => T)(previo) : actualizador
}

function IconoOrden({ direccion }: { direccion: false | 'asc' | 'desc' }) {
  if (direccion === 'asc') return <ArrowUp aria-hidden />
  if (direccion === 'desc') return <ArrowDown aria-hidden />
  return <ArrowUpDown aria-hidden className="opacity-50" />
}

export function DataTable<TDatos extends RowData>({
  etiqueta,
  columnas,
  pagina,
  cargando,
  parametros,
  alCambiar,
  vacio,
  idDeFila,
}: Props<TDatos>) {
  const pagination: PaginationState = { pageIndex: parametros.page, pageSize: parametros.size }
  const sorting: SortingState = parametros.property
    ? [{ id: parametros.property, desc: parametros.direction === 'DESC' }]
    : []
  const tabla = useTable({
    features: caracteristicasTabla,
    columns: columnas,
    data: pagina?.items ?? SIN_FILAS,
    getRowId: (fila) => idDeFila(fila),
    rowCount: pagina?.total ?? 0,
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: false,
    defaultColumn: { enableSorting: false },
    state: { pagination, sorting },
    onPaginationChange: (actualizador) => {
      const siguiente = resolver(actualizador, pagination)
      alCambiar({ page: siguiente.pageIndex, size: siguiente.pageSize })
    },
    onSortingChange: (actualizador) => {
      const [primero] = resolver(actualizador, sorting)
      alCambiar({ property: primero?.id, direction: primero?.desc ? 'DESC' : 'ASC', page: 0 })
    },
  })

  if (pagina && pagina.items.length === 0) return <>{vacio}</>

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label={etiqueta} aria-busy={cargando}>
          <TableHeader>
            {tabla.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id}>
                {grupo.headers.map((cabecera) => {
                  const direccion = cabecera.column.getIsSorted()
                  return (
                    <TableHead
                      key={cabecera.id}
                      aria-sort={direccion === 'asc' ? 'ascending' : direccion === 'desc' ? 'descending' : undefined}
                    >
                      {cabecera.isPlaceholder ? null : cabecera.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2"
                          onClick={cabecera.column.getToggleSortingHandler()}
                        >
                          <tabla.FlexRender header={cabecera} />
                          <IconoOrden direccion={direccion} />
                        </Button>
                      ) : (
                        <tabla.FlexRender header={cabecera} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pagina
              ? tabla.getRowModel().rows.map((fila) => (
                  <TableRow key={fila.id}>
                    {fila.getAllCells().map((celda) => (
                      <TableCell key={celda.id}>
                        <tabla.FlexRender cell={celda} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : Array.from({ length: 3 }, (_, indice) => (
                  <TableRow key={indice}>
                    <TableCell colSpan={columnas.length}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {pagina && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p className="tabular-nums">
            Página {pagina.page + 1} de {Math.max(tabla.getPageCount(), 1)} · {pagina.total}{' '}
            {pagina.total === 1 ? 'registro' : 'registros'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => tabla.previousPage()}
              disabled={!tabla.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => tabla.nextPage()} disabled={!tabla.getCanNextPage()}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the DataTable test**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/components/data-table.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Write the failing list tests**

`src/features/turnos/turnos-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function tablaDeTurnos() {
  await screen.findByText(/^Página \d+ de \d+/)
  return within(screen.getByRole('table', { name: 'Turnos programados' }))
}

function nombresEnTabla(tabla: ReturnType<typeof within>) {
  return tabla
    .getAllByRole('row')
    .slice(1)
    .map((fila: HTMLElement) => within(fila).getAllByRole('cell')[0]?.textContent)
}

describe('Programación de turnos', () => {
  it('CA-TUR-01 muestra nombre, sub fase, programa, fecha, cantidad de alumnos y de maniobras', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos')
    const tabla = await tablaDeTurnos()
    expect(tabla.getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual([
      'Nombre',
      'Sub fase',
      'Programa',
      'Fecha de evaluación',
      'Alumnos',
      'Maniobras',
    ])
    const fila = tabla.getByRole('link', { name: 'Navegación Nocturna' }).closest('tr')
    expect(fila).not.toBeNull()
    expect(within(fila as HTMLElement).getAllByRole('cell').map((celda) => celda.textContent)).toEqual([
      'Navegación Nocturna',
      'Navegación',
      'PDI',
      expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
      '2',
      '4',
    ])
    expect(tabla.getByRole('link', { name: 'Contacto Básico' })).toHaveAttribute('href', '/turnos/1')
  })

  it('CA-TUR-01 filtra por sub fase y guarda el filtro en la URL', async () => {
    await iniciarComo('jefe.operaciones')
    const { router, usuario } = renderApp('/turnos')
    await tablaDeTurnos()
    await usuario.selectOptions(await screen.findByLabelText('Sub fase'), 'Campos Extraños')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ idSubfase: 4, page: 0 }))
    await waitFor(async () => expect(nombresEnTabla(await tablaDeTurnos())).toEqual(['Campos Tácticos']))
  })

  it('CA-TUR-01 aplica el rango de fechas que llega en la URL', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos?desde=2024-03-01&hasta=2024-03-15')
    await waitFor(async () =>
      expect(nombresEnTabla(await tablaDeTurnos())).toEqual(['Contacto Básico', 'Contacto Intermedio', 'Contacto Avanzado']),
    )
    expect(screen.getByLabelText('Desde')).toHaveValue('2024-03-01')
    expect(screen.getByLabelText('Hasta')).toHaveValue('2024-03-15')
  })

  it('CA-TUR-01 pagina y conserva la página en la URL', async () => {
    await iniciarComo('jefe.operaciones')
    const { router, usuario } = renderApp('/turnos?size=6')
    expect(await screen.findByText('Página 1 de 2 · 9 registros')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 1, size: 6 }))
    expect(await screen.findByText('Página 2 de 2 · 9 registros')).toBeInTheDocument()
  })

  it('ordena por fecha de evaluación en el servidor', async () => {
    await iniciarComo('jefe.operaciones')
    const { router, usuario } = renderApp('/turnos')
    await tablaDeTurnos()
    await usuario.click(screen.getByRole('button', { name: /Fecha de evaluación/ }))
    await usuario.click(screen.getByRole('button', { name: /Fecha de evaluación/ }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ property: 'fechaEval', direction: 'DESC' }))
    await waitFor(async () => expect(nombresEnTabla(await tablaDeTurnos())[0]).toBe('Navegación Nocturna'))
  })

  it('solo quien programa turnos ve la acción de registrar', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/turnos')
    await tablaDeTurnos()
    expect(screen.queryByRole('link', { name: 'Registrar turno' })).not.toBeInTheDocument()
  })
})

describe('Mis turnos', () => {
  it('CA-TUR-14 el alumno ve solo sus propios turnos', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/mis-turnos')
    await screen.findByText(/^Página \d+ de \d+/)
    const tabla = within(screen.getByRole('table', { name: 'Mis turnos' }))
    expect(nombresEnTabla(tabla)).toEqual(['Contacto Básico', 'Navegación Nocturna'])
  })
})
```

- [ ] **Step 7: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/turnos-page.test.tsx
```

Expected: FAIL — `Unable to find an element with the text: /^Página \d+ de \d+/` (the placeholder pages have no table).

- [ ] **Step 8: Implement the search schema, columns and pages**

`src/features/turnos/schemas.ts`:

```ts
import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'

export const esquemaBusquedaTurnos = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idSubfase: numeroOpcional,
  desde: fechaOpcional,
  hasta: fechaOpcional,
})

export type BusquedaTurnos = z.infer<typeof esquemaBusquedaTurnos>

export const esquemaBusquedaPaginada = z.object(esquemaPaginacion)
```

`src/components/enlace.tsx`:

```tsx
import { createLink, type LinkComponent } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function EnlaceExterno({ className, ...props }: ComponentProps<'a'>) {
  return <a {...props} className={cn('font-medium text-primary underline-offset-4 hover:underline', className)} />
}

const EnlaceDelRouter = createLink(EnlaceExterno)

export const Enlace: LinkComponent<typeof EnlaceExterno> = (props) => <EnlaceDelRouter {...props} />
```

`src/features/turnos/columnas.tsx`:

```tsx
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { formatearFecha } from '@/lib/formato'
import type { TurnoResumen } from './api'

const ayudante = ayudanteDeColumnas<TurnoResumen>()

const nombre = ayudante.accessor('nombre', {
  header: 'Nombre',
  enableSorting: true,
  cell: (contexto) => (
    <Enlace to="/turnos/$id" params={{ id: String(contexto.row.original.id) }}>
      {contexto.getValue()}
    </Enlace>
  ),
})

const fecha = ayudante.accessor('fechaEval', {
  header: 'Fecha de evaluación',
  enableSorting: true,
  cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
})

const alumnos = ayudante.accessor('cantAlumno', {
  header: 'Alumnos',
  cell: (contexto) => <span className="tabular-nums">{contexto.getValue()}</span>,
})

const maniobras = ayudante.accessor('cantManiobra', {
  header: 'Maniobras',
  cell: (contexto) => <span className="tabular-nums">{contexto.getValue()}</span>,
})

export const COLUMNAS_TURNOS = ayudante.columns([
  nombre,
  ayudante.accessor('subfase', { header: 'Sub fase' }),
  ayudante.accessor('programa', { header: 'Programa' }),
  fecha,
  alumnos,
  maniobras,
])

export const COLUMNAS_MIS_TURNOS = ayudante.columns([
  nombre,
  ayudante.accessor('subfase', { header: 'Sub fase' }),
  fecha,
  maniobras,
])
```

Replace `src/features/turnos/turnos-page.tsx` with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CalendarPlus, PlaneTakeoff } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasCatalogos, PROGRAMAS } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { consultasTurnos } from './api'
import { COLUMNAS_TURNOS } from './columnas'
import type { BusquedaTurnos } from './schemas'

const ruta = getRouteApi('/_app/turnos/')

export function TurnosPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const puedeProgramar = usePuede('Manage Shifts')
  const subfases = useQuery(consultasCatalogos.subfases())
  const turnos = useQuery(consultasTurnos.lista(busqueda))

  function cambiar(cambios: Partial<BusquedaTurnos>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const hayFiltros = busqueda.idSubfase !== undefined || busqueda.desde !== undefined || busqueda.hasta !== undefined

  return (
    <>
      <PageHeader
        titulo="Programación de turnos"
        descripcion="Turnos de vuelo por sub fase, programa y fecha de evaluación."
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link to="/turnos/dia">
                <PlaneTakeoff aria-hidden />
                Orden de vuelo del día
              </Link>
            </Button>
            {puedeProgramar && (
              <Button asChild>
                <Link to="/turnos/nuevo">
                  <CalendarPlus aria-hidden />
                  Registrar turno
                </Link>
              </Button>
            )}
          </>
        }
      />
      <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <Field>
          <FieldLabel htmlFor="filtro-programa">Programa</FieldLabel>
          <NativeSelect
            id="filtro-programa"
            className="w-full"
            value={busqueda.programa}
            onChange={(evento) => cambiar({ programa: evento.target.value === 'PDE' ? 'PDE' : 'PDI' })}
          >
            {PROGRAMAS.map((programa) => (
              <NativeSelectOption key={programa} value={programa}>
                {programa}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-subfase">Sub fase</FieldLabel>
          <NativeSelect
            id="filtro-subfase"
            className="w-full"
            value={busqueda.idSubfase ?? ''}
            onChange={(evento) =>
              cambiar({ idSubfase: evento.target.value === '' ? undefined : Number(evento.target.value) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {(subfases.data ?? []).map((subfase) => (
              <NativeSelectOption key={subfase.id} value={subfase.id}>
                {subfase.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-desde">Desde</FieldLabel>
          <Input
            id="filtro-desde"
            type="date"
            value={busqueda.desde ?? ''}
            onChange={(evento) => cambiar({ desde: evento.target.value || undefined })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-hasta">Hasta</FieldLabel>
          <Input
            id="filtro-hasta"
            type="date"
            value={busqueda.hasta ?? ''}
            onChange={(evento) => cambiar({ hasta: evento.target.value || undefined })}
          />
        </Field>
        <Button
          variant="ghost"
          disabled={!hayFiltros}
          onClick={() => cambiar({ idSubfase: undefined, desde: undefined, hasta: undefined })}
        >
          Limpiar filtros
        </Button>
      </section>
      {(busqueda.desde === undefined) !== (busqueda.hasta === undefined) && (
        <p className="text-sm text-muted-foreground">Indique ambas fechas para filtrar por rango.</p>
      )}
      {turnos.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{turnos.error instanceof ApiError ? turnos.error.message : MENSAJE_GENERICO}</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          etiqueta="Turnos programados"
          columnas={COLUMNAS_TURNOS}
          pagina={turnos.data}
          cargando={turnos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(turno) => String(turno.id)}
          vacio={
            <EmptyState
              titulo="No hay turnos programados"
              descripcion={hayFiltros ? 'Ningún turno coincide con los filtros.' : 'Todavía no se programó ningún turno.'}
              accion={
                puedeProgramar ? (
                  <Button asChild size="sm">
                    <Link to="/turnos/nuevo">Registrar turno</Link>
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}
    </>
  )
}
```

Replace `src/features/turnos/mis-turnos-page.tsx` with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { useSesion } from '@/lib/auth/use-sesion'
import { consultasTurnos } from './api'
import { COLUMNAS_MIS_TURNOS } from './columnas'

const ruta = getRouteApi('/_app/mis-turnos')

export function MisTurnosPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const codPersona = useSesion()?.codPersona ?? ''
  const turnos = useQuery({ ...consultasTurnos.delAlumno(codPersona, busqueda), enabled: codPersona !== '' })

  return (
    <>
      <PageHeader titulo="Mis turnos" descripcion="Sus turnos de vuelo programados." />
      {codPersona === '' ? (
        <EmptyState titulo="Su usuario no tiene una persona asociada" descripcion="Consulte con el administrador." />
      ) : (
        <DataTable
          etiqueta="Mis turnos"
          columnas={COLUMNAS_MIS_TURNOS}
          pagina={turnos.data}
          cargando={turnos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(turno) => String(turno.id)}
          vacio={<EmptyState titulo="No tiene turnos programados" descripcion="Aquí aparecerán sus próximos vuelos." />}
        />
      )}
    </>
  )
}
```

Replace `src/routes/_app/turnos/index.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { TurnosPage } from '@/features/turnos/turnos-page'
import { esquemaBusquedaTurnos } from '@/features/turnos/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/')({
  validateSearch: esquemaBusquedaTurnos,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.turnos, context.sesion.actual()),
  component: TurnosPage,
})
```

Replace `src/routes/_app/mis-turnos.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { MisTurnosPage } from '@/features/turnos/mis-turnos-page'
import { esquemaBusquedaPaginada } from '@/features/turnos/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mis-turnos')({
  validateSearch: esquemaBusquedaPaginada,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misTurnos, context.sesion.actual()),
  component: MisTurnosPage,
})
```

- [ ] **Step 9: Regenerate the route tree and run the tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && pnpm test:run src/features/turnos src/components/data-table.test.tsx src/lib/auth
```

Expected: PASS — turnos-page 7, data-table 4, plus the earlier turno API and registry tests.

- [ ] **Step 10: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 202 tests.

- [ ] **Step 11: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add url-synced data table and turno lists"
```

---

### Task 9: Detalle de turno with mission timeline (CA-TUR-10, CA-TUR-11, CA-EVA-02, M1-6, M1-7)

**Files:**
- Create: `src/features/turnos/cargar.ts`, `src/features/turnos/components/linea-de-tiempo.tsx`
- Modify (full rewrite): `src/features/turnos/turno-page.tsx`, `src/routes/_app/turnos/$id/index.tsx`
- Test: `src/features/turnos/turno-page.test.tsx`

**Interfaces:**
- Consumes: `consultasTurnos.detalle`, `useEliminarTurno`, `TurnoDetalle`, `AlumnoDelTurno` (Task 5); `consultasEvaluaciones.delTurno` (Task 6); `etapasDeMision`, `EtapaMision`, `permiteCambios`, `MOTIVO_TURNO_VENCIDO` (Task 3); `veSoloLoPropio` (Task 7); M0's `SinPermisoError`, `ConfirmDialog`, `StatusBadge`, `PageHeader`, `formatearFecha`, `usePuede`, `useSesion`, `toast`.
- Produces:
  - `cargarTurnoVisible(queryClient, actual: Sesion | null, idTexto: string, codAlumno?: string): Promise<TurnoDetalle>` — `notFound()` for a non-numeric id, a 404 or an alumno who is not in the turno; `SinPermisoError` when an Alumno opens a turno (or another alumno's slot) that is not theirs. Used as the `loader` of every `/turnos/$id…` route.
  - `<LineaDeTiempo etapas />`: `list` named "Ciclo de la misión", four `listitem`s, each with "Completada"/"Pendiente" for screen readers.
  - Real `TurnoPage({ id })`: `h1` = turno name; "Datos del turno" (fecha, programa, fase, sub fase, instructor, aeronave with state badge); "Maniobras" table named "Maniobras del turno" with nota mínima badges; one `region` per alumno (named by the alumno) with horario, "Hoja de briefing", "Ver evaluación <código>" per existing evaluation, and "Registrar evaluación" only for the turno's instructor while the alumno has no evaluation in this turno; "Modificar"/"Eliminar" for `Manage Shifts`, disabled with `MOTIVO_TURNO_VENCIDO` once the date is today or earlier; delete confirms, toasts the backend message and returns to `/turnos`.

- [ ] **Step 1: Write the failing tests**

`src/features/turnos/turno-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirTurno(username: string, id: number) {
  await iniciarComo(username)
  const vista = renderApp(`/turnos/${id}`)
  await screen.findByRole('heading', { name: 'Alumnos y ciclo de la misión' })
  return vista
}

function etapas(alumno: string) {
  const tarjeta = screen.getByRole('region', { name: alumno })
  return within(within(tarjeta).getByRole('list', { name: 'Ciclo de la misión' }))
    .getAllByRole('listitem')
    .map((etapa) => etapa.textContent)
}

describe('Detalle de turno', () => {
  it('CA-TUR-10 muestra los datos, los alumnos con horario y las maniobras con nota mínima', async () => {
    await abrirTurno('jefe.operaciones', 8)
    expect(screen.getByRole('heading', { level: 1, name: 'Navegación Nocturna' })).toBeInTheDocument()
    expect(screen.getByText('Juan Torres')).toBeInTheDocument()
    expect(screen.getByText('Robinson R22')).toBeInTheDocument()
    const oscar = screen.getByRole('region', { name: 'Oscar Lopez' })
    expect(within(oscar).getAllByText('09:00 – 10:30').length).toBeGreaterThan(0)
    const maniobras = within(screen.getByRole('table', { name: 'Maniobras del turno' }))
    expect(maniobras.getAllByRole('row').slice(1).map((fila) => fila.textContent)).toEqual([
      'Maniobra 1R (Regular)',
      'Maniobra 2B (Bueno)',
      'Maniobra 3E (Excelente)',
      'Maniobra 4I (Insuficiente)',
    ])
  })

  it('CA-TUR-10 muestra la línea de tiempo de la misión por alumno', async () => {
    await abrirTurno('jefe.operaciones', 8)
    expect(etapas('Ana Torres')).toEqual([
      'Briefing diarioT−2 h · 09:00Pendiente',
      'Briefing de detalleT−1 h · 10:00Pendiente',
      'Vuelo11:00 – 12:30Pendiente',
      'DebriefingEvaluación pendientePendiente',
    ])
  })

  it('CA-TUR-10 el debriefing figura como hecho cuando la evaluación existe', async () => {
    await abrirTurno('jefe.operaciones', 3)
    await waitFor(() =>
      expect(etapas('Pedro Rodriguez')).toEqual([
        'Briefing diarioT−2 h · 11:00Completada',
        'Briefing de detalleT−1 h · 12:00Completada',
        'Vuelo13:00 – 14:30Completada',
        'DebriefingEvaluación registradaCompletada',
      ]),
    )
    expect(screen.getByRole('link', { name: 'Ver evaluación 555555-3' })).toHaveAttribute('href', '/evaluaciones/555555-3')
  })

  it('CA-TUR-11 con la fecha vencida no permite modificar ni eliminar y explica el motivo', async () => {
    await abrirTurno('jefe.operaciones', 1)
    expect(screen.getByRole('button', { name: 'Modificar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText('El turno ya no se puede modificar porque su fecha pasó.')).toBeInTheDocument()
  })

  it('CA-TUR-11 eliminar pide confirmación y vuelve a la programación', async () => {
    const { usuario, router } = await abrirTurno('jefe.operaciones', 8)
    expect(screen.getByRole('link', { name: 'Modificar' })).toHaveAttribute('href', '/turnos/8/editar')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Se eliminará «Navegación Nocturna»')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Turno eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/turnos'))
  })

  it('M1-2 muestra el mensaje del backend cuando rechaza la eliminación', async () => {
    server.use(
      http.delete(`${config.sigedaApiUrl}/api/turnos/:id`, () =>
        HttpResponse.json(
          { status: 410, error: 'Fecha de modificación expiró', message: 'No se puede modificar. El turno ya ha sido evaluado.' },
          { status: 410 },
        ),
      ),
    )
    const { usuario } = await abrirTurno('jefe.operaciones', 8)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('No se puede modificar. El turno ya ha sido evaluado.')).toBeInTheDocument()
  })

  it('solo quien programa turnos ve modificar y eliminar', async () => {
    await abrirTurno('instructor.perez', 8)
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByText('El turno ya no se puede modificar porque su fecha pasó.')).not.toBeInTheDocument()
  })

  it('CA-EVA-02 el instructor asignado ve registrar evaluación para el alumno aún no evaluado', async () => {
    await abrirTurno('instructor.perez', 2)
    expect(await screen.findByRole('link', { name: 'Registrar evaluación' })).toHaveAttribute(
      'href',
      '/turnos/2/evaluar/222222',
    )
  })

  it('CA-EVA-02 otro instructor no ve la acción', async () => {
    await abrirTurno('instructor.mendoza', 2)
    await screen.findByRole('link', { name: 'Hoja de briefing' })
    expect(screen.queryByRole('link', { name: 'Registrar evaluación' })).not.toBeInTheDocument()
  })

  it('CA-EVA-02 una vez registrada la evaluación ya no se ofrece registrarla', async () => {
    await abrirTurno('instructor.perez', 1)
    expect(await screen.findByRole('link', { name: 'Ver evaluación 111111-1' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar evaluación' })).not.toBeInTheDocument()
  })

  it('CA-TUR-14 el alumno no puede abrir un turno que no es suyo', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos/2')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-TUR-14 el alumno abre sus propios turnos', async () => {
    await abrirTurno('alumno.lopez', 1)
    expect(screen.getByRole('heading', { level: 1, name: 'Contacto Básico' })).toBeInTheDocument()
  })

  it('un turno inexistente muestra la página no encontrada', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/999')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/turno-page.test.tsx
```

Expected: FAIL — `Unable to find role="heading" and name "Alumnos y ciclo de la misión"`.

- [ ] **Step 3: Implement the loader and the timeline**

`src/features/turnos/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { SinPermisoError } from '@/lib/auth/guardas'
import { veSoloLoPropio } from '@/lib/auth/pantallas'
import type { Sesion } from '@/lib/auth/sesion'
import { consultasTurnos, type TurnoDetalle } from './api'

export async function cargarTurnoVisible(
  queryClient: QueryClient,
  actual: Sesion | null,
  idTexto: string,
  codAlumno?: string,
): Promise<TurnoDetalle> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  let turno: TurnoDetalle
  try {
    turno = await queryClient.ensureQueryData(consultasTurnos.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
  if (codAlumno !== undefined && !turno.alumnos.some((alumno) => alumno.codAlumno === codAlumno)) throw notFound()
  if (actual && veSoloLoPropio(actual)) {
    const propio = turno.alumnos.some((alumno) => alumno.codAlumno === actual.codPersona)
    if (!propio || (codAlumno !== undefined && codAlumno !== actual.codPersona)) throw new SinPermisoError()
  }
  return turno
}
```

`src/features/turnos/components/linea-de-tiempo.tsx`:

```tsx
import { Circle, CircleCheck } from 'lucide-react'
import type { EtapaMision } from '@/lib/dominio/briefing'
import { cn } from '@/lib/utils'

export function LineaDeTiempo({ etapas }: { etapas: EtapaMision[] }) {
  return (
    <ol aria-label="Ciclo de la misión" className="grid gap-3 sm:grid-cols-4">
      {etapas.map((etapa) => (
        <li key={etapa.clave} data-hecha={etapa.hecha} className="flex items-start gap-2">
          {etapa.hecha ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-tono-exito" aria-hidden />
          ) : (
            <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="grid gap-0.5">
            <p className={cn('text-sm font-medium', !etapa.hecha && 'text-muted-foreground')}>{etapa.titulo}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{etapa.detalle}</p>
            <span className="sr-only">{etapa.hecha ? 'Completada' : 'Pendiente'}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 4: Implement the detail page and its loader**

Replace `src/features/turnos/turno-page.tsx` with:

```tsx
import { useQueries, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ClipboardPen, FileText, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultasEvaluaciones } from '@/features/evaluaciones/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede, useSesion } from '@/lib/auth/use-sesion'
import { etapasDeMision } from '@/lib/dominio/briefing'
import { MOTIVO_TURNO_VENCIDO, permiteCambios } from '@/lib/dominio/turno'
import { formatearFecha } from '@/lib/formato'
import { consultasTurnos, useEliminarTurno, type AlumnoDelTurno, type TurnoDetalle } from './api'
import { LineaDeTiempo } from './components/linea-de-tiempo'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

type PropsAlumno = {
  turno: TurnoDetalle
  alumno: AlumnoDelTurno
  evaluaciones: { codigo: string }[] | undefined
  puedeEvaluar: boolean
}

function TarjetaAlumno({ turno, alumno, evaluaciones, puedeEvaluar }: PropsAlumno) {
  const evaluada = (evaluaciones?.length ?? 0) > 0
  const idTitulo = `alumno-${alumno.codAlumno}`
  const params = { id: String(turno.id), alumno: alumno.codAlumno }

  return (
    <Card aria-labelledby={idTitulo} role="region">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5">
          <CardTitle>
            <h3 id={idTitulo}>{alumno.alumno}</h3>
          </CardTitle>
          <p className="text-sm text-muted-foreground tabular-nums">
            {alumno.horaInicio} – {alumno.horaFin}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/turnos/$id/briefing/$alumno" params={params}>
              <FileText aria-hidden />
              Hoja de briefing
            </Link>
          </Button>
          {evaluaciones?.map((evaluacion) => (
            <Button key={evaluacion.codigo} variant="outline" size="sm" asChild>
              <Link to="/evaluaciones/$cod" params={{ cod: evaluacion.codigo }}>
                Ver evaluación {evaluacion.codigo}
              </Link>
            </Button>
          ))}
          {puedeEvaluar && evaluaciones !== undefined && !evaluada && (
            <Button size="sm" asChild>
              <Link to="/turnos/$id/evaluar/$alumno" params={params}>
                <ClipboardPen aria-hidden />
                Registrar evaluación
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <LineaDeTiempo etapas={etapasDeMision({ fechaEval: turno.fechaEval, ...alumno }, evaluada)} />
      </CardContent>
    </Card>
  )
}

export function TurnoPage({ id }: { id: number }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const actual = useSesion()
  const puedeGestionar = usePuede('Manage Shifts')
  const puedeEscribir = usePuede('Write')
  const navegar = useNavigate()
  const eliminar = useEliminarTurno()
  const evaluaciones = useQueries({
    queries: turno.alumnos.map((alumno) => consultasEvaluaciones.delTurno(alumno.codAlumno, turno.id)),
  })
  const modificable = permiteCambios(turno.fechaEval)
  const esSuInstructor = puedeEscribir && actual?.codPersona != null && actual.codPersona === turno.codInstructor

  function confirmarEliminacion() {
    eliminar.mutate(turno.id, {
      onSuccess: (mensaje) => {
        toast.success(mensaje)
        void navegar({ to: '/turnos' })
      },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
    })
  }

  return (
    <>
      <PageHeader
        titulo={turno.nombre}
        descripcion={`${turno.subfase} · ${turno.fase} · ${turno.programa}`}
        acciones={
          puedeGestionar && (
            <>
              {modificable ? (
                <Button variant="outline" asChild>
                  <Link to="/turnos/$id/editar" params={{ id: String(turno.id) }}>
                    <Pencil aria-hidden />
                    Modificar
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <Pencil aria-hidden />
                  Modificar
                </Button>
              )}
              <ConfirmDialog
                disparador={
                  <Button variant="destructive" disabled={!modificable || eliminar.isPending}>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                }
                titulo="¿Eliminar el turno?"
                descripcion={`Se eliminará «${turno.nombre}» con sus alumnos y maniobras. Esta acción no se puede deshacer.`}
                confirmar="Eliminar"
                destructivo
                alConfirmar={confirmarEliminacion}
              />
            </>
          )
        }
      />
      {puedeGestionar && !modificable && <p className="text-sm text-muted-foreground">{MOTIVO_TURNO_VENCIDO}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Datos del turno</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato etiqueta="Fecha de evaluación">
                <span className="tabular-nums">{formatearFecha(turno.fechaEval)}</span>
              </Dato>
              <Dato etiqueta="Programa">{turno.programa}</Dato>
              <Dato etiqueta="Fase">{turno.fase || '—'}</Dato>
              <Dato etiqueta="Sub fase">{turno.subfase}</Dato>
              <Dato etiqueta="Instructor">{turno.instructor ?? 'Sin asignar'}</Dato>
              <Dato etiqueta="Aeronave">
                {turno.aeronave ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {turno.aeronave.nombre}
                    <StatusBadge vocabulario="aeronave" valor={turno.aeronave.estado} />
                  </span>
                ) : (
                  'Sin asignar'
                )}
              </Dato>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Maniobras</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table aria-label="Maniobras del turno">
              <TableHeader>
                <TableRow>
                  <TableHead>Maniobra</TableHead>
                  <TableHead>Nota mínima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turno.maniobras.map((item) => (
                  <TableRow key={item.maniobra.id}>
                    <TableCell>{item.maniobra.nombre}</TableCell>
                    <TableCell>
                      <StatusBadge vocabulario="calificativo" valor={item.notaMin} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <section aria-labelledby="titulo-alumnos" className="grid gap-4">
        <h2 id="titulo-alumnos" className="text-lg font-semibold tracking-tight">
          Alumnos y ciclo de la misión
        </h2>
        {turno.alumnos.map((alumno, indice) => (
          <TarjetaAlumno
            key={alumno.codAlumno}
            turno={turno}
            alumno={alumno}
            evaluaciones={evaluaciones[indice]?.data}
            puedeEvaluar={esSuInstructor}
          />
        ))}
      </section>
    </>
  )
}
```

Replace `src/routes/_app/turnos/$id/index.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarTurnoVisible } from '@/features/turnos/cargar'
import { TurnoPage } from '@/features/turnos/turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.turno, context.sesion.actual()),
  loader: ({ context, params }) => cargarTurnoVisible(context.queryClient, context.sesion.actual(), params.id),
  component: RutaTurno,
})

function RutaTurno() {
  const { id } = Route.useParams()
  return <TurnoPage id={Number(id)} />
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && pnpm test:run src/features/turnos src/components/migas.test.tsx
```

Expected: PASS — turno-page 13, plus the earlier turno and breadcrumb tests.

- [ ] **Step 6: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 215 tests.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add turno detail with mission timeline"
```

---

### Task 10: Registrar turno (CA-TUR-02..09, CA-TUR-13, M1-10)

**Files:**
- Modify (full rewrite): `src/features/turnos/schemas.ts`, `src/features/turnos/registrar-turno-page.tsx`
- Create: `src/features/turnos/components/formulario-turno.tsx`
- Test: `src/features/turnos/schemas.test.ts`, `src/features/turnos/registrar-turno-page.test.tsx`

**Interfaces:**
- Consumes: `esquemaPaginacion`, `fechaOpcional`, `numeroOpcional` (Task 8); `PROGRAMAS`, `Programa`, `consultasCatalogos`, `agruparPorGrupo` (Task 4); `consultasTurnos.ocupacion`, `useGuardarTurno`, `CuerpoTurno`, `TurnoDetalle` (Task 5); `esFechaIso`, `esHora`, `hoyIso`, `PATRON_HORA`, `esNotaDirbe`, `NOTAS_DIRBE`, `conflictosDeAeronave` (Task 3); `termino` (M0/Task 3); `aplicarErroresDeCampo`, `ApiError`, `MENSAJE_GENERICO` (Task 1/M0); shadcn `AlertDialog*`, `Card*`, `Field*`, `Input`, `NativeSelect*`.
- Produces:
  - `schemas.ts` keeps `esquemaBusquedaTurnos`, `BusquedaTurnos`, `esquemaBusquedaPaginada` and adds `MENSAJE_NOMBRE_TURNO`, `MENSAJE_HORA`, `crearEsquemaTurno(hoy: string, aeronavesDisponibles: ReadonlySet<number>)`, `type ValoresTurno` (all string fields: `nombre, fechaEval, programa, idSubfase, codInstructor, idAeronave, alumnosTurno[{ codAlumno, horaInicio, horaFin }], maniobrasTurno[{ idManiobra, notaMin }]`), `turnoVacio(programa?)`, `valoresDesdeTurno(turno: TurnoDetalle, idSubfase: number | undefined)`, `aCuerpoTurno(valores): CuerpoTurno`.
  - `<FormularioTurno valoresIniciales idTurno? />` (Task 11 reuses it with `idTurno`): labels `Nombre`, `Fecha de evaluación`, `Programa`, `Sub fase`, `Instructor`, `Aeronave`, rows `Alumno N`/`Inicio N`/`Fin N` and `Maniobra N`/`Nota mínima N`, buttons `Agregar alumno`, `Agregar maniobra`, `Quitar alumno N`, `Quitar maniobra N`, `Guardar turno`; dialogs "¿Cambiar la sub fase?" (`Conservar sub fase` / `Cambiar y quitar maniobras`) and "¿Guardar con horarios superpuestos?" (`Corregir horarios` / `Guardar de todos modos`); aircraft overlap alert "Horario superpuesto en la aeronave"; on success toasts the backend message and opens `/turnos/<id>`; backend field errors go under each field (`aeronave` → `idAeronave`, `nota_min` → `notaMin`).

- [ ] **Step 1: Write the failing schema tests**

`src/features/turnos/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { aCuerpoTurno, crearEsquemaTurno, turnoVacio, type ValoresTurno } from './schemas'

const esquema = crearEsquemaTurno('2026-09-19', new Set([1]))

function valido(cambios: Partial<ValoresTurno> = {}): ValoresTurno {
  return {
    ...turnoVacio(),
    nombre: 'Navegación Diurna',
    fechaEval: '2026-09-30',
    idSubfase: '2',
    codInstructor: '444444',
    idAeronave: '1',
    alumnosTurno: [{ codAlumno: '222222', horaInicio: '08:00', horaFin: '09:30' }],
    maniobrasTurno: [{ idManiobra: '1', notaMin: 'B' }],
    ...cambios,
  }
}

function mensajes(valores: ValoresTurno) {
  const resultado = esquema.safeParse(valores)
  return resultado.success ? [] : resultado.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

describe('esquema del turno', () => {
  it('acepta un turno completo', () => {
    expect(mensajes(valido())).toEqual([])
  })

  it('CA-TUR-02 exige una fecha posterior a hoy', () => {
    expect(mensajes(valido({ fechaEval: '2026-09-19' }))).toEqual(['fechaEval: La fecha del turno debe ser posterior a hoy.'])
  })

  it('CA-TUR-03 exige de 10 a 30 caracteres que no sean solo espacios', () => {
    expect(mensajes(valido({ nombre: '            ' }))[0]).toBe('nombre: Ingrese el nombre del turno.')
    expect(mensajes(valido({ nombre: 'Corto' }))).toEqual(['nombre: Nombre debe tener de 10 a 30 caracteres.'])
    expect(mensajes(valido({ nombre: 'N'.repeat(31) }))).toEqual(['nombre: Nombre debe tener de 10 a 30 caracteres.'])
  })

  it('CA-TUR-04 exige al menos un alumno y una maniobra, sin repetir', () => {
    expect(mensajes(valido({ alumnosTurno: [], maniobrasTurno: [] }))).toEqual([
      'alumnosTurno: La asignación de alumnos es requerida',
      'maniobrasTurno: La asignación de maniobras es requerida',
    ])
    expect(
      mensajes(
        valido({
          alumnosTurno: [
            { codAlumno: '222222', horaInicio: '08:00', horaFin: '09:00' },
            { codAlumno: '222222', horaInicio: '10:00', horaFin: '11:00' },
          ],
          maniobrasTurno: [
            { idManiobra: '1', notaMin: 'B' },
            { idManiobra: '1', notaMin: 'R' },
          ],
        }),
      ),
    ).toEqual(['alumnosTurno.1.codAlumno: El alumno está repetido.', 'maniobrasTurno.1.idManiobra: La maniobra está repetida.'])
  })

  it('CA-TUR-06 solo acepta notas mínimas D, I, R, B o E', () => {
    expect(mensajes(valido({ maniobrasTurno: [{ idManiobra: '1', notaMin: 'X' }] }))).toEqual([
      'maniobrasTurno.0.notaMin: Ingresar nota mínima de maniobra.',
    ])
  })

  it('CA-TUR-07 exige HH:mm y fin posterior a inicio', () => {
    expect(mensajes(valido({ alumnosTurno: [{ codAlumno: '222222', horaInicio: '8:00', horaFin: '09:30' }] }))).toEqual([
      'alumnosTurno.0.horaInicio: La hora debe estar en formato HH:mm (09:00, 14:00)',
    ])
    expect(mensajes(valido({ alumnosTurno: [{ codAlumno: '222222', horaInicio: '10:00', horaFin: '09:30' }] }))).toEqual([
      'alumnosTurno.0.horaFin: La hora de fin debe ser posterior a la de inicio.',
    ])
  })

  it('CA-TUR-08 y CA-TUR-09 exigen instructor y una aeronave disponible', () => {
    expect(mensajes(valido({ codInstructor: '', idAeronave: '' }))).toEqual([
      'codInstructor: Instructor debe ser asignado.',
      'idAeronave: La asignación de aeronave es requerida.',
    ])
    expect(mensajes(valido({ idAeronave: '2' }))).toEqual(['idAeronave: Asignar aeronave disponible.'])
  })

  it('arma el cuerpo que espera el backend', () => {
    expect(aCuerpoTurno(valido({ nombre: '  Navegación Diurna  ' }))).toEqual({
      nombre: 'Navegación Diurna',
      fechaEval: '2026-09-30',
      programa: 'PDI',
      idSubfase: 2,
      codInstructor: '444444',
      aeronave: { id: 1 },
      alumnosTurno: [{ codAlumno: '222222', horaInicio: '08:00', horaFin: '09:30' }],
      maniobrasTurno: [{ idManiobra: 1, nota_min: 'B' }],
    })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/schemas.test.ts
```

Expected: FAIL — `crearEsquemaTurno is not a function` (or the equivalent missing-export error).

- [ ] **Step 3: Write the form schema**

Replace `src/features/turnos/schemas.ts` with:

```ts
import { z } from 'zod'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { esquemaPaginacion, fechaOpcional, numeroOpcional } from '@/lib/busqueda'
import { esFechaIso, esHora, PATRON_HORA } from '@/lib/dominio/calendario'
import { esNotaDirbe } from '@/lib/dominio/dirbe'
import type { CuerpoTurno, TurnoDetalle } from './api'

export const esquemaBusquedaTurnos = z.object({
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idSubfase: numeroOpcional,
  desde: fechaOpcional,
  hasta: fechaOpcional,
})

export type BusquedaTurnos = z.infer<typeof esquemaBusquedaTurnos>

export const esquemaBusquedaPaginada = z.object(esquemaPaginacion)

export const MENSAJE_NOMBRE_TURNO = 'Nombre debe tener de 10 a 30 caracteres.'
export const MENSAJE_HORA = 'La hora debe estar en formato HH:mm (09:00, 14:00)'

function marcarRepetidos(
  valores: string[],
  lista: 'alumnosTurno' | 'maniobrasTurno',
  campo: 'codAlumno' | 'idManiobra',
  mensaje: string,
  contexto: z.RefinementCtx,
) {
  const vistos = new Set<string>()
  valores.forEach((valor, indice) => {
    if (valor !== '' && vistos.has(valor)) contexto.addIssue({ code: 'custom', message: mensaje, path: [lista, indice, campo] })
    vistos.add(valor)
  })
}

export function crearEsquemaTurno(hoy: string, aeronavesDisponibles: ReadonlySet<number>) {
  return z
    .object({
      nombre: z.string().trim().min(1, 'Ingrese el nombre del turno.').min(10, MENSAJE_NOMBRE_TURNO).max(30, MENSAJE_NOMBRE_TURNO),
      fechaEval: z
        .string()
        .refine(esFechaIso, 'Ingresar fecha válida.')
        .refine((fecha) => fecha > hoy, 'La fecha del turno debe ser posterior a hoy.'),
      programa: z.string().refine((valor) => valor === 'PDI' || valor === 'PDE', 'Ingresar programa válido.'),
      idSubfase: z.string().min(1, 'La subfase es requerida.'),
      codInstructor: z.string().min(1, 'Instructor debe ser asignado.'),
      idAeronave: z
        .string()
        .min(1, 'La asignación de aeronave es requerida.')
        .refine((valor) => valor === '' || aeronavesDisponibles.has(Number(valor)), 'Asignar aeronave disponible.'),
      alumnosTurno: z
        .array(
          z.object({
            codAlumno: z.string().min(1, 'Seleccione un alumno.'),
            horaInicio: z.string().regex(PATRON_HORA, MENSAJE_HORA),
            horaFin: z.string().regex(PATRON_HORA, MENSAJE_HORA),
          }),
        )
        .min(1, 'La asignación de alumnos es requerida'),
      maniobrasTurno: z
        .array(
          z.object({
            idManiobra: z.string().min(1, 'Seleccione una maniobra.'),
            notaMin: z.string().refine(esNotaDirbe, 'Ingresar nota mínima de maniobra.'),
          }),
        )
        .min(1, 'La asignación de maniobras es requerida'),
    })
    .superRefine((valores, contexto) => {
      valores.alumnosTurno.forEach((alumno, indice) => {
        if (esHora(alumno.horaInicio) && esHora(alumno.horaFin) && alumno.horaFin <= alumno.horaInicio) {
          contexto.addIssue({
            code: 'custom',
            message: 'La hora de fin debe ser posterior a la de inicio.',
            path: ['alumnosTurno', indice, 'horaFin'],
          })
        }
      })
      marcarRepetidos(
        valores.alumnosTurno.map((alumno) => alumno.codAlumno),
        'alumnosTurno',
        'codAlumno',
        'El alumno está repetido.',
        contexto,
      )
      marcarRepetidos(
        valores.maniobrasTurno.map((maniobra) => maniobra.idManiobra),
        'maniobrasTurno',
        'idManiobra',
        'La maniobra está repetida.',
        contexto,
      )
    })
}

export type ValoresTurno = z.input<ReturnType<typeof crearEsquemaTurno>>

export function turnoVacio(programa: Programa = 'PDI'): ValoresTurno {
  return {
    nombre: '',
    fechaEval: '',
    programa,
    idSubfase: '',
    codInstructor: '',
    idAeronave: '',
    alumnosTurno: [],
    maniobrasTurno: [],
  }
}

export function valoresDesdeTurno(turno: TurnoDetalle, idSubfase: number | undefined): ValoresTurno {
  return {
    nombre: turno.nombre,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    idSubfase: idSubfase === undefined ? '' : String(idSubfase),
    codInstructor: turno.codInstructor ?? '',
    idAeronave: turno.aeronave ? String(turno.aeronave.id) : '',
    alumnosTurno: turno.alumnos.map(({ codAlumno, horaInicio, horaFin }) => ({ codAlumno, horaInicio, horaFin })),
    maniobrasTurno: turno.maniobras.map((item) => ({ idManiobra: String(item.maniobra.id), notaMin: item.notaMin })),
  }
}

export function aCuerpoTurno(valores: ValoresTurno): CuerpoTurno {
  return {
    nombre: valores.nombre.trim(),
    fechaEval: valores.fechaEval,
    programa: valores.programa === 'PDE' ? 'PDE' : 'PDI',
    idSubfase: Number(valores.idSubfase),
    codInstructor: valores.codInstructor,
    aeronave: { id: Number(valores.idAeronave) },
    alumnosTurno: valores.alumnosTurno.map(({ codAlumno, horaInicio, horaFin }) => ({ codAlumno, horaInicio, horaFin })),
    maniobrasTurno: valores.maniobrasTurno.flatMap((maniobra) =>
      esNotaDirbe(maniobra.notaMin) ? [{ idManiobra: Number(maniobra.idManiobra), nota_min: maniobra.notaMin }] : [],
    ),
  }
}
```

- [ ] **Step 4: Run the schema tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/schemas.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Write the failing page tests**

`src/features/turnos/registrar-turno-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

const EN_UNA_SEMANA = sumarDias(hoyIso(), 7)
const EN_DIEZ_DIAS = sumarDias(hoyIso(), 10)

async function abrirFormulario() {
  await iniciarComo('jefe.operaciones')
  const vista = renderApp('/turnos/nuevo')
  await screen.findByRole('heading', { name: 'Registrar turno' })
  await screen.findByRole('option', { name: 'Robinson R22' })
  await screen.findByRole('option', { name: 'Navegación' })
  return vista
}

async function llenarDatos(usuario: UserEvent, fecha = EN_DIEZ_DIAS) {
  await usuario.type(screen.getByLabelText('Nombre'), 'Navegación Diurna')
  await usuario.type(screen.getByLabelText('Fecha de evaluación'), fecha)
  await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
  await usuario.selectOptions(await screen.findByLabelText('Instructor'), 'Juan Torres Perez')
  await usuario.selectOptions(screen.getByLabelText('Aeronave'), 'Robinson R22')
}

async function agregarAlumno(usuario: UserEvent, numero: number, nombre: string, inicio: string, fin: string) {
  await usuario.click(screen.getByRole('button', { name: 'Agregar alumno' }))
  await usuario.selectOptions(await screen.findByLabelText(`Alumno ${numero}`), nombre)
  await usuario.type(screen.getByLabelText(`Inicio ${numero}`), inicio)
  await usuario.type(screen.getByLabelText(`Fin ${numero}`), fin)
}

async function agregarManiobra(usuario: UserEvent, numero: number, nombre: string, nota: string) {
  await usuario.click(screen.getByRole('button', { name: 'Agregar maniobra' }))
  await usuario.selectOptions(await screen.findByLabelText(`Maniobra ${numero}`), nombre)
  await usuario.selectOptions(screen.getByLabelText(`Nota mínima ${numero}`), nota)
}

function guardar(usuario: UserEvent) {
  return usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
}

describe('Registrar turno', () => {
  it('CA-TUR-04 y CA-TUR-09 exigen alumnos, maniobras, instructor y aeronave', async () => {
    const { usuario } = await abrirFormulario()
    await guardar(usuario)
    expect(await screen.findByText('La asignación de alumnos es requerida')).toBeInTheDocument()
    expect(screen.getByText('La asignación de maniobras es requerida')).toBeInTheDocument()
    expect(screen.getByText('Instructor debe ser asignado.')).toBeInTheDocument()
    expect(screen.getByText('La asignación de aeronave es requerida.')).toBeInTheDocument()
    expect(screen.getByText('La subfase es requerida.')).toBeInTheDocument()
  })

  it('CA-TUR-03 rechaza nombres de solo espacios o fuera de 10 a 30 caracteres', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), '            ')
    await guardar(usuario)
    expect(await screen.findByText('Ingrese el nombre del turno.')).toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await guardar(usuario)
    expect(await screen.findByText('Nombre debe tener de 10 a 30 caracteres.')).toBeInTheDocument()
  })

  it('CA-TUR-02 la fecha de evaluación debe ser posterior a hoy', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Fecha de evaluación'), hoyIso())
    await guardar(usuario)
    expect(await screen.findByText('La fecha del turno debe ser posterior a hoy.')).toBeInTheDocument()
  })

  it('CA-TUR-08 las aeronaves que no están disponibles no se pueden elegir', async () => {
    await abrirFormulario()
    expect(screen.getByRole('option', { name: 'Robinson R22' })).toBeEnabled()
    expect(screen.getByRole('option', { name: 'Enstrom 280FX · En mantenimiento' })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Schweizer S-300C · No disponible' })).toBeDisabled()
  })

  it('CA-TUR-05 ofrece solo las maniobras de la sub fase elegida', async () => {
    const { usuario } = await abrirFormulario()
    expect(screen.getByRole('button', { name: 'Agregar maniobra' })).toBeDisabled()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Campos Extraños')
    await usuario.click(screen.getByRole('button', { name: 'Agregar maniobra' }))
    const selector = await screen.findByLabelText('Maniobra 1')
    await waitFor(() =>
      expect(within(selector).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
        'Elija una maniobra',
        'Maniobra 7',
        'Maniobra 8',
      ]),
    )
  })

  it('CA-TUR-05 cambiar la sub fase pide confirmación y limpia las maniobras', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
    await agregarManiobra(usuario, 1, 'Maniobra 2', 'B')
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Instrumentos')
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Cambiar la sub fase?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Conservar sub fase' }))
    expect(screen.getByLabelText('Sub fase')).toHaveValue('2')
    expect(screen.getByLabelText('Maniobra 1')).toHaveValue('2')
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Instrumentos')
    await usuario.click(await screen.findByRole('button', { name: 'Cambiar y quitar maniobras' }))
    await waitFor(() => expect(screen.getByLabelText('Sub fase')).toHaveValue('3'))
    expect(screen.queryByLabelText('Maniobra 1')).not.toBeInTheDocument()
  })

  it('CA-TUR-06 la nota mínima solo ofrece D, I, R, B o E', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
    await usuario.click(screen.getByRole('button', { name: 'Agregar maniobra' }))
    const notas = within(await screen.findByLabelText('Nota mínima 1')).getAllByRole('option')
    expect(notas.map((opcion) => opcion.textContent)).toEqual(['—', 'D', 'I', 'R', 'B', 'E'])
  })

  it('CA-TUR-07 exige que la hora de fin sea posterior a la de inicio', async () => {
    const { usuario } = await abrirFormulario()
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '10:00', '09:00')
    await guardar(usuario)
    expect(await screen.findByText('La hora de fin debe ser posterior a la de inicio.')).toBeInTheDocument()
  })

  it('CA-TUR-04 no permite repetir un alumno', async () => {
    const { usuario } = await abrirFormulario()
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:00')
    await agregarAlumno(usuario, 2, 'Juan Falconi Fernandez', '10:00', '11:00')
    await guardar(usuario)
    expect(await screen.findByText('El alumno está repetido.')).toBeInTheDocument()
  })

  it('registra el turno y abre su detalle', async () => {
    const { usuario, router } = await abrirFormulario()
    await llenarDatos(usuario)
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:30')
    await agregarManiobra(usuario, 1, 'Maniobra 1', 'B')
    await guardar(usuario)
    expect(await screen.findByText('Turno guardado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/turnos/10'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Navegación Diurna' })).toBeInTheDocument()
  })

  it('CA-TUR-07 advierte el cruce con otro turno de la aeronave antes de guardar', async () => {
    const { usuario } = await abrirFormulario()
    await llenarDatos(usuario, EN_UNA_SEMANA)
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:30')
    await agregarManiobra(usuario, 1, 'Maniobra 1', 'B')
    const aviso = await screen.findByText('Horario superpuesto en la aeronave')
    expect(aviso.parentElement).toHaveTextContent('se cruza con «Instrumentos Básicos» (07:30–08:30)')
    expect(aviso.parentElement).toHaveTextContent('se cruza con «Navegación Nocturna» (09:00–12:30)')
    await guardar(usuario)
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Guardar con horarios superpuestos?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar de todos modos' }))
    expect(
      await screen.findByText('El alumno 222222 tiene un horario que se cruza con otro turno de la aeronave.'),
    ).toBeInTheDocument()
  })

  it('CA-TUR-13 muestra bajo cada campo los errores de validación del backend', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/turnos`, () =>
        HttpResponse.json(
          {
            status: 400,
            error: 'Error al validar el modelo',
            message: null,
            messages: [
              "'nombre': Nombre debe tener de 10 a 30 caracteres.",
              "'alumnosTurno[0].horaInicio': La hora debe estar en formato HH:mm (09:00, 14:00)",
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirFormulario()
    await llenarDatos(usuario)
    await agregarAlumno(usuario, 1, 'Juan Falconi Fernandez', '08:00', '09:30')
    await agregarManiobra(usuario, 1, 'Maniobra 1', 'B')
    await guardar(usuario)
    expect(await screen.findByText('Revise los campos marcados.')).toBeInTheDocument()
    expect(screen.getByText('Nombre debe tener de 10 a 30 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('La hora debe estar en formato HH:mm (09:00, 14:00)')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true')
  })
})
```

- [ ] **Step 6: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/registrar-turno-page.test.tsx
```

Expected: FAIL — `Unable to find role="option" and name "Robinson R22"` (the placeholder page has no form).

- [ ] **Step 7: Implement the form and the page**

`src/features/turnos/components/formulario-turno.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
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
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { agruparPorGrupo, consultasCatalogos, PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { hoyIso } from '@/lib/dominio/calendario'
import { NOTAS_DIRBE } from '@/lib/dominio/dirbe'
import { conflictosDeAeronave } from '@/lib/dominio/turno'
import { termino } from '@/lib/dominio/vocabulario'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { consultasTurnos, useGuardarTurno } from '../api'
import { aCuerpoTurno, crearEsquemaTurno, type ValoresTurno } from '../schemas'

const RENOMBRAR = { aeronave: 'idAeronave', nota_min: 'notaMin' }

type Props = { valoresIniciales: ValoresTurno; idTurno?: number }

export function FormularioTurno({ valoresIniciales, idTurno }: Props) {
  const modificando = idTurno !== undefined
  const navegar = useNavigate()
  const guardar = useGuardarTurno(idTurno)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [subfasePendiente, setSubfasePendiente] = useState<string | null>(null)
  const [porConfirmar, setPorConfirmar] = useState<ValoresTurno | null>(null)

  const aeronaves = useQuery(consultasCatalogos.aeronaves())
  const subfases = useQuery(consultasCatalogos.subfases())
  const disponibles = useMemo(
    () => new Set((aeronaves.data ?? []).filter((aeronave) => aeronave.estado === 'Disponible').map((aeronave) => aeronave.id)),
    [aeronaves.data],
  )
  const esquema = useMemo(() => crearEsquemaTurno(hoyIso(), disponibles), [disponibles])
  const formulario = useForm<ValoresTurno>({ resolver: zodResolver(esquema), defaultValues: valoresIniciales })
  const { errors } = formulario.formState
  const alumnos = useFieldArray({ control: formulario.control, name: 'alumnosTurno' })
  const maniobras = useFieldArray({ control: formulario.control, name: 'maniobrasTurno' })
  const [programa, idSubfase, fechaEval, idAeronave, horarios] = useWatch({
    control: formulario.control,
    name: ['programa', 'idSubfase', 'fechaEval', 'idAeronave', 'alumnosTurno'],
  })
  const programaActual: Programa = programa === 'PDE' ? 'PDE' : 'PDI'

  const instructores = useQuery(consultasCatalogos.instructores(programaActual))
  const opcionesAlumnos = useQuery(consultasCatalogos.alumnos('programacion', programaActual, null))
  const opcionesManiobras = useQuery(consultasCatalogos.maniobras(Number(idSubfase) || 0))
  const ocupacion = useQuery(consultasTurnos.ocupacion(fechaEval, Number(idAeronave) || 0))
  const conflictos = conflictosDeAeronave(horarios, ocupacion.data ?? [], idTurno)
  const nombreDeAlumno = (codigo: string) =>
    opcionesAlumnos.data?.find((alumno) => alumno.codigo === codigo)?.nombreCompleto ?? codigo

  function enviar(valores: ValoresTurno) {
    setErrorGeneral(null)
    guardar.mutate(aCuerpoTurno(valores), {
      onSuccess: (resultado) => {
        toast.success(resultado.mensaje)
        void navegar({ to: '/turnos/$id', params: { id: String(resultado.id) } })
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          aplicarErroresDeCampo(error, formulario.setError, RENOMBRAR)
          setErrorGeneral(error.message)
        } else {
          setErrorGeneral(MENSAJE_GENERICO)
        }
      },
    })
  }

  function alEnviar(valores: ValoresTurno) {
    if (conflictos.length > 0) setPorConfirmar(valores)
    else enviar(valores)
  }

  function confirmarSubfase() {
    if (subfasePendiente === null) return
    formulario.setValue('idSubfase', subfasePendiente, { shouldValidate: true })
    maniobras.replace([])
    setSubfasePendiente(null)
  }

  return (
    <form noValidate onSubmit={formulario.handleSubmit(alEnviar)} className="grid gap-6">
      {errorGeneral && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el turno</AlertTitle>
          <AlertDescription>{errorGeneral}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del turno</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="turno-nombre">Nombre</FieldLabel>
              <Input id="turno-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 10 a 30 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.fechaEval)}>
              <FieldLabel htmlFor="turno-fecha">Fecha de evaluación</FieldLabel>
              <Input
                id="turno-fecha"
                type="date"
                aria-invalid={Boolean(errors.fechaEval)}
                {...formulario.register('fechaEval')}
              />
              <FieldError errors={[errors.fechaEval]} />
            </Field>
            <Field data-invalid={Boolean(errors.programa)}>
              <FieldLabel htmlFor="turno-programa">Programa</FieldLabel>
              <Controller
                control={formulario.control}
                name="programa"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-programa"
                    className="w-full"
                    disabled={modificando}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      if (evento.target.value === field.value) return
                      field.onChange(evento.target.value)
                      formulario.setValue('codInstructor', '')
                      alumnos.replace([])
                    }}
                  >
                    {PROGRAMAS.map((opcion) => (
                      <NativeSelectOption key={opcion} value={opcion}>
                        {opcion}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              {modificando ? (
                <FieldDescription>El programa y la sub fase no se cambian al modificar.</FieldDescription>
              ) : (
                <FieldDescription>Cambiarlo quita el instructor y los alumnos elegidos.</FieldDescription>
              )}
            </Field>
            <Field data-invalid={Boolean(errors.idSubfase)}>
              <FieldLabel htmlFor="turno-subfase">Sub fase</FieldLabel>
              <Controller
                control={formulario.control}
                name="idSubfase"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-subfase"
                    className="w-full"
                    disabled={modificando}
                    aria-invalid={Boolean(errors.idSubfase)}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      if (maniobras.fields.length > 0) setSubfasePendiente(evento.target.value)
                      else field.onChange(evento.target.value)
                    }}
                  >
                    <NativeSelectOption value="">Elija una sub fase</NativeSelectOption>
                    {(subfases.data ?? []).map((subfase) => (
                      <NativeSelectOption key={subfase.id} value={subfase.id}>
                        {subfase.nombre}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              <FieldError errors={[errors.idSubfase]} />
            </Field>
            <Field data-invalid={Boolean(errors.codInstructor)}>
              <FieldLabel htmlFor="turno-instructor">Instructor</FieldLabel>
              <NativeSelect
                id="turno-instructor"
                className="w-full"
                aria-invalid={Boolean(errors.codInstructor)}
                {...formulario.register('codInstructor')}
              >
                <NativeSelectOption value="">Elija un instructor</NativeSelectOption>
                {(instructores.data ?? []).map((instructor) => (
                  <NativeSelectOption key={instructor.codigo} value={instructor.codigo}>
                    {instructor.nombreCompleto}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.codInstructor]} />
            </Field>
            <Field data-invalid={Boolean(errors.idAeronave)}>
              <FieldLabel htmlFor="turno-aeronave">Aeronave</FieldLabel>
              <NativeSelect
                id="turno-aeronave"
                className="w-full"
                aria-invalid={Boolean(errors.idAeronave)}
                {...formulario.register('idAeronave')}
              >
                <NativeSelectOption value="">Elija una aeronave</NativeSelectOption>
                {(aeronaves.data ?? []).map((aeronave) => (
                  <NativeSelectOption key={aeronave.id} value={aeronave.id} disabled={aeronave.estado !== 'Disponible'}>
                    {aeronave.estado === 'Disponible'
                      ? aeronave.nombre
                      : `${aeronave.nombre} · ${termino('aeronave', aeronave.estado).etiqueta}`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Solo se pueden elegir aeronaves disponibles.</FieldDescription>
              <FieldError errors={[errors.idAeronave]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Alumnos</h2>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => alumnos.append({ codAlumno: '', horaInicio: '', horaFin: '' })}
          >
            <Plus aria-hidden />
            Agregar alumno
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {alumnos.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Agregue a los alumnos que vuelan en este turno.</p>
          )}
          {alumnos.fields.map((fila, indice) => {
            const error = errors.alumnosTurno?.[indice]
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
                <Field data-invalid={Boolean(error?.codAlumno)}>
                  <FieldLabel htmlFor={`alumno-${indice}`}>Alumno {numero}</FieldLabel>
                  <NativeSelect
                    id={`alumno-${indice}`}
                    className="w-full"
                    aria-invalid={Boolean(error?.codAlumno)}
                    {...formulario.register(`alumnosTurno.${indice}.codAlumno`)}
                  >
                    <NativeSelectOption value="">Elija un alumno</NativeSelectOption>
                    {agruparPorGrupo(opcionesAlumnos.data ?? []).map(([grupo, lista]) => (
                      <NativeSelectOptGroup key={grupo} label={grupo}>
                        {lista.map((alumno) => (
                          <NativeSelectOption key={alumno.codigo} value={alumno.codigo}>
                            {alumno.nombreCompleto}
                          </NativeSelectOption>
                        ))}
                      </NativeSelectOptGroup>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[error?.codAlumno]} />
                </Field>
                <Field data-invalid={Boolean(error?.horaInicio)}>
                  <FieldLabel htmlFor={`inicio-${indice}`}>Inicio {numero}</FieldLabel>
                  <Input
                    id={`inicio-${indice}`}
                    type="time"
                    aria-invalid={Boolean(error?.horaInicio)}
                    {...formulario.register(`alumnosTurno.${indice}.horaInicio`)}
                  />
                  <FieldError errors={[error?.horaInicio]} />
                </Field>
                <Field data-invalid={Boolean(error?.horaFin)}>
                  <FieldLabel htmlFor={`fin-${indice}`}>Fin {numero}</FieldLabel>
                  <Input
                    id={`fin-${indice}`}
                    type="time"
                    aria-invalid={Boolean(error?.horaFin)}
                    {...formulario.register(`alumnosTurno.${indice}.horaFin`)}
                  />
                  <FieldError errors={[error?.horaFin]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Quitar alumno ${numero}`}
                  onClick={() => alumnos.remove(indice)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            )
          })}
          <FieldError errors={[errors.alumnosTurno?.root ?? errors.alumnosTurno]} />
          {conflictos.length > 0 && (
            <Alert>
              <TriangleAlert />
              <AlertTitle>Horario superpuesto en la aeronave</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {conflictos.map(({ indice, ocupacion: otro }) => (
                    <li key={`${indice}-${otro.idTurno}`}>
                      {nombreDeAlumno(horarios[indice]?.codAlumno ?? '')} ({horarios[indice]?.horaInicio}–
                      {horarios[indice]?.horaFin}) se cruza con «{otro.nombre}» ({otro.horaInicio}–{otro.horaFin}).
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Maniobras</h2>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={idSubfase === ''}
            onClick={() => maniobras.append({ idManiobra: '', notaMin: '' })}
          >
            <Plus aria-hidden />
            Agregar maniobra
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {idSubfase === '' ? (
            <p className="text-sm text-muted-foreground">Elija primero la sub fase para ver sus maniobras.</p>
          ) : (
            opcionesManiobras.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">La sub fase no tiene maniobras asignadas.</p>
            )
          )}
          {maniobras.fields.map((fila, indice) => {
            const error = errors.maniobrasTurno?.[indice]
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_10rem_auto]">
                <Field data-invalid={Boolean(error?.idManiobra)}>
                  <FieldLabel htmlFor={`maniobra-${indice}`}>Maniobra {numero}</FieldLabel>
                  <NativeSelect
                    id={`maniobra-${indice}`}
                    className="w-full"
                    aria-invalid={Boolean(error?.idManiobra)}
                    {...formulario.register(`maniobrasTurno.${indice}.idManiobra`)}
                  >
                    <NativeSelectOption value="">Elija una maniobra</NativeSelectOption>
                    {(opcionesManiobras.data ?? []).map((maniobra) => (
                      <NativeSelectOption key={maniobra.id} value={maniobra.id}>
                        {maniobra.nombre}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[error?.idManiobra]} />
                </Field>
                <Field data-invalid={Boolean(error?.notaMin)}>
                  <FieldLabel htmlFor={`nota-${indice}`}>Nota mínima {numero}</FieldLabel>
                  <NativeSelect
                    id={`nota-${indice}`}
                    className="w-full"
                    aria-invalid={Boolean(error?.notaMin)}
                    {...formulario.register(`maniobrasTurno.${indice}.notaMin`)}
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {NOTAS_DIRBE.map((nota) => (
                      <NativeSelectOption key={nota} value={nota}>
                        {nota}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[error?.notaMin]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Quitar maniobra ${numero}`}
                  onClick={() => maniobras.remove(indice)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            )
          })}
          <FieldError errors={[errors.maniobrasTurno?.root ?? errors.maniobrasTurno]} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/turnos/$id" params={{ id: String(idTurno) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/turnos">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar turno'}
        </Button>
      </div>

      <AlertDialog open={subfasePendiente !== null} onOpenChange={(abierto) => !abierto && setSubfasePendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar la sub fase?</AlertDialogTitle>
            <AlertDialogDescription>
              Las maniobras elegidas pertenecen a la sub fase actual y se quitarán del turno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar sub fase</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarSubfase}>Cambiar y quitar maniobras</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={porConfirmar !== null} onOpenChange={(abierto) => !abierto && setPorConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Guardar con horarios superpuestos?</AlertDialogTitle>
            <AlertDialogDescription>
              La aeronave ya tiene vuelos programados en ese horario. Puede guardar de todos modos o corregir los horarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Corregir horarios</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (porConfirmar) enviar(porConfirmar)
                setPorConfirmar(null)
              }}
            >
              Guardar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
```

Replace `src/features/turnos/registrar-turno-page.tsx` with:

```tsx
import { PageHeader } from '@/components/page-header'
import { FormularioTurno } from './components/formulario-turno'
import { turnoVacio } from './schemas'

export function RegistrarTurnoPage() {
  return (
    <>
      <PageHeader
        titulo="Registrar turno"
        descripcion="Programe un turno de vuelo con su instructor, aeronave, alumnos y maniobras."
      />
      <FormularioTurno valoresIniciales={turnoVacio()} />
    </>
  )
}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos
```

Expected: PASS — registrar-turno-page 12, schemas 8, plus the earlier turno tests.

- [ ] **Step 9: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 235 tests.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add registrar turno form"
```

---

### Task 11: Modificar turno (CA-TUR-11, CA-TUR-12)

**Files:**
- Modify (full rewrite): `src/features/turnos/modificar-turno-page.tsx`, `src/routes/_app/turnos/$id/editar.tsx`
- Test: `src/features/turnos/modificar-turno-page.test.tsx`

**Interfaces:**
- Consumes: `FormularioTurno`, `valoresDesdeTurno` (Task 10); `cargarTurnoVisible` (Task 9); `consultasTurnos.detalle` (Task 5); `consultasCatalogos` (Task 4); `permiteCambios`, `MOTIVO_TURNO_VENCIDO` (Task 3).
- Produces: real `ModificarTurnoPage({ id })` — when the date is today or earlier it shows `MOTIVO_TURNO_VENCIDO` and no form; otherwise it waits for the catalogs the selects need (so the uncontrolled selects mount with their options) and renders `FormularioTurno` with the current values, programa and sub fase read-only (the sub fase id is recovered by name because `DetalleTurno` has no `idSubfase`). A 410 from the backend shows its message.

- [ ] **Step 1: Write the failing tests**

`src/features/turnos/modificar-turno-page.test.tsx`:

```tsx
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirEdicion(id = 8) {
  await iniciarComo('jefe.operaciones')
  const vista = renderApp(`/turnos/${id}/editar`)
  await screen.findByRole('heading', { name: 'Modificar turno' })
  return vista
}

describe('Modificar turno', () => {
  it('CA-TUR-12 carga los datos actuales del turno', async () => {
    await abrirEdicion()
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Navegación Nocturna')
    expect(screen.getByLabelText('Programa')).toBeDisabled()
    expect(screen.getByLabelText('Sub fase')).toHaveValue('2')
    expect(screen.getByLabelText('Sub fase')).toBeDisabled()
    expect(screen.getByLabelText('Instructor')).toHaveValue('444444')
    expect(screen.getByLabelText('Aeronave')).toHaveValue('1')
    expect(screen.getByLabelText('Alumno 1')).toHaveValue('111111')
    expect(screen.getByLabelText('Inicio 1')).toHaveValue('09:00')
    expect(screen.getByLabelText('Alumno 2')).toHaveValue('666666')
    expect(screen.getByLabelText('Maniobra 3')).toHaveValue('3')
    expect(screen.getByLabelText('Nota mínima 3')).toHaveValue('E')
  })

  it('CA-TUR-12 aplica las mismas validaciones que registrar', async () => {
    const { usuario } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Corto')
    await usuario.clear(screen.getByLabelText('Fecha de evaluación'))
    await usuario.type(screen.getByLabelText('Fecha de evaluación'), hoyIso())
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('Nombre debe tener de 10 a 30 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('La fecha del turno debe ser posterior a hoy.')).toBeInTheDocument()
  })

  it('CA-TUR-12 guarda los cambios sin advertir cruces con su propio horario', async () => {
    const { usuario, router } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Navegación Nocturna II')
    expect(screen.queryByText('Horario superpuesto en la aeronave')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('Turno guardado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/turnos/8'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Navegación Nocturna II' })).toBeInTheDocument()
  })

  it('CA-TUR-11 un turno con fecha vencida no se puede modificar y se explica el motivo', async () => {
    await abrirEdicion(1)
    expect(screen.getByText('El turno ya no se puede modificar porque su fecha pasó.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('M1-2 muestra el mensaje del backend si rechaza el cambio por la fecha', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/turnos/:id`, () =>
        HttpResponse.json(
          { status: 410, error: 'Fecha de modificación expiró', message: 'No se puede modificar. El turno ya ha sido evaluado.' },
          { status: 410 },
        ),
      ),
    )
    const { usuario } = await abrirEdicion()
    await screen.findByLabelText('Nombre')
    await usuario.click(screen.getByRole('button', { name: 'Guardar turno' }))
    expect(await screen.findByText('No se puede modificar. El turno ya ha sido evaluado.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/modificar-turno-page.test.tsx
```

Expected: FAIL — `Unable to find a label with the text of: Nombre`.

- [ ] **Step 3: Implement the page and its loader**

Replace `src/features/turnos/modificar-turno-page.tsx` with:

```tsx
import { useQueries, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { consultasCatalogos, type Programa } from '@/features/catalogos/api'
import { MOTIVO_TURNO_VENCIDO, permiteCambios } from '@/lib/dominio/turno'
import { consultasTurnos } from './api'
import { FormularioTurno } from './components/formulario-turno'
import { valoresDesdeTurno } from './schemas'

export function ModificarTurnoPage({ id }: { id: number }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const programa: Programa = turno.programa === 'PDE' ? 'PDE' : 'PDI'
  const subfases = useQuery(consultasCatalogos.subfases())
  const idSubfase = subfases.data?.find((subfase) => subfase.nombre === turno.subfase)?.id
  const catalogos = useQueries({
    queries: [
      consultasCatalogos.aeronaves(),
      consultasCatalogos.instructores(programa),
      consultasCatalogos.alumnos('programacion', programa, null),
      consultasCatalogos.maniobras(idSubfase ?? 0),
    ],
  })
  const listo = subfases.isSuccess && catalogos.every((consulta) => consulta.isSuccess || consulta.fetchStatus === 'idle')
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/turnos/$id" params={{ id: String(turno.id) }}>
        Volver al turno
      </Link>
    </Button>
  )

  if (!permiteCambios(turno.fechaEval)) {
    return (
      <>
        <PageHeader titulo="Modificar turno" descripcion={turno.nombre} acciones={volver} />
        <Alert>
          <CircleAlert />
          <AlertTitle>No disponible</AlertTitle>
          <AlertDescription>{MOTIVO_TURNO_VENCIDO}</AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader titulo="Modificar turno" descripcion={turno.nombre} acciones={volver} />
      {listo ? (
        <FormularioTurno valoresIniciales={valoresDesdeTurno(turno, idSubfase)} idTurno={turno.id} />
      ) : (
        <div className="grid gap-3" aria-busy="true">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
    </>
  )
}
```

Replace `src/routes/_app/turnos/$id/editar.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarTurnoVisible } from '@/features/turnos/cargar'
import { ModificarTurnoPage } from '@/features/turnos/modificar-turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarTurno, context.sesion.actual()),
  loader: ({ context, params }) => cargarTurnoVisible(context.queryClient, context.sesion.actual(), params.id),
  component: RutaModificarTurno,
})

function RutaModificarTurno() {
  const { id } = Route.useParams()
  return <ModificarTurnoPage id={Number(id)} />
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && pnpm test:run src/features/turnos
```

Expected: PASS — modificar-turno-page 5, plus the earlier turno tests.

- [ ] **Step 5: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 240 tests.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add modificar turno"
```

---

### Task 12: Orden de vuelo del día and Hoja de briefing (CA-TUR-15, CA-TUR-16)

**Files:**
- Create: `src/features/turnos/orden-de-vuelo.ts`
- Modify (full rewrite): `src/features/turnos/orden-de-vuelo-page.tsx`, `src/features/turnos/hoja-de-briefing-page.tsx`, `src/routes/_app/turnos/dia/$fecha.tsx`, `src/routes/_app/turnos/$id/briefing/$alumno.tsx`
- Test: `src/features/turnos/orden-de-vuelo.test.ts`, `src/features/turnos/orden-de-vuelo-page.test.tsx`, `src/features/turnos/hoja-de-briefing-page.test.tsx`

**Interfaces:**
- Consumes: `consultasTurnos.dia`, `consultasTurnos.detalle`, `TurnoDetalle` (Task 5); `cargarTurnoVisible` (Task 9); `restarHoras`, `sumarDias`, `esFechaIso`, `responsableDeManiobra` (Task 3); `Enlace` (Task 8); M0's `EmptyState`, `PageHeader`, `StatusBadge`, `formatearFecha(iso: string)`.
- Produces:
  - `orden-de-vuelo.ts`: `type VueloDelDia`, `type VuelosDeAeronave = { aeronave: string; vuelos: VueloDelDia[] }`, `SIN_AERONAVE`, `ordenDeVuelo(turnos: readonly TurnoDetalle[]): VuelosDeAeronave[]` (groups by aircraft name, groups sorted by name, flights by `horaInicio` then alumno), `horaDelBriefingDiario(grupos): string | null` (two hours before the first flight).
  - Real `OrdenDeVueloPage({ fecha })`: one table per aircraft named `Vuelos de <aeronave>` (Horario, Alumno, Turno, Sub fase, Instructor, "Hoja de briefing"), "Briefing diario: HH:mm", links "Día anterior"/"Día siguiente", a date input, empty state "No hay vuelos programados para este día."; `/turnos/dia/<no-date>` shows the not-found page.
  - Real `HojaDeBriefingPage({ id, codAlumno })`: header `<alumno> · <turno>`, flight data, table "Maniobras del briefing" (Maniobra, Nota mínima, Responsable = `Explica: Instructor` for D/I/R, `Expone: Alumno` for B/E, plain text with no page-specific emphasis), "Imprimir" button.

- [ ] **Step 1: Write the failing tests**

`src/features/turnos/orden-de-vuelo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { TurnoDetalle } from './api'
import { horaDelBriefingDiario, ordenDeVuelo } from './orden-de-vuelo'

function turno(id: number, aeronave: string, alumnos: [string, string, string][]): TurnoDetalle {
  return {
    id,
    nombre: `Turno ${id}`,
    subfase: 'Navegación',
    fase: 'Adaptación',
    fechaEval: '2026-09-26',
    programa: 'PDI',
    codInstructor: '444444',
    instructor: 'Juan Torres',
    aeronave: { id, nombre: aeronave, estado: 'Disponible' },
    alumnos: alumnos.map(([codAlumno, horaInicio, horaFin]) => ({ codAlumno, alumno: `Alumno ${codAlumno}`, horaInicio, horaFin })),
    maniobras: [],
  }
}

describe('orden de vuelo del día', () => {
  const turnos = [
    turno(1, 'Robinson R22', [
      ['111111', '11:00', '12:00'],
      ['222222', '09:00', '10:00'],
    ]),
    turno(2, 'Bell 206', [['333333', '10:00', '11:00']]),
    turno(3, 'Robinson R22', [['444444', '07:30', '08:30']]),
  ]

  it('CA-TUR-15 agrupa los vuelos por aeronave y los ordena por hora', () => {
    expect(
      ordenDeVuelo(turnos).map((grupo) => [grupo.aeronave, grupo.vuelos.map((vuelo) => `${vuelo.horaInicio} ${vuelo.codAlumno}`)]),
    ).toEqual([
      ['Bell 206', ['10:00 333333']],
      ['Robinson R22', ['07:30 444444', '09:00 222222', '11:00 111111']],
    ])
  })

  it('ubica el briefing diario dos horas antes del primer vuelo', () => {
    expect(horaDelBriefingDiario(ordenDeVuelo(turnos))).toBe('05:30')
    expect(horaDelBriefingDiario([])).toBeNull()
  })
})
```

`src/features/turnos/orden-de-vuelo-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo, renderApp } from '@/test/render'

const EN_UNA_SEMANA = sumarDias(hoyIso(), 7)

describe('Orden de vuelo del día', () => {
  it('CA-TUR-15 agrupa por aeronave y ordena los vuelos por hora', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp(`/turnos/dia/${EN_UNA_SEMANA}`)
    const tabla = within(await screen.findByRole('table', { name: 'Vuelos de Robinson R22' }))
    expect(
      tabla
        .getAllByRole('row')
        .slice(1)
        .map((fila) => within(fila).getAllByRole('cell').slice(0, 3).map((celda) => celda.textContent)),
    ).toEqual([
      ['07:30 – 08:30', 'Carlos Ramirez', 'Instrumentos Básicos'],
      ['09:00 – 10:30', 'Oscar Lopez', 'Navegación Nocturna'],
      ['11:00 – 12:30', 'Ana Torres', 'Navegación Nocturna'],
    ])
    expect(screen.getByText('05:30')).toBeInTheDocument()
  })

  it('navega al día siguiente y avisa cuando no hay vuelos', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp(`/turnos/dia/${hoyIso()}`)
    expect(await screen.findByText('No hay vuelos programados para este día.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Día siguiente' })).toHaveAttribute('href', `/turnos/dia/${sumarDias(hoyIso(), 1)}`)
  })

  it('una fecha inválida muestra la página no encontrada', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/dia/manana')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})
```

`src/features/turnos/hoja-de-briefing-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('Hoja de briefing', () => {
  it('CA-TUR-16 indica quién explica cada maniobra según su nota mínima', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/turnos/8/briefing/111111')
    const tabla = within(await screen.findByRole('table', { name: 'Maniobras del briefing' }))
    expect(
      tabla
        .getAllByRole('row')
        .slice(1)
        .map((fila) => {
          const [maniobra, , responsable] = within(fila).getAllByRole('cell')
          return [within(maniobra as HTMLElement).getByText(/^Maniobra \d$/).textContent, responsable?.textContent]
        }),
    ).toEqual([
      ['Maniobra 1', 'Explica: Instructor'],
      ['Maniobra 2', 'Expone: Alumno'],
      ['Maniobra 3', 'Expone: Alumno'],
      ['Maniobra 4', 'Explica: Instructor'],
    ])
    expect(screen.getByText('Oscar Lopez · Navegación Nocturna')).toBeInTheDocument()
  })

  it('un alumno que no vuela en el turno muestra la página no encontrada', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/turnos/8/briefing/222222')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })

  it('CA-TUR-14 el alumno solo abre su propia hoja de briefing', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos/8/briefing/666666')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/turnos/orden-de-vuelo.test.ts src/features/turnos/orden-de-vuelo-page.test.tsx src/features/turnos/hoja-de-briefing-page.test.tsx
```

Expected: FAIL — cannot resolve `./orden-de-vuelo`; the page tests cannot find the tables.

- [ ] **Step 3: Implement the flight order**

`src/features/turnos/orden-de-vuelo.ts`:

```ts
import { restarHoras } from '@/lib/dominio/calendario'
import type { TurnoDetalle } from './api'

export type VueloDelDia = {
  idTurno: number
  turno: string
  subfase: string
  instructor: string | null
  codAlumno: string
  alumno: string
  horaInicio: string
  horaFin: string
}

export type VuelosDeAeronave = { aeronave: string; vuelos: VueloDelDia[] }

export const SIN_AERONAVE = 'Sin aeronave asignada'

export function ordenDeVuelo(turnos: readonly TurnoDetalle[]): VuelosDeAeronave[] {
  const porAeronave = new Map<string, VueloDelDia[]>()
  for (const turno of turnos) {
    const aeronave = turno.aeronave?.nombre ?? SIN_AERONAVE
    const vuelos = turno.alumnos.map((alumno) => ({
      idTurno: turno.id,
      turno: turno.nombre,
      subfase: turno.subfase,
      instructor: turno.instructor,
      ...alumno,
    }))
    porAeronave.set(aeronave, [...(porAeronave.get(aeronave) ?? []), ...vuelos])
  }
  return [...porAeronave.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([aeronave, vuelos]) => ({
      aeronave,
      vuelos: [...vuelos].sort(
        (a, b) => a.horaInicio.localeCompare(b.horaInicio) || a.alumno.localeCompare(b.alumno, 'es'),
      ),
    }))
}

export function horaDelBriefingDiario(grupos: readonly VuelosDeAeronave[]): string | null {
  const primera = grupos
    .flatMap((grupo) => grupo.vuelos.map((vuelo) => vuelo.horaInicio))
    .sort()
    .at(0)
  return primera ? restarHoras(primera, 2) : null
}
```

Replace `src/features/turnos/orden-de-vuelo-page.tsx` with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, PlaneTakeoff } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Enlace } from '@/components/enlace'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { esFechaIso, sumarDias } from '@/lib/dominio/calendario'
import { formatearFecha } from '@/lib/formato'
import { consultasTurnos } from './api'
import { horaDelBriefingDiario, ordenDeVuelo } from './orden-de-vuelo'

export function OrdenDeVueloPage({ fecha }: { fecha: string }) {
  const navegar = useNavigate()
  const turnos = useQuery(consultasTurnos.dia(fecha))
  const grupos = ordenDeVuelo(turnos.data ?? [])
  const briefing = horaDelBriefingDiario(grupos)

  return (
    <>
      <PageHeader
        titulo="Orden de vuelo del día"
        descripcion={`Vuelos del ${formatearFecha(fecha)} agrupados por aeronave.`}
        acciones={
          <div className="flex flex-wrap items-end gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link to="/turnos/dia/$fecha" params={{ fecha: sumarDias(fecha, -1) }} aria-label="Día anterior">
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
            <div className="grid gap-1">
              <Label htmlFor="orden-fecha" className="sr-only">
                Fecha
              </Label>
              <Input
                id="orden-fecha"
                type="date"
                value={fecha}
                onChange={(evento) => {
                  if (esFechaIso(evento.target.value)) {
                    void navegar({ to: '/turnos/dia/$fecha', params: { fecha: evento.target.value } })
                  }
                }}
              />
            </div>
            <Button variant="outline" size="icon" asChild>
              <Link to="/turnos/dia/$fecha" params={{ fecha: sumarDias(fecha, 1) }} aria-label="Día siguiente">
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          </div>
        }
      />
      {turnos.isError && (
        <Alert variant="destructive">
          <AlertDescription>{turnos.error instanceof ApiError ? turnos.error.message : MENSAJE_GENERICO}</AlertDescription>
        </Alert>
      )}
      {turnos.isPending && <Skeleton className="h-40 w-full" />}
      {turnos.isSuccess && grupos.length === 0 && (
        <EmptyState icono={PlaneTakeoff} titulo="No hay vuelos programados para este día." />
      )}
      {briefing && (
        <p className="text-sm">
          Briefing diario: <span className="font-medium tabular-nums">{briefing}</span>{' '}
          <span className="text-muted-foreground">(2 h antes del primer vuelo)</span>
        </p>
      )}
      {grupos.map((grupo) => (
        <Card key={grupo.aeronave}>
          <CardHeader>
            <CardTitle>
              <h2>{grupo.aeronave}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table aria-label={`Vuelos de ${grupo.aeronave}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Horario</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Sub fase</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupo.vuelos.map((vuelo) => (
                  <TableRow key={`${vuelo.idTurno}-${vuelo.codAlumno}`}>
                    <TableCell className="tabular-nums">
                      {vuelo.horaInicio} – {vuelo.horaFin}
                    </TableCell>
                    <TableCell>{vuelo.alumno}</TableCell>
                    <TableCell>
                      <Enlace to="/turnos/$id" params={{ id: String(vuelo.idTurno) }}>
                        {vuelo.turno}
                      </Enlace>
                    </TableCell>
                    <TableCell>{vuelo.subfase}</TableCell>
                    <TableCell>{vuelo.instructor ?? 'Sin asignar'}</TableCell>
                    <TableCell>
                      <Enlace
                        to="/turnos/$id/briefing/$alumno"
                        params={{ id: String(vuelo.idTurno), alumno: vuelo.codAlumno }}
                      >
                        Hoja de briefing
                      </Enlace>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
```

Replace `src/routes/_app/turnos/dia/$fecha.tsx` with:

```tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import { OrdenDeVueloPage } from '@/features/turnos/orden-de-vuelo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { esFechaIso } from '@/lib/dominio/calendario'

export const Route = createFileRoute('/_app/turnos/dia/$fecha')({
  beforeLoad: ({ context, params }) => {
    exigirPantalla(PANTALLAS.ordenDeVueloDelDia, context.sesion.actual())
    if (!esFechaIso(params.fecha)) throw notFound()
  },
  component: RutaOrdenDeVuelo,
})

function RutaOrdenDeVuelo() {
  const { fecha } = Route.useParams()
  return <OrdenDeVueloPage fecha={fecha} />
}
```

- [ ] **Step 4: Implement the briefing sheet**

Replace `src/features/turnos/hoja-de-briefing-page.tsx` with:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { responsableDeManiobra } from '@/lib/dominio/briefing'
import { restarHoras } from '@/lib/dominio/calendario'
import { formatearFecha } from '@/lib/formato'
import { consultasTurnos } from './api'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

export function HojaDeBriefingPage({ id, codAlumno }: { id: number; codAlumno: string }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const alumno = turno.alumnos.find((candidato) => candidato.codAlumno === codAlumno)
  if (!alumno) throw notFound()

  return (
    <>
      <PageHeader
        titulo="Hoja de briefing"
        descripcion={`${alumno.alumno} · ${turno.nombre}`}
        acciones={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden />
            Imprimir
          </Button>
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Dato etiqueta="Fecha">
              <span className="tabular-nums">{formatearFecha(turno.fechaEval)}</span>
            </Dato>
            <Dato etiqueta="Vuelo">
              <span className="tabular-nums">
                {alumno.horaInicio} – {alumno.horaFin}
              </span>
            </Dato>
            <Dato etiqueta="Briefing de detalle">
              <span className="tabular-nums">{restarHoras(alumno.horaInicio, 1)}</span>
            </Dato>
            <Dato etiqueta="Sub fase">{turno.subfase}</Dato>
            <Dato etiqueta="Instructor">{turno.instructor ?? 'Sin asignar'}</Dato>
            <Dato etiqueta="Aeronave">{turno.aeronave?.nombre ?? 'Sin asignar'}</Dato>
          </dl>
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label="Maniobras del briefing">
          <TableHeader>
            <TableRow>
              <TableHead>Maniobra</TableHead>
              <TableHead>Nota mínima</TableHead>
              <TableHead>Responsable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {turno.maniobras.map((item) => (
              <TableRow key={item.maniobra.id}>
                <TableCell>
                  <p className="font-medium">{item.maniobra.nombre}</p>
                  {item.maniobra.descripcion && (
                    <p className="text-xs text-muted-foreground">{item.maniobra.descripcion}</p>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge vocabulario="calificativo" valor={item.notaMin} />
                </TableCell>
                <TableCell>{responsableDeManiobra(item.notaMin)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        Con nota mínima D, I o R el instructor explica la maniobra; con B o E la expone el alumno.
      </p>
    </>
  )
}
```

Replace `src/routes/_app/turnos/$id/briefing/$alumno.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarTurnoVisible } from '@/features/turnos/cargar'
import { HojaDeBriefingPage } from '@/features/turnos/hoja-de-briefing-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/briefing/$alumno')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.hojaDeBriefing, context.sesion.actual()),
  loader: ({ context, params }) =>
    cargarTurnoVisible(context.queryClient, context.sesion.actual(), params.id, params.alumno),
  component: RutaHojaDeBriefing,
})

function RutaHojaDeBriefing() {
  const { id, alumno } = Route.useParams()
  return <HojaDeBriefingPage id={Number(id)} codAlumno={alumno} />
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && pnpm test:run src/features/turnos src/components/migas.test.tsx src/lib/auth
```

Expected: PASS — orden-de-vuelo 2, orden-de-vuelo-page 3, hoja-de-briefing-page 3, plus the earlier tests (the breadcrumb test now renders the real briefing sheet).

- [ ] **Step 6: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 248 tests.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add orden de vuelo and hoja de briefing"
```

---

### Task 13: Evaluaciones and Mis evaluaciones (CA-EVA-01, CA-EVA-09, CA-EVA-10, CA-EVA-12, M1-9)

**Files:**
- Create: `src/features/evaluaciones/schemas.ts`, `src/features/evaluaciones/components/filtros-evaluaciones.tsx`, `src/features/evaluaciones/components/tabla-evaluaciones.tsx`
- Modify (full rewrite): `src/features/evaluaciones/evaluaciones-page.tsx`, `src/features/evaluaciones/mis-evaluaciones-page.tsx`, `src/routes/_app/evaluaciones/index.tsx`, `src/routes/_app/mis-evaluaciones.tsx`
- Test: `src/features/evaluaciones/evaluaciones-page.test.tsx`

**Interfaces:**
- Consumes: `esquemaPaginacion`, `numeroOpcional` (Task 8); `DataTable`, `ayudanteDeColumnas` (Task 8); `consultasEvaluaciones.lista/ultima`, `EvaluacionResumen` (Task 6); `consultasCatalogos.subfases/alumnos`, `fuenteDeAlumnos`, `agruparPorGrupo`, `PROGRAMAS` (Task 4); `MOTIVO_NO_ES_ULTIMA` (Task 3); `Enlace` (Task 8); M0's `StatusBadge`, `EmptyState`, `formatearFecha(iso: string)`, `formatearNota(nota: number | null | undefined)` (`'—'` for null), `usePuede`, `useSesion`.
- Produces:
  - `schemas.ts` (this task's version): `CLASIFICACIONES_FILTRO`, `esquemaBusquedaEvaluaciones` (`alumno?` via `z.coerce.string()` because the router parses `?alumno=555555` as a number, `programa`, `idSubfase?`, `clasificacion?` + pagination), `esquemaBusquedaMisEvaluaciones`, `type BusquedaEvaluaciones`, `type FiltrosDeEvaluacion`. Task 15 rewrites this file and keeps these exports.
  - `<FiltrosEvaluaciones filtros alCambiar children? />` (Programa, Sub fase, Clasificación; `children` renders first, used for the alumno picker).
  - `<TablaEvaluaciones codPersona filtros alCambiar conAlumno ultima? puedeModificar? />` — table named "Evaluaciones": Código (link), Nombre, Fase, Evaluador, Fecha, [Alumno], Promedio (`formatearNota`, so 2 decimals and `—` when null), Clasificación (badge), [Acciones: "Modificar" only on the latest evaluation, "Solo la última se modifica" on the others].
  - Real `EvaluacionesPage` (staff pick the alumno first from the role's source, M1-9) and `MisEvaluacionesPage` (session `codPersona`, no Alumno column, no actions).

- [ ] **Step 1: Write the failing tests**

`src/features/evaluaciones/evaluaciones-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function tablaCargada() {
  await screen.findByText(/^Página \d+ de \d+/)
  return within(screen.getByRole('table', { name: 'Evaluaciones' }))
}

function codigos(tabla: ReturnType<typeof within>) {
  return tabla
    .getAllByRole('row')
    .slice(1)
    .map((fila: HTMLElement) => within(fila).getAllByRole('cell')[0]?.textContent)
}

describe('Evaluaciones', () => {
  it('M1-9 el personal elige primero al alumno', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/evaluaciones')
    expect(await screen.findByText('Elija un alumno para ver sus evaluaciones')).toBeInTheDocument()
  })

  it('CA-EVA-01 muestra código, nombre, fase, evaluador, fecha, alumno, promedio y clasificación', async () => {
    await iniciarComo('comandante.aguirre')
    const { usuario, router } = renderApp('/evaluaciones')
    await screen.findByRole('option', { name: 'Pedro Rodriguez Garcia' })
    await usuario.selectOptions(screen.getByLabelText('Alumno'), 'Pedro Rodriguez Garcia')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ alumno: '555555' }))
    const tabla = await tablaCargada()
    expect(tabla.getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual([
      'Código',
      'Nombre',
      'Fase',
      'Evaluador',
      'Fecha',
      'Alumno',
      'Promedio',
      'Clasificación',
      'Acciones',
    ])
    const fila = tabla.getByRole('link', { name: '555555-1' }).closest('tr') as HTMLElement
    expect(within(fila).getAllByRole('cell').slice(0, 8).map((celda) => celda.textContent)).toEqual([
      '555555-1',
      'Ponderada Contacto Básico',
      'Adaptación',
      'Juan Torres',
      '01/03/2024',
      'Pedro Rodriguez',
      '14.00',
      'Regular',
    ])
  })

  it('CA-EVA-01 filtra por clasificación y sub fase desde la URL', async () => {
    await iniciarComo('comandante.aguirre')
    const { usuario } = renderApp('/evaluaciones?alumno=%22555555%22&clasificacion=Bueno')
    expect(codigos(await tablaCargada())).toEqual(['555555-2'])
    await usuario.selectOptions(screen.getByLabelText('Sub fase'), 'Navegación')
    expect(await screen.findByText('No hay evaluaciones')).toBeInTheDocument()
  })

  it('M1-9 el instructor elige entre los alumnos de sus turnos', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/evaluaciones')
    const selector = await screen.findByLabelText('Alumno')
    await waitFor(() =>
      expect(within(selector).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
        'Elija un alumno',
        'Oscar Lopez Chaparro',
        'Juan Falconi Fernandez',
        'Pedro Rodriguez Garcia',
        'Ana Torres Martinez',
      ]),
    )
  })

  it('CA-EVA-12 solo la última evaluación del alumno ofrece modificar', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/evaluaciones?alumno=%22555555%22')
    const tabla = await tablaCargada()
    expect(await tabla.findByRole('link', { name: 'Modificar' })).toHaveAttribute('href', '/evaluaciones/555555-3/editar')
    expect(tabla.getAllByText('Solo la última se modifica')).toHaveLength(2)
    expect(screen.getByText('Solo la última evaluación del alumno puede modificarse o eliminarse.')).toBeInTheDocument()
  })

  it('CA-EVA-09 sin Modify Evaluations no hay acciones', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/evaluaciones?alumno=%22555555%22')
    const tabla = await tablaCargada()
    expect(tabla.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument()
  })
})

describe('Mis evaluaciones', () => {
  it('CA-EVA-10 el alumno ve solo sus propias evaluaciones', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/mis-evaluaciones')
    const tabla = await tablaCargada()
    expect(codigos(tabla)).toEqual(['111111-1'])
    expect(tabla.queryByRole('columnheader', { name: 'Alumno' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/evaluaciones/evaluaciones-page.test.tsx
```

Expected: FAIL — `Unable to find an element with the text: Elija un alumno para ver sus evaluaciones` and `/^Página \d+ de \d+/`.

- [ ] **Step 3: Implement the search schema, filters and table**

`src/features/evaluaciones/schemas.ts`:

```ts
import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { esquemaPaginacion, numeroOpcional } from '@/lib/busqueda'

export const CLASIFICACIONES_FILTRO = ['Malo', 'Regular', 'Bueno', 'Excelente'] as const

const filtros = {
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idSubfase: numeroOpcional,
  clasificacion: z.enum(CLASIFICACIONES_FILTRO).optional().catch(undefined),
}

export const esquemaBusquedaEvaluaciones = z.object({
  ...filtros,
  alumno: z.coerce
    .string()
    .regex(/^\d{6}$/)
    .optional()
    .catch(undefined),
})

export const esquemaBusquedaMisEvaluaciones = z.object(filtros)

export type BusquedaEvaluaciones = z.infer<typeof esquemaBusquedaEvaluaciones>

export type FiltrosDeEvaluacion = z.infer<typeof esquemaBusquedaMisEvaluaciones>
```

`src/features/evaluaciones/components/filtros-evaluaciones.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasCatalogos, PROGRAMAS } from '@/features/catalogos/api'
import { CLASIFICACIONES_FILTRO, type FiltrosDeEvaluacion } from '../schemas'

type Props = {
  filtros: FiltrosDeEvaluacion
  alCambiar: (cambios: Partial<FiltrosDeEvaluacion>) => void
  children?: ReactNode
}

export function FiltrosEvaluaciones({ filtros, alCambiar, children }: Props) {
  const subfases = useQuery(consultasCatalogos.subfases())
  return (
    <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <Field>
        <FieldLabel htmlFor="filtro-programa">Programa</FieldLabel>
        <NativeSelect
          id="filtro-programa"
          className="w-full"
          value={filtros.programa}
          onChange={(evento) => alCambiar({ programa: evento.target.value === 'PDE' ? 'PDE' : 'PDI' })}
        >
          {PROGRAMAS.map((programa) => (
            <NativeSelectOption key={programa} value={programa}>
              {programa}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-subfase">Sub fase</FieldLabel>
        <NativeSelect
          id="filtro-subfase"
          className="w-full"
          value={filtros.idSubfase ?? ''}
          onChange={(evento) =>
            alCambiar({ idSubfase: evento.target.value === '' ? undefined : Number(evento.target.value) })
          }
        >
          <NativeSelectOption value="">Todas</NativeSelectOption>
          {(subfases.data ?? []).map((subfase) => (
            <NativeSelectOption key={subfase.id} value={subfase.id}>
              {subfase.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-clasificacion">Clasificación</FieldLabel>
        <NativeSelect
          id="filtro-clasificacion"
          className="w-full"
          value={filtros.clasificacion ?? ''}
          onChange={(evento) => {
            const valor = CLASIFICACIONES_FILTRO.find((clasificacion) => clasificacion === evento.target.value)
            alCambiar({ clasificacion: valor })
          }}
        >
          <NativeSelectOption value="">Todas</NativeSelectOption>
          {CLASIFICACIONES_FILTRO.map((clasificacion) => (
            <NativeSelectOption key={clasificacion} value={clasificacion}>
              {clasificacion}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </section>
  )
}
```

`src/features/evaluaciones/components/tabla-evaluaciones.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import type { ParametrosPagina } from '@/lib/api/pagina'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { consultasEvaluaciones, type EvaluacionResumen } from '../api'
import type { FiltrosDeEvaluacion } from '../schemas'

const ayudante = ayudanteDeColumnas<EvaluacionResumen>()

type Props = {
  codPersona: string
  filtros: FiltrosDeEvaluacion
  alCambiar: (cambios: Partial<ParametrosPagina>) => void
  conAlumno: boolean
  ultima?: string | null
  puedeModificar?: boolean
}

export function TablaEvaluaciones({ codPersona, filtros, alCambiar, conAlumno, ultima = null, puedeModificar = false }: Props) {
  const evaluaciones = useQuery(consultasEvaluaciones.lista(codPersona, filtros))
  const columnas = useMemo(
    () =>
      ayudante.columns([
        ayudante.accessor('codigo', {
          header: 'Código',
          enableSorting: true,
          cell: (contexto) => (
            <Enlace to="/evaluaciones/$cod" params={{ cod: contexto.getValue() }} className="font-mono text-xs">
              {contexto.getValue()}
            </Enlace>
          ),
        }),
        ayudante.accessor('nombre', { header: 'Nombre' }),
        ayudante.accessor('fase', { header: 'Fase' }),
        ayudante.accessor('evaluador', { header: 'Evaluador' }),
        ayudante.accessor('fecha', {
          header: 'Fecha',
          enableSorting: true,
          cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
        }),
        ...(conAlumno ? [ayudante.accessor('alumno', { header: 'Alumno' })] : []),
        ayudante.accessor('promedio', {
          header: 'Promedio',
          cell: (contexto) => <span className="tabular-nums">{formatearNota(contexto.getValue())}</span>,
        }),
        ayudante.accessor('clasificacion', {
          header: 'Clasificación',
          cell: (contexto) => {
            const valor = contexto.getValue()
            return valor ? <StatusBadge vocabulario="clasificacion" valor={valor} /> : '—'
          },
        }),
        ...(puedeModificar
          ? [
              ayudante.display({
                id: 'acciones',
                header: 'Acciones',
                cell: (contexto) =>
                  contexto.row.original.codigo === ultima ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/evaluaciones/$cod/editar" params={{ cod: contexto.row.original.codigo }}>
                        Modificar
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Solo la última se modifica</span>
                  ),
              }),
            ]
          : []),
      ]),
    [conAlumno, puedeModificar, ultima],
  )

  if (evaluaciones.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {evaluaciones.error instanceof ApiError ? evaluaciones.error.message : MENSAJE_GENERICO}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <DataTable
      etiqueta="Evaluaciones"
      columnas={columnas}
      pagina={evaluaciones.data}
      cargando={evaluaciones.isFetching}
      parametros={filtros}
      alCambiar={alCambiar}
      idDeFila={(evaluacion) => evaluacion.codigo}
      vacio={<EmptyState titulo="No hay evaluaciones" descripcion="Ninguna evaluación coincide con los filtros." />}
    />
  )
}
```

- [ ] **Step 4: Implement the pages and wire their search**

Replace `src/features/evaluaciones/evaluaciones-page.tsx` with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { UserSearch } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { agruparPorGrupo, consultasCatalogos, fuenteDeAlumnos } from '@/features/catalogos/api'
import { usePuede, useSesion } from '@/lib/auth/use-sesion'
import { MOTIVO_NO_ES_ULTIMA } from '@/lib/dominio/evaluacion'
import { consultasEvaluaciones } from './api'
import { FiltrosEvaluaciones } from './components/filtros-evaluaciones'
import { TablaEvaluaciones } from './components/tabla-evaluaciones'
import type { BusquedaEvaluaciones } from './schemas'

const ruta = getRouteApi('/_app/evaluaciones/')

export function EvaluacionesPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const actual = useSesion()
  const puedeModificar = usePuede('Modify Evaluations')
  const fuente = actual ? fuenteDeAlumnos(actual.permisos) : null
  const alumnos = useQuery({
    ...consultasCatalogos.alumnos(fuente ?? 'todos', busqueda.programa, actual?.codPersona ?? null),
    enabled: fuente !== null,
  })
  const ultima = useQuery({
    ...consultasEvaluaciones.ultima(busqueda.alumno ?? '', busqueda.programa),
    enabled: puedeModificar && busqueda.alumno !== undefined,
  })

  function cambiar(cambios: Partial<BusquedaEvaluaciones>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  return (
    <>
      <PageHeader titulo="Evaluaciones" descripcion="Evaluaciones prácticas de cada alumno." />
      <FiltrosEvaluaciones filtros={busqueda} alCambiar={cambiar}>
        <Field>
          <FieldLabel htmlFor="filtro-alumno">Alumno</FieldLabel>
          <NativeSelect
            id="filtro-alumno"
            className="w-full"
            value={busqueda.alumno ?? ''}
            onChange={(evento) => cambiar({ alumno: evento.target.value === '' ? undefined : evento.target.value })}
          >
            <NativeSelectOption value="">Elija un alumno</NativeSelectOption>
            {agruparPorGrupo(alumnos.data ?? []).map(([grupo, lista]) => (
              <NativeSelectOptGroup key={grupo} label={grupo}>
                {lista.map((alumno) => (
                  <NativeSelectOption key={alumno.codigo} value={alumno.codigo}>
                    {alumno.nombreCompleto}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </Field>
      </FiltrosEvaluaciones>
      {busqueda.alumno === undefined ? (
        <EmptyState
          icono={UserSearch}
          titulo="Elija un alumno para ver sus evaluaciones"
          descripcion="Las evaluaciones se consultan por alumno."
        />
      ) : (
        <>
          {puedeModificar && <p className="text-sm text-muted-foreground">{MOTIVO_NO_ES_ULTIMA}</p>}
          <TablaEvaluaciones
            codPersona={busqueda.alumno}
            filtros={busqueda}
            alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
            conAlumno
            ultima={ultima.data ?? null}
            puedeModificar={puedeModificar}
          />
        </>
      )}
    </>
  )
}
```

Replace `src/features/evaluaciones/mis-evaluaciones-page.tsx` with:

```tsx
import { getRouteApi } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { useSesion } from '@/lib/auth/use-sesion'
import { FiltrosEvaluaciones } from './components/filtros-evaluaciones'
import { TablaEvaluaciones } from './components/tabla-evaluaciones'
import type { FiltrosDeEvaluacion } from './schemas'

const ruta = getRouteApi('/_app/mis-evaluaciones')

export function MisEvaluacionesPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const codPersona = useSesion()?.codPersona ?? ''

  function cambiar(cambios: Partial<FiltrosDeEvaluacion>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  return (
    <>
      <PageHeader titulo="Mis evaluaciones" descripcion="Sus evaluaciones prácticas y su clasificación." />
      {codPersona === '' ? (
        <EmptyState titulo="Su usuario no tiene una persona asociada" descripcion="Consulte con el administrador." />
      ) : (
        <>
          <FiltrosEvaluaciones filtros={busqueda} alCambiar={cambiar} />
          <TablaEvaluaciones
            codPersona={codPersona}
            filtros={busqueda}
            alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
            conAlumno={false}
          />
        </>
      )}
    </>
  )
}
```

Replace `src/routes/_app/evaluaciones/index.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { EvaluacionesPage } from '@/features/evaluaciones/evaluaciones-page'
import { esquemaBusquedaEvaluaciones } from '@/features/evaluaciones/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/')({
  validateSearch: esquemaBusquedaEvaluaciones,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.evaluaciones, context.sesion.actual()),
  component: EvaluacionesPage,
})
```

Replace `src/routes/_app/mis-evaluaciones.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { MisEvaluacionesPage } from '@/features/evaluaciones/mis-evaluaciones-page'
import { esquemaBusquedaMisEvaluaciones } from '@/features/evaluaciones/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mis-evaluaciones')({
  validateSearch: esquemaBusquedaMisEvaluaciones,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misEvaluaciones, context.sesion.actual()),
  component: MisEvaluacionesPage,
})
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && pnpm test:run src/features/evaluaciones src/lib/auth
```

Expected: PASS — evaluaciones-page 7, plus the evaluation API and registry tests.

- [ ] **Step 6: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 255 tests.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add evaluation lists with role-based alumno picker"
```

---

### Task 14: Detalle de evaluación (CA-EVA-07, CA-EVA-08, CA-EVA-09, CA-EVA-10, CA-EVA-12)

**Files:**
- Create: `src/features/evaluaciones/cargar.ts`
- Modify (full rewrite): `src/features/evaluaciones/evaluacion-page.tsx`, `src/routes/_app/evaluaciones/$cod/index.tsx`
- Test: `src/features/evaluaciones/evaluacion-page.test.tsx`

**Interfaces:**
- Consumes: `consultasEvaluaciones.detalle/ultima`, `useEliminarEvaluacion`, `EvaluacionDetalle` (Task 6); `etiquetaCategoria`, `esBajoEstandar`, `MOTIVO_NO_ES_ULTIMA`, `CLASES_ETIQUETA_DEBRIEFING` (Task 3); `veSoloLoPropio` (Task 7); `Enlace`, `EnlaceExterno` (Task 8); M0's `SinPermisoError`, `ConfirmDialog`, `StatusBadge`, `PageHeader`, `formatearFecha(iso: string)`, `formatearNota(nota: number | null | undefined)`, `usePuede`, `toast`.
- Produces:
  - `cargarEvaluacionVisible(queryClient, actual: Sesion | null, codigo: string): Promise<EvaluacionDetalle>` — 404 → `notFound()`; an Alumno opening someone else's evaluation → `SinPermisoError`. Used by `/evaluaciones/$cod` and `/evaluaciones/$cod/editar`.
  - Real `EvaluacionPage({ codigo })`: `h1` = evaluation name; "Resultado" (Promedio with 2 decimals, Clasificación badge, Categoría with the response spelling, Estado del alumno, Fecha, Fase, Sub fase, Programa, Evaluador, Evaluación previa link, Material de respaldo link, Recomendación general); table "Calificaciones por maniobra" (Maniobra, Nota mínima, Nota obtenida, Causa, Observación, Recomendación; the three debriefing headers take their classes from `CLASES_ETIQUETA_DEBRIEFING`; rows carry `data-bajo-estandar`); with `Modify Evaluations`: "Modificar"/"Eliminar" enabled only on the alumno's latest evaluation, otherwise disabled with `MOTIVO_NO_ES_ULTIMA`; delete confirms, toasts the backend message and opens `/evaluaciones?alumno=<cod>`.

- [ ] **Step 1: Write the failing tests**

`src/features/evaluaciones/evaluacion-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirEvaluacion(username: string, codigo: string) {
  await iniciarComo(username)
  const vista = renderApp(`/evaluaciones/${codigo}`)
  await screen.findByRole('table', { name: 'Calificaciones por maniobra' })
  return vista
}

describe('Detalle de evaluación', () => {
  it('CA-EVA-08 muestra por maniobra nota mínima, nota obtenida, causa, observación y recomendación', async () => {
    await abrirEvaluacion('comandante.aguirre', '111111-1')
    const tabla = within(screen.getByRole('table', { name: 'Calificaciones por maniobra' }))
    const filas = tabla.getAllByRole('row').slice(1)
    expect(filas).toHaveLength(6)
    expect(within(filas[2] as HTMLElement).getAllByRole('cell').map((celda) => celda.textContent)).toEqual([
      'Maniobra 3',
      'B (Bueno)',
      'R (Regular)',
      'Falta de coordinación en pedales',
      'Pierde altura en el viraje',
      'Practicar virajes coordinados',
    ])
    expect(filas[2]).toHaveAttribute('data-bajo-estandar', 'true')
    expect(within(filas[0] as HTMLElement).getAllByRole('cell')[3]).toHaveTextContent('—')
  })

  it('CA-EVA-07 muestra el promedio y la clasificación que calculó el backend', async () => {
    await abrirEvaluacion('comandante.aguirre', '111111-1')
    expect(screen.getByText('16.50')).toBeInTheDocument()
    expect(screen.getByText('Bueno')).toHaveAttribute('data-tono', 'exito')
    expect(screen.getByText('Ponderada')).toBeInTheDocument()
  })

  it('CA-EVA-09 sin Modify Evaluations no se ofrece modificar ni eliminar', async () => {
    await abrirEvaluacion('instructor.perez', '555555-3')
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
  })

  it('CA-EVA-12 una evaluación que no es la última no se modifica y se explica el motivo', async () => {
    await abrirEvaluacion('comandante.aguirre', '555555-1')
    expect(
      await screen.findByText('Solo la última evaluación del alumno puede modificarse o eliminarse.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modificar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
  })

  it('CA-EVA-09 eliminar la última evaluación pide confirmación', async () => {
    const { usuario, router } = await abrirEvaluacion('comandante.aguirre', '555555-3')
    expect(await screen.findByRole('link', { name: 'Modificar' })).toHaveAttribute('href', '/evaluaciones/555555-3/editar')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Eliminar la evaluación?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Evaluación eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/evaluaciones'))
    expect(router.state.location.search).toMatchObject({ alumno: '555555' })
  })

  it('CA-EVA-10 el alumno no abre evaluaciones de otros alumnos', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/evaluaciones/555555-1')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-EVA-10 el alumno abre sus propias evaluaciones', async () => {
    await abrirEvaluacion('alumno.lopez', '111111-1')
    expect(screen.getByRole('heading', { level: 1, name: 'Ponderada Contacto Básico' })).toBeInTheDocument()
  })

  it('una evaluación inexistente muestra la página no encontrada', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/evaluaciones/999999-9')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/evaluaciones/evaluacion-page.test.tsx
```

Expected: FAIL — `Unable to find role="table" and name "Calificaciones por maniobra"`.

- [ ] **Step 3: Implement the loader, page and route**

`src/features/evaluaciones/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { SinPermisoError } from '@/lib/auth/guardas'
import { veSoloLoPropio } from '@/lib/auth/pantallas'
import type { Sesion } from '@/lib/auth/sesion'
import { consultasEvaluaciones, type EvaluacionDetalle } from './api'

export async function cargarEvaluacionVisible(
  queryClient: QueryClient,
  actual: Sesion | null,
  codigo: string,
): Promise<EvaluacionDetalle> {
  let evaluacion: EvaluacionDetalle
  try {
    evaluacion = await queryClient.ensureQueryData(consultasEvaluaciones.detalle(codigo))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
  if (actual && veSoloLoPropio(actual) && evaluacion.codPersona !== actual.codPersona) throw new SinPermisoError()
  return evaluacion
}
```

Replace `src/features/evaluaciones/evaluacion-page.tsx` with:

```tsx
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Enlace, EnlaceExterno } from '@/components/enlace'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { etiquetaCategoria } from '@/lib/dominio/categorias'
import { esBajoEstandar } from '@/lib/dominio/dirbe'
import { MOTIVO_NO_ES_ULTIMA } from '@/lib/dominio/evaluacion'
import { CLASES_ETIQUETA_DEBRIEFING } from '@/lib/dominio/tonos'
import { formatearFecha, formatearNota } from '@/lib/formato'
import { consultasEvaluaciones, useEliminarEvaluacion } from './api'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

export function EvaluacionPage({ codigo }: { codigo: string }) {
  const { data: evaluacion } = useSuspenseQuery(consultasEvaluaciones.detalle(codigo))
  const puedeModificar = usePuede('Modify Evaluations')
  const navegar = useNavigate()
  const eliminar = useEliminarEvaluacion()
  const ultima = useQuery({
    ...consultasEvaluaciones.ultima(evaluacion.codPersona, evaluacion.programa),
    enabled: puedeModificar,
  })
  const esUltima = ultima.data === evaluacion.codigo

  function confirmarEliminacion() {
    eliminar.mutate(evaluacion.codigo, {
      onSuccess: (mensaje) => {
        toast.success(mensaje)
        void navegar({ to: '/evaluaciones', search: { alumno: evaluacion.codPersona } })
      },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
    })
  }

  return (
    <>
      <PageHeader
        titulo={evaluacion.nombre}
        descripcion={`${evaluacion.codigo} · ${evaluacion.alumno}`}
        acciones={
          puedeModificar && (
            <>
              {esUltima ? (
                <Button variant="outline" asChild>
                  <Link to="/evaluaciones/$cod/editar" params={{ cod: evaluacion.codigo }}>
                    <Pencil aria-hidden />
                    Modificar
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <Pencil aria-hidden />
                  Modificar
                </Button>
              )}
              <ConfirmDialog
                disparador={
                  <Button variant="destructive" disabled={!esUltima || eliminar.isPending}>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                }
                titulo="¿Eliminar la evaluación?"
                descripcion={`Se eliminará la evaluación ${evaluacion.codigo} de ${evaluacion.alumno} y se revertirá su efecto en el estado del alumno.`}
                confirmar="Eliminar"
                destructivo
                alConfirmar={confirmarEliminacion}
              />
            </>
          )
        }
      />
      {puedeModificar && ultima.isSuccess && !esUltima && (
        <p className="text-sm text-muted-foreground">{MOTIVO_NO_ES_ULTIMA}</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Resultado</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Dato etiqueta="Promedio">
              <span className="text-lg tabular-nums">{formatearNota(evaluacion.promedio)}</span>
            </Dato>
            <Dato etiqueta="Clasificación">
              {evaluacion.clasificacion ? (
                <StatusBadge vocabulario="clasificacion" valor={evaluacion.clasificacion} />
              ) : (
                '—'
              )}
            </Dato>
            <Dato etiqueta="Categoría">
              {evaluacion.categoria ? etiquetaCategoria(evaluacion.categoria) : evaluacion.categoriaTexto}
            </Dato>
            <Dato etiqueta="Estado del alumno">
              <StatusBadge vocabulario="estado" valor={evaluacion.estadoAlumno} />
            </Dato>
            <Dato etiqueta="Fecha">
              <span className="tabular-nums">{formatearFecha(evaluacion.fecha)}</span>
            </Dato>
            <Dato etiqueta="Fase">{evaluacion.fase}</Dato>
            <Dato etiqueta="Sub fase">{evaluacion.subFase}</Dato>
            <Dato etiqueta="Programa">{evaluacion.programa}</Dato>
            <Dato etiqueta="Evaluador">{evaluacion.evaluador}</Dato>
            <Dato etiqueta="Evaluación previa">
              {evaluacion.codEvalPrevia ? (
                <Enlace to="/evaluaciones/$cod" params={{ cod: evaluacion.codEvalPrevia }}>
                  {evaluacion.codEvalPrevia}
                </Enlace>
              ) : (
                '—'
              )}
            </Dato>
            <Dato etiqueta="Material de respaldo">
              {evaluacion.archivoUrl ? (
                <EnlaceExterno href={evaluacion.archivoUrl} target="_blank" rel="noreferrer">
                  Abrir enlace
                </EnlaceExterno>
              ) : (
                '—'
              )}
            </Dato>
          </dl>
          {evaluacion.recomendacion && (
            <div className="mt-4 grid gap-1">
              <p className="text-xs text-muted-foreground">Recomendación general</p>
              <p className="text-sm">{evaluacion.recomendacion}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label="Calificaciones por maniobra">
          <TableHeader>
            <TableRow>
              <TableHead>Maniobra</TableHead>
              <TableHead>Nota mínima</TableHead>
              <TableHead>Nota obtenida</TableHead>
              <TableHead className={CLASES_ETIQUETA_DEBRIEFING.causa}>Causa</TableHead>
              <TableHead className={CLASES_ETIQUETA_DEBRIEFING.observacion}>Observación</TableHead>
              <TableHead className={CLASES_ETIQUETA_DEBRIEFING.recomendacion}>Recomendación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluacion.calificaciones.map((calificacion) => (
              <TableRow
                key={calificacion.idManiobra}
                data-bajo-estandar={esBajoEstandar(calificacion.notaMin, calificacion.nota)}
              >
                <TableCell className="font-medium">{calificacion.maniobra}</TableCell>
                <TableCell>
                  <StatusBadge vocabulario="calificativo" valor={calificacion.notaMin} />
                </TableCell>
                <TableCell>
                  <StatusBadge vocabulario="calificativo" valor={calificacion.nota} />
                </TableCell>
                <TableCell className="whitespace-normal">{calificacion.causa ?? '—'}</TableCell>
                <TableCell className="whitespace-normal">{calificacion.observacion ?? '—'}</TableCell>
                <TableCell className="whitespace-normal">{calificacion.recomendacion ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
```

Replace `src/routes/_app/evaluaciones/$cod/index.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarEvaluacionVisible } from '@/features/evaluaciones/cargar'
import { EvaluacionPage } from '@/features/evaluaciones/evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/$cod/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.evaluacion, context.sesion.actual()),
  loader: ({ context, params }) => cargarEvaluacionVisible(context.queryClient, context.sesion.actual(), params.cod),
  component: RutaEvaluacion,
})

function RutaEvaluacion() {
  const { cod } = Route.useParams()
  return <EvaluacionPage codigo={cod} />
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && pnpm test:run src/features/evaluaciones
```

Expected: PASS — evaluacion-page 8, plus the earlier evaluation tests.

- [ ] **Step 5: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 263 tests.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add evaluation detail"
```

---

### Task 15: Registrar evaluación — DIRBE grading grid (CA-EVA-02..07, CA-EVA-11, CA-EVA-13, M1-4, M1-5, M1-6)

**Files:**
- Generated by shadcn: `src/components/ui/toggle-group.tsx`, `src/components/ui/toggle.tsx`, `src/components/ui/textarea.tsx`
- Modify (full rewrite): `src/features/evaluaciones/schemas.ts`, `src/features/evaluaciones/registrar-evaluacion-page.tsx`, `src/routes/_app/turnos/$id/evaluar/$alumno.tsx`
- Create: `src/features/evaluaciones/components/grilla-calificaciones.tsx`, `src/features/evaluaciones/components/formulario-evaluacion.tsx`
- Test: `src/features/evaluaciones/schemas.test.ts`, `src/features/evaluaciones/registrar-evaluacion-page.test.tsx`

**Interfaces:**
- Consumes: Task 13's search exports (kept); `esCategoria`, `requiereEvaluador`, `etiquetaCategoria`, `Categoria`, `esBajoEstandar`, `esCalificacionValida`, `esNotaDirbe`, `opcionesDeNota`, `contarRespectoAlEstandar`, `NOTAS_DIRBE`, `NotaDirbe`, `CLASES_ETIQUETA_DEBRIEFING` (Task 3); `Enlace` (Task 8); `formatearNota` (M0); `CALIFICATIVOS` (M0); `CuerpoEvaluacion`, `EvaluacionGuardada`, `consultasEvaluaciones.delTurno/sugerencias`, `useRegistrarEvaluacion` (Task 6); `consultasTurnos.detalle` (Task 5); `cargarTurnoVisible` (Task 9); `aplicarErroresDeCampo` (Task 1).
- Produces:
  - `schemas.ts` adds `MENSAJE_NOMBRE_EVALUACION`, `esquemaEvaluacion` (nombre 10–30, categoría one of the request spellings, recomendación ≤ 250, optional http(s) link, evaluator code of 6 digits for Chequeo/Complementación, every maniobra graded, grade valid for its nota mínima, and for RI/BI/BR causa + observación + recomendación with the contract's messages), `type ValoresEvaluacion`, `type CalificacionInicial`, `valoresDeEvaluacion(calificaciones, inicial?)` (nota mínima D pre-graded D), `aCuerpoEvaluacion(valores): CuerpoEvaluacion`.
  - `<GrillaCalificaciones control register errores />`: one `group` per maniobra named by the maniobra, nota mínima badge, a `radiogroup` "Calificación de <maniobra>" with five `radio`s named `D (Demostrativo)`, `I (Insuficiente)`, `R (Regular)`, `B (Bueno)`, `E (Excelente)` (invalid ones disabled), and below-standard textareas "Observación", "Causa" and "Recomendación" whose label classes come from `CLASES_ETIQUETA_DEBRIEFING` (red, blue, default); live counter "Bajo el estándar: N", "Sobre el estándar: N", "Sin calificar: N".
  - `<FormularioEvaluacion valoresIniciales categorias categoriaFija? guardar cancelar />` (Task 16 reuses it): fields `Nombre`, `Categoría`, `Código del evaluador` (only for Chequeo/Complementación), `Enlace a material de respaldo`, `Recomendación general`; submit `Guardar evaluación`; on success toasts the backend `mensaje` with description `Promedio: NN.NN · Clasificación: X` (values from the backend, CA-EVA-07) and opens `/evaluaciones/<código>`.
  - Real `RegistrarEvaluacionPage({ id, codAlumno })`: only the turno's instructor gets the form (`MENSAJE_SOLO_INSTRUCTOR` otherwise); if the alumno already has an evaluation in this turno it says "La evaluación ya ha sido registrada." with a link; categories come from `GET /api/personas/{cod}/status` (CA-EVA-11), pre-selected when there is only one; evaluator code defaults to the session's `codPersona`.

- [ ] **Step 1: Add the toggle group and textarea**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm dlx shadcn@4.21.0 add toggle-group textarea -y </dev/null
```

Expected: `Created 3 files:` `src/components/ui/textarea.tsx`, `src/components/ui/toggle.tsx`, `src/components/ui/toggle-group.tsx`.

- [ ] **Step 2: Write the failing schema tests**

`src/features/evaluaciones/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { aCuerpoEvaluacion, esquemaEvaluacion, valoresDeEvaluacion, type ValoresEvaluacion } from './schemas'

function valida(cambios: Partial<ValoresEvaluacion> = {}): ValoresEvaluacion {
  return {
    ...valoresDeEvaluacion(
      [
        { idManiobra: 1, maniobra: 'Maniobra 1', notaMin: 'B', nota: 'B' },
        { idManiobra: 2, maniobra: 'Maniobra 2', notaMin: 'D' },
      ],
      { nombre: 'Ponderada Navegación', categoria: 'Ponderada' },
    ),
    ...cambios,
  }
}

function mensajes(valores: ValoresEvaluacion) {
  const resultado = esquemaEvaluacion.safeParse(valores)
  return resultado.success ? [] : resultado.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

describe('esquema de la evaluación', () => {
  it('fija la nota D cuando la nota mínima es D', () => {
    expect(valida().calificaciones[1]?.nota).toBe('D')
    expect(mensajes(valida())).toEqual([])
  })

  it('CA-EVA-03 valida nombre, categoría, recomendación y enlace', () => {
    expect(mensajes(valida({ nombre: 'Corta', categoria: 'chequeo', recomendacion: 'x'.repeat(251), url: 'drive' }))).toEqual([
      'nombre: Nombre debe tener de 10 a 30 caracteres.',
      'categoria: Ingresar categoria válida.',
      'recomendacion: Recomendación debe tener un máximo de 250 caracteres.',
      'url: Ingrese un enlace válido que empiece con https://',
    ])
  })

  it('CA-EVA-06 exige calificar todas las maniobras', () => {
    const valores = valida()
    valores.calificaciones[0] = { ...valores.calificaciones[0]!, nota: '' }
    expect(mensajes(valores)).toEqual(['calificaciones.0.nota: Califique la maniobra.'])
  })

  it('CA-EVA-04 rechaza una calificación que no corresponde a la nota mínima', () => {
    const valores = valida()
    valores.calificaciones[1] = { ...valores.calificaciones[1]!, nota: 'B' }
    expect(mensajes(valores)).toEqual(['calificaciones.1.nota: La calificación no es válida para la nota mínima.'])
  })

  it('CA-EVA-05 bajo el estándar exige causa, observación y recomendación', () => {
    const valores = valida()
    valores.calificaciones[0] = { ...valores.calificaciones[0]!, nota: 'R' }
    expect(mensajes(valores)).toEqual([
      'calificaciones.0.causa: La causa es requerida para calificaciones bajo el estándar.',
      'calificaciones.0.observacion: La observación es requerida para calificaciones bajo el estándar.',
      'calificaciones.0.recomendacion: La recomendación es requerida para calificaciones bajo el estándar.',
    ])
  })

  it('CA-EVA-11 Chequeo y Complementación exigen el código del evaluador', () => {
    expect(mensajes(valida({ categoria: 'Chequeo', codEvaluador: '44' }))).toEqual([
      'codEvaluador: Ingrese el código de 6 dígitos del evaluador.',
    ])
    expect(mensajes(valida({ categoria: 'Complementacion', codEvaluador: '444444' }))).toEqual([])
  })

  it('arma el cuerpo con la grafía de petición y sin evaluador en las programadas', () => {
    expect(aCuerpoEvaluacion(valida({ codEvaluador: '444444', recomendacion: '  ' }))).toEqual({
      nombre: 'Ponderada Navegación',
      categoria: 'Ponderada',
      recomendacion: null,
      url: null,
      codEvaluador: null,
      calificaciones: [
        { idManiobra: 1, nota: 'B', causa: null, observacion: null, recomendacion: null },
        { idManiobra: 2, nota: 'D', causa: null, observacion: null, recomendacion: null },
      ],
    })
    expect(aCuerpoEvaluacion(valida({ categoria: 'chequeoSubFase' })).categoria).toBe('chequeoSubFase')
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/evaluaciones/schemas.test.ts
```

Expected: FAIL — `valoresDeEvaluacion is not a function` (or the equivalent missing-export error).

- [ ] **Step 4: Write the form schema**

Replace `src/features/evaluaciones/schemas.ts` with:

```ts
import { z } from 'zod'
import { PROGRAMAS } from '@/features/catalogos/api'
import { esquemaPaginacion, numeroOpcional } from '@/lib/busqueda'
import { esCategoria, requiereEvaluador } from '@/lib/dominio/categorias'
import { esBajoEstandar, esCalificacionValida, esNotaDirbe, type NotaDirbe } from '@/lib/dominio/dirbe'
import type { CuerpoEvaluacion } from './api'

export const CLASIFICACIONES_FILTRO = ['Malo', 'Regular', 'Bueno', 'Excelente'] as const

const filtros = {
  ...esquemaPaginacion,
  programa: z.enum(PROGRAMAS).default('PDI').catch('PDI'),
  idSubfase: numeroOpcional,
  clasificacion: z.enum(CLASIFICACIONES_FILTRO).optional().catch(undefined),
}

export const esquemaBusquedaEvaluaciones = z.object({
  ...filtros,
  alumno: z.coerce
    .string()
    .regex(/^\d{6}$/)
    .optional()
    .catch(undefined),
})

export const esquemaBusquedaMisEvaluaciones = z.object(filtros)

export type BusquedaEvaluaciones = z.infer<typeof esquemaBusquedaEvaluaciones>

export type FiltrosDeEvaluacion = z.infer<typeof esquemaBusquedaMisEvaluaciones>

export const MENSAJE_NOMBRE_EVALUACION = 'Nombre debe tener de 10 a 30 caracteres.'

const MENSAJES_BAJO_ESTANDAR = {
  causa: 'La causa es requerida para calificaciones bajo el estándar.',
  observacion: 'La observación es requerida para calificaciones bajo el estándar.',
  recomendacion: 'La recomendación es requerida para calificaciones bajo el estándar.',
} as const

function esEnlace(valor: string) {
  try {
    const url = new URL(valor)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const textoLargo = (campo: string) => z.string().max(250, `${campo} debe tener un máximo de 250 caracteres.`)

export const esquemaEvaluacion = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Ingresar nombre de evaluación.')
      .min(10, MENSAJE_NOMBRE_EVALUACION)
      .max(30, MENSAJE_NOMBRE_EVALUACION),
    categoria: z.string().refine(esCategoria, 'Ingresar categoria válida.'),
    recomendacion: textoLargo('Recomendación'),
    url: z
      .string()
      .trim()
      .refine((valor) => valor === '' || esEnlace(valor), 'Ingrese un enlace válido que empiece con https://'),
    codEvaluador: z.string().trim(),
    calificaciones: z.array(
      z.object({
        idManiobra: z.number(),
        maniobra: z.string(),
        notaMin: z.string(),
        nota: z.string().min(1, 'Califique la maniobra.'),
        causa: textoLargo('Causa'),
        observacion: textoLargo('Observación'),
        recomendacion: textoLargo('Recomendación'),
      }),
    ),
  })
  .superRefine((valores, contexto) => {
    if (esCategoria(valores.categoria) && requiereEvaluador(valores.categoria) && !/^\d{6}$/.test(valores.codEvaluador)) {
      contexto.addIssue({
        code: 'custom',
        message: 'Ingrese el código de 6 dígitos del evaluador.',
        path: ['codEvaluador'],
      })
    }
    valores.calificaciones.forEach((calificacion, indice) => {
      if (calificacion.nota === '') return
      if (esNotaDirbe(calificacion.notaMin) && !esCalificacionValida(calificacion.notaMin, calificacion.nota)) {
        contexto.addIssue({
          code: 'custom',
          message: 'La calificación no es válida para la nota mínima.',
          path: ['calificaciones', indice, 'nota'],
        })
      }
      if (!esBajoEstandar(calificacion.notaMin, calificacion.nota)) return
      for (const campo of ['causa', 'observacion', 'recomendacion'] as const) {
        if (calificacion[campo].trim() === '') {
          contexto.addIssue({
            code: 'custom',
            message: MENSAJES_BAJO_ESTANDAR[campo],
            path: ['calificaciones', indice, campo],
          })
        }
      }
    })
  })

export type ValoresEvaluacion = z.input<typeof esquemaEvaluacion>

export type CalificacionInicial = { idManiobra: number; maniobra: string; notaMin: NotaDirbe; nota?: string } & Partial<
  Record<'causa' | 'observacion' | 'recomendacion', string | null>
>

export function valoresDeEvaluacion(
  calificaciones: readonly CalificacionInicial[],
  inicial: Partial<Omit<ValoresEvaluacion, 'calificaciones'>> = {},
): ValoresEvaluacion {
  return {
    nombre: '',
    categoria: '',
    recomendacion: '',
    url: '',
    codEvaluador: '',
    ...inicial,
    calificaciones: calificaciones.map((calificacion) => ({
      idManiobra: calificacion.idManiobra,
      maniobra: calificacion.maniobra,
      notaMin: calificacion.notaMin,
      nota: calificacion.nota ?? (calificacion.notaMin === 'D' ? 'D' : ''),
      causa: calificacion.causa ?? '',
      observacion: calificacion.observacion ?? '',
      recomendacion: calificacion.recomendacion ?? '',
    })),
  }
}

function textoONulo(valor: string) {
  const limpio = valor.trim()
  return limpio === '' ? null : limpio
}

export function aCuerpoEvaluacion(valores: ValoresEvaluacion): CuerpoEvaluacion {
  const categoria = esCategoria(valores.categoria) ? valores.categoria : 'Ponderada'
  return {
    nombre: valores.nombre.trim(),
    categoria,
    recomendacion: textoONulo(valores.recomendacion),
    url: textoONulo(valores.url),
    codEvaluador: requiereEvaluador(categoria) ? valores.codEvaluador.trim() : null,
    calificaciones: valores.calificaciones.flatMap((calificacion) =>
      esNotaDirbe(calificacion.nota)
        ? [
            {
              idManiobra: calificacion.idManiobra,
              nota: calificacion.nota,
              causa: textoONulo(calificacion.causa),
              observacion: textoONulo(calificacion.observacion),
              recomendacion: textoONulo(calificacion.recomendacion),
            },
          ]
        : [],
    ),
  }
}
```

- [ ] **Step 5: Run the schema tests**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/evaluaciones/schemas.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Write the failing page tests**

`src/features/evaluaciones/registrar-evaluacion-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(username: string, ruta: string) {
  await iniciarComo(username)
  const vista = renderApp(ruta)
  await screen.findByRole('heading', { name: 'Registrar evaluación' })
  return vista
}

async function abrirFormulario(username = 'instructor.perez', ruta = '/turnos/2/evaluar/222222') {
  const vista = await abrir(username, ruta)
  await screen.findByRole('heading', { name: 'Calificación por maniobra' })
  return vista
}

function maniobra(nombre: string) {
  return within(screen.getByRole('group', { name: new RegExp(`^${nombre}`) }))
}

async function calificar(usuario: UserEvent, nombre: string, nota: string) {
  await usuario.click(maniobra(nombre).getByRole('radio', { name: new RegExp(`^${nota} \\(`) }))
}

async function calificarTodasConB(usuario: UserEvent) {
  for (const numero of [1, 2, 3, 4, 5, 6]) await calificar(usuario, `Maniobra ${numero}`, 'B')
}

describe('Registrar evaluación', () => {
  it('CA-EVA-02 solo el instructor asignado al turno puede registrarla', async () => {
    await abrir('instructor.mendoza', '/turnos/2/evaluar/222222')
    expect(
      screen.getByText('Solo el instructor asignado al turno puede registrar esta evaluación.'),
    ).toBeInTheDocument()
  })

  it('CA-EVA-02 una vez por alumno y turno', async () => {
    await abrir('instructor.perez', '/turnos/1/evaluar/111111')
    expect(await screen.findByText('La evaluación ya ha sido registrada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver evaluación 111111-1' })).toHaveAttribute('href', '/evaluaciones/111111-1')
  })

  it('CA-EVA-03 pide nombre, categoría, recomendación, enlace y una calificación por maniobra', async () => {
    await abrirFormulario()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoría')).toBeInTheDocument()
    expect(screen.getByLabelText('Recomendación general')).toBeInTheDocument()
    expect(screen.getByLabelText('Enlace a material de respaldo')).toBeInTheDocument()
    expect(screen.getAllByRole('radiogroup')).toHaveLength(6)
  })

  it('CA-EVA-11 ofrece las categorías sugeridas por el estado del alumno', async () => {
    const { usuario } = await abrirFormulario()
    const opciones = within(screen.getByLabelText('Categoría')).getAllByRole('option')
    expect(opciones.map((opcion) => opcion.textContent)).toEqual([
      'Elija una categoría',
      'Ponderada',
      'Chequeo Sub Fase',
      'Complementación',
    ])
    expect(screen.queryByLabelText('Código del evaluador')).not.toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Complementación')
    expect(await screen.findByLabelText('Código del evaluador')).toHaveValue('444444')
  })

  it('CA-EVA-11 un alumno en chequeo solo admite Chequeo y exige el código del evaluador', async () => {
    const { usuario } = await abrirFormulario('instructor.mendoza', '/turnos/9/evaluar/777777')
    expect(within(screen.getByLabelText('Categoría')).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Elija una categoría',
      'Chequeo',
    ])
    expect(screen.getByLabelText('Categoría')).toHaveValue('Chequeo')
    await usuario.clear(screen.getByLabelText('Código del evaluador'))
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Ingrese el código de 6 dígitos del evaluador.')).toBeInTheDocument()
  })

  it('CA-EVA-04 solo habilita las calificaciones válidas para la nota mínima', async () => {
    await abrirFormulario('instructor.perez', '/turnos/8/evaluar/111111')
    const habilitadas = (nombre: string) =>
      maniobra(nombre)
        .getAllByRole('radio')
        .filter((opcion) => !(opcion as HTMLButtonElement).disabled)
        .map((opcion) => opcion.textContent)
    expect(habilitadas('Maniobra 1')).toEqual(['I', 'R', 'B'])
    expect(habilitadas('Maniobra 2')).toEqual(['I', 'R', 'B', 'E'])
    expect(habilitadas('Maniobra 4')).toEqual(['I', 'R'])
    expect(maniobra('Maniobra 2').getByRole('radio', { name: 'D (Demostrativo)' })).toBeDisabled()
  })

  it('CA-EVA-06 no guarda con maniobras sin calificar', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findAllByText('Califique la maniobra.')).toHaveLength(6)
  })

  it('CA-EVA-05 una calificación bajo el estándar exige observación, causa y recomendación', async () => {
    const { usuario } = await abrirFormulario()
    await calificar(usuario, 'Maniobra 1', 'R')
    const fila = maniobra('Maniobra 1')
    expect(fila.getByText('Observación')).toHaveClass('text-tono-peligro-texto')
    expect(fila.getByText('Causa')).toHaveClass('text-tono-info-texto')
    expect(fila.getByLabelText('Recomendación')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await fila.findByText('La causa es requerida para calificaciones bajo el estándar.')).toBeInTheDocument()
    expect(fila.getByText('La observación es requerida para calificaciones bajo el estándar.')).toBeInTheDocument()
    expect(fila.getByText('La recomendación es requerida para calificaciones bajo el estándar.')).toBeInTheDocument()
  })

  it('cuenta en vivo las maniobras bajo y sobre el estándar', async () => {
    const { usuario } = await abrirFormulario()
    await calificar(usuario, 'Maniobra 1', 'R')
    await calificar(usuario, 'Maniobra 2', 'E')
    expect(screen.getByText('Bajo el estándar: 1')).toBeInTheDocument()
    expect(screen.getByText('Sobre el estándar: 1')).toBeInTheDocument()
    expect(screen.getByText('Sin calificar: 4')).toBeInTheDocument()
  })

  it('CA-EVA-07 al guardar muestra el promedio y la clasificación del backend', async () => {
    const { usuario, router } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificarTodasConB(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Evaluación guardada con éxito.')).toBeInTheDocument()
    expect(screen.getByText('Promedio: 17.00 · Clasificación: Bueno')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/evaluaciones/222222-2'))
  })

  it('CA-EVA-07 el frontend no recalcula lo que devuelve el backend', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/evaluaciones/turno/:id/persona/:cod`, () =>
        HttpResponse.json(
          { mensaje: 'Evaluación guardada con éxito.', evaluación: { codigo: '222222-2', promedio: '18.3', clasificacion: 'Excelente' } },
          { status: 201 },
        ),
      ),
    )
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificarTodasConB(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Promedio: 18.30 · Clasificación: Excelente')).toBeInTheDocument()
  })

  it('CA-EVA-13 muestra las reglas del backend con su mensaje', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/evaluaciones/turno/:id/persona/:cod`, () =>
        HttpResponse.json({ mensaje: 'El alumno debe ser apto para realizar evaluaciones ponderadas.' }, { status: 400 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificarTodasConB(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('El alumno debe ser apto para realizar evaluaciones ponderadas.')).toBeInTheDocument()
  })

  it('CA-EVA-13 ubica bajo cada maniobra los errores de campo del backend', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/evaluaciones/turno/:id/persona/:cod`, () =>
        HttpResponse.json(["'calificaciones[2].nota': Ingresar calificación de maniobra."], { status: 400 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Nombre'), 'Ponderada Contacto Medio')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Ponderada')
    await calificarTodasConB(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await maniobra('Maniobra 3').findByText('Ingresar calificación de maniobra.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/evaluaciones/registrar-evaluacion-page.test.tsx
```

Expected: FAIL — `Unable to find role="heading" and name "Calificación por maniobra"` and the missing instructor message.

- [ ] **Step 8: Implement the grid and the form**

`src/features/evaluaciones/components/grilla-calificaciones.tsx`:

```tsx
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { StatusBadge } from '@/components/status-badge'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { contarRespectoAlEstandar, esBajoEstandar, esNotaDirbe, NOTAS_DIRBE, opcionesDeNota } from '@/lib/dominio/dirbe'
import { CLASES_ETIQUETA_DEBRIEFING } from '@/lib/dominio/tonos'
import { CALIFICATIVOS } from '@/lib/dominio/vocabulario'
import type { ValoresEvaluacion } from '../schemas'

const CAMPOS_DEBRIEFING = [
  ['observacion', 'Observación'],
  ['causa', 'Causa'],
  ['recomendacion', 'Recomendación'],
] as const

type Props = {
  control: Control<ValoresEvaluacion>
  register: UseFormRegister<ValoresEvaluacion>
  errores: FieldErrors<ValoresEvaluacion>['calificaciones']
}

export function GrillaCalificaciones({ control, register, errores }: Props) {
  const calificaciones = useWatch({ control, name: 'calificaciones' })
  const conteo = contarRespectoAlEstandar(calificaciones)

  return (
    <div className="grid gap-4">
      <p aria-live="polite" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
        <span>Bajo el estándar: {conteo.bajo}</span>
        <span>Sobre el estándar: {conteo.sobre}</span>
        <span>Sin calificar: {conteo.sinCalificar}</span>
      </p>
      {calificaciones.map((calificacion, indice) => {
        const error = errores?.[indice]
        const permitidas = esNotaDirbe(calificacion.notaMin) ? opcionesDeNota(calificacion.notaMin) : []
        const bajo = esBajoEstandar(calificacion.notaMin, calificacion.nota)
        return (
          <FieldSet key={calificacion.idManiobra} className="rounded-lg border p-4">
            <FieldLegend className="flex flex-wrap items-center gap-2">
              {calificacion.maniobra}
              <span className="text-xs font-normal text-muted-foreground">Nota mínima</span>
              <StatusBadge vocabulario="calificativo" valor={calificacion.notaMin} />
            </FieldLegend>
            <Field data-invalid={Boolean(error?.nota)}>
              <Controller
                control={control}
                name={`calificaciones.${indice}.nota`}
                render={({ field }) => (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={0}
                    aria-label={`Calificación de ${calificacion.maniobra}`}
                    value={field.value}
                    onValueChange={(valor) => {
                      if (valor) field.onChange(valor)
                    }}
                  >
                    {NOTAS_DIRBE.map((nota) => (
                      <ToggleGroupItem
                        key={nota}
                        value={nota}
                        disabled={!permitidas.includes(nota)}
                        aria-label={`${nota} (${CALIFICATIVOS[nota].descripcion})`}
                        className="w-10"
                      >
                        {nota}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
              <FieldError errors={[error?.nota]} />
            </Field>
            {bajo && (
              <div className="grid gap-3 md:grid-cols-3">
                {CAMPOS_DEBRIEFING.map(([campo, etiqueta]) => (
                  <Field key={campo} data-invalid={Boolean(error?.[campo])}>
                    <FieldLabel htmlFor={`calificacion-${indice}-${campo}`} className={CLASES_ETIQUETA_DEBRIEFING[campo]}>
                      {etiqueta}
                    </FieldLabel>
                    <Textarea
                      id={`calificacion-${indice}-${campo}`}
                      aria-invalid={Boolean(error?.[campo])}
                      {...register(`calificaciones.${indice}.${campo}`)}
                    />
                    <FieldError errors={[error?.[campo]]} />
                  </Field>
                ))}
              </div>
            )}
          </FieldSet>
        )
      })}
    </div>
  )
}
```

`src/features/evaluaciones/components/formulario-evaluacion.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import type { UseMutationResult } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { esCategoria, etiquetaCategoria, requiereEvaluador, type Categoria } from '@/lib/dominio/categorias'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { formatearNota } from '@/lib/formato'
import type { CuerpoEvaluacion, EvaluacionGuardada } from '../api'
import { aCuerpoEvaluacion, esquemaEvaluacion, type ValoresEvaluacion } from '../schemas'
import { GrillaCalificaciones } from './grilla-calificaciones'

type Props = {
  valoresIniciales: ValoresEvaluacion
  categorias: readonly Categoria[]
  categoriaFija?: boolean
  guardar: UseMutationResult<EvaluacionGuardada, Error, CuerpoEvaluacion>
  cancelar: ReactNode
}

function resumenDelResultado(resultado: EvaluacionGuardada) {
  const partes = [
    resultado.promedio === null ? null : `Promedio: ${formatearNota(resultado.promedio)}`,
    resultado.clasificacion ? `Clasificación: ${resultado.clasificacion}` : null,
  ].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : undefined
}

export function FormularioEvaluacion({ valoresIniciales, categorias, categoriaFija = false, guardar, cancelar }: Props) {
  const navegar = useNavigate()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const formulario = useForm<ValoresEvaluacion>({
    resolver: zodResolver(esquemaEvaluacion),
    defaultValues: valoresIniciales,
  })
  const { errors } = formulario.formState
  const categoria = useWatch({ control: formulario.control, name: 'categoria' })
  const conEvaluador = esCategoria(categoria) && requiereEvaluador(categoria)

  function enviar(valores: ValoresEvaluacion) {
    setErrorGeneral(null)
    guardar.mutate(aCuerpoEvaluacion(valores), {
      onSuccess: (resultado) => {
        toast.success(resultado.mensaje, { description: resumenDelResultado(resultado) })
        void navegar({ to: '/evaluaciones/$cod', params: { cod: resultado.codigo } })
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
  }

  return (
    <form noValidate onSubmit={formulario.handleSubmit(enviar)} className="grid gap-6">
      {errorGeneral && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar la evaluación</AlertTitle>
          <AlertDescription>{errorGeneral}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos de la evaluación</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="evaluacion-nombre">Nombre</FieldLabel>
              <Input id="evaluacion-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 10 a 30 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.categoria)}>
              <FieldLabel htmlFor="evaluacion-categoria">Categoría</FieldLabel>
              <NativeSelect
                id="evaluacion-categoria"
                className="w-full"
                disabled={categoriaFija}
                aria-invalid={Boolean(errors.categoria)}
                {...formulario.register('categoria')}
              >
                {!categoriaFija && <NativeSelectOption value="">Elija una categoría</NativeSelectOption>}
                {categorias.map((opcion) => (
                  <NativeSelectOption key={opcion} value={opcion}>
                    {etiquetaCategoria(opcion)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                {categoriaFija
                  ? 'La categoría no se cambia al modificar.'
                  : 'Sugeridas según el estado actual del alumno.'}
              </FieldDescription>
              <FieldError errors={[errors.categoria]} />
            </Field>
            {conEvaluador && (
              <Field data-invalid={Boolean(errors.codEvaluador)}>
                <FieldLabel htmlFor="evaluacion-evaluador">Código del evaluador</FieldLabel>
                <Input
                  id="evaluacion-evaluador"
                  inputMode="numeric"
                  maxLength={6}
                  aria-invalid={Boolean(errors.codEvaluador)}
                  {...formulario.register('codEvaluador')}
                />
                <FieldDescription>Código de 6 dígitos de quien voló el chequeo o la complementación.</FieldDescription>
                <FieldError errors={[errors.codEvaluador]} />
              </Field>
            )}
            <Field data-invalid={Boolean(errors.url)}>
              <FieldLabel htmlFor="evaluacion-url">Enlace a material de respaldo</FieldLabel>
              <Input
                id="evaluacion-url"
                type="url"
                placeholder="https://"
                aria-invalid={Boolean(errors.url)}
                {...formulario.register('url')}
              />
              <FieldDescription>Opcional.</FieldDescription>
              <FieldError errors={[errors.url]} />
            </Field>
            <Field data-invalid={Boolean(errors.recomendacion)} className="md:col-span-2">
              <FieldLabel htmlFor="evaluacion-recomendacion">Recomendación general</FieldLabel>
              <Textarea
                id="evaluacion-recomendacion"
                aria-invalid={Boolean(errors.recomendacion)}
                {...formulario.register('recomendacion')}
              />
              <FieldDescription>Máximo 250 caracteres.</FieldDescription>
              <FieldError errors={[errors.recomendacion]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Calificación por maniobra</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GrillaCalificaciones
            control={formulario.control}
            register={formulario.register}
            errores={errors.calificaciones}
          />
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {cancelar}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar evaluación'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 9: Implement the page and its loader**

Replace `src/features/evaluaciones/registrar-evaluacion-page.tsx` with:

```tsx
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Enlace } from '@/components/enlace'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { consultasTurnos } from '@/features/turnos/api'
import { useSesion } from '@/lib/auth/use-sesion'
import { consultasEvaluaciones, useRegistrarEvaluacion } from './api'
import { FormularioEvaluacion } from './components/formulario-evaluacion'
import { valoresDeEvaluacion } from './schemas'

export const MENSAJE_SOLO_INSTRUCTOR = 'Solo el instructor asignado al turno puede registrar esta evaluación.'

function Aviso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Alert>
      <CircleAlert />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function RegistrarEvaluacionPage({ id, codAlumno }: { id: number; codAlumno: string }) {
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const actual = useSesion()
  const esSuInstructor = actual?.codPersona != null && actual.codPersona === turno.codInstructor
  const existentes = useQuery({ ...consultasEvaluaciones.delTurno(codAlumno, id), enabled: esSuInstructor })
  const categorias = useQuery({ ...consultasEvaluaciones.sugerencias(codAlumno), enabled: esSuInstructor })
  const guardar = useRegistrarEvaluacion(id, codAlumno)
  const alumno = turno.alumnos.find((candidato) => candidato.codAlumno === codAlumno)
  const volver = (
    <Link to="/turnos/$id" params={{ id: String(id) }}>
      Volver al turno
    </Link>
  )

  function contenido() {
    if (!esSuInstructor) return <Aviso titulo="No disponible">{MENSAJE_SOLO_INSTRUCTOR}</Aviso>
    if (existentes.isPending || categorias.isPending) return <Skeleton className="h-64 w-full" />
    const registrada = existentes.data?.[0]
    if (registrada) {
      return (
        <Aviso titulo="Evaluación registrada">
          <p>La evaluación ya ha sido registrada.</p>
          <Enlace to="/evaluaciones/$cod" params={{ cod: registrada.codigo }} className="mt-2 inline-block">
            Ver evaluación {registrada.codigo}
          </Enlace>
        </Aviso>
      )
    }
    const sugeridas = categorias.data ?? []
    if (sugeridas.length === 0) {
      return (
        <Aviso titulo="Sin categorías disponibles">
          El estado actual del alumno no habilita ninguna categoría de evaluación.
        </Aviso>
      )
    }
    return (
      <FormularioEvaluacion
        valoresIniciales={valoresDeEvaluacion(
          turno.maniobras.map((item) => ({
            idManiobra: item.maniobra.id,
            maniobra: item.maniobra.nombre,
            notaMin: item.notaMin,
          })),
          { categoria: sugeridas.length === 1 ? sugeridas[0] : '', codEvaluador: actual?.codPersona ?? '' },
        )}
        categorias={sugeridas}
        guardar={guardar}
        cancelar={
          <Link to="/turnos/$id" params={{ id: String(id) }}>
            Cancelar
          </Link>
        }
      />
    )
  }

  return (
    <>
      <PageHeader
        titulo="Registrar evaluación"
        descripcion={`${alumno?.alumno ?? codAlumno} · ${turno.nombre} · ${turno.subfase}`}
        acciones={
          <Button variant="outline" asChild>
            {volver}
          </Button>
        }
      />
      {contenido()}
    </>
  )
}
```

Replace `src/routes/_app/turnos/$id/evaluar/$alumno.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { RegistrarEvaluacionPage } from '@/features/evaluaciones/registrar-evaluacion-page'
import { cargarTurnoVisible } from '@/features/turnos/cargar'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/evaluar/$alumno')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarEvaluacion, context.sesion.actual()),
  loader: ({ context, params }) =>
    cargarTurnoVisible(context.queryClient, context.sesion.actual(), params.id, params.alumno),
  component: RutaRegistrarEvaluacion,
})

function RutaRegistrarEvaluacion() {
  const { id, alumno } = Route.useParams()
  return <RegistrarEvaluacionPage id={Number(id)} codAlumno={alumno} />
}
```

- [ ] **Step 10: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && pnpm test:run src/features/evaluaciones src/features/turnos/turno-page.test.tsx
```

Expected: PASS — registrar-evaluacion-page 13, schemas 7, plus the earlier evaluation and turno-detail tests.

- [ ] **Step 11: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 283 tests.

- [ ] **Step 12: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add registrar evaluacion with dirbe grading grid"
```

---

### Task 16: Modificar evaluación (CA-EVA-09, CA-EVA-12, CA-EVA-13, M1-8)

**Files:**
- Modify (full rewrite): `src/features/evaluaciones/modificar-evaluacion-page.tsx`, `src/routes/_app/evaluaciones/$cod/editar.tsx`
- Test: `src/features/evaluaciones/modificar-evaluacion-page.test.tsx`

**Interfaces:**
- Consumes: `FormularioEvaluacion`, `valoresDeEvaluacion` (Task 15); `cargarEvaluacionVisible` (Task 14); `consultasEvaluaciones.detalle/ultima`, `useModificarEvaluacion` (Task 6); `MOTIVO_NO_ES_ULTIMA` (Task 3).
- Produces: real `ModificarEvaluacionPage({ codigo })` — only the alumno's latest evaluation gets the form (otherwise `MOTIVO_NO_ES_ULTIMA`); categoría fixed; grades, causas, observaciones and recomendaciones pre-filled; evaluator code starts empty because `GET` returns `codEvaluador: null` (`@Transient`), and the header names the recorded evaluator; the backend's 403 message is shown as is.

- [ ] **Step 1: Write the failing tests**

`src/features/evaluaciones/modificar-evaluacion-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(codigo: string, username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(`/evaluaciones/${codigo}/editar`)
  await screen.findByRole('heading', { name: 'Modificar evaluación' })
  return vista
}

function maniobra(nombre: string) {
  return within(screen.getByRole('group', { name: new RegExp(`^${nombre}`) }))
}

describe('Modificar evaluación', () => {
  it('CA-EVA-12 carga la última evaluación con sus calificaciones', async () => {
    await abrir('555555-3')
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Ponderada Contacto Avanzado')
    expect(screen.getByLabelText('Categoría')).toBeDisabled()
    expect(screen.getByLabelText('Categoría')).toHaveValue('Ponderada')
    expect(maniobra('Maniobra 1').getByRole('radio', { name: 'R (Regular)' })).toHaveAttribute('aria-checked', 'true')
    expect(maniobra('Maniobra 1').getByLabelText('Causa')).toBeInTheDocument()
  })

  it('CA-EVA-12 guarda los cambios y muestra el resultado del backend', async () => {
    const { usuario, router } = await abrir('555555-3')
    await screen.findByLabelText('Nombre')
    for (const numero of [1, 2, 3, 4]) {
      await usuario.click(maniobra(`Maniobra ${numero}`).getByRole('radio', { name: 'B (Bueno)' }))
    }
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Promedio: 17.00 · Clasificación: Bueno')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/evaluaciones/555555-3'))
  })

  it('CA-EVA-12 una evaluación anterior no se puede modificar y se explica el motivo', async () => {
    await abrir('555555-1')
    expect(
      await screen.findByText('Solo la última evaluación del alumno puede modificarse o eliminarse.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('CA-EVA-09 exige el permiso Modify Evaluations', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/evaluaciones/555555-3/editar')
    expect(await screen.findByText('No tiene permisos para esta acción.')).toBeInTheDocument()
  })

  it('CA-EVA-13 muestra el rechazo del backend con su mensaje', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/evaluaciones/:cod`, () =>
        HttpResponse.json({ mensaje: 'Solo se puede modificar la ultima evaluación realiza por el alumno.' }, { status: 403 }),
      ),
    )
    const { usuario } = await abrir('555555-3')
    await screen.findByLabelText('Nombre')
    for (const numero of [1, 2, 3, 4]) {
      await usuario.click(maniobra(`Maniobra ${numero}`).getByRole('radio', { name: 'B (Bueno)' }))
    }
    await usuario.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(
      await screen.findByText('Solo se puede modificar la ultima evaluación realiza por el alumno.'),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/evaluaciones/modificar-evaluacion-page.test.tsx
```

Expected: FAIL — `Unable to find a label with the text of: Nombre`.

- [ ] **Step 3: Implement the page and its loader**

Replace `src/features/evaluaciones/modificar-evaluacion-page.tsx` with:

```tsx
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MOTIVO_NO_ES_ULTIMA } from '@/lib/dominio/evaluacion'
import { consultasEvaluaciones, useModificarEvaluacion } from './api'
import { FormularioEvaluacion } from './components/formulario-evaluacion'
import { valoresDeEvaluacion } from './schemas'

export function ModificarEvaluacionPage({ codigo }: { codigo: string }) {
  const { data: evaluacion } = useSuspenseQuery(consultasEvaluaciones.detalle(codigo))
  const ultima = useQuery(consultasEvaluaciones.ultima(evaluacion.codPersona, evaluacion.programa))
  const guardar = useModificarEvaluacion(codigo)
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/evaluaciones/$cod" params={{ cod: codigo }}>
        Volver a la evaluación
      </Link>
    </Button>
  )

  function contenido() {
    if (ultima.isPending) return <Skeleton className="h-64 w-full" />
    if (ultima.data !== evaluacion.codigo || evaluacion.categoria === null) {
      return (
        <Alert>
          <CircleAlert />
          <AlertTitle>No disponible</AlertTitle>
          <AlertDescription>{MOTIVO_NO_ES_ULTIMA}</AlertDescription>
        </Alert>
      )
    }
    return (
      <FormularioEvaluacion
        valoresIniciales={valoresDeEvaluacion(
          evaluacion.calificaciones.map((calificacion) => ({
            idManiobra: calificacion.idManiobra,
            maniobra: calificacion.maniobra,
            notaMin: calificacion.notaMin,
            nota: calificacion.nota,
            causa: calificacion.causa,
            observacion: calificacion.observacion,
            recomendacion: calificacion.recomendacion,
          })),
          {
            nombre: evaluacion.nombre,
            categoria: evaluacion.categoria,
            recomendacion: evaluacion.recomendacion ?? '',
            url: evaluacion.archivoUrl ?? '',
          },
        )}
        categorias={[evaluacion.categoria]}
        categoriaFija
        guardar={guardar}
        cancelar={
          <Link to="/evaluaciones/$cod" params={{ cod: codigo }}>
            Cancelar
          </Link>
        }
      />
    )
  }

  return (
    <>
      <PageHeader
        titulo="Modificar evaluación"
        descripcion={`${evaluacion.codigo} · ${evaluacion.alumno} · Evaluador: ${evaluacion.evaluador}`}
        acciones={volver}
      />
      {contenido()}
    </>
  )
}
```

Replace `src/routes/_app/evaluaciones/$cod/editar.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarEvaluacionVisible } from '@/features/evaluaciones/cargar'
import { ModificarEvaluacionPage } from '@/features/evaluaciones/modificar-evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/$cod/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarEvaluacion, context.sesion.actual()),
  loader: ({ context, params }) => cargarEvaluacionVisible(context.queryClient, context.sesion.actual(), params.cod),
  component: RutaModificarEvaluacion,
})

function RutaModificarEvaluacion() {
  const { cod } = Route.useParams()
  return <ModificarEvaluacionPage codigo={cod} />
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build && pnpm test:run src/features/evaluaciones
```

Expected: PASS — modificar-evaluacion-page 5, plus the earlier evaluation tests.

- [ ] **Step 5: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 288 tests.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add modificar evaluacion"
```

---

### Task 17: Mock mode, decision log and review (M1-11)

**Files:**
- Modify: `docs/decisiones.md` (replace "Alcance diferido a M1" with the M1 section), `README.md` (mock mode and documents)

**Interfaces:**
- Consumes: every handler registered in `src/mocks/handlers.ts` (Tasks 4–6). M0's `src/mocks/browser.ts` starts `setupWorker(...handlers)` — the same array the tests use — and M0's `main.tsx` loads it only when `import.meta.env.DEV && config.mockApi`, so the M1 mocks serve `pnpm dev:mock` and never reach a production build.
- Produces: the M1 screens usable without backends in `pnpm dev:mock`; the M1 decisions recorded; the branch ready to merge.

- [ ] **Step 1: Check that the M1 mock data stays out of production**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && rm -rf dist && pnpm exec vite build && ! grep -rlE "Navegación Nocturna|instructor\.mendoza" dist && echo "sin datos de prueba"
```

Expected: the build succeeds and the command prints `sin datos de prueba` (no fixture or mock user in `dist/`). `pnpm dev:mock` itself is exercised in Step 6.

- [ ] **Step 2: Record the M1 decisions**

In `docs/decisiones.md`, replace the whole section that starts with `## Alcance diferido a M1` (heading and its two bullets) with:

```markdown
## Turnos y evaluaciones (M1)

Las decisiones M1-1 a M1-12 están en el §13 del spec; aquí queda cómo se aplicaron y lo que se decidió al implementarlas.

- **Contrato primero (M1-1).** `src/mocks/sigeda/turnos.ts`, `evaluaciones.ts` y `catalogos.ts` implementan `docs/contrato-api-turnos.md`. Los adaptadores de `src/features/*/api.ts` aceptan también las formas actuales del backend: `200` con la entidad cruda al guardar un turno, `cantGrupo` en la lista y un detalle sin `alumnosTurno`.
- **Errores (M1-2).** `normalizarError` entiende `ErrorResponse` (`messages[]` → campos, `message` → mensaje), `{ mensaje }` y `{ "mensaje:": [] }` incluso con 403, y el 410 de un turno vencido. `aplicarErroresDeCampo` lleva cada error de campo del backend a su campo (`alumnosTurno[0].horaInicio` → `alumnosTurno.0.horaInicio`).
- **Selectores nativos.** Los formularios y filtros usan `native-select` de shadcn: las opciones deshabilitadas (aeronaves no disponibles) y los grupos de alumnos son nativos y accesibles.
- **Tabla con TanStack Table v9.** `DataTable` usa `useTable` con ordenamiento y paginación manuales; la página, el tamaño y el orden viven en la URL (`page`, `size`, `property`, `direction`) y el servidor pagina y ordena. Se muestran 10 filas (el backend usa 6 por defecto).
- **Filtros en la URL.** Cada lista valida su búsqueda con zod (`.default().catch()`): una URL mal escrita vuelve a los valores por defecto en lugar de fallar. El código de alumno se lee con `z.coerce.string()` porque el router convierte `?alumno=555555` en número.
- **Lo propio del alumno (CA-TUR-14, CA-EVA-10).** El alumno y el personal comparten el permiso `Read`, así que las listas generales (`/turnos`, `/turnos/dia`, `/evaluaciones`) declaran los roles del personal, y Mis turnos y Mis evaluaciones el rol Alumno. En los detalles, el cargador de la ruta rechaza a un alumno que no vuela en el turno o que no es dueño de la evaluación. Es la única comprobación por nombre de rol.
- **Detalles con cargador.** Las rutas de detalle cargan con `ensureQueryData`; un 404 del backend muestra la página no encontrada.
- **Migas de pan (M1-12).** Salen del registro de pantallas (`padre`); se omiten los niveles que el rol no puede abrir y no se muestran en Inicio.
- **Registrar evaluación (M1-6).** La acción la ve solo el instructor asignado al turno (§3.2 del spec: también registra los chequeos de sus turnos) y desaparece cuando el alumno ya tiene una evaluación en ese turno. La página repite ambas comprobaciones si se entra por URL. Las categorías son las que sugiere `GET /api/personas/{cod}/status`.
- **Última evaluación (M1-8).** Ningún endpoint expone `codEvalRealizada`; la interfaz toma como última la de fecha más reciente y, a igual fecha, la de mayor turno y correlativo del código. El backend decide al final y su 403 se muestra tal cual.
- **Modificar una evaluación.** La categoría no cambia. `codEvaluador` es `@Transient` y llega vacío en el detalle, así que en Chequeo y Complementación hay que volver a indicarlo.
- **Formulario de turno.** Cambiar el programa quita el instructor y los alumnos (dependen del programa). Al modificar, programa y sub fase son de solo lectura (`TurnoUpdate` no los acepta) y la sub fase se recupera por nombre porque el detalle no trae su id. Una maniobra con nota mínima D queda calificada D.
- **Cruce de horarios (M1-10).** Se advierte con los turnos de la misma aeronave ese día y se pide confirmación al guardar; el backend decide (dependencia 15).
- **Orden de vuelo.** `/turnos/dia` abre el día de hoy; el briefing diario se ubica 2 h antes del primer vuelo del día.
- **Datos de prueba.** Parten del seed: los turnos sembrados reciben instructor y aeronave (en el seed son nulos), se agregan dos turnos a una semana de la fecha actual, el alumno 777777 está En Chequeo, se agrega la evaluación 111111-1 y se omiten las filas mal formadas 555555-3-5 y 555555-3-2. El usuario `instructor.mendoza` del seed se suma a los usuarios de prueba.
- **Sesión más robusta (revisión final de M0).** Una respuesta 2xx de `/auth/refresh` que no es JSON cuenta como servicio no disponible y conserva el refresh token; `destinoSeguro` rechaza también las rutas que el navegador normaliza a `//…` (por ejemplo `/x/..//evil.com`); `sesion.restaurar` solo borra los tokens cuando el perfil responde 401, 403 o 404, no ante una falla de red o del servidor.
- **Errores 4xx y 5xx.** En un 5xx nunca se muestra `message`, `messages`, `mensaje` ni un texto plano (van a la consola): solo `error` o el mensaje genérico. En un 4xx con forma `ErrorResponse` se muestra `message` y, si no hay, `error`.
- **Estilos compartidos mientras la revisión de diseño sigue abierta.** Las pantallas de M1 no definen colores propios: los enlaces de texto usan `Enlace`/`EnlaceExterno` (`src/components/enlace.tsx`) y la convención de etiquetas del debriefing (observación roja, causa azul, recomendación sin color) vive en `CLASES_ETIQUETA_DEBRIEFING` de `src/lib/dominio/tonos.ts`. Un cambio de la revisión se hace en `theme.css` o en esos dos módulos.
- **Guardas verificadas.** `src/lib/auth/cobertura-de-rutas.test.ts` falla si una ruta de `/_app` no tiene pantalla registrada o si su archivo no llama a `exigirPantalla` con la pantalla de su propia ruta.
- **Sin Playwright todavía (M1-11).** Las pruebas de componente cubren los criterios contra los mocks del contrato; la suite E2E llega con el primer hito que corra contra un `sigeda-back` corregido.
```

- [ ] **Step 3: Update the README**

In `README.md`, replace the sentence

```markdown
MSW responde en el navegador a `/auth/*` y `/api/usuarios/*` con los usuarios sembrados de `sigeda-back`. Contraseña de todos: `123`.
```

with

```markdown
MSW responde en el navegador a `/auth/*`, `/api/usuarios/*` y a los turnos, evaluaciones y catálogos de `docs/contrato-api-turnos.md`, con datos basados en el seed de `sigeda-back` (los datos vuelven al estado inicial al recargar). Contraseña de todos: `123`.
```

add this row to the users table, after the `instructor.perez` row:

```markdown
| `instructor.mendoza` | Instructor |
```

and add this line at the end of the `## Documentación` list:

```markdown
- Contrato de turnos y evaluaciones: `docs/contrato-api-turnos.md`
```

- [ ] **Step 4: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 288 tests (M0's 101 plus 187 from M1).

- [ ] **Step 5: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "docs: record m1 decisions and mock mode"
```

- [ ] **Step 6: Visual check in the browser**

Use the `run` skill to start `pnpm dev:mock` (with the Node `PATH` prefix) and capture screenshots of:

1. `/turnos` as `jefe.operaciones`, then `/turnos/nuevo` with one alumno and one maniobra added and the overlap alert showing (fecha = one week from today, Robinson R22, 08:00–09:30)
2. `/turnos/8` (timeline), `/turnos/8/briefing/111111`, and `/turnos/dia/<date one week from today, yyyy-MM-dd>` (orden de vuelo)
3. `/turnos/2/evaluar/222222` as `instructor.perez` with maniobra 1 graded R (expanded red/blue labels) — light and dark theme
4. `/evaluaciones?alumno=%22555555%22` and `/evaluaciones/111111-1` as `comandante.aguirre`
5. `/mis-turnos` and `/mis-evaluaciones` as `alumno.lopez` at 390 px width

Check against spec §8: DIRBE and clasificación badges carry a text label; observación label red, causa blue, recomendación default; numbers aligned (`tabular-nums`) with two decimals; dates `dd/MM/yyyy`; breadcrumbs in the header; no horizontal page scroll at 390 px (tables scroll inside their frame). Fix functional defects in the owning component; any visual adjustment goes into `src/theme.css` tokens or the shared modules (`Enlace`, `CLASES_ETIQUETA_DEBRIEFING`, `StatusBadge`), never page-specific colours. Rerun `pnpm verify` and commit with `style: …`. The spec §8 design review is **still open** (the user has not approved the M0 look yet): include the screenshots in the final report so M0 and M1 can be reviewed together, and do not treat this step as that approval.

- [ ] **Step 7: Finish the branch**

Use superpowers:finishing-a-development-branch to merge `feat/m1-turnos-evaluaciones` into `main`.

---

## Coverage

Every acceptance criterion (as amended by spec §13.3) and every decision of §13.2, with the tasks and test files that prove it.

| Criterion / decision | Tasks | Proven by |
|---|---|---|
| CA-TUR-01 list columns, filters and page in the URL | 5, 8 | `features/turnos/api.test.ts`, `turnos-page.test.tsx` |
| CA-TUR-02 fecha after today | 3, 10 | `calendario.test.ts`, `turnos/schemas.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-03 nombre 10–30, not blank | 10 | `turnos/schemas.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-04 at least one alumno and maniobra, no duplicates | 10 | `turnos/schemas.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-05 maniobras of the subfase; change confirms and clears | 4, 10 | `catalogos/api.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-06 nota mínima D/I/R/B/E | 10 | `turnos/schemas.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-07 HH:mm, fin > inicio, overlap warning | 3, 5, 10 | `turno.test.ts`, `turnos/api.test.ts`, `turnos/schemas.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-08 unavailable aircraft not selectable | 4, 10 | `catalogos/api.test.ts`, `turnos/schemas.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-09 instructor and aircraft required | 10 | `turnos/schemas.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-10 detail, alumnos with hours, maniobras, timeline | 3, 5, 9 | `briefing.test.ts`, `turnos/api.test.ts`, `turno-page.test.tsx` |
| CA-TUR-11 (amended) edit/delete only while the date is after today; delete confirms | 3, 5, 9, 11 | `turno.test.ts`, `turnos/api.test.ts`, `turno-page.test.tsx`, `modificar-turno-page.test.tsx` |
| CA-TUR-12 edit applies the same validations | 11 | `modificar-turno-page.test.tsx` |
| CA-TUR-13 backend validation errors under each field | 1, 10 | `errors.test.ts`, `formularios.test.ts`, `registrar-turno-page.test.tsx` |
| CA-TUR-14 alumno sees only own turnos | 5, 7, 8, 9, 12 | `pantallas.test.ts`, `rutas-m1.test.tsx`, `turnos-page.test.tsx`, `turno-page.test.tsx`, `hoja-de-briefing-page.test.tsx` |
| CA-TUR-15 orden de vuelo grouped by aircraft, sorted by hour | 12 | `orden-de-vuelo.test.ts`, `orden-de-vuelo-page.test.tsx` |
| CA-TUR-16 briefing: D/I/R instructor explains, B/E alumno presents | 3, 12 | `briefing.test.ts`, `hoja-de-briefing-page.test.tsx` |
| CA-EVA-01 list columns and filters | 6, 13 | `evaluaciones/api.test.ts`, `evaluaciones-page.test.tsx` |
| CA-EVA-02 (amended) only the turno's instructor, once per alumno and turno | 3, 6, 9, 15 | `evaluacion.test.ts`, `evaluaciones/api.test.ts`, `turno-page.test.tsx`, `registrar-evaluacion-page.test.tsx` |
| CA-EVA-03 form fields and one grade per maniobra | 15 | `evaluaciones/schemas.test.ts`, `registrar-evaluacion-page.test.tsx` |
| CA-EVA-04 (amended) only valid grades per M1-4 | 3, 15 | `dirbe.test.ts`, `evaluaciones/schemas.test.ts`, `registrar-evaluacion-page.test.tsx` |
| CA-EVA-05 below standard requires observación, causa, recomendación | 3, 15 | `dirbe.test.ts`, `evaluaciones/schemas.test.ts`, `registrar-evaluacion-page.test.tsx` |
| CA-EVA-06 cannot save ungraded maniobras | 15 | `evaluaciones/schemas.test.ts`, `registrar-evaluacion-page.test.tsx` |
| CA-EVA-07 promedio and clasificación from the backend | 6, 14, 15, 16 | `evaluaciones/api.test.ts`, `evaluacion-page.test.tsx`, `registrar-evaluacion-page.test.tsx`, `modificar-evaluacion-page.test.tsx` |
| CA-EVA-08 detail per maniobra | 6, 14 | `evaluaciones/api.test.ts`, `evaluacion-page.test.tsx` |
| CA-EVA-09 modify/delete only with Modify Evaluations; delete confirms | 13, 14, 16 | `evaluaciones-page.test.tsx`, `evaluacion-page.test.tsx`, `modificar-evaluacion-page.test.tsx` |
| CA-EVA-10 alumno sees only own evaluations | 7, 13, 14 | `rutas-m1.test.tsx`, `pantallas.test.ts`, `evaluaciones-page.test.tsx`, `evaluacion-page.test.tsx` |
| CA-EVA-11 (new) categories from suggestions; evaluator code for Chequeo/Complementación | 3, 6, 15 | `categorias.test.ts`, `evaluaciones/api.test.ts`, `evaluaciones/schemas.test.ts`, `registrar-evaluacion-page.test.tsx` |
| CA-EVA-12 (new) only the latest evaluation is modifiable; others explain why | 3, 6, 13, 14, 16 | `evaluacion.test.ts`, `evaluaciones/api.test.ts`, `evaluaciones-page.test.tsx`, `evaluacion-page.test.tsx`, `modificar-evaluacion-page.test.tsx` |
| CA-EVA-13 (new) backend rule errors shown with their message | 1, 6, 15, 16 | `errors.test.ts`, `evaluaciones/api.test.ts`, `registrar-evaluacion-page.test.tsx`, `modificar-evaluacion-page.test.tsx` |
| M1-1 contract-first, tolerate today's shapes | 4, 5, 6 | `turnos/api.test.ts` (201 and raw 200, `cantGrupo`, detail without `alumnosTurno`), `evaluaciones/api.test.ts` (`evaluacion` key) |
| M1-2 error normaliser learns ErrorResponse, `{mensaje}`, `{"mensaje:"}`, 410 | 1 | `errors.test.ts`; used in `turno-page.test.tsx`, `modificar-turno-page.test.tsx` |
| M1-3 two Categoria spellings in one module | 3, 6 | `categorias.test.ts`, `evaluaciones/api.test.ts` |
| M1-4 DIRBE options and below-standard set | 3, 15 | `dirbe.test.ts`, `registrar-evaluacion-page.test.tsx` |
| M1-5 causa/observación/recomendación required client-side | 15 | `evaluaciones/schemas.test.ts`, `registrar-evaluacion-page.test.tsx` |
| M1-6 registrar only for the turno's instructor; evaluator code for Chequeo/Complementación | 9, 15 | `turno-page.test.tsx`, `registrar-evaluacion-page.test.tsx` |
| M1-7 turno edit/delete disabled once the date is today or earlier, with the explanation | 3, 9, 11 | `turno.test.ts`, `turno-page.test.tsx`, `modificar-turno-page.test.tsx` |
| M1-8 only the latest evaluation can be modified or deleted | 3, 13, 14, 16 | `evaluacion.test.ts`, `evaluaciones-page.test.tsx`, `evaluacion-page.test.tsx`, `modificar-evaluacion-page.test.tsx` |
| M1-9 alumno pickers by role | 4, 13 | `catalogos/api.test.ts`, `evaluaciones-page.test.tsx` |
| M1-10 client-side aircraft overlap warning, saving still allowed | 3, 5, 10 | `turno.test.ts`, `turnos/api.test.ts`, `registrar-turno-page.test.tsx` |
| M1-11 Playwright deferred | 17 | `docs/decisiones.md` (no Playwright task in M1) |
| M1-12 breadcrumbs | 7 | `pantallas.test.ts`, `migas.test.tsx` |

Coordinator requirements added after the M0 final review:

| Requirement | Tasks | Proven by |
|---|---|---|
| 5xx never shows `message` (ErrorResponse with SQL, rule body, plain text) | 1 | `errors.test.ts` (`en un 5xx …` cases, plus M0's two 500 cases) |
| 4xx `ErrorResponse` without `statusCode` shows `message`, else `error` | 1 | `errors.test.ts` (`en un 4xx con forma ErrorResponse …`) |
| Non-JSON 2xx from `/auth/refresh` → `no-disponible`, refresh token kept | 2 | `tokens.test.ts` |
| `destinoSeguro` rejects a resolved pathname starting with `//` | 2 | `guardas.test.ts` |
| `sesion.restaurar` keeps the refresh token on profile failures with status 0 or ≥ 500; clears it for 401/403/404 | 2 | `sesion.test.ts` |
| Every `/_app` route has a `PANTALLAS` entry and its file calls `exigirPantalla` with it | 7 | `cobertura-de-rutas.test.ts` |
| Design review still open: styling only through tokens and shared modules | 3, 8, 12–15, 17 | `tonos.test.ts`; `Enlace`/`EnlaceExterno` used for every M1 text link; `CLASES_ETIQUETA_DEBRIEFING` used by the grid and the detail (asserted in `registrar-evaluacion-page.test.tsx`) |

Spec §8 items covered by M1: DIRBE segmented control with invalid grades disabled and below-standard expansion with red/blue/default labels (Task 15), live below/above counter (Task 15), dates `dd/MM/yyyy` and grades with two decimals (Tasks 8, 13, 14), breadcrumbs in the header (Task 7), empty states with a next action and confirm dialogs (Tasks 8, 9, 14), mock mode for review without backends (Task 17).

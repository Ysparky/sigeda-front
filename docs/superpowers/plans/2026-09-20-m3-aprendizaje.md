# M3 Aprendizaje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three M3 screens of spec §15.3 (Documentos, Cuestionario de práctica and Consultas) working against MSW mocks of `docs/contrato-api-aprendizaje.md`, with the 36 acceptance criteria CA-DOC-01..11, CA-CUE-01..12 and CA-CON-01..13 proven by tests, plus the four M2 cleanups the M2 review parked.

**Architecture:** Contract-first, as in M1 and M2: the handlers in `src/mocks/ia/` (`datos`, `comun`, `documentos`, `cuestionarios`, `consultas`) implement `docs/contrato-api-aprendizaje.md` — including its §7 fixtures and the per-document poll counter — over one in-memory store that `reiniciarIaMock()` resets after every test, and they are registered in `src/mocks/handlers.ts` beside the `sigeda/` ones under the same `VITE_MOCK_API` flag (M3-16). One feature folder, `src/features/aprendizaje/`, holds `api.ts` (types, zod schemas, query keys, queries and mutations against `lib/api/ia.ts`), `schemas.ts` (the two URL search schemas and the generation form schema), `mensajes.ts` (the closed list of server messages the UI may show, M3-5), `use-documentos-listos.ts` and the three pages with their `components/`. Domain helpers that do not touch the network — the A1–A16 texts, the MIME and size rules, the answer comparison of M3-2 and the `[n]` citation split of M3-10 — live in `src/lib/dominio/aprendizaje.ts`. The HTTP client gains multipart upload and a request deadline (`subirArchivo`, `conLimiteDeTiempo`), which is all M3-6 and M3-4 need from `lib/api`. Routing, permissions and the sidebar stay where M0–M2 put them: three new `Read` screens in the Aprendizaje group (M3-12, M3-13) and two new keys in `src/lib/dependencias.ts` for the actions that wait on backend dependency 39 (M3-1). Timing is one shared convention (`src/test/tiempo.ts`, M3-17) landed before any screen that needs it.

**Tech Stack:** as M2 (Vite 8 · React 19 · TypeScript 6.0 · TanStack Router 1.170 · TanStack Query 5.103 · TanStack Table 9.2 · zod 4.6 · react-hook-form 7.88 · shadcn/ui 4.21 · MSW 2.15 · Vitest 5.0 · oxlint 1.83) plus the shadcn component `popover`, added in Task 12.

**Spec:** `docs/superpowers/specs/2026-09-19-sigeda-web-design.md` — §5 (session, permissions, API layer), §8 (design), §9 (testing) and **§15 (M3 addendum: decisions M3-1..M3-17, the screens and fixed texts A1–A16 of §15.3, the 36 criteria of §15.4 and dependencies 39–50 of §15.5; binding)**. API contract the mocks implement: `docs/contrato-api-aprendizaje.md`, in particular its §5 (messages C1–C13) and §7 (fixtures). Both documents are already committed on this branch; no task copies them.

**Baseline:** branch `feat/m3-aprendizaje` at `8190cc5` = M2 final (`e1b0082`) plus two docs commits (the M3 spec addendum with `docs/contrato-api-aprendizaje.md`, and the addendum review). Facts of that baseline this plan relies on: the suite has **456 tests** in 70 files; `pnpm verify` is `tsc -b && oxlint --deny-warnings && vitest run && vite build`; `crearQueryClient()` sets `staleTime: 30_000` and retries status 0 or ≥ 500 twice, while `src/test/render.tsx` builds its own client with `staleTime` left at 0 — the cleanup of Task 1; `normalizarError` understands both Nest shapes (`{statusCode, message}` with `message` a string or an array) and surfaces `cuerpo.error` for a status ≥ 500, which is where the English `"Internal Server Error"` of M3-5 comes from; `errorDePrimeraCarga` returns an error only for a query that never had data; `ia` (`src/lib/api/ia.ts`) already attaches the `sigeda-back` access token and shares the 401-refresh path (M3-1); `dependencias.ts` reads `VITE_MOCK_API` and `VITE_DEPENDENCIAS_RESUELTAS` through the getters of `config.ts` on every call; `pantallas.ts` already declares the `Aprendizaje` group last in `ORDEN_GRUPOS`; `cobertura-de-rutas.test.ts` fails if a route under `/_app` has no screen or calls `exigirPantalla` with the wrong one; `useFakeTimers` appears nowhere in `src/` and MSW's `delay` only at `src/features/turnos/turno-page.test.tsx:177`; `src/components/ui/` has no `popover`; the shadcn `Breadcrumb` renders the current page as `role="link"` without `href`, and the sidebar has `aria-label="Menú principal"` but no `navigation` role.

**Verified against that exact baseline before writing this plan:** a clone at `8190cc5` received every task below in order, with `pnpm verify` green after each one (final: **588 tests** in 84 files); then the plan text itself was replayed mechanically into a second fresh clone at `8190cc5`, green after every task and file-identical to the first, and each "run them to verify they fail" step was re-run against the state just before its task. APIs checked in that work (versions from `package.json`):

- **Vitest 5.0.1 fake timers**: `vi.useFakeTimers({ shouldAdvanceTime: true })` is the combination that works here. Plain `useFakeTimers()` deadlocks against MSW, whose response pipeline awaits real microtasks; `shouldAdvanceTime` lets the clock follow real time while `vi.advanceTimersByTimeAsync(ms)` still jumps ahead and flushes promises, so a 3 s `refetch` interval and a 120 s deadline are both exact. `restoreMocks: true` does **not** restore timers, so `src/test/setup.ts` calls `vi.useRealTimers()` in its `afterEach`.
- **@testing-library/user-event 14.6.7**: `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` is required for any click under fake timers — `vi.advanceTimersByTime` throws when timers are not mocked, so it cannot be passed unconditionally, which is why `renderApp` takes the user-event instance as its second argument instead of building one. `upload()` in this version takes **no** options object: the `accept` filter is a **setup** option (`userEvent.setup({ applyAccept: false })`), and with the default `true` a `.png` never reaches the input, so A11 is proven with that setup override and with an oversized `.pdf`.
- **MSW 2.15**: `delay('infinite')` keeps `POST /quizzes/generate` pending for the 120 s deadline; `delay(3000)` inside a handler resolves exactly when the fake clock reaches 3 s; `server.events.on('request:start', …)` plus `removeListener` counts polls and uploads; registering `${IA}/documents/upload` **before** `${IA}/documents/:id` is what keeps the upload handler from being shadowed.
- **jsdom 30.1 + Node 25 `fetch`**: a multipart upload fails in the jsdom environment because jsdom's `Blob`/`File`/`FormData`/`ReadableStream` are not the ones Node's `fetch` consumes — jsdom's file throws `Cannot read properties of undefined (reading '_buffer')` and Node's `FormData` body hangs forever. `src/test/entorno.ts`, registered as the **first** setup file so it runs before MSW loads undici, swaps those six globals for Node's; `userEvent.upload` and `request.formData()` both work afterwards.
- **TanStack Query 5.103**: `refetchInterval` as a function is evaluated when a fetch settles, i.e. one commit **before** React re-renders with the new poll count, so it fires a 41st request; the polling of CA-DOC-06 is therefore an effect that re-arms a `setTimeout` after each response, with the count derived during render (the documented "adjust state when props change" escape hatch) so `rendido` is already true in the commit that received the 40th answer. `mutation.variables` renders the in-flight question of CA-CON-04; `queryClient.refetchQueries` keeps the poll effect's dependencies stable; `enabled: false` keeps the session query quiet for a conversation this session created.
- **react-hook-form 7.88 + @hookform/resolvers 5.9 + zod 4.6**: `z.uuidv4()` exists and rejects a non-UUID, which is what the two search schemas use; an array `.min()` error lands in `errors.<array>.root ?? errors.<array>`; a checkbox group is a `Controller` over a `string[]`, as M2's grupo form already does.
- **Radix (radix-ui 1.6) through shadcn 4.21**: `ToggleGroup type="single"` gives its items `role="radio"` with `aria-checked`, the same control M1 uses for DIRBE grades, so the multiple-choice and true/false answers need no new primitive; `popover` renders `role="dialog"` with its title and description, and `Checkbox` takes its accessible name from a `<Label htmlFor>`.
- **On the real baseline**: the `staleTime: 0` of `src/test/render.tsx` was confirmed to hide a stale-cache bug (the new `src/test/render.test.tsx` counts 2 requests before the change and 1 after); `rutaDeCampo('constructor')` was confirmed to return the source of `Object`'s constructor before the `Object.hasOwn` fix; `pnpm dlx shadcn@4.21.0 add popover` writes only `src/components/ui/popover.tsx` and does not touch `package.json`; a production build contains no M3 fixture (Task 14).

## Global Constraints

- Repo: `/Volumes/ORICO/projects/personal/tesis-project/sigeda-web`. Work on branch **`feat/m3-aprendizaje`**, which already holds the M3 docs and this plan at `8190cc5` and later (Task 1, Step 1 confirms it).
- Node is not on `PATH` in non-interactive shells. Prefix **every** shell command with `export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH;`.
- pnpm only (11.15.0). Never `npm` or `npx`. The shadcn CLI runs as `pnpm dlx shadcn@4.21.0 …` with `</dev/null` so it never waits on a prompt.
- TypeScript `~6.0.3`, `erasableSyntaxOnly`: no `enum`, no constructor parameter properties, no `namespace`.
- **No code comments** in any file you author (TS, TSX, CSS, JSON). `src/components/ui/*` and `src/hooks/use-mobile.ts` are vendored shadcn output: keep them exactly as the CLI generates them.
- All UI text in Spanish. Domain identifiers in Spanish (`documentos`, `cuestionario`, `consultas`, `fuentes`, `preguntas`).
- No colour literals in components: only Tailwind classes backed by tokens in `src/theme.css`, `StatusBadge` with its vocabulary in `src/lib/dominio/vocabulario.ts`, `Enlace` and the shared modules. The spec §8 design review is **still open**; keep every visual decision there.
- Tests that prove an acceptance criterion carry its ID at the start of the test name (`it('CA-DOC-01 …')`). Tests that only prove a decision or a contract fixture carry `M3-n` or `contrato §7.x`.
- Test files never live under `src/routes/`.
- Gate for every task: `pnpm verify` (typecheck → oxlint → vitest → build) exits 0 before committing.
- Commits: Conventional Commits, one short subject line, **no `Co-Authored-By` trailer**.
- **M3 additions:**
- The MSW handlers of `src/mocks/ia/` implement `docs/contrato-api-aprendizaje.md` exactly: paths relative to `VITE_IA_API_URL` with no `/api` prefix, Nest's error envelope (`{statusCode, message, error}`, and `{statusCode, message}` for a 500), UUID v4 ids, and the §7 fixtures and triggers. The frontend never sends a field the contract does not list, because `forbidNonWhitelisted` rejects it.
- Only the messages of contract §5 reach the screen, compared **after** `normalizarError` through `src/features/aprendizaje/mensajes.ts` (M3-5). Everything else becomes A5, A12 or `MENSAJE_GENERICO`. `extractedText`, `storageKey` and `ownerId` are never parsed, never stored and never rendered.
- Every criterion with an interval or a deadline (CA-DOC-04, CA-DOC-06, CA-CUE-03, CA-CUE-06, and CA-CON-04) uses `relojFalso()` from `src/test/tiempo.ts`. Never a real wait, never `setTimeout` in a test.
- The three criteria that need an **absence** — no documents (CA-DOC-01), no `ready` document (CA-CUE-02, CA-CON-01) — use a per-test `server.use(...)` returning `200 []`, the pattern M2 already uses, because the default fixtures must keep the happy paths.
- Every query that feeds a screen handles its own first-load error with Reintentar through `errorDePrimeraCarga`; a failed background refetch never replaces content. Forms mount only once their catalog is there. A mutation invalidates every key that reads what it changed.
- Files M0, M1 and M2 own are changed with the exact edits given, never rewritten wholesale, except where a step says "Replace … with" and carries the complete new content. Every quoted "replace" snippet was checked against `8190cc5` plus the previous tasks; if the text differs, stop and report instead of guessing.

---

## File map

```
sigeda-web/
├── README.md · docs/decisiones.md                      (T14: M3 section, contract, dependency 39)
├── vitest.config.ts · tsconfig.{app,node}.json         (T4: entorno.ts as the first setup file)
└── src/
    ├── components/ui/popover.tsx                       (T12, shadcn CLI)
    ├── lib/
    │   ├── api/errors.ts · api/http.ts                 CanceladoError (T4) · subirArchivo y conLimiteDeTiempo (T4)
    │   ├── auth/pantallas.ts                           las tres pantallas de Aprendizaje (T3)
    │   ├── dependencias.ts                             subirDocumento y eliminarDocumento (T3)
    │   ├── esquemas.ts                                 nombre y descripción compartidos (T1)
    │   ├── formularios.ts · query.ts                   rutaDeCampo con Object.hasOwn (T1) · crearQueryClient (T1)
    │   └── dominio/aprendizaje.ts · dominio/vocabulario.ts
    │                                                   textos A1–A16, tipos, tamaños, comparación y citas (T3, T5, T9)
    │                                                   estados del documento (T3) y resultado de la respuesta (T11)
    ├── features/aprendizaje/
    │   ├── api.ts · mensajes.ts · schemas.ts           cliente y esquemas (T5) · lista cerrada (T5) · búsqueda y formulario (T3, T5)
    │   ├── use-documentos-listos.ts                    documentos en estado Listo (T10)
    │   ├── documentos-page.tsx                         lista y consulta periódica (T3, T8) · subir y eliminar (T9)
    │   ├── cuestionario-page.tsx                       formulario y cuestionario por URL (T3, T10, T11)
    │   ├── consultas-page.tsx                          conversación (T3, T12) · recuperación (T13)
    │   └── components/                                 aviso-compartido (T3) · dialogo-subir-documento y
    │                                                   eliminar-documento (T9) · formulario-generacion y
    │                                                   resolucion-de-cuestionario (T10, T11) · cita-de-fuente,
    │                                                   conversacion y panel-de-documentos (T12)
    ├── mocks/
    │   ├── handlers.ts · reiniciar.ts                  registro de los handlers de IA (T6, T7) · reiniciarIaMock (T2)
    │   ├── ia/datos.ts · ia/comun.ts                   fijaciones §7 y contador (T2) · envoltura de Nest (T6, T7)
    │   ├── ia/documentos.ts · ia/cuestionarios.ts · ia/consultas.ts   (T6) · (T7) · (T7)
    │   └── sigeda/comun.ts + 7 módulos                 texto, erroresDeNombre y erroresDeDescripcion compartidos (T1)
    ├── routes/_app/aprendizaje/                        index, cuestionario, consultas (T3)
    └── test/
        ├── entorno.ts                                  clases web de Node antes de MSW (T4)
        ├── render.tsx · setup.ts                       crearQueryClient y user-event externo (T1, T2) · reloj real (T2)
        └── tiempo.ts                                   relojFalso (T2)
```

---

### Task 1: M2 cleanups: production query client in tests, `Object.hasOwn`, shared schemas and no `id: 0` sentinel (M2 review)

**Files:**

- Test: `src/test/render.test.tsx`
- Modify: `src/test/render.tsx`
- Modify: `src/lib/query.ts`
- Test: `src/lib/query.test.ts`
- Modify: `src/lib/formularios.ts`
- Test: `src/lib/formularios.test.ts`
- Create: `src/lib/esquemas.ts`
- Modify (full rewrite): `src/features/fases/schemas.ts`, `src/features/maniobras/schemas.ts`, `src/features/grupos/schemas.ts`
- Modify: `src/mocks/sigeda/comun.ts`
- Modify: `src/mocks/sigeda/{fases,maniobras,grupos,materias,turnos,evaluaciones,personas}.ts`
- Modify: `src/features/grupos/api.ts`
- Test: `src/features/grupos/api.test.ts`
- Modify: `src/features/grupos/components/formulario-grupo.tsx`

**Interfaces:**
- Consumes: `crearQueryClient`, `rutaDeCampo`, the fase, maniobra and grupo form schemas, the `sigeda/` mock modules and `crearGrupo`.
- Produces:
  - `crearQueryClient({ reintentar: false })`: the same `staleTime: 30_000` as production with retries off, which is what `renderApp` now builds, so the suite sees the real cache.
  - `rutaDeCampo` only renames a segment the caller actually declared (`Object.hasOwn`), so a backend field named `constructor` or `toString` keeps its own name.
  - `src/lib/esquemas.ts`: `esquemaNombreCorto`, `esquemaDescripcionLarga` and `esquemaFilaNombreDescripcion`, used by the fase, subfase, maniobra, estándar and grupo forms.
  - `src/mocks/sigeda/comun.ts`: `texto`, `erroresDeNombre` and `erroresDeDescripcion`, used by the seven mock modules that had their own copy.
  - `crearGrupo` resolves `{ mensaje, id: number | null }`; `null` means the backend sent no `grupo`, and the form navigates to the list instead of to `/grupos/0`.

- [ ] **Step 1: Confirm the baseline**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git log --oneline -1 && git status --short && pnpm test:run 2>&1 | tail -4
```

Expected: the head is `docs: add m3 implementation plan` (this file) on top of `8190cc5 docs: apply m3 addendum review`, the tree is clean, and 456 tests pass. If the code differs from `8190cc5`, stop and report.

- [ ] **Step 2: Write the failing tests**

Create `src/test/render.test.tsx`:

```tsx
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from './render'

describe('renderApp', () => {
  it('usa el cliente de consultas de producción: una lista recién cargada no se vuelve a pedir', async () => {
    let pedidos = 0
    const contar = ({ request }: { request: Request }) => {
      if (request.url === `${config.sigedaApiUrl}/api/materias`) pedidos += 1
    }
    server.events.on('request:start', contar)
    try {
      await iniciarComo('comandante.aguirre')
      const { router } = renderApp('/programa/materias')
      await screen.findByRole('table', { name: 'Materias del curso' })
      expect(pedidos).toBe(1)
      await router.navigate({ to: '/' })
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })
      await router.navigate({ to: '/programa/materias' })
      await screen.findByRole('table', { name: 'Materias del curso' })
      await waitFor(() => expect(screen.getByText('Meteorología')).toBeInTheDocument())
      expect(pedidos).toBe(1)
    } finally {
      server.events.removeListener('request:start', contar)
    }
  })
})
```

In `src/lib/query.test.ts`, replace:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { errorDePrimeraCarga } from './query'
```

with:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { crearQueryClient, errorDePrimeraCarga } from './query'

function opcionesDeConsulta(cliente: ReturnType<typeof crearQueryClient>) {
  const queries = cliente.getDefaultOptions().queries
  const retry = queries?.retry as (fallas: number, error: unknown) => boolean
  return { staleTime: queries?.staleTime, retry }
}

describe('crearQueryClient', () => {
  it('conserva los datos treinta segundos y reintenta solo los errores del servidor', () => {
    const { staleTime, retry } = opcionesDeConsulta(crearQueryClient())
    expect(staleTime).toBe(30_000)
    expect(retry(0, new ApiError(500, 'Error'))).toBe(true)
    expect(retry(0, new ApiError(0, 'Error'))).toBe(true)
    expect(retry(2, new ApiError(500, 'Error'))).toBe(false)
    expect(retry(0, new ApiError(400, 'Error'))).toBe(false)
  })

  it('sin reintentos conserva el mismo staleTime que producción', () => {
    const { staleTime, retry } = opcionesDeConsulta(crearQueryClient({ reintentar: false }))
    expect(staleTime).toBe(30_000)
    expect(retry(0, new ApiError(500, 'Error'))).toBe(false)
  })
})
```

In `src/lib/formularios.test.ts`, replace:

```ts
  it('renombra los segmentos que el formulario llama distinto', () => {
    expect(rutaDeCampo('maniobrasTurno[1].nota_min', { nota_min: 'notaMin' })).toBe('maniobrasTurno.1.notaMin')
    expect(rutaDeCampo('aeronave', { aeronave: 'idAeronave' })).toBe('idAeronave')
  })
```

with:

```ts
  it('renombra los segmentos que el formulario llama distinto', () => {
    expect(rutaDeCampo('maniobrasTurno[1].nota_min', { nota_min: 'notaMin' })).toBe('maniobrasTurno.1.notaMin')
    expect(rutaDeCampo('aeronave', { aeronave: 'idAeronave' })).toBe('idAeronave')
  })

  it('no toma por renombre una propiedad heredada de Object', () => {
    expect(rutaDeCampo('constructor')).toBe('constructor')
    expect(rutaDeCampo('datos.toString', { nota_min: 'notaMin' })).toBe('datos.toString')
  })
```

Create `src/features/grupos/api.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { crearGrupo, modificarGrupo } from './api'

const CUERPO = { nombre: 'Grupo A', descripcion: null, programa: 'PDI', personas: [] }

describe('crearGrupo', () => {
  it('devuelve el id del grupo creado', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/grupos`, () =>
        HttpResponse.json({ mensaje: 'Grupo guardada con éxito.', grupo: { id: 7 } }, { status: 201 }),
      ),
    )
    await expect(crearGrupo(CUERPO)).resolves.toEqual({ mensaje: 'Grupo guardada con éxito.', id: 7 })
  })

  it('sin grupo en la respuesta no inventa un id', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/grupos`, () => HttpResponse.json({ mensaje: 'Guardado.' }, { status: 201 })),
    )
    await expect(crearGrupo(CUERPO)).resolves.toEqual({ mensaje: 'Guardado.', id: null })
  })
})

describe('modificarGrupo', () => {
  it('sin grupo en la respuesta conserva el id modificado', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/grupos/4`, () => HttpResponse.json({ mensaje: 'Guardado.' }, { status: 201 })),
    )
    await expect(modificarGrupo(4, { nombre: 'Grupo A', descripcion: null, personas: [] })).resolves.toEqual({
      mensaje: 'Guardado.',
      id: 4,
    })
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/test/render.test.tsx src/lib/query.test.ts src/lib/formularios.test.ts src/features/grupos/api.test.ts
```

Expected: FAIL — `src/test/render.test.tsx` reports `expected 2 to be 1` (the list is refetched because the test client leaves `staleTime` at 0), `src/lib/query.test.ts` does not compile because `crearQueryClient` takes no argument, `src/lib/formularios.test.ts` reports `constructor` turned into the source of `Object`, and `src/features/grupos/api.test.ts` reports `expected 0 to be null`.

- [ ] **Step 4: (a) Build the test QueryClient from `crearQueryClient()`**

In `src/lib/query.ts`, replace:

```ts
export function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (fallas, error) => fallas < 2 && esReintentable(error),
      },
```

with:

```ts
export function crearQueryClient(opciones: { reintentar?: boolean } = {}) {
  const reintentar = opciones.reintentar ?? true
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (fallas, error) => reintentar && fallas < 2 && esReintentable(error),
      },
```

Replace `src/test/render.tsx` with:

```tsx
import { createMemoryHistory } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app'
import { sesion } from '@/lib/auth/sesion'
import { crearQueryClient } from '@/lib/query'
import { CONTRASENA_SEED } from '@/mocks/sigeda/usuarios'
import { crearRouter } from '@/router'

export function iniciarComo(username: string) {
  return sesion.iniciar(username, CONTRASENA_SEED)
}

export function renderApp(ruta = '/') {
  const queryClient = crearQueryClient({ reintentar: false })
  const router = crearRouter(queryClient, createMemoryHistory({ initialEntries: [ruta] }))
  const usuario = userEvent.setup()
  const resultado = render(<App router={router} queryClient={queryClient} />)
  return { ...resultado, router, usuario, queryClient }
}
```

- [ ] **Step 5: (b) `rutaDeCampo` with `Object.hasOwn`**

In `src/lib/formularios.ts`, replace:

```ts
    .map((segmento) => renombrar[segmento] ?? segmento)
```

with:

```ts
    .map((segmento) => (Object.hasOwn(renombrar, segmento) ? (renombrar[segmento] ?? segmento) : segmento))
```

- [ ] **Step 6: (c) Extract the shared schema pair and the mock helpers**

Create `src/lib/esquemas.ts`:

```ts
import { z } from 'zod'

const MENSAJE_NOMBRE = 'El nombre debe tener entre 3 y 35 caracteres.'

export const esquemaNombreCorto = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .min(3, MENSAJE_NOMBRE)
  .max(35, MENSAJE_NOMBRE)

export const esquemaDescripcionLarga = z.string().trim().max(255, 'La descripción no puede superar los 255 caracteres.')

export const esquemaFilaNombreDescripcion = z.object({
  id: z.string(),
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
})
```

Replace `src/features/fases/schemas.ts` with:

```ts
import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'
import { esquemaDescripcionLarga, esquemaFilaNombreDescripcion, esquemaNombreCorto } from '@/lib/esquemas'

export const esquemaBusquedaFases = z.object(esquemaPaginacionPrograma)

export type BusquedaFases = z.infer<typeof esquemaBusquedaFases>

export const esquemaFase = z.object({
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
  subfases: z.array(esquemaFilaNombreDescripcion).min(1, 'La asignación de subfases es requerida'),
})

export type ValoresFase = z.input<typeof esquemaFase>

export const FASE_VACIA: ValoresFase = {
  nombre: '',
  descripcion: '',
  subfases: [{ id: '0', nombre: '', descripcion: '' }],
}
```

Replace `src/features/maniobras/schemas.ts` with:

```ts
import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'
import { esquemaDescripcionLarga, esquemaFilaNombreDescripcion, esquemaNombreCorto } from '@/lib/esquemas'

export const esquemaBusquedaManiobras = z.object(esquemaPaginacionPrograma)

export type BusquedaManiobras = z.infer<typeof esquemaBusquedaManiobras>

export const esquemaManiobra = z.object({
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
  subfases: z.array(z.string()).min(1, 'La asignación de subfases es requerida'),
})

export type ValoresManiobra = z.input<typeof esquemaManiobra>

export const MANIOBRA_VACIA: ValoresManiobra = { nombre: '', descripcion: '', subfases: [] }

export const esquemaEstandares = z.object({
  estandares: z.array(esquemaFilaNombreDescripcion).min(1, 'La asignación de estandares es requerida'),
})

export type ValoresEstandares = z.input<typeof esquemaEstandares>
```

Replace `src/features/grupos/schemas.ts` with:

```ts
import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'
import { esquemaDescripcionLarga, esquemaNombreCorto } from '@/lib/esquemas'
import { PROGRAMAS } from '@/features/catalogos/api'

export const esquemaBusquedaGrupos = z.object(esquemaPaginacion)

export type BusquedaGrupos = z.infer<typeof esquemaBusquedaGrupos>

export const esquemaGrupo = z.object({
  nombre: esquemaNombreCorto,
  descripcion: esquemaDescripcionLarga,
  programa: z.enum(PROGRAMAS),
  alumnos: z.array(z.string()),
})

export type ValoresGrupo = z.input<typeof esquemaGrupo>

export const GRUPO_VACIO: ValoresGrupo = { nombre: '', descripcion: '', programa: 'PDI', alumnos: [] }
```

In `src/mocks/sigeda/comun.ts`, replace:

```ts
export function numero(url: URL, clave: string, porDefecto: number): number {
```

with:

```ts
export function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

export function erroresDeNombre(valor: unknown, campo: string): string[] {
  const nombre = texto(valor)
  if (nombre.trim() === '') return [`'${campo}': El nombre es obligatorio`]
  return nombre.length < 3 || nombre.length > 35 ? [`'${campo}': El nombre debe tener entre 3 y 35 caracteres.`] : []
}

export function erroresDeDescripcion(valor: unknown, campo: string): string[] {
  return texto(valor).length > 255 ? [`'${campo}': La descripción no puede superar los 255 caracteres.`] : []
}

export function numero(url: URL, clave: string, porDefecto: number): number {
```

In `src/mocks/sigeda/fases.ts`, replace:

```ts
import { API, autorizar, errorResponse, paginarConOrden } from './comun'
```

with:

```ts
import { API, autorizar, erroresDeDescripcion, erroresDeNombre, errorResponse, paginarConOrden, texto } from './comun'
```

In `src/mocks/sigeda/fases.ts`, replace:

```ts
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function erroresDeNombre(valor: unknown, campo: string): string[] {
  const nombre = texto(valor)
  if (nombre.trim() === '') return [`'${campo}': El nombre es obligatorio`]
  return nombre.length < 3 || nombre.length > 35
    ? [`'${campo}': El nombre debe tener entre 3 y 35 caracteres.`]
    : []
}

function erroresDeDescripcion(valor: unknown, campo: string): string[] {
  return texto(valor).length > 255 ? [`'${campo}': La descripción no puede superar los 255 caracteres.`] : []
}

function erroresDeFase(cuerpo: CuerpoFase): string[] {
```

with:

```ts
function erroresDeFase(cuerpo: CuerpoFase): string[] {
```

In `src/mocks/sigeda/maniobras.ts`, replace:

```ts
import { API, autorizar, errorResponse, paginarConOrden } from './comun'
```

with:

```ts
import { API, autorizar, erroresDeDescripcion, erroresDeNombre, errorResponse, paginarConOrden, texto } from './comun'
```

In `src/mocks/sigeda/maniobras.ts`, replace:

```ts
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function erroresDeNombre(valor: unknown, campo: string): string[] {
  const nombre = texto(valor)
  if (nombre.trim() === '') return [`'${campo}': El nombre es obligatorio`]
  return nombre.length < 3 || nombre.length > 35 ? [`'${campo}': El nombre debe tener entre 3 y 35 caracteres.`] : []
}

function erroresDeDescripcion(valor: unknown, campo: string): string[] {
  return texto(valor).length > 255 ? [`'${campo}': La descripción no puede superar los 255 caracteres.`] : []
}

function descripcionNueva(valor: unknown, anterior: string | null): string | null {
```

with:

```ts
function descripcionNueva(valor: unknown, anterior: string | null): string | null {
```

In `src/mocks/sigeda/grupos.ts`, replace:

```ts
import { API, autorizar, erroresDeCampo, guardado, paginar, textoEliminado, textoNoEncontrado } from './comun'
```

with:

```ts
import { API, autorizar, erroresDeCampo, guardado, paginar, texto, textoEliminado, textoNoEncontrado } from './comun'
```

In `src/mocks/sigeda/grupos.ts`, replace:

```ts
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function entidadPersona(persona: PersonaMock) {
```

with:

```ts
function entidadPersona(persona: PersonaMock) {
```

In `src/mocks/sigeda/materias.ts`, replace:

```ts
import { API, autorizar, erroresDeCampo, guardado, textoEliminado, textoNoEncontrado } from './comun'
```

with:

```ts
import { API, autorizar, erroresDeCampo, guardado, texto, textoEliminado, textoNoEncontrado } from './comun'
```

In `src/mocks/sigeda/materias.ts`, replace:

```ts
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function esParte(valor: unknown): valor is ParteMock {
```

with:

```ts
function esParte(valor: unknown): valor is ParteMock {
```

In `src/mocks/sigeda/turnos.ts`, replace:

```ts
import { API, autorizar, errorResponse, paginar, textoNoEncontrado } from './comun'
```

with:

```ts
import { API, autorizar, errorResponse, paginar, texto, textoNoEncontrado } from './comun'
```

In `src/mocks/sigeda/turnos.ts`, replace:

```ts
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function resumen(turno: TurnoMock) {
```

with:

```ts
function resumen(turno: TurnoMock) {
```

In `src/mocks/sigeda/evaluaciones.ts`, replace:

```ts
import { API, autorizar, paginar, textoNoEncontrado } from './comun'
```

with:

```ts
import { API, autorizar, paginar, texto, textoNoEncontrado } from './comun'
```

In `src/mocks/sigeda/evaluaciones.ts`, replace:

```ts
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function opcional(valor: unknown): string | null {
```

with:

```ts
function opcional(valor: unknown): string | null {
```

In `src/mocks/sigeda/personas.ts`, replace:

```ts
  paginar,
  textoEliminado,
```

with:

```ts
  paginar,
  texto,
  textoEliminado,
```

In `src/mocks/sigeda/personas.ts`, replace:

```ts
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function obligatorio(valor: unknown, campo: string, mensaje: string): string[] {
```

with:

```ts
function obligatorio(valor: unknown, campo: string, mensaje: string): string[] {
```

- [ ] **Step 7: (d) `crearGrupo`'s `id: 0` sentinel becomes `id: number | null`**

In `src/features/grupos/api.ts`, replace:

```ts
function grupoGuardado(respuesta: unknown, idPorDefecto: number): { mensaje: string; id: number } {
  const leida = esquemaGrupoGuardado.safeParse(respuesta)
  return leida.success
    ? { mensaje: leida.data.mensaje, id: leida.data.grupo.id }
    : { mensaje: soloMensaje(respuesta, MENSAJE_GRUPO_GUARDADO), id: idPorDefecto }
}

export async function crearGrupo(cuerpo: CuerpoGrupoNuevo): Promise<{ mensaje: string; id: number }> {
  return grupoGuardado(await sigeda.post<unknown>('/api/grupos', cuerpo), 0)
}

export async function modificarGrupo(id: number, cuerpo: CuerpoGrupoModificado): Promise<{ mensaje: string; id: number }> {
  return grupoGuardado(await sigeda.put<unknown>(`/api/grupos/${encodeURIComponent(id)}`, cuerpo), id)
}
```

with:

```ts
export type GrupoGuardado = { mensaje: string; id: number | null }

function grupoGuardado(respuesta: unknown, idPorDefecto: number | null): GrupoGuardado {
  const leida = esquemaGrupoGuardado.safeParse(respuesta)
  return leida.success
    ? { mensaje: leida.data.mensaje, id: leida.data.grupo.id }
    : { mensaje: soloMensaje(respuesta, MENSAJE_GRUPO_GUARDADO), id: idPorDefecto }
}

export async function crearGrupo(cuerpo: CuerpoGrupoNuevo): Promise<GrupoGuardado> {
  return grupoGuardado(await sigeda.post<unknown>('/api/grupos', cuerpo), null)
}

export async function modificarGrupo(id: number, cuerpo: CuerpoGrupoModificado): Promise<GrupoGuardado> {
  return grupoGuardado(await sigeda.put<unknown>(`/api/grupos/${encodeURIComponent(id)}`, cuerpo), id)
}
```

In `src/features/grupos/components/formulario-grupo.tsx`, replace:

```tsx
      await (resultado.id > 0
        ? navegar({ to: '/grupos/$id', params: { id: String(resultado.id) } })
        : navegar({ to: '/grupos' }))
```

with:

```tsx
      await (resultado.id === null
        ? navegar({ to: '/grupos' })
        : navegar({ to: '/grupos/$id', params: { id: String(resultado.id) } }))
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/test/render.test.tsx src/lib src/features/grupos src/features/fases src/features/maniobras
```

Expected: PASS.

- [ ] **Step 9: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 463 tests.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "refactor: apply the m2 cleanups"
```

---

### Task 2: Timing machinery and the IA mock store (M3-17)

**Files:**

- Create: `src/test/tiempo.ts`
- Test: `src/test/tiempo.test.tsx`
- Modify: `src/test/render.tsx`
- Modify: `src/test/setup.ts`
- Create: `src/mocks/ia/datos.ts`
- Modify (full rewrite): `src/mocks/reiniciar.ts`

**Interfaces:**
- Consumes: `renderApp`, `reiniciarMocks` (already called by `src/test/setup.ts` in every `afterEach`), MSW `delay`.
- Produces:
  - `relojFalso()` from `src/test/tiempo.ts`: installs `vi.useFakeTimers({ shouldAdvanceTime: true })` and returns `{ usuario, avanzar }` — a `userEvent` bound to `vi.advanceTimersByTime` and an `avanzar(ms)` over `vi.advanceTimersByTimeAsync`. Every later timing criterion uses only these two.
  - `renderApp(ruta, usuario?)` accepts an external user-event instance, so a test under fake timers (or with `applyAccept: false`) passes its own.
  - `src/test/setup.ts` returns to real timers after every test.
  - `src/mocks/ia/datos.ts`: the §7.1 documents of the contract, the per-document counter (`consultar`, which counts every response where the document is still `processing` and flips it to `ready` on its third), `documentoNuevo` for the upload fixture, `documentosOrdenados`, the session types, and `reiniciarIaMock()`, now called from `reiniciarMocks()`.

- [ ] **Step 1: Write the failing tests**

Create `src/test/tiempo.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { buscarDocumento, consultar, datosIa } from '@/mocks/ia/datos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from './render'
import { relojFalso } from './tiempo'

const RUTA_PRUEBA = `${config.iaApiUrl}/prueba-de-reloj`

const ID_LENTO = 'd0c00000-0000-4000-8000-000000000004'
const ID_ETERNO = 'd0c00000-0000-4000-8000-000000000006'

describe('reloj falso', () => {
  it('una respuesta demorada llega solo al avanzar el reloj', async () => {
    const { avanzar } = relojFalso()
    server.use(
      http.get(RUTA_PRUEBA, async () => {
        await delay(3000)
        return HttpResponse.json({ listo: true })
      }),
    )
    let recibido: unknown = null
    const peticion = fetch(RUTA_PRUEBA)
      .then((respuesta) => respuesta.json())
      .then((cuerpo) => {
        recibido = cuerpo
      })
    await avanzar(2900)
    expect(recibido).toBeNull()
    await avanzar(100)
    await peticion
    expect(recibido).toEqual({ listo: true })
  })

  it('una petición que nunca responde se corta con AbortController', async () => {
    const { avanzar } = relojFalso()
    server.use(http.get(RUTA_PRUEBA, async () => { await delay('infinite') }))
    const control = new AbortController()
    setTimeout(() => control.abort(), 120_000)
    let cortada = false
    const peticion = fetch(RUTA_PRUEBA, { signal: control.signal }).catch(() => {
      cortada = true
    })
    await avanzar(119_000)
    expect(cortada).toBe(false)
    await avanzar(1000)
    await peticion
    expect(cortada).toBe(true)
  })

  it('userEvent avanza el reloj falso y abre un diálogo de la aplicación', async () => {
    const { usuario } = relojFalso()
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/materias', usuario)
    await screen.findByRole('table', { name: 'Materias del curso' })
    await usuario.click(screen.getByRole('button', { name: 'Registrar materia' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('contador de consultas de los documentos', () => {
  it('el documento lento queda listo en su tercera consulta y el eterno nunca', () => {
    const lento = buscarDocumento(ID_LENTO)
    const eterno = buscarDocumento(ID_ETERNO)
    expect(lento?.status).toBe('processing')
    expect(consultar(lento!).status).toBe('processing')
    expect(consultar(lento!).status).toBe('processing')
    expect(consultar(lento!).status).toBe('ready')
    expect(lento?.tags).toEqual(['aerodinámica'])
    expect(lento?.consultas).toBe(3)
    for (let vuelta = 0; vuelta < 40; vuelta += 1) consultar(eterno!)
    expect(eterno?.status).toBe('processing')
    expect(eterno?.consultas).toBe(40)
  })

  it('reiniciarIaMock devuelve los documentos y sus contadores al estado inicial', () => {
    expect(buscarDocumento(ID_LENTO)?.status).toBe('processing')
    expect(buscarDocumento(ID_LENTO)?.consultas).toBe(0)
    expect(buscarDocumento(ID_LENTO)?.tags).toEqual([])
    expect(buscarDocumento(ID_ETERNO)?.consultas).toBe(0)
    expect(datosIa().sesiones).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/test/tiempo.test.tsx
```

Expected: FAIL — `Failed to resolve import "./tiempo"` and `Failed to resolve import "@/mocks/ia/datos"`.

- [ ] **Step 3: Land the fake-clock convention**

Create `src/test/tiempo.ts`:

```ts
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

export function relojFalso() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  return {
    usuario: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
    avanzar: (milisegundos: number) => vi.advanceTimersByTimeAsync(milisegundos),
  }
}
```

In `src/test/render.tsx`, replace:

```tsx
import userEvent from '@testing-library/user-event'
```

with:

```tsx
import userEvent, { type UserEvent } from '@testing-library/user-event'
```

In `src/test/render.tsx`, replace:

```tsx
export function renderApp(ruta = '/') {
  const queryClient = crearQueryClient({ reintentar: false })
  const router = crearRouter(queryClient, createMemoryHistory({ initialEntries: [ruta] }))
  const usuario = userEvent.setup()
```

with:

```tsx
export function renderApp(ruta = '/', usuario: UserEvent = userEvent.setup()) {
  const queryClient = crearQueryClient({ reintentar: false })
  const router = crearRouter(queryClient, createMemoryHistory({ initialEntries: [ruta] }))
```

In `src/test/setup.ts`, replace:

```ts
import { afterAll, afterEach, beforeAll } from 'vitest'
```

with:

```ts
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
```

In `src/test/setup.ts`, replace:

```ts
  sesion.expirar()
  localStorage.clear()
  document.documentElement.className = ''
})
```

with:

```ts
  sesion.expirar()
  localStorage.clear()
  document.documentElement.className = ''
  vi.useRealTimers()
})
```

- [ ] **Step 4: Land the IA mock store with the poll counter and its reset**

Create `src/mocks/ia/datos.ts`:

```ts
export type EstadoDocumentoMock = 'processing' | 'ready' | 'error'

export const TIPO_PDF = 'application/pdf'
export const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const TIPO_TXT = 'text/plain'

export const MENSAJE_SIN_TEXTO_LEGIBLE =
  'No se pudo extraer contenido legible del documento (posiblemente escaneado sin OCR).'

export const ID_DOCUMENTO_SUBIDO = 'd0c00000-0000-4000-8000-000000000005'

export type DocumentoMock = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  status: EstadoDocumentoMock
  errorMessage: string | null
  tags: string[]
  createdAt: string
  processedAt: string | null
  consultas: number
  consultasHastaListo: number | null
  etiquetasAlQuedarListo: string[]
}

export type MensajeMock = {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  citedChunkIds: string[]
}

export type SesionMock = {
  id: string
  title: string
  createdAt: string
  documentIds: string[]
  mensajes: MensajeMock[]
  conFuentes: boolean
}

export type DatosIa = { documentos: DocumentoMock[]; sesiones: SesionMock[] }

function crearDocumentos(): DocumentoMock[] {
  return [
    {
      id: 'd0c00000-0000-4000-8000-000000000006',
      filename: 'Reglamento de operaciones.pdf',
      mimeType: TIPO_PDF,
      sizeBytes: 3_145_728,
      status: 'processing',
      errorMessage: null,
      tags: [],
      createdAt: '2026-09-19T08:00:00.000Z',
      processedAt: null,
      consultas: 0,
      consultasHastaListo: null,
      etiquetasAlQuedarListo: [],
    },
    {
      id: 'd0c00000-0000-4000-8000-000000000004',
      filename: 'Apuntes de aerodinámica.txt',
      mimeType: TIPO_TXT,
      sizeBytes: 12_288,
      status: 'processing',
      errorMessage: null,
      tags: [],
      createdAt: '2026-09-19T07:30:00.000Z',
      processedAt: null,
      consultas: 0,
      consultasHastaListo: 3,
      etiquetasAlQuedarListo: ['aerodinámica'],
    },
    {
      id: 'd0c00000-0000-4000-8000-000000000003',
      filename: 'Manual de vuelo escaneado.pdf',
      mimeType: TIPO_PDF,
      sizeBytes: 5_242_880,
      status: 'error',
      errorMessage: MENSAJE_SIN_TEXTO_LEGIBLE,
      tags: [],
      createdAt: '2026-09-18T18:45:00.000Z',
      processedAt: null,
      consultas: 0,
      consultasHastaListo: null,
      etiquetasAlQuedarListo: [],
    },
    {
      id: 'd0c00000-0000-4000-8000-000000000002',
      filename: 'Procedimientos de emergencia.docx',
      mimeType: TIPO_DOCX,
      sizeBytes: 184_320,
      status: 'ready',
      errorMessage: null,
      tags: ['emergencias', 'autorrotación'],
      createdAt: '2026-09-18T16:20:00.000Z',
      processedAt: '2026-09-18T16:20:41.000Z',
      consultas: 0,
      consultasHastaListo: null,
      etiquetasAlQuedarListo: [],
    },
    {
      id: 'd0c00000-0000-4000-8000-000000000001',
      filename: 'PDI EA-510 Título III.pdf',
      mimeType: TIPO_PDF,
      sizeBytes: 2_411_008,
      status: 'ready',
      errorMessage: null,
      tags: ['instrucción', 'maniobras'],
      createdAt: '2026-09-18T14:02:11.000Z',
      processedAt: '2026-09-18T14:02:58.000Z',
      consultas: 0,
      consultasHastaListo: null,
      etiquetasAlQuedarListo: [],
    },
  ]
}

function crearDatos(): DatosIa {
  return { documentos: crearDocumentos(), sesiones: [] }
}

let datosActuales = crearDatos()

export function datosIa(): DatosIa {
  return datosActuales
}

export function reiniciarIaMock() {
  datosActuales = crearDatos()
}

export function buscarDocumento(id: string): DocumentoMock | undefined {
  return datosActuales.documentos.find((documento) => documento.id === id)
}

export function documentoNuevo(filename: string, mimeType: string, sizeBytes: number): DocumentoMock {
  return {
    id: ID_DOCUMENTO_SUBIDO,
    filename,
    mimeType,
    sizeBytes,
    status: 'processing',
    errorMessage: null,
    tags: [],
    createdAt: new Date().toISOString(),
    processedAt: null,
    consultas: 0,
    consultasHastaListo: 3,
    etiquetasAlQuedarListo: ['procedimientos'],
  }
}

export function consultar(documento: DocumentoMock): DocumentoMock {
  if (documento.status !== 'processing') return documento
  documento.consultas += 1
  if (documento.consultasHastaListo !== null && documento.consultas >= documento.consultasHastaListo) {
    documento.status = 'ready'
    documento.tags = documento.etiquetasAlQuedarListo
    documento.processedAt = new Date().toISOString()
  }
  return documento
}

export function documentosOrdenados(): DocumentoMock[] {
  return [...datosActuales.documentos].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
```

Replace `src/mocks/reiniciar.ts` with:

```ts
import { reiniciarIaMock } from './ia/datos'
import { reiniciarAuthMock } from './sigeda/auth'
import { reiniciarDatosMock } from './sigeda/datos'

export function reiniciarMocks() {
  reiniciarAuthMock()
  reiniciarDatosMock()
  reiniciarIaMock()
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/test/tiempo.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 468 tests.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "test: add the fake clock and the ia mock store"
```

---

### Task 3: Routes, screen registry, dependency keys and the A1–A16 texts (M3-1, M3-12, M3-13) (CA-DOC-10, CA-DOC-11)

**Files:**

- Create: `src/lib/dominio/aprendizaje.ts`
- Modify: `src/lib/dominio/vocabulario.ts`
- Modify: `src/lib/dependencias.ts`
- Test: `src/lib/dependencias.test.ts`
- Modify: `src/lib/auth/pantallas.ts`
- Test: `src/lib/auth/pantallas.test.ts`
- Test: `src/lib/auth/rutas-m3.test.tsx`
- Create: `src/features/aprendizaje/schemas.ts`
- Create: `src/features/aprendizaje/components/aviso-compartido.tsx`
- Create: `src/features/aprendizaje/{documentos,cuestionario,consultas}-page.tsx`
- Create: `src/routes/_app/aprendizaje/{index,cuestionario,consultas}.tsx`
- Generated: `src/routeTree.gen.ts`

**Interfaces:**
- Consumes: `PANTALLAS`, `exigirPantalla`, `accionDisponible`, `StatusBadge`, `PageHeader`, `config`.
- Produces:
  - `src/lib/dominio/aprendizaje.ts`: the sixteen fixed texts A1–A16 under speaking names, `TIPOS_ACEPTADOS`, `TAMANO_MAXIMO_MB`/`_BYTES`, `etiquetaDeTipo`, `formatearTamano` and `archivoAceptado` (the client-side rule of M3-6).
  - `vocabulario.ts` gains `ESTADOS_DOCUMENTO` under the key `documento`, with `uploading` rendered as Procesando (M3-7).
  - `dependencias.ts` gains `subirDocumento: [39]` and `eliminarDocumento: [39]` (M3-1).
  - Three screens in `PANTALLAS` — `documentos` (`/aprendizaje`), `cuestionario` and `consultas`, all `Read`, all `enMenu`, the last two with `padre: '/aprendizaje'`.
  - `esquemaBusquedaCuestionario` and `esquemaBusquedaConsultas`: one optional `z.uuidv4()` each (M3-3, M3-8).
  - `AvisoDocumentosCompartidos`: A1 whenever `subirDocumento` waits on dependency 39, rendered by all three pages.
  - The three pages as headers with that notice; Tasks 8–13 fill them in.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth/rutas-m3.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_DOCUMENTOS_COMPARTIDOS } from '@/lib/dominio/aprendizaje'
import { iniciarComo, renderApp } from '@/test/render'

const ROLES = ['admin.sistema', 'comandante.aguirre', 'jefe.operaciones', 'instructor.perez', 'alumno.lopez']

describe('rutas de aprendizaje', () => {
  it.each(ROLES)('CA-DOC-11 %s abre las tres pantallas de Aprendizaje', async (username) => {
    await iniciarComo(username)
    const { router } = renderApp('/aprendizaje')
    expect(await screen.findByRole('heading', { level: 1, name: 'Documentos' })).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/cuestionario' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Cuestionario de práctica' })).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/consultas' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Consultas' })).toBeInTheDocument()
  })

  it.each(ROLES)('CA-DOC-11 %s ve el grupo Aprendizaje en el menú', async (username) => {
    await iniciarComo(username)
    renderApp('/aprendizaje')
    await screen.findByRole('heading', { level: 1, name: 'Documentos' })
    expect(screen.getByText('Aprendizaje')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Documentos' }).map((enlace) => enlace.getAttribute('href'))).toContain(
      '/aprendizaje',
    )
    expect(screen.getByRole('link', { name: 'Cuestionario de práctica' })).toHaveAttribute(
      'href',
      '/aprendizaje/cuestionario',
    )
    expect(screen.getByRole('link', { name: 'Consultas' })).toHaveAttribute('href', '/aprendizaje/consultas')
  })

  it('M3-13 el cuestionario y las consultas cuelgan de Documentos en las migas', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/aprendizaje/cuestionario')
    await screen.findByRole('heading', { level: 1, name: 'Cuestionario de práctica' })
    const migas = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(migas.getByRole('link', { name: 'Documentos' })).toHaveAttribute('href', '/aprendizaje')
    expect(migas.getByText('Cuestionario de práctica')).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/consultas' })
    await screen.findByRole('heading', { level: 1, name: 'Consultas' })
    expect(
      within(screen.getByRole('navigation', { name: 'Migas de pan' })).getByRole('link', { name: 'Documentos' }),
    ).toHaveAttribute('href', '/aprendizaje')
  })

  it('CA-DOC-10 en modo mock las tres pantallas no muestran A1', async () => {
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/aprendizaje')
    await screen.findByRole('heading', { level: 1, name: 'Documentos' })
    expect(screen.queryByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).not.toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/cuestionario' })
    await screen.findByRole('heading', { level: 1, name: 'Cuestionario de práctica' })
    expect(screen.queryByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).not.toBeInTheDocument()
  })

  it('CA-DOC-10 fuera del modo mock y sin la dependencia 39 las tres pantallas muestran A1', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('alumno.lopez')
    const { router } = renderApp('/aprendizaje')
    await screen.findByRole('heading', { level: 1, name: 'Documentos' })
    expect(screen.getByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/cuestionario' })
    await screen.findByRole('heading', { level: 1, name: 'Cuestionario de práctica' })
    expect(screen.getByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).toBeInTheDocument()
    await router.navigate({ to: '/aprendizaje/consultas' })
    await screen.findByRole('heading', { level: 1, name: 'Consultas' })
    expect(screen.getByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).toBeInTheDocument()
  })

  it('CA-DOC-10 con la dependencia 39 resuelta A1 no aparece y las acciones quedan disponibles', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '39')
    await iniciarComo('alumno.lopez')
    renderApp('/aprendizaje')
    await screen.findByRole('heading', { level: 1, name: 'Documentos' })
    expect(screen.queryByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).not.toBeInTheDocument()
    expect(screen.queryByText(MENSAJE_DEPENDENCIA_PENDIENTE)).not.toBeInTheDocument()
  })
})
```

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
    expect(titulosDelMenu('Alumno')).toEqual(['Inicio', 'Mis turnos', 'Mis evaluaciones'])
```

with:

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

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
      'Programación de turnos',
      'Orden de vuelo del día',
      'Evaluaciones',
    ])
```

with:

```ts
      'Programación de turnos',
      'Orden de vuelo del día',
      'Evaluaciones',
      'Documentos',
      'Cuestionario de práctica',
      'Consultas',
    ])
```

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
      'Operaciones de vuelo',
      'Evaluaciones',
    ])
    expect(secciones[2]?.pantallas.map((pantalla) => pantalla.titulo)).toEqual([
```

with:

```ts
      'Operaciones de vuelo',
      'Evaluaciones',
      'Aprendizaje',
    ])
    expect(secciones[2]?.pantallas.map((pantalla) => pantalla.titulo)).toEqual([
```

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
  it('no agrega migas en Inicio ni en rutas desconocidas', () => {
```

with:

```ts
  it('M3-13 el cuestionario y las consultas cuelgan de Documentos', () => {
    expect(migasPara('/aprendizaje/cuestionario', perfilDe('Alumno'), false)).toEqual([
      PANTALLAS.documentos,
      PANTALLAS.cuestionario,
    ])
    expect(migasPara('/aprendizaje/consultas', perfilDe('Comandante de Escuadrón'), false)).toEqual([
      PANTALLAS.documentos,
      PANTALLAS.consultas,
    ])
    expect(migasPara('/aprendizaje', perfilDe('Instructor'), false)).toEqual([PANTALLAS.documentos])
  })

  it('no agrega migas en Inicio ni en rutas desconocidas', () => {
```

In `src/lib/dependencias.test.ts`, replace:

```ts
  it('CA-DEP-01 sin la variable ninguna acción con dependencia está disponible', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    expect(accionDisponible('registrarPersona')).toBe(false)
    expect(accionDisponible('eliminarPersona')).toBe(false)
    expect(accionDisponible('modificarManiobra')).toBe(false)
    expect(accionDisponible('eliminarFase')).toBe(false)
  })
```

with:

```ts
  it('CA-DEP-01 sin la variable ninguna acción con dependencia está disponible', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    expect(accionDisponible('registrarPersona')).toBe(false)
    expect(accionDisponible('eliminarPersona')).toBe(false)
    expect(accionDisponible('modificarManiobra')).toBe(false)
    expect(accionDisponible('eliminarFase')).toBe(false)
  })

  it('CA-DOC-10 subir y eliminar documentos esperan la dependencia 39', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '22,30,32,33,37')
    expect(accionDisponible('subirDocumento')).toBe(false)
    expect(accionDisponible('eliminarDocumento')).toBe(false)
    expect(dependenciasPendientes('subirDocumento')).toEqual([39])
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '39')
    expect(accionDisponible('subirDocumento')).toBe(true)
    expect(accionDisponible('eliminarDocumento')).toBe(true)
  })
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth src/lib/dependencias.test.ts
```

Expected: FAIL — `rutas-m3.test.tsx` cannot resolve `@/lib/dominio/aprendizaje`, `pantallas.test.ts` reports the Aprendizaje titles missing from the menu, and `dependencias.test.ts` does not compile because `subirDocumento` is not an action.

- [ ] **Step 3: Write the fixed texts and the document states**

Create `src/lib/dominio/aprendizaje.ts`:

```ts
export const TEXTO_DOCUMENTOS_COMPARTIDOS =
  'Los documentos son compartidos: el servidor de Aprendizaje todavía no identifica a cada usuario.'
export const TEXTO_CUESTIONARIO_REINICIADO =
  'El cuestionario se reinició: las respuestas no se guardan al recargar la página.'
export const TEXTO_GENERANDO_CUESTIONARIO =
  'Generando el cuestionario. Puede tardar hasta dos minutos; no cierre esta página.'
export const TEXTO_GENERACION_DEMORADA =
  'La generación tardó demasiado. Intente de nuevo con menos preguntas o menos documentos.'
export const TEXTO_GENERACION_RECHAZADA =
  'No se pudo generar el cuestionario con los documentos elegidos. Intente de nuevo o elija otro documento.'
export const TEXTO_DOCUMENTO_SIGUE_PROCESANDO = 'El documento sigue procesándose. Actualice para ver su estado.'
export const TEXTO_CONVERSACION_ILEGIBLE = 'No se pudo recuperar la conversación. Inicie una nueva consulta.'
export const TEXTO_FUENTES_NO_DISPONIBLES =
  'Las fuentes de las respuestas anteriores no están disponibles después de recargar.'
export const TEXTO_RESPUESTA_SIN_FUENTES =
  'No se encontraron fragmentos relevantes en los documentos seleccionados para esta pregunta.'
export const TEXTO_CUESTIONARIO_SIN_NOTA = 'El cuestionario de práctica no se registra: su nota es solo para estudiar.'
export const TEXTO_ARCHIVO_RECHAZADO = 'Solo se aceptan archivos PDF, DOCX o TXT de hasta 25 MB.'
export const TEXTO_DOCUMENTO_CON_ERROR = 'No se pudo procesar el documento. Elimínelo y vuelva a subirlo.'
export const TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO =
  'Se eliminará el documento. Los cuestionarios ya generados se conservan, pero las consultas que lo usan se quedarán sin esa fuente.'
export const TEXTO_SIN_DOCUMENTOS =
  'Todavía no hay documentos. Suba un archivo PDF, DOCX o TXT para generar cuestionarios y hacer consultas.'
export const TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO =
  'No hay documentos listos para generar un cuestionario. Suba uno en Documentos y espere a que termine de procesarse.'
export const TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS =
  'No hay documentos listos para consultar. Suba uno en Documentos y espere a que termine de procesarse.'

export const TIPOS_ACEPTADOS = [
  { extension: '.pdf', mimeType: 'application/pdf', etiqueta: 'PDF' },
  {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    etiqueta: 'DOCX',
  },
  { extension: '.txt', mimeType: 'text/plain', etiqueta: 'TXT' },
] as const

export const TAMANO_MAXIMO_MB = 25

export const TAMANO_MAXIMO_BYTES = TAMANO_MAXIMO_MB * 1024 * 1024

export function etiquetaDeTipo(mimeType: string): string {
  return TIPOS_ACEPTADOS.find((tipo) => tipo.mimeType === mimeType)?.etiqueta ?? '—'
}

export function formatearTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function archivoAceptado(archivo: { name: string; size: number }): boolean {
  const nombre = archivo.name.toLowerCase()
  const extensionValida = TIPOS_ACEPTADOS.some((tipo) => nombre.endsWith(tipo.extension))
  return extensionValida && archivo.size > 0 && archivo.size <= TAMANO_MAXIMO_BYTES
}
```

In `src/lib/dominio/vocabulario.ts`, replace:

```ts
export const ESTADOS_AERONAVE = {
```

with:

```ts
export const ESTADOS_DOCUMENTO = {
  uploading: { etiqueta: 'Procesando', tono: 'aviso' },
  processing: { etiqueta: 'Procesando', tono: 'aviso' },
  ready: { etiqueta: 'Listo', tono: 'exito' },
  error: { etiqueta: 'Error', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_AERONAVE = {
```

In `src/lib/dominio/vocabulario.ts`, replace:

```ts
  estado: ESTADOS_ALUMNO,
  aeronave: ESTADOS_AERONAVE,
} as const
```

with:

```ts
  estado: ESTADOS_ALUMNO,
  aeronave: ESTADOS_AERONAVE,
  documento: ESTADOS_DOCUMENTO,
} as const
```

- [ ] **Step 4: Add the two dependency keys of M3-1**

In `src/lib/dependencias.ts`, replace:

```ts
export const DEPENDENCIAS = {
  registrarPersona: [22],
  eliminarPersona: [30],
  modificarManiobra: [32, 33],
  eliminarFase: [37],
} as const
```

with:

```ts
export const DEPENDENCIAS = {
  registrarPersona: [22],
  eliminarPersona: [30],
  modificarManiobra: [32, 33],
  eliminarFase: [37],
  subirDocumento: [39],
  eliminarDocumento: [39],
} as const
```

- [ ] **Step 5: Register the three screens (M3-12, M3-13)**

In `src/lib/auth/pantallas.ts`, replace:

```ts
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  House,
  KeyRound,
  Layers,
  Palette,
  Plane,
  PlaneTakeoff,
  Route,
  Ruler,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { FileRouteTypes } from '@/routeTree.gen'
import { puede, type Permiso } from './permisos'

```

with:

```ts
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileText,
  House,
  KeyRound,
  Layers,
  ListChecks,
  MessagesSquare,
  Palette,
  Plane,
  PlaneTakeoff,
  Route,
  Ruler,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { FileRouteTypes } from '@/routeTree.gen'
import { puede, type Permiso } from './permisos'

```

In `src/lib/auth/pantallas.ts`, replace:

```ts
} satisfies Record<string, Pantalla>
```

with:

```ts
  documentos: {
    ruta: '/aprendizaje',
    titulo: 'Documentos',
    descripcion: 'Documentos de estudio con los que generar cuestionarios y hacer consultas.',
    grupo: 'Aprendizaje',
    icono: FileText,
    permiso: 'Read',
    enMenu: true,
  },
  cuestionario: {
    ruta: '/aprendizaje/cuestionario',
    titulo: 'Cuestionario de práctica',
    descripcion: 'Practique con preguntas generadas a partir de sus documentos.',
    grupo: 'Aprendizaje',
    icono: ListChecks,
    permiso: 'Read',
    padre: '/aprendizaje',
    enMenu: true,
  },
  consultas: {
    ruta: '/aprendizaje/consultas',
    titulo: 'Consultas',
    descripcion: 'Pregunte sobre sus documentos y revise las fuentes de cada respuesta.',
    grupo: 'Aprendizaje',
    icono: MessagesSquare,
    permiso: 'Read',
    padre: '/aprendizaje',
    enMenu: true,
  },
} satisfies Record<string, Pantalla>
```

- [ ] **Step 6: Write the search schemas, the shared notice and the three pages**

Create `src/features/aprendizaje/schemas.ts`:

```ts
import { z } from 'zod'

export const esquemaBusquedaCuestionario = z.object({
  cuestionario: z.uuidv4().optional().catch(undefined),
})

export type BusquedaCuestionario = z.infer<typeof esquemaBusquedaCuestionario>

export const esquemaBusquedaConsultas = z.object({
  sesion: z.uuidv4().optional().catch(undefined),
})

export type BusquedaConsultas = z.infer<typeof esquemaBusquedaConsultas>
```

Create `src/features/aprendizaje/components/aviso-compartido.tsx`:

```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { accionDisponible } from '@/lib/dependencias'
import { TEXTO_DOCUMENTOS_COMPARTIDOS } from '@/lib/dominio/aprendizaje'

export function AvisoDocumentosCompartidos() {
  if (accionDisponible('subirDocumento')) return null
  return (
    <Alert>
      <AlertDescription>{TEXTO_DOCUMENTOS_COMPARTIDOS}</AlertDescription>
    </Alert>
  )
}
```

Create `src/features/aprendizaje/documentos-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'

export function DocumentosPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.documentos.titulo} descripcion={PANTALLAS.documentos.descripcion} />
      <AvisoDocumentosCompartidos />
    </>
  )
}
```

Create `src/features/aprendizaje/cuestionario-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'

export function CuestionarioPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.cuestionario.titulo} descripcion={PANTALLAS.cuestionario.descripcion} />
      <AvisoDocumentosCompartidos />
    </>
  )
}
```

Create `src/features/aprendizaje/consultas-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'

export function ConsultasPage() {
  return (
    <>
      <PageHeader titulo={PANTALLAS.consultas.titulo} descripcion={PANTALLAS.consultas.descripcion} />
      <AvisoDocumentosCompartidos />
    </>
  )
}
```

- [ ] **Step 7: Write the three routes**

Create `src/routes/_app/aprendizaje/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { DocumentosPage } from '@/features/aprendizaje/documentos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/aprendizaje/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.documentos, context.sesion.actual()),
  component: DocumentosPage,
})
```

Create `src/routes/_app/aprendizaje/cuestionario.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { CuestionarioPage } from '@/features/aprendizaje/cuestionario-page'
import { esquemaBusquedaCuestionario } from '@/features/aprendizaje/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/aprendizaje/cuestionario')({
  validateSearch: esquemaBusquedaCuestionario,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.cuestionario, context.sesion.actual()),
  component: CuestionarioPage,
})
```

Create `src/routes/_app/aprendizaje/consultas.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ConsultasPage } from '@/features/aprendizaje/consultas-page'
import { esquemaBusquedaConsultas } from '@/features/aprendizaje/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/aprendizaje/consultas')({
  validateSearch: esquemaBusquedaConsultas,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.consultas, context.sesion.actual()),
  component: ConsultasPage,
})
```

- [ ] **Step 8: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` gains the three `/_app/aprendizaje/*` routes. Commit the generated file.

- [ ] **Step 9: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth src/lib/dependencias.test.ts
```

Expected: PASS.

- [ ] **Step 10: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 484 tests.

- [ ] **Step 11: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the aprendizaje routes and fixed texts"
```

---

### Task 4: Multipart upload and the 120 s request deadline in the HTTP client (M3-4, M3-6) (CA-DOC-03, CA-DOC-09)

**Files:**

- Modify: `src/lib/api/errors.ts`
- Modify (full rewrite): `src/lib/api/http.ts`
- Test: `src/lib/api/http.test.ts`
- Create: `src/test/entorno.ts`
- Modify: `vitest.config.ts`, `tsconfig.app.json`, `tsconfig.node.json`

**Interfaces:**
- Consumes: `normalizarError`, `aPagina`, the `Autenticacion` contract of M0, `relojFalso` (Task 2).
- Produces:
  - `CanceladoError` in `errors.ts`: what the client throws when its own `AbortSignal` fires, so a caller can tell "cancelled" from "no connection".
  - `subirArchivo(ruta, archivo, senal?)` on every client: one `FormData` with the field `file`, no `Content-Type` header (the browser writes the boundary), the same Bearer token and the same single 401-refresh retry, which rebuilds the `FormData` from the same `File`.
  - `conLimiteDeTiempo(ms, ejecutar)`: an `AbortController` that fires at `ms` and is always cleared, used by the quiz generation of Task 10.
  - `get`, `post` and `subirArchivo` take an optional `AbortSignal`; `solicitar` now takes one options object, which is the only change the existing callers see (none of them passes a signal).
  - `src/test/entorno.ts`, the **first** setup file: `Blob`, `File`, `FormData`, `ReadableStream`, `TransformStream` and `WritableStream` come from Node instead of jsdom, so multipart requests work under jsdom. It is excluded from `tsconfig.app.json` and included in `tsconfig.node.json`, so the Node types never reach application code.

- [ ] **Step 1: Write the failing tests**

In `src/lib/api/http.test.ts`, replace:

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { ApiError, MENSAJE_SIN_CONEXION } from './errors'
import { construirUrl, crearCliente, type Autenticacion } from './http'
```

with:

```ts
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { relojFalso } from '@/test/tiempo'
import { ApiError, CanceladoError, MENSAJE_SIN_CONEXION } from './errors'
import { conLimiteDeTiempo, construirUrl, crearCliente, type Autenticacion } from './http'
```

In `src/lib/api/http.test.ts`, append:

```ts

describe('subirArchivo', () => {
  const archivo = () => new File(['contenido del apunte'], 'Apunte.txt', { type: 'text/plain' })

  it('M3-6 envía el archivo en el campo file, con el token y sin fijar el Content-Type', async () => {
    let nombre: string | null = null
    let tipoDeclarado: string | null = null
    let cabecera: string | null = null
    server.use(
      http.post(`${BASE}/documents/upload`, async ({ request }) => {
        cabecera = request.headers.get('Authorization')
        tipoDeclarado = request.headers.get('Content-Type')
        const formulario = await request.formData()
        const recibido = formulario.get('file')
        nombre = recibido instanceof File ? recibido.name : null
        return HttpResponse.json({ id: 'd0c00000-0000-4000-8000-000000000005' }, { status: 201 })
      }),
    )
    await expect(crearCliente(BASE, autenticacion()).subirArchivo('/documents/upload', archivo())).resolves.toEqual({
      id: 'd0c00000-0000-4000-8000-000000000005',
    })
    expect(nombre).toBe('Apunte.txt')
    expect(cabecera).toBe('Bearer token-1')
    expect(tipoDeclarado).toMatch(/^multipart\/form-data; boundary=/)
  })

  it('M3-6 reenvía el archivo tras renovar el token', async () => {
    const vigentes = ['viejo']
    const auth = autenticacion({
      obtenerToken: () => vigentes.at(-1) ?? null,
      renovarToken: vi.fn(async () => {
        vigentes.push('nuevo')
        return { estado: 'renovado', token: 'nuevo' } as const
      }),
    })
    const recibidos: string[] = []
    server.use(
      http.post(`${BASE}/documents/upload`, async ({ request }) => {
        const formulario = await request.formData()
        const recibido = formulario.get('file')
        recibidos.push(recibido instanceof File ? recibido.name : '')
        return request.headers.get('Authorization') === 'Bearer nuevo'
          ? HttpResponse.json({ id: 'ok' }, { status: 201 })
          : new HttpResponse(null, { status: 401 })
      }),
    )
    await expect(crearCliente(BASE, auth).subirArchivo('/documents/upload', archivo())).resolves.toEqual({ id: 'ok' })
    expect(recibidos).toEqual(['Apunte.txt', 'Apunte.txt'])
  })

  it('CA-DOC-09 una caída de red al subir informa la falta de conexión', async () => {
    server.use(http.post(`${BASE}/documents/upload`, () => HttpResponse.error()))
    await expect(crearCliente(BASE, autenticacion()).subirArchivo('/documents/upload', archivo())).rejects.toMatchObject({
      status: 0,
      message: MENSAJE_SIN_CONEXION,
    })
  })

  it('CA-DOC-03 propaga el mensaje del servidor que rechaza el archivo', async () => {
    server.use(
      http.post(`${BASE}/documents/upload`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.',
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    )
    await expect(crearCliente(BASE, autenticacion()).subirArchivo('/documents/upload', archivo())).rejects.toMatchObject({
      status: 400,
      message: 'Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.',
    })
  })
})

describe('conLimiteDeTiempo', () => {
  it('M3-4 corta con CanceladoError la petición que no responde', async () => {
    const { avanzar } = relojFalso()
    server.use(http.post(`${BASE}/quizzes/generate`, async () => { await delay('infinite') }))
    const cliente = crearCliente(BASE, autenticacion())
    let error: unknown = null
    const peticion = conLimiteDeTiempo(120_000, (senal) => cliente.post('/quizzes/generate', {}, senal)).catch((e: unknown) => {
      error = e
    })
    await avanzar(119_000)
    expect(error).toBeNull()
    await avanzar(1000)
    await peticion
    expect(error).toBeInstanceOf(CanceladoError)
  })

  it('M3-4 devuelve la respuesta y apaga el reloj cuando llega a tiempo', async () => {
    const { avanzar } = relojFalso()
    server.use(
      http.post(`${BASE}/quizzes/generate`, async () => {
        await delay(3000)
        return HttpResponse.json({ id: 'c0e5' }, { status: 201 })
      }),
    )
    const cliente = crearCliente(BASE, autenticacion())
    const peticion = conLimiteDeTiempo(120_000, (senal) => cliente.post('/quizzes/generate', {}, senal))
    await avanzar(3000)
    await expect(peticion).resolves.toEqual({ id: 'c0e5' })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/api/http.test.ts
```

Expected: FAIL — `CanceladoError`, `conLimiteDeTiempo` and `subirArchivo` do not exist.

- [ ] **Step 3: Add the cancellation error**

In `src/lib/api/errors.ts`, replace:

```ts
export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor.'
```

with:

```ts
export class CanceladoError extends Error {
  constructor() {
    super('La petición se canceló.')
    this.name = 'CanceladoError'
  }
}

export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor.'
```

- [ ] **Step 4: Add multipart upload and the request deadline (M3-4, M3-6)**

Replace `src/lib/api/http.ts` with:

```ts
import { ApiError, CanceladoError, MENSAJE_SIN_CONEXION, normalizarError } from './errors'
import { aPagina, paginaVacia, type Pagina, type PaginaSpring } from './pagina'

export type Parametros = Record<string, string | number | boolean | null | undefined>

export type ResultadoRenovacion =
  | { estado: 'renovado'; token: string }
  | { estado: 'rechazado' }
  | { estado: 'no-disponible' }

export type Autenticacion = {
  obtenerToken: () => string | null
  renovarToken: () => Promise<ResultadoRenovacion>
  alExpirar: () => void
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE'

type Opciones = {
  cuerpo?: unknown
  archivo?: File
  parametros?: Parametros
  senal?: AbortSignal
  reintentar?: boolean
}

export const CAMPO_ARCHIVO = 'file'

export function construirUrl(base: string, ruta: string, parametros?: Parametros): string {
  const url = new URL(ruta, base)
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, String(valor))
  }
  return url.toString()
}

export async function conLimiteDeTiempo<T>(
  milisegundos: number,
  ejecutar: (senal: AbortSignal) => Promise<T>,
): Promise<T> {
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), milisegundos)
  try {
    return await ejecutar(control.signal)
  } finally {
    clearTimeout(reloj)
  }
}

async function leerCuerpo(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text()
  if (texto === '') return null
  try {
    return JSON.parse(texto)
  } catch {
    return texto
  }
}

function esRutaDeAutenticacion(ruta: string) {
  return ruta.startsWith('/auth/')
}

function esNoEncontrado(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

export function crearCliente(base: string, autenticacion: Autenticacion) {
  async function solicitar<T>(metodo: Metodo, ruta: string, opciones: Opciones = {}): Promise<T> {
    const { cuerpo, archivo, parametros, senal, reintentar = true } = opciones
    const cabeceras: Record<string, string> = { Accept: 'application/json' }
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
    const token = autenticacion.obtenerToken()
    if (token) cabeceras.Authorization = `Bearer ${token}`

    let carga: BodyInit | undefined
    if (archivo !== undefined) {
      const formulario = new FormData()
      formulario.append(CAMPO_ARCHIVO, archivo, archivo.name)
      carga = formulario
    } else if (cuerpo !== undefined) {
      carga = JSON.stringify(cuerpo)
    }

    let respuesta: Response
    try {
      respuesta = await fetch(construirUrl(base, ruta, parametros), {
        method: metodo,
        headers: cabeceras,
        body: carga,
        signal: senal,
      })
    } catch {
      if (senal?.aborted) throw new CanceladoError()
      throw new ApiError(0, MENSAJE_SIN_CONEXION)
    }

    if (respuesta.status === 401 && reintentar && !esRutaDeAutenticacion(ruta)) {
      const resultado = await autenticacion.renovarToken()
      if (resultado.estado === 'renovado') return solicitar<T>(metodo, ruta, { ...opciones, reintentar: false })
      if (resultado.estado === 'no-disponible') throw new ApiError(0, MENSAJE_SIN_CONEXION)
      autenticacion.alExpirar()
    }

    const datos = await leerCuerpo(respuesta)
    if (!respuesta.ok) throw normalizarError(respuesta.status, datos)
    return datos as T
  }

  function get<T>(ruta: string, parametros?: Parametros, senal?: AbortSignal) {
    return solicitar<T>('GET', ruta, { parametros, senal })
  }

  function post<T>(ruta: string, cuerpo?: unknown, senal?: AbortSignal) {
    return solicitar<T>('POST', ruta, { cuerpo, senal })
  }

  function put<T>(ruta: string, cuerpo?: unknown) {
    return solicitar<T>('PUT', ruta, { cuerpo })
  }

  function eliminar<T>(ruta: string) {
    return solicitar<T>('DELETE', ruta)
  }

  function subirArchivo<T>(ruta: string, archivo: File, senal?: AbortSignal) {
    return solicitar<T>('POST', ruta, { archivo, senal })
  }

  async function pagina<T>(ruta: string, parametros?: Parametros): Promise<Pagina<T>> {
    try {
      return aPagina(await get<PaginaSpring<T>>(ruta, parametros))
    } catch (error) {
      if (esNoEncontrado(error)) return paginaVacia(Number(parametros?.page ?? 0), Number(parametros?.size ?? 0))
      throw error
    }
  }

  async function lista<T>(ruta: string, parametros?: Parametros): Promise<T[]> {
    try {
      return await get<T[]>(ruta, parametros)
    } catch (error) {
      if (esNoEncontrado(error)) return []
      throw error
    }
  }

  return { get, post, put, eliminar, subirArchivo, pagina, lista }
}

export type ClienteHttp = ReturnType<typeof crearCliente>
```

- [ ] **Step 5: Give the jsdom environment the web classes Node's `fetch` consumes**

Create `src/test/entorno.ts`:

```ts
import { Blob, File } from 'node:buffer'
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web'

const formularioDeReferencia = await new Response('x=1', {
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
}).formData()

const CLASES_DE_NODE: Record<string, unknown> = {
  Blob,
  File,
  FormData: Object.getPrototypeOf(formularioDeReferencia).constructor,
  ReadableStream,
  TransformStream,
  WritableStream,
}

for (const [nombre, valor] of Object.entries(CLASES_DE_NODE)) {
  Object.defineProperty(globalThis, nombre, { writable: true, configurable: true, value: valor })
}
```

In `vitest.config.ts`, replace:

```ts
      setupFiles: ['./src/test/setup.ts'],
```

with:

```ts
      setupFiles: ['./src/test/entorno.ts', './src/test/setup.ts'],
```

In `tsconfig.app.json`, replace:

```json
  "include": ["src"]
}
```

with:

```json
  "include": ["src"],
  "exclude": ["src/test/entorno.ts"]
}
```

In `tsconfig.node.json`, replace:

```json
  "include": ["vite.config.ts", "vitest.config.ts"]
```

with:

```json
  "include": ["vite.config.ts", "vitest.config.ts", "src/test/entorno.ts"]
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/api/http.test.ts
```

Expected: PASS, 19 tests.

- [ ] **Step 7: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 490 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: upload files and cut off a request that never answers"
```

---

### Task 5: IA client, zod schemas, the closed message list and the domain helpers (M3-2, M3-5, M3-10) (CA-DOC-05, CA-DOC-08, CA-CUE-07, CA-CUE-10, CA-CUE-12, CA-CON-02, CA-CON-05, CA-CON-07)

**Files:**

- Modify: `src/lib/dominio/aprendizaje.ts`
- Test: `src/lib/dominio/aprendizaje.test.ts`
- Create: `src/features/aprendizaje/mensajes.ts`
- Create: `src/features/aprendizaje/api.ts`
- Test: `src/features/aprendizaje/api.test.ts`
- Modify: `src/features/aprendizaje/schemas.ts`

**Interfaces:**
- Consumes: `ia` (`src/lib/api/ia.ts`), `normalizarError`, `TEXTO_DOCUMENTO_CON_ERROR`, `queryOptions`.
- Produces:
  - `normalizarRespuesta` and `respuestaCorrecta` (exact equality, accent- and case-insensitive for `fill_blank`, M3-2); `MARCADOR_COMPLETAR` (`_____`); `trozosConCitas(contenido, cantidadDeFuentes)`, which only marks `[n]` inside the range (M3-10); `porcentajeDeSimilitud`, which returns `null` when the server did not inform it.
  - `src/features/aprendizaje/mensajes.ts`: the constants C1, C3, C4, C5, C8, C9, C10 and the three fixed prefixes (C2, C6, C13); `mensajePermitido`, which also lets the app's own `MENSAJE_SIN_CONEXION` and `MENSAJE_SIN_PERMISO` through; `mensajeDeError(error, alternativo)`; and `motivoDelDocumento`, which shows C4 and replaces any other reason with A12.
  - `src/features/aprendizaje/api.ts`: the `Documento`, `Pregunta`, `Cuestionario`, `Fuente`, `MensajeChat` and `SesionDeConsulta` types, their zod schemas, adapters that drop `extractedText`, `storageKey`, `ownerId` and `sourceDocumentId`, normalise any unknown `status` to `processing`, sort the questions by `position` and keep `fuentes: null` apart from `fuentes: []`; `clavesAprendizaje`, `consultasAprendizaje` (the quiz and the session with `retry: false`, M3-9) and the six calls the screens make.
  - `esquemaGeneracion` with `TIPOS_PREGUNTA` and `GENERACION_VACIA`: at least one document, at least one question type and an integer from 2 to 20.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/dominio/aprendizaje.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  archivoAceptado,
  etiquetaDeTipo,
  formatearTamano,
  normalizarRespuesta,
  porcentajeDeSimilitud,
  respuestaCorrecta,
  trozosConCitas,
} from './aprendizaje'

describe('etiquetaDeTipo', () => {
  it('CA-DOC-01 traduce los tres tipos aceptados y desconoce el resto', () => {
    expect(etiquetaDeTipo('application/pdf')).toBe('PDF')
    expect(etiquetaDeTipo('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('DOCX')
    expect(etiquetaDeTipo('text/plain')).toBe('TXT')
    expect(etiquetaDeTipo('image/png')).toBe('—')
  })
})

describe('formatearTamano', () => {
  it('CA-DOC-01 muestra el tamaño en bytes, kilobytes o megabytes', () => {
    expect(formatearTamano(512)).toBe('512 B')
    expect(formatearTamano(12_288)).toBe('12.0 KB')
    expect(formatearTamano(2_411_008)).toBe('2.3 MB')
    expect(formatearTamano(-1)).toBe('—')
  })
})

describe('archivoAceptado', () => {
  it('CA-DOC-02 acepta PDF, DOCX y TXT de hasta 25 MB', () => {
    expect(archivoAceptado({ name: 'Apunte.pdf', size: 1024 })).toBe(true)
    expect(archivoAceptado({ name: 'APUNTE.DOCX', size: 26_214_400 })).toBe(true)
    expect(archivoAceptado({ name: 'apunte.txt', size: 1 })).toBe(true)
  })

  it('CA-DOC-02 rechaza otra extensión, el archivo vacío y el que pasa de 25 MB', () => {
    expect(archivoAceptado({ name: 'foto.png', size: 1024 })).toBe(false)
    expect(archivoAceptado({ name: 'apunte.txt', size: 0 })).toBe(false)
    expect(archivoAceptado({ name: 'apunte.pdf', size: 26_214_401 })).toBe(false)
  })
})

describe('respuestaCorrecta', () => {
  it('CA-CUE-10 compara completar sin mayúsculas, tildes ni espacios sobrantes', () => {
    expect(normalizarRespuesta('  AutoRROTACIÓN  ')).toBe('autorrotacion')
    expect(respuestaCorrecta('fill_blank', 'autorrotación', '  AutoRRotacion ')).toBe(true)
    expect(respuestaCorrecta('fill_blank', 'flujo de aire', 'flujo   de  aire')).toBe(true)
    expect(respuestaCorrecta('fill_blank', 'autorrotación', 'autogiro')).toBe(false)
  })

  it('CA-CUE-09 compara opción múltiple y verdadero o falso por igualdad exacta', () => {
    expect(respuestaCorrecta('multiple_choice', 'a', 'a')).toBe(true)
    expect(respuestaCorrecta('multiple_choice', 'a', 'A')).toBe(false)
    expect(respuestaCorrecta('true_false', 'true', 'true')).toBe(true)
    expect(respuestaCorrecta('true_false', 'true', 'false')).toBe(false)
  })
})

describe('trozosConCitas', () => {
  it('CA-CON-05 marca como cita solo los números dentro del rango de fuentes', () => {
    expect(trozosConCitas('Permite descender [1]. El rotor gira [1][2].', 2)).toEqual([
      { texto: 'Permite descender ', cita: null },
      { texto: '[1]', cita: 1 },
      { texto: '. El rotor gira ', cita: null },
      { texto: '[1]', cita: 1 },
      { texto: '[2]', cita: 2 },
      { texto: '.', cita: null },
    ])
  })

  it('CA-CON-05 deja como texto un marcador fuera de rango', () => {
    expect(trozosConCitas('Ver [7] y [1].', 2)).toEqual([
      { texto: 'Ver [7] y ', cita: null },
      { texto: '[1]', cita: 1 },
      { texto: '.', cita: null },
    ])
  })

  it('CA-CON-09 sin fuentes deja todos los marcadores como texto', () => {
    expect(trozosConCitas('Permite descender [1][2].', 0)).toEqual([{ texto: 'Permite descender [1][2].', cita: null }])
  })
})

describe('porcentajeDeSimilitud', () => {
  it('CA-CON-05 muestra el porcentaje solo cuando el servidor lo informa', () => {
    expect(porcentajeDeSimilitud(0.812)).toBe('81 %')
    expect(porcentajeDeSimilitud(null)).toBeNull()
  })
})
```

Create `src/features/aprendizaje/api.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError, MENSAJE_GENERICO, MENSAJE_SIN_CONEXION, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { TEXTO_DOCUMENTO_CON_ERROR, TEXTO_GENERACION_RECHAZADA } from '@/lib/dominio/aprendizaje'
import { server } from '@/mocks/server'
import {
  crearSesion,
  enviarMensaje,
  eliminarDocumento,
  listarDocumentos,
  obtenerCuestionario,
  obtenerSesion,
  subirDocumento,
} from './api'
import {
  C10_SIN_RESPUESTA,
  C4_SIN_TEXTO_LEGIBLE,
  C5_DOCUMENTOS_AJENOS,
  C8_CUESTIONARIO_NO_ENCONTRADO,
  mensajeDeError,
  mensajePermitido,
  motivoDelDocumento,
} from './mensajes'

const IA = config.iaApiUrl

const DOCUMENTO_CRUDO = {
  id: 'd0c00000-0000-4000-8000-000000000001',
  filename: 'PDI EA-510 Título III.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2_411_008,
  status: 'ready',
  errorMessage: null,
  tags: ['instrucción'],
  createdAt: '2026-09-18T14:02:11.000Z',
  processedAt: '2026-09-18T14:02:58.000Z',
  extractedText: 'texto extraído que no debe salir',
  storageKey: 'documentos/abc',
  ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
}

describe('listarDocumentos', () => {
  it('CA-DOC-08 no expone el texto extraído, la ruta de almacenamiento ni el dueño', async () => {
    server.use(http.get(`${IA}/documents`, () => HttpResponse.json([DOCUMENTO_CRUDO])))
    const documentos = await listarDocumentos()
    expect(Object.keys(documentos[0] ?? {}).sort()).toEqual([
      'createdAt',
      'errorMessage',
      'filename',
      'id',
      'mimeType',
      'processedAt',
      'sizeBytes',
      'status',
      'tags',
    ])
  })

  it('M3-7 trata uploading y cualquier estado desconocido como procesando', async () => {
    server.use(
      http.get(`${IA}/documents`, () =>
        HttpResponse.json([
          { ...DOCUMENTO_CRUDO, status: 'uploading' },
          { ...DOCUMENTO_CRUDO, id: 'd0c00000-0000-4000-8000-000000000002', status: 'vaya' },
          { ...DOCUMENTO_CRUDO, id: 'd0c00000-0000-4000-8000-000000000003', status: 'error', errorMessage: 'boom' },
        ]),
      ),
    )
    expect((await listarDocumentos()).map((documento) => documento.status)).toEqual(['processing', 'processing', 'error'])
  })

  it('CA-DOC-01 una lista vacía es una lista vacía', async () => {
    server.use(http.get(`${IA}/documents`, () => HttpResponse.json([])))
    await expect(listarDocumentos()).resolves.toEqual([])
  })
})

describe('subirDocumento y eliminarDocumento', () => {
  it('CA-DOC-04 devuelve el documento recién creado en procesamiento', async () => {
    server.use(
      http.post(`${IA}/documents/upload`, () =>
        HttpResponse.json(
          { ...DOCUMENTO_CRUDO, id: 'd0c00000-0000-4000-8000-000000000005', status: 'processing', tags: [], processedAt: null },
          { status: 201 },
        ),
      ),
    )
    const documento = await subirDocumento(new File(['a'], 'Apunte.txt', { type: 'text/plain' }))
    expect(documento).toMatchObject({ id: 'd0c00000-0000-4000-8000-000000000005', status: 'processing', tags: [] })
  })

  it('CA-DOC-07 eliminar acepta el cuerpo {deleted:true}', async () => {
    let recibido = ''
    server.use(
      http.delete(`${IA}/documents/:id`, ({ params }) => {
        recibido = String(params.id)
        return HttpResponse.json({ deleted: true })
      }),
    )
    await expect(eliminarDocumento('d0c00000-0000-4000-8000-000000000001')).resolves.toBeUndefined()
    expect(recibido).toBe('d0c00000-0000-4000-8000-000000000001')
  })
})

describe('obtenerCuestionario', () => {
  it('CA-CUE-07 ordena las preguntas por position y conserva las opciones nulas', async () => {
    server.use(
      http.get(`${IA}/quizzes/:id`, () =>
        HttpResponse.json({
          id: 'c0e50000-0000-4000-8000-000000000001',
          ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
          title: 'Cuestionario sin título',
          questionTypes: ['multiple_choice', 'true_false'],
          requestedCount: 5,
          modelName: 'claude-opus-5',
          createdAt: '2026-09-19T09:15:00.000Z',
          questions: [
            {
              id: '9e500000-0000-4000-8000-000000000002',
              type: 'true_false',
              position: 1,
              prompt: 'La autorrotación necesita potencia.',
              options: null,
              correctAnswer: 'false',
              explanation: 'No la necesita.',
              sourceDocumentId: null,
              sourceExcerpt: null,
              createdAt: '2026-09-19T09:15:00.000Z',
            },
            {
              id: '9e500000-0000-4000-8000-000000000001',
              type: 'multiple_choice',
              position: 0,
              prompt: '¿Qué permite la autorrotación?',
              options: [{ id: 'a', text: 'Descender sin potencia' }],
              correctAnswer: 'a',
              explanation: 'El rotor gira por el flujo ascendente.',
              sourceDocumentId: null,
              sourceExcerpt: 'La autorrotación es…',
              createdAt: '2026-09-19T09:15:00.000Z',
            },
          ],
        }),
      ),
    )
    const cuestionario = await obtenerCuestionario('c0e50000-0000-4000-8000-000000000001')
    expect(cuestionario.preguntas.map((pregunta) => pregunta.position)).toEqual([0, 1])
    expect(cuestionario.preguntas[1]?.options).toBeNull()
    expect(cuestionario.requestedCount).toBe(5)
  })

  it('CA-CUE-12 propaga C8 de un cuestionario inexistente', async () => {
    server.use(
      http.get(`${IA}/quizzes/:id`, () =>
        HttpResponse.json({ statusCode: 404, message: C8_CUESTIONARIO_NO_ENCONTRADO, error: 'Not Found' }, { status: 404 }),
      ),
    )
    await expect(obtenerCuestionario('c0e50000-0000-4000-8000-000000000009')).rejects.toMatchObject({
      message: C8_CUESTIONARIO_NO_ENCONTRADO,
    })
  })
})

describe('sesiones de consulta', () => {
  const sesionCruda = {
    id: '5e550000-0000-4000-8000-000000000001',
    title: 'Consulta sobre PDI EA-510 Título III.pdf',
    createdAt: '2026-09-19T10:30:00.000Z',
    documents: [DOCUMENTO_CRUDO],
  }

  it('CA-CON-02 crea la conversación con sus documentos aplanados', async () => {
    let cuerpo: unknown = null
    server.use(
      http.post(`${IA}/chat/sessions`, async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json(sesionCruda, { status: 201 })
      }),
    )
    const sesion = await crearSesion(['d0c00000-0000-4000-8000-000000000001'])
    expect(cuerpo).toEqual({ documentIds: ['d0c00000-0000-4000-8000-000000000001'] })
    expect(sesion.documentos[0]?.filename).toBe('PDI EA-510 Título III.pdf')
    expect(sesion.mensajes).toEqual([])
  })

  it('M3-10 distingue los mensajes sin la clave sources de los que la traen vacía', async () => {
    server.use(
      http.get(`${IA}/chat/sessions/:id`, () =>
        HttpResponse.json({
          ...sesionCruda,
          messages: [
            { id: '3e550000-0000-4000-8000-000000000001', sessionId: sesionCruda.id, role: 'user', content: '¿Y esto?', createdAt: '2026-09-19T10:31:00.000Z' },
            {
              id: '3e550000-0000-4000-8000-000000000002',
              sessionId: sesionCruda.id,
              role: 'assistant',
              content: 'Respuesta [1].',
              createdAt: '2026-09-19T10:31:12.000Z',
              sources: [
                {
                  referenceNumber: 1,
                  documentId: 'd0c00000-0000-4000-8000-000000000001',
                  documentFilename: 'PDI EA-510 Título III.pdf',
                  excerpt: 'La autorrotación…',
                  similarity: null,
                },
              ],
            },
          ],
        }),
      ),
    )
    const sesion = await obtenerSesion(sesionCruda.id)
    expect(sesion.mensajes[0]?.fuentes).toBeNull()
    expect(sesion.mensajes[1]?.fuentes).toEqual([
      {
        referenceNumber: 1,
        documentId: 'd0c00000-0000-4000-8000-000000000001',
        documentFilename: 'PDI EA-510 Título III.pdf',
        excerpt: 'La autorrotación…',
        similarity: null,
      },
    ])
  })

  it('CA-CON-07 una respuesta fallida del modelo llega como mensaje normal sin fuentes', async () => {
    server.use(
      http.post(`${IA}/chat/messages`, () =>
        HttpResponse.json(
          {
            message: {
              id: '3e550000-0000-4000-8000-000000000004',
              sessionId: sesionCruda.id,
              role: 'assistant',
              content: C10_SIN_RESPUESTA,
              citedChunkIds: [],
              createdAt: '2026-09-19T10:32:00.000Z',
            },
            sources: [],
          },
          { status: 201 },
        ),
      ),
    )
    const respuesta = await enviarMensaje(sesionCruda.id, 'algo con error')
    expect(respuesta.content).toBe(C10_SIN_RESPUESTA)
    expect(respuesta.fuentes).toEqual([])
  })
})

describe('mensajes del contrato', () => {
  it('M3-5 acepta los mensajes exactos y los de prefijo fijo', () => {
    expect(mensajePermitido(C5_DOCUMENTOS_AJENOS)).toBe(C5_DOCUMENTOS_AJENOS)
    expect(mensajePermitido('Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.')).toBe(
      'Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.',
    )
    expect(mensajePermitido('Los siguientes documentos aún no están listos: Apuntes.txt')).toBe(
      'Los siguientes documentos aún no están listos: Apuntes.txt',
    )
    expect(mensajePermitido('El archivo supera el tamaño máximo de 25 MB.')).toBe(
      'El archivo supera el tamaño máximo de 25 MB.',
    )
    expect(mensajePermitido(MENSAJE_SIN_CONEXION)).toBe(MENSAJE_SIN_CONEXION)
    expect(mensajePermitido(MENSAJE_SIN_PERMISO)).toBe(MENSAJE_SIN_PERMISO)
  })

  it('M3-5 rechaza C7, los textos de librerías y el inglés de Nest', () => {
    expect(mensajePermitido('No se pudo generar el cuestionario tras 3 intentos: Unexpected token }')).toBeNull()
    expect(mensajePermitido('Internal Server Error')).toBeNull()
    expect(mensajePermitido('questionCount must not be greater than 20')).toBeNull()
    expect(mensajePermitido('pdf-parse: bad XRef entry')).toBeNull()
  })

  it('CA-CUE-05 mensajeDeError reemplaza lo que no está en la lista y conserva lo que sí', () => {
    expect(
      mensajeDeError(new ApiError(400, 'No se pudo generar el cuestionario tras 3 intentos: Zod'), TEXTO_GENERACION_RECHAZADA),
    ).toBe(TEXTO_GENERACION_RECHAZADA)
    expect(mensajeDeError(new ApiError(500, 'Internal Server Error'), TEXTO_GENERACION_RECHAZADA)).toBe(
      TEXTO_GENERACION_RECHAZADA,
    )
    expect(mensajeDeError(new ApiError(404, C5_DOCUMENTOS_AJENOS), TEXTO_GENERACION_RECHAZADA)).toBe(C5_DOCUMENTOS_AJENOS)
    expect(mensajeDeError(new ApiError(0, MENSAJE_SIN_CONEXION), TEXTO_GENERACION_RECHAZADA)).toBe(MENSAJE_SIN_CONEXION)
    expect(mensajeDeError(new Error('otro'), MENSAJE_GENERICO)).toBe(MENSAJE_GENERICO)
  })

  it('CA-DOC-05 el motivo del documento solo se muestra si es C4', () => {
    expect(motivoDelDocumento(C4_SIN_TEXTO_LEGIBLE)).toBe(C4_SIN_TEXTO_LEGIBLE)
    expect(motivoDelDocumento('mammoth: not a valid docx')).toBe(TEXTO_DOCUMENTO_CON_ERROR)
    expect(motivoDelDocumento(null)).toBe(TEXTO_DOCUMENTO_CON_ERROR)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dominio/aprendizaje.test.ts src/features/aprendizaje/api.test.ts
```

Expected: FAIL — `normalizarRespuesta`, `respuestaCorrecta`, `trozosConCitas` and `porcentajeDeSimilitud` are not exported, and `./api` and `./mensajes` do not exist.

- [ ] **Step 3: Add the grading and citation helpers (M3-2, M3-10)**

In `src/lib/dominio/aprendizaje.ts`, append:

```ts

export function normalizarRespuesta(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
}

export function respuestaCorrecta(tipo: string, correcta: string, dada: string): boolean {
  return tipo === 'fill_blank' ? normalizarRespuesta(dada) === normalizarRespuesta(correcta) : dada === correcta
}

export const MARCADOR_COMPLETAR = '_____'

export type TrozoDeRespuesta = { texto: string; cita: number | null }

const PATRON_CITA = /\[(\d+)\]/g

export function trozosConCitas(contenido: string, cantidadDeFuentes: number): TrozoDeRespuesta[] {
  const trozos: TrozoDeRespuesta[] = []
  let ultimo = 0
  for (const coincidencia of contenido.matchAll(PATRON_CITA)) {
    const indice = coincidencia.index
    const numero = Number(coincidencia[1])
    const enRango = numero >= 1 && numero <= cantidadDeFuentes
    if (!enRango) continue
    if (indice > ultimo) trozos.push({ texto: contenido.slice(ultimo, indice), cita: null })
    trozos.push({ texto: coincidencia[0], cita: numero })
    ultimo = indice + coincidencia[0].length
  }
  if (ultimo < contenido.length) trozos.push({ texto: contenido.slice(ultimo), cita: null })
  return trozos
}

export function porcentajeDeSimilitud(similitud: number | null): string | null {
  return similitud === null ? null : `${Math.round(similitud * 100)} %`
}
```

- [ ] **Step 4: Write the closed list of server messages (M3-5)**

Create `src/features/aprendizaje/mensajes.ts`:

```ts
import { ApiError, MENSAJE_SIN_CONEXION, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { TEXTO_DOCUMENTO_CON_ERROR } from '@/lib/dominio/aprendizaje'

export const C1_SIN_ARCHIVO = 'No se recibió ningún archivo.'
export const C3_DOCUMENTO_NO_ENCONTRADO = 'Documento no encontrado.'
export const C4_SIN_TEXTO_LEGIBLE =
  'No se pudo extraer contenido legible del documento (posiblemente escaneado sin OCR).'
export const C5_DOCUMENTOS_AJENOS = 'Uno o más documentos no existen o no te pertenecen.'
export const C8_CUESTIONARIO_NO_ENCONTRADO = 'Cuestionario no encontrado.'
export const C9_SESION_NO_ENCONTRADA = 'Sesión de chat no encontrada.'
export const C10_SIN_RESPUESTA = 'No se pudo generar una respuesta. Intenta reformular tu pregunta.'

export const PREFIJO_C2_TIPO_NO_SOPORTADO = 'Tipo de archivo no soportado:'
export const PREFIJO_C6_DOCUMENTOS_NO_LISTOS = 'Los siguientes documentos aún no están listos:'
export const PREFIJO_C13_ARCHIVO_GRANDE = 'El archivo supera el tamaño máximo'

const EXACTOS: readonly string[] = [
  C1_SIN_ARCHIVO,
  C3_DOCUMENTO_NO_ENCONTRADO,
  C4_SIN_TEXTO_LEGIBLE,
  C5_DOCUMENTOS_AJENOS,
  C8_CUESTIONARIO_NO_ENCONTRADO,
  C9_SESION_NO_ENCONTRADA,
  C10_SIN_RESPUESTA,
  MENSAJE_SIN_CONEXION,
  MENSAJE_SIN_PERMISO,
]

const PREFIJOS: readonly string[] = [
  PREFIJO_C2_TIPO_NO_SOPORTADO,
  PREFIJO_C6_DOCUMENTOS_NO_LISTOS,
  PREFIJO_C13_ARCHIVO_GRANDE,
]

export function mensajePermitido(mensaje: string): string | null {
  const limpio = mensaje.trim()
  if (EXACTOS.includes(limpio)) return limpio
  return PREFIJOS.some((prefijo) => limpio.startsWith(prefijo)) ? limpio : null
}

export function mensajeDeError(error: unknown, alternativo: string): string {
  return (error instanceof ApiError ? mensajePermitido(error.message) : null) ?? alternativo
}

export function motivoDelDocumento(errorMessage: string | null): string {
  return errorMessage !== null && errorMessage.trim() === C4_SIN_TEXTO_LEGIBLE
    ? C4_SIN_TEXTO_LEGIBLE
    : TEXTO_DOCUMENTO_CON_ERROR
}
```

- [ ] **Step 5: Write the IA client and its zod schemas**

Create `src/features/aprendizaje/api.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { ia } from '@/lib/api/ia'

export type EstadoDocumento = 'processing' | 'ready' | 'error'

export type Documento = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  status: EstadoDocumento
  errorMessage: string | null
  tags: string[]
  createdAt: string
  processedAt: string | null
}

export type TipoPregunta = 'multiple_choice' | 'true_false' | 'fill_blank'

export type OpcionPregunta = { id: string; text: string }

export type Pregunta = {
  id: string
  type: TipoPregunta
  position: number
  prompt: string
  options: OpcionPregunta[] | null
  correctAnswer: string
  explanation: string | null
  sourceExcerpt: string | null
}

export type Cuestionario = {
  id: string
  title: string
  requestedCount: number
  createdAt: string
  preguntas: Pregunta[]
}

export type CuerpoGeneracion = { documentIds: string[]; questionTypes: TipoPregunta[]; questionCount: number }

export type Fuente = {
  referenceNumber: number
  documentId: string | null
  documentFilename: string | null
  excerpt: string | null
  similarity: number | null
}

export type MensajeChat = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  fuentes: Fuente[] | null
}

export type SesionDeConsulta = {
  id: string
  title: string
  createdAt: string
  documentos: Documento[]
  mensajes: MensajeChat[]
}

const esquemaDocumento = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  status: z.string(),
  errorMessage: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  createdAt: z.string(),
  processedAt: z.string().nullish(),
})

const esquemaFuente = z.object({
  referenceNumber: z.number(),
  documentId: z.string().nullish(),
  documentFilename: z.string().nullish(),
  excerpt: z.string().nullish(),
  similarity: z.number().nullish(),
})

const esquemaPregunta = z.object({
  id: z.string(),
  type: z.enum(['multiple_choice', 'true_false', 'fill_blank']),
  position: z.number(),
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).nullish(),
  correctAnswer: z.string(),
  explanation: z.string().nullish(),
  sourceExcerpt: z.string().nullish(),
})

const esquemaCuestionario = z.object({
  id: z.string(),
  title: z.string(),
  requestedCount: z.number(),
  createdAt: z.string(),
  questions: z.array(esquemaPregunta),
})

const esquemaMensaje = z.object({
  id: z.string(),
  role: z.string(),
  content: z.string(),
  createdAt: z.string(),
  sources: z.array(esquemaFuente).optional(),
})

const esquemaSesion = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  documents: z.array(esquemaDocumento),
  messages: z.array(esquemaMensaje).optional(),
})

const esquemaRespuestaDeChat = z.object({ message: esquemaMensaje, sources: z.array(esquemaFuente) })

function estadoDeDocumento(valor: string): EstadoDocumento {
  return valor === 'ready' || valor === 'error' ? valor : 'processing'
}

function aDocumento(crudo: unknown): Documento {
  const documento = esquemaDocumento.parse(crudo)
  return {
    id: documento.id,
    filename: documento.filename,
    mimeType: documento.mimeType,
    sizeBytes: documento.sizeBytes,
    status: estadoDeDocumento(documento.status),
    errorMessage: documento.errorMessage ?? null,
    tags: documento.tags ?? [],
    createdAt: documento.createdAt,
    processedAt: documento.processedAt ?? null,
  }
}

function aFuente(crudo: z.output<typeof esquemaFuente>): Fuente {
  return {
    referenceNumber: crudo.referenceNumber,
    documentId: crudo.documentId ?? null,
    documentFilename: crudo.documentFilename ?? null,
    excerpt: crudo.excerpt ?? null,
    similarity: crudo.similarity ?? null,
  }
}

function aMensaje(crudo: z.output<typeof esquemaMensaje>, fuentes?: Fuente[]): MensajeChat {
  return {
    id: crudo.id,
    role: crudo.role === 'user' ? 'user' : 'assistant',
    content: crudo.content,
    createdAt: crudo.createdAt,
    fuentes: fuentes ?? (crudo.sources === undefined ? null : crudo.sources.map(aFuente)),
  }
}

function aPregunta(crudo: z.output<typeof esquemaPregunta>): Pregunta {
  return {
    id: crudo.id,
    type: crudo.type,
    position: crudo.position,
    prompt: crudo.prompt,
    options: crudo.options ?? null,
    correctAnswer: crudo.correctAnswer,
    explanation: crudo.explanation ?? null,
    sourceExcerpt: crudo.sourceExcerpt ?? null,
  }
}

function aCuestionario(crudo: unknown): Cuestionario {
  const cuestionario = esquemaCuestionario.parse(crudo)
  return {
    id: cuestionario.id,
    title: cuestionario.title,
    requestedCount: cuestionario.requestedCount,
    createdAt: cuestionario.createdAt,
    preguntas: [...cuestionario.questions].sort((a, b) => a.position - b.position).map(aPregunta),
  }
}

function aSesion(crudo: unknown): SesionDeConsulta {
  const sesion = esquemaSesion.parse(crudo)
  return {
    id: sesion.id,
    title: sesion.title,
    createdAt: sesion.createdAt,
    documentos: sesion.documents.map(aDocumento),
    mensajes: (sesion.messages ?? []).map((mensaje) => aMensaje(mensaje)),
  }
}

export const clavesAprendizaje = {
  todo: ['aprendizaje'] as const,
  documentos: () => [...clavesAprendizaje.todo, 'documentos'] as const,
  cuestionario: (id: string) => [...clavesAprendizaje.todo, 'cuestionario', id] as const,
  sesion: (id: string) => [...clavesAprendizaje.todo, 'sesion', id] as const,
}

export async function listarDocumentos(): Promise<Documento[]> {
  const documentos = await ia.get<unknown[]>('/documents')
  return (documentos ?? []).map(aDocumento)
}

export async function subirDocumento(archivo: File): Promise<Documento> {
  return aDocumento(await ia.subirArchivo<unknown>('/documents/upload', archivo))
}

export async function eliminarDocumento(id: string): Promise<void> {
  await ia.eliminar<unknown>(`/documents/${encodeURIComponent(id)}`)
}

export async function generarCuestionario(cuerpo: CuerpoGeneracion, senal: AbortSignal): Promise<Cuestionario> {
  return aCuestionario(await ia.post<unknown>('/quizzes/generate', cuerpo, senal))
}

export async function obtenerCuestionario(id: string): Promise<Cuestionario> {
  return aCuestionario(await ia.get<unknown>(`/quizzes/${encodeURIComponent(id)}`))
}

export async function crearSesion(documentIds: string[]): Promise<SesionDeConsulta> {
  return aSesion(await ia.post<unknown>('/chat/sessions', { documentIds }))
}

export async function obtenerSesion(id: string): Promise<SesionDeConsulta> {
  return aSesion(await ia.get<unknown>(`/chat/sessions/${encodeURIComponent(id)}`))
}

export async function enviarMensaje(sessionId: string, message: string): Promise<MensajeChat> {
  const respuesta = esquemaRespuestaDeChat.parse(await ia.post<unknown>('/chat/messages', { sessionId, message }))
  return aMensaje(respuesta.message, respuesta.sources.map(aFuente))
}

export const consultasAprendizaje = {
  documentos: () => queryOptions({ queryKey: clavesAprendizaje.documentos(), queryFn: listarDocumentos }),
  cuestionario: (id: string) =>
    queryOptions({ queryKey: clavesAprendizaje.cuestionario(id), queryFn: () => obtenerCuestionario(id), retry: false }),
  sesion: (id: string) =>
    queryOptions({ queryKey: clavesAprendizaje.sesion(id), queryFn: () => obtenerSesion(id), retry: false }),
}
```

- [ ] **Step 6: Add the generation form schema (CA-CUE-01)**

In `src/features/aprendizaje/schemas.ts`, replace:

```ts
import { z } from 'zod'

export const esquemaBusquedaCuestionario = z.object({
  cuestionario: z.uuidv4().optional().catch(undefined),
})

```

with:

```ts
import { z } from 'zod'

export const TIPOS_PREGUNTA = [
  { valor: 'multiple_choice', etiqueta: 'Opción múltiple' },
  { valor: 'true_false', etiqueta: 'Verdadero o falso' },
  { valor: 'fill_blank', etiqueta: 'Completar' },
] as const

export const MENSAJE_CANTIDAD = 'La cantidad debe ser un número entero entre 2 y 20.'

export const esquemaGeneracion = z.object({
  documentos: z.array(z.string()).min(1, 'Elija al menos un documento.'),
  tipos: z
    .array(z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor)))
    .min(1, 'Elija al menos un tipo de pregunta.'),
  cantidad: z
    .string()
    .min(1, MENSAJE_CANTIDAD)
    .regex(/^\d{1,2}$/, MENSAJE_CANTIDAD)
    .refine((valor) => Number(valor) >= 2 && Number(valor) <= 20, MENSAJE_CANTIDAD),
})

export type ValoresGeneracion = z.input<typeof esquemaGeneracion>

export const GENERACION_VACIA: ValoresGeneracion = { documentos: [], tipos: ['multiple_choice'], cantidad: '5' }

export const esquemaBusquedaCuestionario = z.object({
  cuestionario: z.uuidv4().optional().catch(undefined),
})

```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dominio/aprendizaje.test.ts src/features/aprendizaje
```

Expected: PASS, 24 tests.

- [ ] **Step 8: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 514 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add the aprendizaje api client and its messages"
```

---

### Task 6: MSW mocks for documents (contract §1 and §7.1) (M3-16)

**Files:**

- Create: `src/mocks/ia/comun.ts`
- Create: `src/mocks/ia/documentos.ts`
- Test: `src/mocks/ia/documentos.test.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**
- Consumes: `datosIa`, `consultar`, `documentoNuevo`, `documentosOrdenados` (Task 2); `TIPOS_ACEPTADOS` and `TAMANO_MAXIMO_*` (Task 3); the client of Task 5.
- Produces:
  - `src/mocks/ia/comun.ts`: `IA` (the base URL), `errorNest`, `noEncontrado`, `malaPeticion` and `documentoPublico`, the projection that never carries `extractedText`, `storageKey` or `ownerId`.
  - `POST /documents/upload` (C1 without a file, 413 with C13 over 25 MB, C2 for an unsupported type, otherwise 201 with the `…0005` fixture at the head of the list), `GET /documents` (descending by `createdAt`, counting a poll for every row still processing), `GET /documents/{id}` and `DELETE /documents/{id}` (`{deleted:true}`, C3 for an unknown id). The upload route is registered **before** `/documents/:id` so it is not shadowed.
  - The handlers are registered in `src/mocks/handlers.ts` under the same `VITE_MOCK_API` flag as the `sigeda/` ones.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/ia/documentos.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { eliminarDocumento, listarDocumentos, subirDocumento } from '@/features/aprendizaje/api'
import { C4_SIN_TEXTO_LEGIBLE } from '@/features/aprendizaje/mensajes'
import { ia } from '@/lib/api/ia'
import { C13_ARCHIVO_GRANDE, C3_DOCUMENTO_NO_ENCONTRADO } from './documentos'

const ID_PRINCIPAL = 'd0c00000-0000-4000-8000-000000000001'
const ID_ERROR = 'd0c00000-0000-4000-8000-000000000003'
const ID_LENTO = 'd0c00000-0000-4000-8000-000000000004'
const ID_SUBIDO = 'd0c00000-0000-4000-8000-000000000005'
const ID_ETERNO = 'd0c00000-0000-4000-8000-000000000006'
const ID_AJENO = 'd0c00000-0000-4000-8000-00000000aaaa'

function archivo(nombre = 'Apuntes nuevos.txt', tipo = 'text/plain', contenido = 'contenido de prueba') {
  return new File([contenido], nombre, { type: tipo })
}

describe('mock de documentos', () => {
  it('contrato §7.1 devuelve las cinco fijaciones de la más reciente a la más antigua', async () => {
    const documentos = await listarDocumentos()
    expect(documentos.map((documento) => documento.filename)).toEqual([
      'Reglamento de operaciones.pdf',
      'Apuntes de aerodinámica.txt',
      'Manual de vuelo escaneado.pdf',
      'Procedimientos de emergencia.docx',
      'PDI EA-510 Título III.pdf',
    ])
    expect(documentos.map((documento) => documento.status)).toEqual([
      'processing',
      'processing',
      'error',
      'ready',
      'ready',
    ])
    expect(documentos[2]?.errorMessage).toBe(C4_SIN_TEXTO_LEGIBLE)
    expect(documentos[4]?.tags).toEqual(['instrucción', 'maniobras'])
    expect(documentos[4]?.processedAt).not.toBeNull()
  })

  it('contrato §7.1 el documento lento queda listo en su tercera consulta y el eterno nunca', async () => {
    await listarDocumentos()
    await listarDocumentos()
    const tercera = await listarDocumentos()
    const lento = tercera.find((documento) => documento.id === ID_LENTO)
    expect(lento?.status).toBe('ready')
    expect(lento?.tags).toEqual(['aerodinámica'])
    expect(tercera.find((documento) => documento.id === ID_ETERNO)?.status).toBe('processing')
  })

  it('contrato §7.1 el detalle suma al contador del documento que aún procesa', async () => {
    await ia.get(`/documents/${ID_LENTO}`)
    await ia.get(`/documents/${ID_LENTO}`)
    await expect(ia.get(`/documents/${ID_LENTO}`)).resolves.toMatchObject({ status: 'ready' })
    await expect(ia.get(`/documents/${ID_PRINCIPAL}`)).resolves.toMatchObject({ status: 'ready' })
    await expect(ia.get(`/documents/${ID_AJENO}`)).rejects.toMatchObject({
      status: 404,
      message: C3_DOCUMENTO_NO_ENCONTRADO,
    })
  })

  it('contrato §7.1 la subida encabeza la lista y queda lista en su tercera consulta', async () => {
    const subido = await subirDocumento(archivo())
    expect(subido).toMatchObject({ id: ID_SUBIDO, status: 'processing', tags: [], processedAt: null })
    expect((await listarDocumentos())[0]?.id).toBe(ID_SUBIDO)
    await listarDocumentos()
    expect((await listarDocumentos())[0]?.status).toBe('ready')
  })

  it('contrato §7.1 rechaza un tipo no soportado con C2', async () => {
    await expect(subirDocumento(archivo('foto.png', 'image/png'))).rejects.toMatchObject({
      status: 400,
      message: 'Tipo de archivo no soportado: image/png. Solo se aceptan PDF, DOCX y TXT.',
    })
  })

  it('contrato §7.1 rechaza con C13 un archivo de más de 25 MB', async () => {
    const grande = new File([new Uint8Array(26 * 1024 * 1024)], 'Manual.pdf', { type: 'application/pdf' })
    await expect(subirDocumento(grande)).rejects.toMatchObject({ status: 413, message: C13_ARCHIVO_GRANDE })
  })

  it('contrato §7.1 eliminar responde {deleted:true} y saca el documento de la lista', async () => {
    await eliminarDocumento(ID_ERROR)
    expect((await listarDocumentos()).some((documento) => documento.id === ID_ERROR)).toBe(false)
    await expect(eliminarDocumento(ID_AJENO)).rejects.toMatchObject({
      status: 404,
      message: C3_DOCUMENTO_NO_ENCONTRADO,
    })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/ia/documentos.test.ts
```

Expected: FAIL — `Failed to resolve import "./documentos"`.

- [ ] **Step 3: Write the Nest error envelope and the document projection**

Create `src/mocks/ia/comun.ts`:

```ts
import { HttpResponse } from 'msw'
import { config } from '@/lib/config'
import type { DocumentoMock } from './datos'

export const IA = config.iaApiUrl

export function errorNest(status: number, mensaje: string, error: string) {
  return HttpResponse.json({ statusCode: status, message: mensaje, error }, { status })
}

export function noEncontrado(mensaje: string) {
  return errorNest(404, mensaje, 'Not Found')
}

export function malaPeticion(mensaje: string) {
  return errorNest(400, mensaje, 'Bad Request')
}

export function documentoPublico(documento: DocumentoMock) {
  return {
    id: documento.id,
    filename: documento.filename,
    mimeType: documento.mimeType,
    sizeBytes: documento.sizeBytes,
    status: documento.status,
    errorMessage: documento.errorMessage,
    tags: documento.tags,
    createdAt: documento.createdAt,
    processedAt: documento.processedAt,
  }
}
```

- [ ] **Step 4: Write the document handlers of contract §1 and §7.1**

Create `src/mocks/ia/documentos.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { TAMANO_MAXIMO_BYTES, TAMANO_MAXIMO_MB, TIPOS_ACEPTADOS } from '@/lib/dominio/aprendizaje'
import { documentoPublico, errorNest, IA, malaPeticion, noEncontrado } from './comun'
import { buscarDocumento, consultar, datosIa, documentoNuevo, documentosOrdenados } from './datos'

export const C1_SIN_ARCHIVO = 'No se recibió ningún archivo.'
export const C3_DOCUMENTO_NO_ENCONTRADO = 'Documento no encontrado.'
export const C13_ARCHIVO_GRANDE = `El archivo supera el tamaño máximo de ${TAMANO_MAXIMO_MB} MB.`

function tipoSoportado(mimeType: string): boolean {
  return TIPOS_ACEPTADOS.some((tipo) => tipo.mimeType === mimeType)
}

export const handlersDocumentos = [
  http.post(`${IA}/documents/upload`, async ({ request }) => {
    const formulario = await request.formData()
    const archivo = formulario.get('file')
    if (!(archivo instanceof File)) return malaPeticion(C1_SIN_ARCHIVO)
    if (archivo.size > TAMANO_MAXIMO_BYTES) return errorNest(413, C13_ARCHIVO_GRANDE, 'Payload Too Large')
    if (!tipoSoportado(archivo.type)) {
      return malaPeticion(`Tipo de archivo no soportado: ${archivo.type}. Solo se aceptan PDF, DOCX y TXT.`)
    }
    const nuevo = documentoNuevo(archivo.name, archivo.type, archivo.size)
    datosIa().documentos = [...datosIa().documentos.filter((documento) => documento.id !== nuevo.id), nuevo]
    return HttpResponse.json(documentoPublico(nuevo), { status: 201 })
  }),
  http.get(`${IA}/documents`, () => HttpResponse.json(documentosOrdenados().map(consultar).map(documentoPublico))),
  http.get(`${IA}/documents/:id`, ({ params }) => {
    const documento = buscarDocumento(String(params.id))
    if (!documento) return noEncontrado(C3_DOCUMENTO_NO_ENCONTRADO)
    return HttpResponse.json(documentoPublico(consultar(documento)))
  }),
  http.delete(`${IA}/documents/:id`, ({ params }) => {
    const documento = buscarDocumento(String(params.id))
    if (!documento) return noEncontrado(C3_DOCUMENTO_NO_ENCONTRADO)
    datosIa().documentos = datosIa().documentos.filter((candidato) => candidato.id !== documento.id)
    return HttpResponse.json({ deleted: true })
  }),
]
```

- [ ] **Step 5: Register them beside the sigeda handlers (M3-16)**

In `src/mocks/handlers.ts`, replace:

```ts
import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
```

with:

```ts
import type { RequestHandler } from 'msw'
import { handlersDocumentos } from './ia/documentos'
import { handlersAuth } from './sigeda/auth'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

with:

```ts
  ...handlersTurnos,
  ...handlersEvaluaciones,
  ...handlersDocumentos,
]
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/ia
```

Expected: PASS, 7 tests.

- [ ] **Step 7: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 521 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "test: mock the documents api"
```

---

### Task 7: MSW mocks for quizzes and chat (contract §2, §3, §7.2 and §7.3) (M3-16)

**Files:**

- Create: `src/mocks/ia/cuestionarios.ts`
- Test: `src/mocks/ia/cuestionarios.test.ts`
- Create: `src/mocks/ia/consultas.ts`
- Test: `src/mocks/ia/consultas.test.ts`
- Modify: `src/mocks/ia/comun.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**
- Consumes: `datosIa`, `buscarDocumento` (Task 2); `documentoPublico`, `errorNest` (Task 6); `conLimiteDeTiempo` and `relojFalso` in the tests.
- Produces:
  - `errorInterno()`: the two-key Nest 500 (`{statusCode, message}`), which `normalizarError` turns into `MENSAJE_GENERICO` — the shape the `BigInt` failure of dependency 45 produces.
  - `revisarDocumentos(ids)`, shared by quiz generation and session creation: C5 for an id that is not in the store, C6 with the file names of those that are not `ready`.
  - `POST /quizzes/generate` with the `questionCount` triggers of contract §7.2 (7 → C7 with its technical detail, 13 → `delay('infinite')`, 20 → three seconds then the quiz, anything else → 201), always the same three fixed questions (one per type) with `requestedCount` as asked; `GET /quizzes/{id}` (the fixed id, C8 for any other).
  - `POST /chat/sessions` (201 with `…0003`, the default title from the file names, documents flattened as `DocumentResponseDto[]` per dependency 45), `POST /chat/messages` (two sources with 0.812 and 0.774; "clima" → no sources; "error" → C10 as the content; "falla" → 500 with nothing stored; unknown session → C9), `GET /chat/sessions/{id}` (`…0001` with resolved sources and `similarity: null`, `…0002` without the `sources` key, `…0009` → 500, any other → C9).

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/ia/cuestionarios.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { generarCuestionario, obtenerCuestionario, type CuerpoGeneracion } from '@/features/aprendizaje/api'
import { CanceladoError } from '@/lib/api/errors'
import { conLimiteDeTiempo } from '@/lib/api/http'
import { relojFalso } from '@/test/tiempo'
import { C5_DOCUMENTOS_AJENOS, C7_GENERACION_FALLIDA, C8_CUESTIONARIO_NO_ENCONTRADO, ID_CUESTIONARIO } from './cuestionarios'

const ID_PRINCIPAL = 'd0c00000-0000-4000-8000-000000000001'
const ID_ERROR = 'd0c00000-0000-4000-8000-000000000003'
const ID_ETERNO = 'd0c00000-0000-4000-8000-000000000006'
const ID_AJENO = 'd0c00000-0000-4000-8000-00000000aaaa'

function cuerpo(parcial: Partial<CuerpoGeneracion> = {}): CuerpoGeneracion {
  return { documentIds: [ID_PRINCIPAL], questionTypes: ['multiple_choice'], questionCount: 5, ...parcial }
}

function sinLimite() {
  return new AbortController().signal
}

describe('mock de cuestionarios', () => {
  it('contrato §7.2 devuelve el cuestionario fijo con una pregunta de cada tipo', async () => {
    const cuestionario = await generarCuestionario(cuerpo(), sinLimite())
    expect(cuestionario.id).toBe(ID_CUESTIONARIO)
    expect(cuestionario.requestedCount).toBe(5)
    expect(cuestionario.preguntas.map((pregunta) => pregunta.type)).toEqual([
      'multiple_choice',
      'true_false',
      'fill_blank',
    ])
    expect(cuestionario.preguntas[0]?.options).toHaveLength(4)
    expect(cuestionario.preguntas[2]?.prompt).toContain('_____')
    expect(cuestionario.preguntas[2]?.correctAnswer).toBe('autorrotación')
  })

  it('contrato §7.2 con questionCount 7 devuelve C7 con su detalle técnico', async () => {
    await expect(generarCuestionario(cuerpo({ questionCount: 7 }), sinLimite())).rejects.toMatchObject({
      status: 400,
      message: C7_GENERACION_FALLIDA,
    })
  })

  it('contrato §7.2 con questionCount 13 no responde nunca', async () => {
    const { avanzar } = relojFalso()
    let error: unknown = null
    const peticion = conLimiteDeTiempo(120_000, (senal) =>
      generarCuestionario(cuerpo({ questionCount: 13 }), senal),
    ).catch((e: unknown) => {
      error = e
    })
    await avanzar(119_000)
    expect(error).toBeNull()
    await avanzar(1000)
    await peticion
    expect(error).toBeInstanceOf(CanceladoError)
  })

  it('contrato §7.2 con questionCount 20 responde después de tres segundos', async () => {
    const { avanzar } = relojFalso()
    let listo = false
    const peticion = generarCuestionario(cuerpo({ questionCount: 20 }), sinLimite()).then(() => {
      listo = true
    })
    await avanzar(2900)
    expect(listo).toBe(false)
    await avanzar(100)
    await peticion
    expect(listo).toBe(true)
  })

  it('contrato §7.2 un documento inexistente devuelve C5 y uno no listo devuelve C6', async () => {
    await expect(generarCuestionario(cuerpo({ documentIds: [ID_AJENO] }), sinLimite())).rejects.toMatchObject({
      status: 404,
      message: C5_DOCUMENTOS_AJENOS,
    })
    await expect(
      generarCuestionario(cuerpo({ documentIds: [ID_PRINCIPAL, ID_ERROR, ID_ETERNO] }), sinLimite()),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Los siguientes documentos aún no están listos: Manual de vuelo escaneado.pdf, Reglamento de operaciones.pdf',
    })
  })

  it('contrato §7.2 el id fijo se recupera y cualquier otro devuelve C8', async () => {
    await expect(obtenerCuestionario(ID_CUESTIONARIO)).resolves.toMatchObject({ id: ID_CUESTIONARIO })
    await expect(obtenerCuestionario('c0e50000-0000-4000-8000-00000000aaaa')).rejects.toMatchObject({
      status: 404,
      message: C8_CUESTIONARIO_NO_ENCONTRADO,
    })
  })
})
```

Create `src/mocks/ia/consultas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { crearSesion, enviarMensaje, obtenerSesion } from '@/features/aprendizaje/api'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import {
  C10_SIN_RESPUESTA,
  C9_SESION_NO_ENCONTRADA,
  ID_SESION_CON_FUENTES,
  ID_SESION_CREADA,
  ID_SESION_ILEGIBLE,
  ID_SESION_SIN_FUENTES,
} from './consultas'
import { C5_DOCUMENTOS_AJENOS } from './cuestionarios'

const ID_PRINCIPAL = 'd0c00000-0000-4000-8000-000000000001'
const ID_SEGUNDO = 'd0c00000-0000-4000-8000-000000000002'
const ID_ETERNO = 'd0c00000-0000-4000-8000-000000000006'
const ID_AJENO = '5e550000-0000-4000-8000-00000000aaaa'

describe('mock de consultas', () => {
  it('contrato §7.3 crear la conversación devuelve el id fijo, el título por defecto y sus documentos', async () => {
    const sesion = await crearSesion([ID_PRINCIPAL, ID_SEGUNDO])
    expect(sesion.id).toBe(ID_SESION_CREADA)
    expect(sesion.title).toBe('Consulta sobre PDI EA-510 Título III.pdf, Procedimientos de emergencia.docx')
    expect(sesion.documentos.map((documento) => documento.filename)).toEqual([
      'PDI EA-510 Título III.pdf',
      'Procedimientos de emergencia.docx',
    ])
    expect(Object.keys(sesion.documentos[0] ?? {})).not.toContain('extractedText')
  })

  it('contrato §7.3 crear la conversación repite los errores C5 y C6', async () => {
    await expect(crearSesion([ID_AJENO])).rejects.toMatchObject({ status: 404, message: C5_DOCUMENTOS_AJENOS })
    await expect(crearSesion([ID_ETERNO])).rejects.toMatchObject({
      status: 400,
      message: 'Los siguientes documentos aún no están listos: Reglamento de operaciones.pdf',
    })
  })

  it('contrato §7.3 la respuesta normal cita dos fuentes con su similitud', async () => {
    await crearSesion([ID_PRINCIPAL])
    const respuesta = await enviarMensaje(ID_SESION_CREADA, '¿Qué es la autorrotación?')
    expect(respuesta.content).toContain('[1]')
    expect(respuesta.fuentes?.map((fuente) => fuente.similarity)).toEqual([0.812, 0.774])
    expect(respuesta.fuentes?.[0]?.documentFilename).toBe('PDI EA-510 Título III.pdf')
  })

  it('contrato §7.3 una pregunta con «clima» no trae fuentes y una con «error» devuelve C10', async () => {
    await crearSesion([ID_PRINCIPAL])
    await expect(enviarMensaje(ID_SESION_CREADA, '¿Cómo afecta el clima?')).resolves.toMatchObject({ fuentes: [] })
    await expect(enviarMensaje(ID_SESION_CREADA, 'provoca un error')).resolves.toMatchObject({
      content: C10_SIN_RESPUESTA,
      fuentes: [],
    })
  })

  it('contrato §7.3 una pregunta con «falla» devuelve 500 y no guarda nada', async () => {
    await crearSesion([ID_PRINCIPAL])
    await expect(enviarMensaje(ID_SESION_CREADA, 'esto falla')).rejects.toMatchObject({
      status: 500,
      message: MENSAJE_GENERICO,
    })
    await expect(obtenerSesion(ID_SESION_CREADA)).resolves.toMatchObject({ mensajes: [] })
  })

  it('contrato §7.3 un sessionId desconocido devuelve C9', async () => {
    await expect(enviarMensaje(ID_AJENO, 'hola')).rejects.toMatchObject({
      status: 404,
      message: C9_SESION_NO_ENCONTRADA,
    })
  })

  it('contrato §7.3 la conversación con fuentes las resuelve sin similitud', async () => {
    const sesion = await obtenerSesion(ID_SESION_CON_FUENTES)
    expect(sesion.mensajes).toHaveLength(2)
    expect(sesion.mensajes[0]?.fuentes).toEqual([])
    expect(sesion.mensajes[1]?.fuentes).toEqual([
      {
        referenceNumber: 1,
        documentId: ID_PRINCIPAL,
        documentFilename: 'PDI EA-510 Título III.pdf',
        excerpt: 'La autorrotación es la condición de vuelo en la que el rotor principal gira por el flujo de aire ascendente.',
        similarity: null,
      },
      {
        referenceNumber: 2,
        documentId: ID_PRINCIPAL,
        documentFilename: 'PDI EA-510 Título III.pdf',
        excerpt: 'El régimen de rotor debe mantenerse dentro del arco verde durante todo el descenso.',
        similarity: null,
      },
    ])
  })

  it('contrato §7.3 la conversación sin fuentes llega sin la clave sources', async () => {
    const sesion = await obtenerSesion(ID_SESION_SIN_FUENTES)
    expect(sesion.mensajes.map((mensaje) => mensaje.fuentes)).toEqual([null, null])
    expect(sesion.mensajes[1]?.content).toContain('[1]')
  })

  it('contrato §7.3 la conversación ilegible responde 500 y otra inexistente C9', async () => {
    await expect(obtenerSesion(ID_SESION_ILEGIBLE)).rejects.toMatchObject({ status: 500, message: MENSAJE_GENERICO })
    await expect(obtenerSesion(ID_AJENO)).rejects.toMatchObject({ status: 404, message: C9_SESION_NO_ENCONTRADA })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/ia/cuestionarios.test.ts src/mocks/ia/consultas.test.ts
```

Expected: FAIL — `Failed to resolve import "./cuestionarios"` and `"./consultas"`.

- [ ] **Step 3: Add the Nest 500 body to the shared helpers**

In `src/mocks/ia/comun.ts`, replace:

```ts
export function malaPeticion(mensaje: string) {
  return errorNest(400, mensaje, 'Bad Request')
}
```

with:

```ts
export function malaPeticion(mensaje: string) {
  return errorNest(400, mensaje, 'Bad Request')
}

export function errorInterno() {
  return HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 })
}
```

- [ ] **Step 4: Write the quiz handlers of contract §2 and §7.2**

Create `src/mocks/ia/cuestionarios.ts`:

```ts
import { delay, http, HttpResponse } from 'msw'
import { IA, malaPeticion, noEncontrado } from './comun'
import { buscarDocumento } from './datos'

export const ID_CUESTIONARIO = 'c0e50000-0000-4000-8000-000000000001'

export const C5_DOCUMENTOS_AJENOS = 'Uno o más documentos no existen o no te pertenecen.'
export const C7_GENERACION_FALLIDA =
  'No se pudo generar el cuestionario tras 3 intentos: Unexpected token } in JSON at position 512'
export const C8_CUESTIONARIO_NO_ENCONTRADO = 'Cuestionario no encontrado.'

const CREADO = '2026-09-19T09:15:00.000Z'

type CuerpoGeneracion = { documentIds?: unknown; questionTypes?: unknown; questionCount?: unknown }

function preguntas() {
  return [
    {
      id: '9e500000-0000-4000-8000-000000000001',
      quizId: ID_CUESTIONARIO,
      type: 'multiple_choice',
      position: 0,
      prompt: '¿Qué permite la autorrotación?',
      options: [
        { id: 'a', text: 'Un descenso controlado sin potencia del motor' },
        { id: 'b', text: 'Aumentar la velocidad de ascenso' },
        { id: 'c', text: 'Mantener el vuelo estacionario indefinidamente' },
        { id: 'd', text: 'Reducir el consumo de combustible en crucero' },
      ],
      correctAnswer: 'a',
      explanation: 'El rotor gira por el flujo de aire ascendente.',
      sourceDocumentId: null,
      sourceExcerpt: 'La autorrotación es la condición de vuelo en la que el rotor gira por el flujo de aire ascendente.',
      createdAt: CREADO,
    },
    {
      id: '9e500000-0000-4000-8000-000000000002',
      quizId: ID_CUESTIONARIO,
      type: 'true_false',
      position: 1,
      prompt: 'La última misión de cada subfase es un chequeo.',
      options: null,
      correctAnswer: 'true',
      explanation: 'El PDI EA-510 exige un chequeo al cerrar cada subfase.',
      sourceDocumentId: null,
      sourceExcerpt: null,
      createdAt: CREADO,
    },
    {
      id: '9e500000-0000-4000-8000-000000000003',
      quizId: ID_CUESTIONARIO,
      type: 'fill_blank',
      position: 2,
      prompt: 'La maniobra que permite descender sin potencia se llama _____.',
      options: null,
      correctAnswer: 'autorrotación',
      explanation: 'Es la autorrotación.',
      sourceDocumentId: null,
      sourceExcerpt: 'La autorrotación permite un descenso controlado.',
      createdAt: CREADO,
    },
  ]
}

function cuestionario(requestedCount: number, questionTypes: string[]) {
  return {
    id: ID_CUESTIONARIO,
    ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
    title: 'Cuestionario sin título',
    questionTypes,
    requestedCount,
    modelName: 'claude-opus-5',
    generationPromptVersion: 'v1',
    createdAt: CREADO,
    questions: preguntas(),
  }
}

function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((elemento): elemento is string => typeof elemento === 'string') : []
}

export function revisarDocumentos(ids: readonly string[]): Response | null {
  const documentos = ids.map((id) => buscarDocumento(id))
  if (documentos.some((documento) => documento === undefined)) return noEncontrado(C5_DOCUMENTOS_AJENOS)
  const noListos = documentos.filter((documento) => documento?.status !== 'ready')
  if (noListos.length > 0) {
    return malaPeticion(
      `Los siguientes documentos aún no están listos: ${noListos.map((documento) => documento?.filename).join(', ')}`,
    )
  }
  return null
}

export const handlersCuestionarios = [
  http.post(`${IA}/quizzes/generate`, async ({ request }) => {
    const cuerpo = (await request.json()) as CuerpoGeneracion
    const ids = textos(cuerpo.documentIds)
    const tipos = textos(cuerpo.questionTypes)
    const cantidad = Number(cuerpo.questionCount)
    const problema = revisarDocumentos(ids)
    if (problema) return problema
    if (cantidad === 7) return malaPeticion(C7_GENERACION_FALLIDA)
    if (cantidad === 13) {
      await delay('infinite')
      return
    }
    if (cantidad === 20) await delay(3000)
    return HttpResponse.json(cuestionario(cantidad, tipos), { status: 201 })
  }),
  http.get(`${IA}/quizzes/:id`, ({ params }) => {
    if (String(params.id) !== ID_CUESTIONARIO) return noEncontrado(C8_CUESTIONARIO_NO_ENCONTRADO)
    return HttpResponse.json(cuestionario(3, ['multiple_choice', 'true_false', 'fill_blank']))
  }),
]
```

- [ ] **Step 5: Write the chat handlers of contract §3 and §7.3**

Create `src/mocks/ia/consultas.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { documentoPublico, errorInterno, IA, noEncontrado } from './comun'
import { revisarDocumentos } from './cuestionarios'
import { buscarDocumento, datosIa, type SesionMock } from './datos'

export const ID_SESION_CON_FUENTES = '5e550000-0000-4000-8000-000000000001'
export const ID_SESION_SIN_FUENTES = '5e550000-0000-4000-8000-000000000002'
export const ID_SESION_CREADA = '5e550000-0000-4000-8000-000000000003'
export const ID_SESION_ILEGIBLE = '5e550000-0000-4000-8000-000000000009'

export const C9_SESION_NO_ENCONTRADA = 'Sesión de chat no encontrada.'
export const C10_SIN_RESPUESTA = 'No se pudo generar una respuesta. Intenta reformular tu pregunta.'

const ID_DOCUMENTO_PRINCIPAL = 'd0c00000-0000-4000-8000-000000000001'
const FRAGMENTOS = ['cc000000-0000-4000-8000-000000000001', 'cc000000-0000-4000-8000-000000000002']

const CONTENIDO_USUARIO = '¿Qué es la autorrotación?'
const CONTENIDO_ASISTENTE =
  'La autorrotación permite un descenso controlado sin potencia [1]. El régimen de rotor se mantiene con el flujo ascendente [1][2].'

const EXCERPTS = [
  'La autorrotación es la condición de vuelo en la que el rotor principal gira por el flujo de aire ascendente.',
  'El régimen de rotor debe mantenerse dentro del arco verde durante todo el descenso.',
]

type CuerpoSesion = { documentIds?: unknown }
type CuerpoMensaje = { sessionId?: unknown; message?: unknown }

function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((elemento): elemento is string => typeof elemento === 'string') : []
}

function fuentesResueltas(similitudes: readonly (number | null)[]) {
  const documento = buscarDocumento(ID_DOCUMENTO_PRINCIPAL)
  return similitudes.map((similarity, indice) => ({
    referenceNumber: indice + 1,
    documentId: documento ? documento.id : null,
    documentFilename: documento ? documento.filename : null,
    excerpt: EXCERPTS[indice] ?? null,
    similarity,
  }))
}

function sesionFija(id: string, conFuentes: boolean): SesionMock {
  const sufijo = conFuentes ? '000' : '001'
  return {
    id,
    title: 'Consulta sobre PDI EA-510 Título III.pdf',
    createdAt: '2026-09-19T10:30:00.000Z',
    documentIds: [ID_DOCUMENTO_PRINCIPAL],
    conFuentes,
    mensajes: [
      {
        id: `3e550000-0000-4000-8000-0000000${sufijo}1`,
        sessionId: id,
        role: 'user',
        content: CONTENIDO_USUARIO,
        createdAt: '2026-09-19T10:31:00.000Z',
        citedChunkIds: [],
      },
      {
        id: `3e550000-0000-4000-8000-0000000${sufijo}2`,
        sessionId: id,
        role: 'assistant',
        content: CONTENIDO_ASISTENTE,
        createdAt: '2026-09-19T10:31:12.000Z',
        citedChunkIds: FRAGMENTOS,
      },
    ],
  }
}

function documentosDeSesion(ids: readonly string[]) {
  return ids.flatMap((id) => {
    const documento = buscarDocumento(id)
    return documento ? [documentoPublico(documento)] : []
  })
}

function sesionPublica(sesion: SesionMock) {
  return {
    id: sesion.id,
    title: sesion.title,
    createdAt: sesion.createdAt,
    documents: documentosDeSesion(sesion.documentIds),
    messages: sesion.mensajes.map((mensaje) => {
      const base = {
        id: mensaje.id,
        sessionId: mensaje.sessionId,
        role: mensaje.role,
        content: mensaje.content,
        createdAt: mensaje.createdAt,
      }
      if (!sesion.conFuentes) return base
      return { ...base, sources: fuentesResueltas(mensaje.citedChunkIds.map(() => null)) }
    }),
  }
}

function buscarSesion(id: string): SesionMock | undefined {
  if (id === ID_SESION_CON_FUENTES) return sesionFija(id, true)
  if (id === ID_SESION_SIN_FUENTES) return sesionFija(id, false)
  return datosIa().sesiones.find((sesion) => sesion.id === id)
}

export const handlersConsultas = [
  http.post(`${IA}/chat/sessions`, async ({ request }) => {
    const cuerpo = (await request.json()) as CuerpoSesion
    const ids = textos(cuerpo.documentIds)
    const problema = revisarDocumentos(ids)
    if (problema) return problema
    const nombres = documentosDeSesion(ids).map((documento) => documento.filename)
    const sesion: SesionMock = {
      id: ID_SESION_CREADA,
      title: `Consulta sobre ${nombres.join(', ')}`,
      createdAt: new Date().toISOString(),
      documentIds: [...ids],
      conFuentes: true,
      mensajes: [],
    }
    datosIa().sesiones = [...datosIa().sesiones.filter((previa) => previa.id !== sesion.id), sesion]
    return HttpResponse.json(sesionPublica(sesion), { status: 201 })
  }),
  http.post(`${IA}/chat/messages`, async ({ request }) => {
    const cuerpo = (await request.json()) as CuerpoMensaje
    const id = typeof cuerpo.sessionId === 'string' ? cuerpo.sessionId : ''
    const pregunta = typeof cuerpo.message === 'string' ? cuerpo.message : ''
    const sesion = datosIa().sesiones.find((candidata) => candidata.id === id)
    if (!sesion) return noEncontrado(C9_SESION_NO_ENCONTRADA)
    if (pregunta.toLowerCase().includes('falla')) return errorInterno()
    const sinFuentes = pregunta.toLowerCase().includes('clima')
    const fallaDelModelo = pregunta.toLowerCase().includes('error')
    const orden = sesion.mensajes.length + 1
    sesion.mensajes.push({
      id: `3e550000-0000-4000-8000-1000000000${String(orden).padStart(2, '0')}`,
      sessionId: sesion.id,
      role: 'user',
      content: pregunta,
      createdAt: new Date().toISOString(),
      citedChunkIds: [],
    })
    const fuentes = sinFuentes || fallaDelModelo ? [] : fuentesResueltas([0.812, 0.774])
    const respuesta = {
      id: `3e550000-0000-4000-8000-1000000000${String(orden + 1).padStart(2, '0')}`,
      sessionId: sesion.id,
      role: 'assistant' as const,
      content: fallaDelModelo ? C10_SIN_RESPUESTA : sinFuentes ? 'No encontré nada sobre eso en los documentos.' : CONTENIDO_ASISTENTE,
      createdAt: new Date().toISOString(),
      citedChunkIds: fuentes.length > 0 ? FRAGMENTOS : [],
    }
    sesion.mensajes.push(respuesta)
    return HttpResponse.json({ message: respuesta, sources: fuentes }, { status: 201 })
  }),
  http.get(`${IA}/chat/sessions/:id`, ({ params }) => {
    const id = String(params.id)
    if (id === ID_SESION_ILEGIBLE) return errorInterno()
    const sesion = buscarSesion(id)
    if (!sesion) return noEncontrado(C9_SESION_NO_ENCONTRADA)
    return HttpResponse.json(sesionPublica(sesion))
  }),
]
```

- [ ] **Step 6: Register them**

In `src/mocks/handlers.ts`, replace:

```ts
import { handlersDocumentos } from './ia/documentos'
```

with:

```ts
import { handlersConsultas } from './ia/consultas'
import { handlersCuestionarios } from './ia/cuestionarios'
import { handlersDocumentos } from './ia/documentos'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersDocumentos,
]
```

with:

```ts
  ...handlersDocumentos,
  ...handlersCuestionarios,
  ...handlersConsultas,
]
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/mocks/ia
```

Expected: PASS, 22 tests.

- [ ] **Step 8: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 536 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "test: mock the quizzes and chat apis"
```

---

### Task 8: Documentos: the list, its states and the 3 s poll with its ceiling (M3-7) (CA-DOC-01, CA-DOC-04, CA-DOC-05, CA-DOC-06, CA-DOC-08)

**Files:**

- Modify (full rewrite): `src/features/aprendizaje/documentos-page.tsx`
- Test: `src/features/aprendizaje/documentos-page.test.tsx`

**Interfaces:**
- Consumes: `consultasAprendizaje.documentos`, `motivoDelDocumento`, `etiquetaDeTipo`, `formatearTamano`, `formatearFecha`, `StatusBadge` with the `documento` vocabulary, `AvisoDeError`, `EmptyState`, `errorDePrimeraCarga`, `relojFalso`.
- Produces:
  - A table (nombre, tipo, tamaño, estado, etiquetas, subido el) in the order the server sends, newest first; A14 in an `EmptyState` when the list is empty; `AvisoDeError` with Reintentar only on a first-load failure.
  - `INTERVALO_DE_CONSULTA` (3 000) and `LIMITE_DE_CONSULTAS` (40), both exported so the tests name the rule instead of a literal.
  - The poll: a `setTimeout` effect re-armed after each response while any row is `processing`, with the count derived during render so the 40th answer is the last one; then A6 with an Actualizar button that queries once and leaves the automatic refresh off. Responses that fail count too, so a broken server cannot poll forever.
  - A document in `error` shows C4 verbatim and any other reason as A12; the screen never renders `extractedText`, `storageKey` or `ownerId`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/aprendizaje/documentos-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_DOCUMENTO_CON_ERROR, TEXTO_DOCUMENTO_SIGUE_PROCESANDO, TEXTO_SIN_DOCUMENTOS } from '@/lib/dominio/aprendizaje'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { C4_SIN_TEXTO_LEGIBLE } from './mensajes'
import { INTERVALO_DE_CONSULTA, LIMITE_DE_CONSULTAS } from './documentos-page'

const RUTA_DOCUMENTOS = `${config.iaApiUrl}/documents`

function filas() {
  return within(screen.getByRole('table', { name: 'Documentos de estudio' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

function contarConsultas() {
  let consultas = 0
  const contar = ({ request }: { request: Request }) => {
    if (request.method === 'GET' && request.url === RUTA_DOCUMENTOS) consultas += 1
  }
  server.events.on('request:start', contar)
  return {
    total: () => consultas,
    dejar: () => server.events.removeListener('request:start', contar),
  }
}

async function abrirDocumentos(usuarioDePrueba?: ReturnType<typeof relojFalso>['usuario']) {
  await iniciarComo('alumno.lopez')
  const vista = renderApp('/aprendizaje', usuarioDePrueba)
  await screen.findByRole('table', { name: 'Documentos de estudio' })
  return vista
}

describe('Documentos de estudio', () => {
  it('CA-DOC-01 muestra nombre, tipo, tamaño, estado, etiquetas y fecha, del más reciente al más antiguo', async () => {
    await abrirDocumentos()
    expect(filas()).toEqual([
      ['Reglamento de operaciones.pdf', 'PDF', '3.0 MB', 'Procesando', '—', '19/09/2026'],
      ['Apuntes de aerodinámica.txt', 'TXT', '12.0 KB', 'Procesando', '—', '19/09/2026'],
      [
        'Manual de vuelo escaneado.pdf',
        'PDF',
        '5.0 MB',
        `Error${C4_SIN_TEXTO_LEGIBLE}`,
        '—',
        '18/09/2026',
      ],
      ['Procedimientos de emergencia.docx', 'DOCX', '180.0 KB', 'Listo', 'emergencias, autorrotación', '18/09/2026'],
      ['PDI EA-510 Título III.pdf', 'PDF', '2.3 MB', 'Listo', 'instrucción, maniobras', '18/09/2026'],
    ])
  })

  it('CA-DOC-01 sin documentos muestra A14', async () => {
    server.use(http.get(RUTA_DOCUMENTOS, () => HttpResponse.json([])))
    await iniciarComo('alumno.lopez')
    renderApp('/aprendizaje')
    expect(await screen.findByText(TEXTO_SIN_DOCUMENTOS)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Documentos de estudio' })).not.toBeInTheDocument()
  })

  it('CA-DOC-05 un documento en Error muestra C4 y reemplaza cualquier otro motivo', async () => {
    server.use(
      http.get(RUTA_DOCUMENTOS, () =>
        HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-000000000003',
            filename: 'Manual de vuelo escaneado.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 5_242_880,
            status: 'error',
            errorMessage: 'pdf-parse: bad XRef entry at offset 91234',
            tags: [],
            createdAt: '2026-09-18T18:45:00.000Z',
            processedAt: null,
          },
        ]),
      ),
    )
    await abrirDocumentos()
    expect(screen.getByText(TEXTO_DOCUMENTO_CON_ERROR)).toBeInTheDocument()
    expect(screen.queryByText(/pdf-parse/)).not.toBeInTheDocument()
  })

  it('CA-DOC-08 la pantalla nunca muestra el texto extraído ni la ruta de almacenamiento', async () => {
    server.use(
      http.get(RUTA_DOCUMENTOS, () =>
        HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-000000000001',
            filename: 'PDI EA-510 Título III.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2_411_008,
            status: 'ready',
            errorMessage: null,
            tags: ['instrucción'],
            createdAt: '2026-09-18T14:02:11.000Z',
            processedAt: '2026-09-18T14:02:58.000Z',
            extractedText: 'TITULO III DE LA INSTRUCCION EN VUELO',
            storageKey: 'documentos/564984ee/pdi-titulo-iii.pdf',
            ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
          },
        ]),
      ),
    )
    await abrirDocumentos()
    expect(screen.queryByText(/TITULO III DE LA INSTRUCCION/)).not.toBeInTheDocument()
    expect(screen.queryByText(/documentos\/564984ee/)).not.toBeInTheDocument()
    expect(screen.queryByText(/564984ee-448a/)).not.toBeInTheDocument()
  })

  it('CA-DOC-04 la lista se actualiza sola cada 3 segundos hasta que el documento queda Listo', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirDocumentos(usuario)
    expect(filas()[1]?.[3]).toBe('Procesando')
    await avanzar(INTERVALO_DE_CONSULTA)
    await avanzar(INTERVALO_DE_CONSULTA)
    await waitFor(() => expect(filas()[1]?.[3]).toBe('Listo'))
    expect(filas()[1]).toEqual(['Apuntes de aerodinámica.txt', 'TXT', '12.0 KB', 'Listo', 'aerodinámica', '19/09/2026'])
  })

  it('CA-DOC-04 sin filas en proceso no vuelve a consultar', async () => {
    server.use(
      http.get(RUTA_DOCUMENTOS, () =>
        HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-000000000001',
            filename: 'PDI EA-510 Título III.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2_411_008,
            status: 'ready',
            errorMessage: null,
            tags: [],
            createdAt: '2026-09-18T14:02:11.000Z',
            processedAt: '2026-09-18T14:02:58.000Z',
          },
        ]),
      ),
    )
    const consultas = contarConsultas()
    try {
      const { usuario, avanzar } = relojFalso()
      await abrirDocumentos(usuario)
      expect(consultas.total()).toBe(1)
      await avanzar(INTERVALO_DE_CONSULTA * 5)
      expect(consultas.total()).toBe(1)
    } finally {
      consultas.dejar()
    }
  })

  it('CA-DOC-06 tras 40 consultas seguidas se detiene y ofrece Actualizar', async () => {
    const consultas = contarConsultas()
    try {
      const { usuario, avanzar } = relojFalso()
      await abrirDocumentos(usuario)
      for (let vuelta = 1; vuelta < LIMITE_DE_CONSULTAS + 3; vuelta += 1) await avanzar(INTERVALO_DE_CONSULTA)
      expect(await screen.findByText(TEXTO_DOCUMENTO_SIGUE_PROCESANDO)).toBeInTheDocument()
      expect(consultas.total()).toBe(LIMITE_DE_CONSULTAS)
      await usuario.click(screen.getByRole('button', { name: 'Actualizar' }))
      await waitFor(() => expect(consultas.total()).toBe(LIMITE_DE_CONSULTAS + 1))
      await avanzar(INTERVALO_DE_CONSULTA * 5)
      expect(consultas.total()).toBe(LIMITE_DE_CONSULTAS + 1)
      expect(screen.getByText(TEXTO_DOCUMENTO_SIGUE_PROCESANDO)).toBeInTheDocument()
    } finally {
      consultas.dejar()
    }
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/documentos-page.test.tsx
```

Expected: FAIL — `Unable to find role="table" and name "Documentos de estudio"`, and the import of `INTERVALO_DE_CONSULTA` does not resolve.

- [ ] **Step 3: Write the list with its periodic query (M3-7)**

Replace `src/features/aprendizaje/documentos-page.tsx` with:

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PANTALLAS } from '@/lib/auth/pantallas'
import {
  etiquetaDeTipo,
  formatearTamano,
  TEXTO_DOCUMENTO_SIGUE_PROCESANDO,
  TEXTO_SIN_DOCUMENTOS,
} from '@/lib/dominio/aprendizaje'
import { formatearFecha } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesAprendizaje, consultasAprendizaje, type Documento } from './api'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
import { motivoDelDocumento } from './mensajes'

export const INTERVALO_DE_CONSULTA = 3000

export const LIMITE_DE_CONSULTAS = 40

function procesa(documentos: readonly Documento[]): boolean {
  return documentos.some((documento) => documento.status === 'processing')
}

export function DocumentosPage() {
  const queryClient = useQueryClient()
  const [marca, setMarca] = useState(0)
  const [consultas, setConsultas] = useState(0)
  const documentos = useQuery(consultasAprendizaje.documentos())
  const filas = documentos.data ?? []
  const procesando = procesa(filas)
  const respuesta = Math.max(documentos.dataUpdatedAt, documentos.errorUpdatedAt)
  if (respuesta !== marca) {
    setMarca(respuesta)
    setConsultas(procesando ? consultas + 1 : 0)
  }
  const rendido = consultas >= LIMITE_DE_CONSULTAS
  const error = errorDePrimeraCarga(documentos)

  useEffect(() => {
    if (!procesando || rendido) return
    const reloj = setTimeout(() => {
      void queryClient.refetchQueries({ queryKey: clavesAprendizaje.documentos() })
    }, INTERVALO_DE_CONSULTA)
    return () => clearTimeout(reloj)
  }, [marca, procesando, queryClient, rendido])

  return (
    <>
      <PageHeader titulo={PANTALLAS.documentos.titulo} descripcion={PANTALLAS.documentos.descripcion} />
      <AvisoDocumentosCompartidos />
      {rendido && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{TEXTO_DOCUMENTO_SIGUE_PROCESANDO}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void documentos.refetch()}>
              <RefreshCw aria-hidden />
              Actualizar
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {error !== null ? (
        <AvisoDeError
          titulo="No se pudieron cargar los documentos"
          error={error}
          alReintentar={() => void documentos.refetch()}
        />
      ) : documentos.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : filas.length === 0 ? (
        <EmptyState titulo="Todavía no hay documentos" descripcion={TEXTO_SIN_DOCUMENTOS} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table aria-label="Documentos de estudio">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Etiquetas</TableHead>
                <TableHead>Subido el</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((documento) => (
                <TableRow key={documento.id}>
                  <TableCell>{documento.filename}</TableCell>
                  <TableCell>{etiquetaDeTipo(documento.mimeType)}</TableCell>
                  <TableCell className="tabular-nums">{formatearTamano(documento.sizeBytes)}</TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <StatusBadge vocabulario="documento" valor={documento.status} className="w-fit" />
                      {documento.status === 'error' && (
                        <span className="text-xs text-muted-foreground">
                          {motivoDelDocumento(documento.errorMessage)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{documento.tags.length === 0 ? '—' : documento.tags.join(', ')}</TableCell>
                  <TableCell className="tabular-nums">{formatearFecha(documento.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/documentos-page.test.tsx
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 543 tests.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: list the study documents"
```

---

### Task 9: Documentos: upload with its browser-side checks, delete, and the dependency-39 gate (M3-1, M3-6) (CA-DOC-01, CA-DOC-02, CA-DOC-03, CA-DOC-04, CA-DOC-05, CA-DOC-07, CA-DOC-09, CA-DOC-10)

**Files:**

- Modify: `src/lib/dominio/aprendizaje.ts`
- Create: `src/features/aprendizaje/components/dialogo-subir-documento.tsx`
- Create: `src/features/aprendizaje/components/eliminar-documento.tsx`
- Modify: `src/features/aprendizaje/documentos-page.tsx`
- Test: `src/features/aprendizaje/documentos-page.test.tsx`

**Interfaces:**
- Consumes: `subirDocumento`, `eliminarDocumento`, `archivoAceptado`, `mensajeDeError`, `accionDisponible`, `ConfirmDialog`, the shadcn `dialog`.
- Produces:
  - `DialogoSubirDocumento`: a one-field dialog; `archivoAceptado` refuses anything that is not `.pdf`, `.docx` or `.txt` or that passes 25 MB with A11 and **sends nothing**; a server rejection shows C1 or C2 (anything else becomes `MENSAJE_GENERICO`) and keeps the selection; on success a frontend-owned toast and an invalidation of the documents key. Without dependency 39 it is a disabled button with T11.
  - `EliminarDocumento`: the shared `ConfirmDialog` with A13, a frontend-owned toast, invalidation of the whole `aprendizaje` key, and the same T11 gate.
  - The list gains the header action, the same action inside its empty state, and one actions column.

- [ ] **Step 1: Write the failing tests**

In `src/features/aprendizaje/documentos-page.test.tsx`, replace:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_DOCUMENTO_CON_ERROR, TEXTO_DOCUMENTO_SIGUE_PROCESANDO, TEXTO_SIN_DOCUMENTOS } from '@/lib/dominio/aprendizaje'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { C4_SIN_TEXTO_LEGIBLE } from './mensajes'
import { INTERVALO_DE_CONSULTA, LIMITE_DE_CONSULTAS } from './documentos-page'

```

with:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_GENERICO, MENSAJE_SIN_CONEXION } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import {
  MENSAJE_DOCUMENTO_ELIMINADO,
  MENSAJE_DOCUMENTO_SUBIDO,
  TEXTO_ARCHIVO_RECHAZADO,
  TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO,
  TEXTO_DOCUMENTO_CON_ERROR,
  TEXTO_DOCUMENTO_SIGUE_PROCESANDO,
  TEXTO_DOCUMENTOS_COMPARTIDOS,
  TEXTO_SIN_DOCUMENTOS,
} from '@/lib/dominio/aprendizaje'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { C1_SIN_ARCHIVO, C4_SIN_TEXTO_LEGIBLE } from './mensajes'
import { INTERVALO_DE_CONSULTA, LIMITE_DE_CONSULTAS } from './documentos-page'

```

In `src/features/aprendizaje/documentos-page.test.tsx`, replace:

```tsx
async function abrirDocumentos(usuarioDePrueba?: ReturnType<typeof relojFalso>['usuario']) {
```

with:

```tsx
async function abrirDocumentos(usuarioDePrueba?: ReturnType<typeof userEvent.setup>) {
```

In `src/features/aprendizaje/documentos-page.test.tsx`, replace:

```tsx
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
```

with:

```tsx
    .map((fila) => within(fila).getAllByRole('cell').slice(0, 6).map((celda) => celda.textContent))
```

In `src/features/aprendizaje/documentos-page.test.tsx`, append:

```tsx

describe('Subir y eliminar documentos', () => {
  function archivo(nombre = 'Apuntes nuevos.txt', tipo = 'text/plain', bytes = 32) {
    return new File([new Uint8Array(bytes)], nombre, { type: tipo })
  }

  async function abrirDialogo(usuario: ReturnType<typeof renderApp>['usuario']) {
    await usuario.click(screen.getAllByRole('button', { name: 'Subir documento' })[0]!)
    return within(await screen.findByRole('dialog'))
  }

  it('CA-DOC-01 el estado vacío ofrece Subir documento', async () => {
    server.use(http.get(RUTA_DOCUMENTOS, () => HttpResponse.json([])))
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp('/aprendizaje')
    expect(await screen.findByText(TEXTO_SIN_DOCUMENTOS)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Subir documento' })).toHaveLength(2)
    const dialogo = await abrirDialogo(usuario)
    expect(dialogo.getByLabelText('Archivo')).toBeInTheDocument()
  })

  it('CA-DOC-02 y CA-DOC-04 un TXT válido se sube y aparece como Procesando', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirDocumentos(usuario)
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await screen.findByText(MENSAJE_DOCUMENTO_SUBIDO)).toBeInTheDocument()
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Apuntes nuevos.txt'))
    expect(filas()[0]?.[3]).toBe('Procesando')
    await avanzar(INTERVALO_DE_CONSULTA)
    await avanzar(INTERVALO_DE_CONSULTA)
    await waitFor(() => expect(filas()[0]?.[3]).toBe('Listo'))
  })

  it('CA-DOC-02 un archivo de otro tipo se rechaza en el navegador con A11 y no se envía', async () => {
    let subidas = 0
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () => {
        subidas += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { usuario } = await abrirDocumentos(userEvent.setup({ applyAccept: false }))
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo('foto.png', 'image/png'))
    expect(await dialogo.findAllByText(TEXTO_ARCHIVO_RECHAZADO)).toHaveLength(2)
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(subidas).toBe(0)
    expect(dialogo.getByText('foto.png')).toBeInTheDocument()
  })

  it('CA-DOC-02 un archivo de más de 25 MB se rechaza en el navegador y no se envía', async () => {
    let subidas = 0
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () => {
        subidas += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo('Manual.pdf', 'application/pdf', 26 * 1024 * 1024))
    expect(await dialogo.findAllByText(TEXTO_ARCHIVO_RECHAZADO)).toHaveLength(2)
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(subidas).toBe(0)
  })

  it('CA-DOC-03 el mensaje del servidor se muestra y la selección se conserva', async () => {
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () =>
        HttpResponse.json({ statusCode: 400, message: C1_SIN_ARCHIVO, error: 'Bad Request' }, { status: 400 }),
      ),
    )
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await dialogo.findByText(C1_SIN_ARCHIVO)).toBeInTheDocument()
    expect(dialogo.getByText('Apuntes nuevos.txt')).toBeInTheDocument()
  })

  it('CA-DOC-09 una caída de red informa la falta de conexión y conserva el archivo', async () => {
    server.use(http.post(`${RUTA_DOCUMENTOS}/upload`, () => HttpResponse.error()))
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await dialogo.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(dialogo.getByText('Apuntes nuevos.txt')).toBeInTheDocument()
  })

  it('CA-DOC-05 un mensaje del servidor que no está en el contrato se reemplaza al subir', async () => {
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () =>
        HttpResponse.json(
          { statusCode: 400, message: ['file must be a valid MIME type'], error: 'Bad Request' },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await dialogo.findByText(MENSAJE_GENERICO)).toBeInTheDocument()
    expect(dialogo.queryByText(/must be a valid MIME type/)).not.toBeInTheDocument()
  })

  it('CA-DOC-07 eliminar pide confirmación con A13 y quita el documento de la lista', async () => {
    const { usuario } = await abrirDocumentos()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar PDI EA-510 Título III.pdf' }))
    const confirmacion = within(await screen.findByRole('alertdialog'))
    expect(confirmacion.getByText(TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO)).toBeInTheDocument()
    await usuario.click(confirmacion.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText(MENSAJE_DOCUMENTO_ELIMINADO)).toBeInTheDocument()
    await waitFor(() => expect(filas().some((fila) => fila[0] === 'PDI EA-510 Título III.pdf')).toBe(false))
  })

  it('CA-DOC-10 fuera del modo mock y sin la dependencia 39 subir y eliminar están deshabilitados', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirDocumentos()
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar PDI EA-510 Título III.pdf' })).toBeDisabled()
    expect(screen.getAllByText(MENSAJE_DEPENDENCIA_PENDIENTE).length).toBeGreaterThan(1)
  })

  it('CA-DOC-10 en modo mock subir y eliminar están disponibles y A1 no aparece', async () => {
    await abrirDocumentos()
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Eliminar PDI EA-510 Título III.pdf' })).toBeEnabled()
    expect(screen.queryByText(MENSAJE_DEPENDENCIA_PENDIENTE)).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/documentos-page.test.tsx
```

Expected: FAIL — `Unable to find role="button" and name "Subir documento"`.

- [ ] **Step 3: Add the two frontend-owned toasts**

In `src/lib/dominio/aprendizaje.ts`, replace:

```ts
export const TIPOS_ACEPTADOS = [
```

with:

```ts
export const MENSAJE_DOCUMENTO_SUBIDO = 'Documento subido. Aparecerá como Procesando hasta que termine.'

export const MENSAJE_DOCUMENTO_ELIMINADO = 'Documento eliminado.'

export const TIPOS_ACEPTADOS = [
```

- [ ] **Step 4: Write the upload dialog (M3-1, M3-6)**

Create `src/features/aprendizaje/components/dialogo-subir-documento.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import {
  archivoAceptado,
  MENSAJE_DOCUMENTO_SUBIDO,
  TEXTO_ARCHIVO_RECHAZADO,
  TIPOS_ACEPTADOS,
} from '@/lib/dominio/aprendizaje'
import { clavesAprendizaje, subirDocumento } from '../api'
import { mensajeDeError } from '../mensajes'

const ACEPTADOS = TIPOS_ACEPTADOS.map((tipo) => tipo.extension).join(',')

export function DialogoSubirDocumento({ etiqueta }: { etiqueta: string }) {
  const [abierto, setAbierto] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [rechazado, setRechazado] = useState(false)
  const queryClient = useQueryClient()
  const disponible = accionDisponible('subirDocumento')

  const subir = useMutation({
    mutationFn: subirDocumento,
    onSuccess: async () => {
      setAbierto(false)
      setArchivo(null)
      toast.success(MENSAJE_DOCUMENTO_SUBIDO)
      await queryClient.invalidateQueries({ queryKey: clavesAprendizaje.documentos() })
    },
  })

  if (!disponible) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button disabled>
          <Upload aria-hidden />
          {etiqueta}
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }

  function alElegir(elegido: File | null) {
    setArchivo(elegido)
    setRechazado(elegido !== null && !archivoAceptado(elegido))
    subir.reset()
  }

  function alEnviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (archivo === null || !archivoAceptado(archivo)) {
      setRechazado(archivo !== null)
      return
    }
    subir.mutate(archivo)
  }

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente)
    if (!siguiente) {
      setArchivo(null)
      setRechazado(false)
      subir.reset()
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={alAbrir}>
      <DialogTrigger asChild>
        <Button>
          <Upload aria-hidden />
          {etiqueta}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>{TEXTO_ARCHIVO_RECHAZADO}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={alEnviar}>
          {rechazado && (
            <Alert variant="destructive">
              <AlertDescription>{TEXTO_ARCHIVO_RECHAZADO}</AlertDescription>
            </Alert>
          )}
          {subir.error && (
            <Alert variant="destructive">
              <AlertDescription>{mensajeDeError(subir.error, MENSAJE_GENERICO)}</AlertDescription>
            </Alert>
          )}
          <Field className="mt-4">
            <FieldLabel htmlFor="documento-archivo">Archivo</FieldLabel>
            <Input
              id="documento-archivo"
              type="file"
              accept={ACEPTADOS}
              onChange={(evento) => alElegir(evento.target.files?.[0] ?? null)}
            />
            {archivo && <p className="text-sm text-muted-foreground">{archivo.name}</p>}
          </Field>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => alAbrir(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={archivo === null || subir.isPending}>
              {subir.isPending ? 'Subiendo…' : 'Subir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Write the delete action (M3-1)**

Create `src/features/aprendizaje/components/eliminar-documento.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { MENSAJE_DOCUMENTO_ELIMINADO, TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO } from '@/lib/dominio/aprendizaje'
import { clavesAprendizaje, eliminarDocumento, type Documento } from '../api'
import { mensajeDeError } from '../mensajes'

export function EliminarDocumento({ documento }: { documento: Documento }) {
  const queryClient = useQueryClient()
  const disponible = accionDisponible('eliminarDocumento')

  const eliminar = useMutation({
    mutationFn: () => eliminarDocumento(documento.id),
    onSuccess: async () => {
      toast.success(MENSAJE_DOCUMENTO_ELIMINADO)
      await queryClient.invalidateQueries({ queryKey: clavesAprendizaje.todo })
    },
    onError: (error) => toast.error(mensajeDeError(error, MENSAJE_GENERICO)),
  })

  if (!disponible) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="destructive" size="sm" disabled>
          <Trash2 aria-hidden />
          Eliminar {documento.filename}
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }

  return (
    <ConfirmDialog
      disparador={
        <Button variant="destructive" size="sm" disabled={eliminar.isPending}>
          <Trash2 aria-hidden />
          Eliminar {documento.filename}
        </Button>
      }
      titulo="¿Eliminar el documento?"
      descripcion={TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO}
      confirmar="Eliminar"
      destructivo
      alConfirmar={() => eliminar.mutate()}
    />
  )
}
```

- [ ] **Step 6: Wire both into the list**

In `src/features/aprendizaje/documentos-page.tsx`, replace:

```tsx
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
```

with:

```tsx
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
import { DialogoSubirDocumento } from './components/dialogo-subir-documento'
import { EliminarDocumento } from './components/eliminar-documento'
```

In `src/features/aprendizaje/documentos-page.tsx`, replace:

```tsx
      <PageHeader titulo={PANTALLAS.documentos.titulo} descripcion={PANTALLAS.documentos.descripcion} />
```

with:

```tsx
      <PageHeader
        titulo={PANTALLAS.documentos.titulo}
        descripcion={PANTALLAS.documentos.descripcion}
        acciones={<DialogoSubirDocumento etiqueta="Subir documento" />}
      />
```

In `src/features/aprendizaje/documentos-page.tsx`, replace:

```tsx
        <EmptyState titulo="Todavía no hay documentos" descripcion={TEXTO_SIN_DOCUMENTOS} />
```

with:

```tsx
        <EmptyState
          titulo="Todavía no hay documentos"
          descripcion={TEXTO_SIN_DOCUMENTOS}
          accion={<DialogoSubirDocumento etiqueta="Subir documento" />}
        />
```

In `src/features/aprendizaje/documentos-page.tsx`, replace:

```tsx
                <TableHead>Subido el</TableHead>
              </TableRow>
```

with:

```tsx
                <TableHead>Subido el</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
```

In `src/features/aprendizaje/documentos-page.tsx`, replace:

```tsx
                  <TableCell className="tabular-nums">{formatearFecha(documento.createdAt)}</TableCell>
                </TableRow>
```

with:

```tsx
                  <TableCell className="tabular-nums">{formatearFecha(documento.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <EliminarDocumento documento={documento} />
                    </div>
                  </TableCell>
                </TableRow>
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/documentos-page.test.tsx
```

Expected: PASS, 17 tests.

- [ ] **Step 8: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 553 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: upload and delete study documents"
```

---

### Task 10: Cuestionario: the generation form, its 120 s deadline and the quiz in the URL (M3-3, M3-4, M3-14) (CA-CUE-01..CA-CUE-06, CA-CUE-11, CA-CUE-12)

**Files:**

- Create: `src/features/aprendizaje/use-documentos-listos.ts`
- Create: `src/features/aprendizaje/components/formulario-generacion.tsx`
- Create: `src/features/aprendizaje/components/resolucion-de-cuestionario.tsx`
- Modify (full rewrite): `src/features/aprendizaje/cuestionario-page.tsx`
- Test: `src/features/aprendizaje/cuestionario-page.test.tsx`

**Interfaces:**
- Consumes: `generarCuestionario`, `consultasAprendizaje.cuestionario`, `conLimiteDeTiempo`, `CanceladoError`, `esquemaGeneracion`, `mensajeDeError`, the shadcn `checkbox`, `relojFalso`.
- Produces:
  - `useDocumentosListos()`: the documents query with a `select` that keeps only `ready` rows, shared by this screen and Consultas.
  - `FormularioGeneracion`: the document picker (only `ready` rows, A15 with a link to Documentos when there are none), the question types, the count, and the three zod rules of CA-CUE-01 under their fields. While generating, everything is disabled and A3 is shown; a rejection shows C5 or C6 verbatim and anything else A5; `CanceladoError` after 120 s shows A4 and the submit button reads Reintentar. `LIMITE_DE_GENERACION` is exported for the test.
  - `CuestionarioPage`: no `?cuestionario` means the form; with one it fetches the quiz, shows A2 unless this session generated it, and offers Nueva consulta — Nuevo cuestionario — in the header; a fetch failure shows the allow-listed message (C8) with a Volver al formulario button.

- [ ] **Step 1: Write the failing tests**

Create `src/features/aprendizaje/cuestionario-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import {
  TEXTO_CUESTIONARIO_REINICIADO,
  TEXTO_GENERACION_DEMORADA,
  TEXTO_GENERACION_RECHAZADA,
  TEXTO_GENERANDO_CUESTIONARIO,
  TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO,
} from '@/lib/dominio/aprendizaje'
import { ID_CUESTIONARIO } from '@/mocks/ia/cuestionarios'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { LIMITE_DE_GENERACION } from './components/formulario-generacion'
import { C5_DOCUMENTOS_AJENOS, C8_CUESTIONARIO_NO_ENCONTRADO } from './mensajes'

const RUTA_DOCUMENTOS = `${config.iaApiUrl}/documents`
const RUTA_GENERAR = `${config.iaApiUrl}/quizzes/generate`

const PRINCIPAL = 'PDI EA-510 Título III.pdf'

async function abrirFormulario(usuario?: ReturnType<typeof relojFalso>['usuario']) {
  await iniciarComo('alumno.lopez')
  const vista = renderApp('/aprendizaje/cuestionario', usuario)
  await screen.findByRole('group', { name: 'Documentos del cuestionario' })
  return vista
}

async function elegirYGenerar(usuario: ReturnType<typeof relojFalso>['usuario'], cantidad: string) {
  await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
  await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
  await usuario.type(screen.getByLabelText('Cantidad de preguntas'), cantidad)
  await usuario.click(screen.getByRole('button', { name: 'Generar cuestionario' }))
}

describe('Generar el cuestionario de práctica', () => {
  it('CA-CUE-02 solo ofrece los documentos en estado Listo', async () => {
    await abrirFormulario()
    const grupo = within(screen.getByRole('group', { name: 'Documentos del cuestionario' }))
    expect(grupo.getAllByRole('checkbox').map((casilla) => casilla.getAttribute('id'))).toHaveLength(2)
    expect(grupo.getByRole('checkbox', { name: PRINCIPAL })).toBeInTheDocument()
    expect(grupo.getByRole('checkbox', { name: 'Procedimientos de emergencia.docx' })).toBeInTheDocument()
    expect(grupo.queryByRole('checkbox', { name: 'Reglamento de operaciones.pdf' })).not.toBeInTheDocument()
    expect(grupo.queryByRole('checkbox', { name: 'Manual de vuelo escaneado.pdf' })).not.toBeInTheDocument()
  })

  it('CA-CUE-02 sin documentos listos muestra A15 con un enlace a Documentos', async () => {
    server.use(http.get(RUTA_DOCUMENTOS, () => HttpResponse.json([])))
    await iniciarComo('alumno.lopez')
    renderApp('/aprendizaje/cuestionario')
    expect(await screen.findByText(TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Documentos' })).toHaveAttribute('href', '/aprendizaje')
  })

  it('CA-CUE-01 exige un documento, un tipo de pregunta y una cantidad de 2 a 20', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.click(screen.getByRole('checkbox', { name: 'Opción múltiple' }))
    await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
    await usuario.type(screen.getByLabelText('Cantidad de preguntas'), '25')
    await usuario.click(screen.getByRole('button', { name: 'Generar cuestionario' }))
    expect(await screen.findByText('Elija al menos un documento.')).toBeInTheDocument()
    expect(screen.getByText('Elija al menos un tipo de pregunta.')).toBeInTheDocument()
    expect(screen.getByText('La cantidad debe ser un número entero entre 2 y 20.')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_GENERANDO_CUESTIONARIO)).not.toBeInTheDocument()
  })

  it('CA-CUE-03 al generar deshabilita el formulario, muestra A3 y no envía dos veces', async () => {
    let generaciones = 0
    const contar = ({ request }: { request: Request }) => {
      if (request.method === 'POST' && request.url === RUTA_GENERAR) generaciones += 1
    }
    server.events.on('request:start', contar)
    try {
      const { usuario, avanzar } = relojFalso()
      await abrirFormulario(usuario)
      await elegirYGenerar(usuario, '20')
      expect(await screen.findByText(TEXTO_GENERANDO_CUESTIONARIO)).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: PRINCIPAL })).toBeDisabled()
      expect(screen.getByLabelText('Cantidad de preguntas')).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled()
      await avanzar(3000)
      await waitFor(() => expect(screen.getByText('3 preguntas')).toBeInTheDocument())
      expect(generaciones).toBe(1)
    } finally {
      server.events.removeListener('request:start', contar)
    }
  })

  it('CA-CUE-04 un documento ajeno muestra C5 y el formulario queda listo para reintentar', async () => {
    server.use(
      http.post(RUTA_GENERAR, () =>
        HttpResponse.json({ statusCode: 404, message: C5_DOCUMENTOS_AJENOS, error: 'Not Found' }, { status: 404 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await elegirYGenerar(usuario, '5')
    expect(await screen.findByText(C5_DOCUMENTOS_AJENOS)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: PRINCIPAL })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Generar cuestionario' })).toBeEnabled()
  })

  it('CA-CUE-04 un documento que no está listo muestra C6 con sus nombres', async () => {
    server.use(
      http.post(RUTA_GENERAR, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Los siguientes documentos aún no están listos: Reglamento de operaciones.pdf',
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirFormulario()
    await elegirYGenerar(usuario, '5')
    expect(
      await screen.findByText('Los siguientes documentos aún no están listos: Reglamento de operaciones.pdf'),
    ).toBeInTheDocument()
  })

  it('CA-CUE-05 una generación rechazada muestra A5 sin el detalle técnico', async () => {
    const { usuario } = await abrirFormulario()
    await elegirYGenerar(usuario, '7')
    expect(await screen.findByText(TEXTO_GENERACION_RECHAZADA)).toBeInTheDocument()
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument()
    expect(screen.queryByText(/tras 3 intentos/)).not.toBeInTheDocument()
  })

  it('CA-CUE-06 a los 120 segundos sin respuesta se cancela y ofrece Reintentar', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirFormulario(usuario)
    await elegirYGenerar(usuario, '13')
    expect(await screen.findByText(TEXTO_GENERANDO_CUESTIONARIO)).toBeInTheDocument()
    await avanzar(LIMITE_DE_GENERACION - 1000)
    expect(screen.queryByText(TEXTO_GENERACION_DEMORADA)).not.toBeInTheDocument()
    await avanzar(1000)
    expect(await screen.findByText(TEXTO_GENERACION_DEMORADA)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  })

  it('CA-CUE-11 el cuestionario queda en la URL y al recargar se abre con A2', async () => {
    const { usuario, avanzar } = relojFalso()
    const { router } = await abrirFormulario(usuario)
    await elegirYGenerar(usuario, '20')
    await avanzar(3000)
    await waitFor(() => expect(screen.getByText('3 preguntas')).toBeInTheDocument())
    expect(router.state.location.search).toEqual({ cuestionario: ID_CUESTIONARIO })
    expect(screen.queryByText(TEXTO_CUESTIONARIO_REINICIADO)).not.toBeInTheDocument()

    await iniciarComo('alumno.lopez')
    renderApp(`/aprendizaje/cuestionario?cuestionario=${ID_CUESTIONARIO}`)
    expect(await screen.findByText(TEXTO_CUESTIONARIO_REINICIADO)).toBeInTheDocument()
  })

  it('CA-CUE-12 un cuestionario inexistente muestra C8 con la acción de volver al formulario', async () => {
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp('/aprendizaje/cuestionario?cuestionario=c0e50000-0000-4000-8000-00000000aaaa')
    expect(await screen.findByText(C8_CUESTIONARIO_NO_ENCONTRADO)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Volver al formulario' }))
    expect(await screen.findByRole('group', { name: 'Documentos del cuestionario' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/cuestionario-page.test.tsx
```

Expected: FAIL — `Unable to find role="group" and name "Documentos del cuestionario"`, and the import of `LIMITE_DE_GENERACION` does not resolve.

- [ ] **Step 3: Add the hook for the documents that are ready (M3-14)**

Create `src/features/aprendizaje/use-documentos-listos.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { consultasAprendizaje } from './api'

export function useDocumentosListos() {
  return useQuery({
    ...consultasAprendizaje.documentos(),
    select: (documentos) => documentos.filter((documento) => documento.status === 'ready'),
  })
}
```

- [ ] **Step 4: Write the generation form (M3-4, M3-14)**

Create `src/features/aprendizaje/components/formulario-generacion.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
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
import { Skeleton } from '@/components/ui/skeleton'
import { CanceladoError } from '@/lib/api/errors'
import { conLimiteDeTiempo } from '@/lib/api/http'
import {
  TEXTO_GENERACION_DEMORADA,
  TEXTO_GENERACION_RECHAZADA,
  TEXTO_GENERANDO_CUESTIONARIO,
  TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO,
} from '@/lib/dominio/aprendizaje'
import { errorDePrimeraCarga } from '@/lib/query'
import { generarCuestionario, type Cuestionario, type TipoPregunta } from '../api'
import { mensajeDeError } from '../mensajes'
import { esquemaGeneracion, GENERACION_VACIA, TIPOS_PREGUNTA, type ValoresGeneracion } from '../schemas'
import { useDocumentosListos } from '../use-documentos-listos'

export const LIMITE_DE_GENERACION = 120_000

export function FormularioGeneracion({ alGenerar }: { alGenerar: (cuestionario: Cuestionario) => void }) {
  const documentos = useDocumentosListos()
  const error = errorDePrimeraCarga(documentos)
  const formulario = useForm<ValoresGeneracion>({
    resolver: zodResolver(esquemaGeneracion),
    defaultValues: GENERACION_VACIA,
  })
  const { errors } = formulario.formState

  const generar = useMutation({
    mutationFn: (valores: ValoresGeneracion) =>
      conLimiteDeTiempo(LIMITE_DE_GENERACION, (senal) =>
        generarCuestionario(
          {
            documentIds: valores.documentos,
            questionTypes: valores.tipos as TipoPregunta[],
            questionCount: Number(valores.cantidad),
          },
          senal,
        ),
      ),
    onSuccess: alGenerar,
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

  if (documentos.data === undefined) return <Skeleton className="h-40 w-full" aria-busy="true" />

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
    <form
      noValidate
      onSubmit={formulario.handleSubmit((valores) => generar.mutate(valores))}
      className="grid gap-6"
    >
      {generar.isPending && (
        <Alert>
          <AlertDescription>{TEXTO_GENERANDO_CUESTIONARIO}</AlertDescription>
        </Alert>
      )}
      {generar.error && !generar.isPending && (
        <Alert variant="destructive">
          <AlertDescription>
            {demorada ? TEXTO_GENERACION_DEMORADA : mensajeDeError(generar.error, TEXTO_GENERACION_RECHAZADA)}
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
                      id={`cuestionario-documento-${documento.id}`}
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
                    <Label htmlFor={`cuestionario-documento-${documento.id}`} className="font-normal">
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
            <h2>Preguntas</h2>
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
                    {TIPOS_PREGUNTA.map((tipo) => (
                      <div key={tipo.valor} className="flex items-center gap-2">
                        <Checkbox
                          id={`cuestionario-tipo-${tipo.valor}`}
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
                        <Label htmlFor={`cuestionario-tipo-${tipo.valor}`} className="font-normal">
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
              <FieldLabel htmlFor="cuestionario-cantidad">Cantidad de preguntas</FieldLabel>
              <Input
                id="cuestionario-cantidad"
                inputMode="numeric"
                disabled={generar.isPending}
                aria-invalid={Boolean(errors.cantidad)}
                {...formulario.register('cantidad')}
              />
              <FieldDescription>De 2 a 20 preguntas.</FieldDescription>
              <FieldError errors={[errors.cantidad]} />
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
              {demorada ? 'Reintentar' : 'Generar cuestionario'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Write the placeholder for the quiz itself**

Create `src/features/aprendizaje/components/resolucion-de-cuestionario.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Cuestionario } from '../api'

export function ResolucionDeCuestionario({ cuestionario }: { cuestionario: Cuestionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Cuestionario de práctica</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{cuestionario.preguntas.length} preguntas</p>
      </CardContent>
    </Card>
  )
}
```

Task 11 replaces this file with the questions, the grading and the results; the page below does not change again.

- [ ] **Step 6: Write the page with its two states (M3-3)**

Replace `src/features/aprendizaje/cuestionario-page.tsx` with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { TEXTO_CUESTIONARIO_REINICIADO } from '@/lib/dominio/aprendizaje'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasAprendizaje, type Cuestionario } from './api'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
import { FormularioGeneracion } from './components/formulario-generacion'
import { ResolucionDeCuestionario } from './components/resolucion-de-cuestionario'
import { mensajeDeError } from './mensajes'

const ruta = getRouteApi('/_app/aprendizaje/cuestionario')

export function CuestionarioPage() {
  const { cuestionario: id } = ruta.useSearch()
  const navegar = useNavigate()
  const [generadoAqui, setGeneradoAqui] = useState<string | null>(null)
  const cuestionario = useQuery({ ...consultasAprendizaje.cuestionario(id ?? ''), enabled: id !== undefined })
  const error = id === undefined ? null : errorDePrimeraCarga(cuestionario)
  const restaurado = id !== undefined && id !== generadoAqui

  async function alGenerar(generado: Cuestionario) {
    setGeneradoAqui(generado.id)
    await navegar({ to: '/aprendizaje/cuestionario', search: { cuestionario: generado.id } })
  }

  async function alVolver() {
    setGeneradoAqui(null)
    await navegar({ to: '/aprendizaje/cuestionario', search: {} })
  }

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.cuestionario.titulo}
        descripcion={PANTALLAS.cuestionario.descripcion}
        acciones={
          id !== undefined && (
            <Button variant="outline" onClick={() => void alVolver()}>
              Nuevo cuestionario
            </Button>
          )
        }
      />
      <AvisoDocumentosCompartidos />
      {id === undefined ? (
        <FormularioGeneracion alGenerar={(generado) => void alGenerar(generado)} />
      ) : error !== null ? (
        <Alert variant="destructive">
          <AlertDescription className="grid justify-items-start gap-3">
            <span>{mensajeDeError(error, MENSAJE_GENERICO)}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void alVolver()}>
              Volver al formulario
            </Button>
          </AlertDescription>
        </Alert>
      ) : cuestionario.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : (
        <>
          {restaurado && (
            <Alert>
              <AlertDescription>{TEXTO_CUESTIONARIO_REINICIADO}</AlertDescription>
            </Alert>
          )}
          <ResolucionDeCuestionario cuestionario={cuestionario.data} />
        </>
      )}
    </>
  )
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/cuestionario-page.test.tsx
```

Expected: PASS, 10 tests.

- [ ] **Step 8: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 563 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: generate a practice quiz"
```

---

### Task 11: Cuestionario: answering, in-browser grading and results (M3-2, M3-15) (CA-CUE-07, CA-CUE-08, CA-CUE-09, CA-CUE-10, CA-CUE-11)

**Files:**

- Modify: `src/lib/dominio/vocabulario.ts`
- Modify (full rewrite): `src/features/aprendizaje/components/resolucion-de-cuestionario.tsx`
- Modify: `src/features/aprendizaje/cuestionario-page.tsx`
- Test: `src/features/aprendizaje/resolucion-de-cuestionario.test.tsx`
- Test: `src/features/aprendizaje/cuestionario-page.test.tsx`

**Interfaces:**
- Consumes: `respuestaCorrecta`, `MARCADOR_COMPLETAR`, `TEXTO_CUESTIONARIO_SIN_NOTA`, `ConfirmDialog`, `StatusBadge`, the shadcn `toggle-group` (the same control M1 uses for DIRBE grades).
- Produces:
  - `vocabulario.ts` gains `RESULTADOS_RESPUESTA` under the key `respuesta`, so Correcta and Incorrecta carry the shared tones instead of a colour literal.
  - `ResolucionDeCuestionario`: one group per question with its number; four options or Verdadero/Falso as `role="radio"`; `fill_blank` replaces the `_____` marker with the text field. Before Entregar, neither `correctAnswer` nor `explanation` is in the DOM. Entregar is disabled until every question is answered and asks for confirmation; the results show the score, the percentage, A10 and, per question, the answer given, the correct one, its explanation and the excerpt when the model supplied one — never a document name (M3-15).
  - The page keys the component on the quiz id, so a different quiz always starts with no answers.

- [ ] **Step 1: Write the failing tests**

Create `src/features/aprendizaje/resolucion-de-cuestionario.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEXTO_CUESTIONARIO_REINICIADO, TEXTO_CUESTIONARIO_SIN_NOTA } from '@/lib/dominio/aprendizaje'
import { ID_CUESTIONARIO } from '@/mocks/ia/cuestionarios'
import { iniciarComo, renderApp } from '@/test/render'

function pregunta(numero: number) {
  return within(screen.getByRole('group', { name: `Pregunta ${numero}` }))
}

async function abrirCuestionario() {
  await iniciarComo('alumno.lopez')
  const vista = renderApp(`/aprendizaje/cuestionario?cuestionario=${ID_CUESTIONARIO}`)
  await screen.findByRole('group', { name: 'Pregunta 1' })
  return vista
}

async function responderTodo(usuario: ReturnType<typeof renderApp>['usuario'], completar: string) {
  await usuario.click(pregunta(1).getByRole('radio', { name: 'Un descenso controlado sin potencia del motor' }))
  await usuario.click(pregunta(2).getByRole('radio', { name: 'Verdadero' }))
  await usuario.type(pregunta(3).getByLabelText('Respuesta de la pregunta 3'), completar)
}

async function entregar(usuario: ReturnType<typeof renderApp>['usuario']) {
  await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
  const confirmacion = within(await screen.findByRole('alertdialog'))
  await usuario.click(confirmacion.getByRole('button', { name: 'Entregar' }))
}

describe('Resolver el cuestionario de práctica', () => {
  it('CA-CUE-07 muestra cada enunciado con sus opciones, verdadero/falso o un campo de texto', async () => {
    await abrirCuestionario()
    expect(pregunta(1).getByText('¿Qué permite la autorrotación?')).toBeInTheDocument()
    expect(pregunta(1).getAllByRole('radio')).toHaveLength(4)
    expect(pregunta(2).getAllByRole('radio').map((opcion) => opcion.textContent)).toEqual(['Verdadero', 'Falso'])
    expect(pregunta(3).getByLabelText('Respuesta de la pregunta 3')).toBeInTheDocument()
    expect(pregunta(3).queryByText(/_____/)).not.toBeInTheDocument()
  })

  it('CA-CUE-07 antes de entregar la respuesta correcta y la explicación no están en el DOM', async () => {
    await abrirCuestionario()
    expect(screen.queryByText(/El rotor gira por el flujo de aire ascendente/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Respuesta correcta/)).not.toBeInTheDocument()
    expect(screen.queryByText('autorrotación', { exact: true })).not.toBeInTheDocument()
  })

  it('CA-CUE-08 no se puede entregar con preguntas sin responder y entregar pide confirmación', async () => {
    const { usuario } = await abrirCuestionario()
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled()
    expect(screen.getByText('Responda las 3 preguntas para entregar.')).toBeInTheDocument()
    await usuario.click(pregunta(1).getByRole('radio', { name: 'Un descenso controlado sin potencia del motor' }))
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled()
    await responderTodo(usuario, 'autorrotación')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entregar' })).toBeEnabled())
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    expect(within(await screen.findByRole('alertdialog')).getByText(TEXTO_CUESTIONARIO_SIN_NOTA)).toBeInTheDocument()
  })

  it('CA-CUE-09 al entregar muestra los aciertos, el porcentaje, cada respuesta y A10', async () => {
    const { usuario } = await abrirCuestionario()
    await responderTodo(usuario, 'autorrotación')
    await entregar(usuario)
    expect(await screen.findByText('Aciertos: 3 de 3 (100 %)')).toBeInTheDocument()
    expect(screen.getAllByText(TEXTO_CUESTIONARIO_SIN_NOTA).length).toBeGreaterThan(0)
    expect(pregunta(1).getByText('Correcta')).toBeInTheDocument()
    expect(pregunta(1).getByText('Su respuesta: Un descenso controlado sin potencia del motor')).toBeInTheDocument()
    expect(pregunta(1).getByText('Respuesta correcta: Un descenso controlado sin potencia del motor')).toBeInTheDocument()
    expect(pregunta(1).getByText('El rotor gira por el flujo de aire ascendente.')).toBeInTheDocument()
    expect(pregunta(2).getByText('Respuesta correcta: Verdadero')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entregar' })).not.toBeInTheDocument()
  })

  it('CA-CUE-09 una respuesta equivocada se marca y muestra la correcta', async () => {
    const { usuario } = await abrirCuestionario()
    await usuario.click(pregunta(1).getByRole('radio', { name: 'Aumentar la velocidad de ascenso' }))
    await usuario.click(pregunta(2).getByRole('radio', { name: 'Falso' }))
    await usuario.type(pregunta(3).getByLabelText('Respuesta de la pregunta 3'), 'autogiro')
    await entregar(usuario)
    expect(await screen.findByText('Aciertos: 0 de 3 (0 %)')).toBeInTheDocument()
    expect(pregunta(1).getByText('Incorrecta')).toBeInTheDocument()
    expect(pregunta(1).getByText('Respuesta correcta: Un descenso controlado sin potencia del motor')).toBeInTheDocument()
    expect(pregunta(3).getByText('Respuesta correcta: autorrotación')).toBeInTheDocument()
  })

  it('CA-CUE-10 en completar no distingue mayúsculas, tildes ni espacios sobrantes', async () => {
    const { usuario } = await abrirCuestionario()
    await responderTodo(usuario, '  AutoRRotacion  ')
    await entregar(usuario)
    expect(await screen.findByText('Aciertos: 3 de 3 (100 %)')).toBeInTheDocument()
    expect(pregunta(3).getByText('Correcta')).toBeInTheDocument()
  })

  it('CA-CUE-11 al recargar el cuestionario abre las preguntas en el mismo orden y sin respuestas, con A2', async () => {
    const { usuario, unmount } = await abrirCuestionario()
    await responderTodo(usuario, 'autorrotación')
    await entregar(usuario)
    expect(await screen.findByText('Aciertos: 3 de 3 (100 %)')).toBeInTheDocument()
    unmount()

    await abrirCuestionario()
    expect(screen.getByText(TEXTO_CUESTIONARIO_REINICIADO)).toBeInTheDocument()
    expect(
      ['Pregunta 1', 'Pregunta 2', 'Pregunta 3'].map((nombre) =>
        within(screen.getByRole('group', { name: nombre })).queryAllByRole('radio').length,
      ),
    ).toEqual([4, 2, 0])
    expect(pregunta(1).getAllByRole('radio').every((opcion) => opcion.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(pregunta(3).getByLabelText('Respuesta de la pregunta 3')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled()
  })
})
```

In `src/features/aprendizaje/cuestionario-page.test.tsx`, replace:

```tsx
      await avanzar(3000)
      await waitFor(() => expect(screen.getByText('3 preguntas')).toBeInTheDocument())
      expect(generaciones).toBe(1)
```

with:

```tsx
      await avanzar(3000)
      await waitFor(() => expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument())
      expect(generaciones).toBe(1)
```

In `src/features/aprendizaje/cuestionario-page.test.tsx`, replace:

```tsx
    await avanzar(3000)
    await waitFor(() => expect(screen.getByText('3 preguntas')).toBeInTheDocument())
    expect(router.state.location.search).toEqual({ cuestionario: ID_CUESTIONARIO })
```

with:

```tsx
    await avanzar(3000)
    await waitFor(() => expect(screen.getByRole('group', { name: 'Pregunta 1' })).toBeInTheDocument())
    expect(router.state.location.search).toEqual({ cuestionario: ID_CUESTIONARIO })
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/resolucion-de-cuestionario.test.tsx src/features/aprendizaje/cuestionario-page.test.tsx
```

Expected: FAIL — `Unable to find role="group" and name "Pregunta 1"`: the placeholder of Task 10 only prints the number of questions.

- [ ] **Step 3: Add the answer-result vocabulary**

In `src/lib/dominio/vocabulario.ts`, replace:

```ts
export const ESTADOS_DOCUMENTO = {
```

with:

```ts
export const RESULTADOS_RESPUESTA = {
  correcta: { etiqueta: 'Correcta', tono: 'exito' },
  incorrecta: { etiqueta: 'Incorrecta', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_DOCUMENTO = {
```

In `src/lib/dominio/vocabulario.ts`, replace:

```ts
  documento: ESTADOS_DOCUMENTO,
} as const
```

with:

```ts
  documento: ESTADOS_DOCUMENTO,
  respuesta: RESULTADOS_RESPUESTA,
} as const
```

- [ ] **Step 4: Write the questions, the in-browser grading and the results (M3-2, M3-15)**

Replace `src/features/aprendizaje/components/resolucion-de-cuestionario.tsx` with:

```tsx
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  MARCADOR_COMPLETAR,
  respuestaCorrecta,
  TEXTO_CUESTIONARIO_SIN_NOTA,
} from '@/lib/dominio/aprendizaje'
import type { Pregunta } from '../api'
import type { Cuestionario } from '../api'

const VERDADERO_FALSO = [
  { valor: 'true', etiqueta: 'Verdadero' },
  { valor: 'false', etiqueta: 'Falso' },
] as const

function etiquetaDeRespuesta(pregunta: Pregunta, valor: string): string {
  if (valor.trim() === '') return 'Sin responder'
  if (pregunta.type === 'multiple_choice') {
    return pregunta.options?.find((opcion) => opcion.id === valor)?.text ?? valor
  }
  if (pregunta.type === 'true_false') {
    return VERDADERO_FALSO.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor
  }
  return valor
}

function EnunciadoConCampo({
  pregunta,
  numero,
  valor,
  alCambiar,
  bloqueado,
}: {
  pregunta: Pregunta
  numero: number
  valor: string
  alCambiar: (siguiente: string) => void
  bloqueado: boolean
}) {
  const [antes, ...resto] = pregunta.prompt.split(MARCADOR_COMPLETAR)
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span>{antes}</span>
      <Input
        className="w-48"
        aria-label={`Respuesta de la pregunta ${numero}`}
        disabled={bloqueado}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
      />
      <span>{resto.join(MARCADOR_COMPLETAR)}</span>
    </p>
  )
}

export function ResolucionDeCuestionario({ cuestionario }: { cuestionario: Cuestionario }) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [entregado, setEntregado] = useState(false)
  const total = cuestionario.preguntas.length
  const respuestaDe = (pregunta: Pregunta) => respuestas[pregunta.id] ?? ''
  const completas = cuestionario.preguntas.every((pregunta) => respuestaDe(pregunta).trim() !== '')
  const aciertos = cuestionario.preguntas.filter((pregunta) =>
    respuestaCorrecta(pregunta.type, pregunta.correctAnswer, respuestaDe(pregunta)),
  ).length
  const porcentaje = total === 0 ? 0 : Math.round((aciertos / total) * 100)

  function responder(pregunta: Pregunta, valor: string) {
    setRespuestas((previas) => ({ ...previas, [pregunta.id]: valor }))
  }

  return (
    <section aria-label="Preguntas del cuestionario" className="grid gap-4">
      {entregado && (
        <Alert>
          <AlertDescription className="grid gap-1">
            <span className="font-medium tabular-nums">
              Aciertos: {aciertos} de {total} ({porcentaje} %)
            </span>
            <span>{TEXTO_CUESTIONARIO_SIN_NOTA}</span>
          </AlertDescription>
        </Alert>
      )}
      {cuestionario.preguntas.map((pregunta, indice) => {
        const numero = indice + 1
        const dada = respuestaDe(pregunta)
        const correcta = respuestaCorrecta(pregunta.type, pregunta.correctAnswer, dada)
        return (
          <Card key={pregunta.id} role="group" aria-label={`Pregunta ${numero}`}>
            <CardHeader>
              <CardTitle>
                <h3>Pregunta {numero}</h3>
              </CardTitle>
              {pregunta.type === 'fill_blank' ? (
                <EnunciadoConCampo
                  pregunta={pregunta}
                  numero={numero}
                  valor={dada}
                  bloqueado={entregado}
                  alCambiar={(siguiente) => responder(pregunta, siguiente)}
                />
              ) : (
                <p>{pregunta.prompt}</p>
              )}
            </CardHeader>
            <CardContent className="grid gap-3">
              {pregunta.type !== 'fill_blank' && (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="flex flex-wrap justify-start"
                  aria-label={`Respuesta de la pregunta ${numero}`}
                  value={dada}
                  disabled={entregado}
                  onValueChange={(valor) => valor !== '' && responder(pregunta, valor)}
                >
                  {(pregunta.type === 'multiple_choice'
                    ? (pregunta.options ?? []).map((opcion) => ({ valor: opcion.id, etiqueta: opcion.text }))
                    : VERDADERO_FALSO.map((opcion) => ({ valor: opcion.valor, etiqueta: opcion.etiqueta }))
                  ).map((opcion) => (
                    <ToggleGroupItem key={opcion.valor} value={opcion.valor} aria-label={opcion.etiqueta}>
                      {opcion.etiqueta}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              {entregado && (
                <div className="grid gap-1 text-sm">
                  <StatusBadge
                    vocabulario="respuesta"
                    valor={correcta ? 'correcta' : 'incorrecta'}
                    className="w-fit"
                  />
                  <p>Su respuesta: {etiquetaDeRespuesta(pregunta, dada)}</p>
                  <p>Respuesta correcta: {etiquetaDeRespuesta(pregunta, pregunta.correctAnswer)}</p>
                  {pregunta.explanation && <p className="text-muted-foreground">{pregunta.explanation}</p>}
                  {pregunta.sourceExcerpt && <p className="text-muted-foreground">«{pregunta.sourceExcerpt}»</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
      {!entregado && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!completas && <p className="text-sm text-muted-foreground">Responda las {total} preguntas para entregar.</p>}
          <ConfirmDialog
            disparador={
              <Button type="button" disabled={!completas}>
                Entregar
              </Button>
            }
            titulo="¿Entregar el cuestionario?"
            descripcion={TEXTO_CUESTIONARIO_SIN_NOTA}
            confirmar="Entregar"
            alConfirmar={() => setEntregado(true)}
          />
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Start a new quiz with a clean slate**

In `src/features/aprendizaje/cuestionario-page.tsx`, replace:

```tsx
          <ResolucionDeCuestionario cuestionario={cuestionario.data} />
```

with:

```tsx
          <ResolucionDeCuestionario key={cuestionario.data.id} cuestionario={cuestionario.data} />
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje
```

Expected: PASS.

- [ ] **Step 7: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 570 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: answer and grade the practice quiz"
```

---

### Task 12: Consultas: the picker, the first question, the `[n]` chips and the failure paths (M3-8, M3-10, M3-11, M3-14) (CA-CON-01..CA-CON-08)

**Files:**

- Generated: `src/components/ui/popover.tsx`
- Create: `src/features/aprendizaje/components/cita-de-fuente.tsx`
- Create: `src/features/aprendizaje/components/conversacion.tsx`
- Create: `src/features/aprendizaje/components/panel-de-documentos.tsx`
- Modify (full rewrite): `src/features/aprendizaje/consultas-page.tsx`
- Test: `src/features/aprendizaje/consultas-page.test.tsx`

**Interfaces:**
- Consumes: `crearSesion`, `enviarMensaje`, `trozosConCitas`, `porcentajeDeSimilitud`, `useDocumentosListos`, `mensajeDeError`, the shadcn `popover`, `checkbox` and `textarea`.
- Produces:
  - `CitaDeFuente`: a chip that opens a popover with the file name, the excerpt and the similarity as a percentage only when the server informed it; a source whose chunk is gone keeps its number as inert text.
  - `Conversacion`: one group per turn (`Su pregunta` / `Respuesta`); an assistant message with `fuentes` splits its content into chips and text, one with `fuentes: null` renders its markers as plain text, and one with `fuentes: []` adds A9 unless its content is C10.
  - `SelectorDeDocumentos` (only `ready` rows, A16 with a link to Documentos when there are none) and `DocumentosDeLaConsulta`, the read-only panel beside the conversation.
  - `ConsultasPage`: the first question creates the session and puts its id in `?sesion=`; while waiting, the question is already in the conversation (from `mutation.variables`) and the box is disabled with an indicator; a failure keeps the question in the box with Reintentar and leaves no half-written turn; Nueva consulta clears everything.

- [ ] **Step 1: Write the failing tests**

Create `src/features/aprendizaje/consultas-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { TEXTO_RESPUESTA_SIN_FUENTES, TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS } from '@/lib/dominio/aprendizaje'
import { ID_SESION_CREADA } from '@/mocks/ia/consultas'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { C10_SIN_RESPUESTA, C5_DOCUMENTOS_AJENOS } from './mensajes'

const IA = config.iaApiUrl
const PRINCIPAL = 'PDI EA-510 Título III.pdf'

async function abrirConsultas(usuario?: ReturnType<typeof relojFalso>['usuario']) {
  await iniciarComo('alumno.lopez')
  const vista = renderApp('/aprendizaje/consultas', usuario)
  await screen.findByRole('group', { name: 'Documentos para consultar' })
  return vista
}

async function preguntar(usuario: ReturnType<typeof renderApp>['usuario'], texto: string) {
  await usuario.type(screen.getByLabelText('Pregunta'), texto)
  await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
}

function conversacion() {
  return within(screen.getByRole('region', { name: 'Conversación' }))
}

describe('Consultar los documentos con IA', () => {
  it('CA-CON-01 pide elegir documentos en estado Listo', async () => {
    await abrirConsultas()
    const grupo = within(screen.getByRole('group', { name: 'Documentos para consultar' }))
    expect(grupo.getAllByRole('checkbox')).toHaveLength(2)
    expect(grupo.getByRole('checkbox', { name: PRINCIPAL })).toBeInTheDocument()
    expect(grupo.queryByRole('checkbox', { name: 'Reglamento de operaciones.pdf' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('CA-CON-01 sin documentos listos muestra A16 con un enlace a Documentos', async () => {
    server.use(http.get(`${IA}/documents`, () => HttpResponse.json([])))
    await iniciarComo('alumno.lopez')
    renderApp('/aprendizaje/consultas')
    expect(await screen.findByText(TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Documentos' })).toHaveAttribute('href', '/aprendizaje')
  })

  it('CA-CON-02 la primera pregunta crea la conversación, deja el id en la URL y muestra sus documentos', async () => {
    const { usuario, router } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué es la autorrotación?')
    await waitFor(() => expect(router.state.location.search).toEqual({ sesion: ID_SESION_CREADA }))
    expect(conversacion().getByText('¿Qué es la autorrotación?')).toBeInTheDocument()
    const panel = within(screen.getByRole('region', { name: 'Documentos de la consulta' }))
    expect(panel.getByText(PRINCIPAL)).toBeInTheDocument()
  })

  it('CA-CON-03 un C5 al crear la conversación conserva la selección', async () => {
    server.use(
      http.post(`${IA}/chat/sessions`, () =>
        HttpResponse.json({ statusCode: 404, message: C5_DOCUMENTOS_AJENOS, error: 'Not Found' }, { status: 404 }),
      ),
    )
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué es la autorrotación?')
    expect(await screen.findByText(C5_DOCUMENTOS_AJENOS)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: PRINCIPAL })).toBeChecked()
    expect(screen.getByLabelText('Pregunta')).toHaveValue('¿Qué es la autorrotación?')
  })

  it('CA-CON-04 mientras espera muestra la pregunta y deshabilita el cuadro de texto', async () => {
    server.use(
      http.post(`${IA}/chat/messages`, async () => {
        await delay(3000)
        return HttpResponse.json(
          {
            message: {
              id: '3e550000-0000-4000-8000-100000000002',
              sessionId: ID_SESION_CREADA,
              role: 'assistant',
              content: 'Permite descender sin potencia [1].',
              citedChunkIds: [],
              createdAt: '2026-09-19T10:31:12.000Z',
            },
            sources: [
              {
                referenceNumber: 1,
                documentId: 'd0c00000-0000-4000-8000-000000000001',
                documentFilename: PRINCIPAL,
                excerpt: 'La autorrotación es la condición de vuelo…',
                similarity: 0.812,
              },
            ],
          },
          { status: 201 },
        )
      }),
    )
    const { usuario, avanzar } = relojFalso()
    await abrirConsultas(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué es la autorrotación?')
    expect(await screen.findByText('Esperando respuesta…')).toBeInTheDocument()
    expect(conversacion().getByText('¿Qué es la autorrotación?')).toBeInTheDocument()
    expect(screen.getByLabelText('Pregunta')).toBeDisabled()
    await avanzar(3000)
    await waitFor(() => expect(screen.queryByText('Esperando respuesta…')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Pregunta')).toBeEnabled()
  })

  it('CA-CON-05 cada cita abre su fuente con el documento, el fragmento y el porcentaje', async () => {
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué es la autorrotación?')
    const respuesta = within(await screen.findByRole('group', { name: 'Respuesta' }))
    await usuario.click(respuesta.getAllByRole('button', { name: '[1]' })[0]!)
    const fuente = within(await screen.findByRole('dialog'))
    expect(fuente.getByText(PRINCIPAL)).toBeInTheDocument()
    expect(fuente.getByText('Similitud 81 %')).toBeInTheDocument()
    expect(fuente.getByText(/el rotor principal gira por el flujo de aire ascendente/)).toBeInTheDocument()
  })

  it('CA-CON-05 un marcador fuera de rango queda como texto', async () => {
    server.use(
      http.post(`${IA}/chat/messages`, () =>
        HttpResponse.json(
          {
            message: {
              id: '3e550000-0000-4000-8000-100000000002',
              sessionId: ID_SESION_CREADA,
              role: 'assistant',
              content: 'Según el manual [7] no aplica [1].',
              citedChunkIds: [],
              createdAt: '2026-09-19T10:31:12.000Z',
            },
            sources: [
              {
                referenceNumber: 1,
                documentId: 'd0c00000-0000-4000-8000-000000000001',
                documentFilename: PRINCIPAL,
                excerpt: 'Fragmento',
                similarity: null,
              },
            ],
          },
          { status: 201 },
        ),
      ),
    )
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Qué dice el manual?')
    const respuesta = within(await screen.findByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getByText(/Según el manual \[7\] no aplica/)).toBeInTheDocument()
    expect(respuesta.getAllByRole('button', { name: '[1]' })).toHaveLength(1)
    expect(respuesta.queryByRole('button', { name: '[7]' })).not.toBeInTheDocument()
    await usuario.click(respuesta.getByRole('button', { name: '[1]' }))
    const fuente = within(await screen.findByRole('dialog'))
    expect(fuente.queryByText(/Similitud/)).not.toBeInTheDocument()
  })

  it('CA-CON-06 una respuesta sin fuentes añade A9', async () => {
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, '¿Cómo influye el clima?')
    const respuesta = within(await screen.findByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getByText(TEXTO_RESPUESTA_SIN_FUENTES)).toBeInTheDocument()
  })

  it('CA-CON-07 C10 se muestra como una respuesta normal sin fuentes', async () => {
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, 'provoca un error')
    const respuesta = within(await screen.findByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getByText(C10_SIN_RESPUESTA)).toBeInTheDocument()
    expect(respuesta.queryByText(TEXTO_RESPUESTA_SIN_FUENTES)).not.toBeInTheDocument()
  })

  it('CA-CON-08 un envío fallido deja la pregunta en el cuadro con Reintentar y sin turno a medias', async () => {
    const { usuario } = await abrirConsultas()
    await usuario.click(screen.getByRole('checkbox', { name: PRINCIPAL }))
    await preguntar(usuario, 'esto falla')
    expect(await screen.findByText(MENSAJE_GENERICO)).toBeInTheDocument()
    expect(screen.getByLabelText('Pregunta')).toHaveValue('esto falla')
    expect(conversacion().queryByRole('group', { name: 'Su pregunta' })).not.toBeInTheDocument()
    expect(conversacion().queryByRole('group', { name: 'Respuesta' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(MENSAJE_GENERICO)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/consultas-page.test.tsx
```

Expected: FAIL — `Unable to find role="group" and name "Documentos para consultar"`.

- [ ] **Step 3: Add the shadcn popover**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm dlx shadcn@4.21.0 add popover </dev/null
```

Expected: `Created 1 file: src/components/ui/popover.tsx`, and nothing else changes — not even `package.json`. Commit the generated file as the CLI wrote it.

- [ ] **Step 4: Write the citation chip with its popover (M3-10)**

Create `src/features/aprendizaje/components/cita-de-fuente.tsx`:

```tsx
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { porcentajeDeSimilitud } from '@/lib/dominio/aprendizaje'
import type { Fuente } from '../api'

export function CitaDeFuente({ etiqueta, fuente }: { etiqueta: string; fuente: Fuente }) {
  const porcentaje = porcentajeDeSimilitud(fuente.similarity)
  const sinContenido = fuente.documentFilename === null && fuente.excerpt === null

  if (sinContenido) {
    return <span className="rounded bg-muted px-1 tabular-nums">{etiqueta}</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-5 px-1 tabular-nums">
          {etiqueta}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>{fuente.documentFilename ?? 'Documento no disponible'}</PopoverTitle>
          {porcentaje !== null && <PopoverDescription>Similitud {porcentaje}</PopoverDescription>}
        </PopoverHeader>
        <PopoverDescription>{fuente.excerpt ?? 'El fragmento ya no está disponible.'}</PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 5: Write the conversation (M3-10)**

Create `src/features/aprendizaje/components/conversacion.tsx`:

```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { TEXTO_RESPUESTA_SIN_FUENTES, trozosConCitas } from '@/lib/dominio/aprendizaje'
import type { MensajeChat } from '../api'
import { C10_SIN_RESPUESTA } from '../mensajes'
import { CitaDeFuente } from './cita-de-fuente'

function Respuesta({ mensaje }: { mensaje: MensajeChat }) {
  const fuentes = mensaje.fuentes
  if (fuentes === null) return <p>{mensaje.content}</p>
  return (
    <p>
      {trozosConCitas(mensaje.content, fuentes.length).map((trozo, indice) => {
        const fuente = trozo.cita === null ? undefined : fuentes[trozo.cita - 1]
        return fuente === undefined ? (
          <span key={`${indice}-texto`}>{trozo.texto}</span>
        ) : (
          <CitaDeFuente key={`${indice}-cita`} etiqueta={trozo.texto} fuente={fuente} />
        )
      })}
    </p>
  )
}

export function Conversacion({ mensajes }: { mensajes: readonly MensajeChat[] }) {
  return (
    <section aria-label="Conversación" className="grid gap-3">
      {mensajes.map((mensaje) => (
        <Card
          key={mensaje.id}
          role="group"
          aria-label={mensaje.role === 'user' ? 'Su pregunta' : 'Respuesta'}
          className={mensaje.role === 'user' ? 'bg-muted' : undefined}
        >
          <CardContent className="grid gap-2">
            {mensaje.role === 'user' ? <p>{mensaje.content}</p> : <Respuesta mensaje={mensaje} />}
            {mensaje.role === 'assistant' &&
              mensaje.fuentes !== null &&
              mensaje.fuentes.length === 0 &&
              mensaje.content !== C10_SIN_RESPUESTA && (
                <Alert>
                  <AlertDescription>{TEXTO_RESPUESTA_SIN_FUENTES}</AlertDescription>
                </Alert>
              )}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
```

- [ ] **Step 6: Write the document panel (M3-14)**

Create `src/features/aprendizaje/components/panel-de-documentos.tsx`:

```tsx
import { Link } from '@tanstack/react-router'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS } from '@/lib/dominio/aprendizaje'
import { errorDePrimeraCarga } from '@/lib/query'
import type { Documento } from '../api'
import { useDocumentosListos } from '../use-documentos-listos'

export function DocumentosDeLaConsulta({ documentos }: { documentos: readonly Documento[] }) {
  return (
    <Card role="region" aria-label="Documentos de la consulta">
      <CardHeader>
        <CardTitle>
          <h2>Documentos de la consulta</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1 text-sm">
          {documentos.map((documento) => (
            <li key={documento.id}>{documento.filename}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function SelectorDeDocumentos({
  elegidos,
  alElegir,
  bloqueado,
}: {
  elegidos: readonly string[]
  alElegir: (siguientes: string[]) => void
  bloqueado: boolean
}) {
  const documentos = useDocumentosListos()
  const error = errorDePrimeraCarga(documentos)

  if (error !== null) {
    return (
      <AvisoDeError
        titulo="No se pudieron cargar los documentos"
        error={error}
        alReintentar={() => void documentos.refetch()}
      />
    )
  }

  if (documentos.data === undefined) return <Skeleton className="h-40 w-full" aria-busy="true" />

  if (documentos.data.length === 0) {
    return (
      <EmptyState
        titulo="No hay documentos listos"
        descripcion={TEXTO_SIN_DOCUMENTOS_LISTOS_CONSULTAS}
        accion={
          <Button variant="outline" asChild>
            <Link to="/aprendizaje">Ir a Documentos</Link>
          </Button>
        }
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Documentos de la consulta</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div role="group" aria-label="Documentos para consultar" className="grid gap-3">
          {documentos.data.map((documento) => (
            <div key={documento.id} className="flex items-center gap-2">
              <Checkbox
                id={`consulta-documento-${documento.id}`}
                disabled={bloqueado}
                checked={elegidos.includes(documento.id)}
                onCheckedChange={(marcado) =>
                  alElegir(
                    marcado === true
                      ? [...elegidos, documento.id]
                      : elegidos.filter((id) => id !== documento.id),
                  )
                }
              />
              <Label htmlFor={`consulta-documento-${documento.id}`} className="font-normal">
                {documento.filename}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: Write the page (M3-8, M3-11)**

Replace `src/features/aprendizaje/consultas-page.tsx` with:

```tsx
import { useMutation } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { crearSesion, enviarMensaje, type Documento, type MensajeChat } from './api'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
import { Conversacion } from './components/conversacion'
import { DocumentosDeLaConsulta, SelectorDeDocumentos } from './components/panel-de-documentos'
import { mensajeDeError } from './mensajes'

const ruta = getRouteApi('/_app/aprendizaje/consultas')

function mensajeDelUsuario(texto: string): MensajeChat {
  return { id: 'pregunta-en-curso', role: 'user', content: texto, createdAt: '', fuentes: null }
}

export function ConsultasPage() {
  const { sesion: id } = ruta.useSearch()
  const navegar = useNavigate()
  const [elegidos, setElegidos] = useState<string[]>([])
  const [pregunta, setPregunta] = useState('')
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [documentosLocales, setDocumentosLocales] = useState<Documento[]>([])

  const enviar = useMutation({
    mutationFn: async (texto: string) => {
      if (id !== undefined) return { creada: null, respuesta: await enviarMensaje(id, texto) }
      const creada = await crearSesion(elegidos)
      return { creada, respuesta: await enviarMensaje(creada.id, texto) }
    },
    onSuccess: async ({ creada, respuesta }, texto) => {
      setMensajes((previos) => [...previos, { ...mensajeDelUsuario(texto), id: `${respuesta.id}-pregunta` }, respuesta])
      setPregunta('')
      if (creada === null) return
      setDocumentosLocales(creada.documentos)
      await navegar({ to: '/aprendizaje/consultas', search: { sesion: creada.id } })
    },
  })

  async function nuevaConsulta() {
    setElegidos([])
    setMensajes([])
    setDocumentosLocales([])
    setPregunta('')
    enviar.reset()
    await navegar({ to: '/aprendizaje/consultas', search: {} })
  }

  const enCurso = enviar.isPending ? [mensajeDelUsuario(enviar.variables)] : []
  const conversacionAbierta = id !== undefined
  const puedeEnviar = pregunta.trim() !== '' && (conversacionAbierta || elegidos.length > 0)

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.consultas.titulo}
        descripcion={PANTALLAS.consultas.descripcion}
        acciones={
          conversacionAbierta && (
            <Button variant="outline" onClick={() => void nuevaConsulta()}>
              Nueva consulta
            </Button>
          )
        }
      />
      <AvisoDocumentosCompartidos />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4">
          <Conversacion mensajes={[...mensajes, ...enCurso]} />
          {enviar.error && (
            <Alert variant="destructive">
              <AlertDescription className="grid justify-items-start gap-3">
                <span>{mensajeDeError(enviar.error, MENSAJE_GENERICO)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => enviar.mutate(pregunta)}
                  disabled={!puedeEnviar}
                >
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <form
            noValidate
            onSubmit={(evento) => {
              evento.preventDefault()
              if (puedeEnviar) enviar.mutate(pregunta)
            }}
            className="grid gap-3"
          >
            <Field>
              <FieldLabel htmlFor="consulta-pregunta">Pregunta</FieldLabel>
              <Textarea
                id="consulta-pregunta"
                rows={3}
                disabled={enviar.isPending}
                value={pregunta}
                onChange={(evento) => setPregunta(evento.target.value)}
              />
            </Field>
            <div className="flex items-center justify-end gap-3">
              {enviar.isPending && <span className="text-sm text-muted-foreground">Esperando respuesta…</span>}
              <Button type="submit" disabled={!puedeEnviar || enviar.isPending}>
                <Send aria-hidden />
                {enviar.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
          </form>
        </div>
        {conversacionAbierta ? (
          <DocumentosDeLaConsulta documentos={documentosLocales} />
        ) : (
          <SelectorDeDocumentos elegidos={elegidos} alElegir={setElegidos} bloqueado={enviar.isPending} />
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/consultas-page.test.tsx
```

Expected: PASS, 10 tests.

- [ ] **Step 9: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 580 tests.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: ask the documents with citations"
```

---

### Task 13: Consultas: recovering a conversation, with and without sources (M3-9, M3-10) (CA-CON-09..CA-CON-13)

**Files:**

- Modify: `src/features/aprendizaje/consultas-page.tsx`
- Test: `src/features/aprendizaje/consultas-restauradas.test.tsx`

**Interfaces:**
- Consumes: `consultasAprendizaje.sesion` (with `retry: false`, M3-9), `errorDePrimeraCarga`, `mensajeDeError`, the components of Task 12.
- Produces:
  - The page tells a conversation it created in this session from one it is restoring: only the second fetches `GET /chat/sessions/{id}`, which keeps the created one from re-reading what it already has.
  - A restored conversation renders its messages and its documents; if any assistant message arrives without `sources`, the conversation shows A8 and its `[n]` stay text; if they arrive with `sources`, the chips open exactly like the new ones and show no percentage, and A8 does not appear.
  - A failure that is not C9 shows A7 with Nueva consulta inside the screen, never the error page; a 404 shows C9. The query does not retry, so A7 appears at once.

- [ ] **Step 1: Write the failing tests**

Create `src/features/aprendizaje/consultas-restauradas.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_CONVERSACION_ILEGIBLE, TEXTO_FUENTES_NO_DISPONIBLES } from '@/lib/dominio/aprendizaje'
import { http, HttpResponse } from 'msw'
import {
  ID_SESION_CON_FUENTES,
  ID_SESION_ILEGIBLE,
  ID_SESION_SIN_FUENTES,
} from '@/mocks/ia/consultas'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { C9_SESION_NO_ENCONTRADA } from './mensajes'

const PRINCIPAL = 'PDI EA-510 Título III.pdf'

async function abrirConversacion(id: string) {
  await iniciarComo('alumno.lopez')
  return renderApp(`/aprendizaje/consultas?sesion=${id}`)
}

function conversacion() {
  return within(screen.getByRole('region', { name: 'Conversación' }))
}

describe('Recuperar una conversación', () => {
  it('CA-CON-09 con fuentes abre las citas anteriores sin porcentaje y no muestra A8', async () => {
    const { usuario } = await abrirConversacion(ID_SESION_CON_FUENTES)
    expect(await screen.findByRole('group', { name: 'Su pregunta' })).toBeInTheDocument()
    expect(conversacion().getByText('¿Qué es la autorrotación?')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_FUENTES_NO_DISPONIBLES)).not.toBeInTheDocument()
    const respuesta = within(screen.getByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getAllByRole('button', { name: /^\[\d]$/ })).toHaveLength(3)
    await usuario.click(respuesta.getAllByRole('button', { name: '[2]' })[0]!)
    const fuente = within(await screen.findByRole('dialog'))
    expect(fuente.getByText(PRINCIPAL)).toBeInTheDocument()
    expect(fuente.getByText(/El régimen de rotor debe mantenerse/)).toBeInTheDocument()
    expect(fuente.queryByText(/Similitud/)).not.toBeInTheDocument()
  })

  it('CA-CON-09 los documentos de la conversación se muestran junto a ella', async () => {
    await abrirConversacion(ID_SESION_CON_FUENTES)
    const panel = within(await screen.findByRole('region', { name: 'Documentos de la consulta' }))
    expect(panel.getByText(PRINCIPAL)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Documentos para consultar' })).not.toBeInTheDocument()
  })

  it('CA-CON-09 sin fuentes deja los marcadores como texto y muestra A8', async () => {
    await abrirConversacion(ID_SESION_SIN_FUENTES)
    expect(await screen.findByText(TEXTO_FUENTES_NO_DISPONIBLES)).toBeInTheDocument()
    const respuesta = within(screen.getByRole('group', { name: 'Respuesta' }))
    expect(respuesta.getByText(/El régimen de rotor se mantiene con el flujo ascendente \[1]\[2]\./)).toBeInTheDocument()
    expect(respuesta.queryByRole('button', { name: '[1]' })).not.toBeInTheDocument()
  })

  it('CA-CON-10 un error del servidor muestra A7 con Nueva consulta dentro de la pantalla', async () => {
    const { usuario } = await abrirConversacion(ID_SESION_ILEGIBLE)
    expect(await screen.findByText(TEXTO_CONVERSACION_ILEGIBLE)).toBeInTheDocument()
    expect(screen.queryByText('Página no encontrada')).not.toBeInTheDocument()
    expect(screen.queryByText('Ocurrió un error inesperado. Intente nuevamente.')).not.toBeInTheDocument()
    await usuario.click(screen.getAllByRole('button', { name: 'Nueva consulta' })[0]!)
    expect(await screen.findByRole('group', { name: 'Documentos para consultar' })).toBeInTheDocument()
  })

  it('CA-CON-10 la consulta de la sesión no se reintenta', async () => {
    let intentos = 0
    server.use(
      http.get(`${config.iaApiUrl}/chat/sessions/:id`, () => {
        intentos += 1
        return HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 })
      }),
    )
    await abrirConversacion(ID_SESION_ILEGIBLE)
    expect(await screen.findByText(TEXTO_CONVERSACION_ILEGIBLE)).toBeInTheDocument()
    await waitFor(() => expect(intentos).toBe(1))
  })

  it('CA-CON-11 una conversación inexistente muestra C9', async () => {
    await abrirConversacion('5e550000-0000-4000-8000-00000000aaaa')
    expect(await screen.findByText(C9_SESION_NO_ENCONTRADA)).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_CONVERSACION_ILEGIBLE)).not.toBeInTheDocument()
  })

  it('CA-CON-12 Nueva consulta limpia el identificador de la URL y vuelve a elegir documentos', async () => {
    const { usuario, router } = await abrirConversacion(ID_SESION_CON_FUENTES)
    expect(await screen.findByRole('group', { name: 'Respuesta' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Nueva consulta' }))
    await waitFor(() => expect(router.state.location.search).toEqual({}))
    expect(await screen.findByRole('group', { name: 'Documentos para consultar' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Respuesta' })).not.toBeInTheDocument()
  })

  it('CA-CON-13 la conversación nunca muestra el texto extraído ni la ruta de almacenamiento', async () => {
    server.use(
      http.get(`${config.iaApiUrl}/chat/sessions/:id`, () =>
        HttpResponse.json({
          id: ID_SESION_CON_FUENTES,
          title: 'Consulta sobre PDI EA-510 Título III.pdf',
          createdAt: '2026-09-19T10:30:00.000Z',
          documents: [
            {
              id: 'd0c00000-0000-4000-8000-000000000001',
              filename: PRINCIPAL,
              mimeType: 'application/pdf',
              sizeBytes: 2_411_008,
              status: 'ready',
              errorMessage: null,
              tags: [],
              createdAt: '2026-09-18T14:02:11.000Z',
              processedAt: '2026-09-18T14:02:58.000Z',
              extractedText: 'TITULO III DE LA INSTRUCCION EN VUELO',
              storageKey: 'documentos/564984ee/pdi-titulo-iii.pdf',
            },
          ],
          messages: [],
        }),
      ),
    )
    await abrirConversacion(ID_SESION_CON_FUENTES)
    const panel = within(await screen.findByRole('region', { name: 'Documentos de la consulta' }))
    expect(panel.getByText(PRINCIPAL)).toBeInTheDocument()
    expect(screen.queryByText(/TITULO III DE LA INSTRUCCION/)).not.toBeInTheDocument()
    expect(screen.queryByText(/documentos\/564984ee/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje/consultas-restauradas.test.tsx
```

Expected: FAIL — `Unable to find role="group" and name "Su pregunta"`: the page keeps no conversation it did not create in this session.

- [ ] **Step 3: Recover the conversation from its identifier (M3-9, M3-10)**

Replace `src/features/aprendizaje/consultas-page.tsx` with:

```tsx
import { useMutation, useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { TEXTO_CONVERSACION_ILEGIBLE, TEXTO_FUENTES_NO_DISPONIBLES } from '@/lib/dominio/aprendizaje'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasAprendizaje, crearSesion, enviarMensaje, type Documento, type MensajeChat } from './api'
import { AvisoDocumentosCompartidos } from './components/aviso-compartido'
import { Conversacion } from './components/conversacion'
import { DocumentosDeLaConsulta, SelectorDeDocumentos } from './components/panel-de-documentos'
import { mensajeDeError } from './mensajes'

const ruta = getRouteApi('/_app/aprendizaje/consultas')

function mensajeDelUsuario(texto: string): MensajeChat {
  return { id: 'pregunta-en-curso', role: 'user', content: texto, createdAt: '', fuentes: null }
}

export function ConsultasPage() {
  const { sesion: id } = ruta.useSearch()
  const navegar = useNavigate()
  const [creadaAqui, setCreadaAqui] = useState<string | null>(null)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [pregunta, setPregunta] = useState('')
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [documentosLocales, setDocumentosLocales] = useState<Documento[]>([])
  const restaurada = id !== undefined && id !== creadaAqui
  const sesion = useQuery({ ...consultasAprendizaje.sesion(id ?? ''), enabled: restaurada })
  const errorDeSesion = restaurada ? errorDePrimeraCarga(sesion) : null

  const enviar = useMutation({
    mutationFn: async (texto: string) => {
      if (id !== undefined) return { creada: null, respuesta: await enviarMensaje(id, texto) }
      const creada = await crearSesion(elegidos)
      return { creada, respuesta: await enviarMensaje(creada.id, texto) }
    },
    onSuccess: async ({ creada, respuesta }, texto) => {
      setMensajes((previos) => [...previos, { ...mensajeDelUsuario(texto), id: `${respuesta.id}-pregunta` }, respuesta])
      setPregunta('')
      if (creada === null) return
      setCreadaAqui(creada.id)
      setDocumentosLocales(creada.documentos)
      await navegar({ to: '/aprendizaje/consultas', search: { sesion: creada.id } })
    },
  })

  async function nuevaConsulta() {
    setCreadaAqui(null)
    setElegidos([])
    setMensajes([])
    setDocumentosLocales([])
    setPregunta('')
    enviar.reset()
    await navegar({ to: '/aprendizaje/consultas', search: {} })
  }

  const mensajesVisibles = restaurada ? (sesion.data?.mensajes ?? []) : mensajes
  const documentosVisibles = restaurada ? (sesion.data?.documentos ?? []) : documentosLocales
  const enCurso = enviar.isPending ? [mensajeDelUsuario(enviar.variables)] : []
  const sinFuentesPrevias =
    restaurada &&
    mensajesVisibles.some((mensaje) => mensaje.role === 'assistant' && mensaje.fuentes === null)
  const conversacionAbierta = id !== undefined
  const puedeEnviar = pregunta.trim() !== '' && (conversacionAbierta || elegidos.length > 0)

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.consultas.titulo}
        descripcion={PANTALLAS.consultas.descripcion}
        acciones={
          conversacionAbierta && (
            <Button variant="outline" onClick={() => void nuevaConsulta()}>
              Nueva consulta
            </Button>
          )
        }
      />
      <AvisoDocumentosCompartidos />
      {errorDeSesion !== null ? (
        <Alert variant="destructive">
          <AlertDescription className="grid justify-items-start gap-3">
            <span>{mensajeDeError(errorDeSesion, TEXTO_CONVERSACION_ILEGIBLE)}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void nuevaConsulta()}>
              Nueva consulta
            </Button>
          </AlertDescription>
        </Alert>
      ) : restaurada && sesion.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4">
            {sinFuentesPrevias && (
              <Alert>
                <AlertDescription>{TEXTO_FUENTES_NO_DISPONIBLES}</AlertDescription>
              </Alert>
            )}
            <Conversacion mensajes={[...mensajesVisibles, ...enCurso]} />
            {enviar.error && (
              <Alert variant="destructive">
                <AlertDescription className="grid justify-items-start gap-3">
                  <span>{mensajeDeError(enviar.error, MENSAJE_GENERICO)}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => enviar.mutate(pregunta)}
                    disabled={!puedeEnviar}
                  >
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <form
              noValidate
              onSubmit={(evento) => {
                evento.preventDefault()
                if (puedeEnviar) enviar.mutate(pregunta)
              }}
              className="grid gap-3"
            >
              <Field>
                <FieldLabel htmlFor="consulta-pregunta">Pregunta</FieldLabel>
                <Textarea
                  id="consulta-pregunta"
                  rows={3}
                  disabled={enviar.isPending}
                  value={pregunta}
                  onChange={(evento) => setPregunta(evento.target.value)}
                />
              </Field>
              <div className="flex items-center justify-end gap-3">
                {enviar.isPending && <span className="text-sm text-muted-foreground">Esperando respuesta…</span>}
                <Button type="submit" disabled={!puedeEnviar || enviar.isPending}>
                  <Send aria-hidden />
                  {enviar.isPending ? 'Enviando…' : 'Enviar'}
                </Button>
              </div>
            </form>
          </div>
          {conversacionAbierta ? (
            <DocumentosDeLaConsulta documentos={documentosVisibles} />
          ) : (
            <SelectorDeDocumentos elegidos={elegidos} alElegir={setElegidos} bloqueado={enviar.isPending} />
          )}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/aprendizaje
```

Expected: PASS.

- [ ] **Step 5: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 588 tests.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: recover a conversation from its url"
```

---

### Task 14: Decision log, README and the mock-data check (M3 wrap-up)

**Files:**

- Modify: `README.md`
- Modify: `docs/decisiones.md`

**Interfaces:**
- Consumes: every handler registered in `src/mocks/handlers.ts`; `main.tsx` loads the mocks only when `import.meta.env.DEV && config.mockApi`.
- Produces:
  - `docs/decisiones.md` gains the "Aprendizaje (M3)" section with how M3-1..M3-17 were applied, including the two findings this milestone paid for (the jsdom web classes and the re-armed poll timer).
  - `README.md` documents the new contract, the IA mocks and dependency 39 (plus 45 for Consultas).
  - A production build that carries no M3 fixture.

This task ends the plan at Step 4. The controller takes the screenshots of the three screens against `pnpm dev:mock` and merges the branch.

- [ ] **Step 1: Record the M3 decisions and update the README**

In `README.md`, replace:

````markdown
- Contrato de matrícula y programa: `docs/contrato-api-matricula.md`

## Modo demostración sin backends
````

with:

````markdown
- Contrato de matrícula y programa: `docs/contrato-api-matricula.md`
- Contrato de aprendizaje (documentos, cuestionarios y consultas): `docs/contrato-api-aprendizaje.md`

## Modo demostración sin backends
````

In `README.md`, replace:

````markdown
MSW responde en el navegador a `/auth/*`, a los turnos, evaluaciones y catálogos de `docs/contrato-api-turnos.md` y a las personas, cuentas, grupos, fases, maniobras y materias de `docs/contrato-api-matricula.md`, con datos basados en el seed de `sigeda-back` (los datos vuelven al estado inicial al recargar). Contraseña de todos: `123`.
````

with:

````markdown
MSW responde en el navegador a `/auth/*`, a los turnos, evaluaciones y catálogos de `docs/contrato-api-turnos.md`, a las personas, cuentas, grupos, fases, maniobras y materias de `docs/contrato-api-matricula.md` y a los documentos, cuestionarios y consultas de `docs/contrato-api-aprendizaje.md`, con datos basados en el seed de `sigeda-back` (los datos vuelven al estado inicial al recargar). Contraseña de todos: `123`.
````

In `README.md`, replace:

````markdown
`VITE_DEPENDENCIAS_RESUELTAS` lista, separados por coma, los números de dependencia de backend ya corregidos en el `sigeda-back` en uso (por ejemplo `22,30,32,33,37`). Mientras falte el número, la aplicación deshabilita la acción que lo necesita: Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33) y Eliminar fase (37). En modo demostración todas están disponibles.
````

with:

````markdown
`VITE_DEPENDENCIAS_RESUELTAS` lista, separados por coma, los números de dependencia de backend ya corregidos en los servidores en uso (por ejemplo `22,30,32,33,37,39`). Mientras falte el número, la aplicación deshabilita la acción que lo necesita: Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33), Eliminar fase (37) y, en Aprendizaje, Subir documento y Eliminar documento (39, `sigeda_chat_status`). En modo demostración todas están disponibles.

Aprendizaje contra el servidor real: sin la dependencia 39 los documentos son compartidos entre todos los usuarios y las tres pantallas lo avisan; Consultas necesita además la dependencia 45, sin la cual `GET /chat/sessions/{id}` responde 500 y la conversación no se puede recuperar.
````

In `docs/decisiones.md`, append:

````markdown

## Aprendizaje (M3)

Las decisiones M3-1 a M3-17 están en el §15 del spec y el contrato del servidor de IA en `docs/contrato-api-aprendizaje.md`; aquí queda cómo se aplicaron.

- **Contrato primero, en `src/mocks/ia/` (M3-16).** `datos.ts` guarda las fijaciones de la §7 del contrato y `reiniciarIaMock()`; `documentos.ts`, `cuestionarios.ts` y `consultas.ts` implementan los endpoints con la forma de error de Nest (`{statusCode, message, error}`, y `{statusCode, message}` en los 500). Se registran en `src/mocks/handlers.ts` bajo el mismo `VITE_MOCK_API` que los de `sigeda/`.
- **Los tres textos del contador de consultas.** El contador de la §7 es por documento y se cuenta desde su creación: `consultar()` lo incrementa en cada respuesta en la que el documento sigue `processing` y lo pasa a `ready` en la tercera. El documento `…0006` no termina nunca, que es lo que necesita CA-DOC-06.
- **La lista de documentos se consulta cada 3 s y se rinde a las 40 (M3-7).** El temporizador vive en un efecto de `documentos-page.tsx` y se rearma después de cada respuesta, no con `refetchInterval`: así el contador ya está actualizado cuando se decide si seguir, y la consulta número 41 no se dispara. Se cuentan también las respuestas con error, para que un servidor caído no deje la pantalla consultando para siempre.
- **Solo los mensajes del contrato se muestran (M3-5).** `src/features/aprendizaje/mensajes.ts` tiene la lista cerrada (C1, C3, C4, C5, C8, C9, C10 por igualdad; C2, C6 y C13 por prefijo; más los textos propios «No se pudo conectar con el servidor.» y «No tiene permisos para esta acción.») y `mensajeDeError` reemplaza todo lo demás por A5, A12 o `MENSAJE_GENERICO`. La comparación se hace sobre el mensaje ya normalizado por `src/lib/api/errors.ts`.
- **Subida con las verificaciones que el servidor no hace (M3-6).** `http.ts` gana `subirArchivo(ruta, archivo)`: `FormData` con el campo `file`, sin fijar `Content-Type`, con el mismo token y el mismo reintento ante un 401. Antes de enviar, `archivoAceptado` rechaza lo que no sea `.pdf`, `.docx` o `.txt` o pase de 25 MB, con A11 y sin pedir nada al servidor.
- **El cuestionario se califica en el navegador (M3-2, M3-3).** El id vive en `?cuestionario=<uuid>`; las respuestas no se guardan en ninguna parte y al recargar la pantalla muestra A2. `respuestaCorrecta` compara por igualdad exacta salvo en `fill_blank`, donde normaliza (recorta, minúsculas, sin tildes, espacios internos colapsados). `correctAnswer` y `explanation` no se renderizan hasta que el usuario entrega.
- **La generación tiene un corte de 120 s (M3-4).** `conLimiteDeTiempo` de `src/lib/api/http.ts` arma un `AbortController`; al cortarse, el cliente lanza `CanceladoError` y la pantalla muestra A4 con «Reintentar». Mientras espera, el formulario queda deshabilitado con A3.
- **Las citas son enlaces solo cuando el servidor las resuelve (M3-10).** `trozosConCitas` convierte en chip los `[n]` con `1 ≤ n ≤ sources.length` y deja el resto como texto; el chip abre un popover con el nombre del archivo, el fragmento y el porcentaje solo si `similarity` no es nulo. Un mensaje que llega sin la clave `sources` se distingue de uno con `sources: []`: el primero deja sus marcadores como texto y la conversación muestra A8.
- **La conversación vive en la URL (M3-8, M3-9).** `?sesion=<uuid>`; no hay historial porque no hay endpoint que lo liste. La consulta de la sesión usa `retry: false`, y un error que no sea C9 muestra A7 con «Nueva consulta» dentro de la pantalla.
- **Un envío fallido no deja medio turno (M3-11).** La pregunta no se borra del cuadro de texto hasta que la respuesta llega; el turno optimista se dibuja desde `enviar.variables` y desaparece con el error, que ofrece «Reintentar».
- **Máquina del tiempo compartida (M3-17).** `src/test/tiempo.ts` expone `relojFalso()`: `vi.useFakeTimers({ shouldAdvanceTime: true })` más `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` y un `avanzar(ms)` que envuelve `vi.advanceTimersByTimeAsync`. `renderApp(ruta, usuario)` acepta esa instancia de user-event y `src/test/setup.ts` vuelve al reloj real después de cada prueba.
- **Las clases web de Node en el entorno de pruebas.** `src/test/entorno.ts` (primer `setupFile`) reemplaza `Blob`, `File`, `FormData`, `ReadableStream`, `TransformStream` y `WritableStream` de jsdom por las de Node: el `fetch` de Node no sabe serializar un `FormData` de jsdom y la subida multipart se quedaba colgada. El archivo queda fuera de `tsconfig.app.json` y dentro de `tsconfig.node.json`, para no meter los tipos de Node en el código de la aplicación.
- **El cliente de pruebas es el de producción.** `renderApp` construye su `QueryClient` con `crearQueryClient({ reintentar: false })`, así que la suite ve el `staleTime` de 30 s real; antes usaba 0 y ningún error de caché vieja podía aparecer en una prueba.
- **Permisos y menú (M3-12, M3-13).** Las tres pantallas usan `Read`, sin restricción de rol, en el grupo Aprendizaje; Cuestionario y Consultas cuelgan de Documentos en las migas.
- **Lo que M3 no hace (M3-2, M3-15).** No se llaman los endpoints de intentos (dependencia 40) ni la vista sin respuestas (41); no hay «Mis cuestionarios» (48) ni historial de conversaciones (44), y ninguna pregunta nombra su documento de origen, porque `sourceDocumentId` siempre llega nulo.
````

- [ ] **Step 2: Check that the M3 mock data stays out of production**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && rm -rf dist && pnpm exec vite build && ! grep -rlE "PDI EA-510 Título III|Reglamento de operaciones|autorrotación|564984ee-448a" dist && echo "sin datos de prueba"
```

Expected: the build succeeds and the command prints `sin datos de prueba` (no fixture, file name or mock user id in `dist/`).

- [ ] **Step 3: Run the gate**

Run the full gate:

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 588 tests.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "docs: record m3 decisions and mock data"
```

---

## Coverage

Every acceptance criterion of spec §15.4 and every decision of §15.2, with the tasks and test files that prove it. Paths are relative to `src/`.

| Criterion / decision | Tasks | Proven by |
|---|---|---|
| CA-DOC-01 columns, newest first, A14 with Subir documento | 8, 9 | `features/aprendizaje/documentos-page.test.tsx`, `lib/dominio/aprendizaje.test.ts` (tipo y tamaño), `mocks/ia/documentos.test.ts` (orden) |
| CA-DOC-02 PDF, DOCX or TXT up to 25 MB; anything else A11 without a request | 9 | `documentos-page.test.tsx`, `lib/dominio/aprendizaje.test.ts` |
| CA-DOC-03 the server's message (C1, C2) and the selection kept | 4, 9 | `lib/api/http.test.ts`, `documentos-page.test.tsx` |
| CA-DOC-04 Procesando after the upload and a 3 s refresh until it settles | 8, 9 | `documentos-page.test.tsx`, `mocks/ia/documentos.test.ts` |
| CA-DOC-05 C4 verbatim, any other reason A12, never library text | 5, 8, 9 | `features/aprendizaje/api.test.ts`, `documentos-page.test.tsx` |
| CA-DOC-06 40 consecutive polls, then A6 with Actualizar querying once | 8 | `documentos-page.test.tsx`, `test/tiempo.test.tsx` (the counter) |
| CA-DOC-07 delete confirms with A13 and removes the row | 9 | `documentos-page.test.tsx`, `mocks/ia/documentos.test.ts` |
| CA-DOC-08 never the extracted text nor the storage key | 5, 8 | `features/aprendizaje/api.test.ts`, `documentos-page.test.tsx` |
| CA-DOC-09 a network failure shows "No se pudo conectar con el servidor." and keeps the file | 4, 9 | `lib/api/http.test.ts`, `documentos-page.test.tsx` |
| CA-DOC-10 without dependency 39 Subir and Eliminar are disabled with T11 and A1 shows | 3, 9 | `lib/dependencias.test.ts`, `lib/auth/rutas-m3.test.tsx`, `documentos-page.test.tsx` |
| CA-DOC-11 Aprendizaje in the menu for the five roles, three routes open | 3 | `lib/auth/rutas-m3.test.tsx`, `lib/auth/pantallas.test.ts` |
| CA-CUE-01 one document, one type, 2 to 20 questions | 5, 10 | `features/aprendizaje/cuestionario-page.test.tsx` |
| CA-CUE-02 only `ready` documents; none shows A15 with its link | 10 | `cuestionario-page.test.tsx` |
| CA-CUE-03 the form is disabled, A3 shows, and nothing is sent twice | 10 | `cuestionario-page.test.tsx` |
| CA-CUE-04 C5 or C6 with its file names, form ready to retry | 10 | `cuestionario-page.test.tsx`, `mocks/ia/cuestionarios.test.ts` |
| CA-CUE-05 a rejected generation shows A5 with no technical detail | 5, 10 | `features/aprendizaje/api.test.ts`, `cuestionario-page.test.tsx` |
| CA-CUE-06 120 s without an answer cancels and offers Reintentar | 4, 10 | `lib/api/http.test.ts`, `mocks/ia/cuestionarios.test.ts`, `cuestionario-page.test.tsx` |
| CA-CUE-07 each type renders its control; no answer or explanation in the DOM | 5, 11 | `features/aprendizaje/api.test.ts`, `resolucion-de-cuestionario.test.tsx` |
| CA-CUE-08 cannot submit unanswered, and submitting confirms | 11 | `resolucion-de-cuestionario.test.tsx` |
| CA-CUE-09 score, percentage, answer given, correct one, explanation and A10 | 11 | `resolucion-de-cuestionario.test.tsx` |
| CA-CUE-10 fill-in-the-blank ignores case, accents and extra spaces | 5, 11 | `lib/dominio/aprendizaje.test.ts`, `resolucion-de-cuestionario.test.tsx` |
| CA-CUE-11 a reload reopens the same quiz, same order, no answers, with A2 | 10, 11 | `cuestionario-page.test.tsx`, `resolucion-de-cuestionario.test.tsx` |
| CA-CUE-12 an unknown quiz shows C8 with a way back to the form | 5, 10 | `features/aprendizaje/api.test.ts`, `mocks/ia/cuestionarios.test.ts`, `cuestionario-page.test.tsx` |
| CA-CON-01 pick `ready` documents; none shows A16 with its link | 12 | `consultas-page.test.tsx` |
| CA-CON-02 the first question creates the conversation, the id lands in the URL | 5, 12 | `features/aprendizaje/api.test.ts`, `consultas-page.test.tsx` |
| CA-CON-03 C5 or C6 on create keeps the selection | 12 | `consultas-page.test.tsx`, `mocks/ia/consultas.test.ts` |
| CA-CON-04 the question shows while waiting and the box is disabled | 12 | `consultas-page.test.tsx` |
| CA-CON-05 each `[n]` opens its source; no percentage when `similarity` is null; out-of-range stays text | 5, 12 | `lib/dominio/aprendizaje.test.ts`, `consultas-page.test.tsx` |
| CA-CON-06 an answer with no sources adds A9 | 12 | `consultas-page.test.tsx`, `mocks/ia/consultas.test.ts` |
| CA-CON-07 C10 renders as a normal answer without sources | 5, 12 | `features/aprendizaje/api.test.ts`, `consultas-page.test.tsx` |
| CA-CON-08 a failed request returns the question with Reintentar, no half turn | 12 | `consultas-page.test.tsx`, `mocks/ia/consultas.test.ts` |
| CA-CON-09 a reload restores messages and documents; with sources no A8, without them A8 | 7, 13 | `mocks/ia/consultas.test.ts`, `consultas-restauradas.test.tsx` |
| CA-CON-10 a server error shows A7 with Nueva consulta inside the screen | 13 | `consultas-restauradas.test.tsx` |
| CA-CON-11 an unknown conversation shows C9 | 13 | `consultas-restauradas.test.tsx`, `mocks/ia/consultas.test.ts` |
| CA-CON-12 Nueva consulta clears the id and goes back to the picker | 13 | `consultas-restauradas.test.tsx` |
| CA-CON-13 never the extracted text nor the storage key | 13 | `consultas-restauradas.test.tsx` |
| M3-1 the frontend changes nothing about auth; 39 gates upload and delete | 3, 9 | `lib/dependencias.test.ts`, `lib/auth/rutas-m3.test.tsx`, `documentos-page.test.tsx` |
| M3-2 the practice quiz is graded in the browser | 5, 11 | `lib/dominio/aprendizaje.test.ts`, `resolucion-de-cuestionario.test.tsx` |
| M3-3 the quiz lives in the URL, the answers do not | 10, 11 | `cuestionario-page.test.tsx`, `resolucion-de-cuestionario.test.tsx` |
| M3-4 an explained wait and a 120 s deadline | 4, 10 | `lib/api/http.test.ts`, `cuestionario-page.test.tsx` |
| M3-5 only the contract's messages are shown | 5, 8, 9, 10 | `features/aprendizaje/api.test.ts`, `documentos-page.test.tsx`, `cuestionario-page.test.tsx` |
| M3-6 multipart upload with the checks the server lacks | 4, 9 | `lib/api/http.test.ts`, `lib/dominio/aprendizaje.test.ts`, `documentos-page.test.tsx` |
| M3-7 3 s poll, terminal states stop it, 40 polls give up, `uploading` is Procesando | 5, 8 | `features/aprendizaje/api.test.ts`, `documentos-page.test.tsx` |
| M3-8 the conversation is created with the first message and lives in the URL | 12 | `consultas-page.test.tsx` |
| M3-9 restoring tolerates today's 500 | 7, 13 | `mocks/ia/consultas.test.ts`, `consultas-restauradas.test.tsx` |
| M3-10 chips when the server resolves them, text when it does not | 5, 12, 13 | `lib/dominio/aprendizaje.test.ts`, `features/aprendizaje/api.test.ts`, `consultas-page.test.tsx`, `consultas-restauradas.test.tsx` |
| M3-11 a failed answer is the backend's own text; a failed request keeps the question | 12 | `consultas-page.test.tsx` |
| M3-12 the three screens use `Read` with no role restriction | 3 | `lib/auth/rutas-m3.test.tsx`, `lib/auth/pantallas.test.ts` |
| M3-13 Aprendizaje group, Documentos as the breadcrumb parent | 3 | `lib/auth/pantallas.test.ts`, `lib/auth/rutas-m3.test.tsx` |
| M3-14 only `ready` documents can be chosen, in both tools | 10, 12 | `cuestionario-page.test.tsx`, `consultas-page.test.tsx` |
| M3-15 no quiz history and no per-question source | 11 | `resolucion-de-cuestionario.test.tsx` (the excerpt shows, no document is named) |
| M3-16 the IA mocks live in `src/mocks/ia/` under `VITE_MOCK_API` | 6, 7 | `mocks/ia/{documentos,cuestionarios,consultas}.test.ts` |
| M3-17 the timing machinery is its own task, before any timing criterion | 2 | `test/tiempo.test.tsx` |

M2 cleanups closed by Task 1:

| Cleanup | Proven by |
|---|---|
| `renderApp` builds its client from `crearQueryClient()`, so the suite sees the production `staleTime` | `test/render.test.tsx`, `lib/query.test.ts` |
| `rutaDeCampo` uses `Object.hasOwn`, so a field named `constructor` cannot produce a garbage path | `lib/formularios.test.ts` |
| One shared `nombre`/`descripcion` schema pair and one set of mock helpers | the existing `formulario-fase.test.tsx`, `formulario-maniobra.test.tsx`, `formulario-grupo.test.tsx` and `materias-page.test.tsx`, unchanged and green |
| `crearGrupo` resolves `id: number \| null` instead of the `0` sentinel | `features/grupos/api.test.ts` |

No existing test had to be relaxed for the `staleTime` change: all 456 baseline tests pass unchanged with the production cache. The only baseline tests this plan edits are `lib/auth/pantallas.test.ts` (three menu expectations that gain the three new screens) and `lib/api/http.test.ts`, `lib/query.test.ts`, `lib/formularios.test.ts`, `lib/dependencias.test.ts`, which gain cases.

Spec §8 items covered by M3: a dialog for the one small form (Subir documento) and pages for the rest, a popover for the source of a citation, a panel — not a modal — for the document picker of Consultas, empty states with a next action, a confirm dialog for every destructive or irreversible step, `tabular-nums` on sizes, dates, scores and citation numbers, dates as `dd/MM/yyyy`, breadcrumbs for the two nested screens, and the sidebar grouped by process with Aprendizaje last.

# M2 Matrícula y programa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every M2 screen of spec §14.3 (Personas with its account section, Registrar persona, Grupos with its alumno picker, Fases y subfases, Maniobras with its estándares and Materias) working against MSW mocks of `docs/contrato-api-matricula.md`, with acceptance criteria CA-PER-01..13, CA-GRU-01..08, CA-FAS-01..06, CA-MAN-01..06, CA-EST-01..04, CA-MAT-01..04, CA-DEP-01..02 and CA-SES-06..08 proven by tests, plus the four M1 follow-ups the M1 review left open.

**Architecture:** Contract-first, as in M1: MSW handlers in `src/mocks/sigeda/` (`personas`, `cuentas`, `grupos`, `fases`, `maniobras`, `materias`) implement `docs/contrato-api-matricula.md` over the one in-memory store every test resets, and the adapters in `src/features/*/api.ts` tolerate today's backend shapes (no `tipo` in the persona row, no `usuario.id` in the detail, no `subfases` in the maniobra detail). One feature folder per entity (`personas`, `cuentas`, `grupos`, `fases`, `maniobras`, `materias`), each with `api.ts`, `schemas.ts`, `cargar.ts`, `columnas.tsx`, `components/` and its pages, as M1 did for turnos and evaluaciones. Session, permissions and routing stay where M0 and M1 put them: the session now comes from `GET /api/personas/{username}` alone (M2-10), `permisos.ts` gains the four contract permissions (M2-9) and the screen registry gains the Matrícula and Programa groups with their breadcrumb parents (M2-12). Actions whose backend fix is pending are gated by one capability module, `src/lib/dependencias.ts` (M2-14). Lists reuse `DataTable` with the page and the sort in the URL — with a second search schema for the programa lists, which page with `PageWithSort` (`properties`, size ≤ 10) instead of `Page_Sort`. Every form that depends on a catalog (roles, alumnos sin grupo, subfases por fase) mounts only after the catalog arrives, and every query that feeds a screen handles its own first-load error with Reintentar.

**Tech Stack:** as M1 (Vite 8 · React 19 · TypeScript 6.0 · TanStack Router 1.170 · TanStack Query 5 · TanStack Table 9.2 · zod 4.6 · react-hook-form 7.88 · shadcn/ui 4.21 · MSW 2 · Vitest 5 · oxlint 1.83) plus the shadcn components `dialog` and `checkbox`, added in Task 1.

**Spec:** `docs/superpowers/specs/2026-09-19-sigeda-web-design.md` — §5 (session, permissions, API layer), §8 (design), §13 (M1 addendum, for the follow-ups) and **§14 (M2 addendum: decisions M2-1..M2-15, the screens and fixed texts T1–T20 of §14.3, the criteria of §14.4 and dependencies 22–38 of §14.5; binding)**. API contract the mocks implement: `docs/contrato-api-matricula.md` (materias: its §6 over `docs/contrato-api-teoria.md` §1). Backend reality with evidence: `docs/contratos/sigeda-back-m1.md` (seed data) and spec §14.1. These documents are committed before Task 1; no task copies them.

**Baseline:** branch `feat/m2-matricula-programa` at `28628b0` = M1 final (`2ee9c7c`) plus two docs commits (the M2 spec addendum with `docs/contrato-api-matricula.md`, and the review fixes). Facts of that baseline this plan relies on: the suite has **320 tests**; `normalizarError` hides `message` on status ≥ 500, honours `{mensaje}` business bodies below 500 and maps every 403 to `MENSAJE_SIN_PERMISO`; `rutaDeCampo` already turns `'subfases[0].nombre'` into `subfases.0.nombre` and leaves `'usuario.username'` nested; `sesion.ts` builds the session from `GET /api/usuarios/nombre/{username}` and requires `rol`, so a `rol: null` account throws a `ZodError` and `restaurar` keeps the tokens; `cambiar-contrasena-page.tsx` types the `PUT /api/usuarios/{id}` response as `{mensaje}` without parsing it; `errorDePrimeraCarga` returns an error only for queries that never had data; `DataTable` renders `vacio` for an empty page with no way back; the turno detail mock does not return `idSubfase`; `paginar` in `src/mocks/sigeda/comun.ts` implements `Page_Sort` only; `config` reads `VITE_MOCK_API` once at module load; `main.tsx` starts MSW only when `import.meta.env.DEV && config.mockApi`; `menuPara` groups by `ORDEN_GRUPOS`, which already lists Matrícula and Programa.

**Verified against that exact baseline before writing this plan:** a clone at `28628b0` received every task below in order, with `pnpm verify` green after each one (final: 448 tests); then the plan text itself was replayed mechanically into a second fresh clone at `28628b0`, green after every task and file-identical to the first, and each "run them to verify they fail" step was re-run against the state just before its task. APIs checked in that work (versions from `package.json`):

- **Vitest 5.0.1**: `vi.stubEnv` does reach `import.meta.env` when the module reads it at call time, which is why `src/lib/config.ts` exposes `mockApi` and `dependenciasResueltas` as getters; `test.env` in `vitest.config.ts` sets `import.meta.env.VITE_MOCK_API` for the whole suite and `unstubEnvs: true` restores the stubs after each test.
- **MSW 2.15**: `delay('infinite')` keeps a handler pending for the retry test in Task 1; `server.events.on('request:start', …)` lists the requests a login makes (CA-SES-07); handlers registered later never shadow an earlier path with a different segment count, so `/api/personas/{username}`, `/api/personas/{cod}/usuario`, `/api/personas/alumno/{tipo}`, `/api/maniobras/subfase/{id}` and `/api/maniobras/{id}` coexist.
- **TanStack Query 5.103**: refetching a query whose `data` is defined keeps the data and clears `error` while it is pending (`fetchState` resets `error` only when `data === undefined`), which is exactly the two M1 defects Task 1 fixes; `useQueries` gives one result per subfase in the fase detail; `queryClient.refetchQueries` plus `getQueryState(...).status` makes the failed background refetch deterministic in a test.
- **react-hook-form 7.88 + @hookform/resolvers 5.9 + zod 4.6**: `useFieldArray` for the subfase and estándar rows; an array `.min()` error lands in `errors.<array>.root ?? errors.<array>`; a nested object (`usuario.username`) maps 1:1 to the backend's field keys; `setValue` on an **uncontrolled** `<select>` whose options are re-rendered in the same commit does not stick, so the rol picker of Registrar persona is a `Controller`; `useWatch` instead of `form.watch()` keeps oxlint's `react(incompatible-library)` quiet.
- **Radix (radix-ui 1.6) through shadcn 4.21**: `dialog` renders `role="dialog"` with its title, and `checkbox` renders `role="checkbox"` whose accessible name comes from a `<Label htmlFor>` (a button is a labelable element), so `getByRole('checkbox', { name })` and `userEvent.click` work in jsdom.
- **sonner 2.0**: its toast store lives outside React, so `cleanup()` does not clear it; `toast.dismiss()` in `src/test/setup.ts` keeps two tests with the same message apart.
- **TanStack Router 1.170**: `validateSearch` with `.default().catch()` keeps `<Link>` free of `search`; a loader that throws `notFound()` renders the not-found page; `getRouteApi('/_app/programa/fases/').useSearch()`; a `property` typed as a plain optional string is what `DataTable`'s `alCambiar` can feed back into `navigate({ search })`.
- **On the real baseline**: the 403 branch of `normalizarError`, `rutaDeCampo`'s nested keys, `errorDePrimeraCarga`, `sesion.restaurar`'s token rules and the DEV-only mock loading were read and exercised; a production build contains no M2 fixture (Task 18).

## Global Constraints

- Repo: `/Volumes/ORICO/projects/personal/tesis-project/sigeda-web`. Work on branch **`feat/m2-matricula-programa`**, which already holds the M2 docs at `28628b0` (Task 1, Step 1 confirms it).
- Node is not on `PATH` in non-interactive shells. Prefix **every** shell command with `export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH;`.
- pnpm only (11.15.0). Never `npm` or `npx`. The shadcn CLI runs as `pnpm dlx shadcn@4.21.0 …` with `</dev/null` so it never waits on a prompt.
- TypeScript `~6.0.3`, `erasableSyntaxOnly`: no `enum`, no constructor parameter properties, no `namespace`.
- **No code comments** in any file you author (TS, TSX, CSS, JSON). `src/components/ui/*` and `src/hooks/use-mobile.ts` are vendored shadcn output: keep them exactly as the CLI generates them.
- All UI text in Spanish. Domain identifiers in Spanish (`personas`, `cuentas`, `grupos`, `fases`, `maniobras`, `materias`).
- No colour literals in components: only Tailwind classes backed by tokens in `src/theme.css`, `StatusBadge`, `Enlace` and the shared modules. The spec §8 design review is **still open**; keep every visual decision there.
- Tests that prove an acceptance criterion carry its ID at the start of the test name (`it('CA-PER-01 …')`).
- Test files never live under `src/routes/`.
- Gate for every task: `pnpm verify` (typecheck → oxlint → vitest → build) exits 0 before committing.
- Commits: Conventional Commits, one short subject line, **no `Co-Authored-By` trailer**.
- **M2 additions:**
- MSW handlers implement `docs/contrato-api-matricula.md` exactly (paths, permissions, status codes, bodies, messages). Adapters tolerate today's shapes where the contract says so (dependencies 26, 27, 33 and the `POST /api/personas` response).
- The mock store (`src/mocks/sigeda/datos.ts`) is reset after every test by `reiniciarMocks()`; ids come from `secuencias`, which starts at the contract's §7 values.
- Pickers use shadcn `native-select`; multi-selections use shadcn `checkbox` with a `<Label htmlFor>`; small forms are shadcn `dialog`, large ones are pages; deletes use `ConfirmDialog`.
- Every route file stays thin: guard (`exigirPantalla`), `validateSearch`, `loader` and a wrapper that turns params into page props. `src/lib/auth/cobertura-de-rutas.test.ts` fails if a route under `/_app` has no screen or the wrong guard.
- New routes regenerate `src/routeTree.gen.ts` with `pnpm exec vite build` **before** `tsc` can see them; the generated file is committed.
- Files M0 and M1 own are changed with the exact edits given, never rewritten wholesale, except where a step says "Replace … with" and carries the complete new content. Every quoted "replace" snippet was checked against `28628b0` plus the previous tasks; if the text differs, stop and report instead of guessing.
- Seeded password for every mock user: `123`. Usernames: `jefe.operaciones`, `instructor.perez`, `instructor.mendoza`, `alumno.lopez`, `alumno.falconi`, `alumno.garcia`, `alumno.torres`, `alumno.ramirez`, `alumno.castro`, `admin.sistema`, `comandante.aguirre` and `raul.paredes` (no rol: it cannot log in).

---

## File map

```
sigeda-web/
├── README.md · docs/decisiones.md                      (T18: M2 section, mock users, env var)
├── docs/contrato-api-turnos.md                         (T1: dependencies 12–21)
├── .env.example · vitest.config.ts                     (T4: VITE_DEPENDENCIAS_RESUELTAS, test env)
└── src/
    ├── components/
    │   ├── data-table.tsx                              volver a la primera página (T1)
    │   └── ui/                                         + dialog, checkbox (T1, shadcn CLI)
    ├── lib/
    │   ├── api/errors.ts                               403 con texto = regla de negocio (T3)
    │   ├── auth/sesion.ts                              sesión desde la persona, aviso sin rol (T2)
    │   ├── auth/permisos.ts                            permisos del contrato (T4)
    │   ├── auth/pantallas.ts                           17 pantallas de M2 (T4)
    │   ├── busqueda.ts                                 esquemaPaginacionPrograma (T12)
    │   ├── config.ts                                   mockApi y dependenciasResueltas como getters (T4)
    │   ├── dependencias.ts                             acciones con dependencia pendiente (T4)
    │   ├── formularios.ts                              colapsar errores de lista (T15)
    │   └── dominio/{personas,programa}.ts              tipo–rol (T3) · textos del programa (T12)
    ├── features/
    │   ├── cuentas/api.ts                              roles y mutaciones de usuario (T3)
    │   ├── personas/                                   api, schemas, cargar, columnas, components/, páginas (T5–T9)
    │   ├── grupos/                                     api, schemas, cargar, columnas, formulario, páginas (T10, T11)
    │   ├── fases/                                      api, schemas, cargar, columnas, formulario, páginas (T12, T13)
    │   ├── maniobras/                                  api, schemas, cargar, columnas, formulario, estándares (T14–T16)
    │   └── materias/                                   api, schemas, diálogo, página (T17)
    ├── mocks/sigeda/
    │   ├── datos.ts · usuarios.ts                      tienda con las fixtures de M2 (T2)
    │   ├── comun.ts                                    helpers §A y paginarConOrden (T3, T12)
    │   ├── personas.ts                                 sesión, lista, detalle, alta, baja, alumnos (T2, T5, T6, T8, T9, T11)
    │   ├── cuentas.ts · grupos.ts · fases.ts           roles y usuarios (T3) · grupos (T10) · fases y subfases (T12)
    │   └── maniobras.ts · materias.ts                  maniobras y estándares (T14) · materias (T17)
    ├── routes/_app/                                    personas/{index,nueva,$cod}, grupos/{index,nuevo,$id/{index,editar}},
    │                                                   programa/{fases/{index,nueva,$id/{index,editar}},
    │                                                   maniobras/{index,nueva,$id/{index,editar,estandares}},materias} (T4)
    └── test/setup.ts                                   toast.dismiss() entre pruebas (T11)
```

---

### Task 1: M1 follow-ups: empty day, retry on a card, idSubfase and out-of-range pages (M1 review, dependency 21)

**Files:**

- Modify: `docs/contrato-api-turnos.md`
- Test: `src/components/data-table.test.tsx`
- Modify: `src/components/data-table.tsx`
- Generated: `src/components/ui/checkbox.tsx`
- Generated: `src/components/ui/dialog.tsx`
- Test: `src/features/turnos/api.test.ts`
- Modify: `src/features/turnos/api.ts`
- Test: `src/features/turnos/modificar-turno-page.test.tsx`
- Modify: `src/features/turnos/modificar-turno-page.tsx`
- Test: `src/features/turnos/orden-de-vuelo-page.test.tsx`
- Modify: `src/features/turnos/orden-de-vuelo-page.tsx`
- Test: `src/features/turnos/turno-page.test.tsx`
- Modify: `src/features/turnos/turno-page.tsx`
- Modify: `src/mocks/sigeda/turnos.ts`

**Interfaces:**
- Consumes: M1's `OrdenDeVueloPage`, `TurnoPage`, `ModificarTurnoPage`, `aTurnoDetalle`, `DataTable`, the turno mocks and `docs/contrato-api-turnos.md`.
- Produces:
  - `OrdenDeVueloPage` keys its empty state on `turnos.data !== undefined`, so a failed background refetch on an empty day keeps the message instead of blanking the page.
  - `TurnoPage`'s per-alumno card renders the mission timeline only when that alumno's `evaluaciones !== undefined`; while a retry is pending it shows a skeleton, never "Evaluación pendiente".
  - `TurnoDetalle.idSubfase?: number` (dependency 21): `aTurnoDetalle` reads it when the backend sends it, the MSW detail returns it, and `ModificarTurnoPage` uses it with the by-name lookup as the fallback.
  - `DataTable` offers "Volver a la primera página" (calling `alCambiar({ page: 0 })`) when `parametros.page > 0` and the page has no rows.
  - `docs/contrato-api-turnos.md` covers dependencies 12–21, with rows 20 (server-side alumno ownership) and 21 (`idSubfase`).
  - The shadcn `dialog` and `checkbox` components M2 needs (added here so no later task waits on the CLI).

- [ ] **Step 1: Add the shadcn components M2 needs**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm dlx shadcn@4.21.0 add dialog checkbox -y </dev/null
```

Expected: `Created 2 files: src/components/ui/checkbox.tsx, src/components/ui/dialog.tsx` (it skips `button.tsx`, which already exists).

- [ ] **Step 2: Write the failing tests**

In `src/components/data-table.test.tsx`, replace:

```tsx
  totalPages: 2,
}

function Prueba({ alCambiar, pagina = PAGINA }: { alCambiar: (cambios: Partial<ParametrosPagina>) => void; pagina?: Pagina<Fila> }) {
  const [parametros, setParametros] = useState<ParametrosPagina>({ page: 0, size: 2, direction: 'ASC' })
  return (
    <DataTable
      etiqueta="Turnos"
```

with:

```tsx
  totalPages: 2,
}

function Prueba({
  alCambiar,
  pagina = PAGINA,
  page = 0,
}: {
  alCambiar: (cambios: Partial<ParametrosPagina>) => void
  pagina?: Pagina<Fila>
  page?: number
}) {
  const [parametros, setParametros] = useState<ParametrosPagina>({ page, size: 2, direction: 'ASC' })
  return (
    <DataTable
      etiqueta="Turnos"
```

In `src/components/data-table.test.tsx`, replace:

```tsx
    render(<Prueba alCambiar={vi.fn()} pagina={{ items: [], page: 0, size: 2, total: 0, totalPages: 0 }} />)
    expect(screen.getByText('Sin turnos')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
```

with:

```tsx
    render(<Prueba alCambiar={vi.fn()} pagina={{ items: [], page: 0, size: 2, total: 0, totalPages: 0 }} />)
    expect(screen.getByText('Sin turnos')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Volver a la primera página' })).not.toBeInTheDocument()
  })

  it('ofrece volver a la primera página cuando la página pedida quedó fuera de rango', async () => {
    const alCambiar = vi.fn()
    render(<Prueba alCambiar={alCambiar} page={2} pagina={{ items: [], page: 2, size: 2, total: 3, totalPages: 2 }} />)
    expect(screen.getByText('Sin turnos')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver a la primera página' }))
    expect(alCambiar).toHaveBeenCalledWith({ page: 0 })
  })
})
```

In `src/features/turnos/api.test.ts`, replace:

```ts
    ])
  })

  it('tolera la forma actual del backend en la lista y en el detalle', () => {
    expect(
      aTurnoResumen({ id: 1, nombre: 'Contacto Básico', subfase: 'Contacto', fechaEval: '2024-03-01', programa: 'PDI', cantGrupo: 2, cantManiobra: 6 })
```

with:

```ts
    ])
  })

  it('dependencia 21 lee el idSubfase del detalle y lo deja indefinido si el backend no lo envía', async () => {
    await iniciarComo('jefe.operaciones')
    expect((await obtenerTurno(8)).idSubfase).toBe(2)
    expect(
      aTurnoDetalle({ id: 1, nombre: 'Contacto Básico', subfase: 'Contacto', fechaEval: '2024-03-01', programa: 'PDI' })
        .idSubfase,
    ).toBeUndefined()
  })

  it('tolera la forma actual del backend en la lista y en el detalle', () => {
    expect(
      aTurnoResumen({ id: 1, nombre: 'Contacto Básico', subfase: 'Contacto', fechaEval: '2024-03-01', programa: 'PDI', cantGrupo: 2, cantManiobra: 6 })
```

In `src/features/turnos/modificar-turno-page.test.tsx`, replace:

```tsx
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
```

with:

```tsx
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
```

In `src/features/turnos/modificar-turno-page.test.tsx`, replace:

```tsx
    expect(screen.getByLabelText('Nota mínima 3')).toHaveValue('E')
  })

  it('CA-TUR-12 aplica las mismas validaciones que registrar', async () => {
    const { usuario } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
```

with:

```tsx
    expect(screen.getByLabelText('Nota mínima 3')).toHaveValue('E')
  })

  it('recupera la sub fase por su nombre si el detalle no trae el idSubfase', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/turnos/8`, () =>
        HttpResponse.json({
          id: 8,
          nombre: 'Navegación Nocturna',
          subfase: 'Navegación',
          fechaEval: sumarDias(hoyIso(), 7),
          programa: 'PDI',
          fase: 'Adaptación',
          codInstructor: '444444',
          instructor: 'Juan Torres',
          aeronave: { id: 1, nombre: 'Robinson R22', estado: 'Disponible' },
          alumnosTurno: [{ codAlumno: '111111', alumno: 'Oscar Lopez', horaInicio: '09:00', horaFin: '10:30' }],
          maniobrasTurno: [{ nota_min: 'R', maniobra: { id: 1, nombre: 'Maniobra 1', descripcion: '' } }],
        }),
      ),
    )
    await abrirEdicion()
    expect(await screen.findByLabelText('Sub fase')).toHaveValue('2')
    expect(screen.getByLabelText('Maniobra 1')).toHaveValue('1')
  })

  it('CA-TUR-12 aplica las mismas validaciones que registrar', async () => {
    const { usuario } = await abrirEdicion()
    await usuario.clear(await screen.findByLabelText('Nombre'))
```

In `src/features/turnos/orden-de-vuelo-page.test.tsx`, replace:

```tsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo, renderApp } from '@/test/render'

const EN_UNA_SEMANA = sumarDias(hoyIso(), 7)
```

with:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { clavesTurnos } from './api'

const EN_UNA_SEMANA = sumarDias(hoyIso(), 7)
```

In `src/features/turnos/orden-de-vuelo-page.test.tsx`, replace:

```tsx
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})
```

with:

```tsx
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})

it('conserva el aviso de día sin vuelos cuando falla una recarga en segundo plano', async () => {
  const fecha = sumarDias(hoyIso(), 30)
  await iniciarComo('jefe.operaciones')
  const { queryClient } = renderApp(`/turnos/dia/${fecha}`)
  expect(await screen.findByText('No hay vuelos programados para este día.')).toBeInTheDocument()
  server.use(http.get(`${config.sigedaApiUrl}/api/turnos`, () => HttpResponse.error()))
  await queryClient.refetchQueries({ queryKey: clavesTurnos.dia(fecha) })
  await waitFor(() => expect(queryClient.getQueryState(clavesTurnos.dia(fecha))?.status).toBe('error'))
  expect(screen.getByText('No hay vuelos programados para este día.')).toBeInTheDocument()
})
```

In `src/features/turnos/turno-page.test.tsx`, replace:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
```

with:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
```

In `src/features/turnos/turno-page.test.tsx`, replace:

```tsx

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
```

with:

```tsx

  it('CA-TUR-10 muestra la línea de tiempo de la misión por alumno', async () => {
    await abrirTurno('jefe.operaciones', 8)
    await waitFor(() =>
      expect(etapas('Ana Torres')).toEqual([
        'Briefing diarioT−2 h · 09:00Pendiente',
        'Briefing de detalleT−1 h · 10:00Pendiente',
        'Vuelo11:00 – 12:30Pendiente',
        'DebriefingEvaluación pendientePendiente',
      ]),
    )
  })

  it('CA-TUR-10 el debriefing figura como hecho cuando la evaluación existe', async () => {
```

In `src/features/turnos/turno-page.test.tsx`, replace:

```tsx
    expect(tarjeta.queryByText('No se pudo cargar la evaluación de este alumno')).not.toBeInTheDocument()
  })

  it('un turno inexistente muestra la página no encontrada', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/999')
```

with:

```tsx
    expect(tarjeta.queryByText('No se pudo cargar la evaluación de este alumno')).not.toBeInTheDocument()
  })

  it('al reintentar no muestra el ciclo de la misión mientras la evaluación vuelve a cargar', async () => {
    let intentos = 0
    server.use(
      http.get(`${config.sigedaApiUrl}/api/evaluaciones/persona/:cod`, async () => {
        intentos += 1
        if (intentos > 1) await delay('infinite')
        return HttpResponse.text('No se pudo consultar la evaluación.', { status: 400 })
      }),
    )
    const { usuario } = await abrirTurno('instructor.perez', 2)
    const tarjeta = within(screen.getByRole('region', { name: 'Juan Falconi' }))
    expect(await tarjeta.findByText('No se pudo cargar la evaluación de este alumno')).toBeInTheDocument()
    await usuario.click(tarjeta.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() =>
      expect(tarjeta.queryByText('No se pudo cargar la evaluación de este alumno')).not.toBeInTheDocument(),
    )
    expect(tarjeta.queryByRole('list', { name: 'Ciclo de la misión' })).not.toBeInTheDocument()
    expect(tarjeta.queryByText('Evaluación pendiente')).not.toBeInTheDocument()
  })

  it('un turno inexistente muestra la página no encontrada', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/turnos/999')
```

- [ ] **Step 3: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/components/data-table.test.tsx src/features/turnos
```

Expected: FAIL — `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Volver a la primera página"`

- [ ] **Step 4: Write the mocks and the shared modules**

In `docs/contrato-api-turnos.md`, replace:

```markdown
**Consume:** `sigeda-web` (mientras no exista contra un backend corriendo, el frontend usa mocks MSW con exactamente estas formas)
**Para:** Victor — implementación/corrección en `sigeda-back`

Fuentes: auditoría de solo lectura del código con evidencia archivo:línea (`m1-contrato-backend.md`) y las decisiones de `m1-addendum.md` §13 (M1-1 a M1-12, dependencias de backend 12–19).

Cada sección lleva una etiqueta:
- **Sin cambios** — el backend ya se comporta así; no tocar.
```

with:

```markdown
**Consume:** `sigeda-web` (mientras no exista contra un backend corriendo, el frontend usa mocks MSW con exactamente estas formas)
**Para:** Victor — implementación/corrección en `sigeda-back`

Fuentes: auditoría de solo lectura del código con evidencia archivo:línea (`m1-contrato-backend.md`) y las decisiones de `m1-addendum.md` §13 (M1-1 a M1-12, dependencias de backend 12–21).

Cada sección lleva una etiqueta:
- **Sin cambios** — el backend ya se comporta así; no tocar.
```

In `docs/contrato-api-turnos.md`, replace:

```markdown

## 5. Dependencias

Mapeo de cada ítem **Corrección**/**Nuevo** de este contrato al número de dependencia de backend de `m1-addendum.md` §13.4 (12–19), y a los números de la especificación paraguas indicados por la tarea (**1** = `GET /api/aeronaves`, **10** = lista de evaluaciones a través de los alumnos de un turno).

| # | Cambio | Sección de este contrato |
|---|---|---|
```

with:

```markdown

## 5. Dependencias

Mapeo de cada ítem **Corrección**/**Nuevo** de este contrato al número de dependencia de backend de `m1-addendum.md` §13.4 (12–21), y a los números de la especificación paraguas indicados por la tarea (**1** = `GET /api/aeronaves`, **10** = lista de evaluaciones a través de los alumnos de un turno).

| # | Cambio | Sección de este contrato |
|---|---|---|
```

In `docs/contrato-api-turnos.md`, replace:

```markdown
| 17 | `@PreAuthorize` en `DesaprobadoController` (4 endpoints) y `GET /subfases/assigned` | Fuera de alcance de este contrato (M5; no hay endpoints de Desaprobados aquí) |
| 18 | Typo `"mensaje:"` → `"mensaje"`; NPEs en `EvaluacionController.create` y `update` (evaluador inexistente); `contD` nunca se acumula; `GrupoController.detail` sin `return` | §2.6 (pasos 8, 10), §2.7 (pasos 2, 8, 10); §3; §4.8 |
| 19 | Mojibake del seed en `roles` (rompe el nombre/descr. de "Comandante de Escuadrón") | Convenciones/Permisos (nota); sin endpoint propio — es una corrección de dato de seed, no de código de ruta |
| 1 (paraguas) | `GET /api/aeronaves` (nuevo catálogo) | §1.8 |
| 10 (paraguas) | Lista de evaluaciones a través de los alumnos de un turno | §1.4 (para saber, por cada alumno de `alumnosTurno`, si ya tiene Ponderada/Chequeo Sub Fase registrada en este turno) + §2.4 (`GET /api/evaluaciones/persona/{cod}?idTurno={id}`, sin cambios, iterado una vez por alumno del turno — no hay un endpoint batch nuevo, se resuelve con el ya existente) |
```

with:

```markdown
| 17 | `@PreAuthorize` en `DesaprobadoController` (4 endpoints) y `GET /subfases/assigned` | Fuera de alcance de este contrato (M5; no hay endpoints de Desaprobados aquí) |
| 18 | Typo `"mensaje:"` → `"mensaje"`; NPEs en `EvaluacionController.create` y `update` (evaluador inexistente); `contD` nunca se acumula; `GrupoController.detail` sin `return` | §2.6 (pasos 8, 10), §2.7 (pasos 2, 8, 10); §3; §4.8 |
| 19 | Mojibake del seed en `roles` (rompe el nombre/descr. de "Comandante de Escuadrón") | Convenciones/Permisos (nota); sin endpoint propio — es una corrección de dato de seed, no de código de ruta |
| 20 | Verificar en el servidor que el alumno solo acceda a lo propio: `GET /api/turnos/{id}`, `GET /api/turnos/alumno?codAlumno=` y `/api/evaluaciones/**` solo piden `Read`; la comprobación del frontend es únicamente de interfaz | §1.2, §1.4, §2.3, §2.4, §2.5 |
| 21 | `idSubfase` en `DetalleTurno` | §1.4 |
| 1 (paraguas) | `GET /api/aeronaves` (nuevo catálogo) | §1.8 |
| 10 (paraguas) | Lista de evaluaciones a través de los alumnos de un turno | §1.4 (para saber, por cada alumno de `alumnosTurno`, si ya tiene Ponderada/Chequeo Sub Fase registrada en este turno) + §2.4 (`GET /api/evaluaciones/persona/{cod}?idTurno={id}`, sin cambios, iterado una vez por alumno del turno — no hay un endpoint batch nuevo, se resuelve con el ya existente) |
```

In `src/mocks/sigeda/turnos.ts`, replace:

```ts
  return {
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
```

with:

```ts
  return {
    id: turno.id,
    nombre: turno.nombre,
    idSubfase: turno.idSubfase,
    subfase: turno.subfase,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
```

- [ ] **Step 5: Write the API, the schemas and the columns**

In `src/features/turnos/api.ts`, replace:

```ts
  id: number
  nombre: string
  subfase: string
  fase: string
  fechaEval: string
  programa: string
```

with:

```ts
  id: number
  nombre: string
  subfase: string
  idSubfase?: number
  fase: string
  fechaEval: string
  programa: string
```

In `src/features/turnos/api.ts`, replace:

```ts
  id: number
  nombre: string
  subfase: string
  fechaEval: string
  programa: string
  fase?: string | null
```

with:

```ts
  id: number
  nombre: string
  subfase: string
  idSubfase?: number | null
  fechaEval: string
  programa: string
  fase?: string | null
```

In `src/features/turnos/api.ts`, replace:

```ts
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    fase: turno.fase ?? '',
    fechaEval: turno.fechaEval,
    programa: turno.programa,
```

with:

```ts
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    idSubfase: turno.idSubfase ?? undefined,
    fase: turno.fase ?? '',
    fechaEval: turno.fechaEval,
    programa: turno.programa,
```

- [ ] **Step 6: Write the screens**

In `src/components/data-table.tsx`, replace:

```tsx
    },
  })

  if (pagina && pagina.items.length === 0) return <>{vacio}</>

  return (
    <div className="grid gap-3">
```

with:

```tsx
    },
  })

  if (pagina && pagina.items.length === 0) {
    return (
      <div className="grid gap-3">
        {vacio}
        {parametros.page > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => alCambiar({ page: 0 })}>
              Volver a la primera página
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
```

In `src/features/turnos/modificar-turno-page.tsx`, replace:

```tsx
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const programa: Programa = turno.programa === 'PDE' ? 'PDE' : 'PDI'
  const subfases = useQuery(consultasCatalogos.subfases())
  const idSubfase = subfases.data?.find((subfase) => subfase.nombre === turno.subfase)?.id
  const catalogos = useQueries({
    queries: [
      consultasCatalogos.aeronaves(),
```

with:

```tsx
  const { data: turno } = useSuspenseQuery(consultasTurnos.detalle(id))
  const programa: Programa = turno.programa === 'PDE' ? 'PDE' : 'PDI'
  const subfases = useQuery(consultasCatalogos.subfases())
  const idSubfase = turno.idSubfase ?? subfases.data?.find((subfase) => subfase.nombre === turno.subfase)?.id
  const catalogos = useQueries({
    queries: [
      consultasCatalogos.aeronaves(),
```

In `src/features/turnos/orden-de-vuelo-page.tsx`, replace:

```tsx
      />
      {errorDeTurnos !== null && <AvisoDeError error={errorDeTurnos} alReintentar={() => void turnos.refetch()} />}
      {turnos.isPending && <Skeleton className="h-40 w-full" />}
      {turnos.isSuccess && grupos.length === 0 && (
        <EmptyState icono={PlaneTakeoff} titulo="No hay vuelos programados para este día." />
      )}
      {briefing && (
```

with:

```tsx
      />
      {errorDeTurnos !== null && <AvisoDeError error={errorDeTurnos} alReintentar={() => void turnos.refetch()} />}
      {turnos.isPending && <Skeleton className="h-40 w-full" />}
      {turnos.data !== undefined && grupos.length === 0 && (
        <EmptyState icono={PlaneTakeoff} titulo="No hay vuelos programados para este día." />
      )}
      {briefing && (
```

In `src/features/turnos/turno-page.tsx`, replace:

```tsx
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultasEvaluaciones } from '@/features/evaluaciones/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
```

with:

```tsx
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultasEvaluaciones } from '@/features/evaluaciones/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
```

In `src/features/turnos/turno-page.tsx`, replace:

```tsx
        </div>
      </CardHeader>
      <CardContent>
        {error === null ? (
          <LineaDeTiempo etapas={etapasDeMision({ fechaEval: turno.fechaEval, ...alumno }, evaluada)} />
        ) : (
          <AvisoDeError
            titulo="No se pudo cargar la evaluación de este alumno"
            error={error}
            alReintentar={alReintentar}
          />
        )}
      </CardContent>
    </Card>
  )
```

with:

```tsx
        </div>
      </CardHeader>
      <CardContent>
        {error !== null && (
          <AvisoDeError
            titulo="No se pudo cargar la evaluación de este alumno"
            error={error}
            alReintentar={alReintentar}
          />
        )}
        {error === null && evaluaciones === undefined && <Skeleton className="h-16 w-full" aria-busy="true" />}
        {error === null && evaluaciones !== undefined && (
          <LineaDeTiempo etapas={etapasDeMision({ fechaEval: turno.fechaEval, ...alumno }, evaluada)} />
        )}
      </CardContent>
    </Card>
  )
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/components/data-table.test.tsx src/features/turnos
```

Expected: PASS.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 325 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "fix: close m1 follow-ups"
```

---

### Task 2: Mock store for matrícula and the session built from the persona (M2-10) (CA-SES-06, CA-SES-07, CA-SES-08)

**Files:**

- Test: `src/components/app-shell.test.tsx`
- Modify: `src/components/menu-usuario.tsx`
- Test: `src/features/auth/login-page.test.tsx`
- Modify: `src/features/auth/login-page.tsx`
- Test: `src/features/inicio/inicio-page.test.tsx`
- Modify: `src/features/inicio/inicio-page.tsx`
- Test: `src/lib/auth/guardas.test.ts`
- Test: `src/lib/auth/sesion.test.ts`
- Modify: `src/lib/auth/sesion.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/mocks/sigeda/auth.ts`
- Modify: `src/mocks/sigeda/catalogos.ts`
- Modify: `src/mocks/sigeda/comun.ts`
- Modify (full rewrite): `src/mocks/sigeda/datos.ts`
- Create: `src/mocks/sigeda/personas.ts`
- Modify: `src/mocks/sigeda/turnos.ts`
- Modify (full rewrite): `src/mocks/sigeda/usuarios.ts`

**Interfaces:**
- Consumes: M0's `sesion`, `tokens`, `permisosDeRol`, `LoginPage`, `MenuUsuario`, `InicioPage`; M1's mock store and `autorizar`.
- Produces:
  - The mock store grows the M2 fixtures: personas with `dni` and `rango`, the 12 usuarios of contract §7 (the 10 seeded ones, `comandante.aguirre` and `raul.paredes` with `rol: null`), `654321` Lucía Mendoza Ríos (alumna without grupo or account), roles, grupos with `descripcion`, fases, subfases with `idFase`, maniobras (including `11 Autorrotación`, the only deletable one), `maniobras_subfase` links, estándares, materias and one `secuencias` object with the next ids of contract §7. Helpers: `siguienteId`, `buscarUsuarioPorNombre`, `buscarUsuarioPorId`, `usuarioDePersona`, `rolPorId`, `buscarSubfase`, `nombreDeFase`, `maniobrasDeSubfase`, `subfasesDeManiobra`, `estandaresDeManiobra`, `nombreCompleto`.
  - `GET /api/personas/{username}` (contract §1.7) in `src/mocks/sigeda/personas.ts`; `/auth/login` reads the store, checks the stored password and answers 401 for an account without rol.
  - `Sesion` gains `persona: { nombre, aPaterno, aMaterno, idGrupo }`; `cargar` calls **only** `GET /api/personas/{username}` and drops `/api/usuarios/nombre/{nombre}`.
  - `CuentaSinRolError`, `MENSAJE_SIN_ROL` (T13) and `sesion.aviso()`: on login the error message is shown by the login form; on restore the tokens are cleared and the login page reads the notice from the session module (the restore happens before the router exists).
  - `nombreDeSesion(persona)` = "Nombre ApellidoPaterno", used by the header and the Inicio greeting.

- [ ] **Step 1: Write the failing tests**

In `src/components/app-shell.test.tsx`, replace:

```tsx
import { iniciarComo, renderApp } from '@/test/render'

describe('estructura de la aplicación', () => {
  it('muestra la marca, el menú principal y el usuario con su rol', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^SIGEDA/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Cuenta de instructor.perez' })).toHaveTextContent('Instructor')
  })

  it('CA-SES-05 cerrar sesión invalida el refresh token en el servidor y vuelve a /login', async () => {
    await iniciarComo('instructor.perez')
    const refresh = tokens.refresh()
    const { usuario } = renderApp('/')
    await usuario.click(await screen.findByRole('button', { name: 'Cuenta de instructor.perez' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(tokens.refresh()).toBeNull()
```

with:

```tsx
import { iniciarComo, renderApp } from '@/test/render'

describe('estructura de la aplicación', () => {
  it('CA-SES-06 muestra la marca, el menú principal y el nombre de la persona con su rol', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^SIGEDA/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Cuenta de Juan Torres' })).toHaveTextContent('Instructor')
  })

  it('CA-SES-05 cerrar sesión invalida el refresh token en el servidor y vuelve a /login', async () => {
    await iniciarComo('instructor.perez')
    const refresh = tokens.refresh()
    const { usuario } = renderApp('/')
    await usuario.click(await screen.findByRole('button', { name: 'Cuenta de Juan Torres' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(tokens.refresh()).toBeNull()
```

In `src/components/app-shell.test.tsx`, replace:

```tsx
  it('permite elegir el tema oscuro', async () => {
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp('/')
    await usuario.click(await screen.findByRole('button', { name: 'Cuenta de alumno.lopez' }))
    await usuario.click(await screen.findByRole('menuitemradio', { name: 'Oscuro' }))
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))
  })
```

with:

```tsx
  it('permite elegir el tema oscuro', async () => {
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp('/')
    await usuario.click(await screen.findByRole('button', { name: 'Cuenta de Oscar Lopez' }))
    await usuario.click(await screen.findByRole('menuitemradio', { name: 'Oscuro' }))
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))
  })
```

In `src/features/auth/login-page.test.tsx`, replace:

```tsx
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { renderApp } from '@/test/render'

async function abrirLogin() {
  const vista = renderApp('/login')
```

with:

```tsx
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_SIN_ROL, sesion } from '@/lib/auth/sesion'
import { CLAVE_REFRESH, tokens } from '@/lib/auth/tokens'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirLogin() {
  const vista = renderApp('/login')
```

In `src/features/auth/login-page.test.tsx`, replace:

```tsx
    expect(screen.getByText('Ingrese su contraseña.')).toBeInTheDocument()
  })

  it('informa cuando no hay conexión con el servidor', async () => {
    server.use(http.post(`${config.sigedaApiUrl}/auth/login`, () => HttpResponse.error()))
    const { usuario } = await abrirLogin()
```

with:

```tsx
    expect(screen.getByText('Ingrese su contraseña.')).toBeInTheDocument()
  })

  it('CA-SES-08 una cuenta sin rol vuelve al inicio de sesión con el aviso', async () => {
    await iniciarComo('instructor.perez')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/:nom`, () =>
        HttpResponse.json({
          codigo: '765432',
          nombre: 'Raúl',
          aPaterno: 'Paredes',
          aMaterno: 'Soto',
          idGrupo: null,
          usuario: { nombre: 'raul.paredes', correo: 'raul.paredes@sigeda.com', id: 12, rol: null },
        }),
      ),
    )
    await sesion.restaurar()
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByText(MENSAJE_SIN_ROL)).toBeInTheDocument()
  })

  it('informa cuando no hay conexión con el servidor', async () => {
    server.use(http.post(`${config.sigedaApiUrl}/auth/login`, () => HttpResponse.error()))
    const { usuario } = await abrirLogin()
```

In `src/features/inicio/inicio-page.test.tsx`, replace:

```tsx
import { expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

it('saluda al usuario, muestra su rol y los accesos que tiene', async () => {
  await iniciarComo('alumno.lopez')
  renderApp('/')
  expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  expect(screen.getByText('Hola, alumno.lopez.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Cambiar contraseña/ })).toHaveAttribute('href', '/cuenta')
})
```

with:

```tsx
import { expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

it('CA-SES-06 saluda con el nombre de la persona, muestra su rol y los accesos que tiene', async () => {
  await iniciarComo('alumno.lopez')
  renderApp('/')
  expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  expect(screen.getByText('Hola, Oscar Lopez.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Cambiar contraseña/ })).toHaveAttribute('href', '/cuenta')
})
```

In `src/lib/auth/guardas.test.ts`, replace:

```ts
  return {
    usuario: { id: 1, username: 'prueba', correo: null },
    codPersona: null,
    rol: { id: 1, nombre: rol },
    permisos: permisosDeRol(rol),
  }
```

with:

```ts
  return {
    usuario: { id: 1, username: 'prueba', correo: null },
    codPersona: null,
    persona: { nombre: 'Prueba', aPaterno: 'Apellido', aMaterno: '', idGrupo: null },
    rol: { id: 1, nombre: rol },
    permisos: permisosDeRol(rol),
  }
```

In `src/lib/auth/sesion.test.ts`, replace:

```ts
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { CLAVE_REFRESH, tokens } from './tokens'
import { MENSAJE_CREDENCIALES, sesion } from './sesion'

describe('sesion', () => {
  it('CA-SES-01 con credenciales válidas crea la sesión con los permisos del rol', async () => {
```

with:

```ts
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { CLAVE_REFRESH, tokens } from './tokens'
import { MENSAJE_CREDENCIALES, MENSAJE_SIN_ROL, sesion } from './sesion'

function personaSinRol() {
  return HttpResponse.json({
    codigo: '765432',
    nombre: 'Raúl',
    aPaterno: 'Paredes',
    aMaterno: 'Soto',
    idGrupo: null,
    usuario: { nombre: 'raul.paredes', correo: 'raul.paredes@sigeda.com', id: 12, rol: null },
  })
}

describe('sesion', () => {
  it('CA-SES-01 con credenciales válidas crea la sesión con los permisos del rol', async () => {
```

In `src/lib/auth/sesion.test.ts`, replace:

```ts
    expect(sesion.actual()).toBe(creada)
  })

  it('nunca conserva el hash de la contraseña que envía el backend', async () => {
    const creada = await sesion.iniciar('instructor.perez', '123')
    expect(JSON.stringify({ ...creada, permisos: [...creada.permisos] })).not.toContain('$2a$')
```

with:

```ts
    expect(sesion.actual()).toBe(creada)
  })

  it('M2-10 la sesión trae la persona del usuario', async () => {
    const creada = await sesion.iniciar('instructor.perez', '123')
    expect(creada.persona).toEqual({ nombre: 'Juan', aPaterno: 'Torres', aMaterno: 'Perez', idGrupo: null })
  })

  it('CA-SES-07 arma la sesión sin consultar endpoints que devuelven la contraseña', async () => {
    const rutas: string[] = []
    const escucha = ({ request }: { request: Request }) => rutas.push(new URL(request.url).pathname)
    server.events.on('request:start', escucha)
    try {
      await sesion.iniciar('instructor.perez', '123')
    } finally {
      server.events.removeListener('request:start', escucha)
    }
    expect(rutas).toEqual(['/auth/login', '/api/personas/instructor.perez'])
  })

  it('CA-SES-08 una cuenta sin rol no inicia sesión y borra los tokens', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/personas/:nom`, personaSinRol))
    await expect(sesion.iniciar('instructor.perez', '123')).rejects.toMatchObject({ message: MENSAJE_SIN_ROL })
    expect(sesion.actual()).toBeNull()
    expect(tokens.refresh()).toBeNull()
  })

  it('CA-SES-08 al restaurar, una cuenta sin rol borra los tokens y deja el aviso', async () => {
    await sesion.iniciar('instructor.perez', '123')
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(http.get(`${config.sigedaApiUrl}/api/personas/:nom`, personaSinRol))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBeNull()
    expect(sesion.aviso()).toBe(MENSAJE_SIN_ROL)
  })

  it('nunca conserva el hash de la contraseña que envía el backend', async () => {
    const creada = await sesion.iniciar('instructor.perez', '123')
    expect(JSON.stringify({ ...creada, permisos: [...creada.permisos] })).not.toContain('$2a$')
```

In `src/lib/auth/sesion.test.ts`, replace:

```ts
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
```

with:

```ts
    const refresh = tokens.refresh()
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(http.get(`${config.sigedaApiUrl}/api/personas/:nom`, () => new HttpResponse(null, { status: 503 })))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe(refresh)
    server.use(http.get(`${config.sigedaApiUrl}/api/personas/:nom`, () => HttpResponse.error()))
    await expect(sesion.restaurar()).resolves.toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH)).toBe(refresh)
  })
```

In `src/lib/auth/sesion.test.ts`, replace:

```ts
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/usuarios/nombre/:nombre`, () =>
        HttpResponse.text('Usuario especificada no existe.', { status: 404 }),
      ),
    )
    await expect(sesion.restaurar()).resolves.toBeNull()
```

with:

```ts
    sesion.expirar()
    localStorage.setItem(CLAVE_REFRESH, refresh ?? '')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/:nom`, () =>
        HttpResponse.text('Persona especificada no existe.', { status: 404 }),
      ),
    )
    await expect(sesion.restaurar()).resolves.toBeNull()
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth src/features/auth src/features/inicio src/components/app-shell.test.tsx
```

Expected: FAIL — `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Cuenta de Juan Torres"`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/mocks/handlers.ts`, replace:

```ts
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

with:

```ts
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'

export const handlers: RequestHandler[] = [
  ...handlersAuth,
  ...handlersCatalogos,
  ...handlersPersonas,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

In `src/mocks/sigeda/auth.ts`, replace:

```ts
import { http, HttpResponse } from 'msw'
import { usernameDelToken } from '@/lib/auth/tokens'
import { config } from '@/lib/config'
import { CONTRASENA_SEED, USUARIOS_MOCK } from './usuarios'

const API = config.sigedaApiUrl
const HASH_DE_PRUEBA = '$2a$10$hashDePruebaQueNuncaDebeLlegarALaSesion'
```

with:

```ts
import { http, HttpResponse } from 'msw'
import { usernameDelToken } from '@/lib/auth/tokens'
import { config } from '@/lib/config'
import { buscarUsuarioPorId, buscarUsuarioPorNombre, rolPorId } from './datos'
import type { UsuarioMock } from './usuarios'

const API = config.sigedaApiUrl
const HASH_DE_PRUEBA = '$2a$10$hashDePruebaQueNuncaDebeLlegarALaSesion'
```

In `src/mocks/sigeda/auth.ts`, replace:

```ts
  secuencia = 0
}

function usernameDelRefresh(refresh: string | undefined) {
  if (!refresh || !refresh.startsWith(PREFIJO_REFRESH) || refreshRevocados.has(refresh)) return null
  const username = refresh.slice(PREFIJO_REFRESH.length).split(':')[0]
  return username && USUARIOS_MOCK[username] ? username : null
}

export function usuarioAutenticado(request: Request) {
  const cabecera = request.headers.get('Authorization') ?? ''
  const username = cabecera.startsWith('Bearer ') ? usernameDelToken(cabecera.slice(7)) : null
  return username ? (USUARIOS_MOCK[username] ?? null) : null
}

function noAutorizado() {
  return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 })
}

export const handlersAuth = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const { username, password } = (await request.json()) as { username?: string; password?: string }
    const usuario = username ? USUARIOS_MOCK[username] : undefined
    if (!usuario || password !== CONTRASENA_SEED) return new HttpResponse(null, { status: 401 })
    secuencia += 1
    return HttpResponse.json({
      token: jwtDePrueba(usuario.username),
```

with:

```ts
  secuencia = 0
}

function puedeIniciarSesion(usuario: UsuarioMock | undefined): usuario is UsuarioMock {
  return usuario !== undefined && usuario.idRol !== null
}

function usernameDelRefresh(refresh: string | undefined) {
  if (!refresh || !refresh.startsWith(PREFIJO_REFRESH) || refreshRevocados.has(refresh)) return null
  const username = refresh.slice(PREFIJO_REFRESH.length).split(':')[0]
  return username && buscarUsuarioPorNombre(username) ? username : null
}

export function usuarioAutenticado(request: Request) {
  const cabecera = request.headers.get('Authorization') ?? ''
  const username = cabecera.startsWith('Bearer ') ? usernameDelToken(cabecera.slice(7)) : null
  return username ? (buscarUsuarioPorNombre(username) ?? null) : null
}

export function noAutorizado() {
  return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 })
}

export const handlersAuth = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const { username, password } = (await request.json()) as { username?: string; password?: string }
    const usuario = username ? buscarUsuarioPorNombre(username) : undefined
    if (!puedeIniciarSesion(usuario) || password !== usuario.password) return new HttpResponse(null, { status: 401 })
    secuencia += 1
    return HttpResponse.json({
      token: jwtDePrueba(usuario.username),
```

In `src/mocks/sigeda/auth.ts`, replace:

```ts
  }),
  http.get(`${API}/api/usuarios/nombre/:nombre`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = USUARIOS_MOCK[String(params.nombre)]
    if (!usuario) return HttpResponse.text('Usuario especificada no existe.', { status: 404 })
    return HttpResponse.json({ ...usuario, password: HASH_DE_PRUEBA })
  }),
  http.put(`${API}/api/usuarios/:id`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const cuerpo = (await request.json()) as { username?: string }
    const usuario = Object.values(USUARIOS_MOCK).find((candidato) => candidato.id === Number(params.id))
    if (!usuario) return HttpResponse.text('Usuario especificada no existe.', { status: 404 })
    return HttpResponse.json(
      {
```

with:

```ts
  }),
  http.get(`${API}/api/usuarios/nombre/:nombre`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nombre))
    if (!usuario) return HttpResponse.text('Usuario especificada no existe.', { status: 404 })
    return HttpResponse.json({
      id: usuario.id,
      username: usuario.username,
      correo: usuario.correo,
      codPersona: usuario.codPersona,
      rol: rolPorId(usuario.idRol),
      password: HASH_DE_PRUEBA,
    })
  }),
  http.put(`${API}/api/usuarios/:id`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const cuerpo = (await request.json()) as { username?: string }
    const usuario = buscarUsuarioPorId(Number(params.id))
    if (!usuario) return HttpResponse.text('Usuario especificada no existe.', { status: 404 })
    return HttpResponse.json(
      {
```

In `src/mocks/sigeda/catalogos.ts`, replace:

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, errorResponse, numero, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, type PersonaMock, type ProgramaMock } from './datos'

function programaDeRuta(valor: unknown): ProgramaMock {
  return String(valor).toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
```

with:

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, errorResponse, numero, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, maniobrasDeSubfase, type PersonaMock, type ProgramaMock } from './datos'

function programaDeRuta(valor: unknown): ProgramaMock {
  return String(valor).toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
```

In `src/mocks/sigeda/catalogos.ts`, replace:

```ts
  http.get(`${API}/api/maniobras/subfase/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const ids = datos().maniobrasPorSubfase[Number(params.id)] ?? []
    if (ids.length === 0) return errorResponse(404, 'Recurso no encontrado', 'No existen maniobras disponibles.')
    return HttpResponse.json(datos().maniobras.filter((maniobra) => ids.includes(maniobra.id)))
  }),
  http.get(`${API}/api/aeronaves`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
```

with:

```ts
  http.get(`${API}/api/maniobras/subfase/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const maniobras = maniobrasDeSubfase(Number(params.id))
    if (maniobras.length === 0) return errorResponse(404, 'Recurso no encontrado', 'No existen maniobras disponibles.')
    return HttpResponse.json(maniobras.map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion })))
  }),
  http.get(`${API}/api/aeronaves`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
```

In `src/mocks/sigeda/comun.ts`, replace:

```ts
import { permisosDeRol, type Permiso } from '@/lib/auth/permisos'
import { config } from '@/lib/config'
import { usuarioAutenticado } from './auth'
import type { UsuarioMock } from './usuarios'

export const API = config.sigedaApiUrl
```

with:

```ts
import { permisosDeRol, type Permiso } from '@/lib/auth/permisos'
import { config } from '@/lib/config'
import { usuarioAutenticado } from './auth'
import { rolPorId } from './datos'
import type { UsuarioMock } from './usuarios'

export const API = config.sigedaApiUrl
```

In `src/mocks/sigeda/comun.ts`, replace:

```ts
  if (!usuario) {
    return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 })
  }
  if (!permisosDeRol(usuario.rol.nombre).has(permiso)) {
    return errorResponse(403, 'Acceso denegado', 'No tienes permisos para realizar esta acción')
  }
  return usuario
```

with:

```ts
  if (!usuario) {
    return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Token is not valid' }, { status: 401 })
  }
  if (!permisosDeRol(rolPorId(usuario.idRol)?.nombre ?? '').has(permiso)) {
    return errorResponse(403, 'Acceso denegado', 'No tienes permisos para realizar esta acción')
  }
  return usuario
```

Replace `src/mocks/sigeda/datos.ts` with:

```ts
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { crearUsuarios, ROLES_MOCK, type RolMock, type UsuarioMock } from './usuarios'

export type ProgramaMock = 'PDI' | 'PDE'

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
  contEval: number
  codEvalRealizada: string | null
}

export type GrupoMock = { id: number; nombre: string; descripcion: string; programa: ProgramaMock }

export type FaseMock = { id: number; nombre: string; descripcion: string | null }

export type SubfaseMock = { id: number; nombre: string; descripcion: string | null; idFase: number }

export type ManiobraMock = { id: number; nombre: string; descripcion: string | null }

export type EnlaceManiobraSubfase = { idSubfase: number; idManiobra: number }

export type EstandarMock = { id: number; nombre: string; descripcion: string | null; idManiobra: number }

export type ParteMock = 'PRIMERA_PARTE' | 'SEGUNDA_PARTE' | 'CULTURA_AERONAUTICA'

export type MateriaMock = {
  id: number
  nombre: string
  notaMinima: number
  coeficiente: number
  parte: ParteMock
  conPreguntas: boolean
}

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
  maniobra: { id: number; nombre: string; descripcion: string | null }
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

export type DatosMock = {
  personas: PersonaMock[]
  usuarios: UsuarioMock[]
  grupos: GrupoMock[]
  fases: FaseMock[]
  subfases: SubfaseMock[]
  maniobras: ManiobraMock[]
  maniobrasSubfase: EnlaceManiobraSubfase[]
  estandares: EstandarMock[]
  materias: MateriaMock[]
  aeronaves: AeronaveMock[]
  turnos: TurnoMock[]
  evaluaciones: EvaluacionMock[]
  secuencias: Secuencias
}

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
): PersonaMock {
  return { codigo, nombre, aPaterno, aMaterno, dni, rango, tipo, estado, idGrupo, contEval: 0, codEvalRealizada: null }
}

const MANIOBRAS: ManiobraMock[] = [
  ...Array.from({ length: 10 }, (_, indice) => ({
    id: indice + 1,
    nombre: `Maniobra ${indice + 1}`,
    descripcion: `Descripcion de Maniobra ${indice + 1}`,
  })),
  { id: 11, nombre: 'Autorrotación', descripcion: 'Aterrizaje sin potencia' },
]

const ESTANDARES: [number, string, number][] = [
  [1, 'Estandar 11', 1],
  [2, 'Estandar 22', 2],
  [3, 'Estandar 23', 2],
  [4, 'Estandar 34', 3],
  [5, 'Estandar 45', 4],
  [6, 'Estandar 46', 4],
  [7, 'Estandar 47', 4],
  [8, 'Estandar 48', 4],
  [9, 'Estandar 59', 5],
  [10, 'Estandar 60', 9],
  [11, 'Estandar 61', 9],
  [12, 'Estandar 62', 10],
]

const MATERIAS: [string, number, number][] = [
  ['Aerodinámica Aplicada a Helicópteros', 16, 0.13],
  ['Ingeniería del Helicóptero', 16, 0.16],
  ['Adoctrinamiento de Vuelo', 18, 0.22],
  ['Límites de Operación', 20, 0.1],
  ['Procedimientos Normales', 16, 0.1],
  ['Procedimientos de Emergencias', 20, 0.1],
  ['Meteorología', 16, 0.04],
  ['Prevención de Accidentes', 16, 0.04],
  ['Normatividad FAP', 16, 0.04],
  ['Regulaciones Aeronáuticas del Perú', 16, 0.04],
  ['Fraseología Aeronáutica en Inglés', 16, 0.03],
]

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
    persona('111111', 'Oscar', 'Lopez', 'Chaparro', '12345678', 'Cadete', 'Alumno', 1),
    persona('222222', 'Juan', 'Falconi', 'Fernandez', '23456789', 'Alférez', 'Alumno', 2),
    persona('333333', 'Carlos', 'Vargas', 'Rodriguez', '34567890', 'Mayor', null, null),
    persona('444444', 'Juan', 'Torres', 'Perez', '45678901', 'Capitán', 'Instructor PDI', null),
    persona('555555', 'Pedro', 'Rodriguez', 'Garcia', '56789012', 'Teniente', 'Alumno', 3),
    persona('666666', 'Ana', 'Torres', 'Martinez', '67890123', 'Capitán', 'Alumno', 3),
    persona('777777', 'Carlos', 'Ramirez', 'Sanchez', '78901234', 'Mayor', 'Alumno', 4, 'En Chequeo'),
    persona('888888', 'Maria', 'Flores', 'Mendoza', '89012345', 'Teniente', 'Instructor PDI', null),
    persona('999999', 'Luis', 'Diaz', 'Castro', '90123456', 'Alférez', 'Alumno', 6),
    persona('000001', 'Admin', 'Sistema', 'Web', '01234567', 'Admin', null, null),
    persona('222444', 'Jorge', 'Aguirre', 'Salas', '22244411', 'Mayor', null, null),
    persona('654321', 'Lucía', 'Mendoza', 'Ríos', '76543210', 'Cadete', 'Alumno', null),
    persona('765432', 'Raúl', 'Paredes', 'Soto', '75432109', 'Teniente', null, null),
  ]
  const alumno111 = personas.find((candidata) => candidata.codigo === '111111')
  const alumno555 = personas.find((candidata) => candidata.codigo === '555555')
  if (alumno111) Object.assign(alumno111, { contEval: 1, codEvalRealizada: '111111-1' })
  if (alumno555) Object.assign(alumno555, { contEval: 3, codEvalRealizada: '555555-3' })

  return {
    personas,
    usuarios: crearUsuarios(),
    grupos: [
      { id: 1, nombre: 'Grupo 1', descripcion: 'Instrucción básica - Nuevos ingresantes', programa: 'PDI' },
      { id: 2, nombre: 'Grupo 2', descripcion: 'Instrucción avanzada - Fase final', programa: 'PDI' },
      { id: 3, nombre: 'Grupo 3', descripcion: 'Entrenamiento especializado - Nivel 1', programa: 'PDI' },
      { id: 4, nombre: 'Grupo 4', descripcion: 'Entrenamiento avanzado - Nivel 2', programa: 'PDI' },
      { id: 5, nombre: 'Grupo 5', descripcion: 'Instrucción intermedia - Fase media', programa: 'PDI' },
      { id: 6, nombre: 'Grupo 6', descripcion: 'Entrenamiento especializado - Nivel 2', programa: 'PDI' },
    ],
    fases: [
      { id: 1, nombre: 'Adaptación', descripcion: 'Fase inicial de familiarización con procedimientos básicos' },
      { id: 2, nombre: 'Operaciones HeliTransportadas', descripcion: 'Entrenamiento en operaciones con helicópteros' },
      { id: 3, nombre: 'Operaciones AeroTácticas', descripcion: 'Operaciones avanzadas y tácticas especiales' },
    ],
    subfases: [
      { id: 1, nombre: 'Contacto', descripcion: 'Familiarización con controles y procedimientos básicos', idFase: 1 },
      { id: 2, nombre: 'Navegación', descripcion: 'Técnicas de navegación y orientación', idFase: 1 },
      { id: 3, nombre: 'Instrumentos', descripcion: 'Manejo de instrumentos de vuelo', idFase: 1 },
      { id: 4, nombre: 'Campos Extraños', descripcion: 'Operaciones en terrenos no preparados', idFase: 1 },
      { id: 5, nombre: 'Formación', descripcion: 'Vuelo en formación y coordinación', idFase: 1 },
    ],
    maniobras: MANIOBRAS.map((item) => ({ ...item })),
    maniobrasSubfase: [
      ...[1, 2, 3, 4, 5, 6].map((idManiobra) => ({ idSubfase: 2, idManiobra })),
      ...[9, 10].map((idManiobra) => ({ idSubfase: 3, idManiobra })),
      ...[7, 8].map((idManiobra) => ({ idSubfase: 4, idManiobra })),
    ],
    estandares: ESTANDARES.map(([id, nombre, idManiobra]) => ({ id, nombre, descripcion: null, idManiobra })),
    materias: MATERIAS.map(([nombre, notaMinima, coeficiente], indice) => ({
      id: indice + 1,
      nombre,
      notaMinima,
      coeficiente,
      parte: 'PRIMERA_PARTE' as ParteMock,
      conPreguntas: indice + 1 === 3,
    })),
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
    secuencias: { turno: 10, usuario: 13, grupo: 7, fase: 4, subfase: 6, maniobra: 12, estandar: 13, materia: 12 },
  }
}

let datosActuales = crearDatos()

export function datos(): DatosMock {
  return datosActuales
}

export function reiniciarDatosMock() {
  datosActuales = crearDatos()
}

export function siguienteId(clave: keyof Secuencias): number {
  const valor = datosActuales.secuencias[clave]
  datosActuales.secuencias[clave] += 1
  return valor
}

export function buscarPersona(codigo: string): PersonaMock | undefined {
  return datosActuales.personas.find((persona) => persona.codigo === codigo)
}

export function buscarUsuarioPorNombre(username: string): UsuarioMock | undefined {
  return datosActuales.usuarios.find((usuario) => usuario.username === username)
}

export function buscarUsuarioPorId(id: number): UsuarioMock | undefined {
  return datosActuales.usuarios.find((usuario) => usuario.id === id)
}

export function usuarioDePersona(codigo: string): UsuarioMock | undefined {
  return datosActuales.usuarios.find((usuario) => usuario.codPersona === codigo)
}

export function rolPorId(idRol: number | null): RolMock | null {
  return ROLES_MOCK.find((rol) => rol.id === idRol) ?? null
}

export function nombreCorto(persona: PersonaMock): string {
  return `${persona.nombre} ${persona.aPaterno}`
}

export function nombreCompleto(persona: PersonaMock): string {
  return [persona.nombre, persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
}

export function buscarSubfase(id: number): SubfaseMock | undefined {
  return datosActuales.subfases.find((subfase) => subfase.id === id)
}

export function nombreDeFase(idFase: number): string {
  return datosActuales.fases.find((fase) => fase.id === idFase)?.nombre ?? ''
}

export function maniobrasDeSubfase(idSubfase: number): ManiobraMock[] {
  const ids = datosActuales.maniobrasSubfase
    .filter((enlace) => enlace.idSubfase === idSubfase)
    .map((enlace) => enlace.idManiobra)
  return datosActuales.maniobras.filter((maniobra) => ids.includes(maniobra.id))
}

export function subfasesDeManiobra(idManiobra: number): SubfaseMock[] {
  const ids = datosActuales.maniobrasSubfase
    .filter((enlace) => enlace.idManiobra === idManiobra)
    .map((enlace) => enlace.idSubfase)
  return datosActuales.subfases.filter((subfase) => ids.includes(subfase.id))
}

export function estandaresDeManiobra(idManiobra: number): EstandarMock[] {
  return datosActuales.estandares.filter((estandar) => estandar.idManiobra === idManiobra)
}
```

Create `src/mocks/sigeda/personas.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { API, textoNoEncontrado } from './comun'
import { buscarPersona, buscarUsuarioPorNombre, rolPorId } from './datos'

export const handlersPersonas = [
  http.get(`${API}/api/personas/:nom`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nom))
    const persona = usuario ? buscarPersona(usuario.codPersona) : undefined
    if (!usuario || !persona) return textoNoEncontrado('Persona especificada no existe.')
    const rol = rolPorId(usuario.idRol)
    return HttpResponse.json({
      codigo: persona.codigo,
      nombre: persona.nombre,
      aPaterno: persona.aPaterno,
      aMaterno: persona.aMaterno,
      idGrupo: persona.idGrupo,
      usuario: {
        nombre: usuario.username,
        correo: usuario.correo,
        id: usuario.id,
        rol: rol && { id: rol.id, nombre: rol.nombre },
      },
    })
  }),
]
```

In `src/mocks/sigeda/turnos.ts`, replace:

```ts
import { esFechaIso, esHora, esPosteriorAHoy } from '@/lib/dominio/calendario'
import { permiteCambios, seSuperponen } from '@/lib/dominio/turno'
import { API, autorizar, errorResponse, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, nombreCorto, type AlumnoTurnoMock, type ProgramaMock, type TurnoMock } from './datos'

type CuerpoTurno = {
  nombre?: unknown
```

with:

```ts
import { esFechaIso, esHora, esPosteriorAHoy } from '@/lib/dominio/calendario'
import { permiteCambios, seSuperponen } from '@/lib/dominio/turno'
import { API, autorizar, errorResponse, paginar, textoNoEncontrado } from './comun'
import {
  buscarPersona,
  buscarSubfase,
  datos,
  nombreCorto,
  nombreDeFase,
  siguienteId,
  type AlumnoTurnoMock,
  type ProgramaMock,
  type TurnoMock,
} from './datos'

type CuerpoTurno = {
  nombre?: unknown
```

In `src/mocks/sigeda/turnos.ts`, replace:

```ts
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
```

with:

```ts
    const idSubfase = Number(cuerpo.idSubfase)
    const rechazo = validarGuardado(cuerpo, idSubfase, null)
    if (rechazo) return rechazo
    const subfase = buscarSubfase(idSubfase)
    const turno: TurnoMock = {
      id: siguienteId('turno'),
      nombre: '',
      fechaEval: '',
      programa: cuerpo.programa === 'PDE' ? 'PDE' : 'PDI',
      idSubfase,
      subfase: subfase?.nombre ?? '',
      fase: subfase ? nombreDeFase(subfase.idFase) : '',
      codInstructor: null,
      idAeronave: null,
      alumnos: [],
      maniobras: [],
    }
    aplicar(turno, cuerpo)
    datos().turnos.push(turno)
    return guardado(turno)
  }),
```

Replace `src/mocks/sigeda/usuarios.ts` with:

```ts
export type RolMock = { id: number; nombre: string; descripcion: string }

export type UsuarioMock = {
  id: number
  username: string
  correo: string
  codPersona: string
  idRol: number | null
  password: string
}

export const CONTRASENA_SEED = '123'

export const ROLES_MOCK: RolMock[] = [
  { id: 1, nombre: 'Alumno', descripcion: 'Usuario en entrenamiento con acceso a evaluaciones y reportes personales' },
  { id: 2, nombre: 'Administrador Web', descripcion: 'Control total del sistema y gestión de usuarios' },
  { id: 3, nombre: 'Jefe de Operaciones', descripcion: 'Supervisión de operaciones y gestión de programas' },
  { id: 4, nombre: 'Instructor', descripcion: 'Evaluación y seguimiento de alumnos' },
  { id: 5, nombre: 'Comandante de Escuadrón', descripcion: 'Gestión de grupos y supervisión de instructores' },
]

function usuario(id: number, username: string, correo: string, codPersona: string, idRol: number | null): UsuarioMock {
  return { id, username, correo, codPersona, idRol, password: CONTRASENA_SEED }
}

export function crearUsuarios(): UsuarioMock[] {
  return [
    usuario(1, 'jefe.operaciones', 'jefeoperaciones@sigeda.com', '333333', 3),
    usuario(2, 'instructor.perez', 'instructor@sigeda.com', '444444', 4),
    usuario(3, 'alumno.lopez', 'alumno1@sigeda.com', '111111', 1),
    usuario(4, 'alumno.falconi', 'alumno2@sigeda.com', '222222', 1),
    usuario(5, 'alumno.garcia', 'alumno3@sigeda.com', '555555', 1),
    usuario(6, 'alumno.torres', 'alumno4@sigeda.com', '666666', 1),
    usuario(7, 'alumno.ramirez', 'alumno5@sigeda.com', '777777', 1),
    usuario(8, 'instructor.mendoza', 'instructor2@sigeda.com', '888888', 4),
    usuario(9, 'alumno.castro', 'alumno6@sigeda.com', '999999', 1),
    usuario(10, 'admin.sistema', 'admin@sigeda.com', '000001', 2),
    usuario(11, 'comandante.aguirre', 'comandante@sigeda.com', '222444', 5),
    usuario(12, 'raul.paredes', 'raul.paredes@sigeda.com', '765432', null),
  ]
}
```

In `src/lib/auth/sesion.ts`, replace:

```ts
import { permisosDeRol, type Permiso } from './permisos'
import { tokens, usernameDelToken } from './tokens'

export type Sesion = {
  usuario: { id: number; username: string; correo: string | null }
  codPersona: string | null
  rol: { id: number; nombre: string }
  permisos: ReadonlySet<Permiso>
}

export const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos.'

const CUENTA_INVALIDA = new Set([401, 403, 404])

const esquemaUsuario = z.object({
  id: z.number(),
  username: z.string(),
  correo: z.string().nullish(),
  codPersona: z.string().nullish(),
  rol: z.object({ id: z.number(), nombre: z.string() }),
})

type RespuestaLogin = { token: string; refresh_token: string; username: string }

let actual: Sesion | null = null
const oyentes = new Set<() => void>()

function fijar(nueva: Sesion | null) {
  actual = nueva
  oyentes.forEach((oyente) => oyente())
}

async function cargar(username: string): Promise<Sesion> {
  const datos = esquemaUsuario.parse(await sigeda.get(`/api/usuarios/nombre/${encodeURIComponent(username)}`))
  return {
    usuario: { id: datos.id, username: datos.username, correo: datos.correo ?? null },
    codPersona: datos.codPersona ?? null,
    rol: { id: datos.rol.id, nombre: datos.rol.nombre },
    permisos: permisosDeRol(datos.rol.nombre),
  }
}
```

with:

```ts
import { permisosDeRol, type Permiso } from './permisos'
import { tokens, usernameDelToken } from './tokens'

export type PersonaDeSesion = { nombre: string; aPaterno: string; aMaterno: string; idGrupo: number | null }

export type Sesion = {
  usuario: { id: number; username: string; correo: string | null }
  codPersona: string | null
  persona: PersonaDeSesion
  rol: { id: number; nombre: string }
  permisos: ReadonlySet<Permiso>
}

export const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos.'
export const MENSAJE_SIN_ROL = 'Su cuenta no tiene un rol asignado. Comuníquese con el administrador.'

export class CuentaSinRolError extends ApiError {
  constructor() {
    super(403, MENSAJE_SIN_ROL)
    this.name = 'CuentaSinRolError'
  }
}

const CUENTA_INVALIDA = new Set([401, 403, 404])

const esquemaPersona = z.object({
  codigo: z.string().nullish(),
  nombre: z.string(),
  aPaterno: z.string().nullish(),
  aMaterno: z.string().nullish(),
  idGrupo: z.number().nullish(),
  usuario: z.object({
    id: z.number(),
    nombre: z.string(),
    correo: z.string().nullish(),
    rol: z.object({ id: z.number(), nombre: z.string() }).nullish(),
  }),
})

type RespuestaLogin = { token: string; refresh_token: string; username: string }

let actual: Sesion | null = null
let aviso: string | null = null
const oyentes = new Set<() => void>()

export function nombreDeSesion(persona: PersonaDeSesion): string {
  return [persona.nombre, persona.aPaterno].filter(Boolean).join(' ')
}

function fijar(nueva: Sesion | null) {
  actual = nueva
  if (nueva) aviso = null
  oyentes.forEach((oyente) => oyente())
}

async function cargar(username: string): Promise<Sesion> {
  const datos = esquemaPersona.parse(await sigeda.get(`/api/personas/${encodeURIComponent(username)}`))
  if (!datos.usuario.rol) throw new CuentaSinRolError()
  return {
    usuario: { id: datos.usuario.id, username: datos.usuario.nombre, correo: datos.usuario.correo ?? null },
    codPersona: datos.codigo ?? null,
    persona: {
      nombre: datos.nombre,
      aPaterno: datos.aPaterno ?? '',
      aMaterno: datos.aMaterno ?? '',
      idGrupo: datos.idGrupo ?? null,
    },
    rol: { id: datos.usuario.rol.id, nombre: datos.usuario.rol.nombre },
    permisos: permisosDeRol(datos.usuario.rol.nombre),
  }
}
```

In `src/lib/auth/sesion.ts`, replace:

```ts

export const sesion = {
  actual: (): Sesion | null => actual,
  suscribir(oyente: () => void) {
    oyentes.add(oyente)
    return () => {
```

with:

```ts

export const sesion = {
  actual: (): Sesion | null => actual,
  aviso: (): string | null => aviso,
  suscribir(oyente: () => void) {
    oyentes.add(oyente)
    return () => {
```

In `src/lib/auth/sesion.ts`, replace:

```ts
      fijar(restaurada)
      return restaurada
    } catch (error) {
      if (error instanceof ApiError && CUENTA_INVALIDA.has(error.status)) tokens.limpiar()
      return null
    }
```

with:

```ts
      fijar(restaurada)
      return restaurada
    } catch (error) {
      if (error instanceof CuentaSinRolError) {
        tokens.limpiar()
        aviso = MENSAJE_SIN_ROL
        return null
      }
      if (error instanceof ApiError && CUENTA_INVALIDA.has(error.status)) tokens.limpiar()
      return null
    }
```

In `src/lib/auth/sesion.ts`, replace:

```ts
    const refresh = tokens.refresh()
    if (refresh) await sigeda.post('/auth/logout', { refreshToken: refresh }).catch(() => undefined)
    tokens.limpiar()
    fijar(null)
  },
  expirar() {
    tokens.limpiar()
    fijar(null)
  },
}
```

with:

```ts
    const refresh = tokens.refresh()
    if (refresh) await sigeda.post('/auth/logout', { refreshToken: refresh }).catch(() => undefined)
    tokens.limpiar()
    aviso = null
    fijar(null)
  },
  expirar() {
    tokens.limpiar()
    aviso = null
    fijar(null)
  },
}
```

- [ ] **Step 4: Write the screens**

In `src/components/menu-usuario.tsx`, replace:

```tsx
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { sesion } from '@/lib/auth/sesion'
import { useSesion } from '@/lib/auth/use-sesion'

function iniciales(username: string) {
  return username
    .split(/[._\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
```

with:

```tsx
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { nombreDeSesion, sesion } from '@/lib/auth/sesion'
import { useSesion } from '@/lib/auth/use-sesion'

function iniciales(nombre: string) {
  return nombre
    .split(/[._\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
```

In `src/components/menu-usuario.tsx`, replace:

```tsx
  const actual = useSesion()
  const { theme, setTheme } = useTheme()
  if (!actual) return null
  const { username } = actual.usuario

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2" aria-label={`Cuenta de ${username}`}>
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{iniciales(username)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight sm:grid">
            <span className="text-sm font-medium">{username}</span>
            <span className="text-xs text-muted-foreground">{actual.rol.nombre}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
```

with:

```tsx
  const actual = useSesion()
  const { theme, setTheme } = useTheme()
  if (!actual) return null
  const nombre = nombreDeSesion(actual.persona)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2" aria-label={`Cuenta de ${nombre}`}>
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{iniciales(nombre)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight sm:grid">
            <span className="text-sm font-medium">{nombre}</span>
            <span className="text-xs text-muted-foreground">{actual.rol.nombre}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
```

In `src/components/menu-usuario.tsx`, replace:

```tsx
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid">
          <span>{username}</span>
          <span className="text-xs font-normal text-muted-foreground">{actual.rol.nombre}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
```

with:

```tsx
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid">
          <span>{nombre}</span>
          <span className="text-xs font-normal text-muted-foreground">{actual.usuario.username}</span>
          <span className="text-xs font-normal text-muted-foreground">{actual.rol.nombre}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
```

In `src/features/auth/login-page.tsx`, replace:

```tsx
type Credenciales = z.infer<typeof esquema>

export function LoginPage() {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const formulario = useForm<Credenciales>({
    resolver: zodResolver(esquema),
    defaultValues: { username: '', password: '' },
```

with:

```tsx
type Credenciales = z.infer<typeof esquema>

export function LoginPage() {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(() => sesion.aviso())
  const formulario = useForm<Credenciales>({
    resolver: zodResolver(esquema),
    defaultValues: { username: '', password: '' },
```

In `src/features/inicio/inicio-page.tsx`, replace:

```tsx
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { accesosPara } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'

export function InicioPage() {
```

with:

```tsx
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { accesosPara } from '@/lib/auth/pantallas'
import { nombreDeSesion } from '@/lib/auth/sesion'
import { useSesion } from '@/lib/auth/use-sesion'

export function InicioPage() {
```

In `src/features/inicio/inicio-page.tsx`, replace:

```tsx
    <>
      <PageHeader
        titulo="Inicio"
        descripcion={`Hola, ${actual.usuario.username}.`}
        acciones={<Badge variant="secondary">{actual.rol.nombre}</Badge>}
      />
      <section aria-labelledby="titulo-accesos" className="grid gap-3">
```

with:

```tsx
    <>
      <PageHeader
        titulo="Inicio"
        descripcion={`Hola, ${nombreDeSesion(actual.persona)}.`}
        acciones={<Badge variant="secondary">{actual.rol.nombre}</Badge>}
      />
      <section aria-labelledby="titulo-accesos" className="grid gap-3">
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/auth src/features/auth src/features/inicio src/components/app-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 330 tests.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: build the session from the persona endpoint"
```

---

### Task 3: Cuentas: usuario mutations that keep only the message (M2-3) and business-rule 403 (M2-4) (CA-PER-13, CA-CTA-01)

**Files:**

- Test: `src/features/auth/cambiar-contrasena-page.test.tsx`
- Modify: `src/features/auth/cambiar-contrasena-page.tsx`
- Create: `src/features/cuentas/api.test.ts`
- Create: `src/features/cuentas/api.ts`
- Test: `src/lib/api/errors.test.ts`
- Modify: `src/lib/api/errors.ts`
- Create: `src/lib/dominio/personas.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/mocks/sigeda/auth.ts`
- Modify: `src/mocks/sigeda/comun.ts`
- Create: `src/mocks/sigeda/cuentas.ts`

**Interfaces:**
- Consumes: M0's `normalizarError`, `ApiError`, `CambiarContrasenaPage`, `aplicarErroresDeCampo`; the store and `autorizar` of Task 2.
- Produces:
  - `src/features/cuentas/api.ts`: `soloMensaje` (zod, keeps `{mensaje}` only), `listarRoles`, `asignarRol`, `restablecerContrasena`, `cambiarContrasenaPropia`, `consultasCuentas.roles()`. No adapter ever returns the `usuario` the backend echoes, so the password never reaches app state or the console.
  - `src/lib/dominio/personas.ts`: `TIPOS_PERSONA`, `SIN_TIPO`, `rolesCompatibles`, `tiposCompatibles`, `rolPorDefecto`, `rolCompatible`, `esTipoPersona`, `etiquetaDeTipo` (M2-13, keyed by rol name).
  - `src/mocks/sigeda/cuentas.ts` implements contract §2.1–§2.3: `GET /api/roles`, `PUT /api/usuarios/{id}/rol` (missing rol, unknown user, unknown rol, tipo–rol rule) and `PUT /api/usuarios/{id}` (own account or `Manage Users`, username/password/`passwordActual` validation). `erroresDeUsername` and `erroresDeContrasena` are exported for Registrar persona (Task 9).
  - `normalizarError`: a **403 with a plain-text body** is a business rule and shows its text; a 403 `ErrorResponse` or an empty body keeps `MENSAJE_SIN_PERMISO`.
  - Cambiar contraseña asks for the current password and sends `{username, password, passwordActual}` (contract §2.3, dependency 3), shows the backend's field errors and toasts only `mensaje`.

- [ ] **Step 1: Write the failing tests**

In `src/features/auth/cambiar-contrasena-page.test.tsx`, replace:

```tsx
describe('CA-CTA-01 Cambiar contraseña', () => {
  it('CA-CTA-01 exige repetir la contraseña nueva exactamente', async () => {
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-2')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
```

with:

```tsx
describe('CA-CTA-01 Cambiar contraseña', () => {
  it('CA-CTA-01 exige repetir la contraseña nueva exactamente', async () => {
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña actual'), '123')
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-2')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
```

In `src/features/auth/cambiar-contrasena-page.test.tsx`, replace:

```tsx

  it('CA-CTA-01 exige al menos 8 caracteres', async () => {
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'corta')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'corta')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('CA-CTA-01 guarda enviando el usuario actual y muestra el mensaje del backend', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${config.sigedaApiUrl}/api/usuarios/:id`, async ({ request, params }) => {
        recibido = { id: params.id, ...((await request.json()) as object) }
        return HttpResponse.json({ mensaje: 'Usuario guardada con éxito.' }, { status: 201 })
      }),
    )
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Usuario guardada con éxito.')).toBeInTheDocument()
    expect(recibido).toEqual({ id: '2', username: 'instructor.perez', password: 'clave-segura-1' })
  })

  it('muestra el error del backend sin detalles internos', async () => {
```

with:

```tsx

  it('CA-CTA-01 exige al menos 8 caracteres', async () => {
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña actual'), '123')
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'corta')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'corta')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('CA-CTA-01 guarda enviando el usuario y la contraseña actual, y muestra el mensaje del backend', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${config.sigedaApiUrl}/api/usuarios/:id`, async ({ request, params }) => {
        recibido = { id: params.id, ...((await request.json()) as object) }
        return HttpResponse.json(
          {
            mensaje: 'Usuario guardada con éxito.',
            usuario: { id: 2, username: 'instructor.perez', password: '$2a$10$hashQueNoDebeLlegar' },
          },
          { status: 201 },
        )
      }),
    )
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña actual'), '123')
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Usuario guardada con éxito.')).toBeInTheDocument()
    expect(recibido).toEqual({
      id: '2',
      username: 'instructor.perez',
      password: 'clave-segura-1',
      passwordActual: '123',
    })
  })

  it('CA-CTA-01 avisa bajo el campo cuando la contraseña actual no es correcta', async () => {
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña actual'), 'equivocada')
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument()
  })

  it('muestra el error del backend sin detalles internos', async () => {
```

In `src/features/auth/cambiar-contrasena-page.test.tsx`, replace:

```tsx
      ),
    )
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
```

with:

```tsx
      ),
    )
    const { usuario } = await abrirCuenta()
    await usuario.type(screen.getByLabelText('Contraseña actual'), '123')
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(screen.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
```

Create `src/features/cuentas/api.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import { asignarRol, cambiarContrasenaPropia, listarRoles, restablecerContrasena, soloMensaje } from './api'

const API = config.sigedaApiUrl

const RESPUESTA_CON_CONTRASENA = {
  mensaje: 'Usuario guardada con éxito.',
  usuario: {
    id: 3,
    username: 'alumno.lopez',
    correo: 'alumno1@sigeda.com',
    password: '$2a$10$hashQueNuncaDebeLlegarALaAplicacion',
    rol: { id: 1, nombre: 'Alumno', descripcion: null },
  },
}

describe('api de cuentas', () => {
  it('M2-9 lista los roles del backend', async () => {
    await iniciarComo('admin.sistema')
    const roles = await listarRoles()
    expect(roles.map((rol) => rol.nombre)).toEqual([
      'Alumno',
      'Administrador Web',
      'Jefe de Operaciones',
      'Instructor',
      'Comandante de Escuadrón',
    ])
  })

  it('CA-PER-08 asigna el rol con el cuerpo que espera el backend', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${API}/api/usuarios/:id/rol`, async ({ request, params }) => {
        recibido = { id: params.id, ...((await request.json()) as object) }
        return HttpResponse.json(RESPUESTA_CON_CONTRASENA, { status: 201 })
      }),
    )
    await iniciarComo('admin.sistema')
    await expect(asignarRol(3, 1)).resolves.toBe('Usuario guardada con éxito.')
    expect(recibido).toEqual({ id: '3', rol: { id: 1 } })
  })

  it('CA-PER-09 restablece la contraseña enviando siempre el usuario', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${API}/api/usuarios/:id`, async ({ request, params }) => {
        recibido = { id: params.id, ...((await request.json()) as object) }
        return HttpResponse.json(RESPUESTA_CON_CONTRASENA, { status: 201 })
      }),
    )
    await iniciarComo('admin.sistema')
    await expect(restablecerContrasena(3, 'alumno.lopez', 'clave-segura-1')).resolves.toBe('Usuario guardada con éxito.')
    expect(recibido).toEqual({ id: '3', username: 'alumno.lopez', password: 'clave-segura-1' })
  })

  it('CA-PER-13 de las respuestas de usuarios solo conserva el mensaje', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(
      http.put(`${API}/api/usuarios/:id/rol`, () => HttpResponse.json(RESPUESTA_CON_CONTRASENA, { status: 201 })),
      http.put(`${API}/api/usuarios/:id`, () => HttpResponse.json(RESPUESTA_CON_CONTRASENA, { status: 201 })),
    )
    await iniciarComo('admin.sistema')
    const respuestas = [
      await asignarRol(3, 1),
      await restablecerContrasena(3, 'alumno.lopez', 'clave-segura-1'),
      await cambiarContrasenaPropia(10, 'admin.sistema', 'clave-segura-1', '123'),
    ]
    expect(respuestas).toEqual(Array.from({ length: 3 }, () => 'Usuario guardada con éxito.'))
    expect(JSON.stringify(respuestas)).not.toContain('$2a$')
    expect(consola).not.toHaveBeenCalled()
  })

  it('M2-3 usa el mensaje por defecto si el backend no devuelve uno', () => {
    expect(soloMensaje({ usuario: { password: 'secreta' } })).toBe('Usuario guardada con éxito.')
    expect(soloMensaje('texto')).toBe('Usuario guardada con éxito.')
  })

  it('CA-PER-13 la contraseña actual incorrecta llega como error del campo', async () => {
    await iniciarComo('admin.sistema')
    await expect(cambiarContrasenaPropia(10, 'admin.sistema', 'clave-segura-1', 'otra')).rejects.toMatchObject({
      erroresDeCampo: { passwordActual: 'La contraseña actual no es correcta.' },
    })
  })

  it('M2-13 el backend rechaza un rol incompatible con el tipo de la persona', async () => {
    await iniciarComo('admin.sistema')
    await expect(asignarRol(3, 4)).rejects.toMatchObject({
      status: 400,
      message: 'El rol no corresponde al tipo de persona.',
    })
    await expect(asignarRol(3, 99)).rejects.toBeInstanceOf(ApiError)
  })
})
```

In `src/lib/api/errors.test.ts`, replace:

```ts
    expect(normalizarError(403, { error: 'Forbidden' }).message).toBe(MENSAJE_SIN_PERMISO)
  })

  it('usa un mensaje genérico cuando el cuerpo no se entiende', () => {
    expect(normalizarError(500, null).message).toBe(MENSAJE_GENERICO)
  })
```

with:

```ts
    expect(normalizarError(403, { error: 'Forbidden' }).message).toBe(MENSAJE_SIN_PERMISO)
  })

  it('M2-4 un 403 con texto plano es una regla de negocio y muestra su mensaje', () => {
    expect(normalizarError(403, 'No se puede eliminar alumno, ya realizó una evaluación.').message).toBe(
      'No se puede eliminar alumno, ya realizó una evaluación.',
    )
  })

  it('M2-4 un 403 sin cuerpo o con forma ErrorResponse sigue siendo falta de permisos', () => {
    expect(normalizarError(403, null).message).toBe(MENSAJE_SIN_PERMISO)
    expect(
      normalizarError(403, {
        timestamp: '2026-09-19T10:00:00',
        status: 403,
        error: 'Acceso denegado',
        message: 'No tienes permisos para realizar esta acción',
      }).message,
    ).toBe(MENSAJE_SIN_PERMISO)
  })

  it('usa un mensaje genérico cuando el cuerpo no se entiende', () => {
    expect(normalizarError(500, null).message).toBe(MENSAJE_GENERICO)
  })
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/api/errors.test.ts src/features/cuentas src/features/auth
```

Expected: FAIL — `Error: Failed to resolve import "./api" from "src/features/cuentas/api.test.ts". Does the file exist?`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/mocks/handlers.ts`, replace:

```ts
import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

with:

```ts
import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

In `src/mocks/handlers.ts`, replace:

```ts
export const handlers: RequestHandler[] = [
  ...handlersAuth,
  ...handlersCatalogos,
  ...handlersPersonas,
  ...handlersTurnos,
  ...handlersEvaluaciones,
```

with:

```ts
export const handlers: RequestHandler[] = [
  ...handlersAuth,
  ...handlersCatalogos,
  ...handlersCuentas,
  ...handlersPersonas,
  ...handlersTurnos,
  ...handlersEvaluaciones,
```

In `src/mocks/sigeda/auth.ts`, replace:

```ts
import { http, HttpResponse } from 'msw'
import { usernameDelToken } from '@/lib/auth/tokens'
import { config } from '@/lib/config'
import { buscarUsuarioPorId, buscarUsuarioPorNombre, rolPorId } from './datos'
import type { UsuarioMock } from './usuarios'

const API = config.sigedaApiUrl
```

with:

```ts
import { http, HttpResponse } from 'msw'
import { usernameDelToken } from '@/lib/auth/tokens'
import { config } from '@/lib/config'
import { buscarUsuarioPorNombre, rolPorId } from './datos'
import type { UsuarioMock } from './usuarios'

const API = config.sigedaApiUrl
```

In `src/mocks/sigeda/auth.ts`, replace:

```ts
      password: HASH_DE_PRUEBA,
    })
  }),
  http.put(`${API}/api/usuarios/:id`, async ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const cuerpo = (await request.json()) as { username?: string }
    const usuario = buscarUsuarioPorId(Number(params.id))
    if (!usuario) return HttpResponse.text('Usuario especificada no existe.', { status: 404 })
    return HttpResponse.json(
      {
        mensaje: 'Usuario guardada con éxito.',
        usuario: { ...usuario, username: cuerpo.username ?? usuario.username, password: HASH_DE_PRUEBA },
      },
      { status: 201 },
    )
  }),
]
```

with:

```ts
      password: HASH_DE_PRUEBA,
    })
  }),
]
```

In `src/mocks/sigeda/comun.ts`, replace:

```ts
  return HttpResponse.text(mensaje, { status: 404 })
}

export function numero(url: URL, clave: string, porDefecto: number): number {
  const valor = Number(url.searchParams.get(clave) ?? porDefecto)
  return Number.isFinite(valor) ? valor : porDefecto
```

with:

```ts
  return HttpResponse.text(mensaje, { status: 404 })
}

export function textoMalaPeticion(mensaje: string) {
  return HttpResponse.text(mensaje, { status: 400 })
}

export function textoProhibido(mensaje: string) {
  return HttpResponse.text(mensaje, { status: 403 })
}

export function erroresDeCampo(errores: readonly string[]) {
  return HttpResponse.json(errores, { status: 400 })
}

export function guardado(entidad: string, clave: string, cuerpo: unknown) {
  return HttpResponse.json({ mensaje: `${entidad} guardada con éxito.`, [clave]: cuerpo }, { status: 201 })
}

export function textoEliminado(entidad: string) {
  return HttpResponse.text(`${entidad} eliminado con éxito.`)
}

export function numero(url: URL, clave: string, porDefecto: number): number {
  const valor = Number(url.searchParams.get(clave) ?? porDefecto)
  return Number.isFinite(valor) ? valor : porDefecto
```

Create `src/mocks/sigeda/cuentas.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { rolCompatible } from '@/lib/dominio/personas'
import { noAutorizado, usuarioAutenticado } from './auth'
import { API, autorizar, erroresDeCampo, guardado, textoMalaPeticion, textoNoEncontrado } from './comun'
import { buscarPersona, buscarUsuarioPorId, datos, rolPorId } from './datos'
import { ROLES_MOCK, type UsuarioMock } from './usuarios'

const PATRON_USUARIO = /^[a-z0-9._]{4,30}$/

export function erroresDeUsername(username: unknown, campo: string, idPropio: number | null): string[] {
  if (typeof username !== 'string' || username.trim() === '') return [`'${campo}': El nombre de usuario es obligatorio.`]
  if (!PATRON_USUARIO.test(username)) {
    return [`'${campo}': El nombre de usuario debe tener de 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.`]
  }
  const enUso = datos().usuarios.some((usuario) => usuario.username === username && usuario.id !== idPropio)
  return enUso ? [`'${campo}': El nombre de usuario ya está en uso.`] : []
}

export function erroresDeContrasena(password: unknown, campo: string): string[] {
  if (typeof password !== 'string' || password === '') return [`'${campo}': La contraseña es obligatoria.`]
  return password.length < 8 ? [`'${campo}': La contraseña debe tener al menos 8 caracteres.`] : []
}

function erroresDeContrasenaActual(valor: unknown, usuario: UsuarioMock): string[] {
  if (typeof valor !== 'string' || valor === '') return ["'passwordActual': La contraseña actual es obligatoria."]
  return valor === usuario.password ? [] : ["'passwordActual': La contraseña actual no es correcta."]
}

function cuerpoDeUsuario(usuario: UsuarioMock) {
  return {
    id: usuario.id,
    username: usuario.username,
    correo: usuario.correo,
    codPersona: usuario.codPersona,
    password: usuario.password,
    rol: rolPorId(usuario.idRol),
  }
}

export const handlersCuentas = [
  http.get(`${API}/api/roles`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Roles')
    if (permitido instanceof Response) return permitido
    if (ROLES_MOCK.length === 0) return textoNoEncontrado('No existen roles disponibles.')
    return HttpResponse.json(ROLES_MOCK)
  }),
  http.put(`${API}/api/usuarios/:id/rol`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Roles')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as { rol?: { id?: unknown } | null }
    if (!cuerpo.rol) return textoMalaPeticion('Selecciones roles a asignar.')
    const usuario = buscarUsuarioPorId(Number(params.id))
    if (!usuario) return textoNoEncontrado('Usuario especificada no existe.')
    const rol = rolPorId(Number(cuerpo.rol.id))
    if (!rol) return textoNoEncontrado('Rol especificada no existe.')
    const persona = buscarPersona(usuario.codPersona)
    if (!rolCompatible(persona?.tipo ?? null, rol.nombre)) {
      return textoMalaPeticion('El rol no corresponde al tipo de persona.')
    }
    usuario.idRol = rol.id
    return guardado('Usuario', 'usuario', cuerpoDeUsuario(usuario))
  }),
  http.put(`${API}/api/usuarios/:id`, async ({ request, params }) => {
    const autenticado = usuarioAutenticado(request)
    if (!autenticado) return noAutorizado()
    const esPropia = autenticado.id === Number(params.id)
    if (!esPropia) {
      const permitido = autorizar(request, 'Manage Users')
      if (permitido instanceof Response) return permitido
    }
    const usuario = buscarUsuarioPorId(Number(params.id))
    if (!usuario) return textoNoEncontrado('Usuario especificada no existe.')
    const cuerpo = (await request.json()) as { username?: unknown; password?: unknown; passwordActual?: unknown }
    const errores = [
      ...erroresDeUsername(cuerpo.username, 'username', usuario.id),
      ...erroresDeContrasena(cuerpo.password, 'password'),
      ...(esPropia ? erroresDeContrasenaActual(cuerpo.passwordActual, usuario) : []),
    ]
    if (errores.length > 0) return erroresDeCampo(errores)
    usuario.username = String(cuerpo.username)
    usuario.password = String(cuerpo.password)
    return guardado('Usuario', 'usuario', cuerpoDeUsuario(usuario))
  }),
]
```

In `src/lib/api/errors.ts`, replace:

```ts
    const regla = mensajeDeRegla(cuerpo)
    if (regla) return new ApiError(status, regla)
  }
  if (status === 403) return new ApiError(status, MENSAJE_SIN_PERMISO)
  if (esListaDeTextos(cuerpo)) return desdeLineas(status, cuerpo)
  if (esTexto(cuerpo)) return new ApiError(status, cuerpo.trim())
  if (esRegistro(cuerpo)) {
```

with:

```ts
    const regla = mensajeDeRegla(cuerpo)
    if (regla) return new ApiError(status, regla)
  }
  if (status === 403) return new ApiError(status, esTexto(cuerpo) ? cuerpo.trim() : MENSAJE_SIN_PERMISO)
  if (esListaDeTextos(cuerpo)) return desdeLineas(status, cuerpo)
  if (esTexto(cuerpo)) return new ApiError(status, cuerpo.trim())
  if (esRegistro(cuerpo)) {
```

Create `src/lib/dominio/personas.ts`:

```ts
export const TIPOS_PERSONA = ['Alumno', 'Instructor PDI', 'Instructor PDE'] as const

export type TipoPersona = (typeof TIPOS_PERSONA)[number]

export const SIN_TIPO = 'Sin tipo'

const ROLES_POR_TIPO: Record<string, readonly string[]> = {
  Alumno: ['Alumno'],
  'Instructor PDI': ['Instructor', 'Jefe de Operaciones', 'Comandante de Escuadrón'],
  'Instructor PDE': ['Instructor', 'Jefe de Operaciones', 'Comandante de Escuadrón'],
  '': ['Jefe de Operaciones', 'Comandante de Escuadrón', 'Administrador Web'],
}

export function esTipoPersona(valor: unknown): valor is TipoPersona {
  return typeof valor === 'string' && TIPOS_PERSONA.some((tipo) => tipo === valor)
}

export function rolesCompatibles(tipo: string | null): readonly string[] {
  return ROLES_POR_TIPO[tipo ?? ''] ?? []
}

export function tiposCompatibles(rol: string | null): readonly (TipoPersona | null)[] {
  const tipos: (TipoPersona | null)[] = [...TIPOS_PERSONA, null]
  if (!rol) return tipos
  return tipos.filter((tipo) => rolesCompatibles(tipo).includes(rol))
}

export function rolPorDefecto(tipo: string | null): string | null {
  if (tipo === 'Alumno') return 'Alumno'
  if (tipo === 'Instructor PDI' || tipo === 'Instructor PDE') return 'Instructor'
  return null
}

export function rolCompatible(tipo: string | null, rol: string | null): boolean {
  return rol !== null && rolesCompatibles(tipo).includes(rol)
}

export function etiquetaDeTipo(tipo: string | null): string {
  return tipo ?? '—'
}
```

- [ ] **Step 4: Write the API, the schemas and the columns**

Create `src/features/cuentas/api.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sigeda } from '@/lib/api/sigeda'

export type Rol = { id: number; nombre: string; descripcion: string | null }

export const MENSAJE_CUENTA_GUARDADA = 'Usuario guardada con éxito.'

const esquemaMensaje = z.object({ mensaje: z.string() })

export function soloMensaje(respuesta: unknown, porDefecto: string = MENSAJE_CUENTA_GUARDADA): string {
  const leido = esquemaMensaje.safeParse(respuesta)
  return leido.success ? leido.data.mensaje : porDefecto
}

export const clavesCuentas = {
  todo: ['cuentas'] as const,
  roles: () => [...clavesCuentas.todo, 'roles'] as const,
}

export async function listarRoles(): Promise<Rol[]> {
  const roles = await sigeda.lista<{ id: number; nombre: string; descripcion?: string | null }>('/api/roles')
  return roles.map((rol) => ({ id: rol.id, nombre: rol.nombre, descripcion: rol.descripcion ?? null }))
}

export async function asignarRol(idUsuario: number, idRol: number): Promise<string> {
  const respuesta = await sigeda.put<unknown>(`/api/usuarios/${encodeURIComponent(idUsuario)}/rol`, {
    rol: { id: idRol },
  })
  return soloMensaje(respuesta)
}

export async function restablecerContrasena(idUsuario: number, username: string, password: string): Promise<string> {
  const respuesta = await sigeda.put<unknown>(`/api/usuarios/${encodeURIComponent(idUsuario)}`, { username, password })
  return soloMensaje(respuesta)
}

export async function cambiarContrasenaPropia(
  idUsuario: number,
  username: string,
  password: string,
  passwordActual: string,
): Promise<string> {
  const respuesta = await sigeda.put<unknown>(`/api/usuarios/${encodeURIComponent(idUsuario)}`, {
    username,
    password,
    passwordActual,
  })
  return soloMensaje(respuesta)
}

export const consultasCuentas = {
  roles: () => queryOptions({ queryKey: clavesCuentas.roles(), queryFn: listarRoles, staleTime: 300_000 }),
}
```

- [ ] **Step 5: Write the screens**

In `src/features/auth/cambiar-contrasena-page.tsx`, replace:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { useSesion } from '@/lib/auth/use-sesion'

const esquema = z
  .object({
    nueva: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmacion: z.string().min(1, 'Repita la contraseña nueva.'),
  })
```

with:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cambiarContrasenaPropia } from '@/features/cuentas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { useSesion } from '@/lib/auth/use-sesion'
import { aplicarErroresDeCampo } from '@/lib/formularios'

const RENOMBRAR = { password: 'nueva', passwordActual: 'actual' }

const esquema = z
  .object({
    actual: z.string().min(1, 'Ingrese su contraseña actual.'),
    nueva: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmacion: z.string().min(1, 'Repita la contraseña nueva.'),
  })
```

In `src/features/auth/cambiar-contrasena-page.tsx`, replace:

```tsx
  })

type Formulario = z.infer<typeof esquema>
type RespuestaGuardado = { mensaje: string }

export function CambiarContrasenaPage() {
  const actual = useSesion()
  const formulario = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nueva: '', confirmacion: '' },
  })
  const { errors } = formulario.formState

  const cambio = useMutation({
    mutationFn: (datos: Formulario) => {
      if (!actual) throw new ApiError(401, MENSAJE_GENERICO)
      return sigeda.put<RespuestaGuardado>(`/api/usuarios/${actual.usuario.id}`, {
        username: actual.usuario.username,
        password: datos.nueva,
      })
    },
    onSuccess: (respuesta) => {
      toast.success(respuesta.mensaje)
      formulario.reset()
    },
  })

  return (
```

with:

```tsx
  })

type Formulario = z.infer<typeof esquema>

export function CambiarContrasenaPage() {
  const actual = useSesion()
  const formulario = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { actual: '', nueva: '', confirmacion: '' },
  })
  const { errors } = formulario.formState

  const cambio = useMutation({
    mutationFn: (datos: Formulario) => {
      if (!actual) throw new ApiError(401, MENSAJE_GENERICO)
      return cambiarContrasenaPropia(actual.usuario.id, actual.usuario.username, datos.nueva, datos.actual)
    },
    onSuccess: (mensaje) => {
      toast.success(mensaje)
      formulario.reset()
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError, RENOMBRAR)
    },
  })

  return (
```

In `src/features/auth/cambiar-contrasena-page.tsx`, replace:

```tsx
                  </AlertDescription>
                </Alert>
              )}
              <Field data-invalid={Boolean(errors.nueva)}>
                <FieldLabel htmlFor="nueva">Contraseña nueva</FieldLabel>
                <Input
```

with:

```tsx
                  </AlertDescription>
                </Alert>
              )}
              <Field data-invalid={Boolean(errors.actual)}>
                <FieldLabel htmlFor="actual">Contraseña actual</FieldLabel>
                <Input
                  id="actual"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.actual)}
                  {...formulario.register('actual')}
                />
                <FieldError errors={[errors.actual]} />
              </Field>
              <Field data-invalid={Boolean(errors.nueva)}>
                <FieldLabel htmlFor="nueva">Contraseña nueva</FieldLabel>
                <Input
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/api/errors.test.ts src/features/cuentas src/features/auth
```

Expected: PASS.

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 340 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add cuenta mutations and business-rule 403"
```

---

### Task 4: Capability module, contract permissions, screen registry and M2 routes (M2-9, M2-12, M2-14) (CA-DEP-01, CA-DEP-02, CA-PER-11, CA-GRU-01, CA-FAS-01, CA-MAN-01, CA-EST-01, CA-MAT-01)

**Files:**

- Modify: `.env.example`
- Modify: `src/env.d.ts`
- Create: `src/features/fases/fase-page.tsx`
- Create: `src/features/fases/fases-page.tsx`
- Create: `src/features/fases/modificar-fase-page.tsx`
- Create: `src/features/fases/registrar-fase-page.tsx`
- Create: `src/features/grupos/grupo-page.tsx`
- Create: `src/features/grupos/grupos-page.tsx`
- Create: `src/features/grupos/modificar-grupo-page.tsx`
- Create: `src/features/grupos/registrar-grupo-page.tsx`
- Create: `src/features/maniobras/estandares-page.tsx`
- Create: `src/features/maniobras/maniobra-page.tsx`
- Create: `src/features/maniobras/maniobras-page.tsx`
- Create: `src/features/maniobras/modificar-maniobra-page.tsx`
- Create: `src/features/maniobras/registrar-maniobra-page.tsx`
- Create: `src/features/materias/materias-page.tsx`
- Create: `src/features/personas/persona-page.tsx`
- Create: `src/features/personas/personas-page.tsx`
- Create: `src/features/personas/registrar-persona-page.tsx`
- Test: `src/lib/auth/pantallas.test.ts`
- Modify (full rewrite): `src/lib/auth/pantallas.ts`
- Test: `src/lib/auth/permisos.test.ts`
- Modify: `src/lib/auth/permisos.ts`
- Create: `src/lib/auth/rutas-m2.test.tsx`
- Modify: `src/lib/config.ts`
- Create: `src/lib/dependencias.test.ts`
- Create: `src/lib/dependencias.ts`
- Generated: `src/routeTree.gen.ts`
- Create: `src/routes/_app/grupos/$id/editar.tsx`
- Create: `src/routes/_app/grupos/$id/index.tsx`
- Create: `src/routes/_app/grupos/index.tsx`
- Create: `src/routes/_app/grupos/nuevo.tsx`
- Create: `src/routes/_app/personas/$cod.tsx`
- Create: `src/routes/_app/personas/index.tsx`
- Create: `src/routes/_app/personas/nueva.tsx`
- Create: `src/routes/_app/programa/fases/$id/editar.tsx`
- Create: `src/routes/_app/programa/fases/$id/index.tsx`
- Create: `src/routes/_app/programa/fases/index.tsx`
- Create: `src/routes/_app/programa/fases/nueva.tsx`
- Create: `src/routes/_app/programa/maniobras/$id/editar.tsx`
- Create: `src/routes/_app/programa/maniobras/$id/estandares.tsx`
- Create: `src/routes/_app/programa/maniobras/$id/index.tsx`
- Create: `src/routes/_app/programa/maniobras/index.tsx`
- Create: `src/routes/_app/programa/maniobras/nueva.tsx`
- Create: `src/routes/_app/programa/materias.tsx`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: M0/M1's `PANTALLAS`, `exigirPantalla`, `menuPara`, `migasPara`, `permisosDeRol`, `config`.
- Produces:
  - `config.mockApi` and `config.dependenciasResueltas` become getters, so `vi.stubEnv` changes them per test; `VITE_DEPENDENCIAS_RESUELTAS` is declared in `src/env.d.ts` and `.env.example`, and `vitest.config.ts` runs the suite with `VITE_MOCK_API=true` (the tests do run against MSW) and `unstubEnvs: true`.
  - `src/lib/dependencias.ts`: `MENSAJE_DEPENDENCIA_PENDIENTE` (T11), `DEPENDENCIAS` (registrarPersona 22, eliminarPersona 30, modificarManiobra 32+33, eliminarFase 37), `parsearDependencias`, `dependenciasPendientes`, `accionDisponible`.
  - `permisos.ts`: `PERMISOS_BACKEND` + `PERMISOS_CONTRATO` (`Manage Subjects`, `Manage Questions`, `Manage Exams`, `Take Exams`) with their roles (M2-9).
  - 17 `PANTALLAS` entries with their groups (Matrícula, Programa), permissions and `padre` for the breadcrumbs, their route files (guarded with `exigirPantalla`) and placeholder pages with the prop names the later tasks use: `PersonasPage`, `RegistrarPersonaPage`, `PersonaPage({cod})`, `GruposPage`, `RegistrarGrupoPage`, `GrupoPage({id})`, `ModificarGrupoPage({id})`, `FasesPage`, `RegistrarFasePage`, `FasePage({id})`, `ModificarFasePage({id})`, `ManiobrasPage`, `RegistrarManiobraPage`, `ManiobraPage({id})`, `ModificarManiobraPage({id})`, `EstandaresPage({id})`, `MateriasPage`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
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
```

with:

```ts
  it('el personal ve la programación de turnos, la orden de vuelo y las evaluaciones', () => {
    expect(titulosDelMenu('Instructor')).toEqual([
      'Inicio',
      'Fases y subfases',
      'Maniobras',
      'Materias',
      'Programación de turnos',
      'Orden de vuelo del día',
      'Evaluaciones',
    ])
    expect(titulosDelMenu('Jefe de Operaciones')).toContain('Programación de turnos')
  })

  it('CA-PER-11 y CA-GRU-01 Matrícula se reparte entre el administrador y el jefe de operaciones', () => {
    expect(titulosDelMenu('Administrador Web')).toContain('Personas')
    expect(titulosDelMenu('Administrador Web')).toContain('Grupos')
    expect(titulosDelMenu('Jefe de Operaciones')).toContain('Grupos')
    expect(titulosDelMenu('Jefe de Operaciones')).not.toContain('Personas')
    expect(titulosDelMenu('Comandante de Escuadrón')).not.toContain('Grupos')
    expect(titulosDelMenu('Alumno')).not.toContain('Fases y subfases')
  })

  it('M2-12 el menú agrupa las pantallas de M2 en Matrícula y Programa', () => {
    const secciones = menuPara(perfilDe('Administrador Web'), false)
    expect(secciones.map((seccion) => seccion.grupo)).toEqual([
      'General',
      'Matrícula',
      'Programa',
      'Operaciones de vuelo',
      'Evaluaciones',
    ])
    expect(secciones[2]?.pantallas.map((pantalla) => pantalla.titulo)).toEqual([
      'Fases y subfases',
      'Maniobras',
      'Materias',
    ])
  })
})

describe('accesosPara', () => {
```

In `src/lib/auth/pantallas.test.ts`, replace:

```ts
    expect(migasPara('/turnos/$id', perfilDe('Alumno'), false)).toEqual([PANTALLAS.turno])
  })

  it('no agrega migas en Inicio ni en rutas desconocidas', () => {
    expect(migasPara('/', perfilDe('Alumno'), false)).toEqual([])
    expect(migasPara('/no-existe', perfilDe('Alumno'), false)).toEqual([])
```

with:

```ts
    expect(migasPara('/turnos/$id', perfilDe('Alumno'), false)).toEqual([PANTALLAS.turno])
  })

  it('M2-12 arma las migas de las pantallas de matrícula y programa', () => {
    expect(migasPara('/personas/$cod', perfilDe('Administrador Web'), false)).toEqual([
      PANTALLAS.personas,
      PANTALLAS.persona,
    ])
    expect(migasPara('/programa/maniobras/$id/estandares', perfilDe('Jefe de Operaciones'), false)).toEqual([
      PANTALLAS.maniobras,
      PANTALLAS.maniobra,
      PANTALLAS.estandares,
    ])
  })

  it('no agrega migas en Inicio ni en rutas desconocidas', () => {
    expect(migasPara('/', perfilDe('Alumno'), false)).toEqual([])
    expect(migasPara('/no-existe', perfilDe('Alumno'), false)).toEqual([])
```

In `src/lib/auth/permisos.test.ts`, replace:

```ts
import { describe, expect, it } from 'vitest'
import { permisosDeRol, puede } from './permisos'

describe('permisosDeRol replica Role.java', () => {
  it('Alumno solo lee y actualiza su usuario', () => {
    expect([...permisosDeRol('Alumno')]).toEqual(['Read', 'Update'])
  })

  it('Jefe de Operaciones programa turnos y asigna estándares, pero no crea maniobras', () => {
```

with:

```ts
import { describe, expect, it } from 'vitest'
import { PERMISOS_CONTRATO, permisosDeRol, puede } from './permisos'

describe('permisosDeRol replica Role.java', () => {
  it('Alumno solo lee, actualiza su usuario y rinde exámenes', () => {
    expect([...permisosDeRol('Alumno')]).toEqual(['Read', 'Update', 'Take Exams'])
  })

  it('Jefe de Operaciones programa turnos y asigna estándares, pero no crea maniobras', () => {
```

In `src/lib/auth/permisos.test.ts`, replace:

```ts
    expect(permisos.has('Modify Evaluations')).toBe(false)
  })

  it('Administrador Web tiene los 17 permisos que usa el backend', () => {
    expect(permisosDeRol('Administrador Web').size).toBe(17)
  })

  it('un rol desconocido no tiene permisos', () => {
```

with:

```ts
    expect(permisos.has('Modify Evaluations')).toBe(false)
  })

  it('Administrador Web tiene los 17 permisos del backend y los 4 del contrato', () => {
    expect(permisosDeRol('Administrador Web').size).toBe(21)
  })

  it('M2-9 los permisos del contrato de teoría se reparten según su documento', () => {
    expect([...PERMISOS_CONTRATO]).toEqual(['Manage Subjects', 'Manage Questions', 'Manage Exams', 'Take Exams'])
    expect(permisosDeRol('Comandante de Escuadrón').has('Manage Subjects')).toBe(true)
    expect(permisosDeRol('Jefe de Operaciones').has('Manage Subjects')).toBe(false)
    expect(permisosDeRol('Instructor').has('Manage Questions')).toBe(true)
    expect(permisosDeRol('Instructor').has('Manage Subjects')).toBe(false)
    expect(permisosDeRol('Alumno').has('Take Exams')).toBe(true)
  })

  it('un rol desconocido no tiene permisos', () => {
```

Create `src/lib/auth/rutas-m2.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

const SIN_PERMISO = 'No tiene permisos para esta acción.'

describe('rutas de matrícula y programa', () => {
  it('CA-PER-11 Personas exige Manage Users', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/personas')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-GRU-01 Grupos exige Manage Groups', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/grupos')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-FAS-01 el personal ve las fases y solo Manage Phases registra', async () => {
    await iniciarComo('jefe.operaciones')
    const { router } = renderApp('/programa/fases')
    expect(await screen.findByRole('heading', { name: 'Fases y subfases' })).toBeInTheDocument()
    await router.navigate({ to: '/programa/fases/nueva' })
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-EST-01 los estándares exigen Manage Standards', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/maniobras/9/estandares')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-MAN-01 el comandante registra maniobras y el jefe de operaciones no', async () => {
    await iniciarComo('jefe.operaciones')
    renderApp('/programa/maniobras/nueva')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })

  it('CA-MAT-01 el alumno no ve las materias', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/programa/materias')
    expect(await screen.findByText(SIN_PERMISO)).toBeInTheDocument()
  })
})
```

Create `src/lib/dependencias.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { accionDisponible, dependenciasPendientes, parsearDependencias } from './dependencias'

describe('dependencias resueltas', () => {
  it('CA-DEP-02 en modo mock todas las acciones están disponibles', () => {
    vi.stubEnv('VITE_MOCK_API', 'true')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    expect(accionDisponible('registrarPersona')).toBe(true)
    expect(accionDisponible('modificarManiobra')).toBe(true)
  })

  it('CA-DEP-02 fuera del modo mock cada acción espera todos sus números', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '22, 32 ,37')
    expect(accionDisponible('registrarPersona')).toBe(true)
    expect(accionDisponible('eliminarFase')).toBe(true)
    expect(accionDisponible('eliminarPersona')).toBe(false)
    expect(accionDisponible('modificarManiobra')).toBe(false)
    expect(dependenciasPendientes('modificarManiobra')).toEqual([33])
  })

  it('CA-DEP-02 ignora los valores que no son números positivos', () => {
    expect([...parsearDependencias('22,x, ,-1,0,30')]).toEqual([22, 30])
    expect([...parsearDependencias(undefined)]).toEqual([])
  })

  it('CA-DEP-01 sin la variable ninguna acción con dependencia está disponible', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    expect(accionDisponible('registrarPersona')).toBe(false)
    expect(accionDisponible('eliminarPersona')).toBe(false)
    expect(accionDisponible('modificarManiobra')).toBe(false)
    expect(accionDisponible('eliminarFase')).toBe(false)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dependencias.test.ts src/lib/auth
```

Expected: FAIL — `Error: Failed to resolve import "./dependencias" from "src/lib/dependencias.test.ts". Does the file exist?`

- [ ] **Step 3: Write the mocks and the shared modules**

In `.env.example`, replace:

```text
VITE_SIGEDA_API_URL=http://localhost:8080
VITE_IA_API_URL=http://localhost:3000
VITE_MOCK_API=false
```

with:

```text
VITE_SIGEDA_API_URL=http://localhost:8080
VITE_IA_API_URL=http://localhost:3000
VITE_MOCK_API=false
VITE_DEPENDENCIAS_RESUELTAS=
```

In `src/env.d.ts`, replace:

```ts
    readonly VITE_SIGEDA_API_URL?: string
    readonly VITE_IA_API_URL?: string
    readonly VITE_MOCK_API?: string
  }
}
```

with:

```ts
    readonly VITE_SIGEDA_API_URL?: string
    readonly VITE_IA_API_URL?: string
    readonly VITE_MOCK_API?: string
    readonly VITE_DEPENDENCIAS_RESUELTAS?: string
  }
}
```

In `vitest.config.ts`, replace:

```ts
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
  }),
)
```

with:

```ts
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      unstubEnvs: true,
      env: { VITE_MOCK_API: 'true' },
    },
  }),
)
```

Replace `src/lib/auth/pantallas.ts` with:

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
  personas: {
    ruta: '/personas',
    titulo: 'Personas',
    descripcion: 'Alumnos, instructores y personal con su cuenta de acceso.',
    grupo: 'Matrícula',
    icono: Users,
    permiso: 'Manage Users',
    enMenu: true,
  },
  registrarPersona: {
    ruta: '/personas/nueva',
    titulo: 'Registrar persona',
    descripcion: 'Registre una persona y la cuenta con la que ingresa.',
    grupo: 'Matrícula',
    icono: UserPlus,
    permiso: 'Manage Users',
    padre: '/personas',
    enMenu: false,
  },
  persona: {
    ruta: '/personas/$cod',
    titulo: 'Detalle de persona',
    descripcion: 'Datos de la persona y de su cuenta.',
    grupo: 'Matrícula',
    icono: UserRound,
    permiso: 'Manage Users',
    padre: '/personas',
    enMenu: false,
  },
  grupos: {
    ruta: '/grupos',
    titulo: 'Grupos',
    descripcion: 'Grupos de alumnos por programa.',
    grupo: 'Matrícula',
    icono: UsersRound,
    permiso: 'Manage Groups',
    enMenu: true,
  },
  registrarGrupo: {
    ruta: '/grupos/nuevo',
    titulo: 'Registrar grupo',
    descripcion: 'Cree un grupo y asigne sus alumnos.',
    grupo: 'Matrícula',
    icono: UsersRound,
    permiso: 'Manage Groups',
    padre: '/grupos',
    enMenu: false,
  },
  grupo: {
    ruta: '/grupos/$id',
    titulo: 'Detalle de grupo',
    descripcion: 'Datos del grupo y sus alumnos.',
    grupo: 'Matrícula',
    icono: UsersRound,
    permiso: 'Manage Groups',
    padre: '/grupos',
    enMenu: false,
  },
  modificarGrupo: {
    ruta: '/grupos/$id/editar',
    titulo: 'Modificar grupo',
    descripcion: 'Cambie los datos del grupo y sus alumnos.',
    grupo: 'Matrícula',
    icono: UsersRound,
    permiso: 'Manage Groups',
    padre: '/grupos/$id',
    enMenu: false,
  },
  fases: {
    ruta: '/programa/fases',
    titulo: 'Fases y subfases',
    descripcion: 'Estructura del programa de instrucción.',
    grupo: 'Programa',
    icono: Layers,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  registrarFase: {
    ruta: '/programa/fases/nueva',
    titulo: 'Registrar fase',
    descripcion: 'Cree una fase con sus subfases.',
    grupo: 'Programa',
    icono: Layers,
    permiso: 'Manage Phases',
    padre: '/programa/fases',
    enMenu: false,
  },
  fase: {
    ruta: '/programa/fases/$id',
    titulo: 'Detalle de fase',
    descripcion: 'Subfases de la fase y sus maniobras.',
    grupo: 'Programa',
    icono: Layers,
    permiso: 'Read',
    roles: PERSONAL,
    padre: '/programa/fases',
    enMenu: false,
  },
  modificarFase: {
    ruta: '/programa/fases/$id/editar',
    titulo: 'Modificar fase',
    descripcion: 'Cambie la fase y sus subfases.',
    grupo: 'Programa',
    icono: Layers,
    permiso: 'Manage Phases',
    padre: '/programa/fases/$id',
    enMenu: false,
  },
  maniobras: {
    ruta: '/programa/maniobras',
    titulo: 'Maniobras',
    descripcion: 'Maniobras del programa y sus estándares.',
    grupo: 'Programa',
    icono: Route,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  registrarManiobra: {
    ruta: '/programa/maniobras/nueva',
    titulo: 'Registrar maniobra',
    descripcion: 'Cree una maniobra y asígnela a sus subfases.',
    grupo: 'Programa',
    icono: Route,
    permiso: 'Manage Maneuvers',
    padre: '/programa/maniobras',
    enMenu: false,
  },
  maniobra: {
    ruta: '/programa/maniobras/$id',
    titulo: 'Detalle de maniobra',
    descripcion: 'Subfases y estándares de la maniobra.',
    grupo: 'Programa',
    icono: Route,
    permiso: 'Read',
    roles: PERSONAL,
    padre: '/programa/maniobras',
    enMenu: false,
  },
  modificarManiobra: {
    ruta: '/programa/maniobras/$id/editar',
    titulo: 'Modificar maniobra',
    descripcion: 'Cambie la maniobra y sus subfases.',
    grupo: 'Programa',
    icono: Route,
    permiso: 'Manage Maneuvers',
    padre: '/programa/maniobras/$id',
    enMenu: false,
  },
  estandares: {
    ruta: '/programa/maniobras/$id/estandares',
    titulo: 'Estándares de la maniobra',
    descripcion: 'Estándares con los que se califica la maniobra.',
    grupo: 'Programa',
    icono: Ruler,
    permiso: 'Manage Standards',
    padre: '/programa/maniobras/$id',
    enMenu: false,
  },
  materias: {
    ruta: '/programa/materias',
    titulo: 'Materias',
    descripcion: 'Materias del curso en tierra con su nota mínima y coeficiente.',
    grupo: 'Programa',
    icono: BookOpen,
    permiso: 'Read',
    roles: PERSONAL,
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

In `src/lib/auth/permisos.ts`, replace:

```ts
export const PERMISOS = [
  'Read',
  'Write',
  'Update',
```

with:

```ts
export const PERMISOS_BACKEND = [
  'Read',
  'Write',
  'Update',
```

In `src/lib/auth/permisos.ts`, replace:

```ts
  'Manage Roles',
] as const

export type Permiso = (typeof PERMISOS)[number]

const PERMISOS_POR_ROL: Record<string, readonly Permiso[]> = {
```

with:

```ts
  'Manage Roles',
] as const

export const PERMISOS_CONTRATO = ['Manage Subjects', 'Manage Questions', 'Manage Exams', 'Take Exams'] as const

export const PERMISOS = [...PERMISOS_BACKEND, ...PERMISOS_CONTRATO] as const

export type Permiso = (typeof PERMISOS)[number]

const PERMISOS_POR_ROL: Record<string, readonly Permiso[]> = {
```

In `src/lib/auth/permisos.ts`, replace:

```ts
    'Manage Maneuvers',
    'Manage Users',
    'Manage Roles',
  ],
  'Comandante de Escuadrón': [
    'Read',
```

with:

```ts
    'Manage Maneuvers',
    'Manage Users',
    'Manage Roles',
    'Manage Subjects',
    'Manage Questions',
    'Manage Exams',
    'Take Exams',
  ],
  'Comandante de Escuadrón': [
    'Read',
```

In `src/lib/auth/permisos.ts`, replace:

```ts
    'Manage Phases',
    'Manage Subphases',
    'Manage Maneuvers',
  ],
  Instructor: ['Read', 'Write', 'Update', 'Create Reports', 'View Disapproved', 'View My Group'],
  'Jefe de Operaciones': ['Read', 'Write', 'Update', 'View My Group', 'Manage Shifts', 'Manage Groups', 'Manage Standards'],
  Alumno: ['Read', 'Update'],
}

export function permisosDeRol(nombreRol: string): ReadonlySet<Permiso> {
```

with:

```ts
    'Manage Phases',
    'Manage Subphases',
    'Manage Maneuvers',
    'Manage Subjects',
  ],
  Instructor: [
    'Read',
    'Write',
    'Update',
    'Create Reports',
    'View Disapproved',
    'View My Group',
    'Manage Questions',
    'Manage Exams',
  ],
  'Jefe de Operaciones': ['Read', 'Write', 'Update', 'View My Group', 'Manage Shifts', 'Manage Groups', 'Manage Standards'],
  Alumno: ['Read', 'Update', 'Take Exams'],
}

export function permisosDeRol(nombreRol: string): ReadonlySet<Permiso> {
```

In `src/lib/config.ts`, replace:

```ts
export const config = {
  sigedaApiUrl: import.meta.env.VITE_SIGEDA_API_URL ?? 'http://localhost:8080',
  iaApiUrl: import.meta.env.VITE_IA_API_URL ?? 'http://localhost:3000',
  mockApi: import.meta.env.VITE_MOCK_API === 'true',
}
```

with:

```ts
export const config = {
  sigedaApiUrl: import.meta.env.VITE_SIGEDA_API_URL ?? 'http://localhost:8080',
  iaApiUrl: import.meta.env.VITE_IA_API_URL ?? 'http://localhost:3000',
  get mockApi(): boolean {
    return import.meta.env.VITE_MOCK_API === 'true'
  },
  get dependenciasResueltas(): string {
    return import.meta.env.VITE_DEPENDENCIAS_RESUELTAS ?? ''
  },
}
```

Create `src/lib/dependencias.ts`:

```ts
import { config } from './config'

export const MENSAJE_DEPENDENCIA_PENDIENTE = 'No disponible: el servidor aún no realiza esta acción de forma segura.'

export const DEPENDENCIAS = {
  registrarPersona: [22],
  eliminarPersona: [30],
  modificarManiobra: [32, 33],
  eliminarFase: [37],
} as const

export type AccionConDependencia = keyof typeof DEPENDENCIAS

export function parsearDependencias(valor: string | undefined): Set<number> {
  return new Set(
    (valor ?? '')
      .split(',')
      .map((parte) => Number(parte.trim()))
      .filter((numero) => Number.isInteger(numero) && numero > 0),
  )
}

export function dependenciasPendientes(accion: AccionConDependencia): number[] {
  if (config.mockApi) return []
  const resueltas = parsearDependencias(config.dependenciasResueltas)
  return DEPENDENCIAS[accion].filter((numero) => !resueltas.has(numero))
}

export function accionDisponible(accion: AccionConDependencia): boolean {
  return dependenciasPendientes(accion).length === 0
}
```

- [ ] **Step 4: Write the screens**

Create `src/features/fases/fase-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function FasePage({ id }: Props) {
  return <PageHeader titulo="Detalle de fase" descripcion={String(id)} />
}
```

Create `src/features/fases/fases-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function FasesPage() {
  return <PageHeader titulo="Fases y subfases" />
}
```

Create `src/features/fases/modificar-fase-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarFasePage({ id }: Props) {
  return <PageHeader titulo="Modificar fase" descripcion={String(id)} />
}
```

Create `src/features/fases/registrar-fase-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarFasePage() {
  return <PageHeader titulo="Registrar fase" />
}
```

Create `src/features/grupos/grupo-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function GrupoPage({ id }: Props) {
  return <PageHeader titulo="Detalle de grupo" descripcion={String(id)} />
}
```

Create `src/features/grupos/grupos-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function GruposPage() {
  return <PageHeader titulo="Grupos" />
}
```

Create `src/features/grupos/modificar-grupo-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarGrupoPage({ id }: Props) {
  return <PageHeader titulo="Modificar grupo" descripcion={String(id)} />
}
```

Create `src/features/grupos/registrar-grupo-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarGrupoPage() {
  return <PageHeader titulo="Registrar grupo" />
}
```

Create `src/features/maniobras/estandares-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function EstandaresPage({ id }: Props) {
  return <PageHeader titulo="Estándares de la maniobra" descripcion={String(id)} />
}
```

Create `src/features/maniobras/maniobra-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ManiobraPage({ id }: Props) {
  return <PageHeader titulo="Detalle de maniobra" descripcion={String(id)} />
}
```

Create `src/features/maniobras/maniobras-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function ManiobrasPage() {
  return <PageHeader titulo="Maniobras" />
}
```

Create `src/features/maniobras/modificar-maniobra-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarManiobraPage({ id }: Props) {
  return <PageHeader titulo="Modificar maniobra" descripcion={String(id)} />
}
```

Create `src/features/maniobras/registrar-maniobra-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarManiobraPage() {
  return <PageHeader titulo="Registrar maniobra" />
}
```

Create `src/features/materias/materias-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function MateriasPage() {
  return <PageHeader titulo="Materias" />
}
```

Create `src/features/personas/persona-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { cod: string }

export function PersonaPage({ cod }: Props) {
  return <PageHeader titulo="Detalle de persona" descripcion={String(cod)} />
}
```

Create `src/features/personas/personas-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function PersonasPage() {
  return <PageHeader titulo="Personas" />
}
```

Create `src/features/personas/registrar-persona-page.tsx`:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarPersonaPage() {
  return <PageHeader titulo="Registrar persona" />
}
```

- [ ] **Step 5: Wire the routes**

Create `src/routes/_app/grupos/$id/editar.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ModificarGrupoPage } from '@/features/grupos/modificar-grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarGrupo, context.sesion.actual()),
  component: RutaModificarGrupo,
})

function RutaModificarGrupo() {
  const { id } = Route.useParams()
  return <ModificarGrupoPage id={Number(id)} />
}
```

Create `src/routes/_app/grupos/$id/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { GrupoPage } from '@/features/grupos/grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupo, context.sesion.actual()),
  component: RutaGrupo,
})

function RutaGrupo() {
  const { id } = Route.useParams()
  return <GrupoPage id={Number(id)} />
}
```

Create `src/routes/_app/grupos/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { GruposPage } from '@/features/grupos/grupos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupos, context.sesion.actual()),
  component: GruposPage,
})
```

Create `src/routes/_app/grupos/nuevo.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { RegistrarGrupoPage } from '@/features/grupos/registrar-grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/nuevo')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarGrupo, context.sesion.actual()),
  component: RegistrarGrupoPage,
})
```

Create `src/routes/_app/personas/$cod.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PersonaPage } from '@/features/personas/persona-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/$cod')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.persona, context.sesion.actual()),
  component: RutaPersona,
})

function RutaPersona() {
  const { cod } = Route.useParams()
  return <PersonaPage cod={cod} />
}
```

Create `src/routes/_app/personas/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PersonasPage } from '@/features/personas/personas-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.personas, context.sesion.actual()),
  component: PersonasPage,
})
```

Create `src/routes/_app/personas/nueva.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { RegistrarPersonaPage } from '@/features/personas/registrar-persona-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarPersona, context.sesion.actual()),
  component: RegistrarPersonaPage,
})
```

Create `src/routes/_app/programa/fases/$id/editar.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ModificarFasePage } from '@/features/fases/modificar-fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarFase, context.sesion.actual()),
  component: RutaModificarFase,
})

function RutaModificarFase() {
  const { id } = Route.useParams()
  return <ModificarFasePage id={Number(id)} />
}
```

Create `src/routes/_app/programa/fases/$id/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { FasePage } from '@/features/fases/fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fase, context.sesion.actual()),
  component: RutaFase,
})

function RutaFase() {
  const { id } = Route.useParams()
  return <FasePage id={Number(id)} />
}
```

Create `src/routes/_app/programa/fases/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { FasesPage } from '@/features/fases/fases-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fases, context.sesion.actual()),
  component: FasesPage,
})
```

Create `src/routes/_app/programa/fases/nueva.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { RegistrarFasePage } from '@/features/fases/registrar-fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarFase, context.sesion.actual()),
  component: RegistrarFasePage,
})
```

Create `src/routes/_app/programa/maniobras/$id/editar.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ModificarManiobraPage } from '@/features/maniobras/modificar-maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarManiobra, context.sesion.actual()),
  component: RutaModificarManiobra,
})

function RutaModificarManiobra() {
  const { id } = Route.useParams()
  return <ModificarManiobraPage id={Number(id)} />
}
```

Create `src/routes/_app/programa/maniobras/$id/estandares.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { EstandaresPage } from '@/features/maniobras/estandares-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/estandares')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.estandares, context.sesion.actual()),
  component: RutaEstandares,
})

function RutaEstandares() {
  const { id } = Route.useParams()
  return <EstandaresPage id={Number(id)} />
}
```

Create `src/routes/_app/programa/maniobras/$id/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ManiobraPage } from '@/features/maniobras/maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobra, context.sesion.actual()),
  component: RutaManiobra,
})

function RutaManiobra() {
  const { id } = Route.useParams()
  return <ManiobraPage id={Number(id)} />
}
```

Create `src/routes/_app/programa/maniobras/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ManiobrasPage } from '@/features/maniobras/maniobras-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobras, context.sesion.actual()),
  component: ManiobrasPage,
})
```

Create `src/routes/_app/programa/maniobras/nueva.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { RegistrarManiobraPage } from '@/features/maniobras/registrar-maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarManiobra, context.sesion.actual()),
  component: RegistrarManiobraPage,
})
```

Create `src/routes/_app/programa/materias.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { MateriasPage } from '@/features/materias/materias-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/materias')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.materias, context.sesion.actual()),
  component: MateriasPage,
})
```

- [ ] **Step 6: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/lib/dependencias.test.ts src/lib/auth
```

Expected: PASS.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 354 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: register matricula and programa screens"
```

---

### Task 5: Personas list (CA-PER-01, CA-PER-11, CA-DEP-01)

**Files:**

- Create: `src/features/personas/api.test.ts`
- Create: `src/features/personas/api.ts`
- Create: `src/features/personas/columnas.tsx`
- Create: `src/features/personas/personas-page.test.tsx`
- Modify: `src/features/personas/personas-page.tsx`
- Create: `src/features/personas/schemas.ts`
- Modify: `src/mocks/sigeda/personas.ts`
- Modify: `src/routes/_app/personas/index.tsx`

**Interfaces:**
- Consumes: `DataTable`, `esquemaPaginacion`, `Enlace`, `EmptyState`, `AvisoDeError`, `errorDePrimeraCarga`, `accionDisponible`, `etiquetaDeTipo`.
- Produces:
  - `GET /api/personas` in the mocks (contract §1.1, `Page_Sort` with `property` `codigo` by default and `tipo` in the projection).
  - `src/features/personas/api.ts`: `PersonaFila`, `apellidosYNombres`, `nombreCompletoDePersona`, `aPersonaFila` (tolerates a row without `tipo` or `rango`, dependency 27), `clavesPersonas`, `listarPersonas`, `consultasPersonas.lista`.
  - `PersonasPage`: columns código (link), apellidos y nombres, rango, tipo; sorting by `codigo` or `aPaterno` in the URL; first-load errors with Reintentar; "Registrar persona" disabled with T11 while dependency 22 is pending.

- [ ] **Step 1: Write the failing tests**

Create `src/features/personas/api.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { iniciarComo } from '@/test/render'
import { aPersonaFila, apellidosYNombres, listarPersonas } from './api'

const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }

describe('api de personas', () => {
  it('CA-PER-01 lista las personas paginadas con su tipo', async () => {
    await iniciarComo('admin.sistema')
    const pagina = await listarPersonas({ ...PAGINA, property: 'codigo' })
    expect(pagina).toMatchObject({ page: 0, size: 10, total: 13 })
    expect(pagina.items[1]).toEqual({
      codigo: '111111',
      nombre: 'Oscar',
      aPaterno: 'Lopez',
      aMaterno: 'Chaparro',
      rango: 'Cadete',
      tipo: 'Alumno',
    })
  })

  it('dependencia 27 tolera una fila sin tipo ni rango', () => {
    const fila = aPersonaFila({ codigo: '123ABC', nombre: 'Rosa', aPaterno: 'Quispe' })
    expect(fila).toEqual({ codigo: '123ABC', nombre: 'Rosa', aPaterno: 'Quispe', aMaterno: '', rango: null, tipo: null })
    expect(apellidosYNombres(fila)).toBe('Quispe, Rosa')
  })
})
```

Create `src/features/personas/personas-page.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirPersonas(ruta = '/personas') {
  await iniciarComo('admin.sistema')
  const vista = renderApp(ruta)
  await screen.findByRole('heading', { name: 'Personas' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Personas registradas' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

describe('Personas', () => {
  it('CA-PER-01 muestra código, apellidos y nombres, rango y tipo', async () => {
    await abrirPersonas()
    expect(await screen.findByRole('table', { name: 'Personas registradas' })).toBeInTheDocument()
    expect(filas().slice(0, 3)).toEqual([
      ['000001', 'Sistema Web, Admin', 'Admin', '—'],
      ['111111', 'Lopez Chaparro, Oscar', 'Cadete', 'Alumno'],
      ['222222', 'Falconi Fernandez, Juan', 'Alférez', 'Alumno'],
    ])
    expect(screen.getByRole('link', { name: '111111' })).toHaveAttribute('href', '/personas/111111')
  })

  it('CA-PER-01 ordena por apellido paterno y guarda el orden y la página en la URL', async () => {
    const { usuario, router } = await abrirPersonas()
    await usuario.click(await screen.findByRole('button', { name: /Apellidos y nombres/ }))
    expect(router.state.location.search).toMatchObject({ property: 'aPaterno', direction: 'ASC', page: 0 })
    expect(filas()[0]?.[1]).toBe('Aguirre Salas, Jorge')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(router.state.location.search).toMatchObject({ page: 1, property: 'aPaterno' })
  })

  it('CA-PER-01 respeta el orden que llega en la URL', async () => {
    await abrirPersonas('/personas?property=codigo&direction=DESC')
    expect(await screen.findByRole('table', { name: 'Personas registradas' })).toBeInTheDocument()
    expect(filas()[0]?.[0]).toBe('999999')
  })

  it('muestra el aviso de error con reintentar si la lista no carga', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/personas`, () => HttpResponse.error()))
    await abrirPersonas()
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('CA-DEP-01 sin la dependencia 22 resuelta, Registrar persona está deshabilitada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirPersonas()
    expect(screen.getByRole('button', { name: 'Registrar persona' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })

  it('CA-DEP-02 en modo mock se puede registrar una persona', async () => {
    await abrirPersonas()
    expect(screen.getByRole('link', { name: 'Registrar persona' })).toHaveAttribute('href', '/personas/nueva')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: FAIL — `Error: Failed to resolve import "./api" from "src/features/personas/api.test.ts". Does the file exist?`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/mocks/sigeda/personas.ts`, replace:

```ts
import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { API, textoNoEncontrado } from './comun'
import { buscarPersona, buscarUsuarioPorNombre, rolPorId } from './datos'

export const handlersPersonas = [
  http.get(`${API}/api/personas/:nom`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nom))
```

with:

```ts
import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { API, autorizar, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, buscarUsuarioPorNombre, datos, rolPorId, type PersonaMock } from './datos'

function indexPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    rango: persona.rango,
    tipo: persona.tipo,
  }
}

export const handlersPersonas = [
  http.get(`${API}/api/personas`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    return paginar(datos().personas, new URL(request.url), {
      nombreLista: 'personas',
      propiedadPorDefecto: 'codigo',
      proyectar: indexPersona,
    })
  }),
  http.get(`${API}/api/personas/:nom`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nom))
```

- [ ] **Step 4: Write the API, the schemas and the columns**

Create `src/features/personas/api.ts`:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type PersonaFila = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  rango: string | null
  tipo: string | null
}

type IndexPersonaApi = {
  codigo: string
  nombre: string
  aPaterno?: string | null
  aMaterno?: string | null
  rango?: string | null
  tipo?: string | null
}

export function apellidosYNombres(persona: Pick<PersonaFila, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  const apellidos = [persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
  return apellidos === '' ? persona.nombre : `${apellidos}, ${persona.nombre}`
}

export function aPersonaFila(persona: IndexPersonaApi): PersonaFila {
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno ?? '',
    aMaterno: persona.aMaterno ?? '',
    rango: persona.rango ?? null,
    tipo: persona.tipo ?? null,
  }
}

export const clavesPersonas = {
  todo: ['personas'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesPersonas.todo, 'lista', parametros] as const,
  detalle: (codigo: string) => [...clavesPersonas.todo, 'detalle', codigo] as const,
}

export async function listarPersonas(parametros: ParametrosPagina): Promise<Pagina<PersonaFila>> {
  const pagina = await sigeda.pagina<IndexPersonaApi>('/api/personas', parametros)
  return { ...pagina, items: pagina.items.map(aPersonaFila) }
}

export const consultasPersonas = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesPersonas.lista(parametros),
      queryFn: () => listarPersonas(parametros),
      placeholderData: keepPreviousData,
    }),
}
```

Create `src/features/personas/columnas.tsx`:

```tsx
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { etiquetaDeTipo } from '@/lib/dominio/personas'
import { apellidosYNombres, type PersonaFila } from './api'

const ayudante = ayudanteDeColumnas<PersonaFila>()

export const COLUMNAS_PERSONAS = ayudante.columns([
  ayudante.accessor('codigo', {
    header: 'Código',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/personas/$cod" params={{ cod: contexto.getValue() }} className="tabular-nums">
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('aPaterno', {
    header: 'Apellidos y nombres',
    enableSorting: true,
    cell: (contexto) => apellidosYNombres(contexto.row.original),
  }),
  ayudante.accessor('rango', { header: 'Rango', cell: (contexto) => contexto.getValue() ?? '—' }),
  ayudante.accessor('tipo', { header: 'Tipo', cell: (contexto) => etiquetaDeTipo(contexto.getValue()) }),
])
```

Create `src/features/personas/schemas.ts`:

```ts
import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'

export const esquemaBusquedaPersonas = z.object(esquemaPaginacion)

export type BusquedaPersonas = z.infer<typeof esquemaBusquedaPersonas>
```

- [ ] **Step 5: Write the screens**

In `src/features/personas/personas-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

export function PersonasPage() {
  return <PageHeader titulo="Personas" />
}
```

with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasPersonas } from './api'
import { COLUMNAS_PERSONAS } from './columnas'

const ruta = getRouteApi('/_app/personas/')

export function PersonasPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const personas = useQuery(consultasPersonas.lista(busqueda))
  const error = errorDePrimeraCarga(personas)
  const puedeRegistrar = accionDisponible('registrarPersona')

  return (
    <>
      <PageHeader
        titulo="Personas"
        descripcion="Alumnos, instructores y personal con su cuenta de acceso."
        acciones={
          puedeRegistrar ? (
            <Button asChild>
              <Link to="/personas/nueva">
                <UserPlus aria-hidden />
                Registrar persona
              </Link>
            </Button>
          ) : (
            <div className="grid justify-items-end gap-1">
              <Button disabled>
                <UserPlus aria-hidden />
                Registrar persona
              </Button>
              <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
            </div>
          )
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void personas.refetch()} />
      ) : (
        <DataTable
          etiqueta="Personas registradas"
          columnas={COLUMNAS_PERSONAS}
          pagina={personas.data}
          cargando={personas.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(persona) => persona.codigo}
          vacio={<EmptyState titulo="No hay personas registradas" descripcion="Registre la primera persona del curso." />}
        />
      )}
    </>
  )
}
```

- [ ] **Step 6: Wire the routes**

In `src/routes/_app/personas/index.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PersonasPage } from '@/features/personas/personas-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.personas, context.sesion.actual()),
  component: PersonasPage,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PersonasPage } from '@/features/personas/personas-page'
import { esquemaBusquedaPersonas } from '@/features/personas/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/')({
  validateSearch: esquemaBusquedaPersonas,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.personas, context.sesion.actual()),
  component: PersonasPage,
})
```

- [ ] **Step 7: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 8: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: PASS.

- [ ] **Step 9: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 362 tests.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add personas list"
```

---

### Task 6: Persona detail, account section and Modificar persona (CA-PER-06, CA-PER-07, CA-PER-12) (M2-2, M2-13, M2-15)

**Files:**

- Test: `src/features/personas/api.test.ts`
- Modify (full rewrite): `src/features/personas/api.ts`
- Create: `src/features/personas/cargar.ts`
- Create: `src/features/personas/components/dato.tsx`
- Create: `src/features/personas/components/dialogo-modificar-persona.tsx`
- Create: `src/features/personas/components/seccion-cuenta.tsx`
- Create: `src/features/personas/persona-page.test.tsx`
- Modify: `src/features/personas/persona-page.tsx`
- Modify (full rewrite): `src/mocks/sigeda/personas.ts`
- Modify: `src/routes/_app/personas/$cod.tsx`

**Interfaces:**
- Consumes: `consultasPersonas`, `StatusBadge`, `tiposCompatibles`, `aplicarErroresDeCampo`, the shadcn `dialog`.
- Produces:
  - `GET /api/personas/{cod}/usuario` and `PUT /api/personas/{cod}` in the mocks (contract §1.2 and §1.4, including the tipo–rol rule of dependency 28).
  - `obtenerPersona` parses the detail with zod and, when `usuario.id` is missing (dependency 26), takes it from `GET /api/personas/{username}`; `modificarPersona` sends `{rango, tipo}` always and reads only `mensaje`.
  - `cargarPersonaVisible`: validates `^[A-Za-z0-9]{6}$` before asking the backend and turns a 404 into the not-found page.
  - `PersonaPage`: datos de la persona (código, DNI, nombres, rango, tipo, estado, grupo) and `SeccionCuenta` with T8 (`rol` null), T9 (no account) and T10 (own account).
  - `DialogoModificarPersona`: rango and tipo only, T1 as the dialog description and under the tipo field, tipos compatible with the account's rol (all of them without an account or with `rol: null`), backend field errors under their field, toast with the backend's `mensaje`.

- [ ] **Step 1: Write the failing tests**

In `src/features/personas/api.test.ts`, replace:

```ts
import { describe, expect, it } from 'vitest'
import { iniciarComo } from '@/test/render'
import { aPersonaFila, apellidosYNombres, listarPersonas } from './api'

const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }
```

with:

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import { aPersonaFila, apellidosYNombres, listarPersonas, obtenerPersona } from './api'

const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }
```

In `src/features/personas/api.test.ts`, replace:

```ts
    expect(fila).toEqual({ codigo: '123ABC', nombre: 'Rosa', aPaterno: 'Quispe', aMaterno: '', rango: null, tipo: null })
    expect(apellidosYNombres(fila)).toBe('Quispe, Rosa')
  })
})
```

with:

```ts
    expect(fila).toEqual({ codigo: '123ABC', nombre: 'Rosa', aPaterno: 'Quispe', aMaterno: '', rango: null, tipo: null })
    expect(apellidosYNombres(fila)).toBe('Quispe, Rosa')
  })

  it('CA-PER-06 trae el detalle con su cuenta, estado y grupo', async () => {
    await iniciarComo('admin.sistema')
    await expect(obtenerPersona('111111')).resolves.toEqual({
      codigo: '111111',
      nombre: 'Oscar',
      aPaterno: 'Lopez',
      aMaterno: 'Chaparro',
      dni: '12345678',
      rango: 'Cadete',
      tipo: 'Alumno',
      estado: 'Apto',
      grupo: { id: 1, nombre: 'Grupo 1' },
      cuenta: { id: 3, username: 'alumno.lopez', correo: 'alumno1@sigeda.com', rol: { id: 1, nombre: 'Alumno' } },
    })
  })

  it('dependencia 26 toma el id de la cuenta de la persona cuando el detalle no lo trae', async () => {
    const consultadas: string[] = []
    await iniciarComo('admin.sistema')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/:cod/usuario`, () =>
        HttpResponse.json({
          codigo: '111111',
          nombre: 'Oscar',
          aPaterno: 'Lopez',
          aMaterno: 'Chaparro',
          dni: '12345678',
          rango: 'Cadete',
          tipo: 'Alumno',
          usuario: { nombre: 'alumno.lopez', correo: 'alumno1@sigeda.com', rol: { id: 1, nombre: 'Alumno' } },
        }),
      ),
      http.get(`${config.sigedaApiUrl}/api/personas/:nom`, ({ params }) => {
        consultadas.push(String(params.nom))
        return HttpResponse.json({
          codigo: '111111',
          nombre: 'Oscar',
          aPaterno: 'Lopez',
          aMaterno: 'Chaparro',
          idGrupo: 1,
          usuario: { nombre: 'alumno.lopez', correo: 'alumno1@sigeda.com', id: 3, rol: { id: 1, nombre: 'Alumno' } },
        })
      }),
    )
    const persona = await obtenerPersona('111111')
    expect(persona.cuenta).toMatchObject({ id: 3, username: 'alumno.lopez' })
    expect(persona.estado).toBeNull()
    expect(consultadas).toEqual(['alumno.lopez'])
  })
})
```

Create `src/features/personas/persona-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { TEXTO_SOLO_RANGO_Y_TIPO } from './components/dialogo-modificar-persona'
import { TEXTO_CUENTA_PROPIA, TEXTO_CUENTA_SIN_ROL, TEXTO_SIN_CUENTA } from './components/seccion-cuenta'

async function abrirPersona(cod: string, username = 'admin.sistema') {
  await iniciarComo(username)
  const vista = renderApp(`/personas/${cod}`)
  await screen.findByRole('heading', { level: 2, name: 'Cuenta' })
  return vista
}

function cuenta() {
  return within(screen.getByRole('heading', { level: 2, name: 'Cuenta' }).closest('div[data-slot="card"]') as HTMLElement)
}

describe('Detalle de persona', () => {
  it('CA-PER-06 muestra los datos de la persona y su cuenta', async () => {
    await abrirPersona('111111')
    expect(screen.getByRole('heading', { level: 1, name: 'Oscar Lopez Chaparro' })).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(screen.getByText('Cadete')).toBeInTheDocument()
    expect(screen.getByText('Grupo 1')).toBeInTheDocument()
    expect(screen.getByText('Apto')).toBeInTheDocument()
    expect(cuenta().getByText('alumno.lopez')).toBeInTheDocument()
    expect(cuenta().getByText('alumno1@sigeda.com')).toBeInTheDocument()
    expect(cuenta().getByText('Alumno')).toBeInTheDocument()
  })

  it('CA-PER-06 una cuenta sin rol lo advierte', async () => {
    await abrirPersona('765432')
    expect(cuenta().getByText('raul.paredes')).toBeInTheDocument()
    expect(screen.getByText(TEXTO_CUENTA_SIN_ROL)).toBeInTheDocument()
  })

  it('CA-PER-06 una persona sin cuenta lo indica', async () => {
    await abrirPersona('654321')
    expect(screen.getByText(TEXTO_SIN_CUENTA)).toBeInTheDocument()
  })

  it('CA-PER-12 en la propia persona la cuenta explica que no se gestiona desde aquí', async () => {
    await abrirPersona('000001')
    expect(screen.getByText(TEXTO_CUENTA_PROPIA)).toBeInTheDocument()
  })

  it('CA-PER-07 modificar solo cambia rango y tipo y muestra el mensaje del backend', async () => {
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Modificar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getAllByText(TEXTO_SOLO_RANGO_Y_TIPO).length).toBeGreaterThan(0)
    expect(dialogo.queryByLabelText('DNI')).not.toBeInTheDocument()
    expect(dialogo.getByLabelText('Tipo')).toHaveValue('Alumno')
    expect(
      dialogo.getAllByRole('option').map((opcion) => (opcion as HTMLOptionElement).textContent),
    ).toEqual(['Alumno'])
    await usuario.clear(dialogo.getByLabelText('Rango'))
    await usuario.type(dialogo.getByLabelText('Rango'), 'Teniente')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('Persona guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Teniente')).toBeInTheDocument())
  })

  it('CA-PER-07 sin cuenta se ofrecen todos los tipos', async () => {
    const { usuario } = await abrirPersona('654321')
    await usuario.click(screen.getByRole('button', { name: 'Modificar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Alumno',
      'Instructor PDI',
      'Instructor PDE',
      'Sin tipo',
    ])
  })

  it('CA-PER-07 el backend rechaza un tipo incompatible con el rol de la cuenta', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/personas/:cod`, () =>
        HttpResponse.json(["'tipo': El tipo no corresponde al rol de la cuenta."], { status: 400 }),
      ),
    )
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Modificar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El tipo no corresponde al rol de la cuenta.')).toBeInTheDocument()
  })

  it('una persona inexistente muestra la página no encontrada', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/personas/ZZ9999')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })

  it('un código con formato inválido no consulta al backend', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/personas/xx')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: FAIL — the test file imports modules this task has not written yet: `Error: Failed to resolve import "./components/seccion-cuenta" from "src/features/personas/persona-page.test.tsx". Does the file exist?` (vitest reports whichever of the two new components it resolves first).

- [ ] **Step 3: Write the mocks and the shared modules**

Replace `src/mocks/sigeda/personas.ts` with:

```ts
import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { esTipoPersona, rolCompatible } from '@/lib/dominio/personas'
import { API, autorizar, erroresDeCampo, guardado, paginar, textoNoEncontrado } from './comun'
import {
  buscarPersona,
  buscarUsuarioPorNombre,
  datos,
  rolPorId,
  usuarioDePersona,
  type PersonaMock,
} from './datos'

function indexPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    rango: persona.rango,
    tipo: persona.tipo,
  }
}

function entidadPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    rango: persona.rango,
    dni: persona.dni,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    estado: persona.estado,
    tipo: persona.tipo,
    codEvalRealizada: persona.codEvalRealizada,
    codEvalDesaprobada: null,
    contChequeo: 0,
    contEval: persona.contEval,
    contMalo: 0,
    contRegular: 0,
    checked: false,
    idGrupo: persona.idGrupo,
    desaprobados: null,
  }
}

function detalleUsuario(persona: PersonaMock) {
  const usuario = usuarioDePersona(persona.codigo)
  const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
  const rol = usuario ? rolPorId(usuario.idRol) : null
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    dni: persona.dni,
    rango: persona.rango,
    tipo: persona.tipo,
    estado: persona.estado,
    grupo: grupo ? { id: grupo.id, nombre: grupo.nombre } : null,
    usuario: usuario
      ? { id: usuario.id, nombre: usuario.username, correo: usuario.correo, rol: rol && { ...rol } }
      : null,
  }
}

export const handlersPersonas = [
  http.get(`${API}/api/personas`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    return paginar(datos().personas, new URL(request.url), {
      nombreLista: 'personas',
      propiedadPorDefecto: 'codigo',
      proyectar: indexPersona,
    })
  }),
  http.get(`${API}/api/personas/:cod/usuario`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    return HttpResponse.json(detalleUsuario(persona))
  }),
  http.put(`${API}/api/personas/:cod`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    const cuerpo = (await request.json()) as { rango?: unknown; tipo?: unknown }
    const errores: string[] = []
    const tipo = cuerpo.tipo ?? null
    if (tipo !== null && !esTipoPersona(tipo)) errores.push("'tipo': Ingresar tipo de persona válido.")
    else {
      const rol = rolPorId(usuarioDePersona(persona.codigo)?.idRol ?? null)
      if (rol && !rolCompatible(tipo, rol.nombre)) errores.push("'tipo': El tipo no corresponde al rol de la cuenta.")
    }
    const rango = cuerpo.rango ?? null
    if (typeof rango === 'string' && rango.length > 30) {
      errores.push("'rango': El rango no puede superar los 30 caracteres.")
    }
    if (errores.length > 0) return erroresDeCampo(errores)
    persona.rango = typeof rango === 'string' ? rango : null
    persona.tipo = esTipoPersona(tipo) ? tipo : null
    return guardado('Persona', 'persona', entidadPersona(persona))
  }),
  http.get(`${API}/api/personas/:nom`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nom))
    const persona = usuario ? buscarPersona(usuario.codPersona) : undefined
    if (!usuario || !persona) return textoNoEncontrado('Persona especificada no existe.')
    const rol = rolPorId(usuario.idRol)
    return HttpResponse.json({
      codigo: persona.codigo,
      nombre: persona.nombre,
      aPaterno: persona.aPaterno,
      aMaterno: persona.aMaterno,
      idGrupo: persona.idGrupo,
      usuario: {
        nombre: usuario.username,
        correo: usuario.correo,
        id: usuario.id,
        rol: rol && { id: rol.id, nombre: rol.nombre },
      },
    })
  }),
]
```

- [ ] **Step 4: Write the API, the schemas and the columns**

Replace `src/features/personas/api.ts` with:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type PersonaFila = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  rango: string | null
  tipo: string | null
}

export type CuentaDePersona = {
  id: number
  username: string
  correo: string | null
  rol: { id: number; nombre: string } | null
}

export type PersonaDetalle = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  dni: string | null
  rango: string | null
  tipo: string | null
  estado: string | null
  grupo: { id: number; nombre: string } | null
  cuenta: CuentaDePersona | null
}

type IndexPersonaApi = {
  codigo: string
  nombre: string
  aPaterno?: string | null
  aMaterno?: string | null
  rango?: string | null
  tipo?: string | null
}

export const MENSAJE_PERSONA_GUARDADA = 'Persona guardada con éxito.'
export const MENSAJE_PERSONA_ELIMINADA = 'Persona eliminado con éxito.'

const esquemaDetalle = z.object({
  codigo: z.string(),
  nombre: z.string(),
  aPaterno: z.string().nullish(),
  aMaterno: z.string().nullish(),
  dni: z.string().nullish(),
  rango: z.string().nullish(),
  tipo: z.string().nullish(),
  estado: z.string().nullish(),
  grupo: z.object({ id: z.number(), nombre: z.string() }).nullish(),
  usuario: z
    .object({
      id: z.number().nullish(),
      nombre: z.string(),
      correo: z.string().nullish(),
      rol: z.object({ id: z.number(), nombre: z.string() }).nullish(),
    })
    .nullish(),
})

const esquemaIdDeUsuario = z.object({ usuario: z.object({ id: z.number() }) })

export function apellidosYNombres(persona: Pick<PersonaFila, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  const apellidos = [persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
  return apellidos === '' ? persona.nombre : `${apellidos}, ${persona.nombre}`
}

export function nombreCompletoDePersona(persona: Pick<PersonaFila, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  return [persona.nombre, persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
}

export function aPersonaFila(persona: IndexPersonaApi): PersonaFila {
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno ?? '',
    aMaterno: persona.aMaterno ?? '',
    rango: persona.rango ?? null,
    tipo: persona.tipo ?? null,
  }
}

export const clavesPersonas = {
  todo: ['personas'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesPersonas.todo, 'lista', parametros] as const,
  detalle: (codigo: string) => [...clavesPersonas.todo, 'detalle', codigo] as const,
}

export async function listarPersonas(parametros: ParametrosPagina): Promise<Pagina<PersonaFila>> {
  const pagina = await sigeda.pagina<IndexPersonaApi>('/api/personas', parametros)
  return { ...pagina, items: pagina.items.map(aPersonaFila) }
}

export async function obtenerPersona(codigo: string): Promise<PersonaDetalle> {
  const datos = esquemaDetalle.parse(await sigeda.get(`/api/personas/${encodeURIComponent(codigo)}/usuario`))
  const usuario = datos.usuario ?? null
  let idUsuario = usuario?.id ?? null
  if (usuario && idUsuario === null) {
    const sesion = esquemaIdDeUsuario.parse(await sigeda.get(`/api/personas/${encodeURIComponent(usuario.nombre)}`))
    idUsuario = sesion.usuario.id
  }
  return {
    codigo: datos.codigo,
    nombre: datos.nombre,
    aPaterno: datos.aPaterno ?? '',
    aMaterno: datos.aMaterno ?? '',
    dni: datos.dni ?? null,
    rango: datos.rango ?? null,
    tipo: datos.tipo ?? null,
    estado: datos.estado ?? null,
    grupo: datos.grupo ?? null,
    cuenta:
      usuario && idUsuario !== null
        ? { id: idUsuario, username: usuario.nombre, correo: usuario.correo ?? null, rol: usuario.rol ?? null }
        : null,
  }
}

export async function modificarPersona(
  codigo: string,
  cuerpo: { rango: string | null; tipo: string | null },
): Promise<string> {
  const respuesta = await sigeda.put<unknown>(`/api/personas/${encodeURIComponent(codigo)}`, cuerpo)
  return soloMensaje(respuesta, MENSAJE_PERSONA_GUARDADA)
}

export const consultasPersonas = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesPersonas.lista(parametros),
      queryFn: () => listarPersonas(parametros),
      placeholderData: keepPreviousData,
    }),
  detalle: (codigo: string) =>
    queryOptions({ queryKey: clavesPersonas.detalle(codigo), queryFn: () => obtenerPersona(codigo) }),
}
```

Create `src/features/personas/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasPersonas, type PersonaDetalle } from './api'

const PATRON_CODIGO = /^[A-Za-z0-9]{6}$/

export async function cargarPersonaVisible(queryClient: QueryClient, codigo: string): Promise<PersonaDetalle> {
  if (!PATRON_CODIGO.test(codigo)) throw notFound()
  try {
    return await queryClient.ensureQueryData(consultasPersonas.detalle(codigo))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
```

- [ ] **Step 5: Write the screens**

Create `src/features/personas/components/dato.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}
```

Create `src/features/personas/components/dialogo-modificar-persona.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { SIN_TIPO, tiposCompatibles } from '@/lib/dominio/personas'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesPersonas, modificarPersona, type PersonaDetalle } from '../api'

export const TEXTO_SOLO_RANGO_Y_TIPO = 'El código, el DNI y los nombres no se pueden modificar; solo el rango y el tipo.'

const esquema = z.object({
  rango: z.string().trim().max(30, 'El rango no puede superar los 30 caracteres.'),
  tipo: z.string(),
})

type Formulario = z.infer<typeof esquema>

export function DialogoModificarPersona({ persona }: { persona: PersonaDetalle }) {
  const [abierto, setAbierto] = useState(false)
  const queryClient = useQueryClient()
  const formulario = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { rango: persona.rango ?? '', tipo: persona.tipo ?? '' },
  })
  const { errors } = formulario.formState
  const opciones = tiposCompatibles(persona.cuenta?.rol?.nombre ?? null)

  const guardar = useMutation({
    mutationFn: (datos: Formulario) =>
      modificarPersona(persona.codigo, {
        rango: datos.rango.trim() === '' ? null : datos.rango.trim(),
        tipo: datos.tipo === '' ? null : datos.tipo,
      }),
    onSuccess: async (mensaje) => {
      setAbierto(false)
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPersonas.todo })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente)
    if (siguiente) formulario.reset({ rango: persona.rango ?? '', tipo: persona.tipo ?? '' })
  }

  return (
    <Dialog open={abierto} onOpenChange={alAbrir}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil aria-hidden />
          Modificar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modificar persona</DialogTitle>
          <DialogDescription>{TEXTO_SOLO_RANGO_Y_TIPO}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={formulario.handleSubmit((datos) => guardar.mutate(datos))}>
          <FieldGroup>
            {guardar.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.rango)}>
              <FieldLabel htmlFor="persona-rango">Rango</FieldLabel>
              <Input id="persona-rango" aria-invalid={Boolean(errors.rango)} {...formulario.register('rango')} />
              <FieldError errors={[errors.rango]} />
            </Field>
            <Field data-invalid={Boolean(errors.tipo)}>
              <FieldLabel htmlFor="persona-tipo">Tipo</FieldLabel>
              <NativeSelect id="persona-tipo" className="w-full" {...formulario.register('tipo')}>
                {opciones.map((opcion) => (
                  <NativeSelectOption key={opcion ?? 'sin-tipo'} value={opcion ?? ''}>
                    {opcion ?? SIN_TIPO}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>{TEXTO_SOLO_RANGO_Y_TIPO}</FieldDescription>
              <FieldError errors={[errors.tipo]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar persona'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

Create `src/features/personas/components/seccion-cuenta.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PersonaDetalle } from '../api'
import { Dato } from './dato'

export const TEXTO_CUENTA_SIN_ROL = 'Sin rol: esta cuenta no puede iniciar sesión.'
export const TEXTO_SIN_CUENTA = 'Sin cuenta'
export const TEXTO_CUENTA_PROPIA =
  'Es su propia cuenta: no puede eliminarla ni cambiar su rol; para cambiar su contraseña use Cambiar contraseña.'

type Props = { persona: PersonaDetalle; esPropia: boolean }

export function SeccionCuenta({ persona, esPropia }: Props) {
  const { cuenta } = persona

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Cuenta</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {cuenta === null ? (
          <p className="text-sm text-muted-foreground">{TEXTO_SIN_CUENTA}</p>
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato etiqueta="Usuario">{cuenta.username}</Dato>
              <Dato etiqueta="Correo">{cuenta.correo ?? '—'}</Dato>
              <Dato etiqueta="Rol">{cuenta.rol?.nombre ?? '—'}</Dato>
            </dl>
            {cuenta.rol === null && <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_SIN_ROL}</p>}
            {esPropia && <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_PROPIA}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

In `src/features/personas/persona-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { cod: string }

export function PersonaPage({ cod }: Props) {
  return <PageHeader titulo="Detalle de persona" descripcion={String(cod)} />
}
```

with:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'
import { StatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSesion } from '@/lib/auth/use-sesion'
import { etiquetaDeTipo } from '@/lib/dominio/personas'
import { consultasPersonas, nombreCompletoDePersona } from './api'
import { Dato } from './components/dato'
import { DialogoModificarPersona } from './components/dialogo-modificar-persona'
import { SeccionCuenta } from './components/seccion-cuenta'

export function PersonaPage({ cod }: { cod: string }) {
  const { data: persona } = useSuspenseQuery(consultasPersonas.detalle(cod))
  const actual = useSesion()
  const esPropia = actual?.codPersona === persona.codigo

  return (
    <>
      <PageHeader
        titulo={nombreCompletoDePersona(persona)}
        descripcion={`${persona.codigo} · ${etiquetaDeTipo(persona.tipo)}`}
        acciones={<DialogoModificarPersona persona={persona} />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Datos de la persona</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato etiqueta="Código">
                <span className="tabular-nums">{persona.codigo}</span>
              </Dato>
              <Dato etiqueta="DNI">
                <span className="tabular-nums">{persona.dni ?? '—'}</span>
              </Dato>
              <Dato etiqueta="Rango">{persona.rango ?? '—'}</Dato>
              <Dato etiqueta="Nombres">{persona.nombre}</Dato>
              <Dato etiqueta="Apellidos">{[persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ') || '—'}</Dato>
              <Dato etiqueta="Tipo">{etiquetaDeTipo(persona.tipo)}</Dato>
              <Dato etiqueta="Estado">
                {persona.estado ? <StatusBadge vocabulario="estado" valor={persona.estado} /> : '—'}
              </Dato>
              <Dato etiqueta="Grupo">{persona.grupo?.nombre ?? 'Sin grupo'}</Dato>
            </dl>
          </CardContent>
        </Card>
        <SeccionCuenta persona={persona} esPropia={esPropia} />
      </div>
    </>
  )
}
```

- [ ] **Step 6: Wire the routes**

In `src/routes/_app/personas/$cod.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PersonaPage } from '@/features/personas/persona-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/$cod')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.persona, context.sesion.actual()),
  component: RutaPersona,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarPersonaVisible } from '@/features/personas/cargar'
import { PersonaPage } from '@/features/personas/persona-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/$cod')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.persona, context.sesion.actual()),
  loader: ({ context, params }) => cargarPersonaVisible(context.queryClient, params.cod),
  component: RutaPersona,
})
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: PASS.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 373 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add persona detail and account section"
```

---

### Task 7: Asignar rol and Restablecer contraseña (CA-PER-08, CA-PER-09, CA-PER-12, CA-PER-13)

**Files:**

- Create: `src/features/personas/components/dialogo-asignar-rol.tsx`
- Create: `src/features/personas/components/dialogo-restablecer-contrasena.tsx`
- Modify: `src/features/personas/components/seccion-cuenta.tsx`
- Test: `src/features/personas/persona-page.test.tsx`

**Interfaces:**
- Consumes: `consultasCuentas.roles()`, `asignarRol`, `restablecerContrasena`, `rolesCompatibles`, `usePuede`, `AvisoDeError`.
- Produces:
  - `DialogoAsignarRol`: `Manage Roles` only, roles loaded when the dialog opens, the select mounts only once they arrived (a first-load failure shows the notice with Reintentar inside the dialog), options filtered by the persona's tipo, and the detail refetches after saving.
  - `DialogoRestablecerContrasena`: contraseña nueva twice, minimum 8, keeps the username, shows the backend's field errors and toasts its `mensaje`.
  - `SeccionCuenta` offers both only when the persona is not the session's own (M2-15).

- [ ] **Step 1: Write the failing tests**

In `src/features/personas/persona-page.test.tsx`, replace:

```tsx
    expect(await screen.findByText('El tipo no corresponde al rol de la cuenta.')).toBeInTheDocument()
  })

  it('una persona inexistente muestra la página no encontrada', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/personas/ZZ9999')
```

with:

```tsx
    expect(await screen.findByText('El tipo no corresponde al rol de la cuenta.')).toBeInTheDocument()
  })

  it('CA-PER-08 asigna un rol compatible con el tipo y refleja el cambio', async () => {
    const { usuario } = await abrirPersona('765432')
    await usuario.click(screen.getByRole('button', { name: 'Asignar rol' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByLabelText('Rol')).toBeInTheDocument()
    expect(dialogo.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Elija un rol',
      'Administrador Web',
      'Jefe de Operaciones',
      'Comandante de Escuadrón',
    ])
    await usuario.selectOptions(dialogo.getByLabelText('Rol'), 'Comandante de Escuadrón')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar rol' }))
    expect(await screen.findByText('Usuario guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(cuenta().getByText('Comandante de Escuadrón')).toBeInTheDocument())
  })

  it('CA-PER-08 el rol de un alumno solo puede ser Alumno', async () => {
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Asignar rol' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByLabelText('Rol')).toBeInTheDocument()
    expect(dialogo.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual(['Elija un rol', 'Alumno'])
  })

  it('CA-PER-09 restablece la contraseña pidiéndola dos veces', async () => {
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Contraseña nueva'), 'clave-segura-1')
    await usuario.type(dialogo.getByLabelText('Repetir contraseña nueva'), 'otra-clave-1')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await dialogo.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    await usuario.clear(dialogo.getByLabelText('Repetir contraseña nueva'))
    await usuario.type(dialogo.getByLabelText('Repetir contraseña nueva'), 'clave-segura-1')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar contraseña' }))
    expect((await screen.findAllByText('Usuario guardada con éxito.')).length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('CA-PER-09 exige al menos 8 caracteres', async () => {
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Contraseña nueva'), 'corta')
    await usuario.type(dialogo.getByLabelText('Repetir contraseña nueva'), 'corta')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await dialogo.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('CA-PER-12 en la propia persona no se ofrecen acciones sobre la cuenta', async () => {
    await abrirPersona('000001')
    expect(screen.queryByRole('button', { name: 'Asignar rol' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restablecer contraseña' })).not.toBeInTheDocument()
  })

  it('CA-PER-08 si los roles no cargan lo avisa dentro del diálogo', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/roles`, () => HttpResponse.error()))
    const { usuario } = await abrirPersona('111111')
    await usuario.click(screen.getByRole('button', { name: 'Asignar rol' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(dialogo.queryByLabelText('Rol')).not.toBeInTheDocument()
  })

  it('una persona inexistente muestra la página no encontrada', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/personas/ZZ9999')
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: FAIL — `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Asignar rol"`

- [ ] **Step 3: Write the screens**

Create `src/features/personas/components/dialogo-asignar-rol.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { AvisoDeError } from '@/components/aviso-de-error'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { asignarRol, consultasCuentas } from '@/features/cuentas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { rolesCompatibles } from '@/lib/dominio/personas'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesPersonas, type PersonaDetalle } from '../api'

const esquema = z.object({ idRol: z.string().min(1, 'Elija un rol.') })

type Formulario = z.infer<typeof esquema>

type Props = { persona: PersonaDetalle; idUsuario: number }

export function DialogoAsignarRol({ persona, idUsuario }: Props) {
  const [abierto, setAbierto] = useState(false)
  const queryClient = useQueryClient()
  const roles = useQuery({ ...consultasCuentas.roles(), enabled: abierto })
  const errorDeRoles = errorDePrimeraCarga(roles)
  const compatibles = (roles.data ?? []).filter((rol) => rolesCompatibles(persona.tipo).includes(rol.nombre))
  const formulario = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { idRol: persona.cuenta?.rol ? String(persona.cuenta.rol.id) : '' },
  })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (datos: Formulario) => asignarRol(idUsuario, Number(datos.idRol)),
    onSuccess: async (mensaje) => {
      setAbierto(false)
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPersonas.todo })
    },
  })

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldCheck aria-hidden />
          Asignar rol
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar rol</DialogTitle>
          <DialogDescription>Solo se ofrecen los roles compatibles con el tipo de la persona.</DialogDescription>
        </DialogHeader>
        {errorDeRoles !== null ? (
          <AvisoDeError error={errorDeRoles} alReintentar={() => void roles.refetch()} />
        ) : !roles.isSuccess ? (
          <Skeleton className="h-10 w-full" aria-busy="true" />
        ) : (
          <form noValidate onSubmit={formulario.handleSubmit((datos) => guardar.mutate(datos))}>
            <FieldGroup>
              {guardar.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
                  </AlertDescription>
                </Alert>
              )}
              <Field data-invalid={Boolean(errors.idRol)}>
                <FieldLabel htmlFor="cuenta-rol">Rol</FieldLabel>
                <NativeSelect
                  id="cuenta-rol"
                  className="w-full"
                  aria-invalid={Boolean(errors.idRol)}
                  {...formulario.register('idRol')}
                >
                  <NativeSelectOption value="">Elija un rol</NativeSelectOption>
                  {compatibles.map((rol) => (
                    <NativeSelectOption key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.idRol]} />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : 'Guardar rol'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

Create `src/features/personas/components/dialogo-restablecer-contrasena.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { restablecerContrasena } from '@/features/cuentas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import type { CuentaDePersona } from '../api'

const esquema = z
  .object({
    nueva: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmacion: z.string().min(1, 'Repita la contraseña nueva.'),
  })
  .refine((datos) => datos.nueva === datos.confirmacion, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmacion'],
  })

type Formulario = z.infer<typeof esquema>

const RENOMBRAR = { password: 'nueva' }

export function DialogoRestablecerContrasena({ cuenta }: { cuenta: CuentaDePersona }) {
  const [abierto, setAbierto] = useState(false)
  const formulario = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nueva: '', confirmacion: '' },
  })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (datos: Formulario) => restablecerContrasena(cuenta.id, cuenta.username, datos.nueva),
    onSuccess: (mensaje) => {
      setAbierto(false)
      formulario.reset()
      toast.success(mensaje)
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError, RENOMBRAR)
    },
  })

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound aria-hidden />
          Restablecer contraseña
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>Se conserva el usuario «{cuenta.username}».</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={formulario.handleSubmit((datos) => guardar.mutate(datos))}>
          <FieldGroup>
            {guardar.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.nueva)}>
              <FieldLabel htmlFor="cuenta-nueva">Contraseña nueva</FieldLabel>
              <Input
                id="cuenta-nueva"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.nueva)}
                {...formulario.register('nueva')}
              />
              <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
              <FieldError errors={[errors.nueva]} />
            </Field>
            <Field data-invalid={Boolean(errors.confirmacion)}>
              <FieldLabel htmlFor="cuenta-confirmacion">Repetir contraseña nueva</FieldLabel>
              <Input
                id="cuenta-confirmacion"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmacion)}
                {...formulario.register('confirmacion')}
              />
              <FieldError errors={[errors.confirmacion]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

In `src/features/personas/components/seccion-cuenta.tsx`, replace:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PersonaDetalle } from '../api'
import { Dato } from './dato'

export const TEXTO_CUENTA_SIN_ROL = 'Sin rol: esta cuenta no puede iniciar sesión.'
export const TEXTO_SIN_CUENTA = 'Sin cuenta'
```

with:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePuede } from '@/lib/auth/use-sesion'
import type { PersonaDetalle } from '../api'
import { Dato } from './dato'
import { DialogoAsignarRol } from './dialogo-asignar-rol'
import { DialogoRestablecerContrasena } from './dialogo-restablecer-contrasena'

export const TEXTO_CUENTA_SIN_ROL = 'Sin rol: esta cuenta no puede iniciar sesión.'
export const TEXTO_SIN_CUENTA = 'Sin cuenta'
```

In `src/features/personas/components/seccion-cuenta.tsx`, replace:

```tsx

export function SeccionCuenta({ persona, esPropia }: Props) {
  const { cuenta } = persona

  return (
    <Card>
```

with:

```tsx

export function SeccionCuenta({ persona, esPropia }: Props) {
  const { cuenta } = persona
  const puedeAsignarRol = usePuede('Manage Roles')

  return (
    <Card>
```

In `src/features/personas/components/seccion-cuenta.tsx`, replace:

```tsx
              <Dato etiqueta="Rol">{cuenta.rol?.nombre ?? '—'}</Dato>
            </dl>
            {cuenta.rol === null && <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_SIN_ROL}</p>}
            {esPropia && <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_PROPIA}</p>}
          </>
        )}
      </CardContent>
```

with:

```tsx
              <Dato etiqueta="Rol">{cuenta.rol?.nombre ?? '—'}</Dato>
            </dl>
            {cuenta.rol === null && <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_SIN_ROL}</p>}
            {esPropia ? (
              <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_PROPIA}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {puedeAsignarRol && <DialogoAsignarRol persona={persona} idUsuario={cuenta.id} />}
                <DialogoRestablecerContrasena cuenta={cuenta} />
              </div>
            )}
          </>
        )}
      </CardContent>
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: PASS.

- [ ] **Step 5: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 379 tests.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add rol and password actions on the persona account"
```

---

### Task 8: Eliminar persona (CA-PER-10, CA-PER-12, CA-DEP-01) (M2-4)

**Files:**

- Modify: `src/features/personas/api.ts`
- Create: `src/features/personas/components/eliminar-persona.tsx`
- Test: `src/features/personas/persona-page.test.tsx`
- Modify: `src/features/personas/persona-page.tsx`
- Modify: `src/mocks/sigeda/personas.ts`

**Interfaces:**
- Consumes: `ConfirmDialog`, `accionDisponible`, `normalizarError`’s business-rule 403 (Task 3).
- Produces:
  - `DELETE /api/personas/{cod}` in the mocks with the three 403 texts of contract §1.5 (B4, B5, B6) and the transactional delete of dependency 30 (usuario included).
  - `eliminarPersona` and `EliminarPersona`: disabled with T11 while dependency 30 is pending; otherwise confirm dialog, success toast plus a return to the list, and the backend's reason as an error toast with the persona still in the list.

- [ ] **Step 1: Write the failing tests**

In `src/features/personas/persona-page.test.tsx`, replace:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { TEXTO_SOLO_RANGO_Y_TIPO } from './components/dialogo-modificar-persona'
```

with:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { TEXTO_SOLO_RANGO_Y_TIPO } from './components/dialogo-modificar-persona'
```

In `src/features/personas/persona-page.test.tsx`, replace:

```tsx
    expect(dialogo.queryByLabelText('Rol')).not.toBeInTheDocument()
  })

  it('una persona inexistente muestra la página no encontrada', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/personas/ZZ9999')
```

with:

```tsx
    expect(dialogo.queryByLabelText('Rol')).not.toBeInTheDocument()
  })

  it('CA-PER-10 eliminar pide confirmación, avisa y vuelve a la lista', async () => {
    const { usuario, router } = await abrirPersona('654321')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Se eliminará a Lucía Mendoza Ríos')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Persona eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/personas'))
    expect(await screen.findByRole('table', { name: 'Personas registradas' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '654321' })).not.toBeInTheDocument()
  })

  it('CA-PER-10 y M2-4 muestra el motivo del backend cuando no se puede eliminar', async () => {
    const { usuario, router } = await abrirPersona('555555')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('No se puede eliminar alumno, ya realizó una evaluación.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/personas/555555')
  })

  it('CA-PER-10 explica que el alumno o el instructor están en un turno', async () => {
    const primera = await abrirPersona('222222')
    await primera.usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await primera.usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('El alumno no se pudo eliminar, está presente en un turno.')).toBeInTheDocument()
    primera.unmount()
    const segunda = await abrirPersona('444444')
    await segunda.usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await segunda.usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('El instructor no se pudo eliminar, está presente en un turno.')).toBeInTheDocument()
  })

  it('CA-PER-12 la propia persona no se puede eliminar', async () => {
    await abrirPersona('000001')
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('CA-DEP-01 sin la dependencia 30 resuelta, Eliminar está deshabilitada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirPersona('654321')
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })

  it('una persona inexistente muestra la página no encontrada', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/personas/ZZ9999')
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: FAIL — `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Eliminar"`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/mocks/sigeda/personas.ts`, replace:

```ts
import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { esTipoPersona, rolCompatible } from '@/lib/dominio/personas'
import { API, autorizar, erroresDeCampo, guardado, paginar, textoNoEncontrado } from './comun'
import {
  buscarPersona,
  buscarUsuarioPorNombre,
```

with:

```ts
import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { esTipoPersona, rolCompatible } from '@/lib/dominio/personas'
import {
  API,
  autorizar,
  erroresDeCampo,
  guardado,
  paginar,
  textoEliminado,
  textoNoEncontrado,
  textoProhibido,
} from './comun'
import {
  buscarPersona,
  buscarUsuarioPorNombre,
```

In `src/mocks/sigeda/personas.ts`, replace:

```ts
    persona.tipo = esTipoPersona(tipo) ? tipo : null
    return guardado('Persona', 'persona', entidadPersona(persona))
  }),
  http.get(`${API}/api/personas/:nom`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nom))
```

with:

```ts
    persona.tipo = esTipoPersona(tipo) ? tipo : null
    return guardado('Persona', 'persona', entidadPersona(persona))
  }),
  http.delete(`${API}/api/personas/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const codigo = String(params.cod)
    const persona = buscarPersona(codigo)
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    if (persona.codEvalRealizada) return textoProhibido('No se puede eliminar alumno, ya realizó una evaluación.')
    const enTurno = datos().turnos.some((turno) => turno.alumnos.some((alumno) => alumno.codAlumno === codigo))
    if (enTurno) return textoProhibido('El alumno no se pudo eliminar, está presente en un turno.')
    const esInstructor = datos().turnos.some((turno) => turno.codInstructor === codigo)
    if (esInstructor) return textoProhibido('El instructor no se pudo eliminar, está presente en un turno.')
    datos().usuarios = datos().usuarios.filter((usuario) => usuario.codPersona !== codigo)
    datos().personas = datos().personas.filter((candidata) => candidata.codigo !== codigo)
    return textoEliminado('Persona')
  }),
  http.get(`${API}/api/personas/:nom`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nom))
```

- [ ] **Step 4: Write the API, the schemas and the columns**

In `src/features/personas/api.ts`, replace:

```ts
  }
}

export async function modificarPersona(
  codigo: string,
  cuerpo: { rango: string | null; tipo: string | null },
```

with:

```ts
  }
}

export async function eliminarPersona(codigo: string): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/personas/${encodeURIComponent(codigo)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_PERSONA_ELIMINADA
}

export async function modificarPersona(
  codigo: string,
  cuerpo: { rango: string | null; tipo: string | null },
```

- [ ] **Step 5: Write the screens**

Create `src/features/personas/components/eliminar-persona.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { clavesPersonas, eliminarPersona, nombreCompletoDePersona, type PersonaDetalle } from '../api'

export function EliminarPersona({ persona }: { persona: PersonaDetalle }) {
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const disponible = accionDisponible('eliminarPersona')
  const eliminar = useMutation({
    mutationFn: () => eliminarPersona(persona.codigo),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPersonas.todo })
      await navegar({ to: '/personas' })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  if (!disponible) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="destructive" disabled>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }

  return (
    <ConfirmDialog
      disparador={
        <Button variant="destructive" disabled={eliminar.isPending}>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
      }
      titulo="¿Eliminar la persona?"
      descripcion={`Se eliminará a ${nombreCompletoDePersona(persona)} y su cuenta de acceso. Esta acción no se puede deshacer.`}
      confirmar="Eliminar"
      destructivo
      alConfirmar={() => eliminar.mutate()}
    />
  )
}
```

In `src/features/personas/persona-page.tsx`, replace:

```tsx
import { consultasPersonas, nombreCompletoDePersona } from './api'
import { Dato } from './components/dato'
import { DialogoModificarPersona } from './components/dialogo-modificar-persona'
import { SeccionCuenta } from './components/seccion-cuenta'

export function PersonaPage({ cod }: { cod: string }) {
```

with:

```tsx
import { consultasPersonas, nombreCompletoDePersona } from './api'
import { Dato } from './components/dato'
import { DialogoModificarPersona } from './components/dialogo-modificar-persona'
import { EliminarPersona } from './components/eliminar-persona'
import { SeccionCuenta } from './components/seccion-cuenta'

export function PersonaPage({ cod }: { cod: string }) {
```

In `src/features/personas/persona-page.tsx`, replace:

```tsx
      <PageHeader
        titulo={nombreCompletoDePersona(persona)}
        descripcion={`${persona.codigo} · ${etiquetaDeTipo(persona.tipo)}`}
        acciones={<DialogoModificarPersona persona={persona} />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
```

with:

```tsx
      <PageHeader
        titulo={nombreCompletoDePersona(persona)}
        descripcion={`${persona.codigo} · ${etiquetaDeTipo(persona.tipo)}`}
        acciones={
          <>
            <DialogoModificarPersona persona={persona} />
            {!esPropia && <EliminarPersona persona={persona} />}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: PASS.

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 384 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add eliminar persona"
```

---

### Task 9: Registrar persona with its account (CA-PER-02..CA-PER-05, CA-DEP-01) (M2-1, M2-13)

**Files:**

- Modify: `src/features/personas/api.ts`
- Create: `src/features/personas/components/formulario-persona.tsx`
- Create: `src/features/personas/registrar-persona-page.test.tsx`
- Modify: `src/features/personas/registrar-persona-page.tsx`
- Modify (full rewrite): `src/features/personas/schemas.ts`
- Modify (full rewrite): `src/mocks/sigeda/personas.ts`

**Interfaces:**
- Consumes: `consultasCuentas.roles()`, `rolesCompatibles`, `rolPorDefecto`, `aplicarErroresDeCampo`, `accionDisponible`.
- Produces:
  - `POST /api/personas` in the mocks with the whole validation table of contract §1.3 (dependency 23), the duplicate-code message B1 and the `201 {mensaje, persona, usuario}` of dependency 22.
  - `esquemaPersonaNueva`, `personaNuevaVacia`, `aCuerpoPersonaNueva` (trimmed text, `null` for the optional fields) and `crearPersona`, which reads `{mensaje, persona.codigo}` and tolerates a response without `usuario`.
  - `FormularioPersona`: mounts only once the roles are loaded; the rol is proposed from the tipo and its options are filtered by the tipo (the select is controlled so the proposal survives the option change); backend field errors land under each field, including the account ones; on success it clears the form and opens the persona.
  - `RegistrarPersonaPage` shows T11 instead of the form while dependency 22 is pending.

- [ ] **Step 1: Write the failing tests**

Create `src/features/personas/registrar-persona-page.test.tsx`:

```tsx
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirFormulario() {
  await iniciarComo('admin.sistema')
  const vista = renderApp('/personas/nueva')
  await screen.findByLabelText('Código')
  return vista
}

function opcionesDeRol() {
  return Array.from(screen.getByLabelText('Rol').querySelectorAll('option')).map((opcion) => opcion.textContent)
}

async function completar(usuario: ReturnType<typeof renderApp>['usuario']) {
  await usuario.type(screen.getByLabelText('Código'), '123ABC')
  await usuario.type(screen.getByLabelText('DNI'), '71234567')
  await usuario.type(screen.getByLabelText('Nombre'), 'Rosa')
  await usuario.type(screen.getByLabelText('Apellido paterno'), 'Quispe')
  await usuario.type(screen.getByLabelText('Apellido materno'), 'Huamán')
  await usuario.type(screen.getByLabelText('Rango'), 'Cadete')
  await usuario.type(screen.getByLabelText('Usuario'), 'rosa.quispe')
  await usuario.type(screen.getByLabelText('Correo'), 'rosa.quispe@sigeda.com')
  await usuario.type(screen.getByLabelText('Contraseña'), 'Cambio2026')
  await usuario.type(screen.getByLabelText('Repetir contraseña'), 'Cambio2026')
}

describe('Registrar persona', () => {
  it('CA-PER-02 exige los datos de la persona y de la cuenta', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El código es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El DNI es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El apellido paterno es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El correo es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('CA-PER-02 valida el formato del código, el DNI, el usuario y la contraseña repetida', async () => {
    const { usuario } = await abrirFormulario()
    await usuario.type(screen.getByLabelText('Código'), '12')
    await usuario.type(screen.getByLabelText('DNI'), '123')
    await usuario.type(screen.getByLabelText('Usuario'), 'Rosa Quispe')
    await usuario.type(screen.getByLabelText('Correo'), 'rosa')
    await usuario.type(screen.getByLabelText('Contraseña'), 'Cambio2026')
    await usuario.type(screen.getByLabelText('Repetir contraseña'), 'otra-clave')
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El código debe tener 6 caracteres alfanuméricos.')).toBeInTheDocument()
    expect(screen.getByText('El DNI debe tener 8 dígitos.')).toBeInTheDocument()
    expect(
      screen.getByText('El nombre de usuario debe tener de 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingresar correo válido.')).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
  })

  it('CA-PER-03 propone el rol según el tipo y solo ofrece los compatibles', async () => {
    const { usuario } = await abrirFormulario()
    expect(screen.getByLabelText('Tipo')).toHaveValue('Alumno')
    expect(screen.getByLabelText('Rol')).toHaveValue('1')
    expect(opcionesDeRol()).toEqual(['Elija un rol', 'Alumno'])
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Instructor PDI')
    expect(screen.getByLabelText('Rol')).toHaveValue('4')
    expect(opcionesDeRol()).toEqual(['Elija un rol', 'Jefe de Operaciones', 'Instructor', 'Comandante de Escuadrón'])
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Sin tipo')
    expect(screen.getByLabelText('Rol')).toHaveValue('')
    expect(opcionesDeRol()).toEqual([
      'Elija un rol',
      'Administrador Web',
      'Jefe de Operaciones',
      'Comandante de Escuadrón',
    ])
  })

  it('CA-PER-04 muestra el mensaje del backend cuando el código ya existe', async () => {
    const { usuario } = await abrirFormulario()
    await completar(usuario)
    await usuario.clear(screen.getByLabelText('Código'))
    await usuario.type(screen.getByLabelText('Código'), '111111')
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El alumno ya ha sido registrado.')).toBeInTheDocument()
  })

  it('CA-PER-04 lleva los errores del backend al campo de la cuenta', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/personas`, () =>
        HttpResponse.json(["'usuario.username': El nombre de usuario ya está en uso."], { status: 400 }),
      ),
    )
    const { usuario } = await abrirFormulario()
    await completar(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('El nombre de usuario ya está en uso.')).toBeInTheDocument()
  })

  it('CA-PER-05 guarda, avisa y abre el detalle sin mostrar la contraseña', async () => {
    const { usuario, router } = await abrirFormulario()
    await completar(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar persona' }))
    expect(await screen.findByText('Persona guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/personas/123ABC'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Rosa Quispe Huamán' })).toBeInTheDocument()
    expect(screen.getByText('rosa.quispe')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Cambio2026')
  })

  it('CA-DEP-01 sin la dependencia 22 resuelta la ruta no muestra el formulario', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('admin.sistema')
    renderApp('/personas/nueva')
    expect(await screen.findByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: FAIL — `TestingLibraryElementError: Unable to find a label with the text of: Código`

- [ ] **Step 3: Write the mocks and the shared modules**

Replace `src/mocks/sigeda/personas.ts` with:

```ts
import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { esTipoPersona, rolCompatible } from '@/lib/dominio/personas'
import { erroresDeContrasena, erroresDeUsername } from './cuentas'
import {
  API,
  autorizar,
  erroresDeCampo,
  guardado,
  paginar,
  textoEliminado,
  textoMalaPeticion,
  textoNoEncontrado,
  textoProhibido,
} from './comun'
import {
  buscarPersona,
  buscarUsuarioPorNombre,
  datos,
  rolPorId,
  siguienteId,
  usuarioDePersona,
  type PersonaMock,
} from './datos'

function indexPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    rango: persona.rango,
    tipo: persona.tipo,
  }
}

function entidadPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    rango: persona.rango,
    dni: persona.dni,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    estado: persona.estado,
    tipo: persona.tipo,
    codEvalRealizada: persona.codEvalRealizada,
    codEvalDesaprobada: null,
    contChequeo: 0,
    contEval: persona.contEval,
    contMalo: 0,
    contRegular: 0,
    checked: false,
    idGrupo: persona.idGrupo,
    desaprobados: null,
  }
}

function detalleUsuario(persona: PersonaMock) {
  const usuario = usuarioDePersona(persona.codigo)
  const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
  const rol = usuario ? rolPorId(usuario.idRol) : null
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    dni: persona.dni,
    rango: persona.rango,
    tipo: persona.tipo,
    estado: persona.estado,
    grupo: grupo ? { id: grupo.id, nombre: grupo.nombre } : null,
    usuario: usuario
      ? { id: usuario.id, nombre: usuario.username, correo: usuario.correo, rol: rol && { ...rol } }
      : null,
  }
}

const PATRON_CODIGO = /^[A-Za-z0-9]{6}$/
const PATRON_DNI = /^\d{8}$/
const PATRON_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function obligatorio(valor: unknown, campo: string, mensaje: string): string[] {
  return texto(valor).trim() === '' ? [`'${campo}': ${mensaje}`] : []
}

function erroresDePersonaNueva(cuerpo: CuerpoPersonaNueva): string[] {
  const errores: string[] = []
  const codigo = obligatorio(cuerpo.codigo, 'codigo', 'El código es obligatorio.')
  if (codigo.length > 0) errores.push(...codigo)
  else if (!PATRON_CODIGO.test(texto(cuerpo.codigo))) {
    errores.push("'codigo': El código debe tener 6 caracteres alfanuméricos.")
  }
  const dni = obligatorio(cuerpo.dni, 'dni', 'El DNI es obligatorio.')
  if (dni.length > 0) errores.push(...dni)
  else if (!PATRON_DNI.test(texto(cuerpo.dni))) errores.push("'dni': El DNI debe tener 8 dígitos.")
  const nombre = obligatorio(cuerpo.nombre, 'nombre', 'El nombre es obligatorio')
  if (nombre.length > 0) errores.push(...nombre)
  else if (texto(cuerpo.nombre).length > 50) errores.push("'nombre': El nombre no puede superar los 50 caracteres.")
  const aPaterno = obligatorio(cuerpo.aPaterno, 'aPaterno', 'El apellido paterno es obligatorio.')
  if (aPaterno.length > 0) errores.push(...aPaterno)
  else if (texto(cuerpo.aPaterno).length > 50) {
    errores.push("'aPaterno': El apellido paterno no puede superar los 50 caracteres.")
  }
  if (texto(cuerpo.aMaterno).length > 50) {
    errores.push("'aMaterno': El apellido materno no puede superar los 50 caracteres.")
  }
  if (texto(cuerpo.rango).length > 30) errores.push("'rango': El rango no puede superar los 30 caracteres.")
  const tipo = cuerpo.tipo ?? null
  const tipoValido = tipo === null || esTipoPersona(tipo)
  if (!tipoValido) errores.push("'tipo': Ingresar tipo de persona válido.")
  const usuario = cuerpo.usuario
  if (!usuario) {
    errores.push("'usuario': Los datos de la cuenta son requeridos.")
    return errores
  }
  errores.push(...erroresDeUsername(usuario.username, 'usuario.username', null))
  const correo = obligatorio(usuario.correo, 'usuario.correo', 'El correo es obligatorio.')
  if (correo.length > 0) errores.push(...correo)
  else if (!PATRON_CORREO.test(texto(usuario.correo))) errores.push("'usuario.correo': Ingresar correo válido.")
  errores.push(...erroresDeContrasena(usuario.password, 'usuario.password'))
  const idRol = Number(usuario.idRol)
  const rol = Number.isInteger(idRol) && idRol > 0 ? rolPorId(idRol) : null
  if (!Number.isInteger(idRol) || idRol <= 0) errores.push("'usuario.idRol': El rol es requerido.")
  else if (!rol) errores.push("'usuario.idRol': El rol seleccionado no existe.")
  else if (tipoValido && !rolCompatible(tipo, rol.nombre)) {
    errores.push("'usuario.idRol': El rol no corresponde al tipo de persona.")
  }
  return errores
}

type CuerpoPersonaNueva = {
  codigo?: unknown
  dni?: unknown
  nombre?: unknown
  aPaterno?: unknown
  aMaterno?: unknown
  rango?: unknown
  tipo?: string | null
  usuario?: { username?: unknown; correo?: unknown; password?: unknown; idRol?: unknown } | null
}

export const handlersPersonas = [
  http.get(`${API}/api/personas`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    return paginar(datos().personas, new URL(request.url), {
      nombreLista: 'personas',
      propiedadPorDefecto: 'codigo',
      proyectar: indexPersona,
    })
  }),
  http.post(`${API}/api/personas`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoPersonaNueva
    const errores = erroresDePersonaNueva(cuerpo)
    if (errores.length > 0) return erroresDeCampo(errores)
    const codigo = texto(cuerpo.codigo)
    if (buscarPersona(codigo)) return textoMalaPeticion('El alumno ya ha sido registrado.')
    const persona: PersonaMock = {
      codigo,
      nombre: texto(cuerpo.nombre),
      aPaterno: texto(cuerpo.aPaterno),
      aMaterno: texto(cuerpo.aMaterno),
      dni: texto(cuerpo.dni),
      rango: texto(cuerpo.rango) === '' ? null : texto(cuerpo.rango),
      tipo: esTipoPersona(cuerpo.tipo) ? cuerpo.tipo : null,
      estado: 'Apto',
      idGrupo: null,
      contEval: 0,
      codEvalRealizada: null,
    }
    const cuenta = cuerpo.usuario
    const usuario = {
      id: siguienteId('usuario'),
      username: texto(cuenta?.username),
      correo: texto(cuenta?.correo),
      codPersona: codigo,
      idRol: Number(cuenta?.idRol),
      password: texto(cuenta?.password),
    }
    datos().personas.push(persona)
    datos().usuarios.push(usuario)
    const rol = rolPorId(usuario.idRol)
    return HttpResponse.json(
      {
        mensaje: 'Persona guardada con éxito.',
        persona: entidadPersona(persona),
        usuario: {
          id: usuario.id,
          username: usuario.username,
          correo: usuario.correo,
          rol: rol && { id: rol.id, nombre: rol.nombre },
        },
      },
      { status: 201 },
    )
  }),
  http.get(`${API}/api/personas/:cod/usuario`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    return HttpResponse.json(detalleUsuario(persona))
  }),
  http.put(`${API}/api/personas/:cod`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    const cuerpo = (await request.json()) as { rango?: unknown; tipo?: unknown }
    const errores: string[] = []
    const tipo = cuerpo.tipo ?? null
    if (tipo !== null && !esTipoPersona(tipo)) errores.push("'tipo': Ingresar tipo de persona válido.")
    else {
      const rol = rolPorId(usuarioDePersona(persona.codigo)?.idRol ?? null)
      if (rol && !rolCompatible(tipo, rol.nombre)) errores.push("'tipo': El tipo no corresponde al rol de la cuenta.")
    }
    const rango = cuerpo.rango ?? null
    if (typeof rango === 'string' && rango.length > 30) {
      errores.push("'rango': El rango no puede superar los 30 caracteres.")
    }
    if (errores.length > 0) return erroresDeCampo(errores)
    persona.rango = typeof rango === 'string' ? rango : null
    persona.tipo = esTipoPersona(tipo) ? tipo : null
    return guardado('Persona', 'persona', entidadPersona(persona))
  }),
  http.delete(`${API}/api/personas/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const codigo = String(params.cod)
    const persona = buscarPersona(codigo)
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    if (persona.codEvalRealizada) return textoProhibido('No se puede eliminar alumno, ya realizó una evaluación.')
    const enTurno = datos().turnos.some((turno) => turno.alumnos.some((alumno) => alumno.codAlumno === codigo))
    if (enTurno) return textoProhibido('El alumno no se pudo eliminar, está presente en un turno.')
    const esInstructor = datos().turnos.some((turno) => turno.codInstructor === codigo)
    if (esInstructor) return textoProhibido('El instructor no se pudo eliminar, está presente en un turno.')
    datos().usuarios = datos().usuarios.filter((usuario) => usuario.codPersona !== codigo)
    datos().personas = datos().personas.filter((candidata) => candidata.codigo !== codigo)
    return textoEliminado('Persona')
  }),
  http.get(`${API}/api/personas/:nom`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nom))
    const persona = usuario ? buscarPersona(usuario.codPersona) : undefined
    if (!usuario || !persona) return textoNoEncontrado('Persona especificada no existe.')
    const rol = rolPorId(usuario.idRol)
    return HttpResponse.json({
      codigo: persona.codigo,
      nombre: persona.nombre,
      aPaterno: persona.aPaterno,
      aMaterno: persona.aMaterno,
      idGrupo: persona.idGrupo,
      usuario: {
        nombre: usuario.username,
        correo: usuario.correo,
        id: usuario.id,
        rol: rol && { id: rol.id, nombre: rol.nombre },
      },
    })
  }),
]
```

- [ ] **Step 4: Write the API, the schemas and the columns**

In `src/features/personas/api.ts`, replace:

```ts
import { soloMensaje } from '@/features/cuentas/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type PersonaFila = {
  codigo: string
```

with:

```ts
import { soloMensaje } from '@/features/cuentas/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import type { CuerpoPersonaNueva } from './schemas'

export type PersonaFila = {
  codigo: string
```

In `src/features/personas/api.ts`, replace:

```ts

const esquemaIdDeUsuario = z.object({ usuario: z.object({ id: z.number() }) })

export function apellidosYNombres(persona: Pick<PersonaFila, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  const apellidos = [persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
  return apellidos === '' ? persona.nombre : `${apellidos}, ${persona.nombre}`
```

with:

```ts

const esquemaIdDeUsuario = z.object({ usuario: z.object({ id: z.number() }) })

const esquemaPersonaCreada = z.object({ mensaje: z.string(), persona: z.object({ codigo: z.string() }) })

export function apellidosYNombres(persona: Pick<PersonaFila, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  const apellidos = [persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
  return apellidos === '' ? persona.nombre : `${apellidos}, ${persona.nombre}`
```

In `src/features/personas/api.ts`, replace:

```ts
  }
}

export async function eliminarPersona(codigo: string): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/personas/${encodeURIComponent(codigo)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_PERSONA_ELIMINADA
```

with:

```ts
  }
}

export async function crearPersona(cuerpo: CuerpoPersonaNueva): Promise<{ mensaje: string; codigo: string }> {
  const respuesta = await sigeda.post<unknown>('/api/personas', cuerpo)
  const leida = esquemaPersonaCreada.safeParse(respuesta)
  return leida.success
    ? { mensaje: leida.data.mensaje, codigo: leida.data.persona.codigo }
    : { mensaje: MENSAJE_PERSONA_GUARDADA, codigo: cuerpo.codigo }
}

export async function eliminarPersona(codigo: string): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/personas/${encodeURIComponent(codigo)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_PERSONA_ELIMINADA
```

Replace `src/features/personas/schemas.ts` with:

```ts
import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'
import { TIPOS_PERSONA } from '@/lib/dominio/personas'

export const esquemaBusquedaPersonas = z.object(esquemaPaginacion)

export type BusquedaPersonas = z.infer<typeof esquemaBusquedaPersonas>

export const esquemaPersonaNueva = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(1, 'El código es obligatorio.')
      .regex(/^[A-Za-z0-9]{6}$/, 'El código debe tener 6 caracteres alfanuméricos.'),
    dni: z.string().trim().min(1, 'El DNI es obligatorio.').regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos.'),
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(50, 'El nombre no puede superar los 50 caracteres.'),
    aPaterno: z
      .string()
      .trim()
      .min(1, 'El apellido paterno es obligatorio.')
      .max(50, 'El apellido paterno no puede superar los 50 caracteres.'),
    aMaterno: z.string().trim().max(50, 'El apellido materno no puede superar los 50 caracteres.'),
    rango: z.string().trim().max(30, 'El rango no puede superar los 30 caracteres.'),
    tipo: z.string().refine((valor) => valor === '' || TIPOS_PERSONA.some((tipo) => tipo === valor), {
      message: 'Ingresar tipo de persona válido.',
    }),
    usuario: z.object({
      username: z
        .string()
        .trim()
        .min(1, 'El nombre de usuario es obligatorio.')
        .regex(
          /^[a-z0-9._]{4,30}$/,
          'El nombre de usuario debe tener de 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.',
        ),
      correo: z.string().trim().min(1, 'El correo es obligatorio.').regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Ingresar correo válido.'),
      password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
      confirmacion: z.string().min(1, 'Repita la contraseña.'),
      idRol: z.string().min(1, 'El rol es requerido.'),
    }),
  })
  .refine((datos) => datos.usuario.password === datos.usuario.confirmacion, {
    message: 'Las contraseñas no coinciden.',
    path: ['usuario', 'confirmacion'],
  })

export type ValoresPersonaNueva = z.input<typeof esquemaPersonaNueva>

export function personaNuevaVacia(idRolAlumno?: number): ValoresPersonaNueva {
  return {
    codigo: '',
    dni: '',
    nombre: '',
    aPaterno: '',
    aMaterno: '',
    rango: '',
    tipo: 'Alumno',
    usuario: {
      username: '',
      correo: '',
      password: '',
      confirmacion: '',
      idRol: idRolAlumno === undefined ? '' : String(idRolAlumno),
    },
  }
}

export function aCuerpoPersonaNueva(valores: ValoresPersonaNueva) {
  return {
    codigo: valores.codigo.trim(),
    dni: valores.dni.trim(),
    nombre: valores.nombre.trim(),
    aPaterno: valores.aPaterno.trim(),
    aMaterno: valores.aMaterno.trim() === '' ? null : valores.aMaterno.trim(),
    rango: valores.rango.trim() === '' ? null : valores.rango.trim(),
    tipo: valores.tipo === '' ? null : valores.tipo,
    usuario: {
      username: valores.usuario.username.trim(),
      correo: valores.usuario.correo.trim(),
      password: valores.usuario.password,
      idRol: Number(valores.usuario.idRol),
    },
  }
}

export type CuerpoPersonaNueva = ReturnType<typeof aCuerpoPersonaNueva>
```

- [ ] **Step 5: Write the screens**

Create `src/features/personas/components/formulario-persona.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasCuentas } from '@/features/cuentas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { rolesCompatibles, rolPorDefecto, SIN_TIPO, TIPOS_PERSONA } from '@/lib/dominio/personas'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import type { Rol } from '@/features/cuentas/api'
import { clavesPersonas, crearPersona } from '../api'
import { aCuerpoPersonaNueva, esquemaPersonaNueva, personaNuevaVacia, type ValoresPersonaNueva } from '../schemas'

export function FormularioPersona() {
  const roles = useQuery(consultasCuentas.roles())
  const errorDeRoles = errorDePrimeraCarga(roles)

  if (errorDeRoles !== null) return <AvisoDeError error={errorDeRoles} alReintentar={() => void roles.refetch()} />
  if (!roles.isSuccess) return <p className="text-sm text-muted-foreground">Cargando los roles…</p>
  return <FormularioConRoles roles={roles.data} />
}

function FormularioConRoles({ roles }: { roles: Rol[] }) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales = personaNuevaVacia(roles.find((rol) => rol.nombre === 'Alumno')?.id)
  const formulario = useForm<ValoresPersonaNueva>({
    resolver: zodResolver(esquemaPersonaNueva),
    defaultValues: iniciales,
  })
  const { errors } = formulario.formState
  const tipo = useWatch({ control: formulario.control, name: 'tipo' })
  const compatibles = roles.filter((rol) => rolesCompatibles(tipo === '' ? null : tipo).includes(rol.nombre))

  const guardar = useMutation({
    mutationFn: (valores: ValoresPersonaNueva) => crearPersona(aCuerpoPersonaNueva(valores)),
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      formulario.reset(iniciales)
      await queryClient.invalidateQueries({ queryKey: clavesPersonas.todo })
      await navegar({ to: '/personas/$cod', params: { cod: resultado.codigo } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function cambiarTipo(valor: string) {
    formulario.setValue('tipo', valor, { shouldValidate: formulario.formState.isSubmitted })
    const permitidos = rolesCompatibles(valor === '' ? null : valor)
    const propuesto = roles.find((rol) => rol.nombre === rolPorDefecto(valor === '' ? null : valor))
    const actual = roles.find((rol) => String(rol.id) === formulario.getValues('usuario.idRol'))
    if (actual && permitidos.includes(actual.nombre)) return
    formulario.setValue('usuario.idRol', propuesto ? String(propuesto.id) : '')
  }

  return (
    <form
      noValidate
      onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))}
      className="grid gap-6"
    >
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo registrar la persona</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos de la persona</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.codigo)}>
              <FieldLabel htmlFor="persona-codigo">Código</FieldLabel>
              <Input id="persona-codigo" aria-invalid={Boolean(errors.codigo)} {...formulario.register('codigo')} />
              <FieldDescription>6 caracteres alfanuméricos.</FieldDescription>
              <FieldError errors={[errors.codigo]} />
            </Field>
            <Field data-invalid={Boolean(errors.dni)}>
              <FieldLabel htmlFor="persona-dni">DNI</FieldLabel>
              <Input id="persona-dni" inputMode="numeric" aria-invalid={Boolean(errors.dni)} {...formulario.register('dni')} />
              <FieldError errors={[errors.dni]} />
            </Field>
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="persona-nombre">Nombre</FieldLabel>
              <Input id="persona-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.aPaterno)}>
              <FieldLabel htmlFor="persona-apaterno">Apellido paterno</FieldLabel>
              <Input id="persona-apaterno" aria-invalid={Boolean(errors.aPaterno)} {...formulario.register('aPaterno')} />
              <FieldError errors={[errors.aPaterno]} />
            </Field>
            <Field data-invalid={Boolean(errors.aMaterno)}>
              <FieldLabel htmlFor="persona-amaterno">Apellido materno</FieldLabel>
              <Input id="persona-amaterno" aria-invalid={Boolean(errors.aMaterno)} {...formulario.register('aMaterno')} />
              <FieldError errors={[errors.aMaterno]} />
            </Field>
            <Field data-invalid={Boolean(errors.rango)}>
              <FieldLabel htmlFor="persona-rango">Rango</FieldLabel>
              <Input id="persona-rango" aria-invalid={Boolean(errors.rango)} {...formulario.register('rango')} />
              <FieldError errors={[errors.rango]} />
            </Field>
            <Field data-invalid={Boolean(errors.tipo)}>
              <FieldLabel htmlFor="persona-tipo">Tipo</FieldLabel>
              <Controller
                control={formulario.control}
                name="tipo"
                render={({ field }) => (
                  <NativeSelect
                    id="persona-tipo"
                    className="w-full"
                    aria-invalid={Boolean(errors.tipo)}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => cambiarTipo(evento.target.value)}
                  >
                    {TIPOS_PERSONA.map((opcion) => (
                      <NativeSelectOption key={opcion} value={opcion}>
                        {opcion}
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value="">{SIN_TIPO}</NativeSelectOption>
                  </NativeSelect>
                )}
              />
              <FieldDescription>El tipo define los roles que puede tener la cuenta.</FieldDescription>
              <FieldError errors={[errors.tipo]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Cuenta</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.usuario?.username)}>
              <FieldLabel htmlFor="persona-usuario">Usuario</FieldLabel>
              <Input
                id="persona-usuario"
                aria-invalid={Boolean(errors.usuario?.username)}
                {...formulario.register('usuario.username')}
              />
              <FieldDescription>De 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.</FieldDescription>
              <FieldError errors={[errors.usuario?.username]} />
            </Field>
            <Field data-invalid={Boolean(errors.usuario?.correo)}>
              <FieldLabel htmlFor="persona-correo">Correo</FieldLabel>
              <Input
                id="persona-correo"
                type="email"
                aria-invalid={Boolean(errors.usuario?.correo)}
                {...formulario.register('usuario.correo')}
              />
              <FieldError errors={[errors.usuario?.correo]} />
            </Field>
            <Field data-invalid={Boolean(errors.usuario?.password)}>
              <FieldLabel htmlFor="persona-password">Contraseña</FieldLabel>
              <Input
                id="persona-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.usuario?.password)}
                {...formulario.register('usuario.password')}
              />
              <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
              <FieldError errors={[errors.usuario?.password]} />
            </Field>
            <Field data-invalid={Boolean(errors.usuario?.confirmacion)}>
              <FieldLabel htmlFor="persona-confirmacion">Repetir contraseña</FieldLabel>
              <Input
                id="persona-confirmacion"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.usuario?.confirmacion)}
                {...formulario.register('usuario.confirmacion')}
              />
              <FieldError errors={[errors.usuario?.confirmacion]} />
            </Field>
            <Field data-invalid={Boolean(errors.usuario?.idRol)}>
              <FieldLabel htmlFor="persona-rol">Rol</FieldLabel>
              <Controller
                control={formulario.control}
                name="usuario.idRol"
                render={({ field }) => (
                  <NativeSelect
                    id="persona-rol"
                    className="w-full"
                    aria-invalid={Boolean(errors.usuario?.idRol)}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => field.onChange(evento.target.value)}
                  >
                    <NativeSelectOption value="">Elija un rol</NativeSelectOption>
                    {compatibles.map((rol) => (
                      <NativeSelectOption key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              <FieldError errors={[errors.usuario?.idRol]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          <Link to="/personas">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar persona'}
        </Button>
      </div>
    </form>
  )
}
```

In `src/features/personas/registrar-persona-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarPersonaPage() {
  return <PageHeader titulo="Registrar persona" />
}
```

with:

```tsx
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { FormularioPersona } from './components/formulario-persona'

export function RegistrarPersonaPage() {
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/personas">Volver a personas</Link>
    </Button>
  )

  if (!accionDisponible('registrarPersona')) {
    return (
      <>
        <PageHeader titulo="Registrar persona" acciones={volver} />
        <Alert>
          <CircleAlert />
          <AlertTitle>No disponible</AlertTitle>
          <AlertDescription>{MENSAJE_DEPENDENCIA_PENDIENTE}</AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader
        titulo="Registrar persona"
        descripcion="Registre una persona y la cuenta con la que ingresa."
        acciones={volver}
      />
      <FormularioPersona />
    </>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/personas
```

Expected: PASS.

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 391 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add registrar persona"
```

---

### Task 10: Grupos list, detail and delete (CA-GRU-01, CA-GRU-06, CA-GRU-07, CA-GRU-08) (M2-5)

**Files:**

- Create: `src/features/grupos/api.ts`
- Create: `src/features/grupos/cargar.ts`
- Create: `src/features/grupos/columnas.tsx`
- Create: `src/features/grupos/grupo-page.test.tsx`
- Modify (full rewrite): `src/features/grupos/grupo-page.tsx`
- Create: `src/features/grupos/grupos-page.test.tsx`
- Modify: `src/features/grupos/grupos-page.tsx`
- Create: `src/features/grupos/schemas.ts`
- Modify: `src/mocks/handlers.ts`
- Create: `src/mocks/sigeda/grupos.ts`
- Modify: `src/routes/_app/grupos/$id/index.tsx`
- Modify: `src/routes/_app/grupos/index.tsx`

**Interfaces:**
- Consumes: `DataTable`, `ConfirmDialog`, `StatusBadge`, `esquemaPaginacion`.
- Produces:
  - `src/mocks/sigeda/grupos.ts` with contract §3: list (`Page_Sort`), detail (entity with its personas), create, update and delete (which leaves the alumnos without grupo).
  - `src/features/grupos/api.ts`: `GrupoFila`, `GrupoDetalle`, `listarGrupos`, `obtenerGrupo` (a `null` body is a 404, dependency 18), `listarAlumnosSinGrupo`, `crearGrupo`, `modificarGrupo`, `eliminarGrupo`.
  - `GruposPage` (nombre, descripción, programa; sorting in the URL) and `GrupoPage` (datos plus the alumnos table, delete with the warning that they will be left without grupo).

- [ ] **Step 1: Write the failing tests**

Create `src/features/grupos/grupo-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirGrupo(id: number) {
  await iniciarComo('admin.sistema')
  const vista = renderApp(`/grupos/${id}`)
  await screen.findByRole('heading', { level: 2, name: 'Alumnos' })
  return vista
}

describe('Detalle de grupo', () => {
  it('CA-GRU-06 muestra los datos del grupo y sus alumnos', async () => {
    await abrirGrupo(3)
    expect(screen.getByRole('heading', { level: 1, name: 'Grupo 3' })).toBeInTheDocument()
    expect(screen.getAllByText('Entrenamiento especializado - Nivel 1').length).toBe(2)
    const tabla = within(screen.getByRole('table', { name: 'Alumnos del grupo' }))
    expect(
      tabla
        .getAllByRole('row')
        .slice(1)
        .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent)),
    ).toEqual([
      ['555555', 'Pedro Rodriguez Garcia', 'Apto'],
      ['666666', 'Ana Torres Martinez', 'Apto'],
    ])
  })

  it('CA-GRU-07 eliminar avisa que los alumnos quedarán sin grupo y vuelve a la lista', async () => {
    const { usuario, router } = await abrirGrupo(3)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('sus alumnos quedarán sin grupo')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Grupo eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/grupos'))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Grupo 3' })).not.toBeInTheDocument())
  })

  it('CA-GRU-08 un grupo inexistente muestra la página no encontrada', async () => {
    await iniciarComo('admin.sistema')
    renderApp('/grupos/99')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })

  it('CA-GRU-08 un 200 sin cuerpo también es no encontrado', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/grupos/:id`, () => new HttpResponse(null, { status: 200 })))
    await iniciarComo('admin.sistema')
    renderApp('/grupos/3')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})
```

Create `src/features/grupos/grupos-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirGrupos(username = 'admin.sistema') {
  await iniciarComo(username)
  const vista = renderApp('/grupos')
  await screen.findByRole('heading', { name: 'Grupos' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Grupos registrados' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

describe('Grupos', () => {
  it('CA-GRU-01 muestra nombre, descripción y programa', async () => {
    await abrirGrupos()
    expect(await screen.findByRole('table', { name: 'Grupos registrados' })).toBeInTheDocument()
    expect(filas()[0]).toEqual(['Grupo 1', 'Instrucción básica - Nuevos ingresantes', 'PDI'])
    expect(screen.getByRole('link', { name: 'Grupo 1' })).toHaveAttribute('href', '/grupos/1')
  })

  it('CA-GRU-01 ordena por nombre y deja el orden en la URL', async () => {
    const { usuario, router } = await abrirGrupos()
    await usuario.click(await screen.findByRole('button', { name: /Nombre/ }))
    expect(router.state.location.search).toMatchObject({ property: 'nombre', direction: 'ASC' })
    await usuario.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(router.state.location.search).toMatchObject({ property: 'nombre', direction: 'DESC' })
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Grupo 6'))
  })

  it('CA-GRU-01 también la ve el jefe de operaciones', async () => {
    await abrirGrupos('jefe.operaciones')
    expect(await screen.findByRole('table', { name: 'Grupos registrados' })).toBeInTheDocument()
  })

  it('muestra el aviso de error si la lista no carga', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/grupos`, () => HttpResponse.error()))
    await abrirGrupos()
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/grupos
```

Expected: FAIL — `TestingLibraryElementError: Unable to find role="heading" and name "Alumnos"`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/mocks/handlers.ts`, replace:

```ts
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

with:

```ts
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersGrupos } from './sigeda/grupos'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersCatalogos,
  ...handlersCuentas,
  ...handlersPersonas,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

with:

```ts
  ...handlersCatalogos,
  ...handlersCuentas,
  ...handlersPersonas,
  ...handlersGrupos,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

Create `src/mocks/sigeda/grupos.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, erroresDeCampo, guardado, paginar, textoEliminado, textoNoEncontrado } from './comun'
import { buscarPersona, datos, siguienteId, type GrupoMock, type PersonaMock, type ProgramaMock } from './datos'

type PersonaDeGrupo = { codigo?: unknown; checked?: unknown }

type CuerpoGrupo = {
  nombre?: unknown
  descripcion?: unknown
  programa?: unknown
  personas?: PersonaDeGrupo[] | null
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function entidadPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    rango: persona.rango,
    dni: persona.dni,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    estado: persona.estado,
    tipo: persona.tipo,
    codEvalRealizada: persona.codEvalRealizada,
    codEvalDesaprobada: null,
    contChequeo: 0,
    contEval: persona.contEval,
    contMalo: 0,
    contRegular: 0,
    checked: false,
    idGrupo: persona.idGrupo,
    desaprobados: null,
  }
}

function detalleGrupo(grupo: GrupoMock) {
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    descripcion: grupo.descripcion,
    programa: grupo.programa,
    personas: datos()
      .personas.filter((persona) => persona.idGrupo === grupo.id)
      .map(entidadPersona),
  }
}

function erroresDeGrupo(cuerpo: CuerpoGrupo, conPrograma: boolean): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': El nombre es obligatorio")
  else if (nombre.length < 3 || nombre.length > 35) {
    errores.push("'nombre': El nombre debe tener entre 3 y 35 caracteres.")
  }
  if (texto(cuerpo.descripcion).length > 255) {
    errores.push("'descripcion': La descripción no puede superar los 255 caracteres.")
  }
  if (conPrograma && cuerpo.programa !== 'PDI' && cuerpo.programa !== 'PDE') {
    errores.push("'programa': Ingresar programa válido.")
  }
  return errores
}

function personasDelCuerpo(cuerpo: CuerpoGrupo): PersonaDeGrupo[] {
  return cuerpo.personas ?? []
}

function faltaAlguna(personas: PersonaDeGrupo[]): boolean {
  return personas.some((persona) => !buscarPersona(texto(persona.codigo)))
}

export const handlersGrupos = [
  http.get(`${API}/api/grupos`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    return paginar(datos().grupos, new URL(request.url), { nombreLista: 'grupos', propiedadPorDefecto: 'id' })
  }),
  http.post(`${API}/api/grupos`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoGrupo
    const errores = erroresDeGrupo(cuerpo, true)
    if (errores.length > 0) return erroresDeCampo(errores)
    const personas = personasDelCuerpo(cuerpo)
    if (faltaAlguna(personas)) return textoNoEncontrado('Persona especificada no existe.')
    const grupo: GrupoMock = {
      id: siguienteId('grupo'),
      nombre: texto(cuerpo.nombre),
      descripcion: texto(cuerpo.descripcion),
      programa: cuerpo.programa === 'PDE' ? 'PDE' : ('PDI' as ProgramaMock),
    }
    datos().grupos.push(grupo)
    for (const elegida of personas) {
      const persona = buscarPersona(texto(elegida.codigo))
      if (persona) persona.idGrupo = grupo.id
    }
    return guardado('Grupo', 'grupo', detalleGrupo(grupo))
  }),
  http.get(`${API}/api/grupos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    return HttpResponse.json(detalleGrupo(grupo))
  }),
  http.put(`${API}/api/grupos/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    const cuerpo = (await request.json()) as CuerpoGrupo
    const errores = erroresDeGrupo(cuerpo, false)
    if (errores.length > 0) return erroresDeCampo(errores)
    const personas = personasDelCuerpo(cuerpo)
    if (faltaAlguna(personas)) return textoNoEncontrado('Persona especificada no existe.')
    grupo.nombre = texto(cuerpo.nombre)
    grupo.descripcion = texto(cuerpo.descripcion)
    for (const elegida of personas) {
      const persona = buscarPersona(texto(elegida.codigo))
      if (persona) persona.idGrupo = elegida.checked === true ? grupo.id : null
    }
    return guardado('Grupo', 'grupo', detalleGrupo(grupo))
  }),
  http.delete(`${API}/api/grupos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    for (const persona of datos().personas) {
      if (persona.idGrupo === grupo.id) persona.idGrupo = null
    }
    datos().grupos = datos().grupos.filter((candidato) => candidato.id !== grupo.id)
    return textoEliminado('Grupo')
  }),
]
```

- [ ] **Step 4: Write the API, the schemas and the columns**

Create `src/features/grupos/api.ts`:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import { ApiError } from '@/lib/api/errors'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type GrupoFila = { id: number; nombre: string; descripcion: string | null; programa: string }

export type AlumnoDeGrupo = { codigo: string; nombreCompleto: string; estado: string | null }

export type GrupoDetalle = {
  id: number
  nombre: string
  descripcion: string | null
  programa: string
  alumnos: AlumnoDeGrupo[]
}

export type CuerpoGrupoNuevo = {
  nombre: string
  descripcion: string | null
  programa: string
  personas: { codigo: string }[]
}

export type CuerpoGrupoModificado = {
  nombre: string
  descripcion: string | null
  personas: { codigo: string; checked: boolean }[]
}

export const MENSAJE_GRUPO_GUARDADO = 'Grupo guardada con éxito.'
export const MENSAJE_GRUPO_ELIMINADO = 'Grupo eliminado con éxito.'
export const MENSAJE_GRUPO_NO_ENCONTRADO = 'Grupo especificada no existe.'

const esquemaFila = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullish(),
  programa: z.string().nullish(),
})

const esquemaDetalle = esquemaFila.extend({
  personas: z
    .array(
      z.object({
        codigo: z.string(),
        nombre: z.string(),
        aPaterno: z.string().nullish(),
        aMaterno: z.string().nullish(),
        estado: z.string().nullish(),
      }),
    )
    .nullish(),
})

const esquemaGrupoGuardado = z.object({ mensaje: z.string(), grupo: z.object({ id: z.number() }) })

export const clavesGrupos = {
  todo: ['grupos'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesGrupos.todo, 'lista', parametros] as const,
  detalle: (id: number) => [...clavesGrupos.todo, 'detalle', id] as const,
  alumnosSinGrupo: () => [...clavesGrupos.todo, 'alumnos-sin-grupo'] as const,
}

export async function listarGrupos(parametros: ParametrosPagina): Promise<Pagina<GrupoFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/grupos', parametros)
  return {
    ...pagina,
    items: pagina.items.map((fila) => {
      const grupo = esquemaFila.parse(fila)
      return { id: grupo.id, nombre: grupo.nombre, descripcion: grupo.descripcion ?? null, programa: grupo.programa ?? '' }
    }),
  }
}

export async function obtenerGrupo(id: number): Promise<GrupoDetalle> {
  const respuesta = await sigeda.get<unknown>(`/api/grupos/${encodeURIComponent(id)}`)
  if (respuesta === null || respuesta === undefined) throw new ApiError(404, MENSAJE_GRUPO_NO_ENCONTRADO)
  const grupo = esquemaDetalle.parse(respuesta)
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    descripcion: grupo.descripcion ?? null,
    programa: grupo.programa ?? '',
    alumnos: (grupo.personas ?? []).map((persona) => ({
      codigo: persona.codigo,
      nombreCompleto: [persona.nombre, persona.aPaterno, persona.aMaterno].filter(Boolean).join(' '),
      estado: persona.estado ?? null,
    })),
  }
}

export async function listarAlumnosSinGrupo(): Promise<AlumnoDeGrupo[]> {
  const alumnos = await sigeda.lista<{ codigo: string; nombre: string; aPaterno?: string | null; aMaterno?: string | null }>(
    '/api/personas/alumno/Alumno',
  )
  return alumnos.map((alumno) => ({
    codigo: alumno.codigo,
    nombreCompleto: [alumno.nombre, alumno.aPaterno, alumno.aMaterno].filter(Boolean).join(' '),
    estado: null,
  }))
}

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

export async function eliminarGrupo(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/grupos/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_GRUPO_ELIMINADO
}

export const consultasGrupos = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesGrupos.lista(parametros),
      queryFn: () => listarGrupos(parametros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) => queryOptions({ queryKey: clavesGrupos.detalle(id), queryFn: () => obtenerGrupo(id) }),
  alumnosSinGrupo: () =>
    queryOptions({ queryKey: clavesGrupos.alumnosSinGrupo(), queryFn: listarAlumnosSinGrupo, staleTime: 300_000 }),
}
```

Create `src/features/grupos/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasGrupos, type GrupoDetalle } from './api'

export async function cargarGrupoVisible(queryClient: QueryClient, idTexto: string): Promise<GrupoDetalle> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  try {
    return await queryClient.ensureQueryData(consultasGrupos.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
```

Create `src/features/grupos/columnas.tsx`:

```tsx
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import type { GrupoFila } from './api'

const ayudante = ayudanteDeColumnas<GrupoFila>()

export const COLUMNAS_GRUPOS = ayudante.columns([
  ayudante.accessor('nombre', {
    header: 'Nombre',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/grupos/$id" params={{ id: String(contexto.row.original.id) }}>
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('descripcion', { header: 'Descripción', cell: (contexto) => contexto.getValue() || '—' }),
  ayudante.accessor('programa', { header: 'Programa', enableSorting: true }),
])
```

Create `src/features/grupos/schemas.ts`:

```ts
import { z } from 'zod'
import { esquemaPaginacion } from '@/lib/busqueda'
import { PROGRAMAS } from '@/features/catalogos/api'

export const esquemaBusquedaGrupos = z.object(esquemaPaginacion)

export type BusquedaGrupos = z.infer<typeof esquemaBusquedaGrupos>

export const esquemaGrupo = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener entre 3 y 35 caracteres.')
    .max(35, 'El nombre debe tener entre 3 y 35 caracteres.'),
  descripcion: z.string().trim().max(255, 'La descripción no puede superar los 255 caracteres.'),
  programa: z.enum(PROGRAMAS),
  alumnos: z.array(z.string()),
})

export type ValoresGrupo = z.input<typeof esquemaGrupo>

export const GRUPO_VACIO: ValoresGrupo = { nombre: '', descripcion: '', programa: 'PDI', alumnos: [] }
```

- [ ] **Step 5: Write the screens**

Replace `src/features/grupos/grupo-page.tsx` with:

```tsx
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { clavesGrupos, consultasGrupos, eliminarGrupo } from './api'

export function GrupoPage({ id }: { id: number }) {
  const { data: grupo } = useSuspenseQuery(consultasGrupos.detalle(id))
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const eliminar = useMutation({
    mutationFn: () => eliminarGrupo(grupo.id),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.todo })
      await navegar({ to: '/grupos' })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo={grupo.nombre}
        descripcion={grupo.descripcion || grupo.programa}
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link to="/grupos/$id/editar" params={{ id: String(grupo.id) }}>
                <Pencil aria-hidden />
                Modificar
              </Link>
            </Button>
            <ConfirmDialog
              disparador={
                <Button variant="destructive" disabled={eliminar.isPending}>
                  <Trash2 aria-hidden />
                  Eliminar
                </Button>
              }
              titulo="¿Eliminar el grupo?"
              descripcion={`Se eliminará «${grupo.nombre}» y sus alumnos quedarán sin grupo.`}
              confirmar="Eliminar"
              destructivo
              alConfirmar={() => eliminar.mutate()}
            />
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del grupo</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Nombre</dt>
              <dd className="text-sm font-medium">{grupo.nombre}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Descripción</dt>
              <dd className="text-sm font-medium">{grupo.descripcion || '—'}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">Programa</dt>
              <dd className="text-sm font-medium">{grupo.programa}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Alumnos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grupo.alumnos.length === 0 ? (
            <p className="text-sm text-muted-foreground">El grupo no tiene alumnos asignados.</p>
          ) : (
            <Table aria-label="Alumnos del grupo">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupo.alumnos.map((alumno) => (
                  <TableRow key={alumno.codigo}>
                    <TableCell className="tabular-nums">{alumno.codigo}</TableCell>
                    <TableCell>{alumno.nombreCompleto}</TableCell>
                    <TableCell>{alumno.estado ? <StatusBadge vocabulario="estado" valor={alumno.estado} /> : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
```

In `src/features/grupos/grupos-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

export function GruposPage() {
  return <PageHeader titulo="Grupos" />
}
```

with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasGrupos } from './api'
import { COLUMNAS_GRUPOS } from './columnas'

const ruta = getRouteApi('/_app/grupos/')

export function GruposPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const grupos = useQuery(consultasGrupos.lista(busqueda))
  const error = errorDePrimeraCarga(grupos)

  return (
    <>
      <PageHeader
        titulo="Grupos"
        descripcion="Grupos de alumnos por programa."
        acciones={
          <Button asChild>
            <Link to="/grupos/nuevo">
              <Plus aria-hidden />
              Registrar grupo
            </Link>
          </Button>
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void grupos.refetch()} />
      ) : (
        <DataTable
          etiqueta="Grupos registrados"
          columnas={COLUMNAS_GRUPOS}
          pagina={grupos.data}
          cargando={grupos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(grupo) => String(grupo.id)}
          vacio={
            <EmptyState
              titulo="No hay grupos registrados"
              descripcion="Cree el primer grupo del programa."
              accion={
                <Button asChild size="sm">
                  <Link to="/grupos/nuevo">Registrar grupo</Link>
                </Button>
              }
            />
          }
        />
      )}
    </>
  )
}
```

- [ ] **Step 6: Wire the routes**

In `src/routes/_app/grupos/$id/index.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { GrupoPage } from '@/features/grupos/grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupo, context.sesion.actual()),
  component: RutaGrupo,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarGrupoVisible } from '@/features/grupos/cargar'
import { GrupoPage } from '@/features/grupos/grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupo, context.sesion.actual()),
  loader: ({ context, params }) => cargarGrupoVisible(context.queryClient, params.id),
  component: RutaGrupo,
})
```

In `src/routes/_app/grupos/index.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { GruposPage } from '@/features/grupos/grupos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupos, context.sesion.actual()),
  component: GruposPage,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { GruposPage } from '@/features/grupos/grupos-page'
import { esquemaBusquedaGrupos } from '@/features/grupos/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/')({
  validateSearch: esquemaBusquedaGrupos,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.grupos, context.sesion.actual()),
  component: GruposPage,
})
```

- [ ] **Step 7: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 8: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/grupos
```

Expected: PASS.

- [ ] **Step 9: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 399 tests.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add grupos list and detail"
```

---

### Task 11: Registrar and Modificar grupo (CA-GRU-02..CA-GRU-05)

**Files:**

- Create: `src/features/grupos/components/formulario-grupo.tsx`
- Create: `src/features/grupos/formulario-grupo.test.tsx`
- Modify: `src/features/grupos/modificar-grupo-page.tsx`
- Modify: `src/features/grupos/registrar-grupo-page.tsx`
- Modify: `src/mocks/sigeda/personas.ts`
- Modify: `src/routes/_app/grupos/$id/editar.tsx`
- Modify: `src/test/setup.ts`

**Interfaces:**
- Consumes: `consultasGrupos.alumnosSinGrupo()`, `consultasGrupos.detalle`, the shadcn `checkbox`, `aplicarErroresDeCampo`.
- Produces:
  - `GET /api/personas/alumno/{tipo}` in the mocks (alumnos without grupo, contract §1.6).
  - `FormularioGrupo`: mounts once the alumnos are loaded; nombre (3–35), descripción (≤255), programa (read-only on edit with T2) and a checkbox list with the alumnos without grupo plus, on edit, the grupo's own members already checked and never repeated. Creating sends `personas: [{codigo}]`; editing sends every current member and every newly picked alumno as `{codigo, checked}`, so unchecking one leaves them without grupo.
  - `src/test/setup.ts` dismisses sonner's toasts after each test, so two tests with the same message no longer see each other's toast.

- [ ] **Step 1: Write the failing tests**

Create `src/features/grupos/formulario-grupo.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'
import { TEXTO_PROGRAMA_FIJO } from './components/formulario-grupo'

async function abrir(ruta: string) {
  await iniciarComo('admin.sistema')
  const vista = renderApp(ruta)
  await screen.findByLabelText('Nombre')
  return vista
}

function alumnosOfrecidos() {
  return within(screen.getByRole('group', { name: 'Alumnos del grupo' }))
    .getAllByRole('checkbox')
    .map((casilla) => casilla.getAttribute('id'))
}

describe('Formulario de grupo', () => {
  it('CA-GRU-02 registra un grupo con sus alumnos y abre el detalle', async () => {
    const { usuario, router } = await abrir('/grupos/nuevo')
    await usuario.type(screen.getByLabelText('Nombre'), 'Grupo 7')
    await usuario.type(screen.getByLabelText('Descripción'), 'Promoción 2027')
    await usuario.selectOptions(screen.getByLabelText('Programa'), 'PDE')
    await usuario.click(screen.getByRole('checkbox', { name: 'Lucía Mendoza Ríos' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await screen.findByText('Grupo guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/grupos/7'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Grupo 7' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Alumnos del grupo' })).toHaveTextContent('Lucía Mendoza Ríos')
  })

  it('CA-GRU-02 exige un nombre de 3 a 35 caracteres', async () => {
    const { usuario } = await abrir('/grupos/nuevo')
    await usuario.type(screen.getByLabelText('Nombre'), 'G')
    await usuario.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await screen.findByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
  })

  it('CA-GRU-03 ofrece los alumnos sin grupo y, al modificar, también los propios ya marcados', async () => {
    const primera = await abrir('/grupos/nuevo')
    expect(alumnosOfrecidos()).toEqual(['alumno-654321'])
    primera.unmount()
    await abrir('/grupos/3/editar')
    expect(alumnosOfrecidos()).toEqual(['alumno-555555', 'alumno-666666', 'alumno-654321'])
    expect(screen.getByRole('checkbox', { name: 'Pedro Rodriguez Garcia' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Lucía Mendoza Ríos' })).not.toBeChecked()
  })

  it('CA-GRU-04 al modificar el programa es de solo lectura y se explica', async () => {
    await abrir('/grupos/3/editar')
    expect(screen.getByLabelText('Programa')).toBeDisabled()
    expect(screen.getByText(TEXTO_PROGRAMA_FIJO)).toBeInTheDocument()
  })

  it('CA-GRU-05 desmarcar un alumno lo deja sin grupo y vuelve a ofrecerse', async () => {
    const primera = await abrir('/grupos/3/editar')
    await primera.usuario.click(screen.getByRole('checkbox', { name: 'Pedro Rodriguez Garcia' }))
    await primera.usuario.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await screen.findByText('Grupo guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(primera.router.state.location.pathname).toBe('/grupos/3'))
    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Alumnos del grupo' })).not.toHaveTextContent('Pedro Rodriguez Garcia'),
    )
    primera.unmount()
    await abrir('/grupos/1/editar')
    expect(screen.getByRole('checkbox', { name: 'Pedro Rodriguez Garcia' })).not.toBeChecked()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/grupos
```

Expected: FAIL — `Error: Failed to resolve import "./components/formulario-grupo" from "src/features/grupos/formulario-grupo.test.tsx". Does the file exist?`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/test/setup.ts`, replace:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/server'
import { sesion } from '@/lib/auth/sesion'
```

with:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/server'
import { sesion } from '@/lib/auth/sesion'
```

In `src/test/setup.ts`, replace:

```ts

afterEach(() => {
  cleanup()
  ancla.focus()
  server.resetHandlers()
  reiniciarMocks()
```

with:

```ts

afterEach(() => {
  cleanup()
  toast.dismiss()
  ancla.focus()
  server.resetHandlers()
  reiniciarMocks()
```

In `src/mocks/sigeda/personas.ts`, replace:

```ts
      { status: 201 },
    )
  }),
  http.get(`${API}/api/personas/:cod/usuario`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
```

with:

```ts
      { status: 201 },
    )
  }),
  http.get(`${API}/api/personas/alumno/:tipo`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const alumnos = datos().personas.filter((persona) => persona.tipo === String(params.tipo) && persona.idGrupo === null)
    if (alumnos.length === 0) return textoNoEncontrado('No existen personas disponibles.')
    return HttpResponse.json(
      alumnos.map((persona) => ({
        codigo: persona.codigo,
        nombre: persona.nombre,
        aPaterno: persona.aPaterno,
        aMaterno: persona.aMaterno,
      })),
    )
  }),
  http.get(`${API}/api/personas/:cod/usuario`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
```

- [ ] **Step 4: Write the screens**

Create `src/features/grupos/components/formulario-grupo.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { PROGRAMAS } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesGrupos, consultasGrupos, crearGrupo, modificarGrupo, type AlumnoDeGrupo, type GrupoDetalle } from '../api'
import { esquemaGrupo, GRUPO_VACIO, type ValoresGrupo } from '../schemas'

export const TEXTO_PROGRAMA_FIJO = 'El programa de un grupo no se puede cambiar después de registrarlo.'

type Props = { grupo?: GrupoDetalle }

export function FormularioGrupo({ grupo }: Props) {
  const sinGrupo = useQuery(consultasGrupos.alumnosSinGrupo())
  const error = errorDePrimeraCarga(sinGrupo)

  if (error !== null) return <AvisoDeError error={error} alReintentar={() => void sinGrupo.refetch()} />
  if (!sinGrupo.isSuccess) return <p className="text-sm text-muted-foreground">Cargando los alumnos…</p>
  return <FormularioConAlumnos grupo={grupo} disponibles={sinGrupo.data} />
}

function FormularioConAlumnos({ grupo, disponibles }: Props & { disponibles: AlumnoDeGrupo[] }) {
  const modificando = grupo !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const miembros = grupo?.alumnos ?? []
  const codigosMiembros = new Set(miembros.map((alumno) => alumno.codigo))
  const opciones = [...miembros, ...disponibles.filter((alumno) => !codigosMiembros.has(alumno.codigo))]
  const iniciales: ValoresGrupo = grupo
    ? {
        nombre: grupo.nombre,
        descripcion: grupo.descripcion ?? '',
        programa: grupo.programa === 'PDE' ? 'PDE' : 'PDI',
        alumnos: miembros.map((alumno) => alumno.codigo),
      }
    : GRUPO_VACIO
  const formulario = useForm<ValoresGrupo>({ resolver: zodResolver(esquemaGrupo), defaultValues: iniciales })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresGrupo) => {
      const elegidos = new Set(valores.alumnos)
      const descripcion = valores.descripcion.trim() === '' ? null : valores.descripcion.trim()
      if (grupo) {
        return modificarGrupo(grupo.id, {
          nombre: valores.nombre.trim(),
          descripcion,
          personas: opciones
            .filter((alumno) => codigosMiembros.has(alumno.codigo) || elegidos.has(alumno.codigo))
            .map((alumno) => ({ codigo: alumno.codigo, checked: elegidos.has(alumno.codigo) })),
        })
      }
      return crearGrupo({
        nombre: valores.nombre.trim(),
        descripcion,
        programa: valores.programa,
        personas: [...elegidos].map((codigo) => ({ codigo })),
      })
    },
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesGrupos.todo })
      await navegar({ to: '/grupos/$id', params: { id: String(resultado.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el grupo</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del grupo</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="grupo-nombre">Nombre</FieldLabel>
              <Input id="grupo-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 3 a 35 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.programa)}>
              <FieldLabel htmlFor="grupo-programa">Programa</FieldLabel>
              <NativeSelect
                id="grupo-programa"
                className="w-full"
                disabled={modificando}
                {...formulario.register('programa')}
              >
                {PROGRAMAS.map((programa) => (
                  <NativeSelectOption key={programa} value={programa}>
                    {programa}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {modificando && <FieldDescription>{TEXTO_PROGRAMA_FIJO}</FieldDescription>}
              <FieldError errors={[errors.programa]} />
            </Field>
            <Field data-invalid={Boolean(errors.descripcion)} className="md:col-span-2">
              <FieldLabel htmlFor="grupo-descripcion">Descripción</FieldLabel>
              <Textarea
                id="grupo-descripcion"
                aria-invalid={Boolean(errors.descripcion)}
                {...formulario.register('descripcion')}
              />
              <FieldError errors={[errors.descripcion]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Alumnos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay alumnos sin grupo para asignar.</p>
          ) : (
            <Controller
              control={formulario.control}
              name="alumnos"
              render={({ field }) => (
                <div role="group" aria-label="Alumnos del grupo" className="grid gap-3 sm:grid-cols-2">
                  {opciones.map((alumno) => (
                    <div key={alumno.codigo} className="flex items-center gap-2">
                      <Checkbox
                        id={`alumno-${alumno.codigo}`}
                        checked={field.value.includes(alumno.codigo)}
                        onCheckedChange={(marcado) =>
                          field.onChange(
                            marcado === true
                              ? [...field.value, alumno.codigo]
                              : field.value.filter((codigo) => codigo !== alumno.codigo),
                          )
                        }
                      />
                      <Label htmlFor={`alumno-${alumno.codigo}`} className="font-normal">
                        {alumno.nombreCompleto}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/grupos/$id" params={{ id: String(grupo.id) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/grupos">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar grupo'}
        </Button>
      </div>
    </form>
  )
}
```

In `src/features/grupos/modificar-grupo-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarGrupoPage({ id }: Props) {
  return <PageHeader titulo="Modificar grupo" descripcion={String(id)} />
}
```

with:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { consultasGrupos } from './api'
import { FormularioGrupo } from './components/formulario-grupo'

export function ModificarGrupoPage({ id }: { id: number }) {
  const { data: grupo } = useSuspenseQuery(consultasGrupos.detalle(id))

  return (
    <>
      <PageHeader
        titulo="Modificar grupo"
        descripcion={grupo.nombre}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/grupos/$id" params={{ id: String(grupo.id) }}>
              Volver al grupo
            </Link>
          </Button>
        }
      />
      <FormularioGrupo grupo={grupo} />
    </>
  )
}
```

In `src/features/grupos/registrar-grupo-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarGrupoPage() {
  return <PageHeader titulo="Registrar grupo" />
}
```

with:

```tsx
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { FormularioGrupo } from './components/formulario-grupo'

export function RegistrarGrupoPage() {
  return (
    <>
      <PageHeader
        titulo="Registrar grupo"
        descripcion="Cree un grupo y asigne sus alumnos."
        acciones={
          <Button variant="outline" asChild>
            <Link to="/grupos">Volver a grupos</Link>
          </Button>
        }
      />
      <FormularioGrupo />
    </>
  )
}
```

- [ ] **Step 5: Wire the routes**

In `src/routes/_app/grupos/$id/editar.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ModificarGrupoPage } from '@/features/grupos/modificar-grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarGrupo, context.sesion.actual()),
  component: RutaModificarGrupo,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarGrupoVisible } from '@/features/grupos/cargar'
import { ModificarGrupoPage } from '@/features/grupos/modificar-grupo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/grupos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarGrupo, context.sesion.actual()),
  loader: ({ context, params }) => cargarGrupoVisible(context.queryClient, params.id),
  component: RutaModificarGrupo,
})
```

- [ ] **Step 6: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/grupos
```

Expected: PASS.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 404 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add grupo form"
```

---

### Task 12: Fases list, detail and delete (CA-FAS-01, CA-FAS-03, CA-FAS-05, CA-DEP-01) (M2-6)

**Files:**

- Create: `src/features/fases/api.ts`
- Create: `src/features/fases/cargar.ts`
- Create: `src/features/fases/columnas.tsx`
- Create: `src/features/fases/fase-page.test.tsx`
- Modify (full rewrite): `src/features/fases/fase-page.tsx`
- Create: `src/features/fases/fases-page.test.tsx`
- Modify: `src/features/fases/fases-page.tsx`
- Create: `src/features/fases/schemas.ts`
- Modify: `src/lib/busqueda.ts`
- Create: `src/lib/dominio/programa.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/mocks/sigeda/comun.ts`
- Create: `src/mocks/sigeda/fases.ts`
- Modify: `src/routes/_app/programa/fases/$id/index.tsx`
- Modify: `src/routes/_app/programa/fases/index.tsx`

**Interfaces:**
- Consumes: `DataTable`, `ConfirmDialog`, `accionDisponible`, `errorDePrimeraCarga`.
- Produces:
  - `paginarConOrden` in the mock helpers: `PageWithSort` (repeatable `properties` limited to `id`/`nombre`, size 1–10, `ErrorResponse` errors) for fases and maniobras.
  - `src/mocks/sigeda/fases.ts` with contract §4: list, detail, create, update (subfases by id, omitted ones deleted unless they are in use — dependency 37) , delete (404, 410 and 204) and `GET /api/subfases/{id}` with its maniobras.
  - `esquemaPaginacionPrograma` (size ≤ 10) in `src/lib/busqueda.ts` and the fixed programa texts in `src/lib/dominio/programa.ts` (T3–T7, T12 and the toasts T14–T20).
  - `src/features/fases/api.ts`: `listarFases` (maps `property` to `properties`), `listarTodasLasFases`, `obtenerFase`, `obtenerSubfase`, `crearFase`, `modificarFase`, `eliminarFase` and their `consultasFases`.
  - `FasesPage` (registrar only with `Manage Phases`) and `FasePage`: each subfase with its maniobras (one query per subfase, with its own error notice), Eliminar offered only for a fase without subfases (T4) and only with dependency 37 resolved (T11), toast T16.

- [ ] **Step 1: Write the failing tests**

Create `src/features/fases/fase-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_FASE_SIN_SUBFASES } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirFase(id: number, username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(`/programa/fases/${id}`)
  await screen.findByRole('heading', { level: 2, name: 'Subfases' })
  return vista
}

describe('Detalle de fase', () => {
  it('CA-FAS-03 muestra la fase, sus subfases y las maniobras de cada una', async () => {
    await abrirFase(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Adaptación' })).toBeInTheDocument()
    const instrumentos = await screen.findByRole('region', { name: 'Instrumentos' })
    await waitFor(() => expect(within(instrumentos).getByText('Maniobra 9')).toBeInTheDocument())
    expect(within(instrumentos).getByText('Maniobra 10')).toBeInTheDocument()
    const contacto = screen.getByRole('region', { name: 'Contacto' })
    await waitFor(() => expect(within(contacto).getByText('Sin maniobras asignadas.')).toBeInTheDocument())
  })

  it('CA-FAS-05 una fase con subfases no se puede eliminar y se explica', async () => {
    await abrirFase(1)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText(TEXTO_FASE_SIN_SUBFASES)).toBeInTheDocument()
  })

  it('CA-FAS-05 una fase sin subfases se elimina con confirmación', async () => {
    const { usuario, router } = await abrirFase(2)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Se eliminará «Operaciones HeliTransportadas»')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Fase eliminada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/fases'))
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Operaciones HeliTransportadas' })).not.toBeInTheDocument(),
    )
  })

  it('CA-DEP-01 sin la dependencia 37 resuelta, eliminar está deshabilitada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirFase(2)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })

  it('CA-FAS-01 sin Manage Phases no se ofrece modificar ni eliminar', async () => {
    await abrirFase(1, 'instructor.perez')
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
  })

  it('si falla la carga de una subfase lo indica en su tarjeta', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/subfases/:id`, () => HttpResponse.error()))
    await abrirFase(1)
    const contacto = await screen.findByRole('region', { name: 'Contacto' })
    expect(
      await within(contacto).findByText('No se pudieron cargar las maniobras de la subfase'),
    ).toBeInTheDocument()
  })

  it('una fase inexistente muestra la página no encontrada', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/fases/99')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})
```

Create `src/features/fases/fases-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirFases(username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp('/programa/fases')
  await screen.findByRole('heading', { name: 'Fases y subfases' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Fases del programa' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

describe('Fases y subfases', () => {
  it('CA-FAS-01 muestra nombre y descripción, y ofrece registrar con Manage Phases', async () => {
    await abrirFases()
    expect(await screen.findByRole('table', { name: 'Fases del programa' })).toBeInTheDocument()
    expect(filas()).toEqual([
      ['Adaptación', 'Fase inicial de familiarización con procedimientos básicos'],
      ['Operaciones HeliTransportadas', 'Entrenamiento en operaciones con helicópteros'],
      ['Operaciones AeroTácticas', 'Operaciones avanzadas y tácticas especiales'],
    ])
    expect(screen.getByRole('link', { name: 'Registrar fase' })).toHaveAttribute('href', '/programa/fases/nueva')
  })

  it('CA-FAS-01 el personal sin Manage Phases solo consulta', async () => {
    await abrirFases('jefe.operaciones')
    expect(await screen.findByRole('table', { name: 'Fases del programa' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar fase' })).not.toBeInTheDocument()
  })

  it('CA-FAS-01 ordena por nombre y guarda el orden en la URL', async () => {
    const { usuario, router } = await abrirFases()
    await usuario.click(await screen.findByRole('button', { name: /Nombre/ }))
    expect(router.state.location.search).toMatchObject({ property: 'nombre', direction: 'ASC' })
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Adaptación'))
    await usuario.click(screen.getByRole('button', { name: /Nombre/ }))
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Operaciones HeliTransportadas'))
  })

  it('muestra el aviso de error si la lista no carga', async () => {
    server.use(http.get(`${config.sigedaApiUrl}/api/fases`, () => HttpResponse.error()))
    await abrirFases()
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/fases
```

Expected: FAIL — `Error: Failed to resolve import "@/lib/dominio/programa" from "src/features/fases/fase-page.test.tsx". Does the file exist?`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/mocks/handlers.ts`, replace:

```ts
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersGrupos } from './sigeda/grupos'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

with:

```ts
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersFases } from './sigeda/fases'
import { handlersGrupos } from './sigeda/grupos'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersCuentas,
  ...handlersPersonas,
  ...handlersGrupos,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

with:

```ts
  ...handlersCuentas,
  ...handlersPersonas,
  ...handlersGrupos,
  ...handlersFases,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

In `src/mocks/sigeda/comun.ts`, replace:

```ts
    empty: false,
  })
}
```

with:

```ts
    empty: false,
  })
}

const PROPIEDADES_VALIDAS = ['id', 'nombre']

export function paginarConOrden<T extends { id: number; nombre: string }>(
  elementos: readonly T[],
  url: URL,
  opciones: { nombreLista: string; proyectar?: (elemento: T) => unknown },
) {
  const page = numero(url, 'page', 0)
  const size = numero(url, 'size', 6)
  const direccion = (url.searchParams.get('direction') ?? 'ASC').toUpperCase()
  const propiedades = url.searchParams.getAll('properties')
  const invalida = propiedades.find((propiedad) => !PROPIEDADES_VALIDAS.includes(propiedad))
  if (page < 0) return errorResponse(400, 'Atributo o configuración erronea', 'Indice de paginado no debe ser menor a cero.')
  if (size < 1) return errorResponse(400, 'Atributo o configuración erronea', 'Tamaño de paginado no debe ser menor a uno.')
  if (size > 10) {
    return errorResponse(400, 'Atributo o configuración erronea', 'Tamaño de página demasiado grande, máximo permitido es 10.')
  }
  if (direccion !== 'ASC' && direccion !== 'DESC') {
    return errorResponse(400, 'Atributo o configuración erronea', "Dirección debe ser 'desc' o 'asc'.")
  }
  if (invalida !== undefined) {
    return errorResponse(400, 'Atributo o configuración erronea', `Propiedad inválida: ${invalida}`)
  }
  const propiedad = propiedades[0] ?? 'id'
  const ordenados = [...elementos].sort((a, b) => {
    const comparacion =
      propiedad === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es', { numeric: true }) : a.id - b.id
    return direccion === 'DESC' ? -comparacion : comparacion
  })
  const pagina = ordenados.slice(page * size, page * size + size)
  if (pagina.length === 0) {
    return errorResponse(404, 'Recurso no encontrado', `No existen ${opciones.nombreLista} disponibles.`)
  }
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

Create `src/mocks/sigeda/fases.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, errorResponse, paginarConOrden } from './comun'
import { buscarSubfase, datos, maniobrasDeSubfase, siguienteId, type FaseMock, type SubfaseMock } from './datos'

type SubfaseDelCuerpo = { id?: unknown; nombre?: unknown; descripcion?: unknown }

type CuerpoFase = { nombre?: unknown; descripcion?: unknown; subfases?: SubfaseDelCuerpo[] | null }

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
  const errores = [...erroresDeNombre(cuerpo.nombre, 'nombre'), ...erroresDeDescripcion(cuerpo.descripcion, 'descripcion')]
  const subfases = cuerpo.subfases ?? []
  if (subfases.length === 0) errores.push("'subfases': La asignación de subfases es requerida")
  subfases.forEach((subfase, indice) => {
    errores.push(...erroresDeNombre(subfase.nombre, `subfases[${indice}].nombre`))
    errores.push(...erroresDeDescripcion(subfase.descripcion, `subfases[${indice}].descripcion`))
  })
  return errores
}

function descripcionNueva(valor: unknown, anterior: string | null): string | null {
  const nueva = texto(valor).trim()
  return nueva === '' ? anterior : nueva
}

function subfaseEnUso(subfase: SubfaseMock): boolean {
  return (
    maniobrasDeSubfase(subfase.id).length > 0 ||
    datos().turnos.some((turno) => turno.idSubfase === subfase.id) ||
    datos().evaluaciones.some((evaluacion) => evaluacion.idSubFase === subfase.id)
  )
}

function subfasesDeFase(idFase: number): SubfaseMock[] {
  return datos().subfases.filter((subfase) => subfase.idFase === idFase)
}

function detalleFase(fase: FaseMock) {
  return {
    id: fase.id,
    nombre: fase.nombre,
    descripcion: fase.descripcion,
    subfases: subfasesDeFase(fase.id).map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion })),
  }
}

function entidadFase(fase: FaseMock) {
  return {
    id: fase.id,
    nombre: fase.nombre,
    descripcion: fase.descripcion,
    subfases: subfasesDeFase(fase.id).map((subfase) => ({
      id: subfase.id,
      nombre: subfase.nombre,
      descripcion: subfase.descripcion,
      idFase: subfase.idFase,
    })),
  }
}

function aplicarSubfases(fase: FaseMock, subfases: SubfaseDelCuerpo[], conIds: boolean) {
  const conservados = new Set<number>()
  for (const enviada of subfases) {
    const id = conIds ? Number(enviada.id) : 0
    const existente = id > 0 ? buscarSubfase(id) : undefined
    if (existente) {
      existente.nombre = texto(enviada.nombre)
      existente.descripcion = descripcionNueva(enviada.descripcion, existente.descripcion)
      existente.idFase = fase.id
      conservados.add(existente.id)
    } else {
      const nueva: SubfaseMock = {
        id: siguienteId('subfase'),
        nombre: texto(enviada.nombre),
        descripcion: texto(enviada.descripcion) === '' ? null : texto(enviada.descripcion),
        idFase: fase.id,
      }
      datos().subfases.push(nueva)
      conservados.add(nueva.id)
    }
  }
  const omitidas = subfasesDeFase(fase.id).filter((subfase) => !conservados.has(subfase.id))
  const enUso = omitidas.find(subfaseEnUso)
  if (enUso) return enUso
  datos().subfases = datos().subfases.filter((subfase) => !omitidas.includes(subfase))
  return null
}

export const handlersFases = [
  http.get(`${API}/api/fases`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    return paginarConOrden(datos().fases, new URL(request.url), { nombreLista: 'fases' })
  }),
  http.post(`${API}/api/fases`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Phases')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoFase
    const errores = erroresDeFase(cuerpo)
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    const fase: FaseMock = {
      id: siguienteId('fase'),
      nombre: texto(cuerpo.nombre),
      descripcion: texto(cuerpo.descripcion) === '' ? null : texto(cuerpo.descripcion),
    }
    datos().fases.push(fase)
    aplicarSubfases(fase, cuerpo.subfases ?? [], false)
    return HttpResponse.json(entidadFase(fase))
  }),
  http.get(`${API}/api/fases/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const fase = datos().fases.find((candidata) => candidata.id === Number(params.id))
    if (!fase) return errorResponse(404, 'Recurso no encontrado', 'No existe información de fase.')
    return HttpResponse.json(detalleFase(fase))
  }),
  http.put(`${API}/api/fases/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Phases')
    if (permitido instanceof Response) return permitido
    const fase = datos().fases.find((candidata) => candidata.id === Number(params.id))
    if (!fase) return errorResponse(404, 'Recurso no encontrado', 'No existe información de fase.')
    const cuerpo = (await request.json()) as CuerpoFase
    const errores = erroresDeFase(cuerpo)
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    fase.nombre = texto(cuerpo.nombre)
    fase.descripcion = descripcionNueva(cuerpo.descripcion, fase.descripcion)
    const enUso = aplicarSubfases(fase, cuerpo.subfases ?? [], true)
    if (enUso) {
      return errorResponse(
        410,
        'Acción expirada',
        `La subfase ${enUso.nombre} no se puede quitar, tiene maniobras, turnos o evaluaciones.`,
      )
    }
    return HttpResponse.json(entidadFase(fase))
  }),
  http.delete(`${API}/api/fases/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Phases')
    if (permitido instanceof Response) return permitido
    const fase = datos().fases.find((candidata) => candidata.id === Number(params.id))
    if (!fase) return errorResponse(404, 'Recurso no encontrado', 'No existe información de fase.')
    if (subfasesDeFase(fase.id).some(subfaseEnUso)) {
      return errorResponse(
        410,
        'Acción expirada',
        'La fase no se puede eliminar, sus subfases tienen maniobras, turnos o evaluaciones.',
      )
    }
    const suyas = new Set(subfasesDeFase(fase.id).map((subfase) => subfase.id))
    datos().subfases = datos().subfases.filter((subfase) => !suyas.has(subfase.id))
    datos().fases = datos().fases.filter((candidata) => candidata.id !== fase.id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/api/subfases/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const subfase = buscarSubfase(Number(params.id))
    if (!subfase) return errorResponse(404, 'Recurso no encontrado', 'No existe información de subfase.')
    return HttpResponse.json({
      id: subfase.id,
      nombre: subfase.nombre,
      descripcion: subfase.descripcion,
      maniobrasSubfase: maniobrasDeSubfase(subfase.id).map((maniobra) => ({ maniobra: { ...maniobra } })),
    })
  }),
]
```

In `src/lib/busqueda.ts`, replace:

```ts
  direction: z.enum(['ASC', 'DESC']).default('ASC').catch('ASC'),
}

export const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
```

with:

```ts
  direction: z.enum(['ASC', 'DESC']).default('ASC').catch('ASC'),
}

export const esquemaPaginacionPrograma = {
  page: z.number().int().min(0).default(0).catch(0),
  size: z.number().int().min(1).max(10).default(10).catch(10),
  property: z.string().optional().catch(undefined),
  direction: z.enum(['ASC', 'DESC']).default('ASC').catch('ASC'),
}

export const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
```

Create `src/lib/dominio/programa.ts`:

```ts
export const TEXTO_DESCRIPCION_SE_CONSERVA = 'Si deja la descripción vacía, se conserva la anterior.'
export const TEXTO_SUBFASE_NO_SE_QUITA =
  'Una subfase guardada no se puede quitar porque puede tener maniobras, turnos o evaluaciones.'
export const TEXTO_FASE_SIN_SUBFASES = 'Solo se puede eliminar una fase sin subfases.'
export const TEXTO_MANIOBRA_CON_ESTANDARES = 'La maniobra tiene estándares asignados y no se puede eliminar.'
export const TEXTO_ESTANDAR_NO_SE_QUITA =
  'Un estándar guardado no se puede quitar; puede cambiar su nombre y su descripción.'
export const TEXTO_SUBFASES_NO_DISPONIBLES = 'Subfases no disponibles: el servidor aún no las informa.'

export const MENSAJE_FASE_REGISTRADA = 'Fase registrada.'
export const MENSAJE_FASE_MODIFICADA = 'Fase modificada.'
export const MENSAJE_FASE_ELIMINADA = 'Fase eliminada.'
export const MENSAJE_MANIOBRA_REGISTRADA = 'Maniobra registrada.'
export const MENSAJE_MANIOBRA_MODIFICADA = 'Maniobra modificada.'
export const MENSAJE_MANIOBRA_ELIMINADA = 'Maniobra eliminada.'
export const MENSAJE_ESTANDARES_GUARDADOS = 'Estándares guardados.'
```

- [ ] **Step 4: Write the API, the schemas and the columns**

Create `src/features/fases/api.ts`:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type FaseFila = { id: number; nombre: string; descripcion: string | null }

export type SubfaseDeFase = { id: number; nombre: string; descripcion: string | null }

export type FaseDetalle = FaseFila & { subfases: SubfaseDeFase[] }

export type SubfaseDetalle = SubfaseDeFase & { maniobras: { id: number; nombre: string }[] }

export type CuerpoFase = {
  nombre: string
  descripcion: string
  subfases: { id: number; nombre: string; descripcion: string }[]
}

const esquemaFila = z.object({ id: z.number(), nombre: z.string(), descripcion: z.string().nullish() })

const esquemaDetalle = esquemaFila.extend({ subfases: z.array(esquemaFila).nullish() })

const esquemaSubfase = esquemaFila.extend({
  maniobrasSubfase: z
    .array(z.object({ maniobra: z.object({ id: z.number(), nombre: z.string() }) }))
    .nullish(),
})

export const clavesFases = {
  todo: ['fases'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesFases.todo, 'lista', parametros] as const,
  catalogo: () => [...clavesFases.todo, 'catalogo'] as const,
  detalle: (id: number) => [...clavesFases.todo, 'detalle', id] as const,
  subfase: (id: number) => [...clavesFases.todo, 'subfase', id] as const,
}

function aFila(fase: z.infer<typeof esquemaFila>): FaseFila {
  return { id: fase.id, nombre: fase.nombre, descripcion: fase.descripcion ?? null }
}

export async function listarFases(parametros: ParametrosPagina): Promise<Pagina<FaseFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/fases', {
    page: parametros.page,
    size: parametros.size,
    direction: parametros.direction,
    properties: parametros.property,
  })
  return { ...pagina, items: pagina.items.map((fila) => aFila(esquemaFila.parse(fila))) }
}

export async function listarTodasLasFases(): Promise<FaseFila[]> {
  const primera = await listarFases({ page: 0, size: 10, direction: 'ASC' })
  const restantes = await Promise.all(
    Array.from({ length: Math.max(primera.totalPages - 1, 0) }, (_, indice) =>
      listarFases({ page: indice + 1, size: 10, direction: 'ASC' }),
    ),
  )
  return [primera, ...restantes].flatMap((pagina) => pagina.items)
}

export async function obtenerFase(id: number): Promise<FaseDetalle> {
  const fase = esquemaDetalle.parse(await sigeda.get(`/api/fases/${encodeURIComponent(id)}`))
  return { ...aFila(fase), subfases: (fase.subfases ?? []).map(aFila) }
}

export async function obtenerSubfase(id: number): Promise<SubfaseDetalle> {
  const subfase = esquemaSubfase.parse(await sigeda.get(`/api/subfases/${encodeURIComponent(id)}`))
  return {
    ...aFila(subfase),
    maniobras: (subfase.maniobrasSubfase ?? []).map((enlace) => enlace.maniobra),
  }
}

export async function crearFase(cuerpo: CuerpoFase): Promise<number> {
  const fase = esquemaFila.parse(await sigeda.post('/api/fases', cuerpo))
  return fase.id
}

export async function modificarFase(id: number, cuerpo: CuerpoFase): Promise<number> {
  const fase = esquemaFila.parse(await sigeda.put(`/api/fases/${encodeURIComponent(id)}`, cuerpo))
  return fase.id
}

export async function eliminarFase(id: number): Promise<void> {
  await sigeda.eliminar<unknown>(`/api/fases/${encodeURIComponent(id)}`)
}

export const consultasFases = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesFases.lista(parametros),
      queryFn: () => listarFases(parametros),
      placeholderData: keepPreviousData,
    }),
  catalogo: () => queryOptions({ queryKey: clavesFases.catalogo(), queryFn: listarTodasLasFases, staleTime: 300_000 }),
  detalle: (id: number) => queryOptions({ queryKey: clavesFases.detalle(id), queryFn: () => obtenerFase(id) }),
  subfase: (id: number) => queryOptions({ queryKey: clavesFases.subfase(id), queryFn: () => obtenerSubfase(id) }),
}
```

Create `src/features/fases/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasFases, type FaseDetalle } from './api'

export async function cargarFaseVisible(queryClient: QueryClient, idTexto: string): Promise<FaseDetalle> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  try {
    return await queryClient.ensureQueryData(consultasFases.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
```

Create `src/features/fases/columnas.tsx`:

```tsx
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import type { FaseFila } from './api'

const ayudante = ayudanteDeColumnas<FaseFila>()

export const COLUMNAS_FASES = ayudante.columns([
  ayudante.accessor('nombre', {
    header: 'Nombre',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/programa/fases/$id" params={{ id: String(contexto.row.original.id) }}>
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('descripcion', { header: 'Descripción', cell: (contexto) => contexto.getValue() || '—' }),
])
```

Create `src/features/fases/schemas.ts`:

```ts
import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'

export const esquemaBusquedaFases = z.object(esquemaPaginacionPrograma)

export type BusquedaFases = z.infer<typeof esquemaBusquedaFases>

const MENSAJE_NOMBRE = 'El nombre debe tener entre 3 y 35 caracteres.'

const esquemaNombre = z.string().trim().min(1, 'El nombre es obligatorio').min(3, MENSAJE_NOMBRE).max(35, MENSAJE_NOMBRE)

const esquemaDescripcion = z.string().trim().max(255, 'La descripción no puede superar los 255 caracteres.')

export const esquemaFase = z.object({
  nombre: esquemaNombre,
  descripcion: esquemaDescripcion,
  subfases: z
    .array(z.object({ id: z.string(), nombre: esquemaNombre, descripcion: esquemaDescripcion }))
    .min(1, 'La asignación de subfases es requerida'),
})

export type ValoresFase = z.input<typeof esquemaFase>

export const FASE_VACIA: ValoresFase = {
  nombre: '',
  descripcion: '',
  subfases: [{ id: '0', nombre: '', descripcion: '' }],
}
```

- [ ] **Step 5: Write the screens**

Replace `src/features/fases/fase-page.tsx` with:

```tsx
import { useMutation, useQueries, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { MENSAJE_FASE_ELIMINADA, TEXTO_FASE_SIN_SUBFASES } from '@/lib/dominio/programa'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesFases, consultasFases, eliminarFase } from './api'

export function FasePage({ id }: { id: number }) {
  const { data: fase } = useSuspenseQuery(consultasFases.detalle(id))
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const puedeGestionar = usePuede('Manage Phases')
  const disponible = accionDisponible('eliminarFase')
  const sinSubfases = fase.subfases.length === 0
  const subfases = useQueries({ queries: fase.subfases.map((subfase) => consultasFases.subfase(subfase.id)) })

  const eliminar = useMutation({
    mutationFn: () => eliminarFase(fase.id),
    onSuccess: async () => {
      toast.success(MENSAJE_FASE_ELIMINADA)
      await queryClient.invalidateQueries({ queryKey: clavesFases.todo })
      await navegar({ to: '/programa/fases' })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo={fase.nombre}
        descripcion={fase.descripcion ?? undefined}
        acciones={
          puedeGestionar && (
            <>
              <Button variant="outline" asChild>
                <Link to="/programa/fases/$id/editar" params={{ id: String(fase.id) }}>
                  <Pencil aria-hidden />
                  Modificar
                </Link>
              </Button>
              {!sinSubfases ? (
                <div className="grid justify-items-end gap-1">
                  <Button variant="destructive" disabled>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                  <p className="text-xs text-muted-foreground">{TEXTO_FASE_SIN_SUBFASES}</p>
                </div>
              ) : !disponible ? (
                <div className="grid justify-items-end gap-1">
                  <Button variant="destructive" disabled>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                  <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
                </div>
              ) : (
                <ConfirmDialog
                  disparador={
                    <Button variant="destructive" disabled={eliminar.isPending}>
                      <Trash2 aria-hidden />
                      Eliminar
                    </Button>
                  }
                  titulo="¿Eliminar la fase?"
                  descripcion={`Se eliminará «${fase.nombre}». Esta acción no se puede deshacer.`}
                  confirmar="Eliminar"
                  destructivo
                  alConfirmar={() => eliminar.mutate()}
                />
              )}
            </>
          )
        }
      />
      <section aria-labelledby="titulo-subfases" className="grid gap-4">
        <h2 id="titulo-subfases" className="text-lg font-semibold tracking-tight">
          Subfases
        </h2>
        {sinSubfases && <p className="text-sm text-muted-foreground">La fase no tiene subfases registradas.</p>}
        {fase.subfases.map((subfase, indice) => {
          const consulta = subfases[indice]
          const error = consulta ? errorDePrimeraCarga(consulta) : null
          return (
            <Card key={subfase.id} role="region" aria-labelledby={`subfase-${subfase.id}`}>
              <CardHeader>
                <CardTitle>
                  <h3 id={`subfase-${subfase.id}`}>{subfase.nombre}</h3>
                </CardTitle>
                {subfase.descripcion && <p className="text-sm text-muted-foreground">{subfase.descripcion}</p>}
              </CardHeader>
              <CardContent>
                {error !== null ? (
                  <AvisoDeError
                    titulo="No se pudieron cargar las maniobras de la subfase"
                    error={error}
                    alReintentar={() => void consulta?.refetch()}
                  />
                ) : consulta?.data === undefined ? (
                  <Skeleton className="h-10 w-full" aria-busy="true" />
                ) : consulta.data.maniobras.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin maniobras asignadas.</p>
                ) : (
                  <ul className="grid gap-1 text-sm">
                    {consulta.data.maniobras.map((maniobra) => (
                      <li key={maniobra.id}>{maniobra.nombre}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )
        })}
      </section>
    </>
  )
}
```

In `src/features/fases/fases-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

export function FasesPage() {
  return <PageHeader titulo="Fases y subfases" />
}
```

with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { usePuede } from '@/lib/auth/use-sesion'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasFases } from './api'
import { COLUMNAS_FASES } from './columnas'

const ruta = getRouteApi('/_app/programa/fases/')

export function FasesPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const puedeGestionar = usePuede('Manage Phases')
  const fases = useQuery(consultasFases.lista(busqueda))
  const error = errorDePrimeraCarga(fases)

  return (
    <>
      <PageHeader
        titulo="Fases y subfases"
        descripcion="Estructura del programa de instrucción."
        acciones={
          puedeGestionar && (
            <Button asChild>
              <Link to="/programa/fases/nueva">
                <Plus aria-hidden />
                Registrar fase
              </Link>
            </Button>
          )
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void fases.refetch()} />
      ) : (
        <DataTable
          etiqueta="Fases del programa"
          columnas={COLUMNAS_FASES}
          pagina={fases.data}
          cargando={fases.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(fase) => String(fase.id)}
          vacio={<EmptyState titulo="No hay fases registradas" descripcion="Registre la primera fase del programa." />}
        />
      )}
    </>
  )
}
```

- [ ] **Step 6: Wire the routes**

In `src/routes/_app/programa/fases/$id/index.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { FasePage } from '@/features/fases/fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fase, context.sesion.actual()),
  component: RutaFase,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarFaseVisible } from '@/features/fases/cargar'
import { FasePage } from '@/features/fases/fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fase, context.sesion.actual()),
  loader: ({ context, params }) => cargarFaseVisible(context.queryClient, params.id),
  component: RutaFase,
})
```

In `src/routes/_app/programa/fases/index.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { FasesPage } from '@/features/fases/fases-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fases, context.sesion.actual()),
  component: FasesPage,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { FasesPage } from '@/features/fases/fases-page'
import { esquemaBusquedaFases } from '@/features/fases/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/')({
  validateSearch: esquemaBusquedaFases,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fases, context.sesion.actual()),
  component: FasesPage,
})
```

- [ ] **Step 7: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 8: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/fases
```

Expected: PASS.

- [ ] **Step 9: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 415 tests.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add fases list and detail"
```

---

### Task 13: Registrar and Modificar fase with its subfases (CA-FAS-02, CA-FAS-04, CA-FAS-06)

**Files:**

- Create: `src/features/fases/components/formulario-fase.tsx`
- Create: `src/features/fases/formulario-fase.test.tsx`
- Modify: `src/features/fases/modificar-fase-page.tsx`
- Modify: `src/features/fases/registrar-fase-page.tsx`
- Modify: `src/routes/_app/programa/fases/$id/editar.tsx`

**Interfaces:**
- Consumes: `useFieldArray`, `aplicarErroresDeCampo`, the programa texts.
- Produces:
  - `FormularioFase`: nombre, descripción and a field array of subfases (`id` `0` creates, `id > 0` updates). A saved subfase cannot be removed and shows T3; a new row can; T7 under every saved descripción; at least one subfase; backend errors (B10, B11) under their field, including each subfase row; toasts T14 and T15 and a jump to the fase.

- [ ] **Step 1: Write the failing tests**

Create `src/features/fases/formulario-fase.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_DESCRIPCION_SE_CONSERVA, TEXTO_SUBFASE_NO_SE_QUITA } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(ruta: string) {
  await iniciarComo('comandante.aguirre')
  const vista = renderApp(ruta)
  await screen.findByLabelText('Nombre')
  return vista
}

describe('Formulario de fase', () => {
  it('CA-FAS-02 registra una fase con al menos una subfase y abre el detalle', async () => {
    const { usuario, router } = await abrir('/programa/fases/nueva')
    await usuario.type(screen.getByLabelText('Nombre'), 'Operaciones Nocturnas')
    await usuario.type(screen.getByLabelText('Descripción'), 'Vuelo con visores nocturnos')
    await usuario.type(screen.getByLabelText('Nombre 1'), 'Familiarización NVG')
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    expect(await screen.findByText('Fase registrada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/fases/4'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Operaciones Nocturnas' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Familiarización NVG' })).toBeInTheDocument()
  })

  it('CA-FAS-02 exige nombre y al menos una subfase con nombre válido', async () => {
    const { usuario } = await abrir('/programa/fases/nueva')
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    expect(await screen.findAllByText('El nombre es obligatorio')).toHaveLength(2)
    await usuario.click(screen.getByRole('button', { name: 'Quitar subfase 1' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    expect(await screen.findByText('La asignación de subfases es requerida')).toBeInTheDocument()
  })

  it('CA-FAS-04 al modificar precarga las subfases, no deja quitar las guardadas y agrega nuevas', async () => {
    const { usuario, router } = await abrir('/programa/fases/1/editar')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Adaptación')
    expect(screen.getByLabelText('Nombre 1')).toHaveValue('Contacto')
    expect(screen.getAllByText(TEXTO_SUBFASE_NO_SE_QUITA)).toHaveLength(5)
    expect(screen.getAllByText(TEXTO_DESCRIPCION_SE_CONSERVA).length).toBeGreaterThan(1)
    expect(screen.queryByRole('button', { name: 'Quitar subfase 1' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Agregar subfase' }))
    await usuario.type(screen.getByLabelText('Nombre 6'), 'Autorrotaciones')
    expect(screen.getByRole('button', { name: 'Quitar subfase 6' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    expect(await screen.findByText('Fase modificada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/fases/1'))
    expect(await screen.findByRole('region', { name: 'Autorrotaciones' })).toBeInTheDocument()
  })

  it('CA-FAS-06 los errores del backend aparecen bajo su campo, también en cada subfase', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/fases/:id`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-09-19T10:00:00',
            status: 400,
            error: 'Error al validar el modelo',
            message: null,
            messages: ["'subfases[0].nombre': El nombre debe tener entre 3 y 35 caracteres."],
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrir('/programa/fases/1/editar')
    await usuario.click(screen.getByRole('button', { name: 'Guardar fase' }))
    const fila = (await screen.findByLabelText('Nombre 1')).closest('div')
    expect(within(fila as HTMLElement).getByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/fases
```

Expected: FAIL — `TestingLibraryElementError: Unable to find a label with the text of: Nombre`

- [ ] **Step 3: Write the screens**

Create `src/features/fases/components/formulario-fase.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, X } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import {
  MENSAJE_FASE_MODIFICADA,
  MENSAJE_FASE_REGISTRADA,
  TEXTO_DESCRIPCION_SE_CONSERVA,
  TEXTO_SUBFASE_NO_SE_QUITA,
} from '@/lib/dominio/programa'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesFases, crearFase, modificarFase, type FaseDetalle } from '../api'
import { esquemaFase, FASE_VACIA, type ValoresFase } from '../schemas'

type Props = { fase?: FaseDetalle }

export function FormularioFase({ fase }: Props) {
  const modificando = fase !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales: ValoresFase = fase
    ? {
        nombre: fase.nombre,
        descripcion: fase.descripcion ?? '',
        subfases: fase.subfases.map((subfase) => ({
          id: String(subfase.id),
          nombre: subfase.nombre,
          descripcion: subfase.descripcion ?? '',
        })),
      }
    : FASE_VACIA
  const formulario = useForm<ValoresFase>({ resolver: zodResolver(esquemaFase), defaultValues: iniciales })
  const { errors } = formulario.formState
  const subfases = useFieldArray({ control: formulario.control, name: 'subfases' })

  const guardar = useMutation({
    mutationFn: (valores: ValoresFase) => {
      const cuerpo = {
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion.trim(),
        subfases: valores.subfases.map((subfase) => ({
          id: Number(subfase.id),
          nombre: subfase.nombre.trim(),
          descripcion: subfase.descripcion.trim(),
        })),
      }
      return fase ? modificarFase(fase.id, cuerpo) : crearFase(cuerpo)
    },
    onSuccess: async (id) => {
      toast.success(modificando ? MENSAJE_FASE_MODIFICADA : MENSAJE_FASE_REGISTRADA)
      await queryClient.invalidateQueries({ queryKey: clavesFases.todo })
      await navegar({ to: '/programa/fases/$id', params: { id: String(id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar la fase</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos de la fase</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="fase-nombre">Nombre</FieldLabel>
              <Input id="fase-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 3 a 35 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.descripcion)}>
              <FieldLabel htmlFor="fase-descripcion">Descripción</FieldLabel>
              <Textarea
                id="fase-descripcion"
                aria-invalid={Boolean(errors.descripcion)}
                {...formulario.register('descripcion')}
              />
              {modificando && <FieldDescription>{TEXTO_DESCRIPCION_SE_CONSERVA}</FieldDescription>}
              <FieldError errors={[errors.descripcion]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Subfases</h2>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => subfases.append({ id: '0', nombre: '', descripcion: '' })}
          >
            <Plus aria-hidden />
            Agregar subfase
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {subfases.fields.map((fila, indice) => {
            const error = errors.subfases?.[indice]
            const guardada = formulario.getValues(`subfases.${indice}.id`) !== '0'
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Field data-invalid={Boolean(error?.nombre)}>
                  <FieldLabel htmlFor={`subfase-nombre-${indice}`}>Nombre {numero}</FieldLabel>
                  <Input
                    id={`subfase-nombre-${indice}`}
                    aria-invalid={Boolean(error?.nombre)}
                    {...formulario.register(`subfases.${indice}.nombre`)}
                  />
                  <FieldError errors={[error?.nombre]} />
                </Field>
                <Field data-invalid={Boolean(error?.descripcion)}>
                  <FieldLabel htmlFor={`subfase-descripcion-${indice}`}>Descripción {numero}</FieldLabel>
                  <Input
                    id={`subfase-descripcion-${indice}`}
                    aria-invalid={Boolean(error?.descripcion)}
                    {...formulario.register(`subfases.${indice}.descripcion`)}
                  />
                  {guardada && <FieldDescription>{TEXTO_DESCRIPCION_SE_CONSERVA}</FieldDescription>}
                  <FieldError errors={[error?.descripcion]} />
                </Field>
                {guardada ? (
                  <p className="text-xs text-muted-foreground sm:mt-8">{TEXTO_SUBFASE_NO_SE_QUITA}</p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="sm:mt-6"
                    aria-label={`Quitar subfase ${numero}`}
                    onClick={() => subfases.remove(indice)}
                  >
                    <X aria-hidden />
                  </Button>
                )}
              </div>
            )
          })}
          <FieldError errors={[errors.subfases?.root ?? errors.subfases]} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/programa/fases/$id" params={{ id: String(fase.id) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/programa/fases">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar fase'}
        </Button>
      </div>
    </form>
  )
}
```

In `src/features/fases/modificar-fase-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarFasePage({ id }: Props) {
  return <PageHeader titulo="Modificar fase" descripcion={String(id)} />
}
```

with:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { consultasFases } from './api'
import { FormularioFase } from './components/formulario-fase'

export function ModificarFasePage({ id }: { id: number }) {
  const { data: fase } = useSuspenseQuery(consultasFases.detalle(id))

  return (
    <>
      <PageHeader
        titulo="Modificar fase"
        descripcion={fase.nombre}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/programa/fases/$id" params={{ id: String(fase.id) }}>
              Volver a la fase
            </Link>
          </Button>
        }
      />
      <FormularioFase fase={fase} />
    </>
  )
}
```

In `src/features/fases/registrar-fase-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarFasePage() {
  return <PageHeader titulo="Registrar fase" />
}
```

with:

```tsx
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { FormularioFase } from './components/formulario-fase'

export function RegistrarFasePage() {
  return (
    <>
      <PageHeader
        titulo="Registrar fase"
        descripcion="Cree una fase con sus subfases."
        acciones={
          <Button variant="outline" asChild>
            <Link to="/programa/fases">Volver a fases</Link>
          </Button>
        }
      />
      <FormularioFase />
    </>
  )
}
```

- [ ] **Step 4: Wire the routes**

In `src/routes/_app/programa/fases/$id/editar.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ModificarFasePage } from '@/features/fases/modificar-fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarFase, context.sesion.actual()),
  component: RutaModificarFase,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarFaseVisible } from '@/features/fases/cargar'
import { ModificarFasePage } from '@/features/fases/modificar-fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarFase, context.sesion.actual()),
  loader: ({ context, params }) => cargarFaseVisible(context.queryClient, params.id),
  component: RutaModificarFase,
})
```

- [ ] **Step 5: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/fases
```

Expected: PASS.

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 419 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add fase form"
```

---

### Task 14: Maniobras list, detail and delete (CA-MAN-01, CA-MAN-03, CA-MAN-05, CA-EST-01, CA-DEP-01) (M2-7)

**Files:**

- Modify: `src/features/fases/api.ts`
- Create: `src/features/maniobras/api.ts`
- Create: `src/features/maniobras/cargar.ts`
- Create: `src/features/maniobras/columnas.tsx`
- Create: `src/features/maniobras/maniobra-page.test.tsx`
- Modify (full rewrite): `src/features/maniobras/maniobra-page.tsx`
- Create: `src/features/maniobras/maniobras-page.test.tsx`
- Modify: `src/features/maniobras/maniobras-page.tsx`
- Create: `src/features/maniobras/schemas.ts`
- Modify: `src/mocks/handlers.ts`
- Create: `src/mocks/sigeda/maniobras.ts`
- Modify: `src/routes/_app/programa/maniobras/$id/index.tsx`
- Modify: `src/routes/_app/programa/maniobras/index.tsx`

**Interfaces:**
- Consumes: `DataTable`, `ConfirmDialog`, `consultasFases`, `accionDisponible`, the programa texts.
- Produces:
  - `src/mocks/sigeda/maniobras.ts` with contract §5: list (`PageWithSort`), detail with `subfases` (dependency 33) and `estandares`, create, update (which replaces only this maniobra's links, dependency 32), `PUT /{id}/estandar` and delete with its two 410 rules (dependency 35).
  - `consultasFases.conSubfases()`: the fases catalog with their subfases, shared by the maniobra detail and the maniobra form.
  - `src/features/maniobras/api.ts`: `ManiobraDetalle` with `subfases: … | null` (null when the response does not carry them), `listarManiobras`, `obtenerManiobra`, `crearManiobra`, `modificarManiobra`, `guardarEstandares`, `eliminarManiobra`.
  - `ManiobrasPage` and `ManiobraPage`: subfases with their fase taken from the catalog (T12 when the response has none), estándares, "Editar estándares" with `Manage Standards`, Modificar disabled with T11 until dependencies 32 and 33, Eliminar disabled with T5 while the maniobra has estándares and showing any other 410 verbatim, toast T19.

- [ ] **Step 1: Write the failing tests**

Create `src/features/maniobras/maniobra-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_MANIOBRA_CON_ESTANDARES, TEXTO_SUBFASES_NO_DISPONIBLES } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirManiobra(id: number, username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp(`/programa/maniobras/${id}`)
  await screen.findByRole('heading', { level: 2, name: 'Estándares' })
  return vista
}

describe('Detalle de maniobra', () => {
  it('CA-MAN-03 muestra la maniobra, sus estándares y sus subfases con su fase', async () => {
    await abrirManiobra(9)
    expect(screen.getByRole('heading', { level: 1, name: 'Maniobra 9' })).toBeInTheDocument()
    expect(screen.getByText('Estandar 60')).toBeInTheDocument()
    expect(screen.getByText('Estandar 61')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('· Adaptación')).toBeInTheDocument())
    expect(screen.getByText('Instrumentos')).toBeInTheDocument()
  })

  it('CA-MAN-03 si la respuesta no trae subfases lo indica', async () => {
    server.use(
      http.get(`${config.sigedaApiUrl}/api/maniobras/:id`, () =>
        HttpResponse.json({
          id: 9,
          nombre: 'Maniobra 9',
          descripcion: 'Descripcion de Maniobra 9',
          estandares: [{ id: 10, nombre: 'Estandar 60', descripcion: null }],
        }),
      ),
    )
    await abrirManiobra(9)
    expect(screen.getByText(TEXTO_SUBFASES_NO_DISPONIBLES)).toBeInTheDocument()
  })

  it('CA-MAN-05 una maniobra con estándares no se puede eliminar', async () => {
    await abrirManiobra(9)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText(TEXTO_MANIOBRA_CON_ESTANDARES)).toBeInTheDocument()
  })

  it('CA-MAN-05 una maniobra sin estándares se elimina con confirmación', async () => {
    const { usuario, router } = await abrirManiobra(11)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Se eliminará «Autorrotación»')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Maniobra eliminada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras'))
  })

  it('CA-MAN-05 muestra el motivo del backend si rechaza la eliminación', async () => {
    server.use(
      http.delete(`${config.sigedaApiUrl}/api/maniobras/:id`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-09-19T10:00:00',
            status: 410,
            error: 'Acción expirada',
            message: 'La maniobra no se pudo eliminar, está presente en un turno.',
          },
          { status: 410 },
        ),
      ),
    )
    const { usuario } = await abrirManiobra(11)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('La maniobra no se pudo eliminar, está presente en un turno.')).toBeInTheDocument()
  })

  it('CA-EST-01 el jefe de operaciones solo edita los estándares', async () => {
    await abrirManiobra(9, 'jefe.operaciones')
    expect(screen.getByRole('link', { name: 'Editar estándares' })).toHaveAttribute(
      'href',
      '/programa/maniobras/9/estandares',
    )
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modificar' })).not.toBeInTheDocument()
  })

  it('CA-EST-01 el comandante ve los estándares pero no los edita', async () => {
    await abrirManiobra(9)
    expect(screen.queryByRole('link', { name: 'Editar estándares' })).not.toBeInTheDocument()
  })

  it('CA-DEP-01 sin las dependencias 32 y 33, modificar está deshabilitada', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirManiobra(9)
    expect(screen.getByRole('button', { name: 'Modificar' })).toBeDisabled()
    expect(screen.getByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
  })

  it('una maniobra inexistente muestra la página no encontrada', async () => {
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/maniobras/99')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })
})
```

Create `src/features/maniobras/maniobras-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirManiobras(username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp('/programa/maniobras')
  await screen.findByRole('heading', { name: 'Maniobras' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Maniobras del programa' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

describe('Maniobras', () => {
  it('CA-MAN-01 muestra nombre y descripción y ofrece registrar con Manage Maneuvers', async () => {
    await abrirManiobras()
    expect(await screen.findByRole('table', { name: 'Maniobras del programa' })).toBeInTheDocument()
    expect(filas()[0]).toEqual(['Maniobra 1', 'Descripcion de Maniobra 1'])
    expect(screen.getByRole('link', { name: 'Registrar maniobra' })).toHaveAttribute('href', '/programa/maniobras/nueva')
  })

  it('CA-EST-01 quien solo asigna estándares no ve registrar maniobras', async () => {
    await abrirManiobras('jefe.operaciones')
    expect(await screen.findByRole('table', { name: 'Maniobras del programa' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar maniobra' })).not.toBeInTheDocument()
  })

  it('CA-MAN-01 pagina de a 10 y guarda la página en la URL', async () => {
    const { usuario, router } = await abrirManiobras()
    await screen.findByRole('table', { name: 'Maniobras del programa' })
    expect(filas()).toHaveLength(10)
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(router.state.location.search).toMatchObject({ page: 1 })
    await waitFor(() => expect(filas()).toEqual([['Autorrotación', 'Aterrizaje sin potencia']]))
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/maniobras
```

Expected: FAIL — `TestingLibraryElementError: Unable to find role="heading" and name "Estándares"`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/mocks/handlers.ts`, replace:

```ts
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersFases } from './sigeda/fases'
import { handlersGrupos } from './sigeda/grupos'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

with:

```ts
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersFases } from './sigeda/fases'
import { handlersGrupos } from './sigeda/grupos'
import { handlersManiobras } from './sigeda/maniobras'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersPersonas,
  ...handlersGrupos,
  ...handlersFases,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

with:

```ts
  ...handlersPersonas,
  ...handlersGrupos,
  ...handlersFases,
  ...handlersManiobras,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

Create `src/mocks/sigeda/maniobras.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, errorResponse, paginarConOrden } from './comun'
import {
  buscarSubfase,
  datos,
  estandaresDeManiobra,
  siguienteId,
  subfasesDeManiobra,
  type EstandarMock,
  type ManiobraMock,
} from './datos'

type SubfaseDelCuerpo = { idSubfase?: unknown }

type CuerpoManiobra = { nombre?: unknown; descripcion?: unknown; subfases?: SubfaseDelCuerpo[] | null }

type EstandarDelCuerpo = { id?: unknown; nombre?: unknown; descripcion?: unknown }

type CuerpoEstandares = { estandares?: EstandarDelCuerpo[] | null }

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
  const nueva = texto(valor).trim()
  return nueva === '' ? anterior : nueva
}

function erroresDeManiobra(cuerpo: CuerpoManiobra): string[] {
  const errores = [
    ...erroresDeNombre(cuerpo.nombre, 'nombre'),
    ...erroresDeDescripcion(cuerpo.descripcion, 'descripcion'),
  ]
  const subfases = cuerpo.subfases ?? []
  if (subfases.length === 0) errores.push("'subfases': La asignación de subfases es requerida")
  subfases.forEach((subfase, indice) => {
    if (!(Number(subfase.idSubfase) > 0)) errores.push(`'subfases[${indice}].idSubfase': La subfase es requerida.`)
  })
  return errores
}

function idsDeSubfases(cuerpo: CuerpoManiobra): number[] {
  return [...new Set((cuerpo.subfases ?? []).map((subfase) => Number(subfase.idSubfase)))]
}

function enlazar(idManiobra: number, ids: number[]) {
  datos().maniobrasSubfase = datos().maniobrasSubfase.filter((enlace) => enlace.idManiobra !== idManiobra)
  for (const idSubfase of ids) datos().maniobrasSubfase.push({ idSubfase, idManiobra })
}

function detalleManiobra(maniobra: ManiobraMock) {
  return {
    id: maniobra.id,
    nombre: maniobra.nombre,
    descripcion: maniobra.descripcion,
    estandares: estandaresDeManiobra(maniobra.id).map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion })),
    subfases: subfasesDeManiobra(maniobra.id).map(({ id, nombre }) => ({ id, nombre })),
  }
}

function resumen(maniobra: ManiobraMock) {
  return { id: maniobra.id, nombre: maniobra.nombre, descripcion: maniobra.descripcion }
}

function enUso(idManiobra: number): boolean {
  return (
    datos().turnos.some((turno) => turno.maniobras.some((item) => item.idManiobra === idManiobra)) ||
    datos().evaluaciones.some((evaluacion) =>
      evaluacion.calificaciones.some((calificacion) => calificacion.idManiobra === idManiobra),
    )
  )
}

export const handlersManiobras = [
  http.get(`${API}/api/maniobras`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    return paginarConOrden(datos().maniobras, new URL(request.url), { nombreLista: 'maniobras', proyectar: resumen })
  }),
  http.post(`${API}/api/maniobras`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Maneuvers')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoManiobra
    const errores = erroresDeManiobra(cuerpo)
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    const ids = idsDeSubfases(cuerpo)
    if (ids.some((id) => !buscarSubfase(id))) {
      return errorResponse(404, 'Recurso no encontrado', 'No existe información de subfase.')
    }
    const maniobra: ManiobraMock = {
      id: siguienteId('maniobra'),
      nombre: texto(cuerpo.nombre),
      descripcion: texto(cuerpo.descripcion) === '' ? null : texto(cuerpo.descripcion),
    }
    datos().maniobras.push(maniobra)
    enlazar(maniobra.id, ids)
    return HttpResponse.json(resumen(maniobra))
  }),
  http.get(`${API}/api/maniobras/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const maniobra = datos().maniobras.find((candidata) => candidata.id === Number(params.id))
    if (!maniobra) return errorResponse(404, 'Recurso no encontrado', 'No existe información de maniobra')
    return HttpResponse.json(detalleManiobra(maniobra))
  }),
  http.put(`${API}/api/maniobras/:id/estandar`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Standards')
    if (permitido instanceof Response) return permitido
    const maniobra = datos().maniobras.find((candidata) => candidata.id === Number(params.id))
    if (!maniobra) return errorResponse(404, 'Recurso no encontrado', 'No existe información de maniobra.')
    const cuerpo = (await request.json()) as CuerpoEstandares
    const estandares = cuerpo.estandares ?? []
    const errores: string[] = []
    if (estandares.length === 0) errores.push("'estandares': La asignación de estandares es requerida")
    estandares.forEach((estandar, indice) => {
      errores.push(...erroresDeNombre(estandar.nombre, `estandares[${indice}].nombre`))
      errores.push(...erroresDeDescripcion(estandar.descripcion, `estandares[${indice}].descripcion`))
    })
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    for (const enviado of estandares) {
      const id = Number(enviado.id)
      const existente = id > 0 ? datos().estandares.find((candidato) => candidato.id === id) : undefined
      if (existente) {
        existente.nombre = texto(enviado.nombre)
        existente.descripcion = descripcionNueva(enviado.descripcion, existente.descripcion)
        existente.idManiobra = maniobra.id
      } else {
        const nuevo: EstandarMock = {
          id: siguienteId('estandar'),
          nombre: texto(enviado.nombre),
          descripcion: texto(enviado.descripcion) === '' ? null : texto(enviado.descripcion),
          idManiobra: maniobra.id,
        }
        datos().estandares.push(nuevo)
      }
    }
    return HttpResponse.json(resumen(maniobra))
  }),
  http.put(`${API}/api/maniobras/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Maneuvers')
    if (permitido instanceof Response) return permitido
    const maniobra = datos().maniobras.find((candidata) => candidata.id === Number(params.id))
    if (!maniobra) return errorResponse(404, 'Recurso no encontrado', 'No existe información de maniobra.')
    const cuerpo = (await request.json()) as CuerpoManiobra
    const errores = erroresDeManiobra(cuerpo)
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    const ids = idsDeSubfases(cuerpo)
    if (ids.some((id) => !buscarSubfase(id))) {
      return errorResponse(404, 'Recurso no encontrado', 'No existe información de subfase.')
    }
    maniobra.nombre = texto(cuerpo.nombre)
    maniobra.descripcion = descripcionNueva(cuerpo.descripcion, maniobra.descripcion)
    enlazar(maniobra.id, ids)
    return HttpResponse.json(resumen(maniobra))
  }),
  http.delete(`${API}/api/maniobras/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Maneuvers')
    if (permitido instanceof Response) return permitido
    const maniobra = datos().maniobras.find((candidata) => candidata.id === Number(params.id))
    if (!maniobra) return errorResponse(404, 'Recurso no encontrado', 'No existe información de maniobra.')
    if (estandaresDeManiobra(maniobra.id).length > 0) {
      return errorResponse(410, 'Acción expirada', 'La maniobra no se pudo eliminar, tiene estándares asignados.')
    }
    if (enUso(maniobra.id)) {
      return errorResponse(410, 'Acción expirada', 'La maniobra no se pudo eliminar, está presente en un turno.')
    }
    datos().maniobrasSubfase = datos().maniobrasSubfase.filter((enlace) => enlace.idManiobra !== maniobra.id)
    datos().maniobras = datos().maniobras.filter((candidata) => candidata.id !== maniobra.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
```

- [ ] **Step 4: Write the API, the schemas and the columns**

In `src/features/fases/api.ts`, replace:

```ts
    .nullish(),
})

export const clavesFases = {
  todo: ['fases'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesFases.todo, 'lista', parametros] as const,
  catalogo: () => [...clavesFases.todo, 'catalogo'] as const,
  detalle: (id: number) => [...clavesFases.todo, 'detalle', id] as const,
  subfase: (id: number) => [...clavesFases.todo, 'subfase', id] as const,
}
```

with:

```ts
    .nullish(),
})

export type FaseConSubfases = { fase: FaseFila; subfases: SubfaseDeFase[] }

export const clavesFases = {
  todo: ['fases'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesFases.todo, 'lista', parametros] as const,
  catalogo: () => [...clavesFases.todo, 'catalogo'] as const,
  conSubfases: () => [...clavesFases.todo, 'con-subfases'] as const,
  detalle: (id: number) => [...clavesFases.todo, 'detalle', id] as const,
  subfase: (id: number) => [...clavesFases.todo, 'subfase', id] as const,
}
```

In `src/features/fases/api.ts`, replace:

```ts
  }
}

export async function crearFase(cuerpo: CuerpoFase): Promise<number> {
  const fase = esquemaFila.parse(await sigeda.post('/api/fases', cuerpo))
  return fase.id
```

with:

```ts
  }
}

export async function listarFasesConSubfases(): Promise<FaseConSubfases[]> {
  const fases = await listarTodasLasFases()
  return Promise.all(fases.map(async (fase) => ({ fase, subfases: (await obtenerFase(fase.id)).subfases })))
}

export async function crearFase(cuerpo: CuerpoFase): Promise<number> {
  const fase = esquemaFila.parse(await sigeda.post('/api/fases', cuerpo))
  return fase.id
```

In `src/features/fases/api.ts`, replace:

```ts
      placeholderData: keepPreviousData,
    }),
  catalogo: () => queryOptions({ queryKey: clavesFases.catalogo(), queryFn: listarTodasLasFases, staleTime: 300_000 }),
  detalle: (id: number) => queryOptions({ queryKey: clavesFases.detalle(id), queryFn: () => obtenerFase(id) }),
  subfase: (id: number) => queryOptions({ queryKey: clavesFases.subfase(id), queryFn: () => obtenerSubfase(id) }),
}
```

with:

```ts
      placeholderData: keepPreviousData,
    }),
  catalogo: () => queryOptions({ queryKey: clavesFases.catalogo(), queryFn: listarTodasLasFases, staleTime: 300_000 }),
  conSubfases: () =>
    queryOptions({ queryKey: clavesFases.conSubfases(), queryFn: listarFasesConSubfases, staleTime: 300_000 }),
  detalle: (id: number) => queryOptions({ queryKey: clavesFases.detalle(id), queryFn: () => obtenerFase(id) }),
  subfase: (id: number) => queryOptions({ queryKey: clavesFases.subfase(id), queryFn: () => obtenerSubfase(id) }),
}
```

Create `src/features/maniobras/api.ts`:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type ManiobraFila = { id: number; nombre: string; descripcion: string | null }

export type EstandarDeManiobra = { id: number; nombre: string; descripcion: string | null }

export type SubfaseDeManiobra = { id: number; nombre: string }

export type ManiobraDetalle = ManiobraFila & {
  estandares: EstandarDeManiobra[]
  subfases: SubfaseDeManiobra[] | null
}

export type CuerpoManiobra = { nombre: string; descripcion: string; subfases: { idSubfase: number }[] }

export type CuerpoEstandares = { estandares: { id: number; nombre: string; descripcion: string }[] }

const esquemaFila = z.object({ id: z.number(), nombre: z.string(), descripcion: z.string().nullish() })

const esquemaDetalle = esquemaFila.extend({
  estandares: z.array(esquemaFila).nullish(),
  subfases: z.array(z.object({ id: z.number(), nombre: z.string() })).nullish(),
})

export const clavesManiobras = {
  todo: ['maniobras'] as const,
  lista: (parametros: ParametrosPagina) => [...clavesManiobras.todo, 'lista', parametros] as const,
  detalle: (id: number) => [...clavesManiobras.todo, 'detalle', id] as const,
}

function aFila(maniobra: z.infer<typeof esquemaFila>): ManiobraFila {
  return { id: maniobra.id, nombre: maniobra.nombre, descripcion: maniobra.descripcion ?? null }
}

export async function listarManiobras(parametros: ParametrosPagina): Promise<Pagina<ManiobraFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/maniobras', {
    page: parametros.page,
    size: parametros.size,
    direction: parametros.direction,
    properties: parametros.property,
  })
  return { ...pagina, items: pagina.items.map((fila) => aFila(esquemaFila.parse(fila))) }
}

export async function obtenerManiobra(id: number): Promise<ManiobraDetalle> {
  const maniobra = esquemaDetalle.parse(await sigeda.get(`/api/maniobras/${encodeURIComponent(id)}`))
  return {
    ...aFila(maniobra),
    estandares: (maniobra.estandares ?? []).map(aFila),
    subfases: maniobra.subfases === null || maniobra.subfases === undefined ? null : maniobra.subfases,
  }
}

export async function crearManiobra(cuerpo: CuerpoManiobra): Promise<number> {
  const maniobra = esquemaFila.parse(await sigeda.post('/api/maniobras', cuerpo))
  return maniobra.id
}

export async function modificarManiobra(id: number, cuerpo: CuerpoManiobra): Promise<number> {
  const maniobra = esquemaFila.parse(await sigeda.put(`/api/maniobras/${encodeURIComponent(id)}`, cuerpo))
  return maniobra.id
}

export async function guardarEstandares(id: number, cuerpo: CuerpoEstandares): Promise<void> {
  await sigeda.put<unknown>(`/api/maniobras/${encodeURIComponent(id)}/estandar`, cuerpo)
}

export async function eliminarManiobra(id: number): Promise<void> {
  await sigeda.eliminar<unknown>(`/api/maniobras/${encodeURIComponent(id)}`)
}

export const consultasManiobras = {
  lista: (parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesManiobras.lista(parametros),
      queryFn: () => listarManiobras(parametros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) =>
    queryOptions({ queryKey: clavesManiobras.detalle(id), queryFn: () => obtenerManiobra(id) }),
}
```

Create `src/features/maniobras/cargar.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasManiobras, type ManiobraDetalle } from './api'

export async function cargarManiobraVisible(queryClient: QueryClient, idTexto: string): Promise<ManiobraDetalle> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  try {
    return await queryClient.ensureQueryData(consultasManiobras.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
```

Create `src/features/maniobras/columnas.tsx`:

```tsx
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import type { ManiobraFila } from './api'

const ayudante = ayudanteDeColumnas<ManiobraFila>()

export const COLUMNAS_MANIOBRAS = ayudante.columns([
  ayudante.accessor('nombre', {
    header: 'Nombre',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/programa/maniobras/$id" params={{ id: String(contexto.row.original.id) }}>
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('descripcion', { header: 'Descripción', cell: (contexto) => contexto.getValue() || '—' }),
])
```

Create `src/features/maniobras/schemas.ts`:

```ts
import { z } from 'zod'
import { esquemaPaginacionPrograma } from '@/lib/busqueda'

export const esquemaBusquedaManiobras = z.object(esquemaPaginacionPrograma)

export type BusquedaManiobras = z.infer<typeof esquemaBusquedaManiobras>

const MENSAJE_NOMBRE = 'El nombre debe tener entre 3 y 35 caracteres.'

const esquemaNombre = z.string().trim().min(1, 'El nombre es obligatorio').min(3, MENSAJE_NOMBRE).max(35, MENSAJE_NOMBRE)

const esquemaDescripcion = z.string().trim().max(255, 'La descripción no puede superar los 255 caracteres.')

export const esquemaManiobra = z.object({
  nombre: esquemaNombre,
  descripcion: esquemaDescripcion,
  subfases: z.array(z.string()).min(1, 'La asignación de subfases es requerida'),
})

export type ValoresManiobra = z.input<typeof esquemaManiobra>

export const MANIOBRA_VACIA: ValoresManiobra = { nombre: '', descripcion: '', subfases: [] }

export const esquemaEstandares = z.object({
  estandares: z
    .array(z.object({ id: z.string(), nombre: esquemaNombre, descripcion: esquemaDescripcion }))
    .min(1, 'La asignación de estandares es requerida'),
})

export type ValoresEstandares = z.input<typeof esquemaEstandares>
```

- [ ] **Step 5: Write the screens**

Replace `src/features/maniobras/maniobra-page.tsx` with:

```tsx
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Ruler, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { consultasFases } from '@/features/fases/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import {
  MENSAJE_MANIOBRA_ELIMINADA,
  TEXTO_MANIOBRA_CON_ESTANDARES,
  TEXTO_SUBFASES_NO_DISPONIBLES,
} from '@/lib/dominio/programa'
import { clavesManiobras, consultasManiobras, eliminarManiobra } from './api'

export function ManiobraPage({ id }: { id: number }) {
  const { data: maniobra } = useSuspenseQuery(consultasManiobras.detalle(id))
  const fases = useQuery(consultasFases.conSubfases())
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const puedeGestionar = usePuede('Manage Maneuvers')
  const puedeEstandares = usePuede('Manage Standards')
  const conEstandares = maniobra.estandares.length > 0
  const puedeModificar = accionDisponible('modificarManiobra')

  const faseDeSubfase = (idSubfase: number) =>
    fases.data?.find((grupo) => grupo.subfases.some((subfase) => subfase.id === idSubfase))?.fase.nombre ?? null

  const eliminar = useMutation({
    mutationFn: () => eliminarManiobra(maniobra.id),
    onSuccess: async () => {
      toast.success(MENSAJE_MANIOBRA_ELIMINADA)
      await queryClient.invalidateQueries({ queryKey: clavesManiobras.todo })
      await navegar({ to: '/programa/maniobras' })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo={maniobra.nombre}
        descripcion={maniobra.descripcion ?? undefined}
        acciones={
          <>
            {puedeEstandares && (
              <Button variant="outline" asChild>
                <Link to="/programa/maniobras/$id/estandares" params={{ id: String(maniobra.id) }}>
                  <Ruler aria-hidden />
                  Editar estándares
                </Link>
              </Button>
            )}
            {puedeGestionar &&
              (puedeModificar ? (
                <Button variant="outline" asChild>
                  <Link to="/programa/maniobras/$id/editar" params={{ id: String(maniobra.id) }}>
                    <Pencil aria-hidden />
                    Modificar
                  </Link>
                </Button>
              ) : (
                <div className="grid justify-items-end gap-1">
                  <Button variant="outline" disabled>
                    <Pencil aria-hidden />
                    Modificar
                  </Button>
                  <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
                </div>
              ))}
            {puedeGestionar &&
              (conEstandares ? (
                <div className="grid justify-items-end gap-1">
                  <Button variant="destructive" disabled>
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                  <p className="text-xs text-muted-foreground">{TEXTO_MANIOBRA_CON_ESTANDARES}</p>
                </div>
              ) : (
                <ConfirmDialog
                  disparador={
                    <Button variant="destructive" disabled={eliminar.isPending}>
                      <Trash2 aria-hidden />
                      Eliminar
                    </Button>
                  }
                  titulo="¿Eliminar la maniobra?"
                  descripcion={`Se eliminará «${maniobra.nombre}». Esta acción no se puede deshacer.`}
                  confirmar="Eliminar"
                  destructivo
                  alConfirmar={() => eliminar.mutate()}
                />
              ))}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Subfases</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maniobra.subfases === null ? (
              <p className="text-sm text-muted-foreground">{TEXTO_SUBFASES_NO_DISPONIBLES}</p>
            ) : maniobra.subfases.length === 0 ? (
              <p className="text-sm text-muted-foreground">La maniobra no está asignada a ninguna subfase.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {maniobra.subfases.map((subfase) => (
                  <li key={subfase.id}>
                    {subfase.nombre}
                    {faseDeSubfase(subfase.id) !== null && (
                      <span className="text-muted-foreground"> · {faseDeSubfase(subfase.id)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Estándares</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maniobra.estandares.length === 0 ? (
              <p className="text-sm text-muted-foreground">La maniobra no tiene estándares asignados.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {maniobra.estandares.map((estandar) => (
                  <li key={estandar.id}>
                    {estandar.nombre}
                    {estandar.descripcion && <span className="text-muted-foreground"> · {estandar.descripcion}</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
```

In `src/features/maniobras/maniobras-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

export function ManiobrasPage() {
  return <PageHeader titulo="Maniobras" />
}
```

with:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { usePuede } from '@/lib/auth/use-sesion'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasManiobras } from './api'
import { COLUMNAS_MANIOBRAS } from './columnas'

const ruta = getRouteApi('/_app/programa/maniobras/')

export function ManiobrasPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const puedeGestionar = usePuede('Manage Maneuvers')
  const maniobras = useQuery(consultasManiobras.lista(busqueda))
  const error = errorDePrimeraCarga(maniobras)

  return (
    <>
      <PageHeader
        titulo="Maniobras"
        descripcion="Maniobras del programa y sus estándares."
        acciones={
          puedeGestionar && (
            <Button asChild>
              <Link to="/programa/maniobras/nueva">
                <Plus aria-hidden />
                Registrar maniobra
              </Link>
            </Button>
          )
        }
      />
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void maniobras.refetch()} />
      ) : (
        <DataTable
          etiqueta="Maniobras del programa"
          columnas={COLUMNAS_MANIOBRAS}
          pagina={maniobras.data}
          cargando={maniobras.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(maniobra) => String(maniobra.id)}
          vacio={<EmptyState titulo="No hay maniobras registradas" descripcion="Registre la primera maniobra." />}
        />
      )}
    </>
  )
}
```

- [ ] **Step 6: Wire the routes**

In `src/routes/_app/programa/maniobras/$id/index.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ManiobraPage } from '@/features/maniobras/maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobra, context.sesion.actual()),
  component: RutaManiobra,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarManiobraVisible } from '@/features/maniobras/cargar'
import { ManiobraPage } from '@/features/maniobras/maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobra, context.sesion.actual()),
  loader: ({ context, params }) => cargarManiobraVisible(context.queryClient, params.id),
  component: RutaManiobra,
})
```

In `src/routes/_app/programa/maniobras/index.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ManiobrasPage } from '@/features/maniobras/maniobras-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobras, context.sesion.actual()),
  component: ManiobrasPage,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ManiobrasPage } from '@/features/maniobras/maniobras-page'
import { esquemaBusquedaManiobras } from '@/features/maniobras/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/')({
  validateSearch: esquemaBusquedaManiobras,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobras, context.sesion.actual()),
  component: ManiobrasPage,
})
```

- [ ] **Step 7: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 8: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/maniobras
```

Expected: PASS.

- [ ] **Step 9: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 431 tests.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add maniobras list and detail"
```

---

### Task 15: Registrar and Modificar maniobra (CA-MAN-02, CA-MAN-04, CA-MAN-06, CA-DEP-01)

**Files:**

- Create: `src/features/maniobras/components/formulario-maniobra.tsx`
- Create: `src/features/maniobras/formulario-maniobra.test.tsx`
- Modify: `src/features/maniobras/modificar-maniobra-page.tsx`
- Modify: `src/features/maniobras/registrar-maniobra-page.tsx`
- Test: `src/lib/formularios.test.ts`
- Modify: `src/lib/formularios.ts`
- Modify: `src/routes/_app/programa/maniobras/$id/editar.tsx`

**Interfaces:**
- Consumes: `consultasFases.conSubfases()`, the shadcn `checkbox`, `aplicarErroresDeCampo`.
- Produces:
  - `aplicarErroresDeCampo` gains `colapsar`: a field error whose first segment is listed (here `subfases`) is reported on that segment, so `'subfases[0].idSubfase'` lands under the subfase picker (CA-MAN-06).
  - `FormularioManiobra`: mounts once the fases catalog is loaded; nombre, descripción (T7 on edit) and a checkbox group of subfases grouped by fase, at least one; toasts T17 and T18 and a jump to the maniobra.
  - `ModificarManiobraPage` shows T11 instead of the form while dependencies 32 and 33 are pending.

- [ ] **Step 1: Write the failing tests**

Create `src/features/maniobras/formulario-maniobra.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { TEXTO_DESCRIPCION_SE_CONSERVA } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrir(ruta: string) {
  await iniciarComo('comandante.aguirre')
  const vista = renderApp(ruta)
  await screen.findByLabelText('Nombre')
  return vista
}

describe('Formulario de maniobra', () => {
  it('CA-MAN-02 registra una maniobra con sus subfases agrupadas por fase', async () => {
    const { usuario, router } = await abrir('/programa/maniobras/nueva')
    const grupo = within(await screen.findByRole('group', { name: 'Subfases de la maniobra' }))
    expect(grupo.getByText('Adaptación')).toBeInTheDocument()
    expect(grupo.getAllByRole('checkbox')).toHaveLength(5)
    await usuario.type(screen.getByLabelText('Nombre'), 'Autorrotación doble')
    await usuario.type(screen.getByLabelText('Descripción'), 'Aterrizaje sin potencia')
    await usuario.click(grupo.getByRole('checkbox', { name: 'Navegación' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    expect(await screen.findByText('Maniobra registrada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras/12'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Autorrotación doble' })).toBeInTheDocument()
    expect(screen.getByText('Navegación')).toBeInTheDocument()
  })

  it('CA-MAN-02 exige el nombre y al menos una subfase', async () => {
    const { usuario } = await abrir('/programa/maniobras/nueva')
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La asignación de subfases es requerida')).toBeInTheDocument()
  })

  it('CA-MAN-04 modificar precarga las subfases actuales y avisa sobre la descripción', async () => {
    const { usuario, router } = await abrir('/programa/maniobras/9/editar')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Maniobra 9')
    expect(screen.getByRole('checkbox', { name: 'Instrumentos' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Navegación' })).not.toBeChecked()
    expect(screen.getByText(TEXTO_DESCRIPCION_SE_CONSERVA)).toBeInTheDocument()
    await usuario.click(screen.getByRole('checkbox', { name: 'Navegación' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    expect(await screen.findByText('Maniobra modificada.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras/9'))
    await waitFor(() => expect(screen.getByText('Navegación')).toBeInTheDocument())
  })

  it('CA-MAN-06 los errores del backend aparecen bajo su campo y bajo el selector de subfases', async () => {
    server.use(
      http.post(`${config.sigedaApiUrl}/api/maniobras`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-09-19T10:00:00',
            status: 400,
            error: 'Error al validar el modelo',
            message: null,
            messages: [
              "'nombre': El nombre debe tener entre 3 y 35 caracteres.",
              "'subfases[0].idSubfase': La subfase es requerida.",
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrir('/programa/maniobras/nueva')
    await usuario.type(screen.getByLabelText('Nombre'), 'Autorrotación doble')
    await usuario.click(screen.getByRole('checkbox', { name: 'Navegación' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar maniobra' }))
    expect(await screen.findByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('La subfase es requerida.')).toBeInTheDocument()
  })

  it('CA-DEP-01 sin las dependencias 32 y 33 la ruta de modificar no muestra el formulario', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/maniobras/9/editar')
    expect(await screen.findByText(MENSAJE_DEPENDENCIA_PENDIENTE)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })
})
```

In `src/lib/formularios.test.ts`, replace:

```ts
    })
  })

  it('no marca nada cuando el error no trae campos', () => {
    const setError = vi.fn()
    expect(aplicarErroresDeCampo(new ApiError(400, 'Asignar aeronave disponible.'), setError)).toBe(false)
```

with:

```ts
    })
  })

  it('CA-MAN-06 agrupa en un solo campo los errores de una lista', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Revise los campos marcados.', {
      'subfases[0].idSubfase': 'La subfase es requerida.',
      nombre: 'El nombre es obligatorio',
    })
    expect(aplicarErroresDeCampo(error, setError, {}, ['subfases'])).toBe(true)
    expect(setError).toHaveBeenCalledWith('subfases', { type: 'server', message: 'La subfase es requerida.' })
    expect(setError).toHaveBeenCalledWith('nombre', { type: 'server', message: 'El nombre es obligatorio' })
  })

  it('no marca nada cuando el error no trae campos', () => {
    const setError = vi.fn()
    expect(aplicarErroresDeCampo(new ApiError(400, 'Asignar aeronave disponible.'), setError)).toBe(false)
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/maniobras src/lib/formularios.test.ts
```

Expected: FAIL — `AssertionError: expected "vi.fn()" to be called with arguments: [ Array(2) ]`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/lib/formularios.ts`, replace:

```ts
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

with:

```ts
  error: ApiError,
  setError: UseFormSetError<T>,
  renombrar: Readonly<Record<string, string>> = {},
  colapsar: readonly string[] = [],
): boolean {
  const entradas = Object.entries(error.erroresDeCampo)
  for (const [campo, mensaje] of entradas) {
    const ruta = rutaDeCampo(campo, renombrar)
    const raiz = ruta.split('.')[0] ?? ruta
    setError((colapsar.includes(raiz) ? raiz : ruta) as Path<T>, { type: 'server', message: mensaje })
  }
  return entradas.length > 0
}
```

- [ ] **Step 4: Write the screens**

Create `src/features/maniobras/components/formulario-maniobra.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { consultasFases, type FaseConSubfases } from '@/features/fases/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import {
  MENSAJE_MANIOBRA_MODIFICADA,
  MENSAJE_MANIOBRA_REGISTRADA,
  TEXTO_DESCRIPCION_SE_CONSERVA,
} from '@/lib/dominio/programa'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesManiobras, crearManiobra, modificarManiobra, type ManiobraDetalle } from '../api'
import { esquemaManiobra, MANIOBRA_VACIA, type ValoresManiobra } from '../schemas'

type Props = { maniobra?: ManiobraDetalle }

export function FormularioManiobra({ maniobra }: Props) {
  const fases = useQuery(consultasFases.conSubfases())
  const error = errorDePrimeraCarga(fases)

  if (error !== null) return <AvisoDeError error={error} alReintentar={() => void fases.refetch()} />
  if (!fases.isSuccess) return <p className="text-sm text-muted-foreground">Cargando las subfases…</p>
  return <FormularioConSubfases maniobra={maniobra} fases={fases.data} />
}

function FormularioConSubfases({ maniobra, fases }: Props & { fases: FaseConSubfases[] }) {
  const modificando = maniobra !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales: ValoresManiobra = maniobra
    ? {
        nombre: maniobra.nombre,
        descripcion: maniobra.descripcion ?? '',
        subfases: (maniobra.subfases ?? []).map((subfase) => String(subfase.id)),
      }
    : MANIOBRA_VACIA
  const formulario = useForm<ValoresManiobra>({ resolver: zodResolver(esquemaManiobra), defaultValues: iniciales })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresManiobra) => {
      const cuerpo = {
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion.trim(),
        subfases: valores.subfases.map((id) => ({ idSubfase: Number(id) })),
      }
      return maniobra ? modificarManiobra(maniobra.id, cuerpo) : crearManiobra(cuerpo)
    },
    onSuccess: async (id) => {
      toast.success(modificando ? MENSAJE_MANIOBRA_MODIFICADA : MENSAJE_MANIOBRA_REGISTRADA)
      await queryClient.invalidateQueries({ queryKey: clavesManiobras.todo })
      await navegar({ to: '/programa/maniobras/$id', params: { id: String(id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError, {}, ['subfases'])
    },
  })

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar la maniobra</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos de la maniobra</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="maniobra-nombre">Nombre</FieldLabel>
              <Input id="maniobra-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 3 a 35 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.descripcion)}>
              <FieldLabel htmlFor="maniobra-descripcion">Descripción</FieldLabel>
              <Textarea
                id="maniobra-descripcion"
                aria-invalid={Boolean(errors.descripcion)}
                {...formulario.register('descripcion')}
              />
              {modificando && <FieldDescription>{TEXTO_DESCRIPCION_SE_CONSERVA}</FieldDescription>}
              <FieldError errors={[errors.descripcion]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Subfases</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Controller
            control={formulario.control}
            name="subfases"
            render={({ field }) => (
              <div role="group" aria-label="Subfases de la maniobra" className="grid gap-4">
                {fases.map((grupo) => (
                  <div key={grupo.fase.id} className="grid gap-2">
                    <p className="text-sm font-medium">{grupo.fase.nombre}</p>
                    {grupo.subfases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">La fase no tiene subfases.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {grupo.subfases.map((subfase) => (
                          <div key={subfase.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`subfase-${subfase.id}`}
                              checked={field.value.includes(String(subfase.id))}
                              onCheckedChange={(marcado) =>
                                field.onChange(
                                  marcado === true
                                    ? [...field.value, String(subfase.id)]
                                    : field.value.filter((id) => id !== String(subfase.id)),
                                )
                              }
                            />
                            <Label htmlFor={`subfase-${subfase.id}`} className="font-normal">
                              {subfase.nombre}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          />
          <FieldError errors={[errors.subfases?.root ?? errors.subfases]} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/programa/maniobras/$id" params={{ id: String(maniobra.id) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/programa/maniobras">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar maniobra'}
        </Button>
      </div>
    </form>
  )
}
```

In `src/features/maniobras/modificar-maniobra-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

type Props = { id: number }

export function ModificarManiobraPage({ id }: Props) {
  return <PageHeader titulo="Modificar maniobra" descripcion={String(id)} />
}
```

with:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { consultasManiobras } from './api'
import { FormularioManiobra } from './components/formulario-maniobra'

export function ModificarManiobraPage({ id }: { id: number }) {
  const { data: maniobra } = useSuspenseQuery(consultasManiobras.detalle(id))
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/programa/maniobras/$id" params={{ id: String(maniobra.id) }}>
        Volver a la maniobra
      </Link>
    </Button>
  )

  if (!accionDisponible('modificarManiobra')) {
    return (
      <>
        <PageHeader titulo="Modificar maniobra" descripcion={maniobra.nombre} acciones={volver} />
        <Alert>
          <CircleAlert />
          <AlertTitle>No disponible</AlertTitle>
          <AlertDescription>{MENSAJE_DEPENDENCIA_PENDIENTE}</AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader titulo="Modificar maniobra" descripcion={maniobra.nombre} acciones={volver} />
      <FormularioManiobra maniobra={maniobra} />
    </>
  )
}
```

In `src/features/maniobras/registrar-maniobra-page.tsx`, replace:

```tsx
import { PageHeader } from '@/components/page-header'

export function RegistrarManiobraPage() {
  return <PageHeader titulo="Registrar maniobra" />
}
```

with:

```tsx
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { FormularioManiobra } from './components/formulario-maniobra'

export function RegistrarManiobraPage() {
  return (
    <>
      <PageHeader
        titulo="Registrar maniobra"
        descripcion="Cree una maniobra y asígnela a sus subfases."
        acciones={
          <Button variant="outline" asChild>
            <Link to="/programa/maniobras">Volver a maniobras</Link>
          </Button>
        }
      />
      <FormularioManiobra />
    </>
  )
}
```

- [ ] **Step 5: Wire the routes**

In `src/routes/_app/programa/maniobras/$id/editar.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ModificarManiobraPage } from '@/features/maniobras/modificar-maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarManiobra, context.sesion.actual()),
  component: RutaModificarManiobra,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarManiobraVisible } from '@/features/maniobras/cargar'
import { ModificarManiobraPage } from '@/features/maniobras/modificar-maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarManiobra, context.sesion.actual()),
  loader: ({ context, params }) => cargarManiobraVisible(context.queryClient, params.id),
  component: RutaModificarManiobra,
})
```

- [ ] **Step 6: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/maniobras src/lib/formularios.test.ts
```

Expected: PASS.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 437 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add maniobra form"
```

---

### Task 16: Estándares de la maniobra (CA-EST-01..CA-EST-04) (M2-8)

**Files:**

- Create: `src/features/maniobras/estandares-page.test.tsx`
- Modify (full rewrite): `src/features/maniobras/estandares-page.tsx`
- Modify: `src/routes/_app/programa/maniobras/$id/estandares.tsx`

**Interfaces:**
- Consumes: `consultasManiobras.detalle`, `guardarEstandares`, `useFieldArray`, the programa texts.
- Produces:
  - `EstandaresPage`: the full list of estándares as a field array (`id` `0` creates, `id > 0` updates), at least one, nombre 3–35 and descripción ≤ 255. A saved estándar cannot be removed and shows T6 plus T7 under its descripción; a new row can be removed. The list-level error (B11) shows above the list and each row error (B10) under its field; toast T20 and a return to the maniobra.

- [ ] **Step 1: Write the failing tests**

Create `src/features/maniobras/estandares-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_DESCRIPCION_SE_CONSERVA, TEXTO_ESTANDAR_NO_SE_QUITA } from '@/lib/dominio/programa'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirEstandares(id: number) {
  await iniciarComo('jefe.operaciones')
  const vista = renderApp(`/programa/maniobras/${id}/estandares`)
  await screen.findByRole('heading', { level: 1, name: 'Estándares de la maniobra' })
  return vista
}

describe('Estándares de la maniobra', () => {
  it('CA-EST-02 y CA-EST-04 edita los estándares y vuelve al detalle con el aviso', async () => {
    const { usuario, router } = await abrirEstandares(9)
    expect(screen.getByLabelText('Nombre 1')).toHaveValue('Estandar 60')
    await usuario.type(screen.getByLabelText('Descripción 1'), 'Mantener altitud ±50 ft')
    await usuario.click(screen.getByRole('button', { name: 'Agregar estándar' }))
    await usuario.type(screen.getByLabelText('Nombre 3'), 'Mantener rumbo ±5°')
    await usuario.click(screen.getByRole('button', { name: 'Guardar estándares' }))
    expect(await screen.findByText('Estándares guardados.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/programa/maniobras/9'))
    expect(await screen.findByText('Mantener rumbo ±5°')).toBeInTheDocument()
    expect(screen.getByText('· Mantener altitud ±50 ft')).toBeInTheDocument()
  })

  it('CA-EST-03 un estándar guardado no se puede quitar y avisa sobre la descripción', async () => {
    const { usuario } = await abrirEstandares(9)
    expect(screen.getAllByText(TEXTO_ESTANDAR_NO_SE_QUITA)).toHaveLength(2)
    expect(screen.getAllByText(TEXTO_DESCRIPCION_SE_CONSERVA)).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Quitar estándar 1' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Agregar estándar' }))
    expect(screen.getByRole('button', { name: 'Quitar estándar 3' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Quitar estándar 3' }))
    expect(screen.queryByLabelText('Nombre 3')).not.toBeInTheDocument()
  })

  it('CA-EST-02 exige al menos un estándar con nombre válido', async () => {
    const { usuario } = await abrirEstandares(11)
    expect(screen.getByLabelText('Nombre 1')).toHaveValue('')
    await usuario.click(screen.getByRole('button', { name: 'Guardar estándares' }))
    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Nombre 1'), 'AB')
    await usuario.click(screen.getByRole('button', { name: 'Guardar estándares' }))
    expect(await screen.findByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
  })

  it('CA-EST-04 el error de lista vacía aparece sobre la lista y los de cada fila bajo su campo', async () => {
    server.use(
      http.put(`${config.sigedaApiUrl}/api/maniobras/:id/estandar`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-09-19T10:00:00',
            status: 400,
            error: 'Error al validar el modelo',
            message: null,
            messages: [
              "'estandares': La asignación de estandares es requerida",
              "'estandares[0].nombre': El nombre debe tener entre 3 y 35 caracteres.",
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirEstandares(9)
    await usuario.click(screen.getByRole('button', { name: 'Guardar estándares' }))
    expect(await screen.findByText('La asignación de estandares es requerida')).toBeInTheDocument()
    const fila = screen.getByLabelText('Nombre 1').closest('div')
    expect(within(fila as HTMLElement).getByText('El nombre debe tener entre 3 y 35 caracteres.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/maniobras
```

Expected: FAIL — `TestingLibraryElementError: Unable to find a label with the text of: Nombre 1`

- [ ] **Step 3: Write the screens**

Replace `src/features/maniobras/estandares-page.tsx` with:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, X } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import {
  MENSAJE_ESTANDARES_GUARDADOS,
  TEXTO_DESCRIPCION_SE_CONSERVA,
  TEXTO_ESTANDAR_NO_SE_QUITA,
} from '@/lib/dominio/programa'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesManiobras, consultasManiobras, guardarEstandares } from './api'
import { esquemaEstandares, type ValoresEstandares } from './schemas'

export function EstandaresPage({ id }: { id: number }) {
  const { data: maniobra } = useSuspenseQuery(consultasManiobras.detalle(id))
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales: ValoresEstandares = {
    estandares:
      maniobra.estandares.length > 0
        ? maniobra.estandares.map((estandar) => ({
            id: String(estandar.id),
            nombre: estandar.nombre,
            descripcion: estandar.descripcion ?? '',
          }))
        : [{ id: '0', nombre: '', descripcion: '' }],
  }
  const formulario = useForm<ValoresEstandares>({ resolver: zodResolver(esquemaEstandares), defaultValues: iniciales })
  const { errors } = formulario.formState
  const estandares = useFieldArray({ control: formulario.control, name: 'estandares' })

  const guardar = useMutation({
    mutationFn: (valores: ValoresEstandares) =>
      guardarEstandares(maniobra.id, {
        estandares: valores.estandares.map((estandar) => ({
          id: Number(estandar.id),
          nombre: estandar.nombre.trim(),
          descripcion: estandar.descripcion.trim(),
        })),
      }),
    onSuccess: async () => {
      toast.success(MENSAJE_ESTANDARES_GUARDADOS)
      await queryClient.invalidateQueries({ queryKey: clavesManiobras.todo })
      await navegar({ to: '/programa/maniobras/$id', params: { id: String(maniobra.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <>
      <PageHeader
        titulo="Estándares de la maniobra"
        descripcion={maniobra.nombre}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/programa/maniobras/$id" params={{ id: String(maniobra.id) }}>
              Volver a la maniobra
            </Link>
          </Button>
        }
      />
      <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
        {guardar.error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron guardar los estándares</AlertTitle>
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>
              <h2>Estándares</h2>
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => estandares.append({ id: '0', nombre: '', descripcion: '' })}
            >
              <Plus aria-hidden />
              Agregar estándar
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FieldError errors={[errors.estandares?.root ?? errors.estandares]} />
            {estandares.fields.map((fila, indice) => {
              const error = errors.estandares?.[indice]
              const guardado = formulario.getValues(`estandares.${indice}.id`) !== '0'
              const numero = indice + 1
              return (
                <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field data-invalid={Boolean(error?.nombre)}>
                    <FieldLabel htmlFor={`estandar-nombre-${indice}`}>Nombre {numero}</FieldLabel>
                    <Input
                      id={`estandar-nombre-${indice}`}
                      aria-invalid={Boolean(error?.nombre)}
                      {...formulario.register(`estandares.${indice}.nombre`)}
                    />
                    <FieldError errors={[error?.nombre]} />
                  </Field>
                  <Field data-invalid={Boolean(error?.descripcion)}>
                    <FieldLabel htmlFor={`estandar-descripcion-${indice}`}>Descripción {numero}</FieldLabel>
                    <Input
                      id={`estandar-descripcion-${indice}`}
                      aria-invalid={Boolean(error?.descripcion)}
                      {...formulario.register(`estandares.${indice}.descripcion`)}
                    />
                    {guardado && <FieldDescription>{TEXTO_DESCRIPCION_SE_CONSERVA}</FieldDescription>}
                    <FieldError errors={[error?.descripcion]} />
                  </Field>
                  {guardado ? (
                    <p className="text-xs text-muted-foreground sm:mt-8">{TEXTO_ESTANDAR_NO_SE_QUITA}</p>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="sm:mt-6"
                      aria-label={`Quitar estándar ${numero}`}
                      onClick={() => estandares.remove(indice)}
                    >
                      <X aria-hidden />
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link to="/programa/maniobras/$id" params={{ id: String(maniobra.id) }}>
              Cancelar
            </Link>
          </Button>
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar estándares'}
          </Button>
        </div>
      </form>
    </>
  )
}
```

- [ ] **Step 4: Wire the routes**

In `src/routes/_app/programa/maniobras/$id/estandares.tsx`, replace:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { EstandaresPage } from '@/features/maniobras/estandares-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/estandares')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.estandares, context.sesion.actual()),
  component: RutaEstandares,
})
```

with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cargarManiobraVisible } from '@/features/maniobras/cargar'
import { EstandaresPage } from '@/features/maniobras/estandares-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/estandares')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.estandares, context.sesion.actual()),
  loader: ({ context, params }) => cargarManiobraVisible(context.queryClient, params.id),
  component: RutaEstandares,
})
```

- [ ] **Step 5: Regenerate the route tree**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds and `src/routeTree.gen.ts` now holds the new routes (the generated file is committed).

- [ ] **Step 6: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/maniobras
```

Expected: PASS.

- [ ] **Step 7: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 441 tests.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add estandares editor"
```

---

### Task 17: Materias (CA-MAT-01..CA-MAT-04) (M2-9)

**Files:**

- Create: `src/features/materias/api.ts`
- Create: `src/features/materias/components/dialogo-materia.tsx`
- Create: `src/features/materias/materias-page.test.tsx`
- Modify (full rewrite): `src/features/materias/materias-page.tsx`
- Create: `src/features/materias/schemas.ts`
- Modify: `src/mocks/handlers.ts`
- Create: `src/mocks/sigeda/materias.ts`

**Interfaces:**
- Consumes: `ConfirmDialog`, the shadcn `dialog`, `formatearNota`, `usePuede`, `aplicarErroresDeCampo`.
- Produces:
  - `src/mocks/sigeda/materias.ts` implements `contrato-api-teoria.md` §1 with the statuses and messages of `contrato-api-matricula.md` §6: list ordered by parte and nombre, detail, create, update (both `201 {mensaje, materia}`), delete (`200` text, `409` when the materia has preguntas) and the whole validation table.
  - `src/features/materias/api.ts`: `PARTES_CURSO`, `etiquetaDeParte`, `listarMaterias`, `crearMateria`, `modificarMateria`, `eliminarMateria`; `esquemaMateria` validates nota mínima (integer 0–20) and coeficiente (0–1 with up to 2 decimals) client-side with the contract's messages.
  - `MateriasPage`: nombre, nota mínima, coeficiente with two decimals and parte del curso; registrar, modificar and eliminar only with `Manage Subjects`; the backend's reason when a materia cannot be deleted.

- [ ] **Step 1: Write the failing tests**

Create `src/features/materias/materias-page.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirMaterias(username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp('/programa/materias')
  await screen.findByRole('table', { name: 'Materias del curso' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Materias del curso' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').slice(0, 4).map((celda) => celda.textContent))
}

describe('Materias', () => {
  it('CA-MAT-01 muestra nombre, nota mínima, coeficiente con 2 decimales y parte del curso', async () => {
    await abrirMaterias()
    expect(filas()[0]).toEqual(['Adoctrinamiento de Vuelo', '18', '0.22', 'Primera parte'])
    expect(filas()).toHaveLength(11)
  })

  it('CA-MAT-01 sin Manage Subjects solo se consultan', async () => {
    await abrirMaterias('jefe.operaciones')
    expect(screen.queryByRole('button', { name: 'Registrar materia' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Modificar/ })).not.toBeInTheDocument()
  })

  it('CA-MAT-02 registra una materia con todos sus datos', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Registrar materia' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Nombre'), 'Navegación Aérea')
    await usuario.type(dialogo.getByLabelText('Nota mínima'), '16')
    await usuario.type(dialogo.getByLabelText('Coeficiente'), '0.05')
    await usuario.selectOptions(dialogo.getByLabelText('Parte del curso'), 'Segunda parte')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar materia' }))
    expect(await screen.findByText('Materia guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(filas().at(-1)).toEqual(['Navegación Aérea', '16', '0.05', 'Segunda parte']))
  })

  it('CA-MAT-02 valida la nota mínima, el coeficiente y el nombre', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Registrar materia' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Nombre'), 'AB')
    await usuario.type(dialogo.getByLabelText('Nota mínima'), '25')
    await usuario.type(dialogo.getByLabelText('Coeficiente'), '1.5')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar materia' }))
    expect(await dialogo.findByText('El nombre debe tener entre 3 y 60 caracteres.')).toBeInTheDocument()
    expect(dialogo.getByText('La nota mínima debe ser un entero entre 0 y 20.')).toBeInTheDocument()
    expect(dialogo.getByText('El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.')).toBeInTheDocument()
  })

  it('CA-MAT-03 un nombre repetido se muestra bajo su campo', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Registrar materia' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Nombre'), 'Meteorología')
    await usuario.type(dialogo.getByLabelText('Nota mínima'), '16')
    await usuario.type(dialogo.getByLabelText('Coeficiente'), '0.04')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar materia' }))
    expect(await dialogo.findByText('Ya existe una materia con ese nombre.')).toBeInTheDocument()
  })

  it('CA-MAT-02 modifica una materia existente', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Modificar Meteorología' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getByLabelText('Nota mínima')).toHaveValue('16')
    await usuario.clear(dialogo.getByLabelText('Nota mínima'))
    await usuario.type(dialogo.getByLabelText('Nota mínima'), '18')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar materia' }))
    expect(await screen.findByText('Materia guardada con éxito.')).toBeInTheDocument()
    await waitFor(() =>
      expect(filas().find((fila) => fila[0] === 'Meteorología')).toEqual(['Meteorología', '18', '0.04', 'Primera parte']),
    )
  })

  it('CA-MAT-04 eliminar pide confirmación y explica cuando la materia tiene preguntas', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Adoctrinamiento de Vuelo' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(
      await screen.findByText('La materia no se puede eliminar, tiene preguntas o turnos teóricos.'),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Meteorología' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Materia eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(filas().some((fila) => fila[0] === 'Meteorología')).toBe(false))
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/materias
```

Expected: FAIL — `TestingLibraryElementError: Unable to find role="table" and name "Materias del curso"`

- [ ] **Step 3: Write the mocks and the shared modules**

In `src/mocks/handlers.ts`, replace:

```ts
import { handlersFases } from './sigeda/fases'
import { handlersGrupos } from './sigeda/grupos'
import { handlersManiobras } from './sigeda/maniobras'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

with:

```ts
import { handlersFases } from './sigeda/fases'
import { handlersGrupos } from './sigeda/grupos'
import { handlersManiobras } from './sigeda/maniobras'
import { handlersMaterias } from './sigeda/materias'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'
```

In `src/mocks/handlers.ts`, replace:

```ts
  ...handlersGrupos,
  ...handlersFases,
  ...handlersManiobras,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

with:

```ts
  ...handlersGrupos,
  ...handlersFases,
  ...handlersManiobras,
  ...handlersMaterias,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
```

Create `src/mocks/sigeda/materias.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { API, autorizar, erroresDeCampo, guardado, textoEliminado, textoNoEncontrado } from './comun'
import { datos, siguienteId, type MateriaMock, type ParteMock } from './datos'

const PARTES: ParteMock[] = ['PRIMERA_PARTE', 'SEGUNDA_PARTE', 'CULTURA_AERONAUTICA']

type CuerpoMateria = { nombre?: unknown; notaMinima?: unknown; coeficiente?: unknown; parte?: unknown }

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function esParte(valor: unknown): valor is ParteMock {
  return PARTES.some((parte) => parte === valor)
}

function erroresDeMateria(cuerpo: CuerpoMateria, idPropia: number | null): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': El nombre es obligatorio")
  else if (nombre.trim().length < 3 || nombre.trim().length > 60) {
    errores.push("'nombre': El nombre debe tener entre 3 y 60 caracteres.")
  } else if (
    datos().materias.some(
      (materia) => materia.id !== idPropia && materia.nombre.toLowerCase() === nombre.trim().toLowerCase(),
    )
  ) {
    errores.push("'nombre': Ya existe una materia con ese nombre.")
  }
  const nota = cuerpo.notaMinima
  if (nota === null || nota === undefined) errores.push("'notaMinima': La nota mínima es obligatoria.")
  else if (typeof nota !== 'number' || !Number.isInteger(nota) || nota < 0 || nota > 20) {
    errores.push("'notaMinima': La nota mínima debe ser un entero entre 0 y 20.")
  }
  const coeficiente = cuerpo.coeficiente
  if (coeficiente === null || coeficiente === undefined) errores.push("'coeficiente': El coeficiente es obligatorio.")
  else if (
    typeof coeficiente !== 'number' ||
    coeficiente < 0 ||
    coeficiente > 1 ||
    Math.round(coeficiente * 100) !== coeficiente * 100
  ) {
    errores.push("'coeficiente': El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.")
  }
  if (!esParte(cuerpo.parte)) errores.push("'parte': Ingresar parte del curso válida.")
  return errores
}

function materiaPublica(materia: MateriaMock) {
  return {
    id: materia.id,
    nombre: materia.nombre,
    notaMinima: materia.notaMinima,
    coeficiente: materia.coeficiente,
    parte: materia.parte,
  }
}

function ordenadas(): MateriaMock[] {
  return [...datos().materias].sort(
    (a, b) => PARTES.indexOf(a.parte) - PARTES.indexOf(b.parte) || a.nombre.localeCompare(b.nombre, 'es'),
  )
}

export const handlersMaterias = [
  http.get(`${API}/api/materias`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const materias = ordenadas()
    if (materias.length === 0) return textoNoEncontrado('No existen materias disponibles.')
    return HttpResponse.json(materias.map(materiaPublica))
  }),
  http.post(`${API}/api/materias`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Subjects')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoMateria
    const errores = erroresDeMateria(cuerpo, null)
    if (errores.length > 0) return erroresDeCampo(errores)
    const materia: MateriaMock = {
      id: siguienteId('materia'),
      nombre: texto(cuerpo.nombre).trim(),
      notaMinima: Number(cuerpo.notaMinima),
      coeficiente: Number(cuerpo.coeficiente),
      parte: esParte(cuerpo.parte) ? cuerpo.parte : 'PRIMERA_PARTE',
      conPreguntas: false,
    }
    datos().materias.push(materia)
    return guardado('Materia', 'materia', materiaPublica(materia))
  }),
  http.get(`${API}/api/materias/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const materia = datos().materias.find((candidata) => candidata.id === Number(params.id))
    if (!materia) return textoNoEncontrado('Materia especificada no existe.')
    return HttpResponse.json(materiaPublica(materia))
  }),
  http.put(`${API}/api/materias/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Subjects')
    if (permitido instanceof Response) return permitido
    const materia = datos().materias.find((candidata) => candidata.id === Number(params.id))
    if (!materia) return textoNoEncontrado('Materia especificada no existe.')
    const cuerpo = (await request.json()) as CuerpoMateria
    const errores = erroresDeMateria(cuerpo, materia.id)
    if (errores.length > 0) return erroresDeCampo(errores)
    materia.nombre = texto(cuerpo.nombre).trim()
    materia.notaMinima = Number(cuerpo.notaMinima)
    materia.coeficiente = Number(cuerpo.coeficiente)
    materia.parte = esParte(cuerpo.parte) ? cuerpo.parte : materia.parte
    return guardado('Materia', 'materia', materiaPublica(materia))
  }),
  http.delete(`${API}/api/materias/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Subjects')
    if (permitido instanceof Response) return permitido
    const materia = datos().materias.find((candidata) => candidata.id === Number(params.id))
    if (!materia) return textoNoEncontrado('Materia especificada no existe.')
    if (materia.conPreguntas) {
      return HttpResponse.text('La materia no se puede eliminar, tiene preguntas o turnos teóricos.', { status: 409 })
    }
    datos().materias = datos().materias.filter((candidata) => candidata.id !== materia.id)
    return textoEliminado('Materia')
  }),
]
```

- [ ] **Step 4: Write the API, the schemas and the columns**

Create `src/features/materias/api.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import { sigeda } from '@/lib/api/sigeda'

export const PARTES_CURSO = [
  { valor: 'PRIMERA_PARTE', etiqueta: 'Primera parte' },
  { valor: 'SEGUNDA_PARTE', etiqueta: 'Segunda parte' },
  { valor: 'CULTURA_AERONAUTICA', etiqueta: 'Cultura aeronáutica' },
] as const

export type ParteCurso = (typeof PARTES_CURSO)[number]['valor']

export type Materia = { id: number; nombre: string; notaMinima: number; coeficiente: number; parte: ParteCurso }

export type CuerpoMateria = { nombre: string; notaMinima: number; coeficiente: number; parte: string }

export const MENSAJE_MATERIA_GUARDADA = 'Materia guardada con éxito.'
export const MENSAJE_MATERIA_ELIMINADA = 'Materia eliminado con éxito.'

const esquemaMateria = z.object({
  id: z.number(),
  nombre: z.string(),
  notaMinima: z.number(),
  coeficiente: z.number(),
  parte: z.enum(PARTES_CURSO.map((parte) => parte.valor)),
})

export function etiquetaDeParte(parte: string): string {
  return PARTES_CURSO.find((opcion) => opcion.valor === parte)?.etiqueta ?? parte
}

export const clavesMaterias = {
  todo: ['materias'] as const,
  lista: () => [...clavesMaterias.todo, 'lista'] as const,
}

export async function listarMaterias(): Promise<Materia[]> {
  const materias = await sigeda.lista<unknown>('/api/materias')
  return materias.map((materia) => esquemaMateria.parse(materia))
}

export async function crearMateria(cuerpo: CuerpoMateria): Promise<string> {
  return soloMensaje(await sigeda.post<unknown>('/api/materias', cuerpo), MENSAJE_MATERIA_GUARDADA)
}

export async function modificarMateria(id: number, cuerpo: CuerpoMateria): Promise<string> {
  return soloMensaje(await sigeda.put<unknown>(`/api/materias/${encodeURIComponent(id)}`, cuerpo), MENSAJE_MATERIA_GUARDADA)
}

export async function eliminarMateria(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/materias/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_MATERIA_ELIMINADA
}

export const consultasMaterias = {
  lista: () => queryOptions({ queryKey: clavesMaterias.lista(), queryFn: listarMaterias }),
}
```

Create `src/features/materias/schemas.ts`:

```ts
import { z } from 'zod'
import { PARTES_CURSO } from './api'

export const esquemaMateria = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener entre 3 y 60 caracteres.')
    .max(60, 'El nombre debe tener entre 3 y 60 caracteres.'),
  notaMinima: z
    .string()
    .min(1, 'La nota mínima es obligatoria.')
    .regex(/^\d{1,2}$/, 'La nota mínima debe ser un entero entre 0 y 20.')
    .refine((valor) => Number(valor) >= 0 && Number(valor) <= 20, 'La nota mínima debe ser un entero entre 0 y 20.'),
  coeficiente: z
    .string()
    .min(1, 'El coeficiente es obligatorio.')
    .regex(/^\d(\.\d{1,2})?$/, 'El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.')
    .refine((valor) => Number(valor) >= 0 && Number(valor) <= 1, 'El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.'),
  parte: z.enum(PARTES_CURSO.map((parte) => parte.valor)),
})

export type ValoresMateria = z.input<typeof esquemaMateria>

export const MATERIA_VACIA: ValoresMateria = {
  nombre: '',
  notaMinima: '',
  coeficiente: '',
  parte: 'PRIMERA_PARTE',
}
```

- [ ] **Step 5: Write the screens**

Create `src/features/materias/components/dialogo-materia.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesMaterias, crearMateria, modificarMateria, PARTES_CURSO, type Materia } from '../api'
import { esquemaMateria, MATERIA_VACIA, type ValoresMateria } from '../schemas'

type Props = { materia?: Materia; disparador: React.ReactNode }

export function DialogoMateria({ materia, disparador }: Props) {
  const [abierto, setAbierto] = useState(false)
  const queryClient = useQueryClient()
  const iniciales: ValoresMateria = materia
    ? {
        nombre: materia.nombre,
        notaMinima: String(materia.notaMinima),
        coeficiente: String(materia.coeficiente),
        parte: materia.parte,
      }
    : MATERIA_VACIA
  const formulario = useForm<ValoresMateria>({ resolver: zodResolver(esquemaMateria), defaultValues: iniciales })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresMateria) => {
      const cuerpo = {
        nombre: valores.nombre.trim(),
        notaMinima: Number(valores.notaMinima),
        coeficiente: Number(valores.coeficiente),
        parte: valores.parte,
      }
      return materia ? modificarMateria(materia.id, cuerpo) : crearMateria(cuerpo)
    },
    onSuccess: async (mensaje) => {
      setAbierto(false)
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesMaterias.todo })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente)
    if (siguiente) formulario.reset(iniciales)
  }

  return (
    <Dialog open={abierto} onOpenChange={alAbrir}>
      <DialogTrigger asChild>{disparador}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{materia ? 'Modificar materia' : 'Registrar materia'}</DialogTitle>
          <DialogDescription>Nota mínima, coeficiente y parte del curso en tierra.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))}>
          <FieldGroup>
            {guardar.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="materia-nombre">Nombre</FieldLabel>
              <Input id="materia-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.notaMinima)}>
              <FieldLabel htmlFor="materia-nota">Nota mínima</FieldLabel>
              <Input
                id="materia-nota"
                inputMode="numeric"
                aria-invalid={Boolean(errors.notaMinima)}
                {...formulario.register('notaMinima')}
              />
              <FieldError errors={[errors.notaMinima]} />
            </Field>
            <Field data-invalid={Boolean(errors.coeficiente)}>
              <FieldLabel htmlFor="materia-coeficiente">Coeficiente</FieldLabel>
              <Input
                id="materia-coeficiente"
                inputMode="decimal"
                aria-invalid={Boolean(errors.coeficiente)}
                {...formulario.register('coeficiente')}
              />
              <FieldError errors={[errors.coeficiente]} />
            </Field>
            <Field data-invalid={Boolean(errors.parte)}>
              <FieldLabel htmlFor="materia-parte">Parte del curso</FieldLabel>
              <NativeSelect id="materia-parte" className="w-full" {...formulario.register('parte')}>
                {PARTES_CURSO.map((parte) => (
                  <NativeSelectOption key={parte.valor} value={parte.valor}>
                    {parte.etiqueta}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.parte]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar materia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

Replace `src/features/materias/materias-page.tsx` with:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { usePuede } from '@/lib/auth/use-sesion'
import { formatearNota } from '@/lib/formato'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesMaterias, consultasMaterias, eliminarMateria, etiquetaDeParte } from './api'
import { DialogoMateria } from './components/dialogo-materia'

export function MateriasPage() {
  const materias = useQuery(consultasMaterias.lista())
  const error = errorDePrimeraCarga(materias)
  const puedeGestionar = usePuede('Manage Subjects')
  const queryClient = useQueryClient()

  const eliminar = useMutation({
    mutationFn: eliminarMateria,
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesMaterias.todo })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <>
      <PageHeader
        titulo="Materias"
        descripcion="Materias del curso en tierra con su nota mínima y coeficiente."
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
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void materias.refetch()} />
      ) : materias.data === undefined ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : materias.data.length === 0 ? (
        <EmptyState titulo="No hay materias registradas" descripcion="Registre la primera materia del curso." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table aria-label="Materias del curso">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Nota mínima</TableHead>
                <TableHead>Coeficiente</TableHead>
                <TableHead>Parte del curso</TableHead>
                {puedeGestionar && (
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {materias.data.map((materia) => (
                <TableRow key={materia.id}>
                  <TableCell>{materia.nombre}</TableCell>
                  <TableCell className="tabular-nums">{materia.notaMinima}</TableCell>
                  <TableCell className="tabular-nums">{formatearNota(materia.coeficiente)}</TableCell>
                  <TableCell>{etiquetaDeParte(materia.parte)}</TableCell>
                  {puedeGestionar && (
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <DialogoMateria
                          materia={materia}
                          disparador={
                            <Button variant="outline" size="sm">
                              <Pencil aria-hidden />
                              Modificar {materia.nombre}
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          disparador={
                            <Button variant="destructive" size="sm" disabled={eliminar.isPending}>
                              <Trash2 aria-hidden />
                              Eliminar {materia.nombre}
                            </Button>
                          }
                          titulo="¿Eliminar la materia?"
                          descripcion={`Se eliminará «${materia.nombre}». Esta acción no se puede deshacer.`}
                          confirmar="Eliminar"
                          destructivo
                          alConfirmar={() => eliminar.mutate(materia.id)}
                        />
                      </div>
                    </TableCell>
                  )}
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

- [ ] **Step 6: Rebuild the app**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm exec vite build
```

Expected: the build succeeds (this task adds no route; the build only checks that the new modules compile).

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm test:run src/features/materias
```

Expected: PASS.

- [ ] **Step 8: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 448 tests.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "feat: add materias"
```

---

### Task 18: Decision log, README and the mock-data check (M2 wrap-up)

**Files:**

- Modify: `README.md`
- Modify: `docs/decisiones.md`

**Interfaces:**
- Consumes: every handler registered in `src/mocks/handlers.ts`; `main.tsx` loads the mocks only when `import.meta.env.DEV && config.mockApi`.
- Produces:
  - `docs/decisiones.md` gains the "Matrícula y programa (M2)" section with how M2-1..M2-15 were applied; `README.md` documents the mock users, the new contract and `VITE_DEPENDENCIAS_RESUELTAS`.
  - A production build that carries no M2 fixture.

- [ ] **Step 1: Record the M2 decisions and update the README**

In `README.md`, replace:

```markdown
- Planes: `docs/superpowers/plans/`
- Contrato de la API teórica: `docs/contrato-api-teoria.md`
- Contrato de turnos y evaluaciones: `docs/contrato-api-turnos.md`

## Modo demostración sin backends
```

with:

```markdown
- Planes: `docs/superpowers/plans/`
- Contrato de la API teórica: `docs/contrato-api-teoria.md`
- Contrato de turnos y evaluaciones: `docs/contrato-api-turnos.md`
- Contrato de matrícula y programa: `docs/contrato-api-matricula.md`

## Modo demostración sin backends
```

In `README.md`, replace:

````markdown
pnpm dev:mock
```

MSW responde en el navegador a `/auth/*`, `/api/usuarios/*` y a los turnos, evaluaciones y catálogos de `docs/contrato-api-turnos.md`, con datos basados en el seed de `sigeda-back` (los datos vuelven al estado inicial al recargar). Contraseña de todos: `123`.

| Usuario | Rol |
|---|---|
````

with:

````markdown
pnpm dev:mock
```

MSW responde en el navegador a `/auth/*`, a los turnos, evaluaciones y catálogos de `docs/contrato-api-turnos.md` y a las personas, cuentas, grupos, fases, maniobras y materias de `docs/contrato-api-matricula.md`, con datos basados en el seed de `sigeda-back` (los datos vuelven al estado inicial al recargar). Contraseña de todos: `123`.

| Usuario | Rol |
|---|---|
````

In `README.md`, replace:

```markdown
| `instructor.perez` | Instructor |
| `instructor.mendoza` | Instructor |
| `alumno.lopez` | Alumno |

## Con los backends reales

1. `sigeda-back` en `:8080` (ver `../sigeda-back/SETUP_DEV.md`).
2. `sigeda_chat_status` en `:3000` (solo para Aprendizaje).
3. Copie `.env.example` a `.env.local` si los puertos cambian, y ejecute `pnpm dev`.
```

with:

```markdown
| `instructor.perez` | Instructor |
| `instructor.mendoza` | Instructor |
| `alumno.lopez` | Alumno |
| `raul.paredes` | Sin rol (no puede iniciar sesión) |

## Con los backends reales

1. `sigeda-back` en `:8080` (ver `../sigeda-back/SETUP_DEV.md`).
2. `sigeda_chat_status` en `:3000` (solo para Aprendizaje).
3. Copie `.env.example` a `.env.local` si los puertos cambian, y ejecute `pnpm dev`.

`VITE_DEPENDENCIAS_RESUELTAS` lista, separados por coma, los números de dependencia de backend ya corregidos en el `sigeda-back` en uso (por ejemplo `22,30,32,33,37`). Mientras falte el número, la aplicación deshabilita la acción que lo necesita: Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33) y Eliminar fase (37). En modo demostración todas están disponibles.
```

In `docs/decisiones.md`, replace:

```markdown
- **Estilos compartidos mientras la revisión de diseño sigue abierta.** Las pantallas de M1 no definen colores propios: los enlaces de texto usan `Enlace`/`EnlaceExterno` (`src/components/enlace.tsx`) y la convención de etiquetas del debriefing (observación roja, causa azul, recomendación sin color) vive en `CLASES_ETIQUETA_DEBRIEFING` de `src/lib/dominio/tonos.ts`. Un cambio de la revisión se hace en `theme.css` o en esos dos módulos.
- **Guardas verificadas.** `src/lib/auth/cobertura-de-rutas.test.ts` falla si una ruta de `/_app` no tiene pantalla registrada o si su archivo no llama a `exigirPantalla` con la pantalla de su propia ruta.
- **Sin Playwright todavía (M1-11).** Las pruebas de componente cubren los criterios contra los mocks del contrato; la suite E2E llega con el primer hito que corra contra un `sigeda-back` corregido.
```

with:

```markdown
- **Estilos compartidos mientras la revisión de diseño sigue abierta.** Las pantallas de M1 no definen colores propios: los enlaces de texto usan `Enlace`/`EnlaceExterno` (`src/components/enlace.tsx`) y la convención de etiquetas del debriefing (observación roja, causa azul, recomendación sin color) vive en `CLASES_ETIQUETA_DEBRIEFING` de `src/lib/dominio/tonos.ts`. Un cambio de la revisión se hace en `theme.css` o en esos dos módulos.
- **Guardas verificadas.** `src/lib/auth/cobertura-de-rutas.test.ts` falla si una ruta de `/_app` no tiene pantalla registrada o si su archivo no llama a `exigirPantalla` con la pantalla de su propia ruta.
- **Sin Playwright todavía (M1-11).** Las pruebas de componente cubren los criterios contra los mocks del contrato; la suite E2E llega con el primer hito que corra contra un `sigeda-back` corregido.

## Matrícula y programa (M2)

Las decisiones M2-1 a M2-15 están en el §14 del spec; aquí queda cómo se aplicaron y lo que se decidió al implementarlas.

- **Contrato primero (M2-1, M2-9).** `src/mocks/sigeda/{personas,cuentas,grupos,fases,maniobras,materias}.ts` implementan `docs/contrato-api-matricula.md` (y su §6 para materias). Los adaptadores toleran las respuestas de hoy: un detalle de persona sin `usuario.id` (se resuelve con `GET /api/personas/{username}`, dependencia 26), una lista sin `tipo` (dependencia 27), un detalle de maniobra sin `subfases` (dependencia 33) y un `POST /api/personas` que no devuelva `usuario`.
- **Una carpeta por entidad.** `src/features/{personas,cuentas,grupos,fases,maniobras,materias}`, como en M1, en lugar de las carpetas `administracion/` y `programa/` del §4.1 del spec: cada pantalla queda junto a su API, sus esquemas y sus componentes.
- **La sesión sale de la persona (M2-10).** `sesion.cargar` llama solo a `GET /api/personas/{username}`; el encabezado y el saludo de Inicio muestran «Nombre ApellidoPaterno» (`nombreDeSesion`). Una cuenta sin rol es una cuenta inválida: se borran los tokens y el inicio de sesión muestra el aviso, que vive en el módulo de sesión (`sesion.aviso()`) porque la restauración ocurre antes de que exista el router.
- **Las respuestas de `/api/usuarios` solo aportan su `mensaje` (M2-3).** `soloMensaje` de `src/features/cuentas/api.ts` las lee con zod; la contraseña que el backend devuelve (hash o texto plano) nunca entra al estado ni a la consola. Lo usan Asignar rol, Restablecer contraseña y Cambiar contraseña.
- **Cambiar contraseña pide la contraseña actual.** El contrato (§2.3, dependencia 3) exige `passwordActual` sobre la propia cuenta; el backend de hoy la ignora, así que enviarla no rompe nada y prepara la corrección.
- **Un 403 con texto plano es una regla de negocio (M2-4).** `normalizarError` muestra ese texto (los motivos de Eliminar persona); un 403 con forma `ErrorResponse` o sin cuerpo sigue siendo «No tiene permisos para esta acción.».
- **Acciones con dependencia pendiente (M2-14).** `src/lib/dependencias.ts` lee `VITE_DEPENDENCIAS_RESUELTAS` y `config.mockApi` en cada llamada (por eso `config` expone `mockApi` y `dependenciasResueltas` como getters: las pruebas cambian el entorno con `vi.stubEnv`). Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33) y Eliminar fase (37) se deshabilitan con su aviso y sus rutas muestran el mismo texto.
- **Tipo y rol (M2-13).** `src/lib/dominio/personas.ts` guarda la tabla por nombre de rol; la usan el formulario de persona (propone el rol según el tipo), Modificar persona (ofrece los tipos compatibles con el rol) y Asignar rol (ofrece los roles compatibles con el tipo). El backend la comprobará por id de rol (dependencias 23 y 28).
- **Nada destructivo sobre la propia cuenta (M2-15).** En el detalle de la propia persona no se ofrecen Eliminar, Asignar rol ni Restablecer contraseña.
- **Listas paginadas con dos utilidades.** Personas y grupos usan `Page_Sort` (`property`); fases y maniobras usan `PageWithSort` (`properties`, tamaño máximo 10, orden solo por `id` o `nombre`), con su propio esquema de búsqueda (`esquemaPaginacionPrograma`).
- **Formularios con catálogos.** Los formularios cuyo `select` o lista de casillas depende de un catálogo (roles, alumnos sin grupo, subfases por fase) se montan recién cuando el catálogo cargó, y muestran el aviso con «Reintentar» si falla la primera carga. El selector de rol de Registrar persona es controlado porque sus opciones cambian con el tipo.
- **Textos fijos.** Los avisos T1–T13 viven junto a su pantalla (`TEXTO_SOLO_RANGO_Y_TIPO`, `TEXTO_PROGRAMA_FIJO`, `TEXTO_CUENTA_*`) y los del programa (T3–T7, T12) y los avisos de fases, maniobras y estándares (T14–T20) en `src/lib/dominio/programa.ts`.
- **Datos de prueba.** Las 10 cuentas del seed más `comandante.aguirre` (solo en los mocks) y `raul.paredes` (cuenta sin rol, no inicia sesión). Se agregan `654321` Lucía Mendoza Ríos (alumna sin grupo ni cuenta, la única que se puede eliminar) y la maniobra 11 «Autorrotación» (sin estándares ni turnos), porque ninguna maniobra del seed se puede eliminar. Las materias son las 11 del PDI; la 3 (Adoctrinamiento de Vuelo) responde 409 al eliminarla.
- **Los toasts no se filtran entre pruebas.** `src/test/setup.ts` llama a `toast.dismiss()` después de cada prueba: sonner guarda su estado fuera de React y dos pruebas seguidas con el mismo mensaje se pisaban.
```

- [ ] **Step 2: Check that the M2 mock data stays out of production**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && rm -rf dist && pnpm exec vite build && ! grep -rlE "Lucía Mendoza|raul\.paredes|comandante\.aguirre|Estandar 60" dist && echo "sin datos de prueba"
```

Expected: the build succeeds and the command prints `sin datos de prueba` (no fixture or mock user in `dist/`).

- [ ] **Step 3: Run the gate**

```bash
export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH; cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && pnpm verify
```

Expected: green, 448 tests.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web && git add -A && git commit -m "docs: record m2 decisions and mock data"
```

---

## Coverage

Every acceptance criterion of spec §14.4 and every decision of §14.2, with the tasks and test files that prove it.

| Criterion / decision | Tasks | Proven by |
|---|---|---|
| CA-PER-01 list columns, sorting and page in the URL | 4, 5 | `features/personas/api.test.ts`, `personas-page.test.tsx` |
| CA-PER-02 persona and account fields with their rules | 9 | `registrar-persona-page.test.tsx` |
| CA-PER-03 rol proposed by tipo, only compatible roles | 3, 9 | `features/personas/registrar-persona-page.test.tsx` (options and proposal), `cuentas/api.test.ts` |
| CA-PER-04 duplicate código and backend field errors | 9 | `registrar-persona-page.test.tsx` |
| CA-PER-05 message, detail and no password anywhere | 9 | `registrar-persona-page.test.tsx` |
| CA-PER-06 detail with the account, T8 and T9 | 6 | `features/personas/api.test.ts`, `persona-page.test.tsx` |
| CA-PER-07 edit rango and tipo only, T1, compatible tipos | 6 | `persona-page.test.tsx` |
| CA-PER-08 asignar rol with the compatible roles | 3, 7 | `cuentas/api.test.ts`, `persona-page.test.tsx` |
| CA-PER-09 restablecer contraseña twice and the same | 3, 7 | `cuentas/api.test.ts`, `persona-page.test.tsx` |
| CA-PER-10 delete with its reasons (B3–B6) | 8 | `persona-page.test.tsx` |
| CA-PER-11 Personas only with Manage Users; Asignar rol with Manage Roles | 4, 7 | `lib/auth/rutas-m2.test.tsx`, `lib/auth/pantallas.test.ts`, `lib/auth/permisos.test.ts` |
| CA-PER-12 nothing destructive on one's own account, T10 | 6, 7, 8 | `persona-page.test.tsx` |
| CA-PER-13 usuario responses read only their `mensaje` | 3 | `cuentas/api.test.ts`, `auth/cambiar-contrasena-page.test.tsx` |
| CA-GRU-01 list columns, sorting, Manage Groups | 4, 10 | `rutas-m2.test.tsx`, `pantallas.test.ts`, `grupos-page.test.tsx` |
| CA-GRU-02 create with its alumnos and B8 | 11 | `formulario-grupo.test.tsx` |
| CA-GRU-03 alumnos without grupo plus the own members, no repeats | 11 | `formulario-grupo.test.tsx` |
| CA-GRU-04 programa read-only on edit, T2 | 11 | `formulario-grupo.test.tsx` |
| CA-GRU-05 unchecking leaves the alumno without grupo | 11 | `formulario-grupo.test.tsx` |
| CA-GRU-06 detail with its alumnos | 10 | `grupo-page.test.tsx` |
| CA-GRU-07 delete warns and shows B9 | 10 | `grupo-page.test.tsx` |
| CA-GRU-08 missing grupo, also with a 200 without body | 10 | `grupo-page.test.tsx` |
| CA-FAS-01 list, sorting, Manage Phases for the actions | 4, 12 | `rutas-m2.test.tsx`, `fases-page.test.tsx`, `fase-page.test.tsx` |
| CA-FAS-02 create with at least one subfase, T14 | 13 | `formulario-fase.test.tsx` |
| CA-FAS-03 detail with the maniobras of each subfase | 12 | `fase-page.test.tsx` |
| CA-FAS-04 edit, T3, T7, new rows, T15 | 13 | `formulario-fase.test.tsx` |
| CA-FAS-05 delete only without subfases (T4), T16 | 12 | `fase-page.test.tsx` |
| CA-FAS-06 backend errors (B10, B11) per field | 13 | `formulario-fase.test.tsx` |
| CA-MAN-01 list, sorting, Manage Maneuvers for the actions | 4, 14 | `rutas-m2.test.tsx`, `maniobras-page.test.tsx` |
| CA-MAN-02 create with subfases grouped by fase, T17 | 15 | `formulario-maniobra.test.tsx` |
| CA-MAN-03 detail with subfases and their fase, T12 | 14 | `maniobra-page.test.tsx` |
| CA-MAN-04 edit preloads the subfases, T7, T18 | 15 | `formulario-maniobra.test.tsx` |
| CA-MAN-05 delete: T5, B12 and T19 | 14 | `maniobra-page.test.tsx` |
| CA-MAN-06 backend errors, subfase errors under the picker | 15 | `lib/formularios.test.ts`, `formulario-maniobra.test.tsx` |
| CA-EST-01 Manage Standards edits, Comandante only reads | 14 | `maniobra-page.test.tsx`, `maniobras-page.test.tsx`, `rutas-m2.test.tsx` |
| CA-EST-02 nombre and descripción rules, new rows, at least one | 16 | `estandares-page.test.tsx` |
| CA-EST-03 a saved estándar is not removed (T6, T7) | 16 | `estandares-page.test.tsx` |
| CA-EST-04 T20, list error above, row errors below | 16 | `estandares-page.test.tsx` |
| CA-MAT-01 columns and Manage Subjects for the actions | 4, 17 | `rutas-m2.test.tsx`, `materias-page.test.tsx` |
| CA-MAT-02 create and edit with their rules | 17 | `materias-page.test.tsx` |
| CA-MAT-03 duplicate name and backend messages | 17 | `materias-page.test.tsx` |
| CA-MAT-04 delete with its reason (409) | 17 | `materias-page.test.tsx` |
| CA-DEP-01 the four actions disabled with T11, routes included | 4, 5, 8, 12, 14, 15 | `lib/dependencias.test.ts`, `personas-page.test.tsx`, `persona-page.test.tsx`, `registrar-persona-page.test.tsx`, `fase-page.test.tsx`, `maniobra-page.test.tsx`, `formulario-maniobra.test.tsx` |
| CA-DEP-02 mock mode and `VITE_DEPENDENCIAS_RESUELTAS` | 4, 5 | `lib/dependencias.test.ts`, `personas-page.test.tsx` |
| CA-SES-06 header and Inicio show the persona's name | 2 | `components/app-shell.test.tsx`, `features/inicio/inicio-page.test.tsx`, `lib/auth/sesion.test.ts` |
| CA-SES-07 no endpoint that returns the password is called | 2 | `lib/auth/sesion.test.ts` |
| CA-SES-08 `rol: null` clears the tokens and shows T13 | 2 | `lib/auth/sesion.test.ts`, `features/auth/login-page.test.tsx` |
| M2-1 contract-first persona creation with its account | 9 | `registrar-persona-page.test.tsx`, `mocks/sigeda/personas.ts` |
| M2-2 persona edit sends rango and tipo only | 6 | `persona-page.test.tsx` |
| M2-3 account in the persona detail, `{mensaje}` only | 3, 6, 7 | `cuentas/api.test.ts`, `persona-page.test.tsx` |
| M2-4 business-rule 403 shows its text | 3, 8 | `lib/api/errors.test.ts`, `persona-page.test.tsx` |
| M2-5 grupos with their alumno picker | 10, 11 | `grupos-page.test.tsx`, `grupo-page.test.tsx`, `formulario-grupo.test.tsx` |
| M2-6 fases: no subfase is removed, delete only when empty | 12, 13 | `fase-page.test.tsx`, `formulario-fase.test.tsx` |
| M2-7 maniobras: contract detail and update, T5, T12 | 14, 15 | `maniobra-page.test.tsx`, `formulario-maniobra.test.tsx` |
| M2-8 estándares edited as a full list, no removal | 16 | `estandares-page.test.tsx` |
| M2-9 materias contract-first and the contract permissions | 4, 17 | `lib/auth/permisos.test.ts`, `materias-page.test.tsx` |
| M2-10 the session is built from the persona alone | 2 | `lib/auth/sesion.test.ts` |
| M2-11 backend dependencies 22–38 | 1, 18 | `docs/contrato-api-turnos.md` (20, 21), `docs/decisiones.md` |
| M2-12 programa readable by staff, writes gated per action | 4, 12, 14, 17 | `pantallas.test.ts`, `rutas-m2.test.tsx`, `fases-page.test.tsx`, `maniobras-page.test.tsx`, `materias-page.test.tsx` |
| M2-13 tipo–rol compatibility everywhere | 3, 6, 7, 9 | `cuentas/api.test.ts`, `persona-page.test.tsx`, `registrar-persona-page.test.tsx` |
| M2-14 capability module and the four gated actions | 4 | `lib/dependencias.test.ts` (plus every CA-DEP-01 screen test) |
| M2-15 nothing destructive on one's own account | 6, 7, 8 | `persona-page.test.tsx` |

M1 follow-ups closed by Task 1:

| Follow-up | Proven by |
|---|---|
| The orden de vuelo keeps its empty state after a failed background refetch | `features/turnos/orden-de-vuelo-page.test.tsx` |
| Retrying an alumno's evaluación never shows "Evaluación pendiente" while it loads | `features/turnos/turno-page.test.tsx` |
| `idSubfase` in the turno detail (dependency 21), with the by-name lookup as the fallback | `features/turnos/api.test.ts`, `modificar-turno-page.test.tsx` |
| An out-of-range page offers "Volver a la primera página" | `components/data-table.test.tsx` |
| `docs/contrato-api-turnos.md` covers dependencies 12–21 | the contract's §5 table |

Spec §8 items covered by M2: dialogs for the small forms and pages for the large ones, empty states with a next action, confirm dialogs for every delete, `tabular-nums` on códigos, DNIs, notas and coeficientes, coeficiente with two decimals, breadcrumbs for every nested screen, and the sidebar grouped by process (Matrícula, Programa).

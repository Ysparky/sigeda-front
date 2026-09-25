# SIGEDA Web — Frontend design spec

**Date:** 2026-09-19
**Status:** awaiting review
**Repo:** `tesis-project/sigeda-web` (greenfield)
**Backends:** `../sigeda-back` (Spring Boot, `:8080`) · `../sigeda_chat_status` (NestJS, `:3000`)

---

## 1. Goal

Build the web client for SIGEDA, the academic management system of the thesis
*"Desarrollar un sistema web integrado con IA para la gestión académica"*
(Alarcón · Caldas). The system now covers the **full academic process of the
Curso Piloto de Helicóptero (PDI EA-510)**: ground instruction (theory) and air
instruction (practical), from enrolment to the student's final grade, plus
AI-assisted study.

This spec is the umbrella design: scope, architecture, screen inventory and
milestones. M0 and M1 are specified to acceptance-criteria level here; each of
M2–M5 gets a short addendum with its CUS acceptance criteria before its plan is
written.

### 1.1 Why the scope grew

The advisor's review (Linares) asked to enumerate the processes, to explain
where evaluations originate and how they relate to enrolment, courses and
attendance, and to define acceptance criteria per use case. The answer is the
process chain in §3: enrolment is the prerequisite, the programme structure
defines what is evaluated, and theory and practical evaluation feed a single
student record. Thesis §3.1.2's exclusion "No incluye gestión o resolución de
prácticas teóricas" no longer holds and must be removed from the thesis.

## 2. Decisions

| Decision | Choice |
|---|---|
| Starting point | Pure greenfield. `sigeda-frontend` is an archive; nothing is imported from it |
| Platform | Vite SPA · React 19 · TypeScript strict |
| Routing | TanStack Router, file-based, zod-validated search params |
| Server state | TanStack Query |
| UI | Tailwind CSS v4 · shadcn/ui · lucide · sonner |
| Forms | react-hook-form + zod |
| Auth | Real JWT against `sigeda-back` |
| Source of truth | `sigeda-back` code wins over thesis text when they disagree |
| Grades | Computed by the backend only; the frontend displays them |
| Theory API | Lives in `sigeda-back`; not implemented yet → contract-first (§11) |
| AI ↔ exams | AI generates questions; the instructor reviews them into the bank |
| Theory exam | Instructor schedules for a grupo; alumnos sit it online; auto-graded |
| Materia | A catalog entity (nota mínima, coeficiente, parte del curso) |
| Mission cycle | Derived views, no new backend (§5.3) |
| Evaluation changes | Only `Modify Evaluations` (Comandante, Admin), per backend and REG-NEG-002/003 |
| Enrolment | Admin registers personas, usuarios and grupos |
| Package manager | pnpm only |
| Conventions | Spanish domain names in code, Spanish UI, no code comments (rationale in `docs/`), short Conventional Commits without `Co-Authored-By` |

## 3. Scope

### 3.1 Processes

| # | Process | Actor | Milestone |
|---|---|---|---|
| P1 | Matrícula: personas, usuarios, grupos | Administrador Web | M2 |
| P2 | Programa: fases, subfases, maniobras, estándares, materias | Comandante · Jefe de Operaciones | M2 |
| P3 | Programación de turno práctico + mission cycle | Jefe de Operaciones | M1 |
| P4 | Evaluación práctica (= debriefing) | Instructor · Comandante | M1 |
| P5 | Banco de preguntas + turno teórico + examen online | Instructor · Alumno | M4 |
| P6 | Seguimiento: estado, chequeos, causales, legajo, NFPI, riesgo | Instructor · Comandante | M5 |
| P7 | Aprendizaje con IA: documentos, cuestionarios de práctica, consultas | All | M3 |

### 3.2 Roles

Permissions are enforced by `sigeda-back` (`Role.java`); the frontend mirrors
them for presentation only.

| Rol | Responsibilities in the app |
|---|---|
| Alumno | Own turnos, evaluaciones, exams and record; sits theory exams; AI study tools |
| Instructor | Registers the evaluación of the turnos assigned to them; question bank; schedules theory exams; sees own grupo |
| Jefe de Operaciones | Programs turnos prácticos; assigns estándares to maniobras |
| Comandante de Escuadrón | Fases, subfases, maniobras, materias; modifies or deletes evaluaciones; sees all grupos |
| Administrador Web | Personas, usuarios, roles, grupos; everything else |

A Chequeo de Operaciones is registered by whoever is the turno's assigned
instructor, so no extra role logic is needed when the Jefe de Operaciones flies
the check.

### 3.3 Out of scope

Maintenance and support; integration with other institutional systems;
user-to-user messaging and videoconference; the virtual classroom (Chamilo);
daily-conference attendance control; the ARO risk form; monthly flight
certificates; psychological appraisal; the Jefe de Instrucción role.

### 3.4 Domain rules the UI must respect

Sources: PDI EA-510 (Título III–IV), "Descripción Eval", "Flujo Desaprobado".

- **DIRBE** grades per maniobra: D, I, R, B, E. D is valid only when the
  required grade is D.
- Below the standard → observación, causa and recomendación are required.
- After a Regular or Malo flight, and in any chequeo, flights are only Bueno or
  Malo. The last mission of each subfase is a chequeo.
- Chequeo trigger: Adaptación and Helitransportadas — 3M, 2M+2R, 1M+4R or 6R;
  Aerotácticas — 2M, 1M+2R or 4R. Chequeo de Operaciones → Chequeo de Comando
  → Consejo de Evaluación de Vuelos.
- Materia passing grades: Ingeniería 16, Adoctrinamiento 18, Emergencias 20,
  Límites de Operación 20, others 16, Pre-Solo 18.
- A failed test or exam requires a subsanación within 24 h; the first grade
  prevails; **the alumno cannot fly until the subsanación is passed**.
- Unjustified rezagado scores 50%.
- Theory causales: average below 13 in a materia; 3 materias failed; 2 exams
  failed; second subsanación failed; 3 consecutive or 5 alternating fails of one
  periodic type or of inopinados.
- NFPI = NIT·0.2 + NIA·0.8 · NIT = NCT·0.8 + NEI·0.2 · NA = PE·0.6 + PT·0.4 ·
  NIA = NFAD·0.40 + NFOH·0.35 + NFOA·0.25. Computed by the backend.

## 4. Architecture

### 4.1 Structure

```
sigeda-web/
├── docs/                      specs, plans, contrato-api-teoria.md
├── e2e/                       Playwright
└── src/
    ├── routes/                file routes: guard, search schema, render a feature page
    ├── features/
    │   ├── auth/              login, sesión, cambiar contraseña
    │   ├── inicio/            role landing
    │   ├── administracion/    personas, usuarios, grupos
    │   ├── programa/          fases, subfases, maniobras, estándares, materias
    │   ├── turnos/            turno práctico, orden de vuelo, hoja de briefing
    │   ├── evaluaciones/      evaluación práctica
    │   ├── teoria/            turno teórico, rendir examen, resultados
    │   ├── banco/             preguntas, alternativas, importar desde IA
    │   ├── seguimiento/       escuadrón, alertas, legajo, reportes, riesgo
    │   └── aprendizaje/       documentos, cuestionario, consultas
    ├── lib/
    │   ├── api/               sigeda.ts · ia.ts · errors.ts · page.ts
    │   ├── auth/              session.ts · permissions.ts
    │   └── dominio/           dirbe.ts · estados.ts · briefing.ts
    ├── components/
    │   ├── ui/                shadcn primitives
    │   └── *                  AppShell, Sidebar, PageHeader, DataTable, EmptyState, ConfirmDialog, StatusBadge
    ├── mocks/                 MSW handlers: sigeda/ (captured fixtures), teoria/ (contract)
    └── theme.css              all design tokens
```

Each feature folder holds `api.ts` (query-key factory, queries, mutations,
types), `schemas.ts` (zod) and `components/`. Route files stay thin.

### 4.2 Environment

`VITE_SIGEDA_API_URL=http://localhost:8080` · `VITE_IA_API_URL=http://localhost:3000`
· `VITE_MOCK_TEORIA=true` while the theory API does not exist. The dev server
runs on `:5173`, the origin `sigeda-back` already allows in CORS.

M0 replaced `VITE_MOCK_TEORIA` with `VITE_MOCK_API` (`src/lib/config.ts`): `true` serves the
`sigeda-back` API from MSW (development only). `VITE_DEPENDENCIAS_RESUELTAS` (M2-14, default empty) lists, comma-separated,
the backend dependency numbers already fixed in the live `sigeda-back` (e.g. `22,30,32,33,37`);
actions that wait for an unlisted dependency stay disabled. Mock mode treats every dependency as resolved.

Node runs from nvm at `/Volumes/ORICO/sdks/nvm` (v25.1.0), which non-interactive
shells do not load; scripts put its `bin` on `PATH` explicitly.

Tooling follows the official Vite React template as of 2026-09: TypeScript 6.0
(not 7) and oxlint (not ESLint). shadcn/ui uses the Radix base and the Nova
preset; `src/components/ui` is vendored CLI output, excluded from lint.

## 5. Session, permissions and API layer

### 5.1 Session

1. `POST /auth/login` with `{ "username", "password" }` (Jackson names on
   `Usuario`) → `{ token, refresh_token, username }`.
2. `GET /api/usuarios/nombre/{username}` → `id`, `username`, `correo`,
   `codPersona`, `rol`. `Usuario.getPersona()` is commented out in the
   backend, so no persona data arrives; the UI shows the username until
   backend dependency 11 lands. The response also carries the password hash,
   which the session parser drops.
   Session = `{ usuario: { id, username, correo }, codPersona, rol, permisos }`.
   *Superseded by M2-10: from M2 this step reads `GET /api/personas/{username}`,
   which carries the persona and no hash (§14.2).*
3. Access token (24 h) in memory; refresh token (7 d) in `localStorage`. On
   boot: `POST /auth/refresh { refreshToken }` → `{ accessToken }`, then step 2.
4. Any 401: refresh once and retry; if refresh fails, clear the session and go
   to `/login?redirect=<path>`.
5. Logout: `POST /auth/logout { refreshToken }`, clear everything.

### 5.2 Permissions

- The UI checks permission names (`Manage Shifts`), never role names.
- Source: `permisos.ts` mirrors `Role.java`, keyed by `rol.nombre`. The
  backend's `rol.permisos` has no JSON mapping and would serialize enum
  constant names (`MANAGE_SHIFTS`) rather than the names `@PreAuthorize`
  checks (`Manage Shifts`), so it is not used. Recorded in
  `docs/decisiones.md`.
- One **route registry** declares path, required permission and nav entry per
  screen. Route `beforeLoad` guards and the sidebar both read it. `<Can>` hides
  actions.
- A 403 shows "No tiene permisos para esta acción".
- Screens scoped to "mine" (Mis turnos, Mis evaluaciones, Mis exámenes, own
  legajo) use `persona.codigo` from the session.

### 5.3 Mission cycle (derived)

| Stage | View | Derivation |
|---|---|---|
| Briefing diario (T−2 h) | Orden de vuelo del día | Turnos with `fechaPre = fechaPost = día` for both programas (PDI, PDE), then each detail; grouped by aeronave, sorted by hora |
| Briefing de detalle (T−1 h) | Hoja de briefing | Per maniobra of the turno: `nota_min ∈ {D, I, R}` → "Explica: Instructor"; `∈ {B, E}` → "Expone: Alumno" (PDI cap. VI) |
| Vuelo | Turno slot | Alumno's `horaInicio`–`horaFin` |
| Debriefing | Registrar evaluación | Observación, causa, recomendación |

The turno detail shows the four stages as a timeline per alumno, with the
debriefing stage done when the evaluación exists.

### 5.4 API clients and error normalisation

`lib/api/sigeda.ts` and `lib/api/ia.ts` wrap `fetch`, attach the Bearer token
(the IA client too, so real auth can be added there later without frontend
changes) and return data or throw `ApiError { status, message, fieldErrors? }`:

| Backend response | Frontend behaviour |
|---|---|
| `400` body `["'campo': mensaje", …]` | `fieldErrors` → shown under each field via `setError`; unmatched → form alert |
| `400`/`500` body `{ error, mensaje }` | Show `error`; `mensaje` (may contain SQL) goes to the console only |
| `404` text on a **list** endpoint | Empty list (the backend returns 404 for empty pages) |
| `404` text on a detail endpoint | Not-found page |
| `201 { mensaje, <entidad> }` · `200` text on delete | Success toast with `mensaje` |
| NestJS `{ statusCode, message }` | `message` (string or joined array) |
| Network failure | "No se pudo conectar con el servidor" + retry |

Spring `Page` responses map to `{ items, page, size, total, totalPages }`.
`page`, `size` and `sort` live in the URL. Mutations invalidate their feature's
query keys.

## 6. Screen inventory

Data: **Real** = existing endpoint · **Contract** = MSW against §11 until
implemented · **Derived** = computed from existing data.

### M0 — Cuenta

| Screen | Route | Permission | Data |
|---|---|---|---|
| Iniciar sesión | `/login` | — | Real |
| Inicio (per role) | `/` | any | Real |
| Cambiar contraseña | `/cuenta` | `Update` | Real |

### M1 — Turno y evaluación práctica

| Screen | Route | Permission | Data |
|---|---|---|---|
| Programación de turnos | `/turnos` | `Read` | Real |
| Registrar turno | `/turnos/nuevo` | `Manage Shifts` | Real |
| Modificar turno | `/turnos/$id/editar` | `Manage Shifts` | Real |
| Detalle de turno + timeline | `/turnos/$id` | `Read` | Real |
| Orden de vuelo del día | `/turnos/dia/$fecha` | `Read` | Derived |
| Hoja de briefing | `/turnos/$id/briefing/$alumno` | `Read` | Derived |
| Mis turnos | `/mis-turnos` | Alumno | Real |
| Evaluaciones | `/evaluaciones` | `Read` | Real |
| Registrar evaluación | `/turnos/$id/evaluar/$alumno` | `Write` + assigned instructor | Real |
| Detalle de evaluación | `/evaluaciones/$cod` | `Read` | Real |
| Modificar evaluación | `/evaluaciones/$cod/editar` | `Modify Evaluations` | Real |
| Mis evaluaciones | `/mis-evaluaciones` | Alumno | Real |

The evaluation list endpoint is per persona
(`/api/evaluaciones/filter/persona/{cod}`), so staff pick an alumno first. When
backend dependency 10 lands, the alumno becomes an optional filter.

### M2 — Matrícula y programa

| Screen | Route | Permission | Data |
|---|---|---|---|
| Personas + cuenta (usuario y rol) | `/personas` | `Manage Users` | Real + Contract |
| Grupos | `/grupos` | `Manage Groups` | Real |
| Fases y subfases | `/programa/fases` | `Read` (staff); writes `Manage Phases` | Real |
| Maniobras + estándares | `/programa/maniobras` | `Read` (staff); writes `Manage Maneuvers` · `Manage Standards` | Real + Contract |
| Materias | `/programa/materias` | `Read` (staff); writes `Manage Subjects` | Contract |

Adjusted by the M2 addendum: usuarios and roles live in the persona detail (M2-3), programa screens are readable by staff (M2-12). Nested screens, roles and breadcrumbs: §14.3.

### M3 — Aprendizaje (all roles)

| Screen | Route | Permission | Data |
|---|---|---|---|
| Documentos | `/aprendizaje` | `Read` | Real + Contract |
| Cuestionario de práctica | `/aprendizaje/cuestionario` | `Read` | Real |
| Consultas (RAG, `[n]` citations) | `/aprendizaje/consultas` | `Read` | Real + Contract |

`Read` is the only permission every role holds, so it gates all three (M3-12). Against the live AI
backend, dependency 39 (it has no authentication, so every caller is the same user) blocks only the
writes of Documentos — uploading and deleting — while the rest of that screen and all of
Cuestionario stay usable; Consultas needs dependency 45, whose absence makes its session endpoints
500. Search params, breadcrumbs and fixed texts: §15.3.

### M4 — Teoría y banco

| Screen | Route | Permission | Data |
|---|---|---|---|
| Banco de preguntas | `/banco` | `Manage Questions` | Contract |
| Importar desde IA | `/banco/importar` | `Manage Questions` | Real (IA) + Contract |
| Turnos teóricos | `/teoria/turnos` | `Manage Exams` | Contract |
| Resultados por turno | `/teoria/turnos/$id` | `Manage Exams` | Contract |
| Mis exámenes | `/examenes` | `Take Exams` | Contract |
| Rendir examen | `/examenes/$id` | `Take Exams` | Contract |

### M5 — Seguimiento

| Screen | Route | Permission | Data |
|---|---|---|---|
| Escuadrón | `/seguimiento` | `View My Group` / `View All Groups` | Real |
| Alertas | `/seguimiento/alertas` | `View Disapproved` | Real + Contract |
| Legajo del alumno | `/seguimiento/$alumno` | `Read` (alumno: own only) | Real + Contract |
| Reportes y orden de mérito | `/reportes` | `Create Reports` | Real + Contract |
| Predicción de riesgo | inside the legajo | `View Disapproved` | Real (IA) |

Adjusted by the M5 addendum: Escuadrón is gated by `View My Group` alone with `View All Groups` as a capability switch inside it (M5-5), Alertas is **Contract** rather than Real + Contract (M5-7), `/mi-legajo` is added for the alumno (M5-10), and the **Predicción de riesgo row is removed** — the service is unusable and M5 shows no risk (M5-11, §17.6). Screens, panels, search params and fixed texts: §17.3.

## 7. Acceptance criteria

Criteria IDs name the tests that prove them (§8), so the thesis test report can
cite them. Messages match the backend's own validation messages.

### CUS Iniciar sesión (M0)

- **CA-SES-01** Credenciales válidas llevan al Inicio del rol; inválidas muestran "Usuario o contraseña incorrectos" sin revelar cuál falló.
- **CA-SES-02** Recargar la página mantiene la sesión mientras el refresh token sea válido.
- **CA-SES-03** Con el token vencido, la siguiente petición se renueva y reintenta sin intervención del usuario.
- **CA-SES-04** Una ruta sin permiso no se muestra en el menú y, si se accede por URL, muestra "No tiene permisos para esta acción".
- **CA-SES-05** Cerrar sesión invalida el refresh token en el servidor y vuelve a `/login`.

### CUS Cambiar contraseña (M0)

- **CA-CTA-01** Exige la contraseña nueva dos veces e iguales; al guardar muestra el mensaje del backend.

### CUS Gestionar Turno (M1, Jefe de Operaciones)

- **CA-TUR-01** La lista muestra nombre, subfase, programa, fecha de evaluación, cantidad de alumnos y de maniobras; filtra por subfase, programa y rango de fechas; los filtros y la página persisten en la URL.
- **CA-TUR-02** La fecha de evaluación debe ser posterior a hoy.
- **CA-TUR-03** El nombre tiene de 10 a 30 caracteres y no puede ser solo espacios.
- **CA-TUR-04** Se requiere al menos un alumno y una maniobra, sin duplicados.
- **CA-TUR-05** Las maniobras ofrecidas son las de la subfase elegida; cambiar la subfase pide confirmación y limpia las maniobras.
- **CA-TUR-06** La nota mínima de cada maniobra solo puede ser D, I, R, B o E.
- **CA-TUR-07** Cada alumno tiene hora de inicio y fin en formato HH:mm con fin posterior a inicio; se advierte antes de guardar si el horario se superpone con otro turno de la misma aeronave ese día.
- **CA-TUR-08** Una aeronave que no está Disponible no se puede seleccionar.
- **CA-TUR-09** Instructor y aeronave son obligatorios.
- **CA-TUR-10** El detalle muestra los datos del turno, los alumnos con su horario, las maniobras con su nota mínima y la línea de tiempo de la misión por alumno.
- **CA-TUR-11** Eliminar pide confirmación; si el turno ya fue evaluado, la acción no está disponible y se explica el motivo.
- **CA-TUR-12** Modificar aplica las mismas validaciones que registrar.
- **CA-TUR-13** Los errores de validación del backend aparecen bajo el campo correspondiente.
- **CA-TUR-14** El alumno solo ve sus propios turnos.
- **CA-TUR-15** La orden de vuelo del día agrupa los turnos por aeronave y los ordena por hora.
- **CA-TUR-16** La hoja de briefing marca "Explica: Instructor" para maniobras con nota mínima D, I o R, y "Expone: Alumno" para B o E.

### CUS Generar Evaluación (M1, Instructor)

- **CA-EVA-01** La lista muestra código, nombre, fase, evaluador, fecha, alumno, promedio y clasificación; filtra por subfase, programa y clasificación.
- **CA-EVA-02** Solo el instructor asignado al turno puede registrar la evaluación de sus alumnos, y solo una vez por alumno y turno.
- **CA-EVA-03** El formulario pide nombre (10 a 30 caracteres), categoría (Ponderada, Chequeo, Chequeo Sub Fase, Complementación), recomendación general (máximo 250 caracteres), enlace opcional a material de respaldo, y una calificación por cada maniobra del turno.
- **CA-EVA-04** Solo se habilitan calificaciones válidas para la nota mínima de cada maniobra (D solo si la nota mínima es D).
- **CA-EVA-05** Una calificación bajo el estándar exige observación, causa y recomendación antes de guardar.
- **CA-EVA-06** No se puede guardar con maniobras sin calificar.
- **CA-EVA-07** Tras guardar se muestran el promedio y la clasificación devueltos por el backend; el frontend no los calcula.
- **CA-EVA-08** El detalle muestra los datos de la evaluación y, por maniobra, nota mínima, nota obtenida, causa, observación y recomendación.
- **CA-EVA-09** Modificar y eliminar solo están disponibles con el permiso Modify Evaluations; eliminar pide confirmación.
- **CA-EVA-10** El alumno solo ve sus propias evaluaciones.

## 8. Design system and UX

- All colours, radii and fonts are tokens in `theme.css`; no component inlines a
  colour. Light default plus dark mode (system or toggle).
- Inter; `tabular-nums` on every figure; grades with 2 decimals; dates
  `dd/MM/yyyy` (es-PE); all text in Spanish.
- Fixed semantic colours, always paired with a text label, for DIRBE grades,
  clasificación de vuelo and the seven estados del alumno. Primary: aviation
  navy. Red only for alarm and destructive actions.
- Collapsible sidebar grouped by process, filtered by permission; header with
  breadcrumbs, user, role and theme. Mobile: sidebar becomes a sheet.
- Alumno screens are mobile-first; staff screens desktop-first and usable on
  tablets.
- Large forms are pages; small ones are dialogs. Skeletons, empty states with a
  next action, confirm dialogs, sonner toasts.
- Registrar evaluación: one row per maniobra with nota mínima and a DIRBE
  segmented control; invalid grades disabled; a below-standard row expands with
  observación (red label), causa (blue) and recomendación (default text), the
  institution's convention; a live count of below/above-standard maniobras,
  informational only.
- Accessibility: Radix keyboard behaviour, visible focus, labels on every input,
  WCAG AA contrast in both themes.
- M0 ends with a design review: shell plus one reference screen, run in the
  browser, approved before M1 starts.

## 9. Testing

- **Unit (Vitest):** error normalisation and field-error parsing, page mapping,
  permission guards and route registry, DIRBE option validity, briefing rule,
  subsanación block, zod schemas.
- **Component (Testing Library + MSW):** each CUS main flow and exceptions.
  `sigeda-back` handlers use fixtures captured from the running backend at the
  start of each milestone; theory handlers follow `docs/contrato-api-teoria.md`;
  `src/mocks/ia/` handlers follow `docs/contrato-api-aprendizaje.md` and its §7
  fixtures, and reset their state through `reiniciarIaMock()` (M3-17).
- **Timing:** intervals and deadlines are tested with `vi.useFakeTimers()` plus
  `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, and a request
  that never answers with MSW's `delay('infinite')`. Never with real waits.
- **E2E (Playwright):** against the real backends with seed data — login per
  role and the M1 flows end to end.
- Tests carry the criterion ID in their name (`CA-TUR-02 …`).
- Every task passes `typecheck`, `lint`, `test` and `build`.

## 10. Backend dependencies

A checklist for `sigeda-back` (Victor) and `sigeda_chat_status`.

| # | Change | Repo | Needed by |
|---|---|---|---|
| 1 | `GET /api/aeronaves` (id, nombre, estado) | back | M1 — blocks Registrar turno |
| 2 | Stop serializing the password hash in `/api/usuarios/nombre/{nombre}` (widened by 24, §14.5) | back | M0 — security |
| 3 | `PUT /api/usuarios/{id}` accepts any id from any user with `Update` and does not ask for the current password: restrict to the user themself or `Manage Users`. *Amended in M2:* on one's own account the body carries `passwordActual` (required, checked against the stored hash, even with `Manage Users`); `Manage Users` resets another account without it (contract `contrato-api-matricula.md` §2.3) | back | M0 — security |
| 4 | `Manage Groups` for Administrador only | back | M2 |
| 5 | Materia catalog + CRUD + `Manage Subjects` (Comandante) | back | M2 |
| 6 | Theory API (§11) + `Manage Questions`, `Manage Exams` (Instructor), `Take Exams` (Alumno) | back | M4 |
| 7 | `GET /api/personas/{cod}/estado-teorico` | back | M4; feeds the M1 subsanación block |
| 8 | NIT / NIA / NFPI and orden de mérito — *split by 61, 62 and 63 (§17.5); 8 stays the umbrella, and 62 includes two datasets the institution must supply* | back | M5 |
| 9 | Accept `sigeda-back`'s JWT (shared secret) so documents are per user; prediction over real evaluaciones — *its M3 half is refined by dependency 39 (§15.5); its M5 half stays open and unrequested, because M5 cut the risk panel (§17.6)* | chat_status | M3 / M5 |
| 10 | Evaluation list across alumnos with the same filters | back | M1 nice-to-have |
| 11 | Include persona (nombre, apellidos, tipo, idGrupo) in `/api/usuarios/nombre/{nombre}` — *superseded by M2-10 and dependency 25 (§14)* | back | M1 — header and "mine" screens |

## 11. Theory API contract

**Superseded by §16 and by `docs/contrato-api-teoria.md` version 2.** The summary below is
the original M0 sketch and is stale in three places: the auto-submit at window close has a
mechanism only in contract §4.8 (lazy closing on read, because nothing in `sigeda-back` is
scheduled), `estado-teorico` no longer returns `causales[]` in M4 (§16.6), and the whole
surface now carries `codInstructor`/`codAlumno` explicitly (M4-2). Read §16 and the contract,
not this list.

Full request and response shapes are in `docs/contrato-api-teoria.md`, written
for implementation in `sigeda-back`. Summary:

- `/api/materias` — CRUD.
- `/api/preguntas` — paginated list filtered by materia, dificultad and tipo;
  CRUD with nested alternativas; `POST /api/preguntas/lote` for the AI import.
- `/api/turnos-teoricos` — list and create; scores must add up to 20; edit and
  delete only before the window opens; `GET /{id}` includes results.
- Alumno: `GET /api/examenes/pendientes`; `POST /api/turnos-teoricos/{id}/iniciar`
  creates the Cuestionario and returns questions **without** `correcto`;
  `PUT /api/cuestionarios/{id}/respuestas` autosaves;
  `POST /api/cuestionarios/{id}/entregar` grades; the window closing submits
  automatically.
- `GET /api/personas/{cod}/estado-teorico` → `{ bloqueadoPorSubsanacion, pendientes[], causales[] }`.

## 12. Milestones

| Milestone | Content | Blocked by |
|---|---|---|
| M0 Foundation | Scaffold, tokens, shell, session, route registry, API clients, errors, Inicio, Cambiar contraseña, design review | — |
| M1 Práctico | P3 + P4 | Dependency 1 for Registrar turno |
| M2 Matrícula + Programa | P1 + P2 | 5 for Materias to go real; 22, 30, 32 (+33), 37 before the gated actions run against the live backend (M2-14, §14.5) |
| M3 Aprendizaje | P7 | 39 before uploads and deletes run against the live AI backend, 45 before Consultas does (M3-1, M3-9, §15.5); 40 and 41 only if the practice attempt must persist |
| M4 Teoría + Banco | P5, contract-first | 6, 7 to go real |
| M5 Seguimiento | P6 | 7 and 8 to go real; 8 is split by 61–63, of which 62 includes a coefficient table the PDI itself is missing; 64–68 carry the legajo, the alertas and the theory history; 70 and 71 are the two the milestone found (§17.5) |

Each milestone has its own implementation plan in `docs/superpowers/plans/`.

## 13. Addendum M1 — Turno y evaluación práctica

**Date:** 2026-09-19 · **Status:** decided autonomously overnight (user asleep, standing instruction to chain milestones); every decision below is a ruling the user can reverse.

### 13.1 Backend state

Read from `sigeda-back` source (branch `main`, commit `ec2b0dd`); the backend and its database were not running, so nothing was verified live. The full read-only contract, with file:line evidence, is `docs/contratos/sigeda-back-m1.md`. What matters for M1:

- `GET /api/turnos` and `GET /api/turnos/alumno` project `TurnoRealizado.cantGrupo`, which no longer exists on `Turno` (it has `cantAlumno`).
- `GET /api/turnos/{id}` projects `DetalleTurno.gruposTurno`, a relation `Turno` no longer has (it now has a flat `codInstructor` and `alumnosTurno` with times). The detail endpoint cannot return its declared shape.
- There is no endpoint that lists aeronaves.
- `POST`/`PUT /api/turnos` return 200 with the raw entity (not `201 {mensaje, turno}`); `alumnosTurno`/`maniobrasTurno` are `@JsonIgnore`, so the response never shows what was saved.
- `Alumno_TurnoSave` has no default constructor and its constructor parameters are `inicio`/`fin`; whether the JSON keys are `horaInicio`/`horaFin` or `inicio`/`fin` is undetermined.
- Turno validation errors come from `GlobalExceptionHandler` as `ErrorResponse {timestamp, status, error, message, messages[]}`; evaluation rule errors come as `{mensaje}` (400/403) and, for invalid grades, `{"mensaje:": [...]}` (typo'd key). Turno edit/delete of a past turno returns **410**.
- No schedule-overlap validation exists server-side.
- The backend does not require causa/observación/recomendación for a below-standard grade, and does not check that the caller is the turno's instructor.

### 13.2 Decisions

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| M1-1 | **Contract-first for turnos, as for theory.** `docs/contrato-api-turnos.md` (Spanish, for Victor) fixes the shapes the frontend consumes: `GET /api/aeronaves`; list rows with `cantAlumno`; detail with `codInstructor`, `instructor`, `aeronave {id, nombre, estado}`, `alumnosTurno[{codAlumno, alumno, horaInicio, horaFin}]`, `maniobrasTurno[{nota_min, maniobra}]`; create/update `201 {mensaje, turno}`. MSW implements it; the frontend tolerates today's `200` raw entity too. | The backend's turno surface is mid-refactor (commits today); building against its current projections would encode known bugs. | Rework of the turno API adapters if Victor chooses other shapes; screens are unaffected. |
| M1-2 | **Error normaliser learns the other two shapes.** `ErrorResponse`: `messages[]` → field errors, `message` → message. `{mensaje: string}` → message. `{"mensaje:": string[]}` → messages joined. 410 → the backend message. | Without it, every turno validation error and every evaluation rule error shows the generic message. | None; strictly additive. |
| M1-3 | **Categoría has two spellings.** Requests send the enum names `Ponderada`, `Chequeo`, `chequeoSubFase`, `Complementacion`; responses carry `Ponderada`, `Chequeo`, `Chequeo Sub Fase`, `Complementación`. One mapping module owns both. Suggested categories come from `GET /api/personas/{cod}/status`. | Backend reality (Categoria.java). | Low. |
| M1-4 | **DIRBE options per nota mínima** follow `Dirbe.calificacionNoValida`: D→[D]; I→[I, R]; R→[I, R, B]; B→[I, R, B, E]; E→[I, R, B, E]. **Below standard** = `RI`, `BI`, `BR` (`Dirbe.calificacionBajoEstandar`). | Backend is the source of truth; a wrongly encoded grade breaks the whole calculation. | If the PDI's broader "below standard" (e.g. `EB`) is wanted, backend and frontend change together. |
| M1-5 | **Causa, observación and recomendación are required client-side** for below-standard grades (CA-EVA-05); the backend gap is dependency 13. | Spec requirement; backend does not enforce it. | None. |
| M1-6 | **"Registrar evaluación" is offered only to the turno's `codInstructor`** (session `codPersona`) for Ponderada and Chequeo Sub Fase; Chequeo and Complementación ask for an evaluator code (defaults to the current user). The backend does not enforce the first rule (dependency 14). | Spec CA-EVA-02; the backend requires `codEvaluador` for non-programmed categories. | UI gate only until the backend enforces it. |
| M1-7 | **Turno edit/delete is disabled once `fechaEval` is today or earlier**, with the explanation "El turno ya no se puede modificar porque su fecha pasó." | The backend's rule is date-based (`permiteCambios`), not "has evaluations" (its message says otherwise). | Wording only. |
| M1-8 | **Only the alumno's latest evaluation can be modified or deleted**; other rows show why. | Backend rule (`codEvalRealizada`). | None. |
| M1-9 | **Alumno pickers by role**: Comandante/Admin `GET /api/grupos/programa/{p}`; Instructor `GET /api/grupos/instructor/{cod}/programa/{p}`; Jefe de Operaciones `GET /api/alumnos/programa/{p}` (also the turno form's source). Contract-first shapes (the instructor projection has a cardinality bug). | Permissions differ per role in `sigeda-back`. | Adapter rework only. |
| M1-10 | **Aircraft overlap is a client-side warning** from `GET /api/turnos/{fecha}/aeronave/{id}` (contract fixes its path-variable binding); saving is still allowed. | No server-side check exists. | A double booking can still be saved until the backend validates. |
| M1-11 | **Playwright moves to the first milestone that runs against a live, fixed `sigeda-back`.** M1 relies on component tests over the contract mocks. | The backend is not running and its turno endpoints are broken. | Integration evidence for the thesis arrives later. |
| M1-12 | **Breadcrumbs arrive in M1** with the first nested screens. | Deferred from M0. | None. |

### 13.3 Acceptance-criteria amendments

- **CA-TUR-01** — list columns: nombre, subfase, programa, fecha de evaluación, cantidad de alumnos, cantidad de maniobras.
- **CA-TUR-11** — replaced: "Modificar y eliminar solo están disponibles mientras la fecha del turno sea posterior a hoy; si no, se explica el motivo. Eliminar pide confirmación."
- **CA-EVA-02** — "Solo el instructor asignado al turno ve la acción de registrar la evaluación ponderada o de chequeo de sub fase de sus alumnos, una vez por alumno y turno."
- **CA-EVA-04** — options per nota mínima exactly as M1-4.
- **CA-EVA-11** (new) — "La categoría se elige entre las sugeridas por el estado del alumno; en Chequeo y Complementación se indica el código del evaluador."
- **CA-EVA-12** (new) — "Solo la última evaluación del alumno puede modificarse o eliminarse; en las demás se explica el motivo."
- **CA-EVA-13** (new) — "Los errores de reglas del backend (alumno no apto, evaluación ya registrada, notas incorrectas) se muestran con su mensaje."

### 13.4 Backend dependencies added

| # | Change | Needed by |
|---|---|---|
| 12 | Fix `TurnoRealizado` (`cantAlumno`) and `DetalleTurno` (codInstructor, instructor, aeronave, alumnosTurno with hours) | M1 live |
| 13 | Require causa/observación/recomendación for below-standard grades | M1 |
| 14 | Only the turno's instructor may register its Ponderada/Chequeo Sub Fase evaluations | M1 |
| 15 | Server-side aircraft/alumno schedule overlap check (`HorasInicioFin` is never called) | M1 |
| 16 | `Alumno_TurnoSave`: default constructor, JSON keys `horaInicio`/`horaFin` | M1 live |
| 17 | `@PreAuthorize` on 4 `DesaprobadoController` endpoints and `GET /subfases/assigned` | M5 |
| 18 | Response-key typo `"mensaje:"`, NPE risks in `EvaluacionController.update`, `contD` never incremented, `GrupoController.detail` missing `return` | M1 |
| 19 | Seed mojibake in `roles` (breaks `Comandante de Escuadrón` permissions) | M1 live |
| 20 | Enforce alumno ownership server-side: `GET /api/turnos/{id}`, `/api/turnos/alumno?codAlumno=` and `/api/evaluaciones/**` are `Read` for any role; the frontend check is UI-only | M1 |
| 21 | Add `idSubfase` to `DetalleTurno` (Modificar turno recovers it by name today) | M1 live |

## 14. Addendum M2 — Matrícula y programa

**Date:** 2026-09-19 · **Status:** controller rulings M2-1..M2-11 (`.superpowers/notas/investigacion/m2-decisiones.md`), refined and extended after re-reading `sigeda-back`, then revised after review (`.superpowers/notas/m2/revision-addendum.md`, A1–F3); every decision below is a ruling the user can reverse. Contract for Victor: `docs/contrato-api-matricula.md`.

### 14.1 Backend state

Read from `sigeda-back` source (branch `main`, commit `ec2b0dd`, Spring Boot 3.4.2 per `pom.xml:11`); nothing was run. Java paths are relative to `src/main/java/com/sigeda/backend/`; `.sql` and `.properties` files live in `src/main/resources/`; a bare `:line` points into the last file named. The research note `m2-contrato-backend.md` was re-verified line by line; its errors are corrected here (marked *corrects the note*).

**Two conventions.** Persona, Usuario, Rol and Grupo controllers take raw entities with no `@Valid` and no Bean Validation, answer through `utils/Response.java` (text 404/403/400, `201 {mensaje, <entidad>}`) and page with `Page_Sort` (single `property`, no size cap). Fase, SubFase, Maniobra and Estándar take `@Valid` DTOs whose failures reach `GlobalExceptionHandler.java:80-92` as `ErrorResponse.messages[]`, and page with `PageWithSort` (`properties[]` ∈ {`id`, `nombre`}, size 1–10, `PageWithSort.java:15-44`). `ConstraintErrors.formatErrors` never sorts (`ConstraintErrors.java:38-44`), so a field can carry several messages in any order.

**Personas and usuarios**
- `POST /api/personas` stores a random 8-character password **in plaintext** (`grupo/controllers/PersonaController.java:237-249`; `security/services/UsuarioServiceImpl.java:42-46` never encodes) while login compares with BCrypt (`security/config/SecurityConfig.java:63-64`), and never sets `rol`, which `security/services/UserDetailsServiceImpl.java:48-50` rejects. The username is the first name (`PersonaController.java:246`), the correo is generated (`:247-248`), `tipo`, `dni` and `codigo` are unchecked, and `Persona.usuario` is `@JsonIgnore` (`grupo/entities/Persona.java:48-50`), so a client cannot send account data. Every persona created today has an account that cannot log in.
- `PUT /api/personas/{cod}` copies only `rango` and `tipo`, nulling whichever is omitted (`PersonaController.java:277-278`), and answers 201.
- `DELETE /api/personas/{cod}` has three 403 text rules (`PersonaController.java:296-303`). It NPEs (500) when the persona has no usuario (`:305-308`), and fails with an FK error (500) when the usuario holds a refresh token (`schema_prod.sql:348-351`). By then the usuario has already been saved without persona or rol, because the handler is not transactional.
- `GET /api/personas` projects `IndexPersona` = codigo, nombre, aPaterno, aMaterno, rango: **no `tipo`**, no filters (`PersonaController.java:71-100`, `grupo/projections/IndexPersona.java:5-8`).
- `GET /api/personas/{cod}/usuario` projects `DetalleUsuario` with **no `usuario.id`**, `estado` or grupo (`security/projections/DetalleUsuario.java:7-22`), and NPEs (500) for a persona without usuario (`grupo/services/PersonaServiceImpl.java:69`).
- `GET /api/personas/{nom}` (by **username**) has its `@PreAuthorize` commented out (`PersonaController.java:138-139`). Its projection `DetalleSesion` carries codigo, nombre, apellidos, `idGrupo` and `usuario {nombre, correo, id, rol {id, nombre}}`, and **no password** (`security/projections/DetalleSesion.java:7-19`). The endpoint leaks personal data to any authenticated user but not the hash (*corrects the note*, which said it exposes the hash).
- `GET /api/usuarios/{id}`, `/nombre/{nombre}` and `/persona/{cod}` have no `@PreAuthorize` and serialize the entity with `contraseña` as `"password"` (`security/controllers/UsuarioController.java:36-85`, `security/entities/Usuario.java:28-29`): the BCrypt hash, or the plaintext password of accounts created by `POST /api/personas`. The 201 bodies of both `PUT /api/usuarios/{id}` and `PUT /api/usuarios/{id}/rol` echo it too.
- There is no usuario list. `PUT /api/usuarios/{id}` overwrites the username with whatever arrives (`UsuarioController.java:99`) and BCrypts `password`, which fails with a 400 `ErrorResponse` "rawPassword cannot be null" when omitted (`:100`). `PUT /api/usuarios/{id}/rol` stores `rol` as sent, and an unknown id is a 500 FK error (`:110-135`).
- `GET /api/roles` (`Manage Roles`) → `[{id, nombre, descripcion}]`; the seed descriptions and the Comandante name carry mojibake (`data_prod.sql:71-76`, dependency 19).
- `security/entities/Role.java:8-37` grants `Manage Users` and `Manage Roles` to Administrador Web only; `Manage Groups` to Administrador Web and Jefe de Operaciones; `Manage Phases`, `Manage Subphases` and `Manage Maneuvers` to Administrador Web and Comandante de Escuadrón; `Manage Standards` to Administrador Web and Jefe de Operaciones. `src/lib/auth/permisos.ts` matches it in full.

**Grupos**
- `POST /api/grupos` assigns every listed `personas[].codigo` (`grupo/controllers/GrupoController.java:197-203`). `PUT` assigns or removes by `checked` (`:228-234`) and ignores `programa` (`:224-225`). An unknown `codigo` NPEs (500) after the grupo is saved (`:199-200`). An invalid `programa` is stored as null (`application.properties:35`, `READ_UNKNOWN_ENUM_VALUES_AS_NULL`). No field is validated.
- `GET /api/grupos/{id}` answers **200 with an empty body** for a missing grupo: the missing `return` (`GrupoController.java:99-100`, dependency 18) falls through to `ResponseEntity.ok(null)` (`:102`), which writes no body; `src/lib/api/http.ts:28-29` reads it as `null`. `DELETE` detaches the members first (`:253-258`).

**Programa**
- `PUT /api/fases/{id}` replaces the subfase list with orphan removal (`maniobra/entities/Fase.java:28`, `maniobra/services/FaseService.java:69-70`), so an omitted subfase is **deleted** with no check. `turnos.id_sub_fase`, `evaluaciones_practicas.id_sub_fase` and `maniobras_subfase` have no FK to `subfases` (`schema_prod.sql:164,278,128-132`).
- `DELETE /api/fases/{id}` first runs `deleteByManiobrasSubfaseIsNull()` (`FaseService.java:78`), which deletes **every subfase without maniobras in every fase**. With the seed, deleting any fase removes Contacto and Formación, which seeded turnos 1–3 and 7 use (`data_prod.sql:122-129`). A missing id answers 204, because Spring Data JPA 3 ignores it (*corrects the note*, which predicted a 500), and the global cleanup has already run by then.
- `GET /api/maniobras/{id}` returns `estandares` but **no `subfases`** (`maniobra/projections/DetalleManiobra.java`). Create and update return only `{id, nombre, descripcion}` (`maniobra/entities/Maniobra.java:31-39`, `@JsonIgnore`).
- `PUT /api/maniobras/{id}` looks up each link with `findByIdSubfase(idSubfase)` over the whole table (`maniobra/services/ManiobraService.java:113`, `maniobra/dao/IManiobra_SubfaseDao.java:15`). That is a **500** whenever the subfase has two or more maniobras (seed subfases 2, 3 and 4), and it takes over another maniobra's link when exactly one exists. Its not-found message says "fase" (`ManiobraService.java:100`). *Not in the note.*
- An unknown `idSubfase` is stored silently. The only FK on the link table targets a misspelled `maniobras_subfases` (`schema_prod.sql:328-331`); *corrects the note*, which predicted a 500.
- `DELETE /api/maniobras/{id}` refuses with a 410 when the maniobra has estándares, but the message blames a turno (`ManiobraService.java:128-129`). A maniobra without estándares that is used in `maniobras_turno` or `calificaciones` hits their FKs (`schema_prod.sql:303-306,333-336`) and fails with a 500.
- In `PUT /api/fases/{id}` and `PUT /api/maniobras/{id}/estandar`, an `id > 0` that does not exist creates a new row (`FaseService.java:64-66` with `maniobra/dtos/SubfaseSave.java:21-22`; `ManiobraService.java:86-88` with `maniobra/dtos/EstandarSave.java:15-16`).
- `PUT /api/maniobras/{id}/estandar` updates (`id > 0`) or creates. An omitted estándar is neither deleted nor detached: it keeps its FK and **reappears** in the detail (`Maniobra.java:36`, no orphan removal; *corrects the note*, which said "unreachable").
- Blank `descripcion` never clears the stored one (`maniobra/dtos/FaseSave.java:37-38`, and likewise in `SubfaseSave`, `ManiobraSave` and `EstandarSave`). No standalone subfase or estándar CRUD exists.
- **No materia code exists** in `sigeda-back`.

**Frontend notes.**
- `normalizarError` maps every 403 to "No tiene permisos para esta acción" (`src/lib/api/errors.ts:82`), which hides the persona-delete rules (M2-4).
- `rutaDeCampo` (`src/lib/formularios.ts:4-10`) already turns the backend's nested keys into react-hook-form paths (`'subfases[0].nombre'` → `subfases.0.nombre`, `'usuario.username'` stays nested), so the field arrays and the account block need no new mapping.
- `sesion.ts:18-24` requires `rol`; a `rol: null` session throws a `ZodError`, which `restaurar` does not treat as an invalid account (M2-10).
- M0's Cambiar contraseña types the `PUT /api/usuarios/{id}` response as `{mensaje}` without parsing it (`cambiar-contrasena-page.tsx:40`), so the echoed `password` sits in memory (M2-3).

**Messages the criteria show** (the CAs cite these IDs):

| ID | Status | Text (verbatim) | Source |
|---|---|---|---|
| B1 | 400 text | El alumno ya ha sido registrado. | `PersonaController.java:235` |
| B2 | 201 | Persona guardada con éxito. | `utils/Response.java:53` via `PersonaController.java:262,284` |
| B3 | 200 text | Persona eliminado con éxito. | `Response.java:65` via `PersonaController.java:319` |
| B4 | 403 text | No se puede eliminar alumno, ya realizó una evaluación. | `PersonaController.java:297` |
| B5 | 403 text | El alumno no se pudo eliminar, está presente en un turno. | `PersonaController.java:300` |
| B6 | 403 text | El instructor no se pudo eliminar, está presente en un turno. | `PersonaController.java:303` |
| B7 | 201 | Usuario guardada con éxito. | `Response.java:53` via `UsuarioController.java:107,134` |
| B8 | 201 | Grupo guardada con éxito. | `Response.java:53` via `GrupoController.java:209,240` |
| B9 | 200 text | Grupo eliminado con éxito. | `Response.java:65` via `GrupoController.java:265` |
| B10 | 400 | El nombre es obligatorio · El nombre debe tener entre 3 y 35 caracteres. · La descripción no puede superar los 255 caracteres. | `maniobra/dtos/NombreDescripcionDto.java:8-12` |
| B11 | 400 | La asignación de subfases es requerida · La subfase es requerida. · La asignación de estandares es requerida | `FaseSave.java:14`, `ManiobraSave.java:14`, `Maniobra_SubfaseSave.java:10`, `ManiobraDetail.java:10` |
| B12 | 410 | La maniobra no se pudo eliminar, está presente en un turno. | `ManiobraService.java:129` (contract keeps it for turno use only) |

New messages (persona and account validation, materias) are fixed in the contract, §1.3 and §6.

### 14.2 Decisions

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| M2-1 | **Personas: follow the backend for list, edit and delete; contract-first for creation.** *(changed: key `password`, explicit `idRol` instead of a rol derived from tipo, nullable tipo)* `POST /api/personas` also carries `usuario {username, correo, password, idRol}`. The backend validates, BCrypts the password and sets the rol in one transaction, and answers `201 {mensaje, persona, usuario {id, username, correo, rol}}` (contract §1.3). Client rules match the contract: codigo 6 alphanumerics, dni 8 digits, nombre and aPaterno required, `tipo` ∈ {Alumno, Instructor PDI, Instructor PDE, *sin tipo* = null}, username `^[a-z0-9._]{4,30}$`, correo, password ≥ 8 typed twice, rol per M2-13. Text fields are sent trimmed. In live mode the action waits for dependency 22 (M2-14). | Today's flow yields accounts that cannot log in. The key is `password` (not `contraseña`) because that is what `Usuario` already uses in `/auth/login` and `PUT /api/usuarios/{id}`. An explicit rol and a null tipo are needed because staff personas carry `tipo = NULL`: in the real seed the Jefe de Operaciones (333333) and the Administrador (000001), and in the mocks also the Comandante (222444, mock only; the real seed has no Comandante account). A derived rol could not create those accounts. | Adapter rework if Victor picks another shape. |
| M2-2 | **Persona edit follows the backend:** only `rango` and `tipo`, both always sent (`PUT` nulls whichever is missing). The other fields are shown read-only with text T1. It is a dialog in the detail. *(refined)* | `PUT /api/personas/{cod}` ignores the rest. | Wording. |
| M2-3 | **No separate "Usuarios" screen;** the account lives in `/personas/$cod`, read from `GET /api/personas/{cod}/usuario`. *(changed: response parsing)* The contract adds `usuario.id`, `estado` and `grupo` (dependency 26). Until then the adapter takes `usuario.id` from `GET /api/personas/{usuario.nombre}`, which carries no hash. **Asignar rol** calls `PUT /api/usuarios/{id}/rol {rol: {id}}` (`Manage Roles`, options from `GET /api/roles`, M2-13). **Restablecer contraseña** calls `PUT /api/usuarios/{id} {username, password}`, always both. No GET under `/api/usuarios/**` is ever called. **Every `/api/usuarios` mutation adapter** (Asignar rol, Restablecer contraseña, and M0's Cambiar contraseña, which today types the response without parsing it, `cambiar-contrasena-page.tsx:40`) parses the 201 body with a zod schema that keeps only `{mensaje}`. The `usuario.password` the backend echoes (the hash, or the plaintext password of an account created today) therefore never reaches app state or logs. A unit test feeds a fixture that includes `password`. | `DetalleUsuario` has no usuario id; the `/api/usuarios` GETs and both PUT bodies expose the password until dependency 24. | One extra GET until dependency 26. |
| M2-4 | **Delete persona shows the backend's reasons** (B4–B6). `normalizarError` learns that a **403 with a text body** is a business rule (`Response.isForbidden`) and shows its text, while a 403 `ErrorResponse` or an empty body keeps "No tiene permisos para esta acción". | Backend rules; today every 403 is masked. | None. |
| M2-5 | **Grupos:** list; create with optional alumnos (`personas: [{codigo}]`); edit sending every current member and every newly picked alumno as `{codigo, checked}`; delete. Available alumnos = `GET /api/personas/alumno/Alumno` plus the grupo's members. `programa` is read-only on edit (text T2). A 200 with an empty body (the missing `return`; `http.ts` reads it as `null`) is treated as not found. `Manage Groups` keeps the backend's two roles; dependency 4 stays open but no longer blocks. *(refined)* | Backend shape (`PUT` ignores `programa`). | None. |
| M2-6 | **Fases y subfases:** list; detail with each subfase's maniobras (`GET /api/subfases/{id}`); create and edit with a subfase field array (`id > 0` updates, `0` creates). **A saved subfase cannot be removed** (text T3; only unsaved rows can), and **Eliminar fase is offered only for a fase without subfases** (T4), and in live mode only after dependency 37 (M2-14). No "Subfases sin fase" panel: nothing in the backend detaches a subfase from its fase and fase delete cascades, so the state is unreachable; `GET /api/subfases/assign` is not used. The edit form shows T7 under every descripción of a saved item. Success toasts T14–T16. No standalone subfase CRUD. *(changed: panel dropped, fixed texts)* | The backend deletes omitted subfases unchecked, and fase delete wipes unrelated subfases (dependency 37), with no FK to catch it. | The Comandante cannot drop a subfase until dependency 37. |
| M2-7 | **Maniobras:** list, detail, create and edit with a subfase multi-select grouped by fase (`GET /api/fases` + `GET /api/fases/{id}`), delete. **Contract-first for the detail** (`subfases [{id, nombre}]`, dependency 33) **and for update** (`PUT` 500s on any subfase with two or more maniobras, dependency 32). The detail shows each subfase with its fase, taken from that fases catalog, which the screen already loads (dependency 33 stays `{id, nombre}`). Without `subfases` in the response (live, dependency 33 pending) the detail shows T12 instead of deducing them. Modificar maniobra waits for dependencies 32 and 33 in live mode (M2-14). Eliminar is disabled while the maniobra has estándares (T5); any other 410 is shown verbatim. The form shows T7 on edit. Success toasts T17–T19. *(changed: fase from the catalog, no deduction fallback, fixed texts)* | Detail lacks subfases; update is broken. Deducing subfases would cost 1 + F + S requests. | Adapter rework. |
| M2-8 | **Estándares per maniobra** (`Manage Standards`: Jefe de Operaciones, Administrador Web): a page edits the full list with `PUT /api/maniobras/{id}/estandar` (`id > 0` updates, `0` creates, at least one). Removal is not offered (T6): an omitted estándar stays linked and reappears (dependency 36). The form shows T7 on saved rows; success toast T20. *(refined)* | Backend shape. | Feature gap until dependency 36. |
| M2-9 | **Materias** contract-first per `contrato-api-teoria.md` §1, with the exact messages and statuses in `contrato-api-matricula.md` §6. `permisos.ts` gains contract permissions, kept apart and recorded in `docs/decisiones.md`: `Manage Subjects` (Comandante de Escuadrón, Administrador Web), `Manage Questions` and `Manage Exams` (Instructor, Administrador Web), `Take Exams` (Alumno). | Spec §6/§11. | None until the backend implements it. |
| M2-10 | **The session is built from `GET /api/personas/{username}` alone**, replacing §5.1 step 2. Its `DetalleSesion` gives `usuario {id, nombre → username, correo, rol}`, `codigo → codPersona`, and the persona (`nombre`, `aPaterno`, `aMaterno`, `idGrupo`); it has no password. Header and Inicio show "Nombre ApellidoPaterno". 401/403/404 are handled as today (invalid account). **`usuario.rol: null` is an invalid account too.** On login and on restore the session clears both tokens and opens the login page with text T13, instead of letting the parser throw. Today `sesion.ts:23` requires `rol`, so the `ZodError` leaves the tokens in place on restore. Dependency 11 is no longer needed; dependency 25 limits the endpoint to the caller's own username. *(changed: rol null)* | It holds everything the session needs and stops the frontend from downloading the hash. | An account without persona cannot enter (none exists: every usuario is created with its persona). |
| M2-11 | **Backend dependencies 22–38** (§14.5). `GET /api/personas/{nom}` leaks personal data, not the hash; the hash leaks through the `/api/usuarios` GETs and the `PUT /api/usuarios/{id}[/rol]` bodies. | Findings. | None. |
| M2-12 | **Programa screens are readable by all staff** (`Read` plus the staff roles, like the M1 lists); writes are gated per action with `<Can>`: `Manage Phases`, `Manage Maneuvers`, `Manage Standards`, `Manage Subjects`. This replaces §6's per-screen `Manage …` permissions. | The backend GETs are `Read`. The Jefe de Operaciones must reach a maniobra to assign estándares without `Manage Maneuvers`, and the registry holds one permission per route. | None; staff see the programa read-only. |
| M2-13 | **Tipo–rol compatibility**, applied when creating, editing and assigning a rol: Alumno → {Alumno}; Instructor PDI or PDE → {Instructor, Jefe de Operaciones, Comandante de Escuadrón}; *sin tipo* → {Jefe de Operaciones, Comandante de Escuadrón, Administrador Web}. The default rol is Alumno or Instructor by tipo, and there is none for *sin tipo*. A persona without account, or with `rol: null`, accepts any tipo. The frontend keys the table by `rol.nombre`, like `permisos.ts`. **The backend (dependencies 23 and 28) keys it by rol id** (1 Alumno, 2 Administrador Web, 3 Jefe de Operaciones, 4 Instructor, 5 Comandante de Escuadrón), so the seed mojibake (dependency 19) cannot break the check. *(changed: backend keyed by id)* | `tipo` feeds the pickers (`/personas/alumno/Alumno` for grupos, `/personas/instructor/{tipo}` for turnos), so a mismatched account is offered in the wrong place. | Table change. Against the real seed, the frontend cannot match Comandante by name until dependency 19. |
| M2-14 | **Actions with a pending dependency.** *(new)* A small capability module (`src/lib/dependencias.ts`) reads `VITE_DEPENDENCIAS_RESUELTAS`: comma-separated dependency numbers (`22,30,32,33,37`), with spaces allowed and any token that is not a positive integer ignored; the default is empty. In mock mode (`config.mockApi`) every dependency counts as resolved. These actions need their dependencies resolved: **Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 and 33), Eliminar fase (37)**. Until then the action is shown disabled with text T11 beneath it, and opening its route by URL shows T11 instead of the form. `.env.example` lists the variable, empty. | `.env.example` defaults `VITE_MOCK_API=false`, so a plain `pnpm dev` hits the live backend. There these actions ignore the account data (22), leave an account without persona or rol (30), take over another maniobra's links (32), or wipe subfases system-wide even for an empty fase (37). | One env var to maintain; Victor adds a number when he ships the fix. |
| M2-15 | **Nothing destructive on one's own account.** *(new)* When the persona in `/personas/$cod` is the session's own `codPersona`, Eliminar persona, Asignar rol and Restablecer contraseña are not offered, and the account section shows T10. Cambiar contraseña (M0) remains the way to change one's own password. | The only Administrador Web could delete himself or drop his own `Manage Users`/`Manage Roles` and lock everyone out. Once dependency 3 lands, an own-account reset also needs the current password, which Restablecer does not ask for. | None. |

### 14.3 Screens

This replaces the §6 M2 table. Staff = Administrador Web, Comandante de Escuadrón, Jefe de Operaciones and Instructor. Small forms are dialogs (Modificar persona, Asignar rol, Restablecer contraseña, Registrar/Modificar materia); deletes use the confirm dialog.

| Screen | Route | Permission | Roles | Data | Breadcrumb parent |
|---|---|---|---|---|---|
| Personas | `/personas` | `Manage Users` | Administrador Web | Real (+ `tipo`, dep. 27) | — |
| Registrar persona | `/personas/nueva` | `Manage Users` | Administrador Web | Contract (§1.3); live needs dep. 22 | `/personas` |
| Detalle de persona y cuenta | `/personas/$cod` | `Manage Users` (Asignar rol: `Manage Roles`) | Administrador Web | Real + Contract (dep. 26) | `/personas` |
| Grupos | `/grupos` | `Manage Groups` | Administrador Web, Jefe de Operaciones | Real | — |
| Registrar grupo | `/grupos/nuevo` | `Manage Groups` | same | Real | `/grupos` |
| Detalle de grupo | `/grupos/$id` | `Manage Groups` | same | Real | `/grupos` |
| Modificar grupo | `/grupos/$id/editar` | `Manage Groups` | same | Real | `/grupos/$id` |
| Fases y subfases | `/programa/fases` | `Read` + staff | staff | Real | — |
| Registrar fase | `/programa/fases/nueva` | `Manage Phases` | Administrador Web, Comandante | Real | `/programa/fases` |
| Detalle de fase | `/programa/fases/$id` | `Read` + staff | staff | Real | `/programa/fases` |
| Modificar fase | `/programa/fases/$id/editar` | `Manage Phases` | Administrador Web, Comandante | Real | `/programa/fases/$id` |
| Maniobras | `/programa/maniobras` | `Read` + staff | staff | Real | — |
| Registrar maniobra | `/programa/maniobras/nueva` | `Manage Maneuvers` | Administrador Web, Comandante | Real (dep. 34) | `/programa/maniobras` |
| Detalle de maniobra | `/programa/maniobras/$id` | `Read` + staff | staff | Contract (dep. 33) | `/programa/maniobras` |
| Modificar maniobra | `/programa/maniobras/$id/editar` | `Manage Maneuvers` | Administrador Web, Comandante | Contract; live needs deps. 32, 33 | `/programa/maniobras/$id` |
| Estándares de la maniobra | `/programa/maniobras/$id/estandares` | `Manage Standards` | Administrador Web, Jefe de Operaciones | Real | `/programa/maniobras/$id` |
| Materias | `/programa/materias` | `Read` + staff (writes: `Manage Subjects`) | staff | Contract (dep. 5) | — |

Sidebar: **Matrícula** = Personas, Grupos; **Programa** = Fases y subfases, Maniobras, Materias (groups already declared in `GrupoMenu`). `/usuarios` is dropped (M2-3).

Who sees what (`Role.java:8-37`, mirrored by `permisos.ts`; `Manage Subjects` from the contract):

| Permission | Administrador Web | Comandante de Escuadrón | Jefe de Operaciones | Instructor | Alumno |
|---|---|---|---|---|---|
| `Manage Users` · `Manage Roles` | ✓ | | | | |
| `Manage Groups` | ✓ | | ✓ | | |
| `Manage Phases` · `Manage Maneuvers` | ✓ | ✓ | | | |
| `Manage Standards` | ✓ | | ✓ | | |
| `Manage Subjects` (contract) | ✓ | ✓ | | | |
| Programa read-only (`Read` + staff) | ✓ | ✓ | ✓ | ✓ | |

`Manage Subphases` (Administrador Web, Comandante) gates nothing in M2.

**Fixed interface texts** (the CAs cite these IDs). Persona, grupo, usuario and materia saves toast the backend's `mensaje`. Fase, maniobra and estándar saves return 200/204 without one, so the frontend owns those toasts (T14–T20).

| ID | Where | Text |
|---|---|---|
| T1 | Modificar persona, under the read-only fields | El código, el DNI y los nombres no se pueden modificar; solo el rango y el tipo. |
| T2 | Modificar grupo, under Programa | El programa de un grupo no se puede cambiar después de registrarlo. |
| T3 | Modificar fase, on a saved subfase row | Una subfase guardada no se puede quitar porque puede tener maniobras, turnos o evaluaciones. |
| T4 | Detalle de fase, instead of Eliminar, when it has subfases | Solo se puede eliminar una fase sin subfases. |
| T5 | Detalle de maniobra, next to the disabled Eliminar | La maniobra tiene estándares asignados y no se puede eliminar. |
| T6 | Estándares, on a saved row | Un estándar guardado no se puede quitar; puede cambiar su nombre y su descripción. |
| T7 | Under the descripción of a saved fase, subfase, maniobra or estándar | Si deja la descripción vacía, se conserva la anterior. |
| T8 | Account section, rol null | Sin rol: esta cuenta no puede iniciar sesión. |
| T9 | Account section, no account | Sin cuenta |
| T10 | Account section, own account | Es su propia cuenta: no puede eliminarla ni cambiar su rol; para cambiar su contraseña use Cambiar contraseña. |
| T11 | Under an action waiting for a dependency (M2-14), or instead of its form | No disponible: el servidor aún no realiza esta acción de forma segura. |
| T12 | Detalle de maniobra, subfases missing from the response | Subfases no disponibles: el servidor aún no las informa. |
| T13 | Login page, session with `rol: null` | Su cuenta no tiene un rol asignado. Comuníquese con el administrador. |
| T14 · T15 · T16 | Toasts: registrar · modificar · eliminar fase | Fase registrada. · Fase modificada. · Fase eliminada. |
| T17 · T18 · T19 | Toasts: registrar · modificar · eliminar maniobra | Maniobra registrada. · Maniobra modificada. · Maniobra eliminada. |
| T20 | Toast: guardar estándares | Estándares guardados. |

### 14.4 Acceptance criteria

CA-FAS-07 ("Subfases sin fase") was dropped (review F1); no other ID changed. The mock fixtures these criteria need beyond the seed (a persona without account, an account with `rol: null`, a materia with preguntas) are fixed in contract §7.

#### CUS Gestionar Persona (M2, Administrador Web)

- **CA-PER-01** La lista muestra código, apellidos y nombres, rango y tipo ("—" si no tiene); se ordena por código o apellido paterno; la página y el orden persisten en la URL.
- **CA-PER-02** Registrar persona pide código (6 caracteres alfanuméricos), DNI (8 dígitos), nombre y apellido paterno obligatorios, apellido materno y rango opcionales, y tipo (Alumno, Instructor PDI, Instructor PDE o sin tipo); y para la cuenta: usuario (4 a 30 caracteres entre minúsculas, dígitos, punto y guion bajo), correo válido, contraseña de al menos 8 caracteres escrita dos veces e igual, y rol.
- **CA-PER-03** El rol se propone según el tipo (Alumno → Alumno; Instructor PDI o PDE → Instructor) y solo se ofrecen los roles compatibles con el tipo (M2-13); cambiar el tipo descarta un rol incompatible.
- **CA-PER-04** Un código ya registrado muestra el mensaje B1; un usuario en uso y los demás errores de validación del backend aparecen bajo su campo, incluidos los de la cuenta.
- **CA-PER-05** Al registrar se muestra el mensaje B2 y se abre el detalle de la persona; el formulario se limpia, y ni la respuesta ni el detalle muestran la contraseña.
- **CA-PER-06** El detalle muestra código, DNI, nombres, rango, tipo, estado y grupo, y la sección Cuenta con usuario, correo y rol; una cuenta con rol null muestra T8; una persona sin cuenta muestra T9 y no ofrece acciones de cuenta.
- **CA-PER-07** Modificar persona cambia solo rango y tipo; se ofrecen los tipos compatibles con el rol de la cuenta, o todos si no tiene cuenta o su rol es null; los demás datos no se editan y se muestra T1; al guardar se muestra el mensaje B2.
- **CA-PER-08** Asignar rol (Manage Roles) ofrece los roles del backend compatibles con el tipo; al guardar se muestra el mensaje B7 y el detalle refleja el nuevo rol.
- **CA-PER-09** Restablecer contraseña pide la nueva dos veces e iguales, de al menos 8 caracteres, conserva el usuario y muestra el mensaje B7.
- **CA-PER-10** Eliminar pide confirmación; si el backend lo impide (B4, B5 o B6) se muestra ese motivo y la persona sigue en la lista; si no, se muestra B3 y se vuelve a la lista.
- **CA-PER-11** Personas solo aparece en el menú y por URL con Manage Users; Asignar rol además exige Manage Roles.
- **CA-PER-12** En el detalle de la propia persona de la sesión no se ofrecen Eliminar, Asignar rol ni Restablecer contraseña, y la sección Cuenta muestra T10.
- **CA-PER-13** Las respuestas de Asignar rol, Restablecer contraseña y Cambiar contraseña se leen solo por su `mensaje`: la contraseña que el backend devuelve no llega al estado de la aplicación ni a la consola.

#### CUS Gestionar Grupo (M2, Administrador Web · Jefe de Operaciones)

- **CA-GRU-01** La lista muestra nombre, descripción y programa; se ordena por nombre o programa; la página y el orden persisten en la URL; solo la ven quienes tienen Manage Groups.
- **CA-GRU-02** Registrar pide nombre (3 a 35 caracteres), descripción opcional (máximo 255), programa (PDI o PDE) y, opcionalmente, alumnos; al guardar muestra el mensaje B8 y abre el detalle.
- **CA-GRU-03** Los alumnos ofrecidos son los que no tienen grupo; al modificar, también los del propio grupo, ya marcados; ningún alumno aparece dos veces.
- **CA-GRU-04** Al modificar, el programa es de solo lectura y se muestra T2.
- **CA-GRU-05** Desmarcar un alumno y guardar lo deja sin grupo, y vuelve a ofrecerse para otros grupos.
- **CA-GRU-06** El detalle muestra nombre, descripción, programa y alumnos con código, nombre completo y estado.
- **CA-GRU-07** Eliminar pide confirmación advirtiendo que sus alumnos quedarán sin grupo; al eliminar muestra el mensaje B9 y vuelve a la lista.
- **CA-GRU-08** Un grupo inexistente muestra la página no encontrada, también cuando el backend responde 200 sin cuerpo.

#### CUS Gestionar Fase (M2, Comandante de Escuadrón)

- **CA-FAS-01** La lista muestra nombre y descripción; se ordena por nombre; la página y el orden persisten en la URL; la ve todo el personal y solo con Manage Phases se ofrece registrar, modificar y eliminar.
- **CA-FAS-02** Registrar pide nombre (3 a 35 caracteres), descripción opcional (máximo 255) y al menos una subfase con los mismos límites; al guardar muestra T14 y abre el detalle.
- **CA-FAS-03** El detalle muestra la fase, sus subfases y las maniobras de cada subfase.
- **CA-FAS-04** Modificar edita la fase y sus subfases y agrega subfases nuevas; una subfase ya guardada no se puede quitar y muestra T3; una fila nueva sin guardar sí se quita; bajo cada descripción ya guardada se muestra T7; al guardar muestra T15.
- **CA-FAS-05** Eliminar solo se ofrece para una fase sin subfases (si tiene, se muestra T4) y pide confirmación; al eliminar muestra T16 y vuelve a la lista.
- **CA-FAS-06** Los errores de validación del backend (B10, B11) aparecen bajo su campo, también en cada fila de subfase.

#### CUS Gestionar Maniobra (M2, Comandante de Escuadrón)

- **CA-MAN-01** La lista muestra nombre y descripción; se ordena por nombre; la página y el orden persisten en la URL; la ve todo el personal y solo con Manage Maneuvers se ofrece registrar, modificar y eliminar.
- **CA-MAN-02** Registrar pide nombre (3 a 35 caracteres), descripción opcional (máximo 255) y al menos una subfase, elegidas de una lista agrupada por fase; al guardar muestra T17 y abre el detalle.
- **CA-MAN-03** El detalle muestra la maniobra, sus estándares y sus subfases con la fase a la que pertenecen (tomada del catálogo de fases); si la respuesta no trae subfases se muestra T12.
- **CA-MAN-04** Modificar precarga las subfases actuales, aplica las mismas validaciones que registrar y muestra T7 bajo la descripción; al guardar muestra T18.
- **CA-MAN-05** Eliminar pide confirmación; si la maniobra tiene estándares la acción está deshabilitada y se muestra T5; si el backend la rechaza (B12) se muestra su mensaje; al eliminar muestra T19 y vuelve a la lista.
- **CA-MAN-06** Los errores de validación del backend (B10, B11) aparecen bajo su campo; los de subfase, bajo el selector de subfases.

#### CUS Asignar Estándares (M2, Jefe de Operaciones)

- **CA-EST-01** Con Manage Standards, el detalle de la maniobra ofrece editar sus estándares; sin ese permiso (Comandante) los estándares solo se ven, y quien solo tiene Manage Standards (Jefe de Operaciones) no ve registrar, modificar ni eliminar maniobra.
- **CA-EST-02** Cada estándar tiene nombre (3 a 35 caracteres) y descripción opcional (máximo 255); se agregan filas nuevas y se exige al menos un estándar.
- **CA-EST-03** Un estándar guardado no se puede quitar y muestra T6, además de T7 bajo su descripción; una fila nueva sin guardar sí se quita.
- **CA-EST-04** Al guardar se muestra T20 y se vuelve al detalle con los estándares actualizados; el error de lista vacía (B11) aparece sobre la lista y los errores de cada estándar (B10), bajo el campo de su fila.

#### CUS Gestionar Materia (M2, Comandante de Escuadrón · contrato)

- **CA-MAT-01** La lista muestra nombre, nota mínima, coeficiente con 2 decimales y parte del curso; la ve todo el personal y solo con Manage Subjects se ofrece registrar, modificar y eliminar.
- **CA-MAT-02** Registrar y modificar piden nombre (3 a 60 caracteres), nota mínima entera de 0 a 20, coeficiente entre 0 y 1 con hasta 2 decimales y parte del curso, todos obligatorios.
- **CA-MAT-03** Un nombre repetido y los demás errores del backend aparecen bajo su campo; al guardar se muestra el mensaje del backend.
- **CA-MAT-04** Eliminar pide confirmación; si la materia tiene preguntas o turnos teóricos se muestra el motivo que da el backend.

#### Acciones con dependencia pendiente (M2-14)

- **CA-DEP-01** Sin su dependencia resuelta, Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33) y Eliminar fase (37) se muestran deshabilitadas con T11; abrir la ruta de Registrar persona o de Modificar maniobra por URL muestra T11 en lugar del formulario.
- **CA-DEP-02** En modo mock las cuatro acciones están disponibles; fuera de él, cada una se habilita cuando `VITE_DEPENDENCIAS_RESUELTAS` incluye todos sus números, y los valores que no son números se ignoran.

#### CUS Iniciar sesión (M2 additions)

- **CA-SES-06** Tras iniciar sesión o recargar, el encabezado y el saludo de Inicio muestran el nombre y el apellido paterno de la persona.
- **CA-SES-07** Para armar la sesión no se consulta ningún endpoint que devuelva la contraseña del usuario.
- **CA-SES-08** Si la persona de la sesión tiene la cuenta sin rol, al iniciar sesión o al recargar se borran los tokens y la página de inicio de sesión muestra T13.

### 14.5 Backend dependencies added

**Live blockers** (M2 must not run these actions against the live backend before the fix; M2-14 gates them): 22, 30, 32, 37 (and 33 for Modificar maniobra).

| # | Change | Needed by |
|---|---|---|
| 22 | **Security:** `POST /api/personas` stores the generated password in plaintext and no rol, so the account never logs in; take `usuario {username, correo, password, idRol}`, BCrypt it and save persona and usuario in one transaction | M2 live — blocks Registrar persona |
| 23 | Validate `POST /api/personas` (persona fields, tipo, unique username, correo, password ≥ 8, rol exists and matches tipo per M2-13, keyed by rol id); 400 field array | M2 |
| 24 | **Security:** stop serializing `Usuario.contraseña` (`GET /api/usuarios/{id}`, `/nombre/{nombre}`, `/persona/{cod}` and the 201 bodies of `PUT /api/usuarios/{id}[/rol]`); guard the GETs (own account or `Manage Users`). Widens 2 | M2 — security |
| 25 | **Security:** `GET /api/personas/{nom}` has no `@PreAuthorize`; allow only the caller's own username or `Manage Users`. The session uses it from M2 (M2-10); supersedes 11 | M2 — security |
| 26 | `DetalleUsuario`: add `usuario.id`, `estado`, `grupo {id, nombre}`; `usuario: null` instead of a 500 NPE for a persona without account (the frontend tolerates its absence with one extra GET) | M2 |
| 27 | `IndexPersona`: add `tipo` | M2 |
| 28 | Tipo–rol compatibility, keyed by rol id, on `PUT /api/personas/{cod}` and `PUT /api/usuarios/{id}/rol`; 404 for an unknown rol id (today a 500 FK error) | M2 |
| 29 | `PUT /api/usuarios/{id}`: validate `username`, `password` and, per dependency 3, `passwordActual` as field errors (a missing password is today "rawPassword cannot be null"; a missing username blanks the account) | M0 / M2 |
| 30 | `DELETE /api/personas/{cod}`: 500 NPE without usuario; 500 FK error when the usuario has a refresh token, after already detaching it from persona and rol (not transactional) | M2 live — blocks Eliminar persona |
| 31 | Grupos: validate nombre, descripción and programa (invalid programa saved as null); unknown `codigo` → 404 instead of a 500 NPE after the grupo is saved; one transaction | M2 |
| 32 | `PUT /api/maniobras/{id}`: links looked up by `idSubfase` alone (500 whenever a subfase has two or more maniobras, or another maniobra's link is taken); replace this maniobra's links; not-found message says "fase" | M2 live — blocks Modificar maniobra |
| 33 | `GET /api/maniobras/{id}`: add `subfases [{id, nombre}]` ordered by id | M2 live — Modificar maniobra preloads them |
| 34 | Unknown `idSubfase` stored silently: validate it (404) and fix the link-table FK that targets `maniobras_subfases` | M2 |
| 35 | `DELETE /api/maniobras/{id}`: two guards with their own messages (estándares; use in turnos or calificaciones, today a 500 FK error) | M2 |
| 36 | Allow removing an estándar (orphan removal on `Maniobra.estandares`); an omitted one reappears today | M2 nice-to-have |
| 37 | **Data loss:** fase delete deletes every subfase without maniobras system-wide, even for a nonexistent or empty fase; `PUT /api/fases/{id}` deletes omitted subfases unchecked, so a Modificar fase saved from a stale form deletes a subfase another user added meanwhile; turnos, evaluaciones and links have no FK to `subfases`. Scope the cleanup, guard both with 410, add the FKs | M2 live — blocks Eliminar fase |
| 38 | Minor: blank or null `descripcion` never clears (fase, subfase, maniobra, estándar); `StringToProgramaConverter` turns any programa into PDI; no unique constraint on `usuarios.nombre` (a duplicate breaks login for both); nested lists (`DetalleFase.subfases`, `DetalleSubfase.maniobrasSubfase`, `DetalleManiobra.estandares`) have no `@OrderBy("id")` | M2 |

Dependency 3 is amended (§10). Dependency 4 stays open but no longer blocks M2 (M2-5). Dependency 5 is the Materias backend (contract §6). Dependency 11 is superseded by M2-10 and 25; dependency 2 is widened by 24.

## 15. Addendum M3 — Aprendizaje

**Date:** 2026-09-20 · **Status:** decided autonomously, like M1 and M2; every decision below is a ruling the user can reverse. Contract for the AI backend: `docs/contrato-api-aprendizaje.md`.

### 15.1 Backend state

Read from `sigeda_chat_status` source (branch `feat/migracion-sigeda-back`, commit `15b4e86`); nothing was run and no file was touched. Paths are relative to that repo's root. The research note `.superpowers/notas/investigacion/m3-contrato-ia.md` was re-verified line by line against this commit: every fact it states still holds, and its gap numbering (1–12) is the one used here.

**Shape of the API.** No global prefix (`src/main.ts:6-19`), so every route sits at the process root (`http://localhost:3000/documents`). Global `ValidationPipe` with `whitelist`, `transform` and `forbidNonWhitelisted` (`main.ts:8-13`): an unexpected body property is a 400. CORS reflects any origin with credentials (`main.ts:16`); port 3000 (`main.ts:18`). No `ExceptionFilter` exists, so every error is Nest's default `{statusCode, message, error}`, and for DTO failures `message` is an array of **English** class-validator strings. Ids are UUID v4 and the DTOs reject anything else (`@IsUUID('4')`).

**What works.** Documents: upload (multipart field `file`, MIME allow-list PDF/DOCX/TXT in `src/documents/dto/document.dto.ts:13-17`, checked in `src/documents/documents.controller.ts:31-35`), list, detail and delete. All four answer through `toDocumentResponse` (`src/documents/documents.mapper.ts:9-31`), which converts `sizeBytes` (`BigInt`) to a number and drops `extractedText` and `storageKey`. Processing is queued on BullMQ (`documents.service.ts:43`) and the worker sets `ready` with tags and RAG chunks, or `error` with a message (`src/documents/document-processing.processor.ts:62-84`); tagging and indexing failures are non-blocking (`:46-60`) — indexing because the processor wraps it in its own `try`, tagging only because `src/documents/document-tagging.service.ts:31-36` swallows the error itself and returns `[]`, since the processor does not guard that call. Quiz generation validates its DTO, checks ownership and readiness, calls the LLM and persists in one transaction (`src/quiz/quiz.service.ts:16-99`). Chat retrieval works (pgvector cosine, `TOP_K = 6`, `SIMILARITY_THRESHOLD = 0.5`, `src/chat/retrieval.service.ts:13,16,38-68`) and `POST /chat/messages` returns the assistant message plus resolved `sources[]` (`src/chat/chat.service.ts:112-115,132-140`), numbered `[1]…[n]` exactly as the system prompt instructs the model to cite (`src/chat/chat-prompt.ts:13-21,28-36`).

**What is broken or missing.**

- **No quiz-attempt route exists** (gap 1). `QuizAttempt` and `QuizAttemptAnswer` are fully modelled (`prisma/schema.prisma:207-241`) but a repo-wide grep for `Attempt` outside the schema returns nothing in `src/`. `QuizController` has only `POST /quizzes/generate` and `GET /quizzes/:id` (`src/quiz/quiz.controller.ts:13-21`), and the detail returns `correctAnswer` and `explanation` for every question unconditionally (`quiz.service.ts:101-108`).
- **Chat session responses 500** (gap 2). `POST /chat/sessions` (`chat.service.ts:44`) and `GET /chat/sessions/:id` (`chat.service.ts:123`) `include: { documents: { include: { document: true } } }` instead of mapping through `toDocumentResponse`. `Document.sizeBytes` is `BigInt` (`prisma/schema.prisma:87`), which `JSON.stringify` cannot serialize — the exact failure the mapper's own docstring says was found and fixed for `/documents/*` (`documents.mapper.ts:3-8`). Every session has at least one document (`@ArrayMinSize(1)`, `src/chat/dto/chat.dto.ts:6`), so **both endpoints fail for every session**, and if they did not they would leak `extractedText` and `storageKey`.
- **No session list** (gap 3). `ChatController` has three routes and none of them lists sessions (`src/chat/chat.controller.ts:9-27`).
- **Citations do not survive a reload** (gap 4). A stored `ChatMessage` carries only `citedChunkIds: string[]` (`prisma/schema.prisma:279`); `formatSources` runs only inside `POST /chat/messages` (`chat.service.ts:132-140`) and no endpoint resolves a chunk id back to its document or content.
- **No upload size limit** (gap 5). `FileInterceptor('file')` is registered with no `limits` (`documents.controller.ts:26`) and Multer's default in-memory storage buffers the whole file; `MAX_UPLOAD_SIZE_MB=25` is documented in `.env.example:36` and never read in `src/`.
- **No ownership check** on `GET /documents/:id`, `DELETE /documents/:id` (`documents.service.ts:68,74`) or `GET /quizzes/:id` (`quiz.service.ts:102`) — an IDOR the moment real auth lands (gap 6). Chat does check (`chat.service.ts:57,126`).
- **Path parameters are not validated.** No `ParseUUIDPipe` anywhere (`documents.controller.ts:52,57`, `quiz.controller.ts:19`, `chat.controller.ts:19`): a malformed id reaches Prisma against a `@db.Uuid` column and comes back as an unhandled **500**, not a 400 and not a 404. The global `ValidationPipe` only covers DTO bodies.
- **No authentication at all** (gap 7). `DevAuthMiddleware` is applied to every route (`src/app.module.ts:23-25`) and sets `req.user = { id: '564984ee-448a-424f-b689-57a03b3ea108' }` unconditionally, ignoring the `Authorization` header (`src/common/dev-auth.middleware.ts:5-8`). There is no JWT library in `package.json`, no guard, and `User` has no `username` column (`prisma/schema.prisma:56-74`) — only `email` and `fullName`. `sigeda-back` signs HS256 with `sub` = username, plus `iat` and `exp`, and nothing else (`sigeda-back` `security/config/JwtUtils.java:31-38`), so mapping a token to a `User.id` needs a new column and pre-provisioned rows.
- **Quiz generation is synchronous** (gap 8): up to three LLM attempts (`src/quiz/quiz-generation.service.ts:6,33-56`) over up to 300 000 characters (`:12`) inside the HTTP request, with no queue and no documented timeout.
- **`DocumentStatus.uploading` is unreachable** (gap 9): the row is created already at `processing` (`documents.service.ts:37`), after the synchronous S3 upload. The reachable machine is `processing → ready | error`.
- **The prediction routes have no scoping** (gap 10): `instructorId` is an unvalidated query string and neither route reads `req.user` (`src/prediction/prediction.controller.ts:10-20`). M5, not M3.
- **No quiz history** (gap 11): there is no `GET /quizzes`, and `sourceDocumentId` is always `null` because per-question attribution is not implemented (`quiz.service.ts:87-90`).
- **Error text leaks internals** (gap 12): a failed document's `errorMessage` is the raw caught `.message` (`document-processing.processor.ts:77-82`), and a failed generation returns the raw parse/schema error inside its 400 (`quiz-generation.service.ts:58-60`).

**What the frontend therefore cannot rely on:** per-user isolation of documents, quizzes and sessions; any persisted quiz attempt or score; a list of past conversations; citations after a reload; a server-enforced upload limit; sanitised error text; an `uploading` state; per-question source attribution; and, today, `GET /chat/sessions/:id` returning at all.

**Messages the criteria show** (verbatim; the CAs cite these IDs):

| ID | Where | Text (verbatim) | Source |
|---|---|---|---|
| C1 | 400 upload | No se recibió ningún archivo. | `documents.controller.ts:29` |
| C2 | 400 upload | Tipo de archivo no soportado: `{mimeType}`. Solo se aceptan PDF, DOCX y TXT. | `documents.controller.ts:32-34` |
| C3 | 404 | Documento no encontrado. | `documents.service.ts:69,75` |
| C4 | `errorMessage` | No se pudo extraer contenido legible del documento (posiblemente escaneado sin OCR). | `document-processing.processor.ts:41-43` |
| C5 | 404 generate / create session | Uno o más documentos no existen o no te pertenecen. | `quiz.service.ts:22` · `chat.service.ts:26` |
| C6 | 400 generate / create session | Los siguientes documentos aún no están listos: `{archivos}` | `quiz.service.ts:27-29` · `chat.service.ts:31-33` |
| C7 | 400 generate | No se pudo generar el cuestionario tras 3 intentos: `{detalle técnico}` | `quiz-generation.service.ts:58-60` |
| C8 | 404 | Cuestionario no encontrado. | `quiz.service.ts:106` |
| C9 | 404 | Sesión de chat no encontrada. | `chat.service.ts:58,127` |
| C10 | 201, as the answer's content | No se pudo generar una respuesta. Intenta reformular tu pregunta. | `chat.service.ts:99` |
| C11 | 404 (M5) | Alumno no encontrado. | `prediction.service.ts:73` |
| C12 | 400 (M5) | El alumno no tiene evaluaciones registradas. | `prediction.service.ts:82` |

C7 is never shown as it arrives (M3-5); C4 is shown verbatim because it is the only document error the backend produces deliberately.

### 15.2 Decisions

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| M3-1 | **Authentication: the frontend changes nothing; the backend must.** `lib/api/ia.ts` already attaches `Authorization: Bearer <access token>` from `tokens.acceso()`, i.e. the same HS256 token `sigeda-back` issues, whose only claim is `sub` = username. Dependency 39 asks `sigeda_chat_status` to replace `DevAuthMiddleware` with a guard that verifies that token with the shared secret, resolves `sub` against a new `User.username @unique` and rejects with 401 `{statusCode:401,…}`; users must be provisioned there because the token carries no email or full name. Until 39 is listed in `VITE_DEPENDENCIAS_RESUELTAS`, and outside mock mode, **Subir documento and Eliminar documento are disabled with T11** (`dependencias.ts` gains `subirDocumento: [39]`, `eliminarDocumento: [39]`) and the Aprendizaje screens show A1. Generating a quiz and opening a conversation also write rows into the shared account and are **not** gated, because nothing lists them: there is no `GET /quizzes` and no `GET /chat/sessions` (dependencies 48 and 44), so a quiz or a session is reachable only by an id that never leaves its author's browser. | Every request today is the same hardcoded user, so one person's uploads are in everyone's list. Documents are the only rows that are both listed and destructible; writing material into a shared list is the part that cannot be undone. | Documentos is read-only against the live backend until 39 lands; the other two screens work. Mock mode is unaffected. |
| M3-2 | **The practice quiz is scored in the browser.** The frontend keeps the generated quiz in memory, collects the answers, and on Entregar compares each one with the `correctAnswer` the response already carries: multiple choice and true/false by exact value, fill-in-the-blank after normalising (trim, lowercase, strip accents, collapse inner spaces). `correctAnswer` and `explanation` are **not in the DOM** before Entregar. Nothing is persisted. The protection is presentational and nothing more: the key travels in the generate response, sits in the Query cache and is readable in the Network tab, so anyone with the developer tools can see it. That is acceptable because the practice quiz carries no academic weight — M4 owns the graded exam, whose questions `sigeda-back` serves without `correcto` (§11). The contract still specifies attempt endpoints (dependency 40) and an answer-free quiz view (dependency 41) so a later milestone can persist attempts; **M3 does not call them and the mocks do not implement them.** | No attempt endpoint exists, and `GET /quizzes/:id` returns the key unconditionally, so hiding it client-side buys nothing until 41 lands. The cuestionario de práctica carries no academic weight — the graded exam is M4 in `sigeda-back` — so a local score is the honest scope. | If attempts must be persisted for the thesis evidence, the screen gains two calls; the scoring rule moves to the server (contract §2.3). |
| M3-3 | **The quiz lives in the URL, the answers do not.** The generated quiz id goes to `/aprendizaje/cuestionario?cuestionario=<uuid>` (zod-validated search param, like every other screen). A reload re-fetches it with `GET /quizzes/:id` and restarts it with A2. Answers are never written to `localStorage` or `sessionStorage`. | The URL is the project's existing state channel; persisting answers locally would fake a durable attempt that the backend does not have. | The user retypes a quiz they reloaded mid-way. |
| M3-4 | **Generation blocks with an explained wait and a 120 s client deadline.** The Generar button enters a busy state with A3, the form is disabled, the mutation does not retry (`query.ts` already sets `mutations: { retry: false }`), and an `AbortController` cancels at 120 s, showing A4 with Reintentar. Dependency 42 asks for a queued variant (`202 { quizId }` + poll) like documents. | Generation is synchronous, up to three LLM attempts over up to 300 000 characters, with no server timeout. Without a deadline the tab hangs on a dead request. | A slow but successful generation is cancelled; the user retries with fewer questions. |
| M3-5 | **Only the contract's messages are shown; everything else is replaced.** The allow-list is applied to `ApiError.message` **after** `normalizarError` (`src/lib/api/errors.ts`), not to the raw body: exact equality for C1, C3, C4, C5, C8, C9 and C10, fixed-prefix match for the parameterised ones (C2 `Tipo de archivo no soportado:`, C6 `Los siguientes documentos aún no están listos:` and, once dependency 43 lands, the 413 of contract §5). Anything else — C7's technical detail, an `errorMessage` that is not C4, a class-validator array, or the English `"Internal Server Error"` that `errors.ts:71` surfaces from a Nest 500 body carrying `error` — becomes A5 (generation), A12 (document) or the existing `MENSAJE_GENERICO`, and the raw text is not rendered. It is still written to the console by `errors.ts:64,68-70,87`, which this milestone does not change. `extractedText`, `storageKey` and `ownerId` never reach the screen, and the frontend never requests them. | Gap 12: `errorMessage` and the 400 of `/quizzes/generate` carry `pdf-parse`, `mammoth` and Zod text. Normalising first means one list covers every shape the client can receive. | A genuinely useful backend message is hidden until it is added to the allow-list (and to the contract). |
| M3-6 | **Multipart upload with the checks the server lacks.** `lib/api/http.ts` gains `subirArchivo(ruta, archivo)`: `FormData` with the field `file`, no `Content-Type` header (the browser sets the boundary), same Authorization and 401-refresh path. Before sending, the frontend rejects anything whose extension is not `.pdf`, `.docx` or `.txt` or whose size exceeds 25 MB, with A11 (A17 si el archivo está vacío), and does not issue the request. Dependency 43 asks for the server-side limit (413) and for falling back to the extension when the browser reports no or a generic MIME type. | Multer buffers the whole file in memory before any check runs; a 500 MB drop would be uploaded in full and then rejected. 25 MB mirrors the `MAX_UPLOAD_SIZE_MB` the repo already documents. | A valid file with an unusual extension is refused client-side; the limit is one constant. |
| M3-7 | **Polling: 3 s while anything is processing, terminal states stop it, 40 polls gives up.** The documents list query sets `refetchInterval` to 3 000 ms while any row is `processing` and to `false` otherwise; after **40 consecutive polls that still show a `processing` row** it stops and shows A6 with a manual Actualizar. The count, not the elapsed time, is the rule: it is what a fake-timer test can assert, and at 3 s it is about two minutes. Only three states are rendered — Procesando, Listo, Error — and an `uploading` row, unreachable today, is rendered as Procesando. | There is no webhook, SSE or websocket; `uploading` is dead (gap 9). A ceiling keeps a stuck worker from polling forever. | A document that takes longer than two minutes needs one click. |
| M3-8 | **The conversation is created with the first message and identified by the URL.** The screen starts as a document picker; sending the first question calls `POST /chat/sessions` and then `POST /chat/messages`, and puts the id in `/aprendizaje/consultas?sesion=<uuid>`. There is **no list of past conversations** and none is cached locally; Nueva consulta clears the param. Dependency 44 adds `GET /chat/sessions` for a later milestone. | Gap 3: nothing lists sessions, and a locally cached list would drift from a server the frontend cannot query. | Conversations are reachable only by their URL until 44 lands. |
| M3-9 | **Restoring a conversation tolerates today's 500.** `GET /chat/sessions/:id` answering 500 (or any unparsable body) shows A7 inside the screen with Nueva consulta, instead of the generic error page; a 404 shows C9. That query sets **`retry: false`**, overriding the default in `query.ts:13`, which would otherwise retry a 500 twice with backoff and keep the screen spinning for seconds before A7 appears. The contract fixes the response (dependency 45: documents mapped through `toDocumentResponse`), and the mocks implement the fixed shape — the current one is impossible to tolerate, since it never serializes, but one mock session reproduces the 500 so the path stays tested. | Gap 2 breaks the endpoint for every session that has documents, which is all of them. | A one-branch special case; it stays useful after 45 lands, for any other server failure. |
| M3-10 | **Citations are chips when the server resolves them and plain text when it does not.** In a live answer, each `[n]` with `1 ≤ n ≤ sources.length` becomes a chip opening the source (filename, excerpt, similarity as a percentage); out-of-range markers stay as text, because nothing server-side checks that the model's markers match `sources` (`chat.service.ts:108` stores ids, `chat-prompt.ts:13-21` only asks). After a reload, messages arriving without `sources` render their markers as inert text and the conversation shows A8. Dependency 46 adds resolved `sources[]` per message to `GET /chat/sessions/:id`; there **`similarity` is `null`**, because it depended on the question and is not stored, so a restored chip shows filename and excerpt and **omits the percentage line entirely** — it never shows 0 %, "—" or a guess. A source whose chunk no longer exists keeps its number with an inert chip. The frontend prefers `sources` whenever the key is present, even empty. | Gap 4. The UI must not claim a source it cannot show, nor link a marker that may point nowhere. | Past answers lose their sources until 46 lands. |
| M3-11 | **A failed answer is the backend's own text; a failed request keeps the question.** C10 arrives as a normal 201 with no sources and is rendered as an ordinary assistant message. A **retrieval failure** leaves nothing persisted, because the search runs before the user message is written (`chat.service.ts:64` then `:67`), and it is the only step that can fail the request today — the LLM error is swallowed (`:98-99`) and the assistant message is written last (`:103`). So on any failure the question stays in the input with Reintentar and the conversation shows no half-written turn; if a failure ever happened after `:67`, the retry would duplicate the stored question, which only the server can prevent. | Nothing else in the request throws. | A retry duplicates the question the day a step between `:67` and `:103` starts failing. |
| M3-12 | **The three screens use `Read` and no role restriction.** `Read` is held by all five roles in `permisos.ts:29-78` (Administrador Web, Comandante de Escuadrón, Instructor, Jefe de Operaciones and Alumno), it is the permission the other read-only screens already use, and leaving `roles` unset is what makes the group visible to everyone. `Update` would also work but means "change my own account" elsewhere in the app. | Spec §6 requires all roles to reach Aprendizaje, and the route registry holds one permission per route. | None; if a role must be excluded later, `roles` is one line. |
| M3-13 | **Sidebar group Aprendizaje, Documentos as the breadcrumb parent.** The `GrupoMenu` value and its place last in `ORDEN_GRUPOS` already exist (`pantallas.ts:33,43`). All three screens are `enMenu: true`; Cuestionario and Consultas declare `padre: '/aprendizaje'`, so their breadcrumb reads "Documentos › …". | Documents are the prerequisite of both tools: every quiz and every conversation starts from a document. | Wording of one breadcrumb. |
| M3-14 | **Only `ready` documents can be chosen**, in both tools; the picker hides the rest and explains it, and with none available shows an empty state linking to Documentos. The backend's C6 is still shown verbatim if the state changes between the two requests. | Both endpoints reject non-ready documents with C6 (`quiz.service.ts:25-30`, `chat.service.ts:29-33`). | None. |
| M3-15 | **No "Mis cuestionarios" and no per-question source in M3.** There is no `GET /quizzes` (gap 11) and `sourceDocumentId` is always `null` (`quiz.service.ts:87-90`), so the results view shows `sourceExcerpt` when the model supplied one and never names a document. Dependency 48. | Nothing to call, and naming a document from a heuristic would be a guess. | A history screen arrives with 48. |
| M3-16 | **IA mocks live in `src/mocks/ia/` under the same `VITE_MOCK_API` flag**, registered in `src/mocks/handlers.ts` beside the `sigeda/` ones; they implement `docs/contrato-api-aprendizaje.md` exactly. Ownership (dependency 47) and the unscoped prediction routes (dependency 49) stay backend dependencies: the frontend only ever opens ids that came from its own lists and never relies on the server hiding someone else's. | One flag already means "serve the backends from MSW"; splitting it would double the configuration. The two security gaps cannot be closed from the client. | None. |
| M3-17 | **The timing machinery is its own task, before any timing criterion.** M3 is the first milestone with intervals and deadlines (CA-DOC-04, CA-DOC-06, CA-CUE-03, CA-CUE-06), and the repo has no fake-timer setup: `useFakeTimers` and `advanceTimers` appear nowhere in `src/`, and MSW's `delay` is used once (`src/features/turnos/turno-page.test.tsx:177`). One task lands the convention — `vi.useFakeTimers()` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, `delay('infinite')` for a request that never answers — before the screens that need it. The IA mocks' stateful behaviour (the poll counter of contract §7) is **per document, counted from its own creation**, and `src/mocks/reiniciar.ts` gains `reiniciarIaMock()` called from `reiniciarMocks()`, which `src/test/setup.ts:47` already runs in every `afterEach`. | Without it each timing criterion invents its own approach and the suite gets slow and flaky; without a reset hook the poll counter leaks between tests. | One extra task in the plan. |

### 15.3 Screens

Every role reaches all three (M3-12). Sidebar group **Aprendizaje**; the group is already declared in `pantallas.ts`.

| Screen | Route | Permission | Roles | Data | Sidebar group | Breadcrumb parent |
|---|---|---|---|---|---|---|
| Documentos | `/aprendizaje` | `Read` | all | Real + Contract (deps. 43, 47) | Aprendizaje | — |
| Cuestionario de práctica | `/aprendizaje/cuestionario` | `Read` | all | Real | Aprendizaje | `/aprendizaje` |
| Consultas | `/aprendizaje/consultas` | `Read` | all | Real + Contract (deps. 45, 46) | Aprendizaje | `/aprendizaje` |

Search params: `/aprendizaje/cuestionario?cuestionario=<uuid>` (M3-3) and `/aprendizaje/consultas?sesion=<uuid>` (M3-8), both optional and zod-validated. Documentos has no search param: the list is short and unpaginated by design (§15.1).

**Pages, dialogs and in-place surfaces**, as in §14.3: the three routes are pages. Inside them, **Subir documento** is a dialog with a file field (one small form, §8), and **Eliminar documento** uses the shared confirm dialog with A13. Everything else is in place: the quiz generation form and its results are two states of the Cuestionario page (no dialog, so a reload lands on a real URL), the source of a citation opens as a popover anchored to its chip, and the document picker of Consultas is a panel beside the conversation, not a modal.

Who sees what — `Read` in `permisos.ts`:

| Permission | Administrador Web | Comandante de Escuadrón | Jefe de Operaciones | Instructor | Alumno |
|---|---|---|---|---|---|
| `Read` (the three Aprendizaje screens) | ✓ | ✓ | ✓ | ✓ | ✓ |

**Fixed interface texts** (the CAs cite these IDs):

| ID | Where | Text |
|---|---|---|
| A1 | Header of the three screens, live mode with dependency 39 pending | Los documentos son compartidos: el servidor de Aprendizaje todavía no identifica a cada usuario. |
| A2 | Cuestionario, after a reload | El cuestionario se reinició: las respuestas no se guardan al recargar la página. |
| A3 | Cuestionario, while generating | Generando el cuestionario. Puede tardar hasta dos minutos; no cierre esta página. |
| A4 | Cuestionario, after 120 s | La generación tardó demasiado. Intente de nuevo con menos preguntas o menos documentos. |
| A5 | Cuestionario, generation rejected | No se pudo generar el cuestionario con los documentos elegidos. Intente de nuevo o elija otro documento. |
| A6 | Documentos, after two minutes processing | El documento sigue procesándose. Actualice para ver su estado. |
| A7 | Consultas, session could not be read | No se pudo recuperar la conversación. Inicie una nueva consulta. |
| A8 | Consultas, restored conversation | Las fuentes de las respuestas anteriores no están disponibles después de recargar. |
| A9 | Consultas, answer with no sources | No se encontraron fragmentos relevantes en los documentos seleccionados para esta pregunta. |
| A10 | Cuestionario, results header | El cuestionario de práctica no se registra: su nota es solo para estudiar. |
| A11 | Documentos, file rejected in the browser | Solo se aceptan archivos PDF, DOCX o TXT de hasta 25 MB. |
| A12 | Documentos, document in error with an unrecognised message | No se pudo procesar el documento. Elimínelo y vuelva a subirlo. |
| A13 | Documentos, confirmation before deleting | Se eliminará el documento. Los cuestionarios ya generados se conservan, pero las consultas que lo usan se quedarán sin esa fuente. |
| A14 | Documentos, empty state | Todavía no hay documentos. Suba un archivo PDF, DOCX o TXT para generar cuestionarios y hacer consultas. |
| A15 | Cuestionario, no document is ready | No hay documentos listos para generar un cuestionario. Suba uno en Documentos y espere a que termine de procesarse. |
| A16 | Consultas, no document is ready | No hay documentos listos para consultar. Suba uno en Documentos y espere a que termine de procesarse. |
| A17 | Documentos, empty file rejected in the browser | El archivo está vacío. |

### 15.4 Acceptance criteria

Every criterion is testable against the MSW mocks of `docs/contrato-api-aprendizaje.md` (§7 of that document fixes the fixtures, including the ones the failure paths need: a document that never finishes, a generation that never answers, a conversation that fails to load, and a second conversation whose messages carry no sources). The three criteria that need an **absence** — no documents at all (CA-DOC-01) and no `ready` document (CA-CUE-02, CA-CON-01) — are exercised with per-test `server.use(...)` overrides, the pattern M2 already uses, because the default fixtures must keep the happy paths. The criteria with an interval or a deadline (CA-DOC-04, CA-DOC-06, CA-CUE-03, CA-CUE-06) depend on the timing machinery of M3-17.

#### CUS Gestionar documentos de estudio (M3, todos los roles)

- **CA-DOC-01** La lista muestra nombre, tipo (PDF, DOCX o TXT según el `mimeType`), tamaño, estado (Procesando, Listo o Error), etiquetas y fecha de subida, de la más reciente a la más antigua; sin documentos muestra A14 con la acción Subir documento.
- **CA-DOC-02** Subir acepta un archivo PDF, DOCX o TXT de hasta 25 MB; cualquier otro se rechaza en el navegador con A11 —o con A17 si el archivo está vacío— y no se envía al servidor.
- **CA-DOC-03** Si el servidor rechaza el archivo, se muestra su mensaje (C1 o C2) y el formulario conserva la selección para reintentar.
- **CA-DOC-04** Tras subir, el documento aparece como Procesando y la lista se actualiza sola cada 3 segundos hasta que queda Listo o Error, sin recargar la página.
- **CA-DOC-05** Un documento en Error muestra el motivo del servidor solo si es C4; cualquier otro motivo se muestra como A12, y en ningún caso se muestra texto de librerías.
- **CA-DOC-06** Si un documento sigue Procesando después de 40 consultas seguidas (unos dos minutos a 3 segundos), la actualización automática se detiene y se muestra A6 con la acción Actualizar, que vuelve a consultar una vez.
- **CA-DOC-07** Eliminar pide confirmación con A13; al eliminar, el documento desaparece de la lista.
- **CA-DOC-08** La pantalla nunca muestra el texto extraído del documento ni su ruta de almacenamiento.
- **CA-DOC-09** Una caída de red al subir muestra "No se pudo conectar con el servidor." y conserva el archivo elegido.
- **CA-DOC-10** Fuera del modo mock y sin la dependencia 39 resuelta, Subir y Eliminar están deshabilitados con T11 y las tres pantallas muestran A1; en modo mock ambas acciones están disponibles y A1 no aparece.
- **CA-DOC-11** Aprendizaje aparece en el menú, en su propio grupo, para los cinco roles, y las tres rutas se abren con cualquiera de ellos.

#### CUS Resolver cuestionario de práctica (M3, todos los roles)

- **CA-CUE-01** El formulario pide al menos un documento, al menos un tipo de pregunta (opción múltiple, verdadero o falso, completar) y una cantidad entera de 2 a 20; incumplir cualquiera de las tres reglas impide enviar y se explica bajo el campo.
- **CA-CUE-02** Solo se ofrecen documentos en estado Listo; si no hay ninguno, se muestra A15 con un enlace a Documentos.
- **CA-CUE-03** Al generar, el formulario se deshabilita, se muestra A3 y no se puede enviar dos veces.
- **CA-CUE-04** Si el servidor responde C5 o C6, se muestra ese mensaje con los nombres de archivo y el formulario queda listo para reintentar.
- **CA-CUE-05** Si la generación falla (C7), se muestra A5 sin ningún detalle técnico.
- **CA-CUE-06** Si pasan 120 segundos sin respuesta, la petición se cancela y se muestra A4 con la acción Reintentar.
- **CA-CUE-07** Cada pregunta muestra su enunciado y, según su tipo, cuatro opciones, verdadero/falso o un campo de texto; antes de entregar, la respuesta correcta y la explicación no están en el DOM.
- **CA-CUE-08** No se puede entregar con preguntas sin responder, y entregar pide confirmación.
- **CA-CUE-09** Al entregar se muestran los aciertos sobre el total y el porcentaje, y por cada pregunta la respuesta dada, la correcta y su explicación, junto con A10.
- **CA-CUE-10** En las preguntas de completar, la respuesta se compara sin distinguir mayúsculas, tildes ni espacios sobrantes.
- **CA-CUE-11** Recargar la página vuelve a abrir el mismo cuestionario desde la URL, con las preguntas en el mismo orden y sin respuestas, y muestra A2.
- **CA-CUE-12** Un identificador de cuestionario inexistente muestra C8 con la acción de volver al formulario.

#### CUS Consultar los documentos con IA (M3, todos los roles)

- **CA-CON-01** Antes de la primera pregunta la pantalla pide elegir uno o más documentos en estado Listo; sin documentos listos muestra A16 con un enlace a Documentos.
- **CA-CON-02** Al enviar la primera pregunta se crea la conversación y su identificador queda en la URL; los documentos elegidos se muestran junto a la conversación.
- **CA-CON-03** Si el servidor responde C5 o C6 al crear la conversación, se muestra ese mensaje y la selección de documentos se conserva.
- **CA-CON-04** Mientras se espera la respuesta, la pregunta ya aparece en la conversación y el cuadro de texto queda deshabilitado con un indicador de espera.
- **CA-CON-05** La respuesta muestra cada cita `[n]` como un enlace que abre su fuente con el nombre del documento, el fragmento y, cuando el servidor informa la similitud, su porcentaje; si la similitud es `null` no se muestra ninguna cifra en su lugar. Un `[n]` que no corresponde a ninguna fuente se muestra como texto.
- **CA-CON-06** Una respuesta sin fuentes se muestra igual y añade A9.
- **CA-CON-07** Si el modelo falla, el servidor responde C10 y se muestra como una respuesta normal, sin fuentes.
- **CA-CON-08** Si la petición falla por red o por error del servidor, la pregunta vuelve al cuadro de texto con la acción Reintentar y la conversación no queda con un turno a medias.
- **CA-CON-09** Al recargar, la conversación se recupera por su identificador con sus mensajes y sus documentos. Si el servidor devuelve las fuentes de cada mensaje, las citas anteriores se abren igual que las nuevas y sin porcentaje, y A8 no aparece; si los mensajes llegan sin fuentes, sus `[n]` se muestran como texto y la conversación muestra A8. Los mocks traen una conversación de cada tipo (contrato §7).
- **CA-CON-10** Si el servidor responde con un error al recuperar la conversación, se muestra A7 con la acción Nueva consulta dentro de la pantalla, no la página de error.
- **CA-CON-11** Una conversación inexistente o de otro usuario muestra C9.
- **CA-CON-12** Nueva consulta limpia el identificador de la URL y vuelve a la elección de documentos.
- **CA-CON-13** La conversación nunca muestra el texto extraído de los documentos ni su ruta de almacenamiento.

### 15.5 Backend dependencies added

All of them are for `sigeda_chat_status`. **Live blockers**: 39 (uploads and deletes are gated on it, M3-1) and 45 (Consultas cannot be restored without it).

| # | Change | Needed by |
|---|---|---|
| 39 | **Security:** replace `DevAuthMiddleware` with a guard that verifies `sigeda-back`'s HS256 token with the shared secret, adds `User.username @unique` and resolves `sub` against it; provision the users, since the token carries only `sub`, `iat` and `exp`. Refines dependency 9 | M3 live — blocks Subir and Eliminar documento |
| 40 | Quiz attempts: `POST /quizzes/{id}/attempts`, `PUT /attempts/{id}/answers`, `POST /attempts/{id}/submit`, `GET /attempts/{id}`; the tables already exist and no route touches them | M3 contract (consumed later) |
| 41 | `GET /quizzes/{id}?includeAnswers=false` without `correctAnswer` or `explanation`, for when attempts are graded server-side | M3 contract |
| 42 | Queue quiz generation like documents (`202 {quizId}` + poll), or document a time budget; today it is a synchronous call of up to three LLM attempts over 300 000 characters | M3 nice-to-have |
| 43 | Enforce `MAX_UPLOAD_SIZE_MB` in `FileInterceptor` (`limits.fileSize`) with a 413, replacing Nest's English `PayloadTooLargeException` message ("File too large") with the Spanish one of the contract; fall back to the extension when the browser sends no or a generic MIME type | M3 |
| 44 | `GET /chat/sessions` — list the caller's conversations | M3 nice-to-have |
| 45 | **Bug and leak:** `POST /chat/sessions` and `GET /chat/sessions/:id` must map documents through `toDocumentResponse`; today the raw `Document` makes `JSON.stringify` fail on `sizeBytes` (`BigInt`) — an unhandled 500 for every session — and would leak `extractedText` and `storageKey` | M3 live — blocks Consultas |
| 46 | `GET /chat/sessions/:id` resolves `citedChunkIds` into `sources[]` per message (`referenceNumber`, `documentId`, `documentFilename`, `excerpt`, `similarity: null`), so citations survive a reload | M3 |
| 47 | **Security:** ownership filter on `GET /documents/:id`, `DELETE /documents/:id` and `GET /quizzes/:id`; today any id is readable by any caller, which becomes an IDOR as soon as 39 lands. Same change: `ParseUUIDPipe` on every path parameter (`documents.controller.ts:52,57`, `quiz.controller.ts:19`, `chat.controller.ts:19`), where a malformed id is an unhandled 500 today instead of a 400 | M3 — security |
| 48 | `GET /quizzes` (history) and per-question `sourceDocumentId`; pagination for `GET /documents` and `GET /quizzes` | M3 nice-to-have |
| 49 | **Security:** scope `/prediction/students` and `/prediction/students/:id` to the caller, validate `instructorId` as a UUID and paginate the list; today any caller can enumerate every student's risk data | M5 — security |
| 50 | Sanitise error text: `Document.errorMessage` stores the raw library message, and `POST /quizzes/generate` returns the raw Zod/JSON parse error inside its 400; both must be fixed Spanish messages, with the detail only in the server log. Spanish messages for the DTO validation failures too | M3 |

Dependency 9 (§10) is refined by 39 for the M3 half; its M5 half (prediction over real evaluaciones) stays open.

**Plan scope.** M3's plan may run to **14 tasks**: the three screens and their API layer, the timing machinery of M3-17, and a first task carrying the M2 cleanups parked at review (`renderApp` using `crearQueryClient()`, `rutaDeCampo` with `Object.hasOwn`, the duplicated `NombreDescripcionDto` schema pair and mock helpers extracted, and `crearGrupo`'s `id: 0` sentinel). CA-DOC-06 and A8 stay in scope: the fixtures of contract §7 make both testable.


## 16. Addendum M4 — Teoría y banco

**Date:** 2026-09-25 · **Status:** decided autonomously, like M1–M3, then **revised after review** (`.superpowers/notas/m4/revision-addendum.md`, findings A1–E5 plus five scope cuts; every finding was accepted). Every decision below is a ruling the user can reverse. Contract for Victor: `docs/contrato-api-teoria.md`, **rewritten as version 2**. The version-1 proposal of 2026-09-19 is folded into it, endpoint by endpoint, and does not survive as a separate document. §16.6 lists what the scope cuts pushed to M5.

### 16.1 Backend state

Re-read from `sigeda-back` source (branch `main`, commit `ec2b0dd` — the commit M1 and M2 were read from); nothing was built or run and the database was not reachable, so **no statement here is verified live**. The research note is `.superpowers/notas/investigacion/m4-contrato-backend.md`; its gap numbering (1–13) is reused below. Java paths are relative to `src/main/java/com/sigeda/backend/`, `.sql` and `.properties` to `src/main/resources/`.

**None of this exists.** A case-insensitive grep over `src/main` for `materia|pregunta|cuestionario|alternativa|examen|teoric|teóric|subsana` returns **zero** matches in `.java`, `.sql`, `.properties` and `.xml`. `schema_prod.sql` declares 18 tables (`:117-296`) — `calificaciones`, `maniobras_subfase`, `chequeos_finales`, `desaprobados`, `estandares`, `evaluaciones_practicas`, `fases`, `grupos`, `alumnos_turno`, `maniobras`, `maniobras_turno`, `personas`, `refresh_tokens`, `roles`, `subfases`, `aeronaves`, `turnos`, `usuarios` — and not one is theoretical.

| §11 surface | In `sigeda-back` today |
|---|---|
| `/api/materias` CRUD | Nothing. Specified contract-first in M2 and implemented **only** in MSW (`src/mocks/sigeda/materias.ts:61-118`) |
| `/api/preguntas`, `/api/preguntas/lote` | Nothing |
| `/api/turnos-teoricos` | Nothing |
| `/api/examenes/pendientes`, `/api/cuestionarios/**` | Nothing |
| `GET /api/personas/{cod}/estado-teorico` | Nothing (dependency 7 is untouched, not partially done) |
| `Manage Subjects`, `Manage Questions`, `Manage Exams`, `Take Exams` | Nothing (`security/entities/Permiso.java:5-23`, 24 lines total; `Permission.java:3-31`) |

So all of M4 is **Contract** data, as spec §6 says, and dependency 6 is bigger than "write some controllers":

- **The four permissions do not exist**, so every theory endpoint would be reachable by any authenticated user until they are added. The matrix is code-only: `Role.java:9-37` holds the `EnumSet` per role (Instructor has `READ, WRITE, UPDATE, CREATE_REPORTS, VIEW_DISAPPROVED, VIEW_MY_GROUP` at `:25-29`; Alumno has `READ, UPDATE` at `:35-37`), `Rol.asignarPermisos()` (`security/entities/Rol.java:70-85`) matches `Rol.nombre` by string against it, and the `roles.permisos` column (`schema_prod.sql:250`) is never written by the seed (`data_prod.sql:71-76`). Adding a permission is a code change plus a redeploy, never a data change (gap 2).
- **No controller can tell who is calling.** `@AuthenticationPrincipal` appears nowhere; `SecurityContextHolder` only inside `security/config/JwtAuthorizationFilter.java:51,60,71,75`. The JWT's only claims are `sub` = username, `iat` and `exp` (`security/config/JwtUtils.java:31-38`). Every "who is asking" value is a path or body parameter today — `codInstructor` became **required in the turno body** at this very commit. The v1 contract's "`codInstructor` se toma del usuario autenticado" and "alumno: solo el propio" are a new capability, not a tweak (gap 3, dependency 51).
- **`409 Conflict` does not exist anywhere.** `grep -rn CONFLICT src/main/java` returns nothing. The "invalid in this state" status in use is **410 Gone** via `ActionExpiredException` → `GlobalExceptionHandler.java:131-140` (`error: "Fecha de modificación expiró"`), thrown in exactly three places: `maniobra/services/ManiobraService.java:129` (`"La maniobra no se pudo eliminar, está presente en un turno."` — the shipped analogue of this contract's D3, and the best argument for dependency 60), `turno/services/TurnoService.java:138` and `turno/controllers/TurnoController.java:208` (both `"No se puede modificar. El turno ya ha sido evaluado."`). The frontend needs no change either way: `src/lib/api/errors.ts:91` renders a plain-text body verbatim below 500 and `:89` does the same for a 403 (gap 5).
- **The 400 body has two shapes and the frontend already reads both.** `utils/Response.java:90-93` produces the bare JSON array of `'campo': mensaje`, which `errors.ts:90` turns into field errors; a `@Valid` DTO with no `BindingResult` produces `ErrorResponse{status,error:"Error al validar el modelo",message:null,messages[]}` (`GlobalExceptionHandler.java:80-92`), whose `messages[]` carry **the same strings** and which `errors.ts:101` maps through the same parser. So the choice of envelope is cosmetic for the client; the real defect is that `utils/ConstraintErrors.java:38-44` **never sorts**, so a field can carry several messages in any order (gap 6).
- **Pagination is `Page_Sort`** (single `property`, `page=0`, `size=6`, `direction=ASC`, no size cap, `utils/Page_Sort.java:10-12,29-41`). `src/mocks/sigeda/comun.ts:71-113` already replicates it, error bodies included.
- **Dates are `LocalDate` only** — `DateTimeFormatter.ofPattern("uuuu-MM-dd")` (`utils/CustomDateDeserializer.java:15`), which is the same wire format as `yyyy-MM-dd` and differs only in how it handles eras. Hours are plain `varchar` columns (`schema_prod.sql:200-201,274-275`) serialised as `"HH:mm"`. `LocalDateTime`/`OffsetDateTime` occur in three non-domain files only, and there is no Jackson time configuration (`application.properties:31-35`). What Spring would emit for the v1 contract's `"2026-10-02T09:00:00-05:00"` is **undetermined** (gap 7).
- **Grades are text on the practical side** — `evaluaciones_practicas.promedio varchar(255)` (`schema_prod.sql:176`) written as `String.format("%.1f", total)` (`evaluacion/utils/CalculoNota.java:85`). The theory contract asks for JSON numbers; the frontend keeps `aNota` (`src/features/evaluaciones/api.ts:111-115`), which coerces either.
- **Unknown enum values deserialize to `null` silently** (`application.properties:35`), so **ausente e inválido** cannot be distinguished and each enum gets one combined message, as materias did. `TipoExamen` has 11 values and two of them carry a conditional `idTurnoOrigen` rule.
- **It is not just Java.** `spring.jpa.hibernate.ddl-auto=none` (`application.properties:19`); tables and sequences are hand-written SQL run only in dev (`application-dev.properties:49-55`), never in prod (`application-prod.properties:35`). Dependency 6 means seven new tables, their sequences (the block is `schema_prod.sql:100-115`), their FKs, seed rows and a prod migration path that does not exist (dependency 53).
- **There is no grupo catalogue an Instructor can call.** `GET /api/grupos` and `/api/grupos/{id}` need `Manage Groups` (`grupo/controllers/GrupoController.java:56-57,87-89`) and return `IndexGrupo` = `{id, nombre, descripcion, programa}` with **no `programa` filter**; `/api/grupos/programa/{nombre}` needs `View All Groups` and its projection (`projections/CatalogoByPrograma.java:5-14`) carries `idGrupo` and `estado` **per alumno** but no grupo `nombre` and no grupo row of its own; `/api/grupos/instructor/{cod}/programa/{nombre}` needs `View My Group` and returns `alumnos_turno` rows, one per (alumno, turno), with a declared-`List` / actual-single-`Persona` mismatch (`projections/CatalogoByAlumnoTurno.java:7-10` vs `turno/entities/Alumno_Turno.java:25-26`). The frontend's `listarAlumnos` (`src/features/catalogos/api.ts:86-118`) returns **alumnos**, and `aOpcion` (`:73-75`) folds `idGrupo` into a display label and keeps nothing else, so **it cannot be reused as a grupo source**. M4 therefore specifies its own catalogue endpoint (contract §3.0, dependency 52) (gap 4).
- **There is no scheduler.** `grep -rn "@Scheduled\|EnableScheduling\|TaskScheduler" src/main/java` returns nothing, so "the window closing submits automatically" (§11) has no mechanism to hang off (dependency 55).
- **No theory state, and the one state endpoint is broken.** The seven alumno states (`grupo/entities/Estado.java:4-10`) are driven entirely by DIRBE grades through `evaluacion/controllers/ResultadoController.java:33-96`; `desaprobados` (`schema_prod.sql:143-152`) is a failed *flight*. `POST /api/turnos` consults nothing theoretical (`turno/controllers/TurnoController.java:174-176`), so "el alumno no puede volar hasta aprobar la subsanación" is unenforced on both sides. `GET /api/personas/{cod}/status` (`grupo/controllers/PersonaController.java:192-224`, gated by `Write`) cannot answer "may this alumno sit an exam" and has a control-flow bug: every branch falls through to `puedeSerEvaluado()` and returns `404 "No hay sugerencias disponibles."`, discarding categories it already appended (`:209-221`) (gaps 6, 12; dependencies 57, 58).
- **The seed cannot exercise two of the four permissions.** No usuario has `id_rol = 5` (`data_prod.sql:78-…`) and the Comandante row is mojibake `'Comandante de EscuadrÃ³n'` (`:76`), so `Role.esCmdte` never matches, `permisos` stays null and `UserDetailsServiceImpl.java:54` NPEs inside its `try`, surfacing as a failed login (dependency 19). Every `Manage Subjects` criterion is mock-only until 19 is fixed and an account is seeded (gap 13).

**What M2 already froze and M4 must not redefine.** Materias shipped contract-first (M2-9) against `contrato-api-teoria.md` v1 §1 plus `contrato-api-matricula.md` §6: `{id, nombre, notaMinima: int, coeficiente: number (2 dp), parte}`; a **non-paginated** array ordered by `parte` then `nombre`; `POST`/`PUT` → `201 {mensaje: "Materia guardada con éxito.", materia}`; `DELETE` → `200` text `"Materia eliminado con éxito."`; `404` text `"Materia especificada no existe."`; `409` text `"La materia no se puede eliminar, tiene preguntas o turnos teóricos."`. Code: `src/features/materias/api.ts:6-58`, `schemas.ts:4-31`, `src/mocks/sigeda/materias.ts:61-118`, seed `src/mocks/sigeda/datos.ts:161-173,272-279`, permissions `src/lib/auth/permisos.ts:22` (`PERMISOS_CONTRATO`). Two things M2 left: `notaMinima` has **no consumer** (M4 is its first, gap 11), and `MateriaMock.conPreguntas` is a hand-set boolean, true only for materia 3 (gap 10).

### 16.2 Decisions

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| M4-1 | **One contract, version 2.** `docs/contrato-api-teoria.md` is rewritten: every v1 endpoint re-validated against `ec2b0dd`, the materias section reduced to a route-and-shape recap that points to `contrato-api-matricula.md` §6 for validation, texts and seed (so the cross-reference runs one way only), the instants removed (M4-8), the missing shapes added, plus a fixtures section (§9) and a dependencies table (§10) like the M2/M3 contracts. There is no second theory document. | Two competing theory contracts is how the mocks and the backend drift. v1 predates M2's implementation and contradicts it in small ways (no delete text, no derived 409, `materia` vs `idMateria` in writes). | Victor reads one file; if a v1 shape was better, it is one edit in one place. |
| M4-2 | **Ownership is UI-only and the caller's code travels on the wire.** Every write carries `codInstructor` and every alumno-scoped call carries `codAlumno` (body for writes, query param for reads), exactly as `POST /api/turnos` already requires `codInstructor` at `ec2b0dd`. The frontend's API layer fills `codAlumno` from `sesion.codPersona` and **never from a route parameter**; route loaders reject an alumno who is not the owner, as M1 does for `/mis-turnos` and `/mis-evaluaciones`. Dependency 51 removes both fields and moves the rule to the server. | No controller in `sigeda-back` can identify its caller (gap 3) and the JWT carries only a username. A contract that says "se toma del usuario autenticado" would be unimplementable and the mocks would have nothing to key on. | Until 51 lands, any authenticated caller can read another alumno's examen by guessing an id — the same exposure dependency 20 already documents for turnos and evaluaciones. Removing the fields later is a one-line change per call. |
| M4-3 | **AI questions are reviewed *before* insertion, not after.** `POST /quizzes/generate` (real, `sigeda_chat_status`) returns a quiz; `/banco/importar` shows it as an editable review table; only **Importar** writes, through `POST /api/preguntas/lote`, all-or-nothing. There is no `PENDIENTE_REVISION` state, no reviewer role and no state machine: a question that is in the bank has been reviewed by definition. Each row records `origen` (`MANUAL` or `IA`), set by the **server** from the endpoint used, so the thesis can report how many questions the AI contributed and the bank can filter by it. | "Reviewed before they count" is satisfiable two ways; the gate-at-insert version needs one boolean's worth of new backend concept (`origen`) instead of a workflow, and it makes the unreviewed state unrepresentable rather than merely discouraged. `origen` cannot be forged because the client never sends it. | If the institution wants a second reviewer (the instructor imports, the Comandante approves), `Pregunta` gains a state and the turno form filters on it — a new column, a new screen and a new permission. |
| M4-4 | **`Pregunta` gains `explicacion` (nullable, ≤1000 chars) and `origen`; `sourceExcerpt` is dropped.** The generator always produces an explanation and it is the most useful part of a generated question: it is shown to the alumno in the result view after the turno finishes, and it is editable on import. `sourceExcerpt` has no destination and `sourceDocumentId` is always `null` upstream (`quiz.service.ts:87-90`), so nothing would name a source honestly. | Dropping the explanation to keep the v1 shape would throw away the generation's best output; storing an excerpt that cannot be attributed to a document invites a false citation. | One nullable column. If the explanation must never reach the alumno, one field stops being serialised in §4.6. |
| M4-5 | **The import mapping is fixed field by field, and Importar is *not* gated on dependency 39.** `multiple_choice` → `OPCION_MULTIPLE` with the four options and `correcto` from matching `correctAnswer` to `option.id`; `true_false` → `VERDADERO_FALSO` with two **synthesised** alternativas literally `"Verdadero"` and `"Falso"`; `fill_blank` → `COMPLETAR`, one alternativa with `correctAnswer`, `_____` already in the prompt. A prompt over 500 chars arrives pre-truncated with E5 and a prompt under 10 chars is flagged with E26; both must be edited before that row can be imported. An option text over 200 chars is **truncated silently**, because the cut cannot change the meaning of a single alternative the way a cut enunciado can. Repeated option texts are flagged with E6 and that row cannot be imported. `idMateria` and `dificultad` are asked once for the batch with a per-question override; a `null` `explanation` maps to `explicacion: null`. The AI backend's lack of authentication (dependency 39) does not gate this screen. | Every mismatch is real: 2000 vs 500 chars, 500 vs 200 on the options, `'true'` vs `"Verdadero"`, no guaranteed distinct options, no materia, no dificultad (gap 8). Gating on 39 would buy nothing: the row lands in `sigeda-back` carrying the `codInstructor` the frontend sends (M4-2), so authorship comes from `sigeda-back`'s side, and unlike Subir documento nothing is written to a shared list on the AI side. | If an imported question's authorship must be provable end to end, Importar joins Subir documento behind 39 — one entry in `dependencias.ts`. A silently truncated alternativa reads oddly and the instructor fixes it in the same table. |
| M4-6 | **The turno teórico gets its own grupo catalogue; nothing existing can supply one.** Contract §3.0 specifies `GET /api/turnos-teoricos/grupos?codInstructor=&programa=`, gated by `Manage Exams`, returning a non-paginated `[{id, nombre, programa, cantAlumnos}]` ordered by `nombre`: the grupos of that instructor, or every grupo of the programa when the caller also holds `Manage Groups` and omits `codInstructor`. It is a **new endpoint** (dependency 52) rather than a reuse, because `GET /api/grupos` needs `Manage Groups`, `/api/grupos/programa/{nombre}` needs `View All Groups` and carries no grupo identity, `/api/grupos/instructor/{cod}/programa/{nombre}` returns `alumnos_turno` rows, and the frontend's `listarAlumnos` returns alumnos whose `idGrupo` is folded into a label and discarded. **`programa` is therefore a field of the form and of the body**: it is chosen first, it scopes the grupo list exactly as it scopes the instructor and alumno lists in the turno práctico form, and the server validates that it matches the grupo's own programa. | An Instructor cannot enumerate grupos by any route that exists, and a picker built by de-duplicating alumno rows would show `Grupo 3` with no name, no programa and no count, and would miss a grupo the instructor has never flown with. Putting the endpoint under `/api/turnos-teoricos` avoids colliding with the three `GrupoController` routes that already own those paths with other shapes. | One more endpoint for Victor instead of a widened `GrupoController`. If he would rather add `programa` and an instructor scope to `GET /api/grupos`, the frontend changes one adapter. |
| M4-7 | **The 20-point scale is enforced in the browser and re-checked by the server.** The form shows a live "Puntaje asignado: n de 20" counter (E9); Guardar is blocked until the sum is exactly 20, there is at least one question, none repeats, and all belong to the turno's materia. Questions are picked from the bank filtered by that materia; changing the materia clears the selection after a confirm, exactly as changing a subfase does in the turno práctico form. | `puntajeMaximo` is the only place the vigesimal scale is expressed, and a turno whose points do not add to 20 produces grades that cannot be compared. Instructor holds both `Manage Questions` and `Manage Exams`, so the picker is always reachable. | None; the rule is in the contract too, so a hand-crafted request is still rejected. |
| M4-8 | **No instants on the wire.** `cierraEn` and `entregadoEn` are removed from the contract. The window is `fechaExamen` + `horaInicio` + `horaFin` (`yyyy-MM-dd` and `HH:mm`), the submission is `fechaEntrega` + `horaEntrega`, and the countdown is built in the browser from the window. The contract also fixes a **minimum window of 10 minutes**, so the five-minute warning of E15 always has somewhere to fire. | The whole domain is `LocalDate` plus `varchar` hours; an offset-bearing instant has no precedent and no Jackson configuration, so what Spring would emit is undetermined (gap 7). Guessing wrong breaks the only deadline in the application. | The browser's clock decides what the alumno sees. A skewed clock can show a countdown that is a few seconds off; the server re-checks on every write and answers 409 (D11), which the frontend shows and then navigates to the result. |
| M4-9 | **The exam session: idempotent start, full-set autosave, explicit submit.** `POST /api/turnos-teoricos/{id}/iniciar` creates the examen or returns the existing `EN_CURSO` one, with the question order **persisted at creation** (`orden`) so a reload is identical, and with `respuestaAlumno` filled from what was saved. `PUT /api/cuestionarios/{id}/respuestas` sends the **whole** answer set (replace semantics), debounced 2 s after the last change, forced at most every 10 s, and flushed before Entregar; the state is visible as E27 while saving and E28 once saved. Answers are **never** written to `localStorage` or `sessionStorage`. All questions render in one scrollable page with a sticky header showing the countdown, the **answered** count (E29) and Entregar; Entregar confirms with E17, and E18 if anything is unanswered. | The server is the only durable store and `iniciar` already returns what it holds, so browser storage would be a second source of truth for the one screen that must not have one (and M3-3 already ruled against it). Replace semantics make a lost autosave harmless: the next one carries everything. One page, not one question at a time, keeps the whole paper reviewable before submitting and needs no navigation state. Answered, not remaining, because that is the number that goes up as the alumno works. | Up to 2 s of typing is lost to a crash. A 20-question exam is a long scroll on a phone; the sticky header keeps Entregar and the countdown reachable. |
| M4-10 | **The window closes on the server, lazily; the client's auto-submit is a courtesy.** Any read that touches an examen whose `horaFin` has passed — `GET /api/examenes/pendientes`, `GET /api/turnos-teoricos/{id}`, `GET /api/turnos-teoricos/{id}/mi-cuestionario`, `GET /api/cuestionarios/{id}` — grades and closes every `EN_CURSO` examen of that turno first, with whatever was saved. The client, when its countdown reaches zero, disables the inputs, flushes the autosave and calls `entregar` once; a 409 (D11) is expected and shows E16. | There is **no scheduler anywhere** in `sigeda-back`, so a job is a new capability; lazy closing needs none and is correct for every reader. Relying on the client would leave an abandoned tab `EN_CURSO` forever. | An examen stays `EN_CURSO` in the database until somebody reads it — invisible to users, visible to anyone querying the table. Dependency 55 offers the scheduled job as the clean version. |
| M4-11 | **Grading and the applicable minimum are the backend's.** `puntajeObtenido` = `puntajeMaximo` or 0; `nota` = the sum, on 20, 2 decimals; `COMPLETAR` is compared ignoring case, accents, outer spaces **and repeated inner spaces**; **`aprobado` = `nota >= notaMinimaAplicada`, where `notaMinimaAplicada = max(materia.notaMinima, tipoExamen === 'PRE_SOLO' ? 18 : 0)`** — the PDI's Pre-Solo minimum of 18 (§3.4) overrides a materia whose own minimum is 16. The server sends `notaMinimaAplicada` on the turno and on the examen, and the frontend displays it ("12.00 / mínimo 18") and **never recomputes** anything, reading numbers through `aNota`. | Spec §2: grades are computed by the backend only. Without `notaMinimaAplicada` a Pre-Solo in Aerodinámica would pass at 16, which the PDI forbids, and the interface would print the wrong threshold beside a correct verdict. Sending the applied minimum instead of the rule keeps the exception in one place. | If another `tipoExamen` turns out to carry its own floor, it is one line of the same formula in contract §4.4. |
| M4-12 | **Subsanación surfaces in three places and blocks nothing by itself.** `GET /api/personas/{cod}/estado-teorico` feeds: Mis exámenes (E21 in the header), the turno teórico results (a badge per alumno, from `bloqueadoPorSubsanacion` already in `resultados`), and the **M1 turno práctico form**, which queries the endpoint **per alumno already added to the form** — not for the whole picker — and shows E22 with the motivo on that row, blocking Guardar. A 404, a network failure or `VITE_MOCK_API=false` with 6 unresolved leaves the state **unknown**: the row shows E23, Guardar is allowed, and nothing is silently hidden. The bulk variant and `causales[]` are deferred to M5 (§16.6); the server-side rejection is dependency 57. | The PDI rule is binding (§3.4) but the data to compute it does not exist on either side, and a UI that silently stops offering an alumno because a request failed is worse than one that admits it does not know. Per-row instead of per-picker keeps the request count bounded by the form's own rows and needs no bulk endpoint in M4. | A blocked alumno can still be programmed until 57 lands — the same UI-only posture as M1-6 and M4-2. A form with many alumnos issues one small request per row. |
| M4-13 | **One folder per entity: `src/features/{preguntas,turnos-teoricos,examenes}/`**, not §4.1's `banco/` + `teoria/`, continuing M2's ruling in `docs/decisiones.md`. Domain helpers (tipo de examen labels, the 20-point rule, the alternativa rules per `TipoPregunta`, the window state, `notaMinimaAplicada`'s display) go to `src/lib/dominio/teoria.ts`. | Each screen sits beside its API, schemas and components; that is where M1 and M2 put them and where the tests look. | A rename. |
| M4-14 | **`Manage Exams` stays Instructor + Administrador Web; the alumno screens declare `roles: SOLO_ALUMNO`.** The Comandante de Escuadrón therefore does **not** see Turnos teóricos or Resultados in M4; the Comandante's window onto theory results is M5's Seguimiento, gated by `View All Groups` (§16.6). Administrador Web holds `Take Exams` in `permisos.ts` (it holds everything), so `/examenes`, `/examenes/$id` and `/examenes/$id/resultado` restrict by role the way `/mis-turnos` and `/mis-evaluaciones` already do. | The four contract permissions are already shipped in `permisos.ts:22` and published in `contrato-api-matricula.md`; redistributing them now would change code, a contract and a table for one screen's visibility. | The Comandante has no theory view until M5. If that is unacceptable, the Turnos teóricos list gains a read permission (`Read` + staff, like the programa screens) and the writes keep `Manage Exams`. |
| M4-15 | **409 for "invalid in this state", said out loud.** The contract uses `409` with a plain-text body for the state rules, and its Convenciones section tells Victor that the house precedent is **410** via `ActionExpiredException` — thrown three times, once with the very message this contract calls D3 — and that either works for the frontend (`errors.ts:91`). Validation stays the **bare JSON array** of `'campo': mensaje` (`Response.setErrorsFrom` with a `BindingResult` in the signature), although `errors.ts:101` already reads `ErrorResponse.messages[]` identically, so the choice is a consistency preference and not a client requirement. | Silence is how the module ends up with 410s, `ErrorResponse` bodies and per-field tables that do not describe what arrives (gaps 5, 6). | Nothing on the frontend either way. If Victor prefers 410, one line of the contract changes and the mocks follow. |
| M4-16 | **Manual `201` bodies with camelCase keys for the three new entities.** `Response.wasSaved` builds its key as `nombreEntidad.toLowerCase()` and always says "guardada", which would produce the JSON key `"turno teórico"` (a space and an accent) and "Preguntas guardada con éxito." So: `201 {"mensaje":"Pregunta guardada con éxito.","pregunta":{…}}`, `201 {"mensaje":"Preguntas guardadas con éxito.","preguntas":[…]}`, `201 {"mensaje":"Turno teórico guardado con éxito.","turnoTeorico":{…}}`, `200 {"mensaje":"Examen entregado con éxito.","cuestionario":{…}}`. Deletes keep the template verbatim, accepting its masculine agreement: `"Pregunta eliminado con éxito."`, `"Turno teórico eliminado con éxito."` | A key with a space is legal JSON and miserable to consume; the accented `"evaluación"` key already forces a fallback at `src/features/evaluaciones/api.ts:160`. Deletes keep the template because M2 already shipped `"Materia eliminado con éxito."` and consistency beats grammar there. | Two conventions in one module, documented in one place. The frontend tolerates both shapes anyway. |
| M4-17 | **Dependency gates, and the one M2 forgot.** `src/lib/dependencias.ts` gains `gestionarPreguntas: [6]`, `importarPreguntas: [6]`, `programarTurnoTeorico: [6]`, `rendirExamen: [6]`, `bloqueoSubsanacion: [7]` and — closing gap 9 — `gestionarMaterias: [5]`. Outside mock mode and with 6 unlisted, every theory screen shows **E1** and its writes are disabled with T11. | Every theory read 404s live and `sigeda.lista` masks that as an empty list (`src/lib/api/http.ts:147-154`; `sigeda.pagina` does the same at `:138-145`), so without E1 the screens look merely empty and the writes fail with the generic error. Materias has had this problem since M2 and was never gated. | Six more entries in one table. In mock mode everything is enabled, as today. |
| M4-18 | **Theory mocks live in `src/mocks/sigeda/`** — `preguntas.ts`, `turnos-teoricos.ts`, **`cuestionarios-teoria.ts`** exporting `handlersCuestionariosTeoria`, and `estado-teorico.ts` — registered in `src/mocks/handlers.ts` beside the others, reusing `paginar`, `erroresDeCampo`, `textoNoEncontrado`, `textoEliminado` and `autorizar`. `Secuencias` gains `pregunta`, `alternativa`, `turnoTeorico` and `cuestionario`. `MateriaMock.conPreguntas` is **deleted** and the materias 409 becomes derived from the mock's preguntas and turnos teóricos (gap 10). **User-facing copy says "examen", never "cuestionario"**: `cuestionario` is M3's practice quiz and the two must not read alike. | `src/mocks/ia/cuestionarios.ts` already exists and `handlers.ts` already imports `handlersCuestionarios`, so the plain name would collide. A hand-set boolean and real question rows would disagree the moment a test deletes a question. | None. |
| M4-19 | **The exam window is opened by a test helper, not by the fixture's clock.** `crearDatos(hoy)` builds the open turno with plain `00:00`–`23:59` hours, and M4's timing task adds **`abrirVentanaDeExamen({ transcurridos, restantes })`** to `src/test/tiempo.ts`, called **after** `relojFalso()`, which rewrites that turno's `horaInicio`/`horaFin` from the faked clock. It is its own task, before anything timed, exactly as M3-17 treated `relojFalso()`. | `reiniciarDatosMock()` runs in `afterEach` with **real** timers, so a fixture built from the wall clock is created before the fake clock exists; and a clock-derived window near midnight could leave under five minutes, making CA-EXA-06 and CA-EXA-09 unreachable. A helper called after the fake clock makes both deterministic and drops the clamp entirely. | One helper and one task. Without it, the two timing criteria are flaky or untestable. |
| M4-20 | **The 24-hour subsanación rule is a warning, not a block.** A `SUBSANACION` whose `fechaExamen` is more than one day after its origin turno shows E11 and still saves. | The PDI says "dentro de 24 h" (§3.4) but the institution schedules around availability, and a hard block would make a legitimate turno impossible to record. The same posture as M1-10's overlap warning. | A late subsanación is recordable. If the rule must bite, it becomes a 400 in contract §3.3 and a zod refinement. |
| M4-21 | **The AI mock gains one import-path quiz, documented here, not by rewriting the M3 contract.** `POST /quizzes/generate` with `questionCount = 12` returns a five-question quiz containing one 620-character prompt (E5), one 6-character prompt (E26), one question with two identical options (E6) and one with a 240-character option (silent truncation). It is specified in `contrato-api-teoria.md` §9.4 with a cross-reference to `contrato-api-aprendizaje.md` §7.2, which is **not** modified. | The import screen's failure paths need fixtures that M3's three-question quiz cannot provide, and reopening a finished contract to add a trigger for another milestone's tests hides the reason for the fixture. | A reader of the M3 contract does not see the extra trigger; the cross-reference is the mitigation. |
| M4-22 | **Any `tipoExamen` may be used with any materia.** The PDI associates each periodic type with particular asignaturas (Emergencias, Límites, Ingeniería, Adoctrinamiento, Instrumentos, Aerodinámica, Meteorología, Fraseología), but contract §3.3 validates no pairing: the instructor picks a materia and a tipo independently. | The system has to record what the squadron actually does, including a type the PDI did not anticipate for a materia, and a hard pairing table would make a legitimate turno unrecordable. The same posture as M4-20. Also, the PDI's own vocabulary does not match the 11-materia catalogue (§16.6), so a pairing table would have to be invented before it could be enforced. | A miscategorised turno is recordable, and M5's causales (which count failures *by type*) would count it. When M5 reconciles the causal vocabulary with the catalogue, that reconciliation can add the pairing as a warning. |
| M4-23 | **Five scope cuts, all listed as an M5 backlog.** After review the milestone was cut to fit ≤ 20 tasks: the alumno's exam history, inasistencias with the 50 % rezagado reduction, and `causales[]` leave M4 entirely — contract surface, criteria and fixtures — and the subsanación hook keeps the single-alumno endpoint as the last, droppable task. Everything removed is enumerated in §16.6, with the reason M5 owns it. | The review calibrated M2 and M3 at ~2.6 criteria per task and put M4 as written at 22–25 tasks. Cutting the three surfaces whose only consumer is M5's legajo and averages removes work without removing a use case from M4, and an explicit backlog is what keeps a cut from becoming an omission. | M4 ships without a theory history for the alumno and without the 50 % rule, both of which the thesis needs by M5. If M5 slips, they slip with it. |

### 16.3 Screens

This replaces the §6 M4 table. Sidebar group **Teoría** for all of them; the group and its place in `ORDEN_GRUPOS` already exist (`src/lib/auth/pantallas.ts:34,44`).

| Screen | Route | Permission | `roles` | `enMenu` | Data | Breadcrumb parent |
|---|---|---|---|---|---|---|
| Banco de preguntas | `/banco` | `Manage Questions` | — | ✓ | Contract (deps. 6, 51) | — |
| Importar desde IA | `/banco/importar` | `Manage Questions` | — | | Real (IA) + Contract | `/banco` |
| Turnos teóricos | `/teoria/turnos` | `Manage Exams` | — | ✓ | Contract (deps. 6, 51, 52) | — |
| Registrar turno teórico | `/teoria/turnos/nuevo` | `Manage Exams` | — | | Contract | `/teoria/turnos` |
| Resultados por turno | `/teoria/turnos/$id` | `Manage Exams` | — | | Contract | `/teoria/turnos` |
| Modificar turno teórico | `/teoria/turnos/$id/editar` | `Manage Exams` | — | | Contract | `/teoria/turnos/$id` |
| Mis exámenes | `/examenes` | `Take Exams` | `SOLO_ALUMNO` | ✓ | Contract (deps. 6, 7) | — |
| Rendir examen | `/examenes/$id` | `Take Exams` | `SOLO_ALUMNO` | | Contract | `/examenes` |
| Resultado del examen | `/examenes/$id/resultado` | `Take Exams` | `SOLO_ALUMNO` | | Contract | `/examenes` |

The `roles` column is a **field of the registry**, not a derivation: a screen gated by `Manage Questions` or `Manage Exams` declares no `roles` at all, because the permission already limits it to Instructor and Administrador Web (`permisos.ts`); only the three alumno screens declare `roles: SOLO_ALUMNO`, because Administrador Web also holds `Take Exams`. Who ends up seeing each screen is what the permission table below says.

`enMenu` marks the three list screens. Note that `accesosPara` (`pantallas.ts:445-449`) puts **every visible screen without a `$` parameter** into Inicio's quick links regardless of `enMenu`, so Importar desde IA and Registrar turno teórico appear there too. That is intended: both are the main action of their screen.

`$id` is the **turno teórico** id on all three alumno routes, never an examen id: the alumno reaches their own paper through `GET /api/turnos-teoricos/{id}/mi-cuestionario`, so both pages survive a reload without a second id space. `/examenes/$id/resultado` hangs off `/examenes`, not off `/examenes/$id`, because the exam page is not somewhere to navigate back into.

**Search params**, all zod-validated with `.default().catch()` like every other list: `/banco?idMateria=&dificultad=&tipo=&origen=&texto=&page=&size=&property=&direction=`; `/teoria/turnos?idGrupo=&idMateria=&estado=&tipoExamen=&fechaPre=&fechaPost=&page=&size=&property=&direction=`. `/banco/importar` and the alumno routes have none.

**Pages, dialogs and in-place surfaces.** The nine routes are pages. Inside them: **Registrar pregunta** and **Modificar pregunta** are dialogs (a small form, §8); **Eliminar pregunta** and **Eliminar turno teórico** use the shared confirm dialog; **Entregar examen** is a confirm dialog (E17/E18); **Importar** confirms with E7. Everything else is in place: the generation form and the review table are two states of `/banco/importar`; Mis exámenes shows only Pendientes (the history is deferred, §16.6); the exam's countdown, answered count and Entregar live in a sticky header inside `/examenes/$id`.

Who sees what (`permisos.ts`; the four theory permissions are the contract ones of `PERMISOS_CONTRATO`):

| Permission | Administrador Web | Comandante de Escuadrón | Jefe de Operaciones | Instructor | Alumno |
|---|---|---|---|---|---|
| `Manage Subjects` (M2, writes on Materias) | ✓ | ✓ | | | |
| `Manage Questions` (Banco, Importar) | ✓ | | | ✓ | |
| `Manage Exams` (Turnos teóricos, Resultados) | ✓ | | | ✓ | |
| `Take Exams` (`roles: SOLO_ALUMNO`) | ✓ (not offered) | | | | ✓ |

**Fixed interface texts** (the CAs cite these IDs; the contract's own messages are D1–D28 in `contrato-api-teoria.md` §7):

| ID | Where | Text |
|---|---|---|
| E1 | Header of every Teoría screen, live mode with dependency 6 pending | El módulo de teoría todavía no existe en el servidor: estas pantallas funcionan solo en modo mock. |
| E2 | Banco, next to a disabled Eliminar | La pregunta se usa en un turno teórico y no se puede eliminar. |
| E3 | Banco, empty state | Todavía no hay preguntas. Registre una o impórtelas desde un cuestionario de IA. |
| E4 | Importar, header of the review table | Las preguntas generadas no entran al banco hasta que las revise y confirme la importación. |
| E5 | Importar, enunciado over 500 characters | El enunciado generado supera los 500 caracteres: se recortó y debe revisarlo antes de importar. |
| E6 | Importar, repeated alternativas | La pregunta tiene alternativas repetidas: corrija los textos o quítela de la importación. |
| E7 | Importar, confirmation before writing | Se guardarán todas las preguntas elegidas o ninguna. |
| E8 | Importar, generation rejected or unusable | No se pudo generar el cuestionario con los documentos elegidos. Intente de nuevo o elija otro documento. |
| E9 | Registrar/Modificar turno teórico, live counter | Puntaje asignado: {n} de 20. |
| E10 | Turnos teóricos, instead of Modificar and Eliminar | El turno teórico ya no se puede modificar porque su ventana comenzó. |
| E11 | Registrar turno teórico, subsanación more than a day after its origin | La subsanación debería rendirse dentro de las 24 horas del examen desaprobado. |
| E12 | Registrar turno teórico, materia without questions | La materia elegida no tiene preguntas en el banco. Registre o importe preguntas antes de programar el examen. |
| E13 | Mis exámenes, exam not open yet | Se habilita el {fecha} a las {horaInicio}. |
| E14 | Rendir examen, autosave failed | No se pudieron guardar las últimas respuestas. Reintente antes de que cierre la ventana. |
| E15 | Rendir examen, five minutes left | Quedan 5 minutos. Al cerrar la ventana el examen se entrega con lo que haya respondido. |
| E16 | Rendir examen, window closed while answering | La ventana del examen cerró y se entregó con las respuestas guardadas. |
| E17 | Rendir examen, confirmation | Se entregará el examen y no podrá cambiar sus respuestas. |
| E18 | Rendir examen, confirmation with blanks | Quedan {n} preguntas sin responder: se califican con 0. |
| E19 | Resultado del examen, turno not finished yet | Verá el detalle de sus respuestas cuando el turno termine; por ahora solo su nota. |
| E21 | Mis exámenes, alumno blocked by a subsanación | Tiene una subsanación pendiente: no puede programarse en turnos prácticos hasta aprobarla. |
| E22 | Turno práctico form, blocked alumno on its row | Subsanación pendiente: {motivo} |
| E23 | Turno práctico form, `estado-teorico` unavailable for that row | No se pudo comprobar el estado teórico de este alumno. |
| E24 | Mis exámenes, no pending exams | No tiene exámenes teóricos pendientes. |
| E25 | Turnos teóricos, empty state | Todavía no hay turnos teóricos. Programe uno para un grupo y una materia. |
| E26 | Importar, enunciado under 10 characters | El enunciado generado es demasiado corto: complételo antes de importar. |
| E27 | Rendir examen, autosave in flight | Guardando… |
| E28 | Rendir examen, autosave succeeded | Guardado |
| E29 | Rendir examen, sticky header counter | Respondidas: {n} de {total}. |

**E20 is retired** with the inasistencias cut (§16.6); the id is not reused.

### 16.4 Acceptance criteria

Every criterion is testable against the MSW mocks of `docs/contrato-api-teoria.md`, whose §9 fixes the fixtures — including the ones the failure paths need: a question already used by a turno, a turno whose window a test opens on demand, a finished turno with one pass and one fail, a subsanación chain and an alumno blocked by it. Absences (an empty bank, a materia without questions, an alumno with no pending exams, a failing autosave, an unavailable `estado-teorico`) are exercised with per-test `server.use(...)` overrides, the pattern M2 and M3 already use, because the default fixtures must hold the happy paths. The criteria with a countdown, a debounce or an auto-submit (CA-EXA-05, CA-EXA-06, CA-EXA-09) depend on `relojFalso()` plus `abrirVentanaDeExamen()` (M4-19).

**Ids are unchanged from the pre-review version except where the cuts removed one.** `CA-RES-05` (inasistencias) and `CA-RES-11` (causales) are **retired**, their numbers are not reused, and `CA-RES-13` is new (the Pre-Solo minimum). Nothing was renumbered.

#### CUS Gestionar banco de preguntas (M4, Instructor)

- **CA-BAN-01** La lista muestra materia, enunciado, tipo, dificultad, origen (Manual o IA) y si está en uso, pagina de 10 en 10, y el servidor es quien ordena y pagina: la tabla no reordena en el navegador.
- **CA-BAN-02** Filtra por materia, dificultad, tipo, origen y texto del enunciado; los filtros, la página y el orden persisten en la URL y una URL mal escrita vuelve a los valores por defecto.
- **CA-BAN-03** Sin preguntas se muestra E3 con las acciones Registrar pregunta e Importar desde IA.
- **CA-BAN-04** Registrar pide materia, enunciado de 10 a 500 caracteres, dificultad, tipo y sus alternativas; el enunciado en blanco o fuera de rango se explica bajo el campo con el mensaje del contrato.
- **CA-BAN-05** Una pregunta de opción múltiple exige exactamente 4 alternativas con textos distintos y exactamente una correcta.
- **CA-BAN-06** Una pregunta de verdadero o falso ofrece solo las alternativas Verdadero y Falso y exige marcar una.
- **CA-BAN-07** Una pregunta de completar exige el marcador `_____` en el enunciado y una sola alternativa con la respuesta esperada.
- **CA-BAN-08** Cambiar el tipo de pregunta rehace las alternativas y avisa antes de descartar lo escrito.
- **CA-BAN-09** La explicación es opcional y admite hasta 1000 caracteres.
- **CA-BAN-10** Modificar aplica las mismas validaciones que registrar y conserva el origen de la pregunta.
- **CA-BAN-11** Eliminar pide confirmación; si la pregunta está en un turno teórico la acción no está disponible y se muestra E2, y una eliminación que el servidor rechaza muestra D3.
- **CA-BAN-12** Los errores de validación del backend aparecen bajo el campo correspondiente, incluidas las alternativas por índice.
- **CA-BAN-13** Un fallo en la primera carga de la lista muestra el aviso con Reintentar, no una lista vacía.
- **CA-BAN-14** Fuera del modo mock y sin la dependencia 6 resuelta, la pantalla muestra E1 y las acciones de escritura están deshabilitadas con T11.

#### CUS Importar preguntas desde IA (M4, Instructor)

- **CA-IMP-01** El formulario pide al menos un documento en estado Listo, al menos un tipo de pregunta, una cantidad entera de 2 a 20, una materia y una dificultad para el lote.
- **CA-IMP-02** Mientras se genera, el formulario se deshabilita, se muestra el aviso de espera y no se puede enviar dos veces; a los 120 segundos la petición se cancela y se ofrece Reintentar.
- **CA-IMP-03** Si la generación falla o responde un mensaje que no está en la lista del contrato, se muestra E8 sin detalle técnico.
- **CA-IMP-04** Las preguntas generadas se muestran en una tabla editable con E4, ninguna se guarda todavía, y cada fila puede quitarse de la importación.
- **CA-IMP-05** Un enunciado generado de más de 500 caracteres llega recortado a 500 con E5, y uno de menos de 10 muestra E26; en ambos casos la fila no se puede importar hasta revisarla.
- **CA-IMP-06** Una pregunta verdadero o falso generada se convierte en dos alternativas Verdadero y Falso con la correcta marcada según la respuesta del modelo.
- **CA-IMP-07** Una pregunta con alternativas repetidas muestra E6 y no se puede importar hasta corregir los textos; una alternativa de más de 200 caracteres se recorta sin aviso.
- **CA-IMP-08** La materia y la dificultad del lote se pueden cambiar por pregunta antes de importar.
- **CA-IMP-09** Importar pide confirmación con E7 y guarda todas las preguntas elegidas o ninguna: si el servidor rechaza una, ninguna queda en el banco y el error señala la fila.
- **CA-IMP-10** Tras importar, las preguntas aparecen en el banco con origen IA y la pantalla vuelve a `/banco`.
- **CA-IMP-11** Sin preguntas elegidas, Importar está deshabilitado.

#### CUS Programar turno teórico (M4, Instructor)

- **CA-TUT-01** La lista muestra nombre, materia, tipo de examen, grupo, fecha, horario, estado y cuántos alumnos rindieron; pagina de 10 en 10.
- **CA-TUT-02** Filtra por grupo, materia, estado, tipo de examen y rango de fechas, y los filtros persisten en la URL; sin turnos muestra E25.
- **CA-TUT-03** El formulario pide programa, nombre de 10 a 60 caracteres, materia, tipo de examen, grupo, fecha del examen y horario en formato HH:mm; la fecha con la hora de inicio debe quedar en el futuro y la hora de fin debe ser al menos 10 minutos posterior a la de inicio.
- **CA-TUT-04** El programa se elige primero y limita los grupos ofrecidos; los grupos son los del instructor, y con el permiso `Manage Groups` son todos los del programa. Cambiar el programa limpia el grupo elegido.
- **CA-TUT-05** Las preguntas ofrecidas son las de la materia elegida; cambiar la materia pide confirmación y limpia la selección, y si la materia no tiene preguntas se muestra E12.
- **CA-TUT-06** Se exige al menos una pregunta, sin repetidas, y un puntaje entero de 1 a 20 por pregunta.
- **CA-TUT-07** Los puntajes deben sumar exactamente 20; el total se muestra con E9 y Guardar está deshabilitado mientras no sume 20.
- **CA-TUT-08** Con tipo de examen Subsanación o Rezagado se exige el turno de origen, que solo puede ser un turno finalizado de la misma materia y grupo; con cualquier otro tipo el campo no se muestra ni se envía.
- **CA-TUT-09** Una subsanación programada más de un día después de su turno de origen muestra E11 y se puede guardar igual.
- **CA-TUT-10** Modificar aplica exactamente las mismas validaciones que registrar, incluida la de que la fecha con la hora de inicio quede en el futuro; una vez que la ventana comenzó, Modificar y Eliminar no están disponibles y se muestra E10, y un intento por URL muestra D7.
- **CA-TUT-11** Eliminar pide confirmación y solo está disponible mientras el turno esté programado.
- **CA-TUT-12** Los errores de validación del backend aparecen bajo el campo correspondiente, incluidas las preguntas por índice.
- **CA-TUT-13** Un fallo en la primera carga de la lista o del formulario muestra el aviso con Reintentar; un fallo del catálogo de materias o de grupos avisa bajo su selector sin bloquear la pantalla.
- **CA-TUT-14** Fuera del modo mock y sin la dependencia 6 resuelta, la pantalla muestra E1 y Registrar, Modificar y Eliminar están deshabilitados con T11.

#### CUS Rendir examen teórico (M4, Alumno)

- **CA-EXA-01** Mis exámenes lista los turnos habilitados sin entregar con materia, tipo de examen, fecha y horario; sin pendientes muestra E24.
- **CA-EXA-02** Un examen cuya ventana no comenzó no se puede abrir y muestra E13 con su fecha y hora de inicio.
- **CA-EXA-03** Abrir un examen dentro de su ventana lo inicia una sola vez y muestra las preguntas con su puntaje, en el orden que devuelve el servidor; ni la alternativa correcta, ni la respuesta esperada, ni la explicación están en el DOM.
- **CA-EXA-04** Cada pregunta se responde según su tipo: cuatro alternativas, Verdadero o Falso, o un campo de texto en las de completar.
- **CA-EXA-05** Las respuestas se guardan solas 2 segundos después del último cambio y, como máximo, cada 10 segundos; el estado se ve como E27 mientras guarda y E28 al terminar, y un fallo muestra E14 con Reintentar sin perder lo respondido.
- **CA-EXA-06** El encabezado muestra el tiempo restante hasta el cierre de la ventana y las respondidas sobre el total con E29; a los 5 minutos restantes aparece E15.
- **CA-EXA-07** Entregar pide confirmación con E17 y, si quedan preguntas sin responder, con E18.
- **CA-EXA-08** Recargar la página retoma el mismo examen con las mismas preguntas en el mismo orden y las respuestas ya guardadas, sin iniciar otro.
- **CA-EXA-09** Al llegar a cero el tiempo, los campos se bloquean, se guardan las respuestas pendientes y el examen se entrega solo; se muestra E16 y se pasa al resultado.
- **CA-EXA-10** Si la ventana cerró en el servidor antes de entregar, la respuesta D11 se muestra como E16 y se pasa al resultado en lugar de la página de error.
- **CA-EXA-11** Un examen ya entregado no se puede volver a rendir: la acción lleva al resultado y un intento por URL muestra D10.
- **CA-EXA-12** Un alumno no habilitado para el turno no puede abrirlo y se muestra D9.
- **CA-EXA-13** Un fallo en la primera carga de Mis exámenes o del examen muestra el aviso con Reintentar.

#### CUS Consultar resultados teóricos (M4, Instructor y Alumno)

- **CA-RES-01** El detalle del turno muestra sus datos, las preguntas con su puntaje y un resultado por alumno habilitado: estado (No rindió, En curso o Entregado), nota y si aprobó.
- **CA-RES-02** Los alumnos habilitados son todos los del grupo, salvo en una subsanación (solo los que desaprobaron el turno de origen) y en un rezagado (solo los que no rindieron); un alumno sin grupo nunca aparece.
- **CA-RES-03** La nota se muestra con dos decimales junto a la nota mínima aplicable que informa el servidor, y el frontend no calcula ninguna de las dos.
- **CA-RES-04** El resumen muestra cuántos rindieron, cuántos aprobaron y el promedio del turno.
- **CA-RES-06** Un alumno con subsanación pendiente se marca en su fila del turno y en el encabezado de Mis exámenes con E21.
- **CA-RES-07** El resultado del alumno muestra la nota, si aprobó y la nota mínima aplicable; mientras el turno no esté finalizado no muestra ninguna respuesta y avisa con E19.
- **CA-RES-08** Con el turno finalizado, el resultado muestra por pregunta el enunciado, la respuesta dada, la correcta, el puntaje obtenido sobre el máximo y la explicación cuando la hay.
- **CA-RES-09** El alumno solo consulta lo propio: la capa de API envía siempre el `codPersona` de la sesión y nunca un valor tomado de la URL, y el cargador de la ruta rechaza un turno en el que el alumno no está habilitado.
- **CA-RES-10** En el formulario de turno práctico, la fila de un alumno bloqueado por subsanación muestra E22 con su motivo e impide guardar; si su estado teórico no se puede consultar, la fila muestra E23 y guardar sigue permitido.
- **CA-RES-12** Un fallo en la primera carga del detalle del turno o del resultado muestra el aviso con Reintentar.
- **CA-RES-13** En un examen de tipo Pre-Solo se aprueba con 18 aunque la nota mínima de la materia sea menor, y la pantalla muestra ese 18 como mínimo aplicable.

### 16.5 Backend dependencies added

**Live blockers:** dependency **6** (the whole theory API — nothing works live without it) and **7** (`estado-teorico`). M4 is a **mock-only milestone** until both land; that is what E1 says on screen and what `gestionarPreguntas`, `importarPreguntas`, `programarTurnoTeorico`, `rendirExamen` and `bloqueoSubsanacion` gate (M4-17). Dependency 6 stays the umbrella; 51–60 are the parts of it that are easy to forget, plus the two bugs found while sizing it.

| # | Change | Repo | Needed by |
|---|---|---|---|
| 51 | **Security:** resolve the caller — `sub` (username) → `Usuario` → `Persona.codigo` — and expose it to controllers, then drop `codInstructor` and `codAlumno` from every theory request and enforce ownership server-side (`GET /api/cuestionarios/{id}`, `mi-cuestionario`, `estado-teorico`, `iniciar`, `respuestas`, `entregar`). `@AuthenticationPrincipal` appears nowhere today and the JWT carries only `sub`. Widens dependency 20 | back | M4 — security; M4-2 |
| 52 | `GET /api/turnos-teoricos/grupos?codInstructor=&programa=` gated by `Manage Exams`: the grupos an instructor may schedule for, as `[{id, nombre, programa, cantAlumnos}]`. A new endpoint, not a widening: `GET /api/grupos` needs `Manage Groups` and has no `programa` filter, `/api/grupos/programa/{nombre}` needs `View All Groups` and carries no grupo identity, and `/api/grupos/instructor/{cod}/programa/{nombre}` returns `alumnos_turno` rows | back | M4 — Registrar turno teórico; M4-6 |
| 53 | Theory schema and seed: `materias`, `preguntas`, `alternativas`, `turnos_teoricos`, `preguntas_turno`, `cuestionarios`, `calificaciones_teoricas`, their sequences (the block is `schema_prod.sql:100-115`), their FKs and seed rows — **plus a prod migration path**, since `ddl-auto=none` and prod never runs the init scripts | back | M4 — all of it |
| 54 | The four permissions as code: `Manage Subjects`, `Manage Questions`, `Manage Exams`, `Take Exams` in `Permiso.java` and `Permission.java`, added to `Role.Administrador`, `Role.Comandante` (Subjects), `Role.Instructor` (Questions, Exams) and `Role.Alumno` (Take Exams). Until then **every theory endpoint is reachable by any authenticated user**. The matrix is code-only, so this is a redeploy, not a data fix | back | M4 — security; also completes dependency 5 |
| 55 | Close the exam window server-side: grade and close every `EN_CURSO` examen past its `horaFin`. Lazily on read is the contract's requirement (§4.7); a `@Scheduled` job is the clean version and **nothing in `sigeda-back` is scheduled today** | back | M4 — M4-10 |
| 56 | Bulk `GET /api/estado-teorico?codAlumnos=a,b,c` returning one object per alumno, so a screen can ask about many alumnos in one request. Widens dependency 7. **Deferred out of M4** (§16.6): M4 queries the single-alumno endpoint per form row | back | M5 — legajo and the turno form's picker |
| 57 | `POST` and `PUT /api/turnos` reject an alumno blocked by a pending subsanación, as a field error on `alumnosTurno[i].codAlumno`. Today `TurnoController` consults no theory state, so the PDI rule "el alumno no puede volar hasta aprobar la subsanación" is advisory on both sides | back | M4 / M1 — the rule of spec §3.4 |
| 58 | **Bug:** `GET /api/personas/{cod}/status` returns `404 "No hay sugerencias disponibles."` for every non-`Apto` alumno, discarding the categories it already appended, because all branches fall through to `puedeSerEvaluado()`; it is also gated by `Write` instead of `Read`. Found while looking for an endpoint theory could reuse | back | M1 — Registrar evaluación |
| 59 | Optional, for the import: accept `maxPromptChars` (≤ 500) and a `difficulty` hint on `POST /quizzes/generate` so generated questions fit the bank without manual editing, and fill `sourceDocumentId` (the second half of dependency 48). Today a prompt may be four times the bank's limit | chat_status | M4 nice-to-have; M4-5 |
| 60 | Conventions, so the module does not drift: use **409** with a plain-text body for the state rules of contract §§2–4 (today `CONFLICT` appears nowhere and `ActionExpiredException` returns 410 in three places, once with the exact wording of D3). For validation, prefer the **bare array** of `'campo': mensaje` via `Response.setErrorsFrom` with a `BindingResult` in the signature — a consistency preference, not a client requirement, since `errors.ts:101` already reads `ErrorResponse.messages[]` identically. The real defect is that `ConstraintErrors.formatErrors` never sorts, so a field's messages arrive in any order | back | M4 — M4-15 |

Dependency 6 is detailed by contract §§2–4 and split by 53 and 54; dependency 7 is detailed by contract §5. Dependency 5 (materias) is unchanged and finally gated in the frontend (M4-17, gap 9). Dependency 20 is widened by 51. Dependency 39 does **not** gate Importar desde IA (M4-5).

### 16.6 Deferred to M5

The review cut M4 to fit ≤ 20 tasks (M4-23). Everything below was **removed from the contract, the criteria and the fixtures**, not just from the screens, and M5's addendum inherits it as an explicit backlog. Each item names its consumer, which is why M5 owns it.

| # | Deferred | What was removed | Why M5 |
|---|---|---|---|
| 1 | **The alumno's theory history.** `GET /api/cuestionarios` (list with `codAlumno`/`idMateria`/`estado` filters) and the "Rendidos" section of Mis exámenes | That whole endpoint section and message **D14**; the second half of CA-EXA-01. M4 keeps Pendientes plus the result just submitted, reachable through `mi-cuestionario` | The legajo del alumno (spec §6, M5) is the screen that shows a student's whole record; a second, poorer history in M4 would be thrown away |
| 2 | **Inasistencias and the 50 % rezagado reduction.** `PUT /api/turnos-teoricos/{id}/inasistencias/{codAlumno}` | That whole endpoint section, messages **D13** and **D24**, text **E20**, criterion **CA-RES-05**, the field `inasistenciaJustificada` in `resultados`, the field `reduccionPorRezagado` on the examen, the `inasistencia_justificada` column and the `NO_RINDIO` row in `cuestionarios`, and step 5 of §4.4's grading. `EstadoRendicion.NO_RINDIO` survives as a **derived** value that is never stored | M5 owns the legajo and the NIT/NIA/NFPI averages (dependency 8), which is where a reduced grade has to be reflected. It also removes the error the review found: a `NO_RINDIO` row in a table whose `estado` column holds `EstadoCuestionario`, an enum without that value |
| 3 | **`causales[]` in `estado-teorico`** and its seven codes (`PROMEDIO_ASIGNATURA`, `TRES_ASIGNATURAS`, `DOS_EXAMENES`, `SEGUNDA_SUBSANACION`, `PERIODICOS_EMERGENCIAS`, `PERIODICOS_OTROS`, `INOPINADOS`) | The `causales` field and its code table in contract §5.1, criterion **CA-RES-11**, and the `999999` fixture that carried a causal without a block | Alertas and the legajo (M5) are the only consumers, and the causales need per-materia exam histories that do not exist yet. **M5 must first reconcile the causal vocabulary with the materia catalogue:** `PERIODICOS_EMERGENCIAS` names "Emergencias Críticas" and "No Críticas" and `PERIODICOS_OTROS` names "Instrumentos", none of which exist among the 11 materias (which have a single "Procedimientos de Emergencias" and no "Instrumentos"). Either the catalogue grows or the codes are restated in its terms |
| 4 | **Bulk `estado-teorico`** — `GET /api/estado-teorico?codAlumnos=` (dependency 56) | That whole endpoint section, its two messages (the empty-list 400 and the 100-alumno cap) and message **D16** | M4's turno form queries the single-alumno endpoint per row it already has (M4-12). A picker that greys out every blocked alumno before one is chosen needs the bulk call, and so does the legajo's group view |
| 5 | **Overlap between two theory turnos of the same grupo.** Contract §3.3 states explicitly that it is **not** validated | Nothing was written and nothing was removed; it is recorded here so M5 does not assume M4 checked it | There is no precedent: `HorasInicioFin` is never called even for practical turnos (dependency 15), so a theory overlap rule should arrive with that one, as a warning like M1-10's |
| 6 | **The Comandante de Escuadrón's view of theory results** (M4-14's stated cost) | Nothing; `Manage Exams` was left as shipped | M5's Seguimiento is gated by `View All Groups`, which the Comandante holds, and is where theory and practical results are read together |
| 7 | **The "prevalece la primera nota" consequence.** Contract §4.4 states the rule (a subsanación does not replace the failed grade; both stand) but nothing in M4 computes an average from it | The rule is one sentence in the contract; no screen and no criterion depends on it | The averages are dependency 8 and the legajo is M5; M4 only has to avoid implying that a passed subsanación erases the failure |

**Plan scope.** The plan that follows M4 must fit in **≤ 20 tasks**; the intended decomposition is **18**, leaving two of headroom:

1. `src/lib/dominio/teoria.ts` **plus the timing helper** `abrirVentanaDeExamen()` in `src/test/tiempo.ts` (M4-19) — first, because four criteria depend on it.
2. Preguntas API layer and `src/mocks/sigeda/preguntas.ts`: the four new sequences and the **derived** materias 409 (`conPreguntas` removed).
3. Turnos teóricos API layer, the grupo catalogue of contract §3.0, and `src/mocks/sigeda/turnos-teoricos.ts`.
4. Exámenes API layer and `src/mocks/sigeda/cuestionarios-teoria.ts` + `estado-teorico.ts`.
5. Route registry, sidebar group, breadcrumbs, `dependencias.ts` gates and the E1 notice.
6. Banco de preguntas: list, filters, URL state, **and Eliminar with `enUso`/E2/D3** (cut 4).
7. Registrar and Modificar pregunta: one shared dialog and its zod schema.
8. Importar desde IA: generation form, 120 s deadline, message allow-list, **and the AI mock's `questionCount = 12` quiz** (§9.4).
9. Importar desde IA: the review table (truncation, E26, duplicates, per-question overrides) and the `lote` write.
10. Turnos teóricos: list, filters, URL state, Eliminar.
11. Registrar **and** Modificar turno teórico: one shared form — programa and grupo pickers, question picker, the 20-point counter, the subsanación origin (cut 4).
12. Resultados por turno: detail, `resultados`, `resumen`, badges, `notaMinimaAplicada`.
13. Mis exámenes (Pendientes only) with E13, E21 and E24.
14. Rendir examen: session start, rendering per `TipoPregunta`, autosave with E27/E28/E14.
15. Rendir examen: countdown, E15, E29, auto-submit, the D11 path (E16).
16. Resultado del examen: the alumno's view with E19 and the finished-turno detail.
17. Tests and criteria sweep for the two screens that carry the most criteria (Banco and Rendir examen), plus the `docs/decisiones.md` entry.
18. **M1 turno práctico form subsanación hook** with single-alumno `estado-teorico`, E22 and E23 — **last, and droppable** without losing the milestone (cut 5).

At 63 criteria over 18 tasks the ratio is 3.5, above M2's and M3's ~2.6. If the plan overruns, tasks 6 and 14 are the ones to split first: each carries a list-plus-mutation pair that the others do not.

## 17. Addendum M5 — Seguimiento

**Date:** 2026-09-25 · **Status:** decided autonomously, like M1–M4, then **revised after review** (two rounds, 106 sampled claims; every finding accepted). Contract for Victor: `docs/contrato-api-seguimiento.md`. This is the **last milestone**, so §17.6 is not a hand-off to another addendum: what it defers is deferred out of the thesis's frontend, and it says so. §16.6's seven-item backlog is disposed of item by item in §17.6.

**Two things changed in the revision and they changed the design, not the prose.** First, the **PDI itself was read** — `PDI_EA-510_2023_120_horas.docx`, Título V caps. I–III — and it defines every operand the first version had marked `[CONFIRMAR]`; what it does not supply is one table and one mapping, which is a much sharper statement and is now dependency 62. Second, **the Riesgo tab is cut** (M5-11): the prediction service is unauthenticated on both routes, cannot name a SIGEDA alumno, runs over a script-seeded dataset and mislabels its own figures, so M5 shows no risk and asks nothing of that team. Its ten criteria, four texts and two tasks went with it; the analysis stayed, in §17.6.

### 17.1 Backend state

Re-read from source: `sigeda-back` branch `main`, commit **`ec2b0dd`** (the commit M1, M2 and M4 were read from) and `sigeda_chat_status` branch `feat/migracion-sigeda-back`, commit **`15b4e86`** (M3's commit). Nothing was built or run and neither database was reachable, so **no statement here is verified live**. The research note is `.superpowers/notas/investigacion/m5-contrato-backend.md`; its gap numbering (1–18) is reused below. Java paths are relative to `src/main/java/com/sigeda/backend/`, `.sql` to `src/main/resources/`; `sigeda_chat_status` paths to that repo's root.

**The institutional source was read for this addendum, and it changed the design.** `PDI_EA-510_2023_120_horas.docx` (Título V capítulos I–III for the indices, Título III capítulo I for the periodic exams and the subsanaciones, Título IV for the causales) **defines all ten formulas and all their operands**, not just the four the spec's §3.4 already quoted. The first version of §17 asserted that the operands were undefined in any source; that was wrong, and it was wrong because nobody opened the document. What the PDI genuinely does not supply is **one table and one mapping**, both enumerated in `docs/contrato-api-seguimiento.md` §3.3. Its companion workbook, `PCPH 2024xlsx.xlsx`, was also opened: sixteen sheets of per-subfase grading forms, **316 shared strings, none containing "coef"** and none naming `NSF`, `NMI`, `NFAD`, `NFOH` or `NFOA`.

M5 is the only milestone whose subject is split in three: the **practical half largely exists**, the **arithmetic half exists nowhere**, and the **risk half exists in the other repo and is unusable** — which is why §17.6 cuts it.

**What exists and M5 reads as-is.**

| Surface | Route | `@PreAuthorize` | Shape |
|---|---|---|---|
| Alumnos of every grupo of a programa | `GET /api/grupos/programa/{nombre}` | `View All Groups` (`grupo/controllers/GrupoController.java:123-125`) | `Page<CatalogoByPrograma>`, each element exposing **only** `personas` (`projections/CatalogoByPrograma.java:7`, in the **root** `projections/` package). `idGrupo` and `estado` are on its nested `Alumno` interface (`:9-14`), which extends `projections/NombreAlumno.java:3-12` for `codigo`, `nombre`, `aPaterno` and `aMaterno` |
| Alumnos an instructor has flown with | `GET /api/grupos/instructor/{cod}/programa/{nombre}` | `View My Group` (`:154-156`) | `Page<CatalogoByAlumnoTurno>` = `{persona: [...]}` over the same nested projection (`projections/CatalogoByAlumnoTurno.java:7-9`) |
| Evaluation history per alumno | `GET /api/evaluaciones/filter/persona/{cod}` | `Read` (`evaluacion/controllers/EvaluacionController.java:125-127`) | `Page<EvalByAlumno>` = `{codigo, nombre, fase, evaluador, fecha, alumno, promedio, clasificacion}` (`evaluacion/projections/EvalByAlumno.java:5-21`) |
| One evaluation | `GET /api/evaluaciones/{cod}` | `Read` (`:194-196`) | the full `EvaluacionPractica` with `calificaciones[]`, `estadoAlumno` and `codEvalPrevia` (`evaluacion/entities/EvaluacionPractica.java:24-49`) |
| Subfase promedios | `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` | `Read` (`:84-85`) | `List<PuntajeSubfase>` = `[{codigo, promedio}]`, filtered to `Ponderada` + `Chequeo Sub Fase` (`evaluacion/services/EvaluacionServiceImpl.java:33-36`). **No MSW handler existed** |
| Subfase report | `GET /api/evaluaciones/subfase/{id}/persona/{cod}` | `Read` (`:102-103`) | `{cabecera, maniobras, notas}` assembled in the controller (`:117-120`) | 
| Alumno detail | `GET /api/personas/{cod}/alumno` | `Read` (`grupo/controllers/PersonaController.java:174-176`) | `DetallePersona` = `{dni, nombre, APaterno, AMaterno, rango, estado, usuario{nombre, correo}}` (`grupo/projections/DetallePersona.java:5-20`). **No MSW handler existed** |
| Failed flights per alumno | `GET /api/desaprobados/persona/{codPersona}` | `View Disapproved` (`evaluacion/controllers/DesaprobadoController.java:38-39`) | `List<Desaprobado>` = `{codigo, clasificacion, subfase, fecha, programa, idSubfase}`; `persona` is `@JsonBackReference` (`evaluacion/entities/Desaprobado.java:49-52`) |
| Turnos of an alumno | `GET /api/turnos/alumno?codAlumno=` | `Read` (`turno/controllers/TurnoController.java:112-114`) | `Page<TurnoRealizado>` — which still projects `getCantGrupo()` (`turno/projections/TurnoRealizado.java:19`) against a `Turno` whose column is `cant_alumno` (`schema_prod.sql:281`). Dependency 12 |

**Three of those eight have no MSW handler at all**, which the first version of this addendum missed: `GET /api/personas/{cod}/alumno`, the subfase report and the subfase promedios are documented in `contrato-api-turnos.md` §2.1, §2.2 and §4.x from M1 and nothing in `src/mocks/` serves them. Three M5 criteria were therefore untestable as written; contract §9.9 fixes them.

**What does not exist, at all.** A case-insensitive grep over `sigeda-back/src/main` for `nfpi|\bnit\b|\bnia\b|merito|mérito|ranking|legajo|nfad|nfoh|nfoa|coeficiente` returns **zero lines**, and so does a grep for `materia`. No entity, column, service, projection or endpoint computes any weighted index of the PDI or any cross-alumno figure, **and there is no `materias` table either** — which matters for the arithmetic: dependency 8's theory half has no catalogue to weight. Dependency 8 is untouched.

- **The only practical arithmetic in the backend is per evaluation.** `evaluacion/utils/CalculoNota.java` counts grade transitions (`:16-36`), derives the `clasificacion` (`:38-45`), maps it to base points **12 · 15 · 17 · 20** (`:47-61`), applies `−0.5·subR + 0.6·(postR + postB)` unless Malo (`:63-68`) and writes the result with `String.format("%.1f", total)` (`:79-86`). It is invoked for `Ponderada` and `Chequeo Sub Fase` only (`EvaluacionController.java:291-292,379-380`). So `promedio` is **not** an average of grades, and because the floor is 12 for any scored evaluation, the effective range is **12–20**.
- **The backend and the PDI disagree about two things in that arithmetic.** The PDI fixes the mission base at **17.50** (`pdi:565`) where `CalculoNota` uses **17**, and the PDI's third "VUELO MALO" condition — «cuando por tercera misión consecutiva no alcance el rendimiento estándar requerido en la misma tarea» (`pdi:591`) — is not implemented. Spec §2 already resolves the conflict in the code's favour, so every index computed from `promedio` inherits the 17.
- **`promedio` is text.** `evaluaciones_practicas.promedio varchar(255)` (`schema_prod.sql:176`). Ordering or averaging it in SQL is lexicographic without a cast (gap 14).
- **`fase` is a denormalised free string** (`schema_prod.sql:173`) and the three names are hardcoded in the entity (`EvaluacionPractica.java:239-246`). They match the seed's three `fases` rows (`data_prod.sql:1-4`) and their initials are exactly NFAD · NFOH · NFOA — but nothing joins them to `fases`.
- **`contD` is never incremented** (`EvaluacionController.java:242,292,346,380`), so `CalculoNota.validarPuntaje`'s "all demostrativas → 20.0" branch (`:79-86`) is dead. Dependency 18.
- **The eleven materia coefficients are the PDI's, and nothing stores them.** `pdi:633-669` publishes them and they sum to exactly 1.00. They exist today only in MSW (`src/mocks/sigeda/datos.ts:171-183`) and in `contrato-api-matricula.md:795`, where M2 froze them against the mocks; they reach the server with dependencies 6 and 53. The first version of this addendum called them "the eleven seeded coefficients", which was false and circular — M2's materias CRUD shipped contract-first against MSW only.
- **No cross-alumno surface exists.** Desaprobados, evaluations and both report endpoints are keyed by a single persona; the only multi-alumno routes are the group catalogues and none carries a promedio (gap 7).

**The state machine M5 displays, and the gate the first version of this addendum missed.** `ResultadoController.saveAll` (`evaluacion/controllers/ResultadoController.java:33-96`) is the only place state and counters move, and **its whole first block is gated on `if (eval.esPonderada() && alumno.esApto())` (`:35`)**, where `Persona.esApto()` delegates to `Estado.esApto`, which is strictly `"Apto"` (`grupo/entities/Estado.java:26-28`). Both `desaprobadoService.save` calls (`:39`, `:44`) and the chequeo transition (`:47-48`) sit inside it. So **for an alumno who is no longer `Apto`, a Ponderada Malo opens no Desaprobado, moves no counter and triggers nothing.** The criteria themselves are `evaluacion/utils/TurnoDesaprobado.java`: `comprobarCriterio1` = `3M · 2M+2R · 1M+4R · 6R` (`:16-21`, matching `pdi:748-752`), `comprobarCriterio2` = `2M · 1M+2R · 4R` (`:24-28`, matching `pdi:780-783`), with a `Regular` counting only when `contRegular` is 0 or even (`:8-13`).

**And that last rule is a bug with consequences.** `esRegularAlternado` is the **only** path by which `contRegular` grows (`ResultadoController.java:42-44`, and identically in `updateAll` at `:116-118`), and it returns `true` only when `contRegular` is 0 or even. So `contRegular` rises from 0 to 1 and **never again**: at 1 the check is false, so it is not incremented, so it stays 1. Therefore **four of the six chequeo branches the PDI defines are unreachable** — `2M+2R`, `1M+4R`, `6R`, `1M+2R` and `4R` — and only `3 Malos` (Adaptación, Helitransportadas) and `2 Malos` (Aerotácticas) can ever fire. The comparison is also strict equality (`malos == 3`), which is harmless only because the state moves at exactly 3. New dependency **71**.

**`ChequeoFinal` is written only on a pass, and the write resets the counters.** Its two call sites are `:66-72` (a `Chequeo` with no low grades while the alumno is `En Final`) and `:83-89` (a `Chequeo Sub Fase` with no low grades), and both are immediately followed by `setEstado(Apto)` and **`reiniciarCont()`**, which zeroes all four counters (`grupo/entities/Persona.java:229-236`). So a `chequeos_finales` row means **"chequeo passed"**, never "failed"; a failed chequeo only moves the state (`:74-75`). That is why dependency 65 is a schema change before it is a route, and why the chequeo fixture can derive exactly one row.

**The three security facts M5 is the milestone that surfaces.**

1. **Four of the five `desaprobados` endpoints have no `@PreAuthorize`** (`DesaprobadoController.java:56-57,73-74,91-92,104-105`), including `DELETE /api/desaprobados/{cod}`, which does no existence check and always answers `200 "Desaprobado eliminado con éxito."` (`:91-102` → `utils/Response.java:63-66`). **Any authenticated user, including an Alumno, can delete a failure record.** Dependency 17.
2. **The one guarded endpoint leaks in bulk.** `findByCodPersona` is `findByCodigoContaining` — a `LIKE %cod%` over the **evaluation code**, not an equality on `cod_persona` (`evaluacion/services/DesaprobadoServiceImpl.java:23-25`, `evaluacion/dao/IDesaprobadoDao.java:17-18`) — so any holder of `View Disapproved`, which includes the Instructor (`security/entities/Role.java:27`), dumps every alumno's failures with a one-character path value. The column exists (`schema_prod.sql:147`) and the relation is mapped.
3. **`Create Reports` gates nothing.** A grep for `CREATE_REPORTS` and `Create Reports` over `src/main` returns only its three declarations and the three role sets (`security/entities/Permiso.java:11`, `Permission.java:13`, `Role.java:12,20,27`). Both report endpoints are `Read` (`EvaluacionController.java:84-85,102-104`). It is held by Administrador Web, Comandante and Instructor and **not** by the Jefe de Operaciones (`Role.java:30-34`). Gap 16.

**What the legajo cannot do with what exists.**

- **It cannot link an evaluation to its evaluator.** `EvaluacionPractica.codEvaluador` is `@Transient` (`:41-42`) and `evaluaciones_practicas` has no `cod_evaluador` column (`schema_prod.sql:162-180`), so every read returns `null`; only the display string `evaluador` survives, built as `nombre + " " + aPaterno` (`EvaluacionController.java:304`). Gap 9.
- **The Instructor and the Comandante cannot read the chequeo-trigger counters.** `Persona.contChequeo/contEval/contMalo/contRegular` (`grupo/entities/Persona.java:41-44`, `schema_prod.sql:220-223`) are reachable only through `GET /api/grupos/{id}` (`Manage Groups`, `GrupoController.java:87-89`) or a persona write's 201 body (`Manage Users`), and neither the Instructor (`Role.java:25-29`) nor the Comandante (`:18-23`) holds either. **The Jefe de Operaciones does hold `Manage Groups` (`Role.java:33`)** and also `View My Group`, so he is a Seguimiento role that can already reach them — the first version of this addendum said no Seguimiento role could, which is false for him. Dependency 64 survives on the two narrower grounds: the panel's actual audience cannot, and `GET /api/grupos/{id}` returns the whole `Grupo` entity with all its personas rather than a legajo header, answering 200 with an empty body for a missing id (`:99-100`, dependency 18).
- **It cannot show the chequeo history.** `ChequeoFinal` (`evaluacion/entities/ChequeoFinal.java:9-28`, table `chequeos_finales`, `schema_prod.sql:134-141`) stores **a code and four counters — no date, no result, no type**; it is written and deleted only from `ResultadoController`, a **`@Component` with no `@RequestMapping`** (`:23-24`); and `IChequeoDao` exposes only `findByCodigo` and `deleteByCodigo` (`evaluacion/dao/IChequeoDao.java:7-12`). Gap 10.
- **`DetallePersona` is thin and inconsistently keyed**: no `codigo`, no `tipo`, no `idGrupo`, no counters, and its `getAPaterno`/`getAMaterno` (`DetallePersona.java:11,13`) produce JSON keys that differ from every other persona projection's (`NombreAlumno.java:9,11`). Gap 11.
- **`GET /api/personas/{cod}/status` 404s for five of the seven states, not six.** Every branch falls through to `puedeSerEvaluado()` (`PersonaController.java:209-221`), and that method is `esApto() || estaEnObservacion()` (`grupo/entities/Estado.java:50-52`) — so it answers for `Apto` and `En Observación` and 404s for the other five, discarding categories it already appended. It is also gated by **`Write`** rather than `Read` (`:192-194`). Dependency 58; the first version of this addendum overstated it as "every non-`Apto` alumno".
- **Four of the five seeded subfases have no maniobras.** `maniobras_subfase` (`data_prod.sql:25-36`) links maniobras to subfases 2, 3 and 4 and **never to 1 or 5**, so a subfase report over subfase 1 — where every mock evaluation lived — comes back with `maniobras: []`. That is why contract §9.2 puts M5's new evaluations in subfase 3.

**The seed has no Seguimiento data.** `data_prod.sql` inserts **no row at all** into `desaprobados` or `chequeos_finales`; every persona is `'Apto'` (`:59-69`); the only evaluations are five rows for alumno `555555` (`:177-181`), one of which stores `estado_alumno = 'Chequeo'`, a value **absent from the `Estado` enum**. Only fase 1 (Adaptación) has subfases (`:6-11`) — five of them, all with `id_fase = 1`, and they happen to be exactly the five the PDI weights inside NFAD, **Campos Extraños included**, which is where the PDI puts it. The subfases of NFOH and NFOA do not exist. Gap 17.

**The counters, however, are real and already useful.** The seed's `personas` rows carry `cont_chequeo, cont_eval, cont_malo, cont_regular`, and two of them satisfy `comprobarCriterio1`: `999999` (2 malos, 2 regulares) and `777777` (3 malos). So the chequeo-trigger fixture is derivable from the seed — with one caveat dependency 71 explains: `999999`'s counters describe a state the code cannot actually produce.

**The risk half — `sigeda_chat_status` `/prediction/**`, re-verified at `15b4e86`.** M5 does **not** consume it (M5-11) and asks for no change to it (§17.6 carries the analysis and the cut). The facts, for the record: no global prefix (`src/main.ts:5-22`); two routes, both unguarded and unvalidated (`src/prediction/prediction.controller.ts:10-20`), the list unpaginated (`prediction.service.ts:26-69`); `DevAuthMiddleware` applied to `'*'` setting a fixed user (`src/app.module.ts:24`, `src/common/dev-auth.middleware.ts:5-8`) that **neither route reads**; `studentId` a `@db.Uuid` FK to a `User` keyed only by `email @unique` (`prisma/schema.prisma:56-60,314-320`) while `sigeda-back`'s JWT carries only `sub` (`security/config/JwtUtils.java:31-38`); no writer of `PracticalEvaluation` outside the seed script (`src/prediction/seed-prediction-data.ts:134,173,192`, three fabricated students from `:39`, six invented maniobras `:17-24`); `currentAverage` the **last** score, not a mean (`prediction.service.ts:86-87,197`); `classifyScore` cutting at `≥16` and `≥12` on an asserted 0–20 scale (`engine/risk-classifier.ts:11-17,29-33`) against `CalculoNota`'s 12 floor; `insufficientData` below three evaluations (`:16,89-113`); recommendations four rule-based templates, **not LLM output** (`engine/recommendation-engine.ts:27-77`).

**Conventions M5 inherits unchanged.** The error envelope is convention **§A** of `contrato-api-turnos.md` (`utils/Response.java`): validation → 400 bare JSON array of `"'campo': mensaje"` (`:90-93`), missing detail → 404 text `"<Entidad> especificada no existe."` (`:68-71`), empty list → 404 text `"No existen <lista> disponibles."` (`:73-76`), delete → 200 text (`:63-66`, always masculine), forbidden → 403 text (`:78-80`). `409 Conflict` still appears **nowhere** in `src/main/java`; the house status for "invalid in this state" is **410 Gone** via `ActionExpiredException` → `exception/GlobalExceptionHandler.java:131-140`, thrown in exactly three places. Pagination is `utils/Page_Sort.java` (`page=0`, `size=6`, `direction=ASC`, a single `property`, **no size cap**, `:10-12,29-41`). Auth is `Bearer` on everything except `/auth/**` (`security/config/SecurityConfig.java:50-52`) with CORS for `http://localhost:5173` only (`:79`). **And there is still no scheduler:** `grep -rn "@Scheduled\|EnableScheduling\|TaskScheduler" src/main/java` returns nothing (dependency 55), which is why neither of M5's two computed endpoints carries a calculation timestamp.

### 17.2 Decisions

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| M5-1 | **One new contract, `docs/contrato-api-seguimiento.md`, version 1.** It recaps the eight existing endpoints M5 reads (shape and permission only, pointing at `contrato-api-turnos.md` §2 and §4 for their validated detail), specifies the seven new ones, and closes with the fixtures (§9) and dependencies (§10) sections the M2/M3/M4 contracts have. It also picks up the one hand-off `contrato-api-turnos.md:589` left open — `DesaprobadoController`'s four unguarded endpoints and `GET /api/subfases/assigned`, declared "fuera de alcance de este contrato (M5)" — and specifies their `@PreAuthorize` from scratch. Its §8 is the **only** section that specifies nothing: it records why M5 does not consume the prediction service, which `contrato-api-aprendizaje.md:428-434` had reserved for M5. | A finished contract deferred a section to this one, so leaving it unwritten would mean dependency 17 has no contract text anywhere. And a reader asking "where is the risk panel?" deserves the answer next to the milestone that dropped it, not in a progress note. | A reader of the M3 contract does not learn that M5 declined the two routes it reserved; the cross-reference in §8 is the mitigation. |
| M5-2 | **The arithmetic is the server's. M5 derives no index of the PDI.** The ten formulas and their operands are **sourced from the PDI** in contract §3.2 (`NFPI`, `NIT`, `NCT`, `NA`, `NEI`, `NIA`, `NFAD`, `NFOH`, `NFOA`, `NSF`), specified **contract-first** behind dependency 8, the panels that show them are gated (M5-22), and the frontend never computes, re-computes or back-fills one. Live, with 8 unresolved, the legajo's índices panel shows S15 and the orden de mérito shows S26. | Spec §2 rules that grades are computed by the backend only, and CA-EVA-07 already forbids the frontend recomputing the one figure the server *does* produce. And the reason is now stronger than "the operands are undefined", which is what the first version of this addendum wrongly claimed: the operands **are** defined, and they need data the client cannot reach — `NSF` weights every mission by a coefficient the PDI promises and does not publish (contract §3.3 ítem 1), `NFAD`/`NFOH`/`NFOA` weight every subfase by published weights the backend does not store, and `NCT` weights eleven asignaturas whose table does not exist in `sigeda-back` at all. A client-side NIA would have to invent a coefficient per mission. | **If the user prefers frontend-derived figures:** spec §2 and the spirit of CA-EVA-07 have to be amended in writing; every figure must carry an "estimado" label; and the client would have to invent the per-mission coefficients that the norm itself is missing — which is not a shortcut, it is fabricating an institutional weighting. The orden de mérito would additionally cost one request per alumno (the list endpoint is keyed by persona, `EvaluacionController.java:125-127`) over a `varchar` column. Reversing M5-2 is a plan change, not an edit. |
| M5-3 | **Dependency 8 is split into 61, 62 and 63, and 8 stays the umbrella.** 61 is `GET /api/personas/{cod}/indices` (the indices with a breakdown that goes down to the subfase), 63 is `GET /api/reportes/orden-merito`, and 62 is the prerequisite neither can skip: `promedio` becomes numeric, `fase` gains an FK, **and the institution supplies the subfase weights and the per-mission coefficient table**. | 8 as written reads like one feature and is two endpoints, a ranking with a tie-break, a column type and two missing datasets. Splitting it is what 53 and 54 did for 6, and it lets `VITE_DEPENDENCIAS_RESUELTAS` turn on the legajo's panel without the report screen. Putting the missing data inside 62 rather than inventing a dependency for it keeps the blocker where the blocked work is. | Three numbers instead of one in `dependencias.ts` and in the contract's §10. |
| M5-4 | **Exactly one figure is Derived, and it is not an index.** The legajo's subfase panel shows the promedios `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` returns **and their simple arithmetic mean**, under the fixed text S9, which states in the interface that it is a plain mean of the Ponderada and Chequeo Sub Fase evaluations of that subfase and **is not the PDI's `NSF`, which weights each mission by its coefficient**. Nothing else in M5 is computed in the browser except counts. | That endpoint returns the list and never averages it (`EvaluacionServiceImpl.java:33-36`), the instructor's first question about a subfase is "how is he doing overall", and a mean of numbers the server itself produced, labelled as what it is, invents no institutional rule. Naming `NSF` in the label — rather than vaguely denying it is "an index" — is what stops the number being read as the thing it most resembles. | If even that is too much, one panel loses one row and S9 is retired. |
| M5-5 | **Escuadrón is gated by `View My Group`, and `View All Groups` is a capability switch inside it.** `Pantalla` carries a single optional `permiso` (`src/lib/auth/pantallas.ts:55-66`), so "either of two" is not representable — but it does not have to be: every role that holds `View All Groups` also holds `View My Group` (`security/entities/Role.java:13-14,21-22,28,32`), so the single gate admits exactly the union §6 wrote as a slash. Inside the screen, `View All Groups` chooses `GET /api/grupos/programa/{nombre}` and its absence chooses `GET /api/grupos/instructor/{cod}/programa/{nombre}`. | It is M4-6's precedent (the `Manage Groups` branch inside the grupo catalogue) applied to the two catalogues that already exist, and it avoids widening the registry type for one screen. | The Jefe de Operaciones holds `View My Group` without being an instructor, so his instructor-scoped call returns the alumnos of turnos where **he** is `codInstructor` — usually none. He sees S2, which names the reason. If the squadron wants him to see everything, he gains `View All Groups` in `permisos.ts`. |
| M5-6 | **Seguimiento reads the two catalogues itself; `listarAlumnos` cannot be reused.** `src/features/catalogos/api.ts` fetches `estado` (`:23`, `AlumnoConGrupo`) and then **throws it away**: `aOpcion` (`:73-75`) keeps only `codigo`, `nombreCompleto` and a `Grupo {idGrupo}` string. `OpcionAlumno` is a picker option consumed by M1's and M4's forms, and widening it would push Seguimiento's columns into them. So `src/features/seguimiento/api.ts` gets `listarSeguimiento`, over the same two routes, keeping `estado` and `idGrupo` as fields; it reuses `nombreCompleto` (`:27-29`) and the de-duplication idea of `sinRepetidos` (`:77-84`) but **not** `fuenteDeAlumnos` (`:66-71`), whose ladder is `View All Groups` → `'todos'`, then `Manage Shifts` → `'programacion'`, then `View My Group` → `'instructor'`: a Jefe de Operaciones holds `Manage Shifts` and therefore matches the **middle** rung, which routes him to `/api/alumnos/programa/{nombre}`, a shape (`grupo/projections/GrupoByPrograma.java:9-14`) that carries **no `estado`**. Seguimiento needs a two-rung ladder over the only two routes that carry it. It also **pages to `totalPages`** like `listarSubfases` (`:41-49`) instead of asking for a single `size=100`, because the instructor route pages over `alumnos_turno` rows — one per (alumno, turno) (`grupo/services/GrupoServiceImpl.java:78-79` → `turno/dao/IAlumno_TurnoDao.java:24-25`). | The research note said M5 could reuse `listarAlumnos`; reading the adapter shows it cannot, because `estado` — the single most important Seguimiento fact and the only one that is genuinely Real — does not survive it, and the permission ladder sends one of the four roles to a route that never had it. `Page_Sort` has no size cap (`utils/Page_Sort.java:29-41`), so paging is a choice, not a constraint. | One more reader over two endpoints already covered by mocks, and two query keys instead of one. If the pickers ever need `estado` too, the shared shape moves to `catalogos/`. |
| M5-7 | **Alertas is Contract, not "Real + Contract": this revises §6.** The screen is one new endpoint, `GET /api/seguimiento/alertas` (dependency 66). The Real per-alumno path stays where it belongs — the legajo's desaprobados panel, one request for one alumno — and Alertas says so with S8 when 66 is unresolved. | §6's "Real + Contract" assumed the five `desaprobados` endpoints could serve a squadron view. They cannot: they are all keyed by one persona, the catalogue that would drive the loop carries no grupo identity, and the "cheap" version of the loop is the security hole itself. N+1 over N+1 is not an implementation. | The whole screen is mock-only until 66 lands. Saying so in §6's own table is better than shipping a loop and calling it Real. |
| M5-8 | **The `desaprobados` hole is surfaced, never exploited.** `src/features/seguimiento/api.ts` refuses a `codPersona` that is not exactly six characters before building the URL, M5 calls **none** of the four unguarded endpoints (`DesaprobadoController.java:56-57,73-74,91-92,104-105`), and the contract states the fix as an equality on `cod_persona` inside dependency 66. | The bulk leak is reachable with a one-character path value and the milestone whose subject is failure data is the one that must not normalise it. A six-character guard in the API layer is one line and it is the layer that already owns `codPersona` (M4-2's posture). | None. The guard rejects nothing a legitimate screen sends. The four endpoints and `GET /api/subfases/assigned` get their `@PreAuthorize` written down for the first time, which is work for Victor that no contract had yet asked for. |
| M5-9 | **The legajo is three tabs over ten panels, and the panel table of §17.3 is normative.** Tabs: **Resumen · Práctico · Teórico**, the active tab persisted in the URL. Each panel names its source, its dependency, its permission and its own failure: a panel whose request fails shows its own notice with Reintentar and does **not** take the screen down; a panel whose dependency is unresolved shows its own text instead of an empty state; and a panel the caller's role cannot read is **not requested at all**. | Ten sources across one server, of which four are Real, six are Contract and one of the four Real ones is broken, cannot share one loading state or one error state without lying about at least one of them. And the permission column is not decoration: `GET /api/desaprobados/persona/{cod}` needs `View Disapproved`, which **neither the Alumno nor the Jefe de Operaciones holds** (`Role.java:30-37`), so without it `/mi-legajo` would render a 403 inside a panel this addendum calls Real. | The screen is the milestone's biggest and carries the most criteria; §17.6 names the two places to merge first if the plan overruns. |
| M5-10 | **The alumno reaches their own legajo through `/mi-legajo`, which redirects to `/seguimiento/{codPersona}`.** The rule is stated per role: **for the Alumno**, the API layer takes `codPersona` from the session and **never** from a route parameter, and the route loader rejects a route value that is not his own — as M1 does for `/mis-turnos` and `/mis-evaluaciones`; **for the four staff roles**, the route value is used as given, because they are entitled to read any alumno, and what limits them is the per-panel permission of M5-9. Dependency 20 remains the server-side half for both. | An Alumno holds `Read` and `Update` (`Role.java:35-37`), so gating `/seguimiento/$alumno` on `Read` is the only option §6 leaves, and without a parameterless entry point he would have to know his own code. Stating the rule once for all roles would be wrong in one direction or the other: a staff loader that rejected foreign codes would break the whole screen. | Until dependency 20 lands, a hand-written request still reads another alumno's history — the exposure M1 already documents. One more route in the registry. |
| M5-11 | **Risk is not surfaced in M5 at all.** The Riesgo tab, its criteria, its texts, its feature folder and its mock are cut, and **no dependency is requested of the AI backend**. `GET /prediction/students/{studentId}` is not called and neither is `GET /prediction/students`. Contract §8 records the analysis instead of a specification. | Five independent blockers, each verified in source and none of them ours to fix on this milestone: neither route authenticates or scopes (`prediction.controller.ts:10-20`; `dev-auth.middleware.ts:5-8` sets a fixed user that neither route reads); a SIGEDA alumno cannot be named, because `studentId` is a `@db.Uuid` to a `User` keyed only by `email` while the JWT carries only `sub`; the data is synthetic and written by a script, not by the application (`seed-prediction-data.ts:134,173,192`); `currentAverage` is the last score, not a mean (`prediction.service.ts:86`); and the risk bands cut at 16 and 12 against a real scale whose floor is 12, so `deficiente` is unreachable and `regular` covers 12–15.99. A tab that shows another cohort's synthetic trend under a real alumno's name is worse than no tab. | **The thesis loses its only predictive-AI surface**, which is a real cost to its narrative and is the reason this was the last thing cut rather than the first. The analysis survives in §17.6 so the work is not lost, and the service is one dependency (49) plus a real-data feed (9) away from being worth a tab. |
| M5-12 | **What would have to be true before risk is surfaced, written down now so it is not re-litigated from memory.** In order: dependency **49** first (scope, validate and paginate `/prediction/**`), then dependency **9**'s M5 half (predict over SIGEDA's real evaluations), then the id mapping and a recalibration of `classifyScore` against the real 12–20 range, and only then a panel — which must still label the service's `currentAverage` as the **last** grade and must not print `currentClassification`, whose three values would collide with the four of `Clasificacion` the same screen shows. **And the order is not arbitrary:** making the route addressable by a six-digit `Persona.codigo` **before** 49 would turn it from "guess a UUID" into **trivially enumerable** — `111111`, `222222`, `333333` — on a service that does not authenticate. That is why the previous version's dependency 69 is withdrawn rather than left standing as a request. | The previous version asked for the id mapping and the recalibration as one dependency and put the scoping fix (49) beside it as an equal. That ordering was a latent security regression, and it is exactly the kind of thing that gets granted piecemeal by whoever picks the service up. Writing the sequence down costs one paragraph. | None to M5. If the user reinstates the tab later, the sequence is the plan. |
| M5-13 | **The chequeo panel displays the cycle; it never recomputes a transition.** It shows the four counters, which criterion applies for the alumno's current fase, whether that criterion is already met, the alternating-Regular rule, **whether the counters can still move at all**, the chain of evaluations through `codEvalPrevia`, the state snapshotted on each evaluation in `estadoAlumno`, and the chequeo history. It states in S12 that the state change is the server's, at the next evaluation. | The transitions live in one place (`ResultadoController`) and duplicating them client-side would produce two answers to "is he in chequeo". The "can the counters still move" field is what stops the panel lying: `ResultadoController.java:35` gates the whole counter block on `alumno.esApto()`, so for `777777` — criterion met, state already `En Chequeo` — the counters are frozen, and a panel that said "criterio cumplido" beside frozen counters without explaining why would send the instructor looking for a bug. | The panel needs `contChequeo`/`contMalo`/`contRegular` (dependency 64) and the history (dependency 65), so it is Contract. `ChequeoFinal` stores only a code and four counters, is written **only on a pass**, and the write is followed by `reiniciarCont()` (`Persona.java:229-236`) — so a row means "passed" and a failed chequeo leaves no trace. Dependency 65 is a schema change plus new writes, not a route. |
| M5-14 | **`causales[]` returns with seven codes, all of them the PDI's, and the reconciliation runs through the periodicity table.** Contract §5.1 takes them from `pdi:738-745`: `PROMEDIO_ASIGNATURA` (`NA < 13`), `TRES_ASIGNATURAS`, `DOS_EXAMENES`, `SEGUNDA_SUBSANACION`, `PERIODICOS_CRITICOS`, `PERIODICOS_GENERALES` and `INOPINADOS`. The two "periódicos" codes count **across a group of asignaturas, not per asignatura** — the PDI says «(cualquiera de ellos)» — and the group's members map onto the eleven-asignatura catalogue as **(asignatura, `tipoExamen`)** pairs using the periodicity table (`pdi:527-547`), so Emergencias Críticas and No Críticas are told apart by their cadence (`SEMANAL` vs `QUINCENAL`) without inventing a materia. | M4's seven codes named asignaturas that do not exist; the first version of this addendum collapsed them into one code keyed by `idMateria`, and **that was also wrong**, because per-materia counting never fires a rule the PDI defines across a group: three failures split between Emergencias and Límites trigger the causal and per-materia counting would miss them. The periodicity table is the bridge nobody had used. | **One genuine gap remains:** «Instrumentos», which the PDI evaluates semestrally (`pdi:540`) and names in the causal (`:744`), is not among the eleven asignaturas. Either the catalogue gains it — an insert on the Materias screen M2 shipped — or `PERIODICOS_GENERALES` counts without it and the contract says so. |
| M5-15 | **The alumno's theory history returns (§16.6 item 1) and states the "prevalece la primera nota" rule correctly.** `GET /api/cuestionarios?codAlumno=&idMateria=&estado=` (dependency 67) feeds the legajo's Teórico tab, carrying `idTurnoOrigen` backwards and `subsanadoPor` forwards so both grades sit side by side; S17 says that **the first grade is the one that counts and enters the average, and the subsanación lifts the flying block and stands as evidence**. | The PDI says it three times — `pdi:554`, `:683`, `:687`: «prevaleciendo la primera nota para el cómputo de la Nota Final de la Instrucción en Tierra». The first version of this addendum asserted the opposite as fixed interface text ("las dos cuentan en el promedio") and cited `contrato-api-teoria.md:679` as authority, which is the line that **defers** the question to M5. A wrong sentence in a fixed text is worse than a missing one, because it ships. | One endpoint and one panel. If the institution decides the subsanación *does* replace the grade, the rule moves into dependency 61's NIT and the panel keeps both rows as evidence. |
| M5-16 | **Bulk `estado-teorico` is implemented (dependency 56, §16.6 item 4) for Escuadrón, and the M1 form's switch is deferred.** `GET /api/estado-teorico?codAlumnos=a,b,c` (cap 100) gives Escuadrón its theory-block column in one request. Changing **M1's turno práctico form** from M4-12's one-request-per-row to one request per picker is specified in contract §5.3 as the endpoint's second consumer but is **not built in M5**. | Escuadrón needs the bulk call and is an M5 screen. The form change is an edit to an M1 screen with its own test suite, and with the Riesgo tab cut the milestone spent its slack on the legajo rather than on someone else's form. Specifying it and not building it keeps the endpoint's shape right for whoever does. | M4-12's declared cost stands: a blocked alumno stays selectable in the turno form until somebody adds the row. A failed bulk call leaves the state **unknown** on Escuadrón — the column shows S5 and no row is hidden — exactly as M4-12 ruled for the form. |
| M5-17 | **Inasistencias stay deferred in the frontend but become a server dependency (70), and it is wider than the first version said.** `pdi:558` and `:685` both apply the 50 % reduction to **«un test o examen»** without restricting it to the periodic ones, so it affects `PT`, `PE`, and therefore `NA` and `NCT`, as well as `NEI`. Dependency 70 records the endpoint, the `inasistencia_justificada` column and the reduction as a **server** obligation; no M5 screen writes it. | Implementing a write on somebody else's screen to serve a figure the server computes would put the rule in two places. Naming the gap in the contract keeps the figure honest: `NIT` arrives reduced or it does not, and Victor knows which. | Until 70 lands, **no grade is reduced anywhere**, so `NIT` is optimistic for any alumno who missed a test or an exam — not just a periodic one. The legajo cannot tell, and `reduccionPorRezagadoAplicada: false` says so on the wire. |
| M5-18 | **The theory-turno overlap stays deferred (§16.6 item 5), with dependency 15 as its home.** | There is still no precedent: `HorasInicioFin` is never called even for practical turnos (dependency 15), so a theory overlap rule arriving alone would be the only schedule check in the system. | Two theory turnos of one grupo can still overlap. No M5 screen shows or causes it. |
| M5-19 | **`Create Reports` stays as `Role.java` has it, and the fact that it gates nothing is written down.** `/reportes` is gated by `Create Reports` exactly as §6 says; the contract states that the permission occurs nowhere outside `security/entities/` and that both existing report endpoints are `Read`, so the gate is **presentational** until dependency 63 applies it server-side. The Jefe de Operaciones does not hold it (`Role.java:30-34`) and therefore does not see the screen — **flagged for the user, not silently redistributed.** | Redistributing a permission changes `Role.java`, `permisos.ts`, a published contract and a matrix, for one screen's visibility; M4-14 took the same line. And a gate the reader might assume is enforced has to be labelled. | The officer who programs the flights cannot open the orden de mérito. If that is wrong, `CREATE_REPORTS` joins `Role.Operaciones` — a code change and a redeploy on the backend, per gap 2. |
| M5-20 | **Two feature folders, by which endpoints they talk to:** `src/features/seguimiento/` (Escuadrón, Alertas, Legajo — the `sigeda-back` Seguimiento surfaces) and `src/features/reportes/` (índices and orden de mérito — the dependency-8 surfaces). Domain helpers go to `src/lib/dominio/seguimiento.ts`: the chequeo criteria and their labels, the seven causal codes with their groups and labels, the five alert types with their severities, and the index labels with their formulas as **display text only**. | Continues M2's and M4-13's ruling over §4.1's single `seguimiento/` folder, and the split is not cosmetic: `reportes/` is the only folder entirely behind dependency 8. `src/features/riesgo/` is not created — the third folder the previous version planned went with the Riesgo tab. | Two folders instead of one. The legajo imports from both, which is what a legajo is. |
| M5-21 | **Mocks: eight handlers, and three of them are endpoints that were never mocked at all.** `src/mocks/sigeda/` gains `seguimiento.ts`, `desaprobados.ts`, `indices.ts`, `chequeos.ts`, `cuestionarios-historial.ts`, **`alumnos.ts`** and **`reportes-subfase.ts`**, and `estado-teorico.ts` is widened. `PersonaMock` (`src/mocks/sigeda/datos.ts:14-26`) gains `contChequeo`, `contMalo` and `contRegular` with the seed's own values — today it carries only `contEval` and the projections hardcode zeros (`personas.ts:50-56`, `grupos.ts:26-32`). **Grupo 6 is renamed «Promoción 2026-A»**, which costs two existing assertions. **The desaprobados fixture is derived** by `ResultadoController`'s real rule — including the `alumno.esApto()` gate — replayed from zero in `fecha` order. **The chequeo fixture derives exactly one row.** **The índices fixture is stated, not derived**, and the contract says why. | Three criteria were untestable because their endpoints had no handler; that is the single biggest correction to this addendum. The counters had to be real because the chequeo rule reads them and the mock's zeros contradicted the seed. The grupo rename is what makes S4 falsifiable: with every grupo literally named `Grupo {id}`, a label derived from the id is indistinguishable from the real name and CA-SEG-04 could never fail. And the indices cannot be derived — not for want of effort, but because `NSF` needs a coefficient table that does not exist in the norm. | The rename touches `formulario-turno-teorico.test.tsx:90` and `grupos-page.test.tsx:36`. The legajo's history and its indices agree in **ordering** only, and contract §9.5 states that instead of implying a calculation. |
| M5-22 | **Seven dependency gates.** `src/lib/dependencias.ts` gains `verIndices: [61, 62]`, `verOrdenMerito: [6, 62, 63]`, `verAlertas: [66]`, `verCicloChequeo: [64, 65]`, `verHistorialTeorico: [6, 67]`, `verCausalesTeoricos: [7, 68]` and `verBloqueoTeoricoLote: [7, 56]`. `verOrdenMerito` carries **6** because without the theory half no row has an NFPI and every row is unranked, so the screen would be a table of blanks. Each gated panel shows its own text (S8, S13, S15, S16, S26) instead of an empty state, and M5 has no writes, so nothing needs T11. | `sigeda.lista` and `sigeda.pagina` turn a 404 into an empty list and an empty page (`src/lib/api/http.ts:147-154` and `:138-145`), so an endpoint that does not exist yet looks *merely empty* on every Seguimiento panel. Without the gates the milestone's live failure mode is a screen full of "no hay datos", which is the worst possible answer for a screen whose job is to notice that something is wrong. | Seven more entries in one table. In mock mode every dependency counts as resolved (`dependencias.ts:32`). The notice component `src/components/aviso-de-teoria.tsx` **hardcodes** its text (`TEXTO_TEORIA_SOLO_MOCK`, `:3,9`) and takes only an `accion` prop, so M5 renames it to `aviso-de-dependencia.tsx` with `AvisoDeDependencia({ accion, texto })` — the nine theory importers passing E1, each Seguimiento panel passing its own S-text. |
| M5-23 | **One M4 minor is fixed, four stay deferred out of the thesis.** Fixed: the missing debounce becomes a **shared hook** in `src/lib/`, used by Seguimiento's `texto` filter, because CA-SEG-02 requires it. Deferred: applying that hook to `/banco` and `/teoria/turnos`; the hardcoded `'PDI'` programa on `/teoria/turnos` (`turnos-teoricos-page.tsx:54-56`); the **two-tabs-overwrite-one-exam** race, which needs a version token in `contrato-api-teoria.md` §4.3; and **CA-EXA-12's `server.use` override** (`rendir-examen-page.test.tsx:232-243`), a test shortcoming over behaviour that is right and is covered at the mock level (`cuestionarios-teoria.test.ts:93-99`). All four are recorded in `docs/decisiones.md`. | With the Riesgo tab cut the milestone still had no slack for a task of other milestones' cleanups: the honest count was 23 and the ceiling is 20, so the legajo got the slack. The debounce is the one that a new criterion depends on, so it is the one that ships. | The theory list still navigates on every keystroke and still cannot be filtered by programa; an alumno with two tabs on one exam can still lose the older tab's answers, silently. Said out loud in `decisiones.md` rather than left in a progress note. |
| M5-24 | **Escuadrón marks the alumnos whose `estado` is not `Apto`, and that is M5's only live "something is wrong" surface.** The row carries its estado badge — which `ESTADOS_ALUMNO` already styles per state (`src/lib/dominio/vocabulario.ts:20-28`) — plus a marker, S28, on every row whose estado is not `Apto`, and the header summarises how many alumnos sit in each estado. **Zero extra requests and zero dependencies:** `estado` arrives on the same catalogue row the screen already reads (`projections/CatalogoByPrograma.java:9-14`). | With the arithmetic behind dependency 8, Alertas behind 66 and the Riesgo tab cut, a Seguimiento module that works against the live backend today would otherwise show a list of names and nothing else. The estado **is** the institution's own risk signal — it is what `ResultadoController` moves when an alumno accumulates failures — and it is already on the wire. This is the cheapest honest thing in the milestone and the only one that is Real end to end. | None: it is a badge and a count over data already fetched. If the squadron wants the marker to mean something narrower than "not `Apto`", it is one predicate in `src/lib/dominio/seguimiento.ts`. |

### 17.3 Screens

This replaces the §6 M5 table, and it changes it in four places: Escuadrón becomes **Real + Contract** (the theory-block column is dependency 56), Alertas becomes **Contract** (M5-7), `/mi-legajo` is new (M5-10), and the **Predicción de riesgo row is removed** (M5-11). Sidebar group **Seguimiento**, which already exists in the registry and has no screen in it yet (`src/lib/auth/pantallas.ts:40,50`).

| Screen | Route | Permission | `roles` | `enMenu` | Data | Breadcrumb parent |
|---|---|---|---|---|---|---|
| Escuadrón | `/seguimiento` | `View My Group` | — | ✓ | Real + Contract (dep. 56) | — |
| Alertas | `/seguimiento/alertas` | `View Disapproved` | — | ✓ | Contract (deps. 17, 66) | `/seguimiento` |
| Legajo del alumno | `/seguimiento/$alumno` | `Read` | — | | Real + Contract (deps. 8, 61–68) | `/seguimiento` |
| Mi legajo | `/mi-legajo` | `Read` | `SOLO_ALUMNO` | ✓ | — (redirect) | — |
| Reportes y orden de mérito | `/reportes` | `Create Reports` | — | ✓ | Contract (deps. 6, 62, 63) | — |

Escuadrón, Alertas and Reportes declare **no** `roles`, following §16.3's rule that a screen whose permission already limits it does not repeat the limit: `View My Group` is held by exactly the four roles of `PERSONAL` and by no Alumno (`src/lib/auth/permisos.ts:39,58,72,76` against `:77`), and `View Disapproved` and `Create Reports` by three of them. `/seguimiento/$alumno` declares no `roles` either — but for the opposite reason: the Alumno **must** reach it, through `/mi-legajo`, and the route loader is what restricts him to his own (M5-10). Only `/mi-legajo` declares `roles: SOLO_ALUMNO`, because every other role holds `Read` too.

`accesosPara` (`pantallas.ts:540-544`) puts every visible screen without a `$` into Inicio's quick links, so Escuadrón, Alertas, Mi legajo and Reportes appear there too; that is intended. `/seguimiento/$alumno` is excluded by its parameter.

**Registration has no safety net here, and the plan must supply one.** `cobertura-de-rutas.test.ts:18-25` asserts that every `/_app/**` **router route** has a `PANTALLAS` entry, and `:27-36` that every route file calls `exigirPantalla` with a matching path — both directions run **from the route file inwards**. A `PANTALLAS` entry with no route, or a screen nobody registered at all, passes. So the registry task owns its own assertion: the five M5 keys exist, each has the route, permission, `roles`, `padre` and `enMenu` this table states, and `rutas-m5.test.tsx` covers who reaches each one. The first version of this addendum claimed the existing coverage test would fail until the screens were registered; it asserts the inverse.

**Search params**, all zod-validated with `.default().catch()` like every other list, reusing `esquemaPaginacion` (`src/lib/busqueda.ts:3-8`): `/seguimiento?programa=&idGrupo=&estado=&texto=&page=&size=&property=&direction=`; `/seguimiento/alertas?programa=&idGrupo=&tipo=&fechaPre=&fechaPost=&page=&size=&property=&direction=`; `/seguimiento/$alumno?tab=&idSubfase=&clasificacion=&page=&size=`; `/reportes?programa=&idGrupo=&page=&size=`. `tab` is `z.enum(['resumen','practico','teorico']).default('resumen').catch('resumen')`. `/mi-legajo` has none.

**Pages, dialogs and in-place surfaces.** The five routes are pages; M5 has **no mutation and therefore no dialog, no confirm and no toast** — it is the only read-only milestone. Everything else is in place: the legajo's three tabs, its subfase picker, and the escuadrón's estado summary.

**The legajo's panels.** This table is normative; each panel owns its own loading state, its own `errorDePrimeraCarga` notice (`src/lib/query.ts:21-23`), its own dependency text and its own permission.

| Tab | Panel | Source | Permission | Data |
|---|---|---|---|---|
| Resumen | Cabecera: identidad, rango, tipo, estado, grupo, cuenta | `GET /api/personas/{cod}/alumno` + `GET /api/personas/{cod}/legajo` | `Read` | Real, widened by dep. 64 |
| Resumen | Índices: NFPI with its NIT and NIA halves, down to the subfase | `GET /api/personas/{cod}/indices` | `Read` | Contract (deps. 61, 62) |
| Resumen | Estado teórico y causales | `GET /api/personas/{cod}/estado-teorico` | `Read` | Contract (deps. 7, 68) |
| Práctico | Historial de evaluaciones | `GET /api/evaluaciones/filter/persona/{cod}` | `Read` | **Real** |
| Práctico | Reporte de subfase (cabecera · maniobras · notas) | `GET /api/evaluaciones/subfase/{id}/persona/{cod}` | `Read` | **Real** — no MSW handler until M5 |
| Práctico | Promedios de la subfase y su media simple (S9) | `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` | `Read` | **Real** + Derived (M5-4) — no MSW handler until M5 |
| Práctico | Vuelos desaprobados | `GET /api/desaprobados/persona/{cod}` | **`View Disapproved`** | **Real**, with the equality fix of dep. 66 |
| Práctico | Turnos realizados | `GET /api/turnos/alumno?codAlumno=` | `Read` | Real but broken (dep. 12) — S11 |
| Práctico | Ciclo de chequeo: contadores, criterio, historial | `GET /api/personas/{cod}/legajo` + `GET /api/personas/{cod}/chequeos` | `Read` | Contract (deps. 64, 65) |
| Teórico | Historial de exámenes, con la subsanación y su origen (S17) | `GET /api/cuestionarios?codAlumno=` | `Read` | Contract (deps. 6, 67) |

Four panels are genuinely Real against `ec2b0dd`, and **three of the four had no MSW handler at all** before M5 (contract §9.9). The **desaprobados panel is the only one with its own permission**: `View Disapproved` is held by Administrador Web, Comandante and Instructor and **not** by the Alumno or the Jefe de Operaciones (`permisos.ts:38,57,71` against `:76-77`), so for those two roles the panel is **not requested and not rendered**, and on an alumno's own legajo S29 takes its place.

Who sees what (`src/lib/auth/permisos.ts:28-78`; all four are `PERMISOS_BACKEND`, so nothing new is invented):

| Permission | Administrador Web | Comandante de Escuadrón | Jefe de Operaciones | Instructor | Alumno |
|---|---|---|---|---|---|
| `View My Group` (Escuadrón) | ✓ | ✓ | ✓ | ✓ | |
| `View All Groups` (switch inside Escuadrón) | ✓ | ✓ | | | |
| `View Disapproved` (Alertas, desaprobados panel) | ✓ | ✓ | | ✓ | |
| `Create Reports` (`/reportes`) | ✓ | ✓ | | ✓ | |
| `Read` (Legajo, Mi legajo) | ✓ | ✓ | ✓ | ✓ | ✓ (own only) |

So the Comandante finally gets the theory-plus-practical view §16.6 item 6 promised him, and the Jefe de Operaciones sees the Escuadrón but neither the Alertas, nor the orden de mérito, nor the desaprobados panel — recorded, not corrected (M5-19).

**Fixed interface texts** (the CAs cite these IDs; the contract's own messages are `D1`–`D18` in `docs/contrato-api-seguimiento.md` §7). The prefix is **S**, continuing the per-addendum convention (M2 = `T`, M3 = `A`, M4 = `E`).

| ID | Where | Text |
|---|---|---|
| S1 | Header of Escuadrón, Legajo and Reportes, live mode with dependency 8 pending | Los índices del PDI y el orden de mérito todavía no existen en el servidor: se muestran solo en modo mock. |
| S2 | Escuadrón, caller with `View My Group` and no alumnos | No tiene alumnos asignados en este programa: aparecen aquí cuando haya volado un turno con ellos. |
| S3 | Escuadrón and Legajo, alumno without grupo | Sin grupo |
| S4 | Escuadrón, grupo column when only the id is known | Grupo {idGrupo} |
| S5 | Escuadrón, estado teórico column unavailable | No se pudo comprobar el estado teórico de estos alumnos. |
| S6 | Escuadrón, empty state | Todavía no hay alumnos en este programa. |
| S7 | Alertas, empty state | No hay alertas abiertas en los grupos que usted ve. |
| S8 | Alertas, live mode with dependency 66 pending | El listado de alertas del escuadrón todavía no existe en el servidor. Consulte los vuelos desaprobados de cada alumno en su legajo. |
| S9 | Legajo, above the subfase promedios | Promedio simple de las evaluaciones Ponderada y Chequeo Sub Fase de esta subfase. No es la nota de sub fase del PDI, que pondera cada misión por su coeficiente. |
| S10 | Legajo, beside the evaluador of an evaluation | El servidor guarda el nombre del evaluador, no su código. |
| S11 | Legajo, turnos panel | La cantidad de alumnos del turno no está disponible: el servidor informa otro campo. |
| S12 | Legajo, chequeo panel, criterion already met | Alcanzó el criterio de chequeo de {fase}: {detalle}. {consecuencia} |
| S13 | Legajo, chequeo panel, live mode with dependencies 64 o 65 pending | El historial de chequeos y los contadores todavía no existen en el servidor. |
| S14 | Legajo and Reportes, an index the server reports as null | Sin datos suficientes |
| S15 | Legajo, índices panel, live mode with dependency 61 pending | El servidor todavía no calcula los índices del PDI. |
| S16 | Legajo, Teórico tab, live mode with dependency 67 pending | El historial de exámenes teóricos todavía no existe en el servidor. |
| S17 | Legajo, Teórico tab, above a subsanación and its origin | Prevalece la primera nota: es la que entra en el promedio. La subsanación levanta el bloqueo para volar y queda como evidencia. |
| S22 | Reportes, above the table | Orden de mérito consultado el {fecha} a las {hora}. El servidor lo calcula en cada consulta. |
| S23 | Reportes, beside the ordering | Desempate: mayor NIA y, si persiste, menor código. |
| S24 | Reportes, an alumno without a complete NFPI | Sin NFPI: {detalle}. |
| S25 | Reportes, empty state | Todavía no hay alumnos con índices calculados en este programa. |
| S26 | Reportes, live mode with dependency 63 pending | El servidor todavía no calcula el orden de mérito. |
| S28 | Escuadrón, row whose estado is not Apto | Requiere atención |
| S29 | Legajo, desaprobados panel, caller without `View Disapproved` | Los vuelos desaprobados los consulta su instructor. |

**S12 takes a `{consecuencia}` clause**, because the sentence is false without it for an alumno whose state has already moved. The two values, chosen by `chequeo.cuentaConEsteEstado` from contract §6.1: `El cambio de estado lo decide el servidor en la próxima evaluación.` when the alumno is still `Apto`, and `El estado ya cambió: los contadores no se moverán hasta que vuelva a Apto.` when it is not. The first version of this addendum used only the first clause, which for `777777` — criterion met, already `En Chequeo` — promised a change that will never come.

**Retired ids, not reused:** **S18**, **S19**, **S20** and **S21** went with the Riesgo tab (M5-11), and **S27** with it — it said the risk panel was not shown in an alumno's own legajo, and there is no risk panel in anyone's.

`formatearNota` (`src/lib/formato.ts:9-12`) renders every figure with two decimals and `'—'` for null, and `textoConMinimo` (`src/lib/dominio/teoria.ts:115-117`) renders a theory grade beside its applicable minimum; neither is reimplemented. S14 is used where the absence is a **statement** (an index the server says it cannot compute), and `'—'` where it is merely a missing cell.

### 17.4 Acceptance criteria

Every criterion is testable against the MSW mocks of `docs/contrato-api-seguimiento.md`, whose §9 fixes the fixtures — including the ones the exceptional paths need: an alumno whose chequeo criterion is met with his state already moved and another whose is met with his state still `Apto`, an alumno with an incomplete NFPI, a tie in the orden de mérito, an alumno blocked by a pending subsanación and another with a completed subsanación chain, three causales on one alumno covering the three payload shapes, and an alumno with no grupo. Absences (an empty escuadrón, no alertas, a failing panel, an unavailable `estado-teorico`, four of the seven causal labels, the `null` shape of the índices endpoint) are exercised with per-test `server.use(...)` overrides, the pattern M2–M4 already use. M5 needs no fake clock except for the debounce of CA-SEG-02, which uses `relojFalso()` (`src/test/tiempo.ts:10-16`).

**Route authorisation gets its own `src/lib/auth/rutas-m5.test.tsx`** beside `rutas-m1..m4`, and — because `cobertura-de-rutas.test.ts` only checks the route-file direction (§17.3) — the registry task also asserts the five `PANTALLAS` entries directly.

**Forty-three criteria over four use cases**, at 2.15 per task for the 20 of §17.6. The count fell from 53: the ten `CA-RIE-*` went with the Riesgo tab (M5-11) and `CA-REP-07` with the CSV, and one was added for M5-24.

**Retired ids, not reused:** `CA-RIE-01` … `CA-RIE-10` and `CA-REP-07`. No id from M1–M4 is renumbered or retired.

#### CUS Consultar el escuadrón (M5, Instructor y Comandante)

- **CA-SEG-01** La lista muestra código, alumno, grupo y estado del alumno, pagina de 10 en 10, y el servidor es quien ordena y pagina: la tabla no reordena en el navegador.
- **CA-SEG-02** Filtra por programa, grupo, estado y texto del nombre; los filtros, la página y el orden persisten en la URL, una URL mal escrita vuelve a los valores por defecto, y el filtro de texto espera 300 ms tras la última tecla antes de navegar.
- **CA-SEG-03** Con el permiso `View All Groups` la lista trae los alumnos de todos los grupos del programa; sin él, solo los alumnos con los que el instructor ha volado, y un usuario sin ninguno ve S2 en lugar de una tabla vacía sin explicación; un programa sin alumnos muestra S6.
- **CA-SEG-04** El grupo se muestra con S4 a partir del `idGrupo` del alumno, y un alumno sin grupo muestra S3; para el alumno del grupo 6 la etiqueta dice «Grupo 6» aunque el nombre real del grupo sea otro, y su legajo muestra el nombre real.
- **CA-SEG-05** La fuente del instructor devuelve una fila por alumno y turno: la lista muestra cada alumno una sola vez, recorre todas las páginas que informa el servidor y el total cuenta alumnos, no filas.
- **CA-SEG-06** El estado de cada alumno se muestra con su etiqueta y su color en ambos temas, y el encabezado resume cuántos alumnos hay en cada estado sobre el total que informa el servidor.
- **CA-SEG-07** La columna de estado teórico marca a los alumnos bloqueados por subsanación; si la consulta en lote falla, la columna muestra S5 y ninguna fila se oculta.
- **CA-SEG-08** Cada fila abre el legajo del alumno.
- **CA-SEG-09** Un fallo en la primera carga de la lista muestra el aviso con Reintentar, no una lista vacía.
- **CA-SEG-10** Fuera del modo mock y sin la dependencia 56 resuelta, la columna de estado teórico no se pide ni se muestra y el resto de la pantalla funciona.
- **CA-SEG-11** Toda fila cuyo estado no sea Apto se marca con S28, y la marca no depende de ninguna petición adicional: sale del mismo dato que ya trae la lista.

#### CUS Atender alertas del escuadrón (M5, Instructor y Comandante)

- **CA-ALE-01** La lista muestra tipo de alerta, alumno, grupo, fecha, detalle y severidad, y pagina de 10 en 10.
- **CA-ALE-02** Filtra por programa, grupo, tipo y rango de fechas; los filtros y la página persisten en la URL.
- **CA-ALE-03** Los cinco tipos se muestran con su etiqueta de texto y su color en ambos temas, y el orden por defecto es Alta, Media, Baja y luego fecha descendente; una alerta sin fecha queda al final de su severidad.
- **CA-ALE-04** Una alerta de vuelo desaprobado abre su evaluación; una de causal teórico y una de subsanación pendiente abren la pestaña Teórico del legajo; una de chequeo pendiente abre el panel de chequeo en la pestaña Práctico; una de estado crítico abre el legajo.
- **CA-ALE-05** Sin alertas se muestra S7.
- **CA-ALE-06** La capa de API rechaza un código de persona que no tenga exactamente seis caracteres antes de construir la URL de desaprobados, y M5 no llama a ninguno de los cuatro endpoints de desaprobados sin permiso declarado.
- **CA-ALE-07** Fuera del modo mock y sin la dependencia 66 resuelta, la pantalla muestra S8 y no pide el listado.
- **CA-ALE-08** Un fallo en la primera carga muestra el aviso con Reintentar.

#### CUS Consultar el legajo del alumno (M5, todos los roles)

- **CA-LEG-01** La cabecera muestra código, nombres, DNI, rango, tipo, estado, el nombre y el programa del grupo, y la cuenta del alumno o su ausencia; los apellidos llegan con las claves `APaterno` y `AMaterno` y la pantalla los muestra igual.
- **CA-LEG-02** Las tres pestañas (Resumen, Práctico, Teórico) se ven en la URL, sobreviven una recarga y cada una carga sus datos solo al abrirse.
- **CA-LEG-03** El historial práctico muestra código, nombre, fase, evaluador, fecha, promedio y clasificación; pagina, y filtra por subfase y clasificación desde la URL.
- **CA-LEG-04** El evaluador se muestra como el texto que informa el servidor, sin enlace a su persona, y con S10; la pantalla no insinúa que exista un código de evaluador.
- **CA-LEG-05** Elegida una subfase, el reporte muestra la cabecera, las maniobras de la subfase y, por evaluación, su categoría, clasificación, promedio, recomendación y las calificaciones con nota mínima y nota obtenida; una subfase sin evaluaciones no muestra el texto del servidor sino un panel vacío.
- **CA-LEG-06** El panel de promedios de la subfase lista los promedios que devuelve el servidor y su media simple con dos decimales, bajo S9; el filtro del servidor excluye las evaluaciones de categoría Chequeo e incluye las de Chequeo Sub Fase; con un solo promedio la media es ese promedio y con ninguno el panel dice que no hay evaluaciones ponderadas.
- **CA-LEG-07** El panel de vuelos desaprobados muestra código de evaluación, clasificación, subfase, fecha y programa, y enlaza a la evaluación; sin el permiso `View Disapproved` el panel no se pide ni se muestra, y en el legajo propio de un alumno se muestra S29.
- **CA-LEG-08** El panel de turnos lista los turnos del alumno con nombre, subfase, programa y fecha, y muestra S11 en lugar de una cantidad de alumnos que el servidor no informa.
- **CA-LEG-09** El panel de chequeo muestra los cuatro contadores, qué criterio aplica según la fase del alumno, si ese criterio ya se cumplió con S12, la regla del Regular alternado y el historial de chequeos; el frontend no calcula ningún cambio de estado.
- **CA-LEG-10** S12 dice qué va a pasar según el estado del alumno: para uno que sigue Apto, que el servidor decidirá en la próxima evaluación; para uno cuyo estado ya cambió, que los contadores no se moverán hasta que vuelva a Apto. El panel enlaza además la cadena de evaluaciones por su evaluación previa y muestra el estado que cada una tenía registrado.
- **CA-LEG-11** El historial teórico muestra materia, tipo de examen, fecha, nota con su mínimo aplicable y si aprobó; una fila desaprobada con subsanación aprobada muestra las dos notas y S17, y la fila de la subsanación muestra su turno de origen; una fila desaprobada cuya subsanación sigue pendiente muestra que no hay segunda nota.
- **CA-LEG-12** El panel de estado teórico muestra si el alumno está bloqueado por subsanación con su motivo, y sus causales con la etiqueta de cada código, la materia cuando el código la lleva y el grupo de asignaturas cuando el código cuenta por grupo; una causal sin materia se muestra sin ella y no como un hueco.
- **CA-LEG-13** El panel de índices muestra el NFPI y, desglosados, el NIT con su NCT y NEI y el NIA con sus tres fases y, dentro de cada fase, sus sub fases con el peso que informa el servidor; cada cifra con dos decimales, todas del servidor, y el frontend no calcula ninguna.
- **CA-LEG-14** Un índice que el servidor informa como nulo se muestra con S14 y nunca como 0; un NFPI nulo no impide mostrar las mitades que sí existen, y cuando el NIA es nulo se muestra el motivo que informa el servidor.
- **CA-LEG-15** El alumno solo consulta lo propio: `/mi-legajo` lo lleva a su propio legajo, la capa de API envía su `codPersona` de la sesión y nunca un valor tomado de la URL, y un código ajeno en la URL lo rechaza el cargador de la ruta; para los cuatro roles de personal el código de la URL se usa tal cual y lo que limita es el permiso de cada panel.
- **CA-LEG-16** Un fallo en la carga de un panel muestra el aviso con Reintentar dentro de ese panel y los demás paneles siguen mostrando sus datos.
- **CA-LEG-17** Fuera del modo mock, cada panel cuya dependencia falta muestra su propio aviso — S13, S15 o S16 — el encabezado muestra S1, y los cuatro paneles reales siguen funcionando.

#### CUS Consultar reportes y orden de mérito (M5, Comandante)

- **CA-REP-01** La tabla muestra puesto, código, alumno, grupo, NFPI, NIT y NIA con dos decimales, pagina de 10 en 10, y el servidor es quien ordena.
- **CA-REP-02** Filtra por programa y grupo, y los filtros y la página persisten en la URL; filtrando por grupo los puestos empiezan en 1 dentro de ese grupo.
- **CA-REP-03** La pantalla muestra S22 con la fecha y hora de la consulta, sin prometer un cálculo programado, y S23 con la regla de desempate.
- **CA-REP-04** Dos alumnos con el mismo NFPI se ordenan por su NIA y, si también coincide, por su código; el puesto que muestra la pantalla es el que informa el servidor y no cambia al reordenar la tabla por otra columna.
- **CA-REP-05** Un alumno sin NFPI completo aparece al final, sin puesto, con S14 en sus columnas y S24 explicando qué falta.
- **CA-REP-06** Sin alumnos con índices se muestra S25.
- **CA-REP-08** Un fallo en la primera carga muestra el aviso con Reintentar; fuera del modo mock y sin las dependencias 6 y 63 resueltas, el encabezado muestra S1, la pantalla muestra S26 y no pide la tabla.

### 17.5 Backend dependencies added

**Live blockers:** dependency **8** (nothing arithmetic works without it), **7** (`estado-teorico`, which M4 already waited on) and — for the arithmetic's practical half — **a table the norm itself is missing**. M5's Escuadrón and four of the legajo's panels are **Real** against `ec2b0dd`; everything else is mock-only until 61–68 land. That is what S1, S8, S13, S15, S16 and S26 say on screen and what the seven gates of M5-22 enforce.

The highest number in use before this addendum is **60** (§16.5), so M5 adds **61–68**, **70** and **71**. Dependency 8 stays the umbrella and 61–63 are its parts, exactly as 53 and 54 are parts of 6. **69 is retired unused** (see the note below).

| # | Change | Repo | Needed by |
|---|---|---|---|
| 61 | `GET /api/personas/{cod}/indices` gated by `Read`: `NFPI`, `NIT`, `NIA` and `NA` with a breakdown that goes down to the **subfase**, each value nullable. **The ten formulas and their operands are the PDI's** (Título V caps. I–III), quoted line by line in contract §3.2 — `NCT = Σ(NA × coeficiente)` at `pdi:627-628`, `NEI` as a simple mean over **Mensuales, Semestrales e Inopinados** at `pdi:677-682`, the three fase weights at `pdi:691-723`, `NSF = Σ(NMI × COEF)` at `pdi:724-732`. The eleven asignatura coefficients are published at `pdi:633-669` and **`sigeda-back` stores none of them: there is no `materias` table and no `coeficiente` column in `src/main`** — they arrive with 6 and 53. The core of dependency 8 | back | M5 — legajo's índices panel; M5-2 |
| 62 | **Schema *and institutional data*, and the prerequisite 61 and 63 cannot skip.** (a) `evaluaciones_practicas.promedio` becomes numeric (today `varchar(255)`, `schema_prod.sql:176`, written by `String.format("%.1f", total)`). (b) `fase` gains an FK to `fases` (today an unjoined string whose three values are hardcoded at `EvaluacionPractica.java:239-246`). (c) **The PDI's subfase weights as data** — 0.25 · 0.25 · 0.20 · 0.15 · 0.15 in Adaptación, 0.30 · 0.30 · 0.40 in Helitransportadas, 0.50 · 0.50 in Aerotácticas (`pdi:698-723`) — plus which subfase each symbol names, because the PDI's own legend is scrambled and the seed has only five subfases. (d) **The per-mission coefficient table**, which `pdi:732` promises («el cual se detalla a continuación») and the document does not contain, and which is **not in the companion workbook either**: `PCPH 2024xlsx.xlsx` has 316 shared strings and none contains "coef". Without (d) **`NSF` is not computable by anybody** — not by this system and not by the squadron with a pencil — so `NIA` and `NFPI` are `null` however well 61 is implemented. That part is a data request to the institution, not work for Victor | back | M5 — 61, 63; M5-3 |
| 63 | `GET /api/reportes/orden-merito?programa=&idGrupo=&page=&size=` gated by `Create Reports`: the ranking over NFPI with the tie-break **NFPI desc → NIA desc → codigo asc** — which is this contract's, because the PDI defines the order of merit's purpose (`pdi:607-608`) and not what to do with a tie — and the alumnos whose NFPI is incomplete returned **unranked at the end**. Computed on read, with **no timestamp**, because there is no scheduler to hang one on (dependency 55). The first endpoint in `sigeda-back` that `Create Reports` would actually gate | back | M5 — `/reportes`; M5-3, M5-19 |
| 64 | `GET /api/personas/{cod}/legajo` gated by `Read`: `codigo`, `tipo`, `idGrupo`, the grupo's `nombre` and `programa`, the four chequeo counters, and the `chequeo` block derived from `TurnoDesaprobado` including **`cuentaConEsteEstado`**. **Narrow justification:** the Jefe de Operaciones **does** hold `Manage Groups` (`Role.java:33`) and can already read the counters through `GET /api/grupos/{id}`; the Instructor and the Comandante — the panel's audience — cannot (`Role.java:25-29`, `:18-23`). And even for him that route returns the whole `Grupo` entity with all its personas rather than a legajo header, and answers 200 with an empty body for a missing id (dependency 18) | back | M5 — legajo header and chequeo panel; M5-9 |
| 65 | `GET /api/personas/{cod}/chequeos` gated by `Read`, **plus the columns *and the writes* it needs**: `chequeos_finales` stores a code and four counters and nothing else (`schema_prod.sql:134-141`), has no HTTP surface because its only writer is a `@Component` with no `@RequestMapping` (`ResultadoController.java:23-24`), and — the part that makes it more than a shape fix — its two writes happen **only on a pass** (`:66-72`, `:83-89`) and are each followed by `reiniciarCont()` (`Persona.java:229-236`). So a row means "chequeo aprobado", the chequeos that sent an alumno to the Chequeo de Comando leave **no trace at all**, and the counters were zeroed right after. Add `fecha`, `tipo` (OPERACIONES · COMANDO · SUBFASE) and `resultado`, and write the failed ones | back | M5 — legajo's chequeo panel; M5-13 |
| 66 | `GET /api/seguimiento/alertas` gated by `View Disapproved`, scoped to the caller's grupos unless they also hold `View All Groups` — **and the two security fixes it depends on.** (a) `findByCodPersona` is `findByCodigoContaining`, a `LIKE %cod%` over the evaluation code rather than an equality on `cod_persona` (`DesaprobadoServiceImpl.java:23-25`, `IDesaprobadoDao.java:17-18`), so any `View Disapproved` holder — the Instructor included — dumps every alumno's failures with a one-character path value. (b) Dependency 17's four unguarded endpoints, one of which is a `DELETE` with no existence check that any authenticated user, **including an Alumno**, can call (`DesaprobadoController.java:91-102`). Widens 17, which `contrato-api-turnos.md:589` left for M5. **Also depends on 7, 64 and 68**, because three of the five alert types derive from the theory state, the counters and the causales | back | M5 — Alertas; security; M5-7, M5-8 |
| 67 | `GET /api/cuestionarios?codAlumno=&idMateria=&estado=` gated by `Read` with the alumno restricted to his own: the theory history cut from M4 (§16.6 item 1), carrying `idTurnoOrigen` backwards and `subsanadoPor` forwards so a subsanación and its origin can be shown together. Widens 6, and reissues message D14 | back | M5 — legajo's Teórico tab; M5-15 |
| 68 | `causales[]` in `GET /api/personas/{cod}/estado-teorico`, with **seven** codes taken from `pdi:738-745`: `PROMEDIO_ASIGNATURA`, `TRES_ASIGNATURAS`, `DOS_EXAMENES`, `SEGUNDA_SUBSANACION`, `PERIODICOS_CRITICOS`, `PERIODICOS_GENERALES`, `INOPINADOS`. The two periodic codes count **across a group of asignaturas** («cualquiera de ellos»), and the groups reconcile with the eleven-asignatura catalogue as **(asignatura, `tipoExamen`)** pairs through the periodicity table (`pdi:527-547`). The one genuine gap is **«Instrumentos»**, which the PDI evaluates and names and which is not among the eleven. Widens 7 | back | M5 — Alertas and the legajo; M5-14 |
| 70 | Inasistencias: `PUT /api/turnos-teoricos/{id}/inasistencias/{codAlumno}`, the `inasistencia_justificada` column and the PDI's **50 % reduction for an unjustified rezagado** — which `pdi:558` and `:685` apply to **«un test o examen»** generally, so it reaches `PT`, `PE`, `NA` and `NCT` as well as `NEI`. Cut from M4 (§16.6 item 2). **M5 builds no screen for it** (M5-17) | back | M5 — the honesty of 61; M5-17 |
| 71 | **Bug, found while deriving the fixtures of contract §9.3:** `esRegularAlternado` (`TurnoDesaprobado.java:8-13`) returns `true` only when `contRegular` is 0 or even, and it is the only path by which `contRegular` grows (`ResultadoController.java:42-44`, `:116-118`). So it rises from 0 to 1 and **never again**. Consequently **four of the six chequeo branches the PDI defines are unreachable** — `2M+2R`, `1M+4R`, `6R` (`pdi:750-752`) and `1M+2R`, `4R` (`pdi:782-783`) — and only `3 Malos` and `2 Malos` can fire. The comparison is also strict equality (`malos == 3`), harmless only because the state moves at exactly 3 | back | M5 — the chequeo panel tells the truth about the rule; M1 — correctness |

Dependency 8 is detailed by contract §§3–4 and split by 61, 62 and 63; dependency 7 is extended by 68; dependency 6 is extended by 67 and now also blocks the orden de mérito; dependency 17 is widened by 66; dependency 56 is consumed for the first time (M5-16); dependency 12 is not fixed and its consequence is S11; dependency 18 is inherited twice (by any index over `promedio`, and by anyone reading the counters through `GET /api/grupos/{id}`); dependency 20 remains the server-side half of M5-10; dependency 55 is why neither computed endpoint carries a timestamp; dependency 58 is untouched and M5 does not call `GET /api/personas/{cod}/status`.

**Dependency 69 is retired without ever being requested.** The previous version of this addendum asked the AI backend to accept a `Persona.codigo` as `studentId` and to recalibrate `classifyScore`. With the Riesgo tab cut (M5-11) there is no consumer, so asking would be asking another team for work nobody will use. **And it should not be granted later in that order either:** making the route addressable by a six-digit code, on a service that authenticates nobody, turns "guess a UUID" into an enumeration of `111111`, `222222`, `333333`. Dependency **49** — scope, validate and paginate `/prediction/**` — comes first or at the same time, never after. Contract §8 and M5-12 carry the sequence.

### 17.6 Deferred, and what M5 does with §16.6

M5 is the last milestone, so this subsection has two halves: **how §16.6's seven items were disposed of**, and **what M5 itself defers out of the thesis**.

**§16.6, item by item.** Five are implemented, two are deferred again.

| §16.6 | Item | Disposition | Where |
|---|---|---|---|
| 1 | The alumno's theory history (`GET /api/cuestionarios`, message D14, the second half of CA-EXA-01) | **Implemented**, as the legajo's Teórico tab | M5-15, dependency 67, CA-LEG-11, contract §5.2 |
| 2 | Inasistencias and the 50 % rezagado reduction | **Deferred again, split.** The **server** obligation becomes dependency 70 — and it is wider than M4 assumed, because `pdi:558` and `:685` apply the reduction to any test or exam, not only the periodic ones; the **frontend** write is not built, because its screen is M4's Resultados por turno | M5-17, dependency 70 |
| 3 | `causales[]` and its seven codes, plus the vocabulary reconciliation | **Implemented, and reconciled against the source.** Seven codes, all from `pdi:738-745`; the two periodic ones count across a group, not per asignatura, and the groups map onto the catalogue through the periodicity table. The only real gap left is «Instrumentos» | M5-14, dependency 68, CA-LEG-12, contract §5.1 |
| 4 | Bulk `estado-teorico` (dependency 56) | **Implemented for Escuadrón.** The M1 turno form's switch from M4-12's per-row query is specified in contract §5.3 and **not built**, so M4-12's declared cost stands | M5-16, dependency 56, CA-SEG-07, contract §5.3 |
| 5 | Overlap between two theory turnos of the same grupo | **Deferred again.** No precedent — `HorasInicioFin` is never called even for practical turnos (dependency 15) — and no M5 screen shows or causes it | M5-18 |
| 6 | The Comandante's view of theory results | **Implemented by construction.** He holds `View My Group`, `View All Groups`, `View Disapproved` and `Create Reports`, so he sees all four Seguimiento screens, with theory and practical side by side in the legajo | M5-5, §17.3's matrix |
| 7 | The "prevalece la primera nota" consequence | **Implemented, and corrected.** The PDI says it three times (`pdi:554`, `:683`, `:687`): **the first grade is the one that enters the average** and the subsanación lifts the flying block without replacing it. The first version of this addendum asserted the opposite in S17 and cited the very line of the theory contract that deferred the question. Fixed in S17, in dependency 61's NIT definition (contract §3.4) and here | M5-15, CA-LEG-11, contract §3.4 |

**What M5 defers out of the thesis.** Nothing below has a later milestone to fall to, so each line says what the user is left with.

| # | Deferred | Why, and what is left |
|---|---|---|
| 1 | **The Riesgo tab, and with it the whole predictive-AI surface.** No panel, no `src/features/riesgo/`, no `/prediction/**` mock, no criteria, and **no dependency asked of the other team** | Five independent blockers, all verified in `sigeda_chat_status` at `15b4e86`: **neither route authenticates or scopes** — `DevAuthMiddleware` is applied to `'*'` and sets a fixed user (`app.module.ts:24`, `dev-auth.middleware.ts:5-8`) that **neither route reads** (`prediction.controller.ts:10-20`), and the list is unpaginated (`prediction.service.ts:26-69`); **a SIGEDA alumno cannot be named**, because `studentId` is a `@db.Uuid` to a `User` keyed only by `email @unique` (`prisma/schema.prisma:56-60,314-320`) while `sigeda-back`'s JWT carries only `sub` (`JwtUtils.java:31-38`); **the data is synthetic**, written by a script and by nothing in the application (`seed-prediction-data.ts:134,173,192`, three fabricated students from `:39` over six invented maniobras `:17-24`); **`currentAverage` is the last grade, not a mean** (`prediction.service.ts:86-87`, and `:197` per maniobra); and **the risk bands cut at 16 and 12** (`engine/risk-classifier.ts:11-17`) against a scale whose floor is 12 (`CalculoNota.java:47-68`), so `deficiente` is unreachable and `regular` covers 12–15.99. A tab that shows another cohort's synthetic trend under a real alumno's name is worse than no tab. **Left:** the thesis has no predictive-AI screen. The analysis is here and in contract §8 so the work is not lost, and M5-12 records the order in which it would have to be picked up. **And one finding worth leaving on the record even though we no longer ask for anything:** granting the id mapping **without** dependency 49 would have made the route trivially enumerable by six-digit code on a service that authenticates nobody — 49 first, or at the same time, never after |
| 2 | **A CSV export of the orden de mérito** (`CA-REP-07`, retired) | There is no `Blob` or CSV precedent anywhere in the repo, no server support, and a one-page export answers nobody's question — the table is already on screen with its filters in the URL. **Left:** the report is read, not downloaded. Left out rather than shipped unproven |
| 3 | **A version token on the exam's autosave.** Two tabs on the same examen still overwrite each other: `PUT /api/cuestionarios/{id}/respuestas` is a whole-set replace with no `If-Match`, and the in-tab race was closed by serialising the saves (`docs/decisiones.md:111`), not the cross-tab one | It would mean reopening `contrato-api-teoria.md` §4.3 in the last milestone for a case no criterion covers. **Left:** an alumno who opens the same exam in two tabs can lose the answers typed in the older one, silently (M5-23) |
| 4 | **CA-EXA-12 proven by a `server.use` override** (`rendir-examen-page.test.tsx:232-243`) while the real mock rejects correctly (`cuestionarios-teoria.test.ts:93-99`) | The behaviour is right and covered at the mock level; only the page-level test takes a shortcut, and fixing it needs a new fixture in a finished module. **Left:** one criterion whose page-level test proves the rendering of D9, not its cause (M5-23) |
| 5 | **The `programa` filter and the debounce on `/teoria/turnos` and `/banco`** | The debounce hook M5 builds is shared and applying it is one line per screen, but both are M4 screens with their own suites and the milestone had no slack (M5-23). **Left:** the theory list navigates on every keystroke and cannot be filtered by programa; `turnos-teoricos-page.tsx:54-56` still hardcodes `'PDI'` |
| 6 | **`GET /api/personas/{cod}/status` (dependency 58)** stays broken and M5 does not call it | It is the only endpoint that could explain an alumno's state, and it 404s for five of the seven states — `puedeSerEvaluado()` is `esApto() || estaEnObservacion()` (`Estado.java:50-52`) — that is, for most of the alumnos a Seguimiento screen is about. **Left:** the legajo explains a state from `estadoAlumno`, the counters and the criteria, never from the server's own explanation |
| 7 | **`GET /api/subfases/assigned` has no `@PreAuthorize`** (`maniobra/controllers/SubFaseController.java:47-50`, unlike its three siblings at `:29-30`, `:41-42` and `:52-53`) and M5 does not call it | It is part of dependency 17 and the contract states its gate, but no M5 screen needs it. **Left:** one unguarded read of subfase names, documented in dependency 66's row |
| 8 | **The indices fixture is stated, not derived** (M5-21) | Not for want of effort: `NSF` needs a per-mission coefficient table that does not exist in the norm (dependency 62d), the subfases of NFOH and NFOA are not in the seed, and the theory half needs a `materias` table `sigeda-back` does not have. **Left:** the legajo's history and its indices agree in ordering, not in arithmetic; contract §9.5 says so |

**Plan scope.** The plan that follows must fit in **≤ 20 tasks**, and after the Riesgo cut the honest estimate and the ceiling finally meet: **20**. The slack the cut released went where the review said it was needed — task 3 splits, because it grew by the three endpoints that had no handler and by the subfase-report fixture, and the legajo shell splits from its first panels.

1. `src/lib/dominio/seguimiento.ts` (chequeo criteria, the seven causal codes with their groups, the five alert types with their severity ordinal, the index labels) **plus the shared debounce hook** and the rename of `aviso-de-teoria.tsx` to `aviso-de-dependencia.tsx` with its `texto` prop — first, because nine existing files and several criteria depend on it.
2. Seguimiento API layer: `listarSeguimiento` over the two catalogues, paging to `totalPages`, plus `src/mocks/sigeda/seguimiento.ts` and the bulk `estado-teorico` route.
3. Legajo API layer, part 1: the header (`/legajo` + `/alumno`) and the practical history, plus **`src/mocks/sigeda/alumnos.ts`** — an endpoint documented since M1 with no handler.
4. Legajo API layer, part 2: **`src/mocks/sigeda/reportes-subfase.ts`** for the subfase report and the promedios — the other two unmocked endpoints — with the `{cabecera, maniobras, notas}` fixture on (`777777`, subfase 3), the only pair whose subfase has maniobras.
5. `src/mocks/sigeda/desaprobados.ts`: the eight new evaluations of contract §9.2 and the derivation replay of §9.3, including the `alumno.esApto()` gate; `PersonaMock` gains the three counters and grupo 6 is renamed.
6. Índices and orden de mérito API layer plus `src/mocks/sigeda/indices.ts` with §9.5's figures and the tie.
7. Alertas API layer plus its mock, with the severity ordinal projected away and the per-type natural keys.
8. Chequeos and theory-history API layer plus `chequeos.ts` and `cuestionarios-historial.ts`, and the two theory turnos and two exámenes of §9.8.
9. Route registry, sidebar group, breadcrumbs, the seven `dependencias.ts` gates, `rutas-m5.test.tsx` **and the registry assertion `cobertura-de-rutas.test.ts` does not provide**.
10. Escuadrón: list, filters, URL state, the debounce, the derived grupo label and the de-duplication.
11. Escuadrón: the estado summary, the S28 marking (M5-24), the theory-block column, S2/S5/S6.
12. Alertas: list, filters, URL state, the five types and their five destinations.
13. Legajo: shell, three tabs, URL-persisted tab, and the per-panel loading, error and permission scaffolding.
14. Legajo: Resumen — cabecera and the índices panel with its subfase breakdown and S14.
15. Legajo: Resumen — estado teórico with its causales and their three payload shapes.
16. Legajo: Práctico — evaluation history, subfase picker, the report, the promedios mean (S9).
17. Legajo: Práctico — desaprobados with its own permission and S29, and turnos with S11.
18. Legajo: Práctico — the chequeo panel: counters, criterion, S12's two clauses, the chain, the history.
19. Legajo: Teórico — history, the two subsanación cases and S17.
20. `/mi-legajo` with ownership per role, Reportes y orden de mérito with S22–S26, and the `docs/decisiones.md` entry.

**What to cut first, in order.** (a) Merge 14 and 15 into one Resumen task. (b) Merge 16 and 17. (c) Task 18, the chequeo panel, which is the one whose dependency (65) is a schema change plus new writes and therefore the least likely to ever run live. Task 20 carries two screens on purpose: `/mi-legajo` is a redirect and Reportes is a single table, and neither can be cut without losing a use case.

**One machine note carried from M4** (`.superpowers/notas/m4-progress.md:165`): on this repo, which lives on an external drive, a full parallel `vitest` run started right after other heavy work produces phantom five-second timeout failures whose count varies run to run. Re-run, or use `--no-file-parallelism`, before believing a failure.

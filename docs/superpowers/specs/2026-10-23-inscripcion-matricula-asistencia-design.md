# Diseño — Inscripción, Matrícula y Asistencias (tramo de entrada)

**Fecha:** 2026-10-23
**Autoría:** José Caldas (decisiones) · Claude (redacción)
**Repos afectados:** `sigeda-back` (Spring Boot) · `sigeda-web` (React/TanStack). **No** toca `sigeda_chat_status`.
**Fuentes:** `Inscripción y matrícula.odt`, `Borrador de Tesis - Alarcon_Caldas.docx` (4.2.5 jerarquía de actores, macroproceso "Gestión de Matrícula", líneas 274/690/1644-1683), sitio real `asa.edu.pe`, y el código/contrato existentes (`contrato-api-matricula.md`, `security/entities/Role.java`, `grupo/entities/*`).

---

## 1. Intención y porqué

Hoy SIGEDA tiene digitalizado el **desarrollo del curso** (turnos, evaluación DIRBE, índices, chequeo, teoría, seguimiento). Lo que **no** existe es el **tramo de entrada**: cómo una persona interesada pasa de "nunca oyó del sistema" a "alumno matriculado en un grupo". En el aeroclub real (`asa.edu.pe`) ese tramo es 100 % manual y fuera del sistema: un catálogo de cursos sin precios ni proceso, y contacto por WhatsApp/correo. La pieza nueva y valiosa es llevar ese embudo al sistema con un punto de control explícito: la **validación manual del comprobante de pago** por un **Coordinador Académico**, que hoy no tiene soporte.

Esto cierra el modelo de actores que la tesis ya documenta (actores *Invitado* y *Coordinador Académico*, macroproceso "Gestión de Matrícula") pero que el software todavía no implementa: la lista de CUS implementados (CUS01–CUS32) no incluye curso, matrícula ni asistencia por sesión.

## 2. Alcance

**Objetivos (goals)**
- **Landing pública con catálogo** de cursos (nombre, descripción, duración, requisitos) accesible sin cuenta, con un botón de inscripción.
- **Matrícula self-service**: cualquier interesado llena sus datos, elige una preferencia de horario y **adjunta un comprobante de pago**; ese acto **crea su cuenta** en estado pendiente.
- **Bandeja del Coordinador Académico**: validar o rechazar matrículas/comprobantes; al validar, completar datos y **promover a alumno** y asignarlo a un grupo.
- **Asistencias por sesión**: el instructor registra presencia/ausencia por turno; reportes de % de asistencia, faltas acumuladas y condición académica.
- **Integración real**: `Curso` se integra sobre el programa de Helicóptero existente; matrícula, grupo y alumno cuelgan de él.

**No-objetivos (non-goals)**
- **Facturación / cobros**: fuera de scope. El "comprobante de pago" es un **archivo que el Coordinador valida a ojo**; no hay montos, boletas, pasarela de pago ni conciliación.
- **Multicurso real**: por ahora hay **un solo curso** (Piloto de Helicóptero). El modelo queda integrado para soportar un segundo curso en el futuro, pero **no se construye maquinaria multicurso** (no se parametriza todo el programa por curso, no hay selector de curso donde solo habría una opción). Un segundo curso es otra feature.
- No reemplaza el sitio público real `asa.edu.pe` ni su hosting; es la landing *dentro* de SIGEDA.
- No hay videoconferencia ni mensajería entre usuarios (coherente con la tesis, línea 1303).

**Anti-objetivos (qué haría fracasar esto aunque "funcione")**
- Duplicar el concepto de "matrícula" en paralelo al flujo administrativo existente (`POST /api/personas` + grupos). Debe **construirse encima** de ese mecanismo, no al lado.
- Abrir un hueco de seguridad por la superficie pública: un endpoint anónimo que cree cuentas y reciba archivos sin validación, rate-limiting ni límites de tamaño/tipo.
- Romper la convergencia `data_prod.sql` ↔ `migraciones/*` ni las pruebas `Semilla*` (ver §8).

## 3. Decisiones ya tomadas (con su porqué)

| # | Decisión | Porqué |
|---|---|---|
| D1 | **`Curso` integrado**, no tabla suelta: el programa existente (fases/subfases/maniobras de la Tabla 4) cuelga de un `Curso`; `Grupo`, `Matrícula` y `Alumno` lo referencian. | Decisión del usuario ("toca meter mano para que esté integrado"). Deja el modelo correcto para un futuro 2.º curso sin rehacerlo. |
| D2 | **Un solo curso**, sin maquinaria multicurso. | Solo existe el de Helicóptero; evitar genéricos especulativos. |
| D3 | **"Invitado" NO es un rol persistente**: es cualquier persona sin cuenta. El acto de matricularse **crea la cuenta** (estado pendiente). | Aclaración del usuario. Elimina el choque con el requisito "el acceso requiere autenticación": el formulario público **es** el registro. |
| D4 | **Login por correo**; el **DNI es identificador único de persona** (anti-duplicados), no es con lo que se inicia sesión; la contraseña la elige la persona. | Estándar en portales de inscripción. En la práctica se implementa fijando `usuarios.nombre = correo` para no tocar la ruta de login (que hoy es `findByNombre`, ver §7). |
| D5 | **La persona puede iniciar sesión apenas se registra**, a una vista mínima "mi matrícula: pendiente" (y puede re-subir el comprobante si se lo rechazan). La cuenta no queda "inactiva" esperando validación. | Es lo estándar y evita soporte manual por WhatsApp. |
| D6 | **Rol previo liviano `Postulante`**: solo ve su estado. Al **validar**, el Coordinador completa datos y la persona pasa a **`Alumno`** pleno y entra al armado de grupo. Las matrículas nunca validadas se **descartan al armar grupos**. | Tesis (jerarquía de actores). Mantiene el modelo de permisos por rol. |
| D7 | **`Coordinador Académico`** se agrega como rol nuevo. | Tesis. Hoy no existe (roles: Administrador, Comandante, Jefe de Operaciones, Instructor, Alumno). |
| D8 | **Facturación fuera de scope**: `Matrícula` guarda archivo de comprobante + estado, sin campos monetarios. | Decisión del usuario. |
| D9 | **Horario = preferencia de cohorte, no reserva**: catálogo chico de franjas que la escuela ofrece por convocatoria (p. ej. "Mañana L-M-V" / "Tarde Ma-J"); el postulante elige una preferencia y el Coordinador la usa para asignarlo a un `Grupo`. | Así opera el rubro: el turno de vuelo real se programa después contra disponibilidad (lo hace el Jefe de Operaciones). Cierra el "Pendiente: horarios" del `.odt`. |

## 4. Modelo de datos

Entidades **nuevas** y su enganche con lo existente (nombres de tabla en minúsculas, estilo del esquema actual).

### 4.1 `Curso`
- Campos: `id`, `nombre`, `descripcion`, `duracion` (horas, entero), `requisitos` (texto), `estado`/`activo` (para publicar u ocultar del catálogo).
- Semilla: **una** fila, "Piloto de Helicóptero", con las fases/subfases/maniobras ya sembradas colgando de ella.
- Integración: el programa existente queda bajo este curso. **Enganche concreto a decidir por el constructor** (ver §9-B): cómo se relaciona `Curso` con el enum `Programa {PDI, PDE}` de `Grupo` y con `Fase`. Recomendación: `Grupo` y `Fase` ganan FK `idCurso`; el enum `Programa` se conserva como está (PDI/PDE son sub-programas dentro del curso) para no romper nada de lo que hoy depende de él.

### 4.2 `Horario` (franjas de cohorte)
- Campos: `id`, `idCurso` (FK), `nombre` (p. ej. "Mañana L-M-V"), `descripcion`/`detalle` (días+franja), `activo`.
- Semilla: 2–3 franjas para el curso de Helicóptero.
- Uso: el formulario de matrícula lista las franjas activas del curso; la matrícula guarda la preferida.

### 4.3 `Matrícula`
- Campos: `id`, `idCurso` (FK), datos del postulante (`dni`, `nombres`, `apellidos`/`aPaterno`+`aMaterno`, `correo`, `contacto`/teléfono), `idHorario` preferido (FK), `fecha`, `estado` (`PENDIENTE` | `VALIDADA` | `RECHAZADA`), `comprobante` (archivo — ver §9-A), `motivoRechazo` (texto, opcional), y el enlace a la `Persona`/`Usuario` creados (`codPersona`).
- Relación: una matrícula ↔ una persona (la cuenta creada en D3). Única por `(dni, curso)` **mientras esté PENDIENTE/VALIDADA**, para impedir doble matrícula.
- Ciclo: `PENDIENTE` → Coordinador → `VALIDADA` (promueve a Alumno + asigna grupo) o `RECHAZADA` (el postulante puede corregir y re-enviar, D5).

### 4.4 `Asistencia`
- Campos: clave `(tipoTurno, idTurno, codAlumno)`; `fecha`; `estado` (`PRESENTE` | `AUSENTE`, y si aplica `JUSTIFICADA`).
- `tipoTurno` distingue práctico vs teórico; `idTurno` referencia el turno correspondiente.
- **Granularidad (resuelto):** un turno **práctico** es una **sesión fechada** (`turnos` tiene `fecha_eval`; `alumnos_turno` liga alumno↔turno con `horaInicio`/`horaFin`). Por eso "una fila por turno por alumno" es el ancla temporal correcto: el instructor marca presencia una vez por turno. No hace falta repensar el modelo.
- **No duplica la teoría (resuelto, §9-C):** ya existe `inasistencias_teoricas` (tabla propia, por diseño deliberado: la ausencia es la *inexistencia* de fila de examen). `Asistencia` cubre **turnos prácticos** (hoy sin registro de presencia; solo existe `alumnos_turno` como *asignación*); los reportes de % **leen** `inasistencias_teoricas` para la parte teórica en vez de re-registrarla.
- **Reportes:** % de asistencia por alumno, faltas acumuladas y **condición académica**, filtrables por grupo/curso.
- **Condición académica (resuelto — decisión del usuario):** es una **etiqueta de reporte de solo lectura**. Pasa a **"en riesgo"** cuando el **% de inasistencia supera el 30 %** de las sesiones del alumno. **NO escribe en `persona.estado`** ni interactúa con la máquina de estados DIRBE/chequeo (que sigue siendo dueña única de `Apto`/`En Observación`/…): la asistencia solo calcula la etiqueta, el Coordinador decide a ojo si actúa. (El 30 % es el default; ajustable.)

### 4.5 Entidades existentes que se tocan
- `Persona` (`personas`): se le crea una fila por matrícula, con `estado` nuevo tipo `Pendiente` hasta validar (hoy "toda persona nace Apto"; esto cambia para el alta pública). **`tipo` queda `null` mientras está pendiente** y se fija a `"Alumno"` **recién al validar** — ver §7 (una Persona pendiente con `tipo="Alumno"` y sin grupo se colaría en `GET /api/personas/alumno/Alumno`, el selector del formulario de grupos). El plan debe **auditar los consumidores de `estado`/`tipo`** (selectores, reportes, guards de evaluación) para que un pendiente no se filtre.
- `Usuario` (`usuarios`): fila con `nombre = correo`, `correo`, `contraseña = BCrypt`, `rol = Postulante` (6). Al validar, el rol pasa a `Alumno` (1).
- `Grupo` (`grupos`): gana `idCurso`; al validar se asigna la persona al grupo (reusa la mecánica de §3 del contrato M2).
- `Rol`/`Role`/`Permission`: ver §5.

## 5. Roles y permisos

El modelo de permisos es **dirigido por enum en código** (`Role` con `EnumSet<Permission>`, `Rol.asignarPermisos()`, `Role.es*()`), no solo datos. Agregar roles implica **cambio de código + seed**:

- **Nuevos `Permission`** (nombres tentativos): `MANAGE_COURSES`, `MANAGE_ENROLLMENTS` (validar/rechazar matrículas), `MANAGE_ATTENDANCE`, `VIEW_MY_ENROLLMENT`.
- **Nuevos `Role`**:
  - `Coordinador Académico` (id 6): `MANAGE_COURSES`, `MANAGE_ENROLLMENTS`, `MANAGE_GROUPS` (arma grupos), `MANAGE_ATTENDANCE` (supervisa), `CREATE_REPORTS`, `READ`, `VIEW_ALL_GROUPS`.
  - `Postulante` (id 7): solo `VIEW_MY_ENROLLMENT` (y lo mínimo de sesión).
  - `Instructor` gana `MANAGE_ATTENDANCE` (registra asistencia por sesión).
- Seed `roles` (la secuencia arranca en 6, encaja): filas 6 y 7, sin mojibake.
- Frontend: replica el mapeo en `src/lib/auth/permisos.ts` (como ya hace con los otros).
- **Superficie pública**: el alta de matrícula y el catálogo son endpoints **sin autenticación** (los únicos del sistema). Requieren: validación estricta de entrada, límite de tamaño/tipo del comprobante, y rate-limiting/anti-abuso básico.

## 6. Los tres sub-módulos (orden de construcción)

Se atacan en secuencia por sus dependencias:

**Sub-módulo 1 — Fundaciones + Catálogo/Landing**
- Back: entidad `Curso` + `Horario`, roles `Coordinador Académico` y `Postulante` (enum + seed), FK `idCurso` en `Grupo`/`Fase`, endpoints públicos `GET /api/public/cursos` (catálogo) y `GET /api/public/cursos/{id}` (detalle + horarios).
- Web: landing pública (catálogo estilo `asa.edu.pe`, con duración/requisitos) + botón "Inscribirme" que lleva al formulario de matrícula.

**Sub-módulo 2 — Matrícula + validación**
- Back: `POST /api/public/matriculas` (multipart: datos + comprobante) → crea Persona+Usuario (rol Postulante, estado `Pendiente`, `tipo=null`) + fila Matrícula en una transacción; reusa la lógica de `POST /api/personas` §1.3. Bandeja del Coordinador: `GET /api/matriculas` (filtros por estado), `GET /api/matriculas/{id}` (datos + comprobante), `PUT /api/matriculas/{id}/validar`, `PUT /api/matriculas/{id}/rechazar` (con motivo). Vista del postulante: `GET /api/matriculas/mia` y **`PUT /api/matriculas/mia`** (re-subir comprobante/corregir datos).
- **Validar = aprobar, NO agrupar (resuelto — decisión del usuario):** `validar` promueve la persona a **`Alumno`** (fija `tipo="Alumno"`, `estado="Apto"`, rol `Alumno`) y deja la matrícula `VALIDADA` — **sin** asignar grupo. El armado de grupos es un **paso aparte** que reusa la pantalla/endpoints de grupos que ya existen (`POST`/`PUT /api/grupos`, y `GET /api/personas/alumno/Alumno` que lista alumnos sin grupo). Calza con "las matrículas nunca validadas se descartan al armar los grupos". El `idHorario` preferido es **informativo** para la decisión manual del Coordinador (no hay FK Grupo↔Horario).
- **Re-envío tras rechazo (resuelto):** la cuenta ya existe, así que el postulante entra y **edita su propia matrícula in situ** (`PUT /api/matriculas/mia`), que vuelve la fila `RECHAZADA → PENDIENTE`. No se crea una segunda fila ni se vuelve a pasar por el `POST` público (evita el choque de cuenta duplicada). La unicidad `(dni, curso)` de §4.3 cubre así solo una matrícula viva por persona+curso.
- Web: formulario público de matrícula (datos + preferencia de horario + subida de comprobante, elige contraseña), vista "mi matrícula: pendiente/rechazada" con re-subida, y bandeja del Coordinador (lista + detalle con visor del comprobante + validar/rechazar). El armado de grupos vive en la pantalla de grupos ya existente.

**Sub-módulo 3 — Asistencias**
- Back: entidad `Asistencia` + endpoints de registro por turno (`MANAGE_ATTENDANCE`) y de reportes (%, faltas, condición = etiqueta de solo lectura, umbral 30 % de inasistencia).
- Web: pantalla del instructor para marcar asistencia por sesión (lista de alumnos del turno) + reportes para Coordinador/Instructor.

## 7. Integración con lo existente

- **Reusar, no duplicar**: `POST /api/public/matriculas` comparte la lógica de alta Persona+Usuario de `contrato-api-matricula.md` §1.3 (transacción, BCrypt, validaciones de DNI/correo/contraseña). La diferencia: es anónimo, nace con rol `Postulante` + estado pendiente + sin grupo, y adjunta comprobante.
- **Validar = el flujo admin existente**: promover rol (análogo a `PUT /api/usuarios/{id}/rol` §2.2) + asignar a grupo (análogo a `POST`/`PUT /api/grupos` §3) + cambiar estado de persona a `Apto`.
- **Login sin tocar**: como `usuarios.nombre` es único y el login entra por `findByNombre`, se fija `nombre = correo`. No se modifica la ruta de autenticación.
- **Convenciones de API**: envolturas §A/§B, paginación, códigos de error y mensajes exactos siguen `contrato-api-turnos.md` / `contrato-api-matricula.md`. Este diseño deberá producir su propio **`contrato-api-inscripcion.md`** antes de implementar el back (como los demás módulos).
- **Semilla doble**: todo cambio de datos va en `data_prod.sql` **y** en la migración incremental correspondiente (`migraciones/*`), y las pruebas `Semilla*` exigen que converjan. Las entidades nuevas necesitan su DDL en `schema_prod.sql` + migración.
- **Reseed** con TZ Lima: `sh scripts/reiniciar-demo.sh --solo-sigeda --si`.

## 8. Restricciones técnicas

- Stack: Spring Boot 3 / Java 17 / PostgreSQL (sigeda-pg, db `sigeda_demo`); React 19 + TanStack + Tailwind + Vite; vitest; Playwright e2e.
- **No hay infraestructura de subida de archivos en `sigeda-back`** hoy (ni MultipartFile, ni S3/MinIO, ni storage service). El comprobante es capacidad net-new (ver §9-A).
- Perfil dev **recrea la BD al arrancar** desde `schema_prod.sql` + `data_prod.sql`; prod aplica `migraciones/*` incrementalmente. Cambios en **ambos**.
- Convenciones del repo: **pnpm** (nunca npm/npx); `sh ./mvnw -o test` para la suite; commits Conventional, cortos, **sin** `Co-Authored-By`; no `pkill` amplio; no piping de `psql`/`mvnw` por `head`.

## 9. Lo que queda a criterio del constructor (y decisiones abiertas)

- **A. Almacenamiento del comprobante.** No hay infra de archivos. Opciones: (a) columna `bytea`/base64 en `matriculas`; (b) archivo en disco + ruta; (c) reusar el object storage del módulo de aprendizaje. *Recomendación (mi llamada):* **`bytea` en la tabla**, por ser autocontenido, sobrevivir al reseed sin rutas externas y bastar para la escala de un demo. Límite de tamaño (p. ej. 5 MB) y tipos (`pdf`, `jpg`, `png`).
- **B. Enganche `Curso`↔`Programa`/`Fase`.** *Recomendación:* FK `idCurso` en `Grupo` y `Fase`; conservar el enum `Programa {PDI, PDE}` como sub-programa. Minimiza el impacto sobre lo que hoy lee `programa`.
- **C. `Asistencia` vs `inasistencias_teoricas`.** *Recomendación:* la nueva `Asistencia` cubre **práctico**; los reportes **leen** la tabla teórica existente en vez de duplicarla.
- **D. Nombre del rol/estado previo.** Uso `Postulante` (rol) y estado `Pendiente`; la tesis dice "Invitado" para el actor, pero como no es rol persistente, `Postulante` describe mejor la cuenta ya creada. *(Mi llamada; confirmable.)*
- **E. Convocatoria (ventana enero/julio, 10 días).** La tesis la menciona como regla de negocio. *Recomendación v1:* guardarla como metadato de la convocatoria/curso **sin** bloqueo duro de fechas (el demo no depende de estar en ventana); endurecer después si se quiere.
- **F. Generación del `codigo` de Persona** (6 alfanuméricos) para altas públicas: estrategia de generación única a definir (hoy el admin lo provee).

---

## 10. Resuelto en la revisión del constructor

Preguntas que trajo el revisor y cómo quedaron:
- **Semántica de asistencia** → §4.4: turno práctico es sesión fechada; `Asistencia` solo práctico; condición = etiqueta de solo lectura al **>30 % de inasistencia** (decisión del usuario), **sin** tocar `persona.estado`.
- **Validar → grupo** → §6 Sub-módulo 2: validar solo aprueba (promueve a Alumno sin grupo); **agrupar es paso aparte** con la pantalla de grupos existente (decisión del usuario).
- **Re-envío tras rechazo** → §6: edición in situ `PUT /api/matriculas/mia` (`RECHAZADA→PENDIENTE`), sin fila nueva.
- **Estado/tipo `Pendiente` vs código existente** → §4.5: `tipo` queda `null` hasta validar para no filtrarse en los selectores de alumno; el plan audita consumidores de `estado`/`tipo`.
- **Landing en la SPA autenticada** (mi llamada): la landing pública pasa a ser la **puerta de entrada** (`/`, `/cursos`, `/matricula`) con login como enlace; la app autenticada queda detrás del guard en sus rutas actuales. Confirmable.
- **¿Landing como sitio aparte (Astro o Next.js)? — Evaluado, descartado (2026-10-23).** Se consideraron un sitio **Astro** estático y un sitio **Next.js** separados para el landing. Descartados ambos: el landing **no es solo marketing** — el formulario de matrícula crea cuenta, sube archivo y desemboca en la zona autenticada "mi matrícula", así que partir el flujo en el borde framework→React es incómodo; un sitio aparte sería un **4.º proyecto** a desplegar y **duplicaría** el design system, el cliente de API y el auth que ya viven en `sigeda-web`; y la tesis declara el frontend como **una** SPA React/MVC. Next.js además **choca con el stack** (Vite + TanStack Router + TanStack Query vs. el App Router propio de Next), su SSR/API routes es **redundante** teniendo ya la API en Spring Boot, y usarlo solo para el landing sería tener **dos frameworks React** conviviendo; migrar *todo* el frontend a Next.js es una reescritura fuera de scope que tiraría las 1156 pruebas y la puerta de diseño §8 ya aprobada. El landing queda como **rutas públicas dentro de `sigeda-web`** (TanStack Router ya separa públicas de protegidas). El SEO/estático es marginal aquí porque `asa.edu.pe` ya es la cara pública de marketing.

### Resumen de decisiones del redactor (para revisar al leer)
D1–D9 son del usuario o derivadas directas. Las llamadas propias: comprobante en `bytea` (§9-A), FK `idCurso` sin tocar el enum `Programa` (§9-B), `Asistencia` solo práctico + lectura de teoría (§9-C), rol `Postulante`/estado `Pendiente` (§9-D), convocatoria como metadato sin bloqueo duro (§9-E), landing como puerta de entrada (§10), y la condición de asistencia como etiqueta de solo lectura sin escribir `persona.estado`.

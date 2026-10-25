# Diseño — Grupos como promociones (opción mínima)

**Fecha:** 2026-10-25
**Autoría:** José Caldas (pedido) · Claude (redacción y decisiones marcadas «decisión de Claude»)
**Repos afectados:** `sigeda-back` (Spring Boot) · `sigeda-web` (React/TanStack) · `sigeda_chat_status` (solo una marca en la proyección).
**Antecedente:** `2026-10-23-inscripcion-matricula-asistencia-design.md` (tramo de entrada). Este diseño lo completa; no lo reemplaza.

---

## 1. Intención y porqué

Hoy un alumno recién validado puede entrar a **cualquier** grupo, aunque ese grupo ya vaya a mitad de la instrucción. Nada en el modelo lo impide:

- `cursos` es catálogo (sin fechas ni estado) y `grupos` tampoco tiene fechas ni estado.
- La pertenencia es un campo suelto, `personas.id_grupo`, que `RegistroDeGrupo.guardarConPersonas` sobreescribe sin condiciones («`false` la deja SIN grupo, esté donde esté»).
- No queda historial: si alguien pasa del Grupo 2 al 4, se pierde que estuvo en el 2.

Esto se nota en el desarrollo del curso porque varias piezas suponen que **el grupo es una cohorte que avanza junta**:

| Pieza | Cómo usa el grupo | Qué pasa con un ingreso a mitad de curso |
|---|---|---|
| Turnos teóricos | `turnos_teoricos.id_grupo`; `abiertosDelGrupo`, `subsanacionesDelGrupo` | El recién llegado hereda exámenes y subsanaciones de materias que no cursó con el grupo. |
| Orden de mérito | `OrdenDeMeritoServiceImpl` numera el puesto **dentro del grupo** | Se compara a alguien en fase 1 con compañeros en fase 3. |
| Proyección (IA) | El alcance del instructor sale de `GET /api/grupos/instructor/{cod}/programa/pdi` | Un alumno con pocas evaluaciones en un grupo avanzado se lee como «lento», no como «recién llegado». |

Así resuelven esto los sistemas académicos y de formación aeronáutica: el curso de catálogo se separa de su **dictado** (edición o promoción, con fechas y estado), la matrícula es a un dictado y no al curso abstracto, y **entrar a un dictado ya empezado es una excepción documentada** (en EASA, el manual de la ATO debe describir cómo se acredita la instrucción previa de un alumno que llega de otro programa).

La **opción mínima** no agrega una tabla `ediciones`: en SIGEDA el grupo ya funciona como promoción (los 6 grupos son del único curso), así que **el grupo pasa a ser la promoción**.

## 2. Alcance

**Objetivos**
- El grupo gana **fechas, cupo y estado**, con un ciclo de vida explícito.
- Solo se asignan alumnos a grupos con **inscripción abierta**.
- Meter a alguien en un grupo que **ya empezó** se puede hacer, pero solo como **incorporación tardía**: explícita, con motivo y con quién la autorizó.
- La pertenencia a un grupo **deja historial** (alta, baja, motivo).
- El recién llegado **no hereda** los exámenes teóricos que su grupo rindió antes de su ingreso.
- El orden de mérito y la proyección **marcan** a los alumnos de incorporación tardía.

**No-objetivos**
- Una tabla `ediciones` entre `cursos` y `grupos` (esa es la opción completa).
- Vincular `Grupo` con `Horario` (la preferencia de horario sigue siendo informativa, D9 del tramo de entrada).
- Cambiar la regla «validar = aprobar, no agrupar» del tramo de entrada: validar sigue sin asignar grupo.
- Convalidar instrucción previa (horas, maniobras aprobadas en otra escuela). La incorporación tardía **registra** la excepción; no calcula créditos.
- Cerrar grupos de forma automática por fecha.

**Anti-objetivos (fracaso aunque funcione)**
- Romper los datos sembrados de los 6 grupos actuales o la convergencia `data_prod.sql` ↔ `migraciones/*` y las pruebas `Semilla*`.
- Que el bloqueo sea solo visual en la web: el backend debe rechazar la asignación aunque la llamen directamente.
- Que la incorporación tardía se vuelva el camino normal (un checkbox sin motivo que todos marcan).
- Excluir de la proyección a los alumnos tardíos: se pierde información. Se marcan, no se ocultan.

## 3. Ciclo de vida del grupo

```
PLANIFICADO ──abrir──▶ INSCRIPCION ──iniciar──▶ EN_CURSO ──cerrar──▶ CERRADO
```

| Estado | Asignar alumnos | Sacar alumnos | Turnos (teóricos y prácticos) |
|---|---|---|---|
| `PLANIFICADO` | No | — | No se programan |
| `INSCRIPCION` | Sí (hasta el cupo) | Sí, sin motivo | No se programan |
| `EN_CURSO` | Solo incorporación tardía | Solo con motivo (baja) | Sí |
| `CERRADO` | No | No | No (solo lectura) |

- Las transiciones son **manuales**, solo hacia adelante y las hace quien tiene `MANAGE_GROUPS` (Coordinador Académico, Administrador). *(Decisión de Claude: hacerlas automáticas por fecha agrega un job programado y casos borde que no aportan a la tesis.)*
- `iniciar` exige `fecha_inicio` y al menos un alumno. `cerrar` fija `fecha_fin` en hoy si estaba vacía.
- **«Los turnos se programan solo en grupos `EN_CURSO`»**: solo se exige a los turnos **teóricos**, que son los que tienen `id_grupo`. Los turnos prácticos se asignan alumno por alumno; al crearlos se valida que cada alumno pertenezca a un grupo `EN_CURSO`. *(Decisión de Claude.)*

## 4. Modelo de datos

### 4.1 `grupos` (columnas nuevas)

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `estado` | varchar | no | `PLANIFICADO`, `INSCRIPCION`, `EN_CURSO`, `CERRADO` (enum `EstadoGrupo`, `@Enumerated(STRING)`, mismo estilo que `Programa`) |
| `fecha_inicio` | date | sí | obligatoria para pasar a `EN_CURSO` |
| `fecha_fin` | date | sí | prevista; informativa |
| `cupo` | integer | sí | `null` = sin límite |

### 4.2 `asignaciones_grupo` (tabla nueva)

Historial de pertenencia. `personas.id_grupo` **se conserva** como el grupo vigente, para no tocar a sus consumidores (`abiertosDelGrupo`, orden de mérito, `DetalleSesion`, `IGrupoDeExamenDao`, etc.). La regla es que cada cambio de `id_grupo` escribe aquí en la misma transacción.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | integer (secuencia `asignaciones_grupo_seq`) | no | |
| `cod_persona` | varchar | no | FK `personas.codigo` |
| `id_grupo` | integer | no | FK `grupos.id` |
| `fecha_alta` | date | no | |
| `fecha_baja` | date | sí | `null` = vigente |
| `tardia` | boolean | no | `true` si entró con el grupo `EN_CURSO` |
| `motivo` | varchar | sí | obligatorio si `tardia` o si hubo baja en `EN_CURSO` |
| `cod_autoriza` | varchar | no | `cod_persona` de quien hizo la operación |

Invariante: como máximo **una** fila vigente (`fecha_baja is null`) por persona, y debe coincidir con `personas.id_grupo`.

*(Decisión de Claude: una sola tabla cubre el historial y la marca de tardía. Una tabla aparte solo para tardías dejaría el historial sin resolver.)*

### 4.3 Migración `029-grupos-como-promociones.sql` y semilla

- Los 6 grupos actuales tienen datos de instrucción, así que nacen `EN_CURSO`, con `fecha_inicio` igual a la fecha del primer turno de sus alumnos (o del primer turno teórico del grupo, la que sea menor), y `cupo = null`.
- **Excepción para la demo:** el Grupo 5 no tiene alumnos y nace `INSCRIPCION`. Así hay a dónde asignar a un alumno recién validado. *(Decisión de Claude.)*
- Una fila vigente en `asignaciones_grupo` por cada persona con `id_grupo`, con `tardia = false`, `fecha_alta = fecha_inicio` del grupo y `cod_autoriza` = el Administrador sembrado.
- El mismo contenido va en `data_prod.sql` y se cubre con una prueba `SemillaGruposComoPromocionesTest`, siguiendo el patrón de `028-coordinador.sql` y `SemillaCoordinadorTest`.

## 5. Reglas del backend

### 5.1 Asignación normal (`POST`/`PUT /api/grupos`)

`RegistroDeGrupo.guardarConPersonas` deja de ser incondicional:

- **Alta** (`checked = true` para alguien que no estaba): solo si el grupo está `INSCRIPCION` y no supera el cupo. Si no, `409` con un mensaje claro («El grupo ya inició; use incorporación tardía»).
- **Baja** (`checked = false` para alguien que estaba): sin motivo si está `INSCRIPCION`. Si está `EN_CURSO`, se rechaza con `409` y hay que usar el endpoint de baja (§5.3). En `CERRADO`, `409`.
- **Mover** a alguien que ya tiene otro grupo vigente: baja del grupo viejo más alta en el nuevo, con las mismas reglas para cada lado.
- Cada alta o baja escribe en `asignaciones_grupo` en la misma transacción (hoy la transacción ya vive en `RegistroDeGrupo`).
- Las validaciones van **en el servicio**, no solo en el DTO. Las mismas reglas aplican aunque la petición llegue sin pasar por la web.

### 5.2 Incorporación tardía (endpoint nuevo)

`POST /api/grupos/{id}/incorporaciones`, con cuerpo `{ "codPersona": "…", "motivo": "…" }` y permiso `MANAGE_GROUPS`.

- El grupo debe estar `EN_CURSO`. El motivo es obligatorio (mínimo 10 caracteres, máximo 500). La persona debe ser `tipo = "Alumno"`. El cupo aplica igual que en el alta normal. *(Decisión de Claude: el cupo también limita a las tardías.)*
- Si la persona tenía otro grupo vigente, se le da de baja de ese grupo con el mismo motivo.
- Escribe en `asignaciones_grupo` con `tardia = true`.

### 5.3 Baja con motivo (endpoint nuevo)

`POST /api/grupos/{id}/bajas`, con cuerpo `{ "codPersona": "…", "motivo": "…" }`. Sirve para los grupos `EN_CURSO`: cierra la fila vigente con `fecha_baja = hoy` y deja `personas.id_grupo = null`.

### 5.4 Transiciones de estado (endpoint nuevo)

`PUT /api/grupos/{id}/estado`, con cuerpo `{ "estado": "INSCRIPCION" | "EN_CURSO" | "CERRADO" }` y permiso `MANAGE_GROUPS`. Valida que la transición vaya hacia adelante y cumpla las precondiciones del §3. `fecha_inicio`, `fecha_fin` y `cupo` se editan en el `PUT /api/grupos` existente (`GrupoSave` gana los tres campos).

### 5.5 Teoría: no heredar exámenes previos al ingreso

Para un alumno con asignación vigente `tardia = true`, los turnos teóricos de su grupo con `fecha_examen` **anterior** a su `fecha_alta` no se le aplican. Esto afecta a:

- `EstadoTeoricoServiceImpl` (línea ~300, `abiertosDelGrupo`): no le cuenta como pendientes ni como faltas los exámenes previos a su ingreso.
- `CuestionarioServiceImpl` (línea ~155): no le abre cuestionarios de turnos previos a su ingreso.
- `HistorialTeoricoServiceImpl` (línea ~87, `subsanacionesDelGrupo`): no le ofrece subsanaciones de exámenes que nunca rindió.

Cómo y cuándo rinde esas materias queda fuera de este diseño (ver §8).

### 5.6 Turnos prácticos y teóricos

- Crear un turno teórico exige que su grupo esté `EN_CURSO`.
- Crear o editar un turno práctico exige que cada alumno del turno tenga un grupo `EN_CURSO`.

### 5.7 Lectura: exponer la marca

- `GET /api/grupos` y el detalle de grupo devuelven `estado`, `fechaInicio`, `fechaFin`, `cupo` y `inscritos` (asignaciones vigentes).
- `GET /api/grupos/{id}/historial` devuelve las filas de `asignaciones_grupo` del grupo (permiso `MANAGE_GROUPS` o `VIEW_ALL_GROUPS`).
- `FilaDeMerito` y el detalle de persona ganan `incorporacionTardia: boolean` y `fechaIngreso`. El puesto de mérito **no cambia**: solo se marca. *(Decisión de Claude: sacarlo del ranking es una regla académica que debería decidir la escuela.)*
- `GET /api/personas/alumno/Alumno` (selector del formulario de grupos) sigue listando alumnos sin grupo, sin cambios.

## 6. Web (`sigeda-web`)

- **Lista de grupos:** etiqueta de estado, fechas e «inscritos / cupo».
- **Formulario de grupo:** campos `fecha_inicio`, `fecha_fin` y `cupo`, y botones de transición según el estado actual (con confirmación en `iniciar` y `cerrar`).
  - En `INSCRIPCION`, el selector de alumnos funciona como hoy.
  - En `EN_CURSO`, el selector se reemplaza por dos acciones: **«Incorporación tardía»** (diálogo con alumno y motivo, y un texto que explique que es una excepción) y **«Dar de baja»** por cada integrante (diálogo con motivo).
  - En `PLANIFICADO` y `CERRADO`, el formulario de integrantes es de solo lectura.
- **Historial del grupo:** una pestaña o sección con altas, bajas, tardías, motivos y quién autorizó.
- **Orden de mérito y detalle de alumno:** etiqueta «Incorporación tardía · desde dd/mm/aaaa».
- Los mensajes `409` del backend se muestran tal cual, como los demás errores de validación.
- El modo mock (`dev:mock`) recibe los mismos datos que la semilla: Grupo 5 en `INSCRIPCION` y el resto `EN_CURSO`.

## 7. Proyección (`sigeda_chat_status`)

- El cliente de SIGEDA lee `incorporacionTardia` y `fechaIngreso` del detalle de persona.
- La respuesta de la proyección por alumno las incluye, y el riesgo se sigue calculando igual. La guarda existente de «mínimo 3 evaluaciones» (`MIN_EVALUATIONS_FOR_PREDICTION`) ya cubre al recién llegado sin datos.
- La web muestra la misma etiqueta en la vista de proyección.

## 8. Lo que queda para quien construya

- **Teoría pendiente del tardío.** Este diseño solo evita que herede faltas. Que rinda las materias que el grupo ya dio (con un turno teórico propio o con el siguiente grupo) es una regla de la escuela que todavía no está definida. Por ahora el Coordinador lo resuelve programando un turno teórico aparte.
- Los nombres exactos de los DTOs, de los mensajes y de las rutas internas de la web, siguiendo las convenciones de cada repo.
- La forma de cálculo del `fecha_inicio` sembrado (§4.3), mientras el resultado sea estable y reproducible en H2 y en PostgreSQL.
- **Probar contra PostgreSQL, no solo H2.** Las pruebas de integración usan H2, que ya ha ocultado defectos de PostgreSQL. La migración y las consultas nuevas se verifican también con `reiniciar-demo.sh --solo-sigeda` sobre `sigeda-pg`.

## 9. Decisiones de Claude para revisar

1. Las transiciones de estado son manuales, no por fecha (§3).
2. Los turnos prácticos se validan por el grupo de cada alumno (§3, §5.6).
3. Una sola tabla `asignaciones_grupo` para el historial y la marca de tardía; `personas.id_grupo` se conserva (§4.2).
4. El Grupo 5 nace `INSCRIPCION` para la demo; el resto, `EN_CURSO` (§4.3).
5. El cupo también limita a las incorporaciones tardías (§5.2).
6. Los tardíos se marcan en el orden de mérito, pero su puesto no cambia (§5.7).
7. La regla «validar no agrupa» del tramo de entrada se mantiene. En el mensaje anterior propuse que la matrícula apuntara a un grupo; lo descarté para no contradecir esa decisión tuya.

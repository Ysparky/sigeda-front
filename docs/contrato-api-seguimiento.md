# Contrato API — Seguimiento: escuadrón, alertas, legajo, índices del PDI y riesgo

**Versión:** 1 · 2026-09-25
**Implementa:** `sigeda-back` (Spring Boot), branch `main` (leído en `ec2b0dd`) y `sigeda_chat_status` (NestJS), branch `feat/migracion-sigeda-back` (leído en `15b4e86`)
**Consume:** `sigeda-web` M5. Los mocks MSW (`src/mocks/sigeda/` y `src/mocks/ia/`) implementan exactamente este documento.
**Para:** Victor — implementación en `sigeda-back`; la §8 es para quien mantiene `sigeda_chat_status`

Fuentes del dominio: PDI EA-510 2023, Título III cap. VI y Título IV (spec §3.4), «Descripción Eval» y «Flujo Desaprobado».
Fuentes técnicas: lectura del código de los dos repos con evidencia archivo:línea (spec §17.1 y `.superpowers/notas/investigacion/m5-contrato-backend.md`), decisiones M5-1 a M5-23 (spec §17.2) y dependencias 61–70 (spec §17.5).

**Este contrato es mitad recapitulación y mitad invención, y la diferencia importa.** Ocho endpoints que M5 consume **ya existen** y no se redefinen: se recapitulan su ruta, su permiso y su forma, con puntero a `contrato-api-turnos.md` §2 y §4 para su detalle validado. Siete son **nuevos**. Y una parte de lo nuevo — cómo se arman los índices del PDI a partir de las notas — **no está definida en ninguna fuente que se haya leído**: la §3 propone una definición operando por operando y la marca con **[CONFIRMAR]** allí donde el PDI da la fórmula pero no dice de qué se promedia. Nada de la §3 debe implementarse antes de confirmar esas marcas.

| Sección | Qué es | Dependencia |
|---|---|---|
| §1 Escuadrón | **Ya existe.** Dos catálogos de alumnos, recapitulados | — (56 para la columna de estado teórico) |
| §2 Alertas y desaprobados | §2.1 nuevo; §2.2–§2.6 ya existen y necesitan `@PreAuthorize` | 66, 17 |
| §3 Índices del PDI | Nuevo, y con operandos **[CONFIRMAR]** | 8 → 61, 62; 6 y 70 para la mitad teórica |
| §4 Orden de mérito | Nuevo | 8 → 62, 63 |
| §5 Estado teórico e historial teórico | §5.1 amplía la 7; §5.2 y §5.3 nuevos | 7, 68, 56, 6, 67 |
| §6 Legajo y ciclo de chequeo | §6.1 y §6.2 nuevos; §6.3 ya existe | 64, 65, 12 |
| §8 Predicción de riesgo | Ya existe, inalcanzable | 9, 39, 49, 69 |

Lo que **no** está en este contrato y nadie hereda, porque M5 es la última etapa, está en spec §17.6: el token de versión del autoguardado del examen, la prueba de CA-EXA-12, el bug 58 de `GET /api/personas/{cod}/status`, una vista de riesgo de todo el escuadrón, el `@PreAuthorize` de `GET /api/subfases/assigned` (que sí se pide aquí, en la dependencia 66, aunque ninguna pantalla lo llame) y la consistencia aritmética entre las fijaciones de historial y las de índices.

### Qué recogen las dos etapas anteriores

| Dejado por | Dónde lo dejaron | Dónde está aquí |
|---|---|---|
| Los cuatro endpoints de `DesaprobadoController` sin `@PreAuthorize` y `GET /api/subfases/assigned` | `contrato-api-turnos.md:589`: «Fuera de alcance de este contrato (M5; no hay endpoints de Desaprobados aquí)» | §2.2–§2.6 y dependencia 66 |
| `GET /prediction/students` y `GET /prediction/students/{studentId}` | `contrato-api-aprendizaje.md:428-434`: «las consume M5, no M3; su forma se fija cuando se escriba esa etapa» | §8 |
| El historial de exámenes del alumno y el mensaje **D14** | spec §16.6 ítem 1 | §5.2 |
| Las `causales[]` del estado teórico y su reconciliación con el catálogo de materias | spec §16.6 ítem 3, `contrato-api-teoria.md:783` | §5.1, seis códigos |
| La variante en lote de `estado-teorico` (dependencia 56) | spec §16.6 ítem 4, `contrato-api-teoria.md:1013` | §5.3 |
| Las inasistencias con la reducción del 50 % | spec §16.6 ítem 2 | §3, como **entrada que falta** (dependencia 70); no se construye pantalla |
| «Prevalece la primera nota» | spec §16.6 ítem 7, `contrato-api-teoria.md:679` | §3.2 y §5.2 |
| El consumidor de `materia.coeficiente` | `contrato-api-teoria.md:148`: «sigue sin consumidor: es la ponderación del NIT que calcula M5» | §3.2 |

---

## Convenciones

- **Base y autenticación.** Prefijo `/api` sobre `http://localhost:8080`; `Authorization: Bearer <jwt>` en todo salvo `/auth/**` (`security/config/SecurityConfig.java:50-52`); CORS solo para `http://localhost:5173` (`:79`). Sin token válido → `401`. La §8 no lleva prefijo y vive en `http://localhost:3000` (`sigeda_chat_status/src/main.ts:18-19`, sin `setGlobalPrefix`).
- **Autorización.** `@PreAuthorize("hasRole('<Permiso>')")` por método; la autoridad es `"ROLE_" + permiso.nombre`. Los cuatro permisos que usa este contrato **ya existen** (`security/entities/Permiso.java:10-13`, `Permission.java:12-18`, `Role.java:9-37`), a diferencia de los de teoría: `Read`, `View My Group`, `View All Groups`, `View Disapproved` y `Create Reports`. **Pero `Create Reports` no protege hoy ningún endpoint**: un grep de `CREATE_REPORTS` sobre `src/main` solo devuelve sus tres declaraciones y los tres conjuntos de rol, y los dos endpoints de reporte que existen piden `Read` (`evaluacion/controllers/EvaluacionController.java:84-85,102-104`). La §4.1 es el primer endpoint que lo usaría de verdad.
- **Quién llama.** Ningún controlador lo sabe: `@AuthenticationPrincipal` no aparece en ninguna parte y el JWT solo trae `sub`, `iat` y `exp` (`security/config/JwtUtils.java:31-38`). Mientras la dependencia 51 no exista, los endpoints de este contrato reciben el código del alumno **en la ruta** y el frontend lo toma del `codPersona` de la sesión, **nunca de un parámetro de la URL**, comprobando la propiedad en sus cargadores de ruta: **es una comprobación de interfaz, no de servidor** (dependencia 20). Cuando la 51 llegue, el servidor resuelve `sub` → `Usuario` → `Persona.codigo` y rechaza con **D11** el legajo ajeno.
- **Alcance por grupo.** Los endpoints de escuadrón (§2.1, §4.1) y los catálogos de la §1 se comportan de dos maneras según el permiso del llamador: con `View All Groups` devuelven todos los grupos del programa; sin él, solo los grupos de los que el llamador es instructor, derivados por `turnos.cod_instructor` → `alumnos_turno` → `personas.id_grupo`, que es el mismo camino de `GET /api/grupos/instructor/{cod}/programa/{nombre}` (`grupo/services/GrupoServiceImpl.java:78-79`). Pedir un `idGrupo` fuera de ese alcance responde **D17**, no una lista vacía.
- **Envoltura de error.** La convención **§A** de `contrato-api-turnos.md` (`utils/Response.java`), igual que Turno, Evaluación, Persona, Grupo, Materia y Teoría:

  | Caso | HTTP | Cuerpo |
  |---|---|---|
  | Validación de campos | 400 | arreglo JSON crudo de `"'campo': mensaje"` (`Response.java:89-92`) |
  | Detalle inexistente | 404 | texto plano `"<Entidad> especificada no existe."` (`:68-71`) |
  | Lista vacía | 404 | texto plano `"No existen <lista> disponibles."` (`:73-76`) |
  | Eliminado | 200 | texto plano `"<Entidad> eliminado con éxito."` (`:63-66`, siempre masculino) |
  | Regla de habilitación | 403 | texto plano (`:78-80`) |
  | Paginado inválido | 400 | `{"error":"Argumento incorrecto","mensaje":"…"}` (`setCustomError`) |

  Cómo lo lee el frontend (`src/lib/api/errors.ts:83-105`): un texto plano por debajo de 500 se muestra tal cual (`:91`), un 403 de texto también (`:89`), un arreglo de textos se reparte por campo (`:90`), y la rama de 5xx (`:84`) **no** muestra el texto, solo lo manda a la consola.
- **Listas vacías.** 404 con texto. `sigeda.pagina` lo convierte en una página vacía (`src/lib/api/http.ts:138-145`) y `sigeda.lista` en `[]` (`:147-154`), **en cualquier endpoint de lista**. Ese es justamente el motivo por el que M5 necesita los avisos de dependencia: un endpoint que todavía no existe se ve *simplemente vacío* (spec M5-22).
- **`409` no existe en este backend.** `grep -rn CONFLICT src/main/java` no devuelve nada; el caso equivalente es **410 Gone** vía `ActionExpiredException` → `exception/GlobalExceptionHandler.java:131-140`, lanzado en tres lugares (`maniobra/services/ManiobraService.java:129`, `turno/services/TurnoService.java:138`, `turno/controllers/TurnoController.java:208`). **M5 no necesita ninguno de los dos:** es un módulo de solo lectura, sin ninguna regla de estado que rechazar. Se anota para que el contrato no parezca incompleto.
- **M5 no escribe nada.** Ningún endpoint de este contrato es `POST`, `PUT` o `DELETE`, con una sola excepción que **el frontend no llama**: `DELETE /api/desaprobados/{cod}` (§2.5), documentado porque existe, no tiene permiso y cualquier usuario autenticado lo alcanza.
- **Fechas y horas.** Fechas `yyyy-MM-dd`, leídas con `DateTimeFormatter.ofPattern("uuuu-MM-dd")` (`utils/CustomDateDeserializer.java:15`). Horas `"HH:mm"`. Hay **un** instante en este contrato, `calculadoEn` en §3.1 y §4.1, y **por eso se parte en dos campos**: `fechaCalculo` (`yyyy-MM-dd`) y `horaCalculo` (`HH:mm`), como hizo M4-8, porque el dominio no tiene precedente de ISO-8601 con desfase y lo que Spring emitiría es indeterminado. La §8 sí devuelve un instante ISO-8601 (`computedAt`), porque es el otro servidor y ya lo hace.
- **Números.** Todos los índices (`nfpi`, `nit`, `nia`, `nct`, `nei`, `na`, `pe`, `pt`, `nfad`, `nfoh`, `nfoa`) son **números JSON con 2 decimales o `null`**, nunca texto y nunca `0` para «no se pudo calcular». Los promedios prácticos que devuelven los endpoints que ya existen siguen llegando **como texto** (`evaluaciones_practicas.promedio varchar(255)`, `schema_prod.sql:176`, escrito con `String.format("%.1f", total)`, `evaluacion/utils/CalculoNota.java:85`) y el frontend los tolera con `aNota` (`src/features/evaluaciones/api.ts:111-115`). **La dependencia 62 pide que esa columna pase a numérica**, porque ordenarla o promediarla en SQL es lexicográfico sin un cast, y las §3 y §4 hacen las dos cosas.
- **Paginación.** `utils/Page_Sort.java` (`page` def. `0`, `size` def. `6`, `direction` def. **`ASC`**, `property` **uno**, sin tope de tamaño, `:10-12,29-41`), con el `Page` de Spring serializado directo. El frontend lee `content`, `totalElements`, `totalPages`, `size` y `number`, y pide `size=10`. Los cuatro mensajes de paginado inválido son los de `contrato-api-matricula.md` › Paginación, byte a byte.
- **`programa` inválido no da 400.** `StringToProgramaConverter` **devuelve `PDI` en silencio** ante cualquier valor que no reconozca (`contrato-api-turnos.md` › Enumeraciones). Este contrato no lo cambia; los mocks lo replican, y por eso ninguna pantalla depende de un 400 por programa.
- **Filtros inválidos se ignoran.** Como en teoría: un valor de enum que no existe llega `null` (`spring.jackson.deserialization.READ_UNKNOWN_ENUM_VALUES_AS_NULL=true`, `application.properties:35`) y el filtro simplemente no se aplica. No hay 400 por filtro.
- **Mensajes visibles.** El frontend muestra literalmente los mensajes de la §7 y nada más; cualquier otro texto se reemplaza por el genérico y solo va a la consola.

---

## Permisos

| Permiso | Roles (`security/entities/Role.java`) | Uso en este contrato |
|---|---|---|
| `Read` | todos | §1 (vía los catálogos), §3.1, §5, §6 (el alumno: solo lo propio, dependencias 20 y 51) |
| `View My Group` | Administrador Web, Comandante, Jefe de Operaciones, Instructor (`:13,21,28,32`) | §1.2 |
| `View All Groups` | Administrador Web, Comandante (`:14,22`) | §1.1, y el alcance ampliado de §2.1 y §4.1 |
| `View Disapproved` | Administrador Web, Comandante, Instructor (`:12,20,27`) | §2 completa, §8 |
| `Create Reports` | Administrador Web, Comandante, Instructor (`:12,20,27`) | §4.1 |

**Todo holder de `View All Groups` tiene también `View My Group`** (`:13-14`, `:21-22`), así que la pantalla de escuadrón se protege con `View My Group` y usa el otro como interruptor interno (spec M5-5). **El Jefe de Operaciones no tiene `Create Reports` ni `View Disapproved`** (`:30-34`): ve el escuadrón y no ve las alertas ni el orden de mérito. Es un hecho del backend, no una decisión del frontend; si debe cambiar, `CREATE_REPORTS` entra en `Role.Operaciones`, que es un cambio de código y un redespliegue, nunca un cambio de dato.

**Ningún endpoint nuevo de este contrato introduce un permiso nuevo.** Es la diferencia principal con `contrato-api-teoria.md`, cuyos cuatro permisos había que crear (dependencia 54).

---

## Enumeraciones

| Enum | Valores | Etiqueta en la interfaz |
|---|---|---|
| `Estado` (alumno) | `Apto`, `En Chequeo`, `En Observación`, `En Final`, `En Complementación`, `En Deliberación`, `No Apto` | Apto · En chequeo · En observación · En final · En complementación · En deliberación · No apto |
| `Clasificacion` | `Malo`, `Regular`, `Bueno`, `Excelente` | igual |
| `Categoria` | `Ponderada`, `Chequeo`, `chequeoSubFase`, `Complementacion` | Ponderada · Chequeo · Chequeo Sub Fase · Complementación |
| `Programa` | `PDI`, `PDE` | igual |
| `Fase` | `Adaptación`, `Operaciones HeliTransportadas`, `Operaciones AeroTácticas` | igual |
| `TipoAlerta` (**nuevo**) | `VUELO_DESAPROBADO`, `ESTADO_CRITICO`, `CHEQUEO_PENDIENTE`, `SUBSANACION_PENDIENTE`, `CAUSAL_TEORICO` | Vuelo desaprobado · Estado crítico · Chequeo pendiente · Subsanación pendiente · Causal teórico |
| `Severidad` (**nuevo**) | `ALTA`, `MEDIA`, `BAJA` | Alta · Media · Baja |
| `CausalTeorico` (**nuevo**) | `PROMEDIO_ASIGNATURA`, `TRES_ASIGNATURAS`, `DOS_EXAMENES`, `SEGUNDA_SUBSANACION`, `PERIODICOS_MATERIA`, `INOPINADOS` | ver §5.1 |
| `NivelRiesgo` (§8, ya existe) | `bajo`, `medio`, `alto` | Bajo · Medio · Alto |
| `Tendencia` (§8, ya existe) | `up`, `down`, `flat` | Subiendo · Bajando · Estable |

**El `Estado` del alumno se serializa como el string con tildes y espacios, no como el nombre del enum.** El enum se llama `Apto`, `enChequeo`, `enObservacion`, `enFinal`, `enComplementacion`, `enDeliberacion`, `noApto` (`grupo/entities/Estado.java:3-10`) pero su `nombre` es el texto de la tabla y es lo que viaja. El frontend ya tiene las siete claves exactas en `ESTADOS_ALUMNO` (`src/lib/dominio/vocabulario.ts:20-28`) con su tono.

**Aviso de semilla:** `data_prod.sql:178` guarda `estado_alumno = 'Chequeo'` en una evaluación, y `'Chequeo'` **no es un valor del enum** (el nombre es `"En Chequeo"`). El frontend lo mostrará tal cual con tono neutro (`termino()` cae a `{etiqueta: valor, tono: 'neutro'}`, `vocabulario.ts:89-92`). Corregir el dato es parte de la dependencia 19.

**`Fase` no es un enum en el backend.** Es un `varchar` denormalizado en la evaluación (`schema_prod.sql:173`) cuyos tres valores están escritos a mano en la entidad (`evaluacion/entities/EvaluacionPractica.java:239-246`) y coinciden con las tres filas de `fases` (`data_prod.sql:1-4`). Las tres iniciales son exactamente las de `NFAD`, `NFOH` y `NFOA`. **Nada las une**, y por eso la dependencia 62 pide la FK: un renombre de fase rompe en silencio cualquier agregado por fase.

---

## 1. Escuadrón — lo que ya existe

**No hay endpoint nuevo aquí, y no se pide ninguno.** La pantalla de Escuadrón se arma con los dos catálogos que ya existen, más la columna de estado teórico de la §5.3.

```
GET /api/grupos/programa/{nombre}?page&size&direction&property                  View All Groups
GET /api/grupos/instructor/{cod}/programa/{nombre}?page&size&direction&property  View My Group
```

### 1.1 `GET /api/grupos/programa/{nombre}` — **sin cambios**

`Page<CatalogoByPrograma>` (`grupo/controllers/GrupoController.java:123-125`, `projections/CatalogoByPrograma.java:5-14`). Cada elemento de `content` es un grupo que expone **solo** sus personas:

```json
{
  "content": [
    { "personas": [ { "codigo": "555555", "nombre": "Pedro", "aPaterno": "Rodriguez", "aMaterno": "Garcia", "idGrupo": 3, "estado": "Apto" } ] }
  ],
  "totalElements": 6, "totalPages": 1, "size": 200, "number": 0
}
```

**No trae `id` de grupo, ni `nombre`, ni `programa`.** El frontend recupera la identidad del grupo desde `personas[].idGrupo` y arma la etiqueta `Grupo {idGrupo}` (S4), como ya hace `src/features/catalogos/api.ts:102`. El `nombre` real del grupo llega por otra vía: la §6.1.

`property` por defecto `"id"` (`:129`). Página vacía → **404** D1.

### 1.2 `GET /api/grupos/instructor/{cod}/programa/{nombre}` — **sin cambios, con dos avisos**

`Page<CatalogoByAlumnoTurno>` = `{"persona": [...]}` sobre la misma proyección de alumno (`:154-156`, `projections/CatalogoByAlumnoTurno.java:7-9`).

1. **Pagina sobre filas de `alumnos_turno`, no sobre alumnos** (`grupo/services/GrupoServiceImpl.java:78-79` → `turno/dao/IAlumno_TurnoDao.java:24-25`), así que un alumno aparece una vez por turno volado con ese instructor. El frontend deduplica por `codigo` y **recorre todas las páginas hasta `totalPages`** en lugar de pedir una sola de 100, porque un instructor con muchos turnos truncaría el conjunto de alumnos (spec M5-6). `Page_Sort` no tiene tope de tamaño, así que paginar es una elección, no una restricción.
2. **La proyección declara `List<Alumno> getPersona()` contra un `@OneToOne Persona` único** (`turno/entities/Alumno_Turno.java:24-26`). El frontend acepta las dos formas (`catalogos/api.ts:113`). La corrección es la decisión M1-9 de `contrato-api-turnos.md` §4.6 y sigue pendiente.

Página vacía → **404** D1, que el frontend muestra como S2 («no tiene alumnos asignados») y no como un error.

**Lo que estos dos catálogos sí dan, y es lo único Real del escuadrón:** `codigo`, nombre completo, `idGrupo` y **`estado`**. El `estado` es el hecho más importante de Seguimiento y es el único que llega sin ninguna dependencia. Ninguno de los dos trae promedio, índice, alerta ni tendencia: para eso están las §§2–4.

---

## 2. Alertas y desaprobados

```
GET    /api/seguimiento/alertas?programa=&idGrupo=&tipo=&fechaPre=&fechaPost=&page=&size=&direction=&property=   View Disapproved   [NUEVO, dep. 66]
GET    /api/desaprobados/persona/{codPersona}                        View Disapproved   [existe]
GET    /api/desaprobados/alumno/{cod}/subfase/{id}                   View Disapproved   [existe, HOY SIN PERMISO]
GET    /api/desaprobados/regular/alumno/{cod}/subfase/{id}           View Disapproved   [existe, HOY SIN PERMISO]
DELETE /api/desaprobados/{cod}                                       Modify Evaluations [existe, HOY SIN PERMISO]
GET    /api/desaprobados/exist/{cod}                                 View Disapproved   [existe, HOY SIN PERMISO]
```

**Los cuatro últimos no tienen `@PreAuthorize` hoy** (`evaluacion/controllers/DesaprobadoController.java:56-57,73-74,91-92,104-105`). La columna de permiso de arriba es **lo que este contrato pide**, no lo que hay. Es la mitad de `sigeda-back` de la dependencia 17, que `contrato-api-turnos.md:589` dejó explícitamente para M5.

### 2.1 `GET /api/seguimiento/alertas` — **nuevo**

**Por qué es un endpoint nuevo y no un bucle.** Lo que la pantalla necesita es «las alertas abiertas de los alumnos que este usuario ve». Hoy eso sería: una petición al catálogo de la §1 (que no trae `id` de grupo), y luego, por cada alumno, una a `GET /api/desaprobados/persona/{cod}`, una a `GET /api/personas/{cod}/estado-teorico` y una lectura de contadores que **ningún rol de Seguimiento puede hacer** (§6.1). N+1 sobre N+1, y con el agravante de que la versión «barata» del bucle es el propio agujero de seguridad de §2.2. Ningún endpoint de `sigeda-back` devuelve hoy datos de más de un alumno con notas: los cinco catálogos de grupo son los únicos multi-alumno y ninguno trae promedio.

Parámetros, todos opcionales salvo `programa`: `programa` (obligatorio, `PDI` o `PDE`), `idGrupo` (int), `tipo` (`TipoAlerta`), `fechaPre` y `fechaPost` (`yyyy-MM-dd`, inclusivas sobre `fecha`). Paginado `Page_Sort` con `property` por defecto **`"severidad"`**; el orden por defecto es `severidad` (`ALTA` → `MEDIA` → `BAJA`) y, dentro de cada severidad, `fecha` **descendente**. Propiedades ordenables: `severidad`, `fecha`, `tipo`, `alumno`.

Alcance: los grupos del llamador, o todos los del programa si además tiene `View All Groups` (Convenciones › Alcance por grupo). Un `idGrupo` fuera del alcance → **403** D17. Un `idGrupo` que no existe → **404** D18.

**200** — `Page` de filas planas:

```json
{
  "content": [
    {
      "id": "VUELO_DESAPROBADO:666666-1",
      "tipo": "VUELO_DESAPROBADO",
      "severidad": "ALTA",
      "codAlumno": "666666",
      "alumno": "Ana Torres Martinez",
      "idGrupo": 3,
      "grupo": "Grupo 3",
      "programa": "PDI",
      "fecha": "2026-09-18",
      "detalle": "Vuelo Malo en Contacto.",
      "codEvaluacion": "666666-1",
      "idSubfase": 1,
      "idMateria": null,
      "causal": null
    }
  ],
  "totalElements": 8, "totalPages": 1, "size": 10, "number": 0,
  "first": true, "last": true, "numberOfElements": 8, "empty": false
}
```

`id` es una clave sintética `"<tipo>:<clave natural>"`, estable entre peticiones, que el frontend usa como clave de fila y nada más; las alertas **no son filas de una tabla** y no tienen id propio en la base. `codEvaluacion`, `idSubfase`, `idMateria` y `causal` son los punteros que la fila necesita para enlazar, y son `null` cuando el tipo no los tiene.

**Cómo se deriva cada tipo.** Ninguno es un dato nuevo: los cinco salen de lo que ya está guardado.

| `tipo` | `severidad` | Se abre cuando | `fecha` | Punteros | Enlace del frontend |
|---|---|---|---|---|---|
| `VUELO_DESAPROBADO` | `ALTA` | existe una fila en `desaprobados` del alumno (`schema_prod.sql:143-152`) | `desaprobados.fecha` | `codEvaluacion`, `idSubfase` | la evaluación |
| `ESTADO_CRITICO` | `ALTA` | `personas.estado` ∈ `{En Chequeo, En Final, En Deliberación, No Apto}` | la `fecha` de la última evaluación del alumno | — | el legajo |
| `CHEQUEO_PENDIENTE` | `MEDIA` | los contadores del alumno **ya cumplen** el criterio de su fase (§6.2) **y** su `estado` sigue siendo `Apto` o `En Observación` | la `fecha` de la última evaluación | `idSubfase` de la última evaluación | el panel de chequeo |
| `SUBSANACION_PENDIENTE` | `MEDIA` | `estado-teorico.bloqueadoPorSubsanacion` es `true` (§5.1) | la `fechaExamen` del turno desaprobado | `idMateria` | la pestaña Teórico |
| `CAUSAL_TEORICO` | `ALTA` | `estado-teorico.causales` no está vacío; **una fila por causal** | la fecha del hecho que la disparó | `idMateria` (cuando el código la lleva), `causal` | la pestaña Teórico |

`CHEQUEO_PENDIENTE` **no se abre** para un alumno cuyo estado ya se movió: si el criterio se cumplió y `ResultadoController` ya lo pasó a `En Chequeo`, lo que corresponde es `ESTADO_CRITICO`. Los dos tipos nunca coinciden en el mismo alumno.

`detalle` es una frase corta que el servidor arma y **el frontend muestra literalmente**, sin plantilla propia. No lleva id de la §7 porque es variable; si llega vacío, el frontend muestra la etiqueta del tipo y nada más.

Página vacía → **404** D10, que el frontend muestra como S7.

### 2.2 `GET /api/desaprobados/persona/{codPersona}` — **corrección de seguridad**

```
GET /api/desaprobados/persona/{codPersona}   View Disapproved
```

`List<Desaprobado>` (`evaluacion/controllers/DesaprobadoController.java:38-54`), con `persona` excluida por `@JsonBackReference` (`evaluacion/entities/Desaprobado.java:49-52`):

```json
[ { "codigo": "555555-1", "clasificacion": "Regular", "subfase": "Contacto", "fecha": "2024-03-01", "programa": "PDI", "idSubfase": 1 } ]
```

**Corrección (dependencia 66).** El servicio no filtra por persona: `findByCodPersona` llama a `findByCodigoContaining`, es decir un `LIKE %cod%` **sobre el código de la evaluación**, no una igualdad sobre `cod_persona` (`evaluacion/services/DesaprobadoServiceImpl.java:23-25`, `evaluacion/dao/IDesaprobadoDao.java:17-18`). Consecuencia: **cualquier titular de `View Disapproved` — el Instructor incluido (`Role.java:27`) — obtiene los desaprobados de todos los alumnos pasando un valor de un solo carácter**, y como el `Desaprobado` identifica a su alumno por el prefijo de su código, también aprende de quién son. La columna `cod_persona` existe (`schema_prod.sql:147`) y la relación está mapeada (`Desaprobado.java:49-52`): basta un `findByPersona_Codigo`.

Mientras eso no esté corregido, **la capa de API del frontend rechaza un `codPersona` que no tenga exactamente seis caracteres antes de construir la URL** (spec M5-8, CA-ALE-06). No es una mitigación del agujero — quien quiera explotarlo no pasa por el frontend — sino la garantía de que ninguna pantalla lo normaliza.

Lista vacía → **404** D3 (`isEmpty(nombreLista)` con `nombreLista = Desaprobado.class.getAnnotation(Table.class).name()` = `"desaprobados"`, `:32,50-51`), que el frontend trata como lista vacía.

### 2.3 `GET /api/desaprobados/alumno/{cod}/subfase/{id}` — **necesita `@PreAuthorize`**

El último `Desaprobado` del alumno en esa subfase (`:56-71`, `findFirstByCodigoContainingAndIdSubfaseOrderByCodigoDesc`). Misma forma que §2.2, un objeto. `null` → **404** D4. **Hoy no tiene permiso declarado:** cualquier usuario autenticado, incluido un Alumno, lee el de cualquier otro. M5 no lo llama.

### 2.4 `GET /api/desaprobados/regular/alumno/{cod}/subfase/{id}` — **necesita `@PreAuthorize`**

Igual que §2.3 pero filtrado a `clasificacion = Regular` (`:73-89`). `null` → **404** D4. Sin permiso hoy. M5 no lo llama.

### 2.5 `DELETE /api/desaprobados/{cod}` — **necesita `@PreAuthorize`, y es el peor de los cinco**

`deleteByCodigo` **sin comprobación de existencia**, y responde siempre **200** D5 aunque el código no exista (`:91-102` → `Response.java:63-66`). Hoy, **cualquier usuario autenticado — incluido el Alumno cuyo vuelo desaprobado es — puede borrar el registro de su propio fallo**, y el sistema contesta que fue bien. Este contrato pide `Modify Evaluations` (el permiso que ya gobierna modificar y eliminar una evaluación, `EvaluacionController.java:402-404`) y un **404** D4 cuando el código no existe. **M5 nunca lo llama**; está aquí porque existe.

### 2.6 `GET /api/desaprobados/exist/{cod}` — **necesita `@PreAuthorize`**

Devuelve `true` o `false` crudos (`:104-116`). Sin permiso hoy. M5 no lo llama.

**Y una sexta ruta de la misma dependencia:** `GET /api/subfases/assigned` tampoco tiene `@PreAuthorize` (`maniobra/controllers/SubFaseController.java:47-50`), a diferencia de sus tres hermanas del mismo controlador (`:29-30` `Read`, `:41-42` `Manage Subphases`, `:52-53` `Read`). Debería pedir `Read`. Ninguna pantalla de M5 la llama; se pide aquí porque la dependencia 17 la nombra y ningún contrato la había recogido.

---

## 3. Índices del PDI — dependencia 8, partida en 61 y 62

```
GET /api/personas/{cod}/indices   Read   [NUEVO, deps. 61 y 62; su mitad teórica además depende de 6 y 70]
```

**Nada de esto existe.** Un grep insensible a mayúsculas sobre `sigeda-back/src/main` de `nfpi|\bnit\b|\bnia\b|merito|mérito|ranking|legajo|nfad|nfoh|nfoa|coeficiente` devuelve **cero líneas**: ni entidad, ni columna, ni servicio, ni proyección, ni endpoint. Lo único aritmético que el backend hace es el `promedio` y la `clasificacion` **de una evaluación** (`evaluacion/utils/CalculoNota.java`, invocado solo para `Ponderada` y `Chequeo Sub Fase`, `evaluacion/controllers/EvaluacionController.java:291-292,379-380`).

**El frontend no calcula ninguno de estos números** (spec M5-2). Los pide, los muestra con dos decimales y, si llegan `null`, lo dice (S14). No hay cálculo de respaldo, ni estimación, ni «mientras tanto».

### 3.1 `GET /api/personas/{cod}/indices` — **nuevo**

`Read`, y con la dependencia 51 restringido al propio alumno o a un rol de personal (**403** D11). **404** D2 si el código no resuelve a ninguna persona.

**200** — siempre 200 cuando la persona existe, **nunca 404 por falta de datos**, porque la pantalla necesita distinguir «no calculable» de «no encontrado»:

```json
{
  "codigo": "555555",
  "alumno": "Pedro Rodriguez Garcia",
  "programa": "PDI",
  "nfpi": 16.44,
  "nit": {
    "valor": 17.60,
    "nct": 18.00,
    "nei": 16.00,
    "materias": [
      { "idMateria": 1, "materia": "Aerodinámica Aplicada a Helicópteros", "coeficiente": 0.13, "coeficienteAplicado": 0.13, "pe": 18.00, "pt": 18.00, "na": 18.00 }
    ],
    "materiasSinNota": [],
    "reduccionPorRezagadoAplicada": false
  },
  "nia": {
    "valor": 16.15,
    "fases": [
      { "fase": "Adaptación",                    "sigla": "NFAD", "peso": 0.40, "valor": 17.00, "evaluaciones": 3 },
      { "fase": "Operaciones HeliTransportadas", "sigla": "NFOH", "peso": 0.35, "valor": 16.00, "evaluaciones": 2 },
      { "fase": "Operaciones AeroTácticas",      "sigla": "NFOA", "peso": 0.25, "valor": 15.00, "evaluaciones": 2 }
    ]
  },
  "fechaCalculo": "2026-09-25",
  "horaCalculo": "07:30"
}
```

`nfpi`, `nit.valor` y `nia.valor` son `number` con 2 decimales **o `null`**. `nit` y `nia` nunca son `null` como objeto: si su `valor` no se puede calcular, el objeto viene con `valor: null` y su desglose con lo que sí hay, para que la pantalla explique qué falta. Una fase sin ninguna evaluación puntuada trae `valor: null` y `evaluaciones: 0`.

### 3.2 Las fórmulas, y qué parte de ellas está definida

Las **cuatro fórmulas** son del PDI y están en spec §3.4; no se discuten:

```
NFPI = NIT · 0.20 + NIA · 0.80
NIT  = NCT · 0.80 + NEI · 0.20
NIA  = NFAD · 0.40 + NFOH · 0.35 + NFOA · 0.25
NA   = PE · 0.60 + PT · 0.40
```

**Los operandos no están definidos en ninguna fuente leída.** Ni el código de `sigeda-back`, ni `schema_prod.sql`, ni los contratos anteriores dicen de qué se promedia `NFAD`, ni qué es `NEI`, ni a qué nivel se aplica `NA`. Lo que sigue es una **propuesta** derivada de dos hechos comprobables — el catálogo de `TipoExamen` tiene once valores y los once `materia.coeficiente` de la semilla suman exactamente **1.00** (`contrato-api-matricula.md` › Materias: 0.13 + 0.16 + 0.22 + 0.10 + 0.10 + 0.10 + 0.04 + 0.04 + 0.04 + 0.04 + 0.03) — y **cada pieza que no se pueda justificar así lleva [CONFIRMAR]**.

| Operando | Propuesta | Estado |
|---|---|---|
| `NFAD`, `NFOH`, `NFOA` | Media **aritmética** del `promedio` de las evaluaciones del alumno en esa fase cuya `categoria` es `Ponderada` o `Chequeo Sub Fase` | **[CONFIRMAR]** el conjunto y que no haya ponderación por subfase |
| — qué categorías cuentan | Solo esas dos, porque son las únicas que `CalculoNota` puntúa (`EvaluacionController.java:291-292`); un `Chequeo` guarda `promedio: null` (`data_prod.sql:178`) y una `Complementación` no se puntúa | Derivado del código |
| — cómo se agrupa por fase | Por el `varchar` `evaluaciones_practicas.fase`, cuyos tres valores están escritos a mano en `EvaluacionPractica.java:239-246` | Derivado del código; **la dependencia 62 pide la FK** |
| `PT` | Media de las `nota` de los cuestionarios del alumno de esa materia con `tipoExamen = TEST` | **[CONFIRMAR]** |
| `PE` | Media de las `nota` de los cuestionarios del alumno de esa materia con `tipoExamen = EXAMEN` | **[CONFIRMAR]** |
| `NA` | Por **materia**: `PE · 0.60 + PT · 0.40` | **[CONFIRMAR]** que `NA` es por materia y no por parte del curso |
| `NCT` | `Σ NA(materia) · coeficienteAplicado(materia)` sobre las materias con al menos una nota | **[CONFIRMAR]** |
| — `coeficienteAplicado` | El `materia.coeficiente` **renormalizado** para que sume 1.00 sobre las materias con nota, y `materiasSinNota[]` enumera las que quedaron fuera | **[CONFIRMAR]**: la alternativa es que `NCT` sea `null` hasta tener las once, lo que lo dejaría `null` durante todo el curso |
| `NEI` | Media de las `nota` de todos los cuestionarios del alumno cuyo `tipoExamen` **no** es `TEST` ni `EXAMEN`: los nueve restantes (`SEMANAL`, `QUINCENAL`, `MENSUAL`, `SEMESTRAL`, `INOPINADO`, `PRE_SOLO`, `SUBSANACION`, `REZAGADO`, `BALOTAS`) | **[CONFIRMAR]**. Es la pieza más débil de la propuesta: la única razón para creerla es que así los once tipos se usan exactamente una vez entre `NA` y `NEI`, sin que ninguno quede sin destino ni se cuente dos veces |

**Reglas que sí están fijadas y no son propuesta:**

- **Prevalece la primera nota.** Una subsanación **no reemplaza** la nota desaprobada: las dos entran en la media de su materia (spec §3.4, `contrato-api-teoria.md:679`, spec §16.6 ítem 7). Así que una subsanación aprobada levanta el promedio sin borrar el fallo, y `TRES_ASIGNATURAS` (§5.1) sigue contando la materia como desaprobada.
- **`null` propaga, y no se rellena con 0.** Si `NFOH` es `null`, `NIA` es `null`; si `NIA` es `null`, `NFPI` es `null` aunque `NIT` exista. Un índice ausente **nunca** se devuelve como `0`: 0 es una nota posible y confundir las dos cosas es la manera de publicar un orden de mérito falso.
- **Redondeo.** Cada índice se redondea a 2 decimales **una sola vez, al final**; los operandos intermedios no se redondean. Las fijaciones de la §9 están elegidas para que las cifras sean exactas con o sin esa regla, así que ninguna prueba depende de ella.
- **`reduccionPorRezagadoAplicada`.** El PDI reduce al 50 % la nota de un rezagado injustificado (spec §3.4). Ese dato **no existe**: la marca de inasistencia justificada se recortó de M4 (spec §16.6 ítem 2) y es la dependencia **70**. Hasta que exista, el campo es siempre `false` y **`NEI` cuenta cada rezagado a valor nominal**, es decir `NIT` es optimista para todo alumno que faltó a un examen. El campo está en la respuesta desde el principio para que el día que la 70 llegue no haya que cambiar la forma, y para que quien lea la pantalla sepa que la reducción no se aplicó.
- **La mitad teórica está bloqueada por la 6.** `NCT`, `NEI` y `NA` se calculan sobre `cuestionarios` y `calificaciones_teoricas`, siete tablas que no existen (`contrato-api-teoria.md` §8, dependencia 53). Hasta que la 6 exista, `nit.valor` es `null` y `nfpi` con él; `nia` sí se puede calcular desde el primer día, porque sus insumos son las evaluaciones prácticas que ya están guardadas.

---

## 4. Orden de mérito — la otra mitad de la dependencia 8

```
GET /api/reportes/orden-merito?programa=&idGrupo=&page=&size=&direction=&property=   Create Reports   [NUEVO, deps. 62 y 63]
```

### 4.1 `GET /api/reportes/orden-merito` — **nuevo**

`programa` obligatorio; `idGrupo` opcional. Alcance por grupo como en §2.1: **403** D17 fuera de alcance, **404** D18 si el grupo no existe. Paginado `Page_Sort` con `property` por defecto **`"puesto"`** y `direction` por defecto `ASC`; propiedades ordenables: `puesto`, `nfpi`, `nit`, `nia`, `alumno`, `codigo`.

**Este es el primer endpoint de `sigeda-back` que `Create Reports` protegería de verdad.**

**200** — `Page` de filas planas, ya ordenadas por el servidor:

```json
{
  "content": [
    { "puesto": 1,    "codigo": "222222", "alumno": "Juan Falconi Fernandez", "idGrupo": 2, "grupo": "Grupo 2", "nfpi": 17.16, "nit": 17.20, "nia": 17.15, "motivoSinNfpi": null },
    { "puesto": null, "codigo": "666666", "alumno": "Ana Torres Martinez",    "idGrupo": 3, "grupo": "Grupo 3", "nfpi": null,  "nit": 12.80, "nia": null,  "motivoSinNfpi": "Sin evaluaciones en Operaciones HeliTransportadas y Operaciones AeroTácticas." }
  ],
  "totalElements": 6, "totalPages": 1, "size": 10, "number": 0,
  "fechaCalculo": "2026-09-25", "horaCalculo": "07:30"
}
```

`fechaCalculo` y `horaCalculo` viajan **junto al `Page`**, no dentro de cada fila: son del cálculo, no del alumno. El frontend los muestra en S22. (Añadir dos campos al lado de un `Page` de Spring obliga a envolver la respuesta; si eso resulta incómodo, la alternativa es un objeto `{"pagina": {…}, "fechaCalculo": …, "horaCalculo": …}` y el frontend cambia un adaptador.)

**Orden y desempate, fijados:** `nfpi` **descendente**, y ante empate `nia` descendente, y si también empata `codigo` **ascendente**. El `puesto` es el que calcula el servidor con esa regla y **el frontend no lo recalcula nunca**, ni siquiera cuando el usuario reordena la tabla por otra columna: reordenar cambia las filas de sitio, no su puesto. El frontend muestra la regla en S23.

**Alumnos sin NFPI completo:** `puesto: null`, al final de la última página, con `motivoSinNfpi` como frase corta que el frontend muestra literalmente en S24. **No se les asigna puesto** y no desplazan a nadie: los puestos van 1..n sobre los alumnos rankeables.

**Un alumno sin grupo no aparece** (la alumna `654321` de las fijaciones): el reporte es por programa y grupo, y un alumno sin grupo no pertenece a ninguno de los dos alcances. Consultar su legajo sigue siendo posible por §3.1.

Página vacía → **404** D12, que el frontend muestra como S25.

**Por qué no se puede hacer en el cliente** (spec M5-2): el único endpoint de evaluaciones que existe está **por persona** (`EvaluacionController.java:125-127`), así que una versión de cliente cuesta una petición por alumno del escuadrón, más una por página del historial de cada uno, y termina ordenando por una columna `varchar` que el navegador tendría que parsear. Con la dependencia 62 y este endpoint, es una consulta.

---

## 5. Estado teórico e historial teórico

```
GET /api/personas/{cod}/estado-teorico                                     Read   [existe en el contrato de teoría §5.1; aquí gana causales[], dep. 68]
GET /api/cuestionarios?codAlumno=&idMateria=&estado=&page=&size=           Read   [NUEVO, dep. 67]
GET /api/estado-teorico?codAlumnos=a,b,c                                   Read   [NUEVO, dep. 56]
```

### 5.1 `GET /api/personas/{cod}/estado-teorico` — **amplía el contrato de teoría**

La forma de `contrato-api-teoria.md` §5.1 **no cambia**; gana un campo. **404** D2 si el código no existe. Con la dependencia 51, **403** D11 para un alumno ajeno.

```json
{
  "codAlumno": "666666",
  "alumno": "Ana Torres Martinez",
  "bloqueadoPorSubsanacion": true,
  "motivo": "Desaprobó Adoctrinamiento de Vuelo con 12.00 (mínimo 18) el 2026-09-18.",
  "desaprobados": [ { "idCuestionario": 2, "idTurnoTeorico": 1, "turnoTeorico": "Mensual Adoctrinamiento de Vuelo", "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "tipoExamen": "MENSUAL", "fechaExamen": "2026-09-18", "nota": 12.00, "notaMinimaAplicada": 18 } ],
  "pendientes": [ 5 ],
  "causales": [
    { "codigo": "PROMEDIO_ASIGNATURA", "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "detalle": "Promedio 12.00 en Adoctrinamiento de Vuelo, por debajo de 13.", "fecha": "2026-09-18" }
  ]
}
```

**Los seis códigos de `CausalTeorico`, reconciliados con el catálogo de materias.** El PDI enumera las causales en spec §3.4: «promedio por debajo de 13 en una materia; 3 materias desaprobadas; 2 exámenes desaprobados; segunda subsanación desaprobada; 3 consecutivos o 5 alternados de un tipo periódico o de inopinados». M4 las había codificado en **siete** valores, dos de los cuales nombraban asignaturas — «Emergencias Críticas», «No Críticas», «Instrumentos» — que **no existen entre las once materias** del catálogo (spec §16.6 ítem 3 dejó la reconciliación a M5). Aquí los dos colapsan en **uno**, llevando la materia como dato en lugar de en el nombre:

| Código | Se abre cuando | `idMateria` |
|---|---|---|
| `PROMEDIO_ASIGNATURA` | el promedio del alumno en una materia está por debajo de **13** | la materia |
| `TRES_ASIGNATURAS` | tiene **3 o más** materias desaprobadas (una materia está desaprobada si su promedio, con las dos notas de cualquier subsanación, queda bajo su `notaMinima`) | `null` |
| `DOS_EXAMENES` | tiene **2 o más** cuestionarios desaprobados de `tipoExamen = EXAMEN` | `null` |
| `SEGUNDA_SUBSANACION` | desaprobó una subsanación de una subsanación | la materia |
| `PERIODICOS_MATERIA` | en una misma materia, **3 consecutivos** o **5 alternados** desaprobados de un mismo tipo periódico (`SEMANAL`, `QUINCENAL`, `MENSUAL`, `SEMESTRAL`) | la materia |
| `INOPINADOS` | **3 consecutivos** o **5 alternados** desaprobados con `tipoExamen = INOPINADO` | `null` |

`detalle` es una frase corta que el servidor arma y el frontend muestra literalmente; `fecha` es la del hecho que abrió la causal. **Las causales no bloquean nada por sí mismas**: quien bloquea es `bloqueadoPorSubsanacion` (`contrato-api-teoria.md` §5.1, decisión M4-12). Una causal es materia del Consejo de Evaluación, no una regla automática.

**Ninguna de las seis se puede calcular hoy**: todas necesitan historiales de exámenes por materia, que son la §5.2 y la dependencia 6. En los mocks las `causales[]` están **fijadas**, no derivadas, y la §9.7 dice de quién y por qué.

### 5.2 `GET /api/cuestionarios` — **nuevo, el historial teórico que M4 recortó**

`Read`; con la dependencia 51, un alumno solo puede pedir el suyo (**403** D11). Reaparece aquí con el id **D14** que `contrato-api-teoria.md:848` retiró al recortarlo.

Filtros: `codAlumno` (obligatorio mientras la 51 no exista), `idMateria` (int), `estado` (`EstadoCuestionario`: `EN_CURSO` o `ENTREGADO`). Paginado con `property` por defecto `"fechaExamen"` y `direction` por defecto **`DESC`** — el único endpoint de este contrato que invierte el `ASC` de `Page_Sort`, porque un historial se lee del último hacia atrás. Propiedades ordenables: `fechaExamen`, `nota`, `materia`, `tipoExamen`.

**200** — `Page` de filas planas:

```json
{
  "content": [
    {
      "id": 2, "idTurnoTeorico": 1, "turnoTeorico": "Mensual Adoctrinamiento de Vuelo",
      "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "tipoExamen": "MENSUAL",
      "fechaExamen": "2026-09-18", "estado": "ENTREGADO",
      "fechaEntrega": "2026-09-18", "horaEntrega": "08:52",
      "nota": 12.00, "notaMinimaAplicada": 18, "aprobado": false,
      "idTurnoOrigen": null, "turnoOrigen": null,
      "subsanadoPor": { "idTurnoTeorico": 5, "turnoTeorico": "Subsanación Adoctrinamiento de Vuelo", "fechaExamen": "2026-09-26", "estado": "PROGRAMADO", "nota": null }
    }
  ],
  "totalElements": 1, "totalPages": 1, "size": 10, "number": 0
}
```

`idTurnoOrigen`/`turnoOrigen` apuntan **hacia atrás** (la fila es una subsanación o un rezagado y este es su origen) y `subsanadoPor` apunta **hacia adelante** (esta fila fue desaprobada y existe un turno que la subsana). Los dos punteros existen para que la pantalla pueda poner las dos notas una al lado de la otra y decir, con S17, que **prevalece la primera**: una subsanación aprobada no borra el `aprobado: false` de su origen ni lo saca de la media de §3.2.

`nota` y `notaMinimaAplicada` son los que el servidor calculó en M4 (`contrato-api-teoria.md` §4.4) y **el frontend no recalcula ninguno**; los muestra con `textoConMinimo` (`src/lib/dominio/teoria.ts:115-117`). Una fila `EN_CURSO` trae `nota`, `aprobado`, `fechaEntrega` y `horaEntrega` en `null`.

Página vacía → **404** D14, que el frontend muestra como panel vacío.

### 5.3 `GET /api/estado-teorico?codAlumnos=` — **nuevo, la dependencia 56**

`Read`. `codAlumnos` es una lista separada por comas, de **1 a 100** códigos. Devuelve un objeto por alumno, con la misma forma de §5.1 pero **sin `causales[]`** — la pantalla que lo consume es una lista y solo necesita el bloqueo:

```json
[ { "codAlumno": "666666", "alumno": "Ana Torres Martinez", "bloqueadoPorSubsanacion": true, "motivo": "…", "desaprobados": [ … ], "pendientes": [ 5 ] } ]
```

Un código que no existe **se omite del arreglo**, no rompe la respuesta: el llamador es una lista de alumnos que puede haber cambiado entre dos peticiones. Lista vacía de resultados → `200 []`, no 404, porque la pregunta tenía respuesta.

Validación → **400** arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `codAlumnos` | al menos un código | `Debe enviar al menos un código de alumno.` (D15) |
| | hasta 100 | `No se pueden consultar más de 100 alumnos a la vez.` (D16) |

**Dos consumidores, no uno.** La pantalla de Escuadrón (columna de estado teórico, S5 cuando falla) y **el formulario de turno práctico de M1**, que hoy pregunta una vez por fila ya agregada (decisión M4-12) y con este endpoint puede marcar a los alumnos bloqueados **antes** de que se elija uno, que era el costo declarado de aquel diferimiento. Si la petición falla, el estado queda **desconocido**: cada fila mantiene su E23 y Guardar sigue permitido, exactamente como M4-12 decidió. Nada se oculta en silencio.

---

## 6. Legajo y ciclo de chequeo

```
GET /api/personas/{cod}/legajo     Read   [NUEVO, dep. 64]
GET /api/personas/{cod}/chequeos   Read   [NUEVO, dep. 65 — y es cambio de esquema antes que ruta]
```

### 6.1 `GET /api/personas/{cod}/legajo` — **nuevo**

**Por qué no sirve lo que hay.** `GET /api/personas/{cod}/alumno` devuelve `DetallePersona` (`grupo/projections/DetallePersona.java:5-20`), que **no trae `codigo`, ni `tipo`, ni `idGrupo`, ni el nombre del grupo, ni los contadores**, y además nombra sus apellidos `APaterno`/`AMaterno` (`:11,13`), distinto de `aPaterno`/`aMaterno` en todas las demás proyecciones (`projections/NombreAlumno.java:9,11`). Los cuatro contadores del ciclo de chequeo (`grupo/entities/Persona.java:41-44`, `schema_prod.sql:220-223`) están hoy solo en dos sitios: `GET /api/grupos/{id}` (`Manage Groups`, `GrupoController.java:87-89`) y el cuerpo 201 de una escritura de persona (`Manage Users`). **Ningún rol de Seguimiento tiene esos dos permisos** (`Role.java:11,25-29`). Y el nombre del grupo solo existe en `GET /api/grupos` (`Manage Groups`) y en `GET /api/alumnos/programa/{nombre}` (`Manage Shifts`), tampoco alcanzables.

**404** D2 si el código no existe. Con la 51, **403** D11 para un legajo ajeno.

**200:**

```json
{
  "codigo": "777777",
  "nombre": "Carlos", "aPaterno": "Ramirez", "aMaterno": "Sanchez",
  "dni": "78901234", "rango": "Mayor", "tipo": "Alumno",
  "estado": "En Chequeo",
  "grupo": { "id": 4, "nombre": "Grupo 4", "programa": "PDI" },
  "usuario": { "nombre": "alumno.ramirez", "correo": "alumno.ramirez@fap.mil.pe" },
  "contadores": { "chequeo": 4, "evaluaciones": 10, "malos": 3, "regulares": 2 },
  "chequeo": {
    "fase": "Adaptación",
    "criterio": 1,
    "criterioCumplido": true,
    "detalle": "3 vuelos Malos.",
    "regularAlternado": true
  },
  "ultimaEvaluacion": { "codigo": "777777-1", "fecha": "2026-09-15", "clasificacion": "Malo", "estadoAlumno": "En Chequeo" }
}
```

`usuario` es `null` para una persona sin cuenta — **no un 500**, que es lo que `DetalleUsuario` hacía antes de la dependencia 26. `grupo` es `null` para un alumno sin grupo, y entonces la pantalla muestra S3.

**El bloque `chequeo` es una lectura, no un cálculo nuevo.** Todo lo que lleva ya está implementado en `evaluacion/utils/TurnoDesaprobado.java` y este endpoint lo expone:

| Campo | De dónde sale |
|---|---|
| `fase` | la `fase` de la última evaluación del alumno (`EvaluacionPractica.fase`) |
| `criterio` | `1` para `Adaptación` y `Operaciones HeliTransportadas`, `2` para `Operaciones AeroTácticas` (`EvaluacionPractica.java:239-246`) |
| `criterioCumplido` | `comprobarCriterio1(contMalo, contRegular)` = `3M · 2M+2R · 1M+4R · 6R` (`TurnoDesaprobado.java:16-21`), o `comprobarCriterio2` = `2M · 1M+2R · 4R` (`:24-28`) |
| `detalle` | qué rama del criterio se cumplió, o qué falta para cumplirlo |
| `regularAlternado` | `esRegularAlternado` = `contRegular == 0 || contRegular % 2 == 0` (`:8-13`): si el próximo `Regular` contará |

Las dos reglas coinciden con spec §3.4 palabra por palabra. **El frontend las muestra y no las recalcula**: el cambio de estado lo decide `ResultadoController` al registrar la próxima evaluación, y la pantalla lo dice en S12.

**Aviso sobre la semilla, que este endpoint hereda:** los contadores de `personas` y las filas de `evaluaciones_practicas` **no cuadran entre sí** en `data_prod.sql`. El alumno `555555` tiene `cont_malo = 1` y `cont_regular = 2` (`:64`) mientras sus cinco evaluaciones son cuatro `Regular` y un `Bueno` (`:177-181`), sin un solo `Malo`. Así que **los contadores son la fuente autorizada para la regla de chequeo y las evaluaciones para el historial**, y las dos cosas pueden no reconciliar. Los mocks mantienen la misma separación (§9.1) y el legajo no intenta cuadrarlas.

### 6.2 `GET /api/personas/{cod}/chequeos` — **nuevo, y es primero un cambio de esquema**

`chequeos_finales` (`schema_prod.sql:134-141`) guarda **un código y cuatro contadores, y nada más**: no tiene fecha, ni resultado, ni tipo de chequeo (`evaluacion/entities/ChequeoFinal.java:23-28`). Se escribe y se borra **solo** desde `ResultadoController`, que es un `@Component` **sin `@RequestMapping` y sin ningún método HTTP** (`:23-24`), a través de un `IChequeoDao` que expone únicamente `findByCodigo` y `deleteByCodigo` (`evaluacion/dao/IChequeoDao.java:7-12`). **No hay ninguna ruta que devuelva un chequeo.**

Así que la dependencia 65 son dos cosas: **añadir las columnas** `fecha` (date), `tipo` (`OPERACIONES` · `COMANDO` · `CONSEJO`, los tres escalones de spec §3.4) y `resultado` (`Aprobado` · `Desaprobado`), y **luego** la ruta.

**200** — arreglo no paginado, ordenado por `fecha` ascendente (un alumno tiene pocos chequeos y la pantalla los muestra como una línea de tiempo):

```json
[
  { "codigo": "777777-1", "fecha": "2026-09-15", "tipo": "OPERACIONES", "resultado": "Desaprobado",
    "contadores": { "chequeo": 4, "evaluaciones": 10, "malos": 3, "regulares": 2 },
    "codEvaluacion": "777777-1" }
]
```

`contadores` es la **foto** de los cuatro contadores en el momento del chequeo, que es exactamente lo que `ChequeoFinal` ya guarda y para lo que sirve: comparada con los contadores actuales de §6.1, cuenta cuánto se movió el alumno desde entonces. `codEvaluacion` es la evaluación que disparó el chequeo (hoy es la clave primaria de la tabla, `:139-140`).

Lista vacía → **404** D13, que el frontend trata como panel vacío. **404** D2 si la persona no existe.

### 6.3 Lo que el legajo lee sin pedir nada nuevo — **sin cambios**

Cinco endpoints ya existen y son los que hacen del legajo algo más que una pantalla de contrato. Su detalle validado está en `contrato-api-turnos.md` §2 y §4; aquí solo lo que M5 necesita saber.

| Ruta | Permiso | Qué usa el legajo |
|---|---|---|
| `GET /api/evaluaciones/filter/persona/{cod}?idSubfase=&nombre=&clasificacion=&page=&size=` | `Read` | el historial práctico. `nombre` es el **programa** (def. `"pdi"`), `idSubfase` def. `0`, `clasificacion` se parsea con `Clasificacion.valueOf` y **cualquier valor no exacto se ignora sin 400**. Página vacía → **404** D7 (`contrato-api-turnos.md` §2.3) |
| `GET /api/evaluaciones/{cod}` | `Read` | el detalle de una evaluación con sus `calificaciones[]`, su `estadoAlumno` y su `codEvalPrevia`. **404** D8 (§2.5) |
| `GET /api/evaluaciones/subfase/{id}/persona/{cod}` | `Read` | el reporte de subfase: `{cabecera, maniobras, notas}` (§2.2) |
| `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` | `Read` | los promedios de la subfase, `[{codigo, promedio}]`, filtrados a `Ponderada` y `Chequeo Sub Fase` (§2.1) |
| `GET /api/turnos/alumno?codAlumno=&page=&size=` | `Read` | los turnos realizados (§1.2) |

Cinco avisos sobre estos cinco, dos de ellos correcciones a lo que decían contratos anteriores:

1. **`GET /api/evaluaciones/subfase/…` no responde lo que dice el contrato de M1.** `contrato-api-turnos.md:362` afirma «404 texto plano `"No existen evaluaciones disponibles."` si `reporte == null`». El código llama `response.isNull(nombreLista)` (`EvaluacionController.java:114-115`), y `nombreLista` es la cadena **`"evaluaciones"`** (`:76`), así que lo que sale es **`"evaluaciones especificada no existe."`** — texto mal formado, minúscula y plural. Y es **alcanzable**: `findFirstByIdSubFaseAndCodPersona` devuelve `null` en cuanto el alumno no tiene ninguna evaluación en esa subfase (`evaluacion/services/EvaluacionServiceImpl.java:40-42`), que es el caso normal al abrir el selector de subfases. Es el mensaje **D6** de la §7, citado verbatim, y el frontend lo trata como «esta subfase no tiene evaluaciones» y **no lo muestra**, precisamente porque está mal formado.
2. **`GET /api/evaluaciones/promedio/subfase/…` nunca devuelve 404.** Su rama `isNull` (`:96-97`) es **muerta**: el servicio devuelve la lista del DAO, que nunca es `null` (`EvaluacionServiceImpl.java:33-36`), así que una lista vacía sale como `200 []`. Lo mismo dice `contrato-api-turnos.md:342`, y esta vez tiene razón.
3. **El endpoint promedio no promedia.** Devuelve la **lista** de los promedios; el frontend calcula su media aritmética y la muestra bajo S9, que dice en la interfaz que es una media simple y **no** el NFAD ni ningún índice del PDI (spec M5-4). Es el único número que M5 calcula.
4. **`GET /api/turnos/alumno` sigue roto.** `TurnoRealizado` proyecta `getCantGrupo()` (`turno/projections/TurnoRealizado.java:19`) contra un `Turno` cuya columna es `cant_alumno` (`schema_prod.sql:281`). Dependencia **12**, abierta desde M1. El panel de turnos muestra el resto de los campos y pone **S11** en lugar de la cantidad de alumnos; no la inventa ni la oculta.
5. **El evaluador no se puede enlazar.** `EvaluacionPractica.codEvaluador` es `@Transient` (`:41-42`) y `evaluaciones_practicas` no tiene columna `cod_evaluador` (`schema_prod.sql:162-180`), así que el valor que se asigna al crear (`EvaluacionController.java:303`) **nunca se guarda** y toda lectura devuelve `null`. Solo sobrevive el texto `evaluador`, armado como `nombre + " " + aPaterno` (`:304`) — sin apellido materno y sin código. El legajo muestra ese texto y **S10** al lado, y no ofrece ningún enlace a la persona del evaluador. No se pide corregirlo: sería una columna nueva y una migración para un enlace que ninguna pantalla de M5 necesita.

---

## 7. Mensajes que el frontend muestra literalmente

Cualquier otro texto del servidor se reemplaza por el genérico y solo va a la consola.

| ID | HTTP | Texto | Donde |
|---|---|---|---|
| D1 | 404 | No existen grupos disponibles. | §1.1, §1.2 (el frontend lo trata como lista vacía; en §1.2 lo muestra como S2) |
| D2 | 404 | Persona especificada no existe. | §3.1, §5.1, §5.2, §6.1, §6.2 |
| D3 | 404 | No existen desaprobados disponibles. | §2.2 (lista vacía) |
| D4 | 404 | Desaprobado especificada no existe. | §2.3, §2.4, y §2.5 después de la corrección |
| D5 | 200 | Desaprobado eliminado con éxito. | §2.5 (plantilla `Response.wasDeleted`). **M5 no llama ese endpoint** |
| D6 | 404 | evaluaciones especificada no existe. | §6.3, reporte de subfase sin evaluaciones. **Verbatim y mal formado** (`isNull(nombreLista)`, `EvaluacionController.java:114-115,76`); el frontend **no lo muestra** y lo trata como subfase sin evaluaciones |
| D7 | 404 | No existen evaluaciones disponibles. | §6.3, historial práctico con página vacía |
| D8 | 404 | Evaluación especificada no existe. | §6.3, detalle de evaluación |
| D9 | 404 | No existen turnos disponibles. | §6.3, turnos del alumno con página vacía |
| D10 | 404 | No existen alertas disponibles. | §2.1 (lista vacía; el frontend muestra S7) |
| D11 | 403 | Solo puede consultar su propio legajo. | §3.1, §5.1, §5.2, §6.1, §6.2, con la dependencia 51 |
| D12 | 404 | No existen alumnos con índices disponibles. | §4.1 (lista vacía; el frontend muestra S25) |
| D13 | 404 | No existen chequeos disponibles. | §6.2 (lista vacía) |
| D14 | 404 | No existen exámenes disponibles. | §5.2 (lista vacía). **Reutiliza el id que `contrato-api-teoria.md:848` retiró** al recortar el historial |
| D15 | 400 | Debe enviar al menos un código de alumno. | §5.3 |
| D16 | 400 | No se pueden consultar más de 100 alumnos a la vez. | §5.3 |
| D17 | 403 | No tiene permiso para ver este grupo. | §2.1, §4.1 |
| D18 | 404 | Grupo especificada no existe. | §2.1, §4.1 (`Response.isNull("Grupo")`) |
| D19 | 404 | Alumno no encontrado. | §8.1 — **texto ya existente** de `sigeda_chat_status` (`src/prediction/prediction.service.ts:73`) |
| D20 | 400 | El alumno no tiene evaluaciones registradas. | §8.1 — **texto ya existente** (`:82`) |

**Sobre D4, D5 y D18:** `"especificada"` y `"eliminado"` son la plantilla de `Response.java` (`:63-71`), que siempre concuerda así y ya entregó `"Materia eliminado con éxito."` en M2. No se corrige: la consistencia con lo entregado pesa más que la gramática. **D6 es distinto**: no es una plantilla mal concordada sino un mensaje con la cadena equivocada (`nombreLista` donde va `nombreEntidad`), y por eso el frontend lo silencia en lugar de mostrarlo.

Los mensajes de validación de campo (400, arreglo) están en la tabla de cada endpoint y también se muestran literalmente, bajo su campo. Los cuatro mensajes de paginado inválido son los de `contrato-api-matricula.md` › Paginación.

**Ningún mensaje de este contrato es un 409 ni un 410.** M5 no tiene escrituras y por tanto no tiene reglas de estado que rechazar.

---

## 8. Predicción de riesgo — `sigeda_chat_status`

```
GET /prediction/students/{studentId}   (sin autenticación hoy)   [existe; deps. 9, 39, 49, 69]
GET /prediction/students?instructorId= (sin autenticación hoy)   [existe; M5 NO LO CONSUME]
```

`contrato-api-aprendizaje.md:428-434` reservó estas dos rutas para M5 y fijó sus dos mensajes; esta sección es la forma que allí se prometió. **No modifica aquel documento.**

### 8.1 `GET /prediction/students/{studentId}` — **existe, y hay que poder llamarlo**

Sin prefijo global (`src/main.ts:5-22`), así que la ruta es `http://localhost:3000/prediction/students/{studentId}`. La respuesta es `StudentPredictionDto` (`src/prediction/dto/prediction-response.dto.ts:33-55`) y no cambia:

```json
{
  "studentId": "555555",
  "fullName": "Pedro Rodriguez Garcia",
  "instructorName": "Juan Torres Perez",
  "currentClassification": "regular",
  "predictedClassification": "regular",
  "currentAverage": 15.00,
  "predictedAverage": 14.20,
  "riskLevel": "medio",
  "riskScore": 0.42,
  "trendDirection": "down",
  "trendSeries": [
    { "sequence": 1, "label": "E1", "value": 16.50, "kind": "real" },
    { "sequence": 4, "label": "E4", "value": 14.20, "kind": "predicted", "lowerBound": 12.80, "upperBound": 15.60 }
  ],
  "maneuverBreakdown": [ { "maneuverId": "…", "name": "Autorrotación", "current": 15.00, "predicted": 13.50, "delta": -1.50 } ],
  "recommendations": [ { "title": "Refuerzo de maniobras", "priority": "media", "description": "…" } ],
  "modelVersion": "regression-v1",
  "computedAt": "2026-09-25T07:30:00.000Z",
  "insufficientData": false
}
```

**Lo único que este contrato pide cambiar es el parámetro y los umbrales** (dependencia 69):

1. **`studentId` debe aceptar un `Persona.codigo` de seis caracteres.** Hoy es un UUID `@db.Uuid` que referencia al `User` de ese repo, cuya única clave natural es `email @unique` (`prisma/schema.prisma:56-60,314-320`), mientras el JWT de `sigeda-back` solo trae `sub` = username (`security/config/JwtUtils.java:31-38`). **El frontend no puede construir ninguna de las dos formas**, así que la ruta es literalmente inalcanzable desde la aplicación. La dependencia 39 (que añade `User.username @unique` y aprovisiona los usuarios) es el prerrequisito; la 69 añade el `codigo` y resuelve el parámetro contra él, aceptando las dos formas durante la transición.
2. **`classifyScore` necesita recalibrarse.** Sus bandas son `≥16 optimo`, `≥12 regular`, resto `deficiente`, sobre una escala que su propio comentario llama «0-20, ajustar según la escala real del programa si difiere» (`src/prediction/engine/risk-classifier.ts:11-17,29-33`). Pero `CalculoNota` **nunca emite menos de 12** para una evaluación puntuada (puntajes base 12 · 15 · 17 · 20, `evaluacion/utils/CalculoNota.java:47-61`, y el descuento es 0 cuando la clasificación es Malo, `:63-68`), así que contra datos reales `deficiente` es **inalcanzable** y `regular` cubre 12–15.99. Recalibrar es parte de la 69 y tiene que ocurrir **junto con** la 9, no después.
3. **`currentAverage` no es un promedio.** Es el `overallScore` de la **última** evaluación (`src/prediction/prediction.service.ts:86`), y `currentClassification` es ese único puntaje clasificado (`:87`); lo mismo cada `current` del desglose por maniobra (`:197`). El nombre se conserva por compatibilidad y **el frontend lo etiqueta S19, «Última nota registrada»**, sin llamarlo promedio en ninguna parte.

**Qué muestra el frontend y qué no** (spec M5-12):

| Campo | En pantalla |
|---|---|
| `riskLevel`, `trendDirection` | sí, con etiqueta de texto y color |
| `trendSeries` con `kind` y, en los `predicted`, `lowerBound`/`upperBound` | sí; la banda del 80 % (`Z_80 = 1.28`, `engine/regression-engine.ts:113,127,132`) solo en los proyectados |
| `currentAverage` | sí, bajo S19 |
| `predictedAverage`, `riskScore` | sí |
| `maneuverBreakdown`, `recommendations` | sí, tal como llegan; las recomendaciones son **cuatro plantillas por reglas, no salida de un LLM** (`engine/recommendation-engine.ts:27-77`) |
| `currentClassification`, `predictedClassification` | **no**. Mientras la 69 no recalibre, `deficiente` es inalcanzable y las tres etiquetas chocarían con las cuatro de `Clasificacion` que la misma pantalla muestra dos paneles más arriba |
| `insufficientData` | sí: con menos de 3 evaluaciones (`MIN_EVALUATIONS_FOR_PREDICTION = 3`, `prediction.service.ts:16`) el servicio devuelve `riskLevel: 'bajo'`, `riskScore: 0`, `trendDirection: 'flat'`, sin desglose y sin recomendaciones (`:89-113`), y el frontend muestra **S20** en lugar de presentar ese `bajo` como un resultado |
| el origen de los datos | **S18, permanente** hasta que la dependencia 9 figure como resuelta: nada en `src/` escribe `PracticalEvaluation`, `ManeuverScore` ni `Maneuver` — el único escritor es el script `src/prediction/seed-prediction-data.ts:134,173,192`, que fabrica tres alumnos sobre seis maniobras inventadas (`:17-24`, `:39` en adelante) |

**Errores**, los dos únicos, en la envoltura por defecto de Nest (no hay `ExceptionFilter`): **404** D19 y **400** D20. `src/lib/api/errors.ts:98` ya los resuelve por la rama `statusCode`, así que el frontend los muestra con su propio texto. Un `studentId` malformado llega hoy a Prisma contra una columna `@db.Uuid` y **sale como un 500 no manejado**, no como un 400 ni un 404: no hay `ParseUUIDPipe` en ninguna parte (`prediction.controller.ts:18`). La dependencia 49 lo cubre.

### 8.2 `GET /prediction/students` — **M5 no lo consume, y por qué**

Devuelve `StudentSummaryDto[]` **sin paginar** y ordenado `alto → medio → bajo` (`prediction.service.ts:26-69`), con un `instructorId` que es un **string sin validar** (`prediction.controller.ts:11`). `DevAuthMiddleware` se aplica a `'*'` y pone `req.user = { id: '564984ee-448a-424f-b689-57a03b3ea108' }` sin condición (`src/app.module.ts:24`, `src/common/dev-auth.middleware.ts:5-8`), y **ninguna de las dos rutas lee `req.user`**. Es decir: cualquier llamador obtiene el riesgo de todos los alumnos.

M5 no lo llama (spec M5-11, CA-RIE-10). El panel de riesgo vive **dentro del legajo**, un alumno por petición, que es donde spec §6 lo pone. Cuando la dependencia 49 lo acote y pagine, y la 69 permita construir un `instructorId`, una columna de riesgo en el Escuadrón es una consulta y una celda.

---

## 9. Datos de los mocks

Los mocks parten de la semilla (`data_prod.sql`) más lo que agregaron M1, M2 y M4 (`src/mocks/sigeda/datos.ts` › `crearDatos`, y `semilla-teoria.ts` › `crearTeoria`) y se reinician por prueba con `reiniciarMocks()`, que `src/test/setup.ts` ejecuta en cada `afterEach`. M5 agrega los handlers `seguimiento.ts`, `desaprobados.ts`, `indices.ts`, `chequeos.ts` y `cuestionarios-historial.ts` en `src/mocks/sigeda/`, y `prediccion.ts` en `src/mocks/ia/` — **el primer handler de `/prediction/**` del repositorio**. No agrega ninguna secuencia: nada de M5 se crea.

Personas y grupos que se usan: alumnos `111111` (grupo 1), `222222` (grupo 2), `555555` y `666666` (grupo 3), `777777` (grupo 4), `999999` (grupo 6), `654321` **sin grupo**; instructores `444444` Juan Torres Perez y `888888` Maria Flores Mendoza. Materias 1–11 con sus `coeficiente` sumando 1.00.

**Tres de estos datos son invenciones del frontend, no de la semilla** (`docs/decisiones.md` › Datos de prueba): el estado `En Chequeo` de `777777`, la alumna `654321` sin grupo, y la evaluación `111111-1`. En `data_prod.sql` todos los alumnos son `Apto`, `654321` no existe y la única persona con evaluaciones es `555555`.

### 9.1 Contadores y estados — `PersonaMock` se alinea con la semilla

`PersonaMock` (`src/mocks/sigeda/datos.ts:14-26`) tiene hoy **solo `contEval`**, y las proyecciones de persona y grupo emiten `contChequeo: 0, contMalo: 0, contRegular: 0` a mano (`src/mocks/sigeda/personas.ts:50-56`, `grupos.ts:26-32`). M5 le añade `contChequeo`, `contMalo` y `contRegular` **con los valores de la semilla**, porque son las entradas de la regla de chequeo y hoy el mock y la semilla dicen cosas distintas:

| Alumno | Grupo | Estado | chequeo · eval · malos · regulares | Criterio 1 cumplido | Qué prueba |
|---|---|---|---|---|---|
| `111111` | 1 | Apto | 2 · 5 · 1 · 2 | no | el caso normal; su causal teórico es el único |
| `222222` | 2 | Apto | 3 · 8 · 2 · 3 | no (2M necesita 2R, tiene 3) | el primer puesto del orden de mérito |
| `555555` | 3 | Apto | 2 · 5 · 1 · 2 | no | el legajo completo: 3 evaluaciones, 1 desaprobado, 1 examen aprobado |
| `666666` | 3 | Apto | 1 · 4 · 0 · 1 | no | NFPI incompleto, bloqueo por subsanación, 1 desaprobado |
| `777777` | 4 | **En Chequeo** | 4 · 10 · **3** · 2 | **sí** (3M) | estado crítico **con** el estado ya movido: no abre `CHEQUEO_PENDIENTE` |
| `999999` | 6 | Apto | 3 · 7 · **2** · **2** | **sí** (2M+2R) | criterio cumplido **sin** que el estado se haya movido: abre `CHEQUEO_PENDIENTE` |
| `654321` | — | Apto | 0 · 0 · 0 · 0 | no | sin grupo: no entra en §2.1 ni en §4.1, y su §3.1 viene todo en `null` |

`777777` y `999999` cumplen el criterio con los contadores **de la semilla**, no con números inventados: es el único fixture de M5 que sale entero de `data_prod.sql:59-69`. Y la pareja es exactamente lo que distingue `ESTADO_CRITICO` de `CHEQUEO_PENDIENTE` (§2.1).

**Los contadores no cuadran con las evaluaciones, y eso es fiel a la semilla.** `555555` tiene `cont_malo = 1` y ninguna evaluación `Malo` (`data_prod.sql:64` frente a `:177-181`). Los mocks mantienen la separación que describe la §6.1: **contadores para la regla de chequeo, evaluaciones para el historial**, y ninguna prueba intenta reconciliarlos.

### 9.2 Evaluaciones prácticas — 4 existentes + 3 que M5 agrega

Las cuatro de hoy (`datos.ts:341-452`): `111111-1` (Ponderada, **Bueno**, 16.5), `555555-1` (Ponderada, **Regular**, 14.0), `555555-2` (Chequeo, Bueno, `promedio: null`), `555555-3` (Ponderada, **Regular**, 15.0). Todas en fase Adaptación, subfase 1 Contacto.

M5 agrega tres, cada una con sus seis calificaciones, para que los desaprobados de §9.3 se puedan **derivar** en lugar de fijarse:

| Código | Alumno | Subfase | Categoría | Clasificación | Promedio | Para |
|---|---|---|---|---|---|---|
| `666666-1` | `666666` | 1 Contacto | Ponderada | **Malo** | `'12.0'` | un desaprobado por Malo, y el segundo alumno del grupo 3 con historial |
| `777777-1` | `777777` | 3 Instrumentos | Ponderada | **Malo** | `'12.0'` | un desaprobado en otra subfase y otro grupo; es la evaluación que dispara su chequeo |
| `999999-1` | `999999` | 1 Contacto | Ponderada | **Regular** | `'15.0'` | un desaprobado por Regular alternado, en un tercer grupo |

### 9.3 Desaprobados — **derivados**, no fijados

El handler los deriva de las evaluaciones con **la misma regla que `ResultadoController.saveAll`** (`evaluacion/controllers/ResultadoController.java:33-96`): una `Ponderada` `Malo` siempre abre un `Desaprobado`; una `Ponderada` `Regular` solo si `esRegularAlternado` (`contRegular` 0 o par) en ese momento. Así el mock no puede contradecir al servidor y una prueba que agregue una evaluación obtiene el desaprobado correspondiente sin tocar el fixture.

Resultado sobre las siete evaluaciones de §9.2, en orden:

| Código | Alumno | Clasificación | Por qué |
|---|---|---|---|
| `555555-1` | `555555` | Regular | `contRegular` era 0 → alternado → sí |
| `666666-1` | `666666` | Malo | un Malo siempre |
| `777777-1` | `777777` | Malo | un Malo siempre |
| `999999-1` | `999999` | Regular | `contRegular` de la semilla es 2 → par → alternado → sí |

`111111-1` es `Bueno` y no abre nada; `555555-2` es `Chequeo` y la regla solo mira `Ponderada`; `555555-3` es `Regular` pero `contRegular` ya valía 1 → impar → no alternado → **no** abre desaprobado. Esa última es la que prueba la regla alternada.

Consecuencia buscada: **cuatro desaprobados en cuatro alumnos y tres grupos distintos** (3, 3, 4, 6), suficiente para el filtro por grupo de §2.1 y para que `GET /api/desaprobados/persona/{cod}` devuelva una lista de uno y `654321` devuelva **404** D3.

### 9.4 Chequeos — 1 fila

| Código | Alumno | Fecha | Tipo | Resultado | Contadores en ese momento |
|---|---|---|---|---|---|
| `777777-1` | `777777` | la fecha de `777777-1` | `OPERACIONES` | `Desaprobado` | 4 · 10 · 3 · 2 |

Es el único alumno cuyo estado ya se movió a `En Chequeo`. `999999`, que cumple el criterio pero sigue `Apto`, **no tiene fila**: su chequeo está pendiente, no hecho. Los demás devuelven **404** D13, que la pantalla muestra como panel vacío.

### 9.5 Índices — **fijados, no derivados**, y el contrato dice por qué

El mock **no calcula** los índices: los devuelve fijados. Motivo: sus insumos no existen en los datos de prueba. Las siete evaluaciones de §9.2 están todas en fase Adaptación, la semilla no tiene ninguna subfase fuera de la fase 1 (`data_prod.sql:6-11`), así que **`NFOH` y `NFOA` no tienen nada que promediar**; y la mitad teórica necesita las siete tablas de la dependencia 6 más los tipos de examen que M4 no sembró. Inventar tres fases de evaluaciones y once materias de notas para producir un número que solo el servidor puede calcular (spec M5-2) sería un fixture grande al servicio de un cálculo que el cliente no debe hacer.

**Lo que sí se garantiza es el orden:** las cifras están elegidas para que el alumno con desaprobados y bloqueo quede sin NFPI y el que solo tiene aprobados quede arriba. El historial y los índices **coinciden en orden, no en aritmética**, y la §9.9 lo repite.

Las once cifras por alumno, exactas a dos decimales sin depender de ningún redondeo:

| Alumno | NFAD | NFOH | NFOA | **NIA** | NCT | NEI | **NIT** | **NFPI** |
|---|---|---|---|---|---|---|---|---|
| `222222` | 18.00 | 17.00 | 16.00 | **17.15** | 17.00 | 18.00 | **17.20** | **17.16** |
| `555555` | 17.00 | 16.00 | 15.00 | **16.15** | 18.00 | 16.00 | **17.60** | **16.44** |
| `999999` | 16.00 | 15.00 | 15.00 | **15.40** | 15.00 | 14.00 | **14.80** | **15.28** |
| `111111` | 16.00 | 15.00 | 14.00 | **15.15** | 16.00 | 15.00 | **15.80** | **15.28** |
| `777777` | 13.00 | 13.00 | 12.00 | **12.75** | 14.00 | 13.00 | **13.80** | **12.96** |
| `666666` | 14.00 | **null** | **null** | **null** | 13.00 | 12.00 | **12.80** | **null** |
| `654321` | null | null | null | null | null | null | null | null |

Comprobaciones (para que una prueba pueda repetirlas a mano): `222222` → `18·0.40 + 17·0.35 + 16·0.25 = 7.20 + 5.95 + 4.00 = 17.15`; `17·0.80 + 18·0.20 = 13.60 + 3.60 = 17.20`; `17.20·0.20 + 17.15·0.80 = 3.44 + 13.72 = 17.16`. `999999` → `6.40 + 5.25 + 3.75 = 15.40`; `12.00 + 2.80 = 14.80`; `2.96 + 12.32 = 15.28`. `111111` → `6.40 + 5.25 + 3.50 = 15.15`; `12.80 + 3.00 = 15.80`; `3.16 + 12.12 = 15.28`.

Consecuencias buscadas:

- **`999999` y `111111` empatan en NFPI a 15.28 con NIA distinto** (15.40 frente a 15.15): es el único fixture que prueba el desempate de §4.1, y lo prueba en su primer nivel (NIA), no en el último.
- **`666666` tiene NIT pero no NIA ni NFPI**: prueba que `null` propaga hacia arriba sin borrar la mitad que sí existe (CA-LEG-14) y que la fila aparece sin puesto en el reporte (CA-REP-05).
- **`654321` viene todo en `null`** con **200**, no 404: prueba que «no calculable» y «no encontrado» son cosas distintas.
- `reduccionPorRezagadoAplicada` es **`false` en todos**, porque la dependencia 70 no existe. Ninguna fijación finge lo contrario.
- `fechaCalculo` es `hoy` y `horaCalculo` es `"07:30"`, fijo, para que S22 sea comparable byte a byte sin reloj falso.

### 9.6 Orden de mérito — 5 puestos y 1 sin puesto

Con `programa=PDI` y sin `idGrupo`:

| Puesto | Alumno | Grupo | NFPI | NIA | Nota |
|---|---|---|---|---|---|
| 1 | `222222` | 2 | 17.16 | 17.15 | |
| 2 | `555555` | 3 | 16.44 | 16.15 | |
| 3 | `999999` | 6 | 15.28 | **15.40** | gana el empate por NIA |
| 4 | `111111` | 1 | 15.28 | **15.15** | pierde el empate por NIA |
| 5 | `777777` | 4 | 12.96 | 12.75 | |
| — | `666666` | 3 | null | null | sin puesto, al final, con `motivoSinNfpi` |

`654321` **no aparece**: no tiene grupo. `programa=PDE` → **404** D12, porque todos los grupos sembrados son PDI. Con `idGrupo=3` → `555555` (puesto 1) y `666666` (sin puesto): el **`puesto` se recalcula dentro del alcance pedido**, así que un reporte por grupo empieza en 1. Con `size=6` la lista cabe en una página; con `size=2` son tres páginas y el `puesto` no se reinicia por página.

### 9.7 Alertas — derivadas, salvo las causales

Ocho filas, todas derivadas por las reglas de §2.1 excepto la causal, que se fija:

| # | Tipo | Severidad | Alumno | Grupo | Origen |
|---|---|---|---|---|---|
| 1 | `VUELO_DESAPROBADO` | ALTA | `555555` | 3 | desaprobado `555555-1` |
| 2 | `VUELO_DESAPROBADO` | ALTA | `666666` | 3 | desaprobado `666666-1` |
| 3 | `VUELO_DESAPROBADO` | ALTA | `777777` | 4 | desaprobado `777777-1` |
| 4 | `VUELO_DESAPROBADO` | ALTA | `999999` | 6 | desaprobado `999999-1` |
| 5 | `ESTADO_CRITICO` | ALTA | `777777` | 4 | `estado = En Chequeo` |
| 6 | `CAUSAL_TEORICO` | ALTA | `111111` | 1 | la causal fijada de §9.8 |
| 7 | `CHEQUEO_PENDIENTE` | MEDIA | `999999` | 6 | contadores 2M+2R con estado `Apto` |
| 8 | `SUBSANACION_PENDIENTE` | MEDIA | `666666` | 3 | `bloqueadoPorSubsanacion` de M4 |

Consecuencias buscadas: `777777` tiene dos alertas y **ninguna** es `CHEQUEO_PENDIENTE` aunque cumpla el criterio, porque su estado ya se movió; `999999` tiene la `CHEQUEO_PENDIENTE` que él no tiene; `666666` tiene una de cada severidad; los cuatro grupos aparecen, así que el filtro por grupo separa. Con `size=6` la lista pagina en **2 páginas** y con `size=10` en 1. Un instructor sin `View All Groups` que solo alcanza los grupos 1, 2 y 3 ve **cinco** de las ocho, que es lo que prueba el alcance de §2.1.

### 9.8 Estado teórico, causales e historial

Lo de M4 (`contrato-api-teoria.md` §9.3) **no cambia**: `666666` es el único con `bloqueadoPorSubsanacion: true`, con el turno 1 desaprobado (nota 12.00, mínimo 18) y el turno 5 pendiente; el resto viene en `false`.

**Las `causales[]` se fijan, no se derivan**, y esta es la única fijación de M5 que no tiene forma de derivarse: las seis reglas de §5.1 necesitan historiales de exámenes por materia que no existen ni en los mocks ni en la semilla (spec §16.6 ítem 3 lo dijo así). Una sola causal, en un alumno que no está bloqueado, para que las dos cosas se vean separadas:

| Alumno | `causales` |
|---|---|
| `111111` | `[{ "codigo": "PROMEDIO_ASIGNATURA", "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "detalle": "Promedio 12.50 en Adoctrinamiento de Vuelo, por debajo de 13.", "fecha": hoy − 10 }]` |
| todos los demás | `[]` |

Así `111111` prueba «causal sin bloqueo» y `666666` prueba «bloqueo sin causal», que son los dos casos que la pantalla tiene que distinguir.

**Historial teórico (§5.2)** sobre los tres cuestionarios de M4 (`src/mocks/sigeda/semilla-teoria.ts:421-464`):

| Alumno | Filas |
|---|---|
| `555555` | 1: turno 1 «Mensual Adoctrinamiento de Vuelo», MENSUAL, `hoy − 7`, ENTREGADO, **20.00**, mínimo 18, aprobado; sin origen y sin `subsanadoPor` |
| `666666` | 1: el mismo turno, ENTREGADO, **12.00**, mínimo 18, **desaprobado**, con `subsanadoPor` = turno 5 «Subsanación Adoctrinamiento de Vuelo», `hoy + 1`, PROGRAMADO, `nota: null` |
| `111111` | 1: turno 3 «Semanal Adoctrinamiento de Vuelo», SEMANAL, `hoy`, **EN_CURSO**, con `nota`, `aprobado`, `fechaEntrega` y `horaEntrega` en `null` |
| `222222`, `777777`, `999999`, `654321` | ninguna → **404** D14 |

La fila de `666666` es la que prueba S17: la nota desaprobada **se queda** y su subsanación está pendiente, así que la pantalla muestra las dos y dice que prevalece la primera.

### 9.9 Predicción de riesgo — el mock que M5 agrega

`src/mocks/ia/prediccion.ts` sirve `GET /prediction/students/:studentId` **aceptando un `Persona.codigo`**, que es lo que la dependencia 69 pide, y usa nombres de maniobra **de `datos.ts`** en lugar de los seis inventados del script de siembra, para que el panel se vea como se verá cuando la dependencia 9 esté hecha.

| `studentId` | Respuesta |
|---|---|
| `555555` | `riskLevel: "medio"`, `trendDirection: "down"`, 3 puntos `real` (16.50, 15.00, 14.00) y 2 `predicted` con banda, `currentAverage: 14.00`, 2 maniobras en el desglose con una `delta: -1.50`, 2 recomendaciones, `insufficientData: false` |
| `777777` | `riskLevel: "alto"`, `trendDirection: "down"`, 4 `real` descendentes y 2 `predicted`, 3 maniobras en caída, **4 recomendaciones** (las cuatro plantillas de `recommendation-engine.ts`) |
| `111111` | `insufficientData: true`: 2 puntos `real`, `riskLevel: "bajo"`, `riskScore: 0`, `trendDirection: "flat"`, `maneuverBreakdown: []`, `recommendations: []` |
| `654321` | **404** D19 |
| `222222` | **400** D20 |
| cualquier otro código | **404** D19 |

`computedAt` es un instante ISO-8601 fijo, `"{hoy}T07:30:00.000Z"`, para que la pantalla sea comparable sin reloj falso. `modelVersion` es `"regression-v1"`, el valor que el servicio emite (`prediction.service.ts:109`). **`GET /prediction/students` no se implementa en el mock**, porque M5 no lo llama (§8.2): si una pantalla lo pidiera, MSW lo dejaría pasar y la prueba fallaría con un error de red, que es exactamente la señal que se quiere.

### 9.10 Lo que no se fija

Se prueba con `server.use(...)` por prueba, porque las fijaciones por defecto tienen que sostener los caminos felices:

- el escuadrón vacío (D1) y el escuadrón de un instructor sin alumnos (S2);
- la lista de alertas vacía (D10) y la de índices vacía (D12);
- un panel del legajo que falla en su primera carga, uno por uno;
- un `estado-teorico` en lote que no responde (S5) y uno individual que no responde (E23 en el formulario de turno práctico);
- un `GET /api/personas/{cod}/legajo` sin `usuario` y sin `grupo`;
- un 403 D11 o D17 para probar el camino de permiso;
- un `GET /api/turnos/alumno` que responde con `cantGrupo` en lugar de `cantAlumno` (S11);
- el `500` no manejado que el servicio de predicción devuelve hoy ante un id malformado.

**Y una limitación declarada, no un hueco:** el historial práctico de un alumno y sus índices de §9.5 **no son aritméticamente consistentes**. Coinciden en orden — quien tiene desaprobados está abajo, quien no los tiene está arriba — y nada más. La razón está en §9.5 y la alternativa (inventar evaluaciones en tres fases y notas en once materias) está descartada en spec M5-21.

---

## 10. Dependencias

Numeración de la spec (§10, §13.4, §14.5, §15.5, §16.5 y §17.5). Todas son de `sigeda-back` salvo la 39, la 49 y la 69.

**Qué funciona hoy y qué no.** La pantalla de Escuadrón y **cuatro paneles del legajo** — historial práctico, reporte de subfase, promedios de subfase y vuelos desaprobados — funcionan contra `ec2b0dd` sin ninguna dependencia nueva. Dos de esos cuatro endpoints **nunca los ha llamado ninguna pantalla**: `contrato-api-turnos.md` §2.1 y §2.2 los documentaron en M1 y quedaron sin consumidor. Todo lo demás es contrato. El frontend lo dice en pantalla (S1, S8, S13, S15, S16, S21, S26) y deshabilita cada panel mientras su número no figure en `VITE_DEPENDENCIAS_RESUELTAS`: `verIndices` espera 61 y 62, `verOrdenMerito` 62 y 63, `verAlertas` 66, `verCicloChequeo` 64 y 65, `verHistorialTeorico` 6 y 67, `verCausalesTeoricos` 7 y 68, `verBloqueoTeoricoLote` 7 y 56, `verRiesgo` 9, 39, 49 y 69. Al desplegar una de estas correcciones, avisar para agregar su número.

| # | Cambio | Sección |
|---|---|---|
| 6 (M4) | La API de teoría completa. Sin ella no hay `cuestionarios` y por tanto no hay NIT, NCT, NEI, NA ni historial teórico | §3, §5.2 |
| 7 (M4) | `GET /api/personas/{cod}/estado-teorico` | §5.1, §5.3 |
| **8** (paraguas) | NIT / NIA / NFPI y orden de mérito. **Partida aquí en 61, 62 y 63**; 8 sigue siendo el paraguas | §3, §4 |
| 9 (M3/M5) | Predicción sobre las evaluaciones reales de SIGEDA. Su mitad de M3 la refinó la 39; **su mitad de M5 sigue abierta y es la razón de S18** | §8 |
| 12 (M1) | `TurnoRealizado` proyecta `cantGrupo` contra una columna `cant_alumno`. Abierta desde M1; su consecuencia en M5 es S11 | §6.3 |
| **17** (M1) | `@PreAuthorize` en los cuatro endpoints de `DesaprobadoController` y en `GET /api/subfases/assigned`. **La amplía la 66.** `contrato-api-turnos.md:589` la dejó explícitamente a M5 | §2.2–§2.6 |
| 18 (M1) | `contD` nunca se acumula, así que la rama «todas demostrativas → 20.0» de `CalculoNota` está muerta; y `GrupoController.detail` no hace `return`. Cualquier índice que reproduzca la aritmética del servidor hereda lo primero | §3.2, §1 |
| 19 (M1) | Mojibake del rol Comandante en la semilla y ninguna cuenta con `id_rol = 5`. Sin eso, el rol que tiene `View All Groups` no puede iniciar sesión contra el backend real | Permisos |
| 20 (M1) | Propiedad del alumno en el servidor: `/api/evaluaciones/**` y `/api/turnos/alumno` solo piden `Read`. La comprobación del frontend es de interfaz | Convenciones, §6.3 |
| 39 (M3) | El servidor de IA no autentica y su `User` no tiene `username`. Prerrequisito de la 69 | §8.1 |
| 49 (M3) | `/prediction/**` sin alcance, sin validación y sin paginado; un id malformado es un 500 | §8.1, §8.2 |
| 51 (M4) | Resolver quién llama (`sub` → `Usuario` → `Persona.codigo`) y aplicar la propiedad en el servidor. En M5 es lo que convierte D11 en una comprobación real | Convenciones, §3.1, §5, §6 |
| 56 (M4) | `GET /api/estado-teorico?codAlumnos=` en lote. **Se consume aquí por primera vez**, y también cierra el costo declarado de M4-12 | §5.3 |
| 58 (M4) | **Bug:** `GET /api/personas/{cod}/status` devuelve 404 para todo alumno que no esté `Apto`. **M5 no lo llama** y por eso no lo pide: usarlo empeoraría el legajo justo para los alumnos que lo necesitan | — (spec §17.6) |
| **61** | `GET /api/personas/{cod}/indices`: NFPI, NIT, NIA, NA con su desglose, cada uno nullable. **Sus operandos llevan [CONFIRMAR]**: las fórmulas son del PDI, la definición de lo que se promedia no está en ninguna fuente. El núcleo de la 8 | §3 |
| **62** | `evaluaciones_practicas.promedio` a columna **numérica** (hoy `varchar(255)`) y `fase` con FK a `fases` (hoy un string denormalizado con sus tres valores escritos a mano en la entidad). **Prerrequisito de 61 y 63**: sin lo primero, ordenar y promediar es lexicográfico; sin lo segundo, un renombre de fase rompe en silencio todo agregado por fase | §3.2, §4.1 |
| **63** | `GET /api/reportes/orden-merito` con el desempate NFPI ↓ / NIA ↓ / código ↑, los no rankeables al final sin puesto, y `fechaCalculo` + `horaCalculo` junto al `Page`. **El primer endpoint que `Create Reports` protegería de verdad** | §4.1 |
| **64** | `GET /api/personas/{cod}/legajo`: `codigo`, `tipo`, `idGrupo`, nombre y programa del grupo, los cuatro contadores del ciclo de chequeo y el bloque `chequeo` derivado de `TurnoDesaprobado`. Hoy los contadores solo se alcanzan con `Manage Groups` o `Manage Users`, que ningún rol de Seguimiento tiene | §6.1 |
| **65** | `GET /api/personas/{cod}/chequeos`, **y antes las columnas que le faltan a `chequeos_finales`**: `fecha`, `tipo` (OPERACIONES · COMANDO · CONSEJO) y `resultado`. La tabla guarda hoy un código y cuatro contadores, y no tiene ninguna ruta porque su único escritor es un `@Component` sin `@RequestMapping` | §6.2 |
| **66** | `GET /api/seguimiento/alertas`, **y las dos correcciones de seguridad que arrastra**: (a) `findByCodPersona` es `findByCodigoContaining`, un `LIKE %cod%` sobre el código de la evaluación, así que cualquier titular de `View Disapproved` vuelca los desaprobados de todos los alumnos con un valor de un carácter; (b) los cuatro endpoints sin `@PreAuthorize`, uno de ellos un `DELETE` sin comprobación de existencia que cualquier usuario autenticado, **incluido un Alumno**, puede llamar. Amplía la 17 | §2 |
| **67** | `GET /api/cuestionarios?codAlumno=&idMateria=&estado=`: el historial teórico del alumno, con `idTurnoOrigen` y `subsanadoPor` para poder mostrar las dos notas de una subsanación. Recortado de M4 (spec §16.6 ítem 1); recupera el id **D14**. Amplía la 6 | §5.2 |
| **68** | `causales[]` en `estado-teorico`, con **seis** códigos reconciliados al catálogo de once materias: los dos «periódicos» de M4 nombraban asignaturas que no existen y colapsan en `PERIODICOS_MATERIA`, que lleva `idMateria`. Amplía la 7 | §5.1 |
| **69** | En `sigeda_chat_status`: aceptar un `Persona.codigo` como `studentId`, **recalibrar** los umbrales `≥16 / ≥12` de `classifyScore` contra el suelo efectivo de 12 de `CalculoNota` (donde `deficiente` es inalcanzable), y documentar que `currentAverage` es la última nota y no un promedio. Refina la mitad de M5 de la 9; necesita la 39 | §8.1 |
| **70** | Inasistencias: `PUT /api/turnos-teoricos/{id}/inasistencias/{codAlumno}`, la columna `inasistencia_justificada` y la reducción del **50 %** del rezagado injustificado. Recortada de M4 (spec §16.6 ítem 2). **M5 no construye pantalla para esto**: hasta que exista, `reduccionPorRezagadoAplicada` es siempre `false` y el NIT cuenta cada rezagado a valor nominal | §3.2 |

**Lo primero que hay que decidir, antes de escribir una línea de la §3:** las marcas **[CONFIRMAR]** de §3.2. Son siete, y la más frágil es `NEI`. El PDI da las cuatro fórmulas; no dice de qué se promedia cada operando. Implementar la 61 sobre la propuesta de este contrato sin confirmarla produce números con dos decimales que nadie puede defender, y son justamente los números que van al orden de mérito.

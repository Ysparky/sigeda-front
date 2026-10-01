# Casos de uso: camino feliz y alternativas

**Todo lo de aquí se ejecutó contra el sistema real el 1 oct 2026** — backend Spring sobre
PostgreSQL 16 y backend de IA sobre NestJS, no mocks. Las respuestas y los mensajes están copiados de
lo que devolvió el servidor, no del contrato. Si un mensaje aquí no coincide con el sistema, el
documento está mal.

Cómo leerlo: cada caso lleva su **actor**, su **camino feliz** y una tabla de **alternativas** con
el código HTTP y lo que el usuario ve. Las alternativas están en el orden en que el servidor las
evalúa, que importa: la primera que se cumple es la que responde.

Para levantar el entorno, ver `demo-runbook.md`. Cuentas: contraseña `123` para todas.

---

## 0. El recorrido, en orden, con lo que la semilla tiene preparado

Si se van a hacer las pruebas de corrido, este es el orden que no se pisa a sí mismo. Cada paso
remite al caso que lo detalla.

| # | Entrar como | Hacer | Lo que la semilla ya dejó listo | Caso |
|---|---|---|---|---|
| 1 | `instructor.perez` | recorrer el banco de preguntas y programar un turno teórico | **24** preguntas, cinco filtros combinables | §5, §6 |
| 2 | `instructor.perez` | **evaluar el turno 4** (`Navegación Local Inicial`, alumna `666666`) | 6 maniobras, todas con estándar `B`; el turno **no tiene evaluación** | §4 |
| 3 | `alumno.lopez` | rendir su examen pendiente | el turno teórico **3** está abierto **hoy**, 00:00–23:59, 5 preguntas, mínimo 18 | §7 |
| 4 | `comandante.aguirre` | abrir el legajo de `555555` y el orden de mérito | 17 evaluaciones, las doce sub fases con nota | §8, §9 |
| 5 | `jefe.operaciones` | dar de alta un turno práctico | cualquiera de las **12** sub fases sirve | §3 |
| 6 | cualquiera | subir un documento en **Aprendizaje** | tres documentos de corridas anteriores | §10 |

**Los turnos prácticos sin evaluar son seis**, y son los únicos donde §4 se puede ejercer:

| Turno | Fecha | Sub fase | Instructor | Alumno |
|---|---|---|---|---|
| 1 | 2024-03-01 | Control Básico | `instructor.perez` | `111111` |
| 2 | 2024-03-08 | Control Básico | `instructor.perez` | `222222` |
| 4 | 2024-03-22 | Navegación Local | `instructor.perez` | `666666` |
| 5 | 2024-03-29 | Procedimientos y Aproximación IFR | `instructor.mendoza` | `777777` |
| 6 | 2024-04-05 | Circuitos y Maniobras | `instructor.mendoza` | `999999` |
| 7 | 2024-04-12 | Control Preciso | `instructor.mendoza` | `999999` |

Los otros trece son de `555555` y ya están evaluados: son los que hacen que su NFPI exista.

---

## 1. Iniciar sesión

**Actor:** cualquiera. **Camino feliz:** `admin.sistema` / `123` → **200** con el token y el
refresh token. El mismo usuario puede entrar **tantas veces como quiera** (eso estaba roto y se
arregló; ver §12).

| Alternativa | HTTP | Qué pasa |
|---|---|---|
| Contraseña incorrecta | **403** | Cuerpo vacío. La interfaz muestra su propio mensaje de credenciales inválidas |
| Usuario sin rol asignado | **401** | El seed trae `raul.paredes` solo en los mocks; en el backend real no existe |
| Petición sin token a cualquier ruta | **401** | `{"error":"Unauthorized","message":"No authorization token found"}` |
| Token inválido o vencido | **401** | `{"message":"Token is not valid"}` |

La ruta es **`POST /auth/login`**, sin el prefijo `/api`.

---

## 2. Gestionar materias

**Actor:** Administrador Web o Comandante de Escuadrón (permiso `Manage Subjects`).
**Camino feliz:** crear una materia con nombre único, `notaMinima` entera de 0 a 20,
`coeficiente` de 0 a 1 con dos decimales y una `parte` válida → **201**
`{"mensaje":"Materia guardada con éxito.","materia":{…}}`. El índice devuelve las **11** sembradas,
ordenadas por parte y luego por nombre.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Nombre repetido (ignora mayúsculas) | 400 | `'nombre': Ya existe una materia con ese nombre.` |
| `notaMinima` con decimales | 400 | `'notaMinima': La nota mínima debe ser un entero entre 0 y 20.` — **se rechaza, no se trunca** |
| `parte` que no es de las tres | 400 | `'parte': Ingresar parte del curso válida.` |
| Nombre de menos de 3 o más de 60 | 400 | `'nombre': El nombre debe tener entre 3 y 60 caracteres.` |
| Un Alumno intenta crear | **403** | `Acceso denegado · No tienes permisos para realizar esta acción` |
| Borrar una materia que tiene preguntas | **409** | `La materia no se puede eliminar, tiene preguntas o turnos teóricos.` |
| Materia inexistente | 404 | `Materia especificada no existe.` |

Los errores de validación llegan como **arreglo JSON crudo** y la interfaz los reparte por campo.

---

## 3. Registrar un turno práctico

**Actor:** Jefe de Operaciones (permiso `Manage Shifts`).
**Camino feliz:** nombre de 10 a 30 caracteres, fecha futura, programa, sub fase, misión,
instructor, **la aeronave disponible**, al menos un alumno con horas `HH:mm` y al menos una maniobra
con su nota mínima → **200** con el turno guardado.

**Cualquiera de las doce sub fases sirve.** Desde la migración `019` todas tienen maniobras
enlazadas —44 filas en `maniobras_subfase`, entre 2 y 6 por sub fase—, así que el selector de
maniobras nunca sale vacío. La advertencia vieja de «elegir la 2, 3 o 4» ya no aplica.

**De las tres aeronaves sembradas sólo una está disponible:** el **Robinson R22**. El Enstrom 280FX
está `En_Mantenimiento` y el Schweizer S‑300C `No_Disponible`, y elegir cualquiera de los dos corta
antes que toda validación de campo.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Aeronave en mantenimiento o no disponible | **400** | `Asignar aeronave disponible.` — mensaje suelto, no de campo |
| Fecha de hoy o anterior | 400 | `'fechaEval': La fecha del turno debe ser posterior a hoy.` |
| El mismo alumno con horas que se cruzan | 400 | `'alumnosTurno[i].codAlumno': El alumno <cod> tiene un horario que se cruza con otro turno del mismo día.` — **la regla es del alumno, no de la aeronave** |
| Nombre corto y sin maniobras | 400 | dos elementos: `'nombre': Nombre debe tener de 10 a 30 caracteres.` y `'maniobrasTurno': La asignación de maniobras es requerida` |
| Hora con formato inválido | 400 | `'alumnosTurno[0].horaInicio': La hora debe estar en formato HH:mm (09:00, 14:00)` |
| Un Alumno intenta crear | 403 | `Acceso denegado` |
| Modificar o borrar un turno cuya fecha ya pasó | **410** | `No se puede modificar. El turno ya ha sido evaluado.` ⚠️ **el mensaje miente**: la regla es de fecha, no de evaluaciones (`permiteCambios()` es `now().isBefore(fechaEval)`). Está anotado desde M1-7 |

**Cruce de aeronave, no de alumno:** que dos turnos del mismo día usen la misma aeronave a la vez
**se avisa pero se deja guardar** (decisión M1-10): una aeronave se puede reasignar y el Escuadrón
sabe cosas que el sistema no. Que un alumno esté en dos turnos a la vez **se rechaza**, porque es
imposible.

**Los 19 turnos sembrados son de 2024**, o sea todos pasados: ninguno se puede modificar ni borrar.
El que se cree durante la demo, con fecha futura, sí.

---

## 4. Registrar una evaluación práctica

**Actor:** **el instructor del turno**, y nadie más, para `Ponderada` y `Chequeo Sub Fase`.
**Camino feliz:** entrar como `instructor.perez`, abrir el **turno 4** (`Navegación Local Inicial`,
alumna `666666`) y poner una nota del DIRBE a **cada una** de sus seis maniobras, todas con estándar
`B`, así que `B` o `E` en todas → evaluación registrada, con su promedio y su clasificación
calculados por el servidor:

```
codigo        666666-4
categoria     Ponderada          clasificacion  Bueno
promedio      17.0               estadoAlumno   Apto
fase          Navegación Visual  subFase        Navegación Local
```

El efecto se ve enseguida en §8: `666666` pasa a tener nota en Navegación Local, y su `nia.motivo`
deja de nombrar esa sub fase entre las que le faltan.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| **Cualquier otro usuario**, incluido el Administrador | **403** | `Solo el instructor asignado al turno puede registrar esta evaluación.` — se evalúa **antes que todo lo demás**, y mira **quién llama**, no el `codEvaluador` del cuerpo |
| Nota bajo el estándar sin justificar | 400 | **tres mensajes por cada calificación**: `'calificaciones[i].causa': La causa es requerida para calificaciones bajo el estándar.`, más `observacion` y `recomendacion` |
| Nota que la maniobra no admite | 400 | `{"mensaje":["Las notas con id: 1 no utilizan el sistema de calificación."]}` |
| Faltan calificaciones | 400 | `{"mensaje":"Todas las notas son requeridas."}` |
| Nombre de menos de 10 caracteres | 400 | `'nombre': Nombre debe tener de 10 a 30 caracteres.` |

«Bajo el estándar» es relativo y no absoluto: con estándar `B`, una `I` está **bajo**; con estándar
`I`, la misma `I` está **al** estándar. Sale de `Dirbe.calificacionBajoEstandar` y no de una lista
aparte, para que ampliarlo sea un solo cambio.

---

## 5. Gestionar el banco de preguntas

**Actor:** Instructor o Administrador (permiso `Manage Questions`).
**Camino feliz:** el índice devuelve las **24** sembradas con sus cinco filtros combinables
(`idMateria`, `dificultad`, `tipo`, `origen`, `texto`); crear una pregunta con las alternativas que
su tipo exige → **201** `{"mensaje":"Pregunta guardada con éxito.","pregunta":{…}}`.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Opción múltiple sin exactamente 4 alternativas | 400 | `'alternativas': Una pregunta de opción múltiple debe tener exactamente 4 alternativas.` |
| Más de una alternativa correcta | 400 | `'alternativas': Debe marcar exactamente una alternativa como correcta.` |
| `COMPLETAR` sin el marcador `_____` | 400 | `'enunciado': El enunciado de una pregunta de completar debe incluir el marcador _____.` |
| Materia inexistente | **404** | `Materia especificada no existe.` — un id anidado que no existe es 404, no error de campo |
| Borrar una pregunta usada en un turno | **409** | `La pregunta se usa en un turno teórico y no se puede eliminar.` |
| Un Alumno entra al banco | 403 | `Acceso denegado` |

**El filtro `texto` no distingue mayúsculas ni tildes**: buscar `adoctrinamiento` encuentra
`Adoctrinamiento`.

**Modificar una pregunta conserva el `id` de cada alternativa.** No es un detalle interno: la
respuesta del alumno se guarda como el **id** de la alternativa, así que renumerarlas le borraría
la respuesta a quien esté rindiendo, sin aviso.

---

## 6. Programar un turno teórico

**Actor:** Instructor o Administrador (permiso `Manage Exams`).
**Camino feliz:** materia, tipo de examen, fecha y ventana futuras, un grupo **del propio
instructor**, y preguntas de esa materia cuyos puntajes **sumen exactamente 20** → **201**
`{"mensaje":"Turno teórico guardado con éxito.","turnoTeorico":{…}}`.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Los puntajes no suman 20 | 400 | `'preguntas': Los puntajes de las preguntas deben sumar 20.` |
| Ventana de menos de 10 minutos | 400 | `'horaFin': La ventana del examen debe durar al menos 10 minutos.` |
| Grupo que no es del instructor | 400 | `'codInstructor': El grupo no corresponde al instructor.` |
| Modificar o borrar un turno cuya ventana ya empezó | **409** | `El turno teórico ya no se puede modificar: su ventana comenzó.` |
| Fecha y hora de inicio en el pasado | 400 | `El examen debe comenzar en el futuro.` |

Los grupos del instructor se derivan **por los alumnos con los que ya voló**
(`turnos.cod_instructor` → `alumnos_turno` → `personas.id_grupo`), porque **no hay relación
instructor-grupo en el esquema**. El catálogo solo ofrece grupos **con alumnos**, precisamente para
que no se pueda elegir uno que la validación va a rechazar.

Los nueve turnos teóricos sembrados son todos de `instructor.perez`.

---

## 7. Rendir un examen teórico

**Actor:** Alumno (permiso `Take Exams`).
**Camino feliz:** `alumno.lopez` ve su examen pendiente → lo inicia → responde → se autoguarda →
lo entrega → ve su nota, su mínimo aplicado y si aprobó.

La semilla deja **uno abierto a propósito**: el turno teórico **3**, `Semanal Adoctrinamiento de
Vuelo`, grupo 1, ventana **00:00–23:59 del día en curso**, 5 preguntas, nota mínima **18**. Si la
demo se corre otro día, hay que mover `fecha_examen` de esa fila o programar uno nuevo con §6.

**Iniciar es idempotente**: recargar la página retoma el mismo examen con las respuestas guardadas,
con **200** en vez de 201.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Pedir los pendientes de otro alumno | **200** | ya no es expresable: con la dependencia 51 el código no viaja y la lista es siempre la propia |
| Iniciarle el examen a otro alumno | **201/200** | tampoco: la ruta no lee cuerpo y el examen es el del llamador |
| Iniciar un turno de un grupo que no es el suyo | 403 | `El alumno no está habilitado para este examen.` |
| Iniciar cuando la ventana no abrió o ya cerró | 409 | `La ventana del examen cerró.` |
| Entregar dos veces | 409 | `El examen ya fue entregado.` |
| Ver el examen de otro alumno | **403** | `Solo puede consultar su propia información.` — el id del examen sí viaja en la URL |
| **El Instructor** ve el examen de cualquiera | **200** | misma ruta, permiso `Manage Exams`: el cuerpo llega **completo** |

**La misma ruta devuelve dos cuerpos distintos según quién pregunta.** Mientras el turno no esté
`FINALIZADO`, el alumno recibe `calificaciones: []` —para no revelar respuestas a quien todavía
rinde— aunque sí recibe su nota; con `Manage Exams` llega el detalle completo en cualquier estado.

**`COMPLETAR` se califica ignorando mayúsculas, tildes, espacios de los extremos y espacios
internos repetidos**: `"Rotor  de   Cola "` acierta `"Rotor de cola"`.

**Si la ventana venció y el alumno cerró la pestaña**, el examen se cierra y se califica solo, la
próxima vez que alguien lo lea, y la hora de entrega que queda registrada es **la del cierre de la
ventana**, no la de la lectura.

---

## 8. Consultar el seguimiento de un alumno

**Actor:** Comandante, Instructor o Jefe de Operaciones (`Read`, con alcance por grupo).
Los dos alumnos del grupo 3 son la historia, y son opuestos a propósito:

| | `555555` Pedro | `666666` Ana |
|---|---|---|
| **`NIT`** | **18.40** | **12.00** |
| `NCT` · `NEI` | 18.00 · 20.00 | 12.00 · 12.00 |
| Causales | ninguna | **`PROMEDIO_ASIGNATURA`** en Adoctrinamiento de Vuelo |
| Bloqueo por subsanación | no | **sí**, 3 exámenes desaprobados |
| **`NIA`** | **15.83** | `null` |
| **`NFPI`** | **16.34** | `null` |

**La cadena completa de `555555`, para contarla en orden:** Control Básico da **14.70** —ponderado
sobre el **44 %** de la sub fase, y la pantalla lo dice—, las cinco notas de fase salen
**14.99 · 15.36 · 16.20 · 16.94 · 16.44**, el `nia` **15.83** y el `nfpi` **16.34**. El `nia.motivo`
viene en `null`: no queda nada que advertir, porque las doce sub fases que el NIA pondera tienen
nota.

**El 14.70 no es un promedio y conviene decirlo:** las cuatro notas de Control Básico son 13, 15.5,
15 y 15, y su promedio simple daría **14.63**. Sale 14.70 porque `CB-1` vale 1.0 h y `CB-3` 1.2, o
sea que la ponderación por horas se **ve** en la cifra. Con el programa anterior no se veía: sus
misiones de Contacto valían todas 1.0 h.

Los pesos de fase salen en la pantalla a **cuatro decimales** —0.2766 · 0.2340 · 0.1596 · 0.1596 ·
0.1702— porque se derivan de las horas de la Tabla 4 sobre 94.0 y a dos decimales no cerrarían.

| Alternativa | HTTP | Qué pasa |
|---|---|---|
| Un alumno pide el legajo de otro | **403** | `Solo puede consultar su propia información.` — un único texto para los ocho controladores que emiten este 403 |
| Un alumno pide **el suyo** | 200 | legajo completo |
| Un alumno sin ningún chequeo | **404** | `No existen chequeos disponibles.` → la interfaz muestra el panel vacío. **Le pasa a todos**: la semilla no tiene ninguna fila en `chequeos_finales` |
| Código de persona inexistente | 404 | `Persona especificada no existe.` |
| Persona que **no es alumno** | **200** | con el bloqueo en `false` y los arreglos vacíos: «no calculable» y «no encontrado» son cosas distintas |
| `NIA` de un alumno sin notas de sub fase | 200 | `null`, con `nia.motivo` nombrando **las doce** sub fases que le faltan, fase por fase |
| `nsf` de Control Básico de `555555` | 200 | **`14.70`**, `ponderacion: "PDI"`, `cobertura: 0.4423`, y un `motivo` que explica la renormalización |

**Un índice ausente nunca vale 0.** Cero es una nota posible, y confundir las dos cosas es
exactamente cómo se publica un orden de mérito falso. Por eso `null` se propaga hacia arriba:
sin `NSF` no hay fase, sin fase no hay `NIA`, y sin `NIA` no hay `NFPI` **aunque el `NIT` exista**.

---

## 9. Publicar el orden de mérito

**Actor:** Comandante o Administrador (permiso `Create Reports`). `GET /api/reportes/orden-merito`.

**Camino feliz:** `555555` sale **puesto 1**, con `nfpi` **16.34**, `nit` **18.40** y `nia`
**15.83**. Los otros cinco alumnos salen **sin puesto, cada uno con su motivo**, y esa es la mitad
útil de la pantalla: cuatro por la mitad teórica y `666666` porque le falta nota de sub fase.

**Un alumno sin NFPI no se omite ni se pone último: se lista con `puesto: null` y el texto de lo que
le falta.** El motivo es una frase completa que nombra cada fase y cada sub fase sin nota —se
**muestra**, no se compara— y por eso cambia en cuanto se registra una evaluación con §4.

---

## 10. Estudiar con el módulo de aprendizaje

**Actor:** cualquiera de los cinco roles (las tres pantallas piden `Read`). Backend
`sigeda_chat_status` en el 3000, con **el mismo token** que emite `POST /auth/login`.

**Camino feliz de la subida:** *Aprendizaje → Documentos → Subir*, con un `.txt`, `.pdf` o `.docx`
de hasta 25 MB → el documento aparece en `processing` y pasa a `ready` en unos segundos.

| Alternativa | HTTP | Qué pasa |
|---|---|---|
| Sin encabezado `Authorization` | **401** | `{"statusCode":401,"message":"No autorizado.","error":"Unauthorized"}` |
| Token válido de un usuario no sembrado acá | **401** | lo mismo; en el log, `Token válido de "<usuario>", que no tiene usuario en este servicio`. Se arregla con `pnpm seed:usuarios` |
| Archivo que el extractor no puede leer | 200 al subir | el documento queda en `status: "error"` con `No se pudo procesar el documento. Intenta subirlo de nuevo.` |
| Falta el bucket de MinIO, o falta `MINIO_DOMAIN` | **500** | `Internal server error`, y en el log `NoSuchBucket`. Ver `demo-runbook.md` §3.2 |

**Generar un cuestionario y hacer una consulta NO funcionan hoy**, y conviene saberlo antes de
abrir la pantalla: las claves de IA del `.env` están vencidas (`demo-runbook.md` §6). El efecto es
parcial: la subida **igual termina en `ready`**, con `0 tags, 0 chunks indexados`, y sólo el log lo
dice; pedir un cuestionario o una consulta sobre ese documento sí falla a la vista.

**La predicción de desempeño responde bien pero no tiene pantalla.**
`GET /prediction/students/{id}` de `555555` devuelve `evaluationCount: 16`, `discardedCount: 1`,
`latestScore: 17`, `riskLevel: "bajo"`, `trendDirection: "up"` y 10 filas de `maneuverBreakdown`.
Se demuestra con `curl`. Tres cosas de esa respuesta que no hay que rotular mal:

- `latestScore` **no es un promedio**: es el `promedio` de la ÚLTIMA evaluación.
- `latestEvaluation.sigedaClassification` es la clasificación de SIGEDA verbatim (Malo / Regular /
  Bueno / Excelente). `predictedBand` tiene **tres** valores del motor (`optimo` / `regular` /
  `deficiente`) y **no es la misma cosa**.
- `maneuverBreakdown` son **conteos, no puntajes**, y `severe` es un **subconjunto** de `below`, no
  una cuarta columna que se sume.

---

## 11. Alternativas que el servidor todavía no cubre

Encontradas probando; **hoy las cubre la interfaz**, así que no se ven en la demostración, pero
existen para cualquier otro cliente:

| Situación | Qué hace hoy | Qué debería hacer |
|---|---|---|
| `horaFin` anterior a `horaInicio` en un alumno del turno | **200, lo guarda** | 400 de campo. La interfaz sí lo valida |
| `codAlumno` inexistente en un turno | **500** con el error de FK de PostgreSQL en el mensaje | 404 o error de campo, y sin filtrar detalle de la base |
| Una ruta que no existe bajo `/api` | **500** «Error inesperado» | 404 |

---

## 12. Tres defectos que estas preparaciones encontraron

Los tres sólo aparecen contra PostgreSQL, y los tres están arreglados.

1. **Dar de alta un turno abortaba** con `duplicate key value violates unique constraint
   "turnos_pkey" · Key (id)=(18) already exists`. La migración `019` sembró filas con id explícito y
   no movió las secuencias; cuatro quedaron apuntando dentro del rango ocupado (`fases`, `subfases`,
   `misiones`, `turnos`). Son cuatro rutas de alta, no una. **La suite no podía verlo porque corre
   sobre H2 con `ddl-auto=create-drop`**, donde Hibernate crea las secuencias a partir del
   `initialValue` de la entidad y `schema_prod.sql` no participa. Detalle en `demo-runbook.md` §7.
2. **Un usuario no podía volver a iniciar sesión.** El primer login de cada usuario funcionaba y
   **todos los siguientes devolvían un 403 con el cuerpo vacío**. `refresh_tokens` es única por
   usuario y el servicio borraba e insertaba en la misma transacción; Hibernate ordena los INSERT
   antes que los DELETE, así que el insert chocaba con la fila que el delete aún no había escrito.
   Faltaba un `flush()`. **Ninguna prueba lo veía porque cada clase se autentica una sola vez por
   usuario.**
3. **El banco de preguntas devolvía 500 en su vista por defecto.** Sin filtro de texto, PostgreSQL
   no puede inferir el tipo del parámetro nulo dentro de `concat()`, lo bindea como `bytea` y
   rechaza la comparación. Faltaba un `cast`. **Aquí H2 sí difiere del motor real**: infiere el tipo
   y responde 200.

Los tres dicen lo mismo: **una suite verde sobre H2 no dice que el sistema funcione sobre
PostgreSQL**, y la diferencia no es de borde — son la pantalla por defecto del banco, el segundo
login de cualquiera y el alta de un turno.

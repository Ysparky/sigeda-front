# Guion de la demostración, clic por clic

Los seis pasos del camino feliz, con qué escribir en cada campo y **qué tiene que aparecer**. Las
etiquetas de abajo son las que el sistema usa de verdad, sacadas del código, no aproximadas.

- **El entorno** —qué levantar y en qué orden— está en `demo-runbook.md`.
- **Las alternativas** —qué pasa cuando algo se rechaza, con el mensaje literal— están en
  `casos-de-uso-demo.md`.
- **Las cuentas y sus permisos** están en `cuentas-de-la-demo.md`.

Contraseña **`123`** para todas. Se entra por *Usuario* y *Contraseña* → **Iniciar sesión**.

> **El orden importa en un punto.** El paso 3 deja a `alumno.lopez` con el examen entregado. Si lo
> desaprueba queda con subsanación pendiente y **el paso 5 lo rechaza**; por eso el paso 5 usa a
> `222222`. Si algo queda sucio, **reiniciar el backend vuelve a sembrar** y todo queda como al
> principio.

---

## Paso 1 · Banco de preguntas y programar un examen

**Entrar como `instructor.perez`.**

### 1.1 Recorrer el banco

Menú **Teoría → Banco de preguntas**. Tienen que salir **24 preguntas**. Los cinco filtros se
combinan: materia, dificultad, tipo, origen y texto.

**Lo que conviene mostrar:** escribir `adoctrinamiento` en el filtro de texto. Encuentra
`Adoctrinamiento` **sin tilde y sin mayúscula** — la búsqueda las ignora.

### 1.2 Programar un turno teórico

**Teoría → Turnos teóricos → Registrar turno teórico.**

| Campo | Qué poner |
|---|---|
| **Nombre** | `Semanal de prueba` |
| **Programa** | `PDI` |
| **Materia** | `Adoctrinamiento de Vuelo` |
| **Tipo de examen** | `SEMANAL` |
| **Fecha del examen** | cualquier día **futuro** |
| **Hora de inicio** / **Hora de fin** | `09:00` y `10:00` |
| **Grupo** | `Grupo 1` |

Después, cinco veces: **Agregar pregunta** → elegir en *Pregunta N* → poner `4` en *Puntaje N*.

**Guardar turno teórico** → el turno aparece en la lista.

**Las dos reglas que vale la pena provocar:** si los puntajes **no suman 20** lo rechaza, y si la
ventana dura **menos de 10 minutos** también. Son dos errores que se ven bien en vivo.

---

## Paso 2 · Registrar una evaluación práctica

**Seguir como `instructor.perez`** — y esto importa: **sólo el instructor del turno puede evaluarlo**,
ni siquiera el Administrador.

**Operaciones de vuelo → Programación de turnos → turno 4** (`Navegación Local Inicial`, alumna
`666666` Ana Torres). En la tarjeta de la alumna, **Registrar evaluación**.

| Campo | Qué poner |
|---|---|
| **Nombre** | `Ponderada Nav Local 1` — entre 10 y 30 caracteres |
| **Categoría** | `Ponderada` |
| **Recomendación general** | `Reforzar lectura de cartas` |

En **Calificación por maniobra** hay seis filas, una por maniobra, y todas exigen **`R`**. Poné `R`
en unas y `B` en otras → **Guardar evaluación**.

**Qué tiene que aparecer:** el servidor devuelve el promedio y la clasificación; con tres `R` y tres
`B` da **18.8 · Bueno**. El frontend **no recalcula nada**: muestra lo que el backend decidió.

> **Esto es lo que más conviene demostrar de toda la pantalla.** La exigencia del turno no sólo
> pide: también **acota**. Con mínimo `R`, el DIRBE deja elegir `I`, `R` y `B`, y **`D` y `E`
> aparecen deshabilitadas** — no es un fallo, es la tabla de combinaciones válidas.
>
> | Exige | Deja elegir | Cuenta como bajo el estándar |
> |---|---|---|
> | `D` (turno 6) | sólo `D` | — |
> | `I` (turno 7) | `I` · `R` | — |
> | **`R` (turnos 4 y 5)** | `I` · `R` · `B` | `I` |
> | `B` (el resto) | `I` · `R` · `B` · `E` | `I` · `R` |
>
> Y si ponés una **`I`**, que está bajo el estándar, la fila **exige causa, observación y
> recomendación** antes de dejar guardar. Una sola `I` contra un mínimo de `R` fuerza **Vuelo Malo**
> y el promedio cae a 12.0: vale la pena mostrar las dos versiones.

**Los cuatro turnos sin evaluar** son los únicos donde esto se puede hacer:

| Turno | Sub fase | Exige | Instructor | Alumno |
|---|---|---|---|---|
| **4** | Navegación Local | **`R`** | `instructor.perez` | `666666` |
| 5 | Procedimientos y Aproximación IFR | `R` | `instructor.mendoza` | `777777` |
| 6 | Circuitos y Maniobras | `D` | `instructor.mendoza` | `999999` |
| 7 | Control Preciso | `I` | `instructor.mendoza` | `999999` |

---

## Paso 3 · Rendir un examen

**Entrar como `alumno.lopez`.**

**Teoría → Mis exámenes.** En **Exámenes pendientes** está `Semanal Adoctrinamiento de Vuelo`, con
**5 preguntas** y nota mínima **18**. Abrirlo.

> El examen **se abre solo cualquier día**: la semilla lo siembra con la fecha de hoy y ventana
> 00:00–23:59. No hay que tocar nada.

Las preguntas salen rotuladas **`Pregunta 1 · 4 puntos`** y van cuatro tipos distintos: opción
múltiple, verdadero/falso y completar. **Las respuestas se guardan solas** mientras se contesta.

**Para que apruebe** (nota 20): `El PDI EA-510` · la segunda alternativa de la pregunta 2 ·
`Verdadero` · escribir **`Regular`** en la de completar · y la tercera alternativa de la pregunta 5.

**Entregar** → **Ver el resultado**: sale **20.0**, mínimo **18**, aprobado, y
**Detalle de sus respuestas** con el puntaje pregunta por pregunta (`Pregunta 1 · 4 de 4`).

**Tres cosas que se pueden mostrar acá:**

- **Recargar la página a mitad del examen** no pierde nada: reabre el mismo examen con lo ya
  respondido.
- **La de completar ignora mayúsculas, tildes y espacios de más**: `rotor  de   cola ` acierta
  `Rotor de cola`.
- **Entregar dos veces** se rechaza.

---

## Paso 4 · El legajo, el chequeo, las alertas y el orden de mérito

**Entrar como `comandante.aguirre`.**

### 4.1 El legajo de `555555`

**Seguimiento → Escuadrón →** `555555` Pedro. Es el único alumno con el expediente completo: **17
evaluaciones** y las doce sub fases con nota.

**Las cifras que tienen que salir:**

```
NFPI 16.34     NIA 15.83     NIT 18.40
notas de fase  14.99 · 15.36 · 16.20 · 16.94 · 16.44
```

**Lo que hay que contar, y es el corazón de la tesis:** en Control Básico la nota de sub fase es
**14.70**, y el promedio simple de sus cuatro notas —13, 15.5, 15 y 15— daría **14.63**. Sale 14.70
porque **cada misión pesa sus horas**: `CB-1` vale 1.0 h y `CB-3` vale 1.2. La pantalla además dice
que está calculada sobre el **44 %** de la sub fase, porque sólo 4 de sus 9 misiones tienen nota.

### 4.2 El contracaso: `666666`

**Seguimiento → Escuadrón →** `666666` Ana. `NIT` **12.00**, bloqueada por subsanación con el motivo
*«Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.»*, y
**`NIA` y `NFPI` en blanco** con un texto que nombra las sub fases que le faltan.

**Un índice que falta nunca vale 0**, y es deliberado: cero es una nota posible, y confundirlas es
exactamente cómo se publica un orden de mérito falso.

### 4.3 El ciclo de chequeo, que es la otra mitad de la evaluación

**Seguimiento → Escuadrón →** `555555`, panel **Ciclo de chequeo**.

```
contadores:   chequeo 1 · evaluaciones 5 · malos 1 · regulares 4
criterio 2 (Vuelo por Instrumentos)   CUMPLIDO: «4 Regulares alternados»
```

**Esta es la pieza que conviene no saltarse, porque es la regla del PDI funcionando.** El sistema no
espera a que alguien se dé cuenta: cuenta los vuelos bajo el estándar y, al alcanzar una de las ramas
del criterio, marca que el alumno debe un chequeo **con otro instructor**.

| | Ramas que disparan el chequeo |
|---|---|
| **Criterio 1** · las cuatro primeras fases | 3 Malos · 2M+2R · 1M+4R · 6R |
| **Criterio 2** · Vuelo por Instrumentos | 2 Malos · 1M+2R · 4R |

«Alternados» en el PDI significa **en cualquier orden**, no una condición de posición — el documento
lo dice y el código lo cita. Son conteos.

> **El dato de oro de la demostración: `555555` es puesto 1 del orden de mérito Y debe un chequeo.**
> No es una contradicción ni un error: el orden de mérito mide el **promedio ponderado** y el ciclo de
> chequeo mide la **acumulación de vuelos bajo el estándar**. Un alumno puede promediar bien y
> llevar cuatro Regulares. Las dos cifras son correctas y miden cosas distintas, y poder explicar eso
> es exactamente lo que se le pide a un sistema de evaluación.

**Los contadores no son decorativos: salen de las evaluaciones.** `cont_malo` cuenta las ponderadas
`Malo`, `cont_regular` las `Regular`, `cont_chequeo` las de categoría `Chequeo`. Se puede abrir el
historial del alumno y contarlas a mano: el Malo es `555555-10` (12.0, Circuitos y Maniobras) y los
cuatro Regulares son `555555-1`, `555555-3-2`, `555555-3-5` y `555555-11`.

**El historial de chequeos sale vacío, y ahora eso es correcto:** nadie en la semilla cerró un ciclo.
Un ciclo cerrado reinicia los cuatro contadores (`Persona.reiniciarCont`), así que archivar uno
*aprobado* y a la vez mantener los contadores en 1 y 4 sería la contradicción que este paso evita.

### 4.4 Las alertas

**Seguimiento → Alertas.** Seis, ordenadas por severidad, y **todas con su fila detrás**:

| Severidad | Alerta | Alumno |
|---|---|---|
| **ALTA** | `SUBSANACION_PENDIENTE` | `666666` |
| MEDIA | `CAUSAL_TEORICO` | `666666` |
| MEDIA | **`CHEQUEO_PENDIENTE`** | `555555` |
| BAJA | `VUELO_DESAPROBADO` ×3 | `555555` |

**Por qué ese orden y no otro:** la subsanación es lo único que **efectivamente detiene** al alumno
—el PDI dice que quien desapruebe no podrá realizar operaciones aéreas hasta aprobar la
subsanatoria—. Una causal teórica no bloquea nada: es materia del Consejo de Evaluación. Y un vuelo
desaprobado es un hecho ya registrado que por sí mismo no pide acción; lo que pide acción es lo que
acumula, y eso ya está en `CHEQUEO_PENDIENTE`.

### 4.5 El orden de mérito

**Seguimiento → Reportes y orden de mérito.**

`555555` sale **puesto 1**. Los otros cinco salen **sin puesto, cada uno con su motivo** — y esa es
la mitad útil de la pantalla, no un hueco.

---

## Paso 5 · Dar de alta un turno práctico

**Entrar como `jefe.operaciones`.**

**Operaciones de vuelo → Programación de turnos → Registrar turno.**

| Campo | Qué poner |
|---|---|
| **Nombre** | `Autorrotacion Inicial` — de 10 a 30 caracteres |
| **Fecha de evaluación** | un día **futuro** (hoy no sirve) |
| **Sub fase** | `Autorrotación` |
| **Misión del PDI** | cualquiera de la sub fase |
| **Instructor** | `Juan Torres` (`instructor.perez`) |
| **Aeronave** | **`Robinson R22`** — ver abajo |

**Agregar alumno** → en *Alumno 1* elegir `222222`, y las horas en *Inicio 1* y *Fin 1*.
**Agregar maniobra**, dos veces → *Maniobra 1* y *Maniobra 2* con su *Nota mínima 1* y *2*.

**Guardar turno.**

**Dos cosas para provocar a propósito:**

- **De las tres aeronaves sólo el Robinson R22 está disponible.** El Enstrom sale
  `· En mantenimiento` y el Schweizer `· No disponible`, los dos **deshabilitados**.
- **Poner al mismo alumno dos veces con horas que se cruzan** se rechaza, con el código del alumno
  en el mensaje. Que **dos turnos usen la misma aeronave a la vez sólo avisa** y deja guardar
  —aparece *¿Guardar con horarios superpuestos?* con **Guardar de todos modos**—, porque una
  aeronave se puede reasignar y un alumno no puede estar en dos lugares.

**Cambiar la sub fase después de cargar maniobras** abre *¿Cambiar la sub fase?* con dos salidas:
**Conservar sub fase** o **Cambiar y quitar maniobras**. Las maniobras son de la sub fase, así que
no pueden sobrevivir al cambio.

---

## Paso 6 · El módulo de aprendizaje

**Cualquier cuenta sirve** — las tres pantallas piden `Read`, que tienen los cinco roles. Entrá con
la misma con la que vayas a consultar: **cada quien ve sólo sus propios documentos**.

### 6.1 Subir un documento

**Aprendizaje → Documentos → Subir documento.** Un `.txt`, `.pdf` o `.docx` de hasta 25 MB, con
contenido aeronáutico real.

Aparece **procesando** y pasa a **listo** en unos segundos, **con sus etiquetas** — las genera el
modelo a partir del contenido. Con un texto de aproximaciones IFR salieron
`Aproximación IFR`, `Patrón de espera`, `Curso final`.

> Hay que subir uno nuevo: los documentos viejos de la base quedaron sin indexar y el chat no
> encuentra nada en ellos.

### 6.2 Generar un cuestionario

**Aprendizaje → Cuestionario de práctica.** Elegir el documento en **Documentos del cuestionario**,
marcar los tipos de pregunta y la cantidad (de 2 a 20) → **Generar cuestionario**.

Las preguntas salen **sobre el contenido real** del documento, no genéricas.

> **Los tipos son una sugerencia, no un contrato:** puede devolver un *completar* aunque hayas
> pedido sólo opción múltiple y verdadero/falso. El prompt los nombra y el esquema acepta los tres.

### 6.3 Consultar (el chat con citas)

**Aprendizaje → Consultas.** Elegir el documento en **Documentos para consultar**, escribir la
pregunta → **Enviar**.

**Lo que hay que señalar:** la respuesta **cita `[1]`** y abajo aparece la fuente con su documento.
Preguntando *«¿qué pasa si no veo la pista al llegar a los mínimos?»* contestó *«debes ejecutar la
aproximación frustrada sin demora [1] … ascender, seguir el rumbo publicado y notificar a la
dependencia [1]»*. **La cita es lo que distingue esto de un chatbot**: la respuesta es verificable
contra el documento.

---

## Lo que no se puede demostrar, para no quedar en falta

- **El HISTORIAL de chequeos sale vacío** —`chequeos_finales` no tiene filas—, pero el **ciclo** sí
  dice algo (§4.3). Y el vacío es coherente, no un hueco: nadie cerró un ciclo todavía.
- **La predicción de desempeño no tiene pantalla.** El backend responde —`555555` da 16
  evaluaciones, riesgo bajo y tendencia al alza— pero ninguna vista la consume todavía.
- **Eliminar una persona falla** si el usuario alguna vez inició sesión, por una clave ajena sin
  cascada en `refresh_tokens`.
- **Modificar maniobra y eliminar fase** están deshabilitadas por el propio frontend.

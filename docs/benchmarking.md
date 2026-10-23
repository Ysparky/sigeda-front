# Benchmarking de SIGEDA frente a soluciones del rubro

Comparación de **SIGEDA** —el sistema de gestión académica para la instrucción de pilotos de
helicóptero del Aeroclub Sudamericano de los Andes (escuela civil bajo **RAP 141**, programa **PDI
EA‑510**)— contra las categorías de software que hoy cubren, total o parcialmente, el mismo problema.

> **Alcance y método.** La comparación es por **capacidades**, no por marcas: para cada capacidad se
> indica si una herramienta la cubre de forma sólida (✅), parcial (🟡) o no la cubre / no aplica a su
> propósito (⬜). Las capacidades de SIGEDA salen de su propio código; las de los demás productos, de
> sus materiales públicos (ver *Fuentes*), que **evolucionan y conviene verificar** antes de citarlos
> en la tesis. El objetivo no es declarar un "ganador" universal —cada herramienta optimiza para su
> mercado— sino ubicar a SIGEDA: **qué resuelve que las demás no, y qué deja fuera a propósito.**

---

## 1. El rubro y sus categorías

No existe un único competidor directo. El problema de "gestionar la instrucción de una escuela de
vuelo" lo atacan cuatro familias de software, cada una desde un ángulo distinto:

| Categoría | Qué optimiza | Ejemplos |
|---|---|---|
| **Gestión de operaciones de escuela de vuelo** | Reservas, despacho, facturación, registros 141 | Flight Schedule Pro, Flight Circle, FlightLogger, Talon ETA |
| **Gestión de instrucción militar/estructurada** | Sílabo, libreta de calificaciones, programación | GTIMS (G/TIMS) |
| **LMS aeronáutico (instrucción en tierra)** | Teoría, banco de preguntas, exámenes | CAE, Padpilot, ATP, y LMS genéricos (Moodle) |
| **Gestión académica a medida de una normativa** | Reglas de calificación de un programa específico | **SIGEDA** (PDI EA‑510 / RAP 141) |

El punto de partida de la tesis: las tres primeras familias están construidas para la normativa
**FAA Part 141 / EASA** o para programas **militares**, y **ninguna encapsula la normativa del PDI
EA‑510** (DIRBE, coeficientes de misión, criterios de chequeo, NFPI). Adaptar cualquiera de ellas a
esas reglas sería desarrollo a medida, que es justamente lo que SIGEDA hace de raíz.

---

## 2. Los productos comparados

- **Flight Schedule Pro** — reservas de aeronaves y **despacho**; facturación limitada (registra
  horas de vuelo para facturar). Sin gestión de sílabo ni seguimiento de progreso integrados; el
  cumplimiento documental suele requerir pasos manuales.
- **FlightLogger** — plataforma "todo en uno" más nueva: programación, instrucción de vuelo **y
  tierra**, registros digitales de entrenamiento, cumplimiento, y seguimiento de competencias a
  nivel de lección (CBTA). Base instalada más chica.
- **Talon ETA** — orientada a **programas universitarios** (Part 141): currículo con etapas, fases y
  objetivos, programación automática que sugiere la próxima lección según el currículo y los
  recursos, registros, despacho y facturación.
- **Flight Circle** — módulo Part 61/141: el instructor marca tareas como completas, **califica** con
  una escala configurable (cada nota ligada a aprobado/desaprobado) y firma lecciones; reservas y
  mantenimiento.
- **GTIMS (G/TIMS)** — sistema de gestión de entrenamiento **militar** de EE.UU. (USAF/Navy/Army, 40+
  bases): cubre desde la programación hasta **libretas de calificaciones**, registros de vuelo y
  reportes, atado al sílabo. Es el más cercano en rigor de calificación, pero es **propietario y
  militar**, no civil ni RAP 141.
- **LMS genérico (Moodle/Canvas)** — solo instrucción en tierra: cursos, cuestionarios, exámenes. No
  modela vuelo.

---

## 3. Tabla comparativa por capacidad

Leyenda: ✅ sólido · 🟡 parcial / depende · ⬜ no cubre / no aplica a su propósito.

| Capacidad | **SIGEDA** | Flight Schedule Pro | FlightLogger | Talon ETA | Flight Circle | GTIMS (militar) | LMS genérico |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Programación de turnos (aeronave/instructor/alumno) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Despacho / orden de vuelo del día | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | ⬜ |
| Registros de entrenamiento / legajo del alumno | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Facturación / cobros | ⬜ | 🟡 | 🟡 | ✅ | ✅ | ⬜ | ⬜ |
| Estructura del programa (fases→subfases→misiones→maniobras) | ✅✅ | ⬜ | ✅ | ✅ | 🟡 | ✅ | ⬜ |
| **Calificación numérica ponderada por maniobra** (DIRBE→misión→fase) | ✅✅ | ⬜ | 🟡 | 🟡 | 🟡 | ✅ | ⬜ |
| **Regla de bajo rendimiento / chequeo automatizado** (conteo por fase dispara estado) | ✅✅ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 | ⬜ |
| Teoría: banco de preguntas + examen online + autocorrección | ✅ | ⬜ | ✅ | ✅ | 🟡 | ✅ | ✅✅ |
| **Índice final unificado teoría + práctica** (NFPI = NIA·0.8 + NIT·0.2) | ✅✅ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 | ⬜ |
| **Regla cruzada: reprobar teoría bloquea volar** | ✅✅ | ⬜ | ⬜ | 🟡 | ⬜ | 🟡 | ⬜ |
| Orden de mérito / ranking del programa | ✅ | ⬜ | ⬜ | 🟡 | ⬜ | 🟡 | ⬜ |
| **Proyección de riesgo por alumno (ML)** | ✅ | ⬜ | 🟡 | 🟡 | ⬜ | ⬜ | ⬜ |
| **Asistente de estudio con IA (RAG con citas, generación de cuestionarios)** | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 |
| Roles y permisos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ajuste a la normativa local (RAP 141 / PDI EA‑510)** | ✅✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| App móvil / offline / libreta de vuelo del piloto | ⬜ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ |
| Integraciones (EFB/ForeFlight, registros FAA) | ⬜ | ✅ | 🟡 | ✅ | ✅ | 🟡 | ⬜ |
| Madurez / modelo | Prototipo de tesis, autoalojado | SaaS comercial | SaaS comercial | SaaS comercial | SaaS comercial | Contrato de defensa | Open source / SaaS |

---

## 4. Dónde SIGEDA se diferencia (las casillas ✅✅)

1. **Motor de calificación que ES la normativa, no una escala genérica.** Los productos comerciales
   califican con escalas configurables (aprobado/desaprobado por tarea, o competencias de 1 a N).
   SIGEDA implementa el **cálculo exacto del PDI**: DIRBE por maniobra → nota de misión (12/15/17/20
   con descuentos) → **NSF ponderada por el coeficiente‑horas de cada misión** → nota de fase
   ponderada por horas → NIA. Eso no se configura en una escala: es un modelo de dominio.
2. **El ciclo de chequeo se dispara solo.** SIGEDA cuenta los vuelos bajo el estándar por fase y, al
   alcanzar una rama del Criterio 1/2 (3M · 2M+2R · 1M+4R · 6R), **cambia el estado del alumno a En
   Chequeo automáticamente**. Las herramientas comerciales registran los stage checks, pero no
   derivan una obligación de chequeo de la acumulación de notas — eso queda al criterio humano.
3. **Un único índice que suma las dos mitades.** NFPI = NIA·0.8 + NIT·0.2. Teoría y práctica suelen
   vivir en módulos (o productos) separados; SIGEDA las integra en **una sola nota del programa** que
   ordena el mérito.
4. **Regla cruzada teoría→práctica.** Una subsanación teórica pendiente **bloquea programar al alumno
   en un turno de vuelo** (validado en el backend, no solo un aviso). Es una dependencia entre
   dominios que casi ningún producto del rubro modela como regla dura.
5. **IA aplicada en dos frentes poco habituales en el rubro:** proyección de riesgo por alumno
   (regresión que **ahora incorpora la regla de chequeo**) y un asistente de estudio **RAG que
   responde citando la fuente** y genera cuestionarios desde los documentos.
6. **Hecho para la normativa local.** No hay producto de estante que encapsule el PDI EA‑510 / RAP
   141; ese es el hueco que la tesis llena.

---

## 5. Dónde SIGEDA no compite (honestidad del alcance)

- **Facturación y cobros:** no los tiene. Los productos comerciales viven en parte de esto.
- **Despacho y mantenimiento de flota maduros:** SIGEDA tiene orden de vuelo del día, pero no la
  gestión operativa profunda (disponibilidad de aeronaves en tiempo real, mantenimiento, squawks).
- **Móvil / offline / libreta de vuelo del piloto:** SIGEDA es web; los competidores traen apps y
  logbooks sincronizables.
- **Integraciones** con EFB (ForeFlight), registros FAA, contabilidad: inexistentes.
- **Madurez de producto:** SIGEDA es un prototipo de tesis, mono‑institución y autoalojado; los
  demás son SaaS multi‑cliente con soporte, escala y auditoría probadas.

---

## 6. Conclusión / posicionamiento

SIGEDA **no compite** con Flight Schedule Pro o FlightLogger en reservas, facturación o movilidad —ni
pretende hacerlo—. Compite en un eje donde esos productos son **genéricos a propósito**: la
**codificación fiel de una normativa de calificación** (el PDI EA‑510) y las reglas que de ella se
derivan (ciclo de chequeo, índice unificado, bloqueo cruzado), más una capa de **IA** (riesgo + RAG)
que el rubro recién empieza a explorar.

Dicho de otra forma: lo que en un producto comercial sería un **proyecto de personalización** —meter
las reglas del PDI en una escala configurable y ojalá no romper nada— en SIGEDA es el **núcleo del
diseño**. Para una escuela bajo RAP 141 que sigue el PDI, eso es exactamente lo que ninguna
herramienta de estante entrega.

---

## Fuentes

- FlightLogger — comparativas de software de escuelas de vuelo (nota: ranking sesgado por el propio
  vendedor; las descripciones de terceros son lo útil): [best flight scheduling software 2026](https://www.flightlogger.net/blog/best-flight-scheduling-software-for-flight-schools-2026) ·
  [7 flight training record software tools compared](https://www.flightlogger.net/blog/7-flight-training-record-software-tools-compared-for-2026)
- Aviatize — registros Part 141 y seguimiento de progreso: [best flight training records software 2026](https://www.aviatize.com/blog/best-flight-training-records-software-2026) ·
  [student progress tracking](https://www.aviatize.com/glossary/student-progress-tracking) ·
  [part 141](https://www.aviatize.com/glossary/part-141)
- Flight Circle — módulo de calificación Part 61/141: [flightcircle.com](https://www.flightcircle.com/)
- GTIMS / G/TIMS — alcance y uso (Air Force / contratistas): [AETCI 36‑2605](https://static.e-publishing.af.mil/production/1/aetc/publication/aetci36-2605v4/aetci36-2605v4.pdf) ·
  [Segue Technologies – G/TIMS sustainment](https://www.seguetech.com/)
- Capacidades de SIGEDA: su propio código (`sigeda-back`, `sigeda-web`, `sigeda_chat_status`) y los
  documentos de dominio en este repositorio (`glosario-de-terminos.md`, `coeficientes-de-mision-pdi.md`,
  `guion-de-la-demostracion.md`).

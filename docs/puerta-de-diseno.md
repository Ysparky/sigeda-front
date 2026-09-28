# La puerta de diseño (§8) — qué se arregló, qué no era un defecto, qué queda para vos

El spec pedía una revisión de diseño al final de M0: **«shell plus one reference screen, run in the
browser, approved before M1 starts»**. Nunca ocurrió, y M1 a M5 se construyeron y fusionaron sin
ella, así que en vez de una pantalla hay **90 capturas** en seis carpetas.

Este documento existe para que la revisión no sea leer 90 capturas. Separa lo que **incumple §8**
—que se arregló y se midió— de lo que era una impresión que **no se sostuvo al medirla**, y deja sólo
las preguntas que de verdad son tuyas.

## Lo que incumplía §8, arreglado y medido

### 1. Las flechas del control DIRBE no seleccionaban · `b57641f`

§8 pide «navegación por teclado de Radix». El control se anuncia como `role="radiogroup"` con items
`role="radio"`, así que el patrón WAI-ARIA exige que **la flecha cambie la selección**. Radix sólo
movía el foco. Medido en un banco aparte:

```
ROL DEL GRUPO: radiogroup     ROL DEL ITEM: radio
tras Tab, foco en: D   →   tras ArrowRight, foco en: I
SELECCIONADOS tras ArrowRight: 0 -> ninguno
```

En la pantalla que registra las notas de un alumno, eso es recorrer la escala con el teclado
**creyendo elegir y no elegir nada**. Arreglado, con una prueba que muere si se revierte.

### 2. La nota elegida no se distinguía de la nota bajo el puntero · `89547d0`

El estado seleccionado era `bg-muted`: en el tema claro **L 0.955 contra un fondo L 0.985**, un 3 % de
diferencia, y **el mismo color que `hover:bg-muted`**. En una captura del control, con `B` elegida y
el puntero sobre `R`, las dos se veían idénticas.

Ahora usa `primary` —el vocabulario que fija §8, «Primary: aviation navy»—, y el contraste **se mide**
en el navegador real en `e2e/accesibilidad.spec.ts`, convirtiendo a sRGB con un canvas porque
`getComputedStyle` devuelve `oklab(...)`:

| Tema | Fondo elegido | Texto | Razón | ¿Distinguible del hover? |
|---|---|---|---|---|
| Claro | `rgb(21,60,112)` | `rgb(249,250,252)` | **10.52** | sí |
| Oscuro | `rgb(94,172,235)` | `rgb(6,18,35)` | **7.67** | sí |

Los dos muy por encima del 4.5 que pide AA. Es la única prueba del repo que **mide** el contraste en
vez de afirmarlo.

## Lo que yo había reportado como incumplimiento y NO lo es

**Las tablas a 390 px.** Yo dije que «esconden su columna de acciones sin ninguna señal» y que era un
incumplimiento de «mobile-first». Al medirlo no se sostiene:

- §8 dice **«Alumno screens are mobile-first; staff screens desktop-first and usable on tablets»**.
  Materias, Turnos, Grupos y demás son pantallas de **personal**, así que lo exigible es la tablet.
  **A 768 px la tabla entra entera** (692 px de ancho, `contenedorScrollea: false`): la columna de
  acciones se ve. §8 se cumple.
- En las pantallas de **alumno**, que sí son mobile-first, las tablas se desplazan en horizontal a
  390 px — pero **la página no desborda** (`desbordeHorizontalDePagina: false`): el desplazamiento
  está contenido en la tabla, que es comportamiento responsive correcto y no una rotura.

Así que de los seis hallazgos que había listado, **dos eran incumplimientos y cuatro son juicios de
calidad**. Lo digo porque la diferencia cambia qué es obligatorio y qué es opinión.

## Lo que queda, y es opinión tuya, no una regla

1. **Las tablas de alumno a 390 px**: hoy se desplazan en horizontal. Un diseño mobile-first las
   apilaría en tarjetas. Funciona y se alcanza todo; es una decisión de calidad, con costo real.
2. **La cabecera a 390 px** deja el conmutador, «SIGEDA» y las iniciales, sin migas ni nombre
   completo. Es comportamiento responsive deliberado; decís si te alcanza.
3. **El par de subsanación en la pestaña teórica**: el color lee más urgente que el texto que dice
   qué nota cuenta. Es tensión entre dos señales, y cuál debe ganar es criterio de dominio.
4. **`next-themes` registra un aviso de script bajo React 19** en consola. No afecta a la pantalla.

## Cómo te sugiero cerrarla

Hacé lo que el spec pedía en origen: **el shell y una pantalla de referencia**, aprobás o corregís
eso, y yo propago las decisiones al resto. Revisar las 90 capturas milestone por milestone es cómo
esto se convierte en un segundo proyecto.

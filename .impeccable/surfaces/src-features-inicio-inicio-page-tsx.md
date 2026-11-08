---
version: 1
slug: "src-features-inicio-inicio-page-tsx"
primary_target: "src/features/inicio/inicio-page.tsx"
related_targets: ["src/components/app-shell.tsx","src/components/app-sidebar.tsx"]
---

# Aula virtual (app autenticada: shell, Mi curso del alumno, Mi cohorte del instructor)

Scope: Operate. Shell de `/_app` para todos los roles; inicio por rol: Alumno → "Mi curso", Instructor → "Mi cohorte"; otros roles conservan sus páginas con el shell nuevo.
Audiencia y tarea: el alumno responde "dónde estoy en el PDI y qué sigue"; el instructor "qué evalúo hoy y cómo va mi cohorte". Uso diario, móvil frecuente.
Contenido: datos reales del backend (cohorte, Tabla 4 con 5 fases/12 sub fases, materias de 1ª parte, turnos, evaluaciones, exámenes, horas). Restricción: etiquetas de pruebas se conservan.
Momento memorable: el programa entero en una banda con la sub fase actual en dorado.

## Direction contract

THESIS: El aula virtual es el programa PDI EA-510 visible de una vez: tierra y cinco fases en una banda, con el día de hoy encima. Rechaza la grilla de accesos genérica y el dashboard de tarjetas KPI.

OWN-WORLD: Riel lateral marino #101A3C con etiquetas de grupo en Barlow Semi Condensed mayúsculas espaciadas y el ítem activo con filete dorado #D8B858 a la izquierda; lienzo #F8F8F8; paneles blancos redondeados 16px con sombra marina suave; titulares display en mayúsculas; texto Source Sans 3 en #5B6072; estados: hecha = marino lleno, actual = dorado claro con borde dorado, pendiente = contorno #D9DCE5; éxito #1E7A4C, aviso #8A5A00, error #B42318.

STORY: El alumno entra y sabe su día del curso, su próximo turno y qué sub fase cursa; baja a una sub fase o asignatura; el instructor ve sus turnos de hoy por evaluar y en qué sub fase está cada alumno.

FIRST VIEWPORT: Cabecera "MI CURSO" con cohorte, instructor y "Día N de 81" a la derecha; debajo, el pase segmentado del próximo turno (fecha en dorado, hora, aeronave, misión, instructor, acción Ver briefing) a lo ancho de la columna principal; debajo, la banda del programa (Tierra + 5 fases, sub fases como celdas con puntos de misiones); columna derecha de 340px: Notas recientes, Por rendir, Mis horas. Instructor: misma rejilla, el pase es el turno de hoy con sus alumnos y la banda cuenta alumnos por sub fase.

FORM: Mapa del programa + Hoy, posición 3 de mi lista de 7, seed:69d33148cdc4d51c. Raise de vernacular-ephemera-boarding-pass-and-gate-board: el próximo turno se lee como un pase segmentado con cifras tabulares.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

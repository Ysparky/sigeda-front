# Curso integrado con la matrícula (8 nov 2026)

Une el tramo de entrada (postulación → admisión → pago → cohorte) con el desarrollo del curso y la
ficha de licencia. Reglas fijas (ver `sin-informacion-operativa`): no son configurables.

## 1. Alcance del instructor

El instructor ve y evalúa a los alumnos de las cohortes de las que es **responsable**
(`grupos.cod_instructor`) además de los de sus turnos. Aplica a turnos teóricos, grupos de examen y
al catálogo de alumnos del turno práctico.

## 2. La cohorte gobierna

- `EN_INSCRIPCION → EN_PROGRESO` exige instructor responsable, al menos un alumno y el pago de
  matrícula confirmado de todos los admitidos. Si falta algo: `409` con los motivos unidos en un
  texto ("La cohorte no tiene instructor responsable. La cohorte no tiene alumnos. Falta confirmar el
  pago de matrícula de: …").
- Al iniciar: `fechaInicio = hoy`, `fechaFin = hoy + 81 días hábiles` (lunes a viernes; plan base
  de la Tabla 4) y la convocatoria PUBLICADA de la cohorte pasa a CERRADA.
- Solo las cohortes EN_PROGRESO (o sin estado, datos heredados) entran a turnos prácticos, turnos
  teóricos y catálogos. Error por fila: `alumnosTurno[i].codAlumno` → "El alumno X pertenece a una
  cohorte que no está en curso."; turno teórico: `idGrupo` → "La cohorte del grupo no está en curso."

## 3. Tierra antes del aire

En una cohorte iniciada, un alumno entra a un turno práctico solo con todas las asignaturas de la
PRIMERA_PARTE aprobadas (EXAMEN o SUBSANACION). Error por fila: "El alumno X aún no aprueba la
primera parte de instrucción en tierra (le falta 1 asignatura | le faltan N asignaturas)."

## 4. Ficha de licencia con datos del curso

- Ficha nueva: `fechaNacimiento` desde la matrícula; `secundariaCompleta = true` si el certificado de
  secundaria fue ACEPTADO.
- `horasRegistradas { vuelo, simulador }` (horas): vuelo = minutos de `alumnos_turno` de turnos con
  evaluación del alumno (código `cod-turno[-n]`); simulador = duración del escenario de sus sesiones
  COMPLETADAS. Si Total, Doble mando o Simulador quedan vacíos, el motor usa estas horas.

## 5. Menores

- Al admitir, la Persona nace con rango `Cadete`.
- `GET /api/grupos/{id}/consolidado` → `[{ codigo, nombre, estadoAcademico, nfpi }]`; la web lo
  muestra al cerrar la cohorte.

## Web

`/grupos/$id`: botón **Iniciar cohorte** (Manage Enrollments, cohorte en inscripción) con los motivos
del 409 en una alerta; fechas de inicio y fin previsto; tabla **Consolidado de la cohorte** con NFPI
cuando está CERRADA. `/fichas-licencia/$cod`: bloque **Registrado por el sistema**. Los mocks MSW
replican 2 (inicio, fechas, cierre de convocatoria, cohorte fuera de curso en turnos) y 4.
La regla 3 no se replica en el mock (el mock no ata cuestionarios a turnos prácticos).

# Finalización del curso: egreso, cierre de cohorte, constancia y ficha de licencia (8 nov 2026)

Re-evaluación del tramo final con el mismo método que la postulación: qué dicen las fuentes, qué hace hoy
el sistema, qué falta, y **reglas fijas** (no configurables) para lo que las fuentes no dicen.

## Fuentes
- Borrador de tesis, Figura 4 «Seguimiento del alumno»: la **desaprobación formal** la levanta el instructor
  (acta), el Departamento Académico prepara el **informe final del alumno**, la Dirección de Instrucción lo
  comunica y Calidad lo consolida en el reporte a la DGAC.
- Borrador de tesis, CUS25 (legajo con NIT, NIA, NFPI) y CUS28 (orden de mérito por NFPI).
- PDI EA-510: Chequeo de Operaciones → Chequeo de Comando → **Consejo de Evaluación de Vuelos** (separación).
- Reglas del usuario (25 oct): el curso dura ~81 días si no hay contratiempos y **hasta 120 como máximo**.
- Guía RAP 61 (resumida en `2026-10-31-ficha-licencia-design.md`): §61.235 exige el **curso del CIAC
  completo** para rendir el examen teórico de la DGAC; examen y pericia son posteriores al curso.

## Lo que el sistema hacía (diagnóstico)
| # | Hallazgo | Consecuencia |
|---|---|---|
| 1 | La cohorte se cerraba sin condición (EN_PROGRESO → CERRADA en cualquier momento) | se podía cerrar el día 1 con alumnos a mitad del programa |
| 2 | El consolidado leía `Persona.estado` en vivo | «Apto» significa «puede volar», no «egresó»; y el NFPI cambiaba después del cierre |
| 3 | Nada asignaba «No Apto»: el estado «En Deliberación» no tenía salida | el resultado del Consejo no se podía registrar; tampoco un retiro |
| 4 | La ficha de licencia se abría y se llenaba para cualquier código, en cualquier momento | expedientes de licencia para alumnos que no terminaron el curso |
| 5 | El motor §16 no exigía el curso CIAC aprobado | podía marcar «Lista para pericia» sin egreso |
| 6 | No había constancia de egreso | el alumno no tenía con qué acreditar el curso ante la DGAC |
| 7 | El alumno no veía su resultado final ni lo que le falta para la licencia | el aula seguía mostrando el mapa del programa tras el cierre |
| 8 | `MotorFicha` guardaba las horas en un campo del bean compartido | dos consultas simultáneas podían mezclar las horas de dos alumnos |

## Reglas fijas
| Regla | Valor | Fuente |
|---|---|---|
| Fin previsto | 81 días hábiles desde el inicio (ya existía) | reglas del usuario |
| Plazo máximo | **120 días hábiles** desde el inicio | reglas del usuario («hasta 120») |
| Egreso del alumno | las 12 sub fases completas (todas sus misiones evaluadas) **y** todas las asignaturas de tierra aprobadas (examen o subsanación) **y** estado Apto o En Observación (sin chequeo, final, complementación ni deliberación abiertos) | PDI + mismas reglas que muestra el aula |
| Consejo de Evaluación de Vuelos | se realiza fuera del sistema; el Coordinador registra su decisión solo si el alumno está En Deliberación: **CONTINÚA** (vuelve a En Observación) o **SEPARADO** (No Apto) | PDI; tesis Fig. 4 (paso 6) |
| Retiro | el Coordinador lo registra en cualquier momento del curso, con motivo; el alumno pasa a No Apto (ya no se evalúa) | práctica habitual |
| Baja | separación y retiro fijan la situación final al registrarse (fecha y observación) | — |
| Cerrar la cohorte | solo cuando **cada alumno egresó o tiene baja**; o, vencido el plazo máximo, los pendientes quedan **NO CULMINÓ** | — |
| Al cerrar | se **congela** el resultado por alumno: situación, NIT, NIA, NFPI, puesto, horas de vuelo y simulador, fecha | tesis Fig. 4 «informe final del alumno» |
| Puesto | orden de mérito de la cohorte por NFPI descendente entre los egresados; los empates comparten puesto | CUS28 |
| Constancia de egreso | solo para EGRESADO; número `CE-<año>-<cohorte 3 díg.>-<n 2 díg.>`; imprimible desde el aula del alumno y desde la cohorte | §61.235 |
| Ficha de licencia | se abre **solo para egresados** (409 si no); nuevo requisito «Curso CIAC aprobado (constancia de egreso)» | §61.235 |
| Horas de la ficha | por defecto, las congeladas al cierre | — |

## Situación final
`EGRESADO` · `DESAPROBADO` (separado por el Consejo) · `RETIRADO` · `NO_CULMINO` (plazo máximo vencido).
Antes del cierre, el tablero muestra por alumno `EN_CURSO`, `LISTO` (cumple el egreso) o la baja registrada.

## Flujo
1. **Durante el curso:** el tablero de cierre de la cohorte (Coordinador) muestra por alumno sub fases
   completas / 12, asignaturas aprobadas / total, estado y NFPI provisional, y si ya cumple el egreso.
2. **Consejo / retiro:** desde el tablero, el Coordinador registra la decisión del Consejo o el retiro.
3. **Cerrar la cohorte:** el botón dice qué falta (409 con motivos) hasta que se cumpla la regla de cierre.
4. **Acta de cierre:** al cerrar, la cohorte muestra el resultado congelado: puesto, situación, NFPI,
   constancia y el acceso a la ficha de licencia de cada egresado.
5. **Alumno:** «Mi curso» cambia a su resultado final: situación, NFPI, puesto, la constancia imprimible y
   el estado de su ficha de licencia con lo que le falta (solo lectura).
6. **Licencia:** el Coordinador lleva la ficha del egresado hasta la emisión (sin cambios en el motor
   salvo el requisito del curso CIAC).

## API
- `GET /api/grupos/{id}/cierre` (Manage Enrollments): `{ estado, fechaInicio, fechaFin, plazoMaximo, puedeCerrar, motivos[], alumnos[] }`
  con `alumnos[] = { codigo, nombre, estado, situacion, subfasesCompletas, subfasesTotales, asignaturasAprobadas, asignaturasTotales, nfpi, puesto, constancia, observacion }`.
  Cerrada: los datos congelados.
- `POST /api/grupos/{id}/alumnos/{cod}/decision` (Manage Enrollments): `{ decision: CONTINUA | SEPARADO | RETIRO, observacion }`; 409 si la cohorte no está en curso, si el alumno ya tiene baja o si CONTINUA/SEPARADO sin deliberación.
- `PUT /api/grupos/{id}/estado` CERRADA: 409 con los motivos; al cerrar congela los resultados.
- `GET /api/grupos/{id}/consolidado`: después del cierre, desde lo congelado (con situación y puesto).
- `GET /api/resultados-finales/{cod}` (el propio alumno o Manage Enrollments / Manage Licensing): la constancia.
- `GET /api/aula/alumnos/{cod}`: gana `final` (nulo hasta tener resultado) con la situación y el resumen de la ficha.
- `PUT /api/fichas-licencia/{cod}`: 409 «La ficha de licencia se abre al egresar del curso.» si no es egresado.

## Persistencia
Migración `040-resultados-finales.sql`: tabla `resultados_finales` (cod_alumno único, id_grupo, situacion,
fecha, observacion, nit, nia, nfpi, puesto, horas_vuelo, horas_simulador, constancia). La semilla registra a
los alumnos de la cohorte ya cerrada (Grupo 1) como egresados.

## Fuera de alcance
Firma digital de la constancia, envío del reporte a la DGAC, re-ingreso de un alumno separado a otra cohorte.

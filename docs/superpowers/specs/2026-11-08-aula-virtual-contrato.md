# Aula virtual — contrato de las vistas agregadas (8 nov 2026)

Dos rutas de lectura que alimentan el inicio por rol. Fechas ISO `yyyy-MM-dd`, horas `HH:mm`,
números con hasta 2 decimales. Reglas fijas (no configurables).

## `GET /api/aula/alumnos/{cod}` — Mi curso

Permiso `Read`. Orden de rechazos como el legajo: 404 si la persona no existe (`response.isNull("Persona")`),
403 `MensajesDeAcceso.SOLO_LO_PROPIO` si `restriccionDeAlumno().deniegaAcceso(cod)`.

```json
{
  "alumno": { "codigo": "222222", "nombre": "Juan Falconi Fernandez", "rango": "Alférez" },
  "cohorte": {
    "id": 2, "nombre": "Grupo 2", "estado": "EN_PROGRESO", "instructor": "Maria Mendoza",
    "fechaInicio": "2026-09-28", "fechaFin": "2027-01-22", "diaDelCurso": 34, "diasDelPlan": 81
  },
  "proximoTurno": {
    "id": 4, "fecha": "2026-11-12", "horaInicio": "08:00", "horaFin": "09:00",
    "aeronave": "R44 · OB-1923", "mision": "CM-2", "horasMision": 1.0,
    "instructor": "Maria Mendoza", "subfase": "Circuitos y Maniobras"
  },
  "tierra": {
    "aprobadas": 9, "total": 11,
    "materias": [
      { "id": 1, "nombre": "Aerodinámica Aplicada a Helicópteros", "parte": "PRIMERA_PARTE",
        "estado": "APROBADA", "nota": 16.0, "proximoExamen": null }
    ]
  },
  "fases": [
    { "id": 1, "nombre": "Adaptación", "subfases": [
      { "id": 1, "nombre": "Control Básico", "misiones": 4, "evaluadas": 4, "promedio": 15.5,
        "ultimaClasificacion": "Bueno", "estado": "COMPLETA" } ] }
  ],
  "notasRecientes": [
    { "tipo": "VUELO", "titulo": "Circuitos y Maniobras", "fecha": "2026-11-06", "nota": 15.8, "resultado": "Bueno" },
    { "tipo": "TIERRA", "titulo": "Meteorología", "fecha": "2026-11-02", "nota": 15.0, "resultado": "Aprobado" }
  ],
  "porRendir": [ { "idTurnoTeorico": 7, "materia": "Fraseología Aeronáutica en Inglés", "fecha": "2026-11-14", "horaInicio": "09:00" } ],
  "horas": { "vuelo": 11.5, "simulador": 1.5, "programa": 94.0 },
  "nfpi": 17.16
}
```

- `cohorte` es `null` si el alumno no tiene grupo. `diaDelCurso` = días hábiles (lun–vie) desde
  `fechaInicio` hasta hoy inclusive, tope `diasDelPlan` (81); `null` si la cohorte no inició.
- `proximoTurno`: el primer turno del alumno con `fechaEval >= hoy`, no SUSPENDIDO, ordenado por fecha y
  hora del alumno; `null` si no hay. `horaInicio/horaFin` son las del alumno en `alumnos_turno`.
- `tierra.materias`: todas las materias ordenadas por parte y id. `estado` = APROBADA si tiene un
  cuestionario aprobado (EXAMEN o SUBSANACION), DESAPROBADA si su último cuestionario entregado está
  desaprobado, PENDIENTE si no. `nota` = la del cuestionario que decide el estado. `proximoExamen` =
  fecha del próximo turno teórico de esa materia para el grupo del alumno (`fechaExamen >= hoy`).
  `aprobadas/total` cuentan solo la PRIMERA_PARTE.
- `fases`: las 5 fases y 12 sub fases en orden de id. `misiones` = misiones de la sub fase.
  `evaluadas` = misiones distintas con evaluación del alumno (vía el turno de la evaluación), tope
  `misiones`. `estado`: COMPLETA si `misiones > 0 && evaluadas >= misiones`; la primera sub fase no
  completa es EN_CURSO; el resto PENDIENTE.
- `notasRecientes`: las 5 más recientes entre evaluaciones de vuelo (titulo = sub fase,
  resultado = clasificación) y cuestionarios entregados (titulo = materia, resultado
  Aprobado/Desaprobado), por fecha descendente.
- `porRendir`: turnos teóricos futuros del grupo del alumno sin cuestionario entregado, por fecha.
- `horas.vuelo/simulador`: las mismas horas registradas de la ficha de licencia; `programa` = suma
  de las horas de todas las misiones del PDI.
- `nfpi`: `IIndiceService.de(cod).nfpi()`, puede ser `null`.

## `GET /api/aula/instructor` — Mi cohorte

Permiso `Read`. Usa la persona del usuario en sesión; 403 si el usuario no tiene persona o la persona
no es `Instructor PDI`.

```json
{
  "instructor": { "codigo": "888888", "nombre": "Maria Mendoza" },
  "cohortes": [ { "id": 2, "nombre": "Grupo 2", "estado": "EN_PROGRESO", "fechaInicio": "2026-09-28",
                  "fechaFin": "2027-01-22", "diaDelCurso": 34, "alumnos": 6 } ],
  "turnosDeHoy": [ { "id": 4, "nombre": "Turno 4", "horaInicio": "08:00", "horaFin": "11:00",
      "aeronave": "R44 · OB-1923", "mision": "CM-2", "subfase": "Circuitos y Maniobras",
      "alumnos": [ { "codigo": "222222", "nombre": "Juan Falconi", "horaInicio": "08:00", "horaFin": "09:00", "evaluado": false } ] } ],
  "porEvaluar": [ { "idTurno": 3, "fecha": "2026-11-06", "codigo": "777777", "nombre": "Carlos Ramirez" } ],
  "fases": [ { "id": 1, "nombre": "Adaptación", "subfases": [ { "id": 2, "nombre": "Circuitos y Maniobras", "alumnos": 3 } ] } ],
  "alertas": [ { "codigo": "666666", "alumno": "Ana Martinez", "motivo": "Subsanación pendiente de Meteorología." } ],
  "proximosExamenes": [ { "idTurnoTeorico": 7, "materia": "Meteorología", "grupo": "Grupo 2", "fecha": "2026-11-14", "horaInicio": "09:00" } ]
}
```

- `cohortes`: grupos con `codInstructor` = el instructor, EN_PROGRESO o EN_INSCRIPCION, `alumnos` = cuántos Alumno.
- `turnosDeHoy`: turnos del instructor con `fechaEval = hoy`, no SUSPENDIDOS, por hora. `evaluado` si el
  alumno ya tiene evaluación de ese turno.
- `porEvaluar`: filas alumno-turno de turnos del instructor con `fechaEval < hoy`, no suspendidos, sin
  evaluación; por fecha descendente, máximo 10.
- `fases`: para los alumnos de sus cohortes EN_PROGRESO, cuántos tienen cada sub fase EN_CURSO (regla de
  arriba). Todas las sub fases aparecen, con 0 si nadie.
- `alertas`: alumnos de sus cohortes bloqueados por subsanación pendiente, o con la primera parte de
  tierra pendiente en una cohorte iniciada (mensaje: "Primera parte de tierra pendiente (le faltan N).").
- `proximosExamenes`: turnos teóricos futuros de sus cohortes, por fecha, máximo 5.

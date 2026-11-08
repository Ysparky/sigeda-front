# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Alumno** (cadete del programa PDI EA-510 de piloto privado de helicóptero): sigue su curso, ve sus turnos de vuelo, evaluaciones DIRBE, exámenes de instrucción en tierra, sesiones de simulador, asistencia y su legajo. Usa la app a diario, a menudo desde el teléfono.
- **Instructor** (Instructor PDI): responsable de una cohorte de hasta 20 alumnos; programa y evalúa turnos (≤ 5 alumnos por turno), registra evaluaciones, asistencia y sesiones de simulador.
- **Coordinador académico**: convocatorias, admisión, pagos de matrícula, cohortes (iniciar/cerrar), ficha de licencia.
- **Jefe de Operaciones**, **Comandante de Escuadrón**, **Administrador Web**: operación de vuelo, catálogo del programa y maniobras, usuarios y roles.
- Público sin cuenta: landing, postulación (`/matricula`), consulta de postulación (`/postulacion`), login.

## Product Purpose

SIGEDA es el sistema de gestión académica del Aeroclub Sudamericano de los Andes (escuela RAP 141): lleva a un postulante desde la admisión, por la instrucción en tierra y en vuelo del PDI EA-510, hasta la ficha de obtención de la licencia PP-H (RAP 61). Éxito: que alumno e instructor vivan el curso dentro del sistema como en un aula virtual — el alumno sabe dónde está en su programa y qué sigue; el instructor sabe qué tiene que evaluar hoy.

## Positioning

A diferencia de un LMS genérico, el "curso" es el programa PDI EA-510 real: fases y sub fases de la Tabla 4, misiones con horas, evaluaciones DIRBE con nota de misión, NFPI/NIT/NIA, regla de chequeo, tierra antes del aire, y la cohorte gobierna quién vuela. El aula virtual se ordena por ese programa, no por "cursos" abstractos.

## Operating Context

Proyecto de tesis. No hay información de cómo opera hoy el aeroclub: las reglas faltantes se fijan en código, justificadas (no configurables). Terminología militar (roles, rangos, Escuadrón, Cadete) es dominio legítimo. Backend Spring Boot (sigeda-back); esta web React + TanStack. Demo de tesis con datos sembrados.

## Capabilities and Constraints

- Decisión de diseño (8 nov 2026): experiencia **centrada en el curso** (tipo Moodle/Classroom). El alumno entra a "Mi curso" (fases → sub fases/asignaturas con avance, próximo turno o examen, notas recientes); el personal entra a sus cohortes y baja a alumnos y actividad.
- Prioridad: **Alumno e Instructor** primero; coordinación, operaciones y administración reciben el shell y el aspecto nuevos y conservan sus páginas.
- Etiquetas y textos que usan las pruebas (vitest + Playwright) se conservan; el comportamiento no cambia.
- Español (Perú). Permisos por rol desde `src/lib/auth/pantallas.ts`.

## Brand Commitments

- Mundo visual de las páginas públicas ya rediseñadas (landing, formulario de postulación, Mi postulación, login): marino `#101A3C`, dorado `#D8B858`, titulares display en mayúsculas, módulo compartido `src/features/inscripcion/marca.ts`. La app autenticada debe seguir ese mismo look and feel.
- Tema: **claro de marca por defecto; oscuro opcional** derivado de la misma paleta.
- Logo `/public/asa-logo.png`; nombre "Aeroclub Sudamericano de los Andes"; producto "SIGEDA".

## Evidence on Hand

Datos sembrados (mocks MSW y `data_prod.sql`): alumnos, cohortes, turnos, evaluaciones, índices. Fotos de marca referidas en `marca.ts` (FOTO_*). No hay testimonios, métricas reales ni capturas del aeroclub: no inventarlos.

## Product Principles

1. El programa es la columna: toda vista del alumno responde "dónde estoy y qué sigue" en el PDI.
2. Lo pendiente primero: el instructor ve lo que debe evaluar o registrar hoy antes que cualquier catálogo.
3. Reglas visibles: cuando el sistema bloquea (tierra antes del aire, cohorte fuera de curso, pago pendiente) lo dice en el lugar donde se actúa.
4. Una sola marca de punta a punta: lo público y lo autenticado se sienten la misma escuela.

## Accessibility & Inclusion

WCAG 2.1 AA (hay e2e de accesibilidad con axe). Uso frecuente en móvil por alumnos.

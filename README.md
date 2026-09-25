# sigeda-web

Cliente web de SIGEDA, el sistema de gestión académica del Aeroclub Sudamericano de los Andes.

Consume dos backends: `../sigeda-back` (Spring Boot, `:8080`) para instrucción, evaluaciones y seguridad, y `../sigeda_chat_status` (NestJS, `:3000`) para aprendizaje con IA.

## Requisitos

- Node ≥ 22. En esta máquina está en nvm (`/Volumes/ORICO/sdks/nvm`); en una shell no interactiva: `export PATH=/Volumes/ORICO/sdks/nvm/versions/node/v25.1.0/bin:$PATH`.
- pnpm 11. Nunca npm.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm install` | Instala dependencias |
| `pnpm dev` | Servidor de desarrollo en `http://localhost:5173` |
| `pnpm test` | Pruebas en modo observación |
| `pnpm verify` | Tipos, lint, pruebas y build; debe pasar antes de cada commit |

## Documentación

- Diseño: `docs/superpowers/specs/2026-09-19-sigeda-web-design.md`
- Planes: `docs/superpowers/plans/`
- Contrato de la API teórica: `docs/contrato-api-teoria.md`
- Contrato de turnos y evaluaciones: `docs/contrato-api-turnos.md`
- Contrato de matrícula y programa: `docs/contrato-api-matricula.md`
- Contrato de aprendizaje (documentos, cuestionarios y consultas): `docs/contrato-api-aprendizaje.md`

## Modo demostración sin backends

```bash
pnpm dev:mock
```

MSW responde en el navegador a `/auth/*`, a los turnos, evaluaciones y catálogos de `docs/contrato-api-turnos.md`, a las personas, cuentas, grupos, fases, maniobras y materias de `docs/contrato-api-matricula.md`, a los documentos, cuestionarios y consultas de `docs/contrato-api-aprendizaje.md` y al banco de preguntas, los turnos teóricos y los exámenes de `docs/contrato-api-teoria.md`, con datos basados en el seed de `sigeda-back` (los datos vuelven al estado inicial al recargar). Contraseña de todos: `123`.

| Usuario | Rol |
|---|---|
| `admin.sistema` | Administrador Web |
| `comandante.aguirre` | Comandante de Escuadrón |
| `jefe.operaciones` | Jefe de Operaciones |
| `instructor.perez` | Instructor |
| `instructor.mendoza` | Instructor |
| `alumno.lopez` | Alumno |
| `raul.paredes` | Sin rol (no puede iniciar sesión) |

## Con los backends reales

1. `sigeda-back` en `:8080` (ver `../sigeda-back/SETUP_DEV.md`).
2. `sigeda_chat_status` en `:3000` (solo para Aprendizaje).
3. Copie `.env.example` a `.env.local` si los puertos cambian, y ejecute `pnpm dev`.

`VITE_DEPENDENCIAS_RESUELTAS` lista, separados por coma, los números de dependencia de backend ya corregidos en los servidores en uso (por ejemplo `22,30,32,33,37,39`). Mientras falte el número, la aplicación deshabilita la acción que lo necesita: Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33), Eliminar fase (37), las escrituras de Materias (5), todo el módulo de Teoría (6) y el bloqueo por subsanación del formulario de turno práctico (7); en Aprendizaje, Subir documento y Eliminar documento (39, `sigeda_chat_status`). En modo demostración todas están disponibles.

Teoría contra el servidor real: nada del módulo existe todavía en `sigeda-back` (dependencias 6 y 7), así que las seis pantallas avisan en su encabezado que funcionan solo en modo mock y sus escrituras quedan deshabilitadas. El detalle de lo que falta está en `docs/contrato-api-teoria.md` §10.

Aprendizaje contra el servidor real: sin la dependencia 39 los documentos son compartidos entre todos los usuarios y las tres pantallas lo avisan; Consultas necesita además la dependencia 45, sin la cual `GET /chat/sessions/{id}` responde 500 y la conversación no se puede recuperar. Mientras falte la 39, la aplicación igual envía a `sigeda_chat_status` un JWT válido de 24 h de `sigeda-back` que ese servicio ignora y conserva en sus registros de acceso (contrato §0), así que conviene no publicarlos.

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

## Modo demostración sin backends

```bash
pnpm dev:mock
```

MSW responde en el navegador a `/auth/*` y `/api/usuarios/*` con los usuarios sembrados de `sigeda-back`. Contraseña de todos: `123`.

| Usuario | Rol |
|---|---|
| `admin.sistema` | Administrador Web |
| `comandante.aguirre` | Comandante de Escuadrón |
| `jefe.operaciones` | Jefe de Operaciones |
| `instructor.perez` | Instructor |
| `alumno.lopez` | Alumno |

## Con los backends reales

1. `sigeda-back` en `:8080` (ver `../sigeda-back/SETUP_DEV.md`).
2. `sigeda_chat_status` en `:3000` (solo para Aprendizaje).
3. Copie `.env.example` a `.env.local` si los puertos cambian, y ejecute `pnpm dev`.

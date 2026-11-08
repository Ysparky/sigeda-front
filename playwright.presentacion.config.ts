import { defineConfig, devices } from '@playwright/test'

/**
 * Config para GRABAR la presentación del sistema (no es parte de la suite e2e).
 * Reusa el mismo stack real que playwright.config.ts (backend 8080 + PostgreSQL + Vite),
 * pero graba video 1280×720 del recorrido guiado. Correr con:
 *   pnpm exec playwright test --config playwright.presentacion.config.ts
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /presentacion\.demo\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/comprobar-entorno.ts',
  timeout: 1_200_000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    // Acota TODA acción/navegación: sin esto una acción contra un elemento ausente colgaría
    // hasta el timeout del test y arruinaría la grabación.
    actionTimeout: 12_000,
    navigationTimeout: 20_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})

import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas de punta a punta contra el sistema REAL: el backend Spring sobre PostgreSQL, no los
 * mocks. Es la evidencia de integración que la decisión M1-11 dejó para «el primer milestone que
 * corra contra un sigeda-back vivo y arreglado», que es ahora.
 *
 * Requisitos, y la suite falla con un mensaje claro si no se cumplen:
 *   1. PostgreSQL en el 5544 con la base sigeda_demo (ver docs/demo-runbook.md).
 *   2. El backend en el 8080 con el perfil dev.
 *   3. Un .env con VITE_MOCK_API=false — si apunta a los mocks, esto no prueba integración.
 * El servidor de Vite lo levanta Playwright si no está corriendo ya.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/comprobar-entorno.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})

import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig({ command: 'serve', mode: 'test' }),
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/entorno.ts', './src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      unstubEnvs: true,
      // La suite define su propio entorno y NO hereda el .env del desarrollador. Sin la línea de
      // VITE_DEPENDENCIAS_RESUELTAS, un .env con dependencias resueltas —el que hace falta para
      // correr la aplicación contra el backend real— pone en verde las acciones que 18 pruebas
      // verifican que estén DESHABILITADAS, y la suite falla sin que nada del código haya cambiado.
      env: { VITE_MOCK_API: 'true', VITE_DEPENDENCIAS_RESUELTAS: '' },
    },
  }),
)

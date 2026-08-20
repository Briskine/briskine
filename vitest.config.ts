import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import solidPlugins from './vite.plugins.js'

export default defineConfig({
  publicDir: 'test',
  define: {
    ENV: JSON.stringify('development'),
    REGISTER_DISABLED: false,
    FIREBASE_CONFIG: {},
    VERSION: 1,
  },
  test: {
    projects: [{
      extends: true,
      plugins: solidPlugins(),
      optimizeDeps: {
        rolldownOptions: {
          moduleTypes: {
            '.js': 'jsx',
          },
        },
      },
      test: {
        name: 'unit',
        include: [
          'src/**/**/*.spec.js'
        ],
        browser: {
          provider: playwright(),
          enabled: true,
          headless: true,
          screenshotFailures: false,
          instances: [
            { browser: 'webkit' },
            { browser: 'chromium' },
            { browser: 'firefox' },
          ],
        },
        setupFiles: './vitest.setup.ts',
      }
    }]
  }
})

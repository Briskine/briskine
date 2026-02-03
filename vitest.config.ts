import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  define: {
    ENV: JSON.stringify('development'),
    REGISTER_DISABLED: false,
    FIREBASE_CONFIG: {},
    VERSION: 1,
    MANIFEST: JSON.stringify('3'),
  },
  resolve: {
    alias: {
      // HACK
      // Temporary alias, we'll switch directly to this import when migrating to Vite.
      'moment': 'moment/min/moment-with-locales.js',
    }
  },
  test: {
    projects: [{
      extends: true,
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
            { browser: 'chromium' }
          ],
        },
        setupFiles: './vitest.setup.ts',
        globalSetup: './vitest.globalSetup.ts'
      }
    }]
  }
})

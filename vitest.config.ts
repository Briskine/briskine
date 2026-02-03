import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  define: {
    'process.env': JSON.stringify({}),
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

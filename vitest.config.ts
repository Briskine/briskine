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
    include: [
        'src/**/**/*.{test,spec}.js'
    ],
    browser: {
      provider: playwright(),
      enabled: true,
      testerHtmlPath: 'test/custom-path.html',
      // at least one instance is required
      instances: [
        { browser: 'chromium' }
      ],
    },
    setupFiles: './vitest.setup.ts',
    globalSetup: './vitest.globalSetup.ts'
  }
})

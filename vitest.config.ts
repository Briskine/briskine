import { defineConfig } from 'vitest/config'
import { preview } from '@vitest/browser-preview'

export default defineConfig({
  define: {
    "process.env": JSON.stringify({}),
  },      
  test: {
    include: [
        'src/**/**/*.{test,spec}.js'
    ], 
    browser: {
      provider: preview(),
      enabled: true,
      testerHtmlPath: 'test/custom-path.html',
      // at least one instance is required
      instances: [
        { browser: 'chromium' },
      ],
    },
    // globals: true,
    setupFiles: './vitest.setup.ts',
  }
})
import path from 'path'
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        const extensionFolder = path.resolve('./ext')

        if (browser.family === 'chromium') {
          launchOptions.args.push(`--load-extension=${extensionFolder}`)
        }

        return launchOptions
      })
    },
  },
});

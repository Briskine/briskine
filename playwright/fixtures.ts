import {test as base, chromium, firefox, type BrowserContext} from '@playwright/test'
import {fileURLToPath} from 'url'
import path from 'path'
import {connect} from '../node_modules/web-ext/lib/firefox/remote.js'

const RDP_PORT = 12345

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pathToExtension = path.join(__dirname, '../ext')
let extensionId

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({browserName}, use) => {
    let context

    if (browserName === 'firefox') {
      context = await firefox.launchPersistentContext('', {
        headless: false,
        args: ['-start-debugger-server', String(RDP_PORT)],
        firefoxUserPrefs: {
          'devtools.debugger.remote-enabled': true,
          'devtools.debugger.prompt-connection': false,
        }
      })

      const client = await connect(RDP_PORT)
      const resp = await client.installTemporaryAddon(pathToExtension)
      extensionId = resp.addon.id.split('@')[1]
    } else {
      context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
        ],
      })
    }

    // close the getting-started tab
    // which gets opened automatically on install
    const newPage = await context.waitForEvent('page')
    if (newPage.url().includes('/getting-started')) {
      await newPage.close()
    }

    await use(context)
    await context.close()
  },
  extensionId: async ({context, browserName}, use) => {
    if (browserName === 'firefox') {
      // BUG extensionId is "temporary-addon" in firefox,
      // so we can't test the popup in firefox.
      extensionId = `moz-extension://${extensionId}`
    } else {
      let [background] = context.serviceWorkers()
      if (!background) {
        background = await context.waitForEvent('serviceworker')
      }

      extensionId = background.url().split('/')[2]
      extensionId = `chrome-extension://${extensionId}`
    }
    await use(extensionId)
  },
})

export const expect = test.expect

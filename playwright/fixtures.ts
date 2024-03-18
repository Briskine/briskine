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
      context = await firefox.launch({
        headless: false,
        args: [ '-start-debugger-server', String(RDP_PORT) ],
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

    await use(context)
    await context.close()
  },
  extensionId: async ({context, browserName}, use) => {
    if (browserName !== 'firefox') {
      let [background] = context.serviceWorkers()
      if (!background)
        background = await context.waitForEvent('serviceworker')

      extensionId = background.url().split('/')[2]
    }

    await use(extensionId)
  },
})

// skip all dialog tests on Firefox,
// until they fix the Permission Denied bug when accessing any properties
// on custom elements in content scripts.
// https://bugzilla.mozilla.org/show_bug.cgi?id=1492002
test.beforeEach(async ({browserName}, testInfo) => {
  test.skip(browserName === 'firefox' && testInfo.title.includes('dialog'), 'Dialog testing not supported in Firefox.')
})

export const expect = test.expect

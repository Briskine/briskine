import {test as base, chromium, firefox, type Page, type BrowserContext, type WorkerInfo} from '@playwright/test'
import {fileURLToPath} from 'url'
import path from 'path'
import os from 'os'
import {connect} from '../node_modules/web-ext/lib/firefox/remote.js'

const RDP_PORT_BASE = 12345

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pathToExtension = path.join(__dirname, '../ext')
let extensionId

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({browserName}, use, workerInfo: WorkerInfo) => {
    let context
    const userDataDir = path.join(os.tmpdir(), `briskine-test-${workerInfo.workerIndex}-${browserName}`)

    if (browserName === 'firefox') {
      const rdpPort = RDP_PORT_BASE + workerInfo.workerIndex
      context = await firefox.launchPersistentContext(userDataDir, {
        headless: true,
        args: ['-start-debugger-server', String(rdpPort)],
        firefoxUserPrefs: {
          'devtools.debugger.remote-enabled': true,
          'devtools.debugger.prompt-connection': false,
        }
      })

      const client = await connect(rdpPort)
      const resp = await client.installTemporaryAddon(pathToExtension)
      extensionId = resp.addon.id.split('@')[1]
    } else {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chromium',
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

const waitForExtension = (page: Page) => new Promise<void>((resolve) => {
  page.on('console', msg => {
    if (msg.text().includes('BSKN inited')) {
      resolve()
    }
  })
})

export const openPage = (page: Page, pageUrl: string) =>
  Promise.all([
    waitForExtension(page),
    page.goto(pageUrl)
  ])

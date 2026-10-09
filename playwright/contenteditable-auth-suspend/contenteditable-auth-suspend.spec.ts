import {test, expect, openPage, insertFromDialog} from '../fixtures.ts'
import login from '../login.js'

test.describe('ContentEditable Authenticated Service Worker suspend', () => {
  test.skip(({browserName}) => browserName === 'firefox', 'Auth testing not supported in Firefox.')

  test.beforeEach(async ({page, extensionId}) => {
    await login({page, extensionId})

    // stop service worker
    await page.goto('chrome://serviceworker-internals/')
    await page.getByRole('button', {name: 'Stop'}).click()

    await openPage(page, '/contenteditable-auth-suspend/contenteditable-auth-suspend.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').clear()
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('w')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Write emails faster.')
  })

  test('should insert template from dialog', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await insertFromDialog(page, textbox, 'create')
    const template = 'Create text templates and insert them with shortcuts.'
    await expect(textbox).toHaveText(template)
  })
})

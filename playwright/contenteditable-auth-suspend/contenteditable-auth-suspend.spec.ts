import {test, expect, waitForExtension} from '../fixtures.ts'
import login from '../login.js'

test.describe('ContentEditable Authenticated Service Worker suspend', () => {
  test.skip(({browserName}) => browserName === 'firefox', 'Auth testing not supported in Firefox.')

  test.beforeEach(async ({page, extensionId}) => {
    await login({page, extensionId})

    // stop service worker
    await page.goto('chrome://serviceworker-internals/')
    await page.getByRole('button', {name: 'Stop'}).click()

    await page.goto('/contenteditable-auth-suspend/contenteditable-auth-suspend.html')
    // wait for the service worker to start
    // and briskine initialized
    await waitForExtension(page);
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
    await textbox.press('Control+ ')
    const search = page.getByRole('searchbox')
    await expect(search).toBeVisible()
    await search.fill('create')
    const template = 'Create text templates and insert them with shortcuts.'
    const list = page.getByText(template)
    await list.waitFor()
    await search.press('Enter')
    await expect(textbox).toHaveText(template)
  })
})

import {test, expect, waitForExtension} from '../fixtures.ts'
import loginSession from '../login-session.js'

test.describe('ContentEditable Session Authenticated', () => {
test.skip(({browserName}) => browserName === 'firefox', 'Auth testing not supported in Firefox.')

  test.beforeEach(async ({page, extensionId}) => {
    await loginSession({page, extensionId})
    await page.goto('/contenteditable-auth-session/contenteditable-auth-session.html')
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

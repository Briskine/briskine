import {test, expect, openPage, insertFromDialog} from '../fixtures.ts'
import loginSession from '../login-session.js'

test.describe('ContentEditable Session Authenticated', () => {
test.skip(({browserName}) => browserName === 'firefox', 'Auth testing not supported in Firefox.')

  test.beforeEach(async ({page, extensionId}) => {
    await loginSession({page, extensionId})
    await openPage(page, '/contenteditable-auth-session/contenteditable-auth-session.html')
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

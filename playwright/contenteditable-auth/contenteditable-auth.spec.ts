import {test, expect} from '../fixtures.ts'
import login from '../login.js'

test.describe('ContentEditable Authenticated', () => {
  test.skip(({browserName}) => browserName === 'firefox', 'Auth testing not supported in Firefox.')

  test.beforeEach(async ({page, extensionId}) => {
    await login({page, extensionId})
    await page.goto('/contenteditable-auth/contenteditable-auth.html')
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

  test('should insert template with account variable', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('acc')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Briskine Test - Briskine Test\ncontact+test@briskine.com')
  })

  test('should insert template with from variable, when not available', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('from')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Briskine Test - Briskine Test\ncontact+test@briskine.com')
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
